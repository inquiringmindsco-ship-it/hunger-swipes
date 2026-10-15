import { NextResponse } from 'next/server'

/**
 * Apple App Site Association file for universal links.
 * Required for iOS deep links from hungerswipes.com into the native app.
 *
 * Codex must ensure the entitlements file and Apple Developer portal match
 * the team/bundle identifier used here.
 */
export async function GET() {
  const association = {
    applinks: {
      details: [
        {
          appIDs: ['TEAM_ID.com.inquiringminds.hungerswipes'],
          components: [
            { '/': '/*' },
          ],
        },
      ],
    },
  }

  return NextResponse.json(association, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
