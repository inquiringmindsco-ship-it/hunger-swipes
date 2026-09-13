import type { SVGProps } from 'react'

export interface HungerIconProps extends Omit<SVGProps<SVGSVGElement>, 'width' | 'height'> {
  size?: number
}

function iconProps(size: number, className?: string) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true,
    focusable: false,
  }
}

export function BrandMark({ size = 32, className, ...props }: HungerIconProps) {
  const labelled = Boolean(props['aria-label'])
  return (
    <svg {...iconProps(size, className)} {...props} aria-hidden={labelled ? undefined : true} role={labelled ? 'img' : undefined} viewBox="0 0 32 32">
      <rect width="32" height="32" rx="9" fill="#171717" stroke="none" />
      <path d="M8 9v7.5a4 4 0 0 0 8 0V9M8 12h8" stroke="#FF6422" strokeWidth="2.3" />
      <path d="M21 8v16M18.5 8v5M23.5 8v5M18.5 13h5" stroke="#FFD34E" strokeWidth="2.3" />
      <path d="M7.5 23h8m0 0-2.5-2.5m2.5 2.5L13 25.5" stroke="#FF6422" strokeWidth="2.1" />
    </svg>
  )
}

export function PassIcon({ size = 24, className, ...props }: HungerIconProps) {
  return (
    <svg {...iconProps(size, className)} {...props}>
      <path d="M4 8h4M2.5 12h4M4 16h4" opacity=".55" />
      <path d="m11 7 7 10m0-10-7 10" strokeWidth="2.4" />
    </svg>
  )
}

export function WantItIcon({ size = 24, className, ...props }: HungerIconProps) {
  return (
    <svg {...iconProps(size, className)} {...props}>
      <path d="M12 20.2S4.5 16 4.5 10.1A4.1 4.1 0 0 1 12 7.8a4.1 4.1 0 0 1 7.5 2.3C19.5 16 12 20.2 12 20.2Z" strokeWidth="2.1" />
      <path d="M10 6v5m2-5v5m2-5v5m-2 0v4" />
    </svg>
  )
}

export function GetItIcon({ size = 24, className, ...props }: HungerIconProps) {
  return (
    <svg {...iconProps(size, className)} {...props}>
      <path d="M5 9h14l-1 11H6L5 9Z" />
      <path d="M9 9V7a3 3 0 0 1 6 0v2M9 14h6m0 0-2-2m2 2-2 2" />
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

export function RestaurantIcon({ size = 24, className, ...props }: HungerIconProps) {
  return <svg {...iconProps(size, className)} {...props}><path d="M4 17h16M6 17a6 6 0 0 1 12 0M12 8v3M9 20h6" /></svg>
}

export function HomeKitchenIcon({ size = 24, className, ...props }: HungerIconProps) {
  return <svg {...iconProps(size, className)} {...props}><rect x="5" y="7" width="14" height="13" rx="2" /><path d="M5 11h14M8 9h.01M11 9h.01M8 16a4 4 0 0 1 8 0H8Zm2-12c0 1-1 1-1 2m5-2c0 1-1 1-1 2" /></svg>
}

export function FoodTruckIcon({ size = 24, className, ...props }: HungerIconProps) {
  return <svg {...iconProps(size, className)} {...props}><path d="M3 6h11v11H3V6Zm11 4h4l3 4v3h-7v-7Z" /><circle cx="7" cy="18" r="2" /><circle cx="18" cy="18" r="2" /><path d="M6 9h5" /></svg>
}

export function CatererIcon({ size = 24, className, ...props }: HungerIconProps) {
  return <svg {...iconProps(size, className)} {...props}><path d="M4 17h16M6 17a6 6 0 0 1 12 0M9 10h6M12 7v3M5 20h14" /><circle cx="12" cy="6" r="1" /></svg>
}

export function PopUpIcon({ size = 24, className, ...props }: HungerIconProps) {
  return <svg {...iconProps(size, className)} {...props}><path d="M4 10h16l-2-5H6l-2 5Zm2 0v10m12-10v10M4 20h16M8 14h4v6m3-6h3" /><path d="M4 10c1 2 3 2 4 0 1 2 3 2 4 0 1 2 3 2 4 0 1 2 3 2 4 0" /></svg>
}

export function MealPrepIcon({ size = 24, className, ...props }: HungerIconProps) {
  return <svg {...iconProps(size, className)} {...props}><rect x="3" y="6" width="18" height="14" rx="3" /><path d="M3 12h18M11 6v14M15 9h3M6 16h2" /></svg>
}

export function OtherSellerIcon({ size = 24, className, ...props }: HungerIconProps) {
  return <svg {...iconProps(size, className)} {...props}><path d="M5 10h14v10H5V10Zm-1-4h16l-1 4H5L4 6Zm4 8h3v6m4-6h2" /><path d="M6 4h12" /></svg>
}

const sellerIcons = {
  restaurant: RestaurantIcon,
  home_kitchen: HomeKitchenIcon,
  food_truck: FoodTruckIcon,
  caterer: CatererIcon,
  pop_up: PopUpIcon,
  meal_prep: MealPrepIcon,
  other: OtherSellerIcon,
}

export function SellerTypeIcon({ type, ...props }: HungerIconProps & { type: string }) {
  const Icon = sellerIcons[type as keyof typeof sellerIcons] || OtherSellerIcon
  return <Icon {...props} />
}
