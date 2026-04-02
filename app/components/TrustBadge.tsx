'use client'

interface TrustBadgeProps {
  level: 1 | 2 | 3
  size?: 'sm' | 'md' | 'lg'
}

const TRUST_CONFIG = {
  1: {
    label: 'Verified',
    bgColor: 'bg-[#10B981]/20',
    borderColor: 'border-[#10B981]/30',
    textColor: 'text-[#10B981]',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
      </svg>
    ),
  },
  2: {
    label: 'Photo Verified',
    bgColor: 'bg-[#3B82F6]/20',
    borderColor: 'border-[#3B82F6]/30',
    textColor: 'text-[#3B82F6]',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"/>
      </svg>
    ),
  },
  3: {
    label: 'Receipt Verified',
    bgColor: 'bg-[#FFD700]/20',
    borderColor: 'border-[#FFD700]/30',
    textColor: 'text-[#FFD700]',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd"/>
      </svg>
    ),
  },
}

const SIZE_MAP = {
  sm: { padding: 'px-1.5 py-0.5', text: 'text-[10px]', icon: 'w-3 h-3' },
  md: { padding: 'px-2 py-1', text: 'text-xs', icon: 'w-4 h-4' },
  lg: { padding: 'px-3 py-1.5', text: 'text-sm', icon: 'w-5 h-5' },
}

export function TrustBadge({ level, size = 'md' }: TrustBadgeProps) {
  const config = TRUST_CONFIG[level]
  const sizeConfig = SIZE_MAP[size]

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold border ${config.bgColor} ${config.borderColor} ${config.textColor} ${sizeConfig.padding} ${sizeConfig.text}`}
    >
      <span className={sizeConfig.icon}>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  )
}

export function getTrustBadgeFromType(type: string): 1 | 2 | 3 {
  if (type === 'receipt-confirmed') return 3
  if (type === 'photo-confirmed') return 2
  return 1
}

export function getPointsForType(type: string): number {
  if (type === 'receipt-confirmed') return 20
  if (type === 'photo-confirmed') return 15
  return 5
}

export function getAccuracyLabel(rating: string): string {
  if (rating === 'accurate') return '✓ Accurate'
  if (rating === 'mostly_accurate') return '~ Mostly accurate'
  return '✗ Not accurate'
}

export function getTierFromPoints(totalPoints: number): { name: string; color: string; next: string | null } {
  if (totalPoints >= 1000) return { name: 'Legend', color: '#FFD700', next: null }
  if (totalPoints >= 500) return { name: 'Expert', color: '#FF5722', next: '1000 pts for Legend' }
  if (totalPoints >= 200) return { name: 'Critic', color: '#3B82F6', next: '500 pts for Expert' }
  if (totalPoints >= 50) return { name: 'Foodie', color: '#10B981', next: '200 pts for Critic' }
  return { name: 'Newbie', color: '#9CA3AF', next: '50 pts for Foodie' }
}

export default TrustBadge
