import { useEffect, useState } from 'react'
import { api } from '../api'
import { ErrorBox } from '../components'

export default function Users() {
  const [users, setUsers] = useState([])
  const [f, setF] = useState({ username: '', name: '', role: 'inspector', district: '', password: '' })
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const load = () => api.users().then(setUsers).catch((e) => setError(e.message))
  useEffect(() => { load() }, [])
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  async function submit(e) {
    e.preventDefault()
    setError(''); setMsg('')
    try {
      const u = await api.createUser(f)
      setMsg(`Created ${u.username}`)
      setF({ username: '', name: '', role: 'inspector', district: '', password: '' })
      load()
    } catch (err) { setError(err.message) }
  }

  return (
    <div className="grid2">
      <section className="card">
        <h2>Users</h2>
        <table className="list">
          <thead><tr><th>Username</th><th>Name</th><th>Role</th><th>District</th></tr></thead>
          <tbody>{users.map((u) => <tr key={u.id}><td>{u.username}</td><td>{u.name}</td><td>{u.role}</td><td>{u.district || '–'}</td></tr>)}</tbody>
        </table>
      </section>
      <form className="card" onSubmit={submit}>
        <h2>Add a user</h2>
        <div className="row2">
          <label>Username<input value={f.username} onChange={set('username')} required /></label>
          <label>Role<select value={f.role} onChange={set('role')}><option>inspector</option><option>supervisor</option><option>admin</option></select></label>
        </div>
        <label>Full name<input value={f.name} onChange={set('name')} required /></label>
        <label>District<input value={f.district} onChange={set('district')} /></label>
        <label>Password (8+ characters)<input type="password" value={f.password} onChange={set('password')} minLength={8} required /></label>
        <ErrorBox error={error} />
        {msg && <p className="ok">{msg}</p>}
        <button className="primary">Create user</button>
      </form>
    </div>
  )
}
