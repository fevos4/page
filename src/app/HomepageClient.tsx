'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Lock, Play, X, ArrowRight } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

interface Video {
  id: string;
  title: string;
  description?: string | null;
  source_type: 'self_hosted' | 'embed';
  format?: 'landscape' | 'portrait';
  embed_url?: string | null;
  thumbnail_path?: string | null;
  is_free: boolean;
  position: number;
}

interface Title {
  id: string;
  name: string;
  description?: string | null;
  cover_image_path?: string | null;
  position: number;
  videos: Video[];
}

interface HomepageClientProps {
  titles: Title[];
  user: {
    name: string;
    email: string;
    role: string;
    membershipStatus: string;
  } | null;
  latestTitleName: string | null;
  latestTitleCover?: string | null;
  latestFreeVideo: Video | null;
}

export default function HomepageClient({
  titles,
  user,
  latestTitleName,
  latestTitleCover,
  latestFreeVideo,
}: HomepageClientProps) {
  const [activeModalVideo, setActiveModalVideo] = useState<Video | null>(null);
  const [playSource, setPlaySource] = useState<{
    source_type: 'self_hosted' | 'embed';
    format?: 'landscape' | 'portrait';
    url: string;
  } | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [loadingVideo, setLoadingVideo] = useState<boolean>(false);
  const [scrolled, setScrolled] = useState<boolean>(false);

  const isActiveMember = user?.membershipStatus === 'active';

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 40) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handlePlayClick = async (video: Video) => {
    const isPlayable = video.is_free || isActiveMember;

    if (!isPlayable) {
      return;
    }

    setActiveModalVideo(video);
    setLoadingVideo(true);
    setVideoError(null);
    setPlaySource(null);

    try {
      const res = await fetch(`/api/videos/${video.id}/play`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to load video source');
      }

      if (data.source_type === 'embed') {
        setPlaySource({
          source_type: 'embed',
          format: video.format,
          url: data.embed_url,
        });
      } else {
        setPlaySource({
          source_type: 'self_hosted',
          format: video.format,
          url: data.play_url,
        });
      }
    } catch (err: any) {
      setVideoError(err.message);
    } finally {
      setLoadingVideo(false);
    }
  };

  const closeModal = () => {
    setActiveModalVideo(null);
    setPlaySource(null);
    setVideoError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* 1. Top Navigation Bar - Light & Quiet aesthetic with active underline */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-6 md:px-12 py-5 flex items-center justify-between ${
          scrolled
            ? 'bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 shadow-2xl py-4'
            : 'bg-gradient-to-b from-slate-950/90 via-slate-950/40 to-transparent'
        }`}
      >
        <div className="flex items-center min-w-[200px]">
          <Link href="/" className="flex items-center">
            <span className="text-3xl font-normal tracking-[0.08em] text-white uppercase font-display leading-none">
              ZAHRA&apos;S <span className="text-amber-400">PAGE</span>
            </span>
          </Link>
        </div>

        <nav className="hidden md:flex items-center justify-center flex-1 space-x-10 text-xs font-medium tracking-[0.15em] uppercase">
          <Link
            href="/"
            className="text-white relative py-1 after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-amber-400 transition"
          >
            Home
          </Link>
          <a href="#browse-rows" className="text-slate-300 hover:text-white transition py-1">
            Browse
          </a>
          <Link href="/membership" className="text-slate-300 hover:text-white transition py-1">
            Membership
          </Link>
        </nav>

        <div className="flex items-center justify-end space-x-3">
          <ThemeToggle />

          {!user ? (
            <>
              <Link
                href="/login"
                className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-300 hover:text-white px-3 py-2 transition"
              >
                Log In
              </Link>
              <Link
                href="/membership"
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs uppercase px-5 py-2 rounded-none tracking-[0.15em] transition shadow-md"
              >
                Join Now
              </Link>
            </>
          ) : (
            <div className="flex items-center space-x-3">
              {!isActiveMember && (
                <Link
                  href="/membership"
                  className="text-xs font-semibold uppercase tracking-[0.15em] text-amber-400 hover:text-amber-300 px-2 py-1 transition"
                >
                  Become a Member
                </Link>
              )}
              <Link
                href="/account"
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs uppercase px-5 py-2 rounded-none tracking-[0.15em] transition shadow-md"
              >
                My Account
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* 2. Hero Section: Full screen viewport height with Title Cover or Hero 2 fallback image */}
      <section className="relative w-full h-screen min-h-screen flex items-center justify-between overflow-hidden pt-20 px-6 md:px-16 text-slate-100 bg-slate-950">
        {/* Background Image (Title cover or Hero 2.avif fallback) positioned on the right side */}
        <div
          className="absolute inset-y-0 right-0 w-full md:w-3/5 bg-contain bg-right bg-no-repeat z-0 transform filter brightness-95 opacity-90 transition-all duration-500"
          style={{
            backgroundImage: `url("${(latestTitleCover && (latestTitleCover.startsWith('/') || latestTitleCover.startsWith('http')) ? latestTitleCover : '/imgs/Hero 2.avif').replace(/ /g, '%20')}")`,
          }}
        />
        {/* Softened Gradient Overlays to keep left text crisp */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/60 to-transparent z-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/40 z-10" />

        {/* Hero Text Content Container */}
        <div className="relative z-20 max-w-2xl space-y-6 pt-12">
          {/* 3. Small Tag Line */}
          {latestTitleName && (
            <a
              href="#browse-rows"
              className="inline-flex items-center space-x-2 text-xs uppercase tracking-[0.2em] font-semibold text-amber-400 hover:text-amber-300 transition group"
            >
              <span>NEW — {latestTitleName}</span>
              <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition" />
            </a>
          )}

          {/* 4. Large Stacked Headline */}
          <div className="space-y-1">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-none uppercase text-white font-display">
              UNFILTERED
            </h1>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-none uppercase text-amber-400 font-display">
              AND REAL
            </h1>
          </div>

          {/* 5. Subtext */}
          <p className="text-sm md:text-base text-slate-300 font-normal max-w-lg tracking-wide">
            Free to watch. Free to join. More for members.
          </p>

          {/* 6. Two CTA Buttons */}
          <div className="flex flex-wrap items-center gap-4 pt-3">
            {!isActiveMember ? (
              <Link
                href="/membership"
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs uppercase px-7 py-3 rounded-none shadow-xl tracking-[0.15em] transition transform hover:-translate-y-0.5 flex items-center space-x-2"
              >
                <span>Join Now</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <Link
                href="/account"
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs uppercase px-7 py-3 rounded-none shadow-xl tracking-[0.15em] transition transform hover:-translate-y-0.5"
              >
                My Account
              </Link>
            )}

            {latestFreeVideo && (
              <button
                onClick={() => handlePlayClick(latestFreeVideo)}
                className="bg-slate-950/80 hover:bg-slate-900 text-slate-200 font-semibold text-xs uppercase px-6 py-3 rounded-none border border-slate-700/80 hover:border-slate-400 tracking-[0.15em] transition flex items-center space-x-2 backdrop-blur-md shadow-lg"
              >
                <Play className="w-3.5 h-3.5 fill-current text-white" />
                <span>Watch Free Preview</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 7. Title Rows Section - Responsive Theme aware colors */}
      <main id="browse-rows" className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-12 space-y-12">
        <div className="border-b border-slate-200 dark:border-slate-800/80 pb-3">
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-wide uppercase font-display">
            ALL TITLES & SHOWS
          </h2>
        </div>

        {titles.map((title) => {
          const rowFormat = title.videos[0]?.format === 'portrait' ? 'portrait' : 'landscape';
          const isPortraitRow = rowFormat === 'portrait';

          return (
            <section key={title.id} className="space-y-4">
              <div className="flex items-center space-x-3">
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-wide">
                  {title.name}
                </h3>
                {isPortraitRow && (
                  <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-amber-400 text-slate-950 rounded-none">
                    Shorts (9:16)
                  </span>
                )}
              </div>
              {title.description && (
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-2xl">
                  {title.description}
                </p>
              )}

              {/* Horizontally Scrollable Row with Format-based Hover Expansion Spacing */}
              <div className="flex space-x-6 overflow-x-auto py-10 px-4 -my-4 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-800">
                {title.videos.map((video) => {
                  const isPlayable = video.is_free || isActiveMember;
                  const isPortraitCard = video.format === 'portrait';

                  return (
                    <div
                      key={video.id}
                      className={`flex-none group relative transition-transform duration-300 transform hover:scale-105 hover:z-30 ${
                        isPortraitCard ? 'w-44 md:w-52' : 'w-72'
                      }`}
                    >
                      {/* Thumbnail Container: Aspect 16:9 for Landscape, 9:16 for Portrait */}
                      <div
                        className={`relative bg-slate-950 flex items-center justify-center overflow-hidden rounded-lg shadow-md group-hover:scale-110 group-hover:z-30 group-hover:shadow-2xl transition-all duration-300 transform origin-center ${
                          isPortraitCard ? 'aspect-[9/16]' : 'aspect-video'
                        }`}
                      >
                        <div
                          className={`absolute inset-0 bg-cover bg-center transition-transform duration-300 ${
                            !isPlayable ? 'filter grayscale contrast-125 opacity-40' : ''
                          }`}
                          style={{
                            backgroundImage: `url("${(title.cover_image_path && (title.cover_image_path.startsWith('/') || title.cover_image_path.startsWith('http')) ? title.cover_image_path : '/imgs/Hero 2.avif').replace(/ /g, '%20')}")`,
                          }}
                        />

                        {/* Locked vs Unlocked Overlay */}
                        {!isPlayable ? (
                          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[2px] flex flex-col items-center justify-center p-4 text-center space-y-2 z-10">
                            <div className="w-10 h-10 rounded-full bg-amber-400/20 text-amber-400 flex items-center justify-center border border-amber-400/40 shadow-lg">
                              <Lock className="w-5 h-5" />
                            </div>
                            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                              MEMBERS ONLY
                            </span>
                            <Link
                              href="/membership"
                              className="bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold uppercase px-3 py-1.5 rounded-none transition shadow"
                            >
                              Unlock
                            </Link>
                          </div>
                        ) : (
                          <button
                            onClick={() => handlePlayClick(video)}
                            className="absolute inset-0 flex flex-col justify-between p-4 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 text-left"
                          >
                            <div className="flex justify-end">
                              <div className="w-9 h-9 rounded-full bg-white text-slate-950 flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition-transform duration-300">
                                <Play className="w-4 h-4 fill-current ml-0.5" />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <h4 className="text-sm font-bold text-white leading-snug line-clamp-2 drop-shadow-md">
                                {video.title}
                              </h4>
                              {video.description && (
                                <p className="text-[11px] text-slate-300 line-clamp-1 opacity-90">
                                  {video.description}
                                </p>
                              )}
                            </div>
                          </button>
                        )}

                        {/* Badge Colors High Contrast in Both Themes */}
                        <span
                          className={`absolute top-2 left-2 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-none shadow-md z-20 ${
                            video.is_free
                              ? 'bg-emerald-600 dark:bg-emerald-500/90 text-white dark:text-emerald-950 border border-emerald-400/40'
                              : 'bg-amber-500 dark:bg-amber-400/90 text-slate-950 dark:text-amber-950 border border-amber-300/40'
                          }`}
                        >
                          {video.is_free ? 'FREE' : 'MEMBERS ONLY'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </main>

      {/* Video Player Modal */}
      {activeModalVideo && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4">
          <div
            className={`w-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl relative ${
              activeModalVideo.format === 'portrait' ? 'max-w-md' : 'max-w-4xl'
            }`}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-amber-400">{activeModalVideo.title}</h3>
                {activeModalVideo.format === 'portrait' && (
                  <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 bg-amber-400/20 text-amber-400 border border-amber-400/40 rounded-none">
                    Short (9:16)
                  </span>
                )}
              </div>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-100 p-1 rounded transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div
              className={`bg-black flex items-center justify-center relative ${
                activeModalVideo.format === 'portrait' ? 'aspect-[9/16] max-h-[75vh]' : 'aspect-video'
              }`}
            >
              {loadingVideo && (
                <div className="text-amber-400 text-sm animate-pulse font-mono">
                  Loading secure video stream...
                </div>
              )}

              {videoError && (
                <div className="text-red-400 text-sm p-4 text-center">{videoError}</div>
              )}

              {playSource && playSource.source_type === 'embed' && (
                <iframe
                  src={playSource.url}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )}

              {playSource && playSource.source_type === 'self_hosted' && (
                <video
                  controls
                  autoPlay
                  src={playSource.url}
                  className="w-full h-full object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
