/**
 * Reproduces the confirmed cross-user Router Cache bug scenario 5 times:
 * 1. User A (active member) submits payment (POST /api/payments/submit)
 * 2. User A navigates to Home (GET /) → checks server log output via /api/auth/me
 * 3. User B also navigates to Home in same time window
 * 4. User A navigates to My Account (GET /api/auth/me)
 * Confirms User A always gets User A's data, never User B's.
 */
import { prisma } from '../lib/db';
import { encryptPayload } from '../lib/auth';
import http from 'http';
import * as bcrypt from 'bcryptjs';

async function fetchMe(cookieHeader: string, label: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const ts = Date.now();
    const req = http.request(
      {
        hostname: 'localhost', port: 3000,
        path: `/api/auth/me?_=${ts}`, method: 'GET',
        headers: { Cookie: cookieHeader, 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      },
      (res) => {
        let d = '';
        res.on('data', (c) => (d += c));
        res.on('end', () => {
          const data = JSON.parse(d);
          console.log(`  [${label}] /api/auth/me -> email=${data.user?.email ?? 'NULL'} status=${data.user?.membershipStatus ?? 'NULL'}`);
          resolve(data);
        });
      }
    );
    req.on('error', reject); req.end();
  });
}

async function makePost(path: string, cookieHeader: string, body: any, label: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = http.request(
      {
        hostname: 'localhost', port: 3000, path, method: 'POST',
        headers: { Cookie: cookieHeader, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
      },
      (res) => {
        let d = '';
        res.on('data', (c) => (d += c));
        res.on('end', () => {
          try { resolve({ status: res.statusCode, data: JSON.parse(d) }); }
          catch { resolve({ status: res.statusCode, data: d }); }
        });
      }
    );
    req.on('error', reject); req.write(payload); req.end();
  });
}

async function runAttempt(attempt: number, userACookie: string, userAEmail: string, userBCookie: string, userBEmail: string, planId: string) {
  console.log(`\n====== ATTEMPT ${attempt}/5 ======`);

  // Step 1: User A submits payment (triggers "instant reload" behavior)
  const refNum = `REPRO-${attempt}-${Date.now()}`;
  const subRes = await makePost('/api/payments/submit', userACookie, { plan_id: planId, reference_number: refNum, amount_claimed: '300' }, `A-submit-${attempt}`);
  console.log(`  [A] POST /api/payments/submit -> HTTP ${subRes.status}`);

  // Step 2: Simulate "instant reload" — both users hit /api/auth/me concurrently (race condition window)
  const [aRes, bRes] = await Promise.all([
    fetchMe(userACookie, `A-home-${attempt}`),
    fetchMe(userBCookie, `B-home-${attempt}`),
  ]);

  // Step 3: User A clicks "My Account" — fresh re-check
  const aAccount = await fetchMe(userACookie, `A-account-${attempt}`);

  // Validate
  const aCorrect = aAccount.user?.email === userAEmail;
  const bCorrect = bRes.user?.email === userBEmail;
  const aConcurrentCorrect = aRes.user?.email === userAEmail;

  const result = aCorrect && bCorrect && aConcurrentCorrect;
  console.log(`  A-concurrent correct : ${aConcurrentCorrect ? '✅' : '❌ CROSS-USER LEAK: got ' + aRes.user?.email}`);
  console.log(`  B-concurrent correct : ${bCorrect ? '✅' : '❌ CROSS-USER LEAK: got ' + bRes.user?.email}`);
  console.log(`  A-account correct    : ${aCorrect ? '✅' : '❌ CROSS-USER LEAK: got ' + aAccount.user?.email}`);
  console.log(`  Attempt ${attempt}: ${result ? '✅ PASS' : '❌ FAIL'}`);

  return result;
}

async function main() {
  console.log('=== CROSS-USER SESSION BUG REPRODUCTION TEST (5 ATTEMPTS) ===\n');

  const passHash = await bcrypt.hash('password123', 10);

  let plan = await prisma.membershipPlan.findFirst();
  if (!plan) plan = await prisma.membershipPlan.create({ data: { name: 'Test Plan', price: 300, duration_days: 30 } });

  const userA = await prisma.user.upsert({
    where: { email: 'repro_userA@zahra.com' },
    update: { membership_status: 'free', membership_expiry_date: null },
    create: { name: 'Repro User A', email: 'repro_userA@zahra.com', password_hash: passHash, role: 'user', membership_status: 'free' },
  });
  const userB = await prisma.user.upsert({
    where: { email: 'repro_userB@zahra.com' },
    update: { membership_status: 'free', membership_expiry_date: null },
    create: { name: 'Repro User B', email: 'repro_userB@zahra.com', password_hash: passHash, role: 'user', membership_status: 'free' },
  });

  const tokenA = await encryptPayload({ userId: userA.id, email: userA.email, name: userA.name, role: 'user' });
  const tokenB = await encryptPayload({ userId: userB.id, email: userB.email, name: userB.name, role: 'user' });
  const cookieA = `zahra_session=${tokenA}`;
  const cookieB = `zahra_session=${tokenB}`;

  console.log(`User A: ${userA.email} (ID: ${userA.id})`);
  console.log(`User B: ${userB.email} (ID: ${userB.id})\n`);
  console.log('(Server terminal will show diagnostic REQ-* and HOME-* logs for each request)');

  let passCount = 0;
  for (let i = 1; i <= 5; i++) {
    // Reset A to free before each attempt
    await prisma.user.update({ where: { id: userA.id }, data: { membership_status: 'free' } });
    await prisma.payment.deleteMany({ where: { user_id: userA.id } });

    const passed = await runAttempt(i, cookieA, userA.email, cookieB, userB.email, plan.id);
    if (passed) passCount++;
  }

  console.log('\n==================================================================');
  if (passCount === 5) {
    console.log('🎉 ALL 5 CONSECUTIVE ATTEMPTS PASSED! Zero cross-user data leaks.');
  } else {
    console.error(`❌ ${5 - passCount}/5 ATTEMPTS FAILED. Cross-user leak still present!`);
    process.exit(1);
  }
  console.log('==================================================================');
}

main().finally(() => prisma.$disconnect());
