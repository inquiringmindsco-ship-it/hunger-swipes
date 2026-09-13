import { NextResponse } from 'next/server'

const deprecated = () => NextResponse.json(
  {
    error: 'The legacy photos API is retired. Production food is served only from /api/dishes.',
  },
  { status: 410 },
)

export const GET = deprecated
export const POST = deprecated
