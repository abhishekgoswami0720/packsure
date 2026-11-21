import { useState } from 'react'
import { download } from '../api'
import { ErrorBox } from '../components'

export default function Card() {
  const [error, setError] = useState('')
  return (
    <div className="card narrow">
      <h1>Reference card</h1>
      <p>Letter height under Rule 7 is set in millimetres. A phone photo has no scale, so PackSure needs a printed marker of known size in the frame.</p>
      <ol>
        <li>Download and print the card at <b>100% scale</b> (turn off “fit to page”).</li>
        <li>Check with a ruler: the black square must be exactly <b>40 mm</b> wide.</li>
        <li>Stick it on cardboard. Lay it flat on the pack face, next to the label.</li>
        <li>Take the photo straight on, without glare on the black square.</li>
      </ol>
      <ErrorBox error={error} />
      <button className="primary" onClick={() => download('/api/reference-card.pdf', 'packsure-reference-card.pdf').catch((e) => setError(e.message))}>
        Download reference card (PDF)
      </button>
    </div>
  )
}
