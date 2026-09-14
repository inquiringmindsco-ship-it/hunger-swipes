import { NextResponse } from 'next/server'

function retired() {
  return NextResponse.json({ error: 'This unfinished legacy feature has been retired. Use the food feed, community posts, or seller dashboard.' }, { status: 410 })
}

export const GET = retired
export const POST = retired
export const PUT = retired
export const PATCH = retired
export const DELETE = retired
