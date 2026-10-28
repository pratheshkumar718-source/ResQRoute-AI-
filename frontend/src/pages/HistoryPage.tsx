import { useEffect, useState } from 'react'
import { useApp } from '../lib/store'
import { Card, Badge, Empty, Spinner, SystemNote } from '../components/ui'
import { api, CLOSED, fmtDT } from '../lib/api'

export default function HistoryPage() {
  const { incidents, hospitals } = useApp()
  const [h, setH] = useState<any>(null)

  useEffect(() => {
    api.get('/api/history').then(setH).catch(() => setH({ audit: [], events: [] }))
  }, [incidents.length, incidents[0]?.status])

  const done = incidents.filter(i => CLOSED.includes(i.status))

  return (
    <div className="space-y-6 text-slate-100">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Archived Incident & Audit History</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Permanent chronological log of closed emergency dispatches, dispatcher verification actions, and system telemetry.
        </p>
      </div>

      <Card title="Resolved Incident Records">
        {!done.length ? (
          <Empty
            text="No completed or resolved emergency records yet"
            hint="Once incidents complete hospital handover or are rejected as false alerts, they archive here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b border-white/10 text-xs uppercase tracking-wider">
                  <th className="py-3 px-2">Incident #</th>
                  <th>Location Landmark</th>
                  <th>Timestamp</th>
                  <th>Telemetry Source</th>
                  <th>Assigned Unit</th>
                  <th>Destination Hospital</th>
                  <th>Final Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {done.map(i => {
                  const a = i.assignments.find(x => x.status === 'completed')
                  return (
                    <tr key={i.id} className="hover:bg-white/[0.02] transition">
                      <td className="py-3 px-2 font-mono font-bold text-cyan-300">#{i.id}</td>
                      <td className="font-medium text-white">{i.location_name}</td>
                      <td className="text-xs text-slate-400">{fmtDT(i.created_at)}</td>
                      <td className="text-xs font-mono capitalize text-slate-300">{i.source}</td>
                      <td className="font-mono text-cyan-400 font-bold">{a?.ambulance_code ?? '—'}</td>
                      <td className="text-slate-300">
                        {hospitals.find(x => x.id === i.selected_hospital_id)?.name ?? '—'}
                      </td>
                      <td>
                        <Badge s={i.status} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="System Audit Log (Latest Activity)">
        {!h ? (
          <Spinner label="Loading audit trails..." />
        ) : !h?.audit?.length ? (
          <Empty text="No audit entries logged" />
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-400 border-b border-white/10 uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-2">Timestamp</th>
                  <th>Authorized Actor</th>
                  <th>Action Triggered</th>
                  <th>Target Entity</th>
                  <th>Operational Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {(h.audit || []).map((l: any) => (
                  <tr key={l.id} className="hover:bg-white/[0.02] transition">
                    <td className="py-2.5 px-2 text-slate-400 whitespace-nowrap">{fmtDT(l.ts)}</td>
                    <td className="text-cyan-400 font-bold">{l.actor}</td>
                    <td className="text-slate-200 capitalize">{String(l.action || '').replace(/_/g, ' ')}</td>
                    <td className="text-amber-300">
                      {l.entity} {l.entity_id ?? ''}
                    </td>
                    <td className="text-slate-400 max-w-md truncate" title={l.detail}>
                      {l.detail}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <SystemNote />
    </div>
  )
}
