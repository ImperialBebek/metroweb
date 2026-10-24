import Foundation
import AVFoundation
import CoreGraphics

// segs <start> <end> <mode> <x0> <y0> <x1> <y1> <gap> [stepFrames]
// Prints column segments: x0-x1 [top..bottom at left edge | top..bottom at right edge]
let a = CommandLine.arguments
let start = Double(a[1])!, end = Double(a[2])!
let mode = a[3]
let rx0 = Int(a[4])!, ry0 = Int(a[5])!, rx1 = Int(a[6])!, ry1 = Int(a[7])!
let gap = Int(a[8])!
let step = a.count > 9 ? Double(a[9])! : 1
let crop: CGRect = { let c = (ProcessInfo.processInfo.environment["CROP"] ?? "706 64 506 844").split(separator: " ").map { Double($0)! }; return CGRect(x: c[0], y: c[1], width: c[2], height: c[3]) }()
guard let video = ProcessInfo.processInfo.environment["VIDEO"] else { fputs("Set VIDEO to the video's path\n", stderr); exit(1) }
let asset = AVURLAsset(url: URL(fileURLWithPath: video))
let gen = AVAssetImageGenerator(asset: asset)
gen.requestedTimeToleranceBefore = .zero
gen.requestedTimeToleranceAfter = .zero
let W = 480, H = 800
let cs = CGColorSpaceCreateDeviceRGB()
var t = start
var lastSig = ""
while t <= end + 1e-6 {
  var actual = CMTime.zero
  guard let full = try? gen.copyCGImage(at: CMTime(seconds: t, preferredTimescale: 6000), actualTime: &actual),
        let img = full.cropping(to: crop) else { t += step/60; continue }
  var buf = [UInt8](repeating: 0, count: W*H*4)
  let ctx = CGContext(data: &buf, width: W, height: H, bitsPerComponent: 8, bytesPerRow: W*4, space: cs, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
  ctx.interpolationQuality = .high
  ctx.draw(img, in: CGRect(x: 0, y: 0, width: W, height: H))
  var colMin = [Int](repeating: H, count: W), colMax = [Int](repeating: -1, count: W)
  for y in ry0..<ry1 { for x in rx0..<rx1 {
    let i = (y*W + x)*4
    let r = Int(buf[i]), g = Int(buf[i+1]), b = Int(buf[i+2])
    let lum = (r*299 + g*587 + b*114)/1000
    var hit = false
    switch mode {
      case "orange": hit = r > 190 && g > 40 && g < 140 && b < 70
      case "dark": hit = lum < 110
      case "bright": hit = lum > 170
      default: hit = lum > 40
    }
    if hit { if y < colMin[x] { colMin[x] = y }; if y > colMax[x] { colMax[x] = y } }
  } }
  var segs: [String] = []
  var x = rx0
  while x < rx1 {
    if colMax[x] < 0 { x += 1; continue }
    let s = x; var e = x; var miss = 0; var top = H; var bot = -1
    while x < rx1 && miss <= gap {
      if colMax[x] >= 0 { e = x; miss = 0; top = min(top, colMin[x]); bot = max(bot, colMax[x]) } else { miss += 1 }
      x += 1
    }
    if e - s >= 2 {
      let l = (s...min(s+2, e)), r = (max(e-2, s)...e)
      let lt = l.map { colMin[$0] }.min()!, lb = l.map { colMax[$0] }.max()!
      let rt = r.map { colMin[$0] }.min()!, rb = r.map { colMax[$0] }.max()!
      segs.append("\(s)-\(e)[\(top)..\(bot)] L\(lt)..\(lb) R\(rt)..\(rb)")
    }
  }
  let sig = segs.joined(separator: "  ")
  if sig != lastSig { print(String(format: "%.3f  ", actual.seconds) + sig) }
  lastSig = sig
  t += step/60
}
