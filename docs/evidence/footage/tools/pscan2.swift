import Foundation
import CoreGraphics
import ImageIO
// pscan2 <dir>: per frame, bg panel left/right edge per row, panel extent, title/header/icon left x right of the edge
let dir = CommandLine.arguments[1]
let files = (try! FileManager.default.contentsOfDirectory(atPath: dir)).filter { $0.hasPrefix("f_") }.sorted()
for f in files {
  let src = CGImageSourceCreateWithURL(URL(fileURLWithPath: dir + "/" + f) as CFURL, nil)!
  let img = CGImageSourceCreateImageAtIndex(src, 0, nil)!
  let W = img.width, H = img.height
  var b = [UInt8](repeating: 0, count: W*H*4)
  let ctx = CGContext(data: &b, width: W, height: H, bitsPerComponent: 8, bytesPerRow: W*4, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
  ctx.draw(img, in: CGRect(x: 0, y: 0, width: W, height: H))
  func px(_ x: Int, _ y: Int) -> (Int, Int, Int) { let i = (y*W+x)*4; return (Int(b[i]), Int(b[i+1]), Int(b[i+2])) }
  func lum(_ x: Int, _ y: Int) -> Int { let p = px(x, y); return (p.0*299 + p.1*587 + p.2*114)/1000 }
  func sat(_ x: Int, _ y: Int) -> Int { let p = px(x, y); return max(p.0,p.1,p.2) - min(p.0,p.1,p.2) }
  func panel(_ x: Int, _ y: Int) -> Bool { let l = lum(x, y); return l > 75 && l < 215 && sat(x, y) < 35 }
  func dark(_ x: Int, _ y: Int) -> Bool { return lum(x, y) < 55 }
  // left edge per row: first x where previous 6 px dark-ish (or x==0) and next 24 px mostly panel
  func leftEdge(_ y: Int) -> Int {
    var x = 0
    while x < W - 30 {
      var n = 0; for k in 0..<24 where panel(x + k, y) { n += 1 }
      if n >= 22 {
        if x == 0 { return 0 }
        var d = 0; for k in 1...6 where x - k >= 0 && !panel(x - k, y) { d += 1 }
        if d >= 5 { return x }
      }
      x += 1
    }
    return -1
  }
  func rightEdge(_ y: Int, from: Int) -> Int {
    var x = from, miss = 0, last = from
    while x < W { if panel(x, y) || lum(x, y) >= 215 { last = x; miss = 0 } else { miss += 1; if miss > 20 { break } }; x += 1 }
    return last
  }
  var rows: [(Int, Int, Int)] = []
  for y in stride(from: 0, to: H, by: 4) { let e = leftEdge(y); if e >= 0 { rows.append((y, e, rightEdge(y, from: e))) } }
  // longest vertical run of rows with consistent edge (|dx| < 12)
  var best: [(Int, Int, Int)] = [], cur: [(Int, Int, Int)] = []
  for r in rows { if let l = cur.last, r.0 - l.0 <= 12 && abs(r.1 - l.1) < 14 { cur.append(r) } else { if cur.count > best.count { best = cur }; cur = [r] } }
  if cur.count > best.count { best = cur }
  let top = best.first?.0 ?? -1, bot = best.last?.0 ?? -1
  func edgeAt(_ yy: Int) -> Int { best.min(by: { abs($0.0 - yy) < abs($1.0 - yy) }).map { $0.1 } ?? -1 }
  let mid = (top + bot) / 2
  let eTop = edgeAt(top + 20), eMid = edgeAt(mid), eBot = edgeAt(bot - 20)
  let rE = best.isEmpty ? -1 : best.map { $0.2 }.sorted()[best.count/2]
  let gate = max(0, eMid)
  func glyphLeft(_ y0: Int, _ y1: Int, _ test: (Int, Int) -> Bool) -> Int {
    var m = W
    for y in max(0,y0)..<min(H,y1) { for x in gate..<W where test(x, y) { if x < m { m = x }; break } }
    return m == W ? -1 : m
  }
  let titleL = glyphLeft(30, 200) { lum($0, $1) > 225 && sat($0, $1) < 25 }
  let headL = glyphLeft(205, 285) { lum($0, $1) > 215 && sat($0, $1) < 25 }
  let iconL = glyphLeft(380, 440) { sat($0, $1) > 70 }
  print("\(f.dropFirst(2).dropLast(4)) panel y\(top)-\(bot) h\(bot-top) edge top/mid/bot=\(eTop)/\(eMid)/\(eBot) right~\(rE) title=\(titleL) head=\(headL) icon=\(iconL)")
}
