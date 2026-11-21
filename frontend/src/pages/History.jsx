import { useEffect, useState } from 'react'
import { api } from '../api'
import { ErrorBox, VerdictTag, fmtDate, go } from '../components'

export default function History() {
  const [q, setQ] = useState('')
  const [verdict, setVerdict] = useState('')
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const t = setTimeout(() => {
      api.scans({ q, verdict }).then(setRows).catch((e) => setError(e.message))
    }, 250)
    return () => clearTimeout(t)
  }, [q, verdict])

  return (
    <div>
      <div className="page-head">
        <h1>Inspection history</h1>
        <div className="filters">
          <input type="search" placeholder="Search product, brand, shop…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select value={verdict} onChange={(e) => setVerdict(e.target.value)}>
            <option value="">All results</option>
            <option value="non_compliant">Non-compliant</option>
            <option value="needs_review">Needs review</option>
            <option value="compliant">Compliant</option>
          </select>
        </div>
      </div>
      <ErrorBox error={error} />
      {rows === null ? <p className="muted">Loading…</p> : rows.length === 0 ? (
        <div className="card empty">No scans yet. <a href="#/scan">Start a new scan</a>.</div>
      ) : (
        <div className="card table-wrap">
          <table className="list">
            <thead><tr><th>#</th><th>When</th><th>Product</th><th>Shop / platform</th><th>District</th><th>Result</th><th>Failed checks</th></tr></thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} onClick={() => go(`/scans/${s.id}`)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && go(`/scans/${s.id}`)}>
                  <td>{s.id}</td>
                  <td>{fmtDate(s.created_at)}</td>
                  <td><b>{s.product_name || '–'}</b><br /><span className="muted small">{s.brand}</span></td>
                  <td>{s.seller || '–'}<br /><span className="muted small">{s.mode === 'pack' ? 'Pack' : 'Listing'}</span></td>
                  <td>{s.district || '–'}</td>
                  <td><VerdictTag verdict={s.verdict} /></td>
                  <td className="small">{s.failed.join(', ') || '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
