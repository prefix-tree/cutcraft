//! One decoder per codec over craft-video, each handing back 8-bit I420 pictures with the presentation time they were
//! fed with. Samples go in in decode order; pictures come out in presentation order.

use craft_video::{av1, dnx, h264, hevc, prores, vp8, vp9};

use crate::convert::{i420_from_u8, i420_from_u16, tight};
use crate::demux::Codec;
use crate::wire::{Color, I420};

pub struct Picture {
    pub pts: i64,
    pub image: I420,
    pub color: Color,
}

pub trait Decoder {
    fn decode(&mut self, sample: &[u8], pts: i64) -> Result<Vec<Picture>, String>;
    /// Pictures held back for reordering, at the end of the stream.
    fn flush(&mut self) -> Result<Vec<Picture>, String>;
}

/// A decoder for `codec`, or why there is none.
pub fn decoder_for(codec: &Codec, threads: usize) -> Result<Box<dyn Decoder>, String> {
    let threads = threads.max(1);
    Ok(match codec {
        Codec::H264(avcc) => {
            let mut dec = h264::decode::Decoder::with_threads(threads);
            dec.configure_avcc(avcc)
                .map_err(|e| format!("H.264: {e}"))?;
            Box::new(H264(dec))
        }
        Codec::Hevc(hvcc) => {
            let mut dec = hevc::decode::Decoder::with_threads(threads);
            dec.configure_hvcc(hvcc).map_err(|e| format!("HEVC: {e}"))?;
            Box::new(Hevc(dec))
        }
        Codec::Vp9 => Box::new(Vp9(vp9::decode::Decoder::with_threads(threads))),
        Codec::Vp8 => Box::new(Vp8(vp8::Decoder::with_max_luma_samples(1 << 26))),
        Codec::Av1(obus) => Box::new(Av1 {
            dec: av1::decode::Decoder::with_threads(threads),
            obus: obus.clone(),
            primed: false,
        }),
        Codec::ProRes => Box::new(ProRes {
            threads: threads > 1,
        }),
        Codec::Dnx => Box::new(Dnx),
        Codec::Other(name) => return Err(format!("the native decoder does not read {name} video")),
    })
}

struct H264(h264::decode::Decoder);

impl H264 {
    fn picture(p: h264::decode::Picture) -> Result<Picture, String> {
        let (w, h, cw, ch) = (p.width, p.height, p.chroma_width, p.chroma_height);
        let y = tight(p.y, p.y_stride, w as usize, h as usize)?;
        let u = tight(p.u, p.uv_stride, cw as usize, ch as usize)?;
        let v = tight(p.v, p.uv_stride, cw as usize, ch as usize)?;
        let color = Color::resolve(p.color.matrix, p.color.full_range);
        Ok(Picture {
            pts: p.pts,
            image: i420_from_u8(w, h, y, &u, &v, cw, ch)?,
            color,
        })
    }
}

impl Decoder for H264 {
    fn decode(&mut self, sample: &[u8], pts: i64) -> Result<Vec<Picture>, String> {
        let pics = self
            .0
            .decode(sample, pts)
            .map_err(|e| format!("H.264: {e}"))?;
        pics.into_iter().map(Self::picture).collect()
    }
    fn flush(&mut self) -> Result<Vec<Picture>, String> {
        self.0.flush().into_iter().map(Self::picture).collect()
    }
}

struct Hevc(hevc::decode::Decoder);

impl Hevc {
    fn picture(p: hevc::decode::Picture) -> Result<Picture, String> {
        use hevc::decode::Plane;
        let (w, h, cw, ch) = (p.width, p.height, p.chroma_width, p.chroma_height);
        let color = Color::resolve(p.color.matrix, p.color.full_range);
        let image = match (p.y, p.u, p.v) {
            (Plane::U8(y), Plane::U8(u), Plane::U8(v)) => {
                let y = tight(y, p.y_stride, w as usize, h as usize)?;
                let u = tight(u, p.uv_stride, cw as usize, ch as usize)?;
                let v = tight(v, p.uv_stride, cw as usize, ch as usize)?;
                i420_from_u8(w, h, y, &u, &v, cw, ch)?
            }
            (y, u, v) => {
                let wide =
                    |pl: Plane, stride: usize, pw: u32, ph: u32| -> Result<Vec<u16>, String> {
                        let v = match pl {
                            Plane::U16(v) => v,
                            Plane::U8(v) => v.into_iter().map(u16::from).collect(),
                        };
                        tight(v, stride, pw as usize, ph as usize)
                    };
                let (y, u, v) = (
                    wide(y, p.y_stride, w, h)?,
                    wide(u, p.uv_stride, cw, ch)?,
                    wide(v, p.uv_stride, cw, ch)?,
                );
                i420_from_u16(w, h, p.bit_depth, &y, &u, &v, cw, ch)?
            }
        };
        Ok(Picture {
            pts: p.pts,
            image,
            color,
        })
    }
}

impl Decoder for Hevc {
    fn decode(&mut self, sample: &[u8], pts: i64) -> Result<Vec<Picture>, String> {
        let pics = self
            .0
            .decode(sample, pts)
            .map_err(|e| format!("HEVC: {e}"))?;
        pics.into_iter().map(Self::picture).collect()
    }
    fn flush(&mut self) -> Result<Vec<Picture>, String> {
        self.0.flush().into_iter().map(Self::picture).collect()
    }
}

struct Vp9(vp9::decode::Decoder);

impl Vp9 {
    fn picture(p: vp9::decode::Picture) -> Result<Picture, String> {
        use vp9::decode::Plane;
        if p.color.color_space == 7 {
            return Err("VP9: RGB (4:4:4 sRGB) streams are not read by the native decoder".into());
        }
        let (w, h, cw, ch) = (p.width, p.height, p.chroma_width, p.chroma_height);
        // VP9's own colour space codes: 1 BT.601, 2 BT.709, 3 SMPTE 170 (601), 5 BT.2020.
        let matrix = match p.color.color_space {
            1 | 3 => 6,
            2 => 1,
            5 => 9,
            _ => 2,
        };
        let color = Color::resolve(matrix, p.color.full_range);
        let image = match (p.y, p.u, p.v) {
            (Plane::U8(y), Plane::U8(u), Plane::U8(v)) => {
                let y = tight(y, p.y_stride, w as usize, h as usize)?;
                let u = tight(u, p.uv_stride, cw as usize, ch as usize)?;
                let v = tight(v, p.uv_stride, cw as usize, ch as usize)?;
                i420_from_u8(w, h, y, &u, &v, cw, ch)?
            }
            (Plane::U16(y), Plane::U16(u), Plane::U16(v)) => {
                let y = tight(y, p.y_stride, w as usize, h as usize)?;
                let u = tight(u, p.uv_stride, cw as usize, ch as usize)?;
                let v = tight(v, p.uv_stride, cw as usize, ch as usize)?;
                i420_from_u16(w, h, p.bit_depth, &y, &u, &v, cw, ch)?
            }
            _ => return Err("VP9: planes of mixed depth".into()),
        };
        Ok(Picture {
            pts: p.pts,
            image,
            color,
        })
    }
}

impl Decoder for Vp9 {
    fn decode(&mut self, sample: &[u8], pts: i64) -> Result<Vec<Picture>, String> {
        let pics = self
            .0
            .decode(sample, pts)
            .map_err(|e| format!("VP9: {e}"))?;
        pics.into_iter().map(Self::picture).collect()
    }
    fn flush(&mut self) -> Result<Vec<Picture>, String> {
        self.0.flush().into_iter().map(Self::picture).collect()
    }
}

struct Vp8(vp8::Decoder);

impl Decoder for Vp8 {
    fn decode(&mut self, sample: &[u8], pts: i64) -> Result<Vec<Picture>, String> {
        let Some(p) = self
            .0
            .decode(sample, pts)
            .map_err(|e| format!("VP8: {e}"))?
        else {
            return Ok(Vec::new());
        };
        let image = i420_from_u8(
            p.width,
            p.height,
            p.y,
            &p.u,
            &p.v,
            p.chroma_width,
            p.chroma_height,
        )?;
        Ok(vec![Picture {
            pts: p.pts,
            image,
            color: Color::BT601,
        }])
    }
    fn flush(&mut self) -> Result<Vec<Picture>, String> {
        Ok(Vec::new())
    }
}

struct Av1 {
    dec: av1::decode::Decoder,
    obus: Vec<u8>,
    primed: bool,
}

impl Av1 {
    fn picture(p: av1::decode::Picture) -> Result<Picture, String> {
        let (w, h) = (p.width, p.height);
        let (cw, ch) = (p.plane_width(1), p.plane_height(1));
        let color = Color::resolve(p.matrix_coefficients, p.full_range);
        let [y, u, v] = p.planes;
        let (u, v) = if p.mono_chrome {
            let grey = vec![
                1u16 << (u32::from(p.bit_depth).saturating_sub(1));
                (cw as usize) * (ch as usize)
            ];
            (grey.clone(), grey)
        } else {
            (u, v)
        };
        Ok(Picture {
            pts: p.pts,
            image: i420_from_u16(w, h, u32::from(p.bit_depth), &y, &u, &v, cw, ch)?,
            color,
        })
    }
}

impl Decoder for Av1 {
    fn decode(&mut self, sample: &[u8], pts: i64) -> Result<Vec<Picture>, String> {
        if !self.primed {
            self.primed = true;
            if !self.obus.is_empty() {
                self.dec
                    .decode(&self.obus)
                    .map_err(|e| format!("AV1: {e}"))?;
            }
        }
        let pics = self
            .dec
            .decode_pts(sample, pts)
            .map_err(|e| format!("AV1: {e}"))?;
        pics.into_iter().map(Self::picture).collect()
    }
    fn flush(&mut self) -> Result<Vec<Picture>, String> {
        self.dec.flush().into_iter().map(Self::picture).collect()
    }
}

struct ProRes {
    threads: bool,
}

impl Decoder for ProRes {
    fn decode(&mut self, sample: &[u8], pts: i64) -> Result<Vec<Picture>, String> {
        let options = prores::DecodeOptions {
            threads: self.threads,
            ..prores::DecodeOptions::default()
        };
        let f = prores::decode_frame_with(sample, &options).map_err(|e| format!("ProRes: {e}"))?;
        let cw = match f.chroma {
            prores::ChromaFormat::Yuv422 => f.width.div_ceil(2),
            prores::ChromaFormat::Yuv444 => f.width,
        };
        let color = Color::resolve(f.color.matrix, false);
        let image = i420_from_u16(
            f.width,
            f.height,
            u32::from(f.bit_depth),
            &f.y,
            &f.cb,
            &f.cr,
            cw,
            f.height,
        )?;
        Ok(vec![Picture { pts, image, color }])
    }
    fn flush(&mut self) -> Result<Vec<Picture>, String> {
        Ok(Vec::new())
    }
}

struct Dnx;

impl Decoder for Dnx {
    fn decode(&mut self, sample: &[u8], pts: i64) -> Result<Vec<Picture>, String> {
        let f = dnx::decode_frame(sample).map_err(|e| format!("DNxHD: {e}"))?;
        if f.rgb {
            return Err("DNxHR: RGB 4:4:4 streams are not read by the native decoder".into());
        }
        let (cw, ch) = match f.chroma {
            dnx::ChromaFormat::Yuv420 => (f.width.div_ceil(2), f.height.div_ceil(2)),
            dnx::ChromaFormat::Yuv422 => (f.width.div_ceil(2), f.height),
            dnx::ChromaFormat::Yuv444 => (f.width, f.height),
        };
        let matrix = if matches!(
            f.color_volume,
            dnx::ColorVolume::Bt2020Ncl | dnx::ColorVolume::Bt2020Cl
        ) {
            9
        } else {
            1
        };
        let image = i420_from_u16(
            f.width,
            f.height,
            u32::from(f.bit_depth),
            &f.y,
            &f.cb,
            &f.cr,
            cw,
            ch,
        )?;
        Ok(vec![Picture {
            pts,
            image,
            color: Color {
                matrix,
                full_range: false,
            },
        }])
    }
    fn flush(&mut self) -> Result<Vec<Picture>, String> {
        Ok(Vec::new())
    }
}
