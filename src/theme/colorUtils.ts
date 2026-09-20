// Color utilities — every visual token in the app is derived from ONE accent hex.
// Keeping this file dependency-free so it can be imported anywhere.

export interface Rgb {
  r: number
  g: number
  b: number
}

export interface Hsl {
  h: number
  s: number
  l: number
}

export function hexToRgb(hex: string): Rgb {
  const clean = hex.replace('#', '').trim()
  const value =
    clean.length === 3
      ? clean
          .split('')
          .map((ch) => ch + ch)
          .join('')
      : clean.padEnd(6, '0').slice(0, 6)
  const int = Number.parseInt(value, 16)
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  }
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const to = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`
}

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60
  else if (max === gn) h = ((bn - rn) / d + 2) * 60
  else h = ((rn - gn) / d + 4) * 60
  return { h, s, l }
}

export function hslToRgb({ h, s, l }: Hsl): Rgb {
  if (s === 0) {
    const v = l * 255
    return { r: v, g: v, b: v }
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const hue = ((h % 360) + 360) % 360 / 360
  const hue2rgb = (t: number) => {
    let tt = t
    if (tt < 0) tt += 1
    if (tt > 1) tt -= 1
    if (tt < 1 / 6) return p + (q - p) * 6 * tt
    if (tt < 1 / 2) return q
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6
    return p
  }
  return {
    r: hue2rgb(hue + 1 / 3) * 255,
    g: hue2rgb(hue) * 255,
    b: hue2rgb(hue - 1 / 3) * 255,
  }
}

export function shiftLightness(hex: string, delta: number): string {
  const hsl = rgbToHsl(hexToRgb(hex))
  return rgbToHex(hslToRgb({ ...hsl, l: Math.max(0, Math.min(1, hsl.l + delta)) }))
}

export function shiftHue(hex: string, degrees: number, lightnessDelta = 0): string {
  const hsl = rgbToHsl(hexToRgb(hex))
  return rgbToHex(
    hslToRgb({
      ...hsl,
      h: (hsl.h + degrees + 360) % 360,
      l: Math.max(0, Math.min(1, hsl.l + lightnessDelta)),
    }),
  )
}

export function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alpha})`
}

export function mix(base: string, overlay: string, weight: number): string {
  const a = hexToRgb(base)
  const b = hexToRgb(overlay)
  const w = Math.max(0, Math.min(1, weight))
  return rgbToHex({
    r: a.r * (1 - w) + b.r * w,
    g: a.g * (1 - w) + b.g * w,
    b: a.b * (1 - w) + b.b * w,
  })
}

export function isValidHex(value: string): boolean {
  return /^#?[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(value.trim())
}

export function normalizeHex(value: string): string {
  const clean = value.trim().replace('#', '')
  const expanded =
    clean.length === 3
      ? clean
          .split('')
          .map((ch) => ch + ch)
          .join('')
      : clean
  return `#${expanded.toLowerCase()}`
}
