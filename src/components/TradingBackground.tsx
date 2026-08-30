"use client"

import { useEffect, useRef } from "react"

export default function TradingBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationFrame: number

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)

      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr

      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resize()
    window.addEventListener("resize", resize)

    const particles = Array.from({ length: 55 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: Math.random() * 1.8 + 0.5,
      speed: Math.random() * 0.25 + 0.08,
      opacity: Math.random() * 0.45 + 0.15,
      drift: (Math.random() - 0.5) * 0.15,
    }))

    let time = 0

    const drawGrid = () => {
      const width = window.innerWidth
      const height = window.innerHeight

      ctx.save()

      ctx.strokeStyle = "rgba(52, 211, 153, 0.045)"
      ctx.lineWidth = 1

      const spacing = 55

      for (let x = 0; x <= width; x += spacing) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.stroke()
      }

      for (let y = 0; y <= height; y += spacing) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }

      ctx.restore()
    }

    const drawChartLine = () => {
      const width = window.innerWidth
      const height = window.innerHeight

      ctx.save()

      ctx.beginPath()

      const startY = height * 0.68

      for (let x = -50; x <= width + 50; x += 18) {
        const normalized = x / width

        const wave =
          Math.sin(normalized * 12 + time * 0.00035) * 18 +
          Math.sin(normalized * 28 + time * 0.0002) * 8

        const trend = normalized * -110

        const y = startY + wave + trend

        if (x === -50) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      }

      const gradient = ctx.createLinearGradient(0, 0, width, 0)
      gradient.addColorStop(0, "rgba(16, 185, 129, 0)")
      gradient.addColorStop(0.25, "rgba(16, 185, 129, 0.10)")
      gradient.addColorStop(0.7, "rgba(52, 211, 153, 0.16)")
      gradient.addColorStop(1, "rgba(52, 211, 153, 0)")

      ctx.strokeStyle = gradient
      ctx.lineWidth = 1.5
      ctx.stroke()

      ctx.restore()
    }

    const drawParticles = () => {
      particles.forEach((particle) => {
        particle.y -= particle.speed
        particle.x += particle.drift

        if (particle.y < -10) {
          particle.y = window.innerHeight + 10
          particle.x = Math.random() * window.innerWidth
        }

        if (particle.x < -10) particle.x = window.innerWidth + 10
        if (particle.x > window.innerWidth + 10) particle.x = -10

        ctx.beginPath()

        ctx.arc(
          particle.x,
          particle.y,
          particle.size,
          0,
          Math.PI * 2
        )

        ctx.fillStyle = `rgba(52, 211, 153, ${particle.opacity})`
        ctx.fill()
      })
    }

    const drawGlow = () => {
      const width = window.innerWidth
      const height = window.innerHeight

      const gradient = ctx.createRadialGradient(
        width * 0.25,
        height * 0.35,
        0,
        width * 0.25,
        height * 0.35,
        width * 0.55
      )

      gradient.addColorStop(0, "rgba(16, 185, 129, 0.08)")
      gradient.addColorStop(0.45, "rgba(16, 185, 129, 0.025)")
      gradient.addColorStop(1, "rgba(16, 185, 129, 0)")

      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, height)
    }

    const animate = () => {
      time += 16

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)

      drawGlow()
      drawGrid()
      drawChartLine()
      drawParticles()

      animationFrame = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      cancelAnimationFrame(animationFrame)
      window.removeEventListener("resize", resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-0"
      aria-hidden="true"
    />
  )
}
