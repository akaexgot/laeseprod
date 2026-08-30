export type Project = {
  id: string;
  title?: string;
  slug?: string;
  featured_home?: boolean;
  video_project?: string | null;
  [key: string]: unknown;
};

export type VideoOrientation = 'horizontal' | 'vertical';
export type VideoProvider = 'youtube' | 'vimeo' | 'instagram' | 'native' | 'unknown';

export type ResolvedVideoEmbed = {
  originalUrl: string;
  embedUrl: string;
  provider: VideoProvider;
  orientation: VideoOrientation;
  isNative: boolean;
  aspectRatio: '16 / 9' | '9 / 16';
};

export function getVideoId(value?: string | null): string | null {
  if (!value) return null;
  const v = value.trim();
  // support watch?v=, embed/, shorts/, youtu.be/ and raw IDs
  const match = v.match(/(?:(?:(?:www|m)\.)?youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (match) return match[1];
  if (/^[A-Za-z0-9_-]{11}$/.test(v)) return v;
  try {
    const u = new URL(v);
    const vid = u.searchParams.get('v');
    if (vid && /^[A-Za-z0-9_-]{11}$/.test(vid)) return vid;
  } catch (e) {
    // not a URL
  }
  return null;
}

/** Check if a URL is an Instagram Reel */
export function isInstagramReel(url?: string | null): boolean {
  if (!url) return false;
  return /instagram\.com\/(reel|reels|p)\//.test(url.trim());
}

/** Extract a clean Instagram embed URL from a reel/post URL */
export function getInstagramEmbedUrl(url?: string | null): string | null {
  if (!url) return null;
  const match = url.trim().match(/instagram\.com\/(reel|reels|p)\/([A-Za-z0-9_-]+)/);
  if (!match) return null;
  const type = match[1] === 'p' ? 'p' : 'reel';
  return `https://www.instagram.com/${type}/${match[2]}/embed/`;
}

export function toYouTubeEmbed(url?: string | null): string | null {
  const id = getVideoId(url);
  if (!id) return null;
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1&cc_load_policy=0&iv_load_policy=3&disablekb=1&enablejsapi=1`;
}

export function getVimeoId(value?: string | null): string | null {
  if (!value) return null;
  const v = value.trim();
  const match = v.match(/vimeo\.com\/(?:.*\/)?(\d+)(?:[/?#]|$)/i);
  return match?.[1] || null;
}

export function toVimeoEmbed(url?: string | null): string | null {
  const id = getVimeoId(url);
  if (!id) return null;
  return `https://player.vimeo.com/video/${id}?dnt=1`;
}

export function isDirectVideoUrl(value?: string | null): boolean {
  if (!value) return false;
  const v = value.trim();
  return /\.(mp4|webm|mov)(?:[?#].*)?$/i.test(v) || /res\.cloudinary\.com\/[^/]+\/video\/upload\//i.test(v);
}

function isYouTubeShort(value: string) {
  return /youtube(?:-nocookie)?\.com\/shorts\//i.test(value) || /(?:^|[/?#&_-])shorts?(?:[/?#&_=.-]|$)/i.test(value);
}

function appendUrlParam(value: string, key: string, paramValue: string) {
  const separator = value.includes('?') ? '&' : '?';
  return `${value}${separator}${key}=${encodeURIComponent(paramValue)}`;
}

export function resolveVideoEmbed(value?: string | null, options: { origin?: string } = {}): ResolvedVideoEmbed | null {
  const originalUrl = String(value || '').trim();
  if (!originalUrl) return null;

  const youtubeEmbed = toYouTubeEmbed(originalUrl);
  if (youtubeEmbed) {
    const embedUrl = options.origin ? appendUrlParam(youtubeEmbed, 'origin', options.origin) : youtubeEmbed;
    const orientation: VideoOrientation = isYouTubeShort(originalUrl) ? 'vertical' : 'horizontal';
    return {
      originalUrl,
      embedUrl,
      provider: 'youtube',
      orientation,
      isNative: false,
      aspectRatio: orientation === 'vertical' ? '9 / 16' : '16 / 9',
    };
  }

  const vimeoEmbed = toVimeoEmbed(originalUrl);
  if (vimeoEmbed) {
    return {
      originalUrl,
      embedUrl: vimeoEmbed,
      provider: 'vimeo',
      orientation: 'horizontal',
      isNative: false,
      aspectRatio: '16 / 9',
    };
  }

  const instagramEmbed = getInstagramEmbedUrl(originalUrl);
  if (instagramEmbed) {
    return {
      originalUrl,
      embedUrl: instagramEmbed,
      provider: 'instagram',
      orientation: 'vertical',
      isNative: false,
      aspectRatio: '9 / 16',
    };
  }

  if (isDirectVideoUrl(originalUrl)) {
    const orientation: VideoOrientation = /vertical|portrait|reel|short/i.test(originalUrl) ? 'vertical' : 'horizontal';
    return {
      originalUrl,
      embedUrl: originalUrl,
      provider: 'native',
      orientation,
      isNative: true,
      aspectRatio: orientation === 'vertical' ? '9 / 16' : '16 / 9',
    };
  }

  try {
    new URL(originalUrl);
    return {
      originalUrl,
      embedUrl: originalUrl,
      provider: 'unknown',
      orientation: 'horizontal',
      isNative: false,
      aspectRatio: '16 / 9',
    };
  } catch (e) {
    return null;
  }
}

export function normalizeSampleVideos(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, 3);
}

/**
 * Build screens according to rules:
 * - First screen: up to 3 featured projects (`featured_home`)
 * - Subsequent screens: chunks of up to 4 projects (2x2)
 * - Partial chunks are included (no projects are discarded)
 */
export function buildProjectScreens(all: Project[]): Project[][] {
  const FEATURED_LIMIT = 3;
  const CHUNK_SIZE = 4;

  if (!Array.isArray(all) || all.length === 0) return [];

  const featured = all.filter(p => p.featured_home).slice(0, FEATURED_LIMIT);
  const remaining = all.filter(p => !featured.some(f => f.id === p.id));

  const chunks: Project[][] = [];
  for (let i = 0; i < remaining.length; i += CHUNK_SIZE) {
    const chunk = remaining.slice(i, i + CHUNK_SIZE);
    if (chunk.length > 0) chunks.push(chunk);
  }

  const screens: Project[][] = [];
  if (featured.length > 0) screens.push(featured);
  screens.push(...chunks);
  return screens;
}

export default {
  getVideoId,
  toYouTubeEmbed,
  getVimeoId,
  toVimeoEmbed,
  isInstagramReel,
  getInstagramEmbedUrl,
  isDirectVideoUrl,
  resolveVideoEmbed,
  normalizeSampleVideos,
  buildProjectScreens,
};
