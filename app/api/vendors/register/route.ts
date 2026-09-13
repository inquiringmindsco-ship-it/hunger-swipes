import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(
    { message: 'Vendor register API deprecated. Use POST /api/sellers instead.' },
    { status: 410 }
  )
}

export async function POST() {
  return NextResponse.json(
    { message: 'Vendor register API deprecated. Use POST /api/sellers instead.' },
    { status: 410 }
  )
}

export async function PUT() {
  return NextResponse.json(
    { message: 'Vendor register API deprecated. Use PUT /api/sellers?id=... instead.' },
    { status: 410 }
  )
}
