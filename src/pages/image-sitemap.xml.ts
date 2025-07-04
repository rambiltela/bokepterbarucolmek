// src/pages/image-sitemap.xml.ts
import type { APIRoute } from 'astro';
import { getAllVideos, type VideoData } from '../utils/data'; // Sesuaikan path jika berbeda
import { slugify } from '../utils/slugify'; // Untuk slug URL video

export const GET: APIRoute = async ({ site }) => {
  if (!site) {
    return new Response('Site URL is not defined in Astro config.', { status: 500 });
  }

  const baseUrl = site.href.endsWith('/') ? site.href.slice(0, -1) : site.href;
  const lastMod = new Date().toISOString(); // Waktu modifikasi untuk semua entri gambar

  let videos: VideoData[] = [];
  try {
    videos = await getAllVideos();
  } catch (error) {
    console.error("Failed to load videos for image-sitemap:", error);
    // Kembali dengan sitemap kosong atau error jika data tidak bisa dimuat
    return new Response('Failed to load video data for image sitemap.', { status: 500 });
  }

  let imageEntries = '';
  videos.forEach(video => {
    // Pastikan video memiliki thumbnail dan judul
    if (video.thumbnail && video.title && video.id) {
      const videoPageUrl = `${baseUrl}/video/${video.id}/${slugify(video.title)}`; // URL halaman video
      const thumbnailUrl = video.thumbnail.startsWith('http') ? video.thumbnail : `${baseUrl}${video.thumbnail}`; // Pastikan URL thumbnail lengkap

      imageEntries += `
      <url>
        <loc>${videoPageUrl}</loc>
        <lastmod>${video.datePublished || lastMod}</lastmod>
        <image:image>
          <image:loc>${thumbnailUrl}</image:loc>
          <image:caption>${escapeXml(video.description || video.title)}</image:caption>
          <image:title>${escapeXml(video.title)}</image:title>
        </image:image>
      </url>`;
    }
  });

  const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  ${imageEntries}
</urlset>`;

  return new Response(sitemapContent, {
    headers: {
      'Content-Type': 'application/xml',
    },
  });
};

// Helper function to escape XML entities
function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
    return c; // Should not happen
  });
}
