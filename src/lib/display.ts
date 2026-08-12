export type Project = {
  id: string;
  title?: string;
  slug?: string;
  featured_home?: boolean;
  video_project?: string | null;
  [key: string]: unknown;
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
  return `https://www.instagram.com/reel/${match[2]}/embed/`;
}

export function toYouTubeEmbed(url?: string | null): string | null {
  const id = getVideoId(url);
  if (!id) return null;
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1&cc_load_policy=0&iv_load_policy=3&disablekb=1&enablejsapi=1`;
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
  isInstagramReel,
  getInstagramEmbedUrl,
  buildProjectScreens,
};
