"use client"

import * as React from 'react'
import { cn } from '@/lib/utils'

interface DualRangeSliderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'> {
  min?: number
  max?: number
  step?: number
  value?: [number, number]
  defaultValue?: [number, number]
  onValueChange?: (value: [number, number]) => void
  accentColor?: string
  formatValue?: (value: number) => string
}

const DualRangeSlider = React.forwardRef<HTMLDivElement, DualRangeSliderProps>(
  (
    {
      className,
      min = 0,
      max = 100,
      step = 1,
      value: controlled,
      defaultValue = [0, 100],
      onValueChange,
      accentColor = '#49BCF9',
      formatValue = v => v.toString(),
      ...props
    },
    ref
  ) => {
    const [vals, setVals] = React.useState<[number, number]>(controlled ?? defaultValue)

    const minRef  = React.useRef<HTMLInputElement>(null)
    const maxRef  = React.useRef<HTMLInputElement>(null)
    const wrapRef = React.useRef<HTMLDivElement>(null)
    const valsRef = React.useRef(vals)
    const cbRef   = React.useRef(onValueChange)
    valsRef.current = vals
    cbRef.current   = onValueChange

    React.useEffect(() => {
      if (controlled) setVals(controlled)
    }, [controlled?.[0], controlled?.[1]]) // eslint-disable-line react-hooks/exhaustive-deps

    // Set initial z-index via ref — never let React's style prop touch it
    React.useEffect(() => {
      if (minRef.current) minRef.current.style.zIndex = '3'
      if (maxRef.current) maxRef.current.style.zIndex = '5'
    }, [])

    // Swap z-index directly on DOM so whichever thumb is closer gets priority
    React.useEffect(() => {
      const onMove = (e: MouseEvent) => {
        if (!wrapRef.current || !minRef.current || !maxRef.current) return
        const rect = wrapRef.current.getBoundingClientRect()
        const x    = e.clientX - rect.left
        const [lo, hi] = valsRef.current
        const loX  = ((lo - min) / (max - min)) * rect.width
        const hiX  = ((hi - min) / (max - min)) * rect.width
        const minCloser = Math.abs(x - loX) <= Math.abs(x - hiX)
        minRef.current.style.zIndex = minCloser ? '5' : '3'
        maxRef.current.style.zIndex = minCloser ? '3' : '5'
      }
      document.addEventListener('mousemove', onMove)
      return () => document.removeEventListener('mousemove', onMove)
    }, [min, max])

    const [lo, hi] = vals
    const loPct = ((lo - min) / (max - min)) * 100
    const hiPct = ((hi - min) / (max - min)) * 100

    const commit = (next: [number, number]) => {
      setVals(next)
      cbRef.current?.(next)
    }

    return (
      <div className={cn('w-full', className)} ref={ref} {...props}>
        <div className="flex justify-between mb-2 text-[11px] font-semibold" style={{ color: accentColor }}>
          <span>{formatValue(lo)}</span>
          <span>{formatValue(hi)}</span>
        </div>

        <div ref={wrapRef} className="relative w-full" style={{ height: 20 }}>
          {/* Track */}
          <div className="absolute inset-x-0 rounded-full pointer-events-none"
            style={{ top: '50%', transform: 'translateY(-50%)', height: 4, background: 'rgba(255,255,255,0.12)' }} />
          {/* Fill */}
          <div className="absolute rounded-full pointer-events-none"
            style={{ top: '50%', transform: 'translateY(-50%)', left: `${loPct}%`, right: `${100 - hiPct}%`, height: 4, background: accentColor }} />

          <input ref={minRef} type="range" min={min} max={max} step={step} value={lo}
            onChange={e => commit([Math.min(Number(e.target.value), hi - step), hi])}
            className="absolute inset-0 w-full h-full appearance-none bg-transparent cursor-pointer"
            style={{ accentColor } as React.CSSProperties}
          />
          <input ref={maxRef} type="range" min={min} max={max} step={step} value={hi}
            onChange={e => commit([lo, Math.max(Number(e.target.value), lo + step)])}
            className="absolute inset-0 w-full h-full appearance-none bg-transparent cursor-pointer"
            style={{ accentColor } as React.CSSProperties}
          />
        </div>
      </div>
    )
  }
)

DualRangeSlider.displayName = 'DualRangeSlider'
export { DualRangeSlider }
