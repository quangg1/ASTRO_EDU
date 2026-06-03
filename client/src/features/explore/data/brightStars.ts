/** Bright stars for sky labels (Bayer / proper names, J2000 RA/Dec deg). */
export type BrightStar = {
  id: string
  name: string
  raDeg: number
  decDeg: number
  mag: number
}

export const BRIGHT_STARS: BrightStar[] = [
  { id: 'sirius', name: 'Sirius', raDeg: 101.287, decDeg: -16.716, mag: -1.46 },
  { id: 'canopus', name: 'Canopus', raDeg: 95.988, decDeg: -52.696, mag: -0.74 },
  { id: 'arcturus', name: 'Arcturus', raDeg: 213.915, decDeg: 19.182, mag: -0.05 },
  { id: 'vega', name: 'Vega', raDeg: 279.235, decDeg: 38.784, mag: 0.03 },
  { id: 'capella', name: 'Capella', raDeg: 79.172, decDeg: 45.998, mag: 0.08 },
  { id: 'rigel', name: 'Rigel', raDeg: 78.634, decDeg: -8.202, mag: 0.13 },
  { id: 'procyon', name: 'Procyon', raDeg: 114.825, decDeg: 5.225, mag: 0.34 },
  { id: 'betelgeuse', name: 'Betelgeuse', raDeg: 88.793, decDeg: 7.407, mag: 0.42 },
  { id: 'achernar', name: 'Achernar', raDeg: 24.428, decDeg: -57.237, mag: 0.46 },
  { id: 'hadar', name: 'Hadar', raDeg: 210.956, decDeg: -60.373, mag: 0.61 },
  { id: 'altair', name: 'Altair', raDeg: 297.695, decDeg: 8.868, mag: 0.76 },
  { id: 'aldebaran', name: 'Aldebaran', raDeg: 68.98, decDeg: 16.509, mag: 0.86 },
  { id: 'antares', name: 'Antares', raDeg: 247.352, decDeg: -26.432, mag: 0.96 },
  { id: 'spica', name: 'Spica', raDeg: 201.298, decDeg: -11.161, mag: 0.98 },
  { id: 'pollux', name: 'Pollux', raDeg: 116.329, decDeg: 28.026, mag: 1.14 },
  { id: 'fomalhaut', name: 'Fomalhaut', raDeg: 344.413, decDeg: -29.622, mag: 1.16 },
  { id: 'deneb', name: 'Deneb', raDeg: 310.358, decDeg: 45.28, mag: 1.25 },
  { id: 'regulus', name: 'Regulus', raDeg: 152.093, decDeg: 11.967, mag: 1.36 },
  { id: 'acrux', name: 'Acrux', raDeg: 186.65, decDeg: -63.099, mag: 0.76 },
  { id: 'alpha-centauri', name: 'Alpha Centauri', raDeg: 219.902, decDeg: -60.834, mag: -0.27 },
]
