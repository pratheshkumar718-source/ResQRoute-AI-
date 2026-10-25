import { useEffect, useState } from 'react'
import { Volume2, VolumeX, BellRing, BellOff, ShieldCheck, Activity, RefreshCw } from 'lucide-react'
import { useApp } from '../lib/store'
import { Card, Btn, Alert, useAct } from '../components/ui'
import { api } from '../lib/api'
import { sound } from '../lib/audio'

export default function SettingsPage() {
  const { user, connected } = useApp()
  const act = useAct()
  const [health, setHealth] = useState<any>(null)
  const [muted, setMuted] = useState(sound.isMuted)
  const [ringing, setRinging] = useState(false)

  useEffect(() => {
    api.get('/api/health').then(setHealth).catch(() => setHealth(null))
  }, [])

  const mode = localStorage.getItem('resq_map_mode') || 'auto'
  const setMode = (m: string) => {
    localStorage.setItem('resq_map_mode', m)
    window.location.reload()
  }

  const handleToggleMute = () => {
    const isMuted = sound.toggleMute()
    setMuted(isMuted)
    if (isMuted) setRinging(false)
  }

  const handleTestRing = () => {
    if (ringing) {
      sound.stopIncomingCallRing()
      setRinging(false)
    } else {
      sound.startIncomingCallRing()
      setRinging(true)
    }
  }

  return (
    <div className="space-y-5 max-w-4xl text-slate-100">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">System Settings & Audio Telemetry</h1>
        <p className="text-xs text-slate-400 mt-1">
          Configure real-time audio sirens, map projection engines, network diagnostics, and view authenticated stakeholder identities.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <Card title="Operational Node Diagnostics">
          <ul className="text-sm space-y-2.5">
            <li className="flex justify-between items-center py-1 border-b border-white/5">
              <span className="text-slate-400 text-xs">Core REST Backend</span>
              <b className={`font-mono text-xs ${health ? 'text-emerald-400' : 'text-rose-400'}`}>
                {health ? 'ONLINE (127.0.0.1:8000)' : 'UNREACHABLE'}
              </b>
            </li>
            <li className="flex justify-between items-center py-1 border-b border-white/5">
              <span className="text-slate-400 text-xs">WebSocket Telemetry Link</span>
              <b className={`font-mono text-xs ${connected ? 'text-emerald-400' : 'text-amber-400'}`}>
                {connected ? 'CONNECTED (1000ms heartbeat)' : 'RECONNECTING…'}
              </b>
            </li>
            <li className="flex justify-between items-center py-1 border-b border-white/5">
              <span className="text-slate-400 text-xs">External API Dependencies</span>
              <b className="text-white font-mono text-xs">NONE (100% Offline Capable)</b>
            </li>
            <li className="flex justify-between items-center py-1">
              <span className="text-slate-400 text-xs">Authenticated Persona</span>
              <b className="text-cyan-400 text-xs truncate max-w-[180px]">
                {user?.name} ({user?.role?.toUpperCase()})
              </b>
            </li>
          </ul>
        </Card>

        <Card title="Emergency Audio Siren & Phone Synthesizer">
          <p className="text-xs text-slate-400 mb-3 leading-relaxed">
            ResQRoute uses the Web Audio API to synthesize dual-tone 440Hz/480Hz emergency dispatch rings and high-priority sirens directly in the browser with zero external audio assets.
          </p>
          <div className="flex flex-wrap gap-2.5">
            <Btn v={muted ? 'ghost' : 'cyan'} onClick={handleToggleMute}>
              {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
              <span>{muted ? 'Audio Muted' : 'Audio Active'}</span>
            </Btn>
            <Btn v={ringing ? 'danger' : 'ghost'} onClick={handleTestRing} disabled={muted}>
              {ringing ? <BellOff className="w-4 h-4 animate-spin" /> : <BellRing className="w-4 h-4 text-amber-400" />}
              <span>{ringing ? 'Stop Ringing' : 'Test Dual-Tone Ring'}</span>
            </Btn>
            <Btn v="ghost" onClick={() => sound.playAlertChime()} disabled={muted}>
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>Test Chime</span>
            </Btn>
          </div>
        </Card>
      </div>

      <Card title="Tactical Map Rendering Mode">
        <p className="text-xs text-slate-400 mb-3 leading-relaxed">
          The hybrid mapping engine automatically uses OpenStreetMap vector tiles when network access is active and gracefully transitions to high-performance local Cartesian SVG topology when offline.
        </p>
        <div className="flex flex-wrap gap-2.5">
          <Btn v={mode === 'auto' ? 'primary' : 'ghost'} onClick={() => setMode('auto')}>
            Hybrid Auto (OSM Tiles → Offline SVG Fallback)
          </Btn>
          <Btn v={mode === 'offline' ? 'primary' : 'ghost'} onClick={() => setMode('offline')}>
            Direct Cartesian Grid (Offline SVG)
          </Btn>
        </div>
      </Card>

      <Card title="Authorized Stakeholder Portals & Presets">
        <div className="overflow-x-auto">
          <table className="text-sm w-full">
            <thead>
              <tr className="text-left text-xs text-slate-400 border-b border-white/10 pb-2">
                <th className="py-2">Stakeholder Role</th>
                <th>Access Scope & Capabilities</th>
                <th>Authentication Preset</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <tr>
                <td className="py-2.5 font-medium text-white">Chief Dispatch Controller</td>
                <td className="text-xs text-slate-400">Total citywide oversight, driver reassignments, hospital approvals</td>
                <td><code className="bg-cyan-950/60 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/20 font-mono text-xs">admin / admin123</code></td>
              </tr>
              <tr>
                <td className="py-2.5 font-medium text-white">Traffic Police Division</td>
                <td className="text-xs text-slate-400">Incident confirmation, green-corridor priority, road clearance</td>
                <td><code className="bg-blue-950/60 text-blue-300 px-2 py-0.5 rounded border border-blue-500/20 font-mono text-xs">police1 / police123</code></td>
              </tr>
              <tr>
                <td className="py-2.5 font-medium text-white">Citizen / Public Portal</td>
                <td className="text-xs text-slate-400">One-click SOS reporting, public hospital bed availability lookup</td>
                <td><code className="bg-purple-950/60 text-purple-300 px-2 py-0.5 rounded border border-purple-500/20 font-mono text-xs">citizen1 / citizen123</code></td>
              </tr>
              <tr>
                <td className="py-2.5 font-medium text-white">Ambulance Paramedic Units</td>
                <td className="text-xs text-slate-400">Isolated driver cockpit, 60s offer response, duty toggle (AMB-01..05)</td>
                <td><code className="bg-amber-950/60 text-amber-300 px-2 py-0.5 rounded border border-amber-500/20 font-mono text-xs">driver1..5 / driver123</code></td>
              </tr>
              <tr>
                <td className="py-2.5 font-medium text-white">Hospital Trauma Units</td>
                <td className="text-xs text-slate-400">Isolated facility dashboard, bed/ICU management, hotline desk</td>
                <td><code className="bg-emerald-950/60 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/20 font-mono text-xs">hospital1..3 / hospital123</code></td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {user?.role === 'admin' && (
        <Card title="Simulation State & Cache Controller">
          <p className="text-xs text-slate-400 mb-3">
            Reset active incidents, route assignments, evidence frames, and restore ambulance positions to default city depots.
          </p>
          <Btn
            v="danger"
            onClick={() =>
              confirm('Reset all operational records (incidents, burst evidence, dispatch allocations)?') &&
              act(() => api.post('/api/demo/reset'), 'Operational state reset to baseline')
            }
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reset Simulation State to Baseline</span>
          </Btn>
        </Card>
      )}

      <Alert kind="info">
        <span className="font-semibold text-white">System Architecture Notice:</span> Ambulance GPS telemetry, routing paths, Dijkstra ETAs, bed capacities, and emergency contact numbers are generated dynamically within this operational network. Optical accident heuristics require human dispatcher confirmation before sirens sound.
      </Alert>
    </div>
  )
}
