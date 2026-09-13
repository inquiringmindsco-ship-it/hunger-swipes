'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { TrustBadge, getTrustBadgeFromType, getPointsForType, getTierFromPoints } from '@/app/components/TrustBadge'
import { ForkFlame, Flame, Camera, Heart, CheckLine, XMark, Star, Fork, Plate, Dollar, MapPin, Trophy, Verified, Upload, Clock, Grid, SwipeLeft, SwipeRight, ArrowRight, Note, Crown, Comment, Sparkle, Bookmark, SettingsGear, CheckBold, StarFilled, ChatBubble, DollarSign } from '@/app/components/HwIcon'
import { getEaterId } from '@/lib/eater-id'

interface Verification {
  id: string
  photo_id: string
  restaurant_name: string
  dish_name: string
  verification_type: 'self-reported' | 'photo-confirmed' | 'receipt-confirmed'
  accuracy_rating?: 'accurate' | 'mostly_accurate' | 'not_accurate'
  ordered_same_dish?: boolean
  comparison_photo_url?: string
  points_awarded: number
  trust_level: number
  created_at: string
  user?: { username: string }
}

interface MatchPhoto {
  id: string
  imageUrl: string
  restaurant: string
  dish: string
  location?: string
  photographer?: string
}

interface PointsData {
  total_points: number
  lifetime_points: number
  tier: string
}

async function loadMatches(): Promise<MatchPhoto[]> {
  try {
    const eaterId = getEaterId()
    const res = await fetch(`/api/saves?eaterId=${encodeURIComponent(eaterId)}`)
    const data = await res.json()
    if (!res.ok) return []
    return (data.saved || []).map((item: any) => ({
      id: item.dish.id,
      imageUrl: item.dish.photo_url,
      restaurant: item.dish.seller.business_name,
      dish: item.dish.name,
      location: item.dish.seller.location_text,
    }))
  } catch {}
  return []
}

type Step = 1 | 2 | 3 | 4 | 5

function VisitsContent({ photoIdParam }: { photoIdParam: string | null }) {
  const [selectedPhoto, setSelectedPhoto] = useState<MatchPhoto | null>(null)
  const [matches, setMatches] = useState<MatchPhoto[]>([])
  const [step, setStep] = useState<Step>(1)

  // Re-swipe state
  const [reswipeActive, setReswipeActive] = useState(false)
  const [reswipeDeck, setReswipeDeck] = useState<MatchPhoto[]>([])
  const [reswipeIndex, setReswipeIndex] = useState(0)
  const [reswipeShortlist, setReswipeShortlist] = useState<MatchPhoto[]>([])
  const [reswipeDirection, setReswipeDirection] = useState<'left' | 'right' | null>(null)

  const [pointsData, setPointsData] = useState<PointsData>({ total_points: 245, lifetime_points: 890, tier: 'critic' })
  const [filter, setFilter] = useState('all')

  const [confirmed, setConfirmed] = useState<boolean | null>(null)
  const [verificationType, setVerificationType] = useState<'self-reported' | 'photo-confirmed' | 'receipt-confirmed' | null>(null)
  const [accuracyRating, setAccuracyRating] = useState<'accurate' | 'mostly_accurate' | 'not_accurate' | null>(null)
  const [orderedSameDish, setOrderedSameDish] = useState(false)
  const [notes, setNotes] = useState('')

  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadProgress, setUploadProgress] = useState(0)

  const [earnedPoints, setEarnedPoints] = useState(0)
  const [earnedBadge, setEarnedBadge] = useState<1 | 2 | 3>(1)
  const [submitting, setSubmitting] = useState(false)

  const [existingVerifications, setExistingVerifications] = useState<Verification[]>([])

  useEffect(() => {
    loadMatches().then((savedMatches) => {
      setMatches(savedMatches)
      if (photoIdParam) {
        const match = savedMatches.find((m) => m.id === photoIdParam)
        if (match) setSelectedPhoto(match)
      }
    })

    fetchPoints()
    fetchVerifications()
  }, [photoIdParam])

  useEffect(() => {
    if (photoIdParam) {
      fetchVerifications(photoIdParam)
    }
  }, [photoIdParam])

  const fetchPoints = async () => {
    try {
      const res = await fetch('/api/visits/points?userId=mock-user')
      const data = await res.json()
      if (data.points) {
        setPointsData(data.points)
      }
    } catch {}
  }

  const fetchVerifications = async (photoId?: string) => {
    try {
      const params = photoId ? `?photoId=${photoId}` : ''
      const res = await fetch(`/api/visits${params}`)
      const data = await res.json()
      if (data.verifications) {
        setExistingVerifications(data.verifications)
      }
    } catch {}
  }

  const selectPhoto = (photo: MatchPhoto) => {
    setSelectedPhoto(photo)
    setStep(1)
    setConfirmed(null)
    setVerificationType(null)
    setAccuracyRating(null)
    setOrderedSameDish(false)
    setNotes('')
    setUploadedPhoto(null)
    fetchVerifications(photo.id)
  }

  const handleClose = () => {
    setSelectedPhoto(null)
    setStep(1)
  }

  // Re-swipe through your matches
  const startReswipe = () => {
    setReswipeActive(true)
    setReswipeDeck([...matches])
    setReswipeIndex(0)
    setReswipeShortlist([])
    setReswipeDirection(null)
  }

  const handleReswipe = (direction: 'left' | 'right') => {
    const current = reswipeDeck[reswipeIndex]
    setReswipeDirection(direction)
    if (direction === 'right' && current) {
      setReswipeShortlist((prev) => [...prev, current])
    }
    setTimeout(() => {
      if (reswipeIndex < reswipeDeck.length - 1) {
        setReswipeIndex((prev) => prev + 1)
        setReswipeDirection(null)
      } else {
        setReswipeActive(false)
        if (reswipeShortlist.length > 0) {
          localStorage.setItem('hungerswipes_shortlist', JSON.stringify(reswipeShortlist))
        }
      }
    }, 250)
  }

  const handleStep1Confirm = () => {
    if (confirmed) setStep(2)
  }

  const handleStep2Select = (type: 'self-reported' | 'photo-confirmed' | 'receipt-confirmed') => {
    setVerificationType(type)
    setStep(3)
  }

  const handleStep3Submit = () => {
    if (accuracyRating) {
      if (verificationType === 'photo-confirmed') {
        setStep(4)
      } else {
        submitVerification()
      }
    }
  }

  const handlePhotoUpload = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      setUploadedPhoto(result)
      let progress = 0
      const interval = setInterval(() => {
        progress += 20
        setUploadProgress(progress)
        if (progress >= 100) {
          clearInterval(interval)
          setTimeout(() => submitVerification(), 300)
        }
      }, 150)
    }
    reader.readAsDataURL(file)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      handlePhotoUpload(file)
    }
  }, [verificationType])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handlePhotoUpload(file)
  }

  const submitVerification = async () => {
    if (!selectedPhoto) return
    setSubmitting(true)
    try {
      const points = verificationType ? getPointsForType(verificationType) : 5
      const badge = verificationType ? getTrustBadgeFromType(verificationType) : 1

      const res = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'mock-user',
          photoId: selectedPhoto.id,
          restaurantName: selectedPhoto.restaurant,
          dishName: selectedPhoto.dish,
          verificationType: verificationType || 'self-reported',
          accuracyRating,
          orderedSameDish,
          comparisonPhotoUrl: uploadedPhoto,
          notes,
        }),
      })

      const data = await res.json()
      if (data.verification || data.mock) {
        const awardedPoints = data.points_awarded || points
        setEarnedPoints(awardedPoints)
        setEarnedBadge(data.verification?.trust_level || badge)
        setStep(5)
      }
    } catch (err) {
      console.error('Submit error:', err)
    }
    setSubmitting(false)
  }

  const handleReset = () => {
    setStep(1)
    setConfirmed(null)
    setVerificationType(null)
    setAccuracyRating(null)
    setOrderedSameDish(false)
    setNotes('')
    setUploadedPhoto(null)
    setUploadProgress(0)
  }

  const tier = getTierFromPoints(pointsData.total_points)

  // Derive cuisine filters dynamically from actual match data
  const cuisineLabels = matches
    .map((m) => m.restaurant ? m.restaurant.split(' ')[0] : null)
    .filter((c): c is string => c !== null)
  const cuisineSet = Array.from(new Set(cuisineLabels))
  const cuisineFilters = ['All', ...cuisineSet]

  const filteredMatches = filter === 'all' ? matches : matches.filter((m) => {
    const searchTarget = `${m.restaurant || ''} ${m.dish || ''}`.toLowerCase()
    return searchTarget.includes(filter.toLowerCase())
  })

  // ===================== RE-SWIPE OVERLAY =====================
  if (reswipeActive && reswipeDeck.length > 0) {
    const current = reswipeDeck[reswipeIndex]
    const progress = `${reswipeIndex + 1} / ${reswipeDeck.length}`
    const isLast = reswipeIndex === reswipeDeck.length - 1

    return (
      <div className="fixed inset-0 z-50 bg-[#0D0D0D] flex flex-col">
        <header className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <button
            onClick={() => {
              setReswipeActive(false)
              if (reswipeShortlist.length > 0) {
                localStorage.setItem('hungerswipes_shortlist', JSON.stringify(reswipeShortlist))
              }
            }}
            className="text-gray-400 hover:text-white text-sm transition"
          >
            ✕ Close
          </button>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-white">{progress}</span>
            <span className="text-sm text-[#FFD700]">♥ {reswipeShortlist.length}</span>
          </div>
          <div className="w-12" />
        </header>

        <div className="flex-1 flex flex-col items-center justify-center px-6 py-4 relative">
          {current && (
            <div
              className={`w-full max-w-xs transition-all duration-200 ${
                reswipeDirection === 'right' ? 'opacity-0 translate-x-12 rotate-6 scale-95' :
                reswipeDirection === 'left' ? 'opacity-0 -translate-x-12 -rotate-6 scale-95' : 'opacity-100'
              }`}
            >
              <div className="bg-[#1A1A1A] rounded-2xl overflow-hidden shadow-2xl">
                <div className="aspect-square relative">
                  <img src={current.imageUrl} alt={current.dish} className="w-full h-full object-cover" />
                  {reswipeDirection === 'right' && (
                    <div className="absolute inset-0 bg-[#10B981]/30 flex items-center justify-center">
                      <span className="text-5xl font-black text-[#10B981] border-4 border-[#10B981] rounded-2xl px-5 py-1 rotate-12">SHORTLIST</span>
                    </div>
                  )}
                  {reswipeDirection === 'left' && (
                    <div className="absolute inset-0 bg-[#EF4444]/30 flex items-center justify-center">
                      <span className="text-5xl font-black text-[#EF4444] border-4 border-[#EF4444] rounded-2xl px-5 py-1 -rotate-12">PASS</span>
                    </div>
                  )}
                </div>
                <div className="p-4 text-center">
                  <h3 className="text-lg font-bold text-white">{current.dish}</h3>
                  <p className="text-gray-400 text-sm mt-1">{current.restaurant}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {!isLast && (
          <div className="flex items-center justify-center gap-10 pb-8">
            <button
              onClick={() => handleReswipe('left')}
              className="w-14 h-14 rounded-full bg-[#1A1A1A] border-2 border-[#EF4444] flex items-center justify-center text-xl text-[#EF4444] hover:bg-[#EF4444]/10 transition active:scale-90"
            >
              ✕
            </button>
            <button
              onClick={() => handleReswipe('right')}
              className="w-16 h-16 rounded-full bg-[#FF5722] flex items-center justify-center text-2xl text-white hover:bg-[#e64a19] transition active:scale-90"
            >
              ♥
            </button>
          </div>
        )}

        {isLast && (
          <div className="pb-8 px-6 text-center animate-fade-in">
            <p className="text-white font-bold text-lg">Done! {reswipeShortlist.length} shortlisted</p>
            <p className="text-gray-400 text-sm mt-1 mb-4">Your shortlist is saved</p>
            <button
              onClick={() => {
                setReswipeActive(false)
                if (reswipeShortlist.length > 0) {
                  localStorage.setItem('hungerswipes_shortlist', JSON.stringify(reswipeShortlist))
                  setMatches(reswipeShortlist)
                  setFilter('all')
                }
              }}
              className="w-full py-3 bg-[#FF5722] text-white rounded-xl font-semibold hover:bg-[#e64a19] transition"
            >
              View Shortlisted
            </button>
          </div>
        )}

        <p className="text-center text-gray-600 text-xs pb-4">Right = shortlist · Left = pass</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0D0D0D]/90 backdrop-blur-sm border-b border-white/5 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl"><Fork size={20} /></span>
            <span className="font-bold text-lg text-white">Verify Your Visit</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right mr-2">
              <div className="text-sm font-bold text-[#FFD700]">{pointsData.total_points} pts</div>
              <div className="text-[10px]" style={{ color: tier.color }}>{tier.name}</div>
            </div>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ backgroundColor: `${tier.color}20`, color: tier.color, border: `1px solid ${tier.color}40` }}
            >
              {tier.name[0]}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {!selectedPhoto ? (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-white mb-1">Select a match to verify</h1>
              <p className="text-gray-400 text-sm">Choose from your saved matches</p>
            </div>

            {matches.length >= 3 && (
              <button
                onClick={startReswipe}
                className="w-full mb-4 py-3 bg-[#FFD700] text-[#0D0D0D] rounded-xl font-bold text-sm hover:bg-[#FFD700]/90 transition flex items-center justify-center gap-2"
              >
                <span>♥</span>
                <span>Re-swipe to Shortlist ({matches.length})</span>
              </button>
            )}

            <div className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide">
              {cuisineFilters.map((cuisine) => {
                const filterVal = cuisine === 'All' ? 'all' : cuisine.toLowerCase()
                const isActive = cuisine === 'All' ? filter === 'all' : filter === cuisine.toLowerCase()
                return (
                  <button
                    key={cuisine}
                    onClick={() => setFilter(filterVal)}
                    className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition flex-shrink-0 ${
                      isActive
                        ? 'bg-[#FF5722] text-white'
                        : 'bg-[#1A1A1A] text-gray-400 hover:bg-[#2A2A2A]'
                    }`}
                  >
                    {cuisine}
                  </button>
                )
              })}
            </div>

            {filteredMatches.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-6xl mb-4"><Fork size={20} /></div>
                <h2 className="text-xl font-bold text-white mb-2">No matches yet</h2>
                <p className="text-gray-400 mb-6">Start swiping to build your food collection</p>
                <Link
                  href="/swipe"
                  className="px-6 py-3 bg-[#FF5722] text-white rounded-full font-semibold hover:bg-[#e64a19] transition"
                >
                  Start Swiping
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {filteredMatches.map((match) => {
                  const verifications = existingVerifications.filter((v) => v.photo_id === match.id)
                  const photoCount = verifications.filter((v) => v.verification_type === 'photo-confirmed').length
                  const receiptCount = verifications.filter((v) => v.verification_type === 'receipt-confirmed').length

                  return (
                    <div key={match.id}>
                      <button
                        onClick={() => selectPhoto(match)}
                        className="w-full bg-[#1A1A1A] rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow text-left"
                      >
                        <div className="aspect-square relative">
                          <img src={match.imageUrl} alt={match.dish} className="w-full h-full object-cover" />
                          <div className="absolute top-2 right-2">
                            <span className="w-7 h-7 bg-[#FFD700] text-[#0D0D0D] rounded-full flex items-center justify-center text-sm font-bold">
                              ✓
                            </span>
                          </div>
                        </div>
                        <div className="p-3">
                          <h3 className="font-bold text-white truncate text-sm">{match.dish}</h3>
                          <p className="text-xs text-gray-400 truncate">{match.restaurant}</p>
                          {verifications.length > 0 && (
                            <p className="text-xs text-[#FFD700] mt-1">
                              {verifications.length} verified
                            </p>
                          )}
                        </div>
                      </button>
                      {verifications.length > 0 && (
                        <div className="mt-1 px-1">
                          <div className="flex gap-1 flex-wrap">
                            {photoCount > 0 && (
                              <span className="text-[10px] text-blue-400">📸 {photoCount}</span>
                            )}
                            {receiptCount > 0 && (
                              <span className="text-[10px] text-[#FFD700]">🧾 {receiptCount}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        ) : (
          <>
            <button onClick={handleReset} className="flex items-center gap-1 text-gray-400 text-sm mb-4 hover:text-white transition">
              <span>←</span>
              <span>Back to matches</span>
            </button>

            <div className="bg-[#1A1A1A] rounded-2xl overflow-hidden mb-6">
              <div className="aspect-video relative">
                <img src={selectedPhoto.imageUrl} alt={selectedPhoto.dish} className="w-full h-full object-cover" />
              </div>
              <div className="p-4">
                <h2 className="text-xl font-bold text-white">{selectedPhoto.dish}</h2>
                <p className="text-gray-400">{selectedPhoto.restaurant}</p>
                {selectedPhoto.photographer && (
                  <p className="text-xs text-[#FFD700] mt-1">📸 {selectedPhoto.photographer}</p>
                )}
              </div>
            </div>

            {/* Step Progress */}
            <div className="flex gap-2 mb-6">
              {([1, 2, 3, 4, 5] as Step[]).map((s) => (
                <div
                  key={s}
                  className={`flex-1 h-1 rounded-full transition-colors ${
                    s <= step ? 'bg-[#FFD700]' : 'bg-white/10'
                  }`}
                />
              ))}
            </div>

            {/* Step Content */}
            <div>
              {step === 1 && (
                <div className="text-center">
                  <h3 className="text-xl font-bold text-white mb-2">Did you go?</h3>
                  <p className="text-gray-400 mb-8">Have you visited {selectedPhoto.restaurant}?</p>
                  <div className="space-y-3">
                    <button
                      onClick={() => { setConfirmed(true); handleStep1Confirm() }}
                      className="w-full py-4 bg-[#FF5722] text-white rounded-xl font-semibold text-lg hover:bg-[#e64a19] transition"
                    >
                      Yes, I went! 🎉
                    </button>
                    <button
                      onClick={handleClose}
                      className="w-full py-4 bg-[#1A1A1A] text-gray-400 rounded-xl font-semibold text-lg hover:bg-[#2A2A2A] transition"
                    >
                      Not yet
                    </button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div>
                  <h3 className="text-xl font-bold text-white mb-2 text-center">How was it?</h3>
                  <p className="text-gray-400 mb-6 text-center">Choose your verification type</p>
                  <div className="space-y-3">
                    <button
                      onClick={() => handleStep2Select('self-reported')}
                      className="w-full p-4 bg-[#1A1A1A] rounded-xl border border-white/10 hover:border-[#10B981] transition text-left flex items-center gap-4"
                    >
                      <span className="text-3xl">🏠</span>
                      <div>
                        <p className="font-semibold text-white">Just checking in</p>
                        <p className="text-sm text-gray-400">Self-reported visit · <span className="text-[#FFD700]">5 pts</span></p>
                      </div>
                    </button>
                    <button
                      onClick={() => handleStep2Select('photo-confirmed')}
                      className="w-full p-4 bg-[#1A1A1A] rounded-xl border border-white/10 hover:border-[#3B82F6] transition text-left flex items-center gap-4"
                    >
                      <span className="text-3xl">📸</span>
                      <div>
                        <p className="font-semibold text-white">I took a photo</p>
                        <p className="text-sm text-gray-400">Photo-confirmed visit · <span className="text-[#FFD700]">15 pts</span></p>
                      </div>
                    </button>
                    <button
                      onClick={() => handleStep2Select('receipt-confirmed')}
                      className="w-full p-4 bg-[#1A1A1A] rounded-xl border border-white/10 hover:border-[#FFD700] transition text-left flex items-center gap-4"
                    >
                      <span className="text-3xl">🧾</span>
                      <div>
                        <p className="font-semibold text-white">I have receipt/confirmation</p>
                        <p className="text-sm text-gray-400">Receipt-verified visit · <span className="text-[#FFD700]">20 pts</span></p>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div>
                  <h3 className="text-xl font-bold text-white mb-2 text-center">Was the food accurate?</h3>
                  <p className="text-gray-400 mb-6 text-center">Rate how the actual dish compared to the photo</p>

                  <div className="flex gap-2 justify-center mb-6">
                    {(['accurate', 'mostly_accurate', 'not_accurate'] as const).map((rating) => (
                      <button
                        key={rating}
                        onClick={() => setAccuracyRating(rating)}
                        className={`px-3 py-2 rounded-full font-medium text-xs sm:text-sm transition ${
                          accuracyRating === rating
                            ? rating === 'accurate'
                              ? 'bg-[#10B981] text-white'
                              : rating === 'mostly_accurate'
                              ? 'bg-[#F59E0B] text-white'
                              : 'bg-[#EF4444] text-white'
                            : 'bg-[#1A1A1A] text-gray-400'
                        }`}
                      >
                        {rating === 'accurate' ? <><CheckBold size={16} /> Accurate</> : rating === 'mostly_accurate' ? '~ Mostly accurate' : <><XMark size={16} /> Not accurate</>}
                      </button>
                    ))}
                  </div>

                  <div className="bg-[#1A1A1A] rounded-xl p-4 mb-4">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-white font-medium text-sm">Did you order the same dish?</span>
                      <button
                        onClick={() => setOrderedSameDish(!orderedSameDish)}
                        className={`w-12 h-6 rounded-full transition-colors relative ${
                          orderedSameDish ? 'bg-[#FF5722]' : 'bg-white/20'
                        }`}
                      >
                        <span
                          className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                            orderedSameDish ? 'translate-x-7' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </label>
                  </div>

                  <div className="bg-[#1A1A1A] rounded-xl p-4 mb-6">
                    <label className="text-gray-400 text-sm mb-2 block">Notes (optional)</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="How was it? Worth it?"
                      className="w-full bg-[#0D0D0D] text-white rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#FFD700] placeholder-gray-600"
                      rows={3}
                    />
                  </div>

                  <button
                    onClick={handleStep3Submit}
                    disabled={!accuracyRating}
                    className={`w-full py-4 rounded-xl font-semibold text-lg transition ${
                      accuracyRating
                        ? 'bg-[#FF5722] text-white hover:bg-[#e64a19]'
                        : 'bg-[#1A1A1A] text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {verificationType === 'photo-confirmed' ? 'Upload Photo →' : 'Submit'}
                  </button>
                </div>
              )}

              {step === 4 && (
                <div>
                  <h3 className="text-xl font-bold text-white mb-2 text-center">Upload your photo</h3>
                  <p className="text-gray-400 mb-6 text-center">Add your comparison photo to confirm your visit</p>

                  {!uploadedPhoto ? (
                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors mb-6 ${
                        isDragging ? 'border-[#FFD700] bg-[#FFD700]/5' : 'border-white/20 hover:border-white/40'
                      }`}
                    >
                      <div className="text-5xl mb-3">📷</div>
                      <p className="text-white font-medium mb-1">Drop your photo here</p>
                      <p className="text-gray-400 text-sm">or click to browse</p>
                      <p className="text-gray-500 text-xs mt-2">JPG, PNG, WEBP up to 10MB</p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </div>
                  ) : (
                    <div className="relative mb-6">
                      <img src={uploadedPhoto} alt="Uploaded" className="w-full aspect-video object-cover rounded-xl" />
                      {uploadProgress < 100 && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-xl">
                          <div className="text-center">
                            <div className="w-16 h-16 border-4 border-[#FFD700] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                            <p className="text-white text-sm">Uploading... {uploadProgress}%</p>
                          </div>
                        </div>
                      )}
                      {uploadProgress === 100 && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-xl">
                          <div className="text-4xl"><CheckBold size={24} /></div>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={submitVerification}
                    disabled={submitting}
                    className="w-full py-4 bg-[#FF5722] text-white rounded-xl font-semibold text-lg hover:bg-[#e64a19] transition disabled:opacity-50"
                  >
                    {submitting ? 'Submitting...' : 'Submit Verification'}
                  </button>
                </div>
              )}

              {step === 5 && (
                <div className="text-center">
                  <div className="w-24 h-24 bg-[#10B981] rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                    <CheckLine size={40} />
                  </div>

                  <h3 className="text-2xl font-bold text-white mb-2">You earned {earnedPoints} points!</h3>
                  <p className="text-gray-400 mb-6">Thanks for verifying your visit</p>

                  <div className="mb-8">
                    <TrustBadge level={earnedBadge} size="lg" />
                  </div>

                  <div className="bg-[#1A1A1A] rounded-xl p-4 mb-6 text-left">
                    <p className="text-sm text-gray-400 mb-2">Points breakdown</p>
                    <div className="flex justify-between text-white">
                      <span>Base points</span>
                      <span className="text-[#FFD700]">+{earnedPoints}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Link
                      href="/matches"
                      className="block w-full py-4 bg-[#FF5722] text-white rounded-xl font-semibold text-center hover:bg-[#e64a19] transition"
                    >
                      Back to Matches
                    </Link>
                    <button
                      onClick={handleReset}
                      className="block w-full py-3 bg-[#1A1A1A] text-gray-400 rounded-xl font-semibold hover:bg-[#2A2A2A] transition"
                    >
                      Verify another visit
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function VisitsPageInner() {
  const searchParams = useSearchParams()
  const photoIdParam = searchParams.get('photoId')
  return <VisitsContent photoIdParam={photoIdParam} />
}

export default function VisitsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    }>
      <VisitsPageInner />
    </Suspense>
  )
}
