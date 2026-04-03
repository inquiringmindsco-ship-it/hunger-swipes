'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle } from 'lucide-react'

export default function VendorOnePagerPage() {
  const [vendorUrl, setVendorUrl] = useState('')
  const [showQr, setShowQr] = useState(false)

  const handleGenerate = () => {
    if (!vendorUrl.trim()) return
    setShowQr(true)
  }

  return (
    <div className="min-h-screen bg-white text-gray-900" style={{ fontFamily: 'Georgia, serif' }}>
      {/* Print Header */}
      <div className="max-w-2xl mx-auto px-6 py-8">
        
        {/* Logo + Title */}
        <div className="flex items-center gap-3 mb-8 border-b border-gray-200 pb-6">
          <div className="w-14 h-14 bg-[#FF5722] rounded-xl flex items-center justify-center">
            <span className="font-black text-white text-lg">HS</span>
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900" style={{ fontFamily: 'system-ui, sans-serif' }}>HungerSwipes</h1>
            <p className="text-gray-500 text-sm">For Restaurants & Local Food Vendors</p>
          </div>
        </div>

        {/* Hero Line */}
        <h2 className="text-3xl md:text-4xl font-black mb-4 leading-tight" style={{ fontFamily: 'system-ui, sans-serif' }}>
          Get More Customers.<br />
          <span className="text-[#FF5722]">No App Needed.</span>
        </h2>
        <p className="text-lg text-gray-600 mb-8 leading-relaxed">
          HungerSwipes helps people find local food they can&apos;t find on Google or delivery apps. We send creators to photograph your dishes. You get new customers. Free to join.
        </p>

        {/* What It Is */}
        <div className="bg-gray-50 rounded-2xl p-6 mb-6 border border-gray-100">
          <h3 className="font-black text-lg mb-3 text-gray-900" style={{ fontFamily: 'system-ui, sans-serif' }}>What This Is</h3>
          <p className="text-gray-600 leading-relaxed">
            HungerSwipes is a food discovery platform. Think of it as a hidden food map for your city. Hungry people swipe through beautiful food photos, discover vendors like you, and come directly to buy.
          </p>
        </div>

        {/* How It Works - Clean 3 Steps */}
        <h3 className="font-black text-xl mb-4 text-gray-900" style={{ fontFamily: 'system-ui, sans-serif' }}>How It Works</h3>
        <div className="space-y-4 mb-8">
          {[
            { n: '1', title: 'List Your Food', desc: 'Tell us what you make and where you are. Takes 60 seconds.' },
            { n: '2', title: 'We Send a Creator', desc: 'Our local food photographers come photograph your best dishes — at no cost to you.' },
            { n: '3', title: 'Customers Find You', desc: 'People nearby swipe, discover your food, and come directly to buy from you.' },
          ].map(s => (
            <div key={s.n} className="flex gap-4 items-start">
              <div className="w-10 h-10 bg-[#FF5722] rounded-full flex items-center justify-center text-white font-black text-lg flex-shrink-0">
                {s.n}
              </div>
              <div>
                <h4 className="font-bold text-gray-900" style={{ fontFamily: 'system-ui, sans-serif' }}>{s.title}</h4>
                <p className="text-gray-600 text-sm">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Benefits */}
        <h3 className="font-black text-xl mb-4 text-gray-900" style={{ fontFamily: 'system-ui, sans-serif' }}>Why Join</h3>
        <div className="grid grid-cols-2 gap-3 mb-8">
          {[
            'More customers',
            'Free to join',
            'No tech skills needed',
            'No contracts',
            'Commission only on results',
            'We photograph your food',
          ].map(b => (
            <div key={b} className="flex items-center gap-2 text-sm text-gray-700">
              <CheckCircle size={16} className="text-[#FF5722] flex-shrink-0" />
              {b}
            </div>
          ))}
        </div>

        {/* QR Code Section */}
        <div className="bg-gray-900 rounded-2xl p-6 text-white mb-6">
          <h3 className="font-black text-lg mb-2" style={{ fontFamily: 'system-ui, sans-serif' }}>Get Listed in 60 Seconds</h3>
          <p className="text-gray-400 text-sm mb-4">Scan the QR code or visit the link below to register.</p>
          
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* QR Code placeholder */}
            <div className="bg-white p-3 rounded-xl w-28 h-28 flex items-center justify-center flex-shrink-0">
              <div className="text-center">
                <div className="text-3xl mb-1">📱</div>
                <p className="text-gray-900 text-xs font-bold">Scan to Register</p>
              </div>
            </div>

            <div className="flex-1 text-center sm:text-left">
              <p className="text-white font-bold mb-1">Your Vendor Link:</p>
              <input
                type="url"
                value={vendorUrl}
                onChange={e => setVendorUrl(e.target.value)}
                placeholder="Enter your vendor registration link"
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder-gray-400 mb-2"
              />
              <button
                onClick={handleGenerate}
                className="w-full sm:w-auto px-5 py-2 bg-[#FF5722] text-white rounded-lg font-bold text-sm hover:bg-[#e64a19] transition"
              >
                Generate QR
              </button>
              {showQr && vendorUrl && (
                <p className="text-gray-400 text-xs mt-2">
                  QR code generates when link is live. Use the vendor-intake URL from your dashboard.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="text-center border-t border-gray-200 pt-6">
          <p className="text-gray-600 text-sm mb-1">Questions? Contact us at</p>
          <p className="text-[#FF5722] font-bold">support@hungerswipes.com</p>
        </div>

        {/* Disclaimer - Footer */}
        <div className="mt-8 pt-4 border-t border-gray-200">
          <p className="text-gray-400 text-xs leading-relaxed text-center">
            HungerSwipes is a discovery platform only. We do not prepare, handle, or sell food. All vendors operate independently and are solely responsible for their food, licensing, and compliance. Users assume all risk when purchasing from vendors.
          </p>
        </div>

        {/* CTA Button */}
        <div className="mt-6 text-center">
          <Link href="/vendor-intake" className="inline-flex px-8 py-4 bg-[#FF5722] text-white rounded-xl font-black text-lg hover:bg-[#e64a19] transition items-center gap-2" style={{ fontFamily: 'system-ui, sans-serif' }}>
            Get Listed Now →
          </Link>
          <p className="text-gray-400 text-xs mt-2">hungerswipes.vercel.app/vendor-intake</p>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .no-print { display: none; }
        }
      `}</style>
    </div>
  )
}
