// src/lib/vdot-tables.ts
// Daniels VDOT pace tables — integer seconds per km
// Sources: Daniels' Running Formula 3rd ed., tables 2.1–2.6

export type VdotPaces = {
  easy_min: number   // slowest easy pace (s/km)
  easy_max: number   // fastest easy pace (s/km)
  marathon: number   // marathon pace (s/km)
  threshold: number  // threshold/tempo pace (s/km)
  interval: number   // interval pace / 5K pace (s/km)
  repetition: number // repetition pace / mile pace (s/km)
}

// Table keyed by VDOT (30–85, integer steps)
// All values in seconds per km
const VDOT_TABLE: Record<number, VdotPaces> = {
  30: { easy_min: 480, easy_max: 432, marathon: 403, threshold: 375, interval: 354, repetition: 330 },
  31: { easy_min: 470, easy_max: 423, marathon: 394, threshold: 367, interval: 346, repetition: 323 },
  32: { easy_min: 461, easy_max: 415, marathon: 385, threshold: 359, interval: 338, repetition: 316 },
  33: { easy_min: 452, easy_max: 407, marathon: 377, threshold: 351, interval: 331, repetition: 309 },
  34: { easy_min: 444, easy_max: 400, marathon: 369, threshold: 344, interval: 324, repetition: 302 },
  35: { easy_min: 436, easy_max: 393, marathon: 362, threshold: 337, interval: 317, repetition: 296 },
  36: { easy_min: 428, easy_max: 386, marathon: 355, threshold: 330, interval: 311, repetition: 290 },
  37: { easy_min: 421, easy_max: 379, marathon: 348, threshold: 324, interval: 305, repetition: 284 },
  38: { easy_min: 414, easy_max: 373, marathon: 341, threshold: 318, interval: 299, repetition: 279 },
  39: { easy_min: 407, easy_max: 367, marathon: 335, threshold: 312, interval: 293, repetition: 273 },
  40: { easy_min: 401, easy_max: 361, marathon: 329, threshold: 306, interval: 288, repetition: 268 },
  41: { easy_min: 395, easy_max: 355, marathon: 323, threshold: 301, interval: 283, repetition: 263 },
  42: { easy_min: 389, easy_max: 350, marathon: 317, threshold: 295, interval: 278, repetition: 258 },
  43: { easy_min: 383, easy_max: 345, marathon: 312, threshold: 290, interval: 273, repetition: 254 },
  44: { easy_min: 378, easy_max: 340, marathon: 307, threshold: 285, interval: 268, repetition: 249 },
  45: { easy_min: 373, easy_max: 335, marathon: 302, threshold: 281, interval: 264, repetition: 245 },
  46: { easy_min: 368, easy_max: 331, marathon: 297, threshold: 276, interval: 259, repetition: 241 },
  47: { easy_min: 363, easy_max: 326, marathon: 292, threshold: 272, interval: 255, repetition: 237 },
  48: { easy_min: 358, easy_max: 322, marathon: 288, threshold: 268, interval: 251, repetition: 233 },
  49: { easy_min: 354, easy_max: 318, marathon: 284, threshold: 264, interval: 247, repetition: 229 },
  50: { easy_min: 350, easy_max: 314, marathon: 280, threshold: 260, interval: 243, repetition: 226 },
  51: { easy_min: 346, easy_max: 310, marathon: 276, threshold: 256, interval: 240, repetition: 222 },
  52: { easy_min: 342, easy_max: 307, marathon: 272, threshold: 253, interval: 236, repetition: 219 },
  53: { easy_min: 338, easy_max: 303, marathon: 269, threshold: 249, interval: 233, repetition: 216 },
  54: { easy_min: 334, easy_max: 300, marathon: 265, threshold: 246, interval: 230, repetition: 213 },
  55: { easy_min: 331, easy_max: 297, marathon: 262, threshold: 243, interval: 227, repetition: 210 },
  56: { easy_min: 327, easy_max: 294, marathon: 259, threshold: 240, interval: 224, repetition: 207 },
  57: { easy_min: 324, easy_max: 291, marathon: 256, threshold: 237, interval: 221, repetition: 204 },
  58: { easy_min: 321, easy_max: 288, marathon: 253, threshold: 234, interval: 218, repetition: 202 },
  59: { easy_min: 318, easy_max: 285, marathon: 250, threshold: 231, interval: 215, repetition: 199 },
  60: { easy_min: 315, easy_max: 283, marathon: 247, threshold: 228, interval: 213, repetition: 197 },
  61: { easy_min: 312, easy_max: 280, marathon: 244, threshold: 226, interval: 210, repetition: 194 },
  62: { easy_min: 309, easy_max: 278, marathon: 242, threshold: 223, interval: 208, repetition: 192 },
  63: { easy_min: 307, easy_max: 275, marathon: 239, threshold: 221, interval: 205, repetition: 190 },
  64: { easy_min: 304, easy_max: 273, marathon: 237, threshold: 218, interval: 203, repetition: 187 },
  65: { easy_min: 302, easy_max: 271, marathon: 234, threshold: 216, interval: 201, repetition: 185 },
  66: { easy_min: 299, easy_max: 268, marathon: 232, threshold: 214, interval: 199, repetition: 183 },
  67: { easy_min: 297, easy_max: 266, marathon: 230, threshold: 212, interval: 197, repetition: 181 },
  68: { easy_min: 295, easy_max: 264, marathon: 228, threshold: 210, interval: 195, repetition: 179 },
  69: { easy_min: 292, easy_max: 262, marathon: 225, threshold: 208, interval: 193, repetition: 178 },
  70: { easy_min: 290, easy_max: 260, marathon: 223, threshold: 206, interval: 191, repetition: 176 },
  71: { easy_min: 288, easy_max: 258, marathon: 221, threshold: 204, interval: 189, repetition: 174 },
  72: { easy_min: 286, easy_max: 256, marathon: 219, threshold: 202, interval: 187, repetition: 172 },
  73: { easy_min: 284, easy_max: 255, marathon: 217, threshold: 200, interval: 186, repetition: 171 },
  74: { easy_min: 282, easy_max: 253, marathon: 216, threshold: 199, interval: 184, repetition: 169 },
  75: { easy_min: 280, easy_max: 251, marathon: 214, threshold: 197, interval: 182, repetition: 167 },
  76: { easy_min: 278, easy_max: 249, marathon: 212, threshold: 195, interval: 181, repetition: 166 },
  77: { easy_min: 276, easy_max: 248, marathon: 210, threshold: 194, interval: 179, repetition: 164 },
  78: { easy_min: 275, easy_max: 246, marathon: 209, threshold: 192, interval: 178, repetition: 163 },
  79: { easy_min: 273, easy_max: 245, marathon: 207, threshold: 191, interval: 176, repetition: 161 },
  80: { easy_min: 271, easy_max: 243, marathon: 205, threshold: 189, interval: 175, repetition: 160 },
  81: { easy_min: 270, easy_max: 242, marathon: 204, threshold: 188, interval: 173, repetition: 158 },
  82: { easy_min: 268, easy_max: 240, marathon: 202, threshold: 186, interval: 172, repetition: 157 },
  83: { easy_min: 267, easy_max: 239, marathon: 201, threshold: 185, interval: 171, repetition: 156 },
  84: { easy_min: 265, easy_max: 238, marathon: 199, threshold: 184, interval: 169, repetition: 154 },
  85: { easy_min: 264, easy_max: 236, marathon: 198, threshold: 182, interval: 168, repetition: 153 },
}

// Race time predictions from VDOT (seconds) for common distances
// Uses Riegel formula: T2 = T1 * (D2/D1)^1.06
const VDOT_RACE_TIMES: Record<number, { '5k': number; '10k': number; 'half': number; 'marathon': number }> = {
  30: { '5k': 1560, '10k': 3240, half: 7200, marathon: 15300 },
  31: { '5k': 1512, '10k': 3138, half: 6978, marathon: 14838 },
  32: { '5k': 1467, '10k': 3042, half: 6768, marathon: 14394 },
  33: { '5k': 1425, '10k': 2952, half: 6570, marathon: 13968 },
  34: { '5k': 1386, '10k': 2868, half: 6384, marathon: 13572 },
  35: { '5k': 1349, '10k': 2790, half: 6210, marathon: 13206 },
  36: { '5k': 1314, '10k': 2718, half: 6048, marathon: 12852 },
  37: { '5k': 1281, '10k': 2649, half: 5892, marathon: 12522 },
  38: { '5k': 1250, '10k': 2583, half: 5748, marathon: 12204 },
  39: { '5k': 1221, '10k': 2523, half: 5610, marathon: 11904 },
  40: { '5k': 1194, '10k': 2466, half: 5484, marathon: 11622 },
  41: { '5k': 1168, '10k': 2412, half: 5364, marathon: 11352 },
  42: { '5k': 1143, '10k': 2361, half: 5250, marathon: 11094 },
  43: { '5k': 1120, '10k': 2313, half: 5142, marathon: 10848 },
  44: { '5k': 1098, '10k': 2268, half: 5040, marathon: 10614 },
  45: { '5k': 1077, '10k': 2226, half: 4944, marathon: 10392 },
  46: { '5k': 1057, '10k': 2184, half: 4851, marathon: 10182 },
  47: { '5k': 1038, '10k': 2145, half: 4761, marathon: 9978 },
  48: { '5k': 1020, '10k': 2108, half: 4677, marathon: 9786 },
  49: { '5k': 1003, '10k': 2073, half: 4596, marathon: 9600 },
  50: { '5k': 987,  '10k': 2040, half: 4518, marathon: 9420 },
  51: { '5k': 972,  '10k': 2008, half: 4443, marathon: 9246 },
  52: { '5k': 957,  '10k': 1978, half: 4374, marathon: 9078 },
  53: { '5k': 943,  '10k': 1950, half: 4308, marathon: 8916 },
  54: { '5k': 930,  '10k': 1923, half: 4245, marathon: 8760 },
  55: { '5k': 917,  '10k': 1897, half: 4185, marathon: 8610 },
  56: { '5k': 905,  '10k': 1872, half: 4128, marathon: 8466 },
  57: { '5k': 893,  '10k': 1848, half: 4074, marathon: 8328 },
  58: { '5k': 882,  '10k': 1826, half: 4023, marathon: 8196 },
  59: { '5k': 871,  '10k': 1804, half: 3975, marathon: 8070 },
  60: { '5k': 861,  '10k': 1783, half: 3927, marathon: 7944 },
  61: { '5k': 851,  '10k': 1763, half: 3882, marathon: 7824 },
  62: { '5k': 842,  '10k': 1744, half: 3840, marathon: 7710 },
  63: { '5k': 833,  '10k': 1726, half: 3798, marathon: 7596 },
  64: { '5k': 824,  '10k': 1708, half: 3759, marathon: 7488 },
  65: { '5k': 815,  '10k': 1691, half: 3720, marathon: 7380 },
  66: { '5k': 807,  '10k': 1675, half: 3684, marathon: 7278 },
  67: { '5k': 799,  '10k': 1659, half: 3648, marathon: 7176 },
  68: { '5k': 791,  '10k': 1644, half: 3615, marathon: 7080 },
  69: { '5k': 784,  '10k': 1629, half: 3582, marathon: 6984 },
  70: { '5k': 777,  '10k': 1615, half: 3549, marathon: 6894 },
  71: { '5k': 770,  '10k': 1601, half: 3519, marathon: 6804 },
  72: { '5k': 763,  '10k': 1588, half: 3489, marathon: 6720 },
  73: { '5k': 757,  '10k': 1575, half: 3459, marathon: 6636 },
  74: { '5k': 751,  '10k': 1563, half: 3432, marathon: 6558 },
  75: { '5k': 745,  '10k': 1551, half: 3405, marathon: 6480 },
  76: { '5k': 739,  '10k': 1539, half: 3378, marathon: 6402 },
  77: { '5k': 733,  '10k': 1528, half: 3354, marathon: 6330 },
  78: { '5k': 728,  '10k': 1517, half: 3330, marathon: 6258 },
  79: { '5k': 723,  '10k': 1507, half: 3306, marathon: 6192 },
  80: { '5k': 718,  '10k': 1497, half: 3282, marathon: 6126 },
  81: { '5k': 713,  '10k': 1487, half: 3261, marathon: 6066 },
  82: { '5k': 708,  '10k': 1477, half: 3240, marathon: 6006 },
  83: { '5k': 703,  '10k': 1468, half: 3219, marathon: 5946 },
  84: { '5k': 699,  '10k': 1459, half: 3198, marathon: 5886 },
  85: { '5k': 695,  '10k': 1450, half: 3180, marathon: 5832 },
}

// Clamp VDOT to table range
function clampVdot(vdot: number): number {
  return Math.min(85, Math.max(30, Math.round(vdot)))
}

// Look up pace zones for a given VDOT
export function getPaceZones(vdot: number): VdotPaces {
  return VDOT_TABLE[clampVdot(vdot)]
}

// Interpolate pace zones between two VDOTs (for phase-by-phase progression)
export function interpolatePaceZones(startVdot: number, targetVdot: number, fraction: number): VdotPaces {
  const start = VDOT_TABLE[clampVdot(startVdot)]
  const target = VDOT_TABLE[clampVdot(targetVdot)]
  const lerp = (a: number, b: number) => Math.round(a + (b - a) * fraction)
  return {
    easy_min: lerp(start.easy_min, target.easy_min),
    easy_max: lerp(start.easy_max, target.easy_max),
    marathon: lerp(start.marathon, target.marathon),
    threshold: lerp(start.threshold, target.threshold),
    interval: lerp(start.interval, target.interval),
    repetition: lerp(start.repetition, target.repetition),
  }
}

// Estimate VDOT from a race performance using Riegel + binary search
// distanceKm: race distance in km, timeSeconds: finish time in seconds
export function estimateVdot(distanceKm: number, timeSeconds: number): number {
  // Use Riegel to normalise to 5K equivalent, then binary-search VDOT table
  // T_5k = timeSeconds * (5 / distanceKm)^1.06
  const t5k = timeSeconds * Math.pow(5 / distanceKm, 1.06)

  let best = 30
  let bestDiff = Infinity
  for (let v = 30; v <= 85; v++) {
    const tableT5k = VDOT_RACE_TIMES[v]['5k']
    const diff = Math.abs(tableT5k - t5k)
    if (diff < bestDiff) { bestDiff = diff; best = v }
  }
  return best
}

// Get predicted race time in seconds for a given VDOT and distance
export function getRaceTime(vdot: number, distanceKm: number): number {
  const clamped = clampVdot(vdot)
  const times = VDOT_RACE_TIMES[clamped]

  if (distanceKm <= 5.1) return times['5k']
  if (distanceKm <= 10.1) return times['10k']
  if (distanceKm <= 21.2) return times['half']
  if (distanceKm <= 42.3) return times['marathon']

  // Ultramarathon / other — use Riegel from marathon
  return Math.round(times['marathon'] * Math.pow(distanceKm / 42.195, 1.06))
}