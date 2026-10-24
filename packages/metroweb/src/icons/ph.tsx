import { PH, type PhName } from './phosphor.ts'

// A Phosphor glyph as a <path> centred on (cx, cy) in the parent SVG's units,
// `size` units square. The defaults suit the 48-unit app bar button grid.
export function ph(name: PhName, size = 24, cx = 24, cy = 24) {
  return (
    <path
      fill="currentColor"
      stroke="none"
      d={PH[name]}
      transform={`translate(${cx - size / 2} ${cy - size / 2}) scale(${size / 256})`}
    />
  )
}
