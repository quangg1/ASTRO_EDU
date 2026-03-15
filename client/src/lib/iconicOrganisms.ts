/**
 * Sinh vật tiêu biểu theo từng thời kỳ (Earth History stage).
 * Dùng để hiển thị khi user chọn một thời kỳ: "Sinh vật nổi bật" của thời kỳ đó.
 *
 * Nguồn tìm sinh vật tiêu biểu:
 * - Sách giáo khoa / tài liệu cổ sinh: Cambrian = Trilobita, Anomalocaris; Jurassic = Khủng long, v.v.
 * - PBDB (paleobiodb.org): tra cứu taxa phổ biến theo thời kỳ.
 * - Wikipedia: danh sách sinh vật theo kỷ địa chất.
 *
 * Resources để mô phỏng / hiển thị:
 * - Tối thiểu: name + nameVi + description (text) – không cần thêm file.
 * - Hình ảnh: imageUrl – có thể dùng Wikipedia Commons, PhyloPic (phylopic.org), hoặc ảnh tự host.
 * - 3D: sau này có thể thêm modelUrl (GLB) từ Sketchfab, MorphoSource, hoặc tự tạo.
 */

export interface IconicOrganism {
  /** Tên khoa học hoặc tên thường gọi */
  name: string
  /** Tên tiếng Việt */
  nameVi: string
  /** Mô tả ngắn (1–2 câu) */
  description: string
  /** URL ảnh minh họa (Wikipedia Commons, PhyloPic, v.v.) – tùy chọn */
  imageUrl?: string
  /** Đường dẫn model 3D GLB trong public/models – tùy chọn */
  modelUrl?: string
}

/** Sinh vật tiêu biểu theo stage id (0–21, khớp earthHistoryData) */
export const ICONIC_ORGANISMS_BY_STAGE: Record<number, IconicOrganism[]> = {
  0: [],
  1: [],
  2: [],
  3: [],
  4: [],
  5: [
    { name: 'Sự sống sơ khai (?)', nameVi: 'Sự sống sơ khai (?)', description: 'Có thể đã có vi sinh vật trong đại dương; chưa có hóa thạch rõ ràng.' },
  ],
  6: [
    { name: 'Cyanobacteria', nameVi: 'Vi khuẩn lam', description: 'Sinh vật quang hợp đầu tiên, tạo ra stromatolite (thạch trầm tích).' },
  ],
  7: [
    { name: 'Stromatolites', nameVi: 'Stromatolite', description: 'Cấu trúc do vi khuẩn lam tạo ra, thống trị đại dương nông.', modelUrl: '/models/stromatolite_pri_50270.glb' },
  ],
  8: [
    { name: 'Ediacaran biota', nameVi: 'Sinh vật Ediacara', description: 'Sinh vật đa bào bí ẩn trước Cambrian; nhiều dạng thân mềm.', modelUrl: '/models/charnia_-_ediacaran_biota.glb' },
  ],
  9: [
    { name: 'Trilobita', nameVi: 'Bọ ba thùy', description: 'Động vật chân đốt biển, rất đa dạng trong Cambrian.', modelUrl: '/models/model_of_a_trilobite.glb' },
    { name: 'Anomalocaris', nameVi: 'Anomalocaris', description: 'Động vật ăn thịt đầu bảng, kích thước lớn, sống ở biển.', modelUrl: '/models/anomalocaris_3d_model.glb' },
    { name: 'Hallucigenia', nameVi: 'Hallucigenia', description: 'Sinh vật kỳ lạ nhiều gai, từng bị hiểu nhầm lộn đầu đuôi.', modelUrl: '/models/hallucigenia_-_bioluminescence.glb' },
  ],
  10: [
    { name: 'Nautiloids', nameVi: 'Ốc anh vũ', description: 'Động vật thân mềm có vỏ, săn mồi trong biển Ordovician.', modelUrl: '/models/nautiloid.glb' },
    { name: 'Graptolites', nameVi: 'Graptolit', description: 'Động vật dạng colony, chỉ thị hóa thạch quan trọng.', modelUrl: '/models/graptolite_palaeodictyota_pri_49831.glb' },
    { name: 'Ostracoderms', nameVi: 'Cá không hàm', description: 'Nhóm cá cổ nhất, da giáp, chưa có hàm.', modelUrl: '/models/orthoceras_downloadable.glb' },
  ],
  11: [
    { name: 'Dunkleosteus', nameVi: 'Cá bọc thép', description: 'Cá săn mồi lớn, đầu bọc giáp, kỷ Devonian.', modelUrl: '/models/dunkleosteus.glb' },
    { name: 'Tiktaalik', nameVi: 'Tiktaalik', description: 'Dạng chuyển tiếp cá – lưỡng cư, vây có xương giống chi.', modelUrl: '/models/tiktaalik.glb' },
    { name: 'Archaeopteris', nameVi: 'Cây dương xỉ cổ', description: 'Cây gỗ đầu tiên, rừng Devonian.', modelUrl: '/models/progymnosperm_archaeopterus_obtusa_cornell_u..glb' },
  ],
  12: [
    { name: 'Meganeura', nameVi: 'Chuồn chuồn khổng lồ', description: 'Côn trùng bay lớn nhất, sải cánh ~70 cm.', modelUrl: '/models/meganeura.glb' },
    { name: 'Arthropleura', nameVi: 'Cuốn chiếu khổng lồ', description: 'Động vật chân đốt trên cạn lớn nhất thời Carboniferous.' },
    { name: 'Lepidodendron', nameVi: 'Cây vảy', description: 'Cây cao thân cột, góp phần tạo than đá.', modelUrl: '/models/lepidodendron.glb' },
  ],
  13: [
    { name: 'Dimetrodon', nameVi: 'Dimetrodon', description: 'Động vật giống thằn lằn (không phải khủng long), có vây lưng.', modelUrl: '/models/dimetrodon.glb' },
    { name: 'Gorgonopsids', nameVi: 'Gorgonopsia', description: 'Thú bò sát săn mồi hàng đầu cuối Permian.', modelUrl: '/models/primeval_-_gorgonopsid.glb' },
  ],
  14: [
    { name: 'Eoraptor', nameVi: 'Khủng long sơ khai', description: 'Một trong những khủng long đầu tiên, nhỏ, ăn thịt.', modelUrl: '/models/dino_hunter_deadly_shores_eoraptor.glb' },
    { name: 'Plateosaurus', nameVi: 'Khủng long chân thằn lằn', description: 'Khủng long ăn thực vật kích thước lớn, kỷ Triassic.', modelUrl: '/models/jwa_plateosaurus.glb' },
    { name: 'Coelophysis', nameVi: 'Coelophysis', description: 'Khủng long theropod nhỏ thời Triassic, săn mồi.', modelUrl: '/models/coelophysis.glb' },
    { name: 'Pterosaurs', nameVi: 'Thằn lằn có cánh', description: 'Động vật có xương sống biết bay đầu tiên.' },
  ],
  15: [
    { name: 'Stegosaurus', nameVi: 'Khủng long phiến sừng', description: 'Khủng long ăn cỏ có phiến xương trên lưng.', modelUrl: '/models/stegosaurus_sf.glb' },
    { name: 'Allosaurus', nameVi: 'Khủng long ăn thịt', description: 'Kẻ săn mồi lớn thời Jurassic.', modelUrl: '/models/allosaurus.glb' },
    { name: 'Archaeopteryx', nameVi: 'Chim cổ', description: 'Hóa thạch chuyển tiếp khủng long – chim nổi tiếng.', modelUrl: '/models/ark_archaeopteryx.glb' },
    { name: 'Diplodocus', nameVi: 'Khủng long cổ dài', description: 'Khủng long chân thằn lằn cổ dài, ăn thực vật.', modelUrl: '/models/diplodocus.glb' },
  ],
  16: [
    { name: 'Tyrannosaurus rex', nameVi: 'Khủng long bạo chúa', description: 'Khủng long ăn thịt lớn nhất, cuối Cretaceous.', modelUrl: '/models/tyrannosaurus_rex.glb' },
    { name: 'Triceratops', nameVi: 'Khủng long ba sừng', description: 'Khủng long ăn cỏ có sừng và diềm cổ.', modelUrl: '/models/triceratops.glb' },
    { name: 'Velociraptor', nameVi: 'Khủng long săn mồi', description: 'Khủng long nhỏ nhanh nhẹn, có lông vũ.', modelUrl: '/models/velociraptor.glb' },
    { name: 'Spinosaurus', nameVi: 'Khủng long gai lưng', description: 'Khủng long ăn thịt lớn, có thể sống bán thủy sinh.', modelUrl: '/models/spinosaurus.glb' },
    { name: 'Kaprosuchus', nameVi: 'Cá sấu mõm', description: 'Crocodyliform săn mồi trên cạn, cuối Cretaceous.', modelUrl: '/models/kaprosuchus.glb' },
    { name: 'Angiosperms', nameVi: 'Thực vật có hoa', description: 'Thực vật có hoa bùng nổ đa dạng trong Cretaceous.' },
  ],
  17: [
    { name: 'Chicxulub impact', nameVi: 'Sự kiện Chicxulub', description: 'Thiên thạch gây tuyệt chủng; không phải sinh vật nhưng định hình sự sống sau này.' },
  ],
  18: [
    { name: 'Basilosaurus', nameVi: 'Cá voi cổ', description: 'Cá voi sơ khai, dài, sống ở biển.', modelUrl: '/models/basilosaurus.glb' },
    { name: 'Early primates', nameVi: 'Linh trưởng sơ khai', description: 'Tổ tiên của khỉ, vượn và con người.' },
    { name: 'Giant birds (Gastornis)', nameVi: 'Chim khổng lồ', description: 'Chim không bay săn mồi sau khi khủng long tuyệt chủng.', modelUrl: '/models/gastornis_from_unity.glb' },
  ],
  19: [
    { name: 'Australopithecus', nameVi: 'Vượn người phương nam', description: 'Hominin đi bằng hai chân, tổ tiên của chi Homo.', modelUrl: '/models/monkey__australopithecus_stone_bust.glb' },
    { name: 'Megafauna', nameVi: 'Động vật lớn', description: 'Voi, lười đất, ma mút… thống trị đồng cỏ.', modelUrl: '/models/megatherium.glb' },
  ],
  20: [
    { name: 'Homo sapiens', nameVi: 'Người hiện đại', description: 'Loài người di cư ra khỏi châu Phi, đến mọi châu lục.' },
    { name: 'Mammoth', nameVi: 'Ma mút', description: 'Voi lông dài, sống trong kỷ băng hà.' },
    { name: 'Neanderthals', nameVi: 'Người Neanderthal', description: 'Họ hàng gần của chúng ta, tuyệt chủng khoảng 40.000 năm trước.' },
  ],
  21: [
    { name: 'Homo sapiens', nameVi: 'Con người', description: 'Loài thống trị Trái Đất, 8 tỷ cá thể.' },
    { name: 'Biodiversity crisis', nameVi: 'Khủng hoảng đa dạng sinh học', description: 'Nhiều loài đang bị đe dọa do biến đổi khí hậu và mất môi trường.' },
  ],
}

/** Lấy danh sách sinh vật tiêu biểu theo stage id (0–21) */
export function getIconicOrganismsByStageId(stageId: number): IconicOrganism[] {
  return ICONIC_ORGANISMS_BY_STAGE[stageId] ?? []
}

/** Lấy sinh vật tiêu biểu cho một stage (dùng currentStage.id từ earthHistoryData) */
export function getIconicOrganismsForStage(stageId: number): IconicOrganism[] {
  return getIconicOrganismsByStageId(stageId)
}
