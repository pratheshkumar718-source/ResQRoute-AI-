import { Incident, activeAssignment } from '../lib/api'
import { RouteLine } from './MapView'

// Builds real street route lines to draw for an incident (Google Maps style)
export function routesFor(inc?: Incident | null): RouteLine[] {
  const a = activeAssignment(inc)
  if (!inc || !a) return []
  const out: RouteLine[] = []
  if (a.scene_route && ['offered', 'en_route'].includes(a.status))
    out.push({
      coords: a.scene_route.coords,
      color: '#0284c7', // Google Maps style primary blue navigation line
      label: `🚑 ${a.ambulance_code} → Incident Scene (${a.scene_route.distance_km} km · ETA ${a.scene_route.eta_min} min on road network)`
    })
  if (a.hospital_route && ['on_scene', 'transporting', 'at_hospital'].includes(a.status))
    out.push({
      coords: a.hospital_route.coords,
      color: '#10b981', // Hospital transfer green corridor
      dashed: a.status === 'on_scene',
      label: `🏥 Scene → ${a.hospital_name || 'Trauma Center'} (${a.hospital_route.distance_km} km · ETA ${a.hospital_route.eta_min} min on road network)`
    })
  return out
}
