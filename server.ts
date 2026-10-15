import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Enable CORS for API routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Range, Authorization');
  res.header('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges, ETag');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

/**
 * Helper to resolve Streamtape direct MP4 URL & thumbnail
 */
async function resolveStreamtape(inputUrlOrId: string) {
  const match = inputUrlOrId.match(/(?:streamtape\.(?:com|to|net)|streamta\.pe)\/(?:v|e)\/([a-zA-Z0-9_-]+)/i);
  const fileId = match ? match[1] : (inputUrlOrId.match(/^[a-zA-Z0-9_-]{10,25}$/) ? inputUrlOrId : null);

  if (!fileId) {
    return { success: false, error: 'ID de Streamtape no válido' };
  }

  const embedUrl = `https://streamtape.com/e/${fileId}/`;
  const webUrl = `https://streamtape.com/v/${fileId}/`;

  try {
    const res = await fetch(embedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      },
    });

    if (!res.ok) {
      return { 
        success: false, 
        fileId, 
        embedUrl, 
        webUrl, 
        error: `Streamtape respondió con código HTTP ${res.status}` 
      };
    }

    const html = await res.text();

    // 1. Poster thumbnail extraction
    let posterUrl = `https://thumb.tapecontent.net/thumb/${fileId}/${fileId}.jpg`;
    const posterMatch = html.match(/poster=["'](https?:\/\/[^"']+)["']/i);
    if (posterMatch && posterMatch[1]) {
      posterUrl = posterMatch[1];
    }

    // 2. Dynamic token query extraction
    const queryMatches = html.match(new RegExp(`id=${fileId}&expires=\\d+&ip=[^&]+&token=[a-zA-Z0-9_-]+`, 'g'));
    if (!queryMatches || queryMatches.length === 0) {
      return {
        success: true,
        fileId,
        embedUrl,
        webUrl,
        posterUrl,
        directVideoUrl: null,
        isEmbedOnly: true,
      };
    }

    // Real active token is the last occurrence in the scripts
    const lastQuery = queryMatches[queryMatches.length - 1];
    const getVideoUrl = `https://streamtape.com/get_video?${lastQuery}`;

    // Follow redirect to obtain direct CDN location
    const redirectRes = await fetch(getVideoUrl, {
      redirect: 'manual',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    const directVideoUrl = redirectRes.headers.get('location') || getVideoUrl;

    return {
      success: true,
      fileId,
      embedUrl,
      webUrl,
      posterUrl,
      directVideoUrl,
      proxyStreamUrl: `/api/streamtape/stream?id=${fileId}&directUrl=${encodeURIComponent(directVideoUrl)}`,
    };
  } catch (err: any) {
    return {
      success: false,
      fileId,
      embedUrl,
      webUrl,
      error: err.message || 'Error de conexión con el servidor de Streamtape',
    };
  }
}

// -----------------------------------------------------------------------------
// API: Resolve Streamtape Link into Direct Native MP4 and High-Res Poster
// -----------------------------------------------------------------------------
app.get('/api/streamtape/resolve', async (req, res) => {
  const urlOrId = (req.query.url || req.query.id) as string;
  if (!urlOrId) {
    return res.status(400).json({ error: 'Parámetro url o id requerido' });
  }

  const result = await resolveStreamtape(urlOrId);
  return res.json(result);
});

// -----------------------------------------------------------------------------
// API: Streamtape Direct Video Streaming Proxy (Supports Range Requests for iOS/Chrome)
// -----------------------------------------------------------------------------
app.get('/api/streamtape/stream', async (req, res) => {
  const fileId = req.query.id as string;
  let targetUrl = req.query.directUrl as string;

  if (!targetUrl && fileId) {
    const resolved = await resolveStreamtape(fileId);
    if (resolved.success && resolved.directVideoUrl) {
      targetUrl = resolved.directVideoUrl;
    }
  }

  if (!targetUrl) {
    return res.status(400).json({ error: 'No se pudo resolver la URL del video' });
  }

  try {
    const range = req.headers.range;
    const fetchHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://streamtape.com/',
    };
    if (range) {
      fetchHeaders['Range'] = range;
    }

    const videoRes = await fetch(targetUrl, { headers: fetchHeaders });

    // Forward status code (200 or 206 Partial Content)
    res.status(videoRes.status);

    const headersToForward = [
      'content-type',
      'content-length',
      'content-range',
      'accept-ranges',
      'last-modified',
      'etag',
    ];

    headersToForward.forEach((h) => {
      const val = videoRes.headers.get(h);
      if (val) res.setHeader(h, val);
    });

    res.setHeader('Cache-Control', 'public, max-age=3600');

    if (!videoRes.body) {
      return res.end();
    }

    // Pipe stream into Express response
    // @ts-ignore
    const reader = videoRes.body.getReader();
    const pump = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
        res.end();
      } catch (e) {
        res.end();
      }
    };
    pump();
  } catch (err: any) {
    console.error('Error streaming video:', err);
    res.status(502).json({ error: 'Error transmitiendo el video' });
  }
});

// -----------------------------------------------------------------------------
// API: Universal Image Proxy (Solves CORS/Hotlinking for Streamtape & external images)
// -----------------------------------------------------------------------------
app.get('/api/image-proxy', async (req, res) => {
  const imageUrl = (req.query.url || req.query.id) as string;
  if (!imageUrl) {
    return res.status(400).json({ error: 'Falta parámetro url' });
  }

  try {
    // If it's a Streamtape link or ID
    const stMatch = imageUrl.match(/(?:streamtape\.(?:com|to|net)|streamta\.pe)\/(?:v|e)\/([a-zA-Z0-9_-]+)/i);
    const fileId = stMatch ? stMatch[1] : (imageUrl.match(/^[a-zA-Z0-9_-]{10,25}$/) ? imageUrl : null);

    if (fileId) {
      // 1. Try fetching from tapecontent thumbnail CDN
      const thumbUrl = `https://thumb.tapecontent.net/thumb/${fileId}/${fileId}.jpg`;
      const thumbRes = await fetch(thumbUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      });

      if (thumbRes.ok && Number(thumbRes.headers.get('content-length') || 0) > 1000) {
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        const buffer = await thumbRes.arrayBuffer();
        return res.send(Buffer.from(buffer));
      }

      // 2. Fetch via Streamtape embed token to get the raw image file (PNG/JPG)
      const embedUrl = `https://streamtape.com/e/${fileId}/`;
      const pageRes = await fetch(embedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });
      const html = await pageRes.text();
      const queryMatches = html.match(new RegExp(`id=${fileId}&expires=\\d+&ip=[^&]+&token=[a-zA-Z0-9_-]+`, 'g'));
      if (queryMatches && queryMatches.length > 0) {
        const lastQuery = queryMatches[queryMatches.length - 1];
        const streamtapeUrl = `https://streamtape.com/get_video?${lastQuery}`;
        const fileRes = await fetch(streamtapeUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://streamtape.com/',
          },
        });
        if (fileRes.ok) {
          const contentType = fileRes.headers.get('content-type') || 'image/png';
          res.setHeader('Content-Type', contentType);
          res.setHeader('Cache-Control', 'public, max-age=86400');
          const buffer = await fileRes.arrayBuffer();
          return res.send(Buffer.from(buffer));
        }
      }
    }

    // Default fallback for external URLs
    const imgRes = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!imgRes.ok) {
      return res.status(imgRes.status).send('Error fetching image');
    }

    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');

    const arrayBuffer = await imgRes.arrayBuffer();
    return res.send(Buffer.from(arrayBuffer));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------------------------------------------
// Server Setup (Vite in Dev, Express Static in Production)
// -----------------------------------------------------------------------------
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        host: '0.0.0.0',
        port: Number(PORT),
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`NovelaStream Server running on http://0.0.0.0:${PORT} (isDev: ${isDev})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
