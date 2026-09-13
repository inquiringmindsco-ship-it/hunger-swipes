import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(
    { message: 'Vendors API deprecated. Use /api/sellers and /api/dishes instead.' },
    { status: 410 }
  )
}

export async function POST() {
  return NextResponse.json(
    { message: 'Vendors API deprecated. Use /api/sellers and /api/dishes instead.' },
    { status: 410 }
  )
}
