import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    { error: 'Paid promotions are not available until payment fulfillment and refund handling are complete.' },
    { status: 503 },
  )
}
