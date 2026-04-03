'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle, MapPin, Clock, Phone, ArrowRight, Star, Users, TrendingUp } from 'lucide-react'

const BENEFITS = [
  { icon: Users, title: 'More Customers', desc: 'Get discovered by hungry people in your area who are actively looking for food like yours.' },
  { icon: TrendingUp, title: 'No Extra Work', desc: 'Just list once. We send creators to photograph your food. No app to maintain, no orders to manage.' },
  { icon: CheckCircle, title: 'Completely Free to Start', desc: 'No monthly fees, no setup costs. You pay a small commission only when a photo drives a customer to you.' },
]

const HOW_IT_WORKS = [
  { step: '1', title: 'List Your Food', desc: 'Tell us what you make and where you are. Takes 60 seconds.' },
  { step: '2', title: 'We Send a Creator', desc: 'Our local food photographers come photograph your best dishes — at no cost to you.' },
  { step: '3', title: 'Customers Find You', desc: 'People nearby swipe through food photos, discover yours, and come directly to buy.' },
]

const TESTIMONIALS = [
  { quote: 'I was invisible on every food app. Now people walk up to my spot because they saw my food on HungerSwipes.', name: 'Local food vendor, St. Louis' },
]

const FAQ = [
  { q: 'How much does it cost?', a: 'Free to join. We charge a small commission (10-20%) only when your photo drives a customer to you. No orders = no fees.' },
  { q: 'Do I need an app or website?', a: 'No. You just need to be able to receive customers. We handle the discovery layer.' },
  { q: 'What do I need to provide?', a: 'Just your food info, location, and approval of the photos we take. That\'s it.' },
  { q: 'How do I get paid?', a: 'Customers pay you directly — cash, CashApp, Venmo, whatever you normally accept.' },
]

export default function VendorPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    await new Promise(r => setTimeout(r, 800))
    setSubmitted(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-gray-900">
      {/* Nav */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[#FF5722] rounded-xl flex items-center justify-center">
              <span className="font-black text-white text-sm">HS</span>
            </div>
            <div>
              <span className="font-bold text-gray-900">HungerSwipes</span>
              <span className="text-gray-400 text-xs block">For Restaurants & Vendors</span>
            </div>
          </Link>
          <Link href="/vendor-intake" className="hidden sm:inline-flex px-5 py-2.5 bg-[#FF5722] text-white rounded-lg font-semibold text-sm hover:bg-[#e64a19] transition items-center gap-2">
            Get Listed <ArrowRight size={16} />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-white py-16 md:py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#FF5722]/10 rounded-full text-[#FF5722] text-sm font-semibold mb-6">
            <span className="w-2 h-2 bg-[#FF5722] rounded-full" />
            Now onboarding vendors in St. Louis
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 leading-tight text-gray-900">
            Get More Customers.<br />
            <span className="text-[#FF5722]">No App Needed.</span>
          </h1>
          <p className="text-xl text-gray-500 mb-8 max-w-xl mx-auto leading-relaxed">
            HungerSwipes helps people find local food they can&apos;t find on Google or delivery apps. We send creators to photograph your dishes. You get new customers. At no cost.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/vendor-intake" className="px-8 py-4 bg-[#FF5722] text-white rounded-xl font-bold text-lg hover:bg-[#e64a19] transition inline-flex items-center justify-center gap-2">
              Get Listed — Takes 60 Seconds <ArrowRight size={20} />
            </Link>
            <a href="#how-it-works" className="px-8 py-4 bg-gray-100 text-gray-700 rounded-xl font-semibold text-lg hover:bg-gray-200 transition inline-flex items-center justify-center">
              See How It Works
            </a>
          </div>
          <p className="text-gray-400 text-sm mt-4">Free to join. No contracts. No monthly fees.</p>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-black text-center mb-4 text-gray-900">How It Works</h2>
          <p className="text-gray-500 text-center mb-12 text-lg">Three steps. That&apos;s all it takes.</p>
          <div className="grid md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map(item => (
              <div key={item.step} className="text-center">
                <div className="w-14 h-14 bg-[#FF5722] rounded-2xl flex items-center justify-center text-white font-black text-2xl mx-auto mb-5">
                  {item.step}
                </div>
                <h3 className="font-bold text-xl mb-2 text-gray-900">{item.title}</h3>
                <p className="text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-black text-center mb-12 text-gray-900">Why Join HungerSwipes</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {BENEFITS.map(b => (
              <div key={b.title} className="bg-[#FAFAFA] rounded-2xl p-6 border border-gray-100">
                <div className="w-12 h-12 bg-[#FF5722]/10 rounded-xl flex items-center justify-center mb-4">
                  <b.icon size={24} className="text-[#FF5722]" />
                </div>
                <h3 className="font-bold text-lg mb-2 text-gray-900">{b.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-16 px-4 bg-[#FF5722]">
        <div className="max-w-2xl mx-auto text-center text-white">
          <div className="text-4xl mb-4">"</div>
          <p className="text-xl md:text-2xl font-medium leading-relaxed mb-6">
            I was invisible on every food app. Now people walk up to my spot because they saw my food on HungerSwipes.
          </p>
          <p className="text-white/70 font-medium">— Local food vendor, St. Louis</p>
        </div>
      </section>

      {/* What We Don&apos;t Do */}
      <section className="py-12 px-4 bg-[#FAFAFA]">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Important</h2>
          <p className="text-gray-600 leading-relaxed">
            HungerSwipes is a <strong>discovery platform only</strong>. We do not prepare, handle, or sell food. All vendors operate independently and are solely responsible for their food, licensing, and compliance.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-10 text-gray-900">Questions</h2>
          <div className="space-y-4">
            {FAQ.map(item => (
              <div key={item.q} className="border border-gray-200 rounded-xl p-5">
                <h3 className="font-bold text-gray-900 mb-2">{item.q}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-gray-900">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4">Ready to Get Listed?</h2>
          <p className="text-gray-400 mb-8 text-lg">Join the growing network of local food vendors on HungerSwipes.</p>
          <Link href="/vendor-intake" className="inline-flex px-8 py-4 bg-[#FF5722] text-white rounded-xl font-bold text-lg hover:bg-[#e64a19] transition items-center gap-2">
            Get Listed Now <ArrowRight size={20} />
          </Link>
          <p className="text-gray-500 text-sm mt-4">Takes 60 seconds. No credit card. No contracts.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-100 px-4 py-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-8 h-8 bg-[#FF5722] rounded-lg flex items-center justify-center">
            <span className="font-black text-white text-xs">HS</span>
          </div>
          <span className="font-bold text-gray-900">HungerSwipes</span>
        </div>
        <p className="text-gray-400 text-sm mb-2">HungerSwipes is a discovery platform only.</p>
        <p className="text-gray-400 text-xs">All vendors operate independently. HungerSwipes does not prepare or sell food.</p>
        <div className="flex justify-center gap-6 mt-4">
          <Link href="/vendor-intake" className="text-[#FF5722] text-sm font-semibold hover:underline">Get Listed</Link>
          <Link href="/" className="text-gray-400 text-sm hover:text-gray-600">App</Link>
          <Link href="/creator" className="text-gray-400 text-sm hover:text-gray-600">For Creators</Link>
        </div>
      </footer>
    </div>
  )
}
