import Foundation
import AVFoundation
import CoreGraphics

// lines <start> <end> <mode> <x0> <y0> <x1> <y1> [stepFrames]
// groups ink rows into text lines and reports each line's x extent and its vertical span at left/right ends
let a = CommandLine.arguments
let start = Double(a[1])!, end = Double(a[2])!
let mode = a[3]
let rx0 = Int(a[4])!, ry0 = Int(a[5])!, rx1 = Int(a[6])!, ry1 = Int(a[7])!
let step = a.count > 8 ? Double(a[8])! : 1
let crop: CGRect = { let c = (ProcessInfo.processInfo.environment["CROP"] ?? "706 64 506 844").split(separator: " ").map { Double($0)! }; return CGRect(x: c[0], y: c[1], width: c[2], height: c[3]) }()
guard let video = ProcessInfo.processInfo.environment["VIDEO"] else { fputs("Set VIDEO to the video's path\n", stderr); exit(1) }
let asset = AVURLAsset(url: URL(fileURLWithPath: video))
let gen = AVAssetImageGenerator(asset: asset)
gen.requestedTimeToleranceBefore = .zero
gen.requestedTimeToleranceAfter = .zero
let W = 480, H = 800
let cs = CGColorSpaceCreateDeviceRGB()
var t = start
var last = ""
while t <= end + 1e-6 {
  var actual = CMTime.zero
  guard let full = try? gen.copyCGImage(at: CMTime(seconds: t, preferredTimescale: 6000), actualTime: &actual),
        let img = full.cropping(to: crop) else { t += step/60; continue }
  var buf = [UInt8](repeating: 0, count: W*H*4)
  let ctx = CGContext(data: &buf, width: W, height: H, bitsPerComponent: 8, bytesPerRow: W*4, space: cs, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
  ctx.interpolationQuality = .high
  ctx.draw(img, in: CGRect(x: 0, y: 0, width: W, height: H))
  func hit(_ x: Int, _ y: Int) -> Bool {
    let i = (y*W + x)*4
    let r = Int(buf[i]), g = Int(buf[i+1]), b = Int(buf[i+2])
    let lum = (r*299 + g*587 + b*114)/1000
    switch mode {
      case "ink": return lum < 175 && abs(r - b) < 40
      case "faint": return lum < 238 && abs(r - b) < 30
      case "bright": return lum > 170
      case "orange": return r > 190 && g > 40 && g < 140 && b < 70
      default: return lum > 40
    }
  }
  var rowHas = [Bool](repeating: false, count: H)
  for y in ry0..<ry1 { for x in rx0..<rx1 where hit(x, y) { rowHas[y] = true; break } }
  var out: [String] = []
  var y = ry0
  while y < ry1 {
    if !rowHas[y] { y += 1; continue }
    let s = y; var e = y; var miss = 0
    while y < ry1 && miss <= 3 { if rowHas[y] { e = y; miss = 0 } else { miss += 1 }; y += 1 }
    if e - s < 3 { continue }
    var xmin = W, xmax = -1, minLum = 255
    for yy in s...e { for x in rx0..<rx1 { let i = (yy*W + x)*4; let r = Int(buf[i]), g = Int(buf[i+1]), b = Int(buf[i+2]); if abs(r-b) < 30 { minLum = min(minLum, (r*299 + g*587 + b*114)/1000) } } }
    for yy in s...e { for x in rx0..<rx1 where hit(x, yy) { xmin = min(xmin, x); xmax = max(xmax, x) } }
    // vertical span within the leftmost and rightmost 12 px of the line
    func span(_ xa: Int, _ xb: Int) -> String {
      var top = H, bot = -1
      for yy in s...e { for x in max(xa, rx0)...min(xb, rx1-1) where hit(x, yy) { top = min(top, yy); bot = max(bot, yy) } }
      return "\(top)..\(bot)"
    }
    out.append("y\(s)-\(e) x\(xmin)-\(xmax) m\(minLum) L[\(span(xmin, xmin+12))] R[\(span(xmax-12, xmax))]")
  }
  let sig = out.joined(separator: " | ")
  if sig != last { print(String(format: "%.3f ", actual.seconds) + sig) }
  last = sig
  t += step/60
}
