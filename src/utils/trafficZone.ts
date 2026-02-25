export type TrafficZone = 'normal' | 'warning' | 'danger' | 'critical';

interface TrafficZoneResult {
  zone: TrafficZone;
  textClass: string;
  dotClass: string;
  glowColor: string;
  labelKey: string;
  gradientFrom: string;
  gradientTo: string;
}

const ZONES: Record<TrafficZone, Omit<TrafficZoneResult, 'zone'>> = {
  normal: {
    textClass: 'text-success-400',
    dotClass: 'bg-success-400',
    glowColor: 'rgba(var(--color-success-500), 0.5)',
    labelKey: 'dashboard.zone.normal',
    gradientFrom: 'rgb(var(--color-success-500))',
    gradientTo: 'rgb(var(--color-success-400))',
  },
  warning: {
    textClass: 'text-warning-400',
    dotClass: 'bg-warning-400',
    glowColor: 'rgba(var(--color-warning-500), 0.5)',
    labelKey: 'dashboard.zone.warning',
    gradientFrom: 'rgb(var(--color-warning-500))',
    gradientTo: 'rgb(var(--color-warning-400))',
  },
  danger: {
    textClass: 'text-warning-300',
    dotClass: 'bg-warning-300',
    glowColor: 'rgba(var(--color-warning-400), 0.5)',
    labelKey: 'dashboard.zone.danger',
    gradientFrom: 'rgb(var(--color-warning-600))',
    gradientTo: 'rgb(var(--color-warning-400))',
  },
  critical: {
    textClass: 'text-error-400',
    dotClass: 'bg-error-400',
    glowColor: 'rgba(var(--color-error-500), 0.5)',
    labelKey: 'dashboard.zone.critical',
    gradientFrom: 'rgb(var(--color-error-500))',
    gradientTo: 'rgb(var(--color-error-400))',
  },
};

export function getTrafficZone(percent: number): TrafficZoneResult {
  let zone: TrafficZone;
  if (percent >= 90) zone = 'critical';
  else if (percent >= 75) zone = 'danger';
  else if (percent >= 50) zone = 'warning';
  else zone = 'normal';

  return { zone, ...ZONES[zone] };
}
