import { useApp } from '../lib/store'
import { Card, Badge, Empty, SystemNote } from '../components/ui'
import MapView from '../components/MapView'
import { routesFor } from '../components/RouteHelpers'
import { activeAssignment, CLOSED, api } from '../lib/api'

export default function LiveMap() {
  const { incidents, ambulances, hospitals, selectedId, setSelectedId, tracking, user } = useApp()
  let list = incidents.filter(i => !CLOSED.includes(i.status))
  if (user?.role === 'driver') {
    list = list.filter(i =>
      i.assignments.some(
        a =>
          a.ambulance_id === user.ambulance_id &&
          ['offered', 'en_route', 'on_scene', 'transporting', 'at_hospital'].includes(a.status)
      )
    )
  }
  const sel = list.find(i => i.id === selectedId) ?? list[0] ?? null
  const a = activeAssignment(sel)
  const route = a && (['offered', 'en_route'].includes(a.status) ? a.scene_route : a.hospital_route)
  const eta = sel ? tracking[sel.id]?.remaining_eta ?? a?.remaining_eta : null

  return (
    <div className="space-y-6 text-slate-100">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Live Telemetry & Navigation Map</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Real-time tracking of ambulance locations, incident coordinates, and receiving trauma hospitals on local road network.
        </p>
      </div>

      <div className="grid xl:grid-cols-4 gap-5">
        <div className="xl:col-span-3 rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
          <MapView
            ambulances={ambulances}
            hospitals={hospitals}
            incidents={incidents}
            focusIncident={sel}
            routes={routesFor(sel)}
            height={560}
            onSelectIncident={setSelectedId}
          />
        </div>

        <div className="space-y-4">
          <Card title="Active Incident Telemetry">
            {!list.length ? (
              <Empty text="No active emergencies" hint="Incidents will appear on the map in real time once detected." />
            ) : (
              <div className="space-y-3.5">
                <select
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-medium"
                  value={sel?.id}
                  onChange={e => setSelectedId(+e.target.value)}
                >
                  {list.map(i => (
                    <option key={i.id} value={i.id}>
                      #{i.id} — {i.location_name} ({i.status.replace(/_/g, ' ')})
                    </option>
                  ))}
                </select>

                {sel && (
                  <div className="text-sm space-y-3 text-slate-200">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400">Response Phase</span>
                      <Badge s={sel.status} />
                    </div>

                    {/* Police Traffic & Green Corridor Panel */}
                    <div className={`p-3 rounded-xl border space-y-2 ${
                      sel.green_corridor
                        ? 'bg-blue-950/40 border-blue-500/40 text-blue-100 shadow-lg shadow-blue-500/10'
                        : 'bg-slate-900/80 border-white/10 text-slate-300'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold flex items-center gap-1.5">
                          <span className={`w-2.5 h-2.5 rounded-full ${sel.green_corridor ? 'bg-blue-400 animate-ping' : 'bg-slate-500'}`} />
                          <span>Green Corridor Signal Preemption</span>
                        </span>
                        {(user?.role === 'police' || user?.role === 'admin') && (
                          <button
                            type="button"
                            onClick={async () => {
                              await api.post(`/api/incidents/${sel.id}/police-corridor`)
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                              sel.green_corridor
                                ? 'bg-blue-500 hover:bg-blue-400 text-white'
                                : 'bg-white/10 hover:bg-white/20 text-slate-300 border border-white/10'
                            }`}
                          >
                            {sel.green_corridor ? 'Deactivate Corridor' : 'Activate Green Corridor'}
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-300 leading-tight">
                        {sel.green_corridor
                          ? 'Priority traffic signal preemption is ACTIVE. Police escort coordinated; intersections prioritized.'
                          : 'Standard traffic flow. Police can activate Green Corridor above.'}
                      </p>
                    </div>

                    {/* Assigned Paramedic Driver Details */}
                    {a && (
                      <div className="p-3 rounded-xl bg-slate-900/90 border border-white/10 space-y-2">
                        <div className="text-[11px] uppercase tracking-wider font-bold text-cyan-400 flex justify-between">
                          <span>Allocated Paramedic Fleet</span>
                          <span className="font-mono">{sel.required_ambulances || 1} Unit(s) Required</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400">Unit Code & Driver:</span>
                          <b className="text-white font-mono">{a.ambulance_code} · {a.driver_name}</b>
                        </div>
                        {a.driver_phone && (
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-400">Driver Contact:</span>
                            <a href={`tel:${a.driver_phone}`} className="text-cyan-300 font-mono hover:underline font-bold">
                              {a.driver_phone}
                            </a>
                          </div>
                        )}
                        {route && (
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-400">Calculated Route:</span>
                            <b className="text-white">{route.distance_km} km</b>
                          </div>
                        )}
                        {eta != null && (
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-400">Simulated Transit ETA:</span>
                            <b className="text-cyan-400 font-mono font-bold">{Number(eta).toFixed(1)} min</b>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Allocated Receiving Hospital Details */}
                    {(() => {
                      const hosp = hospitals.find(h => h.id === sel.selected_hospital_id)
                      if (!hosp) return null
                      return (
                        <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-1.5">
                          <div className="text-[11px] uppercase tracking-wider font-bold text-emerald-400">
                            Allocated Receiving Trauma Center
                          </div>
                          <div className="text-xs font-bold text-white">{hosp.name}</div>
                          <div className="text-[11px] text-slate-300 flex justify-between">
                            <span>Available Beds: <b className="text-emerald-400">{hosp.available_beds}</b> / {hosp.total_beds}</span>
                            <span>ICU: <b className="text-rose-300">{hosp.icu_beds}</b></span>
                          </div>
                          {hosp.phone && (
                            <div className="text-[11px] text-slate-400 flex justify-between pt-1 border-t border-emerald-500/20">
                              <span>Trauma Bay Desk:</span>
                              <a href={`tel:${hosp.phone}`} className="text-emerald-300 font-mono font-bold hover:underline">
                                {hosp.phone}
                              </a>
                            </div>
                          )}
                        </div>
                      )
                    })()}

                    {/* Police Legal Registration Note */}
                    <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 text-[11px] text-slate-400 space-y-1">
                      <div className="font-semibold text-slate-300">Police Division Legal Coordination</div>
                      <p>
                        Case diary incident #{sel.id} synchronized under Section 134 Motor Vehicles Act. Destination hospital and escort notified.
                      </p>
                    </div>

                    {sel.hospital_warning && (
                      <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs">
                        {sel.hospital_warning}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </Card>

          <Card title="Tactical Map Legend">
            <ul className="text-xs space-y-2 text-slate-300">
              <li className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500 pulse-red" />
                <span>Verified Collision Location</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span>Receiving Trauma Hospital (H)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-emerald-400" />
                <span>Ambulance Available (Ready)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-rose-400" />
                <span>Ambulance Busy (En Route)</span>
              </li>
              <li className="flex items-center gap-2 pt-1 border-t border-white/5">
                <span className="h-1 w-5 rounded bg-cyan-400" />
                <span>Ambulance → Incident Scene Route</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1 w-5 rounded bg-emerald-400" />
                <span>Scene → Hospital Transit Route</span>
              </li>
            </ul>
          </Card>
        </div>
      </div>

      <SystemNote />
    </div>
  )
}
