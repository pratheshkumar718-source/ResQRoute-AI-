import { useState } from 'react'
import {
  Building2, PhoneCall, Bed, HeartPulse, CheckCircle2, AlertTriangle,
  PlusCircle, ShieldCheck, XCircle, Clock, Stethoscope, RefreshCw, Radio
} from 'lucide-react'
import { useApp } from '../lib/store'
import { Card, Badge, Btn, useAct, Alert, SystemNote, Stat } from '../components/ui'
import { api, Hospital, fmtTime } from '../lib/api'

function HospCard({ h, canEdit, isAdmin }: { h: Hospital; canEdit: boolean; isAdmin: boolean }) {
  const act = useAct()
  const { incidents } = useApp()
  const [beds, setBeds] = useState(h.available_beds)
  const [icu, setIcu] = useState(h.icu_beds)
  const pct = Math.min(100, Math.round((h.available_beds / Math.max(1, h.total_beds)) * 100))

  // Find incoming patients routed to this hospital
  const incoming = incidents.filter(
    i => i.selected_hospital_id === h.id && ['transporting', 'at_hospital', 'on_scene'].includes(i.status)
  )

  const handleVerify = async () => {
    await act(() => api.post(`/api/hospitals/${h.id}/verify`), `Hospital ${h.name} approved & verified!`)
  }

  const handleReject = async () => {
    await act(() => api.post(`/api/hospitals/${h.id}/reject`), `Hospital ${h.name} rejected.`)
  }

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-cyan-400 shrink-0" />
          <span className="font-bold text-white text-base">{h.name}</span>
        </div>
      }
      right={
        <div className="flex items-center gap-2">
          {h.status === 'pending_verification' ? (
            <Badge s="pending_verification">Awaiting Admin Verification</Badge>
          ) : (
            <Badge s={h.receiving ? 'receiving' : 'diverted'}>
              {h.receiving ? 'RECEIVING PATIENTS' : 'DIVERTED / FULL'}
            </Badge>
          )}
        </div>
      }
      className={h.status === 'pending_verification' ? 'border-amber-500/40 ring-1 ring-amber-500/20' : ''}
    >
      <div className="space-y-4 text-sm text-slate-200">
        {/* Verification Alert Banner if Pending */}
        {h.status === 'pending_verification' && (
          <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-400" />
              Pending verification approval to join network
            </span>
            {isAdmin && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleVerify}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition cursor-pointer"
                >
                  Verify & Approve
                </button>
                <button
                  onClick={handleReject}
                  className="px-2.5 py-1 rounded-lg bg-rose-600/30 hover:bg-rose-600 text-rose-200 font-bold text-[11px] border border-rose-500/40 transition cursor-pointer"
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        )}

        {/* Emergency Contact Number Banner */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-white/10 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Trauma Desk & Emergency Hotline</div>
            <div className="text-base font-black text-cyan-300 font-mono tracking-wide">{h.phone}</div>
          </div>
          <a
            href={`tel:${h.phone}`}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5 transition"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Call Desk</span>
          </a>
        </div>

        {/* Urgent Bed Update Prompt within 1 hour */}
        {h.last_admission_at && (
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-950/40 via-red-950/30 to-amber-950/40 border border-amber-500/40 text-amber-200 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-300 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse" />
                <span>Patient Admitted — Bed Count Decreased by 1</span>
              </span>
              <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                Update Required (within 1 hr)
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-tight">
              A collision victim was admitted to this trauma facility. Hospital staff are requested to verify and update available bed counts within 1 hour.
            </p>
            {canEdit && (
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setBeds(b => Math.max(0, b - 1))}
                  className="px-2 py-1 rounded-lg bg-rose-600/30 hover:bg-rose-600 text-rose-200 text-[11px] font-bold border border-rose-500/30 cursor-pointer"
                >
                  -1 Bed
                </button>
                <button
                  type="button"
                  onClick={() => setBeds(b => Math.min(h.total_beds, b + 1))}
                  className="px-2 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600 text-emerald-200 text-[11px] font-bold border border-emerald-500/30 cursor-pointer"
                >
                  +1 Bed
                </button>
                <button
                  type="button"
                  onClick={() =>
                    act(
                      () => api.patch(`/api/hospitals/${h.id}`, { available_beds: beds, icu_beds: icu }),
                      'Hospital bed count verified & saved'
                    )
                  }
                  className="px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-bold ml-auto cursor-pointer"
                >
                  Confirm & Sync Beds
                </button>
              </div>
            )}
          </div>
        )}

        {/* Real-Time Bed Availability Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-end">
            <span className="text-xs text-slate-400">General Trauma Free Beds</span>
            <span className="text-sm font-bold text-white">
              <b className="text-emerald-400 text-base">{h.available_beds}</b> / {h.total_beds} available
            </span>
          </div>
          <div className="h-2.5 bg-slate-950 rounded-full overflow-hidden border border-white/5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                pct < 20 ? 'bg-rose-500' : pct < 50 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* ICU Bed Availability */}
        <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-900/60 border border-white/5">
          <span className="flex items-center gap-2 text-xs text-slate-300">
            <HeartPulse className="w-4 h-4 text-rose-400" />
            <span>Critical ICU Available Beds:</span>
          </span>
          <span className="font-mono text-base font-extrabold text-white">
            {h.icu_beds} <span className="text-xs text-slate-400 font-normal">beds ready</span>
          </span>
        </div>

        {/* Medical Capabilities */}
        <div>
          <div className="text-[11px] text-slate-400 uppercase font-semibold mb-1.5">Accredited Trauma Capabilities</div>
          <div className="flex flex-wrap gap-1.5">
            {h.capabilities.map(c => (
              <span
                key={c}
                className="px-2.5 py-0.5 bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 rounded-lg text-xs font-semibold capitalize"
              >
                {c}
              </span>
            ))}
          </div>
        </div>

        {/* Incoming Patients Alert */}
        {incoming.length > 0 && (
          <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-cyan-300">
              <span className="flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                Incoming Emergency Telemetry ({incoming.length})
              </span>
              <span className="font-mono text-[10px]">PREPARE ER BAY</span>
            </div>
            {incoming.map(inc => (
              <div key={inc.id} className="text-xs text-slate-200 flex justify-between pt-1 border-t border-cyan-500/20">
                <span>Incident #{inc.id} · {inc.location_name}</span>
                <span className="text-cyan-400 font-bold uppercase">{inc.status.replace(/_/g, ' ')}</span>
              </div>
            ))}
          </div>
        )}

        {/* Capacity Edit Controls (Authorized staff or Admin) */}
        {canEdit && (
          <div className="border-t border-white/10 pt-4 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Live Bed Count & Admission Controls
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Free General Beds</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    max={h.total_beds}
                    value={beds}
                    onChange={e => setBeds(+e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-white font-bold text-center"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Free ICU Beds</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    value={icu}
                    onChange={e => setIcu(+e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-white font-bold text-center"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Btn
                className="flex-1 py-2"
                onClick={() =>
                  act(
                    () => api.patch(`/api/hospitals/${h.id}`, { available_beds: beds, icu_beds: icu }),
                    'Hospital capacity updated live'
                  )
                }
              >
                Save Free Beds
              </Btn>

              <Btn
                v={h.receiving ? 'warn' : 'success'}
                className="py-2"
                onClick={() =>
                  act(
                    () => api.patch(`/api/hospitals/${h.id}`, { receiving: !h.receiving }),
                    h.receiving ? 'Admission diverted' : 'Now receiving incoming emergency patients'
                  )
                }
              >
                {h.receiving ? 'Divert Intake' : 'Resume Intake'}
              </Btn>
            </div>
          </div>
        )}

        <div className="text-[11px] text-slate-500 pt-1 text-right">
          Telemetry synchronized: {fmtTime(h.updated_at)}
        </div>
      </div>
    </Card>
  )
}

export default function Hospitals() {
  const { hospitals, user } = useApp()
  const act = useAct()
  const [registerOpen, setRegisterOpen] = useState(false)
  const [form, setForm] = useState({
    name: '',
    phone: '',
    total_beds: 80,
    available_beds: 15,
    icu_beds: 4,
    capabilities: ['trauma', 'icu'],
    username: '',
    password: '',
  })
  const [busy, setBusy] = useState(false)
  const [regMsg, setRegMsg] = useState('')

  const isAdmin = user?.role === 'admin'
  const isHospitalStaff = user?.role === 'hospital'

  // HOSPITAL MULTI-TENANCY & ISOLATION:
  // If logged in as Hospital Staff, they can ONLY see their own hospital!
  // If logged in as Admin, they see ALL hospitals.
  const displayedHospitals = isHospitalStaff
    ? hospitals.filter(h => h.id === user?.hospital_id)
    : hospitals

  // For Admin: Count pending verifications
  const pendingCount = hospitals.filter(h => h.status === 'pending_verification').length

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setRegMsg('')
    try {
      await act(
        () => api.post('/api/hospitals/register', form),
        'Hospital registration submitted! Awaiting Chief Dispatcher verification.'
      )
      setRegMsg('Registration received! Chief Dispatcher will review and approve your facility.')
      setRegisterOpen(false)
    } catch (e: any) {
      setRegMsg(e.message || 'Registration failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6 text-slate-100">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#0b1739]/90 border border-white/10 shadow-xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {isHospitalStaff ? 'Hospital Trauma Admission Console' : 'Municipal Hospital Network'}
            </h1>
            {isHospitalStaff && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Facility Portal
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {isHospitalStaff
              ? 'Private hospital console: Manage free trauma beds, ICU readiness, and incoming ambulance admissions.'
              : 'Central health authority command: Real-time bed oversight, capability triage, and hospital approvals.'}
          </p>
        </div>

        {/* Quick Action: Register New Hospital */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setRegisterOpen(true)}
            className="px-4 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-blue-600 to-cyan-600 hover:brightness-110 text-white shadow-lg shadow-cyan-500/25 flex items-center gap-2 transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Register Facility</span>
          </button>
        </div>
      </div>

      {/* Admin City-wide Metrics */}
      {isAdmin && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat
            label="Total Municipal Hospitals"
            value={hospitals.length}
            color="bg-blue-600"
            icon={<Building2 className="w-5 h-5" />}
          />
          <Stat
            label="Active Receiving Centers"
            value={`${hospitals.filter(h => h.receiving && h.status !== 'pending_verification').length}/${hospitals.length}`}
            color="bg-emerald-600"
            icon={<CheckCircle2 className="w-5 h-5" />}
          />
          <Stat
            label="Available ICU Beds City-Wide"
            value={hospitals.reduce((acc, h) => acc + (h.icu_beds || 0), 0)}
            color="bg-purple-600"
            icon={<HeartPulse className="w-5 h-5" />}
          />
          <Stat
            label="Pending Facility Approvals"
            value={pendingCount}
            color={pendingCount > 0 ? 'bg-amber-600 animate-pulse' : 'bg-slate-700'}
            icon={<ShieldCheck className="w-5 h-5" />}
          />
        </div>
      )}

      {/* Hospital Privacy / Isolation Notice for Staff */}
      {isHospitalStaff && (
        <Alert kind="info">
          <b>Facility Privacy Protection:</b> You are authenticated as {user.name}. You have exclusive access to manage your facility's bed inventory and patient admissions. Other hospital facilities in the municipal network cannot view your private operational records.
        </Alert>
      )}

      {/* Hospital Cards Grid */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
        {displayedHospitals.map(h => (
          <HospCard
            key={h.id + '-' + h.updated_at}
            h={h}
            canEdit={isAdmin || user?.hospital_id === h.id}
            isAdmin={isAdmin}
          />
        ))}
      </div>

      {displayedHospitals.length === 0 && (
        <Card>
          <div className="text-center py-10 space-y-2">
            <Building2 className="w-10 h-10 text-slate-500 mx-auto" />
            <div className="text-sm font-semibold text-slate-300">No hospital facilities found</div>
            <p className="text-xs text-slate-500">Register a new hospital to join the emergency network.</p>
          </div>
        </Card>
      )}

      {/* Register New Hospital Modal */}
      {registerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#0b1739] border border-cyan-500/30 rounded-3xl shadow-2xl w-full max-w-lg p-6 space-y-5 text-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-600/20 text-cyan-400 grid place-items-center border border-cyan-500/30">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Register Hospital Facility</h3>
                  <p className="text-xs text-slate-400">Join the ResQRoute AI Emergency Trauma Network</p>
                </div>
              </div>
              <button
                onClick={() => setRegisterOpen(false)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Hospital / Medical Center Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Multi-Specialty Trauma Center"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Emergency Trauma Hotline Phone</label>
                <input
                  type="text"
                  required
                  placeholder="+91-44-2800-XXXX"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Total Beds</label>
                  <input
                    type="number"
                    min={1}
                    value={form.total_beds}
                    onChange={e => setForm({ ...form, total_beds: +e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-sm text-white text-center font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Available Free</label>
                  <input
                    type="number"
                    min={0}
                    value={form.available_beds}
                    onChange={e => setForm({ ...form, available_beds: +e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-sm text-white text-center font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">ICU Beds</label>
                  <input
                    type="number"
                    min={0}
                    value={form.icu_beds}
                    onChange={e => setForm({ ...form, icu_beds: +e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-sm text-white text-center font-bold"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 space-y-3">
                <div className="text-xs font-semibold text-cyan-300">Staff Portal Account Credentials</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Username</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. apex_staff"
                      value={form.username}
                      onChange={e => setForm({ ...form, username: e.target.value })}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Password</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={form.password}
                      onChange={e => setForm({ ...form, password: e.target.value })}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-xs text-slate-300">
                Notice: All registrations are submitted with <b>Pending Verification</b> status. The Chief Dispatch Controller must review and approve your facility before patient admissions are automatically routed.
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRegisterOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:brightness-110 text-white font-bold text-xs shadow-lg shadow-cyan-500/25"
                >
                  {busy ? 'Registering...' : 'Submit for Verification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <SystemNote />
    </div>
  )
}
