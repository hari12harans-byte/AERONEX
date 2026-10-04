import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

const PAGES = ['/', '/login', '/register', '/privacy', '/terms'];

// Stamps the build id into sw.js, fills the site URL into index.html, and writes robots.txt + sitemap.xml.
function aeronexBuild(siteUrl) {
  const buildId = Date.now().toString(36);
  let outDir = 'dist';
  return {
    name: 'aeronex-build',
    configResolved(c) { outDir = path.resolve(c.root, c.build.outDir); },
    transformIndexHtml: (html) => html.replaceAll('__SITE_URL__', siteUrl),
    closeBundle() {
      const sw = path.join(outDir, 'sw.js');
      if (fs.existsSync(sw)) fs.writeFileSync(sw, fs.readFileSync(sw, 'utf8').replaceAll('__BUILD_ID__', buildId));
      fs.writeFileSync(path.join(outDir, 'robots.txt'), ['User-agent: *', 'Allow: /', 'Disallow: /api/', siteUrl ? `Sitemap: ${siteUrl}/sitemap.xml` : '', ''].filter((l, i, a) => l || i === a.length - 1).join('\n'));
      if (siteUrl) {
        const urls = PAGES.map((p) => `  <url><loc>${siteUrl}${p === '/' ? '/' : p}</loc></url>`).join('\n');
        fs.writeFileSync(path.join(outDir, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  // Reads frontend/.env and the project-root .env (where the backend values live). REFRESH_SECONDS is accepted as an alias.
  const env = { ...loadEnv(mode, path.resolve(process.cwd(), '..'), ['VITE_', 'REFRESH_', 'API_BASE_']), ...loadEnv(mode, process.cwd(), ['VITE_', 'REFRESH_']) };
  const apiTarget = (env.VITE_PROXY_TARGET || env.API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
  // VITE_SITE_URL, e.g. https://aeronex.example.com (no trailing slash). Needed for absolute social-preview URLs.
  const siteUrl = (env.VITE_SITE_URL || '').replace(/\/$/, '');
  return {
    plugins: [react(), aeronexBuild(siteUrl)],
    define: { 'import.meta.env.VITE_REFRESH_SECONDS': JSON.stringify(env.VITE_REFRESH_SECONDS || env.REFRESH_SECONDS || '20') },
    server: { port: 5173, proxy: { '/api': apiTarget } },
  };
});
