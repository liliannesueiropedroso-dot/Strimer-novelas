import { getAccessToken } from '../lib/firebase';
import { DriveVideoFile } from '../types';

export interface DriveListResponse {
  files: DriveVideoFile[];
  nextPageToken?: string;
  error?: string;
}

/**
 * Checks if a string contains an <iframe> HTML tag
 */
export function isIframeHtml(input: string): boolean {
  if (!input) return false;
  return /<iframe/i.test(input);
}

/**
 * Extracts the src URL from an <iframe> HTML snippet
 */
export function extractIframeSrc(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  const match = trimmed.match(/<iframe[^>]*\ssrc=["']([^"']+)["']/i) ||
                trimmed.match(/src=["']([^"']+)["']/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  return null;
}

/**
 * Checks if a video should be rendered inside an <iframe> embed
 */
export function isVideoEmbed(urlOrCode: string): boolean {
  if (!urlOrCode) return false;
  const str = urlOrCode.trim().toLowerCase();
  if (str.includes('<iframe') || str.includes('</iframe>')) return true;
  if (str.includes('drive.google.com')) return true;
  if (str.includes('youtube.com') || str.includes('youtu.be')) return true;
  if (str.includes('vimeo.com')) return true;
  if (str.includes('dailymotion.com')) return true;
  if (str.includes('ok.ru')) return true;
  if (str.includes('streamtape')) return true;
  if (str.includes('mega.nz')) return true;
  if (str.includes('/embed') || str.includes('/preview') || str.includes('player')) return true;
  // If ends with direct video extension, it's native HTML5 video
  if (/\.(mp4|webm|ogg|m4v|mov)(\?.*)?$/i.test(str)) return false;
  return true;
}

/**
 * Checks if a string is a Google Drive link or bare file ID and extracts the ID
 */
export function extractDriveFileId(input: string): string | null {
  if (!input) return null;
  let trimmed = input.trim();

  // If input is an iframe code, extract its src attribute first
  const iframeSrc = extractIframeSrc(trimmed);
  if (iframeSrc) {
    trimmed = iframeSrc;
  }

  // Pattern 1: /file/d/ID or /d/ID or /file/u/0/d/ID
  const matchFileD = trimmed.match(/\/(?:file\/)?(?:u\/\d+\/)?d\/([a-zA-Z0-9_-]{15,70})/);
  if (matchFileD) return matchFileD[1];

  // Pattern 2: id=ID parameter (e.g. open?id=... or uc?id=... or thumbnail?id=...)
  const matchParam = trimmed.match(/[?&]id=([a-zA-Z0-9_-]{15,70})/);
  if (matchParam) return matchParam[1];

  // Pattern 3: /folders/ID
  const matchFolder = trimmed.match(/\/folders\/([a-zA-Z0-9_-]{15,70})/);
  if (matchFolder) return matchFolder[1];

  // Pattern 4: Bare ID (alphanumeric between 18 and 70 chars)
  if (/^[a-zA-Z0-9_-]{18,70}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Detects if a URL is from Streamtape or its mirrors
 */
export function isStreamtapeUrl(url: string): boolean {
  if (!url) return false;
  return /(?:streamtape\.(?:com|to|net)|streamta\.pe)\/(?:v|e)\/([a-zA-Z0-9_-]+)/i.test(url);
}

/**
 * Extracts the file ID from a Streamtape URL
 */
export function extractStreamtapeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:streamtape\.(?:com|to|net)|streamta\.pe)\/(?:v|e)\/([a-zA-Z0-9_-]+)/i);
  if (match) return match[1];
  if (/^[a-zA-Z0-9_-]{10,25}$/.test(url.trim())) return url.trim();
  return null;
}

/**
 * Returns the official external watch URL on Streamtape (for opening in another tab)
 */
export function getStreamtapeExternalUrl(url: string): string {
  const fileId = extractStreamtapeId(url);
  if (fileId) {
    return `https://streamtape.com/v/${fileId}/`;
  }
  return url;
}

/**
 * Calls backend to resolve Streamtape into a direct MP4 link and high-res poster
 */
export async function resolveStreamtapeVideo(urlOrId: string): Promise<{
  success: boolean;
  directVideoUrl?: string;
  posterUrl?: string;
  embedUrl?: string;
  webUrl?: string;
  fileId?: string;
  proxyStreamUrl?: string;
  error?: string;
}> {
  try {
    const res = await fetch(`/api/streamtape/resolve?url=${encodeURIComponent(urlOrId)}`);
    if (!res.ok) {
      return { success: false, error: `Error ${res.status}` };
    }
    const data = await res.json();
    return data;
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Converts any Google Drive link, Streamtape link (/v/ to /e/), raw <iframe> embed tag, YouTube link, or video URL into an embeddable URL
 */
export function formatDriveVideoUrl(urlOrIdOrIframe: string): string {
  if (!urlOrIdOrIframe) return '';
  let trimmed = urlOrIdOrIframe.trim();

  // 1. If it's an <iframe> HTML tag, extract the src URL
  const iframeSrc = extractIframeSrc(trimmed);
  if (iframeSrc) {
    trimmed = iframeSrc;
  }

  // 2. Check Streamtape URL (streamtape.com, streamtape.to, streamtape.net, streamta.pe)
  // Converting /v/ to /e/ allows the video to embed in standalone browsers
  const streamtapeMatch = trimmed.match(/(?:https?:\/\/)?(?:www\.)?(streamtape\.(?:com|to|net)|streamta\.pe)\/(?:v|e)\/([a-zA-Z0-9_-]+)/i);
  if (streamtapeMatch) {
    const domain = streamtapeMatch[1];
    const fileId = streamtapeMatch[2];
    return `https://${domain}/e/${fileId}/`;
  }

  // 3. Check if it's a Google Drive link or ID
  const driveId = extractDriveFileId(trimmed);
  if (driveId) {
    return `https://drive.google.com/file/d/${driveId}/preview`;
  }

  // 4. Check YouTube URL
  const ytMatch = trimmed.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch && ytMatch[1]) {
    return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0`;
  }

  // 5. Check Vimeo URL
  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch && vimeoMatch[1]) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  // 6. Check Dailymotion URL
  const dailyMatch = trimmed.match(/dailymotion\.com\/video\/([a-zA-Z0-9]+)/);
  if (dailyMatch && dailyMatch[1]) {
    return `https://www.dailymotion.com/embed/video/${dailyMatch[1]}`;
  }

  // 7. Check Ok.ru URL
  const okMatch = trimmed.match(/ok\.ru\/(?:video|videoembed)\/(\d+)/);
  if (okMatch && okMatch[1]) {
    return `https://ok.ru/videoembed/${okMatch[1]}`;
  }

  return trimmed;
}

/**
 * Converts any Google Drive link, Streamtape image link, ID, or direct image web link into a viewable image URL
 */
export function formatDriveImageUrl(urlOrId: string): string {
  if (!urlOrId) return '';
  const trimmed = urlOrId.trim().replace(/^["']|["']$/g, '');

  if (trimmed.startsWith('/api/image-proxy')) {
    return trimmed;
  }

  // 1. If it's a Google Drive link or ID
  const driveId = extractDriveFileId(trimmed);
  if (driveId) {
    return `https://drive.google.com/thumbnail?id=${driveId}&sz=w1200`;
  }

  // 2. If it's a Streamtape link or tapecontent URL (route through server image-proxy for 100% display)
  const isStreamtape = isStreamtapeUrl(trimmed) || 
    trimmed.includes('streamtape.') || 
    trimmed.includes('streamta.pe') || 
    trimmed.includes('tapecontent.net');

  if (isStreamtape) {
    return `/api/image-proxy?url=${encodeURIComponent(trimmed)}`;
  }

  return trimmed;
}

/**
 * Returns a guaranteed safe image URL (proxies Streamtape links so browsers never block them)
 */
export function getSafeImageUrl(url: string | undefined | null): string {
  if (!url) return '';
  const trimmed = url.trim().replace(/^["']|["']$/g, '');
  if (!trimmed) return '';
  if (trimmed.startsWith('/api/image-proxy')) return trimmed;

  if (
    isStreamtapeUrl(trimmed) ||
    trimmed.includes('streamtape.') ||
    trimmed.includes('streamta.pe') ||
    trimmed.includes('tapecontent.net')
  ) {
    return `/api/image-proxy?url=${encodeURIComponent(trimmed)}`;
  }

  const driveId = extractDriveFileId(trimmed);
  if (driveId) {
    return `https://drive.google.com/thumbnail?id=${driveId}&sz=w1200`;
  }

  return trimmed;
}

/**
 * Fallback handler for image load errors to automatically rescue images via the image proxy
 */
export function handleImageError(e: React.SyntheticEvent<HTMLImageElement, Event>, originalUrl?: string) {
  const target = e.currentTarget;
  if (!originalUrl) return;
  if (!target.dataset.triedProxy && !target.src.includes('/api/image-proxy')) {
    target.dataset.triedProxy = 'true';
    target.src = `/api/image-proxy?url=${encodeURIComponent(originalUrl)}`;
  }
}

/**
 * Extracts multiple video links or iframe embeds from multiline or delimited text
 */
export function extractAllDriveLinks(text: string): { url: string; id: string; isIframe?: boolean }[] {
  if (!text) return [];
  const lines = text.split(/[\n;]+/);
  const results: { url: string; id: string; isIframe?: boolean }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].trim();
    if (!raw) continue;
    const isIframe = isIframeHtml(raw);
    const formatted = formatDriveVideoUrl(raw);
    const driveId = extractDriveFileId(raw) || extractDriveFileId(formatted);
    if (formatted) {
      results.push({
        url: formatted,
        id: driveId || `video-${Date.now()}-${i}`,
        isIframe,
      });
    }
  }
  return results;
}

/**
 * Multiple CDN endpoints to ensure the image loads regardless of regional Google restrictions
 */
export function getDriveImageFallbacks(urlOrId: string): string[] {
  const id = extractDriveFileId(urlOrId);
  if (!id) return [urlOrId];
  return [
    `https://drive.google.com/thumbnail?id=${id}&sz=w1200`,
    `https://lh3.googleusercontent.com/d/${id}`,
    `https://drive.google.com/uc?export=view&id=${id}`,
  ];
}

/**
 * Generates an embeddable preview URL for a Drive file
 */
export function getDriveEmbedUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

/**
 * Fetch video or image files from user's Google Drive with access token
 */
export async function listDriveFiles(
  filterType: 'video' | 'image' | 'all' = 'video',
  searchQuery = '',
  pageToken?: string
): Promise<DriveListResponse> {
  const token = await getAccessToken();
  if (!token) {
    return {
      files: [],
      error: 'NO_TOKEN',
    };
  }

  try {
    let mimeFilter = "mimeType contains 'video/'";
    if (filterType === 'image') {
      mimeFilter = "mimeType contains 'image/'";
    } else if (filterType === 'all') {
      mimeFilter = "(mimeType contains 'video/' or mimeType contains 'image/')";
    }

    let query = `trashed = false and (${mimeFilter} or mimeType = 'application/vnd.google-apps.folder')`;
    if (searchQuery.trim()) {
      query += ` and name contains '${searchQuery.trim().replace(/'/g, "\\'")}'`;
    }

    const params = new URLSearchParams({
      q: query,
      pageSize: '35',
      fields: 'nextPageToken, files(id, name, mimeType, size, thumbnailLink, webViewLink, webContentLink, createdTime)',
      orderBy: 'createdTime desc',
    });

    if (pageToken) {
      params.set('pageToken', pageToken);
    }

    const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      files: data.files || [],
      nextPageToken: data.nextPageToken,
    };
  } catch (error) {
    console.error('Failed to list Google Drive files:', error);
    return {
      files: [],
      error: error instanceof Error ? error.message : 'Error al conectar con Google Drive',
    };
  }
}
