import { useEffect, useState } from 'react'
import { api } from '../api'
import { ErrorBox } from '../components'

function Bars({ items, labelKey, valueKey, tone = 'fail' }) {
  if (!items.length) return <p className="muted small">Nothing yet.</p>
  const max = Math.max(...items.map((i) => i[valueKey]))
  return (
    <ul className="bars">
      {items.map((i) => (
        <li key={i[labelKey]}>
          <span className="bl">{i[labelKey]}</span>
          <span className="bt"><span className={tone} style={{ width: `${(i[valueKey] / max) * 100}%` }} /></span>
          <b>{i[valueKey]}</b>
        </li>
      ))}
    </ul>
  )
}

function Spark({ series }) {
  const W = 560, H = 120, pad = 22
  const max = Math.max(1, ...series.map((d) => d.count))
  const bw = (W - pad * 2) / series.length
  return (
    <svg viewBox={`0 0 ${W} ${H + 24}`} className="spark" role="img" aria-label="Scans per day, last 14 days">
      {series.map((d, i) => {
        const h = (d.count / max) * H
        return (
          <g key={d.date}>
            <rect x={pad + i * bw + 3} y={H - h + 4} width={bw - 6} height={Math.max(h, d.count ? 2 : 0)} rx="3" />
            {d.count > 0 && <text x={pad + i * bw + bw / 2} y={H - h} textAnchor="middle" className="v">{d.count}</text>}
            {(i % 2 === 0 || i === series.length - 1) && (
              <text x={pad + i * bw + bw / 2} y={H + 20} textAnchor="middle" className="d">{d.date.slice(8)}/{d.date.slice(5, 7)}</text>
            )}
          </g>
        )
      })}
      <line x1={pad} x2={W - pad} y1={H + 4} y2={H + 4} className="axis" />
    </svg>
  )
}

export default function Dashboard({ role }) {
  const [days, setDays] = useState(30)
  const [d, setD] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => { api.dashboard(days).then(setD).catch((e) => setError(e.message)) }, [days])

  if (error) return <ErrorBox error={error} />
  if (!d) return <p className="muted">Loading…</p>
  const v = d.by_verdict
  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p className="muted small">{role === 'inspector' ? 'Your inspections' : 'All inspections'} in the last {days} days</p>
        </div>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>
      <div className="kpis">
        <div className="card kpi"><span>Scans</span><b>{d.total}</b></div>
        <div className="card kpi"><span>Compliant</span><b className="t-pass">{d.compliance_rate == null ? '–' : `${d.compliance_rate}%`}</b></div>
        <div className="card kpi"><span>Non-compliant</span><b className="t-fail">{v.non_compliant}</b></div>
        <div className="card kpi"><span>Needs review</span><b className="t-warn">{v.needs_review}</b></div>
      </div>
      <div className="grid2">
        <section className="card"><h2>Most common violations</h2><Bars items={d.top_failed_rules} labelKey="label" valueKey="count" /></section>
        <section className="card"><h2>Scans per day</h2><Spark series={d.per_day} /></section>
        <section className="card"><h2>Scans by district</h2><Bars items={d.by_district} labelKey="district" valueKey="count" tone="ink" /></section>
        <section className="card"><h2>Brands with non-compliant packs</h2><Bars items={d.repeat_brands} labelKey="brand" valueKey="count" /></section>
      </div>
    </div>
  )
}
