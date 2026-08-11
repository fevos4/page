'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';

interface Title {
  id: string;
  name: string;
  description?: string;
  cover_image_path?: string;
  position: number;
  videos: Video[];
}

interface Video {
  id: string;
  title: string;
  description?: string;
  source_type: 'self_hosted' | 'embed';
  format: 'landscape' | 'portrait';
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

const ITEMS_PER_PAGE = 8;

export default function AdminDashboardClient() {
  const [activeTab, setActiveTab] = useState<'titles' | 'payments' | 'members'>('payments');
  const [titles, setTitles] = useState<Title[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);

  // Pagination states
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [membersPage, setMembersPage] = useState(1);

  // New Title Form
  const [newTitleName, setNewTitleName] = useState('');
  const [newTitleDesc, setNewTitleDesc] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadCoverProgress, setUploadCoverProgress] = useState(0);

  // New Video Form
  const [selectedTitleId, setSelectedTitleId] = useState<string>('');
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDesc, setVideoDesc] = useState('');
  const [sourceType, setSourceType] = useState<'self_hosted' | 'embed'>('embed');
  const [videoFormat, setVideoFormat] = useState<'landscape' | 'portrait'>('landscape');
  const [embedUrl, setEmbedUrl] = useState('');
  const [isFree, setIsFree] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [uploadThumbnailProgress, setUploadThumbnailProgress] = useState(0);

  // Edit Title Modal State
  const [editingTitle, setEditingTitle] = useState<Title | null>(null);
  const [editTitleName, setEditTitleName] = useState('');
  const [editTitleDesc, setEditTitleDesc] = useState('');
  const [editTitleCoverFile, setEditTitleCoverFile] = useState<File | null>(null);
  const [savingTitleEdit, setSavingTitleEdit] = useState(false);
  const [editTitleCoverProgress, setEditTitleCoverProgress] = useState(0);

  // Edit Video Form State
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [editVideoTitle, setEditVideoTitle] = useState('');
  const [editVideoDesc, setEditVideoDesc] = useState('');
  const [editVideoSourceType, setEditVideoSourceType] = useState<'self_hosted' | 'embed'>('self_hosted');
  const [editVideoFormat, setEditVideoFormat] = useState<'landscape' | 'portrait'>('landscape');
  const [editEmbedUrl, setEditEmbedUrl] = useState('');
  const [editIsFree, setEditIsFree] = useState(false);
  const [editPosition, setEditPosition] = useState<number>(1);
  const [savingEdit, setSavingEdit] = useState(false);

  const handleOpenEditTitleModal = (title: Title) => {
    setEditingTitle(title);
    setEditTitleName(title.name);
    setEditTitleDesc(title.description || '');
    setEditTitleCoverFile(null);
    setEditTitleCoverProgress(0);
  };

  const handleDeleteTitle = async (id: string, name: string) => {
    if (!confirm(`Delete title "${name}" and ALL its videos? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/titles/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete title');
      }
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveTitleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTitle) return;
    setSavingTitleEdit(true);
    setEditTitleCoverProgress(0);
    try {
      let newCoverPath: string | undefined = undefined;

      if (editTitleCoverFile) {
        const signRes = await fetch('/api/admin/videos/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: `covers/${Date.now()}-${editTitleCoverFile.name}`,
            contentType: editTitleCoverFile.type,
          }),
        });
        const signData = await signRes.json();
        if (!signRes.ok) throw new Error(signData.error || 'Failed to get upload URL');

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', signData.uploadUrl);
          xhr.setRequestHeader('Content-Type', editTitleCoverFile.type);
          xhr.upload.onprogress = (ev) => {
            if (ev.lengthComputable)
              setEditTitleCoverProgress(Math.round((ev.loaded / ev.total) * 100));
          };
          xhr.onload = () =>
            xhr.status >= 200 && xhr.status < 300
              ? resolve()
              : reject(new Error(`Upload failed: HTTP ${xhr.status}`));
          xhr.onerror = () => reject(new Error('Network error during cover upload'));
          xhr.send(editTitleCoverFile);
        });
        newCoverPath = signData.objectKey;
      }

      const res = await fetch(`/api/admin/titles/${editingTitle.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editTitleName,
          description: editTitleDesc,
          ...(newCoverPath !== undefined && { cover_image_path: newCoverPath }),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update title');
      }
      setEditingTitle(null);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingTitleEdit(false);
    }
  };

  const handleOpenEditVideoModal = (video: Video) => {
    setEditingVideo(video);
    setEditVideoTitle(video.title);
    setEditVideoDesc(video.description || '');
    setEditVideoSourceType(video.source_type);
    setEditVideoFormat(video.format);
    setEditEmbedUrl(video.embed_url || '');
    setEditIsFree(video.is_free);
    setEditPosition(video.position || 1);
  };

  const handleSaveEditVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVideo) return;

    setSavingEdit(true);
    try {
      const res = await fetch(`/api/admin/videos/${editingVideo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editVideoTitle,
          description: editVideoDesc,
          source_type: editVideoSourceType,
          format: editVideoFormat,
          embed_url: editEmbedUrl,
          is_free: editIsFree,
          position: editPosition,
        }),
      });

      if (!res.ok) throw new Error('Failed to update video');
      setEditingVideo(null);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingEdit(false);
    }
  };

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
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Query auth/me to dynamically show "Manage Admins" button if role is super_admin
    fetch(`/api/auth/me?_=${Date.now()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.user && data.user.role === 'super_admin') {
          const btn = document.getElementById('manage-admins-nav-btn');
          if (btn) btn.style.display = 'inline-block';
        }
      })
      .catch((err) => console.error('Error fetching user role:', err));
  }, []);

  const handleCreateTitle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitleName.trim()) return;

    setUploadingCover(true);
    setUploadCoverProgress(0);
    try {
      let cover_image_path = '';

      if (coverFile) {
        const signRes = await fetch('/api/admin/videos/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: `covers/${Date.now()}-${coverFile.name}`,
            contentType: coverFile.type,
          }),
        });

        const signData = await signRes.json();
        if (!signRes.ok) throw new Error(signData.error || 'Failed to get upload URL');

        // Use XHR instead of fetch so we can track upload progress
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', signData.uploadUrl);
          xhr.setRequestHeader('Content-Type', coverFile.type);
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              setUploadCoverProgress(Math.round((e.loaded / e.total) * 100));
            }
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve();
            else reject(new Error(`Upload failed: HTTP ${xhr.status}`));
          };
          xhr.onerror = () => reject(new Error('Network error during cover upload'));
          xhr.send(coverFile);
        });

        cover_image_path = signData.objectKey;
      }

      const res = await fetch('/api/admin/titles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTitleName,
          description: newTitleDesc,
          cover_image_path,
        }),
      });

      if (!res.ok) throw new Error('Failed to create title');

      setNewTitleName('');
      setNewTitleDesc('');
      setCoverFile(null);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploadingCover(false);
    }
  };

  const handleCreateVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTitleId || !videoTitle.trim()) return;

    setUploading(true);
    setUploadProgress(0);
    try {
      let file_path = '';

      if (sourceType === 'self_hosted' && selectedFile) {
        const signRes = await fetch('/api/admin/videos/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: `videos/${Date.now()}-${selectedFile.name}`,
            contentType: selectedFile.type,
          }),
        });

        const signData = await signRes.json();
        if (!signRes.ok) throw new Error(signData.error || 'Failed to get upload URL');

        // Use XHR instead of fetch so we can track upload progress
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', signData.uploadUrl);
          xhr.setRequestHeader('Content-Type', selectedFile.type);
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              setUploadProgress(Math.round((e.loaded / e.total) * 100));
            }
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve();
            else reject(new Error(`Upload failed: HTTP ${xhr.status}`));
          };
          xhr.onerror = () => reject(new Error('Network error during video upload'));
          xhr.send(selectedFile);
        });

        file_path = signData.objectKey;
      }

      // Upload thumbnail if provided
      let thumbnail_path = '';
      if (thumbnailFile) {
        setUploadThumbnailProgress(0);
        const thumbSignRes = await fetch('/api/admin/videos/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: `covers/${Date.now()}-${thumbnailFile.name}`,
            contentType: thumbnailFile.type,
          }),
        });
        const thumbSignData = await thumbSignRes.json();
        if (!thumbSignRes.ok) throw new Error(thumbSignData.error || 'Failed to get thumbnail upload URL');

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', thumbSignData.uploadUrl);
          xhr.setRequestHeader('Content-Type', thumbnailFile.type);
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) setUploadThumbnailProgress(Math.round((e.loaded / e.total) * 100));
          };
          xhr.onload = () =>
            xhr.status >= 200 && xhr.status < 300
              ? resolve()
              : reject(new Error(`Thumbnail upload failed: HTTP ${xhr.status}`));
          xhr.onerror = () => reject(new Error('Network error during thumbnail upload'));
          xhr.send(thumbnailFile);
        });
        thumbnail_path = thumbSignData.objectKey;
      }

      const res = await fetch('/api/admin/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title_id: selectedTitleId,
          title: videoTitle,
          description: videoDesc,
          source_type: sourceType,
          format: videoFormat,
          embed_url: sourceType === 'embed' ? embedUrl : '',
          file_path,
          thumbnail_path: thumbnail_path || undefined,
          is_free: isFree,
        }),
      });

      if (!res.ok) throw new Error('Failed to save video database record');

      setVideoTitle('');
      setVideoDesc('');
      setEmbedUrl('');
      setSelectedFile(null);
      setThumbnailFile(null);
      setIsFree(false);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteVideo = async (id: string) => {
    if (!confirm('Are you sure you want to delete this video?')) return;

    try {
      const res = await fetch(`/api/admin/videos/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete video');
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleReviewPayment = async (paymentId: string, action: 'approve' | 'reject') => {
    let reason = '';
    if (action === 'reject') {
      const input = prompt('Please enter the rejection reason:');
      if (input === null) return;
      reason = input.trim();
    }

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

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/admin-login';
  };

  // Pagination calculations for payments
  const totalPaymentsPages = Math.ceil(payments.length / ITEMS_PER_PAGE);
  const currentPayments = payments.slice(
    (paymentsPage - 1) * ITEMS_PER_PAGE,
    paymentsPage * ITEMS_PER_PAGE
  );

  // Pagination calculations for members
  const totalMembersPages = Math.ceil(members.length / ITEMS_PER_PAGE);
  const currentMembers = members.slice(
    (membersPage - 1) * ITEMS_PER_PAGE,
    membersPage * ITEMS_PER_PAGE
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-6 space-y-6 transition-colors duration-200">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <img src="/imgs/logo.png" alt="Zahra's Page Logo" className="h-12 md:h-14 w-auto object-contain" />
          <div>
            <h1 className="text-2xl font-bold text-amber-500">Admin Dashboard</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Content Management & CBE Payment Verification Queue
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <ThemeToggle />
          <Link
            href="/admin/manage-admins"
            className="text-xs bg-amber-400 hover:bg-amber-300 text-slate-950 px-3 py-1.5 rounded font-semibold transition"
            id="manage-admins-nav-btn"
            style={{ display: 'none' }} /* Hidden by default, toggled client side if super_admin role */
          >
            Manage Admins
          </Link>
          <Link
            href="/"
            className="text-xs bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 px-3 py-1.5 rounded transition"
          >
            ← Back to Library
          </Link>
          <button
            onClick={handleLogout}
            className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-500/30 px-3 py-1.5 rounded font-semibold transition"
          >
            Log Out
          </button>
        </div>
      </header>

      {/* Nav Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => { setActiveTab('payments'); setPaymentsPage(1); }}
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
          onClick={() => { setActiveTab('members'); setMembersPage(1); }}
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
                {currentPayments.map((p) => (
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

            {/* Payments Pagination Controls */}
            {totalPaymentsPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-950">
                <span className="text-xs text-slate-500">
                  Page {paymentsPage} of {totalPaymentsPages}
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPaymentsPage((prev) => Math.max(prev - 1, 1))}
                    disabled={paymentsPage === 1}
                    className="text-xs bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-1 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPaymentsPage((prev) => Math.min(prev + 1, totalPaymentsPages))}
                    disabled={paymentsPage === totalPaymentsPages}
                    className="text-xs bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-1 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
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

                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">Cover Image (Optional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-600 dark:text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded-none file:border-0 file:text-xs file:bg-slate-200 dark:file:bg-slate-800 file:text-slate-800 dark:file:text-amber-400"
                  />
                </div>

                {/* Cover upload progress bar */}
                {uploadingCover && uploadCoverProgress > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Uploading cover image…</span>
                      <span>{uploadCoverProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-amber-400 h-1.5 rounded-full transition-all duration-200"
                        style={{ width: `${uploadCoverProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={uploadingCover}
                  className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold py-2 rounded-none uppercase tracking-wider transition disabled:opacity-50"
                >
                  {uploadingCover
                    ? uploadCoverProgress > 0
                      ? `Uploading… ${uploadCoverProgress}%`
                      : 'Preparing upload…'
                    : 'Create Title'}
                </button>
              </form>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3 shadow-sm">
              <h3 className="text-sm font-bold text-amber-500">Upload Video (Direct to Storage)</h3>
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

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Video Format
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <label
                      className={`flex items-center justify-center space-x-2 p-2 rounded cursor-pointer border transition ${
                        videoFormat === 'landscape'
                          ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold'
                          : 'border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <input
                        type="radio"
                        name="videoFormat"
                        value="landscape"
                        checked={videoFormat === 'landscape'}
                        onChange={() => setVideoFormat('landscape')}
                        className="hidden"
                      />
                      <span>Landscape (16:9)</span>
                    </label>

                    <label
                      className={`flex items-center justify-center space-x-2 p-2 rounded cursor-pointer border transition ${
                        videoFormat === 'portrait'
                          ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold'
                          : 'border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <input
                        type="radio"
                        name="videoFormat"
                        value="portrait"
                        checked={videoFormat === 'portrait'}
                        onChange={() => setVideoFormat('portrait')}
                        className="hidden"
                      />
                      <span>Portrait (9:16 - Shorts)</span>
                    </label>
                  </div>
                </div>

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

                {/* Thumbnail upload — available for all source types */}
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">
                    Thumbnail Image (Optional)
                    <span className="ml-1 text-slate-400">— shown on the video card</span>
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-600 dark:text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded-none file:border-0 file:text-xs file:bg-slate-200 dark:file:bg-slate-800 file:text-slate-800 dark:file:text-amber-400"
                  />
                </div>

                {/* Thumbnail upload progress */}
                {uploading && uploadThumbnailProgress > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Uploading thumbnail…</span>
                      <span>{uploadThumbnailProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-emerald-400 h-1.5 rounded-full transition-all duration-200"
                        style={{ width: `${uploadThumbnailProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <label className="flex items-center space-x-2 text-xs text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={isFree}
                    onChange={(e) => setIsFree(e.target.checked)}
                    className="rounded bg-slate-100 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-amber-500"
                  />
                  <span>Is Free (Anyone can view)</span>
                </label>

                {/* Video upload progress bar */}
                {uploading && uploadProgress > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Uploading to storage…</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-amber-400 h-1.5 rounded-full transition-all duration-200"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={uploading}
                  className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold py-2 rounded-none uppercase tracking-wider transition disabled:opacity-50"
                >
                  {uploading
                    ? uploadProgress > 0
                      ? `Uploading… ${uploadProgress}%`
                      : 'Preparing upload…'
                    : 'Upload Video'}
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
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{t.name}</h3>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => handleOpenEditTitleModal(t)}
                      className="text-amber-600 dark:text-amber-400 hover:underline text-xs font-bold"
                    >
                      Edit Title
                    </button>
                    <button
                      onClick={() => handleDeleteTitle(t.id, t.name)}
                      className="text-red-600 dark:text-red-400 hover:underline text-xs font-bold"
                    >
                      Delete Title
                    </button>
                  </div>
                </div>
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

                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => handleOpenEditVideoModal(v)}
                          className="text-amber-600 dark:text-amber-400 hover:underline text-xs font-bold"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteVideo(v.id)}
                          className="text-red-600 dark:text-red-400 hover:underline text-xs font-bold"
                        >
                          Delete
                        </button>
                      </div>
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
                {currentMembers.map((m) => (
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

            {/* Members Pagination Controls */}
            {totalMembersPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-950">
                <span className="text-xs text-slate-500">
                  Page {membersPage} of {totalMembersPages}
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setMembersPage((prev) => Math.max(prev - 1, 1))}
                    disabled={membersPage === 1}
                    className="text-xs bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-1 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setMembersPage((prev) => Math.min(prev + 1, totalMembersPages))}
                    disabled={membersPage === totalMembersPages}
                    className="text-xs bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-1 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Edit Video Modal */}
      {editingVideo && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 max-w-lg w-full shadow-2xl space-y-4 text-slate-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Edit Video: {editingVideo.title}
              </h3>
              <button
                onClick={() => setEditingVideo(null)}
                className="text-slate-400 hover:text-slate-100 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditVideo} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Episode Title *
                </label>
                <input
                  type="text"
                  required
                  value={editVideoTitle}
                  onChange={(e) => setEditVideoTitle(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  value={editVideoDesc}
                  onChange={(e) => setEditVideoDesc(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Source Type
                </label>
                <select
                  value={editVideoSourceType}
                  onChange={(e) => setEditVideoSourceType(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="embed">Embed (Public / YouTube)</option>
                  <option value="self_hosted">Self Hosted (MinIO Storage)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Video Format
                </label>
                <select
                  value={editVideoFormat}
                  onChange={(e) => setEditVideoFormat(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="landscape">Landscape (16:9)</option>
                  <option value="portrait">Portrait (9:16 - Short)</option>
                </select>
              </div>

              {editVideoSourceType === 'embed' && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Embed URL
                  </label>
                  <input
                    type="url"
                    value={editEmbedUrl}
                    onChange={(e) => setEditEmbedUrl(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Sorting Position (1 = first)
                </label>
                <input
                  type="number"
                  required
                  value={editPosition}
                  onChange={(e) => setEditPosition(parseInt(e.target.value) || 1)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="editIsFree"
                  checked={editIsFree}
                  onChange={(e) => setEditIsFree(e.target.checked)}
                  className="rounded bg-slate-100 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-amber-500"
                />
                <label htmlFor="editIsFree" className="text-xs text-slate-700 dark:text-slate-300">
                  Is Free (Anyone can view)
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingVideo(null)}
                  className="bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold px-4 py-2 rounded transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold px-4 py-2 rounded transition disabled:opacity-50"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Title Modal */}
      {editingTitle && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
              <h3 className="text-sm font-bold text-amber-500 uppercase tracking-wider">Edit Title</h3>
              <button
                onClick={() => setEditingTitle(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveTitleEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">
                  Title Name *
                </label>
                <input
                  type="text"
                  value={editTitleName}
                  onChange={(e) => setEditTitleName(e.target.value)}
                  required
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">
                  Description
                </label>
                <textarea
                  value={editTitleDesc}
                  onChange={(e) => setEditTitleDesc(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 transition resize-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">
                  Replace Cover Image (optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setEditTitleCoverFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-600 dark:text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded-none file:border-0 file:text-xs file:bg-slate-200 dark:file:bg-slate-800 file:text-slate-800 dark:file:text-amber-400"
                />
                <p className="text-[10px] text-slate-400 mt-1">Leave empty to keep the existing cover image.</p>
              </div>

              {/* Cover upload progress for edit modal */}
              {savingTitleEdit && editTitleCoverProgress > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Uploading new cover…</span>
                    <span>{editTitleCoverProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-amber-400 h-1.5 rounded-full transition-all duration-200"
                      style={{ width: `${editTitleCoverProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="submit"
                  disabled={savingTitleEdit || !editTitleName.trim()}
                  className="flex-1 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold py-2.5 rounded-none uppercase tracking-wider transition disabled:opacity-50"
                >
                  {savingTitleEdit
                    ? editTitleCoverProgress > 0
                      ? `Uploading cover… ${editTitleCoverProgress}%`
                      : 'Saving…'
                    : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingTitle(null)}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold py-2.5 rounded-none uppercase tracking-wider transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
