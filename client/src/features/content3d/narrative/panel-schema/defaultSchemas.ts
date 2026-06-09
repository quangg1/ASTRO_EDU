import type { NarrativeFieldSlot, NarrativePanelSchema } from '@/features/content3d/narrative/panel-schema/types'

function slot(
  path: string,
  labelVi: string,
  extra?: Partial<NarrativeFieldSlot>,
): NarrativeFieldSlot {
  return { id: path.replace(/\./g, '_'), path, labelVi, ...extra }
}

/** Trái Đất — phân loại địa chất chuẩn + khí quyển sinh học. */
export const EARTH_PANEL_SCHEMA: NarrativePanelSchema = {
  version: 1,
  timelineTitleVi: 'Dòng thời gian',
  addBeatLabelVi: 'Thời kỳ',
  previewHeroSubtitlePath: 'environment.eon',
  sections: [
    {
      id: 'identity',
      titleVi: 'Danh tính thời kỳ',
      placement: 'identity',
      fields: [
        slot('name', 'Tên (VI)'),
        slot('nameEn', 'Tên (EN)'),
        slot('icon', 'Biểu tượng'),
        slot('accentColor', 'Màu nhấn'),
        slot('ageLabelVi', 'Nhãn thời gian hiển thị'),
        slot('timeMa', 'Tuổi bắt đầu (Ma)'),
        slot('timeMaEnd', 'Tuổi kết thúc (Ma)'),
      ],
    },
    {
      id: 'geology',
      titleVi: 'Phân loại địa chất (Earth)',
      placement: 'identity',
      fields: [
        slot('environment.eon', 'Đại', { showInPreview: 'subtitle' }),
        slot('environment.era', 'Kỷ'),
        slot('environment.period', 'Kỳ'),
        slot('environment.epoch', 'Tầng'),
      ],
    },
    {
      id: 'panel-copy',
      titleVi: 'Nội dung panel phải',
      placement: 'panel-copy',
      fields: [
        slot('panel.descriptionVi', 'Mô tả chính', { showInPreview: 'body', rows: 4 }),
        slot('panel.compareNoteVi', 'So với hiện tại / bối cảnh', { showInPreview: 'compare', rows: 2 }),
        slot('panel.environmentNoteVi', 'Ghi chú môi trường', { rows: 2 }),
        slot('panel.surfaceTempNoteVi', 'Ghi chú nhiệt', { rows: 2 }),
      ],
    },
    {
      id: 'atmosphere',
      titleVi: 'Khí quyển & khí hậu (badge)',
      placement: 'environment',
      fields: [
        slot('environment.confidence', 'Độ tin cậy'),
        slot('environment.liquidWater', 'Thủy văn bề mặt', { showInPreview: 'badge' }),
        slot('environment.volcanism', 'Núi lửa', { showInPreview: 'badge' }),
        slot('environment.o2Percent', 'O₂', { showInPreview: 'badge' }),
        slot('environment.co2Ppm', 'CO₂', { showInPreview: 'badge' }),
        slot('environment.dayLengthHours', 'Độ dài ngày', { showInPreview: 'badge' }),
        slot('environment.surfaceTempMinC', 'Nhiệt min (°C)'),
        slot('environment.surfaceTempMaxC', 'Nhiệt max (°C)'),
      ],
    },
    {
      id: 'globe',
      titleVi: 'Globe & shader (3D)',
      placement: 'visual',
      fields: [
        slot('visual.globeTint', 'Màu bề mặt'),
        slot('visual.atmosphereColor', 'Màu khí quyển'),
        slot('visual.atmosphereThickness', 'Vỏ khí quyển'),
        slot('visual.waterCoverage', 'Độ phủ nước'),
        slot('visual.dustOpacity', 'Bụi / sương'),
        slot('visual.volcanicGlow', 'Núi lửa (glow)'),
        slot('visual.textureUrl', 'Texture tuỳ chọn'),
        slot('visual.cloudTextureUrl', 'Mây (texture)'),
      ],
    },
  ],
}

/** Hành tinh đá — áp suất / nước / bụi (không dùng Eon/Era Earth). */
export const PLANETARY_PANEL_SCHEMA: NarrativePanelSchema = {
  version: 1,
  timelineTitleVi: 'Dòng thời gian',
  addBeatLabelVi: 'Thời kỳ',
  previewHeroSubtitlePath: 'ageLabelVi',
  sections: [
    {
      id: 'identity',
      titleVi: 'Danh tính thời kỳ',
      placement: 'identity',
      fields: [
        slot('name', 'Tên giai đoạn'),
        slot('nameEn', 'Tên (EN)'),
        slot('icon', 'Biểu tượng'),
        slot('accentColor', 'Màu nhấn panel'),
        slot('ageLabelVi', 'Khoảng thời gian (nhãn)', { showInPreview: 'subtitle' }),
        slot('timeMa', 'Tuổi đại diện (Ma)'),
        slot('timeMaEnd', 'Biên dưới (Ma)'),
      ],
    },
    {
      id: 'panel-copy',
      titleVi: 'Panel thông tin (Explore)',
      placement: 'panel-copy',
      fields: [
        slot('panel.descriptionVi', 'Mô tả giai đoạn', { showInPreview: 'body', rows: 4 }),
        slot('panel.compareNoteVi', 'So với Trái Đất', { showInPreview: 'compare', rows: 2 }),
        slot('panel.environmentNoteVi', 'Môi trường bề mặt', { rows: 2 }),
        slot('panel.pressureCitationVi', 'Nguồn & trích dẫn áp suất', { rows: 3 }),
        slot('panel.surfaceTempNoteVi', 'Ghi chú nhiệt độ', { rows: 2 }),
      ],
    },
    {
      id: 'geology',
      titleVi: 'Phân vị địa chất (Sao Hỏa)',
      placement: 'identity',
      fields: [
        slot('environment.eon', 'Hành tinh / đại', { showInPreview: 'subtitle' }),
        slot('environment.era', 'Kỷ / thời đại'),
        slot('environment.period', 'Kỳ / giai đoạn'),
      ],
    },
    {
      id: 'atmosphere',
      titleVi: 'Khí quyển & bề mặt (badge)',
      placement: 'environment',
      fields: [
        slot('environment.confidence', 'Độ tin cậy khoa học'),
        slot('environment.liquidWater', 'Nước lỏng (định tính)', { showInPreview: 'badge' }),
        slot('environment.volcanism', 'Hoạt động núi lửa', { showInPreview: 'badge' }),
        slot('environment.surfacePressureRepresentativePa', 'Áp suất đại diện', { showInPreview: 'badge' }),
        slot('environment.surfacePressureLowPa', 'Áp min'),
        slot('environment.surfacePressureHighPa', 'Áp max'),
        slot('environment.surfacePressureBasis', 'Cơ sở số liệu áp'),
        slot('environment.surfaceTempMinC', 'Nhiệt min (°C)'),
        slot('environment.surfaceTempMaxC', 'Nhiệt max (°C)'),
        slot('environment.dustActivity', 'Bão bụi', { showInPreview: 'badge' }),
      ],
    },
    {
      id: 'globe',
      titleVi: 'Globe & shader (3D)',
      placement: 'visual',
      fields: [
        slot('visual.globeTint', 'Màu đỏ / bề mặt'),
        slot('visual.atmosphereColor', 'Khí quyển'),
        slot('visual.atmosphereThickness', 'Vỏ khí'),
        slot('visual.waterCoverage', 'Lớp nước cổ'),
        slot('visual.dustOpacity', 'Bụi / haze'),
        slot('visual.volcanicGlow', 'Núi lửa glow'),
        slot('visual.textureUrl', 'Albedo texture'),
      ],
    },
  ],
}

/** Entity mới — nhãn trung tính, có thể đổi tùy ý trong tab Thiết kế panel. */
export const GENERIC_PANEL_SCHEMA: NarrativePanelSchema = {
  version: 1,
  timelineTitleVi: 'Timeline',
  addBeatLabelVi: 'Beat',
  sections: [
    {
      id: 'identity',
      titleVi: 'Danh tính',
      placement: 'identity',
      fields: [
        slot('name', 'Tên'),
        slot('nameEn', 'Tên EN'),
        slot('icon', 'Icon'),
        slot('accentColor', 'Màu accent'),
        slot('ageLabelVi', 'Nhãn thời gian'),
        slot('timeMa', 'timeMa (max)'),
        slot('timeMaEnd', 'timeMaEnd (min)'),
      ],
    },
    {
      id: 'taxonomy',
      titleVi: 'Phân loại (tuỳ chỉnh nhãn)',
      placement: 'identity',
      fields: [
        slot('environment.eon', 'Phân tầng 1'),
        slot('environment.era', 'Phân tầng 2'),
        slot('environment.period', 'Phân tầng 3'),
        slot('environment.epoch', 'Phân tầng 4'),
      ],
    },
    {
      id: 'panel-copy',
      titleVi: 'Nội dung panel',
      placement: 'panel-copy',
      fields: [
        slot('panel.descriptionVi', 'Mô tả', { showInPreview: 'body', rows: 4 }),
        slot('panel.compareNoteVi', 'Bối cảnh', { showInPreview: 'compare', rows: 2 }),
        slot('panel.environmentNoteVi', 'Môi trường', { rows: 2 }),
        slot('panel.pressureCitationVi', 'Trích dẫn / nguồn', { rows: 2 }),
      ],
    },
    {
      id: 'metrics',
      titleVi: 'Chỉ số (badge)',
      placement: 'environment',
      fields: [
        slot('environment.liquidWater', 'Chất lỏng bề mặt', { showInPreview: 'badge' }),
        slot('environment.volcanism', 'Hoạt động núi lửa', { showInPreview: 'badge' }),
        slot('environment.surfaceTempMinC', 'Nhiệt min'),
        slot('environment.surfaceTempMaxC', 'Nhiệt max'),
        slot('environment.o2Percent', 'O₂', { showInPreview: 'badge' }),
        slot('environment.surfacePressureRepresentativePa', 'Áp suất', { showInPreview: 'badge' }),
      ],
    },
    {
      id: 'globe',
      titleVi: 'Globe 3D',
      placement: 'visual',
      fields: [
        slot('visual.globeTint', 'Màu globe'),
        slot('visual.atmosphereColor', 'Khí quyển'),
        slot('visual.atmosphereThickness', 'Vỏ khí'),
        slot('visual.waterCoverage', 'Nước'),
        slot('visual.dustOpacity', 'Bụi'),
        slot('visual.volcanicGlow', 'Glow'),
        slot('visual.textureUrl', 'Texture'),
      ],
    },
  ],
}

export function defaultPanelSchemaForEntity(entityId: string): NarrativePanelSchema {
  if (entityId === 'planet-earth') return structuredClone(EARTH_PANEL_SCHEMA)
  if (entityId.startsWith('planet-')) return structuredClone(PLANETARY_PANEL_SCHEMA)
  return structuredClone(GENERIC_PANEL_SCHEMA)
}
