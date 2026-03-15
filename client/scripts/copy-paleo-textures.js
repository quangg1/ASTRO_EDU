/**
 * Copy CHỈ các file PaleoAtlas có trong "PALEOMAP PaleoAtlas Rasters v3" vào client/public/textures/paleo/.
 * Không thêm file nào khác – chỉ dùng đúng tên file có trong thư mục nguồn.
 *
 * Quan hệ: Các thời kì trong WEB (public/textures/paleo/) KHỚP với folder này –
 * web là bản copy từ folder "PALEOMAP PaleoAtlas Rasters v3". Mỗi paleo_XXX.jpg
 * tương ứng một file trong folder (theo map AGE_TO_SOURCE_FILE bên dưới).
 */

const fs = require('fs')
const path = require('path')

const SOURCE_DIR = path.join(__dirname, '../../PALEOMAP PaleoAtlas Rasters v3')
const TARGET_DIR = path.join(__dirname, '../public/textures/paleo')

// Map: age (Ma) trong PaleoAtlas → tên file đúng trong thư mục nguồn (có trong web)
const AGE_TO_SOURCE_FILE = {
  0: 'Map1a PALEOMAP PaleoAtlas_000.jpg',
  1: 'Map2a Last Glacial Maximum_001.jpg',
  4: 'Map3a Pliocene_004.jpg',
  6: 'Map4a Messinian Event_006.jpg',
  10: 'Map5a Late Miocene_010.jpg',
  15: 'Map6a  Middle Miocene_015.jpg',
  20: 'Map7a  Early Miocene_020.jpg',
  25: 'Map8a Late Oligocene_025.jpg',
  30: 'Map9a  Early Oligocene_030.jpg',
  35: 'Map10a Late Eocene_035.jpg',
  40: 'Map11a MIddle Eocene_040.jpg',
  45: 'Map12a early Middle Eocene_045.jpg',
  50: 'Map13a Early Eocene_050.jpg',
  55: 'Map14a PETM_055.jpg',
  60: 'Map15a Paleocene_060.jpg',
  66: 'Map16a KT Boundary_066.jpg',
  70: 'Map17a LtK Maastrichtian_070.jpg',
  75: 'Map18a LtK Late Campanian_075.jpg',
  80: 'Map19a LtK Early Campanian_080.jpg',
  90: 'Map21a LtK Turonian_090.jpg',
  95: 'Map22a LtK Cenomanian_095.jpg',
  100: 'Map23a EK Late Albian_100.jpg',
  105: 'Map24a EK Middle Albian_105.jpg',
  110: 'Map25a EK Early Albian_110.jpg',
  115: 'Map26a EK Late Aptian_115.jpg',
  120: 'Map27a EK Early Albian_120.jpg',
  125: 'Map28a EK Barremian_125.jpg',
  130: 'Map29a EK Hauterivian_130.jpg',
  135: 'Map30a EK Valangian_135.jpg',
  140: 'Map31a EK Berriasian_140.jpg',
  145: 'Map32a Jurassic-Cretaceous Boundary_145.jpg',
  150: 'Map33a LtJ Tithonian_150.jpg',
  155: 'Map34a LtJ Kimmeridgian_155.jpg',
  160: 'Map35a LtJ Oxfordian_160.jpg',
  165: 'Map36a MJ Callovian_165.jpg',
  170: 'Map37a MJ Bajocian&Bathonian_170.jpg',
  175: 'Map38a MJ Aalenian_175.jpg',
  180: 'Map39a EJ Toarcian_180.jpg',
  185: 'Map40a EJ Pliensbachian_185.jpg',
  190: 'Map41a EJ Sinemurian_190.jpg',
  195: 'Map42a EJ Hettangian_195.jpg',
  200: 'Map43a Triassic-Jurassic Boundary_200.jpg',
  210: 'Map44a LtTr Norian_210.jpg',
  220: 'Map45a LtTr Carnian_220.jpg',
  230: 'Map46a MTr Ladinian_230.jpg',
  240: 'Map47a MTr Anisian_240.jpg',
  245: 'Map48a ETr Induan-Olenekian_245.jpg',
  250: 'Map49a Permo-Triassic Boundary_250.jpg',
  255: 'Map50a LtP Lopingian_255.jpg',
  260: 'Map51a LtP Capitanian_260.jpg',
  270: 'Map52a MP Roadian&Wordian_270.jpg',
  275: 'Map53a EP Kungurian_275.jpg',
  280: 'Map54a EP Artinskian_280.jpg',
  290: 'Map55a EP Sakmarian_290.jpg',
  295: 'Map56a EP Asselian_295.jpg',
  300: 'Map57a LtCarb Gzhelian_300.jpg',
  305: 'Map58a LtCarb Kasimovian_305.jpg',
  310: 'Map59a LtCarb Moscovian_310.jpg',
  315: 'Map60a LtCarb Bashkirian_315.jpg',
  320: 'Map61a ECarb Serpukhovian_320.jpg',
  330: 'Map62a ECarb Late Visean_330.jpg',
  340: 'Map63a ECarb Early Visean_340.jpg',
  350: 'Map64a ECarb Tournaisian_350.jpg',
  360: 'Map65a Devono-Carboniferous Boundary_360.jpg',
  370: 'Map66a LtD Famennian_370.jpg',
  380: 'Map67a LtD Frasnian_380.jpg',
  390: 'Map68a MD Givetian_390.jpg',
  395: 'Map69a MD Eifelian_395.jpg',
  400: 'Map70a ED Emsian_400.jpg',
  410: 'Map71a ED Pragian_410.jpg',
  415: 'Map72a ED Lochlovian_415.jpg',
  420: 'Map73a LtS  Ludlow&Pridoli_420.jpg',
  425: 'Map74a MS Wenlock_425.jpg',
  430: 'Map75a ES late Llandovery_430.jpg',
  440: 'Map76a ES early Llandovery_440.jpg',
  445: 'Map77a LtO Hirnantian_445.jpg',
  450: 'Map78a LtO Sandbian-Katian_450.jpg',
  460: 'Map79a LtO Caradoc_460.jpg',
  461: 'Map80a LtO Darwillian_461.jpg',
  470: 'Map81a EO Floian-Dapingian_470.jpg',
  480: 'Map82a EO Tremadoc_480.jpg',
  490: 'Map83a Cambro-Ordovician Boundary_490.jpg',
  500: 'Map84a LtC Furongian_500.jpg',
  510: 'Map85a early Late Cambrian Series 3_510.jpg',
  520: 'Map86a Middle Cambrian Series 2_520.jpg',
  530: 'Map87a Early Cambrian Terreneuvian_530.jpg',
  540: 'Map88a Precambrian-Cambrian Boundary_540.jpg',
  600: 'Map90a Middle Ediacaran_600.jpg',
  690: 'Map92a Late Cryogenian_690.jpg',
  750: 'Map93a MIddle Cryogenian_750.jpg'
}

if (!fs.existsSync(SOURCE_DIR)) {
  console.error('Không tìm thấy thư mục nguồn:', SOURCE_DIR)
  process.exit(1)
}

if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true })
}

let copied = 0
for (const [age, filename] of Object.entries(AGE_TO_SOURCE_FILE)) {
  const src = path.join(SOURCE_DIR, filename)
  const dest = path.join(TARGET_DIR, `paleo_${String(age).padStart(3, '0')}.jpg`)
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest)
    copied++
  }
}

console.log(`Đã copy ${copied} file từ PALEOMAP PaleoAtlas Rasters v3 → ${TARGET_DIR}`)
