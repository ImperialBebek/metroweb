import AVFoundation
import CoreVideo
// usage: dump in.mov out.raw start dur sub
let a = CommandLine.arguments
let asset = AVURLAsset(url: URL(fileURLWithPath: a[1]))
let outPath = a[2]
let start = Double(a[3])!, dur = Double(a[4])!, sub = Int(a[5])!
let sem = DispatchSemaphore(value: 0)
Task {
  let vt = try! await asset.loadTracks(withMediaType: .video).first!
  let reader = try! AVAssetReader(asset: asset)
  let out = AVAssetReaderTrackOutput(track: vt, outputSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA])
  reader.timeRange = CMTimeRange(start: CMTime(seconds: start, preferredTimescale: 6000), duration: CMTime(seconds: dur, preferredTimescale: 6000))
  reader.add(out); reader.startReading()
  FileManager.default.createFile(atPath: outPath, contents: nil)
  let fh = FileHandle(forWritingAtPath: outPath)!
  var times = ""
  var n = 0, W = 0, H = 0
  while let sb = out.copyNextSampleBuffer() {
    guard let pb = CMSampleBufferGetImageBuffer(sb) else { continue }
    CVPixelBufferLockBaseAddress(pb, .readOnly)
    let w = CVPixelBufferGetWidth(pb), h = CVPixelBufferGetHeight(pb), bpr = CVPixelBufferGetBytesPerRow(pb)
    let base = CVPixelBufferGetBaseAddress(pb)!.assumingMemoryBound(to: UInt8.self)
    W = w / sub; H = h / sub
    var buf = [UInt8](repeating: 0, count: W * H)
    for y in 0..<H { for x in 0..<W {
      let p = base + (y * sub) * bpr + (x * sub) * 4
      if a.count > 6 && a[6] == "y" {
        buf[y * W + x] = UInt8(max(0, min(Int(p[1]), Int(p[2])) - Int(p[0])))
      } else {
        buf[y * W + x] = UInt8((Int(p[0]) * 29 + Int(p[1]) * 150 + Int(p[2]) * 77) >> 8)
      }
    } }
    CVPixelBufferUnlockBaseAddress(pb, .readOnly)
    fh.write(Data(buf))
    times += String(format: "%.5f\n", CMSampleBufferGetPresentationTimeStamp(sb).seconds)
    n += 1
  }
  try! fh.close()
  try! times.write(toFile: outPath + ".t", atomically: true, encoding: .utf8)
  print("frames", n, "W", W, "H", H)
  sem.signal()
}
sem.wait()
