import { useEffect, useRef } from 'react'

interface Pixel {
  x: number
  y: number
  size: number
  speed: number
  opacity: number
  opacityDelta: number
  color: string
}

const COLORS = [
  '#30363d', // border-default — most common
  '#30363d',
  '#30363d',
  '#30363d',
  '#21262d', // bg-hover
  '#21262d',
  '#484f58', // text-muted
  '#e8634a', // accent — rare
]

function randomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)]
}

function createPixel(canvasWidth: number, canvasHeight: number): Pixel {
  return {
    x: Math.random() * canvasWidth,
    y: Math.random() * canvasHeight - canvasHeight, // start above viewport
    size: Math.random() < 0.6 ? 6 : Math.random() < 0.8 ? 8 : 10,
    speed: 0.4 + Math.random() * 1.2,
    opacity: 0.1 + Math.random() * 0.5,
    opacityDelta: (Math.random() - 0.5) * 0.004,
    color: randomColor(),
  }
}

export default function PixelRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const PIXEL_COUNT = 120
    let pixels: Pixel[] = []
    let raf: number
    let width = 0
    let height = 0

    const resize = () => {
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width
      canvas.height = height
    }

    resize()

    // Scatter initial pixels across the full viewport height so it's populated on load
    pixels = Array.from({ length: PIXEL_COUNT }, () => {
      const p = createPixel(width, height)
      p.y = Math.random() * height // already in view
      return p
    })

    const draw = () => {
      ctx.clearRect(0, 0, width, height)

      for (const p of pixels) {
        p.y += p.speed
        p.opacity += p.opacityDelta
        if (p.opacity > 0.6) { p.opacity = 0.6; p.opacityDelta *= -1 }
        if (p.opacity < 0.05) { p.opacity = 0.05; p.opacityDelta *= -1 }

        if (p.y > height + 10) {
          // Reset to top
          p.x = Math.random() * width
          p.y = -p.size
          p.speed = 0.4 + Math.random() * 1.2
          p.opacity = 0.1 + Math.random() * 0.4
          p.color = randomColor()
        }

        ctx.globalAlpha = p.opacity
        ctx.fillStyle = p.color
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size)
      }

      ctx.globalAlpha = 1
      raf = requestAnimationFrame(draw)
    }

    draw()

    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  )
}
