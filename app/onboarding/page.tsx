'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ForkFlame, Camera, ArrowRight, CheckLine, Dollar } from '@/app/components/HwIcon'

export default function OnboardingPage() {
  const [role, setRole] = useState<'creator' | 'restaurant' | null>(null)
  const [step, setStep] = useState(1)
  const [submitted, setSubmitted] = useState(false)

  const [form, setForm] = useState({
    name: '',
    email: '',
    city: '',
    handle: '',
    website: '',
    cuisine: '',
    type: ''
  })

  const handleSubmit = () => {
    if (!role || !form.name || !form.email) return
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-[#FFD700] rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckLine className="w-8 h-8 text-black" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">You're on the list.</h1>
          <p className="text-gray-400 mb-2">
            {role === 'creator'
              ? "We'll text you when HungerSwipes launches in your city."
              : "We'll reach out within 24 hours to get your restaurant set up."}
          </p>
          <p className="text-[#FFD700] font-semibold mt-4">
            Share your link → earn commission on every order.
          </p>
          <Link href="/" className="mt-8 inline-block text-gray-400 hover:text-white transition">
            Back to home →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D]">
      {/* Header */}
      <div className="bg-[#C8102E] px-6 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ForkFlame className="w-8 h-8 text-white" />
            <span className="text-white font-bold text-xl">HungerSwipes</span>
          </div>
          <Link href="/" className="text-white/80 hover:text-white text-sm">Skip</Link>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-[#1A1A1A] px-6 py-3">
        <div className="max-w-lg mx-auto">
          <div className="flex gap-1">
            {[1, 2, 3].map(s => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition ${s <= step ? 'bg-[#FFD700]' : 'bg-gray-700'}`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 py-10">
        {/* Step 1: Choose role */}
        {step === 1 && (
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Join HungerSwipes</h1>
            <p className="text-gray-400 mb-8">Choose how you want to earn.</p>

            <div className="space-y-4">
              <button
                onClick={() => { setRole('creator'); setStep(2) }}
                className={`w-full p-5 rounded-xl border-2 text-left transition ${
                  role === 'creator'
                    ? 'border-[#FFD700] bg-[#FFD700]/10'
                    : 'border-gray-700 bg-[#1A1A1A] hover:border-gray-500'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[#FFD700] rounded-full flex items-center justify-center flex-shrink-0">
                    <Camera className="w-6 h-6 text-black" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">Food Photographer</span>
                      <span className="text-xs bg-[#FFD700] text-black px-2 py-0.5 rounded font-semibold">Earn 5-20%</span>
                    </div>
                    <p className="text-gray-400 text-sm mt-1">
                      Upload food photos. Earn commission every time your photo drives an order. Forever.
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => { setRole('restaurant'); setStep(2) }}
                className={`w-full p-5 rounded-xl border-2 text-left transition ${
                  role === 'restaurant'
                    ? 'border-[#FFD700] bg-[#FFD700]/10'
                    : 'border-gray-700 bg-[#1A1A1A] hover:border-gray-500'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[#FFD700] rounded-full flex items-center justify-center flex-shrink-0">
                    <ForkFlame className="w-6 h-6 text-[#FF6A00]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">Restaurant Owner</span>
                      <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded font-semibold">Pay per result</span>
                    </div>
                    <p className="text-gray-400 text-sm mt-1">
                      Only pay when a photo you approve drives a customer. No upfront cost.
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Basic info */}
        {step === 2 && (
          <div>
            <button onClick={() => setStep(1)} className="text-gray-400 hover:text-white text-sm mb-6">
              ← Back
            </button>
            <h1 className="text-3xl font-bold text-white mb-2">
              {role === 'creator' ? 'Start earning.' : 'Get listed.'}
            </h1>
            <p className="text-gray-400 mb-8">
              {role === 'creator'
                ? "We'll notify you when HungerSwipes launches in your area."
                : "We'll reach out within 24 hours to set up your restaurant."}
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm mb-2 block">
                  {role === 'creator' ? 'Your name' : 'Restaurant name'}
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder={role === 'creator' ? 'Jane Smith' : 'Burger Joint STL'}
                  className="w-full bg-[#1A1A1A] border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-[#FFD700] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-2 block">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                  className="w-full bg-[#1A1A1A] border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-[#FFD700] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-2 block">City</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={e => setForm({ ...form, city: e.target.value })}
                  placeholder="St. Louis"
                  className="w-full bg-[#1A1A1A] border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-[#FFD700] focus:outline-none"
                />
              </div>

              {role === 'creator' && (
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Instagram or food blog (optional)</label>
                  <input
                    type="text"
                    value={form.handle}
                    onChange={e => setForm({ ...form, handle: e.target.value })}
                    placeholder="@yourfoodphotos"
                    className="w-full bg-[#1A1A1A] border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-[#FFD700] focus:outline-none"
                  />
                </div>
              )}

              {role === 'restaurant' && (
                <>
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Website (optional)</label>
                    <input
                      type="text"
                      value={form.website}
                      onChange={e => setForm({ ...form, website: e.target.value })}
                      placeholder="burgerjointstl.com"
                      className="w-full bg-[#1A1A1A] border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-[#FFD700] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Cuisine type</label>
                    <input
                      type="text"
                      value={form.cuisine}
                      onChange={e => setForm({ ...form, cuisine: e.target.value })}
                      placeholder="Burgers, BBQ, Pizza..."
                      className="w-full bg-[#1A1A1A] border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-[#FFD700] focus:outline-none"
                    />
                  </div>
                </>
              )}

              <button
                onClick={handleSubmit}
                disabled={!form.name || !form.email}
                className="w-full bg-[#FFD700] text-black font-bold py-4 rounded-xl mt-4 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#FFE033] transition flex items-center justify-center gap-2"
              >
                {role === 'creator' ? 'Start earning' : 'Get listed'}
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Earn info strip */}
        {role && (
          <div className="mt-8 bg-[#1A1A1A] rounded-xl p-4 border border-gray-800">
            <div className="flex items-center gap-3">
              <Dollar className="w-6 h-6 text-[#FFD700]" />
              <div>
                <p className="text-white font-semibold text-sm">
                  {role === 'creator'
                    ? 'One photo. Paid forever.'
                    : 'Pay only when HungerSwipes brings customers.'}
                </p>
                <p className="text-gray-400 text-xs mt-0.5">
                  {role === 'creator'
                    ? 'Set your commission rate (5-20%). Earn every time your photo drives an order.'
                    : 'No listing fees. No monthly fees. Pure performance.'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
