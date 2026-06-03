#!/usr/bin/env node
/**
 * Rebuild RAG đầy đủ cho CosmoLearn:
 *   1. corpus/*.md + seed (ghi đè rag_index.json)
 *   2. Mọi bài Learning Path → source lp/{lessonId}
 *   3. Post cộng đồng (thảo luận + tin RSS NASA) → source community/{postId}
 *
 * Yêu cầu: MONGODB_URI, AI_SERVICE_URL, EMBEDDING_URL đang chạy.
 * Tuỳ chọn: KNOWLEDGE_ADMIN_TOKEN (services/ai/.env + api/.env cùng giá trị).
 *
 *   cd services/api && npm run rag:reindex-full
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const { rebuildFullProjectRagIndex } = require('../features/agent/services/ragIndexService');

async function checkEmbedding() {
  const url = (process.env.EMBEDDING_URL || 'http://127.0.0.1:5004').replace(/\/$/, '');
  try {
    const res = await fetch(`${url}/health`);
    if (!res.ok) throw new Error(res.statusText);
    const data = await res.json().catch(() => ({}));
    console.log(`Embedding OK: ${url} — ${data.model || 'BGE'}`);
  } catch (e) {
    console.error(`Embedding không phản hồi tại ${url}:`, e.message);
    console.error('Chạy: npm run dev:embedding (từ root repo)');
    process.exit(1);
  }
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Thiếu MONGODB_URI trong services/api/.env');
    process.exit(1);
  }

  await checkEmbedding();
  await mongoose.connect(uri);
  console.log('MongoDB connected — bắt đầu rebuild RAG project…\n');

  const summary = await rebuildFullProjectRagIndex({
    onProgress(phase, data) {
      if (phase === 'rebuild_corpus') console.log(data.message);
      if (phase === 'rebuild_corpus_done') {
        console.log(
          `  corpus/seed: ${data.chunks ?? '?'} chunks, ${data.corpus_files ?? 0} file .md\n`,
        );
      }
      if (phase === 'lp') {
        console.log(
          `  LP: ${data.done}/${data.total} (indexed ${data.ok}, skip ${data.skip}, fail ${data.fail})`,
        );
      }
      if (phase === 'community') {
        console.log(
          `  Community: ${data.done}/${data.total} (indexed ${data.ok}, skip ${data.skip}, fail ${data.fail})`,
        );
      }
      if (phase === 'reload') console.log(data.message);
      if (phase === 'done') {
        console.log('\n=== Hoàn tất ===');
        console.log(JSON.stringify(data, null, 2));
      }
    },
  });

  console.log(`\nTổng chunk trong index: ${summary.index?.chunk_count ?? '?'}`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
