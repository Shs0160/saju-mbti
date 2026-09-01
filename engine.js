/* ============================================================
   만세력 엔진: 천문 계산 기반
   - 태양 황경(Meeus) → 24절기 실시각
   - 삭(new moon, Meeus ch.49) → 음력 변환 / 윤달 판정
   - 한국 표준시 역사(UTC+8:30 구간) + 서머타임 보정
   - 사주 사기둥 / 지장간 / 십신 / 오행 / 신강약 / 대운 / 신살
   ============================================================ */

const RAD = Math.PI / 180;

/* ---------- 기본 상수표 ---------- */
const GAN = [
  { k: '갑', h: '甲', e: '목', yin: false },
  { k: '을', h: '乙', e: '목', yin: true },
  { k: '병', h: '丙', e: '화', yin: false },
  { k: '정', h: '丁', e: '화', yin: true },
  { k: '무', h: '戊', e: '토', yin: false },
  { k: '기', h: '己', e: '토', yin: true },
  { k: '경', h: '庚', e: '금', yin: false },
  { k: '신', h: '辛', e: '금', yin: true },
  { k: '임', h: '壬', e: '수', yin: false },
  { k: '계', h: '癸', e: '수', yin: true },
];

const JI = [
  { k: '자', h: '子', e: '수', yin: false, animal: '쥐',   hidden: [['계', 30]] },
  { k: '축', h: '丑', e: '토', yin: true,  animal: '소',   hidden: [['계', 9], ['신', 3], ['기', 18]] },
  { k: '인', h: '寅', e: '목', yin: false, animal: '호랑이', hidden: [['무', 7], ['병', 7], ['갑', 16]] },
  { k: '묘', h: '卯', e: '목', yin: true,  animal: '토끼', hidden: [['을', 30]] },
  { k: '진', h: '辰', e: '토', yin: false, animal: '용',   hidden: [['을', 9], ['계', 3], ['무', 18]] },
  { k: '사', h: '巳', e: '화', yin: true,  animal: '뱀',   hidden: [['무', 7], ['경', 7], ['병', 16]] },
  { k: '오', h: '午', e: '화', yin: false, animal: '말',   hidden: [['병', 10], ['기', 9], ['정', 11]] },
  { k: '미', h: '未', e: '토', yin: true,  animal: '양',   hidden: [['정', 9], ['을', 3], ['기', 18]] },
  { k: '신', h: '申', e: '금', yin: false, animal: '원숭이', hidden: [['무', 7], ['임', 7], ['경', 16]] },
  { k: '유', h: '酉', e: '금', yin: true,  animal: '닭',   hidden: [['신', 30]] },
  { k: '술', h: '戌', e: '토', yin: false, animal: '개',   hidden: [['신', 9], ['정', 3], ['무', 18]] },
  { k: '해', h: '亥', e: '수', yin: true,  animal: '돼지', hidden: [['무', 7], ['갑', 7], ['임', 16]] },
];

const GAN_IDX = {}; GAN.forEach((g, i) => GAN_IDX[g.k] = i);
const OHENG = ['목', '화', '토', '금', '수'];
const SAENG = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' };   // 생
const GEUK  = { 목: '토', 토: '수', 수: '화', 화: '금', 금: '목' };   // 극

/* 24절기: index 0 = 소한(황경 285°), 절기 순서대로 15°씩 */
const SOLAR_TERMS = [
  '소한', '대한', '입춘', '우수', '경칩', '춘분', '청명', '곡우',
  '입하', '소만', '망종', '하지', '소서', '대서', '입추', '처서',
  '백로', '추분', '한로', '상강', '입동', '소설', '대설', '동지',
];
/* 12절(節): 월이 바뀌는 기준. 절기명 → 월지 index */
const JEOL_TO_BRANCH = {
  입춘: 2, 경칩: 3, 청명: 4, 입하: 5, 망종: 6, 소서: 7,
  입추: 8, 백로: 9, 한로: 10, 입동: 11, 대설: 0, 소한: 1,
};

/* ---------- 율리우스일 ---------- */
function gregorianToJDN(y, m, d) {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy
    + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}
function jdnToGregorian(jdn) {
  let a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor(146097 * b / 4);
  const d2 = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor(1461 * d2 / 4);
  const m = Math.floor((5 * e + 2) / 153);
  return {
    d: e - Math.floor((153 * m + 2) / 5) + 1,
    m: m + 3 - 12 * Math.floor(m / 10),
    y: 100 * b + d2 - 4800 + Math.floor(m / 10),
  };
}
/* JD (UT) from UTC calendar datetime */
function utcToJD(y, m, d, hour) {
  return gregorianToJDN(y, m, d) - 0.5 + hour / 24;
}

/* ---------- ΔT (TT - UT), 초 ---------- */
function deltaT(year) {
  let t, u;
  if (year < 1900) { u = (year - 1820) / 100; return -20 + 32 * u * u; }
  if (year < 1920) { t = year - 1900; return -2.79 + 1.494119 * t - 0.0598939 * t * t + 0.0061966 * t ** 3 - 0.000197 * t ** 4; }
  if (year < 1941) { t = year - 1920; return 21.20 + 0.84493 * t - 0.076100 * t * t + 0.0020936 * t ** 3; }
  if (year < 1961) { t = year - 1950; return 29.07 + 0.407 * t - t * t / 233 + t ** 3 / 2547; }
  if (year < 1986) { t = year - 1975; return 45.45 + 1.067 * t - t * t / 260 - t ** 3 / 718; }
  if (year < 2005) { t = year - 2000; return 63.86 + 0.3345 * t - 0.060374 * t * t + 0.0017275 * t ** 3 + 0.000651814 * t ** 4 + 0.00002373599 * t ** 5; }
  if (year < 2050) { t = year - 2000; return 62.92 + 0.32217 * t + 0.005589 * t * t; }
  if (year < 2150) { u = (year - 1820) / 100; return -20 + 32 * u * u - 0.5628 * (2150 - year); }
  u = (year - 1820) / 100; return -20 + 32 * u * u;
}
function jdYear(jd) { const g = jdnToGregorian(Math.floor(jd + 0.5)); return g.y + (g.m - 0.5) / 12; }

/* ---------- 태양 겉보기 황경 (도): VSOP87D 절단 급수, jde: JD in TT ---------- */
const VL0 = [[175347046,0,0],[3341656,4.6692568,6283.07585],[34894,4.6261,12566.1517],[3497,2.7441,5753.3849],[3418,2.8289,3.5231],[3136,3.6277,77713.7715],[2676,4.4181,7860.4194],[2343,6.1352,3930.2097],[1324,0.7425,11506.7698],[1273,2.0371,529.691],[1199,1.1096,1577.3435],[990,5.233,5884.927],[902,2.045,26.298],[857,3.508,398.149],[780,1.179,5223.694],[753,2.533,5507.553],[505,4.583,18849.228],[492,4.205,775.523],[357,2.92,0.067],[317,5.849,11790.629],[284,1.899,796.298],[271,0.315,10977.079],[243,0.345,5486.778],[206,4.806,2544.314],[205,1.869,5573.143],[202,2.458,6069.777],[156,0.833,213.299],[132,3.411,2942.463],[126,1.083,20.775],[115,0.645,0.98],[103,0.636,4694.003],[102,0.976,15720.839],[102,4.267,7.114],[99,6.21,2146.17],[98,0.68,155.42],[86,5.98,161000.69],[85,1.3,6275.96],[85,3.67,71430.7],[80,1.81,17260.15],[79,3.04,12036.46],[75,1.76,5088.63],[74,3.5,3154.69],[74,4.68,801.82],[70,0.83,9437.76],[62,3.98,8827.39],[61,1.82,7084.9],[57,2.78,6286.6],[56,4.39,14143.5],[56,3.47,6279.55],[52,0.19,12139.55],[52,1.33,1748.02],[51,0.28,5856.48],[49,0.49,1194.45],[41,5.37,8429.24],[41,2.4,19651.05],[39,6.17,10447.39],[37,6.04,10213.29],[37,2.57,1059.38],[36,1.71,2352.87],[36,1.78,6812.77],[33,0.59,17789.85],[30,0.44,83996.85],[30,2.74,1349.87],[25,3.16,4690.48]];
const VL1 = [[628331966747,0,0],[206059,2.678235,6283.07585],[4303,2.6351,12566.1517],[425,1.59,3.523],[119,5.796,26.298],[109,2.966,1577.344],[93,2.59,18849.23],[72,1.14,529.69],[68,1.87,398.15],[67,4.41,5507.55],[59,2.89,5223.69],[56,2.17,155.42],[45,0.4,796.3],[36,0.47,775.52],[29,2.65,7.11],[21,5.34,0.98],[19,1.85,5486.78],[19,4.97,213.3],[17,2.99,6275.96],[16,0.03,2544.31],[16,1.43,2146.17],[15,1.21,10977.08],[12,2.83,1748.02],[12,3.26,5088.63],[12,5.27,1194.45],[12,2.08,4694],[11,0.77,553.57],[10,1.3,6286.6],[10,4.24,1349.87],[9,2.7,242.73],[9,5.64,951.72],[8,5.3,2352.87],[6,2.65,9437.76],[6,4.67,4690.48]];
const VL2 = [[52919,0,0],[8720,1.0721,6283.0758],[309,0.867,12566.152],[27,0.05,3.52],[16,5.19,26.3],[16,3.68,155.42],[10,0.76,18849.23],[9,2.06,77713.77],[7,0.83,775.52],[5,4.66,1577.34],[4,1.03,7.11],[4,3.44,5573.14],[3,5.14,796.3],[3,6.05,5507.55],[3,1.19,242.73],[3,6.12,529.69],[3,0.31,398.15],[3,2.28,553.57],[2,4.38,5223.69],[2,3.75,0.98]];
const VL3 = [[289,5.844,6283.076],[35,0,0],[17,5.49,12566.15],[3,5.2,155.42],[1,4.72,3.52],[1,5.3,18849.23],[1,5.97,242.73]];
const VL4 = [[114,3.142,0],[8,4.13,6283.08],[1,3.84,12566.15]];
const VL5 = [[1,3.14,0]];
function vsopSeries(terms, tau) {
  let s = 0;
  for (const [a, b, c] of terms) s += a * Math.cos(b + c * tau);
  return s;
}
function sunApparentLongitude(jde) {
  const tau = (jde - 2451545) / 365250;
  const L = (vsopSeries(VL0, tau) + vsopSeries(VL1, tau) * tau + vsopSeries(VL2, tau) * tau ** 2
    + vsopSeries(VL3, tau) * tau ** 3 + vsopSeries(VL4, tau) * tau ** 4
    + vsopSeries(VL5, tau) * tau ** 5) / 1e8 / RAD;
  const T = (jde - 2451545) / 36525;
  const theta = L + 180 - 0.09033 / 3600;              // 지구 황경 → 태양 황경 + FK5 보정
  const om = (125.04452 - 1934.136261 * T + 0.0020708 * T * T) * RAD;
  const Ls = (280.4665 + 36000.7698 * T) * RAD;
  const Lm = (218.3165 + 481267.8813 * T) * RAD;
  const dpsi = (-17.20 * Math.sin(om) - 1.32 * Math.sin(2 * Ls)
    - 0.23 * Math.sin(2 * Lm) + 0.21 * Math.sin(2 * om)) / 3600;   // 장동(章動)
  const aberration = -20.4898 / 3600;                              // 광행차
  return ((theta + dpsi + aberration) % 360 + 360) % 360;
}

/* 태양 황경이 target(도)이 되는 순간의 JD(UT). guess 근처에서 탐색 */
function solveSolarLongitude(target, guessJD) {
  let jd = guessJD;
  for (let i = 0; i < 30; i++) {
    const jde = jd + deltaT(jdYear(jd)) / 86400;
    let diff = sunApparentLongitude(jde) - target;
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;
    const step = diff / 0.9856; // 하루 약 0.9856도
    jd -= step;
    if (Math.abs(step) < 1e-7) break;
  }
  return jd;
}

/* year년의 24절기 JD(UT) 배열: SOLAR_TERMS 순서 (소한부터) */
const _termCache = new Map();
function solarTermsOfYear(year) {
  if (_termCache.has(year)) return _termCache.get(year);
  const out = SOLAR_TERMS.map((name, i) => {
    const target = (285 + i * 15) % 360;
    // 소한(285°)은 1월 초, 이후 15°마다 약 15.2일
    const guess = gregorianToJDN(year, 1, 6) - 0.5 + i * 15.22;
    const jd = solveSolarLongitude(target, guess);
    return { name, jd, deg: target };
  });
  _termCache.set(year, out);
  return out;
}

/* ---------- 삭(합삭): Meeus 49장 ---------- */
function newMoonJD(k) {
  const T = k / 1236.85;
  let jde = 2451550.09766 + 29.530588861 * k
    + 0.00015437 * T * T - 0.000000150 * T ** 3 + 0.00000000073 * T ** 4;
  const E = 1 - 0.002516 * T - 0.0000074 * T * T;
  const M = (2.5534 + 29.10535670 * k - 0.0000014 * T * T - 0.00000011 * T ** 3) * RAD;
  const Mp = (201.5643 + 385.81693528 * k + 0.0107582 * T * T + 0.00001238 * T ** 3 - 0.000000058 * T ** 4) * RAD;
  const F = (160.7108 + 390.67050284 * k - 0.0016118 * T * T - 0.00000227 * T ** 3 + 0.000000011 * T ** 4) * RAD;
  const O = (124.7746 - 1.56375588 * k + 0.0020672 * T * T + 0.00000215 * T ** 3) * RAD;
  jde += -0.40720 * Math.sin(Mp)
    + 0.17241 * E * Math.sin(M)
    + 0.01608 * Math.sin(2 * Mp)
    + 0.01039 * Math.sin(2 * F)
    + 0.00739 * E * Math.sin(Mp - M)
    - 0.00514 * E * Math.sin(Mp + M)
    + 0.00208 * E * E * Math.sin(2 * M)
    - 0.00111 * Math.sin(Mp - 2 * F)
    - 0.00057 * Math.sin(Mp + 2 * F)
    + 0.00056 * E * Math.sin(2 * Mp + M)
    - 0.00042 * Math.sin(3 * Mp)
    + 0.00042 * E * Math.sin(M + 2 * F)
    + 0.00038 * E * Math.sin(M - 2 * F)
    - 0.00024 * E * Math.sin(2 * Mp - M)
    - 0.00017 * Math.sin(O)
    - 0.00007 * Math.sin(Mp + 2 * M)
    + 0.00004 * Math.sin(2 * Mp - 2 * F)
    + 0.00004 * Math.sin(3 * M)
    + 0.00003 * Math.sin(Mp + M - 2 * F)
    + 0.00003 * Math.sin(2 * Mp + 2 * F)
    - 0.00003 * Math.sin(Mp + M + 2 * F)
    + 0.00003 * Math.sin(Mp - M + 2 * F)
    - 0.00002 * Math.sin(Mp - M - 2 * F)
    - 0.00002 * Math.sin(3 * Mp + M)
    + 0.00002 * Math.sin(4 * Mp);
  // 추가 보정항 (A1~A14 주요항)
  const A = [
    [299.77 + 0.107408 * k - 0.009173 * T * T, 0.000325],
    [251.88 + 0.016321 * k, 0.000165],
    [251.83 + 26.651886 * k, 0.000164],
    [349.42 + 36.412478 * k, 0.000126],
    [84.66 + 18.206239 * k, 0.000110],
    [141.74 + 53.303771 * k, 0.000062],
    [207.14 + 2.453732 * k, 0.000060],
    [154.84 + 7.306860 * k, 0.000056],
    [34.52 + 27.261239 * k, 0.000047],
    [207.19 + 0.121824 * k, 0.000042],
    [291.34 + 1.844379 * k, 0.000040],
    [161.72 + 24.198154 * k, 0.000037],
    [239.56 + 25.513099 * k, 0.000035],
    [331.55 + 3.592518 * k, 0.000023],
  ];
  for (const [ang, amp] of A) jde += amp * Math.sin(ang * RAD);
  return jde - deltaT(jdYear(jde)) / 86400; // → UT
}

/* ---------- 한국 표준시 오프셋(시간 단위) + 서머타임 ---------- */
const DST_RANGES = [ // [시작 y,m,d, 끝 y,m,d]: 대한민국 일광절약시간제 시행 구간
  [1948, 6, 1, 1948, 9, 13], [1949, 4, 3, 1949, 9, 11], [1950, 4, 1, 1950, 9, 11],
  [1951, 5, 6, 1951, 9, 9], [1955, 5, 5, 1955, 9, 9], [1956, 5, 20, 1956, 9, 30],
  [1957, 5, 5, 1957, 9, 22], [1958, 5, 4, 1958, 9, 21], [1959, 5, 3, 1959, 9, 20],
  [1960, 5, 1, 1960, 9, 18], [1987, 5, 10, 1987, 10, 11], [1988, 5, 8, 1988, 10, 9],
];
function koreaStandardOffset(y, m, d) {
  const n = gregorianToJDN(y, m, d);
  // 1908-04-01 ~ 1911-12-31 : UTC+8:30
  if (n >= gregorianToJDN(1908, 4, 1) && n < gregorianToJDN(1912, 1, 1)) return 8.5;
  // 1954-03-21 ~ 1961-08-09 : UTC+8:30
  if (n >= gregorianToJDN(1954, 3, 21) && n < gregorianToJDN(1961, 8, 10)) return 8.5;
  return 9;
}
function dstOffset(y, m, d) {
  const n = gregorianToJDN(y, m, d);
  for (const r of DST_RANGES) {
    if (n >= gregorianToJDN(r[0], r[1], r[2]) && n < gregorianToJDN(r[3], r[4], r[5])) return 1;
  }
  return 0;
}

/* ---------- 음력 ↔ 양력 ----------
   시헌력 규칙: 동지가 든 달 = 음력 11월. 두 11월 사이 달이 13개면
   중기(황경 30° 배수 통과)가 없는 첫 달이 윤달.                       */
function kstDayFromJD(jd) { // JD(UT) → KST 기준 날짜의 JDN
  return Math.floor(jd + 0.5 + 9 / 24);
}
/* year년 동지 직전 11월부터 시작하는 음력 달 목록 생성 */
const _lunarCache = new Map();
function lunarMonthsFor(year) {
  if (_lunarCache.has(year)) return _lunarCache.get(year);
  // 기준: (year-1)년 동지와 year년 동지
  const dz0 = solveSolarLongitude(270, gregorianToJDN(year - 1, 12, 22) - 0.5);
  const dz1 = solveSolarLongitude(270, gregorianToJDN(year, 12, 22) - 0.5);
  // 동지가 든 달의 삭 찾기
  const kOf = (jd) => Math.floor((jd - 2451550.09766) / 29.530588861);
  const nmDay = (k) => kstDayFromJD(newMoonJD(k));
  let k0 = kOf(dz0);
  while (nmDay(k0) > kstDayFromJD(dz0)) k0--;
  while (nmDay(k0 + 1) <= kstDayFromJD(dz0)) k0++;
  let k1 = kOf(dz1);
  while (nmDay(k1) > kstDayFromJD(dz1)) k1--;
  while (nmDay(k1 + 1) <= kstDayFromJD(dz1)) k1++;

  const count = k1 - k0; // 두 11월 사이 달 수 (12 or 13)
  const months = [];
  for (let i = 0; i <= count; i++) {
    months.push({ k: k0 + i, start: nmDay(k0 + i), end: nmDay(k0 + i + 1) - 1 });
  }
  // 중기 포함 여부
  const hasZhongqi = (mo) => {
    // 중기 = 황경 0,30,...330 중 하나를 [start, end] 사이에 통과
    for (let deg = 0; deg < 360; deg += 30) {
      // 해당 각도의 통과 시각을 근처 연도에서 탐색
      for (const yy of [year - 1, year]) {
        const approxDayOfYear = ((deg + 90) % 360) / 360 * 365.2422; // 285°=소한 1/6 기준 보정
        const guess = gregorianToJDN(yy, 1, 1) - 0.5 + (((deg - 280 + 360) % 360) / 0.9856);
        const jd = solveSolarLongitude(deg, guess);
        const day = kstDayFromJD(jd);
        if (day >= mo.start && day <= mo.end) return true;
      }
    }
    return false;
  };
  let leapIdx = -1;
  if (count === 13) {
    for (let i = 1; i < months.length - 1; i++) {
      if (!hasZhongqi(months[i])) { leapIdx = i; break; }
    }
    if (leapIdx === -1) leapIdx = 1;
  }
  // 월 번호 붙이기: index 0 = 11월
  let num = 11, leap = false;
  for (let i = 0; i < months.length; i++) {
    if (i === leapIdx) {
      months[i].num = months[i - 1].num; months[i].leap = true;
    } else {
      months[i].num = num; months[i].leap = false;
      num = num % 12 + 1;
    }
  }
  _lunarCache.set(year, months);
  return months;
}

/* 각 달에 음력 연도(lyear)를 부여한 표.
   lunarMonthsFor(yy)는 (yy-1)동지 ~ (yy)동지 구간 = [11월, 12월, 1월 … 10월, 11월].
   앞의 11·12월은 음력 yy-1년, 정월부터가 음력 yy년. */
function lunarTable(yy) {
  const set = lunarMonthsFor(yy);
  let ly = yy - 1;                       // 표의 앞머리(11월·12월)는 지난 음력 해
  return set.map((mo) => {
    if (mo.num === 1 && !mo.leap) ly = yy;   // 정월부터 새 음력 해
    return { ...mo, lyear: ly };
  });
}

/* 음력(년,월,일,윤달여부) → 양력 {y,m,d} */
function lunarToSolar(ly, lm, ld, isLeap) {
  for (const yy of [ly, ly + 1]) {
    for (const mo of lunarTable(yy)) {
      if (mo.lyear !== ly || mo.num !== lm || !!mo.leap !== !!isLeap) continue;
      const jdn = mo.start + (ld - 1);
      if (jdn > mo.end) return null;      // 그 달에 없는 날짜
      return jdnToGregorian(jdn);
    }
  }
  return null;
}

/* 양력 → 음력 {y,m,d,leap} */
function solarToLunar(y, m, d) {
  const jdn = gregorianToJDN(y, m, d);
  for (const yy of [y, y + 1]) {
    for (const mo of lunarTable(yy)) {
      if (jdn >= mo.start && jdn <= mo.end) {
        return { y: mo.lyear, m: mo.num, d: jdn - mo.start + 1, leap: !!mo.leap };
      }
    }
  }
  return null;
}

/* 음력 해당 달의 일수 (입력 검증용) */
function lunarMonthLength(ly, lm, isLeap) {
  for (const yy of [ly, ly + 1]) {
    for (const mo of lunarTable(yy)) {
      if (mo.lyear === ly && mo.num === lm && !!mo.leap === !!isLeap) return mo.end - mo.start + 1;
    }
  }
  return 0;
}

/* 그 음력 해에 존재하는 윤달 번호 (없으면 0) */
function leapMonthOf(ly) {
  for (const yy of [ly, ly + 1]) {
    for (const mo of lunarTable(yy)) if (mo.lyear === ly && mo.leap) return mo.num;
  }
  return 0;
}

/* ---------- 사주 산출 ---------- */
function buildSaju(opts) {
  const {
    year, month, day, hour, minute,
    unknownTime = false,
    gender = 'M',
    calendar = 'solar',   // 'solar' | 'lunar'
    leapMonth = false,
    longitude = 126.978,  // 출생지 경도 (기본 서울)
    trueSolar = true,     // 진태양시 보정
    lateNight = 'yaja',   // 'yaja' = 야자시(23시 이후 익일), 'joja' = 조자시(당일 유지)
  } = opts;

  let sy = year, sm = month, sd = day;
  if (calendar === 'lunar') {
    const g = lunarToSolar(year, month, day, leapMonth);
    if (!g) return { error: '해당 음력 날짜를 찾을 수 없어요. 윤달 여부와 날짜를 확인해 주세요.' };
    sy = g.y; sm = g.m; sd = g.d;
  }

  const hh = unknownTime ? 12 : hour;
  const mi = unknownTime ? 0 : minute;

  // 시계시각 → 표준시 보정 → 진태양시
  const stdOff = koreaStandardOffset(sy, sm, sd);
  const dst = dstOffset(sy, sm, sd);
  let clockHour = hh + mi / 60;
  const utcHour = clockHour - dst - stdOff;              // UTC 기준 시각
  const jdUT = utcToJD(sy, sm, sd, utcHour);
  // 진태양시(평균태양시 기준 경도 보정): 표준자오선 대비
  const meridian = stdOff * 15;
  const lonCorrMin = trueSolar ? (longitude - meridian) * 4 : 0;  // 분
  const localJD = jdUT + (stdOff / 24) + (lonCorrMin / 1440);      // 사주 판정용 '현지시' JD

  // ---- 년주: 입춘 기준
  const termsThis = solarTermsOfYear(sy);
  const ipchun = termsThis.find(t => t.name === '입춘').jd;
  let sajuYear = sy;
  const evalJD = jdUT + (lonCorrMin / 1440); // UT축 위의 실제 순간(경도보정 포함)
  if (evalJD < ipchun) sajuYear = sy - 1;
  const yearIdx = ((sajuYear - 1984) % 60 + 60) % 60;
  const yGan = yearIdx % 10, yJi = yearIdx % 12;

  // ---- 월주: 12절 기준
  const allTerms = [];
  for (const yy of [sy - 1, sy, sy + 1]) {
    for (const t of solarTermsOfYear(yy)) {
      if (JEOL_TO_BRANCH[t.name] !== undefined) allTerms.push({ ...t, year: yy });
    }
  }
  allTerms.sort((a, b) => a.jd - b.jd);
  let cur = allTerms[0];
  for (const t of allTerms) { if (t.jd <= evalJD) cur = t; else break; }
  const mJi = JEOL_TO_BRANCH[cur.name];
  // 오호둔: 갑기→병인, 을경→무인, 병신→경인, 정임→임인, 무계→갑인
  const monthOffset = ((mJi - 2) % 12 + 12) % 12;
  const mGan = ((yGan % 5) * 2 + 2 + monthOffset) % 10;

  // ---- 일주
  let dayJDN = gregorianToJDN(sy, sm, sd);
  // 진태양시 보정으로 날짜가 넘어갈 수 있음
  const localCivil = jdnToGregorian(Math.floor(localJD + 0.5));
  dayJDN = gregorianToJDN(localCivil.y, localCivil.m, localCivil.d);
  let localHour = (localJD + 0.5 - Math.floor(localJD + 0.5)) * 24;
  if (!unknownTime && lateNight === 'yaja' && localHour >= 23) dayJDN += 1;
  const dayIdx = ((dayJDN + 49) % 60 + 60) % 60;
  const dGan = dayIdx % 10, dJi = dayIdx % 12;

  // ---- 시주
  const hJi = unknownTime ? null : Math.floor(((localHour + 1) % 24) / 2);
  const hGan = unknownTime ? null : ((dGan % 5) * 2 + hJi) % 10;

  // ---- 대운
  const yangYear = !GAN[yGan].yin;
  const male = gender === 'M';
  const forward = (yangYear && male) || (!yangYear && !male);
  let boundary;
  if (forward) {
    boundary = allTerms.find(t => t.jd > evalJD);
  } else {
    const past = allTerms.filter(t => t.jd <= evalJD);
    boundary = past[past.length - 1];
  }
  const diffDays = Math.abs(boundary.jd - evalJD);
  const daeunAge = Math.max(1, Math.round(diffDays / 3 * 10) / 10);
  const startAge = Math.max(1, Math.round(diffDays / 3));
  const daeun = [];
  for (let i = 1; i <= 9; i++) {
    const step = forward ? i : -i;
    const gi = ((mGan + step) % 10 + 10) % 10;
    const ji = ((mJi + step) % 12 + 12) % 12;
    daeun.push({ age: startAge + (i - 1) * 10, gan: gi, ji: ji });
  }

  const pillars = {
    year: { gan: yGan, ji: yJi },
    month: { gan: mGan, ji: mJi },
    day: { gan: dGan, ji: dJi },
    hour: unknownTime ? null : { gan: hGan, ji: hJi },
  };

  return {
    solar: { y: sy, m: sm, d: sd, hour: hh, minute: mi },
    lunar: solarToLunar(sy, sm, sd),
    pillars,
    dayGan: dGan,
    gender, unknownTime,
    correction: { stdOffset: stdOff, dst, lonCorrMin: Math.round(lonCorrMin * 10) / 10 },
    jeolgi: cur.name,
    sajuYear,
    daeun, daeunAge, forward,
    ...analyze(pillars, dGan, unknownTime),
  };
}

/* ---------- 십신 ---------- */
function tenGod(dayGanIdx, targetGanIdx) {
  const me = GAN[dayGanIdx], t = GAN[targetGanIdx];
  const same = me.yin === t.yin;
  if (t.e === me.e) return same ? '비견' : '겁재';
  if (SAENG[me.e] === t.e) return same ? '식신' : '상관';
  if (GEUK[me.e] === t.e) return same ? '편재' : '정재';
  if (GEUK[t.e] === me.e) return same ? '편관' : '정관';
  if (SAENG[t.e] === me.e) return same ? '편인' : '정인';
  return '';
}
const GOD_GROUP = {
  비견: '비겁', 겁재: '비겁', 식신: '식상', 상관: '식상',
  편재: '재성', 정재: '재성', 편관: '관성', 정관: '관성',
  편인: '인성', 정인: '인성',
};

/* ---------- 종합 분석 ---------- */
function analyze(pillars, dGan, unknownTime) {
  const list = [];
  const push = (pos, type, idx) => list.push({ pos, type, idx });
  push('년', 'gan', pillars.year.gan); push('년', 'ji', pillars.year.ji);
  push('월', 'gan', pillars.month.gan); push('월', 'ji', pillars.month.ji);
  push('일', 'gan', pillars.day.gan); push('일', 'ji', pillars.day.ji);
  if (pillars.hour) { push('시', 'gan', pillars.hour.gan); push('시', 'ji', pillars.hour.ji); }

  // 오행 분포 (천간 1.0 / 지지 지장간 가중)
  const oheng = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  for (const it of list) {
    if (it.type === 'gan') oheng[GAN[it.idx].e] += 1;
    else {
      const hid = JI[it.idx].hidden;
      const total = hid.reduce((s, x) => s + x[1], 0);
      for (const [g, w] of hid) oheng[GAN[GAN_IDX[g]].e] += w / total;
    }
  }
  Object.keys(oheng).forEach(k => oheng[k] = Math.round(oheng[k] * 100) / 100);

  // 십신 분포
  const gods = {};
  const godGroups = { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 };
  for (const it of list) {
    if (it.pos === '일' && it.type === 'gan') continue;
    let g;
    if (it.type === 'gan') g = tenGod(dGan, it.idx);
    else {
      const hid = JI[it.idx].hidden;
      g = tenGod(dGan, GAN_IDX[hid[hid.length - 1][0]]); // 본기
    }
    gods[g] = (gods[g] || 0) + 1;
    godGroups[GOD_GROUP[g]] += 1;
  }

  // 신강/신약
  const me = GAN[dGan].e;
  const helps = (el) => el === me || SAENG[el] === me;    // 비겁 or 인성
  let score = 0;
  const mJiE = JI[pillars.month.ji].e;
  score += helps(mJiE) ? 3 : (GEUK[me] === mJiE || SAENG[me] === mJiE ? -2 : -1);
  const dJiE = JI[pillars.day.ji].e;
  score += helps(dJiE) ? 2 : -1;
  if (pillars.hour) score += helps(JI[pillars.hour.ji].e) ? 1 : -0.7;
  score += helps(JI[pillars.year.ji].e) ? 1 : -0.7;
  for (const p of ['year', 'month']) score += helps(GAN[pillars[p].gan].e) ? 1.3 : -0.9;
  if (pillars.hour) score += helps(GAN[pillars.hour.gan].e) ? 1.3 : -0.9;
  const strength = score >= 2.2 ? '신강' : score <= -1.6 ? '신약' : '중화';

  // 용신(간단): 신강 → 극·설, 신약 → 생·조
  let yongshin;
  if (strength === '신강') {
    const cands = [GEUK[me], SAENG[me], Object.keys(GEUK).find(k => GEUK[k] === me)];
    yongshin = cands.sort((a, b) => oheng[a] - oheng[b])[0];
  } else if (strength === '신약') {
    const cands = [me, Object.keys(SAENG).find(k => SAENG[k] === me)];
    yongshin = cands.sort((a, b) => oheng[a] - oheng[b])[0];
  } else {
    yongshin = Object.keys(oheng).sort((a, b) => oheng[a] - oheng[b])[0];
  }

  const sortedOheng = Object.entries(oheng).sort((a, b) => b[1] - a[1]);
  const strongest = sortedOheng[0][0];
  const weakest = sortedOheng[sortedOheng.length - 1][0];
  const missing = Object.keys(oheng).filter(k => oheng[k] < 0.35);

  // 신살
  const jis = [pillars.year.ji, pillars.month.ji, pillars.day.ji, ...(pillars.hour ? [pillars.hour.ji] : [])];
  const shinsal = [];
  const TRIAD = { 0: [8, 0, 4], 4: [8, 0, 4], 8: [8, 0, 4], 1: [5, 9, 1], 5: [5, 9, 1], 9: [5, 9, 1], 2: [2, 6, 10], 6: [2, 6, 10], 10: [2, 6, 10], 3: [11, 3, 7], 7: [11, 3, 7], 11: [11, 3, 7] };
  const bases = [pillars.year.ji, pillars.day.ji];
  const DOHWA = { 8: 9, 0: 9, 4: 9, 11: 0, 3: 0, 7: 0, 2: 3, 6: 3, 10: 3, 5: 6, 9: 6, 1: 6 };
  const YEOKMA = { 8: 2, 0: 2, 4: 2, 11: 5, 3: 5, 7: 5, 2: 8, 6: 8, 10: 8, 5: 11, 9: 11, 1: 11 };
  const HWAGAE = { 8: 4, 0: 4, 4: 4, 11: 7, 3: 7, 7: 7, 2: 10, 6: 10, 10: 10, 5: 1, 9: 1, 1: 1 };
  const has = (n) => jis.includes(n);
  for (const b of bases) {
    if (has(DOHWA[b]) && !shinsal.includes('도화살')) shinsal.push('도화살');
    if (has(YEOKMA[b]) && !shinsal.includes('역마살')) shinsal.push('역마살');
    if (has(HWAGAE[b]) && !shinsal.includes('화개살')) shinsal.push('화개살');
  }
  const CHEONEUL = { 0: [1, 7], 1: [0, 8], 2: [11, 9], 3: [11, 9], 4: [1, 7], 5: [0, 8], 6: [1, 7], 7: [6, 2], 8: [3, 5], 9: [3, 5] };
  if (CHEONEUL[dGan].some(has)) shinsal.push('천을귀인');
  const MUNCHANG = { 0: 5, 1: 6, 2: 8, 3: 9, 4: 8, 5: 9, 6: 11, 7: 0, 8: 2, 9: 3 };
  if (has(MUNCHANG[dGan])) shinsal.push('문창귀인');

  /* ---- 영역별 신살 ----
     홍염: 일간 기준 은근한 매력
     양인: 양간의 극단적 추진력 (건록 다음 자리)
     금여: 건록에서 두 칸 앞. 배우자 덕
     암록: 건록의 육합. 드러나지 않는 조력
     고란: 특정 일주. 홀로 서는 기운
     괴강: 특정 일주. 극단적 강함
     원진: 지지 두 글자가 짝을 이루면 애증 */
  const HONGYEOM = { 0: 6, 1: 6, 2: 2, 3: 7, 4: 4, 5: 4, 6: 10, 7: 9, 8: 0, 9: 8 };
  if (has(HONGYEOM[dGan])) shinsal.push('홍염살');

  const YANGIN = { 0: 3, 2: 6, 4: 6, 6: 9, 8: 0 };
  if (YANGIN[dGan] !== undefined && has(YANGIN[dGan])) shinsal.push('양인살');

  const GEUMYEO = { 0: 4, 1: 5, 2: 7, 3: 8, 4: 7, 5: 8, 6: 10, 7: 11, 8: 1, 9: 2 };
  if (has(GEUMYEO[dGan])) shinsal.push('금여');

  const AMROK = { 0: 11, 1: 10, 2: 8, 3: 7, 4: 8, 5: 7, 6: 5, 7: 4, 8: 2, 9: 1 };
  if (has(AMROK[dGan])) shinsal.push('암록');

  const dJi = pillars.day.ji;
  const GORAN = [[0, 2], [1, 5], [3, 5], [4, 8], [7, 11], [4, 6], [8, 0]];
  if (GORAN.some(([g, j]) => g === dGan && j === dJi)) shinsal.push('고란살');

  const GWAEGANG = [[6, 4], [6, 10], [8, 4], [8, 10], [4, 10]];
  if (GWAEGANG.some(([g, j]) => g === dGan && j === dJi)) shinsal.push('괴강살');

  const WONJIN = [[0, 7], [1, 6], [2, 9], [3, 8], [4, 11], [5, 10]];
  if (WONJIN.some(([a, b]) => jis.includes(a) && jis.includes(b))) shinsal.push('원진살');

  /* 일지(배우자궁)의 충·합 */
  const CHUNG = { 0: 6, 6: 0, 1: 7, 7: 1, 2: 8, 8: 2, 3: 9, 9: 3, 4: 10, 10: 4, 5: 11, 11: 5 };
  const YUKHAP = { 0: 1, 1: 0, 2: 11, 11: 2, 3: 10, 10: 3, 4: 9, 9: 4, 5: 8, 8: 5, 6: 7, 7: 6 };
  const others = jis.filter((_, i) => i !== 2);
  const spouseChung = others.includes(CHUNG[dJi]);
  const spouseHap = others.includes(YUKHAP[dJi]);

  // 일지(배우자궁) 십신
  const spouseGod = tenGod(dGan, GAN_IDX[JI[pillars.day.ji].hidden.slice(-1)[0][0]]);

  return {
    oheng, gods, godGroups, strength, strengthScore: Math.round(score * 10) / 10,
    yongshin, strongest, weakest, missing, shinsal, spouseGod, spouseChung, spouseHap,
    dominantGod: Object.entries(godGroups).sort((a, b) => b[1] - a[1])[0][0],
  };
}

/* ---------- 십이운성(十二運星) ----------
   일간이 각 지지에서 갖는 기운의 단계. 양간은 순행, 음간은 역행한다.
   갑木 장생 亥 / 을木 장생 午 / 병戊 장생 寅 / 정己 장생 酉
   경金 장생 巳 / 신金 장생 子 / 임水 장생 申 / 계水 장생 卯 */
const STAGES = ['장생', '목욕', '관대', '건록', '제왕', '쇠', '병', '사', '묘', '절', '태', '양'];
const JANGSAENG = { 0: 11, 1: 6, 2: 2, 3: 9, 4: 2, 5: 9, 6: 5, 7: 0, 8: 8, 9: 3 };

function twelveStage(dayGanIdx, jiIdx) {
  const start = JANGSAENG[dayGanIdx];
  const yin = GAN[dayGanIdx].yin;
  const i = yin ? ((start - jiIdx) % 12 + 12) % 12 : ((jiIdx - start) % 12 + 12) % 12;
  return STAGES[i];
}

/* ---------- 월운: 그 해 입춘부터 12개월의 월주 ---------- */
function monthPillars(year) {
  const terms = [];
  for (const yy of [year, year + 1]) {
    for (const t of solarTermsOfYear(yy)) {
      if (JEOL_TO_BRANCH[t.name] !== undefined) terms.push({ ...t });
    }
  }
  terms.sort((a, b) => a.jd - b.jd);
  const ipchun = terms.find(t => t.name === '입춘' && t.jd > gregorianToJDN(year, 1, 20) - 0.5);
  const from = terms.indexOf(ipchun);

  const yearIdx = ((year - 1984) % 60 + 60) % 60;
  const yGan = yearIdx % 10;
  const out = [];
  for (let k = 0; k < 12; k++) {
    const t = terms[from + k];
    const ji = JEOL_TO_BRANCH[t.name];
    const offset = ((ji - 2) % 12 + 12) % 12;
    const gan = ((yGan % 5) * 2 + 2 + offset) % 10;
    const kst = t.jd + 9 / 24;
    const g = jdnToGregorian(Math.floor(kst + 0.5));
    out.push({ term: t.name, gan, ji, month: g.m, day: g.d, year: g.y, jd: t.jd });
  }
  return out;
}

if (typeof module !== 'undefined') {
  module.exports = {
    GAN, JI, OHENG, SAENG, GEUK, SOLAR_TERMS, buildSaju, solarTermsOfYear,
    lunarToSolar, solarToLunar, lunarMonthLength, leapMonthOf, twelveStage, monthPillars, STAGES, gregorianToJDN, jdnToGregorian, tenGod, newMoonJD,
  };
}
