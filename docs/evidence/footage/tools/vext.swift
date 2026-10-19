import Foundation
import CoreGraphics
import ImageIO
// vext <dir> <file> <x>...: vertical extent of bright (lum>60) region around y=426 at columns
let dir = CommandLine.arguments[1]
let f = CommandLine.arguments[2]
let xs = CommandLine.arguments.dropFirst(3).map { Int($0)! }
let src = CGImageSourceCreateWithURL(URL(fileURLWithPath: dir + "/" + f) as CFURL, nil)!
let img = CGImageSourceCreateImageAtIndex(src, 0, nil)!
let W = img.width, H = img.height
var b = [UInt8](repeating: 0, count: W*H*4)
let ctx = CGContext(data: &b, width: W, height: H, bitsPerComponent: 8, bytesPerRow: W*4, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
ctx.draw(img, in: CGRect(x: 0, y: 0, width: W, height: H))
func lum(_ x: Int, _ y: Int) -> Int { let i = (y*W+x)*4; return (Int(b[i])*299 + Int(b[i+1])*587 + Int(b[i+2])*114)/1000 }
for x in xs {
  func colLum(_ y: Int) -> Int { var s = 0; for dx in -1...1 { s += lum(min(W-1,max(0,x+dx)), y) }; return s/3 }
  var y = 426, gap = 0; var top = y
  while y > 0 { if colLum(y) > 60 { top = y; gap = 0 } else { gap += 1; if gap > 10 { break } }; y -= 1 }
  y = 426; gap = 0; var bot = y
  while y < H-1 { if colLum(y) > 60 { bot = y; gap = 0 } else { gap += 1; if gap > 10 { break } }; y += 1 }
  print("x=\(x) top=\(top) bot=\(bot) h=\(bot-top) s=\(String(format: "%.3f", Double(bot-top)/853))")
}
