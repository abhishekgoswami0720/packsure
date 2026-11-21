import { useEffect, useState } from 'react'
import { api, download } from '../api'
import { AuthImg, ErrorBox, Pill, VerdictTag, fmtDate } from '../components'

export default function Result({ id }) {
  const [scan, setScan] = useState(null)
  const [error, setError] = useState('')
  const [remarks, setRemarks] = useState('')
  const [saved, setSaved] = useState('')
  const [zoom, setZoom] = useState(null)

  useEffect(() => {
    setScan(null)
    api.scan(id).then((s) => { setScan(s); setRemarks(s.remarks || '') }).catch((e) => setError(e.message))
  }, [id])

  if (error) return <ErrorBox error={error} />
  if (!scan) return <p className="muted">Loading scan…</p>
  const r = scan.result
  const c = r.counts
  const order = { fail: 0, warn: 1, verify: 2, pass: 3, na: 4 }
  const checks = [...r.checks].sort((a, b) => order[a.status] - order[b.status])

  async function saveRemarks() {
    try {
      await api.saveRemarks(id, remarks)
      setSaved('Saved')
      setTimeout(() => setSaved(''), 1500)
    } catch (e) { setError(e.message) }
  }

  return (
    <div className="result">
      <div className="page-head">
        <div>
          <p className="muted small">Scan #{scan.id} · {fmtDate(scan.created_at)} · {scan.mode === 'pack' ? 'Physical pack' : 'Online listing'}</p>
          <h1>{scan.product_name || 'Untitled product'} {scan.brand && <span className="muted">· {scan.brand}</span>}</h1>
        </div>
        <div className="btns">
          <button onClick={() => download(`/api/scans/${id}/report.pdf`, `packsure-report-${id}.pdf`).catch((e) => setError(e.message))}>Download PDF</button>
          <button onClick={() => download(`/api/scans/${id}/report.docx`, `packsure-report-${id}.docx`).catch((e) => setError(e.message))}>Download DOCX</button>
        </div>
      </div>

      <div className={`verdict ${scan.verdict}`}>
        <VerdictTag verdict={scan.verdict} />
        <span><b>{c.fail}</b> fail · <b>{c.warn}</b> non-standard · <b>{c.verify}</b> to verify · <b>{c.pass}</b> pass</span>
      </div>

      <div className="grid2 wide-left">
        <section className="card">
          <h2>Findings</h2>
          <ul className="checks-list">
            {checks.map((ch) => (
              <li key={ch.id} className={`chk-row ${ch.status}`}>
                <div className="chk-top">
                  <Pill status={ch.status} />
                  <div>
                    <b>{ch.label}</b> <span className="muted small">{ch.rule}</span>
                    <p>{ch.detail}</p>
                    {ch.measured_mm != null && (
                      <div className="meter" aria-label={`Measured ${ch.measured_mm} mm, required ${ch.required_mm} mm`}>
                        <div className="bar"><span style={{ width: `${Math.min(100, (ch.measured_mm / (ch.required_mm * 1.6)) * 100)}%` }} className={ch.status} />
                          <i style={{ left: `${(1 / 1.6) * 100}%` }} title="Required" /></div>
                        <small>{ch.measured_mm.toFixed(1)} mm measured · {ch.required_mm} mm required</small>
                      </div>
                    )}
                  </div>
                </div>
                {ch.evidence && !['na', 'pass'].includes(ch.status) && (
                  <AuthImg src={`/api/scans/${id}/evidence/${ch.evidence}`} alt={`Evidence: ${ch.label}`} className="evidence"
                    onClick={() => setZoom(`/api/scans/${id}/evidence/${ch.evidence}`)} />
                )}
              </li>
            ))}
          </ul>
        </section>

        <aside>
          <section className="card">
            <h2>Scanned image</h2>
            <AuthImg src={`/api/scans/${id}/image/annotated`} alt="Label with findings marked" className="photo"
              onClick={() => setZoom(`/api/scans/${id}/image/annotated`)} />
            <dl className="facts">
              {r.panel_area_cm2 && <><dt>Panel area</dt><dd>{r.panel_area_cm2} cm² <span className="muted">({r.panel_area_source})</span></dd></>}
              {r.px_per_mm && <><dt>Scale</dt><dd>{r.px_per_mm} px/mm</dd></>}
              <dt>Shop / platform</dt><dd>{scan.seller || '–'}</dd>
              <dt>District</dt><dd>{scan.district || '–'}</dd>
              <dt>Inspector</dt><dd>{scan.inspector}</dd>
              <dt>Rule set</dt><dd>{r.ruleset.id} v{r.ruleset.version}</dd>
            </dl>
            {r.notes?.length > 0 && <ul className="notes">{r.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>}
          </section>
          <section className="card">
            <h2>Inspector remarks</h2>
            <textarea rows={4} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Seized 12 packs; seller informed…" />
            <div className="row-end"><span className="muted small">{saved}</span><button onClick={saveRemarks}>Save remarks</button></div>
          </section>
          <details className="card ocr">
            <summary>Text read from the label ({r.ocr_text.length} lines)</summary>
            <pre>{r.ocr_text.join('\n')}</pre>
          </details>
        </aside>
      </div>
      {zoom && (
        <div className="lightbox" onClick={() => setZoom(null)} role="dialog" aria-label="Enlarged image">
          <AuthImg src={zoom} alt="Enlarged" />
        </div>
      )}
    </div>
  )
}
