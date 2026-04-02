import { NextRequest, NextResponse } from 'next/server'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'

// POST /api/auth/signup - Create a new account
export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName, username, role } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    // Mock mode (when Supabase is not configured)
    if (!isSupabaseConfigured()) {
      const mockUser = {
        id: 'mock-user-' + Date.now(),
        email,
        full_name: fullName,
        username: username || 'user_' + Math.random().toString(36).substr(2, 8),
        role: role || 'eater',
        commission_rate: role === 'creator' ? 0.10 : null,
        mock: true
      }
      return NextResponse.json({
        user: mockUser,
        mock: true,
        message: 'Account created (mock mode — configure Supabase to enable real auth)'
      })
    }

    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    // Check if username is taken
    if (username) {
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        .single()

      if (existingUser) {
        return NextResponse.json(
          { error: 'Username already taken' },
          { status: 409 }
        )
      }
    }

    // Create the user via Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          username,
          role: role || 'eater'
        }
      }
    })

    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      )
    }

    // Get the created profile (trigger creates it automatically)
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    return NextResponse.json({
      user: profile,
      session: authData.session
    })

  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
