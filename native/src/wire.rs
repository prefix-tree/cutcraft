//! The bytes the sidecar and Node say to each other on stdin and stdout, little-endian. `PROTOCOL.md` describes them;
//! `packages/render/src/native/wire.ts` reads and writes the same layouts.

use std::io::{self, Read, Write};

/// A decoded picture: header, then tight 8-bit I420 (Y, then U, then V; chroma planes are half size, rounded up).
pub const FRAME_MAGIC: &[u8; 4] = b"UBF1";
pub const FRAME_HEADER: usize = 32;
/// A picture to encode: header, then tight RGBA.
pub const RAW_MAGIC: &[u8; 4] = b"UBR1";
pub const RAW_HEADER: usize = 16;
/// The encoder's decoder configuration (an avcC for H.264, empty for ProRes), sent once before any packet.
pub const CONFIG_MAGIC: &[u8; 4] = b"UBC1";
/// One encoded picture.
pub const PACKET_MAGIC: &[u8; 4] = b"UBP1";
pub const PACKET_HEADER: usize = 32;

/// The largest picture either direction accepts, so a corrupt header cannot ask for gigabytes.
pub const MAX_SIDE: u32 = 16_384;

/// An 8-bit 4:2:0 picture with tight planes.
#[derive(Clone, Debug, PartialEq)]
pub struct I420 {
    pub width: u32,
    pub height: u32,
    pub y: Vec<u8>,
    pub u: Vec<u8>,
    pub v: Vec<u8>,
}

impl I420 {
    pub fn chroma_size(width: u32, height: u32) -> (usize, usize) {
        (width.div_ceil(2) as usize, height.div_ceil(2) as usize)
    }
}

/// H.273 matrix code points the page maps to a `VideoColorSpace`.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Color {
    pub matrix: u8,
    pub full_range: bool,
}

impl Color {
    #[cfg(test)]
    pub const BT709: Color = Color {
        matrix: 1,
        full_range: false,
    };
    pub const BT601: Color = Color {
        matrix: 6,
        full_range: false,
    };

    /// The stream's matrix when it names one the page knows (BT.709, BT.601, BT.2020), else by size: BT.601 below
    /// 720 lines, BT.709 from there, as players assume.
    pub fn resolve(matrix: u8, full_range: bool, height: u32) -> Color {
        let matrix = match matrix {
            1 | 5 | 6 | 9 => matrix,
            _ if height < 720 => 6,
            _ => 1,
        };
        Color { matrix, full_range }
    }
}

pub fn write_frame(
    out: &mut impl Write,
    pic: &I420,
    color: Color,
    pts: f64,
    duration: f64,
) -> io::Result<()> {
    let mut h = [0u8; FRAME_HEADER];
    h[0..4].copy_from_slice(FRAME_MAGIC);
    h[4..8].copy_from_slice(&pic.width.to_le_bytes());
    h[8..12].copy_from_slice(&pic.height.to_le_bytes());
    h[12] = color.matrix;
    h[13] = u8::from(color.full_range);
    h[16..24].copy_from_slice(&pts.to_le_bytes());
    h[24..32].copy_from_slice(&duration.to_le_bytes());
    out.write_all(&h)?;
    out.write_all(&pic.y)?;
    out.write_all(&pic.u)?;
    out.write_all(&pic.v)
}

/// One RGBA picture from stdin, or None at the end of the stream.
pub fn read_raw(input: &mut impl Read, width: u32, height: u32) -> io::Result<Option<Vec<u8>>> {
    let mut h = [0u8; RAW_HEADER];
    if !read_exact_or_eof(input, &mut h)? {
        return Ok(None);
    }
    if &h[0..4] != RAW_MAGIC {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "a picture to encode does not start with UBR1",
        ));
    }
    let w = u32::from_le_bytes([h[4], h[5], h[6], h[7]]);
    let ht = u32::from_le_bytes([h[8], h[9], h[10], h[11]]);
    if w != width || ht != height {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            format!("a picture of {w}x{ht} was sent to an encoder of {width}x{height}"),
        ));
    }
    let mut rgba = vec![0u8; width as usize * height as usize * 4];
    input.read_exact(&mut rgba)?;
    Ok(Some(rgba))
}

pub fn write_config(out: &mut impl Write, config: &[u8]) -> io::Result<()> {
    out.write_all(CONFIG_MAGIC)?;
    out.write_all(&len32(config.len())?.to_le_bytes())?;
    out.write_all(config)
}

pub fn write_packet(
    out: &mut impl Write,
    key: bool,
    pts: i64,
    dts: i64,
    data: &[u8],
) -> io::Result<()> {
    let mut h = [0u8; PACKET_HEADER];
    h[0..4].copy_from_slice(PACKET_MAGIC);
    h[4] = u8::from(key);
    h[8..16].copy_from_slice(&pts.to_le_bytes());
    h[16..24].copy_from_slice(&dts.to_le_bytes());
    h[24..28].copy_from_slice(&len32(data.len())?.to_le_bytes());
    out.write_all(&h)?;
    out.write_all(data)
}

fn len32(n: usize) -> io::Result<u32> {
    u32::try_from(n)
        .map_err(|_| io::Error::new(io::ErrorKind::InvalidData, "a packet larger than 4 GB"))
}

/// Fills `buf`, or returns false when the stream ends before its first byte.
fn read_exact_or_eof(input: &mut impl Read, buf: &mut [u8]) -> io::Result<bool> {
    let mut filled = 0;
    while filled < buf.len() {
        match input.read(&mut buf[filled..]) {
            Ok(0) if filled == 0 => return Ok(false),
            Ok(0) => {
                return Err(io::Error::new(
                    io::ErrorKind::UnexpectedEof,
                    "the stream ended inside a header",
                ));
            }
            Ok(n) => filled += n,
            Err(e) if e.kind() == io::ErrorKind::Interrupted => {}
            Err(e) => return Err(e),
        }
    }
    Ok(true)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_frame_is_its_header_then_its_planes() {
        let pic = I420 {
            width: 3,
            height: 3,
            y: vec![1; 9],
            u: vec![2; 4],
            v: vec![3; 4],
        };
        let mut out = Vec::new();
        write_frame(&mut out, &pic, Color::BT709, 1.5, 0.04).unwrap();
        assert_eq!(out.len(), FRAME_HEADER + 9 + 4 + 4);
        assert_eq!(&out[0..4], FRAME_MAGIC);
        assert_eq!(u32::from_le_bytes(out[4..8].try_into().unwrap()), 3);
        assert_eq!(out[12], 1);
        assert_eq!(f64::from_le_bytes(out[16..24].try_into().unwrap()), 1.5);
        assert_eq!(f64::from_le_bytes(out[24..32].try_into().unwrap()), 0.04);
        assert_eq!(&out[FRAME_HEADER + 9..FRAME_HEADER + 13], &[2, 2, 2, 2]);
    }

    #[test]
    fn raw_pictures_read_until_the_stream_ends() {
        let mut bytes = Vec::new();
        for fill in [7u8, 9] {
            bytes.extend_from_slice(RAW_MAGIC);
            bytes.extend_from_slice(&2u32.to_le_bytes());
            bytes.extend_from_slice(&1u32.to_le_bytes());
            bytes.extend_from_slice(&[0; 4]);
            bytes.extend_from_slice(&[fill; 8]);
        }
        let mut input = bytes.as_slice();
        assert_eq!(read_raw(&mut input, 2, 1).unwrap(), Some(vec![7; 8]));
        assert_eq!(read_raw(&mut input, 2, 1).unwrap(), Some(vec![9; 8]));
        assert_eq!(read_raw(&mut input, 2, 1).unwrap(), None);
    }

    #[test]
    fn a_raw_picture_of_the_wrong_size_or_magic_is_refused() {
        let mut bytes = Vec::new();
        bytes.extend_from_slice(RAW_MAGIC);
        bytes.extend_from_slice(&4u32.to_le_bytes());
        bytes.extend_from_slice(&4u32.to_le_bytes());
        bytes.extend_from_slice(&[0; 4]);
        assert!(read_raw(&mut bytes.as_slice(), 2, 2).is_err());
        assert!(read_raw(&mut b"XXXX000000000000".as_slice(), 2, 2).is_err());
        assert!(read_raw(&mut b"UBR1".as_slice(), 2, 2).is_err());
    }

    #[test]
    fn a_packet_carries_its_flag_times_and_length() {
        let mut out = Vec::new();
        write_packet(&mut out, true, 5, 4, &[9, 9, 9]).unwrap();
        assert_eq!(&out[0..4], PACKET_MAGIC);
        assert_eq!(out[4], 1);
        assert_eq!(i64::from_le_bytes(out[8..16].try_into().unwrap()), 5);
        assert_eq!(i64::from_le_bytes(out[16..24].try_into().unwrap()), 4);
        assert_eq!(u32::from_le_bytes(out[24..28].try_into().unwrap()), 3);
        assert_eq!(&out[PACKET_HEADER..], &[9, 9, 9]);
    }

    #[test]
    fn colour_falls_back_by_size() {
        assert_eq!(Color::resolve(2, false, 480).matrix, 6);
        assert_eq!(Color::resolve(2, false, 1080).matrix, 1);
        assert_eq!(
            Color::resolve(9, true, 2160),
            Color {
                matrix: 9,
                full_range: true
            }
        );
    }
}
