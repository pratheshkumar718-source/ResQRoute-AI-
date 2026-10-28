import { useState, useEffect } from 'react'
import {
  Siren, Shield, Truck, Building2, ShieldAlert, Users, ArrowRight,
  Clock, Heart, Activity, CheckCircle2, ChevronRight, Sparkles,
  PhoneCall, MapPin, Eye, Bell, Radio, Lock, Stethoscope, Compass,
  ChevronDown, ExternalLink, Zap, Layers, AlertCircle, UserPlus
} from 'lucide-react'
import { useApp } from '../lib/store'
import Login, { PORTAL_ROLES } from './Login'

interface HomeProps {
  onEnterDashboard: (targetPage?: string) => void
}

export default function Home({ onEnterDashboard }: HomeProps) {
  const { user, logout } = useApp()
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const [loginModalMode, setLoginModalMode] = useState<'login' | 'register'>('login')
  const [selectedLoginRole, setSelectedLoginRole] = useState('admin')
  const [activeStep, setActiveStep] = useState(3)
  const [heroSimState, setHeroSimState] = useState<'detect' | 'parallel' | 'hospital'>('parallel')
  const [sosModalOpen, setSosModalOpen] = useState(false)

  // Auto-cycle hero simulation preview
  useEffect(() => {
    const timer = setInterval(() => {
      setHeroSimState(prev => (prev === 'detect' ? 'parallel' : prev === 'parallel' ? 'hospital' : 'detect'))
    }, 6000)
    return () => clearInterval(timer)
  }, [])

  const openPortalLogin = (roleId: string = 'admin') => {
    setSelectedLoginRole(roleId)
    setLoginModalMode('login')
    setLoginModalOpen(true)
  }

  const openPortalRegister = (roleId: string = 'citizen') => {
    setSelectedLoginRole(roleId)
    setLoginModalMode('register')
    setLoginModalOpen(true)
  }

  const handlePrimaryCta = () => {
    if (user) {
      onEnterDashboard(user.role === 'admin' ? 'camera' : undefined)
    } else {
      openPortalLogin('admin')
    }
  }

  return (
    <div className="min-h-screen bg-[#070e22] text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* ----------------- Top Navigation Bar ----------------- */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#070e22]/90 border-b border-white/[0.08] shadow-lg shadow-black/25 transition-all duration-300 py-3.5 sm:py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Sleek Brand Logo */}
          <a href="#" className="flex items-center gap-3 group cursor-pointer">
            <div className="relative">
              <img
                src="/logo.png"
                alt="ResQRoute AI"
                className="w-10 h-10 rounded-xl object-contain shadow-md shadow-cyan-500/20 border border-cyan-500/30 group-hover:scale-105 group-hover:border-cyan-400/60 transition-all duration-300 shrink-0"
              />
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-cyan-400 rounded-full ring-2 ring-[#070e22]" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold tracking-tight text-white group-hover:text-cyan-300 transition-colors">
                ResQRoute
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/30 uppercase tracking-wider">
                AI
              </span>
            </div>
          </a>

          {/* Floating Pill Center Navigation (Desktop) */}
          <nav className="hidden lg:flex items-center p-1 rounded-full bg-white/[0.03] border border-white/[0.08] backdrop-blur-md shadow-inner text-xs font-medium text-slate-300">
            <a href="#mission" className="px-3.5 py-1.5 rounded-full hover:text-white hover:bg-white/[0.08] transition-all">
              Mission
            </a>
            <a href="#golden-time" className="px-3.5 py-1.5 rounded-full hover:text-white hover:bg-white/[0.08] transition-all">
              Golden Hour
            </a>
            <a href="#coordination" className="px-3.5 py-1.5 rounded-full hover:text-white hover:bg-white/[0.08] transition-all">
              Coordination
            </a>
            <a href="#pipeline" className="px-3.5 py-1.5 rounded-full hover:text-white hover:bg-white/[0.08] transition-all">
              Pipeline
            </a>
            <a href="#portals" className="px-3.5 py-1.5 rounded-full hover:text-white hover:bg-white/[0.08] transition-all">
              Portals
            </a>
          </nav>

          {/* Right-Side Balanced Actions */}
          <div className="flex items-center gap-2.5">
            {/* Quick Emergency SOS Pill */}
            <button
              onClick={() => setSosModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-all cursor-pointer shadow-sm hover:shadow-rose-500/20 active:scale-95"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
              </span>
              <span className="hidden sm:inline">Citizen</span> SOS
            </button>

            {user ? (
              /* If User is Logged In */
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onEnterDashboard()}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 via-cyan-600 to-cyan-500 hover:brightness-110 text-white shadow-lg shadow-cyan-500/25 border border-cyan-400/30 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Activity className="w-3.5 h-3.5 text-cyan-200 animate-pulse" />
                  <span>Launch Operations</span>
                </button>
                <button
                  onClick={logout}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all cursor-pointer"
                  title="Sign Out"
                >
                  <Lock className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              /* If User is Not Logged In: Both Register and Sign In */
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openPortalRegister('citizen')}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 transition-all cursor-pointer hover:shadow-emerald-500/20 active:scale-95"
                  title="Create a new account"
                >
                  <UserPlus className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Register</span>
                </button>
                <button
                  onClick={() => openPortalLogin('admin')}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25 border border-cyan-400/30 flex items-center gap-1.5 transition-all cursor-pointer hover:shadow-cyan-500/40 active:scale-95"
                >
                  <Shield className="w-3.5 h-3.5 text-cyan-100" />
                  <span>Sign In</span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-70" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ----------------- Hero Section ----------------- */}
      <section className="relative overflow-hidden pt-12 pb-24 lg:pt-20 lg:pb-32">
        {/* Ambient Decorative Backdrops */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[400px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/2 right-1/4 w-[400px] h-[400px] bg-rose-600/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Column: Hero Text */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              {/* Eyebrow Pill */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 text-xs font-semibold tracking-wider uppercase">
                <span className="w-2 h-2 rounded-full bg-cyan-400 pulse-cyan" />
                <span>INTELLIGENCE THAT RESPONDS WHEN SECONDS MATTER</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.12]">
                Every Second Counts.{' '}
                <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-400 bg-clip-text text-transparent">
                  Give Every Second a Purpose.
                </span>
              </h1>

              {/* Supporting Text */}
              <p className="text-lg sm:text-xl text-slate-300 leading-relaxed font-normal max-w-2xl mx-auto lg:mx-0">
                When an accident happens, precious time matters. ResQRoute AI brings emergency response teams and hospitals closer together, helping turn critical moments into coordinated action.
              </p>

              {/* CTA Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <button
                  onClick={handlePrimaryCta}
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl font-bold text-base bg-gradient-to-r from-blue-600 via-cyan-600 to-cyan-500 hover:brightness-110 text-white shadow-xl shadow-cyan-500/25 hover:shadow-cyan-500/40 active:scale-[0.98] transition flex items-center justify-center gap-3 cursor-pointer group"
                >
                  <Activity className="w-5 h-5 text-cyan-200 group-hover:animate-pulse" />
                  <span>Access Emergency Network</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>

                {!user && (
                  <button
                    onClick={() => openPortalRegister('citizen')}
                    className="w-full sm:w-auto px-7 py-4 rounded-2xl font-bold text-base bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 hover:border-emerald-500/50 active:scale-[0.98] transition flex items-center justify-center gap-2.5 cursor-pointer shadow-lg shadow-emerald-500/10"
                  >
                    <UserPlus className="w-5 h-5 text-emerald-400" />
                    <span>Register Account</span>
                  </button>
                )}

                <a
                  href="#golden-time"
                  className="w-full sm:w-auto px-7 py-4 rounded-2xl font-semibold text-base bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border border-white/10 hover:border-white/20 active:scale-[0.98] transition flex items-center justify-center gap-2"
                >
                  <Compass className="w-5 h-5 text-slate-400" />
                  <span>Discover Our Mission</span>
                </a>
              </div>

              {/* Verified Trust & Compliance Badges */}
              <div className="pt-6 border-t border-white/10 grid grid-cols-3 gap-4 max-w-lg mx-auto lg:mx-0 text-left">
                <div>
                  <div className="text-xl sm:text-2xl font-black text-white">0s</div>
                  <div className="text-[11px] sm:text-xs text-slate-400">Dispatch Latency Delay</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-black text-cyan-400">100%</div>
                  <div className="text-[11px] sm:text-xs text-slate-400">Parallel Pre-Arrival Prep</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-black text-emerald-400">5 Roles</div>
                  <div className="text-[11px] sm:text-xs text-slate-400">Inter-Agency Network</div>
                </div>
              </div>
            </div>

            {/* Right Column: High-Impact Visual Card */}
            <div className="lg:col-span-5">
              <div className="relative rounded-3xl p-1 bg-gradient-to-b from-cyan-500/30 via-white/10 to-transparent shadow-2xl">
                <div className="bg-[#0b1530] rounded-[22px] border border-white/10 p-5 sm:p-6 space-y-5 backdrop-blur-xl">
                  {/* Visual Header */}
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                        Operational Network Telemetry
                      </span>
                    </div>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                      LIVE SIMULATION
                    </span>
                  </div>

                  {/* Simulation State Selector Tabs */}
                  <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-900/80 border border-white/5 text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setHeroSimState('detect')}
                      className={`py-1.5 rounded-lg transition ${
                        heroSimState === 'detect' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      1. Detection
                    </button>
                    <button
                      type="button"
                      onClick={() => setHeroSimState('parallel')}
                      className={`py-1.5 rounded-lg transition ${
                        heroSimState === 'parallel' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      2. Parallel Route
                    </button>
                    <button
                      type="button"
                      onClick={() => setHeroSimState('hospital')}
                      className={`py-1.5 rounded-lg transition ${
                        heroSimState === 'hospital' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      3. Trauma Ready
                    </button>
                  </div>

                  {/* Interactive Dynamic Visual Display */}
                  <div className="relative rounded-2xl bg-slate-950/70 border border-white/10 p-4 space-y-4 overflow-hidden">
                    {/* Simulated SVG Road Grid Graphic */}
                    <div className="relative h-44 rounded-xl bg-[#070e22] border border-cyan-500/20 overflow-hidden flex items-center justify-center">
                      <svg className="w-full h-full opacity-60" viewBox="0 0 400 180">
                        <defs>
                          <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#06b6d4" />
                            <stop offset="100%" stopColor="#3b82f6" />
                          </linearGradient>
                          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                          </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#grid)" />

                        {/* Road Network Lines */}
                        <path d="M 40 90 L 150 90 L 220 40 L 360 40" stroke="#1e293b" strokeWidth="10" strokeLinecap="round" />
                        <path d="M 150 90 L 150 150 L 300 150" stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />

                        {/* Active Emergency Route Line with glowing stroke */}
                        <path
                          d="M 40 90 L 150 90 L 220 40 L 360 40"
                          stroke="url(#routeGrad)"
                          strokeWidth="4"
                          strokeDasharray="6 3"
                          fill="none"
                          className="animate-pulse"
                        />

                        {/* Node: Camera Surveillance / Incident Location */}
                        <circle cx="150" cy="90" r="10" fill="#ef4444" opacity="0.25" className="pulse-red" />
                        <circle cx="150" cy="90" r="5" fill="#ef4444" />
                        <text x="135" y="115" fill="#fca5a5" fontSize="9" fontWeight="bold">CAM-01 IMPACT</text>

                        {/* Node: Moving Ambulance */}
                        <circle cx="65" cy="90" r="8" fill="#06b6d4" opacity="0.3" className="pulse-cyan" />
                        <circle cx="65" cy="90" r="4.5" fill="#38bdf8" />
                        <text x="45" y="78" fill="#38bdf8" fontSize="9" fontWeight="bold">AMB-01 (ALS)</text>

                        {/* Node: Receiving Hospital */}
                        <circle cx="360" cy="40" r="11" fill="#10b981" opacity="0.25" />
                        <circle cx="360" cy="40" r="6" fill="#10b981" />
                        <text x="300" y="30" fill="#6ee7b7" fontSize="9" fontWeight="bold">TRAUMA ER</text>
                      </svg>

                      {/* Floating Telemetry Badge Overlay */}
                      <div className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-[#0b1530]/90 border border-cyan-500/30 text-[10px] text-cyan-300 font-mono flex items-center gap-1.5 shadow-lg">
                        <Radio className="w-3 h-3 text-cyan-400 animate-spin" />
                        <span>ETA: 4.8 min · 3.2 km</span>
                      </div>
                    </div>

                    {/* Step-specific Telemetry Details */}
                    {heroSimState === 'detect' && (
                      <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs space-y-1">
                        <div className="flex items-center justify-between text-red-300 font-bold">
                          <span className="flex items-center gap-1.5">
                            <AlertCircle className="w-4 h-4 text-red-400" />
                            Motion Spike Heuristic Flagged
                          </span>
                          <span className="font-mono text-[11px]">CAM-01 Junction</span>
                        </div>
                        <p className="text-slate-300 text-[11px] leading-relaxed">
                          Visual evidence auto-captured. 4 consecutive frames logged to central dispatch. No automated false alarms—requires dispatcher verification.
                        </p>
                      </div>
                    )}

                    {heroSimState === 'parallel' && (
                      <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs space-y-1">
                        <div className="flex items-center justify-between text-cyan-300 font-bold">
                          <span className="flex items-center gap-1.5">
                            <Truck className="w-4 h-4 text-cyan-400" />
                            Ambulance En Route & Police Corridor Staged
                          </span>
                          <span className="font-mono text-[11px]">Parallel Protocol</span>
                        </div>
                        <p className="text-slate-300 text-[11px] leading-relaxed">
                          AMB-01 navigating shortest simulated path. Police dashboard receives real-time crash data for traffic signal clearance.
                        </p>
                      </div>
                    )}

                    {heroSimState === 'hospital' && (
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1">
                        <div className="flex items-center justify-between text-emerald-300 font-bold">
                          <span className="flex items-center gap-1.5">
                            <Building2 className="w-4 h-4 text-emerald-400" />
                            Receiving Trauma Center Staged
                          </span>
                          <span className="font-mono text-[11px]">City Central General</span>
                        </div>
                        <p className="text-slate-300 text-[11px] leading-relaxed">
                          Trauma Bay 1 reserved, surgical staff notified with en-route vitals, and ICU bed count verified prior to ambulance arrival.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Multi-Agency Status Matrix */}
                  <div className="space-y-2 pt-1">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Simultaneous System Coordination
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5 flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span className="text-slate-300 truncate">Immediate Dispatch Trigger</span>
                      </div>
                      <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5 flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span className="text-slate-300 truncate">Police Route Clearance</span>
                      </div>
                      <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5 flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="text-slate-300 truncate">Pre-Arrival Hospital Alert</span>
                      </div>
                      <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5 flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="text-slate-300 truncate">Real-Time Telemetry Feed</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------- Section 4: The Golden Time ----------------- */}
      <section id="golden-time" className="py-24 bg-[#09112a] border-y border-white/5 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-cyan-400 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20">
              Impact-Driven Emergency Care
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              Protect the Golden Time.
            </h2>
            <p className="text-xl text-cyan-200/90 font-medium">
              Care can begin before the patient reaches the hospital.
            </p>
            <p className="text-slate-300 text-base sm:text-lg leading-relaxed pt-2">
              In an emergency, the time before a patient reaches definitive medical care can be critical. By helping emergency teams coordinate sooner and giving the receiving hospital advance notice, ResQRoute AI aims to help reduce avoidable delays and give medical professionals more time to prepare.
            </p>
          </div>

          {/* Three Concise Core Benefits */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {/* Benefit 1 */}
            <div className="glass-card rounded-2xl p-7 space-y-4 relative group">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 grid place-items-center group-hover:scale-110 transition-transform">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">Respond Sooner</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Help initiate ambulance dispatch promptly after an authorized responder verifies the incident, avoiding manual phone tree delays.
              </p>
              <div className="pt-2 text-xs font-semibold text-cyan-300 flex items-center gap-1">
                <span>Autonomous Fleet Ranking</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Benefit 2 */}
            <div className="glass-card rounded-2xl p-7 space-y-4 relative group">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 grid place-items-center group-hover:scale-110 transition-transform">
                <Stethoscope className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">Prepare Earlier</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Give the receiving hospital advance notice so staff can prepare the emergency bay, verify ICU beds, and stage surgical assets for the patient's expected arrival.
              </p>
              <div className="pt-2 text-xs font-semibold text-emerald-300 flex items-center gap-1">
                <span>Zero-Latency Handover</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Benefit 3 */}
            <div className="glass-card rounded-2xl p-7 space-y-4 relative group">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 grid place-items-center group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">Coordinate Better</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Help police, ambulance personnel, and hospital teams share relevant information before the patient arrives, ensuring unified roadside and clinical continuity.
              </p>
              <div className="pt-2 text-xs font-semibold text-blue-300 flex items-center gap-1">
                <span>Synchronized Inter-Agency Data</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* Visual Comparison: Traditional vs ResQRoute AI Parallel Coordination */}
          <div className="rounded-3xl p-6 sm:p-8 bg-[#0b1530] border border-cyan-500/20 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-white">
                  Parallel Preparation vs. Traditional Sequential Latency
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  How preparation can begin while the ambulance is actively travelling
                </p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 self-start sm:self-auto">
                System Workflow Objective
              </span>
            </div>

            <div className="space-y-6">
              {/* Traditional Linear Timeline */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                  <span className="flex items-center gap-1.5 text-rose-400">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    Traditional Process (Sequential Latency)
                  </span>
                  <span className="text-rose-300/80">Preparation starts ONLY after arrival</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/20 text-slate-300">
                    <span className="text-[10px] text-rose-400 font-bold block">PHASE 1</span>
                    Late crash report via phone
                  </div>
                  <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/20 text-slate-300">
                    <span className="text-[10px] text-rose-400 font-bold block">PHASE 2</span>
                    Ambulance searches for location
                  </div>
                  <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/20 text-slate-300">
                    <span className="text-[10px] text-rose-400 font-bold block">PHASE 3</span>
                    Transport without hospital pre-alert
                  </div>
                  <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-200">
                    <span className="text-[10px] text-rose-400 font-bold block">PHASE 4</span>
                    ER scrambles team AFTER arrival
                  </div>
                </div>
              </div>

              {/* ResQRoute AI Parallel Timeline */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                  <span className="flex items-center gap-1.5 text-cyan-400">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 pulse-cyan" />
                    ResQRoute AI (Parallel Coordination Architecture)
                  </span>
                  <span className="text-cyan-300 font-semibold">Immediate multi-agency synchronization</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-200">
                    <span className="text-[10px] text-cyan-400 font-bold block">STEP 1</span>
                    Instant AI Camera Detection
                  </div>
                  <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-500/30 text-blue-200">
                    <span className="text-[10px] text-blue-400 font-bold block">STEP 2</span>
                    Dispatch verified & initiated instantly
                  </div>
                  <div className="p-3 rounded-xl bg-gradient-to-r from-blue-950/40 to-emerald-950/40 border border-emerald-500/30 text-emerald-200 sm:col-span-2">
                    <span className="text-[10px] text-emerald-400 font-bold block">PARALLEL TRANSIT & CLINICAL STAGING</span>
                    While ambulance travels, Police clear route AND Hospital stages trauma bay + verifies ICU beds
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 text-[11px] text-slate-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>
                Note: System impact represents intended architectural capabilities on simulated municipal road networks; clinical handovers comply with authorized medical protocols.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------- Section 5: One Coordinated Response ----------------- */}
      <section id="coordination" className="py-24 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-4 mb-20">
            <span className="text-xs font-bold uppercase tracking-widest text-cyan-400 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20">
              Synchronized Multi-Agency Action
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              One Coordinated Response. A More Prepared Arrival.
            </h2>
            <p className="text-slate-300 text-lg leading-relaxed">
              ResQRoute AI connects incident identification, field dispatch, law enforcement, and medical care into one uninterrupted chain of preparedness.
            </p>
          </div>

          {/* Three Connected Visual Cards */}
          <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Connected progress line (desktop) */}
            <div className="hidden lg:block absolute top-1/2 left-[15%] right-[15%] h-0.5 bg-gradient-to-r from-cyan-500/20 via-blue-500/40 to-emerald-500/20 -translate-y-8 z-0" />

            {/* Card 1 */}
            <div className="relative z-10 glass-card rounded-3xl p-8 space-y-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 grid place-items-center shadow-lg shadow-cyan-500/10">
                    <Radio className="w-7 h-7" />
                  </div>
                  <span className="text-xs font-mono font-bold text-cyan-300 px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                    01 · DETECTION & AUTO-DISPATCH
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Automated Nearest Unit Allocation</h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Upon AI camera motion-spike detection, 6 evidence frames (3s interval) are captured automatically. The nearest ambulance is immediately offered the dispatch call with a 60-second response window.
                </p>
              </div>
              <div className="pt-4 border-t border-white/10 text-xs text-slate-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                <span>6 optical evidence frames · Instant automated dispatch</span>
              </div>
            </div>

            {/* Card 2 */}
            <div className="relative z-10 glass-card rounded-3xl p-8 space-y-5 flex flex-col justify-between border-cyan-500/30 shadow-xl shadow-cyan-500/5">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 grid place-items-center shadow-lg shadow-blue-500/10">
                    <Zap className="w-7 h-7" />
                  </div>
                  <span className="text-xs font-mono font-bold text-blue-300 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    02 · VERIFICATION & CASCADE
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Paramedic Verification & Fleet Cascade</h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  The primary paramedic inspects the 6 frames, verifies the accident, and estimates casualty volume. If multiple ambulances are required, the system automatically cascades calls to additional nearest units with a live multi-fleet feed.
                </p>
              </div>
              <div className="pt-4 border-t border-white/10 text-xs text-slate-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-400" />
                <span>Multi-choice verification & automated multi-unit cascade</span>
              </div>
            </div>

            {/* Card 3 */}
            <div className="relative z-10 glass-card rounded-3xl p-8 space-y-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 grid place-items-center shadow-lg shadow-emerald-500/10">
                    <Building2 className="w-7 h-7" />
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-300 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    03 · POLICE CORRIDOR & BED SYNC
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Police Green Corridor & Live Bed Sync</h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Ambulance and hospital details are instantly dispatched to Traffic Police for route clearance and legal coordination on the Live Tactical Map. Admitted patients automatically decrement bed counts, prompting hourly bed verification.
                </p>
              </div>
              <div className="pt-4 border-t border-white/10 text-xs text-slate-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Green Corridor traffic preemption · Dynamic bed deduction</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------- Section 6: More Than Detection ----------------- */}
      <section className="py-24 bg-[#09112a] border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-cyan-400 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20">
              Transformative Impact
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              More Than Detection. A Connected Emergency Response.
            </h2>
            <p className="text-slate-300 text-lg leading-relaxed">
              Detecting an incident is only the opening second. How emergency agencies communicate determines how quickly care reaches the person in need.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Benefit Card 1 */}
            <div className="glass-card rounded-2xl p-6 space-y-4 hover:-translate-y-1 transition">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 grid place-items-center">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Time Matters</h3>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                Support a faster transition from incident verification to ambulance dispatch, reducing idle downtime and procedural bottlenecks.
              </p>
            </div>

            {/* Benefit Card 2 */}
            <div className="glass-card rounded-2xl p-6 space-y-4 hover:-translate-y-1 transition">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 grid place-items-center">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Better Preparedness</h3>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                Give the receiving hospital an opportunity to prepare before the ambulance arrives, ensuring trauma rooms and surgical teams are ready.
              </p>
            </div>

            {/* Benefit Card 3 */}
            <div className="glass-card rounded-2xl p-6 space-y-4 hover:-translate-y-1 transition">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 grid place-items-center">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Connected Responders</h3>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                Help ambulance teams and police coordinate with the hospital using relevant incident information and synchronized routes.
              </p>
            </div>

            {/* Benefit Card 4 */}
            <div className="glass-card rounded-2xl p-6 space-y-4 hover:-translate-y-1 transition">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 grid place-items-center">
                <Radio className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Clearer Communication</h3>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                Make essential incident and response details easier for authorized personnel to access in a clean, unified dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------- Section 7: Animated Timeline (8 Steps) ----------------- */}
      <section id="pipeline" className="py-24 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-cyan-400 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20">
              Interactive Incident Lifecycle
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              Visualizing the Coordinated Response Pipeline
            </h2>
            <p className="text-slate-300 text-lg leading-relaxed">
              Ambulance dispatch and police–hospital coordination operate as parallel streams after verification—eliminating sequential delays.
            </p>
          </div>

          {/* Stepper Selection Buttons (Desktop) */}
          <div className="hidden lg:grid grid-cols-8 gap-2 mb-8">
            {[
              { num: 1, title: 'AI Detection' },
              { num: 2, title: 'Evidence Feed' },
              { num: 3, title: 'Verification' },
              { num: 4, title: 'Fast Dispatch' },
              { num: 5, title: 'Police Sync' },
              { num: 6, title: 'Parallel Transit' },
              { num: 7, title: 'Crew Triage' },
              { num: 8, title: 'Hospital Intake' },
            ].map(s => {
              const active = activeStep === s.num
              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => setActiveStep(s.num)}
                  className={`p-3 rounded-xl border text-center transition cursor-pointer ${
                    active
                      ? 'bg-cyan-500/20 border-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                      : 'bg-white/[0.02] border-white/10 text-slate-400 hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  <span className="text-xs font-mono font-bold block mb-0.5">0{s.num}</span>
                  <span className="text-[11px] font-semibold leading-tight line-clamp-1">{s.title}</span>
                </button>
              )
            })}
          </div>

          {/* Detailed Stepper Card */}
          <div className="rounded-3xl p-6 sm:p-10 bg-[#0b1530] border border-cyan-500/20 shadow-2xl relative">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-8 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    SEQUENCE STEP 0{activeStep} OF 08
                  </span>
                  {activeStep === 4 && (
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 animate-pulse">
                      CRITICAL DISPATCH MILESTONE
                    </span>
                  )}
                  {(activeStep === 5 || activeStep === 6) && (
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      PARALLEL CO-EXECUTION
                    </span>
                  )}
                </div>

                <h3 className="text-2xl sm:text-3xl font-bold text-white">
                  {activeStep === 1 && '1. A suspected road accident is detected'}
                  {activeStep === 2 && "2. Incident evidence and details are delivered to responders"}
                  {activeStep === 3 && '3. The incident is promptly verified by authorized personnel'}
                  {activeStep === 4 && '4. Immediately after verification, ambulance dispatch begins without delay'}
                  {activeStep === 5 && '5. Incident details stream simultaneously to police and hospital teams'}
                  {activeStep === 6 && '6. Ambulance travels towards incident while police coordinate green corridors'}
                  {activeStep === 7 && '7. Ambulance crew assesses patient and initiates transport'}
                  {activeStep === 8 && '8. Hospital receives patient and completes immediate handover'}
                </h3>

                <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                  {activeStep === 1 &&
                    'Roadside surveillance cameras equipped with motion heuristic analysis detect sudden abnormal deceleration and impact trajectories, generating a suspected incident flag with timestamped coordinates.'}
                  {activeStep === 2 &&
                    'Four high-resolution sequential video frames captured six seconds apart are securely uploaded to the system to provide visual telemetry and prevent blind dispatches.'}
                  {activeStep === 3 &&
                    'To protect public resources against automated false positives, authorized responders review evidence frames and verify the incident status in one click.'}
                  {activeStep === 4 &&
                    'The system does not wait for bureaucratic delays. Immediately following verification, an automated ranking engine scores available fleet units by simulated ETA and tenders the offer to the closest ambulance.'}
                  {activeStep === 5 &&
                    'Simultaneously, complete incident telemetry is routed to the police department dashboard—including accident location, estimated impact severity, assigned ambulance unit, and target hospital corridor.'}
                  {activeStep === 6 &&
                    'As the ambulance drives along its calculated route, police clear traffic junctions and coordinate arrival protocols with the receiving medical center.'}
                  {activeStep === 7 &&
                    'Upon arrival at the scene, paramedics perform clinical triage (patient count, severity, ALS/BLS needs), enabling the algorithm to recommend the optimal receiving hospital based on live ICU bed capacity.'}
                  {activeStep === 8 &&
                    'The ambulance arrives at a fully pre-alerted emergency bay where doctors, blood supplies, and diagnostic equipment are already staged—protecting the Golden Time.'}
                </p>

                {/* Important Real-World Protocol Disclaimer */}
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-slate-400 flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Protocol Note:</strong> The system does not suggest that police paperwork, hospital formalities, or dashboard acknowledgements must be completed before the ambulance can leave or the patient can receive urgent medical care. Real-world procedures remain subject to applicable emergency protocols.
                  </span>
                </div>
              </div>

              {/* Right Side Step Controls / Preview */}
              <div className="lg:col-span-4 space-y-4">
                <div className="p-5 rounded-2xl bg-slate-950/80 border border-white/10 space-y-3">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Stakeholder Actions at this Step
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/5 flex items-center justify-between">
                      <span className="text-slate-300 font-medium">Ambulance Unit</span>
                      <span className="text-cyan-400 font-mono">
                        {activeStep < 4 ? 'Standby' : activeStep < 7 ? 'En Route Scene' : 'Patient Transport'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/5 flex items-center justify-between">
                      <span className="text-slate-300 font-medium">Police Command</span>
                      <span className="text-blue-400 font-mono">
                        {activeStep < 5 ? 'Awaiting Alert' : 'Active Traffic Sync'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/5 flex items-center justify-between">
                      <span className="text-slate-300 font-medium">Receiving Hospital</span>
                      <span className="text-emerald-400 font-mono">
                        {activeStep < 5 ? 'Standard Standby' : activeStep < 8 ? 'Staging Trauma Bay' : 'Handover Complete'}
                      </span>
                    </div>
                  </div>

                  {/* Navigation buttons */}
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      disabled={activeStep === 1}
                      onClick={() => setActiveStep(prev => Math.max(1, prev - 1))}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 disabled:opacity-30 transition cursor-pointer"
                    >
                      Previous Step
                    </button>
                    <button
                      type="button"
                      disabled={activeStep === 8}
                      onClick={() => setActiveStep(prev => Math.min(8, prev + 1))}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-30 transition cursor-pointer"
                    >
                      Next Step
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------- Section 8: Behind Every Alert Is a Human Life ----------------- */}
      <section id="mission" className="py-24 bg-[#09112a] border-y border-white/5 relative overflow-hidden">
        {/* Ambient Heartbeat Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-rose-500/5 rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold tracking-wide">
            <Heart className="w-4 h-4 text-rose-400 animate-heartbeat" />
            <span>THE HUMAN PURPOSE</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            “Behind Every Alert Is a Human Life.”
          </h2>

          <p className="text-xl sm:text-2xl text-slate-200 leading-relaxed max-w-3xl mx-auto font-light">
            “An emergency is more than an incident on a screen. It is a person who needs help, a family waiting for news, a responder racing against time, and a medical team preparing to care. ResQRoute AI is designed around one purpose: helping these people work together when every moment matters.”
          </p>

          {/* Compassionate Perspectives Carousel / Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 text-left">
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-red-500/20 grid place-items-center text-red-400">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Paramedic Fleet</div>
                  <div className="text-[10px] text-slate-400">On The Road</div>
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed italic">
                “Knowing the receiving hospital is already staging beds before we even arrive lets us focus completely on keeping the patient stable.”
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-500/20 grid place-items-center text-emerald-400">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Emergency Trauma Surgeon</div>
                  <div className="text-[10px] text-slate-400">Receiving Hospital</div>
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed italic">
                “Having 10 minutes of advance notice to prepare the surgical theater changes the entire outcome compared to wheeling in unannounced.”
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-500/20 grid place-items-center text-blue-400">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Traffic Control Officer</div>
                  <div className="text-[10px] text-slate-400">Police Division</div>
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed italic">
                “Clear communication means we can secure the scene, divert rush-hour congestion, and keep the ambulance corridor moving smoothly.”
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------- Section 9: Dedicated Role Portals Showcase ----------------- */}
      <section id="portals" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-cyan-400 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20">
              Stakeholder Architecture
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              Unified Portals for Every Emergency Stakeholder
            </h2>
            <p className="text-slate-300 text-lg leading-relaxed">
              Log in directly as any persona to explore specialized views crafted for citizens, hospitals, law enforcement, dispatchers, and ambulance drivers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {PORTAL_ROLES.map(role => {
              const Icon = role.icon
              return (
                <div
                  key={role.id}
                  className="glass-card rounded-3xl p-7 space-y-5 flex flex-col justify-between group hover:border-cyan-500/40 transition-all duration-300"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${role.color} border grid place-items-center shadow-lg group-hover:scale-110 transition-transform`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/5 text-slate-300 border border-white/10">
                        {role.badge}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-xl font-bold text-white group-hover:text-cyan-300 transition-colors">
                        {role.label}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">{role.subtitle}</p>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      {role.desc}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                    <div className="text-[11px] font-mono text-slate-400">
                      ID: <span className="text-slate-200">{role.u}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openPortalRegister(role.id)}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 transition cursor-pointer"
                        title={`Register as new ${role.label}`}
                      >
                        <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Register</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openPortalLogin(role.id)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <span>Sign In</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Quick Demo Exploration Card for Hackathon Judges */}
            <div className="glass-card rounded-3xl p-7 space-y-5 flex flex-col justify-between bg-gradient-to-br from-cyan-950/40 via-blue-950/20 to-slate-900 border-cyan-500/30">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 grid place-items-center">
                    <Sparkles className="w-6 h-6 animate-pulse" />
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    Jury & Evaluation
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Full Operations Center</h3>
                  <p className="text-xs text-cyan-300/80 mt-0.5">Instant One-Click Entry</p>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Evaluate the full system immediately as Central Dispatch Administrator. Access camera monitoring, incident verification, live map routing, and tracking.
                </p>
              </div>

              <button
                type="button"
                onClick={handlePrimaryCta}
                className="w-full py-3 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-blue-600 via-cyan-600 to-cyan-500 hover:brightness-110 text-white shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <span>Launch Operations Center</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------- Section 10: Final Call to Action ----------------- */}
      <section className="py-24 bg-[#09112a] border-t border-white/5 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8 relative z-10">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white grid place-items-center mx-auto shadow-xl shadow-cyan-500/25 border border-cyan-400/30">
            <Siren className="w-8 h-8" />
          </div>

          <div className="space-y-3">
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              A faster response starts with better coordination.
            </h2>
            <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto font-normal">
              Discover how ResQRoute AI brings emergency response and hospital preparedness closer together.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handlePrimaryCta}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl font-bold text-base bg-gradient-to-r from-blue-600 via-cyan-600 to-cyan-500 hover:brightness-110 text-white shadow-xl shadow-cyan-500/25 hover:shadow-cyan-500/40 active:scale-[0.98] transition flex items-center justify-center gap-3 cursor-pointer"
            >
              <Activity className="w-5 h-5 text-cyan-200" />
              <span>Launch Operations Center</span>
            </button>

            <button
              onClick={() => openPortalLogin('driver')}
              className="w-full sm:w-auto px-7 py-4 rounded-2xl font-semibold text-base bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border border-white/10 hover:border-white/20 active:scale-[0.98] transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Truck className="w-5 h-5 text-slate-400" />
              <span>Ambulance Driver Portal</span>
            </button>
          </div>
        </div>
      </section>

      {/* ----------------- Footer ----------------- */}
      <footer className="bg-[#050b1a] border-t border-white/10 py-12 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="ResQRoute AI"
                className="w-10 h-10 rounded-xl object-contain shadow-md shadow-cyan-500/20 border border-cyan-500/30 shrink-0"
              />
              <div>
                <span className="text-base font-bold text-white">ResQRoute AI</span>
                <p className="text-[11px] text-slate-400">
                  AI-Powered Accident Detection, Police Coordination, Smart Ambulance Dispatch & Hospital Navigation
                </p>
              </div>
            </div>

            <div className="text-left md:text-right">
              <div className="font-semibold text-cyan-300">Detect Faster. Dispatch Smarter. Respond Sooner.</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Connecting Responders · Ambulance Units · Receiving Hospitals
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/5 text-[11px] text-slate-400">
            <span>© 2026 ResQRoute AI Project. Built for advanced AI emergency management.</span>
            <div className="flex items-center gap-6">
              <a href="#mission" className="hover:text-slate-300">Mission</a>
              <a href="#golden-time" className="hover:text-slate-300">The Golden Time</a>
              <a href="#portals" className="hover:text-slate-300">Portals</a>
              <button onClick={() => openPortalLogin('admin')} className="hover:text-slate-300 underline cursor-pointer">
                Authorized Sign In
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* ----------------- Citizen SOS Modal ----------------- */}
      {sosModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#0b1530] border border-red-500/40 rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5 text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-600/20 text-red-400 grid place-items-center border border-red-500/30">
                  <PhoneCall className="w-5 h-5 text-red-400 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Citizen Emergency Quick-Dial</h3>
                  <p className="text-xs text-slate-400">Immediate roadside assistance and public helpline directory</p>
                </div>
              </div>
              <button
                onClick={() => setSosModalOpen(false)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-red-950/30 border border-red-500/30 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-red-300 uppercase">Emergency Ambulance</div>
                  <div className="text-2xl font-black text-white font-mono">108 / 112</div>
                  <div className="text-[11px] text-slate-400">Immediate dispatch & ALS/BLS responder</div>
                </div>
                <a
                  href="tel:108"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30 transition"
                >
                  Call 108
                </a>
              </div>

              <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-500/30 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-blue-300 uppercase">Traffic Police Coordination</div>
                  <div className="text-2xl font-black text-white font-mono">103 / 100</div>
                  <div className="text-[11px] text-slate-400">Corridor clearance & incident perimeter</div>
                </div>
                <a
                  href="tel:103"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition"
                >
                  Call 103
                </a>
              </div>

              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-emerald-300 uppercase">City General Hospital Trauma ER</div>
                  <div className="text-sm font-bold text-white">+91-44-2800-1001</div>
                  <div className="text-[11px] text-slate-400">Trauma Bay & ICU Staging Desk</div>
                </div>
                <button
                  onClick={() => {
                    setSosModalOpen(false)
                    openPortalLogin('citizen')
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30"
                >
                  Citizen Portal
                </button>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 text-center">
              ResQRoute AI prioritizes automated telemetry while keeping direct voice channels open.
            </div>
          </div>
        </div>
      )}

      {/* ----------------- Multi-Role Login Modal ----------------- */}
      {loginModalOpen && (
        <Login
          isModal={true}
          initialRole={selectedLoginRole}
          initialMode={loginModalMode}
          onClose={() => setLoginModalOpen(false)}
          onSuccess={() => {
            setLoginModalOpen(false)
            onEnterDashboard()
          }}
        />
      )}
    </div>
  )
}
