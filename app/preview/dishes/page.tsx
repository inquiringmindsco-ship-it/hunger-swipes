import { notFound } from 'next/navigation'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// IMG-DS dish lab: demonstrates the 250-dish Discover composition using
// place_image_candidates research data WITHOUT publishing any of it.
// Gated: renders only on Vercel PREVIEW deployments (or an explicit lab flag).
// Third-party images are never displayed here — placeholders only, because every
// candidate is rights_status='permission_required' until rights are documented.

function placeholderArt(label: string, hue: number) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="hsl(${hue},40%,16%)"/><stop offset="100%" stop-color="hsl(${(hue + 40) % 360},50%,8%)"/></linearGradient></defs><rect width="400" height="300" fill="url(#g)"/><text x="200" y="140" text-anchor="middle" font-family="system-ui" font-size="64">🍽️</text><text x="200" y="185" text-anchor="middle" font-family="system-ui" font-size="15" fill="#d4af37" letter-spacing="2">PREVIEW</text><text x="200" y="210" text-anchor="middle" font-family="system-ui" font-size="12" fill="#9ca3af">${label}</text></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export default async function DishLabPage() {
  const labEnabled = process.env.VERCEL_ENV === 'preview' || process.env.ENABLE_DISH_LAB === '1'
  if (!labEnabled) notFound()
  const db = getSupabaseAdmin()
  if (!db) notFound()

  const [{ data: rows }, { count: communityCount }, { count: officialCount }] = await Promise.all([
    db.from('place_image_candidates')
      .select('id,dish_name,rights_status,usage_status,source_type,place:places!inner(id,name,city,state,status,cuisine,external_source)')
      .order('created_at', { ascending: false })
      .limit(300),
    db.from('community_food_posts').select('id', { count: 'exact', head: true }).eq('status', 'active').eq('moderation_status', 'approved').eq('places.status', 'active'),
    db.from('dishes').select('id', { count: 'exact', head: true }).eq('status', 'active'),
  ])

  const candidates = (rows || []).filter((r: any) => r.place?.status === 'active')
  const demoTotal = candidates.length + (communityCount || 0) + (officialCount || 0)
  const remaining = Math.max(0, 250 - demoTotal)
  const cities = new Set(candidates.map((r: any) => r.place?.city).filter(Boolean))

  return (
    <main style={{ background: '#0b0b0b', minHeight: '100vh', padding: '24px 16px 48px', color: '#eaeaea' }}>
      <h1 style={{ fontSize: 22, fontWeight: 800 }}>Dish Lab — 250-Dish Discover Preview</h1>
      <p style={{ color: '#9ca3af', fontSize: 13, maxWidth: 720, lineHeight: 1.5 }}>
        Internal preview only. Every card below is a researched candidate from an official restaurant source.
        Images are deliberately placeholders: each candidate remains <strong>rights_status = permission_required</strong>
        {' '}in the database and nothing here is published to Discover.
      </p>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', margin: '18px 0' }}>
        {[
          ['Candidate dish cards', candidates.length],
          ['Approved community posts', communityCount || 0],
          ['Official dishes', officialCount || 0],
          ['Demo deck total', demoTotal],
          ['Remaining to 250', remaining],
          ['Cities covered', cities.size],
        ].map(([label, value]) => (
          <div key={label as string} style={{ background: '#161616', border: '1px solid #2a2a2a', borderRadius: 12, padding: '10px 16px' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#d4af37' }}>{value as number}</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>{label as string}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
        {candidates.map((r: any, i: number) => (
          <div key={r.id} style={{ background: '#141414', border: '1px solid #242424', borderRadius: 14, overflow: 'hidden' }}>
            {/* Placeholder by design: no third-party image is rendered until rights are documented. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={placeholderArt('image rights pending', (i * 47) % 360)} alt="" width="400" height="300" style={{ width: '100%', display: 'block', aspectRatio: '4/3', objectFit: 'cover' }} />
            <div style={{ padding: '10px 12px 12px' }}>
              <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.dish_name}</div>
              <div style={{ fontSize: 12, color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.place?.name}{r.place?.city ? ` · ${r.place.city}` : ''}</div>
              <div style={{ fontSize: 10, color: '#6b7280', margin: '6px 0 0' }}>source: {r.source_type} · rights: {r.rights_status}</div>
            </div>
          </div>
        ))}
      </div>
      <p style={{ color: '#6b7280', fontSize: 12, marginTop: 18 }}>
        Live Discover deck (production rules): {(communityCount || 0) + (officialCount || 0)} cards — community posts + official
        dishes; rights-gated place starters return automatically when rights_status becomes approved. Candidates here join the
        production deck only after documented authorization, through the existing moderation pipeline.
      </p>
    </main>
  )
}