//! The binary end to end: clips made by ffmpeg (the oracle, never shipped) are probed and decoded, and an encode is
//! decoded back by ffmpeg. Skipped when ffmpeg is not installed.

use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};

const BIN: &str = env!("CARGO_BIN_EXE_uberscene-codec");

fn have_ffmpeg() -> bool {
    Command::new("ffmpeg")
        .arg("-version")
        .output()
        .is_ok_and(|o| o.status.success())
}

fn fixture(dir: &Path, name: &str, args: &[&str]) -> PathBuf {
    let out = dir.join(name);
    let status = Command::new("ffmpeg")
        .args([
            "-v",
            "error",
            "-y",
            "-f",
            "lavfi",
            "-i",
            "testsrc2=size=320x240:rate=30:duration=2",
        ])
        .args(args)
        .arg(&out)
        .status()
        .unwrap();
    assert!(status.success(), "ffmpeg could not make {name}");
    out
}

fn temp_dir(tag: &str) -> PathBuf {
    let dir = std::env::temp_dir().join(format!("uberscene-codec-{tag}-{}", std::process::id()));
    std::fs::create_dir_all(&dir).unwrap();
    dir
}

struct Frame {
    pts: f64,
    width: u32,
    height: u32,
    planes: Vec<u8>,
}

fn frames(bytes: &[u8]) -> Vec<Frame> {
    let mut out = Vec::new();
    let mut at = 0;
    while at < bytes.len() {
        assert_eq!(&bytes[at..at + 4], b"UBF1");
        let u32_at = |i: usize| u32::from_le_bytes(bytes[i..i + 4].try_into().unwrap());
        let (width, height) = (u32_at(at + 4), u32_at(at + 8));
        let pts = f64::from_le_bytes(bytes[at + 16..at + 24].try_into().unwrap());
        let n = (width * height) as usize + 2 * (width.div_ceil(2) * height.div_ceil(2)) as usize;
        out.push(Frame {
            pts,
            width,
            height,
            planes: bytes[at + 32..at + 32 + n].to_vec(),
        });
        at += 32 + n;
    }
    out
}

fn decode(file: &Path, args: &[&str]) -> Vec<Frame> {
    let out = Command::new(BIN)
        .arg("decode")
        .arg(file)
        .args(args)
        .output()
        .unwrap();
    assert!(
        out.status.success(),
        "{}",
        String::from_utf8_lossy(&out.stderr)
    );
    frames(&out.stdout)
}

/// ffmpeg's own decode of the file, as tight I420 per frame.
fn reference(file: &Path) -> Vec<Vec<u8>> {
    let out = Command::new("ffmpeg")
        .args(["-v", "error", "-i"])
        .arg(file)
        .args(["-f", "rawvideo", "-pix_fmt", "yuv420p", "-"])
        .output()
        .unwrap();
    let size = 320 * 240 * 3 / 2;
    out.stdout.chunks(size).map(<[u8]>::to_vec).collect()
}

fn psnr(a: &[u8], b: &[u8]) -> f64 {
    let mse = a
        .iter()
        .zip(b)
        .map(|(&x, &y)| (f64::from(x) - f64::from(y)).powi(2))
        .sum::<f64>()
        / a.len() as f64;
    if mse == 0.0 {
        99.0
    } else {
        10.0 * (255.0 * 255.0 / mse).log10()
    }
}

#[test]
fn decodes_every_codec_like_ffmpeg() {
    if !have_ffmpeg() {
        return;
    }
    let dir = temp_dir("decode");
    let cases: [(&str, &[&str], f64); 5] = [
        (
            "h264.mp4",
            &[
                "-pix_fmt", "yuv420p", "-c:v", "libx264", "-bf", "2", "-g", "30",
            ],
            99.0,
        ),
        (
            "hevc10.mp4",
            &[
                "-pix_fmt",
                "yuv420p10le",
                "-c:v",
                "libx265",
                "-x265-params",
                "log-level=error",
            ],
            45.0,
        ),
        (
            "vp9.webm",
            &[
                "-pix_fmt",
                "yuv420p",
                "-c:v",
                "libvpx-vp9",
                "-deadline",
                "realtime",
                "-cpu-used",
                "8",
            ],
            99.0,
        ),
        (
            "vp8.webm",
            &[
                "-pix_fmt",
                "yuv420p",
                "-c:v",
                "libvpx",
                "-deadline",
                "realtime",
            ],
            99.0,
        ),
        (
            "prores.mov",
            &["-c:v", "prores_ks", "-profile:v", "3"],
            45.0,
        ),
    ];
    for (name, args, floor) in cases {
        let file = fixture(&dir, name, args);
        let probe = Command::new(BIN).arg("probe").arg(&file).output().unwrap();
        let json = String::from_utf8_lossy(&probe.stdout);
        assert!(json.contains("\"decodable\":true"), "{name}: {json}");
        let got = decode(&file, &["--from", "0"]);
        let want = reference(&file);
        assert_eq!(got.len(), 60, "{name}");
        assert!(
            got.windows(2).all(|w| w[1].pts > w[0].pts),
            "{name}: times go back"
        );
        assert!(
            got.iter().all(|f| f.width == 320 && f.height == 240),
            "{name}"
        );
        let worst = got
            .iter()
            .zip(&want)
            .map(|(g, w)| psnr(&g.planes, w))
            .fold(f64::INFINITY, f64::min);
        assert!(
            worst >= floor,
            "{name}: worst PSNR {worst:.1} dB against ffmpeg"
        );
        // A range starts with the picture showing at its start, and a single time gives the one showing then.
        let range: Vec<i64> = decode(&file, &["--from", "0.51", "--to", "0.6"])
            .iter()
            .map(|f| (f.pts * 30.0).round() as i64)
            .collect();
        assert_eq!(range, vec![15, 16, 17], "{name}");
        let at: Vec<i64> = decode(&file, &["--at", "1.99"])
            .iter()
            .map(|f| (f.pts * 30.0).round() as i64)
            .collect();
        assert_eq!(at, vec![59], "{name}");
    }
    std::fs::remove_dir_all(&dir).ok();
}

#[test]
fn a_file_it_cannot_read_probes_as_not_decodable() {
    let dir = temp_dir("bad");
    let file = dir.join("junk.mp4");
    std::fs::write(&file, b"this is not a video").unwrap();
    let probe = Command::new(BIN).arg("probe").arg(&file).output().unwrap();
    assert!(probe.status.success());
    assert!(String::from_utf8_lossy(&probe.stdout).contains("\"decodable\":false"));
    let decode = Command::new(BIN)
        .arg("decode")
        .arg(&file)
        .args(["--from", "0"])
        .output()
        .unwrap();
    assert!(!decode.status.success());
    std::fs::remove_dir_all(&dir).ok();
}

#[test]
fn encodes_h264_that_ffmpeg_decodes_clean() {
    if !have_ffmpeg() {
        return;
    }
    let (w, h, n) = (320u32, 240u32, 45usize);
    let rgba = Command::new("ffmpeg")
        .args([
            "-v",
            "error",
            "-f",
            "lavfi",
            "-i",
            "testsrc2=size=320x240:rate=30",
            "-frames:v",
            "45",
        ])
        .args(["-f", "rawvideo", "-pix_fmt", "rgba", "-"])
        .output()
        .unwrap()
        .stdout;
    let mut child = Command::new(BIN)
        .args([
            "encode", "--codec", "h264", "--width", "320", "--height", "240", "--keyint", "30",
            "--kbps", "800",
        ])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .spawn()
        .unwrap();
    {
        let mut stdin = child.stdin.take().unwrap();
        let size = (w * h * 4) as usize;
        for k in 0..n {
            let mut header = Vec::from(*b"UBR1");
            header.extend_from_slice(&w.to_le_bytes());
            header.extend_from_slice(&h.to_le_bytes());
            header.extend_from_slice(&[0; 4]);
            stdin.write_all(&header).unwrap();
            stdin.write_all(&rgba[k * size..(k + 1) * size]).unwrap();
        }
    }
    let out = child.wait_with_output().unwrap();
    assert!(out.status.success());
    let d = out.stdout;
    assert_eq!(&d[0..4], b"UBC1");
    let len = u32::from_le_bytes(d[4..8].try_into().unwrap()) as usize;
    let avcc = &d[8..8 + len];
    // avcC parameter sets, then each packet's length-prefixed NAL units, as an Annex B stream ffmpeg can read.
    let mut annexb = Vec::new();
    let mut at = 6;
    let sps = usize::from(avcc[5] & 31);
    for _ in 0..sps {
        let l = usize::from(u16::from_be_bytes([avcc[at], avcc[at + 1]]));
        annexb.extend_from_slice(&[0, 0, 0, 1]);
        annexb.extend_from_slice(&avcc[at + 2..at + 2 + l]);
        at += 2 + l;
    }
    let pps = usize::from(avcc[at]);
    at += 1;
    for _ in 0..pps {
        let l = usize::from(u16::from_be_bytes([avcc[at], avcc[at + 1]]));
        annexb.extend_from_slice(&[0, 0, 0, 1]);
        annexb.extend_from_slice(&avcc[at + 2..at + 2 + l]);
        at += 2 + l;
    }
    let mut packets = 0;
    let mut keys = Vec::new();
    let mut p = 8 + len;
    while p < d.len() {
        assert_eq!(&d[p..p + 4], b"UBP1");
        let pts = i64::from_le_bytes(d[p + 8..p + 16].try_into().unwrap());
        if d[p + 4] == 1 {
            keys.push(pts);
        }
        let size = u32::from_le_bytes(d[p + 24..p + 28].try_into().unwrap()) as usize;
        let data = &d[p + 32..p + 32 + size];
        let mut q = 0;
        while q < data.len() {
            let l = u32::from_be_bytes(data[q..q + 4].try_into().unwrap()) as usize;
            annexb.extend_from_slice(&[0, 0, 0, 1]);
            annexb.extend_from_slice(&data[q + 4..q + 4 + l]);
            q += 4 + l;
        }
        packets += 1;
        p += 32 + size;
    }
    assert_eq!(packets, n);
    assert_eq!(keys, vec![0, 30]);
    let dir = temp_dir("encode");
    let file = dir.join("out.h264");
    std::fs::write(&file, &annexb).unwrap();
    let check = Command::new("ffmpeg")
        .args(["-v", "error", "-xerror", "-i"])
        .arg(&file)
        .args(["-f", "null", "-"])
        .output()
        .unwrap();
    assert!(
        check.status.success() && check.stderr.is_empty(),
        "{}",
        String::from_utf8_lossy(&check.stderr)
    );
    std::fs::remove_dir_all(&dir).ok();
}
