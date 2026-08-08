'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';

interface Plan {
  id: string;
  name: string;
  price: string | number;
  duration_days: number;
}

export default function MembershipPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [amountClaimed, setAmountClaimed] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [userStatus, setUserStatus] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/membership-plans')
      .then((res) => res.json())
      .then((data) => {
        if (data.plans) {
          setPlans(data.plans);
          if (data.plans.length > 0) {
            setSelectedPlanId(data.plans[0].id);
            setAmountClaimed(data.plans[0].price.toString());
          }
        }
      });

    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUserStatus(data.user.membershipStatus);
        } else {
          window.location.href = '/login?callbackUrl=/membership';
        }
      })
      .catch(() => {
        window.location.href = '/login?callbackUrl=/membership';
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      const res = await fetch('/api/payments/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: selectedPlanId,
          reference_number: referenceNumber,
          amount_claimed: amountClaimed,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit payment');
      }

      setMessage({
        type: 'success',
        text: 'Payment reference submitted successfully! An admin will manually verify it shortly.',
      });
      setReferenceNumber('');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 md:p-8 transition-colors duration-200">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h1 className="text-3xl font-bold text-amber-500">Zahra Membership</h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Unlock all members-only documentary series & videos
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <ThemeToggle />
            <Link
              href="/"
              className="text-xs bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-300 px-3 py-1.5 rounded transition"
            >
              ← Back to Library
            </Link>
          </div>
        </div>

        {/* Bank Transfer Details Section */}
        <div className="bg-white dark:bg-slate-900 border border-amber-500/30 rounded-xl p-6 shadow-md dark:shadow-xl space-y-4 transition-colors duration-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 font-bold text-lg border border-amber-500/30">
              CBE
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Commercial Bank of Ethiopia (CBE) Transfer
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pay via bank transfer or CBE Birr app using the details below
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800 text-sm">
            <div>
              <span className="text-xs text-slate-500 block">Bank Name</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Commercial Bank of Ethiopia
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Account Name</span>
              <span className="font-semibold text-amber-500 dark:text-amber-400">
                Zahra Video Platform
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Account Number</span>
              <span className="font-mono font-bold text-slate-900 dark:text-slate-100 tracking-wider">
                1000 1234 5678 9
              </span>
            </div>
          </div>
        </div>

        {/* Payment Submission Form */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-6 shadow-md dark:shadow-xl transition-colors duration-200">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Submit Bank Transfer Verification
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enter your CBE transaction reference number after completing the transfer.
            </p>
          </div>

          {message && (
            <div
              className={`p-4 rounded text-sm ${
                message.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/50 text-emerald-600 dark:text-emerald-400'
                  : 'bg-red-500/10 border border-red-500/50 text-red-600 dark:text-red-400'
              }`}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">
                Select Membership Plan
              </label>
              <select
                value={selectedPlanId}
                onChange={(e) => {
                  setSelectedPlanId(e.target.value);
                  const p = plans.find((x) => x.id === e.target.value);
                  if (p) setAmountClaimed(p.price.toString());
                }}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
              >
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} — {plan.price} ETB ({plan.duration_days} Days)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">
                CBE Transaction Reference Number
              </label>
              <input
                type="text"
                required
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
                placeholder="FT24..."
              />
            </div>

            <div>
              <label className="block text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">
                Amount Claimed (ETB)
              </label>
              <input
                type="number"
                required
                value={amountClaimed}
                onChange={(e) => setAmountClaimed(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-400 hover:bg-amber-300 font-bold text-slate-950 py-3 rounded-none text-xs uppercase tracking-wider transition disabled:opacity-50 mt-2"
            >
              {loading ? 'Submitting Reference...' : 'Submit Payment Reference'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
