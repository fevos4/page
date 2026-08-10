/**
 * Normalizes YouTube and TikTok URLs into valid iframe embeddable format.
 *
 * YouTube supported formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID (&t=2564s or ?t=2564)
 * - https://youtu.be/VIDEO_ID (?t=...)
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * => Output: https://www.youtube.com/embed/VIDEO_ID[?start=SECONDS]
 *
 * TikTok supported formats:
 * - https://www.tiktok.com/@username/video/POST_ID
 * - https://www.tiktok.com/player/v1/POST_ID
 * => Output: https://www.tiktok.com/player/v1/POST_ID
 */
export function normalizeEmbedUrl(rawUrl: string): string {
  const INVALID_MSG = "Couldn't recognize this as a valid YouTube or TikTok video URL. Please paste a direct video link.";

  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new Error(INVALID_MSG);
  }

  const trimmed = rawUrl.trim();
  let parsedUrl: URL;

  try {
    const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    parsedUrl = new URL(withProto);
  } catch {
    throw new Error(INVALID_MSG);
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  const pathname = parsedUrl.pathname;
  const searchParams = parsedUrl.searchParams;

  // 1. YouTube
  const isYouTubeHost =
    hostname === 'youtube.com' ||
    hostname.endsWith('.youtube.com') ||
    hostname === 'youtu.be' ||
    hostname.endsWith('.youtu.be');

  if (isYouTubeHost) {
    let videoId: string | null = null;
    let startTime: string | null = null;

    // Extract start time if present (t=... or start=...)
    const rawT = searchParams.get('t') || searchParams.get('start');
    if (rawT) {
      startTime = parseStartSeconds(rawT);
    }

    if (hostname === 'youtu.be' || hostname.endsWith('.youtu.be')) {
      const parts = pathname.split('/').filter(Boolean);
      if (parts.length > 0) {
        videoId = parts[0];
      }
    } else {
      if (pathname.includes('/watch')) {
        videoId = searchParams.get('v');
      } else if (pathname.includes('/shorts/')) {
        const parts = pathname.split('/shorts/')[1]?.split('/').filter(Boolean);
        if (parts && parts.length > 0) {
          videoId = parts[0];
        }
      } else if (pathname.includes('/embed/')) {
        const parts = pathname.split('/embed/')[1]?.split('/').filter(Boolean);
        if (parts && parts.length > 0) {
          videoId = parts[0];
        }
      }
    }

    if (videoId) {
      videoId = videoId.replace(/[^a-zA-Z0-9_-]/g, '');
      if (videoId.length > 0) {
        let result = `https://www.youtube.com/embed/${videoId}`;
        if (startTime) {
          result += `?start=${startTime}`;
        }
        return result;
      }
    }
  }

  // 2. TikTok
  const isTikTokHost =
    hostname === 'tiktok.com' ||
    hostname.endsWith('.tiktok.com');

  if (isTikTokHost) {
    let postId: string | null = null;

    if (pathname.includes('/video/')) {
      const parts = pathname.split('/video/')[1]?.split('/').filter(Boolean);
      if (parts && parts.length > 0) {
        postId = parts[0];
      }
    } else if (pathname.includes('/player/v1/')) {
      const parts = pathname.split('/player/v1/')[1]?.split('/').filter(Boolean);
      if (parts && parts.length > 0) {
        postId = parts[0];
      }
    } else if (pathname.includes('/v/')) {
      const parts = pathname.split('/v/')[1]?.split('/').filter(Boolean);
      if (parts && parts.length > 0) {
        postId = parts[0];
      }
    }

    if (postId) {
      postId = postId.replace(/[^0-9a-zA-Z_-]/g, '');
      if (postId.length > 0) {
        return `https://www.tiktok.com/player/v1/${postId}`;
      }
    }
  }

  throw new Error(INVALID_MSG);
}

function parseStartSeconds(rawT: string): string | null {
  const val = rawT.trim();
  if (/^\d+s?$/i.test(val)) {
    return val.replace(/s$/i, '');
  }
  const match = val.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i);
  if (match && (match[1] || match[2] || match[3])) {
    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);
    const total = hours * 3600 + minutes * 60 + seconds;
    return total.toString();
  }
  return null;
}
