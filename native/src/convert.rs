//! Pixel conversions: whatever a decoder hands back becomes 8-bit I420 for the page, and the page's RGBA becomes what
//! an encoder takes.

use crate::wire::I420;

/// A plane as a tight `w`×`h` buffer (decoders may pad rows to a stride).
pub fn tight<T: Copy>(src: Vec<T>, stride: usize, w: usize, h: usize) -> Result<Vec<T>, String> {
    if stride == w && src.len() >= w * h {
        let mut v = src;
        v.truncate(w * h);
        return Ok(v);
    }
    if stride < w || src.len() < stride.saturating_mul(h.saturating_sub(1)) + w {
        return Err(format!(
            "a decoded plane of {} samples is too small for {w}x{h} at stride {stride}",
            src.len()
        ));
    }
    let mut out = Vec::with_capacity(w * h);
    for row in 0..h {
        out.extend_from_slice(&src[row * stride..row * stride + w]);
    }
    Ok(out)
}

/// A chroma plane of `cw`×`ch` resampled to the half-size plane of a `w`×`h` 4:2:0 picture: 4:2:0 as it is, 4:2:2
/// averaged in pairs of rows, 4:4:4 in 2×2 blocks, 4:4:0 in pairs of columns.
fn to_half<T: Copy + Into<u32>>(
    src: &[T],
    cw: usize,
    ch: usize,
    w: usize,
    h: usize,
    shift: u32,
) -> Result<Vec<u8>, String> {
    let (hw, hh) = (w.div_ceil(2), h.div_ceil(2));
    if src.len() < cw * ch || cw == 0 || ch == 0 {
        return Err(format!(
            "a chroma plane of {} samples is too small for {cw}x{ch}",
            src.len()
        ));
    }
    let (sx, sy) = (usize::from(cw > hw), usize::from(ch > hh));
    let mut out = Vec::with_capacity(hw * hh);
    for y in 0..hh {
        for x in 0..hw {
            let mut sum = 0u32;
            let mut n = 0u32;
            for dy in 0..=sy {
                for dx in 0..=sx {
                    let (px, py) = (((x << sx) + dx).min(cw - 1), ((y << sy) + dy).min(ch - 1));
                    sum += src[py * cw + px].into();
                    n += 1;
                }
            }
            out.push((((sum + n / 2) / n) >> shift).min(255) as u8);
        }
    }
    Ok(out)
}

/// Tight 8-bit planes (luma `w`×`h`, chroma `cw`×`ch`) as I420.
pub fn i420_from_u8(
    w: u32,
    h: u32,
    y: Vec<u8>,
    u: &[u8],
    v: &[u8],
    cw: u32,
    ch: u32,
) -> Result<I420, String> {
    let (wu, hu) = (w as usize, h as usize);
    if y.len() < wu * hu {
        return Err(format!(
            "a luma plane of {} samples is too small for {w}x{h}",
            y.len()
        ));
    }
    let (hw, hh) = I420::chroma_size(w, h);
    let (u, v) =
        if cw as usize == hw && ch as usize == hh && u.len() >= hw * hh && v.len() >= hw * hh {
            (u[..hw * hh].to_vec(), v[..hw * hh].to_vec())
        } else {
            (
                to_half(u, cw as usize, ch as usize, wu, hu, 0)?,
                to_half(v, cw as usize, ch as usize, wu, hu, 0)?,
            )
        };
    let mut y = y;
    y.truncate(wu * hu);
    Ok(I420 {
        width: w,
        height: h,
        y,
        u,
        v,
    })
}

/// Tight planes of `bits` bits in `u16`s as 8-bit I420 (rounded, not truncated).
#[allow(clippy::too_many_arguments)]
pub fn i420_from_u16(
    w: u32,
    h: u32,
    bits: u32,
    y: &[u16],
    u: &[u16],
    v: &[u16],
    cw: u32,
    ch: u32,
) -> Result<I420, String> {
    let (wu, hu) = (w as usize, h as usize);
    if !(8..=16).contains(&bits) {
        return Err(format!(
            "a bit depth of {bits} is not one a picture can have"
        ));
    }
    if y.len() < wu * hu {
        return Err(format!(
            "a luma plane of {} samples is too small for {w}x{h}",
            y.len()
        ));
    }
    let shift = bits - 8;
    let round = if shift == 0 { 0 } else { 1u32 << (shift - 1) };
    let luma = y[..wu * hu]
        .iter()
        .map(|&s| ((u32::from(s) + round) >> shift).min(255) as u8)
        .collect();
    let u8_of = |p: &[u16]| -> Result<Vec<u8>, String> {
        to_half(p, cw as usize, ch as usize, wu, hu, shift)
    };
    Ok(I420 {
        width: w,
        height: h,
        y: luma,
        u: u8_of(u)?,
        v: u8_of(v)?,
    })
}

/// The picture turned clockwise by `quarters` quarter turns, as a container's display matrix asks.
pub fn rotate(pic: I420, quarters: u8) -> I420 {
    let q = quarters % 4;
    if q == 0 {
        return pic;
    }
    let (cw, ch) = I420::chroma_size(pic.width, pic.height);
    let y = rotate_plane(&pic.y, pic.width as usize, pic.height as usize, q);
    let u = rotate_plane(&pic.u, cw, ch, q);
    let v = rotate_plane(&pic.v, cw, ch, q);
    let (width, height) = if q % 2 == 1 {
        (pic.height, pic.width)
    } else {
        (pic.width, pic.height)
    };
    I420 {
        width,
        height,
        y,
        u,
        v,
    }
}

fn rotate_plane(src: &[u8], w: usize, h: usize, q: u8) -> Vec<u8> {
    let mut out = vec![0u8; w * h];
    for y in 0..h {
        for x in 0..w {
            let Some(&s) = src.get(y * w + x) else {
                continue;
            };
            let i = match q {
                1 => x * h + (h - 1 - y),
                2 => (h - 1 - y) * w + (w - 1 - x),
                _ => (w - 1 - x) * h + y,
            };
            if let Some(d) = out.get_mut(i) {
                *d = s;
            }
        }
    }
    out
}

/// BT.709 limited-range Y'CbCr of one RGB pixel, in 16.16 fixed point: what the export writes into H.264 and ProRes.
#[inline]
fn ycbcr709(r: i32, g: i32, b: i32) -> (i32, i32, i32) {
    // Y = 16 + 219·(0.2126 R + 0.7152 G + 0.0722 B)/255; Cb, Cr = 128 + 224·(B − Y′)/(1.8556·255), 224·(R − Y′)/(1.5748·255).
    let y = 11_966 * r + 40_254 * g + 4_064 * b + (16 << 16);
    let cb = -6_596 * r - 22_188 * g + 28_784 * b + (128 << 16);
    let cr = 28_784 * r - 26_145 * g - 2_639 * b + (128 << 16);
    (y, cb, cr)
}

/// 16.16 fixed point to 8 bits, rounded.
#[inline]
fn to8(v: i32) -> u8 {
    ((v + (1 << 15)) >> 16).clamp(0, 255) as u8
}

/// 16.16 fixed point (8-bit scale) to 10 bits, rounded.
#[inline]
fn to10(v: i32) -> u16 {
    ((v + (1 << 13)) >> 14).clamp(0, 1023) as u16
}

/// The page's RGBA as I420 (BT.709, limited range), chroma averaged over each 2×2 block.
pub fn i420_from_rgba(rgba: &[u8], w: u32, h: u32) -> Result<I420, String> {
    let (wu, hu) = (w as usize, h as usize);
    if rgba.len() < wu * hu * 4 {
        return Err(format!(
            "{} bytes of RGBA are too few for {w}x{h}",
            rgba.len()
        ));
    }
    let (hw, hh) = I420::chroma_size(w, h);
    let mut y = vec![0u8; wu * hu];
    let mut cb = vec![0i32; hw * hh];
    let mut cr = vec![0i32; hw * hh];
    let mut count = vec![0i32; hw * hh];
    for row in 0..hu {
        for col in 0..wu {
            let p = (row * wu + col) * 4;
            let (r, g, b) = (
                i32::from(rgba[p]),
                i32::from(rgba[p + 1]),
                i32::from(rgba[p + 2]),
            );
            let (yy, u, v) = ycbcr709(r, g, b);
            y[row * wu + col] = to8(yy);
            let c = (row / 2) * hw + col / 2;
            cb[c] += u;
            cr[c] += v;
            count[c] += 1;
        }
    }
    let avg = |s: &[i32]| -> Vec<u8> {
        s.iter()
            .zip(&count)
            .map(|(&v, &n)| to8(v / n.max(1)))
            .collect()
    };
    Ok(I420 {
        width: w,
        height: h,
        u: avg(&cb),
        v: avg(&cr),
        y,
    })
}

/// Three 16-bit planes: Y, Cb, Cr.
pub type Yuv16 = (Vec<u16>, Vec<u16>, Vec<u16>);

/// The page's RGBA as 10-bit 4:2:2 (BT.709, limited range) for ProRes 422, or 4:4:4 when `full_chroma`.
pub fn yuv10_from_rgba(rgba: &[u8], w: u32, h: u32, full_chroma: bool) -> Result<Yuv16, String> {
    let (wu, hu) = (w as usize, h as usize);
    if rgba.len() < wu * hu * 4 {
        return Err(format!(
            "{} bytes of RGBA are too few for {w}x{h}",
            rgba.len()
        ));
    }
    let cw = if full_chroma { wu } else { wu.div_ceil(2) };
    let mut y = vec![0u16; wu * hu];
    let mut cb = vec![0u16; cw * hu];
    let mut cr = vec![0u16; cw * hu];
    for row in 0..hu {
        for col in (0..wu).step_by(if full_chroma { 1 } else { 2 }) {
            let mut su = 0;
            let mut sv = 0;
            let n: usize = if full_chroma || col + 1 >= wu { 1 } else { 2 };
            for dx in 0..n {
                let p = (row * wu + col + dx) * 4;
                let (yy, u, v) = ycbcr709(
                    i32::from(rgba[p]),
                    i32::from(rgba[p + 1]),
                    i32::from(rgba[p + 2]),
                );
                y[row * wu + col + dx] = to10(yy);
                su += u;
                sv += v;
            }
            let c = row * cw + if full_chroma { col } else { col / 2 };
            cb[c] = to10(su / n as i32);
            cr[c] = to10(sv / n as i32);
        }
    }
    Ok((y, cb, cr))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_strided_plane_comes_out_tight() {
        let src = vec![1, 2, 0, 3, 4, 0];
        assert_eq!(tight(src, 3, 2, 2).unwrap(), vec![1, 2, 3, 4]);
        assert!(tight(vec![1u8, 2], 3, 2, 2).is_err());
    }

    #[test]
    fn i420_keeps_420_chroma_and_averages_422_rows() {
        let pic = i420_from_u8(2, 2, vec![10; 4], &[100], &[200], 1, 1).unwrap();
        assert_eq!((pic.u.clone(), pic.v.clone()), (vec![100], vec![200]));
        // 4:2:2 of a 2x2 picture: one chroma column, two rows, averaged into one sample.
        let pic = i420_from_u8(2, 2, vec![10; 4], &[100, 110], &[200, 210], 1, 2).unwrap();
        assert_eq!((pic.u, pic.v), (vec![105], vec![205]));
    }

    #[test]
    fn ten_bit_samples_round_to_eight() {
        let pic = i420_from_u16(2, 2, 10, &[1023, 512, 4, 0], &[512], &[512], 1, 1).unwrap();
        assert_eq!(pic.y, vec![255, 128, 1, 0]);
        assert_eq!(pic.u, vec![128]);
    }

    #[test]
    fn odd_sizes_round_the_chroma_up() {
        let pic = i420_from_u16(3, 3, 8, &[0; 9], &[1; 9], &[2; 9], 3, 3).unwrap();
        assert_eq!((pic.u.len(), pic.v.len()), (4, 4));
    }

    #[test]
    fn a_quarter_turn_moves_the_top_row_to_the_right_column() {
        // 2 wide, 1 high: [a b] turned clockwise is a column with a on top.
        let pic = I420 {
            width: 2,
            height: 1,
            y: vec![1, 2],
            u: vec![5],
            v: vec![6],
        };
        let r = rotate(pic.clone(), 1);
        assert_eq!((r.width, r.height, r.y.clone()), (1, 2, vec![1, 2]));
        let r = rotate(pic.clone(), 2);
        assert_eq!(r.y, vec![2, 1]);
        let r = rotate(pic, 3);
        assert_eq!((r.width, r.height, r.y), (1, 2, vec![2, 1]));
    }

    #[test]
    fn rgba_white_black_and_grey_land_on_bt709_limited_range() {
        let rgba = [
            255, 255, 255, 255, 0, 0, 0, 255, 128, 128, 128, 255, 128, 128, 128, 255,
        ];
        let pic = i420_from_rgba(&rgba, 2, 2).unwrap();
        assert_eq!(pic.y, vec![235, 16, 126, 126]);
        assert_eq!((pic.u[0], pic.v[0]), (128, 128));
        let (y, cb, _) = yuv10_from_rgba(&rgba, 2, 2, false).unwrap();
        assert_eq!((y[0], y[1]), (940, 64));
        assert_eq!(cb.len(), 2);
        assert_eq!(cb[0], 512);
    }

    #[test]
    fn pure_red_has_the_bt709_coefficients() {
        let pic = i420_from_rgba(&[255, 0, 0, 255], 1, 1).unwrap();
        // BT.709 limited: Y 63, Cb 102, Cr 240.
        assert!((i32::from(pic.y[0]) - 63).abs() <= 1, "{}", pic.y[0]);
        assert!((i32::from(pic.u[0]) - 102).abs() <= 1, "{}", pic.u[0]);
        assert!((i32::from(pic.v[0]) - 240).abs() <= 1, "{}", pic.v[0]);
    }
}
