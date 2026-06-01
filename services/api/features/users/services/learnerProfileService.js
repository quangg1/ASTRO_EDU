const mongoose = require('mongoose');
const LearnerProfile = require('../models/LearnerProfile');

const MAX_BIO = 2000;
const MAX_INTEREST_LEN = 48;
const MAX_EDU = 6;

function sanitizeEducation(list) {
  if (!Array.isArray(list)) return [];
  return list
    .slice(0, MAX_EDU)
    .map((e) => ({
      school: String(e?.school || '').trim().slice(0, 200),
      degree: String(e?.degree || '').trim().slice(0, 120),
      field: String(e?.field || '').trim().slice(0, 200),
      yearEnd:
        e?.yearEnd != null && !Number.isNaN(Number(e.yearEnd))
          ? Math.min(2100, Math.max(1950, Number(e.yearEnd)))
          : null,
    }))
    .filter((e) => e.school || e.degree || e.field);
}

function sanitizeInterests(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  const seen = new Set();
  for (const raw of list) {
    const s = String(raw || '').trim().slice(0, MAX_INTEREST_LEN);
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= 16) break;
  }
  return out;
}

function formatLearnerProfile(doc) {
  if (!doc) {
    return {
      bio: '',
      location: '',
      education: [],
      interests: [],
      isPublic: true,
    };
  }
  return {
    bio: doc.bio || '',
    location: doc.location || '',
    education: Array.isArray(doc.education) ? doc.education : [],
    interests: Array.isArray(doc.interests) ? doc.interests : [],
    isPublic: doc.isPublic !== false,
    updatedAt: doc.updatedAt?.toISOString?.() || null,
  };
}

async function getOrCreateLearnerProfile(userId) {
  const uid = String(userId);
  let doc = await LearnerProfile.findOne({ userId: uid }).lean();
  if (!doc) {
    doc = (
      await LearnerProfile.create({
        userId: uid,
        bio: '',
        location: '',
        education: [],
        interests: [],
        isPublic: true,
      })
    ).toObject();
  }
  return formatLearnerProfile(doc);
}

async function getLearnerProfileForPublic(userId) {
  const doc = await LearnerProfile.findOne({ userId: String(userId) }).lean();
  if (!doc || doc.isPublic === false) {
    return null;
  }
  return formatLearnerProfile(doc);
}

async function updateMyLearnerProfile(userId, body) {
  const patch = {};
  if (typeof body.bio === 'string') {
    patch.bio = body.bio.trim().slice(0, MAX_BIO);
  }
  if (typeof body.location === 'string') {
    patch.location = body.location.trim().slice(0, 120);
  }
  if (body.education !== undefined) {
    patch.education = sanitizeEducation(body.education);
  }
  if (body.interests !== undefined) {
    patch.interests = sanitizeInterests(body.interests);
  }
  if (typeof body.isPublic === 'boolean') {
    patch.isPublic = body.isPublic;
  }

  const doc = await LearnerProfile.findOneAndUpdate(
    { userId: String(userId) },
    { $set: patch },
    { new: true, upsert: true, runValidators: true },
  ).lean();

  return formatLearnerProfile(doc);
}

module.exports = {
  getOrCreateLearnerProfile,
  getLearnerProfileForPublic,
  updateMyLearnerProfile,
  formatLearnerProfile,
};
