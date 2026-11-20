//! Reads the video track of an MP4/MOV or a Matroska/WebM file with craft-media, as one list of samples in decode
//! order with presentation times, whatever the container.

use std::collections::HashMap;
use std::fs::File;
use std::path::Path;

use craft_media::isobmff::{self, CodecConfig, Mp4File, TrackKind};
use craft_media::matroska::{self, Codec as MkvCodec, MkvFile};

/// The codec of a video track, with what its decoder needs to start.
#[derive(Clone, Debug)]
pub enum Codec {
    /// The `avcC` record: the decoder reads length-prefixed samples.
    H264(Vec<u8>),
    /// The `hvcC` record.
    Hevc(Vec<u8>),
    Vp8,
    Vp9,
    /// The `av1C`'s configuration OBUs (a sequence header), fed before the first sample.
    Av1(Vec<u8>),
    ProRes,
    Dnx,
    /// A codec the sidecar does not decode, by its container name.
    Other(String),
}

impl Codec {
    pub fn name(&self) -> String {
        match self {
            Codec::H264(_) => "h264".into(),
            Codec::Hevc(_) => "hevc".into(),
            Codec::Vp8 => "vp8".into(),
            Codec::Vp9 => "vp9".into(),
            Codec::Av1(_) => "av1".into(),
            Codec::ProRes => "prores".into(),
            Codec::Dnx => "dnxhd".into(),
            Codec::Other(name) => name.clone(),
        }
    }
}

/// One sample, in the track's ticks: presentation time (edit lists applied) and how long it shows.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Sample {
    pub pts: i64,
    pub sync: bool,
}

enum Container {
    Mp4 { file: Box<Mp4File>, track: usize },
    Mkv { file: Box<MkvFile>, track: usize },
}

pub struct Video {
    pub codec: Codec,
    /// The coded size, before rotation.
    pub width: u32,
    pub height: u32,
    /// Clockwise quarter turns the container asks for at display.
    pub rotation: u8,
    /// Ticks per second.
    pub timescale: f64,
    /// In decode order.
    pub samples: Vec<Sample>,
    /// How long each presentation time shows, in ticks: until the next one, the last by its own duration.
    durations: HashMap<i64, i64>,
    source: File,
    container: Container,
}

impl Video {
    pub fn open(path: &Path) -> Result<Video, String> {
        let source =
            File::open(path).map_err(|e| format!("cannot open {}: {e}", path.display()))?;
        let mut head = [0u8; 12];
        let n = std::io::Read::read(&mut &source, &mut head)
            .map_err(|e| format!("cannot read {}: {e}", path.display()))?;
        let matroska = n >= 4 && head[0..4] == [0x1a, 0x45, 0xdf, 0xa3];
        if matroska {
            Self::open_mkv(source)
        } else {
            Self::open_mp4(source)
        }
    }

    fn open_mp4(source: File) -> Result<Video, String> {
        let file = isobmff::open(&source)
            .map_err(|e| format!("not an MP4 or MOV file the decoder can read ({e})"))?;
        let track = file
            .tracks
            .iter()
            .position(|t| t.kind == TrackKind::Video && !t.samples.is_empty())
            .ok_or("the file has no video track")?;
        let t = &file.tracks[track];
        let entry = t
            .entries
            .first()
            .ok_or("the video track has no sample description")?;
        let codec = match &entry.codec {
            CodecConfig::Avc(c) => Codec::H264(c.to_bytes()),
            CodecConfig::Hevc(c) => Codec::Hevc(c.to_bytes()),
            CodecConfig::Vp9(_) => Codec::Vp9,
            CodecConfig::Av1(c) => Codec::Av1(c.config_obus.clone()),
            CodecConfig::ProRes { .. } => Codec::ProRes,
            CodecConfig::Dnx { .. } => Codec::Dnx,
            _ if entry.format.0 == *b"vp08" => Codec::Vp8,
            other => Codec::Other(other.name().to_string()),
        };
        let (width, height) = match &entry.video {
            Some(v) if v.width > 0 && v.height > 0 => (u32::from(v.width), u32::from(v.height)),
            _ => (t.width, t.height),
        };
        let samples: Vec<Sample> = t
            .samples
            .iter()
            .map(|s| Sample {
                pts: s.pts.saturating_add(t.edit_offset),
                sync: s.is_sync,
            })
            .collect();
        let last = t
            .samples
            .iter()
            .rev()
            .map(|s| i64::from(s.duration))
            .find(|&d| d > 0);
        let durations = durations_of(&samples, last);
        Ok(Video {
            codec,
            width,
            height,
            rotation: t.display_rotation().unwrap_or(0),
            timescale: f64::from(t.timescale.max(1)),
            samples,
            durations,
            source,
            container: Container::Mp4 {
                file: Box::new(file),
                track,
            },
        })
    }

    fn open_mkv(source: File) -> Result<Video, String> {
        let file = matroska::open(&source)
            .map_err(|e| format!("not a WebM or Matroska file the decoder can read ({e})"))?;
        let track = file
            .tracks
            .iter()
            .position(|t| t.kind == matroska::TrackKind::Video && !t.samples.is_empty())
            .ok_or("the file has no video track")?;
        let t = &file.tracks[track];
        let codec = match &t.codec {
            MkvCodec::Avc { avcc } => Codec::H264(avcc.clone()),
            MkvCodec::Hevc { hvcc } => Codec::Hevc(hvcc.clone()),
            MkvCodec::Vp8 => Codec::Vp8,
            MkvCodec::Vp9 { .. } => Codec::Vp9,
            MkvCodec::Av1 { av1c } => Codec::Av1(
                isobmff::Av1Config::parse(av1c)
                    .map(|c| c.config_obus)
                    .unwrap_or_default(),
            ),
            MkvCodec::ProRes { .. } => Codec::ProRes,
            _ => Codec::Other(t.codec_id.clone()),
        };
        let (width, height) = t
            .video
            .as_ref()
            .map(|v| (v.pixel_width, v.pixel_height))
            .unwrap_or((0, 0));
        // Matroska stores no decode times; samples are in stored (decode) order. Times are kept in nanoseconds.
        let samples: Vec<Sample> = t
            .samples
            .iter()
            .map(|s| Sample {
                pts: t.ticks_to_ns(s.pts),
                sync: s.keyframe,
            })
            .collect();
        let last = t
            .samples
            .last()
            .map(|s| t.ticks_to_ns(i64::try_from(s.duration).unwrap_or(0)))
            .filter(|&d| d > 0)
            .or_else(|| t.default_duration_ns.and_then(|d| i64::try_from(d).ok()));
        let durations = durations_of(&samples, last);
        let rotation = t
            .video
            .as_ref()
            .and_then(|v| v.display_rotation())
            .unwrap_or(0);
        Ok(Video {
            codec,
            width,
            height,
            rotation,
            timescale: 1e9,
            samples,
            durations,
            source,
            container: Container::Mkv {
                file: Box::new(file),
                track,
            },
        })
    }

    /// The bytes of sample `index` (decode order).
    pub fn read(&self, index: usize) -> Result<Vec<u8>, String> {
        match &self.container {
            Container::Mp4 { file, track } => file
                .read_sample(&self.source, *track, index)
                .map_err(|e| e.to_string()),
            Container::Mkv { file, track } => file
                .read_sample(&self.source, *track, index)
                .map_err(|e| e.to_string()),
        }
    }

    /// How long the picture at `pts` shows, in ticks; never 0.
    pub fn duration_of(&self, pts: i64) -> i64 {
        self.durations
            .get(&pts)
            .copied()
            .filter(|&d| d > 0)
            .unwrap_or_else(|| self.typical_duration())
    }

    /// The most common gap between presentation times: the frame duration of a constant-rate file.
    pub fn typical_duration(&self) -> i64 {
        let mut counts: HashMap<i64, usize> = HashMap::new();
        for &d in self.durations.values() {
            *counts.entry(d).or_default() += 1;
        }
        counts
            .into_iter()
            .filter(|&(d, _)| d > 0)
            .max_by_key(|&(d, n)| (n, -d))
            .map(|(d, _)| d)
            .unwrap_or(1)
    }

    /// Seconds from the first presentation time to the end of the last picture.
    pub fn duration_seconds(&self) -> f64 {
        let first = self.samples.iter().map(|s| s.pts).min().unwrap_or(0).min(0);
        let end = self
            .samples
            .iter()
            .map(|s| s.pts.saturating_add(self.duration_of(s.pts)))
            .max()
            .unwrap_or(0);
        (end - first) as f64 / self.timescale
    }

    /// Pictures a second over the whole track (a WebM's millisecond times make single gaps uneven).
    pub fn fps(&self) -> f64 {
        let first = self.samples.iter().map(|s| s.pts).min().unwrap_or(0);
        let last = self.samples.iter().map(|s| s.pts).max().unwrap_or(0);
        if self.samples.len() >= 2 && last > first {
            (self.samples.len() - 1) as f64 * self.timescale / (last - first) as f64
        } else {
            self.timescale / self.typical_duration() as f64
        }
    }

    /// The display size: the coded size, turned.
    pub fn display_size(&self) -> (u32, u32) {
        if self.rotation % 2 == 1 {
            (self.height, self.width)
        } else {
            (self.width, self.height)
        }
    }

    /// The decode-order index to start decoding from to show time `t` (ticks): the sync sample before the sample
    /// presented at `t`.
    pub fn start_for(&self, t: i64) -> usize {
        let presented = self
            .samples
            .iter()
            .enumerate()
            .filter(|(_, s)| s.pts <= t)
            .max_by_key(|(_, s)| s.pts)
            .map(|(i, _)| i)
            .unwrap_or(0);
        (0..=presented)
            .rev()
            .find(|&i| self.samples.get(i).is_some_and(|s| s.sync))
            .unwrap_or(0)
    }
}

fn durations_of(samples: &[Sample], last: Option<i64>) -> HashMap<i64, i64> {
    let mut times: Vec<i64> = samples.iter().map(|s| s.pts).collect();
    times.sort_unstable();
    times.dedup();
    let mut out = HashMap::with_capacity(times.len());
    for w in times.windows(2) {
        out.insert(w[0], w[1] - w[0]);
    }
    if let Some(&end) = times.last() {
        let typical = times.windows(2).map(|w| w[1] - w[0]).min().unwrap_or(1);
        out.insert(end, last.unwrap_or(typical).max(1));
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn durations_run_to_the_next_presentation_time() {
        let samples = [0, 2000, 1000, 3000].map(|pts| Sample {
            pts,
            sync: pts == 0,
        });
        let d = durations_of(&samples, Some(1000));
        assert_eq!(
            (d[&0], d[&1000], d[&2000], d[&3000]),
            (1000, 1000, 1000, 1000)
        );
        // Without a last duration, the last picture shows as long as the shortest gap.
        assert_eq!(durations_of(&samples, None)[&3000], 1000);
    }
}
