import { ReactNode, ButtonHTMLAttributes } from 'react'
import { Loader2, Inbox, CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react'
import { useApp } from '../lib/store'

const STATUS: Record<string, string> = {
  suspected: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  confirmed: 'bg-red-500/20 text-red-300 border border-red-500/30',
  dispatching: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30',
  en_route: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  on_scene: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
  assessed: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30',
  transporting: 'bg-sky-500/20 text-sky-300 border border-sky-500/30',
  at_hospital: 'bg-teal-500/20 text-teal-300 border border-teal-500/30',
  completed: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  rejected: 'bg-slate-700/40 text-slate-400 border border-slate-600/40',
  no_ambulance: 'bg-red-600 text-white border border-red-400 animate-pulse',
  offered: 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse',
  available: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  busy: 'bg-rose-500/20 text-rose-300 border border-rose-500/30',
  offline: 'bg-slate-700/40 text-slate-400 border border-slate-600/40',
  maintenance: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
  declined: 'bg-slate-700/40 text-slate-400 border border-slate-600/40',
  cancelled: 'bg-slate-700/40 text-slate-400 border border-slate-600/40',
  receiving: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  diverted: 'bg-rose-500/20 text-rose-300 border border-rose-500/30',
  pending_verification: 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse',
  verified: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
}

export const Badge = ({ s, children }: { s: string; children?: ReactNode }) => (
  <span
    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${
      STATUS[s] ?? 'bg-slate-800 text-slate-300 border border-white/10'
    }`}
  >
    {children ?? s.replace(/_/g, ' ')}
  </span>
)

export const Card = ({
  title,
  right,
  children,
  className = '',
}: {
  title?: ReactNode
  right?: ReactNode
  children: ReactNode
  className?: string
}) => (
  <section className={`bg-[#0b1739]/90 rounded-2xl shadow-xl border border-white/10 backdrop-blur-md overflow-hidden ${className}`}>
    {title && (
      <header className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-white/[0.02]">
        <h3 className="font-semibold text-white text-sm sm:text-base tracking-tight">{title}</h3>
        {right}
      </header>
    )}
    <div className="p-5">{children}</div>
  </section>
)

type BP = ButtonHTMLAttributes<HTMLButtonElement> & {
  v?: 'primary' | 'danger' | 'success' | 'ghost' | 'warn' | 'cyan'
  busy?: boolean
}

export const Btn = ({ v = 'primary', busy, children, className = '', ...p }: BP) => {
  const c = {
    primary: 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:brightness-110 text-white shadow-md shadow-cyan-500/20',
    cyan: 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-md shadow-cyan-500/25',
    danger: 'bg-gradient-to-r from-red-600 to-rose-600 hover:brightness-110 text-white shadow-md shadow-red-500/20',
    success: 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white shadow-md shadow-emerald-500/20',
    warn: 'bg-gradient-to-r from-amber-600 to-orange-600 hover:brightness-110 text-white shadow-md shadow-amber-500/20',
    ghost: 'bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 hover:border-white/20',
  }[v]

  return (
    <button
      {...p}
      disabled={p.disabled || busy}
      className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${c} ${className}`}
    >
      {busy && <Loader2 className="w-4 h-4 animate-spin text-current" />}
      {children}
    </button>
  )
}

export const Spinner = ({ label = 'Loading…' }: { label?: string }) => (
  <div className="flex items-center justify-center gap-2 text-cyan-400 p-8 font-medium">
    <Loader2 className="w-5 h-5 animate-spin" />
    <span>{label}</span>
  </div>
)

export const Empty = ({ text, hint }: { text: string; hint?: string }) => (
  <div className="text-center text-slate-400 py-10 space-y-1">
    <Inbox className="w-9 h-9 mx-auto mb-2 text-slate-500" />
    <div className="font-semibold text-slate-300 text-sm">{text}</div>
    {hint && <div className="text-xs text-slate-500">{hint}</div>}
  </div>
)

export const Alert = ({
  kind = 'warn',
  children,
}: {
  kind?: 'warn' | 'error' | 'info' | 'ok'
  children: ReactNode
}) => {
  const m = {
    warn: 'bg-amber-950/30 border-amber-500/30 text-amber-200',
    error: 'bg-rose-950/30 border-rose-500/30 text-rose-200',
    info: 'bg-cyan-950/30 border-cyan-500/30 text-cyan-200',
    ok: 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200',
  }[kind]
  return (
    <div className={`border rounded-xl px-4 py-3 text-sm flex gap-3 backdrop-blur-md ${m}`}>
      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-current" />
      <div className="flex-1">{children}</div>
    </div>
  )
}

export const DemoNote = ({ children }: { children?: ReactNode }) => (
  <p className="text-xs text-slate-400 italic">
    {children ?? 'Simulated Operational Environment: routes, telemetry, ETAs, and hospital capacities run on local heuristic models.'}
  </p>
)
export const SystemNote = DemoNote

export const Stat = ({
  label,
  value,
  color,
  icon,
}: {
  label: string
  value: ReactNode
  color: string
  icon: ReactNode
}) => (
  <div className="bg-[#0b1739]/90 rounded-2xl border border-white/10 p-4.5 flex items-center gap-3.5 shadow-lg backdrop-blur-md">
    <div className={`w-11 h-11 rounded-xl grid place-items-center text-white shadow-md ${color}`}>
      {icon}
    </div>
    <div className="min-w-0">
      <div className="text-2xl font-bold text-white tracking-tight">{value}</div>
      <div className="text-xs text-slate-400 truncate">{label}</div>
    </div>
  </div>
)

export function Toasts() {
  const { toasts } = useApp()
  const ic: any = {
    success: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
    error: <XCircle className="w-4 h-4 text-rose-400 shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
    info: <Info className="w-4 h-4 text-cyan-400 shrink-0" />,
  }
  return (
    <div className="fixed top-4 right-4 z-[3000] space-y-2.5 w-84 max-w-[90vw]">
      {toasts.map(t => (
        <div
          key={t.id}
          className="toast-in bg-[#0c1a40]/95 border border-cyan-500/30 shadow-2xl rounded-xl p-3.5 text-xs text-slate-200 flex gap-2.5 items-start backdrop-blur-xl"
        >
          {ic[t.level] ?? ic.info}
          <span className="flex-1 leading-snug">{t.message}</span>
        </div>
      ))}
    </div>
  )
}

export const useAct = () => {
  const { push, refresh } = useApp()
  return async (fn: () => Promise<any>, ok?: string) => {
    try {
      const r = await fn()
      if (ok) push('success', ok)
      refresh()
      return r
    } catch (e: any) {
      push('error', e.message)
      return null
    }
  }
}
