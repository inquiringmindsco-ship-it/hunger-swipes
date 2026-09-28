const BASE = 'http://localhost:3456'
const ADMIN_SECRET = process.env.ADMIN_SECRET

async function get(url) {
  const res = await fetch(`${BASE}${url}`)
  return { status: res.status, json: await res.json().catch(() => null) }
}

async function main() {
  console.log('\n=== Discover feed community posts ===')
  const dishes = await get('/api/dishes?mode=for-you&limit=50')
  const community = dishes.json?.dishes?.filter((d) => d.content_kind === 'community') || []
  console.log(`Community dishes in feed: ${community.length}`)
  console.log('All approved?', community.every((d) => d.moderation_status === 'approved'))

  console.log('\n=== Community posts endpoint (public) ===')
  const posts = await get('/api/community-posts?limit=50')
  const publicPosts = posts.json?.posts || []
  console.log(`Public community posts: ${publicPosts.length}`)
  console.log('All approved?', publicPosts.every((p) => p.moderation_status === 'approved'))

  if (ADMIN_SECRET) {
    console.log('\n=== Admin Food Review queue ===')
    const review = await fetch(`${BASE}/api/admin/food-review?status=pending_review`, {
      headers: { 'x-admin-secret': ADMIN_SECRET },
    })
    const reviewJson = await review.json()
    console.log(`Pending review count: ${reviewJson.posts?.length}`)
    console.log(`Counts:`, reviewJson.counts)
  }
}

main().catch(console.error)
