import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Camera, ShieldAlert, Map, Ambulance as AmbIcon, Truck,
  Building2, Route, History, Settings as SettingsIcon, LogOut, Wifi, WifiOff,
  Siren, ArrowLeft, Home as HomeIcon, Shield, Users, Volume2, VolumeX,
  PhoneCall, PhoneOff, AlertTriangle, ChevronRight, Activity, Bell, Sparkles, LifeBuoy
} from 'lucide-react'
import { AppProvider, useApp } from './lib/store'
import { Toasts, Alert, Btn } from './components/ui'
import { sound } from './lib/audio'
import Home from './pages/Home'
import Overview from './pages/Overview'
import CameraPage from './pages/CameraPage'
import Incidents from './pages/Incidents'
import LiveMap from './pages/LiveMap'
import Ambulances from './pages/Ambulances'
import Driver from './pages/Driver'
import Hospitals from './pages/Hospitals'
import Tracking from './pages/Tracking'
import HistoryPage from './pages/HistoryPage'
import SettingsPage from './pages/SettingsPage'

interface NavItem {
  id: string
  label: string
  icon: any
  roles: string[]
  group: 'Command & AI' | 'Fleet & Critical Care' | 'Intelligence & Audit'
}

const NAV: NavItem[] = [
  { id: 'overview', label: 'Command Overview', icon: LayoutDashboard, roles: ['admin', 'hospital', 'police'], group: 'Command & AI' },
  { id: 'camera', label: 'AI Surveillance', icon: Camera, roles: ['admin'], group: 'Command & AI' },
  { id: 'incidents', label: 'Incidents & Verification', icon: ShieldAlert, roles: ['admin', 'police'], group: 'Command & AI' },
  { id: 'map', label: 'Live Tactical Map', icon: Map, roles: ['admin', 'driver', 'hospital', 'police', 'citizen'], group: 'Command & AI' },

  { id: 'ambulances', label: 'Ambulance Fleet', icon: AmbIcon, roles: ['admin', 'police'], group: 'Fleet & Critical Care' },
  { id: 'driver', label: 'Paramedic Cockpit', icon: Truck, roles: ['driver'], group: 'Fleet & Critical Care' },
  { id: 'hospitals', label: 'Hospital Network & Beds', icon: Building2, roles: ['admin', 'hospital', 'citizen'], group: 'Fleet & Critical Care' },

  { id: 'tracking', label: 'Response Tracking', icon: Route, roles: ['admin', 'hospital', 'police', 'citizen'], group: 'Intelligence & Audit' },
  { id: 'history', label: 'Audit & Incident Logs', icon: History, roles: ['admin', 'driver', 'hospital', 'police'], group: 'Intelligence & Audit' },
  { id: 'settings', label: 'Settings & Audio', icon: SettingsIcon, roles: ['admin', 'driver', 'hospital', 'police', 'citizen'], group: 'Intelligence & Audit' },
]

const ROLE_BADGE: Record<string, { label: string; style: string }> = {
  admin: { label: 'Chief Dispatcher', style: 'bg-gradient-to-r from-red-500/20 to-cyan-500/20 text-cyan-300 border-cyan-500/30' },
  driver: { label: 'Paramedic Unit', style: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  hospital: { label: 'Trauma Center Staff', style: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  police: { label: 'Traffic Police Inspector', style: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  citizen: { label: 'Citizen Responder', style: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
}

function Shell() {
  const { user, logout, connected, error, incidents, ambulances, push } = useApp()
  const [view, setView] = useState<'home' | 'dashboard'>('home')
  const [muted, setMuted] = useState(sound.isMuted)
  const [callAlertSilenced, setCallAlertSilenced] = useState(false)

  const items = NAV.filter(n => user && n.roles.includes(user.role))
  const [page, setPage] = useState(() => items[0]?.id ?? 'map')

  const handleEnterDashboard = (targetPage?: string) => {
    if (targetPage) setPage(targetPage)
    setView('dashboard')
  }

  const pending = incidents.filter(i => i.status === 'suspected').length
  const myOffers =
    user?.role === 'driver'
      ? incidents.filter(i => i.assignments.some(a => a.status === 'offered' && a.ambulance_id === user.ambulance_id)).length
      : 0
  const myAmb = ambulances.find(a => a.id === user?.ambulance_id)

  // Emergency audible call alert when an accident occurs that requires verification
  useEffect(() => {
    if ((user?.role === 'admin' || user?.role === 'police') && pending > 0 && !callAlertSilenced && !muted) {
      sound.startIncomingCallRing()
    } else if (user?.role !== 'driver') {
      sound.stopIncomingCallRing()
    }
  }, [pending, callAlertSilenced, muted, user?.role])

  const handleToggleMute = () => {
    const isMuted = sound.toggleMute()
    setMuted(isMuted)
  }

  const handleSilenceCallAlert = () => {
    setCallAlertSilenced(true)
    sound.stopIncomingCallRing()
  }

  // If user is on home view, render Home page
  if (view === 'home' || !user) {
    return (
      <>
        <Home onEnterDashboard={handleEnterDashboard} />
        <Toasts />
      </>
    )
  }

  const activeItem = NAV.find(n => n.id === page)
  const roleInfo = ROLE_BADGE[user.role] ?? { label: user.role, style: 'bg-slate-800 text-slate-300 border-white/10' }

  const groups: Array<'Command & AI' | 'Fleet & Critical Care' | 'Intelligence & Audit'> = [
    'Command & AI',
    'Fleet & Critical Care',
    'Intelligence & Audit'
  ]

  return (
    <div className="flex h-screen overflow-hidden bg-[#070e22] text-slate-100 font-sans select-none">
      {/* Sleek Dark Sidebar Navigation */}
      <aside className="w-72 bg-[#091129] border-r border-white/10 flex flex-col shrink-0">
        {/* Brand Header */}
        <div className="px-5 py-4.5 flex items-center gap-3 border-b border-white/10 bg-white/[0.01]">
          <img
            src="/logo.png"
            alt="ResQRoute AI"
            className="w-10 h-10 rounded-xl object-contain shadow-lg shadow-cyan-500/25 border border-cyan-500/30 shrink-0"
          />
          <div className="min-w-0">
            <div className="font-extrabold text-white text-base tracking-tight leading-none flex items-center gap-1.5">
              <span>ResQRoute</span>
              <span className="text-cyan-400 font-mono text-xs bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-500/30">AI</span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono tracking-widest mt-1">OPERATIONS GRID</div>
          </div>
        </div>

        {/* Public Homepage CTA */}
        <div className="p-3 border-b border-white/5 bg-white/[0.01]">
          <button
            onClick={() => setView('home')}
            className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/[0.04] hover:bg-white/[0.08] text-cyan-300 border border-cyan-500/20 hover:border-cyan-500/40 transition cursor-pointer group"
          >
            <span className="flex items-center gap-2">
              <HomeIcon className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition" />
              <span>Public Homepage</span>
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-cyan-400 group-hover:translate-x-0.5 transition" />
          </button>
        </div>

        {/* Categorized Menu Items */}
        <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto">
          {groups.map(grp => {
            const grpItems = items.filter(n => n.group === grp)
            if (!grpItems.length) return null
            return (
              <div key={grp} className="space-y-1">
                <div className="px-3 text-[10px] font-mono tracking-wider text-slate-400 uppercase font-semibold">
                  {grp}
                </div>
                <div className="space-y-0.5">
                  {grpItems.map(n => {
                    const badge = n.id === 'incidents' ? pending : n.id === 'driver' ? myOffers : 0
                    const active = page === n.id
                    return (
                      <button
                        key={n.id}
                        onClick={() => setPage(n.id)}
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer text-left ${
                          active
                            ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-cyan-500/20 font-semibold'
                            : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
                        }`}
                      >
                        <n.icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-slate-400'}`} />
                        <span className="flex-1 truncate">{n.label}</span>
                        {badge > 0 && (
                          <span className="bg-red-500 text-white text-[11px] font-bold rounded-full px-2 py-0.5 animate-pulse shadow-md shadow-red-500/40">
                            {badge}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </nav>

        {/* Footer Identity & Logout */}
        <div className="p-3.5 border-t border-white/10 space-y-2.5 bg-[#060c20]">
          <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-white truncate">{user.name}</span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${roleInfo.style}`}>
                {roleInfo.label}
              </span>
            </div>
            {myAmb && (
              <div className="text-[11px] text-cyan-300 font-mono">
                Assigned Unit: <span className="font-bold text-white">{myAmb.code}</span> ({myAmb.crew_level})
              </div>
            )}
          </div>

          <button
            onClick={() => {
              logout()
              setView('home')
            }}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-red-500/10 hover:border-red-500/20 border border-transparent transition text-xs font-medium cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-slate-400" />
            <span>Sign Out of Portal</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area with Header */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Operations Header Bar */}
        <header className="h-16 px-6 bg-[#091129]/90 backdrop-blur-md border-b border-white/10 flex items-center justify-between shrink-0 z-20">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <span className="text-slate-400 hidden sm:inline">Operations</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
            <span className="text-white font-semibold flex items-center gap-1.5">
              {activeItem && <activeItem.icon className="w-4 h-4 text-cyan-400" />}
              <span>{activeItem?.label ?? 'Dashboard'}</span>
            </span>
          </div>

          {/* Right Header Status Controls */}
          <div className="flex items-center gap-3">
            {/* Live Telemetry Ping */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs font-mono">
              {connected ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span className="text-emerald-400">WS Live Telemetry</span>
                </>
              ) : (
                <>
                  <span className="inline-flex rounded-full h-2 w-2 bg-amber-500 animate-pulse" />
                  <span className="text-amber-400">Reconnecting…</span>
                </>
              )}
            </div>

            {/* Audio Siren Mute/Unmute */}
            <button
              onClick={handleToggleMute}
              title={muted ? 'Unmute Emergency Siren & Ring' : 'Mute Emergency Audio'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition cursor-pointer ${
                muted
                  ? 'bg-red-950/40 border-red-500/30 text-rose-300 hover:bg-red-900/50'
                  : 'bg-cyan-950/40 border-cyan-500/30 text-cyan-300 hover:bg-cyan-900/50'
              }`}
            >
              {muted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
              <span className="hidden sm:inline">{muted ? 'Siren Muted' : 'Siren ON'}</span>
            </button>

            {/* Incident Alert Badge (Quick jump) */}
            {pending > 0 && (
              <button
                onClick={() => setPage('incidents')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600/90 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/30 border border-red-400 animate-pulse transition cursor-pointer"
              >
                <PhoneCall className="w-3.5 h-3.5 animate-bounce" />
                <span>{pending} Incident Call{pending > 1 ? 's' : ''}</span>
              </button>
            )}
          </div>
        </header>

        {/* Incoming Accident Call Banner for Dispatchers */}
        {(user.role === 'admin' || user.role === 'police') && pending > 0 && !callAlertSilenced && (
          <div className="bg-gradient-to-r from-red-950/90 via-rose-900/90 to-red-950/90 border-b border-red-500/40 px-6 py-3 flex items-center justify-between text-xs sm:text-sm text-red-100 shadow-xl z-10 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-600 grid place-items-center text-white shrink-0 shadow-md shadow-red-500/50">
                <PhoneCall className="w-4 h-4 animate-spin" />
              </div>
              <div>
                <div className="font-bold text-white flex items-center gap-2">
                  <span>EMERGENCY ACCIDENT CALL — VERIFICATION REQUIRED</span>
                  <span className="bg-red-500 text-white text-[10px] font-mono px-2 py-0.5 rounded-full uppercase">Priority 1</span>
                </div>
                <div className="text-red-200 text-xs mt-0.5">
                  AI camera optical heuristics detected {pending} suspected accident collision. Audio siren is sounding until reviewed.
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setPage('incidents')
                  handleSilenceCallAlert()
                }}
                className="px-3 py-1.5 bg-white text-red-950 rounded-lg font-bold text-xs hover:bg-red-50 transition cursor-pointer shadow"
              >
                Review & Confirm
              </button>
              <button
                onClick={handleSilenceCallAlert}
                className="px-2.5 py-1.5 bg-red-900/60 hover:bg-red-800 text-red-200 rounded-lg text-xs transition cursor-pointer border border-red-500/30"
              >
                Silence Siren
              </button>
            </div>
          </div>
        )}

        {/* Main View Scroll Area */}
        <main className="flex-1 overflow-y-auto p-6 bg-[#070e22] text-slate-100 min-h-0">
          {error && (
            <div className="mb-4">
              <Alert kind="error">
                Backend connectivity notice: {error}. Please ensure the backend server is running on port 8000.
              </Alert>
            </div>
          )}

          {page === 'overview' && <Overview go={setPage} />}
          {user.role === 'admin' && (
            <div className={page === 'camera' ? '' : 'hidden'}>
              <CameraPage />
            </div>
          )}
          {page === 'incidents' && <Incidents />}
          {page === 'map' && <LiveMap />}
          {page === 'ambulances' && <Ambulances />}
          {page === 'driver' && <Driver />}
          {page === 'hospitals' && <Hospitals />}
          {page === 'tracking' && <Tracking />}
          {page === 'history' && <HistoryPage />}
          {page === 'settings' && <SettingsPage />}
        </main>
      </div>

      <Toasts />
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  )
}
