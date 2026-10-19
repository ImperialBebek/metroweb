import Foundation
import AVFoundation
import CoreGraphics

// quad <t...>   env VIDEO, SEED="x y"
// Flood-fills the lit screen from SEED and prints its corners (TL TR BR BL) and the blue-frame centroid.
let env = ProcessInfo.processInfo.environment
let asset = AVURLAsset(url: URL(fileURLWithPath: env["VIDEO"]!))
let gen = AVAssetImageGenerator(asset: asset)
gen.requestedTimeToleranceBefore = .zero
gen.requestedTimeToleranceAfter = .zero
let seed = env["SEED"]!.split(separator: " ").map { Int($0)! }
for arg in CommandLine.arguments.dropFirst() {
  let t = Double(arg)!
  var actual = CMTime.zero
  guard let img = try? gen.copyCGImage(at: CMTime(seconds: t, preferredTimescale: 6000), actualTime: &actual) else { continue }
  let W = img.width, H = img.height
  var buf = [UInt8](repeating: 0, count: W*H*4)
  let ctx = CGContext(data: &buf, width: W, height: H, bitsPerComponent: 8, bytesPerRow: W*4, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
  ctx.draw(img, in: CGRect(x: 0, y: 0, width: W, height: H))
  func px(_ x: Int, _ y: Int) -> (Int, Int, Int) { let i = (y*W+x)*4; return (Int(buf[i]), Int(buf[i+1]), Int(buf[i+2])) }
  var bx = 0.0, by = 0.0, bn = 0.0
  var y = 0
  while y < H { var x = 0; while x < W { let (r, g, b) = px(x, y); if b > r + 60 && b > g + 30 { bx += Double(x); by += Double(y); bn += 1 }; x += 2 }; y += 2 }
  var seen = [Bool](repeating: false, count: W*H)
  var stack = [(seed[0], seed[1])]
  var tl = (0, 0, Int.max), tr = (0, 0, Int.min), br = (0, 0, Int.min), bl = (0, 0, Int.max), n = 0
  func lit(_ x: Int, _ y: Int) -> Bool { let (r, g, b) = px(x, y); let lum = (r*299+g*587+b*114)/1000; return lum > 55 && max(r, g, b) - min(r, g, b) < 70 }
  if lit(seed[0], seed[1]) {
    seen[seed[1]*W+seed[0]] = true
    while let (cx, cy) = stack.popLast() {
      n += 1
      if cx + cy < tl.2 { tl = (cx, cy, cx + cy) }
      if cx + cy > br.2 { br = (cx, cy, cx + cy) }
      if cx - cy > tr.2 { tr = (cx, cy, cx - cy) }
      if cx - cy < bl.2 { bl = (cx, cy, cx - cy) }
      for (dx, dy) in [(1,0),(-1,0),(0,1),(0,-1)] {
        let nx = cx+dx, ny = cy+dy
        if nx >= 0 && nx < W && ny >= 0 && ny < H && !seen[ny*W+nx] && lit(nx, ny) { seen[ny*W+nx] = true; stack.append((nx, ny)) }
      }
    }
  }
  print(String(format: "%.3f blue(%.1f,%.1f) lit=%d TL(%d,%d) TR(%d,%d) BR(%d,%d) BL(%d,%d)", actual.seconds, bx/max(bn,1), by/max(bn,1), n, tl.0, tl.1, tr.0, tr.1, br.0, br.1, bl.0, bl.1))
}
