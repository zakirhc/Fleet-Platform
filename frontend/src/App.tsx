import { useCallback, useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Circle, CircleMarker, MapContainer, Popup, Polyline, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { io } from 'socket.io-client'
import 'leaflet/dist/leaflet.css'
import './App.css'

type View = 'dashboard' | 'vehicles' | 'drivers' | 'tracking' | 'history' | 'geofences' | 'administration'
type Status = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'MAINTENANCE'
type UserStatus = 'ACTIVE' | 'INACTIVE' | 'LOCKED'
type Vehicle = { id: string; registrationNo: string; fleetNo?: string | null; make?: string | null; model?: string | null; traccarDeviceId?: string | null; status: Status }
type Driver = { id: string; fullName: string; employeeNo?: string | null; mobile?: string | null; licenseNo?: string | null; status: Status }
type Position = { vehicleId: string; registrationNo: string; traccarDeviceId: string; position: { latitude: number; longitude: number; speed: number; fixTime: string } | null }
type PositionUpdate = { deviceId: string; positionId: string; latitude: number; longitude: number; speed: number; course: number; fixTime: string }
type HistoryPoint = { positionId: string; latitude: number; longitude: number; speed: number; course: number; fixTime: string }
type VehicleHistory = { vehicleId: string; registrationNo: string; traccarDeviceId: string; from: string; to: string; truncated: boolean; summary: { points: number; distanceKm: number; maxSpeed: number; averageSpeed: number }; positions: HistoryPoint[] }
type FleetGeofence = { id: string; tcGeofenceId: number; name: string; active: boolean; alertRules?: AlertRule[] }
type TraccarGeofence = { id: number; name: string; description?: string | null; area: string }
type AlertRule = { id: string; geofenceId: string; eventType: 'ENTER' | 'EXIT'; recipient: string; active: boolean; geofence: FleetGeofence }
type GeofenceEvent = { id: number; eventType: 'ENTER' | 'EXIT'; eventTime: string; vehicleId: string | null; registrationNo: string | null; geofenceId: string | null; geofenceName: string | null }
type OperationRecord = { id:string; status?:string; filledAt?:string; litres?:string; totalAmount?:string; vehicle:{registrationNo:string} }
type Device = { id: number; name: string; uniqueid: string; status?: string | null; lastupdate?: string | null; disabled?: number | null; assignedVehicle?: { id: string; registrationNo: string } | null }
type Company = { id: string; code: string; name: string; email?: string | null; phone?: string | null; address?: string | null; website?: string | null }
type FleetUser = { id: string; username: string; email?: string | null; fullName?: string | null; phone?: string | null; status: UserStatus; lastLoginAt?: string | null }
type Role = { id: string; code: string; name: string; description?: string | null }
type UserRole = { fm_role: Role }
type Envelope<T> = { success: boolean; data: T; message?: string }

const API_URL = import.meta.env.VITE_API_URL ?? '/api'
const emptyVehicle = { registrationNo: '', fleetNo: '', make: '', model: '', traccarDeviceId: '' }
const emptyDriver = { fullName: '', employeeNo: '', mobile: '', licenseNo: '' }
const emptyUser = { username: '', password: '', email: '', fullName: '', phone: '' }

async function api<T>(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('fleet_access_token')
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
  })
  const payload = await response.json() as Envelope<T>
  if (!response.ok || !payload.success) throw new Error(typeof payload.message === 'string' ? payload.message : 'Request failed.')
  return payload.data
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('fleet_access_token'))
  const [view, setView] = useState<View>('dashboard')
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [devices, setDevices] = useState<Device[]>([])
  const [company, setCompany] = useState<Company | null>(null)
  const [users, setUsers] = useState<FleetUser[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [selectedUser, setSelectedUser] = useState<FleetUser | null>(null)
  const [selectedRoleCodes, setSelectedRoleCodes] = useState<string[]>([])
  const [adminDenied, setAdminDenied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [deviceTarget, setDeviceTarget] = useState<Vehicle | null>(null)
  const [selectedDeviceId, setSelectedDeviceId] = useState('')
  const [vehicleForm, setVehicleForm] = useState(emptyVehicle)
  const [driverForm, setDriverForm] = useState(emptyDriver)
  const [userForm, setUserForm] = useState(emptyUser)
  const [companyForm, setCompanyForm] = useState({ name: '', email: '', phone: '', address: '', website: '' })
  const [bootstrapForm, setBootstrapForm] = useState({ username: '', bootstrapSecret: '' })

  const load = useCallback(async (target = view) => {
    setLoading(true)
    setError(null)
    try {
      if (target === 'dashboard') {
        const [vehicleData, driverData, positionData] = await Promise.all([api<Vehicle[]>('/vehicles'), api<Driver[]>('/drivers'), api<Position[]>('/tracking/positions')])
        setVehicles(vehicleData); setDrivers(driverData); setPositions(positionData)
      }
      if (target === 'vehicles') {
        const [vehicleData, deviceData] = await Promise.all([api<Vehicle[]>('/vehicles'), api<Device[]>('/devices')])
        setVehicles(vehicleData); setDevices(deviceData)
      }
      if (target === 'drivers') setDrivers(await api<Driver[]>('/drivers'))
      if (target === 'tracking') setPositions(await api<Position[]>('/tracking/positions'))
      if (target === 'history') setVehicles(await api<Vehicle[]>('/vehicles'))
      if (target === 'geofences') return
      if (target === 'administration') {
        try {
          const [companyData, userData, roleData] = await Promise.all([api<Company>('/company/me'), api<FleetUser[]>('/users'), api<Role[]>('/roles')])
          setCompany(companyData); setUsers(userData); setRoles(roleData); setAdminDenied(false)
          setCompanyForm({ name: companyData.name, email: companyData.email ?? '', phone: companyData.phone ?? '', address: companyData.address ?? '', website: companyData.website ?? '' })
        } catch (cause) {
          const message = cause instanceof Error ? cause.message : 'Unable to load administration data.'
          setAdminDenied(/forbidden|access denied|role/i.test(message))
          setError(message)
        }
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load data.')
    } finally { setLoading(false) }
  }, [view])

  useEffect(() => { if (token) void load() }, [token, view, load])

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setError(null)
    try {
      const result = await api<{ accessToken: string }>('/auth/login', { method: 'POST', body: JSON.stringify({ username: form.get('username'), password: form.get('password') }) })
      localStorage.setItem('fleet_access_token', result.accessToken); setToken(result.accessToken)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Login failed.') }
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null); setNotice(null)
    try {
      if (view === 'vehicles') {
        await api('/vehicles', { method: 'POST', body: JSON.stringify({ ...vehicleForm, traccarDeviceId: vehicleForm.traccarDeviceId ? Number(vehicleForm.traccarDeviceId) : undefined }) })
        setVehicleForm(emptyVehicle)
      }
      if (view === 'drivers') { await api('/drivers', { method: 'POST', body: JSON.stringify(driverForm) }); setDriverForm(emptyDriver) }
      if (view === 'administration') {
        await api('/users', { method: 'POST', body: JSON.stringify(userForm) })
        setUserForm(emptyUser)
      }
      setShowForm(false); await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save.') }
  }

  async function saveCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null); setNotice(null)
    try {
      const updated = await api<Company>('/company/me', { method: 'PATCH', body: JSON.stringify(companyForm) })
      setCompany(updated); setNotice('Company settings saved.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save company settings.') }
  }

  async function selectUser(user: FleetUser) {
    setSelectedUser(user); setError(null); setNotice(null)
    try {
      const assignments = await api<UserRole[]>(`/roles/users/${user.id}`)
      setSelectedRoleCodes(assignments.map((assignment) => assignment.fm_role.code))
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load user roles.') }
  }

  async function saveRoles() {
    if (!selectedUser) return
    if (!selectedRoleCodes.length) { setError('Select at least one role for this user.'); return }
    setError(null); setNotice(null)
    try {
      await api<UserRole[]>(`/roles/users/${selectedUser.id}`, { method: 'PUT', body: JSON.stringify({ roleCodes: selectedRoleCodes }) })
      setNotice(`Roles saved for ${selectedUser.username}.`)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save roles.') }
  }

  async function bootstrapAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null); setNotice(null)
    try {
      await api('/auth/bootstrap-admin', { method: 'POST', body: JSON.stringify(bootstrapForm) })
      setBootstrapForm({ username: '', bootstrapSecret: '' })
      setNotice('Administrator access enabled. Sign out and sign in again to refresh your access token.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to bootstrap administrator access.') }
  }

  async function remove(path: string, name: string) {
    if (!window.confirm(`Remove ${name}?`)) return
    try { await api(path, { method: 'DELETE' }); await load() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to remove.') }
  }
  async function saveDeviceAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!deviceTarget) return
    setError(null); setNotice(null)
    try {
      if (selectedDeviceId) await api(`/vehicles/${deviceTarget.id}/device/${selectedDeviceId}`, { method: 'PATCH' })
      else await api(`/vehicles/${deviceTarget.id}/device`, { method: 'DELETE' })
      setDeviceTarget(null); setSelectedDeviceId(''); setNotice('Traccar device assignment saved.')
      await load('vehicles')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to update device assignment.') }
  }
  function signOut() { localStorage.removeItem('fleet_access_token'); setToken(null); setShowForm(false); setSelectedUser(null) }

  if (!token) return <main className="login-page"><form className="login-card" onSubmit={login}><p className="eyebrow">Fleet Platform</p><h1>Welcome back</h1><p>Sign in to manage your company fleet.</p>{error && <div className="alert">{error}</div>}<label>Username<input name="username" required autoComplete="username" /></label><label>Password<input name="password" required type="password" autoComplete="current-password" /></label><button className="primary-button">Sign in</button></form></main>

  const title = view === 'dashboard' ? 'Dashboard' : view === 'vehicles' ? 'Vehicles' : view === 'drivers' ? 'Drivers' : view === 'tracking' ? 'Live tracking' : view === 'history' ? 'Route playback' : view === 'geofences' ? 'Geofences & alerts' : 'Administration'
  const subtitle = view === 'tracking' ? 'Latest GPS positions from Traccar.' : view === 'history' ? 'Review historical routes for your assigned Traccar devices.' : view === 'geofences' ? 'Link Traccar geofences and configure entry/exit alerts.' : view === 'administration' ? 'Manage your company, users, and access roles.' : 'Manage your company fleet records.'
  return <main className="app-shell"><header className="topbar"><a className="brand" href="#dashboard">Fleet<span>Platform</span></a><button className="logout" onClick={signOut}>Sign out</button></header><div className="workspace"><aside className="sidebar"><p className="nav-label">Fleet</p>{(['dashboard', 'vehicles', 'drivers', 'tracking', 'history', 'geofences'] as View[]).map((item) => <button key={item} className={view === item ? 'active' : ''} onClick={() => { setView(item); setShowForm(false) }}>{item === 'tracking' ? 'Live tracking' : item === 'history' ? 'Route playback' : item === 'geofences' ? 'Geofences & alerts' : item[0].toUpperCase() + item.slice(1)}</button>)}<p className="nav-label nav-section">Administration</p><button className={view === 'administration' ? 'active' : ''} onClick={() => { setView('administration'); setShowForm(false) }}>Company & users</button></aside><section className="content"><div className="page-heading"><div><p className="eyebrow">Company workspace</p><h1>{title}</h1><p className="subheading">{subtitle}</p></div>{(view === 'vehicles' || view === 'drivers' || (view === 'administration' && !adminDenied)) && <button className="primary-button" onClick={() => setShowForm(true)}>+ Add {view === 'administration' ? 'user' : view.slice(0, -1)}</button>}</div>{error && <div className="alert">{error}</div>}{notice && <div className="notice">{notice}</div>}{loading ? <p className="state">Loading…</p> : view === 'administration' ? <Administration company={company} users={users} roles={roles} selectedUser={selectedUser} selectedRoleCodes={selectedRoleCodes} adminDenied={adminDenied} companyForm={companyForm} bootstrapForm={bootstrapForm} onCompanyChange={setCompanyForm} onBootstrapChange={setBootstrapForm} onSaveCompany={saveCompany} onBootstrap={bootstrapAdmin} onSelectUser={selectUser} onToggleRole={(code) => setSelectedRoleCodes((current) => current.includes(code) ? current.filter((item) => item !== code) : [...current, code])} onSaveRoles={saveRoles} onRefresh={() => void load('administration')} /> : view === 'history' ? <RoutePlayback vehicles={vehicles} /> : view === 'geofences' ? <GeofenceManagement /> : <Content view={view} vehicles={vehicles} drivers={drivers} positions={positions} devices={devices} onRefresh={() => void load()} onRemove={remove} onManageDevice={(vehicle) => { setDeviceTarget(vehicle); setSelectedDeviceId(vehicle.traccarDeviceId ?? '') }} />}</section></div>{showForm && <UserOrFleetDialog view={view} devices={devices} vehicleForm={vehicleForm} driverForm={driverForm} userForm={userForm} onVehicleChange={setVehicleForm} onDriverChange={setDriverForm} onUserChange={setUserForm} onClose={() => setShowForm(false)} onSubmit={create} />}{deviceTarget && <DeviceAssignmentDialog vehicle={deviceTarget} devices={devices} selectedDeviceId={selectedDeviceId} onChange={setSelectedDeviceId} onClose={() => { setDeviceTarget(null); setSelectedDeviceId('') }} onSubmit={saveDeviceAssignment} />}</main>
}

function localDateTime(value: Date) {
  const offset = value.getTimezoneOffset() * 60_000
  return new Date(value.getTime() - offset).toISOString().slice(0, 16)
}

function RoutePlayback({ vehicles }: { vehicles: Vehicle[] }) {
  const initialTo = localDateTime(new Date())
  const initialFrom = localDateTime(new Date(Date.now() - 24 * 60 * 60 * 1000))
  const [vehicleId, setVehicleId] = useState('')
  const [from, setFrom] = useState(initialFrom)
  const [to, setTo] = useState(initialTo)
  const [history, setHistory] = useState<VehicleHistory | null>(null)
  const [pointIndex, setPointIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadHistory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!vehicleId) { setError('Choose a vehicle with an assigned Traccar device.'); return }
    setLoading(true); setError(null)
    try {
      const params = new URLSearchParams({ from: new Date(from).toISOString(), to: new Date(to).toISOString(), limit: '5000' })
      const result = await api<VehicleHistory>(`/tracking/vehicles/${vehicleId}/history?${params.toString()}`)
      setHistory(result); setPointIndex(Math.max(0, result.positions.length - 1))
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load route history.') } finally { setLoading(false) }
  }

  const point = history?.positions[pointIndex]
  return <div className="playback-layout"><section className="settings-card playback-controls"><form className="settings-form" onSubmit={loadHistory}><label>Vehicle<select required value={vehicleId} onChange={(event) => setVehicleId(event.target.value)}><option value="">Choose a vehicle</option>{vehicles.filter((vehicle) => vehicle.traccarDeviceId).map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.registrationNo}</option>)}</select></label><label>From<input required type="datetime-local" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label>To<input required type="datetime-local" value={to} onChange={(event) => setTo(event.target.value)} /></label><button className="primary-button" disabled={loading}>{loading ? 'Loading…' : 'Load route'}</button></form>{error && <div className="alert route-alert">{error}</div>}</section>{history ? <><section className="route-summary"><Stat label="Positions" value={history.summary.points} /><Stat label="Distance" value={`${history.summary.distanceKm} km`} /><Stat label="Max speed" value={`${history.summary.maxSpeed} kn`} /><Stat label="Average speed" value={`${history.summary.averageSpeed} kn`} /></section>{history.truncated && <div className="notice">The first 5,000 positions are shown. Narrow the date range for the complete route.</div>}<section className="settings-card route-card"><div className="card-toolbar"><span>{history.registrationNo} route</span><span>{history.positions.length ? `${new Date(history.positions[0].fixTime).toLocaleString()} – ${new Date(history.positions[history.positions.length - 1].fixTime).toLocaleString()}` : 'No positions'}</span></div>{history.positions.length ? <><RoutePlot points={history.positions} activeIndex={pointIndex} /><div className="playback-slider"><input type="range" min="0" max={Math.max(0, history.positions.length - 1)} value={pointIndex} onChange={(event) => setPointIndex(Number(event.target.value))} /><div>{point ? <><strong>{new Date(point.fixTime).toLocaleString()}</strong><span>{point.latitude.toFixed(5)}, {point.longitude.toFixed(5)} · {point.speed.toFixed(1)} knots</span></> : null}</div></div></> : <div className="empty-state"><h2>No route points</h2><p>Traccar did not record valid positions for this vehicle in the selected period.</p></div>}</section></> : <section className="empty-state"><h2>Choose a vehicle and time range</h2><p>Historical GPS positions are limited to the Fleet vehicles assigned to your company.</p></section>}</div>
}

function RouteViewport({ points }: { points: HistoryPoint[] }) { const map=useMap(); useEffect(()=>{const bounds=points.map(p=>[p.latitude,p.longitude] as [number,number]); if(bounds.length===1) map.setView(bounds[0],14); else map.fitBounds(bounds,{padding:[28,28],maxZoom:15})},[map,points]); return null }
function RoutePlot({ points, activeIndex }: { points: HistoryPoint[]; activeIndex: number }) { const [index,setIndex]=useState(activeIndex); const [playing,setPlaying]=useState(false); useEffect(()=>setIndex(activeIndex),[activeIndex]); useEffect(()=>{if(!playing)return; const timer=window.setInterval(()=>setIndex(current=>current>=points.length-1?(setPlaying(false),current):current+1),700);return()=>window.clearInterval(timer)},[playing,points.length]); const active=points[index]; const line=points.map(p=>[p.latitude,p.longitude] as [number,number]); return <div className="route-plot"><MapContainer className="route-map" center={line[0]} zoom={13} scrollWheelZoom><TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /><RouteViewport points={points}/><Polyline positions={line} pathOptions={{color:'#0f766e',weight:4}}/><CircleMarker center={line[0]} radius={7} pathOptions={{color:'#fff',weight:2,fillColor:'#f59e0b',fillOpacity:1}}><Popup>Route start</Popup></CircleMarker><CircleMarker center={[active.latitude,active.longitude]} radius={9} pathOptions={{color:'#fff',weight:2,fillColor:'#0f766e',fillOpacity:1}}><Popup>Playback point</Popup></CircleMarker></MapContainer><div className="route-legend"><span>Start</span><span>Current playback point</span><span className="route-controls"><button className="quiet-button" onClick={()=>{setIndex(0);setPlaying(true)}}>Play</button><button className="quiet-button" onClick={()=>setPlaying(false)}>Stop</button></span></div></div> }

function GeofenceClickHandler({ onSelect }: { onSelect: (latitude: number, longitude: number) => void }) {
  useMapEvents({ click: (event) => onSelect(event.latlng.lat, event.latlng.lng) })
  return null
}

function GeofencePicker({ latitude, longitude, radiusMetres, onSelect }: { latitude: number | null; longitude: number | null; radiusMetres: number; onSelect: (latitude: number, longitude: number) => void }) {
  const centre: [number, number] = latitude !== null && longitude !== null ? [latitude, longitude] : [23.8103, 90.4125]
  return <div className="geofence-picker"><p>Click the map to set the centre of the circular geofence.</p><MapContainer key={`${centre[0]}-${centre[1]}`} className="geofence-map" center={centre} zoom={latitude !== null ? 15 : 11} scrollWheelZoom><TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /><GeofenceClickHandler onSelect={onSelect} />{latitude !== null && longitude !== null && <><Circle center={centre} radius={radiusMetres} pathOptions={{ color: '#0f766e', fillColor: '#55c2b8', fillOpacity: 0.22 }} /><CircleMarker center={centre} radius={6} pathOptions={{ color: '#fff', weight: 2, fillColor: '#0f766e', fillOpacity: 1 }} /></>}</MapContainer>{latitude !== null && longitude !== null ? <small>Selected: {latitude.toFixed(6)}, {longitude.toFixed(6)}</small> : <small>No location selected yet.</small>}</div>
}

function GeofenceManagement() {
  const [geofences, setGeofences] = useState<FleetGeofence[]>([])
  const [available, setAvailable] = useState<TraccarGeofence[]>([])
  const [rules, setRules] = useState<AlertRule[]>([])
  const [events, setEvents] = useState<GeofenceEvent[]>([])
  const [availableGeofenceId, setAvailableGeofenceId] = useState('')
  const [linkedGeofenceId, setLinkedGeofenceId] = useState('')
  const [recipient, setRecipient] = useState('')
  const [eventType, setEventType] = useState<'ENTER' | 'EXIT'>('ENTER')
  const [newGeofence, setNewGeofence] = useState({ name: '', description: '', latitude: '', longitude: '', radiusMetres: '200' })
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setError(null)
    try {
      const [linked, unlinked, alertRules, history] = await Promise.all([
        api<FleetGeofence[]>('/geofences'), api<TraccarGeofence[]>('/geofences/available'), api<AlertRule[]>('/geofences/alerts/rules'), api<GeofenceEvent[]>('/geofences/events/history?limit=100'),
      ])
      setGeofences(linked); setAvailable(unlinked); setRules(alertRules); setEvents(history)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load geofences.') }
  }, [])
  useEffect(() => { void refresh() }, [refresh])

  async function linkGeofence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null); setNotice(null)
    const source = available.find((item) => String(item.id) === availableGeofenceId)
    if (!source) { setError('Choose a Traccar geofence.'); return }
    try {
      await api('/geofences', { method: 'POST', body: JSON.stringify({ tcGeofenceId: source.id, name: source.name }) })
      setAvailableGeofenceId(''); setNotice('Traccar geofence linked to this company.'); await refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to link geofence.') }
  }
  async function createTraccarGeofence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null); setNotice(null)
    try {
      await api('/geofences/traccar', { method: 'POST', body: JSON.stringify({ ...newGeofence, latitude: Number(newGeofence.latitude), longitude: Number(newGeofence.longitude), radiusMetres: Number(newGeofence.radiusMetres) }) })
      setNewGeofence({ name: '', description: '', latitude: '', longitude: '', radiusMetres: '200' })
      setNotice('Geofence created in Traccar and linked to this company.'); await refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to create Traccar geofence.') }
  }
  async function createRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null); setNotice(null)
    if (!linkedGeofenceId || !recipient) { setError('Choose a Fleet geofence and WhatsApp recipient.'); return }
    try {
      await api('/geofences/alerts/rules', { method: 'POST', body: JSON.stringify({ geofenceId: linkedGeofenceId, eventType, recipient }) })
      setRecipient(''); setNotice('Alert rule saved. It queues WhatsApp messages when matching events arrive.'); await refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save alert rule.') }
  }
  async function remove(path: string) {
    if (!window.confirm('Remove this item?')) return
    try { await api(path, { method: 'DELETE' }); await refresh() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to remove item.') }
  }

  const latitude = newGeofence.latitude ? Number(newGeofence.latitude) : null
  const longitude = newGeofence.longitude ? Number(newGeofence.longitude) : null
  return <div className="geofence-layout">{error && <div className="alert">{error}</div>}{notice && <div className="notice">{notice}</div>}<section className="settings-card"><div className="card-toolbar"><span>Create circular geofence in Traccar</span></div><form className="settings-form geofence-create" onSubmit={createTraccarGeofence}><label>Name<input required value={newGeofence.name} onChange={(event) => setNewGeofence({ ...newGeofence, name: event.target.value })} /></label><label>Description<input value={newGeofence.description} onChange={(event) => setNewGeofence({ ...newGeofence, description: event.target.value })} /></label><label>Radius (metres)<input required min="10" type="number" value={newGeofence.radiusMetres} onChange={(event) => setNewGeofence({ ...newGeofence, radiusMetres: event.target.value })} /></label><button className="primary-button">Create in Traccar</button></form><GeofencePicker latitude={latitude} longitude={longitude} radiusMetres={Number(newGeofence.radiusMetres) || 200} onSelect={(nextLatitude, nextLongitude) => setNewGeofence({ ...newGeofence, latitude: String(nextLatitude), longitude: String(nextLongitude) })} /></section><section className="settings-card"><div className="card-toolbar"><span>Company geofences</span><button className="quiet-button" onClick={() => void refresh()}>Refresh</button></div><form className="settings-form compact-form" onSubmit={linkGeofence}><label>Existing Traccar geofence<select value={availableGeofenceId} onChange={(event) => setAvailableGeofenceId(event.target.value)}><option value="">Choose geofence to link</option>{available.map((geofence) => <option key={geofence.id} value={geofence.id}>{geofence.name}{geofence.description ? ` — ${geofence.description}` : ''}</option>)}</select></label><button className="primary-button">Link geofence</button></form><div className="table-wrap"><table><thead><tr><th>Geofence</th><th>Traccar ID</th><th>Active alert rules</th><th></th></tr></thead><tbody>{geofences.map((geofence) => <tr key={geofence.id}><td>{geofence.name}</td><td>{geofence.tcGeofenceId}</td><td>{geofence.alertRules?.length ?? 0}</td><td><button className="delete-button" onClick={() => void remove(`/geofences/${geofence.id}`)}>Remove</button></td></tr>)}</tbody></table></div></section><div className="admin-grid"><section className="settings-card"><div className="card-toolbar"><span>WhatsApp alert rules</span></div><form className="settings-form" onSubmit={createRule}><label>Fleet geofence<select value={linkedGeofenceId} onChange={(event) => setLinkedGeofenceId(event.target.value)}><option value="">Choose linked geofence</option>{geofences.map((geofence) => <option key={geofence.id} value={geofence.id}>{geofence.name}</option>)}</select></label><div className="form-row"><label>Event<select value={eventType} onChange={(event) => setEventType(event.target.value as 'ENTER' | 'EXIT')}><option value="ENTER">Entry</option><option value="EXIT">Exit</option></select></label><label>WhatsApp recipient<input required placeholder="8801…" value={recipient} onChange={(event) => setRecipient(event.target.value)} /></label></div><button className="primary-button">Add alert rule</button></form>{rules.map((rule) => <div className="rule-row" key={rule.id}><span><strong>{rule.eventType === 'ENTER' ? 'Entry' : 'Exit'} · {rule.geofence.name}</strong><small>{rule.recipient}</small></span><button className="delete-button" onClick={() => void remove(`/geofences/alerts/rules/${rule.id}`)}>Remove</button></div>)}</section><section className="settings-card"><div className="card-toolbar"><span>Recent entry / exit events</span></div><div className="event-list">{events.length ? events.map((event) => <div key={event.id}><span className={`event-type ${event.eventType.toLowerCase()}`}>{event.eventType === 'ENTER' ? 'Entered' : 'Exited'}</span><p><strong>{event.registrationNo || 'Unknown vehicle'}</strong> {event.eventType === 'ENTER' ? 'entered' : 'exited'} {event.geofenceName || 'a geofence'}<small>{new Date(event.eventTime).toLocaleString()}</small></p></div>) : <div className="empty-state"><h2>No recent events</h2><p>Events appear after Traccar reports entry or exit for a linked geofence.</p></div>}</div></section></div></div>
}

function Administration({ company, users, roles, selectedUser, selectedRoleCodes, adminDenied, companyForm, bootstrapForm, onCompanyChange, onBootstrapChange, onSaveCompany, onBootstrap, onSelectUser, onToggleRole, onSaveRoles, onRefresh }: { company: Company | null; users: FleetUser[]; roles: Role[]; selectedUser: FleetUser | null; selectedRoleCodes: string[]; adminDenied: boolean; companyForm: { name: string; email: string; phone: string; address: string; website: string }; bootstrapForm: { username: string; bootstrapSecret: string }; onCompanyChange: (value: { name: string; email: string; phone: string; address: string; website: string }) => void; onBootstrapChange: (value: { username: string; bootstrapSecret: string }) => void; onSaveCompany: (event: FormEvent<HTMLFormElement>) => void; onBootstrap: (event: FormEvent<HTMLFormElement>) => void; onSelectUser: (user: FleetUser) => void; onToggleRole: (code: string) => void; onSaveRoles: () => void; onRefresh: () => void }) {
  if (adminDenied) return <section className="settings-card bootstrap-card"><p className="eyebrow">Initial setup</p><h2>Enable administrator access</h2><p>Your signed-in user has no administrator role. Set <code>BOOTSTRAP_ADMIN_SECRET</code> in the backend environment, restart the backend, then enter the existing username and that secret below. This operation is available only until an administrator exists.</p><form onSubmit={onBootstrap}><label>Existing username<input required value={bootstrapForm.username} onChange={(event) => onBootstrapChange({ ...bootstrapForm, username: event.target.value })} /></label><label>Bootstrap secret<input required type="password" value={bootstrapForm.bootstrapSecret} onChange={(event) => onBootstrapChange({ ...bootstrapForm, bootstrapSecret: event.target.value })} /></label><button className="primary-button">Enable administrator access</button></form></section>
  return <div className="admin-grid"><section className="settings-card"><div className="card-toolbar"><span>Company profile {company ? `• ${company.code}` : ''}</span><button className="quiet-button" onClick={onRefresh}>Refresh</button></div><form className="settings-form" onSubmit={onSaveCompany}><label>Company name<input required value={companyForm.name} onChange={(event) => onCompanyChange({ ...companyForm, name: event.target.value })} /></label><div className="form-row"><label>Email<input type="email" value={companyForm.email} onChange={(event) => onCompanyChange({ ...companyForm, email: event.target.value })} /></label><label>Phone<input value={companyForm.phone} onChange={(event) => onCompanyChange({ ...companyForm, phone: event.target.value })} /></label></div><label>Address<input value={companyForm.address} onChange={(event) => onCompanyChange({ ...companyForm, address: event.target.value })} /></label><label>Website<input value={companyForm.website} onChange={(event) => onCompanyChange({ ...companyForm, website: event.target.value })} /></label><div className="settings-actions"><button className="primary-button">Save company settings</button></div></form></section><section className="settings-card"><div className="card-toolbar"><span>Role assignment</span></div>{selectedUser ? <div className="role-panel"><p><strong>{selectedUser.fullName || selectedUser.username}</strong><br /><small>{selectedUser.username}</small></p>{roles.map((role) => <label className="role-option" key={role.code}><input type="checkbox" checked={selectedRoleCodes.includes(role.code)} onChange={() => onToggleRole(role.code)} /><span><strong>{role.name}</strong><small>{role.description || role.code}</small></span></label>)}<button className="primary-button" onClick={onSaveRoles}>Save roles</button></div> : <div className="empty-state"><h2>Select a user</h2><p>Choose a user from the table to manage their roles.</p></div>}</section><section className="settings-card users-card"><div className="card-toolbar"><span>{users.length} user{users.length === 1 ? '' : 's'}</span></div><div className="table-wrap"><table><thead><tr><th>User</th><th>Contact</th><th>Status</th><th>Last sign-in</th><th></th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td><strong>{user.fullName || user.username}</strong><small>{user.username}</small></td><td>{user.email || user.phone || '—'}</td><td><span className={`status ${user.status.toLowerCase()}`}>{user.status}</span></td><td>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}</td><td><button className="quiet-button" onClick={() => onSelectUser(user)}>Roles</button></td></tr>)}</tbody></table></div></section></div>
}

function UserOrFleetDialog({ view, devices, vehicleForm, driverForm, userForm, onVehicleChange, onDriverChange, onUserChange, onClose, onSubmit }: { view: View; devices: Device[]; vehicleForm: typeof emptyVehicle; driverForm: typeof emptyDriver; userForm: typeof emptyUser; onVehicleChange: (value: typeof emptyVehicle) => void; onDriverChange: (value: typeof emptyDriver) => void; onUserChange: (value: typeof emptyUser) => void; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const label = view === 'administration' ? 'user' : view.slice(0, -1)
  return <div className="dialog-backdrop"><form className="dialog" onSubmit={onSubmit}><div className="dialog-heading"><h2>Add {label}</h2><button type="button" className="icon-button" onClick={onClose}>×</button></div>{view === 'vehicles' ? <><label>Registration number<input required value={vehicleForm.registrationNo} onChange={(event) => onVehicleChange({ ...vehicleForm, registrationNo: event.target.value })} /></label><label>Traccar device<select value={vehicleForm.traccarDeviceId} onChange={(event) => onVehicleChange({ ...vehicleForm, traccarDeviceId: event.target.value })}><option value="">Not assigned yet</option>{devices.map((device) => <option key={device.id} value={device.id}>{device.name} ({device.uniqueid})</option>)}</select></label><label>Fleet number<input value={vehicleForm.fleetNo} onChange={(event) => onVehicleChange({ ...vehicleForm, fleetNo: event.target.value })} /></label><div className="form-row"><label>Make<input value={vehicleForm.make} onChange={(event) => onVehicleChange({ ...vehicleForm, make: event.target.value })} /></label><label>Model<input value={vehicleForm.model} onChange={(event) => onVehicleChange({ ...vehicleForm, model: event.target.value })} /></label></div></> : view === 'drivers' ? <><label>Full name<input required value={driverForm.fullName} onChange={(event) => onDriverChange({ ...driverForm, fullName: event.target.value })} /></label><label>Employee number<input value={driverForm.employeeNo} onChange={(event) => onDriverChange({ ...driverForm, employeeNo: event.target.value })} /></label><div className="form-row"><label>Mobile<input value={driverForm.mobile} onChange={(event) => onDriverChange({ ...driverForm, mobile: event.target.value })} /></label><label>Licence<input value={driverForm.licenseNo} onChange={(event) => onDriverChange({ ...driverForm, licenseNo: event.target.value })} /></label></div></> : <><label>Username<input required value={userForm.username} onChange={(event) => onUserChange({ ...userForm, username: event.target.value })} /></label><label>Temporary password<input required minLength={8} type="password" value={userForm.password} onChange={(event) => onUserChange({ ...userForm, password: event.target.value })} /></label><label>Full name<input value={userForm.fullName} onChange={(event) => onUserChange({ ...userForm, fullName: event.target.value })} /></label><div className="form-row"><label>Email<input type="email" value={userForm.email} onChange={(event) => onUserChange({ ...userForm, email: event.target.value })} /></label><label>Phone<input value={userForm.phone} onChange={(event) => onUserChange({ ...userForm, phone: event.target.value })} /></label></div></>}<div className="dialog-actions"><button type="button" className="quiet-button" onClick={onClose}>Cancel</button><button className="primary-button">Save</button></div></form></div>
}

function DeviceAssignmentDialog({ vehicle, devices, selectedDeviceId, onChange, onClose, onSubmit }: { vehicle: Vehicle; devices: Device[]; selectedDeviceId: string; onChange: (value: string) => void; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const choices = devices.filter((device) => !device.assignedVehicle || device.assignedVehicle.id === vehicle.id)
  return <div className="dialog-backdrop"><form className="dialog" onSubmit={onSubmit}><div className="dialog-heading"><h2>Traccar device</h2><button type="button" className="icon-button" onClick={onClose}>×</button></div><p className="dialog-copy">Assign a device to <strong>{vehicle.registrationNo}</strong>. Selecting “No device” safely unassigns it.</p><label>Device<select value={selectedDeviceId} onChange={(event) => onChange(event.target.value)}><option value="">No device assigned</option>{choices.map((device) => <option key={device.id} value={device.id}>{device.name} ({device.uniqueid}){device.status ? ` — ${device.status}` : ''}</option>)}</select></label><div className="dialog-actions"><button type="button" className="quiet-button" onClick={onClose}>Cancel</button><button className="primary-button">Save device</button></div></form></div>
}

function OperationsPanel({ vehicles }: { vehicles: Vehicle[] }) {
  const [schedules, setSchedules] = useState<OperationRecord[]>([]); const [orders, setOrders] = useState<OperationRecord[]>([]); const [fuel, setFuel] = useState<OperationRecord[]>([]); const [expenses, setExpenses] = useState<OperationRecord[]>([])
  const [vehicleId, setVehicleId] = useState(''); const [message, setMessage] = useState<string | null>(null)
  const load = useCallback(async () => { try { const [a,b,c,d] = await Promise.all([api<OperationRecord[]>('/operations/maintenance-schedules'),api<OperationRecord[]>('/operations/work-orders'),api<OperationRecord[]>('/operations/fuel'),api<OperationRecord[]>('/operations/expenses')]); setSchedules(a);setOrders(b);setFuel(c);setExpenses(d) } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'Unable to load operations.') } }, [])
  useEffect(() => { void load() }, [load])
  async function addFuel(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form=new FormData(event.currentTarget); try { await api('/operations/fuel',{method:'POST',body:JSON.stringify({vehicleId,filledAt:new Date().toISOString(),litres:Number(form.get('litres')),totalAmount:Number(form.get('amount')),station:form.get('station')})}); event.currentTarget.reset(); setMessage('Fuel record saved.'); await load() } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'Unable to save fuel.') } }
  return <section className="operations-panel"><div className="card-toolbar"><span>Fleet operations</span><button className="quiet-button" onClick={() => void load()}>Refresh</button></div>{message && <div className="notice">{message}</div>}<div className="operation-grid"><div><h2>Maintenance</h2><p>{schedules.length} schedule{ schedules.length===1?'':'s'} · {orders.filter(x=>x.status!=='COMPLETED').length} open work order{orders.filter(x=>x.status!=='COMPLETED').length===1?'':'s'}</p></div><div><h2>Fuel</h2><p>{fuel.length} records</p></div><div><h2>Expenses</h2><p>{expenses.length} records</p></div></div><form className="operation-form" onSubmit={addFuel}><select required value={vehicleId} onChange={e=>setVehicleId(e.target.value)}><option value="">Vehicle</option>{vehicles.map(v=><option key={v.id} value={v.id}>{v.registrationNo}</option>)}</select><input required name="litres" type="number" min="0.001" step="0.001" placeholder="Litres"/><input required name="amount" type="number" min="0" step="0.01" placeholder="Total amount"/><input name="station" placeholder="Station"/><button className="primary-button">Add fuel</button></form><div className="table-wrap"><table><thead><tr><th>Recent fuel</th><th>Vehicle</th><th>Litres</th><th>Amount</th></tr></thead><tbody>{fuel.slice(0,5).map(record=><tr key={record.id}><td>{record.filledAt ? new Date(record.filledAt).toLocaleDateString() : '—'}</td><td>{record.vehicle.registrationNo}</td><td>{record.litres}</td><td>{record.totalAmount}</td></tr>)}</tbody></table></div></section>
}

function DocumentsPanel({vehicles,drivers}:{vehicles:Vehicle[];drivers:Driver[]}) { const [items,setItems]=useState<Array<{id:string;name:string;documentType?:string;fileUrl:string;expiresAt?:string;vehicleId?:string;driverId?:string}>>([]); const [message,setMessage]=useState<string|null>(null); const load=useCallback(async()=>setItems(await api('/documents')),[]); useEffect(()=>{void load()},[load]); async function create(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);try{await api('/documents',{method:'POST',body:JSON.stringify({name:f.get('name'),documentType:f.get('type'),fileUrl:f.get('url'),vehicleId:f.get('vehicleId')||undefined,driverId:f.get('driverId')||undefined,expiresAt:f.get('expiresAt')||undefined})});e.currentTarget.reset();setMessage('Document saved.');await load()}catch(cause){setMessage(cause instanceof Error?cause.message:'Unable to save document.')}} return <section className="operations-panel"><div className="card-toolbar"><span>Vehicle & driver documents</span><button className="quiet-button" onClick={()=>void load()}>Refresh</button></div>{message&&<div className="notice">{message}</div>}<form className="operation-form" onSubmit={create}><input required name="name" placeholder="Document name"/><input name="type" placeholder="Type"/><input required name="url" placeholder="File URL"/><select name="vehicleId"><option value="">Vehicle (optional)</option>{vehicles.map(v=><option key={v.id} value={v.id}>{v.registrationNo}</option>)}</select><select name="driverId"><option value="">Driver (optional)</option>{drivers.map(d=><option key={d.id} value={d.id}>{d.fullName}</option>)}</select><button className="primary-button">Attach document</button></form><div className="table-wrap"><table><thead><tr><th>Name</th><th>Type</th><th>File</th></tr></thead><tbody>{items.slice(0,5).map(item=><tr key={item.id}><td>{item.name}</td><td>{item.documentType||'—'}</td><td><a href={item.fileUrl} target="_blank" rel="noreferrer">Open</a></td></tr>)}</tbody></table></div></section> }

function ReportsPanel() {
  type Utilisation = { registrationNo:string; positions:number; movingSamples:number; idleSamples:number; overspeedEvents:number; behaviourEvents:number }
  type Trip = { registrationNo:string; trips:number; distanceKm:number; points:number }
  type Idle = { registrationNo:string; idleSamples:number; movingSamples:number; idlePercentage:number }
  type Behaviour = { registrationNo:string; overspeedEvents:number; harshEvents:number; riskScore:number }
  type Schedule = { id:string; reportType:string; frequency:string; recipient?:string|null; lastRunAt?:string|null }
  const [utilisation,setUtilisation]=useState<Utilisation[]>([]); const [trips,setTrips]=useState<Trip[]>([]); const [idling,setIdling]=useState<Idle[]>([]); const [behaviour,setBehaviour]=useState<Behaviour[]>([]); const [schedules,setSchedules]=useState<Schedule[]>([]); const [message,setMessage]=useState<string|null>(null)
  const load=useCallback(async()=>{try{const [a,b,c,d,e]=await Promise.all([api<Utilisation[]>('/reports/utilisation'),api<Trip[]>('/reports/trips'),api<Idle[]>('/reports/idling'),api<Behaviour[]>('/reports/driver-behaviour'),api<Schedule[]>('/reports/schedules')]);setUtilisation(a);setTrips(b);setIdling(c);setBehaviour(d);setSchedules(e);setMessage(null)}catch(cause){setMessage(cause instanceof Error?cause.message:'Unable to load reports.')}},[])
  useEffect(()=>{void load()},[load])
  async function download(){const token=localStorage.getItem('fleet_access_token');const response=await fetch(`${API_URL}/reports/utilisation.csv`,{headers:token?{Authorization:`Bearer ${token}`}:{}});if(!response.ok){setMessage('Unable to download CSV.');return}const blob=await response.blob();const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='utilisation.csv';link.click();URL.revokeObjectURL(url)}
  async function createSchedule(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=new FormData(event.currentTarget);try{await api('/reports/schedules',{method:'POST',body:JSON.stringify({reportType:form.get('reportType'),frequency:form.get('frequency'),recipient:form.get('recipient')||undefined})});event.currentTarget.reset();setMessage('Scheduled WhatsApp report saved.');await load()}catch(cause){setMessage(cause instanceof Error?cause.message:'Unable to save schedule.')}}
  return <section className="operations-panel"><div className="card-toolbar"><span>Fleet reports · last 24 hours</span><span><button className="quiet-button" onClick={()=>void load()}>Refresh</button> <button className="quiet-button" onClick={()=>void download()}>Utilisation CSV</button></span></div>{message&&<div className="notice">{message}</div>}<div className="report-grid"><div className="table-wrap"><h2>Utilisation</h2><table><thead><tr><th>Vehicle</th><th>Positions</th><th>Moving</th><th>Idle</th><th>Overspeed</th></tr></thead><tbody>{utilisation.map(row=><tr key={row.registrationNo}><td>{row.registrationNo}</td><td>{row.positions}</td><td>{row.movingSamples}</td><td>{row.idleSamples}</td><td>{row.overspeedEvents}</td></tr>)}</tbody></table></div><div className="table-wrap"><h2>Trips</h2><table><thead><tr><th>Vehicle</th><th>Trips</th><th>Distance</th><th>Points</th></tr></thead><tbody>{trips.map(row=><tr key={row.registrationNo}><td>{row.registrationNo}</td><td>{row.trips}</td><td>{row.distanceKm} km</td><td>{row.points}</td></tr>)}</tbody></table></div><div className="table-wrap"><h2>Idling</h2><table><thead><tr><th>Vehicle</th><th>Idle samples</th><th>Moving</th><th>Idle %</th></tr></thead><tbody>{idling.map(row=><tr key={row.registrationNo}><td>{row.registrationNo}</td><td>{row.idleSamples}</td><td>{row.movingSamples}</td><td>{row.idlePercentage}%</td></tr>)}</tbody></table></div><div className="table-wrap"><h2>Driver behaviour</h2><table><thead><tr><th>Vehicle</th><th>Overspeed</th><th>Harsh</th><th>Risk</th></tr></thead><tbody>{behaviour.map(row=><tr key={row.registrationNo}><td>{row.registrationNo}</td><td>{row.overspeedEvents}</td><td>{row.harshEvents}</td><td>{row.riskScore}</td></tr>)}</tbody></table></div></div><div className="card-toolbar"><span>Scheduled WhatsApp reports</span><span>{schedules.length} saved</span></div><form className="operation-form" onSubmit={createSchedule}><select name="reportType" defaultValue="UTILISATION"><option value="UTILISATION">Utilisation</option><option value="TRIPS">Trips</option><option value="IDLING">Idling</option><option value="OVERSPEED">Overspeed</option><option value="DRIVER_BEHAVIOUR">Driver behaviour</option><option value="FUEL_EXPENSE">Fuel & expense</option></select><select name="frequency" defaultValue="DAILY"><option value="DAILY">Daily</option><option value="WEEKLY">Weekly</option><option value="MONTHLY">Monthly</option></select><input name="recipient" placeholder="WhatsApp recipient (8801…)"/><button className="primary-button">Schedule report</button></form><div className="table-wrap"><table><thead><tr><th>Report</th><th>Frequency</th><th>Recipient</th><th>Last queued</th></tr></thead><tbody>{schedules.slice(0,5).map(schedule=><tr key={schedule.id}><td>{schedule.reportType.replace('_',' ')}</td><td>{schedule.frequency}</td><td>{schedule.recipient||'—'}</td><td>{schedule.lastRunAt?new Date(schedule.lastRunAt).toLocaleString():'Not yet'}</td></tr>)}</tbody></table></div></section>
}

function Content({ view, vehicles, drivers, positions, devices, onRefresh, onRemove, onManageDevice }: { view: View; vehicles: Vehicle[]; drivers: Driver[]; positions: Position[]; devices: Device[]; onRefresh: () => void; onRemove: (path: string, name: string) => void; onManageDevice: (vehicle: Vehicle) => void }) {
  if (view === 'dashboard') return <><div className="stats"><Stat label="Vehicles" value={vehicles.length} /><Stat label="Drivers" value={drivers.length} /><Stat label="Reporting now" value={positions.filter((position) => position.position).length} /></div><OperationsPanel vehicles={vehicles} /><DocumentsPanel vehicles={vehicles} drivers={drivers}/><ReportsPanel /></>
  if (view === 'tracking') return <LiveMap positions={positions} onRefresh={onRefresh} />
  const items = view === 'vehicles' ? vehicles.map((vehicle) => {
    const device = devices.find((item) => String(item.id) === vehicle.traccarDeviceId)
    return [vehicle.registrationNo, vehicle.fleetNo ?? '—', `${vehicle.make ?? ''} ${vehicle.model ?? ''}`.trim() || '—', device ? <span key="device"><strong>{device.name}</strong><small>{device.uniqueid}{device.status ? ` • ${device.status}` : ''}</small></span> : 'Not assigned', vehicle.status, <span key="actions"><button className="quiet-button" onClick={() => onManageDevice(vehicle)}>Device</button><button className="delete-button inline-action" onClick={() => onRemove(`/vehicles/${vehicle.id}`, vehicle.registrationNo)}>Remove</button></span>]
  }) : drivers.map((driver) => [driver.fullName, driver.employeeNo ?? '—', driver.mobile ?? '—', driver.status, <button key="actions" className="delete-button" onClick={() => onRemove(`/drivers/${driver.id}`, driver.fullName)}>Remove</button>])
  return <Table headers={view === 'vehicles' ? ['Registration', 'Fleet no.', 'Vehicle', 'Traccar device', 'Status', ''] : ['Driver', 'Employee no.', 'Mobile', 'Status', '']} rows={items} onRefresh={onRefresh} />
}

function MapViewport({ positions }: { positions: Position[] }) {
  const map = useMap()
  useEffect(() => {
    const points = positions.filter((item) => item.position).map((item) => [item.position!.latitude, item.position!.longitude] as [number, number])
    if (points.length === 1) map.setView(points[0], 14)
    if (points.length > 1) map.fitBounds(points, { padding: [34, 34], maxZoom: 15 })
  }, [map, positions])
  return null
}

function LiveMap({ positions, onRefresh }: { positions: Position[]; onRefresh: () => void }) {
  const [livePositions, setLivePositions] = useState(positions)
  const [socketState, setSocketState] = useState<'connecting' | 'live' | 'offline'>('connecting')
  useEffect(() => { setLivePositions(positions) }, [positions])
  useEffect(() => {
    const token = localStorage.getItem('fleet_access_token')
    if (!token) return undefined
    const baseUrl = import.meta.env.VITE_SOCKET_URL ?? (API_URL.startsWith('http') ? API_URL.replace(/\/api$/, '') : window.location.origin)
    const socket = io(`${baseUrl}/tracking`, { auth: { token }, transports: ['websocket', 'polling'] })
    socket.on('connect', () => { setSocketState('live'); socket.emit('tracking:subscribe') })
    socket.on('connect_error', () => setSocketState('offline'))
    socket.on('position:update', (update: PositionUpdate) => setLivePositions((current) => current.map((item) => item.traccarDeviceId === update.deviceId ? { ...item, position: update } : item)))
    return () => { socket.disconnect() }
  }, [])
  const reporting = livePositions.filter((item) => item.position)
  const centre: [number, number] = reporting.length ? [reporting[0].position!.latitude, reporting[0].position!.longitude] : [23.8103, 90.4125]
  return <section className="live-map-card"><div className="card-toolbar"><span>{reporting.length} reporting vehicle{reporting.length === 1 ? '' : 's'} <span className={`socket-state ${socketState}`}>{socketState === 'live' ? 'Live' : socketState === 'connecting' ? 'Connecting…' : 'Offline'}</span></span><button className="quiet-button" onClick={onRefresh}>Refresh</button></div><MapContainer className="live-map" center={centre} zoom={reporting.length ? 13 : 10} scrollWheelZoom><TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /><MapViewport positions={reporting} />{reporting.map((item) => <CircleMarker key={item.vehicleId} center={[item.position!.latitude, item.position!.longitude]} radius={10} pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#0f766e', fillOpacity: 1 }}><Popup><strong>{item.registrationNo}</strong><br />{item.position!.latitude.toFixed(5)}, {item.position!.longitude.toFixed(5)}<br />{item.position!.speed.toFixed(1)} knots · {new Date(item.position!.fixTime).toLocaleString()}</Popup></CircleMarker>)}</MapContainer>{livePositions.length ? <div className="live-map-list">{livePositions.map((item) => <div key={item.vehicleId}><strong>{item.registrationNo}</strong><span>{item.position ? `${item.position.speed.toFixed(1)} knots · ${new Date(item.position.fixTime).toLocaleTimeString()}` : 'No current position'}</span></div>)}</div> : <div className="empty-state"><h2>No assigned vehicles</h2><p>Assign a Traccar device to a Fleet vehicle to see it on the map.</p></div>}</section>
}

function Stat({ label, value }: { label: string; value: number | string }) { return <section className="stat"><p>{label}</p><strong>{value}</strong></section> }
function Table({ headers, rows, onRefresh }: { headers: string[]; rows: ReactNode[][]; onRefresh: () => void }) { return <section className="driver-card"><div className="card-toolbar"><span>{rows.length} record{rows.length === 1 ? '' : 's'}</span><button className="quiet-button" onClick={onRefresh}>Refresh</button></div><div className="table-wrap"><table><thead><tr>{headers.map((header, index) => <th key={index}>{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, column) => <td key={column}>{typeof cell === 'string' && ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'MAINTENANCE'].includes(cell) ? <span className={`status ${cell.toLowerCase()}`}>{cell}</span> : cell}</td>)}</tr>)}</tbody></table></div></section> }
export default App
