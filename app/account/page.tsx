'use client'

import Link from 'next/link'
import { useAuth, signOut, getAuthToken } from '@/lib/auth'
import { useEffect, useState } from 'react'
import { LogOut, Store, Heart, User, ChevronRight, MapPin, SlidersHorizontal, Shield, Bell, Utensils, Wallet, Camera, Trash2, Clock, CheckCircle, HelpCircle, XCircle } from 'lucide-react'
import { BrandMark, ProfileIcon } from '@/app/components/icons/HungerIcons'
import MobileNav from '@/app/components/MobileNav'
import { LoadingState } from '@/app/components/ui/LoadingState'
import { useDialogA11y } from '@/lib/dialog-a11y'
import Head from 'next/head'

function DeletePostDialog({ postId, onCancel, onDelete, deleting }: { postId: string; onCancel: () => void; onDelete: () => void; deleting: boolean }) {
  const ref = useDialogA11y(true, onCancel)
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 p-4"
      onClick={onCancel}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-post-title"
      aria-describedby="delete-post-desc"
    >
      <div
        ref={ref}
        tabIndex={-1}
        className="bg-hs-charcoal border border-white/10 rounded-t-2xl sm:rounded-2xl p-5 w-full max-w-sm safe-bottom shadow-2xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="delete-post-title" className="font-bold text-hs-cream mb-2">Delete this food post?</h2>
        <p id="delete-post-desc" className="text-sm text-hs-gray mb-5">
          This will remove it from Hunger Swipes and stop any future Swipe Bucks from this post. Your past earnings stay in your wallet.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onCancel}
            className="py-4 rounded-xl bg-white/5 text-hs-cream font-semibold active:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-hs-gold"
          >
            Cancel
          </button>
          <button
            onClick={onDelete}
            disabled={deleting}
            className="py-4 rounded-xl bg-hs-red text-white font-bold active:bg-hs-red/80 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-hs-red"
          >
            {deleting ? 'Deleting…' : 'Delete Post'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="text-xs font-semibold text-hs-gold uppercase tracking-wider mb-3 px-1">{title}</h2>
      <div className="bg-hs-charcoal border border-white/[0.06] rounded-[1.5rem] overflow-hidden">{children}</div>
    </section>
  )
}

function Row({
  href,
  onClick,
  icon,
  label,
  detail,
  danger,
  disabled = false,
}: {
  href?: string
  onClick?: () => void
  icon: React.ReactNode
  label: string
  detail?: string
  danger?: boolean
  disabled?: boolean
}) {
  const content = (
    <>
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${danger ? 'bg-hs-red/10 text-hs-red' : disabled ? 'bg-hs-soft/50 text-hs-muted' : 'bg-hs-soft text-hs-gold'}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className={`text-sm font-semibold ${danger ? 'text-hs-red' : disabled ? 'text-hs-muted' : 'text-hs-cream'}`}>{label}</p>
          {detail && <p className="text-xs text-hs-gray truncate">{detail}</p>}
        </div>
      </div>
      {!disabled && <ChevronRight size={16} className={`shrink-0 ${danger ? 'text-hs-red/60' : 'text-hs-gray'}`} />}
    </>
  )

  const className = `flex items-center justify-between px-4 py-3.5 transition ${disabled ? 'cursor-default opacity-60' : 'hover:bg-white/[0.03]'}`

  if (href) {
    return disabled ? (
      <div className={className}>{content}</div>
    ) : (
      <Link href={href} className={className}>{content}</Link>
    )
  }

  return (
    <button onClick={disabled ? undefined : onClick} className={`w-full ${className}`}>
      {content}
    </button>
  )
}

export default function AccountPage() {
  const { user, loading } = useAuth()
  const [seller, setSeller] = useState<any>(null)
  const [checking, setChecking] = useState(true)

  const [myPosts, setMyPosts] = useState<any[]>([])
  const [postsLoading, setPostsLoading] = useState(true)
  const [postToDelete, setPostToDelete] = useState<string | null>(null)
  const [deletingPost, setDeletingPost] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 2500)
    return () => clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (postToDelete) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [postToDelete])

  // Clean up body overflow when dialog is gone; useDialogA11y also manages it.

  useEffect(() => {
    if (loading) return
    if (!user) {
      setChecking(false)
      setPostsLoading(false)
      return
    }
    getAuthToken().then((token) =>
      Promise.all([
        fetch('/api/sellers?mine=true', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }).then((r) => r.json()),
        fetch('/api/community-posts?mine=true', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }).then((r) => r.json()),
      ])
        .then(([sellerData, postsData]) => {
          if (sellerData.seller) setSeller(sellerData.seller)
          setMyPosts(postsData.posts || [])
        })
        .finally(() => {
          setChecking(false)
          setPostsLoading(false)
        })
    )
  }, [user, loading])

  const deletePost = async (id: string) => {
    setDeletingPost(id)
    try {
      const token = await getAuthToken()
      const res = await fetch(`/api/community-posts/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const data = await res.json()
      if (data.success) {
        setMyPosts((prev) => prev.map((p) => (p.id === id ? { ...p, moderation_status: 'removed', status: 'removed' } : p)))
        setPostToDelete(null)
      }
    } finally {
      setDeletingPost(null)
    }
  }

  const statusLabel = (status: string) => {
    if (status === 'approved') return { text: 'Live', icon: <CheckCircle size={14} className="text-green-400" />, color: 'text-green-400' }
    if (status === 'pending_review') return { text: 'Under Review', icon: <HelpCircle size={14} className="text-yellow-400" />, color: 'text-yellow-400' }
    if (status === 'rejected') return { text: 'Not Approved', icon: <XCircle size={14} className="text-red-400" />, color: 'text-red-400' }
    return { text: 'Removed', icon: <Trash2 size={14} className="text-gray-400" />, color: 'text-gray-400' }
  }

  if (loading || checking) {
    return (
      <div className="min-h-screen bg-hs-ink pb-24">
        <header className="sticky top-0 z-40 bg-hs-ink/90 backdrop-blur-md border-b border-white/[0.06] px-4 py-3 safe-top">
          <div className="max-w-md mx-auto flex items-center gap-2">
            <BrandMark size={28} />
            <span className="font-bold text-base text-hs-cream tracking-tight">Profile</span>
          </div>
        </header>
        <main className="max-w-md mx-auto px-4 pt-8">
          <LoadingState label="Loading your profile…" />
        </main>
        <MobileNav />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-hs-ink pb-24">
        <header className="sticky top-0 z-40 bg-hs-ink/90 backdrop-blur-md border-b border-white/[0.06] px-4 py-3 safe-top">
          <div className="max-w-md mx-auto flex items-center gap-2">
            <BrandMark size={28} />
            <span className="font-bold text-base text-hs-cream tracking-tight">Profile</span>
          </div>
        </header>
        <main className="max-w-md mx-auto px-4 py-10 text-center">
          <div className="w-16 h-16 rounded-full bg-hs-soft flex items-center justify-center mx-auto mb-5">
            <ProfileIcon size={32} className="text-hs-gold" />
          </div>
          <h1 className="text-2xl font-bold text-hs-cream mb-2">Sign in to Hunger Swipes</h1>
          <p className="text-hs-gray text-sm mb-6 max-w-[260px] mx-auto">Create an account to save dishes or list your food.</p>
          <Link
            href="/auth?next=/account"
            className="inline-block px-8 py-3.5 bg-hs-gold text-hs-black rounded-full font-bold text-sm hover:bg-hs-gold-light transition"
          >
            Sign In / Sign Up
          </Link>
        </main>
        <MobileNav />
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Account — Hunger Swipes</title>
        <meta name="description" content="Manage your Hunger Swipes account, preferences, saved dishes, and seller settings." />
      </Head>
      <div className="min-h-screen bg-hs-ink pb-24">
        <header className="sticky top-0 z-40 bg-hs-ink/90 backdrop-blur-md border-b border-white/[0.06] px-4 py-3 safe-top">
          <div className="max-w-md mx-auto flex items-center gap-2">
            <BrandMark size={28} />
            <span className="font-bold text-base text-hs-cream tracking-tight">Profile</span>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6">
        {/* Profile summary */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-full bg-hs-gold/10 flex items-center justify-center text-hs-gold">
            <User size={28} />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-bold text-hs-cream truncate">{user.user_metadata?.full_name || user.email?.split('@')[0]}</p>
            <p className="text-sm text-hs-gray truncate">{user.email}</p>
          </div>
        </div>

        <Section title="Food Profile">
          <Row
            href="/account/profile"
            icon={<User size={18} />}
            label="Edit Food Profile"
            detail="Claim @handle, bio, social links"
          />
        </Section>

        <Section title="Messages">
          <Row
            onClick={() => setToast('Notifications coming soon')}
            icon={<Bell size={18} />}
            label="Notifications"
            detail="Coming soon"
          />
        </Section>

        <Section title="Discovery">
          <Row
            href="/preferences"
            icon={<SlidersHorizontal size={18} />}
            label="Food Preferences"
            detail="Cuisine, dietary, health"
          />
          <div className="h-px bg-white/[0.06]" />
          <Row
            href="/preferences"
            icon={<MapPin size={18} />}
            label="Location & Distance"
            detail="Set your discovery radius"
          />
        </Section>

        <Section title="Selling">
          {seller ? (
            <>
              <Row
                href={`/seller/dashboard?id=${seller.id}`}
                icon={<Store size={18} />}
                label="Seller Dashboard"
                detail={`${seller.business_name} • ${seller.status.replace('_', ' ')}`}
              />
              <div className="h-px bg-white/[0.06]" />
              <Row
                href="/seller/dishes/new"
                icon={<Utensils size={18} />}
                label="Add a Dish"
                detail="Publish a new dish to discover"
              />
            </>
          ) : (
            <Row
              href="/join"
              icon={<Store size={18} />}
              label="List Your Food"
              detail="Become a seller on Hunger Swipes"
            />
          )}
        </Section>

        <Section title="Swipe Bucks">
          <Row
            href="/swipe-bucks"
            icon={<Wallet size={18} />}
            label="Swipe Bucks"
            detail="Post food. Earn meals."
          />
        </Section>

        <Section title="Your food posts">
          {postsLoading ? (
            <p className="px-4 py-4 text-sm text-hs-gray">Loading…</p>
          ) : myPosts.length === 0 ? (
            <div className="px-4 py-5">
              <p className="text-sm text-hs-gray">You haven&apos;t posted any dishes yet.</p>
              <Link href="/post" className="inline-block mt-2 text-sm text-hs-gold font-semibold">Post your first dish →</Link>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {myPosts.map((post) => {
                const st = statusLabel(post.moderation_status)
                const isRemoved = post.moderation_status === 'removed' || post.status === 'removed'
                return (
                  <div key={post.id} className="px-4 py-3.5 flex items-center gap-3">
                    <img src={post.photo_url} alt={post.dish_name} className="w-12 h-12 rounded-lg object-cover bg-black flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-hs-cream truncate">{post.dish_name}</p>
                      <div className={`flex items-center gap-1 text-xs ${st.color}`}>
                        {st.icon} {st.text}
                      </div>
                      {post.moderation_status === 'pending_review' && (
                        <p className="text-xs text-hs-gray mt-0.5">We&apos;re checking this photo before it goes into Discover.</p>
                      )}
                      {post.moderation_status === 'rejected' && (
                        <p className="text-xs text-hs-gray mt-0.5">This photo doesn&apos;t appear to clearly show food. Try another photo with the dish as the main subject.</p>
                      )}
                    </div>
                    {!isRemoved && (
                      <button
                        onClick={() => setPostToDelete(post.id)}
                        className="p-2 rounded-xl bg-hs-red/10 text-hs-red"
                        aria-label="Open delete confirmation"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </Section>

        <Section title="Saved">
          <Row
            href="/saved"
            icon={<Heart size={18} />}
            label="Saved Dishes"
            detail="See everything you want"
          />
        </Section>

        <Section title="Account">
          <Row
            onClick={() => setToast('Notifications coming soon')}
            icon={<Bell size={18} />}
            label="Notifications"
            detail="Coming soon"
          />
          <div className="h-px bg-white/[0.06]" />
          <Row
            href="/privacy"
            icon={<Shield size={18} />}
            label="Privacy"
          />
          <div className="h-px bg-white/[0.06]" />
          <Row
            href="/terms"
            icon={<CheckCircle size={18} />}
            label="Terms"
          />
          <div className="h-px bg-white/[0.06]" />
          <Row
            onClick={signOut}
            icon={<LogOut size={18} />}
            label="Sign Out"
            danger
          />
        </Section>

        {toast && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-hs-gold text-hs-black text-sm font-bold shadow-lg">
            {toast}
          </div>
        )}

        {postToDelete && (
          <DeletePostDialog
            postId={postToDelete}
            onCancel={() => setPostToDelete(null)}
            onDelete={() => postToDelete && deletePost(postToDelete)}
            deleting={deletingPost === postToDelete}
          />
        )}
      </main>
      <div style={{ display: postToDelete ? 'none' : 'block' }}>
        <MobileNav />
      </div>
    </div>
  </>
)}
