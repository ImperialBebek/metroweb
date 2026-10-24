import Foundation
import AVFoundation
import CoreGraphics

// tiles <refTime> <start> <end> <mode out|in>
// Finds tiles (non-black blobs) in the reference frame, then per tile reports when it starts
// deviating from the reference and when it is fully gone (out) / first appears and settles (in).
let a = CommandLine.arguments
let ref = Double(a[1])!, start = Double(a[2])!, end = Double(a[3])!
let crop: CGRect = { let c = (ProcessInfo.processInfo.environment["CROP"] ?? "706 64 506 844").split(separator: " ").map { Double($0)! }; return CGRect(x: c[0], y: c[1], width: c[2], height: c[3]) }()
guard let video = ProcessInfo.processInfo.environment["VIDEO"] else { fputs("Set VIDEO to the video's path\n", stderr); exit(1) }
let asset = AVURLAsset(url: URL(fileURLWithPath: video))
let gen = AVAssetImageGenerator(asset: asset)
gen.requestedTimeToleranceBefore = .zero
gen.requestedTimeToleranceAfter = .zero
let W = 480, H = 800
let cs = CGColorSpaceCreateDeviceRGB()
func frame(_ t: Double) -> ([UInt8], Double)? {
  var actual = CMTime.zero
  guard let full = try? gen.copyCGImage(at: CMTime(seconds: t, preferredTimescale: 6000), actualTime: &actual),
        let img = full.cropping(to: crop) else { return nil }
  var buf = [UInt8](repeating: 0, count: W*H*4)
  let ctx = CGContext(data: &buf, width: W, height: H, bitsPerComponent: 8, bytesPerRow: W*4, space: cs, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
  ctx.draw(img, in: CGRect(x: 0, y: 0, width: W, height: H))
  return (buf, actual.seconds)
}
func lum(_ b: [UInt8], _ x: Int, _ y: Int) -> Int { let i = (y*W+x)*4; return (Int(b[i])*299 + Int(b[i+1])*587 + Int(b[i+2])*114)/1000 }
guard let (rb, _) = frame(ref) else { exit(1) }
// connected components of non-black pixels below status bar
var label = [Int](repeating: -1, count: W*H)
struct Box { var x0: Int, y0: Int, x1: Int, y1: Int, n: Int }
var boxes: [Box] = []
for y in 40..<H { for x in 0..<W where label[y*W+x] < 0 && lum(rb, x, y) > 45 {
  var stack = [(x, y)]; label[y*W+x] = boxes.count
  var b = Box(x0: x, y0: y, x1: x, y1: y, n: 0)
  while let (cx, cy) = stack.popLast() {
    b.n += 1; b.x0 = min(b.x0, cx); b.x1 = max(b.x1, cx); b.y0 = min(b.y0, cy); b.y1 = max(b.y1, cy)
    for (dx, dy) in [(1,0),(-1,0),(0,1),(0,-1)] {
      let nx = cx+dx, ny = cy+dy
      if nx >= 0 && nx < W && ny >= 40 && ny < H && label[ny*W+nx] < 0 && lum(rb, nx, ny) > 45 { label[ny*W+nx] = boxes.count; stack.append((nx, ny)) }
    }
  }
  boxes.append(b)
} }
let tiles = boxes.filter { $0.x1 - $0.x0 > 40 && $0.y1 - $0.y0 > 40 && $0.n > 1500 }
var startT = [Double?](repeating: nil, count: tiles.count), endT = [Double?](repeating: nil, count: tiles.count)
var t = start
while t <= end + 1e-6 {
  guard let (fb, at) = frame(t) else { t += 1.0/60; continue }
  for (k, b) in tiles.enumerated() {
    var diff = 0, black = 0, n = 0
    // sample inner area
    var y = b.y0 + 3
    while y < b.y1 - 3 { var x = b.x0 + 3; while x < b.x1 - 3 {
      n += 1
      let i = (y*W+x)*4
      let d = abs(Int(fb[i]) - Int(rb[i])) + abs(Int(fb[i+1]) - Int(rb[i+1])) + abs(Int(fb[i+2]) - Int(rb[i+2]))
      if d > 60 { diff += 1 }
      if lum(fb, x, y) < 30 { black += 1 }
      x += 2 }; y += 2 }
    let df = Double(diff)/Double(n), bf = Double(black)/Double(n)
    if a[4] == "out" {
      if startT[k] == nil && df > 0.06 { startT[k] = at }
      if endT[k] == nil && bf > 0.97 { endT[k] = at }
    } else {
      if startT[k] == nil && bf < 0.9 { startT[k] = at }
      if endT[k] == nil && startT[k] != nil && df < 0.04 { endT[k] = at }
    }
  }
  t += 1.0/60
}
print("tile x0-x1 y0-y1  start  end")
for (k, b) in tiles.enumerated().sorted(by: { ($0.element.y0, $0.element.x0) < ($1.element.y0, $1.element.x0) }) {
  let s = startT[k].map { String(format: "%.3f", $0) } ?? "-"
  let e = endT[k].map { String(format: "%.3f", $0) } ?? "-"
  print("\(b.x0)-\(b.x1) \(b.y0)-\(b.y1)  \(s)  \(e)")
}
