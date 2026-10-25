import { useEffect, useState } from 'react'
import { useApp } from '../lib/store'
import { Card, Badge, Empty, SystemNote } from '../components/ui'
import { api, activeAssignment, CLOSED, fmtTime } from '../lib/api'

const STEPS = ['offered', 'en_route', 'on_scene', 'assessed', 'transporting', 'at_hospital', 'completed']

export default function Tracking() {
  const { incidents, tracking, hospitals, selectedId, setSelectedId } = useApp()
  const [events, setEvents] = useState<any[]>([])
  const open = incidents.filter(i => !CLOSED.includes(i.status) && i.assignments.length)
  const sel = open.find(i => i.id === selectedId) ?? open[0]

  useEffect(() => {
    if (sel) api.get(`/api/incidents/${sel.id}/tracking`).then(setEvents).catch(() => {})
  }, [sel?.id, sel?.status])

  return (
    <div className="space-y-6 text-slate-100">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Response & Multi-Agency Tracking</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Audited chronological timeline of roadside telemetry, ambulance transit, and hospital handover milestones.
        </p>
      </div>

      {!open.length ? (
        <Card>
          <Empty
            text="No active emergency responses"
            hint="Confirm or trigger a suspected incident to observe the real-time tracking pipeline."
          />
        </Card>
      ) : (
        <div className="grid lg:grid-cols-3 gap-5">
          <Card title={`Active Incident Queue (${open.length})`}>
            <ul className="space-y-2.5 max-h-[70vh] overflow-y-auto pr-1">
              {open.map(i => {
                const a = activeAssignment(i)
                const active = sel?.id === i.id
                return (
                  <li
                    key={i.id}
                    onClick={() => setSelectedId(i.id)}
                    className={`p-3.5 rounded-xl border transition cursor-pointer ${
                      active
                        ? 'border-cyan-500 bg-cyan-500/10 text-white shadow-lg'
                        : 'border-white/10 bg-slate-900/60 hover:bg-white/5 text-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <b className="font-semibold text-white">Incident #{i.id}</b>
                      <Badge s={i.status} />
                    </div>
                    <div className="text-xs text-slate-400">{i.location_name}</div>
                    {a && (
                      <div className="text-xs text-cyan-300 mt-2 font-mono flex items-center justify-between">
                        <span>{a.ambulance_code}</span>
                        <span>ETA: {Number(tracking[i.id]?.remaining_eta ?? a.remaining_eta ?? 0).toFixed(1)} min</span>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </Card>

          {sel && (
            <Card className="lg:col-span-2" title={`Incident #${sel.id} Operational Progression`}>
              {/* Stepper Pills */}
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-white/5 mb-4">
                <ol className="flex flex-wrap gap-2">
                  {STEPS.map(s => {
                    const idx = STEPS.indexOf(s)
                    const cur = STEPS.indexOf(sel.status === 'dispatching' ? 'offered' : sel.status)
                    const isDone = idx < cur
                    const isCurrent = idx === cur
                    return (
                      <li
                        key={s}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition ${
                          isDone
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : isCurrent
                            ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-cyan-500/20'
                            : 'bg-white/[0.02] text-slate-500 border border-white/5'
                        }`}
                      >
                        {s.replace(/_/g, ' ')}
                      </li>
                    )
                  })}
                </ol>
              </div>

              {sel.selected_hospital_id && (
                <div className="p-3 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-slate-300 mb-4 flex justify-between items-center">
                  <span>Destination Medical Facility:</span>
                  <b className="text-emerald-400 text-sm">
                    {hospitals.find(h => h.id === sel.selected_hospital_id)?.name}
                  </b>
                </div>
              )}

              <h4 className="font-semibold text-sm text-white mb-2">Audited Milestone Timeline</h4>
              <ul className="text-xs space-y-2 max-h-72 overflow-y-auto pr-1">
                {events
                  .filter(e => e.event !== 'position')
                  .slice()
                  .reverse()
                  .map(e => (
                    <li
                      key={e.id}
                      className="p-2.5 rounded-lg bg-slate-900/60 border border-white/5 flex gap-3 text-slate-300"
                    >
                      <span className="font-mono text-cyan-400 w-20 shrink-0 font-bold">{fmtTime(e.ts)}</span>
                      <span className="flex-1">{e.message}</span>
                    </li>
                  ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      <SystemNote />
    </div>
  )
}
