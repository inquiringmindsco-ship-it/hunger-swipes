import { NextRequest, NextResponse } from 'next/server';
import { verifySsoToken } from '@/lib/sso';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  const payload = verifySsoToken(token);
  if (!payload) {
    return NextResponse.redirect(new URL('/admin?error=sso_invalid', request.url));
  }

  const response = NextResponse.redirect(new URL('/admin', request.url));
  response.cookies.set('hs_sso_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24,
    path: '/',
  });

  return response;
}
