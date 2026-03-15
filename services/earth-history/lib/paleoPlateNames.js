/**
 * Mapping GPlates/EarthByte plate ID → paleogeographical region name
 * Dùng để hiển thị "vị trí cổ địa lý" (vùng/mảng kiến tạo) cho hóa thạch.
 * Nguồn: GPlates/EarthByte convention, PBDB dùng cùng hệ plate.
 * Có thể mở rộng theo thời gian (time-dependent) sau.
 */

const PLATE_NAMES = {
  // Reference / Hotspots
  0: { nameEn: 'Reference', nameVi: 'Khung tham chiếu' },
  1: { nameEn: 'Atlantic-Indian hotspots', nameVi: 'Điểm nóng Đại Tây Dương-Ấn Độ' },
  2: { nameEn: 'Pacific hotspots', nameVi: 'Điểm nóng Thái Bình Dương' },

  // Africa (1xx)
  101: { nameEn: 'Africa', nameVi: 'Châu Phi' },
  102: { nameEn: 'West African Craton', nameVi: 'Mảng nền Tây Phi' },
  103: { nameEn: 'Congo Craton', nameVi: 'Mảng nền Congo' },
  104: { nameEn: 'Kalahari Craton', nameVi: 'Mảng nền Kalahari' },
  105: { nameEn: 'Sahara Metacraton', nameVi: 'Siêu mảng nền Sahara' },
  106: { nameEn: 'Arabian-Nubian Shield', nameVi: 'Khiên Ả Rập-Nubia' },
  107: { nameEn: 'Madagascar', nameVi: 'Madagascar' },
  108: { nameEn: 'Somalia Plate', nameVi: 'Mảng Somalia' },

  // Antarctica (2xx)
  201: { nameEn: 'Antarctica', nameVi: 'Châu Nam Cực' },
  202: { nameEn: 'East Antarctica', nameVi: 'Đông Nam Cực' },
  203: { nameEn: 'West Antarctica', nameVi: 'Tây Nam Cực' },

  // North America (3xx)
  301: { nameEn: 'North America', nameVi: 'Bắc Mỹ' },
  302: { nameEn: 'Laurentia', nameVi: 'Laurentia' },
  303: { nameEn: 'Greenland', nameVi: 'Greenland' },
  304: { nameEn: 'North American Craton', nameVi: 'Mảng nền Bắc Mỹ' },
  305: { nameEn: 'Mexico', nameVi: 'Mexico' },
  306: { nameEn: 'Caribbean', nameVi: 'Caribe' },

  // South America (4xx)
  401: { nameEn: 'South America', nameVi: 'Nam Mỹ' },
  402: { nameEn: 'Amazonian Craton', nameVi: 'Mảng nền Amazon' },
  403: { nameEn: 'Rio de la Plata Craton', nameVi: 'Mảng nền Rio de la Plata' },
  404: { nameEn: 'São Francisco Craton', nameVi: 'Mảng nền São Francisco' },

  // Eurasia / Europe / Asia (5xx)
  501: { nameEn: 'Eurasia', nameVi: 'Á-Âu' },
  502: { nameEn: 'Europe', nameVi: 'Châu Âu' },
  503: { nameEn: 'Baltica', nameVi: 'Baltica' },
  504: { nameEn: 'Siberia', nameVi: 'Siberia' },
  505: { nameEn: 'North China', nameVi: 'Hoa Bắc' },
  506: { nameEn: 'South China', nameVi: 'Hoa Nam' },
  507: { nameEn: 'Tarim', nameVi: 'Tarim' },
  508: { nameEn: 'Kazakhstan', nameVi: 'Kazakhstan' },
  509: { nameEn: 'Mongolia', nameVi: 'Mông Cổ' },
  510: { nameEn: 'Laurussia', nameVi: 'Laurussia' },
  511: { nameEn: 'Laurasia', nameVi: 'Laurasia' },

  // India (6xx)
  601: { nameEn: 'India', nameVi: 'Ấn Độ' },
  602: { nameEn: 'Indian Craton', nameVi: 'Mảng nền Ấn Độ' },

  // Pacific / Ocean (7xx)
  701: { nameEn: 'Pacific Ocean', nameVi: 'Thái Bình Dương' },
  702: { nameEn: 'Pacific Plate', nameVi: 'Mảng Thái Bình Dương' },
  703: { nameEn: 'Farallon Plate', nameVi: 'Mảng Farallon' },
  704: { nameEn: 'Phoenix Plate', nameVi: 'Mảng Phoenix' },
  705: { nameEn: 'Izanagi Plate', nameVi: 'Mảng Izanagi' },
  706: { nameEn: 'Kula Plate', nameVi: 'Mảng Kula' },

  // Australia / Oceania (8xx)
  801: { nameEn: 'Australia', nameVi: 'Australia' },
  802: { nameEn: 'Australian Craton', nameVi: 'Mảng nền Australia' },
  803: { nameEn: 'New Zealand', nameVi: 'New Zealand' },

  // Tethys / Oceans
  901: { nameEn: 'Tethys Ocean', nameVi: 'Đại dương Tethys' },
  902: { nameEn: 'Iapetus Ocean', nameVi: 'Đại dương Iapetus' },
  903: { nameEn: 'Panthalassa', nameVi: 'Panthalassa' },

  // Gondwana (supercontinent fragments - có thể trùng với 1xx, 2xx, 4xx, 6xx, 8xx)
  100: { nameEn: 'Gondwana', nameVi: 'Gondwana' },
  200: { nameEn: 'Laurasia', nameVi: 'Laurasia' },
  250: { nameEn: 'Pangaea', nameVi: 'Pangaea' },
}

/**
 * Lấy tên vùng cổ địa lý theo plate ID
 * @param {number|null|undefined} geoplate - GPlates plate ID
 * @param {string} locale - 'vi' | 'en'
 * @returns {{ nameEn: string, nameVi: string }}
 */
function getPaleoRegionName(geoplate, locale = 'vi') {
  if (geoplate == null || geoplate === '') {
    return { nameEn: 'Unknown', nameVi: 'Không xác định' }
  }
  const id = typeof geoplate === 'number' ? geoplate : parseInt(geoplate, 10)
  if (Number.isNaN(id)) {
    return { nameEn: 'Unknown', nameVi: 'Không xác định' }
  }
  const entry = PLATE_NAMES[id]
  if (!entry) {
    return { nameEn: `Plate ${id}`, nameVi: `Mảng ${id}` }
  }
  return entry
}

/**
 * Trả về chuỗi tên theo locale (cho API response)
 * @param {number|null|undefined} geoplate
 * @param {string} locale
 * @returns {string}
 */
function getPaleoRegionNameString(geoplate, locale = 'vi') {
  const { nameEn, nameVi } = getPaleoRegionName(geoplate, locale)
  return locale === 'vi' ? nameVi : nameEn
}

module.exports = {
  PLATE_NAMES,
  getPaleoRegionName,
  getPaleoRegionNameString,
}
