//! Sound, with craft-audio: a stretch of an asset's audio decoded for the export's mixer, and the mixed soundtrack
//! encoded into the file the export muxes (AAC in an M4A, PCM in a WAV, or an MP3).

use std::fs::File;
use std::io::{Cursor, Read, Write};
use std::path::Path;

use craft_audio::{BitDepth, DecodeOptions, Decoder, EncodeFormat, EncodeOptions, FileEncoder};

/// Decoded sound: header, then each channel's samples in turn as f32.
pub const AUDIO_MAGIC: &[u8; 4] = b"UBA1";
pub const AUDIO_HEADER: usize = 16;

/// The most frames one `decode-audio` answers with: a corrupt or hostile range cannot ask for gigabytes. An hour at
/// 192 kHz.
const MAX_FRAMES: u64 = 192_000 * 3600;

/// How much earlier than a stretch decoding starts: Opus's 80 ms, with room for MP3's bit reservoir and an AAC frame.
const PREROLL_SECONDS: f64 = 0.12;

/// What the mixer gets for `[from, to)` seconds of `path`'s first audio track: `⌈(to − from) × rate⌉` frames at the
/// track's own rate, the first at `from`, silence where the track has no sound (before its start, after its end).
#[derive(Debug, PartialEq)]
pub struct Stretch {
    pub sample_rate: u32,
    /// One array per channel, all the same length; none when the file has no audio track.
    pub channels: Vec<Vec<f32>>,
}

pub fn decode_range(path: &Path, from: f64, to: f64) -> Result<Stretch, String> {
    if !from.is_finite() || !to.is_finite() || to < from {
        return Err(format!(
            "decode-audio wants finite --from ≤ --to, got {from} and {to}"
        ));
    }
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .map(str::to_ascii_lowercase);
    let open = |p: &Path| File::open(p).map_err(|e| format!("{}: {e}", p.display()));
    let tracks = craft_audio::tracks_of(open(path)?, ext.as_deref()).map_err(|e| e.to_string())?;
    if tracks.is_empty() {
        return Ok(Stretch {
            sample_rate: 48_000,
            channels: Vec::new(),
        });
    }
    let mut dec = Decoder::open(open(path)?, ext.as_deref(), &DecodeOptions::default())
        .map_err(|e| e.to_string())?;
    let rate = dec.info().sample_rate;
    let count = usize::from(dec.info().channels.max(1));
    let sr = f64::from(rate);
    let frames = ((to - from) * sr).ceil().max(1.0) as u64;
    if frames > MAX_FRAMES {
        return Err(format!(
            "decode-audio was asked for {frames} frames; the most is {MAX_FRAMES}"
        ));
    }
    let frames = frames as usize;
    let mut channels = vec![vec![0f32; frames]; count];
    // Frame of the track at `from`; a negative one means the stretch starts before the track does.
    let first = (from * sr).round() as i64;
    let mut at = first.min(0).unsigned_abs() as usize; // where the track's sound starts landing in the stretch
    let start = first.max(0) as u64;
    if dec.length_known() && start >= dec.info().frames {
        return Ok(Stretch {
            sample_rate: rate,
            channels,
        });
    }
    // Decoding starts a little early and the warm-up is dropped: a decoder that starts mid-stream needs it to converge
    // to what a decode from the start gives (Opus asks for 80 ms, RFC 7845 §4.6).
    let preroll = (PREROLL_SECONDS * sr).round() as u64;
    // The track frame of the next sample decoded.
    let mut pos = dec
        .seek(start.saturating_sub(preroll))
        .map_err(|e| e.to_string())?;
    at += pos.saturating_sub(start) as usize;
    while at < frames {
        let Some(block) = dec.next_block().map_err(|e| e.to_string())? else {
            break;
        };
        let skip = (start.saturating_sub(pos) as usize).min(block.frames());
        pos += block.frames() as u64;
        let n = (block.frames() - skip).min(frames - at);
        for (ch, out) in channels.iter_mut().enumerate() {
            // A block with fewer channels than the track declared repeats its last one.
            if let Some(src) = block.channels.get(ch).or_else(|| block.channels.last()) {
                out[at..at + n].copy_from_slice(&src[skip..skip + n]);
            }
        }
        at += n;
    }
    Ok(Stretch {
        sample_rate: rate,
        channels,
    })
}

pub fn write_stretch(out: &mut impl Write, s: &Stretch) -> std::io::Result<()> {
    let frames = s.channels.first().map_or(0, Vec::len);
    let mut h = [0u8; AUDIO_HEADER];
    h[0..4].copy_from_slice(AUDIO_MAGIC);
    h[4..8].copy_from_slice(&s.sample_rate.to_le_bytes());
    h[8..12].copy_from_slice(&(s.channels.len() as u32).to_le_bytes());
    h[12..16].copy_from_slice(&(frames as u32).to_le_bytes());
    out.write_all(&h)?;
    let mut bytes = Vec::with_capacity(frames * 4);
    for ch in &s.channels {
        bytes.clear();
        for v in ch {
            bytes.extend_from_slice(&v.to_le_bytes());
        }
        out.write_all(&bytes)?;
    }
    Ok(())
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Format {
    /// AAC-LC in an M4A, its edit list trimming the encoder's priming.
    Aac,
    /// Integer PCM in a WAV.
    Wav,
    Mp3,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Settings {
    pub format: Format,
    pub sample_rate: u32,
    pub channels: u16,
    /// Bits per second for AAC and MP3.
    pub bitrate: u32,
    /// 16 or 24, for a WAV.
    pub bits: u8,
}

/// Frames read from stdin per block.
const BLOCK: usize = 4096;

/// Encodes interleaved f32 samples from `input` until it ends, and writes the whole file to `out`. Samples beyond
/// full scale are clamped by the integer formats and by the encoders.
pub fn encode(s: &Settings, input: &mut impl Read, out: &mut impl Write) -> Result<(), String> {
    let format = match s.format {
        Format::Aac => EncodeFormat::Aac,
        Format::Wav => EncodeFormat::Wav,
        Format::Mp3 => EncodeFormat::Mp3,
    };
    let mut opts = EncodeOptions::new(format);
    opts = match s.format {
        Format::Wav => opts.with_bit_depth(if s.bits == 24 {
            BitDepth::Int24
        } else {
            BitDepth::Int16
        }),
        Format::Aac | Format::Mp3 => opts.with_bitrate(s.bitrate),
    };
    opts.check(s.sample_rate, s.channels)
        .map_err(|e| e.to_string())?;
    let mut enc = FileEncoder::new(Cursor::new(Vec::new()), &opts, s.sample_rate, s.channels)
        .map_err(|e| e.to_string())?;
    let count = usize::from(s.channels);
    let mut raw = vec![0u8; BLOCK * count * 4];
    let mut planar = vec![vec![0f32; BLOCK]; count];
    let mut filled = 0usize; // bytes in `raw`
    loop {
        let n = input.read(&mut raw[filled..]).map_err(|e| e.to_string())?;
        filled += n;
        let whole = filled / (count * 4);
        if whole > 0 && (filled == raw.len() || n == 0) {
            for f in 0..whole {
                for (ch, plane) in planar.iter_mut().enumerate() {
                    let at = (f * count + ch) * 4;
                    plane[f] = f32::from_le_bytes([raw[at], raw[at + 1], raw[at + 2], raw[at + 3]]);
                }
            }
            enc.write(&planar, whole).map_err(|e| e.to_string())?;
            let used = whole * count * 4;
            raw.copy_within(used..filled, 0);
            filled -= used;
        }
        if n == 0 {
            break;
        }
    }
    if filled != 0 {
        return Err(format!(
            "the sound ended {filled} bytes into a frame of {count} channels"
        ));
    }
    let file = enc.finish().map_err(|e| e.to_string())?.into_inner();
    out.write_all(&file).map_err(|e| e.to_string())?;
    out.flush().map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn tone(rate: u32, seconds: f64) -> Vec<u8> {
        let frames = (f64::from(rate) * seconds) as usize;
        let mut bytes = Vec::with_capacity(frames * 8);
        for i in 0..frames {
            let v = (i as f32 / rate as f32 * 440.0 * std::f32::consts::TAU).sin() * 0.5;
            bytes.extend_from_slice(&v.to_le_bytes());
            bytes.extend_from_slice(&(-v).to_le_bytes());
        }
        bytes
    }

    fn written(format: Format, bits: u8) -> Vec<u8> {
        let settings = Settings {
            format,
            sample_rate: 48_000,
            channels: 2,
            bitrate: 128_000,
            bits,
        };
        let mut out = Vec::new();
        encode(&settings, &mut tone(48_000, 1.0).as_slice(), &mut out).unwrap();
        out
    }

    #[test]
    fn a_wav_holds_every_frame_and_both_channels() {
        let wav = written(Format::Wav, 24);
        let (info, buf) = craft_audio::decode(&wav, Some("wav")).unwrap();
        assert_eq!(
            (info.sample_rate, info.channels, info.frames),
            (48_000, 2, 48_000)
        );
        let (l, r) = (&buf.channels[0], &buf.channels[1]);
        assert!(
            (l[100] + r[100]).abs() < 1e-4,
            "the right channel is the left inverted"
        );
        assert!(
            (l[100] - (100f32 / 48_000.0 * 440.0 * std::f32::consts::TAU).sin() * 0.5).abs() < 1e-4
        );
    }

    #[test]
    fn an_aac_decodes_to_the_length_written() {
        let m4a = written(Format::Aac, 0);
        assert_eq!(&m4a[4..8], b"ftyp");
        let (info, buf) = craft_audio::decode(&m4a, Some("m4a")).unwrap();
        assert_eq!((info.sample_rate, info.channels), (48_000, 2));
        assert_eq!(
            buf.channels[0].len(),
            48_000,
            "the edit list trims the priming"
        );
    }

    #[test]
    fn a_frame_cut_short_is_an_error() {
        let settings = Settings {
            format: Format::Wav,
            sample_rate: 48_000,
            channels: 2,
            bitrate: 0,
            bits: 16,
        };
        let mut bytes = tone(48_000, 0.01);
        bytes.truncate(bytes.len() - 4);
        assert!(encode(&settings, &mut bytes.as_slice(), &mut Vec::new()).is_err());
    }

    #[test]
    fn a_range_is_placed_at_its_start_with_silence_around_the_track() {
        let dir = std::env::temp_dir().join(format!("uberscene-audio-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("tone.wav");
        std::fs::write(&path, written(Format::Wav, 24)).unwrap();
        // Half a second before the track, half inside it.
        let s = decode_range(&path, -0.5, 0.5).unwrap();
        assert_eq!(
            (s.sample_rate, s.channels.len(), s.channels[0].len()),
            (48_000, 2, 48_000)
        );
        assert!(s.channels[0][..24_000].iter().all(|v| *v == 0.0));
        let expect = |i: usize| (i as f32 / 48_000.0 * 440.0 * std::f32::consts::TAU).sin() * 0.5;
        assert!((s.channels[0][24_000 + 100] - expect(100)).abs() < 1e-4);
        // From inside the track to past its end.
        let s = decode_range(&path, 0.75, 1.25).unwrap();
        assert!((s.channels[0][10] - expect(36_000 + 10)).abs() < 1e-4);
        assert!(s.channels[0][12_000..].iter().all(|v| *v == 0.0));
        // Wholly after it.
        let s = decode_range(&path, 2.0, 2.5).unwrap();
        assert!(s.channels[0].iter().all(|v| *v == 0.0));
        std::fs::remove_dir_all(&dir).ok();
    }
}
