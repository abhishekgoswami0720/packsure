import { useEffect, useState } from 'react'
import { api } from '../api'
import { ErrorBox, go } from '../components'

export default function NewScan({ user }) {
  const [mode, setMode] = useState('pack')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [f, setF] = useState({
    product_name: '', brand: '', seller: '', district: user.district || '',
    panel_width_cm: '', panel_height_cm: '', marker_mm: '40',
    is_perishable: false, is_imported: false, is_multipack: false, is_moulded: false, hindi: false,
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!file) { setPreview(null); return }
    const u = URL.createObjectURL(file)
    setPreview(u)
    return () => URL.revokeObjectURL(u)
  }, [file])

  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  async function submit(e) {
    e.preventDefault()
    if (!file) { setError('Add a photo of the label first.'); return }
    setBusy(true)
    setError('')
    const form = new FormData()
    form.append('image', file)
    form.append('mode', mode)
    for (const [k, v] of Object.entries(f)) {
      if (v === '' || v === null) continue
      if (mode === 'listing' && ['panel_width_cm', 'panel_height_cm', 'marker_mm', 'is_moulded'].includes(k)) continue
      form.append(k, typeof v === 'boolean' ? String(v) : v)
    }
    try {
      const scan = await api.createScan(form)
      go(`/scans/${scan.id}`)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <form className="scan" onSubmit={submit}>
      <div className="page-head">
        <h1>New scan</h1>
        <div className="seg" role="tablist">
          <button type="button" className={mode === 'pack' ? 'on' : ''} onClick={() => setMode('pack')}>Physical pack</button>
          <button type="button" className={mode === 'listing' ? 'on' : ''} onClick={() => setMode('listing')}>Online listing</button>
        </div>
      </div>

      <div className="grid2">
        <section className="card">
          <h2>1. Photo</h2>
          <label className={`drop ${preview ? 'has' : ''}`}>
            {preview ? <img src={preview} alt="Selected label" /> : (
              <span>
                <b>{mode === 'pack' ? 'Take or upload a photo of the label' : 'Upload a screenshot of the product listing'}</b><br />
                {mode === 'pack' && <small>Put the reference card flat on the pack, in the same photo.</small>}
              </span>
            )}
            <input type="file" accept="image/*" {...(mode === 'pack' ? { capture: 'environment' } : {})}
              onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </label>
          {mode === 'pack' && (
            <p className="muted small">No card yet? <a href="#/card">Print the reference card</a>. Without it, letter height can't be measured.</p>
          )}
        </section>

        <section className="card">
          <h2>2. Product details</h2>
          <label>Common name of the product<input value={f.product_name} onChange={set('product_name')} placeholder="e.g. Glucose biscuits" /></label>
          <div className="row2">
            <label>Brand<input value={f.brand} onChange={set('brand')} /></label>
            <label>{mode === 'pack' ? 'Shop name' : 'Platform / listing URL'}<input value={f.seller} onChange={set('seller')} /></label>
          </div>
          <label>District<input value={f.district} onChange={set('district')} /></label>

          {mode === 'pack' && (
            <>
              <h3>Front panel size <span className="muted small">(for Rule 7 letter height)</span></h3>
              <div className="row2">
                <label>Width (cm)<input type="number" step="0.1" min="0" value={f.panel_width_cm} onChange={set('panel_width_cm')} placeholder="auto" /></label>
                <label>Height (cm)<input type="number" step="0.1" min="0" value={f.panel_height_cm} onChange={set('panel_height_cm')} placeholder="auto" /></label>
              </div>
              <p className="muted small">Leave blank to estimate from the photo.</p>
            </>
          )}

          <h3>This package is…</h3>
          <div className="checks">
            <label className="chk"><input type="checkbox" checked={f.is_perishable} onChange={set('is_perishable')} /> Perishable (needs best before / use by)</label>
            <label className="chk"><input type="checkbox" checked={f.is_imported} onChange={set('is_imported')} /> Imported</label>
            <label className="chk"><input type="checkbox" checked={f.is_multipack} onChange={set('is_multipack')} /> Combination / group / multi-piece pack</label>
            {mode === 'pack' && <label className="chk"><input type="checkbox" checked={f.is_moulded} onChange={set('is_moulded')} /> Text is moulded / embossed on the container</label>}
            <label className="chk"><input type="checkbox" checked={f.hindi} onChange={set('hindi')} /> Label has Hindi text</label>
          </div>
        </section>
      </div>

      <ErrorBox error={error} />
      <div className="actions">
        <button className="primary big" disabled={busy}>{busy ? 'Checking the label…' : 'Check compliance'}</button>
      </div>
    </form>
  )
}
