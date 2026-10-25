import { useState } from 'react'
import { Siren, Shield, Truck, Building2, ShieldAlert, Users, X, ArrowRight, Lock, CheckCircle2 } from 'lucide-react'
import { useApp } from '../lib/store'
import { Alert } from '../components/ui'

export interface LoginProps {
  onSuccess?: () => void
  onClose?: () => void
  initialRole?: string
  isModal?: boolean
}

export const PORTAL_ROLES = [
  {
    id: 'citizen',
    label: 'Citizens & Public',
    subtitle: 'Emergency SOS & Traffic Safety',
    u: 'citizen1',
    p: 'citizen123',
    icon: Users,
    color: 'from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30',
    activeColor: 'bg-amber-500/20 border-amber-500 text-amber-300 ring-2 ring-amber-500/40',
    badge: 'Public Portal',
    desc: 'Access emergency hotline directory, real-time safety advisories, and nearby trauma centers.',
  },
  {
    id: 'police',
    label: 'Police Department',
    subtitle: 'Traffic Corridor & Scene Clearance',
    u: 'police1',
    p: 'police123',
    icon: ShieldAlert,
    color: 'from-blue-500/20 to-indigo-500/20 text-blue-400 border-blue-500/30',
    activeColor: 'bg-blue-500/20 border-blue-500 text-blue-300 ring-2 ring-blue-500/40',
    badge: 'Law Enforcement',
    desc: 'Coordinate green light corridors, receive instant accident scene telemetry, and manage hospital liaison.',
  },
  {
    id: 'hospital',
    label: 'Hospital Trauma Units',
    subtitle: 'Emergency Prep & Bed Triage',
    u: 'hospital1',
    p: 'hospital123',
    icon: Building2,
    color: 'from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30',
    activeColor: 'bg-emerald-500/20 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/40',
    badge: 'Healthcare Staff',
    desc: 'Receive pre-arrival patient severity metrics, prepare trauma bays, and manage live ICU bed counts.',
  },
  {
    id: 'admin',
    label: 'Central Dispatch & Admin',
    subtitle: 'AI Surveillance & Fleet Command',
    u: 'admin',
    p: 'admin123',
    icon: Shield,
    color: 'from-cyan-500/20 to-blue-500/20 text-cyan-400 border-cyan-500/30',
    activeColor: 'bg-cyan-500/20 border-cyan-500 text-cyan-300 ring-2 ring-cyan-500/40',
    badge: 'Chief Controller',
    desc: 'Monitor full multi-camera AI incident detection, verify incidents, and supervise autonomous dispatch ranking.',
  },
  {
    id: 'driver',
    label: 'Ambulance Units',
    subtitle: 'Smart Turn-by-Turn Navigation',
    u: 'driver1',
    p: 'driver123',
    icon: Truck,
    color: 'from-red-500/20 to-rose-500/20 text-red-400 border-red-500/30',
    activeColor: 'bg-red-500/20 border-red-500 text-red-300 ring-2 ring-red-500/40',
    badge: 'Paramedic Fleet',
    desc: 'Accept instant emergency dispatches, review scene frames, submit patient triage, and follow hospital routes.',
  },
]

export default function Login({ onSuccess, onClose, initialRole = 'admin', isModal = false }: LoginProps) {
  const { login } = useApp()
  const initial = PORTAL_ROLES.find(r => r.id === initialRole) || PORTAL_ROLES[3]
  const [selectedRole, setSelectedRole] = useState(initial)
  const [u, setU] = useState(initial.u)
  const [p, setP] = useState(initial.p)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const handleSelect = (r: typeof PORTAL_ROLES[0]) => {
    setSelectedRole(r)
    setU(r.u)
    setP(r.p)
    setErr('')
  }

  const submit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setBusy(true)
    setErr('')
    try {
      await login(u, p)
      if (onSuccess) onSuccess()
    } catch (x: any) {
      setErr(x.message || 'Authentication failed. Please verify credentials.')
    } finally {
      setBusy(false)
    }
  }

  const quickEnter = async (r: typeof PORTAL_ROLES[0]) => {
    setSelectedRole(r)
    setU(r.u)
    setP(r.p)
    setBusy(true)
    setErr('')
    try {
      await login(r.u, r.p)
      if (onSuccess) onSuccess()
    } catch (x: any) {
      setErr(x.message || 'Authentication failed.')
    } finally {
      setBusy(false)
    }
  }

  const content = (
    <div className="bg-[#0b1530] border border-cyan-500/20 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden text-slate-100 backdrop-blur-xl relative">
      {/* Top Header */}
      <div className="p-6 border-b border-white/10 flex items-center justify-between bg-navy-950/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 grid place-items-center shadow-lg shadow-cyan-500/20">
            <Siren className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-tight">ResQRoute AI</h2>
              <span className="text-[10px] tracking-wider uppercase font-semibold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Authorized Access
              </span>
            </div>
            <p className="text-xs text-slate-400">Emergency Response Coordination & Navigation Network</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="p-6 space-y-6">
        <div>
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">
            Select Your Operational Role Portal
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {PORTAL_ROLES.map(r => {
              const active = selectedRole.id === r.id
              const Icon = r.icon
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleSelect(r)}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                    active ? r.activeColor : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.06] text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1.5">
                    <div className={`p-1.5 rounded-lg bg-white/5 ${active ? 'text-white' : 'text-slate-400'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-medium text-slate-400 px-1.5 py-0.5 rounded bg-white/5">
                      {r.badge}
                    </span>
                  </div>
                  <div>
                    <div className="font-semibold text-xs leading-snug text-white">{r.label}</div>
                    <div className="text-[10px] text-slate-400 leading-tight mt-0.5">{r.subtitle}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Selected Role Info Card */}
        <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/20 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 shrink-0 mt-0.5">
            <selectedRole.icon className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-cyan-300">{selectedRole.label} Portal</span>
              <button
                type="button"
                onClick={() => quickEnter(selectedRole)}
                disabled={busy}
                className="text-[11px] font-semibold text-cyan-300 hover:text-cyan-200 underline flex items-center gap-1 cursor-pointer"
              >
                Instant Enter <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">{selectedRole.desc}</p>
          </div>
        </div>

        {/* Authentication Form */}
        <form onSubmit={submit} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-slate-300 block mb-1">Username / ID</label>
              <input
                className="w-full bg-slate-900/80 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                placeholder="Username"
                value={u}
                onChange={e => setU(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-300 block mb-1">Passcode / Key</label>
              <input
                className="w-full bg-slate-900/80 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                type="password"
                placeholder="Password"
                value={p}
                onChange={e => setP(e.target.value)}
                required
              />
            </div>
          </div>

          {err && <Alert kind="error">{err}</Alert>}

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={busy}
              className="flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-blue-600 via-cyan-600 to-cyan-500 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:brightness-110 active:scale-[0.99] transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {busy ? (
                <>Authenticating Stakeholder...</>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Sign In to {selectedRole.label}
                </>
              )}
            </button>
          </div>
        </form>

        {/* Fast Jury Access Presets */}
        <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-1.5 text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Pre-configured portal credentials loaded automatically</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            Secure Local Network Protocol
          </div>
        </div>
      </div>
    </div>
  )

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
        {content}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#070e22] grid place-items-center p-4">
      {content}
    </div>
  )
}
