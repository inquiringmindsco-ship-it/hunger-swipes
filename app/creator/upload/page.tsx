'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  FOOD_TAGS,
  DIETARY_TAGS,
  CUISINE_TAGS,
  EXPERIENCE_TAGS,
  PORTION_TAGS,
  SPICE_LEVELS,
  HEALTH_CATEGORIES,
  TagGroup
} from '@/lib/tags'
import {
  calculateCompletenessScore,
  getPayoutTier,
  getTierBadge,
  PhotoMetadata,
  calculateEarningsBoost
} from '@/lib/metadata-scoring'
import { ForkFlame, Flame, Camera, Heart, CheckLine, XMark, Star, Fork, Plate, Dollar, MapPin, Trophy, Verified, Upload, Clock, Grid, SwipeLeft, SwipeRight, ArrowRight, Note, Crown, Comment, Sparkle } from '@/app/components/HwIcon'

export default function CreatorUpload() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [user, setUser] = useState<any>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [formData, setFormData] = useState({
    // Step 1: Photo
    imageFile: null as File | null,
    
    // Step 2: Details & Tags
    dishName: '',
    restaurantName: '',
    restaurantLocation: '',
    title: '',
    description: '',
    cuisineType: '',
    cuisineTags: [] as string[],
    tags: [] as string[],
    dietaryTags: [] as string[],
    experienceTags: [] as string[],
    portionTags: [] as string[],
    
    // Step 3: Nutrition & Info
    calories: '',
    proteinGrams: '',
    carbsGrams: '',
    fatGrams: '',
    spiceLevel: 0,
    portionSize: '' as 'light' | 'regular' | 'large' | 'shareable' | '',
    vegetarianOption: false,
    veganOption: false,
    glutenFreeOption: false,
    healthCategory: '',
    price: '',
    locationText: '',
    ingredientTags: [] as string[],
    customIngredient: '',
    
    // Step 4: Commission
    commissionRate: '10',
  })

  useEffect(() => {
    const storedUser = localStorage.getItem('hungerswipes_user')
    if (storedUser) {
      const parsed = JSON.parse(storedUser)
      setUser(parsed)
    }
  }, [])

  // Calculate metadata and completeness
  const metadata: PhotoMetadata = useMemo(() => ({
    title: formData.title || formData.dishName,
    description: formData.description,
    tags: formData.tags,
    dietary_tags: formData.dietaryTags,
    ingredient_tags: formData.ingredientTags,
    cuisine_tags: formData.cuisineTags,
    calories: formData.calories ? parseInt(formData.calories) : undefined,
    protein_grams: formData.proteinGrams ? parseInt(formData.proteinGrams) : undefined,
    carbs_grams: formData.carbsGrams ? parseInt(formData.carbsGrams) : undefined,
    fat_grams: formData.fatGrams ? parseInt(formData.fatGrams) : undefined,
    spice_level: formData.spiceLevel || undefined,
    portion_size: formData.portionSize || undefined,
    restaurant_name: formData.restaurantName,
    location_text: formData.locationText || formData.restaurantLocation,
    price: formData.price ? parseFloat(formData.price) : undefined,
    vegetarian_option: formData.vegetarianOption,
    vegan_option: formData.veganOption,
    gluten_free_option: formData.glutenFreeOption,
    health_category: formData.healthCategory,
  }), [formData])

  const completenessResult = useMemo(() => calculateCompletenessScore(metadata), [metadata])
  const payoutTier = useMemo(() => getPayoutTier(completenessResult.score), [completenessResult.score])
  const tierBadge = useMemo(() => getTierBadge(completenessResult.score), [completenessResult.score])
  
  // Commission preview
  const basePrice = 20 // Default order price for preview
  const earningsPreview = useMemo(() => {
    const currentRate = payoutTier.creatorRate
    const commissionAmount = basePrice * 0.10
    return {
      current: commissionAmount * currentRate,
      potential: commissionAmount * 0.95, // Top tier
      boost: Math.round(((commissionAmount * 0.95 - commissionAmount * currentRate) / (commissionAmount * currentRate)) * 100)
    }
  }, [payoutTier])

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData({ ...formData, imageFile: file })
      const reader = new FileReader()
      reader.onload = (ev) => setPreviewUrl(ev.target?.result as string)
      reader.readAsDataURL(file)
    }
  }

  const toggleTag = (tag: string, category: 'tags' | 'dietaryTags' | 'cuisineTags' | 'experienceTags' | 'portionTags' | 'ingredientTags') => {
    const current = formData[category]
    if (current.includes(tag)) {
      setFormData({ ...formData, [category]: current.filter((t: string) => t !== tag) })
    } else {
      // Limit custom tags to 3 per category
      if (category === 'ingredientTags' && current.length >= 3) return
      setFormData({ ...formData, [category]: [...current, tag] })
    }
  }

  const addCustomIngredient = () => {
    if (formData.customIngredient.trim() && formData.ingredientTags.length < 3) {
      setFormData({
        ...formData,
        ingredientTags: [...formData.ingredientTags, formData.customIngredient.trim().toLowerCase()],
        customIngredient: ''
      })
    }
  }

  const handleSubmit = async () => {
    if (!user?.id) {
      alert('Please sign in as a creator first')
      router.push('/auth')
      return
    }

    setIsSubmitting(true)

    try {
      const res = await fetch('/api/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId: user.id,
          dishName: formData.dishName,
          restaurantName: formData.restaurantName,
          restaurantLocation: formData.restaurantLocation,
          title: formData.title || formData.dishName,
          description: formData.description,
          cuisineType: formData.cuisineType,
          cuisineTags: formData.cuisineTags,
          priceRange: '$', // Default, could be calculated from price
          price: formData.price ? parseFloat(formData.price) : undefined,
          commissionRate: parseFloat(formData.commissionRate) / 100,
          tags: formData.tags,
          dietaryTags: formData.dietaryTags,
          ingredientTags: formData.ingredientTags,
          calories: formData.calories ? parseInt(formData.calories) : undefined,
          proteinGrams: formData.proteinGrams ? parseInt(formData.proteinGrams) : undefined,
          carbsGrams: formData.carbsGrams ? parseInt(formData.carbsGrams) : undefined,
          fatGrams: formData.fatGrams ? parseInt(formData.fatGrams) : undefined,
          spiceLevel: formData.spiceLevel || undefined,
          portionSize: formData.portionSize || undefined,
          vegetarianOption: formData.vegetarianOption,
          veganOption: formData.veganOption,
          glutenFreeOption: formData.glutenFreeOption,
          healthCategory: formData.healthCategory || undefined,
          locationText: formData.locationText || formData.restaurantLocation,
        })
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || 'Upload failed')
      }

      router.push('/creator')

    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const canProceedStep2 = formData.dishName && formData.restaurantName

  return (
    <div className="min-h-screen bg-[#0D0D0D]">
      {/* Header */}
      <header className="bg-[#0D0D0D] border-b border-white/5 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Link href="/creator" className="text-gray-600 font-medium">
            ← Cancel
          </Link>
          <h1 className="font-bold text-white">Upload Photo</h1>
          <div className="w-16" />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3, 4].map(s => (
            <div
              key={s}
              className={`flex-1 h-1.5 rounded-full transition ${
                s <= step ? 'bg-[#FFD700]' : 'bg-white/10'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Photo */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Add Your Food Photo</h2>
              <p className="text-gray-600">Make it look delicious — this is what drives orders</p>
            </div>

            <div className="bg-white/5 rounded-2xl border-2 border-dashed border-white/10 overflow-hidden">
              {previewUrl ? (
                <div className="relative">
                  <img src={previewUrl} alt="Preview" className="w-full h-80 object-cover" />
                  <label className="absolute inset-0 bg-black/50 flex items-center justify-center cursor-pointer">
                    <span className="text-white font-semibold">Change Photo</span>
                    <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                  </label>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <div className="text-6xl mb-4">📸</div>
                  <p className="text-gray-600 mb-4">Drag & drop or tap to upload</p>
                  <label className="inline-block px-6 py-3 bg-[#FFD700] text-[#0D0D0D] rounded-full font-semibold cursor-pointer hover:bg-[#FFD700]/90 transition">
                    Select Photo
                    <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                  </label>
                </div>
              )}
            </div>

            <div className="bg-[#FFD700]/10 rounded-2xl p-4 border border-[#FFD700]/20">
              <h3 className="font-bold text-[#FFD700] mb-2">💡 Pro Tips</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Natural lighting works best</li>
                <li>• Shoot at a 45° angle for depth</li>
                <li>• Include the whole dish + context</li>
                <li>• Avoid heavy filters — accuracy beats artifice</li>
              </ul>
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full py-4 bg-[#FF5722] text-white rounded-2xl font-bold hover:bg-[#e64a19] transition"
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 2: Details & Tags */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Dish Details & Tags</h2>
              <p className="text-gray-600">More tags = better visibility + higher payouts</p>
            </div>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Title (optional)</label>
                <input
                  type="text"
                  placeholder="e.g., Truffle Mushroom Burger"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
                />
              </div>

              {/* Dish Name */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Dish Name *</label>
                <input
                  type="text"
                  placeholder="e.g., Truffle Mushroom Burger"
                  value={formData.dishName}
                  onChange={e => setFormData({ ...formData, dishName: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
                />
              </div>

              {/* Restaurant */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Restaurant Name *</label>
                <input
                  type="text"
                  placeholder="e.g., The Burger Joint"
                  value={formData.restaurantName}
                  onChange={e => setFormData({ ...formData, restaurantName: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Location</label>
                <input
                  type="text"
                  placeholder="e.g., Delmar Loop, St. Louis"
                  value={formData.restaurantLocation}
                  onChange={e => setFormData({ ...formData, restaurantLocation: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Description</label>
                <textarea
                  placeholder="Describe the dish, what makes it special..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FFD700] resize-none"
                />
              </div>

              {/* Food Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Food Tags *</label>
                <div className="flex flex-wrap gap-2">
                  {FOOD_TAGS.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag, 'tags')}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                        formData.tags.includes(tag)
                          ? 'bg-[#FF5722] text-white'
                          : 'bg-white/10 text-gray-600 hover:bg-white/20'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cuisine Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Cuisine Type *</label>
                <div className="flex flex-wrap gap-2">
                  {CUISINE_TAGS.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag, 'cuisineTags')}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                        formData.cuisineTags.includes(tag)
                          ? 'bg-[#FF5722] text-white'
                          : 'bg-white/10 text-gray-600 hover:bg-white/20'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dietary Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Dietary Tags</label>
                <div className="flex flex-wrap gap-2">
                  {DIETARY_TAGS.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag, 'dietaryTags')}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                        formData.dietaryTags.includes(tag)
                          ? 'bg-[#10B981] text-white'
                          : 'bg-white/10 text-gray-600 hover:bg-white/20'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-4 bg-white/5 border border-white/10 text-gray-600 rounded-2xl font-bold hover:bg-white/10 transition"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!canProceedStep2}
                className="flex-1 py-4 bg-[#FF5722] text-white rounded-2xl font-bold hover:bg-[#e64a19] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Nutrition & Info */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Nutrition & Details</h2>
              <p className="text-gray-600">Fill in more = climb the rankings!</p>
            </div>

            {/* Completeness Score (Live) */}
            <div className={`${tierBadge.bgColor} rounded-2xl p-4 border`} style={{ borderColor: tierBadge.color + '40' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium" style={{ color: tierBadge.color }}>
                  {tierBadge.label}
                </span>
                <span className="text-2xl font-bold" style={{ color: tierBadge.color }}>
                  {completenessResult.score}/100
                </span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{ width: `${completenessResult.score}%`, backgroundColor: tierBadge.color }}
                />
              </div>
            </div>

            <div className="space-y-4">
              {/* Calories */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Calories</label>
                <input
                  type="number"
                  placeholder="e.g., 650"
                  value={formData.calories}
                  onChange={e => setFormData({ ...formData, calories: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
                />
              </div>

              {/* Macros */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Protein (g)</label>
                  <input
                    type="number"
                    placeholder="e.g., 32"
                    value={formData.proteinGrams}
                    onChange={e => setFormData({ ...formData, proteinGrams: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Carbs (g)</label>
                  <input
                    type="number"
                    placeholder="e.g., 45"
                    value={formData.carbsGrams}
                    onChange={e => setFormData({ ...formData, carbsGrams: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Fat (g)</label>
                  <input
                    type="number"
                    placeholder="e.g., 28"
                    value={formData.fatGrams}
                    onChange={e => setFormData({ ...formData, fatGrams: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
                  />
                </div>
              </div>

              {/* Spice Level */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Spice Level</label>
                <div className="flex gap-2">
                  {SPICE_LEVELS.map(level => (
                    <button
                      key={level.value}
                      onClick={() => setFormData({ ...formData, spiceLevel: level.value })}
                      className={`flex-1 py-2 rounded-xl text-xs font-medium transition ${
                        formData.spiceLevel === level.value
                          ? 'bg-[#FF5722] text-white'
                          : 'bg-white/10 text-gray-600 hover:bg-white/20'
                      }`}
                    >
                      {level.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Portion Size */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Portion Size</label>
                <div className="flex gap-2">
                  {['light', 'regular', 'large', 'shareable'].map(size => (
                    <button
                      key={size}
                      onClick={() => setFormData({ ...formData, portionSize: size as any })}
                      className={`flex-1 py-3 rounded-xl text-sm font-medium capitalize transition ${
                        formData.portionSize === size
                          ? 'bg-[#FFD700] text-[#0D0D0D]'
                          : 'bg-white/10 text-gray-600 hover:bg-white/20'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dietary Options */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Dietary Options</label>
                <div className="flex gap-3">
                  {[
                    { key: 'vegetarianOption', label: '🥗 Vegetarian' },
                    { key: 'veganOption', label: '🌱 Vegan' },
                    { key: 'glutenFreeOption', label: '🌾 Gluten-Free' },
                  ].map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => setFormData({ ...formData, [opt.key]: !formData[opt.key as keyof typeof formData] })}
                      className={`flex-1 py-3 rounded-xl text-sm font-medium transition ${
                        formData[opt.key as keyof typeof formData]
                          ? 'bg-[#10B981] text-white'
                          : 'bg-white/10 text-gray-600 hover:bg-white/20'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Health Category */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Health Category</label>
                <div className="flex flex-wrap gap-2">
                  {HEALTH_CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setFormData({ ...formData, healthCategory: cat })}
                      className={`px-3 py-2 rounded-xl text-sm font-medium capitalize transition ${
                        formData.healthCategory === cat
                          ? 'bg-[#8B5CF6] text-white'
                          : 'bg-white/10 text-gray-600 hover:bg-white/20'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g., 18.99"
                  value={formData.price}
                  onChange={e => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
                />
              </div>

              {/* Ingredient Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Ingredient Tags (max 3)
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="e.g., brisket, smoke rub..."
                    value={formData.customIngredient}
                    onChange={e => setFormData({ ...formData, customIngredient: e.target.value })}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomIngredient())}
                    className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
                  />
                  <button
                    onClick={addCustomIngredient}
                    disabled={formData.ingredientTags.length >= 3}
                    className="px-4 py-2 bg-white/10 text-gray-600 rounded-lg text-sm hover:bg-white/20 disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.ingredientTags.map(tag => (
                    <span key={tag} className="px-2 py-1 bg-[#8B5CF6]/20 text-[#8B5CF6] rounded-full text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-4 bg-white/5 border border-white/10 text-gray-600 rounded-2xl font-bold hover:bg-white/10 transition"
              >
                Back
              </button>
              <button
                onClick={() => setStep(4)}
                className="flex-1 py-4 bg-[#FF5722] text-white rounded-2xl font-bold hover:bg-[#e64a19] transition"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Commission Preview */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Commission Preview</h2>
              <p className="text-gray-600">Set your rate and see your potential earnings</p>
            </div>

            {/* Tier Status */}
            <div className={`${tierBadge.bgColor} rounded-2xl p-6 border text-center`} style={{ borderColor: tierBadge.color + '40' }}>
              <div className="text-4xl mb-2">{tierBadge.label.includes('Top') ? '<Star size={22} />' : tierBadge.label.includes('Enhanced') ? '<Sparkle size={22} />' : ''}</div>
              <div className="text-2xl font-bold mb-1" style={{ color: tierBadge.color }}>{completenessResult.score}/100</div>
              <div className="text-gray-600 text-sm">{payoutTier.description}</div>
            </div>

            {/* Earnings Comparison */}
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h3 className="font-bold text-white mb-4"><Dollar size={22} /> Per-Order Earnings Preview</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Order Price</span>
                  <span className="font-bold text-white">${basePrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Commission (10%)</span>
                  <span className="font-bold text-white">${(basePrice * 0.10).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Platform Fee (10%)</span>
                  <span className="font-bold text-white">${(basePrice * 0.10 * 0.10).toFixed(2)}</span>
                </div>
                <hr className="border-white/10" />
                <div className="flex justify-between">
                  <span className="text-gray-600">You Earn (Current Tier)</span>
                  <span className="font-bold text-xl" style={{ color: payoutTier.color }}>
                    ${earningsPreview.current.toFixed(2)}
                  </span>
                </div>
                {earningsPreview.boost > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Potential (Top Tier)</span>
                    <span className="font-bold text-[#FFD700]">${earningsPreview.potential.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Missing Items Checklist */}
            {completenessResult.missingItems.length > 0 && (
              <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                <h3 className="font-bold text-white mb-4">📝 Missing Items ({completenessResult.missingItems.length})</h3>
                <ul className="space-y-2">
                  {completenessResult.missingItems.slice(0, 5).map(item => (
                    <li key={item} className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="w-2 h-2 rounded-full bg-[#FF5722]" />
                      {item}
                    </li>
                  ))}
                  {completenessResult.missingItems.length > 5 && (
                    <li className="text-sm text-[#FF5722]">
                      +{completenessResult.missingItems.length - 5} more items
                    </li>
                  )}
                </ul>
                <button
                  onClick={() => setStep(3)}
                  className="w-full mt-4 py-2 bg-[#FF5722]/20 text-[#FF5722] rounded-lg text-sm font-semibold"
                >
                  Go Back to Add More
                </button>
              </div>
            )}

            {/* Commission Rate */}
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <div className="text-center mb-4">
                <div className="text-5xl font-bold text-[#FFD700] mb-2">{formData.commissionRate}%</div>
                <p className="text-gray-600">per order commission rate</p>
              </div>

              <input
                type="range"
                min="5"
                max="20"
                step="1"
                value={formData.commissionRate}
                onChange={e => setFormData({ ...formData, commissionRate: e.target.value })}
                className="w-full accent-[#FFD700]"
              />

              <div className="flex justify-between text-sm text-gray-500 mt-2">
                <span>5%</span>
                <span>20%</span>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h3 className="font-bold text-white mb-4">Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Dish</span>
                  <span className="font-medium text-white">{formData.dishName || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Restaurant</span>
                  <span className="font-medium text-white">{formData.restaurantName || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tags</span>
                  <span className="font-medium text-white">{formData.tags.length + formData.dietaryTags.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Calories</span>
                  <span className="font-medium text-white">{formData.calories || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Your Commission</span>
                  <span className="font-bold text-[#10B981]">{formData.commissionRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payout Tier</span>
                  <span className="font-bold" style={{ color: payoutTier.color }}>{payoutTier.tierLabel}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(3)}
                className="flex-1 py-4 bg-white/5 border border-white/10 text-gray-600 rounded-2xl font-bold hover:bg-white/10 transition"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 py-4 bg-[#10B981] text-white rounded-2xl font-bold hover:bg-[#059669] transition disabled:opacity-50"
              >
                {isSubmitting ? 'Uploading...' : '🚀 Publish Photo'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
