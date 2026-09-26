import { readFile } from "node:fs/promises";
import { Post, PUBLISHED } from "../models/Post";
import { User } from "../models/User";
import { Tag } from "../models/Tag";
import { env } from "../config/env";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const SITE = "Klyro";
const TAGLINE = "Where ideas come together.";
const DEFAULT_DESC = "Klyro is a community blogging platform for developers and curious minds. Write, share and discover ideas.";

interface Meta {
  title: string;
  description: string;
  image?: string;
  url: string;
  type?: "website" | "article" | "profile";
  publishedTime?: string;
  author?: string;
  jsonLd?: object;
}

function absolute(url: string | undefined): string {
  if (!url) return `${env.APP_URL}/og-image.png`;
  return url.startsWith("http") ? url : `${env.APP_URL}${url}`;
}

export function renderMeta(m: Meta): string {
  const tags = [
    `<title>${esc(m.title)}</title>`,
    `<meta name="description" content="${esc(m.description)}" />`,
    `<link rel="canonical" href="${esc(m.url)}" />`,
    `<meta property="og:site_name" content="${SITE}" />`,
    `<meta property="og:type" content="${m.type ?? "website"}" />`,
    `<meta property="og:title" content="${esc(m.title)}" />`,
    `<meta property="og:description" content="${esc(m.description)}" />`,
    `<meta property="og:url" content="${esc(m.url)}" />`,
    `<meta property="og:image" content="${esc(absolute(m.image))}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(m.title)}" />`,
    `<meta name="twitter:description" content="${esc(m.description)}" />`,
    `<meta name="twitter:image" content="${esc(absolute(m.image))}" />`,
  ];
  if (m.publishedTime) tags.push(`<meta property="article:published_time" content="${m.publishedTime}" />`);
  if (m.author) tags.push(`<meta name="author" content="${esc(m.author)}" />`);
  if (m.jsonLd) tags.push(`<script type="application/ld+json">${JSON.stringify(m.jsonLd).replace(/</g, "\\u003c")}</script>`);
  return tags.join("\n    ");
}

const defaultMeta = (path: string): Meta => ({ title: `${SITE} — ${TAGLINE}`, description: DEFAULT_DESC, url: `${env.APP_URL}${path}` });

/** Page-specific meta for share previews and crawlers. */
export async function metaForPath(path: string): Promise<Meta> {
  const post = path.match(/^\/post\/([^/?#]+)/);
  if (post?.[1]) {
    const p = await Post.findOne({ slug: decodeURIComponent(post[1]), ...PUBLISHED })
      .select("title excerpt tldr coverImage publishedAt updatedAt author")
      .populate("author", "username name")
      .lean();
    if (p) {
      const author = p.author as unknown as { username: string; name?: string };
      const authorName = author.name || author.username;
      const url = `${env.APP_URL}/post/${post[1]}`;
      return {
        title: `${p.title} · ${SITE}`,
        description: (p.tldr || p.excerpt || DEFAULT_DESC).slice(0, 300),
        image: p.coverImage || undefined,
        url,
        type: "article",
        publishedTime: p.publishedAt?.toISOString(),
        author: authorName,
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: p.title,
          description: p.tldr || p.excerpt,
          image: absolute(p.coverImage || undefined),
          datePublished: p.publishedAt?.toISOString(),
          dateModified: p.updatedAt?.toISOString(),
          author: { "@type": "Person", name: authorName, url: `${env.APP_URL}/u/${author.username}` },
          publisher: { "@type": "Organization", name: SITE },
          mainEntityOfPage: url,
        },
      };
    }
  }
  const profile = path.match(/^\/u\/([^/?#]+)/);
  if (profile?.[1]) {
    const u = await User.findOne({ username: decodeURIComponent(profile[1]).toLowerCase(), status: { $ne: "banned" } }).select("username name bio avatar").lean();
    if (u) {
      return {
        title: `${u.name || u.username} (@${u.username}) · ${SITE}`,
        description: u.bio || `Read posts by ${u.name || u.username} on ${SITE}.`,
        image: u.avatar || undefined,
        url: `${env.APP_URL}/u/${u.username}`,
        type: "profile",
      };
    }
  }
  const tag = path.match(/^\/tags\/([^/?#]+)/);
  if (tag?.[1]) {
    const t = await Tag.findOne({ slug: decodeURIComponent(tag[1]).toLowerCase() }).select("slug description postsCount").lean();
    if (t) {
      return {
        title: `#${t.slug} · ${SITE}`,
        description: t.description || `${t.postsCount} posts about ${t.slug} on ${SITE}.`,
        url: `${env.APP_URL}/tags/${t.slug}`,
      };
    }
  }
  return defaultMeta(path);
}

let template: string | null = null;

/** Returns index.html with page-specific meta between the <!--seo:start--> and <!--seo:end--> markers. */
export async function renderIndex(indexPath: string, path: string): Promise<string> {
  if (!template || !env.isProd) template = await readFile(indexPath, "utf8");
  let meta: Meta;
  try {
    meta = await metaForPath(path);
  } catch {
    meta = defaultMeta(path);
  }
  return template.replace(/<!--seo:start-->[\s\S]*<!--seo:end-->/, `<!--seo:start-->\n    ${renderMeta(meta)}\n    <!--seo:end-->`);
}

export async function sitemap(): Promise<string> {
  const [posts, tags, users] = await Promise.all([
    Post.find(PUBLISHED).select("slug updatedAt").sort({ publishedAt: -1 }).limit(5000).lean(),
    Tag.find({ postsCount: { $gt: 0 } }).select("slug").limit(1000).lean(),
    User.find({ postsCount: { $gt: 0 }, status: { $ne: "banned" } }).select("username").limit(2000).lean(),
  ]);
  const urls = [
    `<url><loc>${env.APP_URL}/</loc></url>`,
    ...posts.map((p) => `<url><loc>${env.APP_URL}/post/${esc(p.slug)}</loc><lastmod>${p.updatedAt.toISOString()}</lastmod></url>`),
    ...tags.map((t) => `<url><loc>${env.APP_URL}/tags/${esc(t.slug)}</loc></url>`),
    ...users.map((u) => `<url><loc>${env.APP_URL}/u/${esc(u.username)}</loc></url>`),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;
}
