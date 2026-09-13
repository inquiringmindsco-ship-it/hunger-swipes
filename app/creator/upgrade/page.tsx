'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CheckBold, XMark, Dollar, Trophy, Star } from '@/app/components/HwIcon'

type KitchenType = 'home' | 'commercial' | 'shared' | 'pop-up'

interface VerificationState {
  step: number
  businessName: string
  kitchenType: KitchenType | ''
  hasKitchen: boolean
  needsKitchen: boolean
  kitchenAddress: string
  agreedToTerms: boolean
  submitted: boolean
}

export default function CreatorUpgradePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [state, setState] = useState<VerificationState>({
    step: 1,
    businessName: '',
    kitchenType: '',
    hasKitchen: true,
    needsKitchen: false,
    kitchenAddress: '',
    agreedToTerms: false,
    submitted: false
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const storedUser = localStorage.getItem('hungerswipes_user')
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
  }, [])

  // Mock metrics
  const metrics = {
    followers: 1247,
    engagement: '4.2%',
    posts: 34,
    earnings: 892.50,
    canUpgrade: true
  }

  const handleSubmit = async () => {
    if (!user?.id) {
      alert('Please sign in first')
      router.push('/auth')
      return
    }

    if (!state.agreedToTerms) {
      alert('You must agree to the terms')
      return
    }

    setIsSubmitting(true)

    try {
      const res = await fetch('/api/verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId: user.id,
          businessName: state.businessName,
          kitchenType: state.kitchenType,
          kitchenAddress: state.hasKitchen ? state.kitchenAddress : null,
          needsKitchenAssistance: state.needsKitchen
        })
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || 'Submission failed')
      }

      setState({ ...state, submitted: true })

    } catch (error) {
      console.error('Verification error:', error)
      alert('Failed to submit. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (state.submitted) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <div className="text-center px-4 max-w-md">
          <div className="text-7xl mb-6"><CheckBold size={24} /></div>
          <h1 className="text-3xl font-bold text-white mb-4">Application Submitted!</h1>
          <p className="text-gray-600 mb-8">
            We&apos;ll review your application and get back to you within 3-5 business days.
          </p>
          <Link 
            href="/creator"
            className="inline-block px-6 py-3 bg-[#FF5722] text-white rounded-full font-semibold hover:bg-[#e64a19] transition"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D]">
      {/* Header */}
      <header className="bg-[#0D0D0D] border-b border-white/5 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Link href="/creator" className="text-gray-600 font-medium">
            ← Cancel
          </Link>
          <h1 className="font-bold text-white">Start Selling Food</h1>
          <div className="w-16" />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map(s => (
            <div
              key={s}
              className={`flex-1 h-1.5 rounded-full transition ${
                s <= state.step ? 'bg-[#FFD700]' : 'bg-white/10'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Show potential */}
        {state.step === 1 && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-6xl mb-4">🚀</div>
              <h2 className="text-2xl font-bold text-white mb-2">Ready to Level Up?</h2>
              <p className="text-gray-600">You have what it takes to sell food legally</p>
            </div>

            {/* Your Stats */}
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h3 className="font-bold text-white mb-4">Your Creator Stats</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-white/5 rounded-xl">
                  <div className="text-2xl font-bold text-[#FFD700]">{metrics.followers}</div>
                  <div className="text-xs text-gray-600">Followers</div>
                </div>
                <div className="text-center p-3 bg-white/5 rounded-xl">
                  <div className="text-2xl font-bold text-[#10B981]">{metrics.engagement}</div>
                  <div className="text-xs text-gray-600">Engagement</div>
                </div>
                <div className="text-center p-3 bg-white/5 rounded-xl">
                  <div className="text-2xl font-bold text-white">{metrics.posts}</div>
                  <div className="text-xs text-gray-600">Posts</div>
                </div>
                <div className="text-center p-3 bg-white/5 rounded-xl">
                  <div className="text-2xl font-bold text-[#FF5722]">${metrics.earnings.toFixed(0)}</div>
                  <div className="text-xs text-gray-600">Earned</div>
                </div>
              </div>
            </div>

            {/* What you get */}
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h3 className="font-bold text-white mb-4">As a Verified Creator You Can:</h3>
              <ul className="space-y-3">
                {[
                  { icon: <Dollar size={20} />, text: 'Accept orders and earn real revenue' },
                  { icon: <Trophy size={20} />, text: 'Appear in verified kitchen feed' },
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-300">
                    {item.icon}
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => setState({ ...state, step: 2 })}
              className="w-full py-4 bg-[#FF5722] text-white rounded-2xl font-bold hover:bg-[#e64a19] transition"
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 2: Kitchen info */}
        {state.step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Your Kitchen Setup</h2>
              <p className="text-gray-600">Tell us about where you&apos;ll be cooking</p>
            </div>

            {/* Kitchen Type */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">Kitchen Type *</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'home', label: '🏠 Home Kitchen', desc: 'Cottage food laws apply' },
                  { value: 'commercial', label: '🏪 Commercial', desc: 'Licensed kitchen' },
                  { value: 'shared', label: '🤝 Shared Kitchen', desc: 'Co-op or rental' },
                  { value: 'pop-up', label: '🎪 Pop-up', desc: 'Events & markets' },
                ].map(type => (
                  <button
                    key={type.value}
                    onClick={() => setState({ ...state, kitchenType: type.value as KitchenType })}
                    className={`p-4 rounded-xl text-left transition ${
                      state.kitchenType === type.value
                        ? 'bg-[#FF5722] text-white'
                        : 'bg-white/10 text-gray-600 hover:bg-white/20'
                    }`}
                  >
                    <div className="font-semibold">{type.label}</div>
                    <div className={`text-xs ${state.kitchenType === type.value ? 'text-white/80' : 'text-gray-500'}`}>
                      {type.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Has Kitchen */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">Do you have a kitchen space?</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setState({ ...state, hasKitchen: true })}
                  className={`flex-1 py-3 rounded-xl font-medium transition ${
                    state.hasKitchen
                      ? 'bg-[#10B981] text-white'
                      : 'bg-white/10 text-gray-600'
                  }`}
                >
                  Yes, I have a kitchen
                </button>
                <button
                  onClick={() => setState({ ...state, hasKitchen: false, needsKitchen: true })}
                  className={`flex-1 py-3 rounded-xl font-medium transition ${
                    !state.hasKitchen
                      ? 'bg-[#FF5722] text-white'
                      : 'bg-white/10 text-gray-600'
                  }`}
                >
                  No, I need one
                </button>
              </div>
            </div>

            {/* Kitchen Address (if has kitchen) */}
            {state.hasKitchen && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Kitchen Address</label>
                <input
                  type="text"
                  placeholder="123 Main St, St. Louis, MO"
                  value={state.kitchenAddress}
                  onChange={e => setState({ ...state, kitchenAddress: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
                />
              </div>
            )}

            {/* Needs Kitchen Assistance */}
            {!state.hasKitchen && (
              <div className="bg-[#FFD700]/10 rounded-2xl p-4 border border-[#FFD700]/20">
                <p className="text-sm text-[#FFD700]">
                  💡 We&apos;ll connect you with kitchen partners in your area. We&apos;re building a network of shared kitchens and commercial spaces for creators like you!
                </p>
              </div>
            )}

            {/* Business Name */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">Business Name *</label>
              <input
                type="text"
                placeholder="e.g., Mike's BBQ, Sarah's Sweets"
                value={state.businessName}
                onChange={e => setState({ ...state, businessName: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setState({ ...state, step: 1 })}
                className="flex-1 py-4 bg-white/5 border border-white/10 text-gray-600 rounded-2xl font-bold hover:bg-white/10 transition"
              >
                Back
              </button>
              <button
                onClick={() => setState({ ...state, step: 3 })}
                disabled={!state.businessName || !state.kitchenType}
                className="flex-1 py-4 bg-[#FF5722] text-white rounded-2xl font-bold hover:bg-[#e64a19] transition disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Terms & Submit */}
        {state.step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Final Step</h2>
              <p className="text-gray-600">Agree to our terms and submit</p>
            </div>

            {/* Terms */}
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10 max-h-60 overflow-y-auto">
              <h3 className="font-bold text-white mb-4">Creator Terms & Compliance</h3>
              <div className="text-sm text-gray-600 space-y-3">
                <p>By submitting this application, you agree to:</p>
                <ul className="list-disc ml-4 space-y-2">
                  <li>Comply with all local food safety laws and regulations</li>
                  <li>Obtain necessary permits and licenses for food sales</li>
                  <li>Follow cottage food laws if applicable in your state</li>
                  <li>Maintain proper food handling certifications</li>
                  <li>Keep your kitchen clean and meet health standards</li>
                  <li>accurately represent your food and business</li>
                  <li>Respond to order requests within 24 hours</li>
                  <li>Maintain fair pricing and honest descriptions</li>
                </ul>
                <p className="text-white font-medium mt-4">
                  HungerSwipes is not responsible for violations of food laws by creators. You are responsible for ensuring your food business is legal in your jurisdiction.
                </p>
              </div>
            </div>

            {/* Agreement */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={state.agreedToTerms}
                onChange={e => setState({ ...state, agreedToTerms: e.target.checked })}
                className="mt-1 w-5 h-5 rounded accent-[#FF5722]"
              />
              <span className="text-gray-300 text-sm">
                I have read and agree to the terms above. I understand I am responsible for compliance with local food laws.
              </span>
            </label>

            {/* Summary */}
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h3 className="font-bold text-white mb-4">Application Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Business</span>
                  <span className="text-white">{state.businessName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Kitchen Type</span>
                  <span className="text-white capitalize">{state.kitchenType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Has Kitchen</span>
                  <span className="text-white">{state.hasKitchen ? 'Yes' : 'No'}</span>
                </div>
                {state.kitchenAddress && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Address</span>
                    <span className="text-white">{state.kitchenAddress}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setState({ ...state, step: 2 })}
                className="flex-1 py-4 bg-white/5 border border-white/10 text-gray-600 rounded-2xl font-bold hover:bg-white/10 transition"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={!state.agreedToTerms || isSubmitting}
                className="flex-1 py-4 bg-[#10B981] text-white rounded-2xl font-bold hover:bg-[#059669] transition disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : '🚀 Submit Application'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
