import Foundation
import AVFoundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers
import AppKit

// rect <start> <end> <stepFrames> <outDir> <sheetCols> <cellW>
// env VIDEO, QUAD="TLx TLy TRx TRy BRx BRy BLx BLy", OW=480 OH=853
let env = ProcessInfo.processInfo.environment
let a = CommandLine.arguments
let start = Double(a[1])!, end = Double(a[2])!, step = Double(a[3])!
let outDir = a[4], cols = Int(a[5])!, cellW = Int(a[6])!
let q = env["QUAD"]!.split(separator: " ").map { Double($0)! }
let OW = Int(env["OW"] ?? "480")!, OH = Int(env["OH"] ?? "853")!
try? FileManager.default.createDirectory(atPath: outDir, withIntermediateDirectories: true)
// homography from unit square to quad
func homography() -> [Double] {
  let (x0,y0,x1,y1,x2,y2,x3,y3) = (q[0],q[1],q[2],q[3],q[4],q[5],q[6],q[7])
  let dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2
  let sx = x0 - x1 + x2 - x3, sy = y0 - y1 + y2 - y3
  let den = dx1*dy2 - dx2*dy1
  let g = (sx*dy2 - dx2*sy)/den, h = (dx1*sy - sx*dy1)/den
  return [x1 - x0 + g*x1, x3 - x0 + h*x3, x0, y1 - y0 + g*y1, y3 - y0 + h*y3, y0, g, h]
}
let Hm = homography()
let asset = AVURLAsset(url: URL(fileURLWithPath: env["VIDEO"]!))
let gen = AVAssetImageGenerator(asset: asset)
gen.requestedTimeToleranceBefore = .zero
gen.requestedTimeToleranceAfter = .zero
let cs = CGColorSpaceCreateDeviceRGB()
var frames: [(CGImage, Double)] = []
var t = start
let fps = 29.966879
var last = -1.0
while t <= end + 1e-6 {
  var actual = CMTime.zero
  if let img = try? gen.copyCGImage(at: CMTime(seconds: t, preferredTimescale: 6000), actualTime: &actual), abs(actual.seconds - last) > 0.001 {
    last = actual.seconds
    let W = img.width, H = img.height
    var src = [UInt8](repeating: 0, count: W*H*4)
    let sctx = CGContext(data: &src, width: W, height: H, bitsPerComponent: 8, bytesPerRow: W*4, space: cs, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    sctx.draw(img, in: CGRect(x: 0, y: 0, width: W, height: H))
    var out = [UInt8](repeating: 255, count: OW*OH*4)
    for v in 0..<OH { for u in 0..<OW {
      let uu = (Double(u) + 0.5)/Double(OW), vv = (Double(v) + 0.5)/Double(OH)
      let w = Hm[6]*uu + Hm[7]*vv + 1
      let x = (Hm[0]*uu + Hm[1]*vv + Hm[2])/w, y = (Hm[3]*uu + Hm[4]*vv + Hm[5])/w
      let xi = Int(x), yi = Int(y)
      guard xi >= 0, yi >= 0, xi + 1 < W, yi + 1 < H else { continue }
      let fx = x - Double(xi), fy = y - Double(yi)
      for c in 0..<3 {
        let p00 = Double(src[(yi*W+xi)*4+c]), p10 = Double(src[(yi*W+xi+1)*4+c])
        let p01 = Double(src[((yi+1)*W+xi)*4+c]), p11 = Double(src[((yi+1)*W+xi+1)*4+c])
        out[(v*OW+u)*4+c] = UInt8(max(0, min(255, (p00*(1-fx)+p10*fx)*(1-fy) + (p01*(1-fx)+p11*fx)*fy)))
      }
    } }
    let octx = CGContext(data: &out, width: OW, height: OH, bitsPerComponent: 8, bytesPerRow: OW*4, space: cs, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    let oimg = octx.makeImage()!
    let name = String(format: "%@/f_%06d.png", outDir, Int((actual.seconds*1000).rounded()))
    let d = CGImageDestinationCreateWithURL(URL(fileURLWithPath: name) as CFURL, UTType.png.identifier as CFString, 1, nil)!
    CGImageDestinationAddImage(d, oimg, nil); CGImageDestinationFinalize(d)
    frames.append((oimg, actual.seconds))
  }
  t += step/fps
}
// contact sheet
let rows = (frames.count + cols - 1)/cols
let labelH = 20
let cellH = cellW*OH/OW + labelH
let SW = cols*cellW, SH = rows*cellH
let ctx = CGContext(data: nil, width: SW, height: SH, bitsPerComponent: 8, bytesPerRow: SW*4, space: cs, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
ctx.setFillColor(CGColor(red: 0.1, green: 0.1, blue: 0.1, alpha: 1)); ctx.fill(CGRect(x: 0, y: 0, width: SW, height: SH))
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(cgContext: ctx, flipped: false)
let attrs: [NSAttributedString.Key: Any] = [.font: NSFont.monospacedSystemFont(ofSize: 11, weight: .bold), .foregroundColor: NSColor.white]
for (i, (img, at)) in frames.enumerated() {
  let x = (i % cols)*cellW, yTop = SH - (i/cols + 1)*cellH
  ctx.draw(img, in: CGRect(x: x+1, y: yTop+1, width: cellW-2, height: cellH-labelH-2))
  let ms = Int(((at - frames[0].1)*1000).rounded())
  NSString(string: String(format: "%.3f +%d", at, ms)).draw(at: NSPoint(x: x+3, y: yTop+cellH-labelH+4), withAttributes: attrs)
}
NSGraphicsContext.restoreGraphicsState()
let sd = CGImageDestinationCreateWithURL(URL(fileURLWithPath: outDir + "/sheet.png") as CFURL, UTType.png.identifier as CFString, 1, nil)!
CGImageDestinationAddImage(sd, ctx.makeImage()!, nil); CGImageDestinationFinalize(sd)
print("frames \(frames.count) sheet \(SW)x\(SH)")
