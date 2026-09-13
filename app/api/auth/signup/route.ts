import { NextResponse } from 'next/server'

// POST /api/auth/signup - Create a new account
export async function POST() {
  return NextResponse.json(
    { error: 'This endpoint is retired. Use Supabase Auth from the sign-in page.' },
    { status: 410 }
  )
}
