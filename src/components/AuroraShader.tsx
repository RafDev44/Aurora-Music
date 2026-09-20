import { useEffect, useRef, type CSSProperties } from 'react'
import { Color, Mesh, Program, Renderer, Triangle } from 'ogl'
import { useTheme } from '../theme/useTheme'
import { shiftHue } from '../theme/colorUtils'

const VERTEX = `#version 300 es
in vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`

const FRAGMENT = `#version 300 es
precision highp float;
uniform float uTime;
uniform float uAmplitude;
uniform vec3 uColorStops[3];
uniform vec2 uResolution;
uniform float uBlend;
uniform vec2 uPointer;
out vec4 fragColor;

vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz; x12.xy -= i1; i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m; m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0; vec3 h = abs(x) - 0.5; vec3 ox = floor(x + 0.5); vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g; g.x = a0.x * x0.x + h.x * x0.y; g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  float rampPosition = clamp(uv.x, 0.0, 1.0);
  vec3 ramp = rampPosition < 0.5
    ? mix(uColorStops[0], uColorStops[1], rampPosition * 2.0)
    : mix(uColorStops[1], uColorStops[2], (rampPosition - 0.5) * 2.0);
  vec2 pointerFlow = vec2((uPointer.x - 0.5) * 0.42, (uPointer.y - 0.5) * 0.26);
  float height = snoise(vec2(uv.x * 2.0 + uTime * 0.1 + pointerFlow.x, uTime * 0.25 + pointerFlow.y)) * 0.5 * uAmplitude;
  height = exp(height);
  float intensity = clamp(0.72 * (uv.y * 2.0 - height + 0.28), 0.0, 1.25);
  float alpha = smoothstep(0.16 - uBlend * 0.5, 0.22 + uBlend * 0.5, intensity);
  float shimmer = 0.92 + 0.08 * sin(uTime * 1.8 + uv.x * 12.0);
  fragColor = vec4(ramp * intensity * alpha * shimmer * 1.18, min(alpha * 1.12, 0.95));
}
`

interface AuroraShaderProps {
  className?: string
  style?: CSSProperties
  amplitude?: number
  blend?: number
  speed?: number
}

/** Lightweight WebGL aurora layer used during startup and library hydration. */
export function AuroraShader({
  className = '',
  style,
  amplitude = 1,
  blend = 0.5,
  speed = 1,
}: AuroraShaderProps) {
  const { accent } = useTheme()
  const containerRef = useRef<HTMLDivElement>(null)
  const pointerTarget = useRef<[number, number]>([0.5, 0.5])
  const pointerPosition = useRef<[number, number]>([0.5, 0.5])
  const propsRef = useRef({ accent, amplitude, blend, speed })
  propsRef.current = { accent, amplitude, blend, speed }

  useEffect(() => {
    const container = containerRef.current
    if (!container) return undefined

    let renderer: Renderer
    try {
      renderer = new Renderer({
        alpha: true,
        premultipliedAlpha: true,
        antialias: true,
      })
    } catch {
      return undefined
    }

    const gl = renderer.gl
    gl.clearColor(0, 0, 0, 0)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.canvas.style.backgroundColor = 'transparent'
    const geometry = new Triangle(gl)
    if (geometry.attributes.uv) delete geometry.attributes.uv
    const initialAccent = propsRef.current.accent
    const initialStops = [
      shiftHue(initialAccent, -48, 0.12),
      initialAccent,
      shiftHue(initialAccent, 52, -0.06),
    ]
    const program = new Program(gl, {
      vertex: VERTEX,
      fragment: FRAGMENT,
      uniforms: {
        uTime: { value: 0 },
        uAmplitude: { value: amplitude },
        uColorStops: {
          value: initialStops.map((hex) => {
            const color = new Color(hex)
            return [color.r, color.g, color.b]
          }),
        },
        uResolution: { value: [1, 1] },
        uBlend: { value: blend },
        uPointer: { value: [0.5, 0.5] },
      },
    })
    const mesh = new Mesh(gl, { geometry, program })
    container.appendChild(gl.canvas)

    const resize = () => {
      const width = Math.max(1, container.offsetWidth)
      const height = Math.max(1, container.offsetHeight)
      renderer.setSize(width, height)
      program.uniforms.uResolution.value = [width, height]
    }
    resize()
    window.addEventListener('resize', resize)
    const handlePointerMove = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect()
      const width = Math.max(rect.width, 1)
      const height = Math.max(rect.height, 1)
      pointerTarget.current = [
        Math.min(Math.max((event.clientX - rect.left) / width, 0), 1),
        Math.min(Math.max((event.clientY - rect.top) / height, 0), 1),
      ]
    }
    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    let animationFrame = 0
    const update = (time: number) => {
      const current = propsRef.current
      const stops = [
        shiftHue(current.accent, -48, 0.12),
        current.accent,
        shiftHue(current.accent, 52, -0.06),
      ]
      program.uniforms.uTime.value = time * 0.0001 * current.speed
      program.uniforms.uAmplitude.value = current.amplitude
      program.uniforms.uBlend.value = current.blend
      pointerPosition.current[0] +=
        (pointerTarget.current[0] - pointerPosition.current[0]) * 0.06
      pointerPosition.current[1] +=
        (pointerTarget.current[1] - pointerPosition.current[1]) * 0.06
      program.uniforms.uPointer.value = pointerPosition.current
      program.uniforms.uColorStops.value = stops.map((hex) => {
        const color = new Color(hex)
        return [color.r, color.g, color.b]
      })
      renderer.render({ scene: mesh })
      animationFrame = requestAnimationFrame(update)
    }
    animationFrame = requestAnimationFrame(update)

    return () => {
      cancelAnimationFrame(animationFrame)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', handlePointerMove)
      if (gl.canvas.parentNode === container) container.removeChild(gl.canvas)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  }, [amplitude, blend, speed])

  return (
    <div
      ref={containerRef}
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      style={style}
      aria-hidden
    />
  )
}

export default AuroraShader
