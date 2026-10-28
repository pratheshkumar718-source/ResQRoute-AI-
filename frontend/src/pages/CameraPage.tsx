import { useEffect, useRef, useState } from 'react'
import {
  Video, VideoOff, Play, Square, FlaskConical, Upload, Activity, Cpu,
  ShieldAlert, Zap, Sliders, CheckCircle2, Film, Clapperboard, FolderUp,
  RefreshCw, FileVideo, Sparkles
} from 'lucide-react'
import { useApp } from '../lib/store'
import { Card, Btn, Alert, Badge, DemoNote } from '../components/ui'
import { api } from '../lib/api'

const SHOTS = 6              // 6 evidence screenshots per incident
const SHOT_INTERVAL_MS = 3000 // 3 seconds interval

export default function CameraPage() {
  const { cameras, push, refresh } = useApp()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [camId, setCamId] = useState<number>(1)
  const [source, setSource] = useState<'none' | 'webcam' | 'file'>('none')
  const [monitoring, setMonitoring] = useState(false)
  const [threshold, setThreshold] = useState<number>(0.80)
  const [result, setResult] = useState<any>(null)
  const [modelInfo, setModelInfo] = useState<any>(null)
  const [thumbs, setThumbs] = useState<{ url: string; inc: number; n: number }[]>([])
  const [capture, setCapture] = useState<string>('')
  const [err, setErr] = useState('')
  const capturing = useRef(false)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [videoAnalysis, setVideoAnalysis] = useState<any>(null)
  const [isLooping, setIsLooping] = useState(true)

  // Fetch model metadata on mount
  useEffect(() => {
    api.get('/api/detection/model-status')
      .then(info => setModelInfo(info))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (cameras.length && !cameras.find(c => c.id === camId)) setCamId(cameras[0].id)
  }, [cameras])

  const grab = (w: number): Promise<Blob | null> => new Promise(res => {
    const v = videoRef.current, c = document.createElement('canvas')
    c.width = w; c.height = Math.round(w * 0.75)
    const ctx = c.getContext('2d')!
    if (v && v.videoWidth > 0 && source !== 'none') {
      c.height = Math.round(w * v.videoHeight / v.videoWidth)
      ctx.drawImage(v, 0, 0, c.width, c.height)
    } else {
      ctx.fillStyle = '#0f172a'
      ctx.fillRect(0, 0, c.width, c.height)
      ctx.fillStyle = '#ef4444'
      ctx.font = 'bold 18px sans-serif'
      ctx.fillText('RESQROUTE AI ACCIDENT SIMULATION FEED', 20, 50)
      ctx.fillStyle = '#94a3b8'
      ctx.font = '13px sans-serif'
      ctx.fillText('Capturing 6 evidence burst frames (3s interval)', 20, 80)
    }
    c.toBlob(b => res(b), 'image/jpeg', 0.85)
  })

  const startCamera = async () => {
    setErr('')
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } }
      })
      streamRef.current = s
      const v = videoRef.current!
      v.srcObject = s
      v.removeAttribute('src')
      await v.play()
      setSource('webcam')
    } catch (e: any) {
      setErr('Webcam unavailable or permission denied: ' + (e.message || e.name))
    }
  }

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    const v = videoRef.current
    if (v) {
      v.srcObject = null
      v.removeAttribute('src')
    }
    setSource('none')
    setMonitoring(false)
  }

  const onFile = (f?: File | null) => {
    if (!f) return
    setVideoFile(f)
    setVideoAnalysis(null)
    streamRef.current?.getTracks().forEach(t => t.stop())
    const v = videoRef.current!
    v.srcObject = null
    v.src = URL.createObjectURL(f)
    v.loop = isLooping
    v.muted = true
    v.play().catch(() => {})
    setSource('file')
    setMonitoring(true)
    push('info', `📹 Live camera footage "${f.name}" loaded (${(f.size / (1024 * 1024)).toFixed(1)} MB). Autonomous PyTorch AI neural monitoring activated!`)
  }

  const handleDeepVideoScan = async () => {
    if (!videoFile) return
    setUploadingVideo(true)
    try {
      push('info', `🧠 Running deep multi-frame neural scan on "${videoFile.name}" with PyTorch model...`)
      const fd = new FormData()
      fd.append('camera_id', String(camId))
      fd.append('threshold', String(threshold))
      fd.append('auto_dispatch', 'true')
      fd.append('file', videoFile)

      const res = await api.upload('/api/detection/upload-video', fd)
      setVideoAnalysis(res.analysis)

      if (res.incident) {
        setCapture(`🚨 ACCIDENT DETECTED in footage! Incident #${res.incident.id} auto-dispatched. Destination: ${res.incident.selected_hospital_name || 'City Central General Hospital'}.`)
        if (res.incident.evidence) {
          setThumbs(res.incident.evidence.map((e: any) => ({ url: e.url, inc: res.incident.id, n: e.seq })))
        }
        push('error', `🚨 COLLISION DETECTED in uploaded live footage! Nearest ambulance unit dispatched immediately.`)
        refresh()
      } else {
        push('info', `✅ Video scan complete. Road traffic normal (Peak risk: ${((res.analysis?.peak_probability || 0) * 100).toFixed(1)}%).`)
      }
    } catch (e: any) {
      push('error', e.message || 'Video analysis failed')
    } finally {
      setUploadingVideo(false)
    }
  }

  const runIncident = async (src: 'ai_model' | 'test_trigger' | 'heuristic', confidence: number | null) => {
    if (capturing.current) return
    capturing.current = true
    try {
      const conf = confidence ?? 0.92
      const confPct = `${Math.round(conf * 100)}%`
      setCapture(`🚨 ACCIDENT DETECTED (${confPct} >= 80% LEVEL) by PyTorch Model! Allocating nearest ambulance & hospital seat…`)

      const inc = await api.post('/api/detection/simulate', {
        camera_id: camId,
        confidence: conf,
        threshold: threshold
      })

      if (inc.evidence && inc.evidence.length > 0) {
        setThumbs(inc.evidence.map((e: any) => ({ url: e.url, inc: inc.id, n: e.seq })))
      }

      const hospName = inc.selected_hospital_name || 'City Central General Hospital'
      const beds = inc.selected_hospital_beds ?? 14
      const ambUnit = inc.assignments?.[0]?.ambulance_code || 'AMB-01'

      push('error', `🚨 ACCIDENT DETECTED (${confPct} >= 80%) by PyTorch Model! ${ambUnit} dispatched & ${hospName} (${beds} seats/beds free) assigned! Alert sent to Driver Console.`)
      setCapture(`🚨 Incident #${inc.id} Dispatched: ${ambUnit} (Nearest Unit) en route. Destination: ${hospName} (${beds} beds free). 6 burst frames transmitted.`)
      refresh()

      // If live video or webcam is on, also grab high-res canvas frame and upload
      if (source !== 'none') {
        for (let n = 1; n <= SHOTS; n++) {
          if (n > 1) await new Promise(r => setTimeout(r, SHOT_INTERVAL_MS))
          const blob = await grab(640)
          if (!blob) continue
          const fd = new FormData()
          fd.append('file', blob, `shot_live_${n}.jpg`)
          await api.upload(`/api/incidents/${inc.id}/evidence`, fd)
          setThumbs(t => [{ url: URL.createObjectURL(blob), inc: inc.id, n: n + 6 }, ...t].slice(0, 18))
          refresh()
        }
      }
    } catch (e: any) {
      push('error', e.message)
      setCapture('')
    } finally {
      capturing.current = false
    }
  }

  // Periodic frame transmission to PyTorch AI model
  useEffect(() => {
    if (!monitoring) return
    const id = setInterval(async () => {
      const blob = await grab(320)
      if (!blob) return
      const fd = new FormData()
      fd.append('camera_id', String(camId))
      fd.append('threshold', String(threshold))
      fd.append('file', blob, 'f.jpg')

      try {
        const r = await api.upload('/api/detection/frame', fd)
        setResult(r)
        if (r.triggered) {
          runIncident('ai_model', r.accident_probability ?? r.confidence)
        }
      } catch (e: any) {
        setErr(e.message)
      }
    }, 1000)

    return () => clearInterval(id)
  }, [monitoring, camId, source, threshold])

  const live = source !== 'none'
  const accidentProb = result?.accident_probability ?? (result?.confidence ?? 0)
  const isAccident = accidentProb >= threshold
  const isWarning = accidentProb >= threshold * 0.7 && !isAccident

  return (
    <div className="space-y-5 text-slate-100">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            AI Traffic Camera Surveillance
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 font-mono flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              resqroute_accident_model.pt
            </span>
          </h1>
          <DemoNote>
            Autonomous visual accident monitoring powered by PyTorch ResNet-18 deep learning model.
            Live video frames from the laptop camera or traffic stream are evaluated frame-by-frame on the backend for collision events.
          </DemoNote>
        </div>

        {/* Model status pill */}
        <div className="flex items-center gap-2 self-start md:self-auto px-3 py-1.5 rounded-xl bg-[#09152e] border border-cyan-500/20 text-xs text-slate-300 shadow-md">
          <div className={`w-2 h-2 rounded-full ${modelInfo?.model_active ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]' : 'bg-amber-400'}`} />
          <span className="font-semibold text-white">Model:</span>
          <span className="text-cyan-300 font-mono">{modelInfo?.model_name ?? 'ResNet-18'}</span>
          {modelInfo?.validation_f1 && (
            <span className="text-slate-400 text-[10px] font-mono border-l border-white/10 pl-2">
              F1: {(modelInfo.validation_f1 * 100).toFixed(1)}%
            </span>
          )}
        </div>
      </div>

      {err && <Alert kind="error">{err}</Alert>}

      <div className="grid lg:grid-cols-3 gap-5">
        <Card
          className="lg:col-span-2"
          title="Live Optical Surveillance Feed"
          right={
            <select
              className="bg-[#0c1a40] text-cyan-300 border border-white/15 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-cyan-500 shadow-inner"
              value={camId}
              onChange={e => setCamId(+e.target.value)}
            >
              {cameras.map(c => (
                <option key={c.id} value={c.id} className="bg-[#070e22] text-white">
                  {c.name} · {c.location_name}
                </option>
              ))}
            </select>
          }
        >
          {/* Video Container with Dynamic HUD Overlays */}
          <div className="relative bg-[#050a18] rounded-xl overflow-hidden aspect-video grid place-items-center border border-white/10 shadow-2xl">
            <video
              ref={videoRef}
              muted
              playsInline
              className={`w-full h-full object-contain ${live ? '' : 'hidden'}`}
            />

            {!live && (
              <div className="text-slate-400 text-center p-6">
                <VideoOff className="w-12 h-12 mx-auto mb-3 text-slate-500" />
                <div className="font-semibold text-white text-sm">Optical Feed Standby</div>
                <div className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Click <b>Start Local Cam</b> to activate your laptop webcam, or <b>Load Video Clip</b> to analyze recorded footage with the AI model.
                </div>
              </div>
            )}

            {/* Live Model HUD Overlays */}
            {live && (
              <>
                {/* Top status banner */}
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  {monitoring ? (
                    <span className={`text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-lg border backdrop-blur-md transition-all ${
                      isAccident
                        ? 'bg-rose-600/95 text-white border-rose-300 animate-pulse shadow-rose-600/50'
                        : isWarning
                        ? 'bg-amber-600/90 text-white border-amber-300'
                        : 'bg-emerald-600/80 text-white border-emerald-400'
                    }`}>
                      <Activity className="w-3.5 h-3.5" />
                      {isAccident ? '🚨 ACCIDENT DETECTED' : isWarning ? '⚠ ELEVATED COLLISION RISK' : 'AI MODEL MONITORING ACTIVE'}
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700 backdrop-blur-md">
                      MONITORING PAUSED
                    </span>
                  )}
                </div>

                {/* Top-Right Probability Badge */}
                {monitoring && result && (
                  <div className="absolute top-3 right-3 bg-black/75 backdrop-blur-md px-3 py-1 rounded-lg border border-white/15 text-xs font-mono shadow-lg flex items-center gap-2">
                    <span className="text-slate-400 text-[10px]">ACCIDENT PROB:</span>
                    <span className={`font-bold ${
                      isAccident ? 'text-rose-400 text-sm animate-pulse' : isWarning ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {(accidentProb * 100).toFixed(1)}%
                    </span>
                  </div>
                )}

                {/* HUD Viewfinder Grid */}
                <div className={`absolute inset-4 pointer-events-none border-2 rounded-lg transition-all duration-300 ${
                  isAccident
                    ? 'border-rose-500/80 shadow-[inset_0_0_20px_rgba(244,63,94,0.4)]'
                    : isWarning
                    ? 'border-amber-500/50'
                    : 'border-cyan-500/20'
                }`}>
                  {/* Corner marks */}
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-400" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-400" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-400" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-400" />
                </div>

                {/* Bottom sensor specs */}
                <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg text-[11px] font-mono text-cyan-400 border border-white/10 flex items-center gap-2">
                  <span>SENSOR #{camId}</span>
                  <span className="text-slate-500">|</span>
                  <span>{source === 'webcam' ? 'LAPTOP CAM' : 'FILE STREAM'}</span>
                  {result?.latency_ms && (
                    <>
                      <span className="text-slate-500">|</span>
                      <span className="text-emerald-400">{result.latency_ms}ms</span>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Action Control Buttons */}
          <div className="flex flex-wrap gap-2.5 mt-4">
            <Btn onClick={startCamera} disabled={source === 'webcam'}>
              <Video className="w-4 h-4 text-cyan-400" />
              Start Local Cam
            </Btn>
            <Btn v="ghost" onClick={stopCamera} disabled={!live}>
              <VideoOff className="w-4 h-4 text-slate-400" />
              Stop Cam
            </Btn>
            <Btn
              v="success"
              onClick={() => {
                api.post('/api/detection/reset', {}).catch(() => {})
                setMonitoring(true)
              }}
              disabled={!live || monitoring}
            >
              <Play className="w-4 h-4" />
              Start AI Monitoring
            </Btn>
            <Btn v="warn" onClick={() => setMonitoring(false)} disabled={!monitoring}>
              <Square className="w-4 h-4" />
              Pause Monitoring
            </Btn>
            <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 hover:border-white/20 transition cursor-pointer">
              <Upload className="w-4 h-4 text-cyan-400" />
              <span>Load Video Clip</span>
              <input type="file" accept="video/*" hidden onChange={e => onFile(e.target.files?.[0])} />
            </label>
            <Btn v="danger" onClick={() => runIncident('test_trigger', null)} busy={capturing.current}>
              <FlaskConical className="w-4 h-4" />
              Simulate Accident Collision
            </Btn>
          </div>

          {/* Sensitivity / Threshold Control */}
          <div className="mt-4 p-3.5 rounded-xl bg-[#09152e]/80 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">Detection Criteria Threshold:</span>
                  <span className="font-mono text-cyan-300 font-bold px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40">
                    {Math.round(threshold * 100)}%
                  </span>
                  {threshold === 0.80 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      Standard 80% Level
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Accidents are confirmed when PyTorch neural network confidence crosses the 80% level.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0.50"
                max="0.95"
                step="0.05"
                value={threshold}
                onChange={e => setThreshold(parseFloat(e.target.value))}
                className="w-32 accent-cyan-400 cursor-pointer"
              />
              <div className="flex gap-1">
                {[0.70, 0.75, 0.80, 0.85, 0.90].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setThreshold(val)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono transition ${
                      threshold === val
                        ? val === 0.80
                          ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/30'
                          : 'bg-cyan-500 text-slate-950 font-bold'
                        : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    {Math.round(val * 100)}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Live Video Footage Upload & Neural Scan Suite */}
          <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-[#0c1a40] via-[#09152e] to-[#0c1a40] border border-cyan-500/30 space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-300 grid place-items-center border border-cyan-500/30">
                  <FileVideo className="w-4 h-4 text-cyan-300" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Upload Live Camera Footage for AI Accident Detection
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      MP4 / WEBM / AVI / MOV
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Upload live traffic CCTV footage or dashcam video to run PyTorch accident detection on real recorded events.
                  </p>
                </div>
              </div>
            </div>

            {/* Video File Information & Controls */}
            {videoFile ? (
              <div className="p-3 rounded-xl bg-slate-900/90 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="font-semibold text-white flex items-center gap-2">
                    <span className="truncate max-w-xs">{videoFile.name}</span>
                    <span className="text-slate-400 font-mono text-[11px]">
                      ({(videoFile.size / (1024 * 1024)).toFixed(2)} MB)
                    </span>
                  </div>
                  <div className="text-[11px] text-emerald-400 flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Loaded in Optical Stream & Active in Neural Monitoring Pipeline</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Btn
                    v="primary"
                    onClick={handleDeepVideoScan}
                    busy={uploadingVideo}
                    className="text-xs"
                  >
                    <Cpu className="w-3.5 h-3.5 text-cyan-200" />
                    <span>Deep Neural Model Scan</span>
                  </Btn>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition cursor-pointer">
                    <FolderUp className="w-3.5 h-3.5 text-slate-400" />
                    <span>Change Video</span>
                    <input type="file" accept="video/*" hidden onChange={e => onFile(e.target.files?.[0])} />
                  </label>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-cyan-500/30 rounded-xl p-5 text-center bg-[#070e22]/50 hover:bg-[#070e22]/80 transition">
                <FolderUp className="w-8 h-8 mx-auto text-cyan-400 mb-2 opacity-80" />
                <p className="text-xs text-slate-200 font-medium">
                  Select or drag & drop live camera footage here
                </p>
                <p className="text-[11px] text-slate-400 mt-1 mb-3">
                  Upload MP4, WebM, or AVI footage from CCTV traffic feeds or dashcams
                </p>
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-cyan-600 hover:brightness-110 text-white shadow-md shadow-cyan-500/20 cursor-pointer transition">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Choose Live Video Footage</span>
                  <input type="file" accept="video/*" hidden onChange={e => onFile(e.target.files?.[0])} />
                </label>
              </div>
            )}

            {/* Video Analysis Result Card */}
            {videoAnalysis && (
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-white/10 space-y-2 text-xs">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="font-bold text-white">Full Video Neural Scan Results:</span>
                  <Badge s={videoAnalysis.accident_detected ? 'critical' : 'available'}>
                    {videoAnalysis.accident_detected ? '🚨 ACCIDENT CONFIRMED' : 'NORMAL TRAFFIC FLOW'}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                  <div>
                    <span className="text-slate-400 block">Peak Collision Prob:</span>
                    <b className={videoAnalysis.accident_detected ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                      {(videoAnalysis.peak_probability * 100).toFixed(1)}%
                    </b>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Collision Second:</span>
                    <b className="text-cyan-300">T+{videoAnalysis.peak_timestamp_s}s</b>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Frames Evaluated:</span>
                    <b className="text-white">{videoAnalysis.samples_evaluated} frames</b>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Evidence Bursts:</span>
                    <b className="text-amber-300">{videoAnalysis.evidence_count} captured</b>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* AI Telemetry & Neural Net Analysis Panel */}
        <div className="space-y-4">
          <Card title="AI Telemetry & Analysis">
            <ul className="text-sm space-y-3">
              <li className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-slate-400 text-xs">Vision Input Source</span>
                <Badge s={live ? 'available' : 'offline'}>
                  {live ? (source === 'webcam' ? 'LAPTOP WEBCAM' : 'VIDEO STREAM') : 'OFFLINE'}
                </Badge>
              </li>

              <li className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-slate-400 text-xs">AI Backend Engine</span>
                <Badge s={monitoring ? 'confirmed' : 'offline'}>
                  {monitoring ? 'MODEL INFERENCE' : 'STANDBY'}
                </Badge>
              </li>

              <li className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-slate-400 text-xs">Model Weights File</span>
                <span className="font-mono text-xs text-cyan-300 font-semibold truncate max-w-[220px]" title={modelInfo?.model_path || "C:\\Prathesh\\resqroute-ai\\resqroute-ai\\backend\\resqroute_accident_model.pt"}>
                  {modelInfo?.model_path ? modelInfo.model_path.split(/[\\/]/).pop() : 'resqroute_accident_model.pt'}
                </span>
              </li>

              <li className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-slate-400 text-xs">Model Config File</span>
                <span className="font-mono text-xs text-amber-300 font-semibold truncate max-w-[220px]" title={modelInfo?.config_path || "C:\\Prathesh\\resqroute-ai\\resqroute-ai\\backend\\model_config.json"}>
                  {modelInfo?.config_path ? modelInfo.config_path.split(/[\\/]/).pop() : 'model_config.json'}
                </span>
              </li>

              <li className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-slate-400 text-xs">Architecture & Input</span>
                <span className="font-mono text-xs text-slate-300">
                  {modelInfo?.architecture ? modelInfo.architecture.toUpperCase() : 'RESNET18'} · {modelInfo?.image_size ?? 224}×{modelInfo?.image_size ?? 224}px
                </span>
              </li>

              {/* Accident Probability with Real-Time Progress Bar */}
              <li className="py-1 border-b border-white/5 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-xs flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                    Accident Probability (near_accident_event)
                  </span>
                  <b className={`font-mono text-sm ${
                    isAccident ? 'text-rose-400 font-bold animate-pulse' : isWarning ? 'text-amber-400' : 'text-slate-200'
                  }`}>
                    {result ? (accidentProb * 100).toFixed(1) + '%' : '—'}
                  </b>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isAccident ? 'bg-rose-500 animate-pulse' : isWarning ? 'bg-amber-500' : 'bg-cyan-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, accidentProb * 100))}%` }}
                  />
                </div>
              </li>

              {/* Normal Traffic Probability */}
              <li className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-slate-400 text-xs flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Normal Traffic (background)
                </span>
                <b className="font-mono text-emerald-400">
                  {result ? ((result.background_probability ?? (1 - accidentProb)) * 100).toFixed(1) + '%' : '—'}
                </b>
              </li>

              {/* Motion optical diff */}
              <li className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-slate-400 text-xs">Motion Intensity Vector</span>
                <b className="font-mono text-cyan-400">{result ? (result.motion * 100).toFixed(1) + '%' : '—'}</b>
              </li>

              {/* Inference latency */}
              <li className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-slate-400 text-xs flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Model Latency
                </span>
                <b className="font-mono text-slate-300">
                  {result?.latency_ms ? `${result.latency_ms} ms` : '—'}
                </b>
              </li>

              {/* Evaluation Outcome */}
              <li className="flex justify-between items-center py-1">
                <span className="text-slate-400 text-xs">Evaluated Classification</span>
                <b className={
                  isAccident
                    ? 'text-rose-400 font-bold flex items-center gap-1 animate-pulse'
                    : isWarning
                    ? 'text-amber-400 font-semibold'
                    : 'text-emerald-400 font-semibold'
                }>
                  {result
                    ? isAccident
                      ? '🚨 ACCIDENT DETECTED'
                      : isWarning
                      ? '⚠ ELEVATED RISK'
                      : 'NORMAL TRAFFIC'
                    : '—'}
                </b>
              </li>
            </ul>

            <div className="mt-4 p-3 rounded-xl bg-slate-900/60 border border-white/5 text-xs text-slate-400 leading-relaxed">
              <p>
                <b className="text-slate-200">Autonomous Collision Pipeline:</b> When the PyTorch ResNet-18 model predicts{' '}
                <span className="text-rose-300 font-mono">near_accident_event</span> above the {Math.round(threshold * 100)}% threshold, ResQRoute immediately triggers automated dispatch of the nearest ambulance and broadcasts emergency alerts to traffic police for green corridor clearance.
              </p>
            </div>

            {capture && (
              <div className="mt-3 p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/40 text-xs text-cyan-300 font-mono animate-pulse">
                {capture}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* 6 Burst Evidence Frames Gallery */}
      <Card title={`Burst Evidence Stream (${SHOTS} frames captured at ${SHOT_INTERVAL_MS / 1000}s intervals)`}>
        {!thumbs.length ? (
          <div className="text-center py-6 text-slate-400 text-sm">
            <p>No surveillance burst evidence captured yet.</p>
            <p className="text-xs text-slate-500 mt-1">
              Start AI monitoring with your camera or click <b>"Simulate Accident Collision"</b> to generate real-time evidence frames.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {thumbs.map((t, k) => (
              <figure key={k} className="group relative rounded-xl overflow-hidden border border-white/10 bg-black/40 shadow-lg">
                <img src={t.url} className="aspect-video object-cover w-full group-hover:scale-105 transition" />
                <figcaption className="p-1.5 text-[11px] font-mono text-cyan-300 bg-[#070e22]/90 border-t border-white/5 flex justify-between">
                  <span>Inc #{t.inc}</span>
                  <span className="text-slate-400">Frame {t.n}/{SHOTS}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
