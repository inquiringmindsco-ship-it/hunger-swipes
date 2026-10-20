'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { ArrowLeft, Camera, Link as LinkIcon, Loader2, Search, Plus, CheckCircle2, XCircle, Store, MapPin, ExternalLink, Utensils, Image as ImageIcon, AlertCircle, ChevronDown } from 'lucide-react'
import { adminFetch } from '@/lib/admin-fetch'

interface Place {
  id: string
  name: string
  location_text?: string
  address?: string
  city?: string
  state?: string
  postal_code?: string
  latitude?: number
  longitude?: number
  phone?: string
  website?: string
  category?: string
  cuisine?: string
}

interface PlaceFormData {
  name: string
  location_text: string
  address: string
  city: string
  state: string
  postal_code: string
  latitude: string
  longitude: string
  phone: string
  website: string
  category: string
  cuisine: string
}

interface DishFormData {
  dish_name: string
  description: string
  price: string
  category: string
  cuisine: string
  tags: string
  image_url: string
  source_url: string
  source_type: string
  rights_status: 'owner_approved' | 'permission_required'
  notes: string
  is_featured_dish: boolean
}

interface Candidate {
  id: string
  place_id: string
  dish_name?: string
  image_url: string
  source_url?: string
  source_type?: string
  rights_status: string
  usage_status?: string | null
  notes?: string
  created_at: string
  place?: { id: string; name: string; location_text?: string } | null
  adminNotice?: string
}

interface Dish {
  id: string
  name: string
  status: string
  price?: number
  photo_url?: string
  category?: string
  seller?: { business_name?: string }
}

interface GapPlace {
  id: string
  name: string
  location_text?: string
  address?: string
  city?: string
  state?: string
  category?: string
  cuisine?: string
}

type Tab = 'add' | 'gaps' | 'candidates' | 'dishes'
type ImageMode = 'upload' | 'url'

const COMMON_CATEGORIES = [
  'Appetizer',
  'Breakfast',
  'Brunch',
  'Burger',
  'Dessert',
  'Dinner',
  'Drink',
  'Lunch',
  'Pasta',
  'Pizza',
  'Salad',
  'Sandwich',
  'Seafood',
  'Snack',
  'Soup',
  'Sushi',
  'Taco',
  'Vegan',
  'Vegetarian',
  'Wings',
]

const SOURCE_TYPES = [
  'restaurant website',
  'menu',
  'owner-provided',
  'brand asset',
  'social media',
  'review site',
  'other',
]

const RIGHTS_STATUSES = [
  { value: 'owner_approved', label: 'Owner approved' },
  { value: 'permission_required', label: 'Permission required' },
]

const CANDIDATE_ACTIONS = [
  { action: 'stage', label: 'Stage', icon: ImageIcon, tone: 'secondary' },
  { action: 'approve', label: 'Approve', icon: CheckCircle2, tone: 'success' },
  { action: 'unstage', label: 'Unstage', icon: XCircle, tone: 'warning' },
  { action: 'reject', label: 'Reject', icon: XCircle, tone: 'danger' },
] as const

export default function FoodIntakePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0D0D0D] text-white flex items-center justify-center">Loading...</div>}>
      <FoodIntakeContent />
    </Suspense>
  )
}

function FoodIntakeContent() {
  const [authenticated, setAuthenticated] = useState(false)
  const [secret, setSecret] = useState('')
  const [tab, setTab] = useState<Tab>('add')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  // Place selection / creation
  const [placeSearch, setPlaceSearch] = useState('')
  const [placeResults, setPlaceResults] = useState<Place[]>([])
  const [placeSearchOpen, setPlaceSearchOpen] = useState(false)
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null)
  const [placeForm, setPlaceForm] = useState<PlaceFormData>({
    name: '',
    location_text: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    latitude: '',
    longitude: '',
    phone: '',
    website: '',
    category: '',
    cuisine: '',
  })
  const [creatingPlace, setCreatingPlace] = useState(false)

  // Dish form
  const [imageMode, setImageMode] = useState<ImageMode>('url')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dishForm, setDishForm] = useState<DishFormData>({
    dish_name: '',
    description: '',
    price: '',
    category: '',
    cuisine: '',
    tags: '',
    image_url: '',
    source_url: '',
    source_type: 'restaurant website',
    rights_status: 'permission_required',
    notes: '',
    is_featured_dish: false,
  })
  const [submitting, setSubmitting] = useState(false)

  // Lists
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [dishes, setDishes] = useState<Dish[]>([])
  const [gaps, setGaps] = useState<GapPlace[]>([])
  const [gapsFilter, setGapsFilter] = useState('')
  const [candidateNotesEdit, setCandidateNotesEdit] = useState<Record<string, string>>({})
  const [candidateSaving, setCandidateSaving] = useState<string | null>(null)

  useEffect(() => {
    adminFetch('/api/admin/session')
      .then((response) => setAuthenticated(response.ok))
      .catch(() => setAuthenticated(false))
  }, [])

  const showError = (text: string) => {
    setError(text)
    setTimeout(() => setError(''), 5000)
  }

  const showMessage = (text: string) => {
    setMessage(text)
    setTimeout(() => setMessage(''), 4000)
  }

  const searchPlaces = useCallback(async () => {
    if (!placeSearch.trim()) return
    setLoading(true)
    try {
      const res = await adminFetch(`/api/places?q=${encodeURIComponent(placeSearch)}&limit=20`, {
        headers: { 'x-admin-secret': secret },
      })
      const data = await res.json()
      setPlaceResults(data.places || [])
      setPlaceSearchOpen(true)
    } catch {
      showError('Failed to search places')
    } finally {
      setLoading(false)
    }
  }, [placeSearch, secret])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (placeSearch.trim().length >= 2) searchPlaces()
    }, 250)
    return () => clearTimeout(timer)
  }, [placeSearch, searchPlaces])

  const loadCandidates = useCallback(async () => {
    try {
      const res = await adminFetch('/api/admin/place-image-candidates', {
        headers: { 'x-admin-secret': secret },
      })
      const data = await res.json()
      setCandidates(data.candidates || [])
    } catch {
      showError('Failed to load candidates')
    }
  }, [secret])

  const loadDishes = useCallback(async () => {
    try {
      const res = await adminFetch('/api/admin/dishes', {
        headers: { 'x-admin-secret': secret },
      })
      const data = await res.json()
      setDishes(data.dishes || [])
    } catch {
      showError('Failed to load dishes')
    }
  }, [secret])

  const loadGaps = useCallback(async () => {
    try {
      const res = await adminFetch(`/api/admin/food-intake/gaps?${gapsFilter ? `city=${encodeURIComponent(gapsFilter)}` : ''}`, {
        headers: { 'x-admin-secret': secret },
      })
      const data = await res.json()
      setGaps(data.places || [])
    } catch {
      showError('Failed to load gaps')
    }
  }, [secret, gapsFilter])

  useEffect(() => {
    if (!authenticated) return
    loadCandidates()
    loadDishes()
    loadGaps()
  }, [authenticated, loadCandidates, loadDishes, loadGaps])

  const handlePlaceField = (field: keyof PlaceFormData, value: string) => {
    setPlaceForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleDishField = (field: keyof DishFormData, value: string | boolean) => {
    setDishForm((prev) => ({ ...prev, [field]: value }))
  }

  const createPlace = async () => {
    const name = placeForm.name.trim()
    const location = placeForm.location_text.trim()
    if (name.length < 2 || location.length < 2) {
      showError('Place name and location are required')
      return
    }
    setCreatingPlace(true)
    try {
      const res = await adminFetch('/api/places', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': secret,
        },
        body: JSON.stringify({
          name,
          location_text: location,
          address: placeForm.address || undefined,
          city: placeForm.city || undefined,
          state: placeForm.state || undefined,
          postal_code: placeForm.postal_code || undefined,
          latitude: placeForm.latitude ? Number(placeForm.latitude) : undefined,
          longitude: placeForm.longitude ? Number(placeForm.longitude) : undefined,
          phone: placeForm.phone || undefined,
          website: placeForm.website || undefined,
          category: placeForm.category || undefined,
          cuisine: placeForm.cuisine || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to create place')
      setSelectedPlace(data.place)
      setPlaceSearch('')
      setPlaceResults([])
      setPlaceSearchOpen(false)
      showMessage(data.place?.id ? 'Place selected' : 'Place created')
    } catch (err: any) {
      showError(err.message || 'Failed to create place')
    } finally {
      setCreatingPlace(false)
    }
  }

  const uploadImage = async (): Promise<string | null> => {
    if (!uploadFile) return null
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', uploadFile)
      const res = await adminFetch('/api/admin/media', {
        method: 'POST',
        headers: { 'x-admin-secret': secret },
        body: form,
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Upload failed')
      // Accept either a returned media row or a publicUrl field.
      return data.media?.public_url || data.media?.url || data.publicUrl || data.url || null
    } catch (err: any) {
      showError(err.message || 'Upload failed')
      return null
    } finally {
      setUploading(false)
    }
  }

  const submitIntake = async () => {
    if (!selectedPlace) {
      showError('Select or create a place first')
      return
    }
    if (!dishForm.dish_name.trim()) {
      showError('Dish name is required')
      return
    }

    let imageUrl = dishForm.image_url.trim()
    if (imageMode === 'upload') {
      if (!uploadFile) {
        showError('Choose an image to upload')
        return
      }
      const uploaded = await uploadImage()
      if (!uploaded) return
      imageUrl = uploaded
    } else {
      if (!imageUrl) {
        showError('Image URL is required for URL mode')
        return
      }
      if (!dishForm.source_url.trim()) {
        showError('Source URL is required')
        return
      }
    }

    setSubmitting(true)
    try {
      const tags = dishForm.tags
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
      const price = dishForm.price ? Number(dishForm.price) : undefined

      const payload = {
        place_id: selectedPlace.id,
        place_created: false,
        dish_name: dishForm.dish_name.trim(),
        description: dishForm.description.trim() || undefined,
        price,
        category: dishForm.category || undefined,
        cuisine: dishForm.cuisine || undefined,
        tags,
        intake_kind: imageMode === 'upload' ? 'uploaded_dish' : 'candidate_url',
        image_url: imageUrl,
        source_url: imageMode === 'url' ? dishForm.source_url.trim() : undefined,
        source_type: imageMode === 'url' ? dishForm.source_type : undefined,
        rights_status: imageMode === 'url' ? dishForm.rights_status : undefined,
        notes: dishForm.notes.trim() || undefined,
        is_featured_dish: dishForm.is_featured_dish,
      }

      const res = await adminFetch('/api/admin/food-intake', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': secret,
        },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Intake failed')

      showMessage('Food content submitted successfully')
      resetForm()
      await loadCandidates()
      await loadDishes()
      setTab('candidates')
    } catch (err: any) {
      showError(err.message || 'Submit failed')
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setSelectedPlace(null)
    setPlaceForm({
      name: '',
      location_text: '',
      address: '',
      city: '',
      state: '',
      postal_code: '',
      latitude: '',
      longitude: '',
      phone: '',
      website: '',
      category: '',
      cuisine: '',
    })
    setDishForm({
      dish_name: '',
      description: '',
      price: '',
      category: '',
      cuisine: '',
      tags: '',
      image_url: '',
      source_url: '',
      source_type: 'restaurant website',
      rights_status: 'permission_required',
      notes: '',
      is_featured_dish: false,
    })
    setUploadFile(null)
    setImageMode('url')
  }

  const doCandidateAction = async (candidate: Candidate, action: string) => {
    if (action === 'approve') {
      const ok = window.confirm(
        `Approve ${candidate.dish_name || 'this candidate'} for ${candidate.place?.name || 'this place'}? Only approve when rights are confirmed.`,
      )
      if (!ok) return
    }
    setCandidateSaving(candidate.id)
    try {
      const res = await adminFetch('/api/admin/place-image-candidates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': secret,
        },
        body: JSON.stringify({
          candidateId: candidate.id,
          action,
          rightsConfirmed: action === 'approve',
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Action failed')
      showMessage(`Candidate ${action}d`)
      await loadCandidates()
    } catch (err: any) {
      showError(err.message || 'Action failed')
    } finally {
      setCandidateSaving(null)
    }
  }

  const saveCandidateNotes = async (candidate: Candidate) => {
    const notes = candidateNotesEdit[candidate.id]
    if (notes === undefined) return
    setCandidateSaving(candidate.id)
    try {
      const res = await adminFetch('/api/admin/place-image-candidates', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': secret,
        },
        body: JSON.stringify({ candidateId: candidate.id, notes }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Notes update failed')
      showMessage('Notes saved')
      await loadCandidates()
      setCandidateNotesEdit((prev) => {
        const next = { ...prev }
        delete next[candidate.id]
        return next
      })
    } catch (err: any) {
      showError(err.message || 'Notes update failed')
    } finally {
      setCandidateSaving(null)
    }
  }

  const updateDish = async (dish: Dish, updates: Partial<Dish>) => {
    try {
      const res = await adminFetch(`/api/admin/dishes?id=${dish.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': secret,
        },
        body: JSON.stringify(updates),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Update failed')
      showMessage('Dish updated')
      await loadDishes()
    } catch (err: any) {
      showError(err.message || 'Update failed')
    }
  }

  const assignDishPlace = async (dish: Dish) => {
    const placeId = window.prompt(`Enter place UUID to assign ${dish.name} to:`)
    if (!placeId) return
    await updateDish(dish, { place_id: placeId } as Partial<Dish>)
  }

  const preselectGap = (gap: GapPlace) => {
    setSelectedPlace(gap as Place)
    setTab('add')
    showMessage(`Preselected ${gap.name}. Add dish details.`)
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] text-white flex items-center justify-center px-4">
        <div className="max-w-sm w-full bg-white/[0.03] border border-white/10 rounded-2xl p-6">
          <h1 className="text-xl font-bold mb-1">Food Content Intake</h1>
          <p className="text-sm text-white/50 mb-4">Add places, dishes, and image candidates.</p>
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Admin secret"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white mb-4 focus:outline-none focus:border-[#FF5722]"
            onKeyDown={(e) => e.key === 'Enter' && setAuthenticated(true)}
          />
          <button
            onClick={() => setAuthenticated(true)}
            className="w-full py-3 bg-[#FF5722] text-white rounded-xl font-bold"
          >
            Enter
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white">
      <header className="px-4 py-4 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#0D0D0D]/95 backdrop-blur z-20">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/admin" className="text-gray-400 hover:text-white shrink-0">
            <ArrowLeft size={20} />
          </Link>
          <div className="min-w-0">
            <h1 className="font-bold truncate">Food Intake</h1>
            <p className="text-xs text-gray-400 truncate">Add content · Close gaps · Review candidates</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-4">
        {error && (
          <div className="bg-red-500/20 text-red-400 rounded-xl p-3 mb-4 text-sm font-semibold flex items-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}
        {message && (
          <div className="bg-green-500/20 text-green-400 rounded-xl p-3 mb-4 text-sm font-semibold flex items-center gap-2">
            <CheckCircle2 size={16} /> {message}
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          <TabButton active={tab === 'add'} onClick={() => setTab('add')} icon={Plus} label="Add" />
          <TabButton active={tab === 'gaps'} onClick={() => setTab('gaps')} icon={MapPin} label="Gaps" count={gaps.length} />
          <TabButton active={tab === 'candidates'} onClick={() => setTab('candidates')} icon={ImageIcon} label="Candidates" count={candidates.length} />
          <TabButton active={tab === 'dishes'} onClick={() => setTab('dishes')} icon={Utensils} label="Dishes" count={dishes.length} />
        </div>

        {tab === 'add' && (
          <div className="space-y-5">
            <section className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
              <h2 className="font-bold mb-3 flex items-center gap-2">
                <Store size={18} className="text-[#FF5722]" /> Place
              </h2>
              {selectedPlace ? (
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold truncate">{selectedPlace.name}</p>
                    <p className="text-xs text-gray-400 truncate">{selectedPlace.location_text || selectedPlace.address || selectedPlace.id}</p>
                  </div>
                  <button
                    onClick={() => setSelectedPlace(null)}
                    className="text-xs text-[#FF5722] font-semibold shrink-0"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      value={placeSearch}
                      onChange={(e) => setPlaceSearch(e.target.value)}
                      placeholder="Search existing places"
                      className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-[#FF5722] text-sm"
                    />
                    {placeSearchOpen && placeResults.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-[#161616] border border-white/10 rounded-xl max-h-64 overflow-y-auto shadow-xl">
                        {placeResults.map((place) => (
                          <button
                            key={place.id}
                            onClick={() => {
                              setSelectedPlace(place)
                              setPlaceSearch('')
                              setPlaceResults([])
                              setPlaceSearchOpen(false)
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-white/5 border-b border-white/5 last:border-0"
                          >
                            <p className="font-semibold text-sm truncate">{place.name}</p>
                            <p className="text-xs text-gray-400 truncate">{place.location_text || place.address || place.id}</p>
                          </button>
                        ))}
                      </div>
                    )}
                    {placeSearchOpen && placeSearch.trim().length >= 2 && placeResults.length === 0 && !loading && (
                      <div className="absolute z-10 mt-1 w-full bg-[#161616] border border-white/10 rounded-xl p-3 text-sm text-gray-400">
                        No existing places. Add one below.
                      </div>
                    )}
                  </div>

                  <div className="border-t border-white/10 pt-3">
                    <p className="text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wide">Or add a new place</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input label="Name *" value={placeForm.name} onChange={(v) => handlePlaceField('name', v)} />
                      <Input label="Location text *" value={placeForm.location_text} onChange={(v) => handlePlaceField('location_text', v)} />
                      <Input label="Address" value={placeForm.address} onChange={(v) => handlePlaceField('address', v)} />
                      <Input label="City" value={placeForm.city} onChange={(v) => handlePlaceField('city', v)} />
                      <Input label="State" value={placeForm.state} onChange={(v) => handlePlaceField('state', v)} />
                      <Input label="Postal code" value={placeForm.postal_code} onChange={(v) => handlePlaceField('postal_code', v)} />
                      <Input label="Latitude" value={placeForm.latitude} onChange={(v) => handlePlaceField('latitude', v)} inputMode="decimal" />
                      <Input label="Longitude" value={placeForm.longitude} onChange={(v) => handlePlaceField('longitude', v)} inputMode="decimal" />
                      <Input label="Phone" value={placeForm.phone} onChange={(v) => handlePlaceField('phone', v)} />
                      <Input label="Website" value={placeForm.website} onChange={(v) => handlePlaceField('website', v)} />
                      <Input label="Category" value={placeForm.category} onChange={(v) => handlePlaceField('category', v)} />
                      <Input label="Cuisine" value={placeForm.cuisine} onChange={(v) => handlePlaceField('cuisine', v)} />
                    </div>
                    <button
                      onClick={createPlace}
                      disabled={creatingPlace}
                      className="mt-3 w-full py-3 bg-[#FF5722] text-white rounded-xl font-bold disabled:opacity-50"
                    >
                      {creatingPlace ? <Loader2 className="animate-spin mx-auto" size={18} /> : 'Create place'}
                    </button>
                  </div>
                </div>
              )}
            </section>

            {selectedPlace && (
              <section className="bg-white/[0.03] border border-white/5 rounded-xl p-4 space-y-4">
                <h2 className="font-bold flex items-center gap-2">
                  <Camera size={18} className="text-[#FF5722]" /> Dish / Image
                </h2>

                <div className="grid grid-cols-2 gap-2 p-1 bg-white/5 rounded-xl">
                  <button
                    onClick={() => setImageMode('url')}
                    className={`py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 ${imageMode === 'url' ? 'bg-[#FF5722] text-white' : 'text-gray-400'}`}
                  >
                    <LinkIcon size={14} /> URL
                  </button>
                  <button
                    onClick={() => setImageMode('upload')}
                    className={`py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 ${imageMode === 'upload' ? 'bg-[#FF5722] text-white' : 'text-gray-400'}`}
                  >
                    <Camera size={14} /> Upload
                  </button>
                </div>

                <Input label="Dish name *" value={dishForm.dish_name} onChange={(v) => handleDishField('dish_name', v)} />
                <TextArea label="Description" value={dishForm.description} onChange={(v) => handleDishField('description', v)} />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input label="Price" value={dishForm.price} onChange={(v) => handleDishField('price', v)} inputMode="decimal" />
                  <Select
                    label="Category"
                    value={dishForm.category}
                    onChange={(v) => handleDishField('category', v)}
                    options={COMMON_CATEGORIES.map((c) => ({ value: c, label: c }))}
                    placeholder="Select category"
                  />
                  <Input label="Cuisine" value={dishForm.cuisine} onChange={(v) => handleDishField('cuisine', v)} />
                  <Input label="Tags (comma separated)" value={dishForm.tags} onChange={(v) => handleDishField('tags', v)} />
                </div>

                {imageMode === 'upload' ? (
                  <div className="space-y-3">
                    <label className="block text-sm text-gray-400 mb-1">Upload image</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-white/10 file:text-white file:font-semibold"
                    />
                    {uploadFile && (
                      <p className="text-xs text-gray-400">Selected: {uploadFile.name}</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Input
                      label="Image URL *"
                      value={dishForm.image_url}
                      onChange={(v) => handleDishField('image_url', v)}
                      placeholder="https://..."
                    />
                    <Input
                      label="Source URL *"
                      value={dishForm.source_url}
                      onChange={(v) => handleDishField('source_url', v)}
                      placeholder="Where this image came from"
                    />
                    <Select
                      label="Source type *"
                      value={dishForm.source_type}
                      onChange={(v) => handleDishField('source_type', v)}
                      options={SOURCE_TYPES.map((s) => ({ value: s, label: s }))}
                    />
                    <Select
                      label="Rights status *"
                      value={dishForm.rights_status}
                      onChange={(v) => handleDishField('rights_status', v as 'owner_approved' | 'permission_required')}
                      options={RIGHTS_STATUSES}
                    />
                  </div>
                )}

                <TextArea label="Notes" value={dishForm.notes} onChange={(v) => handleDishField('notes', v)} />

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={dishForm.is_featured_dish}
                    onChange={(e) => handleDishField('is_featured_dish', e.target.checked)}
                    className="accent-[#FF5722] w-4 h-4"
                  />
                  Featured dish
                </label>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={resetForm}
                    className="flex-1 py-3 rounded-xl bg-white/10 text-white font-semibold"
                  >
                    Reset
                  </button>
                  <button
                    onClick={submitIntake}
                    disabled={submitting || uploading}
                    className="flex-[2] py-3 bg-[#FF5722] text-white rounded-xl font-bold disabled:opacity-50"
                  >
                    {submitting || uploading ? <Loader2 className="animate-spin mx-auto" size={18} /> : 'Submit food content'}
                  </button>
                </div>
              </section>
            )}
          </div>
        )}

        {tab === 'gaps' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={gapsFilter}
                onChange={(e) => setGapsFilter(e.target.value)}
                placeholder="Filter by city"
                className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-[#FF5722] text-sm"
              />
              <button
                onClick={loadGaps}
                className="px-4 py-3 bg-white/10 text-white rounded-xl font-semibold"
              >
                Load
              </button>
            </div>
            {gaps.length === 0 ? (
              <p className="text-gray-500 text-sm">No gap places found.</p>
            ) : (
              <div className="space-y-3">
                {gaps.map((gap) => (
                  <div key={gap.id} className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold truncate">{gap.name}</p>
                        <p className="text-sm text-gray-400 truncate">{gap.location_text || gap.address || gap.id}</p>
                        <p className="text-xs text-gray-500 mt-1">{[gap.city, gap.state].filter(Boolean).join(', ')} {gap.category || gap.cuisine ? `· ${[gap.category, gap.cuisine].filter(Boolean).join(' / ')}` : ''}</p>
                      </div>
                      <button
                        onClick={() => preselectGap(gap)}
                        className="shrink-0 px-3 py-1.5 bg-[#FF5722] text-white rounded-lg text-xs font-bold"
                      >
                        Add content
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'candidates' && (
          <div className="space-y-3">
            {candidates.length === 0 ? (
              <p className="text-gray-500 text-sm">No image candidates yet.</p>
            ) : (
              candidates.map((candidate) => (
                <div key={candidate.id} className="bg-white/[0.03] border border-white/5 rounded-xl p-4 space-y-3">
                  <div className="flex gap-3">
                    {candidate.image_url && (
                      <img
                        src={candidate.image_url}
                        alt={candidate.dish_name || 'Candidate'}
                        className="w-20 h-20 rounded-lg object-cover bg-black shrink-0"
                        loading="lazy"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-bold truncate">{candidate.dish_name || 'Unnamed candidate'}</p>
                      <p className="text-sm text-gray-400 truncate">{candidate.place?.name || 'Unknown place'}</p>
                      <div className="flex flex-wrap gap-2 mt-1 text-xs">
                        <span className={`px-2 py-0.5 rounded-full ${candidate.rights_status === 'approved' ? 'bg-green-500/20 text-green-400' : candidate.rights_status === 'rejected' ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-gray-300'}`}>
                          {candidate.rights_status}
                        </span>
                        {candidate.usage_status && (
                          <span className="px-2 py-0.5 rounded-full bg-[#FF5722]/20 text-[#FF5722]">{candidate.usage_status}</span>
                        )}
                        {candidate.source_type && (
                          <span className="px-2 py-0.5 rounded-full bg-white/10 text-gray-300">{candidate.source_type}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {candidate.adminNotice && (
                    <p className="text-xs text-yellow-400 flex items-start gap-1.5 bg-yellow-500/10 p-2 rounded-lg">
                      <AlertCircle size={14} className="shrink-0 mt-0.5" /> {candidate.adminNotice}
                    </p>
                  )}

                  {candidate.source_url && (
                    <a
                      href={candidate.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-[#FF5722] inline-flex items-center gap-1 hover:underline"
                    >
                      <ExternalLink size={12} /> Source
                    </a>
                  )}

                  <div className="space-y-2">
                    <TextArea
                      label="Notes"
                      value={candidateNotesEdit[candidate.id] !== undefined ? candidateNotesEdit[candidate.id] : (candidate.notes || '')}
                      onChange={(v) => setCandidateNotesEdit((prev) => ({ ...prev, [candidate.id]: v }))}
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => saveCandidateNotes(candidate)}
                        disabled={candidateSaving === candidate.id}
                        className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs font-semibold disabled:opacity-50"
                      >
                        Save notes
                      </button>
                      {CANDIDATE_ACTIONS.map((a) => (
                        <button
                          key={a.action}
                          onClick={() => doCandidateAction(candidate, a.action)}
                          disabled={candidateSaving === candidate.id}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50 inline-flex items-center gap-1 ${
                            a.tone === 'success' ? 'bg-green-500/20 text-green-400' :
                            a.tone === 'danger' ? 'bg-red-500/20 text-red-400' :
                            a.tone === 'warning' ? 'bg-amber-500/20 text-amber-400' :
                            'bg-white/10 text-white'
                          }`}
                        >
                          <a.icon size={13} /> {a.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'dishes' && (
          <div className="space-y-3">
            {dishes.length === 0 ? (
              <p className="text-gray-500 text-sm">No dishes found.</p>
            ) : (
              dishes.map((dish) => (
                <div key={dish.id} className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    {dish.photo_url && (
                      <img src={dish.photo_url} alt={dish.name} className="w-16 h-16 rounded-lg object-cover bg-black shrink-0" loading="lazy" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-bold truncate">{dish.name}</p>
                      <p className="text-sm text-gray-400 truncate">
                        {dish.seller?.business_name || 'No seller'} · ${typeof dish.price === 'number' ? dish.price.toFixed(2) : '—'} · {dish.category || 'Uncategorized'}
                      </p>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs ${dish.status === 'active' ? 'bg-green-500/20 text-green-400' : dish.status === 'pending' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>
                        {dish.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {dish.status !== 'active' && (
                      <button
                        onClick={() => updateDish(dish, { status: 'active' })}
                        className="px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 text-xs font-semibold"
                      >
                        Activate
                      </button>
                    )}
                    {dish.status !== 'pending' && (
                      <button
                        onClick={() => updateDish(dish, { status: 'pending' })}
                        className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-semibold"
                      >
                        Set pending
                      </button>
                    )}
                    {dish.status !== 'removed' && (
                      <button
                        onClick={() => updateDish(dish, { status: 'removed' })}
                        className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs font-semibold"
                      >
                        Remove
                      </button>
                    )}
                    <button
                      onClick={() => assignDishPlace(dish)}
                      className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs font-semibold"
                    >
                      Assign place
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  )
}

function TabButton({ active, onClick, icon: Icon, label, count }: { active: boolean; onClick: () => void; icon: React.ElementType; label: string; count?: number }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold inline-flex items-center gap-1.5 ${active ? 'bg-[#FF5722] text-white' : 'bg-white/5 text-gray-400'}`}
    >
      <Icon size={15} /> {label} {count !== undefined && <span className="text-xs opacity-80">({count})</span>}
    </button>
  )
}

function Input({ label, value, onChange, placeholder, inputMode }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'] }) {
  return (
    <label className="block text-sm">
      <span className="text-gray-400">{label}</span>
      <input
        type="text"
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:border-[#FF5722]"
      />
    </label>
  )
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-sm">
      <span className="text-gray-400">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className="mt-1 w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:border-[#FF5722] resize-none"
      />
    </label>
  )
}

function Select({ label, value, onChange, options, placeholder }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder?: string }) {
  return (
    <label className="block text-sm">
      <span className="text-gray-400">{label}</span>
      <div className="relative mt-1">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#FF5722]"
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-[#161616]">
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
      </div>
    </label>
  )
}
