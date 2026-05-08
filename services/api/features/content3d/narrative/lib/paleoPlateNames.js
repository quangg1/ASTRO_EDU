const PLATE_NAMES = {
  0: { nameEn: 'Reference', nameVi: 'Khung tham chieu' },
  1: { nameEn: 'Atlantic-Indian hotspots', nameVi: 'Diem nong Dai Tay Duong-An Do' },
  2: { nameEn: 'Pacific hotspots', nameVi: 'Diem nong Thai Binh Duong' },
  101: { nameEn: 'Africa', nameVi: 'Chau Phi' },
  107: { nameEn: 'Madagascar', nameVi: 'Madagascar' },
  201: { nameEn: 'Antarctica', nameVi: 'Chau Nam Cuc' },
  301: { nameEn: 'North America', nameVi: 'Bac My' },
  303: { nameEn: 'Greenland', nameVi: 'Greenland' },
  401: { nameEn: 'South America', nameVi: 'Nam My' },
  501: { nameEn: 'Eurasia', nameVi: 'A-Au' },
  502: { nameEn: 'Europe', nameVi: 'Chau Au' },
  504: { nameEn: 'Siberia', nameVi: 'Siberia' },
  601: { nameEn: 'India', nameVi: 'An Do' },
  701: { nameEn: 'Pacific Ocean', nameVi: 'Thai Binh Duong' },
  702: { nameEn: 'Pacific Plate', nameVi: 'Mang Thai Binh Duong' },
  801: { nameEn: 'Australia', nameVi: 'Australia' },
  901: { nameEn: 'Tethys Ocean', nameVi: 'Dai duong Tethys' },
  903: { nameEn: 'Panthalassa', nameVi: 'Panthalassa' },
  100: { nameEn: 'Gondwana', nameVi: 'Gondwana' },
  200: { nameEn: 'Laurasia', nameVi: 'Laurasia' },
  250: { nameEn: 'Pangaea', nameVi: 'Pangaea' },
};

function getPaleoRegionName(geoplate, locale = 'vi') {
  if (geoplate == null || geoplate === '') return { nameEn: 'Unknown', nameVi: 'Khong xac dinh' };
  const id = typeof geoplate === 'number' ? geoplate : parseInt(geoplate, 10);
  if (Number.isNaN(id)) return { nameEn: 'Unknown', nameVi: 'Khong xac dinh' };
  const entry = PLATE_NAMES[id];
  if (!entry) return { nameEn: `Plate ${id}`, nameVi: `Mang ${id}` };
  return entry;
}

function getPaleoRegionNameString(geoplate, locale = 'vi') {
  const { nameEn, nameVi } = getPaleoRegionName(geoplate, locale);
  return locale === 'vi' ? nameVi : nameEn;
}

module.exports = { PLATE_NAMES, getPaleoRegionName, getPaleoRegionNameString };
