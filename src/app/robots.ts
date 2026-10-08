import type { MetadataRoute } from 'next';
export default function robots(): MetadataRoute.Robots { const site = process.env.SITE_URL; return { rules: { userAgent: '*', ...(site ? { allow: '/', disallow: ['/admin', '/api/', '/legal/'] } : { disallow: '/' }) }, ...(site ? { sitemap: `${site.replace(/\/$/, '')}/sitemap.xml` } : {}) }; }
