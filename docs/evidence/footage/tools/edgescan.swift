import Foundation
import CoreGraphics
import ImageIO
// edgescan <dir> <n>: bg left edge at a mid row for f-0..f-(n-1)
let dir = CommandLine.arguments[1]; let n = Int(CommandLine.arguments[2])!
for i in 0..<n {
  let src = CGImageSourceCreateWithURL(URL(fileURLWithPath: "\(dir)/f-\(i).png") as CFURL, nil)!
  let img = CGImageSourceCreateImageAtIndex(src, 0, nil)!
  let W = img.width, H = img.height
  var b = [UInt8](repeating: 0, count: W*H*4)
  let ctx = CGContext(data: &b, width: W, height: H, bitsPerComponent: 8, bytesPerRow: W*4, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
  ctx.draw(img, in: CGRect(x: 0, y: 0, width: W, height: H))
  func lum(_ x: Int, _ y: Int) -> Int { let i = (y*W+x)*4; return (Int(b[i])*299 + Int(b[i+1])*587 + Int(b[i+2])*114)/1000 }
  var out: [String] = []
  for fy in [0.62, 0.7] {
    let y = Int(Double(H) * fy); var e = -1
    var x = 0; while x < W - 20 { var k = 0; while k < 20 && lum(x + k, y) > 25 { k += 1 }; if k == 20 { e = x; break }; x += 1 }
    out.append("\(e * 480 / W)")
  }
  print("f-\(i) \(W)x\(H) edge@62%,70%=\(out.joined(separator: ","))")
}
