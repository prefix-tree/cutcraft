//! `uberscene-codec`: UberScene's native codecs, a background process the export starts when `UBERSCENE_CODECS` asks
//! for them. It decodes footage for the export page and encodes the pictures the page draws, with craft-video, and
//! decodes and encodes the soundtrack with craft-audio (pure Rust, no FFmpeg). See `PROTOCOL.md` for what goes over stdin and stdout.
#![forbid(unsafe_code)]
#![deny(
    clippy::unwrap_used,
    clippy::expect_used,
    clippy::panic,
    clippy::todo,
    clippy::unimplemented
)]

mod audio;
mod convert;
mod decode;
mod demux;
mod encode;
mod wire;

use std::io::{self, BufWriter, Write};
use std::path::{Path, PathBuf};
use std::process::ExitCode;

use demux::Video;
use encode::{Preset, ProResProfile, Rate, Settings};
use wire::{Color, write_frame};

const USAGE: &str = "usage:
  uberscene-codec probe <file>
  uberscene-codec decode <file> (--from <s> [--to <s>] | --at <s>) [--threads <n>]
  uberscene-codec encode --codec h264|prores --width <w> --height <h> [--fps <n/d>] [--keyint <frames>]
                         [--kbps <n> | --crf <q>] [--preset speed|balanced|quality] [--threads <n>]
                         [--prores-profile proxy|lt|standard|hq|4444]
  uberscene-codec decode-audio <file> --from <s> --to <s>
  uberscene-codec encode-audio --format aac|wav|mp3 [--rate <hz>] [--channels <n>] [--kbps <n>] [--bits 16|24]
  uberscene-codec --version";

/// Pictures within this many seconds after a time count as showing at it: container times are rounded to the
/// millisecond. The player's `PICK_EPS`.
const PICK_EPS: f64 = 0.001;

fn main() -> ExitCode {
    let args: Vec<String> = std::env::args().skip(1).collect();
    match run(&args) {
        Ok(()) => ExitCode::SUCCESS,
        Err(message) => {
            // A closed stdout (the page stopped reading) is how a stream is cancelled, not an error.
            if message.contains("Broken pipe") {
                return ExitCode::SUCCESS;
            }
            eprintln!("uberscene-codec: {message}");
            ExitCode::FAILURE
        }
    }
}

fn run(args: &[String]) -> Result<(), String> {
    let Some(command) = args.first() else {
        return Err(USAGE.into());
    };
    let rest = &args[1..];
    match command.as_str() {
        "probe" => probe(&file_arg(rest)?),
        "decode" => decode(&file_arg(rest)?, rest),
        "encode" => encode_command(rest),
        "decode-audio" => decode_audio(&file_arg(rest)?, rest),
        "encode-audio" => encode_audio(rest),
        "--version" | "-V" => {
            println!("uberscene-codec {}", env!("CARGO_PKG_VERSION"));
            Ok(())
        }
        "--help" | "-h" => {
            println!("{USAGE}");
            Ok(())
        }
        other => Err(format!("unknown command {other:?}\n{USAGE}")),
    }
}

fn file_arg(rest: &[String]) -> Result<PathBuf, String> {
    rest.first()
        .filter(|a| !a.starts_with("--"))
        .map(PathBuf::from)
        .ok_or_else(|| format!("which file?\n{USAGE}"))
}

/// The value after `--name`, if given.
fn flag<'a>(rest: &'a [String], name: &str) -> Option<&'a str> {
    rest.iter()
        .position(|a| a == name)
        .and_then(|i| rest.get(i + 1))
        .map(String::as_str)
}

fn number<T: std::str::FromStr>(rest: &[String], name: &str) -> Result<Option<T>, String> {
    flag(rest, name)
        .map(|v| {
            v.parse::<T>()
                .map_err(|_| format!("{name} wants a number, got {v:?}"))
        })
        .transpose()
}

/// What the page needs to know before asking for frames, as JSON. `decodable` is true only once the first picture
/// has actually decoded, so a profile the decoder does not support is found here, not mid-export.
fn probe(path: &Path) -> Result<(), String> {
    let out = match Video::open(path) {
        Ok(video) => {
            let (width, height) = video.display_size();
            let tried = first_picture(&video);
            let mut json = serde_json::json!({
                "width": width,
                "height": height,
                "duration": video.duration_seconds(),
                "fps": video.fps(),
                "codec": video.codec.name(),
                "rotation": u32::from(video.rotation) * 90,
                "decodable": tried.is_ok(),
            });
            if let Err(reason) = tried {
                json["reason"] = serde_json::Value::String(reason);
            }
            json
        }
        Err(reason) => serde_json::json!({ "decodable": false, "reason": reason }),
    };
    println!("{out}");
    Ok(())
}

fn first_picture(video: &Video) -> Result<(), String> {
    let mut dec = decode::decoder_for(&video.codec, 1)?;
    for (i, s) in video.samples.iter().enumerate().take(64) {
        if !dec.decode(&video.read(i)?, s.pts)?.is_empty() {
            return Ok(());
        }
    }
    if dec.flush()?.is_empty() {
        Err("no picture decoded from the first samples".into())
    } else {
        Ok(())
    }
}

/// Streams the pictures of `[from, to)` (the one showing at `from` first), or the single picture showing at `at`.
fn decode(path: &Path, rest: &[String]) -> Result<(), String> {
    let video = Video::open(path)?;
    let threads = number::<usize>(rest, "--threads")?.unwrap_or(2);
    let (from, to, single) = match (number::<f64>(rest, "--at")?, number::<f64>(rest, "--from")?) {
        (Some(at), _) => (at, f64::INFINITY, true),
        (None, Some(from)) => (
            from,
            number::<f64>(rest, "--to")?.unwrap_or(f64::INFINITY),
            false,
        ),
        (None, None) => return Err(format!("decode wants --from or --at\n{USAGE}")),
    };
    if !from.is_finite() || from.is_nan() || to.is_nan() {
        return Err("--from, --to and --at want finite seconds".into());
    }
    let ts = video.timescale;
    let covering = ((from.max(0.0) + PICK_EPS) * ts).floor() as i64;
    let end = if to.is_finite() {
        (to * ts).ceil() as i64
    } else {
        i64::MAX
    };
    let mut dec = decode::decoder_for(&video.codec, threads)?;
    let stdout = io::stdout();
    let mut out = BufWriter::with_capacity(1 << 22, stdout.lock());
    let mut emit = Emitter {
        video: &video,
        pending: None,
        started: false,
        end,
        single,
        done: false,
    };
    let start = video.start_for(covering);
    for i in start..video.samples.len() {
        let Some(sample) = video.samples.get(i) else {
            break;
        };
        for pic in dec.decode(&video.read(i)?, sample.pts)? {
            emit.picture(pic, covering, &mut out)?;
            if emit.done {
                return out.flush().map_err(|e| e.to_string());
            }
        }
    }
    for pic in dec.flush()? {
        emit.picture(pic, covering, &mut out)?;
        if emit.done {
            return out.flush().map_err(|e| e.to_string());
        }
    }
    emit.finish(&mut out)?;
    out.flush().map_err(|e| e.to_string())
}

/// Decides which decoded pictures leave: the last one at or before `from` (the one showing then), then every later
/// one before `end`.
struct Emitter<'a> {
    video: &'a Video,
    pending: Option<decode::Picture>,
    started: bool,
    end: i64,
    single: bool,
    done: bool,
}

impl Emitter<'_> {
    fn picture(
        &mut self,
        pic: decode::Picture,
        covering: i64,
        out: &mut impl Write,
    ) -> Result<(), String> {
        if !self.started && pic.pts <= covering {
            // Pictures come out in presentation order: a later one at or before `from` replaces the earlier.
            if self.pending.as_ref().is_none_or(|p| p.pts <= pic.pts) {
                self.pending = Some(pic);
            }
            return Ok(());
        }
        if !self.started {
            self.started = true;
            if let Some(first) = self.pending.take() {
                self.write(&first, out)?;
                if self.single {
                    self.done = true;
                    return Ok(());
                }
            } else if self.single {
                // Asked for a time before the first picture: there is none showing.
                self.done = true;
                return Ok(());
            }
        }
        if pic.pts >= self.end {
            self.done = true;
            return Ok(());
        }
        self.write(&pic, out)
    }

    fn finish(&mut self, out: &mut impl Write) -> Result<(), String> {
        if let Some(last) = self.pending.take() {
            self.write(&last, out)?;
        }
        Ok(())
    }

    fn write(&self, pic: &decode::Picture, out: &mut impl Write) -> Result<(), String> {
        let ts = self.video.timescale;
        let image = convert::rotate(pic.image.clone(), self.video.rotation);
        let duration = self.video.duration_of(pic.pts) as f64 / ts;
        let color: Color = pic.color;
        write_frame(out, &image, color, pic.pts as f64 / ts, duration).map_err(|e| e.to_string())
    }
}

fn encode_command(rest: &[String]) -> Result<(), String> {
    let width = number::<u32>(rest, "--width")?.ok_or("encode wants --width")?;
    let height = number::<u32>(rest, "--height")?.ok_or("encode wants --height")?;
    if width == 0
        || height == 0
        || width > wire::MAX_SIDE
        || height > wire::MAX_SIDE
        || width % 2 == 1
        || height % 2 == 1
    {
        return Err(format!(
            "a picture of {width}x{height} cannot be encoded: sides must be even and at most 16384"
        ));
    }
    let settings = match flag(rest, "--codec").unwrap_or("h264") {
        "h264" => {
            let (fps_num, fps_den) = match flag(rest, "--fps") {
                Some(f) => {
                    let (n, d) = f.split_once('/').unwrap_or((f, "1"));
                    let n: u32 = n
                        .parse()
                        .map_err(|_| format!("--fps wants n/d, got {f:?}"))?;
                    let d: u32 = d
                        .parse()
                        .map_err(|_| format!("--fps wants n/d, got {f:?}"))?;
                    if n == 0 || d == 0 {
                        return Err(format!("--fps wants n/d above 0, got {f:?}"));
                    }
                    (n, d)
                }
                None => (30, 1),
            };
            let rate = match (
                number::<u32>(rest, "--kbps")?,
                number::<f32>(rest, "--crf")?,
            ) {
                (Some(k), _) if k > 0 => Rate::Kbps(k),
                (_, Some(q)) => Rate::Crf(q),
                _ => Rate::Crf(20.0),
            };
            let preset = match flag(rest, "--preset").unwrap_or("balanced") {
                "speed" => Preset::Speed,
                "balanced" => Preset::Balanced,
                "quality" => Preset::Quality,
                other => {
                    return Err(format!(
                        "--preset wants speed, balanced or quality, got {other:?}"
                    ));
                }
            };
            let keyint = number::<u32>(rest, "--keyint")?.unwrap_or(60);
            let threads = number::<usize>(rest, "--threads")?.unwrap_or(0);
            Settings::H264 {
                fps_num,
                fps_den,
                keyint,
                rate,
                preset,
                threads,
            }
        }
        "prores" => {
            let profile = match flag(rest, "--prores-profile").unwrap_or("hq") {
                "proxy" => ProResProfile::Proxy,
                "lt" => ProResProfile::Lt,
                "standard" => ProResProfile::Standard,
                "hq" => ProResProfile::Hq,
                "4444" => ProResProfile::P4444,
                other => {
                    return Err(format!(
                        "--prores-profile wants proxy, lt, standard, hq or 4444, got {other:?}"
                    ));
                }
            };
            Settings::ProRes { profile }
        }
        other => return Err(format!("--codec wants h264 or prores, got {other:?}")),
    };
    let stdin = io::stdin();
    let stdout = io::stdout();
    let mut input = io::BufReader::with_capacity(1 << 22, stdin.lock());
    let mut out = BufWriter::with_capacity(1 << 20, stdout.lock());
    encode::run(width, height, &settings, &mut input, &mut out)
}

/// The sound of `[from, to)` seconds of a file, for the export's mixer.
fn decode_audio(path: &Path, rest: &[String]) -> Result<(), String> {
    let from = number::<f64>(rest, "--from")?.ok_or("decode-audio wants --from")?;
    let to = number::<f64>(rest, "--to")?.ok_or("decode-audio wants --to")?;
    let stretch = audio::decode_range(path, from, to)?;
    let stdout = io::stdout();
    let mut out = BufWriter::with_capacity(1 << 20, stdout.lock());
    audio::write_stretch(&mut out, &stretch).map_err(|e| e.to_string())?;
    out.flush().map_err(|e| e.to_string())
}

/// Interleaved f32 sound on stdin, a finished file on stdout.
fn encode_audio(rest: &[String]) -> Result<(), String> {
    let format = match flag(rest, "--format").unwrap_or("aac") {
        "aac" => audio::Format::Aac,
        "wav" => audio::Format::Wav,
        "mp3" => audio::Format::Mp3,
        other => return Err(format!("--format wants aac, wav or mp3, got {other:?}")),
    };
    let sample_rate = number::<u32>(rest, "--rate")?.unwrap_or(48_000);
    let channels = number::<u16>(rest, "--channels")?.unwrap_or(2);
    if sample_rate == 0 || channels == 0 || channels > 8 {
        return Err(format!(
            "sound of {channels} channels at {sample_rate} Hz cannot be encoded: 1 to 8 channels at a rate above 0"
        ));
    }
    let bits = number::<u8>(rest, "--bits")?.unwrap_or(16);
    if bits != 16 && bits != 24 {
        return Err(format!("--bits wants 16 or 24, got {bits}"));
    }
    let kbps = number::<u32>(rest, "--kbps")?.unwrap_or(128);
    let settings = audio::Settings {
        format,
        sample_rate,
        channels,
        bitrate: kbps.saturating_mul(1000),
        bits,
    };
    let stdin = io::stdin();
    let stdout = io::stdout();
    let mut input = io::BufReader::with_capacity(1 << 20, stdin.lock());
    let mut out = BufWriter::with_capacity(1 << 20, stdout.lock());
    audio::encode(&settings, &mut input, &mut out)
}
