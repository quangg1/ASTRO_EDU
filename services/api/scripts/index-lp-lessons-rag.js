#!/usr/bin/env node
/**
 * Phase 0.5 — index bài LP đầu tiên vào RAG (services/ai /knowledge/append).
 * node services/api/scripts/index-lp-lessons-rag.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const { collectLpLessons } = require('../features/learning-path/lib/collectLpLessons');

/** 0 = index all lessons */
const MAX_LESSONS = Number(process.env.LP_RAG_INDEX_LIMIT || 0);
/** Bài chỉ có tiêu đề vẫn index nếu >= ngưỡng này (mặc định 24). */
const MIN_CHARS = Number(process.env.LP_RAG_MIN_CHARS || 24);
const AI_URL = (process.env.AI_SERVICE_URL || 'http://127.0.0.1:5005').replace(/\/$/, '');
const TOKEN = (process.env.KNOWLEDGE_ADMIN_TOKEN || '').trim();

function stripHtml(s) {
  return String(s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function lessonText(lesson) {
  const parts = [lesson.titleVi || lesson.title || '', lesson.body || ''];
  for (const sec of lesson.sections || []) {
    parts.push(sec.title, sec.subtitle, sec.text, sec.content);
    if (Array.isArray(sec.items)) parts.push(sec.items.join('\n'));
  }
  return stripHtml(parts.filter(Boolean).join('\n\n')).slice(0, 12000);
}

async function aiPost(path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  const res = await fetch(`${AI_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || data.error || res.statusText);
  return data;
}

async function appendChunk(text, source) {
  await aiPost('/knowledge/delete-prefix', { source_prefix: source }).catch(() => {});
  return aiPost('/knowledge/append', { text, source });
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Thiếu MONGODB_URI');
    process.exit(1);
  }
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const doc = await db.collection('learningpaths').findOne({ slug: 'main' });
  if (!doc?.modules?.length) {
    console.error('Không tìm thấy LearningPath slug=main');
    process.exit(1);
  }
  const lessons = collectLpLessons(doc);
  const batch = MAX_LESSONS > 0 ? lessons.slice(0, MAX_LESSONS) : lessons;
  console.log(`Indexing ${batch.length} / ${lessons.length} LP lessons → ${AI_URL}`);
  let ok = 0;
  let skippedShort = 0;
  for (const { mod, node, lesson, depth } of batch) {
    const text = lessonText(lesson);
    if (text.length < MIN_CHARS) {
      skippedShort += 1;
      continue;
    }
    const source = `lp/${lesson.id}`;
    const chunk =
      `# ${lesson.titleVi || lesson.id}\n` +
      `module: ${mod.id} node: ${node.id}${depth ? ` depth: ${depth}` : ''}\n\n${text}`;
    try {
      await appendChunk(chunk, source);
      ok += 1;
      console.log(`  ✓ ${lesson.id}`);
    } catch (e) {
      console.warn(`  ✗ ${lesson.id}:`, e.message);
    }
  }
  if (skippedShort) {
    console.log(
      `Skipped ${skippedShort} lessons (nội dung < ${MIN_CHARS} ký tự — thêm body/sections trong Studio).`,
    );
  }
  console.log(`Done: ${ok} chunks indexed.`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
