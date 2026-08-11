import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'zahra_session';
const ADMIN_COOKIE_NAME = 'zahra_admin_session';
const SECRET_KEY = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'super-secret-zahra-platform-key-change-in-production-32bytes'
);

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: 'user' | 'admin' | 'super_admin';
  expiresAt: number;
}

export async function encryptPayload(payload: Omit<SessionPayload, 'expiresAt'>): Promise<string> {
  const expiresAt = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60; // 7 days
  return new SignJWT({ ...payload, expiresAt })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET_KEY);
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY, {
      algorithms: ['HS256'],
    });
    return payload as unknown as SessionPayload;
  } catch (error) {
    return null;
  }
}

export async function createSession(payload: Omit<SessionPayload, 'expiresAt'>): Promise<string> {
  const token = await encryptPayload(payload);
  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
  return token;
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function destroySession(): Promise<void> {
  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });
}

export async function verifySessionFromReq(req: NextRequest): Promise<SessionPayload | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

const ADMIN_SESSION_DURATION = 15 * 60; // 15 minutes in seconds

export async function encryptAdminPayload(payload: Omit<SessionPayload, 'expiresAt'>): Promise<string> {
  const expiresAt = Math.floor(Date.now() / 1000) + ADMIN_SESSION_DURATION;
  return new SignJWT({ ...payload, expiresAt })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(SECRET_KEY);
}

export async function createAdminSession(payload: Omit<SessionPayload, 'expiresAt'>): Promise<string> {
  const token = await encryptAdminPayload(payload);
  const cookieStore = cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ADMIN_SESSION_DURATION, // 15 minutes
  });
  return token;
}

export async function getAdminSession(): Promise<SessionPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;

  // Sliding session window: Refresh cookie with new 15-minute expiration on every valid access
  try {
    const newToken = await encryptAdminPayload({
      userId: payload.userId,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    });
    cookieStore.set(ADMIN_COOKIE_NAME, newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: ADMIN_SESSION_DURATION,
    });
  } catch (err) {
    // If setting cookie fails (e.g. read-only context), payload is still valid
  }

  return payload;
}

export async function destroyAdminSession(): Promise<void> {
  const cookieStore = cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });
}

export async function verifyAdminSessionFromReq(req: NextRequest): Promise<{ session: SessionPayload | null; newToken?: string }> {
  const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return { session: null };
  const payload = await verifyToken(token);
  if (!payload) return { session: null };

  const newToken = await encryptAdminPayload({
    userId: payload.userId,
    email: payload.email,
    name: payload.name,
    role: payload.role,
  });

  return { session: payload, newToken };
}
