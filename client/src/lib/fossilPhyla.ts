/**
 * Chủng loại hóa thạch (ngành - phylum) dùng trong app.
 * Màu dùng cho legend và điểm 3D; nameVi + description cho chú thích UI.
 * Các phylum khác (từ PBDB) sẽ dùng tên gốc và mô tả "Nhóm sinh vật cổ."
 */

export interface PhylumInfo {
  nameVi: string
  description: string
  color: string
}

export const PHYLUM_INFO: Record<string, PhylumInfo> = {
  Arthropoda: {
    nameVi: 'Động vật Chân khớp',
    description: 'Bao gồm côn trùng, giáp xác, nhện, trilobite. Có bộ xương ngoài và chân đốt.',
    color: '#ff6b6b',
  },
  Mollusca: {
    nameVi: 'Động vật Thân mềm',
    description: 'Ốc, sò, mực, bạch tuộc. Thân mềm, nhiều loài có vỏ đá vôi.',
    color: '#4ecdc4',
  },
  Chordata: {
    nameVi: 'Động vật Có dây sống',
    description: 'Cá, lưỡng cư, bò sát, chim, thú. Có dây sống hoặc xương sống.',
    color: '#45b7d1',
  },
  Brachiopoda: {
    nameVi: 'Động vật Tay cuộn',
    description: 'Sinh vật biển hai mảnh vỏ, bám đáy. Rất phổ biến trong hóa thạch cổ.',
    color: '#f9ca24',
  },
  Echinodermata: {
    nameVi: 'Động vật Da gai',
    description: 'Sao biển, cầu gai, hải sâm. Cơ thể đối xứng tỏa tròn, thường có gai.',
    color: '#a55eea',
  },
  Cnidaria: {
    nameVi: 'Động vật Thích ty',
    description: 'San hô, sứa, hải quỳ. Cơ thể đơn giản, có tế bào gai.',
    color: '#ff9ff3',
  },
  Bryozoa: {
    nameVi: 'Động vật Rêu',
    description: 'Colony nhỏ bám đáy biển, dạng rêu. Phổ biến từ Ordovician.',
    color: '#26de81',
  },
  Porifera: {
    nameVi: 'Động vật Thân lỗ',
    description: 'Bọt biển. Cơ thể đơn bào đơn giản, lọc nước.',
    color: '#00b894',
  },
  Foraminifera: {
    nameVi: 'Trùng lỗ',
    description: 'Động vật đơn bào có vỏ, thường vỏ đá vôi. Chỉ thị môi trường cổ.',
    color: '#fd79a8',
  },
  Radiolaria: {
    nameVi: 'Trùng phóng xạ',
    description: 'Động vật đơn bào với bộ xương silica. Sống trôi nổi ở biển.',
    color: '#e17055',
  },
  Angiospermae: {
    nameVi: 'Thực vật Hạt kín',
    description: 'Thực vật có hoa, hạt nằm trong quả. Xuất hiện từ kỷ Creta.',
    color: '#55efc4',
  },
  Pteridophyta: {
    nameVi: 'Dương xỉ',
    description: 'Dương xỉ, thực vật bào tử. Phổ biến trong các kỷ cổ.',
    color: '#00cec9',
  },
  Hemichordata: {
    nameVi: 'Động vật Nửa dây sống',
    description: 'Nhóm gần Chordata, sống biển. Ví dụ: acorn worm.',
    color: '#fab1a0',
  },
  Nematoda: {
    nameVi: 'Giun tròn',
    description: 'Giun tròn, ký sinh hoặc tự do. Ít hóa thạch do cơ thể mềm.',
    color: '#dfe6e9',
  },
  default: {
    nameVi: 'Khác',
    description: 'Nhóm sinh vật cổ khác trong cơ sở dữ liệu hóa thạch.',
    color: '#9ca3af',
  },
}

/** Metadata từ API (MongoDB). Nếu có thì ưu tiên dùng thay PHYLUM_INFO. */
export type PhylumMetadataMap = Record<string, { nameVi: string; description: string; color: string }> | null

/** Màu theo phylum. Ưu tiên metadata từ MongoDB, fallback PHYLUM_INFO. */
export function getPhylumColor(phylum: string, metadata?: PhylumMetadataMap): string {
  if (metadata && metadata[phylum]?.color) return metadata[phylum].color
  return PHYLUM_INFO[phylum]?.color ?? PHYLUM_INFO.default.color
}

/** Thông tin hiển thị cho phylum (tên Việt + mô tả). Ưu tiên metadata từ MongoDB. */
export function getPhylumInfo(phylum: string, metadata?: PhylumMetadataMap): PhylumInfo {
  if (metadata && metadata[phylum]) {
    const m = metadata[phylum]
    return {
      nameVi: m.nameVi || phylum || 'Chưa xác định',
      description: m.description || PHYLUM_INFO.default.description,
      color: m.color || PHYLUM_INFO.default.color,
    }
  }
  return PHYLUM_INFO[phylum] ?? { ...PHYLUM_INFO.default, nameVi: phylum || 'Chưa xác định' }
}
