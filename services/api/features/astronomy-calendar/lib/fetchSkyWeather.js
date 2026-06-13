/**
 * Open-Meteo — miễn phí, không cần API key.
 * @see https://open-meteo.com/en/docs
 */

const WEATHER_LABEL_VI = {
  0: 'Trời quang',
  1: 'Ít mây',
  2: 'Có mây',
  3: 'Nhiều mây',
  45: 'Sương mù',
  48: 'Sương mù giá',
  51: 'Mưa phùn nhẹ',
  53: 'Mưa phùn',
  55: 'Mưa phùn dày',
  61: 'Mưa nhẹ',
  63: 'Mưa vừa',
  65: 'Mưa to',
  71: 'Tuyết nhẹ',
  73: 'Tuyết',
  75: 'Tuyết dày',
  80: 'Mưa rào nhẹ',
  81: 'Mưa rào',
  82: 'Mưa rào mạnh',
  95: 'Dông',
  96: 'Dông kèm mưa đá',
  99: 'Dông mạnh',
};

function weatherLabelVi(code) {
  const c = Math.round(Number(code) || 0);
  return WEATHER_LABEL_VI[c] || 'Thời tiết hiện tại';
}

async function fetchSkyWeather({ lat, lon }) {
  const latitude = Number(lat);
  const longitude = Number(lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('INVALID_COORDS');
  }

  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('longitude', String(longitude));
  url.searchParams.set(
    'current',
    'cloud_cover,is_day,precipitation,weather_code,wind_speed_10m',
  );
  url.searchParams.set('timezone', 'auto');

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`WEATHER_HTTP_${res.status}`);
  const json = await res.json();
  const cur = json?.current;
  if (!cur) throw new Error('WEATHER_EMPTY');

  const cloudCoverPct = Math.max(0, Math.min(100, Math.round(Number(cur.cloud_cover) || 0)));
  const code = Math.round(Number(cur.weather_code) || 0);

  return {
    cloudCoverPct,
    isDay: Boolean(cur.is_day),
    weatherCode: code,
    precipitationMm: Math.max(0, Number(cur.precipitation) || 0),
    windSpeedKmh: Math.max(0, Number(cur.wind_speed_10m) || 0),
    labelVi: weatherLabelVi(code),
    fetchedAt: typeof cur.time === 'string' ? cur.time : new Date().toISOString(),
    source: 'open-meteo',
  };
}

module.exports = {
  fetchSkyWeather,
  weatherLabelVi,
};
