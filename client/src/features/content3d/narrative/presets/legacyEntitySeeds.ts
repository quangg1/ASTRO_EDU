/**
 * Seed Deep History mẫu theo entityId — chỉ dùng Studio «Nhập legacy» khi chưa có DB.
 */
import { narrativeVisualForBeatId } from '@/features/content3d/narrative/lib/defaultVisual'
import type {
  NarrativeBeat,
  NarrativeBeatEnvironment,
  NarrativeBeatPanel,
  NarrativeBeatVisual,
  NarrativeSite,
  PlanetNarrativeBundle,
} from '@/features/content3d/narrative/types'

/**
 * Kiểu trung gian — seed Studio import mẫu (không runtime) → `PlanetNarrativeBundle` (không dùng runtime).
 */

export type LegacySeedConfidence = 'consensus' | 'model' | 'hypothesis'

export type LegacySeedLiquidWater = 'none' | 'rare' | 'regional' | 'widespread' | 'unknown'

export type LegacySeedVolcanism = 'low' | 'moderate' | 'high' | 'dominant'

export type LegacySeedSiteKind =
  | 'volcano'
  | 'canyon'
  | 'crater'
  | 'plain'
  | 'channel'
  | 'polar'
  | 'landing'

/** Loại ảnh bìa — hiển thị badge cảnh báo trên Explore. */
export type LegacySeedCoverImageType = 'orbital_modern' | 'surface_modern' | 'artistic'

/** Điểm nổi bật trên globe (thay “hóa thạch”). */
export interface LegacySeedSite {
  id: string
  nameVi: string
  nameEn: string
  kind: LegacySeedSiteKind
  lat: number
  lng: number
  /** Một dòng cho chip / panel */
  blurbVi: string
  /** Ảnh đại diện (NASA/JPL Photojournal hoặc asset trong repo). */
  coverImageUrl: string
  /** Rỗng / undefined = hiện mọi stage (hoặc quy tắc legacy). */
  validStageIds?: number[]
  coverImageType?: LegacySeedCoverImageType
}

export interface LegacySeedMajorEvent {
  title: string
  summary: string
  /** Mức độ “nổi bật” trong UI */
  tone?: 'info' | 'highlight' | 'warning'
}

/**
 * Chuẩn Trái Đất (ISA / MNBC cổ điển ~101325 Pa) để tính ~% trong panel.
 */
export const EARTH_SEA_LEVEL_PRESSURE_PA = 101_325 as const

/** Cách có được áp Sao Hỏa cổ đại / mô hình. */
export type LegacySeedPressureBasis = 'measured_global_average' | 'model_range' | 'hypothesis_range'

/**
 * Minh họa kỷ địa chất trên **một** albedo map — không texture PNG riêng từng era.
 * Layer 3D (khí quyển / nước / bụi / núi lửa) đọc các uniform này.
 */
export interface LegacySeedVisual {
  atmosphereColor: string
  /** Rim / vỏ khí — 0..1 */
  atmosphereThickness: number
  /** Overlay nước minh họa — 0..1 */
  waterCoverage: number
  /** Haze cam-đỏ — 0..1 */
  dustOpacity: number
  /** Điểm sáng Tharsis / Elysium — 0..1 */
  volcanicGlow: number
}

export interface LegacySeedBeat {
  id: number
  name: string
  /** Hiển thị dưới tên: “Khoảng …” */
  ageLabelVi: string
  icon: string
  /** Màu nhấn panel / accent */
  accentColor: string
  confidence: LegacySeedConfidence
  description: string
  /** So sánh nhanh với Trái Đất — một câu */
  earthCompareVi: string
  /**
   * Áp suất bề mặt đại diện (datum / trung bình toàn hành tinh nếu `measured_global_average`).
   * So sánh độ lớn với {@link EARTH_SEA_LEVEL_PRESSURE_PA}.
   */
  surfacePressureRepresentativePa: number
  /** Khoảng Pa (thiểu đa / cực đại) khi chỉ có mô hình chuyên ngành. */
  surfacePressureLowPa?: number
  surfacePressureHighPa?: number
  surfacePressureBasis: LegacySeedPressureBasis
  surfacePressureCitationVi: string
  /** Nhiệt độ bề mặt đại diện (°C) — có thể là khoảng chú thích trong label */
  surfaceTempMinC: number
  surfaceTempMaxC: number
  surfaceTempNoteVi?: string
  liquidWater: LegacySeedLiquidWater
  volcanism: LegacySeedVolcanism
  /** Bức xạ / môi trường — một dòng */
  environmentNoteVi: string
  /** Amazonian+: bão bụi 0–3 (panel; scene ưu tiên `visual.dustOpacity`) */
  dustActivity?: 0 | 1 | 2 | 3
  majorEvents?: LegacySeedMajorEvent[]
  /** Override shader-era look; mặc định xem `LEGACY_VISUALS_PLANET_MARS`. */
  visual?: LegacySeedVisual
}

export const LEGACY_BEATS_PLANET_MARS: LegacySeedBeat[] = [
  {
    id: 1,
    name: 'Khởi đầu hành tinh đỏ',
    ageLabelVi: 'Khoảng 4,5–4,1 tỷ năm trước · giai đoạn hình thành sớm',
    icon: '🔥',
    accentColor: '#e85d3a',
    confidence: 'model',
    description:
      'Sao Hỏa hình thành cùng lúc với các hành tinh đá trong Hệ Mặt Trời. Giai đoạn đầu có nhiều va chạm, bề mặc nóng chảy rồi nguội dần. Các mô hình cho rằng khí quyển dày và ấm hơn nhiều so với hôm nay, nhưng chi tiết từng thời điểm vẫn đang được các nhà khoa học tranh luận — phù hợp để học tư duy “bằng chứng + mô hình”, không phải chuyện kể một ray.',
    earthCompareVi:
      'Trái Đất cũng từng qua giai đoạn “magma đại dương” sớm, nhưng vì có nước lỏng lâu dài và các mảng kiến tạo nên lịch sử bề mặt rất khác.',
    surfacePressureRepresentativePa: 78_500,
    surfacePressureLowPa: 25_000,
    surfacePressureHighPa: 175_000,
    surfacePressureBasis: 'hypothesis_range',
    surfacePressureCitationVi:
      'Chúng ta không có số đo cổ đại: khoảng Pa chỉ phản ánh trật tự độ lớn từ mô phỏng thoát/thu khí sớm (quan điểm phổ trong bài báo và sách giáo khoa hành tinh). Sai số và kịch bản dao động cực mạnh so với con số ôn định cho Sao Hỏa hiện đại (~610 Pa TB).',
    surfaceTempMinC: -80,
    surfaceTempMaxC: 20,
    surfaceTempNoteVi: 'Khoảng nhiệt rất rộng giữa cực và ban ngày — số mang tính định hướng cho mô phỏng sư phạm.',
    liquidWater: 'unknown',
    volcanism: 'moderate',
    environmentNoteVi: 'Bức xạ mặt trời chưa giảm như sau này; từ quyển yếu nên bảo vệ bề mặc kém hơn Trái Đất.',
    majorEvents: [
      {
        title: 'Bombardment sớm',
        summary: 'Nhiều hố va chạm khổng lồ được giữ lại trên bề mặc cổ — như “album ảnh” của thời kỳ hỗn loạn.',
        tone: 'highlight',
      },
    ],
  },
  {
    id: 2,
    name: 'Noachian · thời cổ “ướt hơn”?',
    ageLabelVi: 'Khoảng 4,1–3,7 tỷ năm trước · kỷ địa chất Noachian (sớm)',
    icon: '💧',
    accentColor: '#4a9eff',
    confidence: 'consensus',
    description:
      'Đây là thời được nhiều bằng chứng địa hình ủng hộ: các mạng thung lũng nhỏ, hồ và lớp trầm tích cổ gợi ý nước lỏng từng chảy hoặc đọng lâu hơn hiện nay. Sao Hỏa chưa phải “Trái Đất thứ hai”, nhưng chắc chắn từng ấm và ướt hơn so với ngày nay — đủ để đặt câu hỏi sinh học.',
    earthCompareVi:
      'Trái Đất Noachian không tồn tại như khái niệm ICS, nhưng cùng độ sâu thời gian Trái Đất đã có vi khuẩn và nước đại dương ổn định.',
    surfacePressureRepresentativePa: 77_700,
    surfacePressureLowPa: 9000,
    surfacePressureHighPa: 146_380,
    surfacePressureBasis: 'model_range',
    surfacePressureCitationVi:
      'Khoảng mô phỏng và suy luận từ địa hình cổ là nước lỏng có thể ổn định được (thường gặp các thảo luận trong khoảng ~10²–10⁵ Pa, tới ~1–1,5 bar tùy mô hình). Không có quan sát trực tiếp khí cổ như Sao Hỏa ngày nay.',
    surfaceTempMinC: -65,
    surfaceTempMaxC: 35,
    liquidWater: 'widespread',
    volcanism: 'moderate',
    environmentNoteVi: 'Nước có thể là nước muối hoặc thời điểm ngắn xen kẽ băng tan — diễn giải chi tiết là bài toán địa chất + hóa học.',
    majorEvents: [
      {
        title: 'Mạng thung lũng (valley networks)',
        summary: 'Đường chảy phân nhánh trên nhiều vùng — gợi ý mưa/băng tan kéo dài cả triệu năm chứ không chỉ một trận lũ.',
        tone: 'highlight',
      },
    ],
  },
  {
    id: 3,
    name: 'Noachian muộn · hồ và lớp bùn',
    ageLabelVi: 'Khoảng 3,7–3,5 tỷ năm trước',
    icon: '🪨',
    accentColor: '#b45309',
    confidence: 'consensus',
    description:
      'Một số lưu vực có cấu trúc giống đồng bằng bay hơi: hồ cổ, chồng lớp đá mịn, chỗ lắng bùn. Đây là “thời kỳ vàng” của câu hỏi vi sinh cổ: không nhất thiết đã có sự sống, nhưng môi trường có thể dễ tiếp nhận hơn.',
    earthCompareVi:
      'Tương tự trầm tích hồ cổ trên Trái Đất là nơi dễ giữ hóa thạch vi mô — nhưng Sao Hỏa không có lá cây hay dòng sông lớn như ta quen.',
    surfacePressureRepresentativePa: 64_000,
    surfacePressureLowPa: 8500,
    surfacePressureHighPa: 120_000,
    surfacePressureBasis: 'model_range',
    surfacePressureCitationVi:
      'Tương tự stage Noachian: khoảng Pa chỉ là tổng hợp mô phỏng/phổ nghiệp và suy thoái có thể theo khí cổ và hóa học bề mặt; phạm dao động vẫn rộng.',
    surfaceTempMinC: -70,
    surfaceTempMaxC: 25,
    liquidWater: 'regional',
    volcanism: 'moderate',
    environmentNoteVi: 'Bức xạ tia vũ trụ dần trở thành “địch” với bất kỳ sinh học bề mặt nào kéo dài.',
  },
  {
    id: 4,
    name: 'Hesperian · núi lửa và dòng dung nham',
    ageLabelVi: 'Khoảng 3,7–3,0 tỷ năm trước',
    icon: '🌋',
    accentColor: '#dc2626',
    confidence: 'consensus',
    description:
      'Kỷ Hesperian được nghĩ nhiều đến các đồng bằng bazan rộng và hoạt động núi lửa diễn ra trên diện lớn — gần giống kiểu “lớp vá” màu cam bạn thấy trên bản đồ địa chất. Khí quyển đã mỏng hơn Noachian và môi trường tổng thể khô dần.',
    earthCompareVi:
      'Trái Đất cũng có kỷ núi lửa mạnh (Deccan, Siberia…), nhưng nước biển và mây vẫn giữ khí hậu tương đối ôn hòa.',
    surfacePressureRepresentativePa: 16_950,
    surfacePressureLowPa: 2900,
    surfacePressureHighPa: 30_940,
    surfacePressureBasis: 'model_range',
    surfacePressureCitationVi:
      'Hesperian thường được mô tả là thời khí cổ có thể hẹp hơn Noachian; khoảng Pa vẫn là mô hình (xem các tài liệu tổng quan thoát khí Sao Hỏa của NASA Maven / báo Jakosky & các công sự có liên quan đến thoát vào không gian theo địa động và bức xạ sóng cực ngắn).',
    surfaceTempMinC: -75,
    surfaceTempMaxC: 18,
    liquidWater: 'rare',
    volcanism: 'high',
    environmentNoteVi: 'Nhiệt nội sinh vẫn “bơm” khí vỏ thạch quyển nhưng không đủ để giữ một đại dương mở như Trái Đất.',
    majorEvents: [
      {
        title: 'Đồng bằng bazan',
        summary: 'Vùng phủ rộng ghi dấu các trận phun trào kéo dài — làm thay đổi bản đồ bề mặt rõ rệt.',
        tone: 'info',
      },
    ],
  },
  {
    id: 5,
    name: 'Hesperian · lũ và kênh đổ ra',
    ageLabelVi: 'Cùng Hesperian · một số “sự kiện lũ” nổi bật',
    icon: '🌊',
    accentColor: '#0ea5e9',
    confidence: 'consensus',
    description:
      'Kênh outflow — những “sông đá” khổng lồ được tạo nhanh trong địa chất — cho thấy có lúc một lượng nước rất lớn được giải phóng (băng tan, hồ vỡ đập, nước ngầm?). Đây là chương nổi bật của Sao Hỏa: không chỉ “từng hơi ẩm” mà có cả thảm họa nước theo quy mô hành tinh.',
    earthCompareVi:
      'Trên Trái Đất có lũ băng tan lớn nhưng Sao Hỏa thiếu áp suất nên nước không ổn định như đại dương mở.',
    surfacePressureRepresentativePa: 22_940,
    surfacePressureLowPa: 2500,
    surfacePressureHighPa: 54_670,
    surfacePressureBasis: 'model_range',
    surfacePressureCitationVi:
      'Cùng Hesperian: không đo được áp trong từng sự cố lũ; khoảng Pa phản chiếu mô phổ mô định hóa học/phong hóa (vẫn dày hơn Sao Hỏa hiện đại nhiều lần, thường thấp hơn các kịch bản Noachian dày khí).',
    surfaceTempMinC: -78,
    surfaceTempMaxC: 15,
    liquidWater: 'rare',
    volcanism: 'high',
    environmentNoteVi: 'Một số mô hình nêu nước lỏng nhanh bị bốc hơi/kết băng sau lũ.',
    majorEvents: [
      {
        title: 'Kênh outflow khổng lồ',
        summary: 'Hệ thống kênh dài hàng nghìn km gợi ý dòng chảy cực kỳ lớn trong thời gian ngắn theo thang địa chất.',
        tone: 'highlight',
      },
    ],
  },
  {
    id: 6,
    name: 'Amazonian · sa mạc siêu khô',
    ageLabelVi: 'Khoảng 3 tỷ năm trước đến nay',
    icon: '🏜️',
    accentColor: '#c2410c',
    confidence: 'consensus',
    description:
      'Amazonian là “hôm nay” trên thang địa chất Sao Hỏa: bề mặc hầu hết rất khô, các thay đổi chủ yếu là gió, băng theo mùa ở cực và vài dòng chảy rất hiếm trong điều kiện đặc biệt. Đây là khung thời gian khi Olympus Mons và các núi lửa khổng lồ của vùng Tharsis tiếp tục “vẽ” cảnh quan.',
    earthCompareVi:
      'Tương đương một sa mạc toàn cầu lạnh và mỏng khí — rất khác bất kỳ hoang mạc nào ta đi du lịch trên Trái Đất.',
    surfacePressureRepresentativePa: 610,
    surfacePressureLowPa: 30,
    surfacePressureHighPa: 1155,
    surfacePressureBasis: 'measured_global_average',
    surfacePressureCitationVi:
      'Áp TB bề mặt ~610 Pa (~0,60% áp MNBC Trái Đất · ~101 325 Pa ISA) và dao động địa cao có thể khoảng ~30 Pa (đỉnh Olympus Mons) đến ~1155 Pa (đáy Hellas) — NASA Mars Fact Sheet / Goddard Space Flight Center.',
    surfaceTempMinC: -125,
    surfaceTempMaxC: 20,
    surfaceTempNoteVi: 'Nhiệt độ thay đổi mạnh trong ngày; thang “từ -120°C đến +20°C” gợi nhớ thực đo từ các nhiệm vụ.',
    liquidWater: 'none',
    volcanism: 'moderate',
    environmentNoteVi: 'Bức xạ UV và hạt năng lượng cao xuống bề mặc vì tầng khí mỏng.',
    dustActivity: 2,
  },
  {
    id: 7,
    name: 'Bão bụi · bầu trời hồng cam',
    ageLabelVi: 'Hiện đại · theo mùa và kỳ kiến',
    icon: '🌀',
    accentColor: '#f97316',
    confidence: 'consensus',
    description:
      'Bão bụi toàn cầu là một “chữ ký” của Sao Hỏa: có thể làm tàu quỹ đạo mất ánh sáng và thay đổi nhiệt bề mặc tạm thời. Bụi này định hình cả cảm nhận qua ảnh: bầu trời cam, tầm nhìn thấp.',
    earthCompareVi:
      'Trái Đất có bụi bão cát địa phương, nhưng hiếm khi bao trùm một hành tinh với quy mô như một số đợt trên Sao Hỏa.',
    surfacePressureRepresentativePa: 610,
    surfacePressureLowPa: 30,
    surfacePressureHighPa: 1155,
    surfacePressureBasis: 'measured_global_average',
    surfacePressureCitationVi:
      'Khí Sao Hỏa không đổi vì chỉ có bụi trong giai đoạn khảo sát đời; con số vẫn ~610 Pa TB bề mặt và dao động địa hình ~30–1155 Pa (NASA Goddard Mars Fact Sheet).',
    surfaceTempMinC: -130,
    surfaceTempMaxC: 25,
    liquidWater: 'none',
    volcanism: 'low',
    environmentNoteVi: 'Các tàu như InSight, Curiosity từng ghi lại rung chấn và khí tượng trong bão bụi.',
    dustActivity: 3,
  },
  {
    id: 8,
    name: 'Kính viễn vọng và tàu bay qua',
    ageLabelVi: 'Thế kỷ XX–XXI · chuyển từ điểm sáng nhỏ sang bản đồ toàn cầu',
    icon: '🔭',
    accentColor: '#94a3b8',
    confidence: 'consensus',
    description:
      'Chúng ta biết Sao Hỏa “đủ gần để mơ” nhưng cũng đủ xa để chỉ hiểu được khi có dữ liệu liên tục từ không gian: từ vệt kênh vẽ tay trên kính thiên văn nhỏ đến ảnh vệ tinh DEM, phổ hồng ngoại và radar xuyên băng.',
    earthCompareVi:
      'Trái Đất đã có vệ tinh đo “mọi điểm”; Sao Hỏa gần như toàn bộ bản đồ địa hình chuẩn hiện đại đến từ các nhiệm vụ NASA/ESA.',
    surfacePressureRepresentativePa: 610,
    surfacePressureLowPa: 30,
    surfacePressureHighPa: 1155,
    surfacePressureBasis: 'measured_global_average',
    surfacePressureCitationVi:
      'Đồng bộ với thời Sao Hỏa hiện đại được đặc trưng: ~610 Pa TB bề mặt, dao động địa hình ~30–1155 Pa (NASA Goddard Mars Fact Sheet).',
    surfaceTempMinC: -120,
    surfaceTempMaxC: 25,
    liquidWater: 'none',
    volcanism: 'low',
    environmentNoteVi: 'Kỷ nguyên dữ liệu mở (PDS) giúp cả học sinh cũng có thể tải và xem một phần hình và phổ.',
    majorEvents: [
      {
        title: 'MARCI, HiRISE, CRISM…',
        summary: 'Các camera và phổ kế trên MRO và các tàu khác là “đôi mắt hiện đại” của bản đồ SIM 3292.',
        tone: 'info',
      },
    ],
  },
  {
    id: 9,
    name: 'Curiosity · miệng núi lửa Gale',
    ageLabelVi: '2012 đến nay · rover trên bề mặt',
    icon: '🤖',
    accentColor: '#38bdf8',
    confidence: 'consensus',
    description:
      'Curiosity không “chụp được quá khứ Noachian trực tiếp”, nhưng đào các lớp bùn cổ ở Mount Sharp để đọc một cuốn sách địa hóa học page-by-page. Phát hiện phân tử hữu cơ và môi trường từng có nước ngọt-ish giúp bài học của bạn: câu hỏi sự sống phải tách khỏi chuyện “có sóng như TikTok không”.',
    earthCompareVi:
      'Không có tàu khảo sát như Curiosity ta vẫn chỉ có mơ hồ về Sao Hỏa địa chất.',
    surfacePressureRepresentativePa: 610,
    surfacePressureLowPa: 30,
    surfacePressureHighPa: 1155,
    surfacePressureBasis: 'measured_global_average',
    surfacePressureCitationVi:
      'TB toàn hành tinh ~610 Pa (NASA Mars Fact Sheet). Rover MEDA đo chừng ~700 Pa tại Gale (địa hình và độ cao so với mốc areoid làm khác ~610 Pa TB); vẫn dùng 610 Pa làm chỉ báo global để học và so MNBC trong panel.',
    surfaceTempMinC: -127,
    surfaceTempMaxC: 26,
    liquidWater: 'none',
    volcanism: 'low',
    environmentNoteVi: 'Bức xạ bề mặc cao; robot hoạt động chủ động ban ngày, “ngủ đông” trong bão bụi lớn khi cần.',
    majorEvents: [
      {
        title: 'Đá Cumberland & quét SAM',
        summary: 'Giúp học sinh làm quen khái niệm: “organic” không đồng nghĩa “có UFO”.',
        tone: 'highlight',
      },
    ],
  },
  {
    id: 10,
    name: 'Perseverance · Jezero và tương lai MSR',
    ageLabelVi: '2021 đến nay · săn vi ký sinh và mẫu đá',
    icon: '🛸',
    accentColor: '#10b981',
    confidence: 'consensus',
    description:
      'Jezero từng là delta cổ — nơi dòng chảy đưa cát vào hồ, rất hứa hẹn cho chữ ký sinh học vi mô. Perseverance đóng vai “thợ thu mẫu”; kế hoạch Mars Sample Return (nếu thành công) sẽ đưa đá về phòng thí nghiệm Trái Đất — bước nhảy lớn nhất kể từ Apollo cho khoa học hành tinh.',
    earthCompareVi:
      'Chưa có mẫu Sao Hỏa “sạch” đủ để phân tích như mẫu Mặt Trăng — MSR sẽ thay đổi điều đó nếu tiến triển.',
    surfacePressureRepresentativePa: 610,
    surfacePressureLowPa: 30,
    surfacePressureHighPa: 1155,
    surfacePressureBasis: 'measured_global_average',
    surfacePressureCitationVi:
      'TB toàn hành tinh ~610 Pa (NASA Mars Fact Sheet). MEDA tại Jezero thường cỡ ~690–720 Pa — khác theo chỗ và thời tiết Sao Hỏa, không thay thế chỉ báo TB global ~610 Pa trong panel để so với MNBC Trái Đất (~101 325 Pa ISA).',
    surfaceTempMinC: -130,
    surfaceTempMaxC: 24,
    liquidWater: 'none',
    volcanism: 'low',
    environmentNoteVi: 'Trực thăng Ingenuity mở kỷ nguyên bay khí quyển mỏng — bài học kỹ thuật + khí động học sao Hỏa.',
    majorEvents: [
      {
        title: 'Mẫu đá niêm phong',
        summary: 'Học sinh có thể hiểu thêm vì sao “mang về Trái Đất” quan trọng hơn chỉ chụp ảnh.',
        tone: 'highlight',
      },
    ],
  },
]

/** Tọa độ xấp xỉ theo kinh/vĩ địa lý (kinh đông -180…180). */
export const LEGACY_SITES_PLANET_MARS: LegacySeedSite[] = [
  {
    id: 'olympus',
    nameVi: 'Olympus Mons',
    nameEn: 'Olympus Mons',
    kind: 'volcano',
    lat: 18.65,
    lng: -133.8,
    blurbVi: 'Núi lửa khổng lồ vùng Tharsis — biểu tượng địa hình Amazonian.',
    coverImageUrl: 'https://photojournal.jpl.nasa.gov/jpeg/PIA02806.jpg',
    validStageIds: [4, 5, 6, 7, 8, 9, 10],
    coverImageType: 'orbital_modern',
  },
  {
    id: 'valles',
    nameVi: 'Valles Marineris',
    nameEn: 'Valles Marineris',
    kind: 'canyon',
    lat: -14,
    lng: -59,
    blurbVi: 'Hẻm núi dài khủng khiếp — một “Grand Canyon” vượt tưởng tượng.',
    coverImageUrl: 'https://photojournal.jpl.nasa.gov/jpeg/PIA04825.jpg',
    validStageIds: [3, 4, 5, 6, 7, 8, 9, 10],
  },
  {
    id: 'gale',
    nameVi: 'Miệng núi lửa Gale',
    nameEn: 'Gale Crater',
    kind: 'crater',
    lat: -5.19,
    lng: 137.4,
    blurbVi: 'Nơi Curiosity leo Mount Sharp để đọc trầm tích cổ.',
    coverImageUrl: 'https://photojournal.jpl.nasa.gov/jpeg/PIA14309.jpg',
    validStageIds: [9, 10],
    coverImageType: 'orbital_modern',
  },
  {
    id: 'jezero',
    nameVi: 'Jezero',
    nameEn: 'Jezero Crater',
    kind: 'crater',
    lat: 18.38,
    lng: 77.58,
    blurbVi: 'Delta cổ — bãi săn dấu sinh học và mẫu đá Perseverance.',
    coverImageUrl: 'https://photojournal.jpl.nasa.gov/jpeg/PIA23764.jpg',
    validStageIds: [10],
    coverImageType: 'orbital_modern',
  },
  {
    id: 'hellas',
    nameVi: 'Lưu vực Hellas',
    nameEn: 'Hellas Planitia',
    kind: 'crater',
    lat: -42.4,
    lng: 70,
    blurbVi: 'Một trong các hố va chạm lớn nhất — nền thấp, gió đẩy cát quy mô lớn.',
    coverImageUrl: 'https://photojournal.jpl.nasa.gov/jpeg/PIA04913.jpg',
    validStageIds: [2, 3, 4, 5, 6, 7, 8, 9, 10],
  },
  {
    id: 'north-pole',
    nameVi: 'Cực Bắc (băng theo mùa)',
    nameEn: 'North polar cap',
    kind: 'polar',
    lat: 88,
    lng: 0,
    blurbVi: 'Băng CO₂ và nước thay đổi theo mùa — minh họa “nước vẫn còn nhưng kín”.',
    coverImageUrl: 'https://photojournal.jpl.nasa.gov/jpeg/PIA04938.jpg',
    validStageIds: [6, 7, 8, 9, 10],
  },
  {
    id: 'elysium',
    nameVi: 'Elysium Mons',
    nameEn: 'Elysium Mons',
    kind: 'volcano',
    lat: 25,
    lng: 147,
    blurbVi: 'Vùng núi lửa trẻ hơn trung bình — vẫn liên quan Hesperian/Amazonian.',
    coverImageUrl: 'https://photojournal.jpl.nasa.gov/jpeg/PIA03783.jpg',
    validStageIds: [4, 5, 6, 7, 8, 9, 10],
  },
  {
    id: 'chaos',
    nameVi: 'Chaos cổ (ví dụ Aurorae)',
    nameEn: 'Aurorae Chaos',
    kind: 'plain',
    lat: -5,
    lng: 32,
    blurbVi: 'Địa hình vỡ khối gợi ý nước ngầm/băng tan cổ — dễ kể chuyện cho học sinh.',
    coverImageUrl: 'https://photojournal.jpl.nasa.gov/jpeg/PIA04289.jpg',
    validStageIds: [2, 3, 4, 5, 6, 7, 8, 9, 10],
  },
]


/** Shader-driven era look — 1 albedo texture, không texture file theo kỷ địa chất. */
export const LEGACY_VISUALS_PLANET_MARS: Record<number, LegacySeedVisual> = {
  1: {
    atmosphereColor: '#4477cc',
    atmosphereThickness: 0.6,
    waterCoverage: 0.38,
    dustOpacity: 0,
    volcanicGlow: 0.8,
  },
  2: {
    atmosphereColor: '#5588bb',
    atmosphereThickness: 0.4,
    waterCoverage: 0.2,
    dustOpacity: 0.05,
    volcanicGlow: 0.4,
  },
  3: {
    atmosphereColor: '#5588bb',
    atmosphereThickness: 0.38,
    waterCoverage: 0.28,
    dustOpacity: 0.06,
    volcanicGlow: 0.35,
  },
  4: {
    atmosphereColor: '#cc7744',
    atmosphereThickness: 0.22,
    waterCoverage: 0.04,
    dustOpacity: 0.15,
    volcanicGlow: 0.5,
  },
  5: {
    atmosphereColor: '#b86a44',
    atmosphereThickness: 0.2,
    waterCoverage: 0.08,
    dustOpacity: 0.12,
    volcanicGlow: 0.25,
  },
  6: {
    atmosphereColor: '#dd5522',
    atmosphereThickness: 0.12,
    waterCoverage: 0,
    dustOpacity: 0.22,
    volcanicGlow: 0.08,
  },
  7: {
    atmosphereColor: '#dd5522',
    atmosphereThickness: 0.1,
    waterCoverage: 0,
    dustOpacity: 0.35,
    volcanicGlow: 0,
  },
  8: {
    atmosphereColor: '#c94a28',
    atmosphereThickness: 0.1,
    waterCoverage: 0,
    dustOpacity: 0.28,
    volcanicGlow: 0,
  },
  9: {
    atmosphereColor: '#c94a28',
    atmosphereThickness: 0.1,
    waterCoverage: 0,
    dustOpacity: 0.25,
    volcanicGlow: 0,
  },
  10: {
    atmosphereColor: '#c94a28',
    atmosphereThickness: 0.1,
    waterCoverage: 0,
    dustOpacity: 0.24,
    volcanicGlow: 0,
  },
}


function seedVisualToBeat(v: LegacySeedVisual, stage: LegacySeedBeat): NarrativeBeatVisual {
  return {
    globeTint: stage.accentColor,
    atmosphereColor: v.atmosphereColor,
    atmosphereThickness: v.atmosphereThickness,
    waterCoverage: v.waterCoverage,
    dustOpacity: v.dustOpacity,
    volcanicGlow: v.volcanicGlow,
  }
}

function seedBeatToNarrative(
  stage: LegacySeedBeat,
  order: number,
  stageVisuals?: Record<number, LegacySeedVisual>,
): NarrativeBeat {
  const v =
    stage.visual ??
    stageVisuals?.[stage.id] ??
    LEGACY_VISUALS_PLANET_MARS[stage.id] ??
    narrativeVisualForBeatId(stage.id)

  const env: NarrativeBeatEnvironment = {
    confidence: stage.confidence,
    liquidWater: stage.liquidWater,
    volcanism: stage.volcanism,
    surfaceTempMinC: stage.surfaceTempMinC,
    surfaceTempMaxC: stage.surfaceTempMaxC,
    surfacePressureRepresentativePa: stage.surfacePressureRepresentativePa,
    surfacePressureLowPa: stage.surfacePressureLowPa,
    surfacePressureHighPa: stage.surfacePressureHighPa,
    surfacePressureBasis: stage.surfacePressureBasis,
    dustActivity: stage.dustActivity,
  }

  const panel: NarrativeBeatPanel = {
    descriptionVi: stage.description,
    compareNoteVi: stage.earthCompareVi,
    environmentNoteVi: stage.environmentNoteVi,
    pressureCitationVi: stage.surfacePressureCitationVi,
    surfaceTempNoteVi: stage.surfaceTempNoteVi ?? '',
  }

  return {
    id: stage.id,
    order,
    name: stage.name,
    nameEn: stage.name,
    ageLabelVi: stage.ageLabelVi,
    icon: stage.icon,
    accentColor: stage.accentColor,
    timeMa: 4500 - stage.id * 400,
    panel,
    visual: seedVisualToBeat(v, stage),
    environment: env,
    flags: {},
    majorEvents: (stage.majorEvents ?? []).map((e) => ({
      title: e.title,
      summary: e.summary,
      tone: e.tone,
    })),
  }
}

function seedSiteToNarrative(site: LegacySeedSite): NarrativeSite {
  return {
    id: site.id,
    nameVi: site.nameVi,
    nameEn: site.nameEn,
    kind: site.kind,
    lat: site.lat,
    lng: site.lng,
    blurbVi: site.blurbVi,
    coverImageUrl: site.coverImageUrl,
    validStageIds: site.validStageIds,
    coverImageType: site.coverImageType,
  }
}

function buildPlanetMarsLegacyBundle(entityId: string): PlanetNarrativeBundle {
  return {
    entityId,
    kind: 'generic',
    beats: LEGACY_BEATS_PLANET_MARS.map((s, i) => seedBeatToNarrative(s, i + 1, LEGACY_VISUALS_PLANET_MARS)),
    sites: LEGACY_SITES_PLANET_MARS.map(seedSiteToNarrative),
    published: true,
  }
}

const LEGACY_SEED_ENTITY_IDS = new Set<string>(['planet-mars'])

export function hasLegacySeedEntity(entityId: string): boolean {
  return LEGACY_SEED_ENTITY_IDS.has(entityId) || entityId === 'planet-earth'
}

export function buildLegacyBundleForEntity(entityId: string): PlanetNarrativeBundle | null {
  if (entityId === 'planet-mars') return buildPlanetMarsLegacyBundle(entityId)
  return null
}
