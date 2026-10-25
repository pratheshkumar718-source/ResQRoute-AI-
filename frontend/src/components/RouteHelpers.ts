import { Incident, activeAssignment } from '../lib/api'
import { RouteLine } from './MapView'

// Builds the simulated route lines to draw for an incident.
export function routesFor(inc?: Incident | null): RouteLine[] {
  const a = activeAssignment(inc)
  if (!inc || !a) return []
  const out: RouteLine[] = []
  if (a.scene_route && ['offered', 'en_route'].includes(a.status))
    out.push({ coords: a.scene_route.coords, color: '#2563eb', label: `${a.ambulance_code} → scene: SIMULATED route ${a.scene_route.distance_km} km, ETA ${a.scene_route.eta_min} min (simulated)` })
  if (a.hospital_route && ['on_scene', 'transporting', 'at_hospital'].includes(a.status))
    out.push({ coords: a.hospital_route.coords, color: '#16a34a', dashed: a.status === 'on_scene', label: `Scene → hospital: SIMULATED route ${a.hospital_route.distance_km} km, ETA ${a.hospital_route.eta_min} min (simulated)` })
  return out
}
