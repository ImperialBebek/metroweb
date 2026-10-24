import Foundation
import AVFoundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers
import AppKit

// Usage:
// sheet <out.png> <startSec> <endSec> <cols> <rows> [cropX cropY cropW cropH] [cellWidth]
let args = CommandLine.arguments
guard args.count >= 6 else {
    fputs("Usage: sheet <out.png> <startSec> <endSec> <cols> <rows> [cropX cropY cropW cropH] [cellWidth]\n", stderr)
    exit(1)
}

let outPath = args[1]
let startSec = Double(args[2])!
let endSec = Double(args[3])!
let cols = Int(args[4])!
let rows = Int(args[5])!
let count = cols * rows

var cropRect: CGRect? = nil
if args.count >= 10 {
    let cx = Double(args[6])!
    let cy = Double(args[7])!
    let cw = Double(args[8])!
    let ch = Double(args[9])!
    if cw > 0 && ch > 0 {
        cropRect = CGRect(x: cx, y: cy, width: cw, height: ch)
    }
}
let cellW = args.count >= 11 ? Int(args[10])! : 240

guard let video = ProcessInfo.processInfo.environment["VIDEO"] else {
    fputs("Set VIDEO to the video's path\n", stderr)
    exit(1)
}
let videoURL = URL(fileURLWithPath: video)
let asset = AVURLAsset(url: videoURL)
let gen = AVAssetImageGenerator(asset: asset)
gen.appliesPreferredTrackTransform = true
let span = endSec - startSec
if span <= 15.0 {
    gen.requestedTimeToleranceBefore = .zero
    gen.requestedTimeToleranceAfter = .zero
} else {
    let tol = CMTime(seconds: 0.1, preferredTimescale: 600)
    gen.requestedTimeToleranceBefore = tol
    gen.requestedTimeToleranceAfter = tol
}

// Probe one frame to get aspect ratio
let firstTime = CMTime(seconds: startSec, preferredTimescale: 600)
guard let firstCG = try? gen.copyCGImage(at: firstTime, actualTime: nil) else {
    fputs("Failed to read first frame\n", stderr)
    exit(1)
}
let srcW = cropRect?.width ?? CGFloat(firstCG.width)
let srcH = cropRect?.height ?? CGFloat(firstCG.height)
let labelH = 22
let cellH = Int((CGFloat(cellW) * srcH / srcW).rounded()) + labelH

let sheetW = cols * cellW
let sheetH = rows * cellH

let colorSpace = CGColorSpaceCreateDeviceRGB()
guard let ctx = CGContext(
    data: nil,
    width: sheetW,
    height: sheetH,
    bitsPerComponent: 8,
    bytesPerRow: sheetW * 4,
    space: colorSpace,
    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
) else {
    exit(1)
}

ctx.setFillColor(CGColor(red: 0.08, green: 0.08, blue: 0.08, alpha: 1.0))
ctx.fill(CGRect(x: 0, y: 0, width: sheetW, height: sheetH))

NSGraphicsContext.saveGraphicsState()
let nsCtx = NSGraphicsContext(cgContext: ctx, flipped: false)
NSGraphicsContext.current = nsCtx

let font = NSFont.monospacedSystemFont(ofSize: 12, weight: .bold)
let attrs: [NSAttributedString.Key: Any] = [
    .font: font,
    .foregroundColor: NSColor.white
]

for i in 0..<count {
    let frac = count > 1 ? Double(i) / Double(count - 1) : 0.0
    let t = startSec + frac * span
    let cmTime = CMTime(seconds: t, preferredTimescale: 6000)
    var actual = CMTime.zero
    guard let fullCG = try? gen.copyCGImage(at: cmTime, actualTime: &actual) else { continue }
    let imgCG: CGImage
    if let cr = cropRect, let cropped = fullCG.cropping(to: cr) {
        imgCG = cropped
    } else {
        imgCG = fullCG
    }
    let col = i % cols
    let row = i / cols
    let x = col * cellW
    // CoreGraphics origin is bottom-left; row 0 should be at top
    let yTop = sheetH - (row + 1) * cellH
    let imgH = cellH - labelH
    let destRect = CGRect(x: x + 1, y: yTop + 1, width: cellW - 2, height: imgH - 2)
    ctx.draw(imgCG, in: destRect)

    let actualSec = actual.seconds
    let deltaMs = Int(((actualSec - startSec) * 1000.0).rounded())
    let label: String
    if span <= 10.0 {
        label = String(format: "%.3fs (+%dms)", actualSec, deltaMs)
    } else {
        let mins = Int(actualSec) / 60
        let secs = actualSec - Double(mins * 60)
        label = String(format: "%d:%04.1f (%.1fs)", mins, secs, actualSec)
    }
    let nsStr = NSString(string: label)
    nsStr.draw(at: NSPoint(x: CGFloat(x + 4), y: CGFloat(yTop + imgH + 3)), withAttributes: attrs)
}

NSGraphicsContext.restoreGraphicsState()

guard let outCG = ctx.makeImage() else { exit(1) }
let outURL = URL(fileURLWithPath: outPath)
guard let dest = CGImageDestinationCreateWithURL(outURL as CFURL, UTType.png.identifier as CFString, 1, nil) else {
    exit(1)
}
CGImageDestinationAddImage(dest, outCG, nil)
CGImageDestinationFinalize(dest)
print("Wrote \(outPath) (\(sheetW)x\(sheetH))")
