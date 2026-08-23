"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"

export function NavigationProgress() {
  const pathname = usePathname()
  const [isNavigating, setIsNavigating] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // When pathname changes, navigation is complete
    setIsNavigating(false)
    setProgress(100)

    const timeout = setTimeout(() => {
      setProgress(0)
    }, 300)

    return () => clearTimeout(timeout)
  }, [pathname])

  useEffect(() => {
    // Intercept link clicks to show progress bar
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement
      const anchor = target.closest("a")
      if (!anchor) return

      const href = anchor.getAttribute("href")
      if (!href || href.startsWith("http") || href.startsWith("#") || href === pathname) return

      setIsNavigating(true)
      setProgress(20)
    }

    document.addEventListener("click", handleClick)
    return () => document.removeEventListener("click", handleClick)
  }, [pathname])

  useEffect(() => {
    if (!isNavigating) return

    // Simulate progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev
        return prev + Math.random() * 15
      })
    }, 300)

    return () => clearInterval(interval)
  }, [isNavigating])

  if (progress === 0) return null

  return (
    <div className="fixed inset-x-0 top-0 z-[100] h-0.5">
      <div
        className="h-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)] transition-all duration-300 ease-out"
        style={{ width: `${Math.min(progress, 100)}%` }}
      />
    </div>
  )
}
