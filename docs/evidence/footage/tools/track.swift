import Foundation
import AVFoundation
import CoreGraphics

// track <start> <end> <mode> <x0> <y0> <x1> <y1>   (region in 480x800 screen space)
// modes: orange | dark | bright | nonblack
let a = CommandLine.arguments
let start = Double(a[1])!, end = Double(a[2])!
let mode = a[3]
let rx0 = Int(a[4])!, ry0 = Int(a[5])!, rx1 = Int(a[6])!, ry1 = Int(a[7])!
let crop = CGRect(x: 706, y: 64, width: 506, height: 844)
let asset = AVURLAsset(url: URL(fileURLWithPath: "/Users/rafly/Downloads/Windows-Phone-81-SnapYT.App.mp4"))
let gen = AVAssetImageGenerator(asset: asset)
gen.requestedTimeToleranceBefore = .zero
gen.requestedTimeToleranceAfter = .zero
let W = 480, H = 800
let cs = CGColorSpaceCreateDeviceRGB()
var t = start
print("t\tminX\tmaxX\tminY\tmaxY\tleftH\trightH\tcount")
while t <= end + 1e-6 {
  var actual = CMTime.zero
  guard let full = try? gen.copyCGImage(at: CMTime(seconds: t, preferredTimescale: 6000), actualTime: &actual),
        let img = full.cropping(to: crop) else { t += 1.0/60; continue }
  var buf = [UInt8](repeating: 0, count: W*H*4)
  let ctx = CGContext(data: &buf, width: W, height: H, bitsPerComponent: 8, bytesPerRow: W*4, space: cs, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
  ctx.interpolationQuality = .high
  ctx.draw(img, in: CGRect(x: 0, y: 0, width: W, height: H))
  var minX = W, maxX = -1, minY = H, maxY = -1, n = 0
  var colMin = [Int](repeating: H, count: W), colMax = [Int](repeating: -1, count: W)
  for y in ry0..<ry1 {
    for x in rx0..<rx1 {
      // CGContext memory row 0 is the top row of the image
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
      if hit {
        n += 1
        if x < minX { minX = x }; if x > maxX { maxX = x }
        if y < minY { minY = y }; if y > maxY { maxY = y }
        if y < colMin[x] { colMin[x] = y }; if y > colMax[x] { colMax[x] = y }
      }
    }
  }
  var lh = 0, rh = 0
  if n > 0 {
    for x in minX...min(minX+3, maxX) { lh = max(lh, colMax[x]-colMin[x]) }
    for x in max(maxX-3, minX)...maxX { rh = max(rh, colMax[x]-colMin[x]) }
  }
  print(String(format: "%.3f\t%d\t%d\t%d\t%d\t%d\t%d\t%d", actual.seconds, minX, maxX, minY, maxY, lh, rh, n))
  t += 1.0/60
}
