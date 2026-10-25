# 240 fps WP8.1 page turn fits

Measurements from `IMG_0887.mov` (iPhone slo-mo, 240 fps played back at 30 fps, so 8× slow; 1 video frame = 4.17 ms real). Frames were decoded with [`../tools/dump.swift`](../tools/dump.swift) at half size (540 × 960 upright) and measured with numpy.

Screen calibration: the text's left margin (24 px) and the toggles' right edge (456 px) put the screen at 0.662 video px per screen px, left edge at video x 81 and top at video y 278. The camera's centre is assumed at y = 400. Expect ±3% on scale.

## Threads → settings › messaging (forward)

### Page turning in

Tracked the right edge of the "SMS delivery confirmation" toggle's yellow fill (screen x 438 at rest). For each 60 Hz display frame, solved the angle of a page turning about the screen's left edge, seen from the screen's centre at 1250 px:

| Video time | Real time | Right edge (video x) | Angle |
|---|---|---|---|
| 110.000 | 0 ms | 257 | 51.5° |
| 110.133 | 17 ms | 302 | 36.3° |
| 110.267 | 33 ms | 329 | 25.7° |
| 110.400 | 50 ms | 348 | 16.7° |
| 110.567 | 71 ms | 356 | 12.2° |
| 110.700 | 88 ms | 363 | 7.5° |
| 110.800 | 100 ms | 365 | 5.9° |
| 110.933 | 117 ms | 368 | 3.3° |
| 111.000 | 125 ms | 369 | 2.3° |
| 111.100 | 138 ms | 370 | 1.2° |
| 111.400 | 175 ms | 371 | 0° |

Best fit with `ExponentialEase` Exponent 6 EaseOut from 75°: 270 ms, the first visible frame 17 ms in, RMS error 0.5°. 350 ms (the Toolkit) gives 3°. Exponent 5 from 75 to 90° fits about as well (225 to 230 ms, RMS 0.6°).

Perspective: the bottom toggle's y is pulled toward the centre by a factor of 0.79 (frame 0), 0.84 (frame 1) and 0.87 (frame 2). With the angles above that gives 1290, 1290 and 1250 px.

Every band from the title to "Send MMS acknowledgement" first shows between 109.967 and 110.100 s, within one display refresh: no stagger on the way in.

### Rows leaving

The time each band drops below half its brightness:

| Band | 50% gone |
|---|---|
| App bar | about 107.7 |
| MESSAGING header, "threads" title | 108.00 to 108.03 |
| 89888 | 108.40 |
| TELKOMSEL | 108.70 |
| by.U | 109.10 |
| CSTELKOMSEL | 109.40 |
| Windows Phone | 109.70 |

Rows are 75.5 video px (114 screen px) apart, so the stagger is about 41 ms per row, or 0.36 ms per px. Title to last row is about 210 ms. Each row's angle grows 2.5 to 3.2 times per display frame once it starts, which fits `EXPO_IN_6` over 85 to 110 ms. The last row is gone at about 109.87 s and the next page shows at 110.0 s.

## Conversation → threads (back)

The yellow bubble's leading (bottom) edge moves down 4.5, 11, 20, 32, 48, 70 and 104 screen px at 12, 25, 41, 54, 71, 88 and 121 ms; the trailing edge is LCD ghosting and was ignored. Its brightness falls from about 115 ms and it is gone at about 156 ms. Fitted as 185 px over 150 ms with `ExponentialEase` Exponent 2 EaseIn (the duration and distance trade off: 220 ms and 320 px fit equally well up to the moment it disappears), fading over the last 40 ms.
