import { useEffect, useState } from 'react'
import { api } from './api'

export const STATUS = {
  pass: { label: 'Pass', cls: 'pass', icon: '✓' },
  fail: { label: 'Fail', cls: 'fail', icon: '✗' },
  warn: { label: 'Non-standard', cls: 'warn', icon: '!' },
  verify: { label: 'Verify', cls: 'verify', icon: '?' },
  na: { label: 'N/A', cls: 'na', icon: '–' },
}

export const VERDICT = {
  compliant: { label: 'Compliant', cls: 'pass' },
  non_compliant: { label: 'Non-compliant', cls: 'fail' },
  needs_review: { label: 'Needs review', cls: 'warn' },
}

export function Pill({ status }) {
  const s = STATUS[status] || STATUS.na
  return <span className={`pill ${s.cls}`}><b>{s.icon}</b> {s.label}</span>
}

export function VerdictTag({ verdict }) {
  const v = VERDICT[verdict] || { label: verdict, cls: 'na' }
  return <span className={`tag ${v.cls}`}>{v.label}</span>
}

/** <img> for files behind auth: fetched with the token, shown as a blob URL. */
export function AuthImg({ src, alt, className, onClick }) {
  const [url, setUrl] = useState(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let u = null
    let alive = true
    api.blob(src).then((b) => {
      if (!alive) return
      u = URL.createObjectURL(b)
      setUrl(u)
    }).catch(() => alive && setFailed(true))
    return () => { alive = false; if (u) URL.revokeObjectURL(u) }
  }, [src])
  if (failed) return <div className={`imgph ${className || ''}`}>Image unavailable</div>
  if (!url) return <div className={`imgph ${className || ''}`}>Loading…</div>
  return <img src={url} alt={alt} className={className} onClick={onClick} />
}

export function fmtDate(iso) {
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function ErrorBox({ error }) {
  if (!error) return null
  return <div className="error" role="alert">{error}</div>
}

export const go = (path) => { window.location.hash = path }
