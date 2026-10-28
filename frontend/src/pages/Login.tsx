import { useState } from 'react'
import {
  Siren, Shield, Truck, Building2, ShieldAlert, Users, X, ArrowRight,
  Lock, CheckCircle2, UserPlus, KeyRound, UserCheck, AlertCircle,
  Mail, Phone, Heart, Award, Hospital as HIcon, Compass, Sparkles
} from 'lucide-react'
import { useApp } from '../lib/store'
import { Alert } from '../components/ui'

export interface LoginProps {
  onSuccess?: () => void
  onClose?: () => void
  initialRole?: string
  initialMode?: 'login' | 'register'
  isModal?: boolean
}

export const PORTAL_ROLES = [
  {
    id: 'citizen',
    label: 'Citizens & Public',
    subtitle: 'Emergency SOS & Road Safety',
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

export default function Login({ onSuccess, onClose, initialRole = 'admin', initialMode = 'login', isModal = false }: LoginProps) {
  const { login, register, hospitals } = useApp()
  const initial = PORTAL_ROLES.find(r => r.id === initialRole) || PORTAL_ROLES[3]

  const [mode, setMode] = useState<'login' | 'register'>(initialMode)
  const [selectedRole, setSelectedRole] = useState(initial)
  const [u, setU] = useState(initial.u)
  const [p, setP] = useState(initial.p)

  // Registration essential fields
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regUser, setRegUser] = useState('')
  const [regPass, setRegPass] = useState('')
  const [regRole, setRegRole] = useState(initialRole)

  // Role-specific essential fields
  // Citizen
  const [bloodGroup, setBloodGroup] = useState('O+')
  const [emergencyContactName, setEmergencyContactName] = useState('')
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('')
  const [residentialArea, setResidentialArea] = useState('')

  // Driver / Paramedic
  const [ambulanceId, setAmbulanceId] = useState<number>(1)
  const [licenseNumber, setLicenseNumber] = useState('')
  const [crewLevel, setCrewLevel] = useState('ALS')
  const [baseStation, setBaseStation] = useState('Central Station Depot')

  // Hospital Staff
  const [hospitalId, setHospitalId] = useState<number>(1)
  const [department, setDepartment] = useState('Emergency Trauma ER')
  const [hotlineExt, setHotlineExt] = useState('Ext 101')

  // Police Officer
  const [badgeNumber, setBadgeNumber] = useState('')
  const [precinct, setPrecinct] = useState('Central Traffic Division')
  const [patrolZone, setPatrolZone] = useState('Zone 4 Arterial Corridor')

  // Admin
  const [stationId, setStationId] = useState('DISPATCH-HQ-01')
  const [agency, setAgency] = useState('Central Operations Command')

  const [err, setErr] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const handleSelect = (r: typeof PORTAL_ROLES[0]) => {
    setSelectedRole(r)
    setU(r.u)
    setP(r.p)
    setErr('')
    setSuccessMsg('')
  }

  const submitLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setBusy(true)
    setErr('')
    setSuccessMsg('')
    try {
      await login(u, p)
      if (onSuccess) onSuccess()
    } catch (x: any) {
      setErr(x.message || 'Authentication failed. Please verify credentials.')
    } finally {
      setBusy(false)
    }
  }

  const submitRegister = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!regName.trim() || !regUser.trim() || !regPass.trim()) {
      setErr('Please fill in your full name, username, and password.')
      return
    }
    if (!regPhone.trim()) {
      setErr('Please provide an emergency contact phone number.')
      return
    }

    setBusy(true)
    setErr('')
    setSuccessMsg('')

    // Assemble role-specific details
    const details: Record<string, any> = {}
    let amb_id: number | null = null
    let hosp_id: number | null = null

    if (regRole === 'citizen') {
      details.blood_group = bloodGroup
      details.emergency_contact_name = emergencyContactName.trim() || 'Next of Kin'
      details.emergency_contact_phone = emergencyContactPhone.trim() || regPhone.trim()
      details.address = residentialArea.trim() || 'Metropolitan Sector'
    } else if (regRole === 'driver') {
      amb_id = ambulanceId
      details.license_number = licenseNumber.trim() || 'TN-01-DL-2024-PENDING'
      details.crew_level = crewLevel
      details.base_station = baseStation.trim()
    } else if (regRole === 'hospital') {
      hosp_id = hospitalId
      details.department = department.trim()
      details.hotline_extension = hotlineExt.trim()
    } else if (regRole === 'police') {
      details.badge_number = badgeNumber.trim() || 'TN-TP-SERVICE-ID'
      details.precinct = precinct.trim()
      details.patrol_zone = patrolZone.trim()
    } else if (regRole === 'admin') {
      details.station_id = stationId.trim()
      details.agency = agency.trim()
    }

    try {
      await register({
        name: regName.trim(),
        username: regUser.trim().toLowerCase(),
        password: regPass,
        role: regRole,
        email: regEmail.trim().toLowerCase() || undefined,
        phone: regPhone.trim() || undefined,
        ambulance_id: amb_id,
        hospital_id: hosp_id,
        details,
      })
      setSuccessMsg('Account registered successfully! Entering command portal…')
      setTimeout(() => {
        if (onSuccess) onSuccess()
      }, 700)
    } catch (x: any) {
      setErr(x.message || 'Registration failed. Please choose another username.')
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
    setSuccessMsg('')
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
    <div className="bg-[#0b1530] border border-cyan-500/20 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden text-slate-100 backdrop-blur-xl relative max-h-[90vh] flex flex-col">
      {/* Top Header */}
      <div className="p-5 border-b border-white/10 flex items-center justify-between bg-navy-950/80 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 grid place-items-center shadow-lg shadow-cyan-500/20">
            <Siren className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-tight">ResQRoute AI</h2>
              <span className="text-[10px] tracking-wider uppercase font-semibold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {mode === 'login' ? 'Authorized Access' : 'Stakeholder Registration'}
              </span>
            </div>
            <p className="text-xs text-slate-400">Integrated Emergency Response Network</p>
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

      {/* Mode Switcher Tabs */}
      <div className="px-6 pt-3 flex gap-2 border-b border-white/5 bg-slate-900/50 shrink-0">
        <button
          type="button"
          onClick={() => { setMode('login'); setErr(''); setSuccessMsg('') }}
          className={`pb-2.5 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition cursor-pointer ${
            mode === 'login'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Sign In to Portal</span>
        </button>
        <button
          type="button"
          onClick={() => { setMode('register'); setErr(''); setSuccessMsg('') }}
          className={`pb-2.5 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition cursor-pointer ${
            mode === 'register'
              ? 'border-emerald-400 text-emerald-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
          <span>Register Essential Details</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold uppercase tracking-wider">
            Sign Up
          </span>
        </button>
      </div>

      <div className="p-6 space-y-5 overflow-y-auto flex-1">
        {mode === 'login' ? (
          <>
            {/* Role Portals */}
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
                    Quick Enter <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">{selectedRole.desc}</p>
              </div>
            </div>

            {/* Authentication Form */}
            <form onSubmit={submitLogin} className="space-y-3.5">
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
              {successMsg && <Alert kind="ok">{successMsg}</Alert>}

              <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full sm:flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-blue-600 via-cyan-600 to-cyan-500 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:brightness-110 active:scale-[0.99] transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
                <button
                  type="button"
                  onClick={() => { setMode('register'); setErr(''); setSuccessMsg('') }}
                  className="w-full sm:w-auto py-2.5 px-4 rounded-xl font-semibold text-xs sm:text-sm bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  <UserPlus className="w-4 h-4 text-emerald-400" />
                  <span>Register Essential Details</span>
                </button>
              </div>
            </form>
          </>
        ) : (
          /* Comprehensive Registration Form with Essential Details */
          <form onSubmit={submitRegister} className="space-y-4">
            {/* Operational Role Picker */}
            <div>
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">
                1. Select Stakeholder Role
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PORTAL_ROLES.map(r => {
                  const active = regRole === r.id
                  const Icon = r.icon
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRegRole(r.id)}
                      className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2.5 ${
                        active
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-200 ring-1 ring-cyan-500/40'
                          : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.06] text-slate-300'
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg bg-white/5 ${active ? 'text-white' : 'text-slate-400'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="text-xs font-medium truncate">{r.label}</div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Essential Personal & Contact Information */}
            <div className="space-y-3 p-3.5 rounded-xl bg-slate-900/60 border border-white/10">
              <div className="text-xs font-semibold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>2. Essential Identity & Contact Information</span>
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-300 block mb-1">Full Legal Name *</label>
                <input
                  className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                  placeholder="e.g. Dr. Priya Selvam / Officer Rajesh"
                  value={regName}
                  onChange={e => setRegName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-300 block mb-1 flex items-center gap-1">
                    <Mail className="w-3 h-3 text-cyan-400" />
                    <span>Official / Personal Email *</span>
                  </label>
                  <input
                    type="email"
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                    placeholder="name@emergency.gov / personal"
                    value={regEmail}
                    onChange={e => setRegEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-300 block mb-1 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-emerald-400" />
                    <span>Emergency Contact Phone *</span>
                  </label>
                  <input
                    type="tel"
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition font-mono"
                    placeholder="+91-98400-00000"
                    value={regPhone}
                    onChange={e => setRegPhone(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-300 block mb-1">Username / ID *</label>
                  <input
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                    placeholder="e.g. priya_selvam"
                    value={regUser}
                    onChange={e => setRegUser(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-300 block mb-1">Password *</label>
                  <input
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                    type="password"
                    placeholder="Create a secure passcode"
                    value={regPass}
                    onChange={e => setRegPass(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Role-Specific Essential Details */}
            <div className="space-y-3 p-3.5 rounded-xl bg-slate-900/60 border border-cyan-500/20">
              <div className="text-xs font-semibold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>3. Operational Verification ({PORTAL_ROLES.find(r => r.id === regRole)?.label})</span>
              </div>

              {regRole === 'citizen' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-medium text-slate-300 block mb-1 flex items-center gap-1">
                        <Heart className="w-3 h-3 text-rose-400" />
                        <span>Blood Group (Emergency Care)</span>
                      </label>
                      <select
                        value={bloodGroup}
                        onChange={e => setBloodGroup(e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                      >
                        {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(bg => (
                          <option key={bg} value={bg}>{bg}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-300 block mb-1">
                        Home / Primary Sector
                      </label>
                      <input
                        className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                        placeholder="e.g. Anna Nagar, Central Sector"
                        value={residentialArea}
                        onChange={e => setResidentialArea(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-medium text-slate-300 block mb-1">
                        Emergency Contact Person
                      </label>
                      <input
                        className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                        placeholder="e.g. Ramesh (Spouse / Parent)"
                        value={emergencyContactName}
                        onChange={e => setEmergencyContactName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-300 block mb-1">
                        Next-of-Kin Phone Number
                      </label>
                      <input
                        className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                        placeholder="+91-98402-99999"
                        value={emergencyContactPhone}
                        onChange={e => setEmergencyContactPhone(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {regRole === 'driver' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-medium text-slate-300 block mb-1">
                        Assigned Ambulance Unit
                      </label>
                      <select
                        value={ambulanceId}
                        onChange={e => setAmbulanceId(+e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                      >
                        <option value={1}>AMB-01 (Central Depot)</option>
                        <option value={2}>AMB-02 (North Rapid Responder)</option>
                        <option value={3}>AMB-03 (East Corridor)</option>
                        <option value={4}>AMB-04 (West Sector)</option>
                        <option value={5}>AMB-05 (South Highway Patrol)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-300 block mb-1">
                        Medical Crew Capability Level
                      </label>
                      <select
                        value={crewLevel}
                        onChange={e => setCrewLevel(e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                      >
                        <option value="ALS">ALS (Advanced Life Support - Ventilator & Defib)</option>
                        <option value="BLS">BLS (Basic Life Support - Oxygen & First Aid)</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-medium text-slate-300 block mb-1 flex items-center gap-1">
                        <Award className="w-3 h-3 text-cyan-400" />
                        <span>Paramedic / Heavy DL License Number</span>
                      </label>
                      <input
                        className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                        placeholder="e.g. TN-01-DL-2023-8921"
                        value={licenseNumber}
                        onChange={e => setLicenseNumber(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-300 block mb-1">
                        Base Ambulance Depot
                      </label>
                      <input
                        className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                        placeholder="Central Station Depot"
                        value={baseStation}
                        onChange={e => setBaseStation(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {regRole === 'hospital' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-medium text-slate-300 block mb-1 flex items-center gap-1">
                        <HIcon className="w-3 h-3 text-emerald-400" />
                        <span>Designated Hospital Facility</span>
                      </label>
                      <select
                        value={hospitalId}
                        onChange={e => setHospitalId(+e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                      >
                        {hospitals.map(h => (
                          <option key={h.id} value={h.id}>{h.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-300 block mb-1">
                        Clinical Department / Designation
                      </label>
                      <input
                        className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                        placeholder="Emergency Trauma ER / ICU Head"
                        value={department}
                        onChange={e => setDepartment(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-300 block mb-1">
                      Hospital Trauma Bay Hotline / Extension
                    </label>
                    <input
                      className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                      placeholder="e.g. +91-44-2800-1001 Ext 101"
                      value={hotlineExt}
                      onChange={e => setHotlineExt(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {regRole === 'police' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-medium text-slate-300 block mb-1 flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3 text-blue-400" />
                        <span>Officer Badge / Service ID</span>
                      </label>
                      <input
                        className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                        placeholder="e.g. TN-TP-4402"
                        value={badgeNumber}
                        onChange={e => setBadgeNumber(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-300 block mb-1">
                        Traffic Police Division / Station
                      </label>
                      <input
                        className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                        placeholder="Central Traffic Division"
                        value={precinct}
                        onChange={e => setPrecinct(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-300 block mb-1">
                      Assigned Patrol Sector / Corridor
                    </label>
                    <input
                      className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                      placeholder="Zone 4 Arterial Corridor & Flyovers"
                      value={patrolZone}
                      onChange={e => setPatrolZone(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {regRole === 'admin' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-slate-300 block mb-1 flex items-center gap-1">
                      <Shield className="w-3 h-3 text-cyan-400" />
                      <span>Dispatch Station ID</span>
                    </label>
                    <input
                      className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                      placeholder="DISPATCH-HQ-01"
                      value={stationId}
                      onChange={e => setStationId(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-300 block mb-1">
                      Dispatching Authority
                    </label>
                    <input
                      className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                      placeholder="Central Operations Command"
                      value={agency}
                      onChange={e => setAgency(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            {err && <Alert kind="error">{err}</Alert>}
            {successMsg && <Alert kind="ok">{successMsg}</Alert>}

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="submit"
                disabled={busy}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-500 text-white shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 hover:brightness-110 active:scale-[0.99] transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {busy ? (
                  <>Registering Details & Synchronizing...</>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4" />
                    Register & Enter Command Center
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => { setMode('login'); setErr(''); setSuccessMsg('') }}
                className="w-full sm:w-auto py-3 px-4 rounded-xl font-semibold text-xs sm:text-sm bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                <Lock className="w-4 h-4 text-slate-400" />
                <span>Existing User? Sign In</span>
              </button>
            </div>
          </form>
        )}

        {/* Footer Info */}
        <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Interactive Multi-Role Emergency Network</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            {mode === 'login' ? (
              <button
                type="button"
                onClick={() => setMode('register')}
                className="text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
              >
                Need an account? Register here
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
              >
                Already registered? Sign in
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
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
