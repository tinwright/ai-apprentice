// Where the sun is: sunrise and sunset for a place and a day, the moon's phase, and which part
// of the day it is. Plain maths, no engine.

export type Period = 'night' | 'dawn' | 'day' | 'dusk'
export type Place = { lat: number; lon: number }
// t runs 0..1 across the period's arc: sunrise to sunset by day, sunset to sunrise at night.
// south flips the moon's lit side for the southern hemisphere.
export type Sky = { period: Period; t: number; phase: number; south?: boolean }

const RAD = Math.PI / 180

// The place from the plugin's options, or undefined when either half is missing or out of range.
export function placeFrom(options: Record<string, unknown>): Place | undefined {
  const lat = options.latitude
  const lon = options.longitude
  if (typeof lat !== 'number' || typeof lon !== 'number') return undefined
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return undefined
  return { lat, lon }
}

export function dayOfYear(d: Date): number {
  return Math.floor((d.getTime() - Date.UTC(d.getFullYear(), 0, 0)) / 86_400_000)
}

// Sunrise and sunset in local clock hours. utcOffset is the clock's offset from UTC in hours
// (+1 for British Summer Time). With no place, a plain 6:00 to 18:00.
export function sunTimes(day: number, utcOffset: number, place?: Place): { rise: number; set: number } {
  if (!place) return { rise: 6, set: 18 }
  const decl = -23.44 * Math.cos(((2 * Math.PI) / 365) * (day + 10)) * RAD
  const lat = place.lat * RAD
  // Sunrise is when the sun's centre is 0.833° below the horizon (refraction and its radius).
  const cosH = (Math.sin(-0.833 * RAD) - Math.sin(lat) * Math.sin(decl)) / (Math.cos(lat) * Math.cos(decl))
  // Past ±1 the sun doesn't rise (polar night) or doesn't set (midnight sun).
  const h0 = Math.acos(Math.max(-1, Math.min(1, cosH))) / RAD
  // The equation of time, in minutes: how far the sun runs ahead of the clock.
  const b = (2 * Math.PI * (day - 81)) / 364
  const eot = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b)
  const noon = 12 - place.lon / 15 - eot / 60 + utcOffset
  return { rise: noon - h0 / 15, set: noon + h0 / 15 }
}

// 0 new, 0.5 full.
export function moonPhase(d: Date): number {
  const days = (d.getTime() - Date.UTC(2000, 0, 6, 18, 14)) / 86_400_000
  return (((days % 29.530588) + 29.530588) % 29.530588) / 29.530588
}

const unit = (x: number) => (Number.isFinite(x) ? Math.max(0, Math.min(1, x)) : 0)

// The part of the day at this local clock hour.
export function periodAt(hour: number, rise: number, set: number): { period: Period; t: number } {
  const span = Math.max(set - rise, 0.1)
  if (hour >= rise - 0.75 && hour < rise + 1) return { period: 'dawn', t: unit((hour - rise) / span) }
  if (hour >= rise + 1 && hour < set - 1) return { period: 'day', t: unit((hour - rise) / span) }
  if (hour >= set - 1 && hour < set + 0.75) return { period: 'dusk', t: unit((hour - rise) / span) }
  const since = hour >= set ? hour - set : hour + 24 - set
  return { period: 'night', t: unit(since / Math.max(24 - (set - rise), 0.1)) }
}

export function skyNow(d: Date, place?: Place): Sky {
  const { rise, set } = sunTimes(dayOfYear(d), -d.getTimezoneOffset() / 60, place)
  const at = periodAt(d.getHours() + d.getMinutes() / 60, rise, set)
  return { ...at, phase: moonPhase(d), ...(place && place.lat < 0 ? { south: true } : {}) }
}

// An arc low at the sides and high in the middle, kept to the top of the window.
export function arc(t: number): [number, number] {
  return [180 + t * 1240, 470 - Math.sin(Math.PI * t) * 360]
}

// "07:23"
export const clockTime = (hour: number) => {
  const mins = Math.round((((hour % 24) + 24) % 24) * 60)
  return `${String(Math.floor(mins / 60) % 24).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`
}
