const fetch = require('node-fetch');
const { extractFirstJsonArray, extractFirstJsonObject } = require('./json');

const GROQ_BASE_URL = process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

async function callGroq(systemPrompt, userPrompt, output = 'object') {
  if (!GROQ_API_KEY) return null;
  const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.25,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`groq_failed_${res.status}`);
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content || '';
  if (output === 'array') return extractFirstJsonArray(content);
  return extractFirstJsonObject(content);
}

async function runWithFallback(systemPrompt, userPrompt, output = 'object') {
  let payload = null;
  const providerErrors = [];
  try {
    payload = await callGroq(systemPrompt, userPrompt, output);
  } catch (e) {
    providerErrors.push(`groq:${e.message}`);
  }
  return { payload, providerErrors };
}

module.exports = {
  runWithFallback,
};
