import type { SVGProps } from 'react'

export interface HungerIconProps extends Omit<SVGProps<SVGSVGElement>, 'width' | 'height'> {
  size?: number
}

interface BrandMarkProps {
  size?: number
  className?: string
  'aria-label'?: string
}

function iconProps(size: number, className?: string) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true as const,
    focusable: false as const,
  }
}

export function BrandMark({ size = 32, className, 'aria-label': label }: BrandMarkProps) {
  return (
    <img
      src="/logo-full.png"
      alt={label || 'Hunger Swipes'}
      aria-hidden={label ? undefined : true}
      width={Math.round(size * 1.777)}
      height={size}
      className={`shrink-0 rounded-[0.18em] object-contain ${className || ''}`}
    />
  )
}

export function BrandSymbol({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" fill="none" className={`shrink-0 ${className || ''}`} aria-hidden="true" focusable={false}>
      <rect width="512" height="512" fill="#0A0A0A" />
      <path d="M256 120 L392 392 L120 392 Z" fill="#D4AF37" />
      <path d="M256 200 L344 360 L168 360 Z" fill="#0A0A0A" />
    </svg>
  )
}

// Primary swipe actions
export function WantItIcon({ size = 24, className, ...props }: HungerIconProps) {
  return (
    <svg {...iconProps(size, className)} {...props}>
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function PassIcon({ size = 24, className, ...props }: HungerIconProps) {
  return (
    <svg {...iconProps(size, className)} {...props}>
      <path d="M18 6L6 18M6 6l12 12" strokeWidth="2.4" />
    </svg>
  )
}

// Navigation
export function DiscoverIcon({ size = 24, className, ...props }: HungerIconProps) {
  return (
    <svg {...iconProps(size, className)} {...props}>
      <path d="M3 12h18M12 3v18" strokeWidth="2" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  )
}

export function SavedIcon({ size = 24, className, ...props }: HungerIconProps) {
  return (
    <svg {...iconProps(size, className)} {...props}>
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function PostIcon({ size = 24, className, ...props }: HungerIconProps) {
  return (
    <svg {...iconProps(size, className)} {...props}>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M12 8v8M8 12h8" strokeWidth="2" />
    </svg>
  )
}

export function SellIcon({ size = 24, className, ...props }: HungerIconProps) {
  return (
    <svg {...iconProps(size, className)} {...props}>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M9 22V12h6v10" />
    </svg>
  )
}

export function ProfileIcon({ size = 24, className, ...props }: HungerIconProps) {
  return (
    <svg {...iconProps(size, className)} {...props}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

// Utility icons
export function LocationIcon({ size = 24, className, ...props }: HungerIconProps) {
  return (
    <svg {...iconProps(size, className)} {...props}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

export function RestaurantIcon({ size = 24, className, ...props }: HungerIconProps) {
  return (
    <svg {...iconProps(size, className)} {...props}>
      <path d="M3 7h18M4 7a6 6 0 0 1 12 0M12 7v13M9 20h6" />
    </svg>
  )
}

export function FilterIcon({ size = 24, className, ...props }: HungerIconProps) {
  return (
    <svg {...iconProps(size, className)} {...props}>
      <path d="M4 4h16l-6 8v6l-4 2v-8z" />
    </svg>
  )
}

export function CameraIcon({ size = 24, className, ...props }: HungerIconProps) {
  return (
    <svg {...iconProps(size, className)} {...props}>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}

export function SearchIcon({ size = 24, className, ...props }: HungerIconProps) {
  return (
    <svg {...iconProps(size, className)} {...props}>
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  )
}

export function BackIcon({ size = 24, className, ...props }: HungerIconProps) {
  return (
    <svg {...iconProps(size, className)} {...props}>
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  )
}

export function CloseIcon({ size = 24, className, ...props }: HungerIconProps) {
  return (
    <svg {...iconProps(size, className)} {...props}>
      <path d="M18 6L6 18M6 6l12 12" strokeWidth="2" />
    </svg>
  )
}

export function CheckIcon({ size = 24, className, ...props }: HungerIconProps) {
  return (
    <svg {...iconProps(size, className)} {...props}>
      <path d="M20 6L9 17l-5-5" strokeWidth="2.2" />
    </svg>
  )
}

export function WarningIcon({ size = 24, className, ...props }: HungerIconProps) {
  return (
    <svg {...iconProps(size, className)} {...props}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <path d="M12 9v4M12 17h.01" strokeWidth="2" />
    </svg>
  )
}

export function MoreIcon({ size = 24, className, ...props }: HungerIconProps) {
  return (
    <svg {...iconProps(size, className)} {...props}>
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function GetItIcon({ size = 24, className, ...props }: HungerIconProps) {
  return (
    <svg {...iconProps(size, className)} {...props}>
      <path d="M5 9h14l-1 11H6L5 9Z" />
      <path d="M9 9V7a3 3 0 0 1 6 0v2M9 14h6" />
    </svg>
  )
}

export function MakeItIcon({ size = 24, className, ...props }: HungerIconProps) {
  return (
    <svg {...iconProps(size, className)} {...props}>
      <path d="M6 3h9l3 3v15H6V3Z" />
      <path d="M15 3v4h4M9 11h6M9 15h3" />
      <path d="M15.5 14.5v4m-2-2h4" />
    </svg>
  )
}

export function HomeKitchenIcon({ size = 24, className, ...props }: HungerIconProps) {
  return (
    <svg {...iconProps(size, className)} {...props}>
      <rect x="5" y="7" width="14" height="13" rx="2" />
      <path d="M5 11h14M8 9h.01M11 9h.01M8 16a4 4 0 0 1 8 0H8Zm2-12c0 1-1 1-1 2m5-2c0 1-1 1-1 2" />
    </svg>
  )
}

export function FoodTruckIcon({ size = 24, className, ...props }: HungerIconProps) {
  return (
    <svg {...iconProps(size, className)} {...props}>
      <path d="M3 6h11v11H3V6Zm11 4h4l3 4v3h-7v-7Z" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="18" cy="18" r="2" />
      <path d="M6 9h5" />
    </svg>
  )
}

export function CatererIcon({ size = 24, className, ...props }: HungerIconProps) {
  return (
    <svg {...iconProps(size, className)} {...props}>
      <path d="M4 17h16M6 17a6 6 0 0 1 12 0M9 10h6M12 7v3M5 20h14" />
      <circle cx="12" cy="6" r="1" />
    </svg>
  )
}

export function PopUpIcon({ size = 24, className, ...props }: HungerIconProps) {
  return (
    <svg {...iconProps(size, className)} {...props}>
      <path d="M4 10h16l-2-5H6l-2 5Zm2 0v10m12-10v10M4 20h16M8 14h4v6m3-6h3" />
      <path d="M4 10c1 2 3 2 4 0 1 2 3 2 4 0 1 2 3 2 4 0 1 2 3 2 4 0" />
    </svg>
  )
}

export function MealPrepIcon({ size = 24, className, ...props }: HungerIconProps) {
  return (
    <svg {...iconProps(size, className)} {...props}>
      <rect x="3" y="6" width="18" height="14" rx="3" />
      <path d="M3 12h18M11 6v14M15 9h3M6 16h2" />
    </svg>
  )
}

export function OtherSellerIcon({ size = 24, className, ...props }: HungerIconProps) {
  return (
    <svg {...iconProps(size, className)} {...props}>
      <path d="M5 10h14v10H5V10Zm-1-4h16l-1 4H5L4 6Zm4 8h3v6m4-6h2" />
      <path d="M6 4h12" />
    </svg>
  )
}

const sellerIcons: Record<string, (props: HungerIconProps) => JSX.Element> = {
  restaurant: RestaurantIcon,
  home_kitchen: HomeKitchenIcon,
  food_truck: FoodTruckIcon,
  caterer: CatererIcon,
  pop_up: PopUpIcon,
  meal_prep: MealPrepIcon,
  other: OtherSellerIcon,
}

export function SellerTypeIcon({ type, ...props }: HungerIconProps & { type: string }) {
  const Icon = sellerIcons[type] || OtherSellerIcon
  return <Icon {...props} />
}
