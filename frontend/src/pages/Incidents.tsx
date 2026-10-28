import { useEffect, useState } from 'react'
import { Check, X, AlertOctagon, RefreshCw } from 'lucide-react'
import { useApp } from '../lib/store'
import { Card, Badge, Btn, Empty, Alert, useAct, DemoNote } from '../components/ui'
import { api, activeAssignment, fmtDT, fmtTime, Incident } from '../lib/api'

const pct = (c: number | null) => (c == null ? 'n/a (test / manual trigger)' : Math.round(c * 100) + '%')

function HospitalPanel({ inc }: { inc: Incident }) {
  const act = useAct(); const { hospitals } = useApp()
  const [recs, setRecs] = useState<any>(null)
  useEffect(() => { api.get(`/api/incidents/${inc.id}/hospital-recommendations`).then(setRecs).catch(() => setRecs(null)) }, [inc.id, inc.status, inc.selected_hospital_id, hospitals])
  if (!recs || !Array.isArray(recs.candidates)) return null
  const noneEligible = !recs.candidates.some((c: any) => c.eligible)
  return (
    <Card title="Hospital Recommendation & Clinical Bed Match">
      <p className="text-xs text-slate-400 mb-2">Care Needs: {(recs.needs || []).join(', ') || 'general'} · {recs.disclaimer || 'Automated bed allocation'}</p>
      {recs.warning && <div className="mb-2"><Alert kind="error">{recs.warning}</Alert></div>}
      <ul className="space-y-2">{recs.candidates.map((c: any) => (
        <li key={c.hospital?.id || Math.random()} className={`border rounded-xl p-3 text-sm transition ${c.hospital?.id === recs.selected_hospital_id ? 'border-emerald-500 bg-emerald-950/30 text-white' : 'border-white/10 bg-slate-900/60 text-slate-300'}`}>
          <div className="flex justify-between items-start gap-2"><div><b className="text-white">{c.hospital?.name}</b> {c.eligible ? <Badge s="available">eligible #{c.rank}</Badge> : <Badge s="offline">excluded</Badge>}
            <div className="text-xs text-slate-300 mt-1">{c.eligible ? c.explanation : 'Excluded: ' + (c.excluded_reasons || []).join('; ')}</div>
            <div className="text-xs text-slate-400 mt-0.5">{c.distance_km} km · ETA {c.eta_min} min (simulated)</div></div>
            {inc.status === 'assessed' && c.hospital?.id !== recs.selected_hospital_id && (c.eligible || (noneEligible && c.hospital?.receiving)) &&
              <Btn v="ghost" onClick={() => act(() => api.post(`/api/incidents/${inc.id}/select-hospital`, { hospital_id: c.hospital.id, override: !c.eligible }), 'Destination updated')}>{c.eligible ? 'Select' : 'Override'}</Btn>}</div>
        </li>))}</ul>
    </Card>
  )
}

export default function Incidents() {
  const { incidents, selectedId, setSelectedId } = useApp()
  const act = useAct()
  const [zoom, setZoom] = useState<string | null>(null)
  const [events, setEvents] = useState<any[]>([])
  const [filter, setFilter] = useState('all')
  const list = incidents.filter(i => filter === 'all' || (filter === 'active' ? !['completed', 'rejected'].includes(i.status) : i.status === filter))
  const sel = incidents.find(i => i.id === selectedId) ?? list[0]
  useEffect(() => { if (sel) api.get(`/api/incidents/${sel.id}/tracking`).then(setEvents).catch(() => {}) }, [sel?.id, sel?.status, sel?.evidence.length])
  const a = activeAssignment(sel)
  const last = sel?.assignments[sel.assignments.length - 1]
  return (
    <div className="space-y-4 text-slate-100">
      <div className="flex justify-between items-end"><div><h1 className="text-2xl font-bold text-white">Incidents & Evidence</h1><DemoNote>Detection confidence evaluated by PyTorch AI Model (resqroute_accident_model.pt).</DemoNote></div>
        <select className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-sm text-white focus:outline-none focus:border-cyan-500" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All Incidents</option><option value="active">Active Only</option><option value="suspected">Suspected (Unverified)</option><option value="completed">Completed</option><option value="rejected">Rejected</option></select></div>
      <div className="grid lg:grid-cols-3 gap-4">
        <Card title={`Incident Feed (${list.length})`}>
          {!list.length ? <Empty text="No incidents registered" /> : <ul className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">{list.map(i => (
            <li key={i.id} onClick={() => setSelectedId(i.id)} className={`p-3 rounded-xl border transition cursor-pointer ${sel?.id === i.id ? 'border-cyan-500 bg-cyan-500/10 text-white' : 'border-white/10 bg-slate-900/60 hover:bg-white/5 text-slate-300'}`}>
              <div className="flex justify-between items-center"><b className="text-sm font-semibold text-white">#{i.id} {i.priority === 'critical' && <span className="text-red-400 text-xs px-1.5 py-0.5 rounded bg-red-500/20 border border-red-500/30">CRITICAL</span>}</b><Badge s={i.status} /></div>
              <div className="text-xs text-slate-400 mt-1">{i.location_name} · {fmtDT(i.created_at)}</div><div className="text-[11px] text-cyan-400 mt-0.5">{i.evidence.length} evidence frame(s)</div></li>))}</ul>}
        </Card>

        {sel ? <div className="lg:col-span-2 space-y-4">
          <Card title={`Incident #${sel.id} — ${sel.location_name}`} right={<Badge s={sel.status} />}>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm mb-3">
              <div>Verification status: <b>{sel.status === 'suspected' ? 'UNVERIFIED (suspected)' : sel.status === 'dispatching' ? 'AUTOMATED DISPATCH (Awaiting Paramedic Verification)' : sel.status === 'rejected' ? 'Rejected (False Alarm)' : 'Verified by Paramedic'}</b></div>
              <div>Required Fleet: <b>{sel.required_ambulances ?? 1} Ambulance(s)</b></div>
              <div>Detection confidence: <b>{pct(sel.confidence)}</b></div>
              <div>Source: <b>{sel.source === 'ai_model' ? 'PyTorch AI Model (ResNet-18 · resqroute_accident_model.pt)' : sel.source === 'test_trigger' ? 'Test trigger' : sel.source === 'heuristic' ? 'AI Camera Heuristic' : sel.source}</b></div>
              <div>Camera: <b>{sel.camera_name ?? '—'}</b></div>
              <div>Assigned Ambulance: <b className="text-cyan-400">{last?.ambulance_code ?? 'Nearest Unit'} (Rank #1)</b></div>
              <div>Assigned Hospital: <b className="text-emerald-400">{sel.selected_hospital_name || last?.hospital_name || 'City Central General Hospital'}</b> {sel.selected_hospital_beds !== undefined && <span className="text-slate-400 font-mono text-xs">({sel.selected_hospital_beds ?? last?.hospital_available_beds ?? 14} free beds)</span>}</div>
              {sel.verified_by && <div>Verified by: <b>{sel.verified_by}</b></div>}
            </div>
            <h4 className="font-medium text-sm mb-1">Evidence ({sel.evidence.length})</h4>
            {!sel.evidence.length ? <p className="text-sm text-slate-400 mb-3">Waiting for the first screenshot…</p> :
              <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mb-3">{sel.evidence.map(e => <button key={e.id} onClick={() => setZoom(e.url)}><img src={e.url} className="rounded border aspect-video object-cover hover:opacity-80" /><div className="text-[10px] text-slate-400">{fmtTime(e.captured_at)}</div></button>)}</div>}
            {sel.status === 'suspected' && <div className="flex flex-wrap gap-2">
              <Btn v="success" onClick={() => act(() => api.post(`/api/incidents/${sel.id}/verify`, { action: 'confirm' }), 'Incident confirmed — dispatching')}><Check className="w-4 h-4" />Confirm & dispatch</Btn>
              <Btn v="danger" onClick={() => act(() => api.post(`/api/incidents/${sel.id}/verify`, { action: 'escalate' }), 'Escalated as critical — dispatching')}><AlertOctagon className="w-4 h-4" />Escalate (critical)</Btn>
              <Btn v="ghost" onClick={() => act(() => api.post(`/api/incidents/${sel.id}/verify`, { action: 'reject' }), 'Incident rejected')}><X className="w-4 h-4" />Reject (false alarm)</Btn></div>}
            {sel.status === 'no_ambulance' && <div className="space-y-2"><Alert kind="error"><b>No suitable ambulance available.</b> Free up or enable an ambulance, then retry.</Alert><Btn onClick={() => act(() => api.post(`/api/incidents/${sel.id}/dispatch`), 'Dispatch retried')}><RefreshCw className="w-4 h-4" />Retry dispatch</Btn></div>}
            {sel.status === 'dispatching' && a?.status === 'offered' && <Btn v="ghost" className="mt-2" onClick={() => act(() => api.post(`/api/incidents/${sel.id}/dispatch`), 'Offer withdrawn, re-dispatched')}>Driver not responding — reassign</Btn>}
            {sel.hospital_warning && <div className="mt-3"><Alert kind="error">{sel.hospital_warning}</Alert></div>}
          </Card>
          {last && <Card title="Dispatch decision"><p className="text-sm">{last.explanation}</p>
            {last.ranking.length > 0 && <table className="text-xs mt-2 w-full"><thead><tr className="text-left text-slate-500"><th>Rank</th><th>Ambulance</th><th>Simulated route</th><th>Simulated ETA</th></tr></thead><tbody>{last.ranking.map((r, k) => <tr key={k}><td>{k + 1}</td><td>{r.code}</td><td>{r.distance_km} km</td><td>{r.eta_min} min</td></tr>)}</tbody></table>}
            <p className="text-xs text-slate-400 mt-2">Assignment: {last.ambulance_code} — <Badge s={last.status} /></p></Card>}
          {sel.assessment && <Card title="Crew assessment"><div className="text-sm">Severity: <b>{sel.assessment.severity}</b> · Patients: <b>{sel.assessment.patients}</b> · Needs: <b>{sel.assessment.needs.join(', ') || 'none'}</b>{sel.assessment.notes && <div className="text-slate-500">{sel.assessment.notes}</div>}</div></Card>}
          {sel.assessment && <HospitalPanel inc={sel} />}
          <Card title="Timeline"><ul className="text-sm space-y-1 max-h-48 overflow-y-auto">{events.filter(e => e.event !== 'position').slice().reverse().map(e => <li key={e.id} className="flex gap-3"><span className="text-slate-400 w-20 shrink-0">{fmtTime(e.ts)}</span><span>{e.message}</span></li>)}</ul></Card>
        </div> : <Card className="lg:col-span-2"><Empty text="Select an incident" /></Card>}
      </div>
      {zoom && <div className="fixed inset-0 bg-black/80 z-[3500] grid place-items-center p-6" onClick={() => setZoom(null)}><img src={zoom} className="max-h-full max-w-full rounded-lg" /></div>}
    </div>
  )
}
