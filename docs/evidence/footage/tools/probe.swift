import Foundation
import AVFoundation
let asset = AVURLAsset(url: URL(fileURLWithPath: CommandLine.arguments[1]))
for t in asset.tracks {
  print(t.mediaType.rawValue, "size", t.naturalSize, "fps", t.nominalFrameRate, "range", t.timeRange.start.seconds, t.timeRange.duration.seconds)
}
print("duration", asset.duration.seconds)
