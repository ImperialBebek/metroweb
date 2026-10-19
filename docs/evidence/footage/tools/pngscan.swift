import Foundation
import CoreGraphics
import ImageIO

// pngscan <dir>: per frame, background panel left edge at several rows, panel top/bottom at its left edge,
// and the bright title bbox.
let dir = CommandLine.arguments[1]
let files = (try! FileManager.default.contentsOfDirectory(atPath: dir)).filter { $0.hasPrefix("f_") }.sorted()
for f in files {
  let src = CGImageSourceCreateWithURL(URL(fileURLWithPath: dir + "/" + f) as CFURL, nil)!
  let img = CGImageSourceCreateImageAtIndex(src, 0, nil)!
  let W = img.width, H = img.height
  var b = [UInt8](repeating: 0, count: W*H*4)
  let ctx = CGContext(data: &b, width: W, height: H, bitsPerComponent: 8, bytesPerRow: W*4, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
  ctx.draw(img, in: CGRect(x: 0, y: 0, width: W, height: H))
  func lum(_ x: Int, _ y: Int) -> Int { let i = (y*W+x)*4; return (Int(b[i])*299 + Int(b[i+1])*587 + Int(b[i+2])*114)/1000 }
  func sat(_ x: Int, _ y: Int) -> Int { let i = (y*W+x)*4; let r = Int(b[i]), g = Int(b[i+1]), bb = Int(b[i+2]); return max(r,g,bb) - min(r,g,bb) }
  func gray(_ x: Int, _ y: Int) -> Bool { let l = lum(x, y); return l > 95 && l < 235 && sat(x, y) < 30 }
  // left edge: first x from the right side scanning leftwards where a run of 12 gray pixels ends
  var edges: [String] = []
  var edgeX: [Int: Int] = [:]
  for y in stride(from: 60, through: 800, by: 74) {
    var x = W - 1, run = 0, edge = -1
    while x >= 0 { if gray(x, y) { run += 1 } else { if run >= 12 { edge = x + 1; break }; run = 0 }; x -= 1 }
    if edge < 0 && run >= 12 { edge = 0 }
    edgeX[y] = edge
    edges.append("\(edge)")
  }
  // vertical extent of the panel 6px right of its left edge at mid height
  var top = -1, bot = -1
  if let ex = edgeX[430], ex >= 0, ex + 8 < W {
    let x = ex + 8
    var y = 430; while y > 0 && (gray(x, y) || lum(x, y) > 95) { y -= 1 }; top = y + 1
    y = 430; while y < H - 1 && (gray(x, y) || lum(x, y) > 95) { y += 1 }; bot = y - 1
  }
  // bright title glyphs in the top band
  var tx0 = W, tx1 = -1, ty0 = H, ty1 = -1
  for y in 10..<170 { for x in 0..<W where lum(x, y) > 225 && sat(x, y) < 25 { tx0 = min(tx0, x); tx1 = max(tx1, x); ty0 = min(ty0, y); ty1 = max(ty1, y) } }
  print("\(f.dropFirst(2).dropLast(4)) edges[y60..800/74]=\(edges.joined(separator: ",")) panelL top..bot=\(top)..\(bot) title=\(tx0)-\(tx1) y\(ty0)-\(ty1)")
}
