'use client'

import { CloseIcon, FilterIcon, LocationIcon } from '@/app/components/icons/HungerIcons'
import { CUISINE_TAGS, DIETARY_TAGS, HEALTH_CATEGORIES } from '@/lib/tags'

interface FilterState {
  cuisine: string
  dietary: string
  health: string
  priceRange: string
  spiceLevel: number
}

interface FilterSheetProps {
  open: boolean
  onClose: () => void
  filters: FilterState
  onChange: (filters: FilterState) => void
  onApply: () => void
  mode: 'for-you' | 'nearby' | 'trending'
  onModeChange: (mode: 'for-you' | 'nearby' | 'trending') => void
  radius: number
  onRadiusChange: (radius: number) => void
  locationState: 'idle' | 'requesting' | 'ready' | 'denied' | 'unavailable'
  onRequestLocation: () => void
}

const PRICE_OPTIONS = [
  { value: '', label: 'Any price' },
  { value: '$', label: '$' },
  { value: '$$', label: '$$' },
  { value: '$$$', label: '$$$' },
]

export function FilterSheet({ open, onClose, filters, onChange, onApply, mode, onModeChange, radius, onRadiusChange, locationState, onRequestLocation }: FilterSheetProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative bg-hs-charcoal rounded-t-[2rem] border-t border-white/[0.06] p-5 pb-8 safe-bottom animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2 text-hs-cream">
            <FilterIcon size={20} />
            <h2 className="text-lg font-bold">Discovery Filters</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close filters"
            className="w-10 h-10 rounded-full bg-hs-soft flex items-center justify-center text-hs-cream hover:bg-hs-graphite transition"
          >
            <CloseIcon size={20} />
          </button>
        </div>

        <div className="space-y-6 max-h-[60vh] overflow-y-auto scrollbar-hide">
          <section>
            <label className="text-xs font-semibold text-hs-gold uppercase tracking-wider mb-3 block">Feed</label>
            <div className="grid grid-cols-3 gap-2" role="group" aria-label="Discovery feed mode">
              {(['for-you', 'nearby', 'trending'] as const).map((value) => (
                <button key={value} onClick={() => onModeChange(value)} aria-pressed={mode === value}
                  className={`min-h-11 rounded-xl px-2 text-xs font-bold capitalize ${mode === value ? 'bg-hs-gold text-hs-black' : 'bg-hs-soft text-hs-cream'}`}>
                  {value.replace('-', ' ')}
                </button>
              ))}
            </div>
            {mode === 'nearby' && (
              <div className="mt-3 rounded-2xl bg-hs-soft p-3">
                <button type="button" onClick={onRequestLocation} className="w-full min-h-11 flex items-center gap-3 text-hs-cream text-sm font-medium">
                  <LocationIcon size={18} className="text-hs-gold" />
                  {locationState === 'requesting' ? 'Requesting location…' : locationState === 'ready' ? 'Location ready' : 'Use my location'}
                </button>
                <label htmlFor="discover-radius" className="mt-2 block text-xs text-hs-gray">Within {radius} miles</label>
                <select id="discover-radius" value={radius} onChange={(event) => onRadiusChange(Number(event.target.value))}
                  className="mt-1 w-full min-h-11 rounded-xl border border-white/10 bg-hs-charcoal px-3 text-sm text-hs-cream">
                  {[5, 10, 15, 25, 50].map((miles) => <option key={miles} value={miles}>{miles} miles</option>)}
                </select>
                {(locationState === 'denied' || locationState === 'unavailable') && (
                  <p role="status" className="mt-2 text-xs text-hs-red">Location is unavailable. Choose For You or allow location access to use Nearby.</p>
                )}
              </div>
            )}
          </section>

          <section>
            <label className="text-xs font-semibold text-hs-gold uppercase tracking-wider mb-3 block">Cuisine / Food Type</label>
            <div className="flex flex-wrap gap-2">
              {CUISINE_TAGS.slice(0, 12).map((tag) => (
                <button
                  key={tag}
                  onClick={() => onChange({ ...filters, cuisine: filters.cuisine === tag ? '' : tag })}
                  className={`px-3 py-2 rounded-full text-xs font-semibold transition border ${
                    filters.cuisine === tag
                      ? 'bg-hs-gold text-hs-black border-hs-gold'
                      : 'bg-hs-soft text-hs-cream border-transparent hover:border-hs-gold/30'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </section>

          <section>
            <label className="text-xs font-semibold text-hs-gold uppercase tracking-wider mb-3 block">Dietary</label>
            <div className="flex flex-wrap gap-2">
              {DIETARY_TAGS.slice(0, 6).map((tag) => (
                <button
                  key={tag}
                  onClick={() => onChange({ ...filters, dietary: filters.dietary === tag ? '' : tag })}
                  className={`px-3 py-2 rounded-full text-xs font-semibold transition border ${
                    filters.dietary === tag
                      ? 'bg-hs-gold text-hs-black border-hs-gold'
                      : 'bg-hs-soft text-hs-cream border-transparent hover:border-hs-gold/30'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </section>

          <section>
            <label className="text-xs font-semibold text-hs-gold uppercase tracking-wider mb-3 block">Health Focus</label>
            <div className="flex flex-wrap gap-2">
              {HEALTH_CATEGORIES.slice(0, 6).map((tag) => (
                <button
                  key={tag}
                  onClick={() => onChange({ ...filters, health: filters.health === tag ? '' : tag })}
                  className={`px-3 py-2 rounded-full text-xs font-semibold transition border ${
                    filters.health === tag
                      ? 'bg-hs-gold text-hs-black border-hs-gold'
                      : 'bg-hs-soft text-hs-cream border-transparent hover:border-hs-gold/30'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </section>

          <section>
            <label className="text-xs font-semibold text-hs-gold uppercase tracking-wider mb-3 block">Price Range</label>
            <div className="flex gap-2">
              {PRICE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onChange({ ...filters, priceRange: opt.value })}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition border ${
                    filters.priceRange === opt.value
                      ? 'bg-hs-gold text-hs-black border-hs-gold'
                      : 'bg-hs-soft text-hs-cream border-transparent hover:border-hs-gold/30'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="mt-6 pt-4 border-t border-white/[0.06] flex gap-3">
          <button
            onClick={() => {
              onChange({ cuisine: '', dietary: '', health: '', priceRange: '', spiceLevel: 0 })
            }}
            className="flex-1 py-3 rounded-xl bg-hs-soft text-hs-cream font-semibold text-sm hover:bg-hs-graphite transition"
          >
            Reset
          </button>
          <button
            onClick={onApply}
            className="flex-[2] py-3 rounded-xl bg-hs-gold text-hs-black font-bold text-sm hover:bg-hs-gold-light transition"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}
