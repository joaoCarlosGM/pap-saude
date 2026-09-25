"use client"

import { useEffect, useMemo, useState } from "react"

import type { ChartPoint } from "@/types/paciente"

type Props = {
  data: ChartPoint[]
  min?: number
  max?: number
  height?: number
  highlightLast?: boolean
}

export default function AnimatedLineChart({
  data,
  min,
  max,
  height = 220,
  highlightLast = true,
}: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setVisible(true)
    }, 80)

    return () => {
      window.clearTimeout(timer)
    }
  }, [])

  const chart = useMemo(() => {
    const width = 900

    const left = 45
    const right = 25
    const top = 20
    const bottom = 35

    const values = data.map(
      (item) => item.value,
    )

    const minimum =
      min ?? Math.min(...values) - 1

    const maximum =
      max ?? Math.max(...values) + 1

    const range =
      maximum - minimum || 1

    const usableWidth =
      width - left - right

    const usableHeight =
      height - top - bottom

    const points = data.map(
      (item, index) => {
        const x =
          left +
          (index /
            Math.max(data.length - 1, 1)) *
            usableWidth

        const y =
          top +
          ((maximum - item.value) /
            range) *
            usableHeight

        return {
          ...item,
          x,
          y,
        }
      },
    )

    if (!points.length) {
      return {
        width,
        path: "",
        points: [],
      }
    }

    let path = `M ${points[0].x} ${points[0].y}`

    for (let i = 1; i < points.length; i++) {
      const previous = points[i - 1]
      const current = points[i]

      const middle =
        (previous.x + current.x) / 2

      path += ` C ${middle} ${previous.y}, ${middle} ${current.y}, ${current.x} ${current.y}`
    }

    return {
      width,
      path,
      points,
    }
  }, [data, height, max, min])

  return (
    <div className="w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${chart.width} ${height}`}
        className="h-auto w-full min-w-[520px]"
      >
        {[0, 1, 2, 3].map((line) => {
          const y =
            20 +
            ((height - 55) / 3) * line

          return (
            <line
              key={line}
              x1="45"
              x2="875"
              y1={y}
              y2={y}
              stroke="#e2e8f0"
              strokeWidth="1"
              strokeDasharray="4 5"
            />
          )
        })}

        <path
          d={chart.path}
          fill="none"
          stroke="#ec4899"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength="1"
          style={{
            strokeDasharray: 1,
            strokeDashoffset: visible ? 0 : 1,
            transition:
              "stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)",
          }}
        />

        {chart.points.map(
          (point, index) => (
            <g key={point.label}>
              <circle
                cx={point.x}
                cy={point.y}
                r={
                  highlightLast &&
                  index ===
                    chart.points.length - 1
                    ? 6
                    : 4
                }
                fill="#ffffff"
                stroke="#ec4899"
                strokeWidth="3"
                style={{
                  opacity: visible ? 1 : 0,
                  transformOrigin: `${point.x}px ${point.y}px`,
                  transform:
                    visible
                      ? "scale(1)"
                      : "scale(0)",
                  transition: `opacity .35s ease ${
                    index * 100 + 550
                  }ms, transform .35s ease ${
                    index * 100 + 550
                  }ms`,
                }}
              />

              <text
                x={point.x}
                y={height - 10}
                textAnchor="middle"
                fontSize="11"
                fill="#94a3b8"
              >
                {point.label}
              </text>
            </g>
          ),
        )}
      </svg>
    </div>
  )
}