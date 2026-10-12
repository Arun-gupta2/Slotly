import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { db } from '@/lib/db';
import { calendarConnections } from '@/lib/db/schema';
import { encrypt } from '@/lib/encryption';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.redirect(new URL('/login', process.env.NEXTAUTH_URL));
  }

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(new URL('/dashboard/settings?calendar_error=true', process.env.NEXTAUTH_URL));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/calendar/callback`;

  if (!clientId || !clientSecret) {
    return new NextResponse('Google OAuth is not configured', { status: 500 });
  }

  try {
    // 1. Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token || !tokenData.refresh_token) {
      console.error('Failed to exchange token:', tokenData);
      return NextResponse.redirect(new URL('/dashboard/settings?calendar_error=true', process.env.NEXTAUTH_URL));
    }

    // 2. Fetch user info to get Google Account ID and Email
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    
    const userData = await userRes.json();
    if (!userRes.ok) {
      throw new Error('Failed to fetch google user info');
    }

    // 3. Encrypt and save
    const userId = (session.user as any).id;
    const encryptedRefreshToken = encrypt(tokenData.refresh_token);

    // Upsert the connection
    const existing = await db.query.calendarConnections.findFirst({
      where: eq(calendarConnections.userId, userId),
    });

    if (existing) {
      await db.update(calendarConnections).set({
        googleAccountId: userData.id,
        googleAccountEmail: userData.email,
        encryptedRefreshToken,
        updatedAt: new Date(),
      }).where(eq(calendarConnections.id, existing.id));
    } else {
      await db.insert(calendarConnections).values({
        userId,
        googleAccountId: userData.id,
        googleAccountEmail: userData.email,
        encryptedRefreshToken,
      });
    }

    return NextResponse.redirect(new URL('/dashboard/settings?calendar_success=true', process.env.NEXTAUTH_URL));
    
  } catch (err) {
    console.error('OAuth Callback Error:', err);
    return NextResponse.redirect(new URL('/dashboard/settings?calendar_error=true', process.env.NEXTAUTH_URL));
  }
}
