/**
 * Crawl tin thiên văn từ RSS.
 *
 * Mặc định (CRAWL_FETCH_FULL=false): chỉ dùng dữ liệu có cấu trúc trong feed — tiêu đề, tóm tắt,
 * ảnh (từ enclosure/media/img trong RSS; tùy chọn og:image nhẹ nếu thiếu). Bài lưu isExternalArticle:
 * trong app chỉ hiển thị thẻ + tóm tắt; user mở bài gốc (sourceUrl).
 *
 * CRAWL_FETCH_FULL=true: tải HTML trang gốc — Readability, JSON-LD articleBody, khối WP…
 * (dễ lỗi trên site phức tạp; dùng khi thật sự cần full text trong DB.)
 *
 * Chạy: cd services/api && npm run crawl-news
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');
const Parser = require('rss-parser');

const fetchFn = globalThis.fetch || require('node-fetch');

const Forum = require('../features/community/models/Forum');
const Post = require('../features/community/models/Post');

const DEFAULT_FEEDS = ['https://www.nasa.gov/rss/dyn/breaking_news.rss'];

const MAX_CONTENT_LEN = 500000;
/** User-Agent trình duyệt thật — một số site trả nội dung rỗng cho bot rõ ràng */
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const BAD_IMAGE_SUBSTRINGS = [
  'facebook.com',
  'fbcdn.net',
  'fb.com',
  'pixel',
  '1x1',
  'spacer',
  'placeholder',
  'default-avatar',
  'gravatar',
  '/widgets/',
  'tracking',
  'doubleclick',
  'google-analytics',
  'data:image/svg',
  'spinner',
  'loader',
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isBadImageUrl(url) {
  if (!url || typeof url !== 'string') return true;
  const u = url.trim().toLowerCase();
  if (!u.startsWith('http')) return true;
  if (BAD_IMAGE_SUBSTRINGS.some((s) => u.includes(s))) return true;
  return false;
}

/** og:image + gợi ý kích thước; bỏ favicon/icon nhỏ */
function extractPrimaryOgImage(html) {
  if (!html) return null;
  const url =
    matchMeta(html, 'property', 'og:image:secure_url') ||
    matchMeta(html, 'property', 'og:image') ||
    matchMeta(html, 'name', 'twitter:image') ||
    matchMeta(html, 'name', 'twitter:image:src');
  if (!url || isBadImageUrl(url)) return null;

  const w =
    matchMeta(html, 'property', 'og:image:width') || matchMeta(html, 'name', 'twitter:image:width');
  if (w) {
    const n = parseInt(w, 10);
    if (!Number.isNaN(n) && n > 0 && n < 200) return null;
  }
  return url.trim();
}

function matchMeta(html, attr, name) {
  const re = new RegExp(
    `<meta[^>]+${attr}=["']${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]+content=["']([^"']+)["']`,
    'i'
  );
  const m = html.match(re);
  if (m) return m[1];
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+${attr}=["']${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`,
    'i'
  );
  const m2 = html.match(re2);
  return m2 ? m2[1] : null;
}

function collectImgSrcsFromHtml(fragmentHtml, limit = 30) {
  if (!fragmentHtml) return [];
  const out = [];
  const imgRe = /<img\b[^>]*>/gi;
  let m;
  while ((m = imgRe.exec(fragmentHtml)) !== null && out.length < limit) {
    const tag = m[0];
    if (/\bwidth=["']?1["']?/i.test(tag) && /\bheight=["']?1["']?/i.test(tag)) continue;

    let src = tag.match(/\bsrc=["']([^"']+)["']/i)?.[1];
    if (!src) src = tag.match(/\bdata-src=["']([^"']+)["']/i)?.[1];
    if (!src) src = tag.match(/\bdata-lazy-src=["']([^"']+)["']/i)?.[1];
    if (!src) {
      const ss = tag.match(/\bsrcset=["']([^"']+)["']/i)?.[1];
      if (ss) src = ss.split(',')[0].trim().split(/\s+/)[0];
    }
    if (src && !isBadImageUrl(src)) out.push(src.trim());
  }
  return out;
}

/** Ảnh minh họa thật (NASA dùng wp-content/uploads) — ưu tiên trước og khi og là card/icon lỗi */
function pickImageUrl({ pageHtml, articleHtml, rssHtml }) {
  const fromArticle = collectImgSrcsFromHtml(articleHtml);
  const wpUpload = fromArticle.find((u) => /wp-content\/uploads\//i.test(u));
  if (wpUpload) return wpUpload;

  const og = extractPrimaryOgImage(pageHtml);
  if (og) return og;

  for (const src of fromArticle) {
    return src;
  }
  for (const src of collectImgSrcsFromHtml(rssHtml)) {
    return src;
  }

  const fallbackOg = (() => {
    const h = pageHtml;
    if (!h) return null;
    const m =
      h.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      h.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    return m ? m[1].trim() : null;
  })();
  if (fallbackOg && !isBadImageUrl(fallbackOg)) return fallbackOg;

  return null;
}

function stripHtmlToText(html) {
  if (!html) return '';
  return String(html)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function clipContent(html) {
  if (!html) return '';
  if (html.length <= MAX_CONTENT_LEN) return html;
  return `${html.slice(0, MAX_CONTENT_LEN)}\n\n<!-- truncated -->`;
}

function rssItemHtml(item) {
  const enc = item['content:encoded'] || item.contentEncoded;
  if (typeof enc === 'string' && enc.trim()) return enc;
  if (item.content) {
    if (typeof item.content === 'string') return item.content;
    if (item.content && typeof item.content === 'object' && item.content.$value) return item.content.$value;
    if (item.content && typeof item.content === 'object' && item.content._) return item.content._;
  }
  return item.summary || item.description || '';
}

/** Tóm tắt thuần text từ item RSS (không tải trang). */
function rssPlainExcerpt(item) {
  const rssHtml = rssItemHtml(item);
  let text = stripHtmlToText(rssHtml);
  if (!text || text.length < 20) {
    text = stripHtmlToText(item.summary || item.description || '');
  }
  text = text.replace(/\s+/g, ' ').trim();
  if (text.length > 650) text = `${text.slice(0, 647).trim()}…`;
  return text;
}

/** Chuẩn hóa danh sách category từ RSS (string | object | array). */
function normalizeCategoryList(raw) {
  if (raw == null) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  const out = [];
  for (const c of list) {
    let s = '';
    if (typeof c === 'string') s = c.trim();
    else if (c && typeof c === 'object') s = String(c._ || c.$ || c.value || '').trim();
    else s = String(c).trim();
    if (s) out.push(s);
  }
  return out;
}

/** Metadata từ item RSS — dùng filter trong app (category, tags…). */
function rssItemCategories(item) {
  const fromCat = normalizeCategoryList(item.categories);
  const fromDc = item.dcSubject ?? item['dc:subject'];
  const dcList = normalizeCategoryList(
    Array.isArray(fromDc) ? fromDc : fromDc != null ? [fromDc] : []
  );
  const merged = [...fromCat, ...dcList];
  return [...new Set(merged)].slice(0, 30);
}

/** Ảnh minh họa từ feed (enclosure, media:*, <img> trong RSS). */
function rssExtractImage(item, rssHtml) {
  if (item.enclosure && item.enclosure.url) {
    const t = (item.enclosure.type || '').toLowerCase();
    const u = String(item.enclosure.url).trim();
    if (
      u.startsWith('http') &&
      !isBadImageUrl(u) &&
      (t.startsWith('image/') || /\.(jpe?g|png|gif|webp|avif)(\?|$)/i.test(u))
    ) {
      return u;
    }
  }
  const thumb = item['media:thumbnail'] || item.mediaThumbnail;
  if (thumb) {
    const u =
      typeof thumb === 'string'
        ? thumb
        : thumb.$?.url || thumb.url || thumb['@']?.url;
    if (u && !isBadImageUrl(String(u))) return String(u).trim();
  }
  const mc = item['media:content'] || item.mediaContent;
  const mediaArr = Array.isArray(mc) ? mc : mc ? [mc] : [];
  for (const m of mediaArr) {
    const u = m && (m.$?.url || m.url);
    const typ = ((m && (m.$?.type || m.type)) || '').toLowerCase();
    if (u && !isBadImageUrl(String(u)) && (typ.startsWith('image/') || !typ)) return String(u).trim();
  }
  const fromHtml = collectImgSrcsFromHtml(rssHtml, 8)[0];
  if (fromHtml) return fromHtml;
  return null;
}

/** Chỉ lấy og:image từ đầu HTML (không Readability). */
async function fetchOgImageOnly(pageUrl) {
  const page = await fetchPageHtml(pageUrl);
  if (!page.ok || !page.html) return null;
  const html = page.html.length > 200000 ? page.html.slice(0, 200000) : page.html;
  return extractPrimaryOgImage(html);
}

function articleBodyFromNode(node, best) {
  if (!node || typeof node !== 'object') return best;
  if (Array.isArray(node)) {
    for (const x of node) best = articleBodyFromNode(x, best);
    return best;
  }
  const types = [].concat(node['@type'] || []);
  const ok = types.some((t) =>
    /Article|NewsArticle|BlogPosting|WebPage|ScientificArticle|ScholarlyArticle/i.test(String(t))
  );
  if (ok) {
    let ab = node.articleBody;
    if (Array.isArray(ab)) {
      ab = ab.filter((x) => typeof x === 'string').join('\n\n');
    }
    if (typeof ab === 'string' && ab.length > best.length) {
      best = ab;
    } else if (typeof node.description === 'string' && node.description.length > best.length && node.description.length > 350) {
      best = node.description;
    }
  }
  if (node.mainEntity) best = articleBodyFromNode(node.mainEntity, best);
  if (node['@graph']) best = articleBodyFromNode(node['@graph'], best);
  return best;
}

/** Trích articleBody từ JSON-LD (NewsArticle, Article, WebPage + mainEntity...) */
function extractArticleBodyFromJsonLd(html) {
  if (!html) return null;
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  let best = '';
  while ((m = re.exec(html)) !== null) {
    const raw = m[1].trim();
    try {
      const data = JSON.parse(raw);
      best = articleBodyFromNode(data, best);
    } catch {
      /* skip invalid JSON */
    }
  }
  return best.length > 80 ? best : null;
}

function wrapPlainArticleBodyAsHtml(text) {
  const t = text.replace(/\r\n/g, '\n').trim();
  if (!t) return '';
  if (/<[a-z][\s\S]*>/i.test(t)) {
    return t.startsWith('<') ? t : `<div>${t}</div>`;
  }
  const paras = t.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  return paras.map((p) => `<p>${escapeHtmlMinimal(p)}</p>`).join('\n');
}

function escapeHtmlMinimal(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Chỉ giữ nội dung thân bài + ảnh minh họa: bỏ social, footer, @handle, list icon mạng xã hội.
 */
function stripNonArticleChrome(html) {
  if (!html || !String(html).trim()) return html;
  try {
    const dom = new JSDOM(`<!DOCTYPE html><body><div id="galaxies-article-root">${html}</div></body></html>`);
    const root = dom.window.document.getElementById('galaxies-article-root');
    if (!root) return html;

    const removeSelectors = [
      'aside',
      'footer',
      'nav',
      '.sharedaddy',
      '.social-share',
      '.post-share',
      '.social-icons',
      '.social-links',
      '[class*="wp-block-social"]',
      '[class*="SocialLinks"]',
      '[class*="addtoany"]',
      '[class*="newsletter"]',
      '[class*="subscribe-box"]',
      '[aria-label="Social media"]',
      '[class*="follow-us"]',
      '[class*="follow_us"]',
    ];
    removeSelectors.forEach((sel) => {
      try {
        root.querySelectorAll(sel).forEach((el) => el.remove());
      } catch {
        /* ignore invalid selector */
      }
    });

    root.querySelectorAll('iframe').forEach((el) => {
      const s = (el.getAttribute('src') || '').toLowerCase();
      if (
        s.includes('facebook.com') ||
        s.includes('twitter.com') ||
        s.includes('instagram.com') ||
        s.includes('platform.twitter.com')
      ) {
        const fig = el.closest('figure');
        if (fig) fig.remove();
        else el.remove();
      }
    });

    root.querySelectorAll('ul, ol').forEach((list) => {
      const links = list.querySelectorAll('a[href]');
      if (links.length < 2) return;
      let onlySocial = true;
      for (const a of links) {
        const h = (a.getAttribute('href') || '').toLowerCase();
        if (
          !/facebook\.com|fb\.com|twitter\.com|x\.com|instagram\.com|linkedin\.com|threads\.net/i.test(h)
        ) {
          onlySocial = false;
          break;
        }
      }
      if (onlySocial) list.remove();
    });

    root.querySelectorAll('p, div, li').forEach((el) => {
      const t = (el.textContent || '').trim();
      if (!t) return;
      if (/^@[\w.]+\s*$/i.test(t)) el.remove();
      if (/^(follow|follow us)\s+(on|our)\s+/i.test(t) && t.length < 140) el.remove();
    });

    root.querySelectorAll('img').forEach((img) => {
      const src = (img.getAttribute('src') || '').toLowerCase();
      const cls = (img.getAttribute('class') || '').toLowerCase();
      if (
        src.includes('/footer') ||
        src.includes('sprite') ||
        src.includes('site-footer') ||
        src.includes('brand-logo') ||
        cls.includes('social') ||
        cls.includes('emoji')
      ) {
        const fig = img.closest('figure');
        if (fig && stripHtmlToText(fig.textContent || '').length < 80) fig.remove();
        else img.remove();
      }
    });

    return root.innerHTML;
  } catch {
    return html;
  }
}

function sanitizeArticleHtml(html) {
  if (!html) return '';
  let h = stripNonArticleChrome(html);
  h = h.replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '');
  h = h.replace(/<object[^>]*>[\s\S]*?<\/object>/gi, '');
  h = h.replace(/<p[^>]*>\s*@[\w.]+\s*<\/p>/gi, '');
  h = h.replace(/<figure[^>]*class="[^"]*wp-block-embed[^"]*"[^>]*>[\s\S]*?<\/figure>/gi, '');
  h = dedupeCreditParagraphs(h);
  h = dedupeSameCreditLine(h);
  return h.trim();
}

/** Hai dòng Credit / Image credit giống hệt liền nhau → một dòng */
function dedupeSameCreditLine(html) {
  return html.replace(
    /(<p[^>]*>\s*(?:Image credit:|Credit:)[^<]+<\/p>)\s*\1/gi,
    '$1'
  );
}

function dedupeCreditParagraphs(html) {
  return html.replace(
    /(<p[^>]*>\s*(?:<[^>]+>\s*)*(?:Credit:|Image credit:|Ảnh:)[^<]{0,200}<\/p>\s*){2,}/gi,
    (block) => {
      const first = block.match(/<p[^>]*>[\s\S]*?<\/p>/i);
      return first ? first[0] : block;
    }
  );
}

async function fetchPageHtml(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 35000);
  try {
    const res = await fetchFn(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
      },
    });
    clearTimeout(timer);
    if (!res.ok) return { ok: false, html: null, status: res.status };
    const html = await res.text();
    return { ok: true, html, finalUrl: res.url || url };
  } catch (e) {
    clearTimeout(timer);
    return { ok: false, html: null, error: e.message };
  }
}

function readabilityFromHtml(html, pageUrl) {
  try {
    const dom = new JSDOM(html, { url: pageUrl });
    const reader = new Readability(dom.window.document);
    const art = reader.parse();
    if (!art || !art.content) return null;
    const textLen = stripHtmlToText(art.content).length;
    return { title: art.title || '', content: art.content, textLen };
  } catch {
    return null;
  }
}

/**
 * NASA / WordPress: Readability trên toàn trang dễ lấy nhầm sidebar (author, date, social).
 * Chạy Readability trên `.entry-content` / `article` hoặc lấy innerHTML khối main.
 */
function readWordPressMainArticle(html, pageUrl) {
  try {
    const dom = new JSDOM(html, { url: pageUrl });
    const doc = dom.window.document;
    const selectors = [
      'article .entry-content',
      '.entry-content',
      'article .article-body',
      '.article-body',
      '.post-content',
      'article .post-content',
      'main article .entry-content',
      'main .entry-content',
      '[role="main"] .entry-content',
      'main article',
      '[role="main"] article',
      'article',
    ];
    for (const sel of selectors) {
      const el = doc.querySelector(sel);
      if (!el) continue;
      const inner = el.innerHTML || '';
      const tl = stripHtmlToText(inner).length;
      if (tl < 200) continue;

      const wrapped = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><div id="readability-page-1">${inner}</div></body></html>`;
      const subDom = new JSDOM(wrapped, { url: pageUrl });
      const reader = new Readability(subDom.window.document);
      const parsed = reader.parse();
      const pLen = parsed ? stripHtmlToText(parsed.content).length : 0;
      if (parsed && parsed.content && pLen > 120) {
        return { content: parsed.content, textLen: pLen };
      }
      if (tl > 450) {
        return { content: `<div class="crawled-wp-main">${inner}</div>`, textLen: tl };
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Chọn nội dung dài nhất: JSON-LD > khối WP main > Readability full page > RSS.
 */
function pickBestArticleHtml(rssHtml, readabilityArt, jsonLdPlain, wpMainArt) {
  const candidates = [];

  if (jsonLdPlain) {
    const html = wrapPlainArticleBodyAsHtml(jsonLdPlain);
    const len = stripHtmlToText(html).length;
    if (len > 60) candidates.push({ html, len, source: 'jsonld' });
  }

  if (wpMainArt && wpMainArt.content) {
    const len = wpMainArt.textLen || stripHtmlToText(wpMainArt.content).length;
    candidates.push({ html: wpMainArt.content, len, source: 'wp-main' });
  }

  if (readabilityArt && readabilityArt.content) {
    const len = readabilityArt.textLen || stripHtmlToText(readabilityArt.content).length;
    candidates.push({ html: readabilityArt.content, len, source: 'readability' });
  }

  if (rssHtml) {
    const len = stripHtmlToText(rssHtml).length;
    candidates.push({ html: rssHtml, len, source: 'rss' });
  }

  if (candidates.length === 0) return { html: '', source: 'none' };

  candidates.sort((a, b) => b.len - a.len);
  const best = candidates[0];
  return { html: sanitizeArticleHtml(best.html), source: best.source };
}

async function ensureNewsForum() {
  let forum = await Forum.findOne({ slug: 'tin-thien-van' });
  if (!forum) forum = await Forum.findOne({ isNews: true });
  if (!forum) {
    forum = await Forum.create({
      slug: 'tin-thien-van',
      title: 'Tin thiên văn',
      description: 'Tin tức thiên văn — tổng hợp từ các nguồn uy tín.',
      icon: '🌌',
      order: 0,
      isNews: true,
    });
    console.log('Đã tạo forum tin-thien-van');
  }
  return forum;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Thiếu MONGODB_URI trong .env');
    process.exit(1);
  }

  const fetchFull = String(process.env.CRAWL_FETCH_FULL || 'false').toLowerCase() === 'true';
  const fetchOgIfMissing = String(process.env.CRAWL_FETCH_OG_IMAGE || 'true').toLowerCase() !== 'false';
  const maxItems = Math.min(200, Math.max(1, parseInt(process.env.CRAWL_MAX_ITEMS || '25', 10) || 25));
  const delayMs = Math.max(0, parseInt(process.env.CRAWL_DELAY_MS || '900', 10) || 0);

  const feedUrls = process.env.CRAWL_RSS_FEEDS
    ? process.env.CRAWL_RSS_FEEDS.split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : DEFAULT_FEEDS;

  await mongoose.connect(uri);
  console.log('Đã kết nối MongoDB');

  const forum = await ensureNewsForum();
  const parser = new Parser({
    customFields: {
      item: [
        ['media:content', 'mediaContent', { keepArray: true }],
        ['media:thumbnail', 'mediaThumbnail'],
        ['dc:subject', 'dcSubject'],
      ],
    },
  });

  let created = 0;
  let skipped = 0;
  let errors = 0;

  outer: for (const feedUrl of feedUrls) {
    let feed;
    try {
      feed = await parser.parseURL(feedUrl);
    } catch (e) {
      console.error(`Lỗi đọc feed ${feedUrl}:`, e.message);
      errors += 1;
      continue;
    }

    const sourceLabel = (feed.title || '').trim() || new URL(feedUrl).hostname;

    for (const item of feed.items || []) {
      if (created >= maxItems) break outer;

      const link = item.link || item.guid;
      if (!link || !/^https?:\/\//i.test(String(link))) continue;

      const dup = await Post.findOne({ sourceUrl: link }).lean();
      if (dup) {
        skipped += 1;
        continue;
      }

      const title = (item.title || 'Không tiêu đề').slice(0, 500);
      const rssHtml = rssItemHtml(item);
      const rssCategories = rssItemCategories(item);
      const pubRaw = item.pubDate || item.isoDate;
      const publishedAt = pubRaw ? new Date(pubRaw) : new Date();

      let contentHtml = '';
      let contentSource = 'rss';
      let imageUrl = null;
      let isExternalArticle = false;

      if (!fetchFull) {
        const excerpt = rssPlainExcerpt(item);
        const textLen = excerpt.length;
        if (textLen < 25) {
          console.warn(`Bỏ qua (tóm tắt quá ngắn): ${link}`);
          skipped += 1;
          continue;
        }
        contentHtml = wrapPlainArticleBodyAsHtml(excerpt);
        contentSource = 'rss-structured';
        imageUrl = rssExtractImage(item, rssHtml);
        if (!imageUrl && fetchOgIfMissing) {
          if (delayMs) await sleep(delayMs);
          imageUrl = await fetchOgImageOnly(link);
        }
        isExternalArticle = true;
      } else {
        contentHtml = rssHtml;
        imageUrl = pickImageUrl({ pageHtml: rssHtml, articleHtml: rssHtml, rssHtml });

        if (delayMs) await sleep(delayMs);
        const page = await fetchPageHtml(link);
        if (page.ok && page.html) {
          const jsonLdBody = extractArticleBodyFromJsonLd(page.html);
          const art = readabilityFromHtml(page.html, link);
          const wpMain = readWordPressMainArticle(page.html, link);
          const picked = pickBestArticleHtml(rssHtml, art, jsonLdBody, wpMain);
          contentHtml = picked.html;
          contentSource = picked.source;

          imageUrl = pickImageUrl({
            pageHtml: page.html,
            articleHtml: contentHtml,
            rssHtml,
          });
        } else {
          const picked = pickBestArticleHtml(rssHtml, readabilityFromHtml(rssHtml, link), null, null);
          contentHtml = picked.html;
          contentSource = picked.source;
        }
        isExternalArticle = false;
      }

      const textLen = stripHtmlToText(contentHtml).length;
      if (textLen < 40) {
        console.warn(`Bỏ qua (quá ngắn): ${link}`);
        skipped += 1;
        continue;
      }

      try {
        await Post.create({
          forumId: forum._id,
          authorId: 'system-crawler',
          authorName: 'Tổng hợp',
          title,
          content: clipContent(contentHtml),
          sourceUrl: link,
          sourceName: sourceLabel,
          publishedAt,
          imageUrl: imageUrl || null,
          isCrawled: true,
          isExternalArticle,
          rssCategories,
        });
        await Forum.findByIdAndUpdate(forum._id, { $inc: { postCount: 1 } });
        created += 1;
        const tag = isExternalArticle
          ? '[link-out]'
          : contentSource === 'jsonld'
            ? '[jsonld]'
            : contentSource === 'wp-main'
              ? '[wp]'
              : contentSource === 'readability'
                ? '[read]'
                : '[rss]';
        console.log(`${tag} ${title.slice(0, 72)}${title.length > 72 ? '…' : ''}`);
      } catch (e) {
        if (e.code === 11000) {
          skipped += 1;
        } else {
          console.error('Lỗi ghi DB:', e.message, link);
          errors += 1;
        }
      }
    }
  }

  console.log(`\nXong: tạo mới=${created}, bỏ qua/trùng=${skipped}, lỗi=${errors}`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
