import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { saveGoogleCalendarTokensAction } from '@/app/actions/google-calendar'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/google-calendar/callback`
  : 'http://localhost:3000/api/google-calendar/callback'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state') // company_id
  const error = searchParams.get('error')
  
  if (error) {
    return NextResponse.redirect(
      new URL(`/dashboard/companies/${state}/tasks/calendar?error=${encodeURIComponent(error)}`, request.url)
    )
  }
  
  if (!code || !state) {
    return NextResponse.redirect(
      new URL(`/dashboard/companies/${state}/tasks/calendar?error=missing_params`, request.url)
    )
  }
  
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return NextResponse.redirect(
      new URL(`/dashboard/companies/${state}/tasks/calendar?error=not_configured`, request.url)
    )
  }
  
  try {
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    })
    
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json()
      return NextResponse.redirect(
        new URL(`/dashboard/companies/${state}/tasks/calendar?error=${encodeURIComponent(errorData.error || 'token_exchange_failed')}`, request.url)
      )
    }
    
    const tokens = await tokenResponse.json()
    
    // Save tokens
    const result = await saveGoogleCalendarTokensAction(
      state,
      tokens.access_token,
      tokens.refresh_token,
      tokens.expires_in,
      undefined // calendar_id - use primary calendar
    )
    
    if (result.error) {
      return NextResponse.redirect(
        new URL(`/dashboard/companies/${state}/tasks/calendar?error=${encodeURIComponent(result.error)}`, request.url)
      )
    }
    
    return NextResponse.redirect(
      new URL(`/dashboard/companies/${state}/tasks/calendar?success=connected`, request.url)
    )
  } catch (err) {
    return NextResponse.redirect(
      new URL(`/dashboard/companies/${state}/tasks/calendar?error=${encodeURIComponent(err instanceof Error ? err.message : 'unknown_error')}`, request.url)
    )
  }
}
