/* ============================================================
   운세도사 · 사주 계산 엔진 (saju.js)
   - 양력/음력 변환, 24절기(태양 황경) 계산, 사주 사기둥(년월일시)
   - 오행 비율, 십신, 신강/신약, 궁합 점수
   - 외부 라이브러리 없이 단독 동작 (window.Saju)
   ============================================================ */
(function (global) {
  'use strict';

  var CHEON = '갑을병정무기경신임계'.split('');
  var CHEON_HANJA = '甲乙丙丁戊己庚辛壬癸'.split('');
  var JI = '자축인묘진사오미신유술해'.split('');
  var JI_HANJA = '子丑寅卯辰巳午未申酉戌亥'.split('');
  var ANIMALS = ['쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지'];
  /* 이름 끝 글자 받침 판정 (조사 붙일 때) */
  function hasJongName(word) {
    var t = String(word || '');
    for (var i = t.length - 1; i >= 0; i--) {
      var c = t.charCodeAt(i);
      if (c >= 0xAC00 && c <= 0xD7A3) return (c - 0xAC00) % 28 !== 0;
    }
    return false;
  }

  var GAN_ELEM = ['목', '목', '화', '화', '토', '토', '금', '금', '수', '수'];
  var GAN_YANG = [true, false, true, false, true, false, true, false, true, false];
  var JI_ELEM = ['수', '토', '목', '목', '토', '화', '화', '토', '금', '금', '토', '수'];
  /* 지지의 정기(본기) 천간 */
  var JI_MAIN_GAN = [9, 5, 0, 1, 4, 2, 3, 5, 6, 7, 4, 8];

  var ELEMS = ['목', '화', '토', '금', '수'];
  var SAENG = { '목': '화', '화': '토', '토': '금', '금': '수', '수': '목' };  /* 상생 */
  var GEUK = { '목': '토', '화': '금', '토': '수', '금': '목', '수': '화' };   /* 상극 */

  var RAD = Math.PI / 180;

  function mod(n, m) { return ((n % m) + m) % m; }

  /* ---------- 율리우스일 ---------- */
  function jdn(y, m, d) {
    var a = Math.floor((14 - m) / 12);
    var yy = y + 4800 - a;
    var mm = m + 12 * a - 3;
    return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
  }

  function fromJDN(j) {
    var a = j + 32044, b = Math.floor((4 * a + 3) / 146097), c = a - Math.floor(146097 * b / 4);
    var d = Math.floor((4 * c + 3) / 1461), e = c - Math.floor(1461 * d / 4), m = Math.floor((5 * e + 2) / 153);
    return {
      d: e - Math.floor((153 * m + 2) / 5) + 1,
      m: m + 3 - 12 * Math.floor(m / 10),
      y: 100 * b + d - 4800 + Math.floor(m / 10)
    };
  }

  /* ---------- 태양 황경 (겉보기, 도 단위) ---------- */
  function sunLongitude(jd) {
    var T = (jd - 2451545.0) / 36525;
    var L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
    var M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
    var C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M * RAD)
      + (0.019993 - 0.000101 * T) * Math.sin(2 * M * RAD)
      + 0.000289 * Math.sin(3 * M * RAD);
    var omega = 125.04 - 1934.136 * T;
    return mod(L0 + C - 0.00569 - 0.00478 * Math.sin(omega * RAD), 360);
  }

  /* 특정 연도의 절기(황경 deg) 순간을 UT 율리우스일로 반환 */
  function solarTermJD(year, deg) {
    /* 1차 추정값: 해당 황경이 나타나는 대략적인 날 (입춘=315 → 2월 4일 등) */
    var months = { 315: 2, 330: 2, 345: 3, 0: 3, 15: 4, 30: 4, 45: 5, 60: 5, 75: 6, 90: 6, 105: 7, 120: 7, 135: 8, 150: 8, 165: 9, 180: 9, 195: 10, 210: 10, 225: 11, 240: 11, 255: 12, 270: 12, 285: 1, 300: 1 };
    var mIdx = months[deg] !== undefined ? months[deg] : 1;
    var est = jdn(year, mIdx, 6) + 0.0; /* UT 정오 근처 */
    var jd = est;
    for (var i = 0; i < 20; i++) {
      var l = sunLongitude(jd);
      var diff = mod(deg - l + 180, 360) - 180;
      jd += diff / 0.9856473;
      if (Math.abs(diff) < 1e-6) break;
    }
    return jd;
  }

  /* 한국 표준시 보정: 1954-03-21 ~ 1961-08-09 는 UTC+8:30 (동경 127.5도) */
  function tzOffsetHours(y, m, d) {
    var k = y * 10000 + m * 100 + d;
    if (k >= 19540321 && k <= 19610809) return 8.5;
    return 9;
  }

  /* ---------- 음력 ↔ 양력 ---------- */
  function lunarRow(year) {
    var t = global.LUNAR_TABLE || [];
    if (!t.length) return null;
    if (year < t[0].y || year > t[t.length - 1].y) return null;
    return t[year - t[0].y];
  }

  var LUNAR_EPOCH = null;
  function lunarEpoch() {
    if (LUNAR_EPOCH === null) {
      var b = global.LUNAR_BASE || [1900, 1, 1];
      LUNAR_EPOCH = jdn(b[0], b[1], b[2]);
    }
    return LUNAR_EPOCH;
  }

  function lunarYearStartJDN(year) {
    var row = lunarRow(year);
    if (!row) return null;
    return lunarEpoch() + row.off;
  }

  function lunarMonths(row) {
    var seq = [], i;
    for (i = 1; i <= 12; i++) {
      seq.push({ m: i, leap: false, len: 0 });
      if (row.leap === i) seq.push({ m: i, leap: true, len: 0 });
    }
    for (i = 0; i < seq.length; i++) seq[i].len = (i < row.len.length && row.len.charAt(i) === '3') ? 30 : 29;
    return seq;
  }

  function lunarToSolar(y, m, d, leap) {
    var row = lunarRow(y);
    if (!row) return null;
    var seq = lunarMonths(row), i, offset = 0, found = false;
    for (i = 0; i < seq.length; i++) {
      if (seq[i].m === m && seq[i].leap === !!leap) {
        if (d < 1 || d > seq[i].len) return null;
        found = true;
        break;
      }
      offset += seq[i].len;
    }
    if (!found) return null;
    return fromJDN(lunarYearStartJDN(y) + offset + (d - 1));
  }

  function solarToLunar(y, m, d) {
    if (!global.LUNAR_TABLE) return null;
    var t = global.LUNAR_TABLE, k = jdn(y, m, d), i, row = null;
    for (i = 0; i < t.length; i++) {
      if (lunarEpoch() + t[i].off <= k) row = t[i]; else break;
    }
    if (!row) return null;
    var seq = lunarMonths(row), offset = k - lunarYearStartJDN(row.y), acc = 0;
    for (i = 0; i < seq.length; i++) {
      if (offset < acc + seq[i].len) return { y: row.y, m: seq[i].m, d: offset - acc + 1, leap: seq[i].leap };
      acc += seq[i].len;
    }
    return null;
  }

  /* ---------- 십신 ---------- */
  function sipsin(dayGan, targetGan) {
    var de = GAN_ELEM[dayGan], te = GAN_ELEM[targetGan];
    var same = GAN_YANG[dayGan] === GAN_YANG[targetGan];
    if (de === te) return same ? '비견' : '겁재';
    if (SAENG[de] === te) return same ? '식신' : '상관';
    if (SAENG[te] === de) return same ? '편인' : '정인';
    if (GEUK[de] === te) return same ? '편재' : '정재';
    return same ? '편관' : '정관';
  }

  function ganjiName(gan, ji) { return CHEON[gan] + JI[ji]; }
  function ganjiHanja(gan, ji) { return CHEON_HANJA[gan] + JI_HANJA[ji]; }

  /* ============================================================
     오행 가중치 · 신강/신약 정밀 판정 · 용신/기신
     - 글자마다 자리(년·월·일·시)의 무게를 달리 주고, 월지(계절)에
       가장 큰 무게를 준다. 단순 개수보다 실제 세력을 잘 반영한다.
     ============================================================ */
  var POS_GAN_W = [1.0, 1.2, 1.0, 0.8];   /* 년 월 일 시 천간 */
  var POS_JI_W = [0.9, 1.9, 1.2, 0.8];    /* 년 월 일 시 지지 */
  var SAENG_REV = { '화': '목', '토': '화', '금': '토', '수': '금', '목': '수' };
  var GEUK_REV = { '토': '목', '금': '화', '수': '토', '목': '금', '화': '수' };
  var GROUPS = ['비겁', '식상', '재성', '관성', '인성'];

  function elemGroup(dayElem, e) {
    if (e === dayElem) return '비겁';
    if (SAENG[dayElem] === e) return '식상';
    if (GEUK[dayElem] === e) return '재성';
    if (GEUK[e] === dayElem) return '관성';
    return '인성';
  }

  function groupElem(dayElem, group) {
    if (group === '비겁') return dayElem;
    if (group === '식상') return SAENG[dayElem];
    if (group === '재성') return GEUK[dayElem];
    if (group === '관성') return GEUK_REV[dayElem];
    return SAENG_REV[dayElem];
  }

  function weightedElements(chars) {
    var w = { '목': 0, '화': 0, '토': 0, '금': 0, '수': 0 };
    chars.forEach(function (c, i) {
      w[GAN_ELEM[c.g]] += POS_GAN_W[Math.min(i, 3)];
      w[JI_ELEM[c.j]] += POS_JI_W[Math.min(i, 3)];
    });
    return w;
  }

  function strengthOf(weights, dayElem) {
    var gw = { '비겁': 0, '식상': 0, '재성': 0, '관성': 0, '인성': 0 };
    var total = 0;
    ELEMS.forEach(function (e) { gw[elemGroup(dayElem, e)] += weights[e]; total += weights[e]; });
    if (!total) total = 1;
    var sup = gw['비겁'] + gw['인성'];
    var ratio = sup / total;
    var label = ratio >= 0.50 ? '신강' : (ratio <= 0.40 ? '신약' : '중화');
    return { groupWeights: gw, supportRatio: Math.round(ratio * 1000) / 1000, strength: label };
  }

  /* 조후(한난조습) 보정: 겨울생은 화, 여름생은 수가 귀하다 */
  function johuNeed(monthJi) {
    if (monthJi === 11 || monthJi === 0 || monthJi === 1) return { elem: '화', why: 'winter' };
    if (monthJi === 5 || monthJi === 6 || monthJi === 7) return { elem: '수', why: 'summer' };
    return null;
  }

  function pickYongsin(weights, dayElem, strength, monthJi) {
    var need = johuNeed(monthJi);
    var groups = strength === '신강' ? ['식상', '재성', '관성']
      : strength === '신약' ? ['인성', '비겁']
        : ['식상', '재성', '관성', '인성'];
    var cands = groups.map(function (g, gi) {
      var e = groupElem(dayElem, g);
      var w = weights[e];
      var score;
      if (strength === '신강') score = 1 / (0.55 + w) + (groups.length - gi) * 0.06;
      else if (strength === '신약') score = w * 0.55 + (groups.length - gi) * 0.2;
      else score = 1 / (0.55 + w) + (groups.length - gi) * 0.05;
      if (need && need.elem === e) score += 0.55;
      return { group: g, elem: e, weight: Math.round(w * 100) / 100, score: Math.round(score * 1000) / 1000 };
    });
    cands.sort(function (a, b) { return b.score - a.score; });
    var y = cands[0];
    var gisinElem = GEUK_REV[y.elem];
    return {
      elem: y.elem,
      group: y.group,
      weight: y.weight,
      huisin: SAENG_REV[y.elem],
      gisin: gisinElem,
      gusin: SAENG_REV[gisinElem],
      johu: need ? need.elem : null,
      johuWhy: need ? need.why : null,
      candidates: cands
    };
  }

  /* ============================================================
     대운(大運): 성별·년간 음양에 따른 순행/역행, 대운수, 10년 주기
     ============================================================ */
  function termListAround(year) {
    var out = [];
    for (var y = year - 1; y <= year + 1; y++) {
      TERMS.forEach(function (t) {
        out.push({ name: t[1], deg: t[0], jd: solarTermJD(y, t[0]) });
      });
    }
    out.sort(function (a, b) { return a.jd - b.jd; });
    return out;
  }

  function daeunInfo(o) {
    var yangYear = GAN_YANG[o.yearGan];
    var forward = (yangYear && o.gender === 'm') || (!yangYear && o.gender === 'f');

    /* 대운수는 24절기 중 절입(節)만 기준으로 센다. 중기(춘분·하지 등)는 쓰지 않는다. */
    var terms = termListAround(o.solar.y).filter(function (t) { return t.deg % 30 === 15; });
    var idx = 0;
    for (var i = 0; i < terms.length - 1; i++) {
      if (terms[i].jd <= o.birthJd && o.birthJd < terms[i + 1].jd) { idx = i; break; }
    }
    var prev = terms[idx], next = terms[idx + 1];
    var gapDays = forward ? (next.jd - o.birthJd) : (o.birthJd - prev.jd);
    var exact = gapDays / 3;                 /* 3일 = 1년 */
    var startAge = Math.max(1, Math.round(exact));

    var list = [];
    for (var k = 0; k < 10; k++) {
      var step = forward ? k + 1 : -(k + 1);
      var g = mod(o.monthGan + step, 10);
      var j = mod(o.monthJi + step, 12);
      list.push({
        idx: k + 1,
        gan: g, ji: j,
        ganzi: ganjiName(g, j), hanja: ganjiHanja(g, j),
        ganElem: GAN_ELEM[g], jiElem: JI_ELEM[j],
        ganSipsin: sipsin(o.dayGan, g), jiSipsin: sipsin(o.dayGan, JI_MAIN_GAN[j]),
        startAge: startAge + k * 10,
        endAge: startAge + k * 10 + 9,
        startYear: o.solar.y + startAge + k * 10
      });
    }

    var ref = o.now || {};
    var ny = ref.y || new Date().getFullYear(), nm = ref.m || (new Date().getMonth() + 1), nd = ref.d || new Date().getDate();
    var age = ny - o.solar.y - ((nm < o.solar.m || (nm === o.solar.m && nd < o.solar.d)) ? 1 : 0);
    if (age < 0) age = 0;

    var curIdx = -1;
    if (age >= startAge) curIdx = Math.min(9, Math.floor((age - startAge) / 10));

    return {
      forward: forward,
      dirText: forward ? '순행' : '역행',
      startAge: startAge,
      startAgeExact: Math.round(exact * 10) / 10,
      gapDays: Math.round(gapDays * 10) / 10,
      termName: forward ? next.name : prev.name,
      list: list,
      age: age,
      currentIndex: curIdx,
      current: curIdx >= 0 ? list[curIdx] : null,
      next: curIdx >= 0 ? (list[curIdx + 1] || null) : list[0],
      yearsIntoDaeun: curIdx >= 0 ? Math.max(1, age - list[curIdx].startAge + 1) : 0,
      beforeStart: curIdx < 0
    };
  }

  function makePillar(gan, ji, dayGan) {
    return {
      gan: gan, ji: ji,
      ganName: CHEON[gan], jiName: JI[ji],
      hanja: ganjiHanja(gan, ji), hangul: ganjiName(gan, ji),
      ganElem: GAN_ELEM[gan], jiElem: JI_ELEM[ji],
      ganSipsin: sipsin(dayGan, gan),
      jiSipsin: sipsin(dayGan, JI_MAIN_GAN[ji])
    };
  }

  /* 월지: 태양 황경으로 절기 경계 판정 */
  function monthBranchByLongitude(l) {
    if (l >= 315 && l < 345) return 2; /* 인 */
    if (l >= 345 || l < 15) return 3;  /* 묘 */
    if (l < 45) return 4;              /* 진 */
    if (l < 75) return 5;              /* 사 */
    if (l < 105) return 6;             /* 오 */
    if (l < 135) return 7;             /* 미 */
    if (l < 165) return 8;             /* 신 */
    if (l < 195) return 9;             /* 유 */
    if (l < 225) return 10;            /* 술 */
    if (l < 255) return 11;            /* 해 */
    if (l < 285) return 0;             /* 자 */
    return 1;                          /* 축 */
  }

  /* ---------- 사주 구성 ---------- */
  function build(opt) {
    var input = {
      year: +opt.year, month: +opt.month, day: +opt.day,
      hour: opt.hour === '' || opt.hour === null || opt.hour === undefined ? null : +opt.hour,
      minute: opt.minute ? +opt.minute : 0,
      calendar: opt.calendar === 'lunar' ? 'lunar' : 'solar',
      leap: !!opt.leap,
      gender: opt.gender === 'f' ? 'f' : 'm',
      name: (opt.name || '').trim()
    };

    var solar;
    if (input.calendar === 'lunar') {
      solar = lunarToSolar(input.year, input.month, input.day, input.leap);
      if (!solar) return { error: '음력 날짜를 확인해 주세요. (1900~2035년, 윤달 포함)' };
    } else {
      solar = { y: input.year, m: input.month, d: input.day };
    }
    if (jdn(solar.y, solar.m, solar.d) < jdn(1900, 1, 31) || jdn(solar.y, solar.m, solar.d) > jdn(2035, 12, 31)) {
      return { error: '1900년 ~ 2035년 사이의 생년월일만 계산할 수 있어요.' };
    }

    var lunar = solarToLunar(solar.y, solar.m, solar.d);

    var h = input.hour === null ? 12 : input.hour;
    var mi = input.hour === null ? 0 : input.minute;
    var tz = tzOffsetHours(solar.y, solar.m, solar.d);
    var jdLocalNoon = jdn(solar.y, solar.m, solar.d) + 0.5;         /* UT 정오 ≈ KST 21시 */
    var jd = jdn(solar.y, solar.m, solar.d) - 0.5 + (h + mi / 60 - tz) / 24; /* 실제 순간(UT) */

    /* 년주 : 입춘(황경 315도) 기준 */
    var ipchun = solarTermJD(solar.y, 315);
    var sajuYear = jd < ipchun ? solar.y - 1 : solar.y;
    var yearGan = mod(sajuYear - 4, 10);
    var yearJi = mod(sajuYear - 4, 12);

    /* 월주 : 절기(태양 황경) 기준 */
    var lambda = sunLongitude(jd);
    var monthJi = monthBranchByLongitude(lambda);
    var monthOrder = mod(monthJi - 2, 12);         /* 인월=0 */
    var monthGan = mod(yearGan * 2 + 2 + monthOrder, 10);

    /* 일주 : 자정 기준 60일 순환 */
    var dayGan = mod(jdn(solar.y, solar.m, solar.d) + 9, 10);
    var dayJi = mod(jdn(solar.y, solar.m, solar.d) + 1, 12);

    /* 시주 */
    var hourJi = null, hourGan = null, hourPillar = null;
    if (input.hour !== null) {
      hourJi = Math.floor(mod(input.hour + 1, 24) / 2);
      hourGan = mod(dayGan * 2 + hourJi, 10);
      hourPillar = makePillar(hourGan, hourJi, dayGan);
    }

    var pillars = {
      year: makePillar(yearGan, yearJi, dayGan),
      month: makePillar(monthGan, monthJi, dayGan),
      day: makePillar(dayGan, dayJi, dayGan),
      hour: hourPillar
    };

    /* 오행 분포 */
    var counts = { '목': 0, '화': 0, '토': 0, '금': 0, '수': 0 };
    var chars = [
      { g: yearGan, j: yearJi }, { g: monthGan, j: monthJi }, { g: dayGan, j: dayJi }
    ];
    if (hourPillar) chars.push({ g: hourGan, j: hourJi });
    var total = 0;
    chars.forEach(function (c) { counts[GAN_ELEM[c.g]]++; counts[JI_ELEM[c.j]]++; total += 2; });

    var percents = {};
    ELEMS.forEach(function (e) { percents[e] = Math.round(counts[e] / total * 1000) / 10; });

    var sorted = ELEMS.slice().sort(function (a, b) { return counts[b] - counts[a]; });
    var maxElem = sorted[0], minElem = sorted[sorted.length - 1];

    /* 십신 분포 (일간 제외 7글자) */
    var sipsinCount = {};
    ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인'].forEach(function (s) { sipsinCount[s] = 0; });
    chars.forEach(function (c) {
      if (!(c.g === dayGan && c === chars[2])) sipsinCount[sipsin(dayGan, c.g)]++;
      sipsinCount[sipsin(dayGan, JI_MAIN_GAN[c.j])]++;
    });

    /* 가중치 기반 세력 판정 (월지 계절에 가장 큰 무게) */
    var weights = weightedElements(chars);
    var st = strengthOf(weights, GAN_ELEM[dayGan]);
    var strength = st.strength;
    var yong = pickYongsin(weights, GAN_ELEM[dayGan], strength, monthJi);
    /* 참고용: 글자 개수만 센 전통적 판정 */
    var support = sipsinCount['비견'] + sipsinCount['겁재'] + sipsinCount['정인'] + sipsinCount['편인'];
    var drain = sipsinCount['식신'] + sipsinCount['상관'] + sipsinCount['정재'] + sipsinCount['편재'] + sipsinCount['정관'] + sipsinCount['편관'];
    var strengthByCount = support > drain + 1 ? '신강' : (support + 1 < drain ? '신약' : '중화');

    var dayMaster = {
      gan: dayGan, name: CHEON[dayGan], hanja: CHEON_HANJA[dayGan],
      elem: GAN_ELEM[dayGan], yang: GAN_YANG[dayGan],
      animal: ANIMALS[yearJi],   /* 띠는 년지(입춘 기준 사주년)로 판정 — 일지 아님 */
      ilju: ganjiName(dayGan, dayJi), iljuHanja: ganjiHanja(dayGan, dayJi)
    };

    /* 세운 : 2026 병오 / 2027 정미 */
    var years = [2026, 2027].map(function (y) {
      var g = mod(y - 4, 10), j = mod(y - 4, 12);
      return {
        year: y, gan: g, ji: j, ganzi: ganjiName(g, j), hanja: ganjiHanja(g, j),
        ganSipsin: sipsin(dayGan, g), jiSipsin: sipsin(dayGan, JI_MAIN_GAN[j]),
        ganElem: GAN_ELEM[g], jiElem: JI_ELEM[j]
      };
    });

    /* 대운 */
    var daeun = daeunInfo({
      yearGan: yearGan, yearJi: yearJi, monthGan: monthGan, monthJi: monthJi,
      dayGan: dayGan, gender: input.gender, birthJd: jd, solar: solar, now: opt.now || null
    });

    return {
      input: input,
      solar: solar,
      lunar: lunar,
      jd: jd,
      sajuYear: sajuYear,
      pillars: pillars,
      dayMaster: dayMaster,
      elements: counts,
      weights: weights,
      percents: percents,
      maxElem: maxElem,
      minElem: minElem,
      sipsinCount: sipsinCount,
      strength: strength,
      strengthByCount: strengthByCount,
      supportRatio: st.supportRatio,
      groupWeights: st.groupWeights,
      yongsin: yong,
      daeun: daeun,
      years: years,
      solarTerm: { name: termName(lambda), lambda: Math.round(lambda * 10) / 10 }
    };
  }

  var TERMS = [
    [315, '입춘'], [330, '우수'], [345, '경칩'], [0, '춘분'], [15, '청명'], [30, '곡우'],
    [45, '입하'], [60, '소만'], [75, '망종'], [90, '하지'], [105, '소서'], [120, '대서'],
    [135, '입추'], [150, '처서'], [165, '백로'], [180, '추분'], [195, '한로'], [210, '상강'],
    [225, '입동'], [240, '소설'], [255, '대설'], [270, '동지'], [285, '소한'], [300, '대한']
  ];
  function termName(lambda) {
    var best = TERMS[0], bestDiff = 999;
    TERMS.forEach(function (t) {
      var d = Math.abs(mod(lambda - t[0] + 180, 360) - 180);
      if (d < bestDiff) { bestDiff = d; best = t; }
    });
    return best[1];
  }

  /* ---------- 궁합 ---------- */
  var YUKHAP = [[0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7]];
  var CHUNG = [[0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11]];
  var SAMHAP = [[8, 0, 4], [11, 3, 7], [2, 6, 10], [5, 9, 1]];

  function hasPair(list, a, b) {
    return list.some(function (p) { return (p[0] === a && p[1] === b) || (p[0] === b && p[1] === a); });
  }
  function samhap(a, b) {
    return SAMHAP.some(function (g) { return g.indexOf(a) >= 0 && g.indexOf(b) >= 0 && a !== b; });
  }

  function compatibility(a, b) {
    var score = 62, notes = [];
    var ea = GAN_ELEM[a.dayMaster.gan], eb = GAN_ELEM[b.dayMaster.gan];
    if (ea === eb) { score += 4; notes.push({ type: 'good', text: '두 사람의 중심 기운(' + ea + ')이 같아 말하지 않아도 통하는 부분이 있어요.' }); }
    else if (SAENG[ea] === eb) { score += 10; notes.push({ type: 'good', text: a.dayMaster.name + '일간이 ' + b.dayMaster.name + '일간을 살려주는 상생 관계예요. 한쪽이 자연스럽게 다른 쪽을 채워줍니다.' }); }
    else if (SAENG[eb] === ea) { score += 10; notes.push({ type: 'good', text: b.dayMaster.name + '일간이 ' + a.dayMaster.name + '일간을 살려주는 상생 관계예요. 기운이 서로 잘 흐릅니다.' }); }
    else if (GEUK[ea] === eb || GEUK[eb] === ea) { score -= 6; notes.push({ type: 'warn', text: '두 사람의 기운이 서로를 누르는 상극 관계예요. 서로의 방식을 인정하는 노력이 필요합니다.' }); }

    var ja = a.pillars.day.ji, jb = b.pillars.day.ji;
    if (hasPair(YUKHAP, ja, jb)) { score += 12; notes.push({ type: 'good', text: '일지가 육합(六合)이에요. 함께 있을 때 편안하고 정이 깊어지는 배치입니다.' }); }
    else if (samhap(ja, jb)) { score += 8; notes.push({ type: 'good', text: '일지가 삼합(三合)의 짝이에요. 목표를 함께할 때 힘이 배가 됩니다.' }); }
    else if (hasPair(CHUNG, ja, jb)) { score -= 10; notes.push({ type: 'warn', text: '일지가 충(沖)이에요. 부딪히는 지점이 있지만, 그만큼 서로를 자극하고 성장시키기도 합니다.' }); }
    else { notes.push({ type: 'mid', text: '일지가 무난한 조합이에요. 관계의 온도는 두 사람이 만드는 대화에 달려 있습니다.' }); }

    /* 오행 보완 */
    var lackA = a.minElem, lackB = b.minElem;
    if (b.elements[lackA] >= 2) { score += 6; notes.push({ type: 'good', text: (a.input.name || '첫 번째 분') + '에게 부족한 ' + lackA + ' 기운을 상대가 채워줄 수 있어요.' }); }
    if (a.elements[lackB] >= 2) { score += 6; notes.push({ type: 'good', text: (a.input.name ? a.input.name + (hasJongName(a.input.name) ? '이' : '가') : '첫 번째 분이') + ' 상대에게 부족한 ' + lackB + ' 기운을 채워줄 수 있어요.' }); }

    /* 음양 */
    if (a.dayMaster.yang !== b.dayMaster.yang) { score += 3; notes.push({ type: 'good', text: '일간의 음양이 서로 달라 리드와 배려의 역할이 자연스럽게 나뉩니다.' }); }

    score = Math.max(38, Math.min(97, score));
    var grade = score >= 85 ? '천생연분' : score >= 75 ? '잘 맞는 사이' : score >= 65 ? '무난한 사이' : score >= 55 ? '노력이 필요한 사이' : '서로 다른 세계';
    return { score: score, grade: grade, notes: notes };
  }

  var Saju = {
    CHEON: CHEON, CHEON_HANJA: CHEON_HANJA, JI: JI, JI_HANJA: JI_HANJA, ELEMS: ELEMS,
    GAN_ELEM: GAN_ELEM, JI_ELEM: JI_ELEM, ANIMALS: ANIMALS, GAN_YANG: GAN_YANG,
    jdn: jdn, fromJDN: fromJDN, sunLongitude: sunLongitude, solarTermJD: solarTermJD,
    lunarToSolar: lunarToSolar, solarToLunar: solarToLunar,
    sipsin: sipsin, build: build, compatibility: compatibility,
    ganjiName: ganjiName, ganjiHanja: ganjiHanja,
    elemGroup: elemGroup, groupElem: groupElem, weightedElements: weightedElements,
    strengthOf: strengthOf, pickYongsin: pickYongsin, daeunInfo: daeunInfo, termName: termName
  };

  global.Saju = Saju;
  if (typeof module !== 'undefined' && module.exports) module.exports = Saju;
})(typeof window !== 'undefined' ? window : globalThis);
