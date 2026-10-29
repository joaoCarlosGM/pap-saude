export type MetricParts = { target: number; decimals: number; separator: string; suffix: string }
export function parseMetric(value: string): MetricParts | null {
  const m = /^(\d+)(?:([.,])(\d{1,2}))?(%| min)?$/.exec(value)
  if (!m) return null
  const target = Number(m[1] + (m[3] ? '.' + m[3] : ''))
  return Number.isFinite(target) ? { target, decimals: m[3]?.length || 0, separator: m[2] || '.', suffix: m[4] || '' } : null
}
export function formatMetric(value: number, parts: MetricParts) {
  return Math.min(parts.target, Math.max(0, value)).toFixed(parts.decimals).replace('.', parts.separator) + parts.suffix
}
