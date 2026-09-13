'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plate, Globe, Flame, Dollar, Gear, ArrowRight, CheckLine, Leaf, Protein, Light, MapPin, Sparkle, Filter, Crown, Star, Rising, Close, Veggie as VeggieIcon, Rising as RisingIcon, FireIcon } from '@/app/components/HwIcon'

// ─── DIETARY ───
const DIETARY = [
  { id: 'vegetarian',    label: 'Vegetarian',    color: '#10B981' },
  { id: 'vegan',         label: 'Vegan',         color: '#10B981' },
  { id: 'keto',          label: 'Keto',          color: '#FF6A00' },
  { id: 'halal',         label: 'Halal',         color: '#10B981' },
  { id: 'kosher',        label: 'Kosher',        color: '#10B981' },
  { id: 'gluten-free',   label: 'Gluten-Free',  color: '#10B981' },
  { id: 'dairy-free',    label: 'Dairy-Free',    color: '#10B981' },
  { id: 'low-carb',      label: 'Low Carb',      color: '#FF6A00' },
  { id: 'high-protein',  label: 'High Protein',  color: '#FF6A00' },
  { id: 'low-calorie',   label: 'Low Calorie',   color: '#FFD500' },
  { id: 'organic',       label: 'Organic',        color: '#10B981' },
  { id: 'paleo',         label: 'Paleo',          color: '#FF6A00' },
  { id: 'whole30',       label: 'Whole30',        color: '#10B981' },
  { id: 'nut-free',      label: 'Nut-Free',       color: '#EF4444' },
  { id: 'sugar-free',    label: 'Sugar-Free',    color: '#FFD500' },
  { id: 'low-fat',       label: 'Low Fat',        color: '#FFD500' },
]

// ─── CUISINES ───
const CUISINES = [
  'American','Mexican','Italian','Chinese','Japanese','Thai','Indian',
  'Mediterranean','Cajun','Creole','Soul Food','Caribbean','Korean',
  'Vietnamese','French','Greek','BBQ','Middle Eastern','Ethiopian',
  'Jamaican','Hawaiian','Filipino','Seafood','Breakfast','Sandwich',
  'Pizza','Tacos','Pasta','Ramen','Sushi','Poke','Wings','Burger',
  'Steak','Curry','Noodles','Dessert','Smoothie','Coffee',
]

// ─── HEALTH ───
const HEALTH = [
  { id: 'healthy',        label: 'Healthy',        color: '#10B981' },
  { id: 'indulgent',      label: 'Indulgent',      color: '#FF6A00' },
  { id: 'balanced',       label: 'Balanced',       color: '#FFD500' },
  { id: 'protein-packed', label: 'Protein Pack',   color: '#FF6A00' },
  { id: 'light',          label: 'Light',           color: '#10B981' },
  { id: 'comfort-food',   label: 'Comfort Food',   color: '#FF6A00' },
  { id: 'vegan-bowl',     label: 'Vegan Bowl',    color: '#10B981' },
]

// ─── SPICE LEVELS ───
const SPICE = [
  { id: 0, label: 'Any',   color: '#555' },
  { id: 1, label: 'None',   color: '#888' },
  { id: 2, label: 'Mild',   color: '#FFD500' },
  { id: 3, label: 'Medium', color: '#FF8C00' },
  { id: 4, label: 'Hot',    color: '#FF6A00' },
  { id: 5, label: 'Blazing',color: '#C8102E' },
]

// ─── PRICE TIERS ───
const PRICE = [
  { id: '$',    label: '$',     desc: 'Under $10' },
  { id: '$$',   label: '$$',   desc: '$10–$20' },
  { id: '$$$',  label: '$$$',  desc: '$20–$40' },
  { id: '$$$$', label: '$$$$', desc: 'Premium' },
]

// ─── ICON MAPPING FOR HEALTH ───
const HEALTH_ICON: Record<string, React.ComponentType<any>> = {
  healthy: Leaf, indulgent: Flame, balanced: Sparkle,
  'protein-packed': Protein, light: Light,
  'comfort-food': Flame, 'vegan-bowl': VeggieIcon,
}

// ─── SECTION ───
function Section({ title, subtitle, icon: Icon, iconColor, children, open, onToggle }: {
  title: string; subtitle?: string; icon: React.ComponentType<any>; iconColor?: string;
  children: React.ReactNode; open: boolean; onToggle: () => void;
}) {
  return (
    <div className={`rounded-2xl border transition-all ${open ? 'bg-[#111] border-white/10' : 'border-transparent'}`}>
      <button className="w-full flex items-center gap-3 px-5 py-4" onClick={onToggle}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: (iconColor || '#FF6A00') + '20' }}>
          <Icon size={18} style={{ color: iconColor || '#FF6A00' }} />
        </div>
        <div className="flex-1 text-left">
          <p className="font-bold text-white text-sm">{title}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
          style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }}>
          <path d="M4 6l4 4 4-4" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  )
}

// ─── MAIN ───
export default function PreferencesPage() {
  const [prefs, setPrefs] = useState({
    dietary: [] as string[],
    cuisines: [] as string[],
    health: [] as string[],
    spice: 0,
    price: [] as string[],
  })
  const [saved, setSaved] = useState(false)
  const [open, setOpen] = useState<string | null>(null)

  useEffect(() => {
    const s = localStorage.getItem('hw_prefs')
    if (s) setPrefs(JSON.parse(s))
  }, [])

  const toggle = <T extends string>(arr: T[], setArr: (v: T[]) => void, item: T) => {
    if (arr.includes(item)) setArr(arr.filter(i => i !== item))
    else setArr([...arr, item])
  }

  const total = prefs.dietary.length + prefs.cuisines.length + prefs.health.length + prefs.price.length + (prefs.spice > 0 ? 1 : 0)

  const save = () => {
    localStorage.setItem('hw_prefs', JSON.stringify(prefs))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const reset = () => {
    setPrefs({ dietary: [], cuisines: [], health: [], spice: 0, price: [] })
    localStorage.removeItem('hw_prefs')
  }

  const totalSelected = (arr: string[]) => arr.length

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0A0A0A]/95 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-lg mx-auto flex items-center justify-between px-4 py-3.5">
          <Link href="/" className="text-gray-500 hover:text-white transition">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M13 4l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <div className="text-center">
            <h1 className="font-black text-white text-base">Your Preferences</h1>
            {total > 0 && <p className="text-[10px] text-gray-500">{total} active</p>}
          </div>
          <button onClick={save}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
              saved ? 'bg-[#10B981] text-white' : total > 0 ? 'bg-[#FF6A00] text-white' : 'bg-white/10 text-gray-300'
            }`}>
            {saved ? 'Saved' : 'Done'}
          </button>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-5 pb-32">
        {/* Hero */}
        <div className="flex items-start gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-[#FF6A00]/15 flex items-center justify-center flex-shrink-0">
            <Filter size={20} style={{ color: '#FF6A00' }} />
          </div>
          <div>
            <h2 className="font-black text-white text-lg leading-tight">Build Your Taste Profile</h2>
            <p className="text-gray-500 text-xs mt-0.5">Tap a category to filter your feed.</p>
          </div>
        </div>

        {/* Active pills */}
        {total > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-5">
            {prefs.dietary.map(d => (
              <span key={d} className="flex items-center gap-1 pl-2 pr-1.5 py-1 bg-[#10B981]/15 border border-[#10B981]/30 rounded-full text-[10px] font-semibold text-[#10B981]">
                {DIETARY.find(x => x.id === d)?.label}
                <button onClick={() => toggle(prefs.dietary, v => setPrefs(p => ({...p, dietary: v})), d)}>
                  <Close size={9} />
                </button>
              </span>
            ))}
            {prefs.cuisines.map(c => (
              <span key={c} className="flex items-center gap-1 pl-2 pr-1.5 py-1 bg-[#FF6A00]/15 border border-[#FF6A00]/30 rounded-full text-[10px] font-semibold text-[#FF6A00]">
                {c}
                <button onClick={() => toggle(prefs.cuisines, v => setPrefs(p => ({...p, cuisines: v})), c)}>
                  <Close size={9} />
                </button>
              </span>
            ))}
            {prefs.health.map(h => (
              <span key={h} className="flex items-center gap-1 pl-2 pr-1.5 py-1 bg-[#FFD500]/15 border border-[#FFD500]/30 rounded-full text-[10px] font-semibold text-[#FFD500]">
                {HEALTH.find(x => x.id === h)?.label}
                <button onClick={() => toggle(prefs.health, v => setPrefs(p => ({...p, health: v})), h)}>
                  <Close size={9} />
                </button>
              </span>
            ))}
            {prefs.spice > 0 && (
              <span className="flex items-center gap-1 pl-2 pr-1.5 py-1 bg-[#C8102E]/15 border border-[#C8102E]/30 rounded-full text-[10px] font-semibold text-[#C8102E]">
                {SPICE.find(s => s.id === prefs.spice)?.label}
                <button onClick={() => setPrefs(p => ({...p, spice: 0}))}><Close size={9} /></button>
              </span>
            )}
            {prefs.price.map(p => (
              <span key={p} className="flex items-center gap-1 pl-2 pr-1.5 py-1 bg-[#FFD500]/15 border border-[#FFD500]/30 rounded-full text-[10px] font-semibold text-[#FFD500]">
                {p}
                <button onClick={() => toggle(prefs.price, v => setPrefs(p => ({...p, price: v})), p)}><Close size={9} /></button>
              </span>
            ))}
          </div>
        )}

        {/* Sections */}
        <div className="space-y-2">
          {/* Dietary */}
          <Section
            title="Dietary"
            subtitle={prefs.dietary.length === 0 ? 'Vegetarian, vegan, keto, halal...' : `${prefs.dietary.length} selected`}
            icon={Leaf} iconColor="#10B981"
            open={open === 'dietary'}
            onToggle={() => setOpen(open === 'dietary' ? null : 'dietary')}
          >
            <div className="flex flex-wrap gap-2">
              {DIETARY.map(item => (
                <button
                  key={item.id}
                  onClick={() => toggle(prefs.dietary, v => setPrefs(p => ({...p, dietary: v})), item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
                    prefs.dietary.includes(item.id)
                      ? 'border-transparent text-white'
                      : 'border-white/10 text-gray-400 hover:border-white/20'
                  }`}
                  style={prefs.dietary.includes(item.id) ? { backgroundColor: item.color } : {}}
                >
                  {prefs.dietary.includes(item.id) ? (
                    <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                      <path d="M1.5 4.5L3.5 6.5L7.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  ) : null}
                  {item.label}
                </button>
              ))}
            </div>
          </Section>

          {/* Cuisines */}
          <Section
            title="Cuisines"
            subtitle={prefs.cuisines.length === 0 ? 'All cuisines' : `${prefs.cuisines.length} selected`}
            icon={Globe} iconColor="#FF6A00"
            open={open === 'cuisines'}
            onToggle={() => setOpen(open === 'cuisines' ? null : 'cuisines')}
          >
            <div className="flex flex-wrap gap-2">
              {CUISINES.map(c => (
                <button
                  key={c}
                  onClick={() => toggle(prefs.cuisines, v => setPrefs(p => ({...p, cuisines: v})), c)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
                    prefs.cuisines.includes(c)
                      ? 'border-transparent bg-[#FF6A00] text-white'
                      : 'border-white/10 text-gray-400 hover:border-white/20'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </Section>

          {/* Health */}
          <Section
            title="Health"
            subtitle={prefs.health.length === 0 ? 'Healthy, indulgent, balanced' : `${prefs.health.length} selected`}
            icon={Sparkle} iconColor="#FFD500"
            open={open === 'health'}
            onToggle={() => setOpen(open === 'health' ? null : 'health')}
          >
            <div className="grid grid-cols-3 gap-2">
              {HEALTH.map(item => {
                const ItemIcon = HEALTH_ICON[item.id] || Leaf
                return (
                  <button
                    key={item.id}
                    onClick={() => toggle(prefs.health, v => setPrefs(p => ({...p, health: v})), item.id)}
                    className={`relative flex flex-col items-center justify-center gap-2 py-4 rounded-xl border text-xs font-bold transition-all duration-150 ${
                      prefs.health.includes(item.id)
                        ? 'border-transparent'
                        : 'border-white/10 text-gray-400 hover:border-white/20'
                    }`}
                    style={prefs.health.includes(item.id)
                      ? { backgroundColor: item.color + '22', borderColor: item.color + '60', color: item.color }
                      : {}}
                  >
                    {prefs.health.includes(item.id) && (
                      <span className="absolute top-1.5 right-1.5">
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                          <path d="M1 4l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </span>
                    )}
                    <ItemIcon size={22} style={{ color: item.color }} />
                    {item.label}
                  </button>
                )
              })}
            </div>
          </Section>

          {/* Spice */}
          <Section
            title="Spice Tolerance"
            subtitle={prefs.spice === 0 ? 'Any heat level' : SPICE.find(s => s.id === prefs.spice)?.label}
            icon={Flame} iconColor="#C8102E"
            open={open === 'spice'}
            onToggle={() => setOpen(open === 'spice' ? null : 'spice')}
          >
            <div className="flex gap-2">
              {SPICE.map(level => (
                <button
                  key={level.id}
                  onClick={() => setPrefs(p => ({...p, spice: p.spice === level.id ? 0 : level.id}))}
                  className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-xl border text-xs font-bold transition-all duration-150 ${
                    prefs.spice === level.id ? 'border-transparent text-white' : 'border-white/10 text-gray-500'
                  }`}
                  style={prefs.spice === level.id ? { backgroundColor: level.color } : {}}
                >
                  <span style={{ color: prefs.spice === level.id ? '#fff' : level.color }}>
                    <Flame size={22} />
                  </span>
                  {level.label}
                </button>
              ))}
            </div>
          </Section>

          {/* Price */}
          <Section
            title="Price Range"
            subtitle={prefs.price.length === 0 ? 'All price ranges' : prefs.price.join(' · ')}
            icon={Dollar} iconColor="#FFD500"
            open={open === 'price'}
            onToggle={() => setOpen(open === 'price' ? null : 'price')}
          >
            <div className="grid grid-cols-4 gap-2">
              {PRICE.map(item => (
                <button
                  key={item.id}
                  onClick={() => toggle(prefs.price, v => setPrefs(p => ({...p, price: v})), item.id)}
                  className={`flex flex-col items-center gap-1 py-4 rounded-xl border text-xs font-bold transition-all duration-150 ${
                    prefs.price.includes(item.id) ? 'border-transparent text-white' : 'border-white/10 text-gray-400'
                  }`}
                  style={prefs.price.includes(item.id) ? { backgroundColor: '#FFD500' } : {}}
                >
                  <span className={prefs.price.includes(item.id) ? 'text-[#0A0A0A]' : 'text-[#FFD500]'}>
                    <Dollar size={20} />
                  </span>
                  <span className={prefs.price.includes(item.id) ? 'text-[#0A0A0A]' : ''}>{item.label}</span>
                  <span className={`text-[9px] font-normal ${prefs.price.includes(item.id) ? 'text-[#0A0A0A]/60' : 'text-gray-600'}`}>
                    {item.desc}
                  </span>
                </button>
              ))}
            </div>
          </Section>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0A0A0A]/95 backdrop-blur-xl border-t border-white/[0.06] z-50">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={reset} className="px-4 py-2.5 text-gray-500 text-xs font-semibold hover:text-white transition">
            Reset
          </button>
          <Link
            href="/swipe"
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#FF6A00] text-white rounded-xl font-bold text-sm hover:bg-[#E05A00] transition"
          >
            See Results <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  )
}
