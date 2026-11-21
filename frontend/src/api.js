const KEY = 'packsure.session'

export function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || null
  } catch {
    return null
  }
}

export function saveSession(s) {
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s))
    else localStorage.removeItem(KEY)
  } catch {
    /* storage unavailable: session lives in memory only */
  }
}

let session = loadSession()
let onExpired = () => {}
export const setSession = (s) => { session = s; saveSession(s) }
export const getSession = () => session
export const onSessionExpired = (fn) => { onExpired = fn }

async function request(path, opts = {}) {
  const headers = { ...(opts.headers || {}) }
  if (session?.token) headers.Authorization = `Bearer ${session.token}`
  const res = await fetch(path, { ...opts, headers })
  if (res.status === 401 && session) {
    setSession(null)
    onExpired()
  }
  if (!res.ok) {
    let msg = `Request failed (${res.status})`
    try { msg = (await res.json()).detail || msg } catch { /* not json */ }
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg))
  }
  return res
}

export const api = {
  login: async (username, password) => (await request('/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }),
  })).json(),
  createScan: async (form) => (await request('/api/scans', { method: 'POST', body: form })).json(),
  scans: async (params = {}) => (await request('/api/scans?' + new URLSearchParams(params))).json(),
  scan: async (id) => (await request(`/api/scans/${id}`)).json(),
  saveRemarks: async (id, remarks) => (await request(`/api/scans/${id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ remarks }),
  })).json(),
  dashboard: async (days = 30) => (await request(`/api/dashboard?days=${days}`)).json(),
  users: async () => (await request('/api/users')).json(),
  createUser: async (u) => (await request('/api/users', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(u),
  })).json(),
  blob: async (path) => (await request(path)).blob(),
}

export async function download(path, filename) {
  const b = await api.blob(path)
  const url = URL.createObjectURL(b)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
