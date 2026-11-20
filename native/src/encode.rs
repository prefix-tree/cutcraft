//! Encodes the export's pictures: H.264 for an MP4, ProRes for a MOV. Pictures arrive as RGBA on stdin; the decoder
//! configuration and then the packets leave on stdout.

use std::io::{Read, Write};

use craft_video::{h264, prores};

use crate::convert::{i420_from_rgba, yuv10_from_rgba};
use crate::wire::{read_raw, write_config, write_packet};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Preset {
    Speed,
    Balanced,
    Quality,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub enum Rate {
    /// A target in kilobits per second; peaks up to half as much again.
    Kbps(u32),
    Crf(f32),
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ProResProfile {
    Proxy,
    Lt,
    Standard,
    Hq,
    P4444,
}

#[derive(Clone, Debug, PartialEq)]
pub enum Settings {
    H264 {
        fps_num: u32,
        fps_den: u32,
        keyint: u32,
        rate: Rate,
        preset: Preset,
        threads: usize,
    },
    ProRes {
        profile: ProResProfile,
    },
}

pub fn run(
    width: u32,
    height: u32,
    settings: &Settings,
    input: &mut impl Read,
    out: &mut impl Write,
) -> Result<(), String> {
    match settings {
        Settings::H264 {
            fps_num,
            fps_den,
            keyint,
            rate,
            preset,
            threads,
        } => {
            let mut cfg = h264::EncoderConfig::new(width, height, *fps_num, *fps_den);
            cfg.profile = h264::Profile::High;
            cfg.preset = match preset {
                Preset::Speed => h264::Preset::Speed,
                Preset::Balanced => h264::Preset::Balanced,
                Preset::Quality => h264::Preset::Quality,
            };
            cfg.rate = match *rate {
                Rate::Kbps(k) => h264::RateControl::Vbr {
                    target_kbps: k,
                    max_kbps: k.saturating_mul(3) / 2,
                },
                Rate::Crf(q) => h264::RateControl::Crf(q),
            };
            cfg.keyint = (*keyint).max(1);
            // Pictures in display order, so a piece's packets need no reordering to be joined to the next.
            cfg.bframes = 0;
            // Keyframes only where the export asks, so every piece is whole groups of pictures.
            cfg.scenecut = false;
            cfg.format = h264::PacketFormat::LengthPrefixed;
            cfg.color = h264::ColorConfig {
                primaries: 1,
                transfer: 1,
                matrix: 1,
                full_range: false,
            };
            cfg.threads = *threads;
            let mut enc = h264::Encoder::new(cfg).map_err(|e| format!("H.264 encoder: {e}"))?;
            write_config(out, &enc.avcc()).map_err(|e| e.to_string())?;
            let mut index = 0i64;
            while let Some(rgba) = read_raw(input, width, height).map_err(|e| e.to_string())? {
                let pic = i420_from_rgba(&rgba, width, height)?;
                let (w2, _) = crate::wire::I420::chroma_size(width, height);
                let frame = h264::YuvFrame {
                    y: &pic.y,
                    u: &pic.u,
                    v: &pic.v,
                    y_stride: width as usize,
                    uv_stride: w2,
                };
                for p in enc
                    .encode(&frame, index)
                    .map_err(|e| format!("H.264 encoder: {e}"))?
                {
                    write_packet(out, p.keyframe, p.pts, p.dts, &p.data)
                        .map_err(|e| e.to_string())?;
                }
                index += 1;
            }
            for p in enc.flush() {
                write_packet(out, p.keyframe, p.pts, p.dts, &p.data).map_err(|e| e.to_string())?;
            }
        }
        Settings::ProRes { profile } => {
            let (p, full_chroma) = match profile {
                ProResProfile::Proxy => (prores::Profile::Proxy, false),
                ProResProfile::Lt => (prores::Profile::Lt, false),
                ProResProfile::Standard => (prores::Profile::Standard, false),
                ProResProfile::Hq => (prores::Profile::Hq, false),
                ProResProfile::P4444 => (prores::Profile::P4444, true),
            };
            let mut cfg = prores::EncoderConfig::new(p, width, height);
            cfg.color.primaries = 1;
            cfg.color.transfer = 1;
            cfg.color.matrix = 1;
            let mut enc = prores::Encoder::with_config(cfg);
            write_config(out, &[]).map_err(|e| e.to_string())?;
            let chroma = if full_chroma {
                prores::ChromaFormat::Yuv444
            } else {
                prores::ChromaFormat::Yuv422
            };
            let mut index = 0i64;
            while let Some(rgba) = read_raw(input, width, height).map_err(|e| e.to_string())? {
                let (y, cb, cr) = yuv10_from_rgba(&rgba, width, height, full_chroma)?;
                let mut frame = prores::Frame::new(width, height, chroma, 10, false)
                    .map_err(|e| format!("ProRes: {e}"))?;
                frame.y = y;
                frame.cb = cb;
                frame.cr = cr;
                let data = enc
                    .encode(&frame)
                    .map_err(|e| format!("ProRes encoder: {e}"))?;
                write_packet(out, true, index, index, &data).map_err(|e| e.to_string())?;
                index += 1;
            }
        }
    }
    out.flush().map_err(|e| e.to_string())
}
