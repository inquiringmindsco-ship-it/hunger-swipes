'use client'

import React from 'react'

interface IconProps {
  size?: number
  className?: string
  style?: React.CSSProperties
}

// ──────────────────────────────────────────────────────
// BRAND PALETTE
// Orange  #FF6A00
// Yellow  #FFD500
// White   #FFFFFF
// Black   #0A0A0A
// Green   #10B981
// Red     #C8102E
// ──────────────────────────────────────────────────────

// ─── MARK: HungerSwipes stacked arrows — the core brand mark ───
export function HsMark({ size = 24, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className} style={style}>
      {/* 4 stacked arrows, brand colors */}
      {/* H→ orange */}
      <path d="M4 4h10l6 6-6 6H4V4z" fill="#FF6A00"/>
      {/* U← yellow */}
      <path d="M20 4h10l-6 6 6 6H20V4z" fill="#FFD500"/>
      {/* N→ orange */}
      <path d="M4 18h10l6 6-6 6H4V18z" fill="#FF6A00"/>
      {/* G→ yellow */}
      <path d="M4 32h10l6-6-6-6H4V32z" fill="#FFD500"/>
    </svg>
  )
}

// ─── FORK: Stacked fork tines ───
export function Fork({ size = 24, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <rect x="8" y="2" width="2" height="7" rx="1" fill="#FF6A00"/>
      <rect x="12" y="2" width="2" height="7" rx="1" fill="#FFD500"/>
      <rect x="16" y="2" width="2" height="7" rx="1" fill="#FF6A00"/>
      <path d="M13.5 9v13" stroke="#FF6A00" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

// ─── PLATE: Restaurant / food ───
export function Plate({ size = 24, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <ellipse cx="12" cy="14" rx="10" ry="4.5" fill="#FF6A00"/>
      <ellipse cx="12" cy="13" rx="7" ry="3" fill="#FFD500"/>
      <circle cx="12" cy="13" r="1.5" fill="#FF6A00"/>
    </svg>
  )
}

// ─── FLAME: Hunger / trending / hot ───
export function Flame({ size = 24, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <path d="M12 2C8 6 5 9.5 5 13.5a7 7 0 0014 0C19 9.5 16 6 12 2z" fill="#FF6A00"/>
      <path d="M12 8c0 2.5-2.5 4-2.5 7a2.5 2.5 0 005 0C14.5 12 12 10.5 12 8z" fill="#FFD500"/>
    </svg>
  )
}

// ─── HEART: Match / save / like — NO emoji blob ───
export function Heart({ size = 24, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <path
        d="M12 20s-8-5.5-8-10a4.5 4.5 0 018 0 4.5 4.5 0 018 0c0 4.5-8 10-8 10z"
        fill="#FF6A00"
        strokeLinejoin="round"
      />
      <path
        d="M12 16c-1.5 0-3.5-1-4.5-2.5a3 3 0 015 0c.5-1 1.5-1.5 2-1.5s1.5.5 2 1.5a3 3 0 015 0C15.5 15 13.5 16 12 16z"
        fill="#FFD500"
      />
    </svg>
  )
}

// ─── HEART OUTLINE: Unfilled heart ───
export function HeartOutline({ size = 24, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <path
        d="M12 20s-8-5.5-8-10a4.5 4.5 0 018 0 4.5 4.5 0 018 0c0 4.5-8 10-8 10z"
        stroke="#FF6A00"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}

// ─── STAR: Rating / ranking ───
export function Star({ size = 24, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6z" fill="#FFD500"/>
      <path d="M12 5.5l1.4 4.4H18l-3.7 2.7 1.4 4.4L12 14.3l-3.7 2.7 1.4-4.4L6 9.9h4.6z" fill="#FF6A00"/>
    </svg>
  )
}

// ─── VERIFIED: Trust / check ───
export function Verified({ size = 24, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <circle cx="12" cy="12" r="10" fill="#10B981"/>
      <path d="M7.5 12l3.5 3.5 5.5-7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ─── CLOSE: Pass / dismiss ───
export function Close({ size = 24, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <circle cx="12" cy="12" r="10" fill="#1A1A1A" stroke="#333" strokeWidth="1"/>
      <path d="M8.5 8.5l7 7M15.5 8.5l-7 7" stroke="#666" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

// ─── CLOSE SOLID: Red dismiss ───
export function CloseSolid({ size = 24, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <circle cx="12" cy="12" r="10" fill="#C8102E"/>
      <path d="M8 8l8 8M16 8l-8 8" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

// ─── ORDER / CHECK MARK: Success / match ───
export function OrderMark({ size = 24, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <circle cx="12" cy="12" r="10" fill="#10B981"/>
      <path d="M7 12l3.5 3.5 6.5-7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ─── DOLLAR: Earnings / commission ───
export function Dollar({ size = 24, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <circle cx="12" cy="12" r="10" fill="#FFD500"/>
      <path d="M12 6.5v11M15 8.5c0-1.5-1.5-2.5-3-2.5s-3 1-3 2.5c0 2 3 2.5 3 4.5s-1.5 2.5-3 2.5-3 1-3 2.5 1.5 2.5 3 2.5 3-1 3-2.5" stroke="#0A0A0A" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
}

// ─── DOLLAR LINE: Earnings inline ───
export function DollarLine({ size = 24, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <path d="M12 6.5v11M15 8.5c0-1.5-1.5-2.5-3-2.5s-3 1-3 2.5c0 2 3 2.5 3 4.5s-1.5 2.5-3 2.5-3 1-3 2.5 1.5 2.5 3 2.5 3-1 3-2.5" stroke="#FFD500" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

// ─── LOCATION PIN ───
export function MapPin({ size = 24, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <path d="M12 2C8 2 5 5.5 5 9c0 5 7 13 7 13s7-8 7-13c0-3.5-3-7-7-7z" fill="#FF6A00"/>
      <circle cx="12" cy="9" r="3" fill="#FFD500"/>
    </svg>
  )
}

// ─── CAMERA: Upload / photo ───
export function Camera({ size = 24, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <rect x="2" y="6" width="20" height="14" rx="3" fill="#FF6A00"/>
      <circle cx="12" cy="13" r="4.5" fill="#FFD500"/>
      <circle cx="12" cy="13" r="2" fill="#0A0A0A"/>
      <path d="M7 6V4.5a.5.5 0 01.5-.5h9a.5.5 0 01.5.5V6" stroke="#FFD500" strokeWidth="1.5"/>
    </svg>
  )
}

// ─── UPLOAD: Upload action ───
export function Upload({ size = 24, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <path d="M12 16V4M8 8l4-4 4 4" stroke="#FF6A00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="2" y="16" width="20" height="4" rx="2" fill="#FF6A00"/>
      <rect x="4" y="17.5" width="16" height="1" rx="0.5" fill="#FFD500"/>
    </svg>
  )
}

// ─── TROPHY: Leaderboard ───
export function Trophy({ size = 24, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <path d="M7 4h10v5c0 3-2 5-4 6v2h4v2H7v-2h4v-2c-2-1-4-3-4-6V4z" fill="#FFD500"/>
      <path d="M7 5c-1 0-2 1-2 2s1 3 3 3 3-2 3-3-1-2-2-2H7z" fill="#FF6A00"/>
      <path d="M17 5c1 0 2 1 2 2s-1 3-3 3-3-2-3-3 1-2 2-2h2z" fill="#FF6A00"/>
      <path d="M9 14h6v2H9zM8 16h8v2H8zM10 18h4v4h-4z" fill="#FFD500"/>
    </svg>
  )
}

// ─── CLOCK: Recent / time ───
export function Clock({ size = 24, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <circle cx="12" cy="12" r="10" fill="#FF6A00"/>
      <path d="M12 7v5.5l3.5 2" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

// ─── GRID: App menu ───
export function Grid({ size = 24, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <rect x="3" y="3" width="7" height="7" rx="2" fill="#FF6A00"/>
      <rect x="14" y="3" width="7" height="7" rx="2" fill="#FFD500"/>
      <rect x="3" y="14" width="7" height="7" rx="2" fill="#FFD500"/>
      <rect x="14" y="14" width="7" height="7" rx="2" fill="#FF6A00"/>
    </svg>
  )
}

// ─── SWIPE LEFT: Pass ───
export function SwipeLeft({ size = 24, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <path d="M20 12H4M4 12l6-8M4 12l6 8" stroke="#666" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ─── SWIPE RIGHT: Order ───
export function SwipeRight({ size = 24, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <path d="M4 12h16M20 12l-6-8M20 12l-6 8" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ─── SUPER SWIPE: Up arrow ───
export function SuperSwipe({ size = 24, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <path d="M12 20V4M5 11l7-7 7 7" stroke="#FFD500" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ─── ARROW RIGHT: Next ───
export function ArrowRight({ size = 24, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ─── BOOKMARK: Saved ───
export function Bookmark({ size = 24, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <path d="M5 3h14a2 2 0 012 2v16l-8-4-8 4V5a2 2 0 012-2z" fill="#FF6A00"/>
      <path d="M5 3h14a2 2 0 012 2v16l-8-4-8 4V5a2 2 0 012-2z" stroke="#FFD500" strokeWidth="1" strokeLinejoin="round"/>
    </svg>
  )
}

// ─── GEAR / SETTINGS ───
export function Gear({ size = 24, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <circle cx="12" cy="12" r="3" fill="#FF6A00"/>
      <path d="M12 2v2M12 20v2M22 12h-2M4 12H2M19.07 4.93l-1.41 1.41M6.34 17.66l-1.41 1.41M19.07 19.07l-1.41-1.41M6.34 6.34L4.93 4.93" stroke="#FF6A00" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

// ─── FILTER: Settings / adjust ───
export function Filter({ size = 24, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <path d="M4 6h16M7 12h10M10 18h4" stroke="#FF6A00" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="7" cy="6" r="2" fill="#FFD500"/>
      <circle cx="12" cy="12" r="2" fill="#FF6A00"/>
      <circle cx="17" cy="18" r="2" fill="#FFD500"/>
    </svg>
  )
}

// ─── CUISINE / GLOBE: World ───
export function Globe({ size = 24, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <circle cx="12" cy="12" r="10" fill="#FF6A00"/>
      <path d="M12 2c0 5.5 4.5 10 10 10" stroke="#FFD500" strokeWidth="1.5"/>
      <path d="M2 12h20" stroke="#FFD500" strokeWidth="1.5"/>
      <path d="M12 2c-2.5 2.5-4 6-4 10s1.5 7.5 4 10c2.5-2.5 4-6 4-10S14.5 4.5 12 2z" stroke="#FFD500" strokeWidth="1.5"/>
    </svg>
  )
}

// ─── LEAF / HEALTH: Organic / healthy ───
export function Leaf({ size = 24, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <path d="M6 21c4-2 8-8 8-14C8 5 5 5 5 5s0 4 3 4c1 0 2-1 2-1s6 1 6 9c0-2-1-4-3-5" fill="#10B981"/>
      <path d="M9 13c1-1 2-3 2-5" stroke="#FFD500" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

// ─── SPARKLE: New / featured ───
export function Sparkle({ size = 24, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="#FFD500" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

// ─── CROWN: Elite tier ───
export function Crown({ size = 24, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <path d="M3 18h18v3H3zM3 18l3-10 5 4 2-6 2 6 5-4 3 10" fill="#FFD500"/>
      <circle cx="6" cy="7" r="2" fill="#FF6A00"/>
      <circle cx="12" cy="5" r="2" fill="#FF6A00"/>
      <circle cx="18" cy="7" r="2" fill="#FF6A00"/>
    </svg>
  )
}

// ─── COMMENT / CHAT ───
export function Comment({ size = 24, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <path d="M21 12c0 5-4 9-9 9s-9-4-9-9 4-9 9-9c2 0 4 .5 5.5 1.5L21 8v4z" fill="#FF6A00"/>
      <path d="M21 12c0 5-4 9-9 9" stroke="#FFD500" strokeWidth="1.5"/>
    </svg>
  )
}

// ─── NOTE / RECEIPT ───
export function Note({ size = 24, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <rect x="4" y="2" width="16" height="20" rx="2" fill="#FF6A00"/>
      <path d="M8 7h8M8 11h8M8 15h5" stroke="#FFD500" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

// ─── FIRE + DOLLAR: Earning trend ───
export function FireDollar({ size = 24, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <path d="M12 2C8 6 5 9.5 5 13.5a7 7 0 0014 0C19 9.5 16 6 12 2z" fill="#FF6A00"/>
      <path d="M12 8c0 2.5-2.5 4-2.5 7a2.5 2.5 0 005 0C14.5 12 12 10.5 12 8z" fill="#FFD500"/>
      <circle cx="18" cy="18" r="5" fill="#FFD500"/>
      <path d="M16.5 18.5v-2M18 17v3" stroke="#0A0A0A" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

// ─── BOLD CHECK ───
export function CheckBold({ size = 24, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <circle cx="12" cy="12" r="10" fill="#10B981"/>
      <path d="M7 12l3.5 3.5 6.5-7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ─── CHECK LINE (small inline) ───
export function CheckLine({ size = 24, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <path d="M5 12l5 5 9-10" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ─── X MARK ───
export function XMark({ size = 24, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <path d="M8 8l8 8M16 8l-8 8" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  )
}

// ─── SETTINGS GEAR (solid style) ───
export function SettingsGear({ size = 24, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <circle cx="12" cy="12" r="3" fill="#FF6A00"/>
      <path d="M12 2v2.5M12 19.5V22M22 12h-2.5M4.5 12H2M19.07 4.93l-1.77 1.77M6.7 17.3l-1.77 1.77M19.07 19.07l-1.77-1.77M6.7 6.7L4.93 4.93" stroke="#FF6A00" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  )
}

// ─── BOLD STAR ───
export function StarFilled({ size = 24, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#FFD500"/>
      <path d="M12 5l1.5 3.5L17 9.5l-3 2.5.5 3.5L12 14l-2.5 1.5.5-3.5-3-2.5 3.5-1L12 5z" fill="#FF6A00"/>
    </svg>
  )
}

// ─── CHAT BUBBLE ───
export function ChatBubble({ size = 24, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <path d="M21 12c0 5-4 9-9 9s-9-4-9-9 4-9 9-9c2 0 4 .5 5.5 1.5L21 8v4z" fill="#FF6A00"/>
      <path d="M21 12c0 5-4 9-9 9" stroke="#FFD500" strokeWidth="1.5"/>
    </svg>
  )
}

// ─── DOLLAR SIGN (brand) ───
export function DollarSign({ size = 24, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <circle cx="12" cy="12" r="10" fill="#FFD500"/>
      <path d="M12 6v12M15 8.5c0-1.5-1.5-2.5-3-2.5s-3 1-3 2.5c0 2 3 2.5 3 4.5s-1.5 2.5-3 2.5-3 1-3 2.5 1.5 2.5 3 2.5 3-1 3-2.5" stroke="#0A0A0A" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

// ─── MENU / BURGER ───
export function Menu({ size = 24, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <path d="M4 6h16M4 12h16M4 18h16" stroke="#FF6A00" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  )
}

// ─── FORKFLAME: Legacy combo (keep but refine) ───
export function ForkFlame({ size = 24, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <path d="M8 2v6M12 2v6M16 2v6" stroke="#FF6A00" strokeWidth="2" strokeLinecap="round"/>
      <path d="M12 8c-4 3-7 7-7 12a7 7 0 0014 0c0-5-3-9-7-12z" fill="#FF6A00"/>
      <path d="M12 12c-2.5 2-4 4.5-4 7.5a4 4 0 008 0c0-3-1.5-5.5-4-7.5z" fill="#FFD500"/>
    </svg>
  )
}

// ─── FORKFLAME LARGE: For match popups ───
export function ForkFlameLarge({ size = 24, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className} style={style}>
      <path d="M14 4v10M20 4v10M26 4v10" stroke="#FF6A00" strokeWidth="3" strokeLinecap="round"/>
      <path d="M20 14c-7 5-12 11-12 20a12 12 0 0024 0C32 25 27 19 20 14z" fill="#FF6A00"/>
      <path d="M20 20c-4 3.5-7 7.5-7 12.5a7 7 0 0014 0c0-5-3-9-7-12.5z" fill="#FFD500"/>
    </svg>
  )
}

// ─── PROTEIN / BARBELL ───
export function Protein({ size = 24, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <rect x="2" y="8" width="4" height="8" rx="1" fill="#FF6A00"/>
      <rect x="18" y="8" width="4" height="8" rx="1" fill="#FF6A00"/>
      <path d="M6 10h12M6 14h12M9 10v4M12 10v4M15 10v4" stroke="#FFD500" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

// ─── VEGGIE / PLANT ───
export function Veggie({ size = 24, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <path d="M12 22V12" stroke="#10B981" strokeWidth="2" strokeLinecap="round"/>
      <path d="M12 12c-4 0-7-3-7-7 3 0 7 2 7 7z" fill="#10B981"/>
      <path d="M12 12c4 0 7-3 7-7-3 0-7 2-7 7z" fill="#FFD500"/>
    </svg>
  )
}

// ─── LOW CALORIE ───
export function Light({ size = 24, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <circle cx="12" cy="12" r="4" fill="#FFD500"/>
      <path d="M12 2v2M12 20v2M22 12h-2M4 12H2M19.07 4.93l-1.41 1.41M6.34 17.66l-1.41 1.41M19.07 19.07l-1.41-1.41M6.34 6.34L4.93 4.93" stroke="#FF6A00" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

// ─── SEARCH ───
export function Search({ size = 24, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <circle cx="11" cy="11" r="7" stroke="#FF6A00" strokeWidth="2"/>
      <path d="M16 16l6 6" stroke="#FFD500" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

// ─── SPARK: Rising / trending ───
export function Rising({ size = 24, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <path d="M3 20l5-10 4 4 5-8 4 6" stroke="#FF6A00" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="20" cy="7" r="3" fill="#FFD500"/>
    </svg>
  )
}

// ─── CHEVRON DOWN ───
export function ChevronDown({ size = 24, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ─── CHEVRON RIGHT ───
export function ChevronRight({ size = 24, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ─── SPICE LEVEL: Flame icons for heat ───
export function Spice1({ size = 24, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <path d="M12 4c0 3-3 5-3 8a3 3 0 006 0c0-3-3-5-3-8z" fill="#FF6A00" opacity="0.3"/>
    </svg>
  )
}
export function Spice2({ size = 24, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <path d="M12 4c0 3-3 5-3 8a3 3 0 006 0c0-3-3-5-3-8z" fill="#FF6A00" opacity="0.6"/>
    </svg>
  )
}
export function Spice3({ size = 24, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <path d="M12 4c0 3-3 5-3 8a3 3 0 006 0c0-3-3-5-3-8z" fill="#FF6A00"/>
    </svg>
  )
}
export function Spice4({ size = 24, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <path d="M12 4c0 3-3 5-3 8a3 3 0 006 0c0-3-3-5-3-8z" fill="#FF6A00"/>
      <path d="M12 8c0 2-2 3-2 5.5a2 2 0 004 0c0-2.5-2-3.5-2-5.5z" fill="#FFD500"/>
    </svg>
  )
}
export function Spice5({ size = 24, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <path d="M12 2c0 4-4 6-4 10a4 4 0 008 0c0-4-4-6-4-10z" fill="#FF6A00"/>
      <path d="M12 6c0 2.5-2.5 4-2.5 7a2.5 2.5 0 005 0C14.5 12 12 10.5 12 6z" fill="#FFD500"/>
    </svg>
  )
}

// ─── PRICE TIER: Dollar signs ───
export function PriceDollar({ size = 24, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <path d="M8 8h5a3 3 0 010 6H8M8 14h6a3 3 0 010 6H8" stroke="#FFD500" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  )
}

// ─── NO EMOJI: Use these named icons everywhere ───
// Dietary restriction icons
export function VeggieIcon({ size = 24, className, style }: IconProps) { return <Leaf size={size} className={className} style={style} /> }
export function GlobeIcon({ size = 24, className, style }: IconProps) { return <Globe size={size} className={className} style={style} /> }
export function ProteinIcon({ size = 24, className, style }: IconProps) { return <Protein size={size} className={className} style={style} /> }
export function LightIcon({ size = 24, className, style }: IconProps) { return <Light size={size} className={className} style={style} /> }
export function RisingIcon({ size = 24, className, style }: IconProps) { return <Rising size={size} className={className} style={style} /> }
export function FireIcon({ size = 24, className, style }: IconProps) { return <Flame size={size} className={className} style={style} /> }
