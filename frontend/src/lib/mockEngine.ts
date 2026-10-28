import { Ambulance, Hospital, Camera, Incident, User, Assignment, RouteInfo } from './api'
import { supabase } from './supabase'

export async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder()
  const data = enc.encode('resq-demo-salt:' + password)
  const hashBuf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export const DEFAULT_AMBULANCES: Ambulance[] = [
  { id: 1, code: 'AMB-01', driver_name: 'Paramedic Arun Kumar', phone: '+91-98401-10001', lat: 13.0720, lng: 80.2600, status: 'available', crew_level: 'ALS', note: 'Central Station Depot' },
  { id: 2, code: 'AMB-02', driver_name: 'Paramedic Bala Sundaram', phone: '+91-98401-10002', lat: 13.0900, lng: 80.2800, status: 'available', crew_level: 'ALS', note: 'North Sector Rapid Responder' },
  { id: 3, code: 'AMB-03', driver_name: 'Paramedic Charu Latha', phone: '+91-98401-10003', lat: 13.0600, lng: 80.2300, status: 'busy', crew_level: 'BLS', note: 'En route to hospital transfer' },
  { id: 4, code: 'AMB-04', driver_name: 'Paramedic Dev Anand', phone: '+91-98401-10004', lat: 13.1100, lng: 80.3000, status: 'offline', crew_level: 'BLS', note: 'Scheduled maintenance inspection' },
  { id: 5, code: 'AMB-05', driver_name: 'Paramedic Esha Sharma', phone: '+91-98401-10005', lat: 13.0450, lng: 80.3100, status: 'available', crew_level: 'ALS', note: 'South Zone Highway Patrol' },
]

export const DEFAULT_HOSPITALS: Hospital[] = [
  { id: 1, name: 'City Central General Hospital', lat: 13.0780, lng: 80.2650, phone: '+91-44-2800-1001', total_beds: 120, available_beds: 14, icu_beds: 3, capabilities: ['trauma', 'icu', 'neuro'], receiving: true, updated_at: new Date().toISOString() },
  { id: 2, name: 'Riverside Emergency Medical Centre', lat: 13.1050, lng: 80.2400, phone: '+91-44-2800-1002', total_beds: 80, available_beds: 6, icu_beds: 0, capabilities: ['trauma', 'pediatric'], receiving: true, updated_at: new Date().toISOString() },
  { id: 3, name: 'Lakeview Trauma & Specialty Hospital', lat: 13.0550, lng: 80.3000, phone: '+91-44-2800-1003', total_beds: 60, available_beds: 9, icu_beds: 2, capabilities: ['icu', 'burns', 'neuro', 'pediatric', 'trauma'], receiving: true, updated_at: new Date().toISOString() },
]

export const DEFAULT_CAMERAS: Camera[] = [
  { id: 1, name: 'CAM-01 Central Junction', location_name: 'Central Junction, Sector 4', lat: 13.0690, lng: 80.2520, status: 'online' },
  { id: 2, name: 'CAM-02 North Ring Flyover', location_name: 'North Ring Express Flyover', lat: 13.0990, lng: 80.2680, status: 'online' },
  { id: 3, name: 'CAM-03 Market Arterial Road', location_name: 'Market Road Intersect', lat: 13.0560, lng: 80.2780, status: 'online' },
  { id: 4, name: 'CAM-04 Riverfront Bridge', location_name: 'Riverfront Expressway Bridge', lat: 13.0850, lng: 80.3050, status: 'online' },
]

export const DEFAULT_USERS = [
  { id: 1, username: 'admin', password: 'admin123', name: 'Chief Dispatch Controller', role: 'admin', ambulance_id: null, hospital_id: null },
  { id: 2, username: 'police1', password: 'police123', name: 'Inspector Vikram Singh (Traffic Division)', role: 'police', ambulance_id: null, hospital_id: null },
  { id: 3, username: 'citizen1', password: 'citizen123', name: 'Citizen Responder Priya Raman', role: 'citizen', ambulance_id: null, hospital_id: null },
  { id: 4, username: 'driver1', password: 'driver123', name: 'Paramedic Arun Kumar', role: 'driver', ambulance_id: 1, hospital_id: null },
  { id: 5, username: 'driver2', password: 'driver123', name: 'Paramedic Bala Sundaram', role: 'driver', ambulance_id: 2, hospital_id: null },
  { id: 6, username: 'driver3', password: 'driver123', name: 'Paramedic Charu Latha', role: 'driver', ambulance_id: 3, hospital_id: null },
  { id: 7, username: 'driver4', password: 'driver123', name: 'Paramedic Dev Anand', role: 'driver', ambulance_id: 4, hospital_id: null },
  { id: 8, username: 'driver5', password: 'driver123', name: 'Paramedic Esha Sharma', role: 'driver', ambulance_id: 5, hospital_id: null },
  { id: 9, username: 'hospital1', password: 'hospital123', name: 'City Central General Hospital Trauma Unit', role: 'hospital', ambulance_id: null, hospital_id: 1 },
  { id: 10, username: 'hospital2', password: 'hospital123', name: 'Riverside Emergency Medical Centre Trauma Unit', role: 'hospital', ambulance_id: null, hospital_id: 2 },
  { id: 11, username: 'hospital3', password: 'hospital123', name: 'Lakeview Trauma & Specialty Hospital Trauma Unit', role: 'hospital', ambulance_id: null, hospital_id: 3 },
]

const ROUTE_CACHE = new Map<string, RouteInfo>()

export function computeMockRoute(from: [number, number], to: [number, number]): RouteInfo {
  const key = `${from[0].toFixed(4)},${from[1].toFixed(4)}_${to[0].toFixed(4)},${to[1].toFixed(4)}`
  if (ROUTE_CACHE.has(key)) {
    return ROUTE_CACHE.get(key)!
  }

  // Pre-fetch from OSRM asynchronously so subsequent renders have full street road points
  try {
    fetch(`https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`)
      .then(res => res.json())
      .then(data => {
        if (data?.routes?.[0]?.geometry?.coordinates?.length) {
          const roadCoords: [number, number][] = data.routes[0].geometry.coordinates.map(
            ([lng, lat]: [number, number]) => [Number(lat.toFixed(6)), Number(lng.toFixed(6))]
          )
          const distKm = Number((data.routes[0].distance / 1000).toFixed(1))
          const etaMin = Math.max(1, Math.round(data.routes[0].duration / 60))
          ROUTE_CACHE.set(key, {
            coords: roadCoords,
            distance_km: distKm,
            eta_min: etaMin,
            simulated: false,
            label: `Live Street Navigation Route (${roadCoords.length} turn points on road network)`
          })
        }
      })
      .catch(() => {})
  } catch {}

  // Urban street-corner grid (travels along street avenues like Google Maps, not across buildings)
  const midLat = from[0]
  const midLng = to[1]
  const coords: [number, number][] = [
    [from[0], from[1]],
    [Number(midLat.toFixed(6)), Number(midLng.toFixed(6))], // street corner intersection turn
    [to[0], to[1]]
  ]
  const dLat = Math.abs(to[0] - from[0]) * 111
  const dLng = Math.abs(to[1] - from[1]) * 111 * Math.cos((from[0] * Math.PI) / 180)
  const dist = Math.max(0.4, dLat + dLng)
  const eta = Math.max(2, Math.round((dist / 38) * 60))
  const route: RouteInfo = {
    coords,
    distance_km: Number(dist.toFixed(1)),
    eta_min: eta,
    simulated: true,
    label: 'Street Avenue Navigation Corridor',
  }
  ROUTE_CACHE.set(key, route)
  return route
}

// Storage keys
const KEY_USERS = 'resq_registered_users_v2'
const KEY_INCIDENTS = 'resq_incidents_v2'
const KEY_AMBULANCES = 'resq_ambulances_v2'
const KEY_HOSPITALS = 'resq_hospitals_v2'
const KEY_AUDIT = 'resq_audit_v2'

function getStored<T>(key: string, def: T): T {
  try {
    const val = localStorage.getItem(key)
    return val ? JSON.parse(val) : def
  } catch {
    return def
  }
}

function setStored(key: string, val: any) {
  try {
    localStorage.setItem(key, JSON.stringify(val))
  } catch {}
}

export function getAllUsers() {
  const custom = getStored<any[]>(KEY_USERS, [])
  return [...DEFAULT_USERS, ...custom]
}

export function registerMockUser(data: {
  username: string
  password: string
  name: string
  role: any
  email?: string | null
  phone?: string | null
  ambulance_id?: number | null
  hospital_id?: number | null
  details?: Record<string, any> | null
}) {
  const users = getAllUsers()
  const cleanU = data.username.trim().toLowerCase()
  if (users.some(u => u.username.toLowerCase() === cleanU)) {
    throw new Error('Username is already registered. Please choose another username.')
  }
  const newUser = {
    id: Date.now(),
    username: cleanU,
    password: data.password,
    name: data.name.trim() || cleanU,
    role: data.role || 'citizen',
    email: data.email || null,
    phone: data.phone || null,
    details: data.details || {},
    ambulance_id: data.ambulance_id || null,
    hospital_id: data.hospital_id || null,
  }
  const custom = getStored<any[]>(KEY_USERS, [])
  custom.push(newUser)
  setStored(KEY_USERS, custom)
  return newUser
}


export function getMockIncidents(): Incident[] {
  let list = getStored<Incident[]>(KEY_INCIDENTS, [])
  if (!list || list.length === 0) {
    const initialInc: Incident = {
      id: 101,
      camera_id: 1,
      camera_name: 'CAM-01 Central Junction',
      lat: 13.0690,
      lng: 80.2520,
      location_name: 'Central Junction, Sector 4',
      status: 'dispatching',
      priority: 'critical',
      source: 'PyTorch AI Surveillance (resqroute_accident_model.pt)',
      confidence: 0.94,
      notes: 'High-speed two-vehicle collision detected via optical motion telemetry',
      verified_by: null,
      required_ambulances: 1,
      police_notified: true,
      green_corridor: true,
      verification_answers: { verified: true, ambulances_needed: 1, notes: 'Multi-angle collision confirmed.' },
      assessment: { severity: 'critical', patients: 2, needs: ['icu', 'trauma'], notes: 'Immediate extraction required' },
      recommended_hospital_id: 1,
      selected_hospital_id: 1,
      selected_hospital_name: 'City Central General Hospital',
      selected_hospital_beds: 14,
      selected_hospital_icu: 3,
      selected_hospital_phone: '+91-44-2800-1001',
      hospital_warning: null,
      created_at: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
      completed_at: null,
      evidence: [
        { id: 1, url: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=600&q=80', seq: 1, captured_at: new Date(Date.now() - 1000 * 60 * 8).toISOString() },
        { id: 2, url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80', seq: 2, captured_at: new Date(Date.now() - 1000 * 60 * 7).toISOString() },
      ],
      assignments: [
        {
          id: 501,
          incident_id: 101,
          ambulance_id: 1,
          ambulance_code: 'AMB-01',
          driver_name: 'Paramedic Arun Kumar',
          driver_phone: '+91-98401-10001',
          status: 'en_route',
          explanation: 'Fastest ETA (4 min, 2.1 km) via Anna Salai corridor with active green signal priority',
          ranking: [
            { code: 'AMB-01', eta_min: 4, distance_km: 2.1 },
            { code: 'AMB-02', eta_min: 7, distance_km: 3.8 },
          ],
          scene_route: computeMockRoute([13.0720, 80.2600], [13.0690, 80.2520]),
          hospital_route: computeMockRoute([13.0690, 80.2520], [13.0780, 80.2650]),
          hospital_id: 1,
          hospital_name: 'City Central General Hospital',
          hospital_available_beds: 14,
          hospital_icu_beds: 3,
          hospital_phone: '+91-44-2800-1001',
          leg: 'to_scene',
          leg_complete: false,
          remaining_eta: 3,
          offered_at: new Date(Date.now() - 1000 * 60 * 6).toISOString(),
          responded_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        },
      ],
    }
    list = [initialInc]
    setStored(KEY_INCIDENTS, list)
  }
  return list
}

export async function handleMockRequest(method: string, url: string, body?: any, _form?: FormData): Promise<any> {
  const path = url.replace(/^[a-zA-Z]+:\/\/[^/]+/, '').split('?')[0]

  // Login
  if (path === '/api/auth/login' && method === 'POST') {
    const cleanU = (body?.username || '').trim().toLowerCase()
    const cleanP = (body?.password || '').trim()

    // 1. Authenticate directly against Supabase Database
    try {
      const expHash = await hashPassword(cleanP)
      const { data: dbUser, error: dbErr } = await supabase
        .from('users')
        .select('id, username, password_hash, name, role, ambulance_id, hospital_id')
        .eq('username', cleanU)
        .maybeSingle()

      if (!dbErr && dbUser) {
        if (dbUser.password_hash === expHash) {
          const token = 'db_tok_' + Math.random().toString(36).substring(2) + Date.now()
          const safeUser = {
            id: dbUser.id,
            username: dbUser.username,
            name: dbUser.name,
            role: dbUser.role,
            ambulance_id: dbUser.ambulance_id,
            hospital_id: dbUser.hospital_id,
          }
          localStorage.setItem('resq_current_user', JSON.stringify(safeUser))
          return { token, user: safeUser }
        } else {
          throw new Error('Invalid username or password. Please verify credentials.')
        }
      }
    } catch (err: any) {
      if (err.message && err.message.includes('Invalid username or password')) {
        throw err
      }
      console.warn('[Supabase Auth] Direct query error, falling back to local catalogue:', err)
    }

    // 2. Check local accounts catalog
    const users = getAllUsers()
    const found = users.find(u => u.username.toLowerCase() === cleanU && u.password === cleanP)
    if (!found) {
      throw new Error('Invalid username or password. Please verify credentials or register a new account.')
    }
    const token = 'mock_tok_' + Math.random().toString(36).substring(2) + Date.now()
    const safeUser = { id: found.id, username: found.username, name: found.name, role: found.role, ambulance_id: found.ambulance_id, hospital_id: found.hospital_id }
    localStorage.setItem('resq_current_user', JSON.stringify(safeUser))
    return { token, user: safeUser }
  }

  // Register
  if (path === '/api/auth/register' && method === 'POST') {
    if (!body?.username || !body?.password || !body?.name) {
      throw new Error('Full name, username, and password are required.')
    }
    const cleanU = (body.username || '').trim().toLowerCase()
    const cleanP = (body.password || '').trim()

    // 1. Try registering directly to Supabase Database
    try {
      const expHash = await hashPassword(cleanP)
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('username', cleanU)
        .maybeSingle()

      if (existing) {
        throw new Error('Username is already registered. Please choose another username.')
      }

      const { data: inserted, error: insErr } = await supabase
        .from('users')
        .insert([{
          username: cleanU,
          password_hash: expHash,
          name: body.name.trim() || cleanU,
          role: body.role || 'citizen',
          ambulance_id: body.ambulance_id || null,
          hospital_id: body.hospital_id || null,
          email: body.email || null,
          phone: body.phone || null,
          details: JSON.stringify(body.details || {}),
        }])
        .select()
        .single()

      if (!insErr && inserted) {
        const token = 'db_tok_' + Math.random().toString(36).substring(2) + Date.now()
        const safeUser = {
          id: inserted.id,
          username: inserted.username,
          name: inserted.name,
          role: inserted.role,
          ambulance_id: inserted.ambulance_id,
          hospital_id: inserted.hospital_id,
          email: inserted.email || null,
          phone: inserted.phone || null,
          details: body.details || {},
        }
        localStorage.setItem('resq_current_user', JSON.stringify(safeUser))
        return { token, user: safeUser }
      }
    } catch (err: any) {
      if (err.message && err.message.includes('already registered')) {
        throw err
      }
      console.warn('[Supabase Register] Direct insert error, saving locally:', err)
    }

    const u = registerMockUser(body)
    const token = 'mock_tok_' + Math.random().toString(36).substring(2) + Date.now()
    const safeUser = {
      id: u.id,
      username: u.username,
      name: u.name,
      role: u.role,
      ambulance_id: u.ambulance_id,
      hospital_id: u.hospital_id,
      email: u.email || null,
      phone: u.phone || null,
      details: u.details || {},
    }
    localStorage.setItem('resq_current_user', JSON.stringify(safeUser))
    return { token, user: safeUser }
  }


  // Auth Me
  if (path === '/api/auth/me' && method === 'GET') {
    const cur = localStorage.getItem('resq_current_user')
    if (cur) return JSON.parse(cur)
    return { id: 1, username: 'admin', name: 'Chief Dispatch Controller', role: 'admin', ambulance_id: null, hospital_id: null }
  }

  // Bootstrap
  if (path === '/api/bootstrap') {
    try {
      const [ambRes, hospRes, camRes] = await Promise.all([
        supabase.from('ambulances').select('*'),
        supabase.from('hospitals').select('*'),
        supabase.from('cameras').select('*'),
      ])

      const ambulances = (ambRes.data && ambRes.data.length > 0)
        ? ambRes.data.map(a => ({
            id: a.id,
            code: a.code,
            driver_name: a.driver_name,
            phone: a.phone,
            lat: Number(a.lat),
            lng: Number(a.lng),
            status: a.status,
            crew_level: a.crew_level,
            note: a.note || '',
          }))
        : getStored<Ambulance[]>(KEY_AMBULANCES, DEFAULT_AMBULANCES)

      const hospitals = (hospRes.data && hospRes.data.length > 0)
        ? hospRes.data.map(h => ({
            id: h.id,
            name: h.name,
            lat: Number(h.lat),
            lng: Number(h.lng),
            phone: h.phone,
            total_beds: h.total_beds,
            available_beds: h.available_beds,
            icu_beds: h.icu_beds,
            capabilities: typeof h.capabilities === 'string'
              ? h.capabilities.split(',').map((s: string) => s.trim())
              : (h.capabilities || ['trauma', 'icu']),
            receiving: h.receiving ?? true,
            status: h.status || 'operational',
            last_admission_at: h.last_admission_at || null,
            updated_at: h.updated_at || new Date().toISOString(),
          }))
        : getStored<Hospital[]>(KEY_HOSPITALS, DEFAULT_HOSPITALS)

      const cameras = (camRes.data && camRes.data.length > 0)
        ? camRes.data.map(c => ({
            id: c.id,
            name: c.name,
            location_name: c.location_name,
            lat: Number(c.lat),
            lng: Number(c.lng),
            status: c.status || 'online',
          }))
        : DEFAULT_CAMERAS

      const incidents = getMockIncidents()
      return { incidents, ambulances, hospitals, cameras }
    } catch (e) {
      console.warn('[Bootstrap] Supabase query failed, falling back to local defaults:', e)
    }

    const ambulances = getStored<Ambulance[]>(KEY_AMBULANCES, DEFAULT_AMBULANCES)
    const hospitals = getStored<Hospital[]>(KEY_HOSPITALS, DEFAULT_HOSPITALS)
    const cameras = DEFAULT_CAMERAS
    const incidents = getMockIncidents()
    return { incidents, ambulances, hospitals, cameras }
  }


  // Network
  if (path === '/api/network') {
    const nodes: [number, number][] = []
    const N = 10
    const LAT0 = 13.040, LAT1 = 13.130, LNG0 = 80.200, LNG1 = 80.320
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        nodes.push([LAT0 + (LAT1 - LAT0) * (i / (N - 1)), LNG0 + (LNG1 - LNG0) * (j / (N - 1))])
      }
    }
    const edges: [number, number, number][] = []
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const idx = i * N + j
        if (j + 1 < N) edges.push([idx, idx + 1, i % 3 === 0 ? 1 : 0])
        if (i + 1 < N) edges.push([idx, idx + N, j % 3 === 0 ? 1 : 0])
      }
    }
    return {
      bbox: { min_lat: LAT0, max_lat: LAT1, min_lng: LNG0, max_lng: LNG1 },
      nodes,
      edges,
      label: 'Simulated Metropolitan emergency road topology',
    }
  }

  // Health
  if (path === '/api/health') {
    return { status: 'ok', external_services_required: false, simulation: true }
  }

  // Route
  if (path === '/api/route') {
    return computeMockRoute([13.0720, 80.2600], [13.0690, 80.2520])
  }

  // AI Detection Model Status
  if (path === '/api/detection/model-status') {
    return {
      model_active: true,
      model_name: 'ResNet-18 (resqroute_accident_model.pt)',
      model_path: 'resqroute_accident_model.pt',
      class_names: ['background', 'near_accident_event'],
      accident_class: 'near_accident_event',
      image_size: 224,
      validation_f1: 0.94,
      cooldown_s: 30,
    }
  }

  // AI Detection Reset
  if (path === '/api/detection/reset' && method === 'POST') {
    return { ok: true, status: 'reset' }
  }

  // AI Detection Frame Inference
  if (path === '/api/detection/frame' && method === 'POST') {
    const thresh = body?.threshold ? Number(body.threshold) : 0.80
    const conf = Math.random() > 0.8 ? 0.94 : 0.12
    return {
      accident_probability: conf,
      confidence: conf,
      triggered: conf >= thresh,
      class_name: conf >= thresh ? 'near_accident_event' : 'background',
      model: 'ResNet-18',
    }
  }

  // AI Detection Upload Video
  if (path === '/api/detection/upload-video' && method === 'POST') {
    const thresh = body?.threshold ? Number(body.threshold) : 0.80
    const conf = 0.94
    const inc = await handleMockRequest('POST', '/api/detection/simulate', {
      camera_id: body?.camera_id || 1,
      confidence: conf,
      threshold: thresh,
    })
    return {
      analysis: {
        total_frames: 450,
        duration_s: 18.0,
        fps: 25.0,
        samples_evaluated: 18,
        accident_detected: true,
        peak_probability: 0.94,
        peak_timestamp_s: 6.2,
        detected_events: [{ timestamp_s: 6.2, probability: 0.94, predicted_class: 'near_accident_event' }],
        evidence_count: 6,
      },
      incident: inc,
      filename: 'live_camera_footage.mp4',
    }
  }

  // AI Detection Simulate Accident
  if (path === '/api/detection/simulate' && method === 'POST') {
    const incs = getMockIncidents()
    const ambs = getStored<Ambulance[]>(KEY_AMBULANCES, DEFAULT_AMBULANCES)
    const hosps = getStored<Hospital[]>(KEY_HOSPITALS, DEFAULT_HOSPITALS)
    const camId = body?.camera_id || 1
    const cam = DEFAULT_CAMERAS.find(c => c.id === camId) || DEFAULT_CAMERAS[0]

    const availAmb = ambs.find(a => a.status === 'available') || ambs[0]
    const chosenHosp = hosps.find(h => h.available_beds > 0) || hosps[0]
    const conf = body?.confidence || 0.94
    const confPct = `${Math.round(conf * 100)}%`

    const newId = Date.now()
    const newInc: Incident = {
      id: newId,
      camera_id: cam.id,
      camera_name: cam.name,
      lat: cam.lat,
      lng: cam.lng,
      location_name: cam.location_name,
      status: 'dispatching',
      priority: 'critical',
      source: 'PyTorch AI Surveillance (resqroute_accident_model.pt)',
      confidence: conf,
      notes: `Confirmed collision detected by PyTorch model with ${confPct} confidence (exceeds 80% threshold).`,
      verified_by: null,
      required_ambulances: 1,
      police_notified: true,
      green_corridor: true,
      verification_answers: null,
      assessment: { severity: 'critical', patients: 1, needs: ['trauma', 'icu'], notes: 'Automated rapid triage generated' },
      recommended_hospital_id: chosenHosp.id,
      selected_hospital_id: chosenHosp.id,
      selected_hospital_name: chosenHosp.name,
      selected_hospital_beds: chosenHosp.available_beds,
      selected_hospital_icu: chosenHosp.icu_beds,
      selected_hospital_phone: chosenHosp.phone,
      hospital_warning: null,
      created_at: new Date().toISOString(),
      completed_at: null,
      evidence: [
        { id: 1, url: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=600&q=80', seq: 1, captured_at: new Date().toISOString() },
        { id: 2, url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80', seq: 2, captured_at: new Date().toISOString() },
        { id: 3, url: 'https://images.unsplash.com/photo-1508974239320-0a029497e820?auto=format&fit=crop&w=600&q=80', seq: 3, captured_at: new Date().toISOString() },
        { id: 4, url: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=600&q=80', seq: 4, captured_at: new Date().toISOString() },
        { id: 5, url: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=600&q=80', seq: 5, captured_at: new Date().toISOString() },
        { id: 6, url: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=600&q=80', seq: 6, captured_at: new Date().toISOString() },
      ],
      assignments: [
        {
          id: Date.now() + 1,
          incident_id: newId,
          ambulance_id: availAmb.id,
          ambulance_code: availAmb.code,
          driver_name: availAmb.driver_name,
          driver_phone: availAmb.phone,
          status: 'offered',
          explanation: `Automated dispatch: Nearest ready unit (${availAmb.code}) matched to incident scene`,
          ranking: [
            { code: availAmb.code, eta_min: 4, distance_km: 2.1 },
            { code: 'AMB-02', eta_min: 7, distance_km: 3.8 },
          ],
          scene_route: computeMockRoute([availAmb.lat, availAmb.lng], [cam.lat, cam.lng]),
          hospital_route: computeMockRoute([cam.lat, cam.lng], [chosenHosp.lat, chosenHosp.lng]),
          hospital_id: chosenHosp.id,
          hospital_name: chosenHosp.name,
          hospital_available_beds: chosenHosp.available_beds,
          hospital_icu_beds: chosenHosp.icu_beds,
          hospital_phone: chosenHosp.phone,
          leg: 'to_scene',
          leg_complete: false,
          remaining_eta: 4,
          offered_at: new Date().toISOString(),
          responded_at: null,
        },
      ],
    }

    incs.unshift(newInc)
    setStored(KEY_INCIDENTS, incs)
    return newInc
  }

  // Create incident manual
  if (path === '/api/incidents' && method === 'POST') {
    const incs = getMockIncidents()
    const ambs = getStored<Ambulance[]>(KEY_AMBULANCES, DEFAULT_AMBULANCES)
    const hosps = getStored<Hospital[]>(KEY_HOSPITALS, DEFAULT_HOSPITALS)
    const lat = body?.lat || 13.0690
    const lng = body?.lng || 80.2520

    const availAmb = ambs.find(a => a.status === 'available') || ambs[0]
    const chosenHosp = hosps.find(h => h.available_beds > 0) || hosps[0]

    const newId = Date.now()
    const newInc: Incident = {
      id: newId,
      camera_id: body?.camera_id || null,
      camera_name: body?.camera_id ? `CAM-0${body.camera_id}` : 'Surveillance Sensor',
      lat,
      lng,
      location_name: body?.location_name || 'Anna Salai Arterial Intersect',
      status: 'dispatching',
      priority: 'high',
      source: body?.source || 'PyTorch AI Surveillance Model',
      confidence: body?.confidence || 0.91,
      notes: body?.notes || 'Automated accident incident generated by surveillance sensor telemetry',
      verified_by: null,
      required_ambulances: 1,
      police_notified: true,
      green_corridor: true,
      verification_answers: null,
      assessment: { severity: 'severe', patients: 1, needs: ['trauma'], notes: 'Initial trauma assessment' },
      recommended_hospital_id: chosenHosp.id,
      selected_hospital_id: chosenHosp.id,
      selected_hospital_name: chosenHosp.name,
      selected_hospital_beds: chosenHosp.available_beds,
      selected_hospital_icu: chosenHosp.icu_beds,
      selected_hospital_phone: chosenHosp.phone,
      hospital_warning: null,
      created_at: new Date().toISOString(),
      completed_at: null,
      evidence: [
        { id: 1, url: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=600&q=80', seq: 1, captured_at: new Date().toISOString() },
      ],
      assignments: [
        {
          id: Date.now() + 1,
          incident_id: newId,
          ambulance_id: availAmb.id,
          ambulance_code: availAmb.code,
          driver_name: availAmb.driver_name,
          driver_phone: availAmb.phone,
          status: 'offered',
          explanation: `Automated dispatch: Nearest ready ambulance (${availAmb.code}) matched to incident scene`,
          ranking: [{ code: availAmb.code, eta_min: 5, distance_km: 2.3 }],
          scene_route: computeMockRoute([availAmb.lat, availAmb.lng], [lat, lng]),
          hospital_route: computeMockRoute([lat, lng], [chosenHosp.lat, chosenHosp.lng]),
          hospital_id: chosenHosp.id,
          hospital_name: chosenHosp.name,
          hospital_available_beds: chosenHosp.available_beds,
          hospital_icu_beds: chosenHosp.icu_beds,
          hospital_phone: chosenHosp.phone,
          leg: 'to_scene',
          leg_complete: false,
          remaining_eta: 5,
          offered_at: new Date().toISOString(),
          responded_at: null,
        },
      ],
    }

    incs.unshift(newInc)
    setStored(KEY_INCIDENTS, incs)
    return newInc
  }

  // Hospital recommendations for an incident
  if (path.includes('/hospital-recommendations') && method === 'GET') {
    const hosps = getStored<Hospital[]>(KEY_HOSPITALS, DEFAULT_HOSPITALS)
    const candidates = hosps.map((h, k) => ({
      hospital: h,
      eligible: h.receiving && h.available_beds > 0,
      rank: k + 1,
      distance_km: Number(((k + 1) * 2.3).toFixed(1)),
      eta_min: (k + 1) * 4,
      explanation: `${h.available_beds} beds free, ${h.icu_beds} ICU beds active`,
      excluded_reasons: h.available_beds <= 0 ? ['No free beds'] : !h.receiving ? ['Hospital diverted'] : [],
      route: computeMockRoute([13.0690, 80.2520], [h.lat, h.lng]),
    }))
    return {
      needs: ['trauma', 'icu'],
      warning: null,
      selected_hospital_id: hosps[0]?.id || 1,
      recommended_hospital_id: hosps[0]?.id || 1,
      candidates,
      disclaimer: 'Hospital recommendations aligned with real-time bed inventory.',
    }
  }

  // History and Audit trails
  if (path === '/api/history' && method === 'GET') {
    const audit = [
      { id: 1, ts: new Date().toISOString(), actor: 'admin', action: 'system_boot', entity: 'core', entity_id: '1', detail: 'Operations grid initialized with PyTorch AI Surveillance' },
      { id: 2, ts: new Date().toISOString(), actor: 'ai_model', action: 'surveillance_standby', entity: 'camera', entity_id: '1', detail: 'Optical accident heuristics active (resqroute_accident_model.pt)' },
      { id: 3, ts: new Date().toISOString(), actor: 'police1', action: 'corridor_readiness', entity: 'traffic', entity_id: '103', detail: 'Green Corridor priority preemption synchronized' },
    ]
    const events = [
      { id: 1, incident_id: 101, event: 'detected', message: 'PyTorch AI Model detected collision event', ts: new Date().toISOString() },
      { id: 2, incident_id: 101, event: 'dispatched', message: 'AMB-01 dispatched to scene', ts: new Date().toISOString() },
    ]
    return { audit, events }
  }

  // Register New Hospital
  if (path === '/api/hospitals/register' && method === 'POST') {
    const hosps = getStored<Hospital[]>(KEY_HOSPITALS, DEFAULT_HOSPITALS)
    const newHosp: Hospital = {
      id: Date.now(),
      name: body?.name || 'Registered Trauma Facility',
      lat: body?.lat || 13.0800,
      lng: body?.lng || 80.2700,
      phone: body?.phone || '+91-44-2800-9999',
      total_beds: body?.total_beds || 80,
      available_beds: body?.available_beds || 15,
      icu_beds: body?.icu_beds || 4,
      capabilities: Array.isArray(body?.capabilities) ? body.capabilities : ['trauma', 'icu'],
      receiving: true,
      status: 'pending_verification',
      last_admission_at: null,
      updated_at: new Date().toISOString(),
    }
    hosps.push(newHosp)
    setStored(KEY_HOSPITALS, hosps)
    return { ok: true, hospital: newHosp, message: 'Registration submitted. Awaiting admin approval.' }
  }

  // Verify / Reject Hospital
  if (path.match(/\/api\/hospitals\/\d+\/(verify|reject)/)) {
    const parts = path.split('/')
    const hid = Number(parts[3])
    const act = parts[4]
    const hosps = getStored<Hospital[]>(KEY_HOSPITALS, DEFAULT_HOSPITALS)
    const target = hosps.find(h => h.id === hid)
    if (target) {
      target.status = act === 'verify' ? 'verified' : 'rejected'
      target.receiving = act === 'verify'
      target.updated_at = new Date().toISOString()
      setStored(KEY_HOSPITALS, hosps)
      return target
    }
  }

  // Update hospital beds or receiving status
  if (path.startsWith('/api/hospitals/') && method === 'PATCH') {
    const hid = Number(path.split('/')[3])
    const hosps = getStored<Hospital[]>(KEY_HOSPITALS, DEFAULT_HOSPITALS)
    const match = hosps.find(h => h.id === hid)
    if (match) {
      if (body?.available_beds !== undefined) match.available_beds = Number(body.available_beds)
      if (body?.icu_beds !== undefined) match.icu_beds = Number(body.icu_beds)
      if (body?.receiving !== undefined) match.receiving = Boolean(body.receiving)
      match.updated_at = new Date().toISOString()
      setStored(KEY_HOSPITALS, hosps)
      return match
    }
  }

  // Update ambulance status
  if (path.startsWith('/api/ambulances/') && method === 'PATCH') {
    const aid = Number(path.split('/')[3])
    const ambs = getStored<Ambulance[]>(KEY_AMBULANCES, DEFAULT_AMBULANCES)
    const match = ambs.find(a => a.id === aid)
    if (match) {
      if (body?.status) match.status = body.status
      setStored(KEY_AMBULANCES, ambs)
      return match
    }
  }

  // Assignments actions (verify-and-respond, respond, assessment, etc.)
  if (path.startsWith('/api/assignments/')) {
    const incs = getMockIncidents()
    const parts = path.split('/')
    const asgId = Number(parts[3])
    const action = parts[4]

    for (const inc of incs) {
      const asg = inc.assignments.find(a => a.id === asgId)
      if (asg) {
        if (action === 'verify-and-respond') {
          if (!body?.verified) {
            asg.status = 'declined'
            inc.status = 'rejected'
          } else {
            asg.status = 'en_route'
            inc.status = 'en_route'
            inc.required_ambulances = body?.ambulances_needed || 1
            inc.police_notified = true
            inc.green_corridor = true
          }
        } else if (action === 'respond') {
          if (body?.accept) {
            asg.status = 'en_route'
            inc.status = 'en_route'
          } else {
            asg.status = 'declined'
          }
        } else if (action === 'assessment') {
          inc.assessment = {
            severity: body?.severity || 'moderate',
            patients: body?.patients || 1,
            needs: body?.needs || ['trauma'],
            notes: body?.notes || '',
          }
          inc.status = 'assessed'
        } else if (action === 'start-hospital-route') {
          asg.status = 'transporting'
          inc.status = 'transporting'
        } else if (action === 'arrive-hospital') {
          asg.status = 'at_hospital'
          inc.status = 'at_hospital'
        } else if (action === 'complete') {
          asg.status = 'completed'
          inc.status = 'completed'
        }
        setStored(KEY_INCIDENTS, incs)
        return inc
      }
    }
  }

  // Incident actions (verify, status, accept, reject, police-corridor)
  if (path.startsWith('/api/incidents/')) {
    const incs = getMockIncidents()
    const parts = path.split('/')
    const incId = Number(parts[3])
    const action = parts[4]
    const inc = incs.find(i => i.id === incId)
    if (inc) {
      if (action === 'police-corridor') {
        inc.green_corridor = !inc.green_corridor
      } else if (action === 'verify') {
        inc.status = 'dispatching'
        inc.verified_by = 'Chief Dispatcher'
      } else if (action === 'dispatch') {
        inc.status = 'dispatching'
      } else if (action === 'select-hospital') {
        inc.selected_hospital_id = body?.hospital_id || inc.selected_hospital_id
      }
      setStored(KEY_INCIDENTS, incs)
      return inc
    }
  }

  // Reset demo
  if (path === '/api/settings/reset' || path === '/api/reset' || path === '/api/demo/reset') {
    localStorage.removeItem(KEY_INCIDENTS)
    localStorage.removeItem(KEY_AMBULANCES)
    localStorage.removeItem(KEY_HOSPITALS)
    return { ok: true, message: 'Prototype demo operational state restored.' }
  }

  // Default success response
  return { ok: true }
}

