const AstronomyEventTypeKit = require('../models/AstronomyEventTypeKit');

const DEFAULT_TYPE_KITS = {
  moon_phase: {
    typeLabelVi: 'Mặt Trăng',
    legendLabelVi: 'Mặt Trăng',
    legendGroup: 'moon',
    accentColor: '#fbbf24',
    iconKey: 'moon',
    defaultVisibilityLabelVi: 'Quan sát bằng mắt thường khi trời quang',
    defaultObservationTipsVi:
      'Chọn địa điểm tối, tránh ánh sáng nhân tạo. Pha trăng dễ nhìn không cần thiết bị đặc biệt.',
    descriptionHintVi: 'Mô tả pha trăng, thời điểm đỉnh và ý nghĩa quan sát.',
  },
  meteor_shower: {
    typeLabelVi: 'Thiên thạch',
    legendLabelVi: 'Thiên thạch',
    legendGroup: 'meteor',
    accentColor: '#c4b5fd',
    iconKey: 'sparkles',
    defaultVisibilityLabelVi: 'Tốt nhất sau nửa đêm, cần bầu trời tối',
    defaultObservationTipsVi:
      'Nằm ngửa, kiên nhẫn ít nhất 20–30 phút. Không dùng đèn pin trắng — che đèn đỏ nếu cần.',
    descriptionHintVi: 'Tên cụm sao băng, thời điểm đỉnh và điều kiện trăng.',
  },
  lunar_eclipse: {
    typeLabelVi: 'Nguyệt thực',
    legendLabelVi: 'Hành tinh / Nhật thực',
    legendGroup: 'eclipse',
    accentColor: '#fb7185',
    iconKey: 'eclipse',
    defaultVisibilityLabelVi: 'Quan sát bằng mắt thường khi trăng đang mọc',
    defaultObservationTipsVi:
      'Không cần thiết bị. Theo dõi từ khi bóng Trái Đất bắt đầu che Mặt Trăng cho đến hết.',
    descriptionHintVi: 'Loại nguyệt thực, thời gian và mức độ che phủ.',
  },
  solar_eclipse: {
    typeLabelVi: 'Nhật thực',
    legendLabelVi: 'Hành tinh / Nhật thực',
    legendGroup: 'eclipse',
    accentColor: '#fbbf24',
    iconKey: 'sun',
    defaultVisibilityLabelVi: 'Chỉ quan sát an toàn với kính lọc chuyên dụng',
    defaultObservationTipsVi:
      'KHÔNG nhìn trực tiếp Mặt Trời. Chỉ quan sát qua kính lọc ISO 12312-2 hoặc phương pháp chiếu an toàn.',
    descriptionHintVi: 'Loại nhật thực, vùng quan sát và cảnh báo an toàn.',
  },
  planet_highlight: {
    typeLabelVi: 'Hành tinh',
    legendLabelVi: 'Hội tụ',
    legendGroup: 'conjunction',
    accentColor: '#22d3ee',
    iconKey: 'telescope',
    defaultVisibilityLabelVi: 'Quan sát bằng mắt thường hoặc ống nhòm nhẹ',
    defaultObservationTipsVi:
      'Tìm hành tinh sáng trước bình minh hoặc sau hoàng hôn. Ống nhòm giúp thấy chi tiết hơn.',
    descriptionHintVi: 'Hành tinh nào, vị trí trên bầu trời và thời điểm tốt nhất.',
  },
};

function kitToDto(doc) {
  const d = doc.toObject ? doc.toObject() : doc;
  return {
    type: d.type,
    typeLabelVi: d.typeLabelVi,
    legendLabelVi: d.legendLabelVi,
    legendGroup: d.legendGroup,
    accentColor: d.accentColor,
    iconKey: d.iconKey || DEFAULT_TYPE_KITS[d.type]?.iconKey || 'star',
    defaultVisibilityLabelVi: d.defaultVisibilityLabelVi,
    defaultObservationTipsVi: d.defaultObservationTipsVi,
    descriptionHintVi: d.descriptionHintVi,
    updatedAt: d.updatedAt?.toISOString?.() || d.updatedAt,
  };
}

async function ensureTypeKitsSeed() {
  for (const [type, defaults] of Object.entries(DEFAULT_TYPE_KITS)) {
    const existing = await AstronomyEventTypeKit.findOne({ type }).lean();
    if (existing) continue;
    await AstronomyEventTypeKit.create({ type, ...defaults });
  }
}

async function listTypeKits() {
  await ensureTypeKitsSeed();
  const rows = await AstronomyEventTypeKit.find().sort({ type: 1 }).lean();
  const map = Object.fromEntries(rows.map((r) => [r.type, kitToDto(r)]));
  for (const type of Object.keys(DEFAULT_TYPE_KITS)) {
    if (!map[type]) map[type] = { type, ...DEFAULT_TYPE_KITS[type] };
  }
  return map;
}

async function getTypeKitMap() {
  return listTypeKits();
}

async function updateTypeKit(type, body, actorUserId) {
  await ensureTypeKitsSeed();
  const allowed = Object.keys(DEFAULT_TYPE_KITS);
  if (!allowed.includes(type)) throw new Error('Loại sự kiện không hợp lệ');

  const fields = [
    'typeLabelVi',
    'legendLabelVi',
    'legendGroup',
    'accentColor',
    'iconKey',
    'defaultVisibilityLabelVi',
    'defaultObservationTipsVi',
    'descriptionHintVi',
  ];
  const patch = {};
  for (const f of fields) {
    if (body?.[f] !== undefined) patch[f] = body[f];
  }
  patch.updatedBy = actorUserId ? String(actorUserId) : null;

  const doc = await AstronomyEventTypeKit.findOneAndUpdate(
    { type },
    { $set: patch },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  return kitToDto(doc);
}

function resolveEventContent(doc, kitMap) {
  const kit = kitMap?.[doc.type] || DEFAULT_TYPE_KITS[doc.type] || {};
  const summary = String(doc.summaryVi || '').trim();
  const subtitleVi = String(doc.subtitleVi || '').trim() || summary.split(/[.!?\n]/)[0]?.trim() || '';

  return {
    typeLabelVi: String(doc.typeLabelVi || kit.typeLabelVi || '').trim() || 'Sự kiện',
    subtitleVi,
    subtitleEn: String(doc.subtitleEn || '').trim(),
    descriptionVi: String(doc.descriptionVi || '').trim() || summary,
    observationTipsVi:
      String(doc.observationTipsVi || '').trim() || String(kit.defaultObservationTipsVi || '').trim(),
    visibilityLabelVi:
      String(doc.visibilityLabelVi || '').trim() ||
      String(kit.defaultVisibilityLabelVi || '').trim() ||
      'Sự kiện thiên văn toàn cầu',
    legendLabelVi: String(kit.legendLabelVi || kit.typeLabelVi || '').trim(),
    legendGroup: kit.legendGroup || 'moon',
    accentColor: kit.accentColor || null,
    iconKey: kit.iconKey || DEFAULT_TYPE_KITS[doc.type]?.iconKey || 'star',
  };
}

module.exports = {
  DEFAULT_TYPE_KITS,
  ensureTypeKitsSeed,
  listTypeKits,
  getTypeKitMap,
  updateTypeKit,
  kitToDto,
  resolveEventContent,
};
