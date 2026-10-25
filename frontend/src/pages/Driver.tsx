import { useState, useEffect, useRef } from 'react'
import {
  MapPin, Navigation, Flag, Hospital as HIcon, CheckCircle2,
  FastForward, PhoneCall, PhoneOff, Volume2, VolumeX, ShieldAlert,
  Clock, Power, AlertTriangle, Eye, Layers, Activity
} from 'lucide-react'
import { useApp } from '../lib/store'
import { Card, Badge, Btn, Empty, Alert, useAct, SystemNote } from '../components/ui'
import MapView from '../components/MapView'
import { routesFor } from '../components/RouteHelpers'
import { api, Incident } from '../lib/api'
import { sound } from '../lib/audio'

const NEEDS = ['trauma', 'icu', 'neuro', 'pediatric', 'burns']

function Assess({ aid }: { aid: number }) {
  const act = useAct()
  const [sev, setSev] = useState('moderate')
  const [pat, setPat] = useState(1)
  const [needs, setNeeds] = useState<string[]>([])
  const [notes, setNotes] = useState('')

  return (
    <Card title="Patient & Crew Assessment">
      <div className="space-y-4 text-sm">
        <div>
          <label className="text-xs font-semibold text-slate-300 uppercase block mb-1.5">
            Incident Severity
          </label>
          <div className="flex gap-2">
            {['minor', 'moderate', 'critical'].map(s => (
              <Btn
                key={s}
                v={sev === s ? (s === 'critical' ? 'danger' : 'primary') : 'ghost'}
                onClick={() => setSev(s)}
                className="capitalize"
              >
                {s}
              </Btn>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <label className="text-xs font-semibold text-slate-300 uppercase">Patient Count</label>
          <input
            type="number"
            min={1}
            max={10}
            value={pat}
            onChange={e => setPat(Math.max(1, +e.target.value))}
            className="bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 w-24 text-white text-center font-bold"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-300 uppercase block mb-1.5">
            Specialized Care Required
          </label>
          <div className="flex gap-2 flex-wrap">
            {NEEDS.map(n => {
              const checked = needs.includes(n)
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNeeds(checked ? needs.filter(x => x !== n) : [...needs, n])}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer capitalize ${
                    checked
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  {n}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-300 uppercase block mb-1.5">
            Paramedic Clinical Notes
          </label>
          <textarea
            className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-sm"
            rows={2}
            placeholder="Describe injuries, vitals, or scene hazards..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        <Btn
          className="w-full py-2.5"
          onClick={() =>
            act(
              () => api.post(`/api/assignments/${aid}/assessment`, { severity: sev, patients: pat, needs, notes }),
              'Assessment submitted. Recommendation calculated.'
            )
          }
        >
          Submit Clinical Assessment
        </Btn>
      </div>
    </Card>
  )
}

function Active({ inc }: { inc: Incident }) {
  const { ambulances, hospitals, tracking, user } = useApp()
  const act = useAct()
  const a = inc.assignments.find(x =>
    ['offered', 'en_route', 'on_scene', 'transporting', 'at_hospital'].includes(x.status)
  )!
  const eta = tracking[inc.id]?.remaining_eta ?? a.remaining_eta ?? 0
  const route = ['offered', 'en_route'].includes(a.status) ? a.scene_route : a.hospital_route
  const hosp = hospitals.find(h => h.id === inc.selected_hospital_id)
  const post = (p: string, ok: string) => act(() => api.post(`/api/assignments/${a.id}/${p}`), ok)

  // Driver isolation: only show this driver's ambulance on map
  const myAmbulances = ambulances.filter(amb => amb.id === user?.ambulance_id)

  return (
    <div className="grid xl:grid-cols-3 gap-5">
      <div className="xl:col-span-2 rounded-2xl overflow-hidden border border-white/10">
        <MapView
          ambulances={myAmbulances.length ? myAmbulances : ambulances}
          hospitals={hospitals}
          incidents={[inc]}
          focusIncident={inc}
          routes={routesFor(inc)}
          height={480}
        />
      </div>

      <div className="space-y-4">
        <Card title={`Active Incident #${inc.id}`} right={<Badge s={a.status} />}>
          <div className="space-y-3 text-sm">
            <div className="flex gap-2">
              <MapPin className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-white text-base">{inc.location_name}</div>
                {inc.priority === 'critical' && (
                  <span className="text-xs font-bold text-red-400 bg-red-500/20 px-2 py-0.5 rounded border border-red-500/30">
                    CRITICAL PRIORITY
                  </span>
                )}
              </div>
            </div>

            {route && (
              <div className="p-3 rounded-xl bg-slate-900/80 border border-white/10 space-y-1">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Target Route Distance</span>
                  <span className="font-bold text-white">{route.distance_km} km</span>
                </div>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Estimated Arrival ETA</span>
                  <span className="font-bold text-cyan-400 font-mono text-sm">
                    {Number(eta).toFixed(1)} min
                  </span>
                </div>
              </div>
            )}

            {/* Police Green Corridor Status */}
            <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
              inc.green_corridor
                ? 'bg-blue-950/40 border-blue-500/40 text-blue-200'
                : 'bg-white/[0.02] border-white/10 text-slate-400'
            }`}>
              <span className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${inc.green_corridor ? 'bg-blue-400 animate-ping' : 'bg-slate-500'}`} />
                <span className="font-semibold">
                  {inc.green_corridor ? '🚔 Green Corridor Traffic Preemption: ACTIVE' : 'Traffic Corridor: Standard'}
                </span>
              </span>
              <span className="text-[10px] font-mono text-blue-300">Police Coordinated</span>
            </div>

            {a.status === 'en_route' && (
              <p className="text-xs text-cyan-300 font-medium">
                {a.leg_complete ? '✅ Arrived at accident location.' : 'Ambulance is actively traveling…'}
              </p>
            )}

            {inc.evidence.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-slate-400 mb-1.5 flex justify-between items-center">
                  <span>6-Frame Collision Evidence (3s intervals)</span>
                  <span className="text-[10px] text-cyan-400 font-mono">{inc.evidence.length} frames</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {inc.evidence.slice(0, 6).map((e, idx) => (
                    <div key={e.id} className="relative group">
                      <img src={e.url} className="rounded-lg border border-white/10 aspect-video object-cover" />
                      <span className="absolute bottom-0.5 right-0.5 bg-black/70 text-[9px] px-1 rounded text-white font-mono">
                        #{idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        {a.status === 'en_route' && (
          <Card title="Scene Arrival Confirmation">
            <div className="space-y-2.5">
              <Btn
                className="w-full py-2.5"
                disabled={!a.leg_complete}
                onClick={() => post('arrive-scene', 'Arrival at scene recorded')}
              >
                <Flag className="w-4 h-4" />
                <span>Mark Arrival at Scene</span>
              </Btn>
              {!a.leg_complete && (
                <Btn
                  v="ghost"
                  className="w-full"
                  onClick={() => post('simulate/skip', 'Fast-forwarded to scene')}
                >
                  <FastForward className="w-4 h-4 text-cyan-400" />
                  <span>Fast-Forward Travel (Simulation)</span>
                </Btn>
              )}
            </div>
          </Card>
        )}

        {a.status === 'on_scene' && !inc.assessment && <Assess aid={a.id} />}

        {a.status === 'on_scene' && inc.assessment && (
          <Card title="Assigned Receiving Hospital">
            {hosp ? (
              <div className="text-sm space-y-3">
                <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
                  <div className="font-bold text-white text-base">{hosp.name}</div>
                  <div className="text-xs text-emerald-300 mt-0.5">
                    {inc.recommended_hospital_id === hosp.id
                      ? 'Recommended by AI Bed Capacity Engine'
                      : 'Assigned by Dispatch Controller'}
                  </div>
                  {hosp.phone && (
                    <div className="text-xs text-slate-300 mt-2 flex items-center gap-1.5">
                      <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Trauma Desk: {hosp.phone}</span>
                    </div>
                  )}
                </div>

                {a.hospital_route && (
                  <div className="text-xs text-slate-400 flex justify-between">
                    <span>Hospital Route: {a.hospital_route.distance_km} km</span>
                    <span className="font-mono text-cyan-300 font-bold">ETA: {a.hospital_route.eta_min} min</span>
                  </div>
                )}

                <Btn
                  className="w-full py-2.5"
                  onClick={() => post('start-hospital-route', 'Hospital route initiated')}
                >
                  <Navigation className="w-4 h-4" />
                  <span>Start Hospital Route</span>
                </Btn>
              </div>
            ) : (
              <Alert kind="error">
                {inc.hospital_warning ?? 'No hospital selected yet.'} Awaiting destination choice.
              </Alert>
            )}
          </Card>
        )}

        {a.status === 'transporting' && (
          <Card title="En Route to Hospital">
            <div className="space-y-3 text-sm">
              <p className="text-slate-300">
                Transporting patient to <b className="text-white">{hosp?.name}</b> —{' '}
                {a.leg_complete ? (
                  <span className="text-emerald-400 font-bold">Arrived at ER Bay</span>
                ) : (
                  <span className="text-cyan-400 font-mono">Traveling along designated route…</span>
                )}
              </p>

              <Btn
                className="w-full py-2.5"
                disabled={!a.leg_complete}
                onClick={() => post('arrive-hospital', 'Arrival at hospital recorded')}
              >
                <HIcon className="w-4 h-4" />
                <span>Mark Arrival at Emergency Bay</span>
              </Btn>

              {!a.leg_complete && (
                <Btn
                  v="ghost"
                  className="w-full"
                  onClick={() => post('simulate/skip', 'Fast-forwarded to hospital')}
                >
                  <FastForward className="w-4 h-4 text-cyan-400" />
                  <span>Fast-Forward Travel (Simulation)</span>
                </Btn>
              )}
            </div>
          </Card>
        )}

        {a.status === 'at_hospital' && (
          <Card title="Patient Handover Protocol">
            <div className="space-y-3">
              <p className="text-xs text-slate-300 leading-relaxed">
                Emergency clinical staff have received patient vitals. Confirm completion of physical handover to close the incident and return ambulance to available status.
              </p>
              <Btn
                v="success"
                className="w-full py-2.5"
                onClick={() => post('complete', 'Handover complete — incident closed')}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Complete Patient Handover</span>
              </Btn>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

export default function Driver() {
  const { incidents, ambulances, user } = useApp()
  const act = useAct()
  const [muted, setMuted] = useState(sound.isMuted)
  const [countdown, setCountdown] = useState(60)

  // Driver verification state
  const [isAccidentVerified, setIsAccidentVerified] = useState<boolean>(true)
  const [fleetNeeded, setFleetNeeded] = useState<number>(1)
  const [driverNotes, setDriverNotes] = useState<string>('')
  const [zoomUrl, setZoomUrl] = useState<string | null>(null)

  // Driver Isolation: find this driver's unit only
  const me = ambulances.find(a => a.id === user?.ambulance_id)
  const mine = incidents.flatMap(i =>
    i.assignments.filter(a => a.ambulance_id === user?.ambulance_id).map(a => ({ i, a }))
  )
  const offer = mine.find(x => x.a.status === 'offered')
  const active = mine.find(x => ['en_route', 'on_scene', 'transporting', 'at_hospital'].includes(x.a.status))

  // 60-Second Auto-Forwarding Countdown Timer and Audio Ringtone for Offers
  useEffect(() => {
    if (!offer) {
      sound.stopIncomingCallRing()
      setCountdown(60)
      return
    }

    sound.startIncomingCallRing()
    const offeredTime = offer.a.offered_at ? new Date(offer.a.offered_at).getTime() : Date.now()
    const updateCountdown = () => {
      const elapsedSec = Math.floor((Date.now() - offeredTime) / 1000)
      const remain = Math.max(0, 60 - elapsedSec)
      setCountdown(remain)

      if (remain <= 0) {
        sound.stopIncomingCallRing()
        act(
          () => api.post(`/api/assignments/${offer.a.id}/timeout`),
          '60s expired: Incident auto-forwarded to next nearest ambulance unit'
        )
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => {
      clearInterval(interval)
      sound.stopIncomingCallRing()
    }
  }, [offer?.a.id])

  const handleToggleStatus = async () => {
    if (!me) return
    const nextStatus = me.status === 'available' ? 'busy' : 'available'
    await act(
      () => api.patch(`/api/ambulances/${me.id}`, { status: nextStatus }),
      `Driver status set to ${nextStatus.toUpperCase()}`
    )
  }

  // Primary driver submits verification + ambulance count
  const handlePrimaryVerification = async () => {
    if (!offer) return
    sound.stopIncomingCallRing()
    if (!isAccidentVerified) {
      await act(
        () => api.post(`/api/assignments/${offer.a.id}/verify-and-respond`, {
          verified: false,
          ambulances_needed: 1,
          notes: driverNotes || 'False alarm determined after inspecting 6 camera evidence frames'
        }),
        'Inspection completed: marked as False Alarm.'
      )
      return
    }

    await act(
      () => api.post(`/api/assignments/${offer.a.id}/verify-and-respond`, {
        verified: true,
        ambulances_needed: fleetNeeded,
        notes: driverNotes
      }),
      `Accident verified! ${fleetNeeded} ambulance(s) requested. En route ASAP to scene!`
    )
  }

  // Subsequent (cascade) driver accepts offer
  const handleCascadeAccept = async () => {
    if (!offer) return
    sound.stopIncomingCallRing()
    await act(
      () => api.post(`/api/assignments/${offer.a.id}/respond`, { accept: true }),
      'Cascade dispatch accepted! En route ASAP to multi-casualty accident.'
    )
  }

  const handleDeclineOffer = async () => {
    if (!offer) return
    sound.stopIncomingCallRing()
    await act(
      () => api.post(`/api/assignments/${offer.a.id}/respond`, { accept: false }),
      'Offer declined. Auto-forwarding to next nearest unit.'
    )
  }

  const toggleSound = () => {
    const isNowMuted = sound.toggleMute()
    setMuted(isNowMuted)
  }

  // Multi-Ambulance fleet tracking for the offered incident
  const isPrimary = offer && !offer.i.verified_by
  const activeFleet = offer
    ? offer.i.assignments.filter(asg => ['en_route', 'on_scene', 'transporting', 'at_hospital'].includes(asg.status))
    : []
  const reqFleet = offer?.i.required_ambulances || 1

  return (
    <div className="space-y-6 text-slate-100">
      {/* Driver Header & Availability Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#0b1739]/90 border border-white/10 shadow-xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-white tracking-tight">Driver Paramedic Console</h1>
            {me && (
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {me.code}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Unit: {me?.driver_name ?? user?.name} · Crew: {me?.crew_level ?? 'ALS'}
          </p>
        </div>

        {/* Status Toggle Switch */}
        {me && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleToggleStatus}
              disabled={!!active}
              title={active ? 'Cannot change status during an active assignment' : 'Click to toggle availability'}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2.5 transition shadow-lg cursor-pointer ${
                me.status === 'available'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 ring-2 ring-emerald-500/20'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
              } ${active ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`w-3 h-3 rounded-full ${
                  me.status === 'available' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                }`}
              />
              <span>
                {me.status === 'available' ? 'DUTY STATUS: AVAILABLE (READY)' : 'DUTY STATUS: BUSY / OFF-DUTY'}
              </span>
              <Power className="w-3.5 h-3.5 opacity-60" />
            </button>

            {/* Sound Mute Toggle */}
            <button
              onClick={toggleSound}
              className={`p-2.5 rounded-xl border transition ${
                muted
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  : 'bg-white/5 border-white/10 text-cyan-400 hover:bg-white/10'
              }`}
              title={muted ? 'Unmute Emergency Siren Ringtone' : 'Mute Emergency Siren Ringtone'}
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 animate-pulse" />}
            </button>
          </div>
        )}
      </div>

      {/* Unavailable Warning */}
      {me && me.status !== 'available' && !active && !offer && (
        <Alert kind="warn">
          Your ambulance is currently <b>{me.status.toUpperCase()}</b>. Toggle your duty status to{' '}
          <b>AVAILABLE (READY)</b> above to receive real-time incident dispatches.
        </Alert>
      )}

      {/* 🚨 INCOMING EMERGENCY CALL ALERT & PARAMEDIC VERIFICATION MODAL */}
      {offer && (
        <div className="p-6 rounded-3xl bg-gradient-to-r from-red-950/70 via-[#0b1739] to-amber-950/50 border-2 border-red-500/60 shadow-2xl relative overflow-hidden">
          {/* Top Header: Countdown & Call Type */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-red-600/30 grid place-items-center text-red-400 border border-red-500/40 animate-bounce">
                <PhoneCall className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs font-black tracking-wider text-red-400 uppercase flex items-center gap-2">
                  <span>EMERGENCY DISPATCH CALL</span>
                  <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-mono">PRIORITY 1</span>
                </div>
                <div className="text-xl font-bold text-white mt-0.5">
                  {offer.i.location_name}
                </div>
              </div>
            </div>

            {/* 60s Countdown Timer */}
            <div className="flex items-center gap-3 bg-slate-950/80 px-4 py-2 rounded-xl border border-red-500/40">
              <Clock className="w-5 h-5 text-amber-400 animate-spin" />
              <div>
                <div className="text-[10px] font-mono uppercase text-slate-400">Response Window</div>
                <div className="text-xl font-black text-white font-mono leading-none">
                  {countdown}s <span className="text-xs text-amber-300 font-normal">Remaining</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-12 gap-6 pt-5">
            {/* Left Column: 6 Captured Evidence Screenshots (3s Interval) */}
            <div className="lg:col-span-6 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-amber-300 flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-amber-400" />
                  <span>6 Optical Surveillance Frames (3s Interval)</span>
                </span>
                <span className="text-[11px] text-slate-400 font-mono">Click to enlarge</span>
              </div>

              {offer.i.evidence.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {offer.i.evidence.slice(0, 6).map((e, idx) => (
                    <div
                      key={e.id}
                      onClick={() => setZoomUrl(e.url)}
                      className="relative rounded-xl overflow-hidden border border-white/15 aspect-video group cursor-pointer hover:border-cyan-400 transition"
                    >
                      <img src={e.url} className="w-full h-full object-cover group-hover:scale-105 transition" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90" />
                      <span className="absolute bottom-1 left-1.5 text-[10px] font-mono text-cyan-300 font-bold">
                        Frame #{idx + 1}
                      </span>
                      <span className="absolute top-1 right-1.5 bg-black/70 text-[9px] font-mono px-1 rounded text-slate-300">
                        +{idx * 3}s
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-xl bg-slate-950/60 border border-white/10 text-center text-xs text-slate-400">
                  Capturing 6 evidence frames from collision sensor…
                </div>
              )}

              {/* Route Summary */}
              {offer.a.scene_route && (
                <div className="p-3 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-slate-300 flex justify-between">
                  <span>Road Route to Scene: <b>{offer.a.scene_route.distance_km} km</b></span>
                  <span className="text-cyan-300 font-mono font-bold">ETA: {offer.a.scene_route.eta_min} min</span>
                </div>
              )}

              {/* AI Detection Telemetry (>80% Level) */}
              <div className="p-2.5 rounded-xl bg-black/60 border border-red-500/30 flex items-center justify-between text-xs font-mono">
                <span className="flex items-center gap-1.5 text-red-300">
                  <Activity className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                  <span>PyTorch ResNet-18 (.pt model)</span>
                </span>
                <span className="text-white font-bold bg-red-600/30 px-2 py-0.5 rounded border border-red-500/40 text-[11px]">
                  CONFIDENCE: {Math.round((offer.i.confidence ?? 0.92) * 100)}% (CROSSES 80% LEVEL)
                </span>
              </div>

              {/* Assigned Nearest Ambulance & Nearest Hospital with Seat Availability */}
              <div className="grid sm:grid-cols-2 gap-2 text-xs">
                {/* Nearest Ambulance Card */}
                <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-cyan-300">
                    <span className="flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
                      <span>NEAREST AMBULANCE</span>
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[10px]">
                      RANK #1
                    </span>
                  </div>
                  <div className="font-extrabold text-white text-sm">
                    {offer.a.ambulance_code || me?.code || 'AMB-01'} (You)
                  </div>
                  <div className="text-[11px] text-slate-300">
                    Dijkstra ETA to scene: <b className="text-cyan-300 font-mono">{offer.a.scene_route?.eta_min ?? '2.8'} min</b> ({offer.a.scene_route?.distance_km ?? '1.9'} km)
                  </div>
                </div>

                {/* Nearest Hospital by Seat Availability Card */}
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-emerald-300">
                    <span className="flex items-center gap-1.5">
                      <HIcon className="w-3.5 h-3.5 text-emerald-400" />
                      <span>ASSIGNED HOSPITAL</span>
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px]">
                      SEAT VERIFIED
                    </span>
                  </div>
                  <div className="font-extrabold text-white text-sm truncate" title={offer.a.hospital_name || offer.i.selected_hospital_name || 'City Central General Hospital'}>
                    {offer.a.hospital_name || offer.i.selected_hospital_name || 'City Central General Hospital'}
                  </div>
                  <div className="text-[11px] text-emerald-300 flex items-center justify-between">
                    <span>Free Beds: <b>{offer.a.hospital_available_beds ?? offer.i.selected_hospital_beds ?? 14} Beds</b></span>
                    <span className="text-slate-400 font-mono">({offer.a.hospital_icu_beds ?? offer.i.selected_hospital_icu ?? 3} ICU)</span>
                  </div>
                  {offer.a.hospital_route && (
                    <div className="text-[10px] text-slate-400">
                      Hospital Route: <b className="text-white">{offer.a.hospital_route.distance_km} km</b> · <b className="text-cyan-300">{offer.a.hospital_route.eta_min} min ETA</b>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Paramedic Verification Form or Cascade Live Feed */}
            <div className="lg:col-span-6 space-y-4">
              {isPrimary ? (
                /* Primary Paramedic Question & Verification Flow */
                <div className="p-4.5 rounded-2xl bg-slate-950/80 border border-cyan-500/30 space-y-4">
                  <div className="border-b border-white/10 pb-2">
                    <div className="text-xs uppercase font-extrabold text-cyan-300 tracking-wider">
                      Paramedic Incident Verification Protocol
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Inspect the 6 frames above and answer verification requirements:
                    </p>
                  </div>

                  {/* Question 1: Accident Verification Choices */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white block">
                      Question 1: Is this a verified collision requiring emergency response?
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setIsAccidentVerified(true)}
                        className={`p-2.5 rounded-xl text-xs font-bold border transition text-left flex items-center gap-2 cursor-pointer ${
                          isAccidentVerified
                            ? 'bg-emerald-500/25 border-emerald-500 text-emerald-200 ring-2 ring-emerald-500/20'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Verified Real Accident (Require Response)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsAccidentVerified(false)}
                        className={`p-2.5 rounded-xl text-xs font-bold border transition text-left flex items-center gap-2 cursor-pointer ${
                          !isAccidentVerified
                            ? 'bg-rose-500/25 border-rose-500 text-rose-200 ring-2 ring-rose-500/20'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        <PhoneOff className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>False Alarm / Minor (Decline & Close)</span>
                      </button>
                    </div>
                  </div>

                  {/* Question 2: How many ambulances are needed? (Only if verified) */}
                  {isAccidentVerified && (
                    <div className="space-y-2 pt-2 border-t border-white/10 animate-fadeIn">
                      <label className="text-xs font-bold text-white block">
                        Question 2: How many ambulances are needed to manage casualties?
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { count: 1, label: '1 Unit', sub: 'Standard' },
                          { count: 2, label: '2 Units', sub: 'Cascade' },
                          { count: 3, label: '3 Units', sub: 'Mass Care' },
                          { count: 4, label: '4+ Units', sub: 'Disaster' },
                        ].map(opt => (
                          <button
                            key={opt.count}
                            type="button"
                            onClick={() => setFleetNeeded(opt.count)}
                            className={`p-2 rounded-xl text-center border transition cursor-pointer ${
                              fleetNeeded === opt.count
                                ? 'bg-cyan-500/30 border-cyan-400 text-white ring-2 ring-cyan-500/30 font-bold'
                                : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                            }`}
                          >
                            <div className="text-sm font-extrabold">{opt.label}</div>
                            <div className="text-[10px] text-cyan-300">{opt.sub}</div>
                          </button>
                        ))}
                      </div>
                      {fleetNeeded > 1 && (
                        <p className="text-[11px] text-cyan-300 italic">
                          ⚡ Automated Cascade Protocol: Dispatch will immediately offer calls to the next {fleetNeeded - 1} nearest ambulance units.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Paramedic Notes */}
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                      Paramedic Observations / Remarks (Optional)
                    </label>
                    <input
                      type="text"
                      value={driverNotes}
                      onChange={e => setDriverNotes(e.target.value)}
                      placeholder="e.g. 2-car impact visible, lane blocked, multiple casualties"
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  {/* Action Submission */}
                  <div className="pt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={handlePrimaryVerification}
                      className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-lg ${
                        isAccidentVerified
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white shadow-emerald-500/25'
                          : 'bg-rose-600 hover:bg-rose-500 text-white'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {isAccidentVerified ? 'VERIFY & RUSH ASAP TO SCENE' : 'DECLINE AS FALSE ALARM'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDeclineOffer}
                      className="px-4 py-3 rounded-xl font-semibold text-xs bg-white/5 hover:bg-white/10 text-slate-400 border border-white/10 cursor-pointer"
                    >
                      Forward Next
                    </button>
                  </div>
                </div>
              ) : (
                /* Subsequent (Cascade) Paramedic Live Feed Card */
                <div className="p-4.5 rounded-2xl bg-slate-950/80 border border-amber-500/40 space-y-4">
                  <div className="border-b border-white/10 pb-2">
                    <div className="text-xs uppercase font-extrabold text-amber-300 tracking-wider flex items-center gap-2">
                      <Layers className="w-4 h-4 text-amber-400" />
                      <span>Multi-Ambulance Casualty Cascade</span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-1">
                      Accident verified by Primary Paramedic: <b className="text-white">{offer.i.verified_by}</b>
                    </p>
                  </div>

                  {/* Live Fleet Requirement Feed */}
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-white/10 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Total Ambulances Needed:</span>
                      <span className="font-extrabold text-white text-sm">{reqFleet} Units</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Accepted & En Route:</span>
                      <span className="font-bold text-emerald-400">{activeFleet.length} / {reqFleet}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Additional Needed:</span>
                      <span className="font-mono font-bold text-cyan-300">
                        {Math.max(0, reqFleet - activeFleet.length)} Unit(s)
                      </span>
                    </div>

                    {/* Active units badges */}
                    <div className="pt-2 border-t border-white/5 flex flex-wrap gap-1.5">
                      {activeFleet.map(asg => (
                        <span key={asg.id} className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {asg.ambulance_code} ({asg.status.replace(/_/g, ' ')})
                        </span>
                      ))}
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                        {me?.code} (Offered - You)
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Casualty volume requires multiple units. Click accept to begin transit to scene immediately.
                  </p>

                  <div className="pt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={handleCascadeAccept}
                      className="flex-1 py-3 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <PhoneCall className="w-4 h-4" />
                      <span>ACCEPT MULTI-UNIT DISPATCH</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDeclineOffer}
                      className="px-4 py-3 rounded-xl font-semibold text-xs bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 cursor-pointer"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Zoom for Evidence Screenshots */}
      {zoomUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setZoomUrl(null)}
        >
          <div className="max-w-4xl w-full bg-[#091129] border border-white/20 rounded-2xl overflow-hidden shadow-2xl p-2">
            <img src={zoomUrl} className="w-full h-auto rounded-xl object-contain max-h-[80vh]" />
            <div className="p-3 text-center text-xs text-slate-300">
              High-resolution collision telemetry frame · Click anywhere to close
            </div>
          </div>
        </div>
      )}

      {/* Active Incident Navigation View */}
      {active && <Active inc={active.i} />}

      {/* Standby State */}
      {!offer && !active && (
        <Card>
          <Empty
            text="No active dispatch assignment"
            hint="Keep your status as AVAILABLE (READY). Emergency dispatch calls and evidence will ring here in real time."
          />
        </Card>
      )}

      <SystemNote />
    </div>
  )
}
