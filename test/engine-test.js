/* 사주 엔진 검증 스크립트
   실행: node saju-site/test/engine-test.js
   - 외부 만세력과 일치하는지 확인한 기준값들
*/
global.window = global;
require('../js/lunar-data.js');
const S = require('../js/saju.js');
const F = require('../js/fortune.js');

let fail = 0;
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fail++;
  console.log((ok ? '  ok  ' : ' FAIL ') + name + ' → ' + JSON.stringify(got) + (ok ? '' : ' (기대 ' + JSON.stringify(want) + ')'));
}
function near(name, got, want, tol) {
  const ok = Math.abs(got - want) <= tol;
  if (!ok) fail++;
  console.log((ok ? '  ok  ' : ' FAIL ') + name + ' → ' + got.toFixed(3) + ' (기대 ' + want + ' ±' + tol + ')');
}
function ymd(o) { return o ? [o.y, o.m, o.d] : null; }
function a1999Animal() {
  return S.build({ year: 1999, month: 3, day: 22, hour: 7, minute: 30, gender: 'm' }).dayMaster.animal;
}
function kst(jd) { // UT JD → KST 문자열
  const j = jd + 9 / 24 + 0.5;
  const z = Math.floor(j);
  let a = z + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor(146097 * b / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor(1461 * d / 4);
  const m = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const mon = m + 3 - 12 * Math.floor(m / 10);
  const yr = 100 * b + d - 4800 + Math.floor(m / 10);
  const mins = Math.round((j - z) * 1440);
  const p = (n) => String(n).padStart(2, '0');
  return `${yr}-${p(mon)}-${p(day)} ${p(Math.floor(mins / 60))}:${p(mins % 60)}`;
}

console.log('\n[1] 절기 시각 (한국천문연구원 발표값과 비교)');
// 2026 소설 11-22 16:23, 대설 12-07 11:52, 동지 12-22 05:50
const soseol = kst(S.solarTermJD(2026, 240));
const daeseol = kst(S.solarTermJD(2026, 255));
const dongji = kst(S.solarTermJD(2026, 270));
console.log('  소설 2026:', soseol, '/ 대설:', daeseol, '/ 동지:', dongji);
eq('소설 날짜', soseol.slice(0, 10), '2026-11-22');
eq('대설 날짜', daeseol.slice(0, 10), '2026-12-07');
eq('동지 날짜', dongji.slice(0, 10), '2026-12-22');

console.log('\n[2] 사주 사기둥 (2026-11-26 12시 = 병오년 기해월 갑진일)');
const r = S.build({ year: 2026, month: 11, day: 26, hour: 12, calendar: 'solar', gender: 'm' });
eq('년주', r.pillars.year.hangul, '병오');
eq('월주', r.pillars.month.hangul, '기해');
eq('일주', r.pillars.day.hangul, '갑진');
eq('일간', r.dayMaster.name, '갑');

console.log('\n[3] 입춘 경계 (2026 입춘 = 2/4 04:56)');
eq('2/3 → 년주', S.build({ year: 2026, month: 2, day: 3, hour: 10 }).pillars.year.hangul, '을사');
eq('2/5 → 년주', S.build({ year: 2026, month: 2, day: 5, hour: 10 }).pillars.year.hangul, '병오');
eq('1/20 → 월주(축월)', S.build({ year: 2026, month: 1, day: 20 }).pillars.month.jiName, '축');

console.log('\n[4] 음력 ↔ 양력');
eq('음력 2026-1-1', ymd(S.lunarToSolar(2026, 1, 1, false)), [2026, 2, 17]);
eq('양력 2026-11-26', S.solarToLunar(2026, 11, 26), { y: 2026, m: 10, d: 18, leap: false });
eq('음력 2025 윤6-1', ymd(S.lunarToSolar(2025, 6, 1, true)), [2025, 7, 25]);
eq('음력 1999-2-5 = 양력 1999-3-22', ymd(S.lunarToSolar(1999, 2, 5, false)), [1999, 3, 22]);
eq('없는 날짜(음력 2025-4-30) 거부', S.lunarToSolar(2025, 4, 30, false), null);

console.log('\n[5] 십신');
eq('갑 ↔ 정', S.sipsin(0, 3), '상관');
eq('경 ↔ 정', S.sipsin(6, 3), '정관');
eq('임 ↔ 정', S.sipsin(8, 3), '정재');
eq('무 ↔ 정', S.sipsin(4, 3), '정인');
eq('병 ↔ 정', S.sipsin(2, 3), '겁재');

console.log('\n[5-1] 띠 (년지 기준)');
eq('1999-03-22 → 띠', a1999Animal(), '토끼');
eq('2026-11-26 → 띠', r.dayMaster.animal, '말');
eq('1999-03-22 년주 기묘 / 일주 계유 (띠는 일지 닭이 아님)', [S.build({ year: 1999, month: 3, day: 22, hour: 7, minute: 30, gender: 'm' }).pillars.year.hangul, S.build({ year: 1999, month: 3, day: 22, hour: 7, minute: 30, gender: 'm' }).pillars.day.hangul], ['기묘', '계유']);
eq('2000-05-05 → 띠(용)', S.build({ year: 2000, month: 5, day: 5, gender: 'f' }).dayMaster.animal, '용');
eq('2027-01-10 → 띠(입춘 전, 말)', S.build({ year: 2027, month: 1, day: 10, gender: 'm' }).dayMaster.animal, '말');

console.log('\n[5-2] 지지 분기 십신');
eq('계유일 일지(유=신금) 십신', S.build({ year: 1999, month: 3, day: 22, hour: 7, minute: 30, gender: 'm' }).pillars.day.jiSipsin, '편인');
eq('갑진일 일지(진=무토) 십신', r.pillars.day.jiSipsin, '편재');
eq('2027 정미년 지지(미=기토) 십신', r.years[1].jiSipsin, '정재');
eq('1999년생 2027 미(未) 십신', S.build({ year: 1999, month: 3, day: 22, hour: 7, minute: 30, gender: 'm' }).years[1].jiSipsin, '편관');

console.log('\n[6] 궁합·해석');
const a = S.build({ year: 1999, month: 3, day: 22, hour: 7, minute: 30, gender: 'm' });
const b2 = S.build({ year: 2000, month: 5, day: 5, gender: 'f' });
const c = S.compatibility(a, b2);
eq('궁합 점수 범위', c.score >= 38 && c.score <= 97, true);
eq('궁합 등급 있음', typeof c.grade === 'string' && c.grade.length > 0, true);
const lines = F.mascotLines(a);
eq('말풍선 문장 생성', Array.isArray(lines.personality) && lines.personality[0].length > 100, true);
eq('60갑자 목록', F.iljuList().length, 60);
eq('60갑자 첫 항목', F.iljuList()[0].hangul, '갑자');
eq('60갑자 마지막', F.iljuList()[59].hangul, '계해');


console.log('\n[7] 대운 (성별·년간 음양 → 순행/역행, 대운수, 10년 주기)');
const REF = { y: 2026, m: 11, d: 26 };
function bd(o) { return S.build(Object.assign({ calendar: 'solar', now: REF }, o)); }

const m2026 = bd({ year: 2026, month: 11, day: 26, hour: 12, gender: 'm' });
eq('2026-11-26 남 → 순행 (병=양간, 남)', m2026.daeun.forward, true);
eq('2026-11-26 남 → 대운수 4', m2026.daeun.startAge, 4);
eq('2026-11-26 남 → 대운 기준 절입', m2026.daeun.termName, '대설');
eq('2026-11-26 남 → 첫 대운', m2026.daeun.list[0].ganzi, '경자');
eq('2026-11-26 남 → 대운 10개', m2026.daeun.list.length, 10);
eq('2026-11-26 남 → 생일 당일은 대운 전', m2026.daeun.current, null);

const m1999 = bd({ year: 1999, month: 3, day: 22, hour: 7, minute: 30, gender: 'm' });
eq('1999-03-22 남 → 역행 (기=음간, 남)', m1999.daeun.forward, false);
eq('1999-03-22 남 → 대운수(역행, 경칩까지 15.9일)', m1999.daeun.startAge, 5);
eq('1999-03-22 남 → 대운 기준은 절입(중기 아님)', m1999.daeun.termName, '경칩');
eq('1999-03-22 남 → 첫 대운(월주 정묘에서 역행)', m1999.daeun.list[0].ganzi, '병인');
eq('1999-03-22 남 → 2026년 나이', m1999.daeun.age, 27);
eq('1999-03-22 남 → 현재 대운', m1999.daeun.current.ganzi, '갑자');
eq('1999-03-22 남 → 현재 대운 구간', [m1999.daeun.current.startAge, m1999.daeun.current.endAge], [25, 34]);
eq('1999-03-22 남 → 다음 대운', m1999.daeun.next.ganzi, '계해');
eq('1999-03-22 남 → 대운 안에서 몇 년째(첫해=1)', m1999.daeun.yearsIntoDaeun, 3);

const f1999 = bd({ year: 1999, month: 3, day: 22, hour: 7, minute: 30, gender: 'f' });
eq('1999-03-22 여 → 순행 (음간, 여)', f1999.daeun.forward, true);
eq('1999-03-22 여 → 첫 대운(월주 정묘에서 순행)', f1999.daeun.list[0].ganzi, '무진');

/* 10년마다 나이·간지가 정확히 1칸씩 움직이는지 (역행이면 -1) */
let ageOk = true, stepOk = true;
m1999.daeun.list.forEach(function (x, i) {
  if (i > 0 && x.startAge - m1999.daeun.list[i - 1].startAge !== 10) ageOk = false;
  if (i > 0) {
    const p = m1999.daeun.list[i - 1];
    if ((p.gan + 9) % 10 !== x.gan || (p.ji + 11) % 12 !== x.ji) stepOk = false;
  }
});
eq('대운 나이 10년 간격', ageOk, true);
eq('역행 대운은 간지가 1칸씩 뒤로', stepOk, true);
eq('대운 시작 나이 = 대운수', m1999.daeun.list[0].startAge, m1999.daeun.startAge);
eq('대운 역행 간지(병인→을축)', [m1999.daeun.list[0].ganzi, m1999.daeun.list[1].ganzi], ['병인', '을축']);

console.log('\n[8] 용신·기신');
const ELEMS = ['목', '화', '토', '금', '수'];
const SAENG_REV = { '화': '목', '토': '화', '금': '토', '수': '금', '목': '수' };
const GEUK_REV = { '토': '목', '금': '화', '수': '토', '목': '금', '화': '수' };
let yongOk = true, groupOk = true;
[m2026, m1999, f1999,
  bd({ year: 2000, month: 12, day: 31, hour: 23, gender: 'f' }),
  bd({ year: 1975, month: 1, day: 20, hour: 3, gender: 'm' }),
  bd({ year: 1988, month: 7, day: 7, hour: 6, gender: 'm' })
].forEach(function (c) {
  if (ELEMS.indexOf(c.yongsin.elem) < 0) yongOk = false;
  if (c.yongsin.huisin !== SAENG_REV[c.yongsin.elem]) yongOk = false;
  if (c.yongsin.gisin !== GEUK_REV[c.yongsin.elem]) yongOk = false;
  if (S.elemGroup(c.dayMaster.elem, c.yongsin.elem) !== c.yongsin.group) groupOk = false;
});
eq('용신/희신/기신 오행 관계', yongOk, true);
eq('용신의 십신 그룹 일치', groupOk, true);

const strongChart = bd({ year: 2000, month: 12, day: 31, hour: 23, gender: 'f' });
eq('계수 자월 여 → 신강', strongChart.strength, '신강');
eq('신강 → 용신은 식상·재성·관성 중', ['식상', '재성', '관성'].indexOf(strongChart.yongsin.group) >= 0, true);
eq('계수 자월 → 조후로 화가 필요', strongChart.yongsin.johu, '화');

const weakChart = bd({ year: 1999, month: 3, day: 22, hour: 7, minute: 30, gender: 'm' });
eq('계수 묘월 남 → 신약', weakChart.strength, '신약');
eq('신약 → 용신은 인성·비겁 중', ['인성', '비겁'].indexOf(weakChart.yongsin.group) >= 0, true);
eq('1999-03-22 신약 → 용신 금(인성)', [weakChart.yongsin.elem, weakChart.yongsin.group], ['금', '인성']);

const summerChart = bd({ year: 1988, month: 7, day: 7, hour: 6, gender: 'm' });
eq('여름생 → 조후로 수가 필요', summerChart.yongsin.johu, '수');

console.log('\n[9] 심층 리포트 (7개 항목 · 항목당 400자 이상 · 5문단 이상)');
const d = F.deep(m1999);
eq('심층 항목 수', d.sections.length, 7);
eq('항목 키 순서', d.sections.map(function (s) { return s.key; }).join(','), 'summary,personality,money,job,love,daeun,remedy');
let lenOk = true, paraOk = true, textOk = true;
d.sections.forEach(function (sec) {
  if (sec.chars < 400) lenOk = false;
  if (sec.paras.length < 5) paraOk = false;
  sec.paras.forEach(function (p) { if (!p.h || !p.t || p.t.length < 20) textOk = false; });
});
eq('항목마다 400자 이상', lenOk, true);
eq('항목마다 5문단 이상', paraOk, true);
eq('문단 제목·본문 채워짐', textOk, true);
eq('전체 3,500자 이상', d.totalChars >= 3500, true);
eq('placeholder 문자열 미검출', /undefined|NaN|\[object/.test(JSON.stringify(d)), false);
eq('모든 항목에 도사 한마디', d.sections.every(function (s) { return s.dosa.length >= 2; }), true);

/* 다른 사주에서도 길이·문장이 무너지지 않는지 */
let allOk = true;
for (let y = 1960; y <= 2015; y += 7) {
  for (let m = 1; m <= 12; m += 5) {
    const c = S.build({ year: y, month: m, day: 12, hour: 10, gender: m % 2 ? 'm' : 'f', now: REF });
    const dd = F.deep(c);
    if (dd.sections.some(function (s) { return s.chars < 400; })) allOk = false;
    if (/undefined|NaN/.test(JSON.stringify(dd))) allOk = false;
    const L = F.mascotLines(c);
    if (!L.summary[0] || !L.daeun[0] || !L.remedy[0]) allOk = false;
  }
}
eq('여러 사주에서도 심층 풀이·말풍선 정상', allOk, true);

console.log('\n[10] 심층 궁합 리포트 (7장 · 총 4,500자 이상)');
const Comp = require('../js/compat.js');
const cpA = bd({ year: 1999, month: 3, day: 22, hour: 7, minute: 30, gender: 'm', name: '이규호' });
const cpB = bd({ year: 2000, month: 5, day: 5, hour: 14, minute: 0, gender: 'f', name: '수진' });
const cr = Comp.report(cpA, cpB);
eq('궁합 챕터 수', cr.sections.length, 7);
eq('궁합 점수 범위', cr.score >= 38 && cr.score <= 97, true);
eq('네 가지 지표', cr.gauges.length, 4);
eq('도사 말풍선 탭', cr.talk.length >= 6, true);
eq('궁합 4,500자 이상', cr.totalChars >= 4500, true);
eq('궁합 6,000자 이하', cr.totalChars <= 6000, true);
let cLen = true, cDosa = true, cText = true;
cr.sections.forEach(function (sec) {
  if (sec.chars < 450) cLen = false;
  if (sec.paras.length < 5) cText = false;
  if (sec.dosa.length < 2) cDosa = false;
  sec.paras.forEach(function (p) { if (!p.h || !p.t || p.t.length < 20) cText = false; });
});
eq('궁합 항목마다 450자 이상', cLen, true);
eq('궁합 문단·도사 한마디 채워짐', cText && cDosa, true);
eq('궁합 placeholder 없음', /undefined|NaN|\[object/.test(JSON.stringify(cr)), false);
eq('이규호/수진 조사 오류 없음', /이규호(은|이|을|과|으로)|수진(는|가|를|와|로)/.test(JSON.stringify(cr)), false);

/* 여러 쌍에서도 길이·문장이 무너지지 않는지 */
let cAll = true;
for (let y = 1970; y <= 2005; y += 5) {
  for (let m = 1; m <= 12; m += 4) {
    const x = bd({ year: y, month: m, day: 10, hour: 9, gender: 'm' });
    const z = bd({ year: y + 3, month: ((m + 6) % 12) + 1, day: 20, hour: 21, gender: 'f' });
    const rr = Comp.report(x, z);
    if (rr.totalChars < 4500) cAll = false;
    if (rr.sections.some(function (sec) { return sec.chars < 400; })) cAll = false;
    if (/undefined|NaN/.test(JSON.stringify(rr))) cAll = false;
  }
}
eq('여러 쌍에서도 궁합 리포트 정상', cAll, true);

console.log('\n[11] 2027 신년 심층 리포트 (6장 · 총 5,000자 이상)');
const Y27 = require('../js/year2027.js');
const yr = Y27.report(cpA, S);
eq('신년 챕터 수', yr.sections.length, 6);
eq('신년 5,000자 이상', yr.totalChars >= 5000, true);
eq('월별 캘린더 12개', yr.months.length, 12);
eq('1월 월건(병오년 신축월)', yr.months[0].ganzi, '신축');
eq('2월 월건(정미년 임인월)', yr.months[1].ganzi, '임인');
eq('12월 월건(임자월)', yr.months[11].ganzi, '임자');
eq('흐름 지수 범위', yr.index >= 42 && yr.index <= 96, true);
eq('도사 말풍선 탭', yr.talk.length >= 6, true);
eq('신년 placeholder 없음', /undefined|NaN|\[object/.test(JSON.stringify(yr)), false);
let yLen = true, yText = true;
yr.sections.forEach(function (sec) {
  if (sec.chars < 400) yLen = false;
  if (sec.paras.length < 4) yText = false;
  sec.paras.forEach(function (p) { if (!p.h || !p.t || p.t.length < 20) yText = false; });
});
eq('신년 항목마다 400자 이상', yLen, true);
eq('신년 문단 채워짐', yText, true);
let yAll = true;
[1975, 1988, 2000, 2012].forEach(function (yy) {
  const c2 = bd({ year: yy, month: (yy % 12) + 1, day: 18, hour: 15, gender: yy % 2 ? 'm' : 'f' });
  const r2 = Y27.report(c2, S);
  if (r2.totalChars < 5000) yAll = false;
  if (/undefined|NaN/.test(JSON.stringify(r2))) yAll = false;
  if (r2.months.length !== 12) yAll = false;
});
eq('여러 사주에서도 신년 리포트 정상', yAll, true);

console.log('\n[12] 웹툰 컷 대본 (궁합 10컷 · 2027 10컷 · 말풍선 2개 · 빈 대사 없음)');
if (typeof global.document === 'undefined') global.document = { querySelector: function () { return null; } };
const Story = require('../js/story.js');

function beatCheck(label, pack, wantCast) {
  const beats = pack ? pack.beats : [];
  eq(label + ' 캐릭터', pack ? pack.cast : null, wantCast);
  eq(label + ' 컷 수 9~10', beats.length >= 9 && beats.length <= 10, true);
  eq(label + ' id 중복 없음', new Set(beats.map(function (b) { return b.id; })).size === beats.length, true);
  let empty = 0, tooLong = 0, twoLine = 0, em = 0, bad = 0;
  beats.forEach(function (b) {
    if (!b.lines || !b.lines.length) { empty++; return; }
    if (b.lines.length === 2) twoLine++;
    b.lines.forEach(function (l) {
      const plain = String(l || '').replace(/\*\*/g, '').trim();
      if (!plain) empty++;
      if (plain.length > 58) tooLong++;
      if (/undefined|NaN|\[object/.test(plain)) bad++;
    });
    if (b.lines.join('').indexOf('**') >= 0) em++;
  });
  eq(label + ' 빈 대사 없음', empty, 0);
  eq(label + ' 말풍선 길이 58자 이하', tooLong, 0);
  eq(label + ' 대부분 두 마디', twoLine >= beats.length - 1, true);
  eq(label + ' 골드 강조 있는 컷 7개 이상', em >= 7, true);
  eq(label + ' placeholder 없음', bad, 0);
  eq(label + ' 마지막 컷 CTA 3개', (beats[beats.length - 1].actions || []).length, 3);
  eq(label + ' 첫 컷은 선택지 없음', !pack.beats[0].ask, true);
  eq(label + ' 점프 가능한 주제 6개 이상', beats.filter(function (b) { return b.ask; }).length >= 6, true);
}

beatCheck('궁합 기본', Story.compatBeats(cpA, cpB, cr), 'seonnyeo');
beatCheck('2027 기본', Story.newyearBeats(cpA, yr), 'chic');

let pairOk = true, yearOk = true;
for (let y = 1975; y <= 2005; y += 6) {
  for (let m = 1; m <= 12; m += 5) {
    const x1 = bd({ year: y, month: m, day: 9, hour: 6, gender: 'm', name: '가' });
    const x2 = bd({ year: y + 4, month: ((m + 5) % 12) + 1, day: 21, hour: 18, gender: 'f', name: '나' });
    const r2 = Comp.report(x1, x2);
    const p = Story.compatBeats(x1, x2, r2);
    if (!p || p.beats.length < 9 || p.beats.some(function (b) { return !b.lines.length || b.lines.some(function (l) { return !l.replace(/\*\*/g, '').trim() || /undefined|NaN/.test(l); }); })) pairOk = false;
    const y2 = Y27.report(x1, S);
    const q = Story.newyearBeats(x1, y2);
    if (!q || q.beats.length < 9 || q.beats.some(function (b) { return !b.lines.length || b.lines.some(function (l) { return !l.replace(/\*\*/g, '').trim() || /undefined|NaN/.test(l); }); })) yearOk = false;
  }
}
eq('여러 궁합에서도 대본 정상', pairOk, true);
eq('여러 사주에서도 2027 대본 정상', yearOk, true);

/* 이미 있는 대사에 조사가 어긋나지 않는지 (이름·오행 뒤) */
const joined = [].concat.apply([], Story.compatBeats(cpA, cpB, cr).beats.map(function (b) { return b.lines; })).join(' ');
eq('궁합 대본 조사 오류 없음(/이규호(은|이|과|을)|수진(는|가|와|를)/)', /이규호(은|이|과|을)|수진(는|가|와|를)/.test(joined), false);

console.log('\n[13] 테마별 컷 흐름 (정통·연애·재물·팩폭·신년이 서로 다른 대본)');
require('../js/themes.js');
const TH = global.Themes;

function themeBeatCheck(label, chart, key) {
  const pack = Story.indexBeats(chart, key);
  const beats = (pack && pack.beats) || [];
  let empty = 0, tooLong = 0, bad = 0, noChips = 0, two = 0;
  beats.forEach(function (b) {
    if (!b.chips || !b.chips.length) noChips++;
    if (!b.lines || !b.lines.length) { empty++; return; }
    if (b.lines.length === 2) two++;
    b.lines.forEach(function (l) {
      const plain = String(l || '').replace(/\*\*/g, '').trim();
      if (!plain) empty++;
      if (plain.length > 58) tooLong++;
      if (/undefined|NaN|\[object/.test(plain)) bad++;
    });
    (b.chips || []).forEach(function (c) { if (/undefined|NaN|\[object/.test(String(c))) bad++; });
  });
  eq(label + ' 컷 8~14', beats.length >= 8 && beats.length <= 14, true);
  eq(label + ' id 중복 없음', new Set(beats.map(function (b) { return b.id; })).size === beats.length, true);
  eq(label + ' 빈 대사 없음', empty, 0);
  eq(label + ' 말풍선 58자 이하', tooLong, 0);
  eq(label + ' placeholder 없음', bad, 0);
  eq(label + ' 칩 비어있지 않음', noChips, 0);
  eq(label + ' 두 마디 컷 3개 이상', two >= 3, true);
  eq(label + ' 첫 컷은 선택지 없음', !beats[0].ask, true);
  eq(label + ' 마지막 컷 CTA 3개', (beats[beats.length - 1].actions || []).length, 3);
  eq(label + ' 테마 선택지 5개 이상', beats.filter(function (b) { return b.ask; }).length >= 5, true);
  return pack;
}

/* 한 사주에서 대표 테마를 모두 돌려 본다 */
const themeKeys = TH.list.filter(function (t) { return !t.href; }).map(function (t) { return t.key; });
let themeAllOk = true;
themeKeys.forEach(function (k) {
  const p = Story.indexBeats(cpA, k);
  if (!p || !p.beats || p.beats.length < 8) themeAllOk = false;
  if (p.beats.some(function (b) {
    return !b.lines.length || b.lines.some(function (l) { return !String(l).replace(/\*\*/g, '').trim() || /undefined|NaN/.test(l); });
  })) themeAllOk = false;
});
eq('모든 테마 카드에 대본 있음', themeAllOk, true);
eq('테마 카드 수 17', themeKeys.length, 17);

/* 여러 사주에서도 빈 대사·undefined 가 없는지 */
let themeStress = true;
for (let y = 1962; y <= 2010; y += 8) {
  for (let gidx = 0; gidx < 2; gidx++) {
    const cc = bd({ year: y, month: (y % 12) + 1, day: 14, hour: gidx ? null : 9, gender: gidx ? 'f' : 'm' });
    themeKeys.forEach(function (k) {
      const p = Story.indexBeats(cc, k);
      if (!p || !p.beats || p.beats.length < 8) themeStress = false;
      p.beats.forEach(function (b) {
        if (!b.lines || !b.lines.length) themeStress = false;
        b.lines.forEach(function (l) {
          const plain = String(l || '').replace(/\*\*/g, '').trim();
          if (!plain || /undefined|NaN|\[object/.test(plain)) themeStress = false;
        });
        (b.chips || []).forEach(function (c) { if (/undefined|NaN/.test(String(c))) themeStress = false; });
      });
    });
  }
}
eq('여러 사주에서도 테마 대본 정상', themeStress, true);

/* 카테고리가 다르면 2~6번 컷이 통째로 달라야 한다 */
function flowCuts(key, n) {
  return Story.indexBeats(cpA, key).beats.slice(1, n || 6);
}
function flowText(key, n) { return flowCuts(key, n).map(function (b) { return b.lines.join(' '); }).join(' '); }
const fSpouse = flowCuts('love-spouse'), fMoney = flowCuts('money-main'), fJeon = flowCuts('jeontong-total');
eq('배우자상 2번 컷은 배우자 자리', fSpouse[0].id, 'l-seat');
eq('재물운 2번 컷은 돈 습관', fMoney[0].id, 'm-habit');
eq('정통사주 2번 컷은 인사', fJeon[0].id, 'hello');
eq('배우자상·재물운 2~6컷 대사 다름', flowText('love-spouse') === flowText('money-main'), false);
eq('재물운·정통 2~6컷 대사 다름', flowText('money-main') === flowText('jeontong-total'), false);
eq('배우자상·정통 2~6컷 대사 다름', flowText('love-spouse') === flowText('jeontong-total'), false);
const spouseLines = flowText('love-spouse').replace(/\*\*/g, '');
const moneyLines = flowText('money-main').replace(/\*\*/g, '');
const jeonLines = flowText('jeontong-total').replace(/\*\*/g, '');
eq('배우자상 흐름에 직업·재물 얘기 없음', /직업|재물|월급|사업/.test(spouseLines), false);
eq('재물 흐름에 연애·결혼 얘기 없음', /연애|배우자|결혼|인연|썸/.test(moneyLines), false);
const jeonIds = Story.indexBeats(cpA, 'jeontong-total').beats.map(function (b) { return b.id; });
eq('정통 흐름은 종합 코스 유지',
  ['hello', 'pillars', 'summary', 'personality', 'elem', 'money', 'job', 'love', 'daeun', 'year2027', 'remedy', 'closing']
    .every(function (id) { return jeonIds.indexOf(id) >= 0; }), true);
eq('정통 흐름에 테마 전용 컷 없음', /^[lmpn]-/.test(jeonIds.join(',')), false);

/* 테마별 선택지도 그 테마 언어를 써야 한다 */
const spouseAsk = Story.indexBeats(cpA, 'love-spouse').beats.filter(function (b) { return b.ask; }).map(function (b) { return b.ask; }).join(' ');
const moneyAsk = Story.indexBeats(cpA, 'money-main').beats.filter(function (b) { return b.ask; }).map(function (b) { return b.ask; }).join(' ');
eq('연애 테마 선택지에 배우자·인연', /배우자|인연/.test(spouseAsk), true);
eq('재물 테마 선택지에 돈·재물', /돈|재물/.test(moneyAsk), true);
eq('연애·재물 선택지 서로 다름', spouseAsk === moneyAsk, false);

themeBeatCheck('배우자상', cpA, 'love-spouse');
themeBeatCheck('재물운', cpA, 'money-main');
themeBeatCheck('팩폭', cpA, 'packpok-main');
themeBeatCheck('2027 신년', cpA, 'newyear-main');
themeBeatCheck('정통사주', cpA, 'jeontong-total');

console.log('\n' + (fail === 0 ? '✅ 전체 통과 (실패 0)' : '❌ 실패 ' + fail + '건'));
process.exit(fail === 0 ? 0 : 1);
