import { useEffect, useMemo, useRef, useState, ReactNode } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Plus, Minus, Crosshair, Maximize, WifiOff, Globe } from 'lucide-react'
import { api, Ambulance, Hospital, Incident } from '../lib/api'
import { Badge } from './ui'

export interface RouteLine { coords: [number, number][]; color: string; label: string; dashed?: boolean }
interface Props {
  ambulances: Ambulance[]; hospitals: Hospital[]; incidents: Incident[]; routes?: RouteLine[]
  focusIncident?: Incident | null; height?: number | string; onSelectIncident?: (id: number) => void
}
const CENTER: [number, number] = [13.085, 80.26]
const AMB_COLOR: Record<string, string> = { available: '#16a34a', busy: '#2563eb', offline: '#6b7280', maintenance: '#ca8a04' }
const OPEN = ['suspected', 'confirmed', 'dispatching', 'en_route', 'on_scene', 'assessed', 'transporting', 'at_hospital', 'no_ambulance']

const incIcon = L.divIcon({ className: '', iconSize: [28, 28], iconAnchor: [14, 14], html: '<div class="pulse-red" style="width:28px;height:28px;border-radius:50%;background:#dc2626;border:3px solid #fff;color:#fff;font-weight:800;display:grid;place-items:center;font-size:14px">!</div>' })
const ambIcon = (c: string, code: string) => L.divIcon({ className: '', iconSize: [34, 34], iconAnchor: [17, 17], html: `<div style="width:34px;height:34px;border-radius:8px;background:${c};border:2px solid #fff;color:#fff;font-size:9px;font-weight:700;display:grid;place-items:center;box-shadow:0 1px 4px rgba(0,0,0,.4)" title="${code}">🚑<br/>${code.replace('AMB-', '')}</div>` })
const hospIcon = L.divIcon({ className: '', iconSize: [30, 30], iconAnchor: [15, 15], html: '<div style="width:30px;height:30px;border-radius:6px;background:#1d4ed8;border:2px solid #fff;color:#fff;font-weight:800;display:grid;place-items:center;box-shadow:0 1px 4px rgba(0,0,0,.4)">H</div>' })

const AmbInfo = ({ a }: { a: Ambulance }) => <div className="text-sm space-y-1"><b>{a.code}</b> <Badge s={a.status} /><div>Driver: {a.driver_name} · {a.crew_level}</div><div>{a.phone}</div><div className="text-xs text-slate-500">Simulated GPS: {a.lat.toFixed(4)}, {a.lng.toFixed(4)}</div></div>
const HospInfo = ({ h }: { h: Hospital }) => <div className="text-sm space-y-1"><b>{h.name}</b> <Badge s={h.receiving ? 'receiving' : 'diverted'}>{h.receiving ? 'receiving' : 'not receiving'}</Badge><div>Beds: {h.available_beds}/{h.total_beds} · ICU {h.icu_beds}</div><div>{h.capabilities.join(', ')}</div><div className="text-xs text-slate-500">Fictional demo data</div></div>
const IncInfo = ({ i }: { i: Incident }) => <div className="text-sm space-y-1"><b>Incident #{i.id}</b> <Badge s={i.status} /><div>{i.location_name}</div><div>Detection confidence: {i.confidence != null ? Math.round(i.confidence * 100) + '%' : 'n/a (test/manual)'}</div></div>

function Controls({ fitIncident, fitAll }: { fitIncident: () => void; fitAll: () => void }) {
  const map = useMap()
  const b = 'w-8 h-8 grid place-items-center bg-white hover:bg-slate-100 border-b border-slate-200 text-slate-700'
  return (
    <div className="absolute top-3 left-3 z-[1000] rounded-lg overflow-hidden shadow border border-slate-300" onMouseDown={e => e.stopPropagation()} onDoubleClick={e => e.stopPropagation()}>
      <button className={b} title="Zoom in" onClick={() => map.zoomIn()}><Plus className="w-4 h-4" /></button>
      <button className={b} title="Zoom out" onClick={() => map.zoomOut()}><Minus className="w-4 h-4" /></button>
      <button className={b} title="Fit to incident" onClick={fitIncident}><Crosshair className="w-4 h-4" /></button>
      <button className={b.replace('border-b', '')} title="Fit all markers" onClick={fitAll}><Maximize className="w-4 h-4" /></button>
    </div>
  )
}
function Fitter({ pts, token }: { pts: [number, number][]; token: number }) {
  const map = useMap()
  useEffect(() => { if (pts.length) map.fitBounds(L.latLngBounds(pts as any).pad(0.3), { maxZoom: 15, animate: true }) }, [token]) // eslint-disable-line
  return null
}

export default function MapView(p: Props) {
  const [mode, setMode] = useState<'checking' | 'osm' | 'svg'>('checking')
  const pref = localStorage.getItem('resq_map_mode') || 'auto'
  const loaded = useRef(0), errors = useRef(0)
  useEffect(() => {
    if (pref === 'offline') return setMode('svg')
    let done = false
    const img = new Image()
    const to = setTimeout(() => { if (!done) { done = true; setMode('svg') } }, 4000)
    img.onload = () => { if (!done) { done = true; clearTimeout(to); setMode('osm') } }
    img.onerror = () => { if (!done) { done = true; clearTimeout(to); setMode('svg') } }
    img.src = 'https://tile.openstreetmap.org/0/0/0.png?_=' + Date.now()
    return () => clearTimeout(to)
  }, [pref])

  const open = p.incidents.filter(i => OPEN.includes(i.status))
  const focus = p.focusIncident ?? open[0] ?? null
  const allPts = useMemo(() => [...p.ambulances, ...p.hospitals, ...open].map(x => [x.lat, x.lng] as [number, number]), [p.ambulances, p.hospitals, p.incidents])
  const incPts = useMemo<[number, number][]>(() => {
    const r = (p.routes ?? []).flatMap(r => r.coords)
    return focus ? [[focus.lat, focus.lng], ...r] : allPts
  }, [focus?.id, p.routes])
  const [fitToken, setFitToken] = useState(0)
  const [fitPts, setFitPts] = useState<[number, number][]>([])
  const doFit = (pts: [number, number][]) => { setFitPts(pts); setFitToken(t => t + 1) }
  const firstFit = useRef(false)
  useEffect(() => { if (mode === 'osm' && !firstFit.current && allPts.length) { firstFit.current = true; doFit(allPts) } }, [mode, allPts.length])
  const lastFocus = useRef<number | null>(null)
  useEffect(() => { if (mode === 'osm' && focus && lastFocus.current !== focus.id) { lastFocus.current = focus.id; if (firstFit.current) doFit(incPts) } }, [focus?.id, mode]) // eslint-disable-line

  const swap = (m: 'auto' | 'offline') => { localStorage.setItem('resq_map_mode', m); window.location.reload() }
  const banner: ReactNode = (
    <div className="absolute bottom-2 left-2 z-[1000] flex gap-2 items-center text-[11px]">
      <span className="bg-white/90 rounded px-2 py-1 shadow text-slate-600">{mode === 'svg' ? 'Offline SVG demo map (simulated roads)' : 'OpenStreetMap © contributors'} · routes are SIMULATED estimates</span>
      <button className="bg-white/90 rounded px-2 py-1 shadow text-slate-700 flex items-center gap-1" onClick={() => swap(mode === 'svg' ? 'auto' : 'offline')}>{mode === 'svg' ? <><Globe className="w-3 h-3" />Try OSM</> : <><WifiOff className="w-3 h-3" />Offline map</>}</button>
    </div>
  )
  const style = { height: p.height ?? 460 }
  if (mode === 'checking') return <div style={style} className="rounded-xl bg-slate-200 grid place-items-center text-slate-500">Loading map…</div>
  if (mode === 'svg') return <div style={style} className="relative rounded-xl overflow-hidden border border-slate-300"><SvgMap {...p} focus={focus} open={open} allPts={allPts} incPts={incPts} />{banner}</div>

  return (
    <div style={style} className="relative rounded-xl overflow-hidden border border-slate-300">
      <MapContainer center={CENTER} zoom={12} zoomControl={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          eventHandlers={{ tileload: () => { loaded.current++ }, tileerror: () => { errors.current++; if (errors.current > 6 && loaded.current === 0) setMode('svg') } }} />
        <Fitter pts={fitPts} token={fitToken} />
        <Controls fitIncident={() => doFit(incPts)} fitAll={() => doFit(allPts)} />
        {(p.routes ?? []).map((r, k) => (
          <Polyline key={k} positions={r.coords} pathOptions={{ color: r.color, weight: 5, opacity: 0.85, dashArray: r.dashed ? '8 8' : undefined }}>
            <Popup>{r.label}</Popup>
          </Polyline>
        ))}
        {p.hospitals.map(h => <Marker key={'h' + h.id} position={[h.lat, h.lng]} icon={hospIcon}><Popup><HospInfo h={h} /></Popup></Marker>)}
        {open.map(i => <Marker key={'i' + i.id} position={[i.lat, i.lng]} icon={incIcon} eventHandlers={{ click: () => p.onSelectIncident?.(i.id) }}><Popup><IncInfo i={i} /></Popup></Marker>)}
        {p.ambulances.map(a => <Marker key={'a' + a.id} position={[a.lat, a.lng]} icon={ambIcon(AMB_COLOR[a.status] ?? '#6b7280', a.code)}><Popup><AmbInfo a={a} /></Popup></Marker>)}
      </MapContainer>
      {banner}
    </div>
  )
}

/* ---------- Offline SVG fallback map ---------- */
function SvgMap({ ambulances, hospitals, routes = [], focus, open, allPts, incPts, onSelectIncident }: Props & { focus: Incident | null; open: Incident[]; allPts: [number, number][]; incPts: [number, number][] }) {
  const [net, setNet] = useState<any>(null)
  useEffect(() => { api.get('/api/network').then(setNet).catch(() => {}) }, [])
  const W = 1000
  const proj = useMemo(() => {
    if (!net) return null
    const b = net.bbox, kx = Math.cos(((b.min_lat + b.max_lat) / 2) * Math.PI / 180)
    const wdeg = (b.max_lng - b.min_lng) * kx, hdeg = b.max_lat - b.min_lat
    const sc = W / wdeg
    return { H: hdeg * sc, f: (lat: number, lng: number) => [(lng - b.min_lng) * kx * sc, (b.max_lat - lat) * sc] as [number, number] }
  }, [net])
  const [vb, setVb] = useState({ x: 0, y: 0, w: W, h: 1000 })
  const [sel, setSel] = useState<ReactNode>(null)
  useEffect(() => { if (proj) setVb({ x: 0, y: 0, w: W, h: proj.H }) }, [proj])
  const drag = useRef<{ x: number; y: number } | null>(null)
  const fit = (pts: [number, number][]) => {
    if (!proj || !pts.length) return
    const xy = pts.map(q => proj.f(q[0], q[1]))
    const xs = xy.map(q => q[0]), ys = xy.map(q => q[1])
    let w = Math.max(160, Math.max(...xs) - Math.min(...xs)) * 1.5
    const ratio = proj.H / W
    let h = w * ratio
    const cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2
    const minH = Math.max(...ys) - Math.min(...ys); if (minH * 1.5 > h) { h = minH * 1.5; w = h / ratio }
    setVb({ x: cx - w / 2, y: cy - h / 2, w, h })
  }
  const zoom = (f: number) => setVb(v => ({ x: v.x + (v.w - v.w * f) / 2, y: v.y + (v.h - v.h * f) / 2, w: v.w * f, h: v.h * f }))
  const firstFit = useRef(false)
  useEffect(() => { if (proj && !firstFit.current && allPts.length) { firstFit.current = true; fit(allPts) } }, [proj, allPts.length]) // eslint-disable-line
  useEffect(() => { if (proj && firstFit.current && focus) fit(incPts) }, [focus?.id]) // eslint-disable-line
  if (!net || !proj) return <div className="h-full grid place-items-center text-slate-500 bg-slate-100">Loading offline map…</div>
  const P = proj.f
  const btn = 'w-8 h-8 grid place-items-center bg-white hover:bg-slate-100 border-b border-slate-200 text-slate-700'
  return (
    <div className="relative h-full bg-[#eef2e6]">
      <svg className="w-full h-full touch-none cursor-grab" viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} preserveAspectRatio="xMidYMid slice"
        onWheel={e => zoom(e.deltaY > 0 ? 1.15 : 0.87)}
        onPointerDown={e => { drag.current = { x: e.clientX, y: e.clientY }; (e.target as Element).setPointerCapture?.(e.pointerId) }}
        onPointerUp={() => (drag.current = null)}
        onPointerMove={e => { if (!drag.current) return; const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect(); const dx = (e.clientX - drag.current.x) * vb.w / r.width, dy = (e.clientY - drag.current.y) * vb.h / r.height; drag.current = { x: e.clientX, y: e.clientY }; setVb(v => ({ ...v, x: v.x - dx, y: v.y - dy })) }}>
        <rect x={-500} y={-500} width={W + 1000} height={proj.H + 1000} fill="#e8eddc" />
        {net.edges.map((e: number[], k: number) => { const a = P(net.nodes[e[0]][0], net.nodes[e[0]][1]), b = P(net.nodes[e[1]][0], net.nodes[e[1]][1]); return <line key={k} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={e[2] ? '#f4b942' : '#fff'} strokeWidth={e[2] ? 5 : 3} strokeLinecap="round" /> })}
        {net.edges.map((e: number[], k: number) => { const a = P(net.nodes[e[0]][0], net.nodes[e[0]][1]), b = P(net.nodes[e[1]][0], net.nodes[e[1]][1]); return <line key={'o' + k} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#c8c8b8" strokeWidth={0.8} /> })}
        {routes.map((r, k) => <polyline key={k} fill="none" stroke={r.color} strokeWidth={7} strokeLinejoin="round" strokeDasharray={r.dashed ? '14 10' : undefined} opacity={0.9}
          points={r.coords.map(c => P(c[0], c[1]).join(',')).join(' ')} onClick={() => setSel(<div className="text-sm">{r.label}</div>)} />)}
        {hospitals.map(h => { const [x, y] = P(h.lat, h.lng); return <g key={h.id} onClick={() => setSel(<HospInfo h={h} />)} className="cursor-pointer"><rect x={x - 14} y={y - 14} width={28} height={28} rx={5} fill="#1d4ed8" stroke="#fff" strokeWidth={2} /><text x={x} y={y + 6} textAnchor="middle" fill="#fff" fontWeight={800} fontSize={18}>H</text></g> })}
        {open.map(i => { const [x, y] = P(i.lat, i.lng); return <g key={i.id} onClick={() => { setSel(<IncInfo i={i} />); onSelectIncident?.(i.id) }} className="cursor-pointer"><circle cx={x} cy={y} r={20} fill="#dc2626" opacity={0.25}><animate attributeName="r" values="14;28;14" dur="1.6s" repeatCount="indefinite" /></circle><circle cx={x} cy={y} r={13} fill="#dc2626" stroke="#fff" strokeWidth={3} /><text x={x} y={y + 6} textAnchor="middle" fill="#fff" fontWeight={800} fontSize={16}>!</text></g> })}
        {ambulances.map(a => { const [x, y] = P(a.lat, a.lng); return <g key={a.id} onClick={() => setSel(<AmbInfo a={a} />)} className="cursor-pointer"><rect x={x - 17} y={y - 13} width={34} height={26} rx={6} fill={AMB_COLOR[a.status] ?? '#6b7280'} stroke="#fff" strokeWidth={2} /><text x={x} y={y + 5} textAnchor="middle" fill="#fff" fontWeight={700} fontSize={12}>{a.code.replace('AMB-', 'A')}</text></g> })}
      </svg>
      <div className="absolute top-3 left-3 rounded-lg overflow-hidden shadow border border-slate-300">
        <button className={btn} title="Zoom in" onClick={() => zoom(0.7)}><Plus className="w-4 h-4" /></button>
        <button className={btn} title="Zoom out" onClick={() => zoom(1.4)}><Minus className="w-4 h-4" /></button>
        <button className={btn} title="Fit to incident" onClick={() => fit(incPts)}><Crosshair className="w-4 h-4" /></button>
        <button className={btn.replace('border-b', '')} title="Fit all markers" onClick={() => fit(allPts)}><Maximize className="w-4 h-4" /></button>
      </div>
      {sel && <div className="absolute top-3 right-3 bg-white rounded-lg shadow-lg p-3 max-w-[260px] border border-slate-200"><button className="float-right text-slate-400 ml-2" onClick={() => setSel(null)}>×</button>{sel}</div>}
    </div>
  )
}
