'use client'
import { useEffect, useRef, useState } from 'react'

interface CountUpProps {
  value: number
  formatter: (n: number) => string
}

export default function CountUp({ value, formatter }: CountUpProps) {
  const [display, setDisplay] = useState(value)
  const prevRef = useRef(value)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const from = prevRef.current
    const to = value
    prevRef.current = to
    if (from === to) return

    if (rafRef.current) cancelAnimationFrame(rafRef.current)

    const start = performance.now()
    const duration = 650

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(from + (to - from) * eased)
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        setDisplay(to)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [value])

  return <>{formatter(display)}</>
}
