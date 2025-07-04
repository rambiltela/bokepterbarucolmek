// src/pages/video-sitemap.xml.ts
import type { APIRoute } from 'astro';
import { slugify } from '../utils/slugify';
import { getAllVideos, type VideoData } from '../utils/data'; // Pastikan ini mengimpor fungsi yang benar

export const GET: APIRoute = async ({ site }) => {
  if (!site) {
    return new Response('Site URL is not defined in Astro config.', { status: 500 });
  }

  let allVideos: VideoData[] = [];
  try {
    allVideos = await getAllVideos(); // Ensure getAllVideos can handle potential errors
  } catch (error) {
    console.error("Failed to load video data for video-sitemap:", error);
    return new Response('Failed to load video data for sitemap.', { status: 500 });
  }

  const baseUrl = site.href.endsWith('/') ? site.href.slice(0, -1) : site.href;

  let videoEntries: string[] = [];

  allVideos.forEach(video => {
    // Construct URLs and ensure they are absolute
    const videoDetailUrl = `${baseUrl}/video/${video.id}/${slugify(video.title)}`; // Adjusted path based on your 404 page example
    const thumbnailUrl = video.thumbnail;
    const embedUrl = video.embedUrl;

    // Ensure thumbnail and embed URLs are absolute
    const absoluteThumbnailUrl = thumbnailUrl.startsWith('http') ? thumbnailUrl : `${baseUrl}${thumbnailUrl}`;
    const absoluteEmbedUrl = embedUrl.startsWith('http') ? embedUrl : `${baseUrl}${embedUrl}`;

    // Provide default values and ensure types are correct
    const duration = video.duration && typeof video.duration === 'number' ? Math.round(video.duration) : 126; // Must be integer
    const datePublished = video.datePublished || new Date().toISOString();
    const dateModified = video.dateModified || datePublished;

    // Ensure all REQUIRED properties are present and valid before adding to sitemap
    if (video.title && video.description && absoluteThumbnailUrl && absoluteEmbedUrl) {
      // Build tags section
      const tagsHtml = video.tags && Array.isArray(video.tags) && video.tags.length > 0
        ? video.tags.map(tag => `<video:tag>${escapeXml(tag.trim())}</video:tag>`).join('\n')
        : (typeof video.tags === 'string' && video.tags.length > 0
            ? video.tags.split(',').map(tag => `<video:tag>${escapeXml(tag.trim())}</video:tag>`).join('\n')
            : ''
          );

      videoEntries.push(`
        <url>
          <loc>${videoDetailUrl}</loc>
          <lastmod>${dateModified}</lastmod>
          <changefreq>weekly</changefreq>
          <priority>0.8</priority>
          <video:video>
            <video:thumbnail_loc>${absoluteThumbnailUrl}</video:thumbnail_loc>
            <video:title>${escapeXml(video.title)}</video:title>
            <video:description>${escapeXml(video.description)}</video:description>
            <video:content_loc>${absoluteEmbedUrl}</video:content_loc>
            <video:duration>${duration}</video:duration>
            <video:publication_date>${datePublished}</video:publication_date>
            ${tagsHtml}
            ${video.category ? `<video:category>${escapeXml(video.category)}</video:category>` : ''}
          </video:video>
        </url>
      `);
    } else {
      console.warn(`Skipping video for sitemap due to missing required data: ID ${video.id || 'N/A'}`);
    }
  });

  const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
  ${videoEntries.join('\n  ')}
</urlset>`;

  return new Response(sitemapContent, {
    headers: {
      'Content-Type': 'application/xml',
    },
  });
};

// Helper function to escape XML entities
function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  // Replace standard XML entities
  return unsafe.replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case "'": return '&apos;'; // Apostrophe
      case '"': return '&quot;'; // Quotation mark
    }
    return c;
  });
}
