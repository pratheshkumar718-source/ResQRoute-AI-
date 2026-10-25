import { useApp } from '../lib/store'
import { Card, Badge, Btn, useAct, SystemNote } from '../components/ui'
import MapView from '../components/MapView'
import { api, ACTIVE_ASG } from '../lib/api'

export default function Ambulances() {
  const { ambulances, hospitals, incidents } = useApp()
  const act = useAct()
  const busyIds = new Set(
    incidents.flatMap(i => i.assignments).filter(a => ACTIVE_ASG.includes(a.status)).map(a => a.ambulance_id)
  )

  return (
    <div className="space-y-6 text-slate-100">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Municipal Emergency Ambulance Fleet</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Real-time fleet readiness, paramedic crew assignment, telemetry tracking, and dispatch eligibility.
        </p>
      </div>

      <Card title="Active Emergency Fleet Units">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 border-b border-white/10 text-xs uppercase tracking-wider">
                <th className="py-3 px-2">Unit Code</th>
                <th>Assigned Paramedic</th>
                <th>Emergency Contact</th>
                <th>Crew Capability</th>
                <th>Simulated Telemetry</th>
                <th>Duty Status</th>
                <th>Dispatcher Overwrite</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {ambulances.map(a => (
                <tr key={a.id} className="hover:bg-white/[0.02] transition">
                  <td className="py-3 px-2 font-mono font-bold text-cyan-300">{a.code}</td>
                  <td className="font-medium text-white">{a.driver_name}</td>
                  <td className="font-mono text-xs text-slate-400">{a.phone}</td>
                  <td>
                    <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 text-xs font-mono font-bold">
                      {a.crew_level}
                    </span>
                  </td>
                  <td className="text-xs text-slate-400 font-mono">
                    {a.lat.toFixed(4)}, {a.lng.toFixed(4)}
                  </td>
                  <td>
                    <Badge s={a.status} />
                    {busyIds.has(a.id) && (
                      <span className="text-xs text-cyan-400 font-bold ml-1.5 animate-pulse">ON SCENE</span>
                    )}
                    {a.note && <div className="text-[11px] text-slate-400 mt-0.5">{a.note}</div>}
                  </td>
                  <td className="space-x-1.5 whitespace-nowrap">
                    {(['available', 'busy', 'offline', 'maintenance'] as const)
                      .filter(s => s !== a.status)
                      .map(s => (
                        <Btn
                          key={s}
                          v="ghost"
                          disabled={busyIds.has(a.id)}
                          onClick={() =>
                            act(() => api.patch(`/api/ambulances/${a.id}`, { status: s }), `${a.code} set to ${s}`)
                          }
                          className="capitalize text-xs py-1 px-2.5"
                        >
                          {s}
                        </Btn>
                      ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="rounded-2xl overflow-hidden border border-white/10 shadow-xl">
        <MapView ambulances={ambulances} hospitals={hospitals} incidents={incidents} height={420} />
      </div>

      <SystemNote />
    </div>
  )
}
