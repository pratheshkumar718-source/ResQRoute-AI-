import { Siren, Truck, Building2, Clock, Camera, ShieldAlert, Radio, ArrowRight } from 'lucide-react'
import { useApp } from '../lib/store'
import { Card, Stat, Badge, Empty, Spinner, SystemNote } from '../components/ui'
import MapView from '../components/MapView'
import { routesFor } from '../components/RouteHelpers'
import { CLOSED, fmtDT } from '../lib/api'

export default function Overview({ go }: { go: (p: string) => void }) {
  const { incidents, ambulances, hospitals, cameras, loading, selectedId, setSelectedId } = useApp()
  if (loading && !incidents.length) return <Spinner />

  const open = incidents.filter(i => !CLOSED.includes(i.status))
  const suspected = incidents.filter(i => i.status === 'suspected')
  const availableAmbs = ambulances.filter(a => a.status === 'available')
  const receivingHosps = hospitals.filter(h => h.receiving && h.status !== 'pending_verification')
  const focus = incidents.find(i => i.id === selectedId) ?? open[0] ?? null

  const totalFreeBeds = hospitals.reduce((acc, h) => acc + (h.available_beds || 0), 0)
  const totalFreeIcu = hospitals.reduce((acc, h) => acc + (h.icu_beds || 0), 0)

  return (
    <div className="space-y-6 text-slate-100">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#0b1739]/90 border border-white/10 shadow-xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-white tracking-tight">Central Operations Command</h1>
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              SYNCHRONIZED RADAR
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time cross-stakeholder oversight: AI surveillance cameras, ambulance units, police corridors, and hospital emergency trauma bays.
          </p>
        </div>

        {suspected.length > 0 && (
          <button
            onClick={() => go('incidents')}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 flex items-center gap-2 transition animate-pulse cursor-pointer"
          >
            <Clock className="w-4 h-4 text-amber-400" />
            <span>{suspected.length} Incident(s) Awaiting Dispatcher Verification</span>
          </button>
        )}
      </div>

      {/* Primary KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat
          label="Active Emergencies"
          value={open.length}
          color="bg-red-600"
          icon={<Siren className="w-5 h-5" />}
        />
        <Stat
          label="Awaiting Verification"
          value={suspected.length}
          color="bg-amber-500"
          icon={<Clock className="w-5 h-5" />}
        />
        <Stat
          label="Available Fleet Units"
          value={`${availableAmbs.length}/${ambulances.length}`}
          color="bg-emerald-600"
          icon={<Truck className="w-5 h-5" />}
        />
        <Stat
          label="Free Trauma Beds (ICU)"
          value={`${totalFreeBeds} (${totalFreeIcu})`}
          color="bg-blue-600"
          icon={<Building2 className="w-5 h-5" />}
        />
      </div>

      {/* Main Grid: Map & Live Incident Queue */}
      <div className="grid lg:grid-cols-5 gap-5">
        <Card
          className="lg:col-span-3"
          title="Live Emergency Map Radar"
          right={
            <button
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
              onClick={() => go('map')}
            >
              <span>Full Screen Map</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          }
        >
          <div className="rounded-xl overflow-hidden border border-white/10">
            <MapView
              ambulances={ambulances}
              hospitals={hospitals}
              incidents={incidents}
              focusIncident={focus}
              routes={routesFor(focus)}
              height={400}
              onSelectIncident={setSelectedId}
            />
          </div>
        </Card>

        <Card
          className="lg:col-span-2"
          title="Incident Activity Stream"
          right={
            <button
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
              onClick={() => go('incidents')}
            >
              <span>Manage All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          }
        >
          {!incidents.length ? (
            <Empty
              text="No incidents logged"
              hint="Go to AI Surveillance → Start Local Cam and enable AI Monitoring to test PyTorch model detection."
            />
          ) : (
            <ul className="divide-y divide-white/10 max-h-[400px] overflow-y-auto pr-1">
              {incidents.slice(0, 8).map(i => (
                <li
                  key={i.id}
                  className="py-3 px-2 flex items-center justify-between gap-3 cursor-pointer hover:bg-white/[0.04] rounded-xl transition"
                  onClick={() => {
                    setSelectedId(i.id)
                    go('incidents')
                  }}
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-white truncate">
                      #{i.id} · {i.location_name}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">{fmtDT(i.created_at)}</div>
                  </div>
                  <Badge s={i.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Multi-Persona Cross-Fleet Overview Card for Admin */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Ambulance Fleet Quick Matrix */}
        <Card
          title="Ambulance Fleet Status"
          right={
            <button
              onClick={() => go('ambulances')}
              className="text-xs text-cyan-400 hover:underline cursor-pointer"
            >
              Manage Units
            </button>
          }
        >
          <div className="space-y-2">
            {ambulances.slice(0, 5).map(a => (
              <div
                key={a.id}
                className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-white/5 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      a.status === 'available'
                        ? 'bg-emerald-400 animate-pulse'
                        : a.status === 'busy'
                        ? 'bg-rose-400'
                        : 'bg-slate-500'
                    }`}
                  />
                  <b className="text-white font-mono">{a.code}</b>
                  <span className="text-slate-400 truncate max-w-[120px]">{a.driver_name}</span>
                </div>
                <Badge s={a.status} />
              </div>
            ))}
          </div>
        </Card>

        {/* Hospital Free Bed Matrix */}
        <Card
          title="Hospital Readiness Matrix"
          right={
            <button
              onClick={() => go('hospitals')}
              className="text-xs text-cyan-400 hover:underline cursor-pointer"
            >
              All Facilities
            </button>
          }
        >
          <div className="space-y-2">
            {hospitals.slice(0, 5).map(h => (
              <div
                key={h.id}
                className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-white/5 text-xs"
              >
                <div className="min-w-0 pr-2">
                  <div className="text-white font-semibold truncate">{h.name}</div>
                  <div className="text-[11px] text-slate-400">
                    Free Beds: <b className="text-emerald-400">{h.available_beds}</b> · ICU: <b>{h.icu_beds}</b>
                  </div>
                </div>
                <Badge s={h.receiving ? 'receiving' : 'diverted'} />
              </div>
            ))}
          </div>
        </Card>

        {/* Camera Surveillance Feeds Matrix */}
        <Card
          title="AI Traffic Surveillance"
          right={
            <button
              onClick={() => go('camera')}
              className="text-xs text-cyan-400 hover:underline cursor-pointer"
            >
              Launch Feeds
            </button>
          }
        >
          <div className="space-y-2">
            {cameras.slice(0, 4).map(c => (
              <div
                key={c.id}
                className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-white/5 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Camera className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="text-white font-medium truncate">{c.name}</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  ONLINE
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <SystemNote />
    </div>
  )
}
