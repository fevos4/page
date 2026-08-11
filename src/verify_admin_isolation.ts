import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('=====================================================');
  console.log('RUNNING ADMIN & PUBLIC SESSION ISOLATION TEST SUITE');
  console.log('=====================================================\n');

  // Seed / Ensure an admin account exists
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

  console.log('1. Logging into /admin via /api/auth/admin-login...');
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/admin-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@zahra.com',
      password: 'AdminPass123!',
    }),
  });

  console.log(`   Status: ${adminLoginRes.status}`);
  const adminSetCookie = adminLoginRes.headers.get('set-cookie') || '';
  console.log(`   Set-Cookie: ${adminSetCookie.includes('zahra_admin_session') ? 'zahra_admin_session IS PRESENT' : 'NO ADMIN COOKIE'}`);
  console.log(`   Contains public cookie?: ${adminSetCookie.includes('zahra_session=') && !adminSetCookie.includes('zahra_admin_session=')}`);

  // Test 1: Log into /admin -> confirm dashboard access
  console.log('\n--- TEST 1: Admin session accesses /api/admin/me ---');
  const adminMeRes = await fetch(`${BASE_URL}/api/admin/me`, {
    headers: { Cookie: adminSetCookie },
  });
  const adminMeData = await adminMeRes.json();
  console.log(`   /api/admin/me -> user email: ${adminMeData.user?.email}, role: ${adminMeData.user?.role}`);
  const test1Passed = adminMeRes.status === 200 && (adminMeData.user?.role === 'admin' || adminMeData.user?.role === 'super_admin');
  console.log(`   TEST 1 RESULT: ${test1Passed ? 'PASSED' : 'FAILED'}`);

  // Test 2: Navigate to public endpoint /api/auth/me while logged into /admin
  console.log('\n--- TEST 2: Check public site /api/auth/me using ONLY admin cookie ---');
  const publicMeRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Cookie: adminSetCookie },
  });
  const publicMeData = await publicMeRes.json();
  console.log(`   /api/auth/me -> user: ${JSON.stringify(publicMeData.user)}`);
  const test2Passed = publicMeRes.status === 200 && publicMeData.user === null;
  console.log(`   TEST 2 RESULT: ${test2Passed ? 'PASSED (Nav shows LOGGED-OUT state on public site)' : 'FAILED'}`);

  // Test 3: Log in separately on public site (/api/auth/login) in SAME cookie string
  console.log('\n--- TEST 3: Log in as regular user while holding admin cookie ---');
  // First ensure test regular user exists
  await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test Regular User',
      email: 'user@zahra.com',
      phone: '+251912345678',
      password: 'UserPass123!',
    }),
  });

  const userLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'user@zahra.com',
      password: 'AdminPass123!',
    }),
  });

  const userSetCookie = userLoginRes.headers.get('set-cookie') || '';
  console.log(`   User Login Status: ${userLoginRes.status}`);
  console.log(`   User Set-Cookie contains zahra_session?: ${userSetCookie.includes('zahra_session=')}`);

  // Combine both cookies into one simulated browser Cookie header
  // Extract zahra_admin_session token and zahra_session token
  const adminCookiePart = adminSetCookie.split(';')[0];
  const userCookiePart = userSetCookie.split(';')[0];
  const combinedCookieHeader = `${adminCookiePart}; ${userCookiePart}`;

  console.log(`   Combined Cookie Header: ${combinedCookieHeader}`);

  const combinedPublicMe = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Cookie: combinedCookieHeader },
  });
  const combinedPublicData = await combinedPublicMe.json();

  const combinedAdminMe = await fetch(`${BASE_URL}/api/admin/me`, {
    headers: { Cookie: combinedCookieHeader },
  });
  const combinedAdminData = await combinedAdminMe.json();

  console.log(`   Public /api/auth/me sees user: ${combinedPublicData.user?.email} (Role: ${combinedPublicData.user?.role})`);
  console.log(`   Admin /api/admin/me sees user: ${combinedAdminData.user?.email} (Role: ${combinedAdminData.user?.role})`);

  const test3Passed = combinedPublicData.user?.email === 'user@zahra.com' && combinedAdminData.user?.email === 'admin@zahra.com';
  console.log(`   TEST 3 RESULT: ${test3Passed ? 'PASSED (Both sessions work independently in same browser context)' : 'FAILED'}`);

  // Test 4: Log out of /admin specifically -> confirm public session unaffected
  console.log('\n--- TEST 4: Log out of /admin specifically ---');
  const logoutAdminRes = await fetch(`${BASE_URL}/api/auth/admin-logout`, {
    method: 'POST',
    headers: { Cookie: combinedCookieHeader },
  });
  const logoutAdminSetCookie = logoutAdminRes.headers.get('set-cookie') || '';
  console.log(`   Admin Logout status: ${logoutAdminRes.status}`);
  console.log(`   Set-Cookie clears zahra_admin_session: ${logoutAdminSetCookie.includes('zahra_admin_session=;') || logoutAdminSetCookie.includes('zahra_admin_session=;') || logoutAdminSetCookie.includes('Max-Age=0')}`);

  // After admin logout, test admin API (should fail) and public me (should still succeed with user session)
  const afterLogoutAdminMe = await fetch(`${BASE_URL}/api/admin/me`, {
    headers: { Cookie: userCookiePart }, // only user cookie left
  });
  const afterLogoutAdminData = await afterLogoutAdminMe.json();

  const afterLogoutPublicMe = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Cookie: userCookiePart },
  });
  const afterLogoutPublicData = await afterLogoutPublicMe.json();

  console.log(`   Admin me after admin logout -> user: ${afterLogoutAdminData.user}`);
  console.log(`   Public me after admin logout -> user: ${afterLogoutPublicData.user?.email}`);

  const test4Passed = (afterLogoutAdminData.user === null || afterLogoutAdminData.user === undefined) && afterLogoutPublicData.user?.email === 'user@zahra.com';
  console.log(`   TEST 4 RESULT: ${test4Passed ? 'PASSED' : 'FAILED'}`);

  // Test 5: Unauthenticated request to /admin redirects to /admin-login
  console.log('\n--- TEST 5: Direct GET /admin when logged out ---');
  const getAdminPageRes = await fetch(`${BASE_URL}/admin`, { redirect: 'manual' });
  console.log(`   GET /admin Status Code: ${getAdminPageRes.status} (Expected: 307 redirect to /admin-login)`);
  const test5Passed = getAdminPageRes.status === 307 || getAdminPageRes.status === 302;
  console.log(`   TEST 5 RESULT: ${test5Passed ? 'PASSED' : 'FAILED'}`);

  console.log('\n=====================================================');
  if (test1Passed && test2Passed && test3Passed && test4Passed && test5Passed) {
    console.log('ALL 5 TEST CASES PASSED SUCCESSFULLY!');
  } else {
    console.error('SOME TEST CASES FAILED');
  }
  console.log('=====================================================\n');
}

runTests().catch(console.error).finally(() => prisma.$disconnect());
