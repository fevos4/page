'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';

interface Title {
  id: string;
  name: string;
  description?: string;
  position: number;
  videos: Video[];
}

interface Video {
  id: string;
  title: string;
  description?: string;
  source_type: 'self_hosted' | 'embed';
  embed_url?: string;
  file_path?: string;
  is_free: boolean;
  position: number;
}

interface Payment {
  id: string;
  reference_number: string;
  amount_claimed: string;
  status: string;
  created_at: string;
  user: { name: string; email: string; membership_status: string };
  plan: { name: string; price: string; duration_days: number };
}

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  membership_status: string;
  membership_expiry_date?: string;
}

export default function AdminDashboardClient() {
  const [activeTab, setActiveTab] = useState<'titles' | 'payments' | 'members'>('payments');
  const [titles, setTitles] = useState<Title[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);

  // New Title Form
  const [newTitleName, setNewTitleName] = useState('');
  const [newTitleDesc, setNewTitleDesc] = useState('');

  // New Video Form
  const [selectedTitleId, setSelectedTitleId] = useState<string>('');
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDesc, setVideoDesc] = useState('');
  const [sourceType, setSourceType] = useState<'self_hosted' | 'embed'>('embed');
  const [embedUrl, setEmbedUrl] = useState('');
  const [isFree, setIsFree] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tRes, pRes, mRes] = await Promise.all([
        fetch('/api/admin/titles'),
        fetch('/api/admin/payments'),
        fetch('/api/admin/members'),
      ]);
      const tData = await tRes.json();
      const pData = await pRes.json();
      const mData = await mRes.json();

      if (tData.titles) setTitles(tData.titles);
      if (pData.payments) setPayments(pData.payments);
      if (mData.members) setMembers(mData.members);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateTitle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitleName) return;

    await fetch('/api/admin/titles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newTitleName, description: newTitleDesc }),
    });

    setNewTitleName('');
    setNewTitleDesc('');
    fetchData();
  };

  const handleCreateVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTitleId || !videoTitle) return;

    let filePath: string | null = null;

    if (sourceType === 'self_hosted') {
      if (!selectedFile) {
        alert('Please select a video file to upload');
        return;
      }

      setUploading(true);
      try {
        const urlRes = await fetch('/api/admin/videos/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: selectedFile.name,
            contentType: selectedFile.type || 'video/mp4',
          }),
        });

        const { uploadUrl, objectPath } = await urlRes.json();

        const putRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': selectedFile.type || 'video/mp4' },
          body: selectedFile,
        });

        if (!putRes.ok) {
          throw new Error('Direct-to-MinIO video upload failed');
        }

        filePath = objectPath;
      } catch (err: any) {
        alert(err.message);
        setUploading(false);
        return;
      }
    }

    await fetch('/api/admin/videos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title_id: selectedTitleId,
        title: videoTitle,
        description: videoDesc,
        source_type: sourceType,
        embed_url: sourceType === 'embed' ? embedUrl : null,
        file_path: filePath,
        is_free: sourceType === 'embed' ? true : isFree,
      }),
    });

    setUploading(false);
    setVideoTitle('');
    setVideoDesc('');
    setEmbedUrl('');
    setSelectedFile(null);
    fetchData();
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!confirm('Are you sure you want to delete this video? The file in MinIO will also be deleted.')) return;

    await fetch(`/api/admin/videos/${videoId}`, { method: 'DELETE' });
    fetchData();
  };

  const handleReviewPayment = async (paymentId: string, action: 'approve' | 'reject') => {
    const reason = action === 'reject' ? prompt('Enter rejection reason:') : null;

    await fetch('/api/admin/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payment_id: paymentId,
        action,
        rejection_reason: reason,
      }),
    });

    fetchData();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-6 space-y-6 transition-colors duration-200">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-amber-500">Admin Dashboard</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Content Management & CBE Payment Verification Queue
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <ThemeToggle />
          <Link
            href="/"
            className="text-xs bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 px-3 py-1.5 rounded transition"
          >
            ← Back to Library
          </Link>
        </div>
      </header>

      {/* Nav Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('payments')}
          className={`px-4 py-2 text-sm font-semibold rounded-none transition ${
            activeTab === 'payments'
              ? 'bg-amber-400 text-slate-950'
              : 'bg-slate-200 dark:bg-slate-900 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          Payments Queue ({payments.filter((p) => p.status === 'pending_verification').length})
        </button>
        <button
          onClick={() => setActiveTab('titles')}
          className={`px-4 py-2 text-sm font-semibold rounded-none transition ${
            activeTab === 'titles'
              ? 'bg-amber-400 text-slate-950'
              : 'bg-slate-200 dark:bg-slate-900 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          Titles & Videos
        </button>
        <button
          onClick={() => setActiveTab('members')}
          className={`px-4 py-2 text-sm font-semibold rounded-none transition ${
            activeTab === 'members'
              ? 'bg-amber-400 text-slate-950'
              : 'bg-slate-200 dark:bg-slate-900 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          Members ({members.length})
        </button>
      </div>

      {/* Tab 1: Payments Queue */}
      {activeTab === 'payments' && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-200">
            Pending Verification Queue
          </h2>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm dark:shadow-xl">
            <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 text-xs uppercase border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-4">User</th>
                  <th className="p-4">Plan</th>
                  <th className="p-4">Reference #</th>
                  <th className="p-4">Amount Claimed</th>
                  <th className="p-4">Submitted At</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td className="p-4 font-medium text-slate-900 dark:text-slate-100">
                      {p.user.name}
                      <span className="block text-xs text-slate-500">{p.user.email}</span>
                    </td>
                    <td className="p-4">{p.plan.name}</td>
                    <td className="p-4 font-mono text-amber-600 dark:text-amber-400 font-bold">
                      {p.reference_number}
                    </td>
                    <td className="p-4 font-mono">{p.amount_claimed} ETB</td>
                    <td className="p-4 text-xs text-slate-500 dark:text-slate-400">
                      {new Date(p.created_at).toLocaleString()}
                    </td>
                    <td className="p-4">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-none font-bold uppercase ${
                          p.status === 'verified'
                            ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30'
                            : p.status === 'rejected'
                            ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-500/30'
                            : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      {p.status === 'pending_verification' && (
                        <>
                          <button
                            onClick={() => handleReviewPayment(p.id, 'approve')}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs px-3 py-1.5 rounded-none transition"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReviewPayment(p.id, 'reject')}
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-500/40 text-xs font-bold px-3 py-1.5 rounded-none transition"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Titles & Videos */}
      {activeTab === 'titles' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Creation Forms */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3 shadow-sm">
              <h3 className="text-sm font-bold text-amber-500">Create New Title (Series)</h3>
              <form onSubmit={handleCreateTitle} className="space-y-3">
                <input
                  type="text"
                  placeholder="Title Name (e.g. Bride of Charlie)"
                  value={newTitleName}
                  onChange={(e) => setNewTitleName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                />
                <textarea
                  placeholder="Description..."
                  value={newTitleDesc}
                  onChange={(e) => setNewTitleDesc(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                />
                <button
                  type="submit"
                  className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold py-2 rounded-none uppercase tracking-wider transition"
                >
                  Create Title
                </button>
              </form>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3 shadow-sm">
              <h3 className="text-sm font-bold text-amber-500">Upload Video (Direct-to-MinIO)</h3>
              <form onSubmit={handleCreateVideo} className="space-y-3">
                <select
                  value={selectedTitleId}
                  onChange={(e) => setSelectedTitleId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- Select Title --</option>
                  {titles.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  placeholder="Episode Title"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                />

                <select
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="embed">Embed (Public / YouTube)</option>
                  <option value="self_hosted">Self Hosted (MinIO Storage)</option>
                </select>

                {sourceType === 'embed' ? (
                  <input
                    type="url"
                    placeholder="Embed URL (e.g. https://www.youtube.com/embed/...)"
                    value={embedUrl}
                    onChange={(e) => setEmbedUrl(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                ) : (
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">Select Video File</label>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className="w-full text-xs text-slate-600 dark:text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded-none file:border-0 file:text-xs file:bg-slate-200 dark:file:bg-slate-800 file:text-slate-800 dark:file:text-amber-400"
                    />
                  </div>
                )}

                {sourceType === 'self_hosted' && (
                  <label className="flex items-center space-x-2 text-xs text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={isFree}
                      onChange={(e) => setIsFree(e.target.checked)}
                      className="rounded bg-slate-100 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-amber-500"
                    />
                    <span>Is Free (Anyone can view)</span>
                  </label>
                )}

                <button
                  type="submit"
                  disabled={uploading}
                  className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold py-2 rounded-none uppercase tracking-wider transition disabled:opacity-50"
                >
                  {uploading ? 'Uploading to MinIO...' : 'Upload Video'}
                </button>
              </form>
            </div>
          </div>

          {/* List of Titles & Episodes */}
          <div className="lg:col-span-2 space-y-4">
            {titles.map((t) => (
              <div
                key={t.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3 shadow-sm"
              >
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{t.name}</h3>
                <div className="space-y-2">
                  {t.videos.map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 p-3 rounded border border-slate-200 dark:border-slate-800 text-xs"
                    >
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-slate-200">
                          {v.title}
                        </span>
                        <div className="flex space-x-2 mt-0.5">
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono font-bold">
                            {v.source_type}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {v.is_free ? 'FREE' : 'MEMBERS ONLY'}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteVideo(v.id)}
                        className="text-red-600 dark:text-red-400 hover:underline text-xs font-bold"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Members List */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-200">
            Registered Members List
          </h2>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm dark:shadow-xl">
            <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 text-xs uppercase border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-4">Name</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Membership Status</th>
                  <th className="p-4">Expiry Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td className="p-4 font-medium text-slate-900 dark:text-slate-100">{m.name}</td>
                    <td className="p-4 text-slate-500 dark:text-slate-400">{m.email}</td>
                    <td className="p-4">
                      <span className="text-xs bg-slate-200 dark:bg-slate-800 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded font-mono font-bold">
                        {m.role}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-none font-bold uppercase ${
                          m.membership_status === 'active'
                            ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30'
                            : m.membership_status === 'pending_verification'
                            ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {m.membership_status}
                      </span>
                    </td>
                    <td className="p-4 text-xs font-mono text-slate-500 dark:text-slate-400">
                      {m.membership_expiry_date
                        ? new Date(m.membership_expiry_date).toLocaleDateString()
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
