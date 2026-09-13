'use client'

import { BadgeCheck, Camera, ReceiptText } from 'lucide-react'

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
    icon: BadgeCheck,
  },
  2: {
    label: 'Photo Verified',
    bgColor: 'bg-[#3B82F6]/20',
    borderColor: 'border-[#3B82F6]/30',
    textColor: 'text-[#3B82F6]',
    icon: Camera,
  },
  3: {
    label: 'Receipt Verified',
    bgColor: 'bg-[#FFD700]/20',
    borderColor: 'border-[#FFD700]/30',
    textColor: 'text-[#FFD700]',
    icon: ReceiptText,
  },
}

const SIZE_MAP = {
  sm: { padding: 'px-1.5 py-0.5', text: 'text-[10px]', icon: 12 },
  md: { padding: 'px-2 py-1', text: 'text-xs', icon: 16 },
  lg: { padding: 'px-3 py-1.5', text: 'text-sm', icon: 20 },
}

export function TrustBadge({ level, size = 'md' }: TrustBadgeProps) {
  const config = TRUST_CONFIG[level]
  const sizeConfig = SIZE_MAP[size]
  const Icon = config.icon

  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-semibold border ${config.bgColor} ${config.borderColor} ${config.textColor} ${sizeConfig.padding} ${sizeConfig.text}`}>
      <Icon size={sizeConfig.icon} aria-hidden="true" />
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
  if (rating === 'accurate') return 'Accurate'
  if (rating === 'mostly_accurate') return 'Mostly accurate'
  return 'Not accurate'
}

export function getTierFromPoints(totalPoints: number): { name: string; color: string; next: string | null } {
  if (totalPoints >= 1000) return { name: 'Legend', color: '#FFD700', next: null }
  if (totalPoints >= 500) return { name: 'Expert', color: '#FF5722', next: '1000 pts for Legend' }
  if (totalPoints >= 200) return { name: 'Critic', color: '#3B82F6', next: '500 pts for Expert' }
  if (totalPoints >= 50) return { name: 'Foodie', color: '#10B981', next: '200 pts for Critic' }
  return { name: 'Newbie', color: '#9CA3AF', next: '50 pts for Foodie' }
}

export default TrustBadge
