import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3000';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function runSlidingSessionTests() {
  console.log('=====================================================');
  console.log('RUNNING ADMIN 15-MINUTE SLIDING SESSION TEST SUITE');
  console.log('=====================================================\n');

  // Seed / Ensure admin user exists
  const hashedPassword = await bcrypt.hash('AdminPass123!', 10);
  await prisma.user.upsert({
    where: { email: 'admin@zahra.com' },
    update: { password_hash: hashedPassword, role: 'super_admin' },
    create: {
      name: 'Zahra Admin',
      email: 'admin@zahra.com',
      phone: '+251911000000',
      password_hash: hashedPassword,
      role: 'super_admin',
      membership_status: 'active',
      membership_expiry_date: new Date('2030-01-01T00:00:00Z'),
    },
  });

  // Seed / Ensure normal user exists
  await prisma.user.upsert({
    where: { email: 'user@zahra.com' },
    update: { password_hash: hashedPassword, role: 'user' },
    create: {
      name: 'Test Regular User',
      email: 'user@zahra.com',
      phone: '+251912345678',
      password_hash: hashedPassword,
      role: 'user',
      membership_status: 'free',
    },
  });

  // Step 1: Admin Login
  console.log('1. Logging in to /admin via /api/auth/admin-login...');
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/admin-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@zahra.com',
      password: 'AdminPass123!',
    }),
  });

  const adminCookieHeader = adminLoginRes.headers.get('set-cookie') || '';
  console.log(`   Status: ${adminLoginRes.status}`);
  console.log(`   Initial Set-Cookie: ${adminCookieHeader.includes('zahra_admin_session=') ? 'zahra_admin_session ISSUED (15m)' : 'FAILED'}`);

  // Test 1: Active use re-issues refreshed cookie (sliding window verification)
  console.log('\n--- TEST 1: Re-issuing refreshed session on active admin requests ---');
  await sleep(1000); // 1 sec delay
  const adminActionRes = await fetch(`${BASE_URL}/api/admin/me`, {
    headers: { Cookie: adminCookieHeader.split(';')[0] },
  });
  const actionSetCookie = adminActionRes.headers.get('set-cookie') || '';
  console.log(`   Admin Action Status: ${adminActionRes.status}`);
  console.log(`   Refreshed Set-Cookie Issued: ${actionSetCookie.includes('zahra_admin_session=')}`);

  const test1Passed = adminActionRes.status === 200 && actionSetCookie.includes('zahra_admin_session=');
  console.log(`   TEST 1 RESULT: ${test1Passed ? 'PASSED (Sliding window resets 15-min idle timer on each action)' : 'FAILED'}`);

  // Test 2: Verify JWT token payload exp claim is 15 minutes (~900s) from issuance
  console.log('\n--- TEST 2: Inspect JWT exp claim for admin session ---');
  const token = (actionSetCookie || adminCookieHeader).split(';')[0].replace('zahra_admin_session=', '');
  const payloadBase64 = token.split('.')[1];
  const payloadJson = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf-8'));
  const ttlSeconds = payloadJson.exp - payloadJson.iat;
  console.log(`   Token Issued At (iat): ${payloadJson.iat}`);
  console.log(`   Token Expires At (exp): ${payloadJson.exp}`);
  console.log(`   TTL: ${ttlSeconds} seconds (${ttlSeconds / 60} minutes)`);

  const test2Passed = ttlSeconds === 900;
  console.log(`   TEST 2 RESULT: ${test2Passed ? 'PASSED (Admin session TTL is exactly 15 minutes)' : 'FAILED'}`);

  // Test 3: Public user session (zahra_session) remains 7 days
  console.log('\n--- TEST 3: Confirm regular public user session retains ~7-day expiry ---');
  const userLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'user@zahra.com',
      password: 'AdminPass123!',
    }),
  });

  const userCookieHeader = userLoginRes.headers.get('set-cookie') || '';
  const userToken = userCookieHeader.split(';')[0].replace('zahra_session=', '');
  const userPayloadBase64 = userToken.split('.')[1];
  const userPayloadJson = JSON.parse(Buffer.from(userPayloadBase64, 'base64').toString('utf-8'));
  const userTtlSeconds = userPayloadJson.exp - userPayloadJson.iat;
  console.log(`   User Token TTL: ${userTtlSeconds} seconds (${userTtlSeconds / 86400} days)`);

  const test3Passed = userTtlSeconds === 7 * 24 * 60 * 60;
  console.log(`   TEST 3 RESULT: ${test3Passed ? 'PASSED (Public user session remains ~7 days)' : 'FAILED'}`);

  console.log('\n=====================================================');
  if (test1Passed && test2Passed && test3Passed) {
    console.log('ALL SLIDING ADMIN SESSION TESTS PASSED SUCCESSFULLY!');
  } else {
    console.error('SOME TESTS FAILED');
  }
  console.log('=====================================================\n');
}

runSlidingSessionTests().catch(console.error).finally(() => prisma.$disconnect());
