/* ============================================================
   운세도사 · 2027 정미년 심층 신년운세 엔진 (year2027.js)
   - 세운(정미)의 천간·지지 십신, 원국 합충, 용신 작용을 겹쳐 6개 챕터로 조합
   - 1~12월 월건을 실제 절기 기준으로 계산해 월별 캘린더를 만든다
   - 서버·API 없이 브라우저에서 동작 (window.Year2027)
   ============================================================ */
(function (global) {
  'use strict';

  var Y = {};

  var ELEMS = ['목', '화', '토', '금', '수'];
  var SAENG = { '목': '화', '화': '토', '토': '금', '금': '수', '수': '목' };
  var GEUK = { '목': '토', '화': '금', '토': '수', '금': '목', '수': '화' };
  var GAN_ELEM = ['목', '목', '화', '화', '토', '토', '금', '금', '수', '수'];
  var JI_ELEM = ['수', '토', '목', '목', '토', '화', '화', '토', '금', '금', '토', '수'];

  var GAN_HAP = [[0, 5, '토'], [1, 6, '금'], [2, 7, '수'], [3, 8, '목'], [4, 9, '화']];
  var JI_YUKHAP = [[0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7]];
  var JI_CHUNG = [[0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11]];
  var JI_SAMHAP = [[8, 0, 4], [11, 3, 7], [2, 6, 10], [5, 9, 1]];
  var JI_HYUNG = [[2, 5], [5, 8], [2, 8], [1, 10], [10, 7], [1, 7], [0, 3]];
  var JI_PA = [[0, 9], [6, 3], [8, 5], [2, 11], [4, 1], [10, 7]];
  var JI_HAE = [[0, 7], [1, 6], [2, 5], [3, 4], [8, 11], [9, 10]];

  function pairIn(list, a, b) {
    for (var i = 0; i < list.length; i++) {
      if ((list[i][0] === a && list[i][1] === b) || (list[i][0] === b && list[i][1] === a)) return list[i];
    }
    return null;
  }
  function relOf(a, b) {
    var out = [];
    if (pairIn(JI_YUKHAP, a, b)) out.push('육합');
    for (var i = 0; i < JI_SAMHAP.length; i++) {
      var g = JI_SAMHAP[i];
      if (g.indexOf(a) >= 0 && g.indexOf(b) >= 0 && a !== b) { out.push('삼합'); break; }
    }
    if (pairIn(JI_CHUNG, a, b)) out.push('충');
    if (pairIn(JI_HYUNG, a, b)) out.push('형');
    if (a === b && [4, 6, 9, 11].indexOf(a) >= 0) out.push('자형');
    if (pairIn(JI_PA, a, b)) out.push('파');
    if (pairIn(JI_HAE, a, b)) out.push('해');
    return out;
  }

  /* ---------- 조사 ---------- */
  function jongIndex(s) {
    var t = String(s === undefined || s === null ? '' : s);
    for (var i = t.length - 1; i >= 0; i--) {
      var c = t.charCodeAt(i);
      if (c >= 0xAC00 && c <= 0xD7A3) return (c - 0xAC00) % 28;
    }
    return -1;
  }
  function josa(w, a, b) {
    var j = jongIndex(w);
    return String(w === undefined || w === null ? '' : w) + (j > 0 ? a : b);
  }
  function iga(w) { return josa(w, '이', '가'); }
  function eun(w) { return josa(w, '은', '는'); }
  function eul(w) { return josa(w, '을', '를'); }
  function gwa(w) { return josa(w, '과', '와'); }
  function euro(w) {
    var j = jongIndex(w);
    if (j === 8) return String(w) + '로';
    return String(w) + (j > 0 ? '으로' : '로');
  }
  function ira(w) { return josa(w, '이라', '라'); }
  function who(nm, text) { return eun(nm) + ' ' + text; }

  /* ---------- 2027 정미년 ---------- */
  var GAN_2027 = 3;   /* 정(丁) */
  var JI_2027 = 7;    /* 미(未) */

  var MONTH_KEYWORD = {
    '비견': '내 힘으로 미는 달', '겁재': '경쟁과 지출의 달', '식신': '안정과 생산의 달',
    '상관': '표현과 마찰의 달', '편재': '기회와 변동의 달', '정재': '착실한 수입의 달',
    '정관': '자리와 이름의 달', '편관': '압박과 돌파의 달', '정인': '배움과 문서의 달',
    '편인': '직관과 정리의 달'
  };
  var MONTH_DO = {
    '비견': '내 이름으로 결정하고 밀고 나가기 좋습니다. 다만 사람과 주도권을 다투는 자리에서는 한발 물러서세요.',
    '겁재': '들어오는 돈만큼 나가기 쉬운 달입니다. 큰 지출과 보증은 미루고, 경쟁은 실력으로만 하세요.',
    '식신': '하던 일이 안정적으로 굴러갑니다. 새로 벌이기보다 루틴을 다지고 몸을 챙기기 좋습니다.',
    '상관': '재능과 말이 밖으로 나오는 달입니다. 발표와 영업에는 좋지만, 윗사람과의 말실수를 조심하세요.',
    '편재': '기회가 넓게 열리지만 손도 커지는 달입니다. 한 번에 크게보다 작게 여러 번 움직이세요.',
    '정재': '월급·계약·정산처럼 정해진 수입이 단단해집니다. 저축과 자산 점검에 가장 좋은 달입니다.',
    '정관': '승진·자격·계약처럼 이름이 걸린 일에 지원하고 제출하세요. 책임이 늘어나는 만큼 몸도 챙기세요.',
    '편관': '압박과 시험대가 오는 달입니다. 무리한 확장은 금물이고, 체력 관리가 성과를 가릅니다.',
    '정인': '공부·자격·문서·계약이 잘 풀립니다. 윗사람이나 후원자의 도움을 받기 좋은 달입니다.',
    '편인': '남들이 못 보는 틈이 보이는 달입니다. 다만 생각이 길어지니 마감을 정해두고 움직이세요.'
  };

  var QUARTER = [
    { key: 'q1', label: '1분기', months: '1~3월', head: '기반을 다지는 석 달' },
    { key: 'q2', label: '2분기', months: '4~6월', head: '문이 열리는 석 달' },
    { key: 'q3', label: '3분기', months: '7~9월', head: '시험대에 서는 석 달' },
    { key: 'q4', label: '4분기', months: '10~12월', head: '결실을 정리하는 석 달' }
  ];

  var ELEM_INFO = {
    '목': { what: '시작과 성장', color: '초록·청록', dir: '동쪽', time: '아침', food: '신 채소·새콤한 음식', act: '산책·러닝·배우기', body: '간과 눈, 목' },
    '화': { what: '열정과 표현', color: '빨강·주황', dir: '남쪽', time: '정오', food: '매콤한 음식·따뜻한 차', act: '사람 만나기·노래·운동', body: '심장과 혈압, 눈' },
    '토': { what: '중심과 안정', color: '노랑·베이지', dir: '중앙', time: '환절기', food: '곡물·단호박·고구마', act: '규칙적인 식사·정리', body: '위와 소화기' },
    '금': { what: '결단과 정리', color: '흰색·은색', dir: '서쪽', time: '저녁', food: '무·배·매운맛', act: '근력운동·버리기', body: '폐와 피부, 호흡기' },
    '수': { what: '지혜와 휴식', color: '검정·남색', dir: '북쪽', time: '밤', food: '검은콩·미역·생선', act: '수영·독서·명상', body: '신장과 방광, 허리' }
  };

  function elemRel(chart, e) {
    var y = chart.yongsin;
    if (e === y.elem || e === y.huisin) return 'good';
    if (e === y.gisin || e === y.gusin) return 'bad';
    return 'mid';
  }

  /* ---------- 월건 계산 ---------- */
  Y.months = function (chart, Saju) {
    var out = [];
    for (var m = 1; m <= 12; m++) {
      var c = Saju.build({
        year: 2027, month: m, day: 15, hour: 12, minute: 0,
        calendar: 'solar', gender: chart.input.gender, now: { y: 2027, m: m, d: 15 }
      });
      var mp = c.pillars.month;
      var gin = Saju.sipsin(chart.dayMaster.gan, mp.gan);
      var jji = mp.ji;
      var relDay = relOf(chart.pillars.day.ji, jji);
      var relYear = relOf(chart.pillars.year.ji, jji);
      var relMonth = relOf(chart.pillars.month.ji, jji);
      var rel = elemRel(chart, mp.ganElem);
      out.push({
        m: m, ganzi: mp.hangul, hanja: mp.hanja,
        gan: mp.gan, ji: jji, ganElem: mp.ganElem, jiElem: mp.jiElem,
        sipsin: gin, jiSipsin: Saju.sipsin(chart.dayMaster.gan, mp.gan),
        keyword: MONTH_KEYWORD[gin],
        relDay: relDay, relYear: relYear, relMonth: relMonth,
        rel: rel
      });
    }
    return out;
  };

  /* ---------- 월별 문장 ---------- */
  function monthText(chart, mo, nm) {
    var S = { 'good': '용신을 도와주는', 'bad': '이 사주에는 부담이 되는', 'mid': '무난한' }[mo.rel];
    var t = MONTH_DO[mo.sipsin];
    if (mo.rel === 'good') t += ' 이 달의 ' + mo.ganElem + ' 기운은 ' + nm + '에게 약이 되니, 미뤄둔 일을 꺼내 밀어붙이기 좋습니다.';
    else if (mo.rel === 'bad') t += ' 다만 ' + mo.ganElem + ' 기운이 부담으로 들어오니, 새 일을 벌이기보다 하던 일을 지키는 쪽이 안전합니다.';
    else t += ' 크게 밀어줄 기운도 막을 기운도 아니니, 평소의 습관이 그대로 결과가 됩니다.';
    if (mo.relDay.indexOf('충') >= 0) t += ' 특히 배우자·가족 자리와 충이 걸려, 가까운 사람과의 약속이 틀어지기 쉬운 달입니다.';
    else if (mo.relDay.indexOf('육합') >= 0) t += ' 배우자 자리와 육합이 들어와, 가까운 사람과 정이 깊어지는 달입니다.';
    if (mo.relYear.indexOf('충') >= 0) t += ' 직장·부모 자리와도 충이 겹쳐, 일과 가족 사이에서 우선순위를 정해야 합니다.';
    return t;
  }

  /* ---------- 총운 지수 ---------- */
  function indexOf(chart, mo) {
    var g = elemRel(chart, GAN_ELEM[GAN_2027]);
    var j = elemRel(chart, JI_ELEM[JI_2027]);
    var score = 60;
    if (g === 'good') score += 14; else if (g === 'bad') score -= 10;
    if (j === 'good') score += 12; else if (j === 'bad') score -= 8;
    var rel = relOf(chart.pillars.day.ji, JI_2027);
    if (rel.indexOf('육합') >= 0) score += 8;
    if (rel.indexOf('삼합') >= 0) score += 6;
    if (rel.indexOf('충') >= 0) score -= 6;
    if (rel.indexOf('형') >= 0) score -= 4;
    if (chart.strength === '신강' && g === 'bad') score -= 2;
    if (chart.strength === '신약' && g === 'good') score += 3;
    var sipsin = chart.years[1].ganSipsin;
    if (sipsin === '정관' || sipsin === '정재' || sipsin === '식신' || sipsin === '정인') score += 6;
    if (sipsin === '겁재' || sipsin === '상관' || sipsin === '편관') score -= 3;
    return Math.max(42, Math.min(96, Math.round(score)));
  }

  /* ---------- 본문 ---------- */
  Y.report = function (chart, Saju) {
    var F = global.Fortune;
    var nm = chart.input.name || '이 사주';
    var G = F.GAN[chart.dayMaster.gan];
    var Ji = F.JI;
    var dayJi = chart.pillars.day.ji;
    var y = chart.yongsin;
    var y27 = chart.years[1];
    var months = Y.months(chart, Saju);
    var idx = indexOf(chart, months);
    var jeon = GAN_ELEM[GAN_2027], mi = JI_ELEM[JI_2027];
    var jeonRel = elemRel(chart, jeon), miRel = elemRel(chart, mi);
    var dayRel = relOf(dayJi, JI_2027);
    var C = chart.sipsinCount;
    var jae = C['정재'] + C['편재'], bigo = C['비견'] + C['겁재'];
    var gwan = C['정관'] + C['편관'], siksang = C['식신'] + C['상관'];
    var inGroup = C['정인'] + C['편인'];
    var moneyMonths = months.filter(function (m) { return m.sipsin === '정재' || m.sipsin === '편재'; });
    var spendMonths = months.filter(function (m) { return m.sipsin === '겁재' || m.sipsin === '상관'; });
    var loveMonths = months.filter(function (m) {
      var star = chart.input.gender === 'm' ? ['정재', '편재'] : ['정관', '편관'];
      return star.indexOf(m.sipsin) >= 0 || m.relDay.indexOf('육합') >= 0;
    });
    var clashMonths = months.filter(function (m) { return m.relDay.indexOf('충') >= 0 || m.relYear.indexOf('충') >= 0; });
    var goodMonths = months.filter(function (m) { return m.rel === 'good'; });

    var sections = [];
    function add(o) { sections.push(o); }

    /* ============ 01 세운 ============ */
    add({
      key: 'seun', no: '01', title: '2027 정미년 세운과 내 사주의 만남',
      tagline: '정화(丁火) · 미토(未土)가 내 여덟 글자에 들어올 때',
      lead: '천간 ' + y27.ganSipsin + ' · 지지 ' + y27.jiSipsin + ' · 흐름 지수 ' + idx,
      paras: [
        { h: '2027년의 두 글자', t: '2027년은 육십갑자의 마흔네 번째 해, 정미(丁未)년입니다. 위 글자 정(丁)은 촛불·모닥불 같은 작은 불이고, 아래 글자 미(未)는 여름 끝자락의 부드러운 흙입니다. 불이 흙을 데우는 구조라 2026년 병오(丙午)의 뜨거운 기세처럼 크게 터지기보다, 데우고 익히고 마무리하는 쪽으로 흐릅니다. 그래서 2027년의 성과는 “얼마나 크게 벌였나”보다 “얼마나 잘 익혔나”로 갈립니다.' },
        { h: '내 일간과 만나면', t: nm + '의 일간은 ' + G.name + '(세력 ' + Math.round(chart.supportRatio * 100) + '%, ' + chart.strength + ')입니다. 정화는 이 일간 기준으로 ' + y27.ganSipsin + '으로 작용하고, 미토의 본기 기토는 ' + y27.jiSipsin + '으로 작용합니다. ' + ({
          '비견': '내 힘으로 결정하고 책임지는 해입니다. 내 이름으로 시작하는 일, 독립·부업에 힘이 붙습니다. 다만 주도권 다툼이 생기니 동업과 보증은 문서로 남기세요.',
          '겁재': '경쟁과 지출이 함께 오는 해입니다. 의욕은 넘치는데 돈이 새기 쉬우니 큰 지출은 한 박자 늦추고, 사람 문제로 나가는 돈을 조심하세요.',
          '식신': '꾸준히 해 온 일이 안정적으로 자리 잡는 해입니다. 새로 벌이기보다 지금의 루틴을 다질 때 수입과 건강이 함께 좋아집니다.',
          '상관': '재능과 표현이 밖으로 드러나는 해입니다. 콘텐츠·강의·영업처럼 말과 결과물로 승부하는 자리에서 성과가 나지만, 말과 계약에서 실수가 나기 쉽습니다.',
          '편재': '기회가 크게 열리는 해입니다. 새로운 수입원이나 제안이 들어오기 쉽지만 과욕이 화를 부릅니다. 크게 한 번보다 작게 여러 번이 맞습니다.',
          '정재': '착실한 성과가 쌓이는 해입니다. 월급·계약·정산처럼 정해진 수입이 단단해지고, 저축과 자산 관리에 특히 좋습니다.',
          '정관': '이름과 자리가 올라가는 해입니다. 승진·자격·공모·계약에서 결과가 나올 수 있으니 준비해 둔 것을 제출하고 지원하세요.',
          '편관': '압박과 도전이 함께 오는 해입니다. 책임이 커지고 시험대에 서지만 그만큼 실력이 인정받습니다. 체력 관리가 핵심입니다.',
          '정인': '배움과 문서의 해입니다. 공부·자격증·계약·이사처럼 기록이 남는 일이 잘 풀리고, 후원자나 윗사람의 도움을 받기 좋습니다.',
          '편인': '전문성과 직관이 빛나는 해입니다. 남들이 못 보는 틈을 찾아내지만 생각이 많아져 결정이 늦어질 수 있습니다.'
        }[y27.ganSipsin]) },
        { h: '지지 미토가 건드리는 자리', t: '세운의 지지 미(未)는 내 원국의 지지들과 관계를 맺습니다. ' + (function () {
          var parts = [];
          [['년지', chart.pillars.year.ji], ['월지', chart.pillars.month.ji], ['일지', chart.pillars.day.ji], ['시지', chart.pillars.hour ? chart.pillars.hour.ji : null]].forEach(function (p) {
            if (p[1] === null) return;
            var r = relOf(p[1], JI_2027);
            if (r.length) parts.push(p[0] + ' ' + Ji[p[1]].name + '과 ' + r.join('·'));
          });
          if (!parts.length) return '미토와 특별한 합·충을 이루는 자리가 없어, 원국의 흐름이 크게 흔들리지 않고 안정적으로 이어집니다. 대신 변화가 적은 만큼 스스로 움직이지 않으면 한 해가 그대로 지나갑니다.';
          return parts.join(', ') + '의 관계를 맺습니다. ' + (parts.join(' ').indexOf('충') >= 0 ? '충은 그 자리의 일이 흔들린다는 뜻이라, 이사·이직·가족 문제처럼 생활의 틀이 바뀌는 일이 생길 수 있습니다. 미리 준비하면 오히려 기회가 됩니다.' : '합은 그 자리의 일이 사람과 인연을 통해 풀린다는 뜻입니다. 혼자 결정하기보다 사람을 통해 길을 찾으세요.');
        })() },
        { h: '대운과 세운이 겹칠 때', t: (chart.daeun.current ? '지금은 ' + chart.daeun.current.ganzi + ' 대운(' + chart.daeun.current.startAge + '~' + chart.daeun.current.endAge + '세)의 ' + chart.daeun.yearsIntoDaeun + '년째로, 대운의 천간은 ' + chart.daeun.current.ganSipsin + '입니다. 대운은 10년의 큰 판, 세운은 그 판 위의 1년짜리 날씨입니다. 2027년의 ' + y27.ganSipsin + '은 대운의 ' + chart.daeun.current.ganSipsin + ' 위에서 움직이니, ' + (chart.daeun.current.ganSipsin === y27.ganSipsin ? '같은 기운이 두 번 겹쳐 그 주제가 유난히 선명해집니다. 좋은 쪽이든 나쁜 쪽이든 두 배가 되니, 평소보다 한 번 더 확인하고 움직이세요.' : '대운이 만든 흐름을 세운이 비틀거나 밀어주는 구조입니다. 대운의 방향을 거스르는 결정은 오래 가지 않으니, 새 일을 벌일 때 “이게 지금 10년의 주제와 맞나”를 먼저 물으세요.') + (chart.daeun.next ? ' 그리고 ' + chart.daeun.next.startAge + '세부터 ' + chart.daeun.next.ganzi + ' 대운이 시작됩니다. 그 전 ' + Math.max(0, chart.daeun.next.startAge - chart.daeun.age) + '년은 다음 판을 준비하는 시간으로 쓰면, 대운이 바뀌는 해에 훨씬 수월하게 올라탑니다.' : '') : '아직 대운이 시작되기 전(만 ' + chart.daeun.startAge + '세부터)이라, 월주 ' + chart.pillars.month.hangul + '의 기운이 삶의 바탕을 이룹니다. 이 해에 만드는 습관이 첫 대운을 쓰는 방식까지 바꾸니, 결과보다 루틴에 집중하세요.') },
        { h: '용신과 기신의 작용', t: nm + '의 용신은 ' + y.elem + '(' + y.group + ') 기운이고 기신은 ' + y.gisin + ' 기운입니다. 2027년의 정화는 ' + jeon + ', 미토는 ' + mi + ' 기운이니 ' + (jeonRel === 'good' ? '천간이 용신을 도와 상반기에 힘이 실립니다.' : jeonRel === 'bad' ? '천간이 기신 쪽이라 상반기는 확장보다 정비가 맞습니다.' : '천간은 용신도 기신도 아니라 무난합니다.') + ' ' + (miRel === 'good' ? '지지도 용신을 받쳐 하반기에 실속이 남습니다.' : miRel === 'bad' ? '지지는 기신 쪽이라 하반기에 몸과 돈이 새기 쉽습니다.' : '지지는 중간 흐름이라 선택에 따라 결과가 갈립니다.') + ' 정리하면 2027년은 ' + (jeonRel === 'good' && miRel === 'good' ? '천간과 지지가 모두 용신을 도와, 미뤄둔 일을 꺼내면 실제 결과까지 이어지기 좋은 해' : jeonRel === 'bad' && miRel === 'bad' ? '천간과 지지가 모두 부담으로 들어와, 새로 벌이기보다 지키고 정리하는 데 힘을 써야 하는 해' : '한쪽은 밀어주고 한쪽은 붙잡는 해라, 시작은 하되 마무리를 직접 챙겨야 하는 해') + '입니다.' },
        { h: '2027년의 큰 주제', t: '이 사주에서 2027년의 주제는 ‘' + (y27.ganSipsin === '정관' || y27.ganSipsin === '편관' ? '이름을 얻는 해' : y27.ganSipsin === '정재' || y27.ganSipsin === '편재' ? '돈의 그릇을 넓히는 해' : y27.ganSipsin === '식신' || y27.ganSipsin === '상관' ? '만든 것을 세상에 꺼내는 해' : y27.ganSipsin === '정인' || y27.ganSipsin === '편인' ? '실력을 문서로 남기는 해' : '내 판을 다시 짜는 해') + '’입니다. ' + (chart.daeun.current ? '지금은 ' + chart.daeun.current.ganzi + ' 대운의 ' + chart.daeun.yearsIntoDaeun + '년째로, ' + chart.daeun.current.ganSipsin + '의 흐름 위에 정미년이 겹칩니다. 대운이 만든 판 위에서 세운이 방향을 정하는 해이니, 큰 결정은 대운의 방향을 거스르지 않는 쪽이 좋습니다.' : '아직 대운이 열리기 전이라 월주 ' + chart.pillars.month.hangul + '의 기운이 바탕이 됩니다. 이 해에 쌓은 습관이 첫 대운을 쓰는 방식까지 바꿉니다.') + ' 흐름 지수는 ' + idx + '점으로, ' + (idx >= 80 ? '올해보다 힘이 실리는 편입니다.' : idx >= 65 ? '무난하게 활용할 수 있는 편입니다.' : '욕심을 줄이고 정비에 쓰는 편이 좋습니다.') }
      ],
      dosa: [
        '2027년은 정미년, 작은 불이 흙을 데우는 해일세. 크게 터지는 해가 아니라 익히는 해지.',
        nm + ' 일간 기준으로 ' + y27.ganSipsin + ' 운이 들어오네. ' + ({
          '비견': '내 힘이 세지는 해라, 내 이름을 걸고 시작하게.',
          '겁재': '경쟁과 지출이 함께 오니, 큰돈은 한 박자 늦추게.',
          '식신': '만들어 온 것이 자리 잡는 해라, 루틴을 다지게.',
          '상관': '재능이 드러나는 해지. 말과 계약만 조심하면 크게 나네.',
          '편재': '기회가 열리네. 크게 한 번보다 작게 여러 번일세.',
          '정재': '차곡차곡 쌓이는 해라, 저축과 계약이 단단해지네.',
          '정관': '이름과 자리가 오르네. 준비한 것을 내놓게.',
          '편관': '시험대에 서는 해라, 버티면 실력이 인정받네.',
          '정인': '배움과 문서의 해라, 공부와 계약이 잘 풀리네.',
          '편인': '직관이 깊어지는 해지. 생각만 길어지지 않게 하게.'
        }[y27.ganSipsin]),
        '용신은 ' + y.elem + ', 기신은 ' + y.gisin + '일세. ' + (jeonRel === 'good' || miRel === 'good' ? '올해는 용신이 들어오는 자리가 있으니 그때를 놓치지 말게.' : '올해는 기운이 무거우니 지키는 쪽으로 가게. 지키는 것도 실력일세.')
      ],
      chips: ['정미(丁未)', '천간 ' + y27.ganSipsin, '지지 ' + y27.jiSipsin, '흐름 ' + idx + '점', '용신 ' + y.elem]
    });

    /* ============ 02 분기 ============ */
    (function () {
      var paras = [];
      var qi = [
        { r: '1분기(1~3월, 축·인·묘월)', note: '입춘(2월 4일)을 지나며 해의 기운이 실제로 바뀝니다. 1월은 지난해의 정리, 2~3월은 새 판의 준비입니다.' },
        { r: '2분기(4~6월, 진·사·오월)', note: '청명과 입하를 지나며 활동량이 올라갑니다. 사람을 만나고 제안을 주고받는 일이 늘어납니다.' },
        { r: '3분기(7~9월, 미·신·유월)', note: '미월이 세운의 지지와 겹치는 때라, 상반기에 벌인 일의 결과가 드러납니다.' },
        { r: '4분기(10~12월, 술·해·자월)', note: '입동을 지나면 기운이 안으로 들어갑니다. 벌이기보다 정리하고 내년을 설계하는 때입니다.' }
      ];
      qi.forEach(function (q, i) {
        var ms = months.slice(i * 3, i * 3 + 3);
        var goods = ms.filter(function (m) { return m.rel === 'good'; }).map(function (m) { return m.m + '월'; });
        var bads = ms.filter(function (m) { return m.rel === 'bad'; }).map(function (m) { return m.m + '월'; });
        var text = eun(QUARTER[i].label) + ' ' + QUARTER[i].months + ' ' + ms.map(function (m) { return m.keyword.replace('의 달', ''); }).join(', ') + '의 흐름이 이어집니다. ' + q.note + ' ' +
          (goods.length ? goods.join('·') + '에는 용신이 도와 미뤄둔 일을 밀어붙이기 좋습니다. ' : '') +
          (bads.length ? bads.join('·') + '에는 기운이 무거우니 큰 지출과 큰 약속을 피하세요. ' : '') +
          (i === 0 ? '이 분기에 세운의 방향을 정해두면 나머지 아홉 달이 그 방향으로 굴러갑니다.' : i === 1 ? '이 분기에 만난 사람이 연말까지 이어지니, 인사를 아끼지 마세요.' : i === 2 ? '결과가 기대와 달라도 이때 포기하지 말고 4분기 정리까지 끌고 가세요.' : '연말의 정리는 곧 내년의 출발입니다. 장부와 인간관계를 함께 정리하세요.');
        paras.push({ h: QUARTER[i].label + ' · ' + QUARTER[i].head, t: text });
      });
      paras.push({ h: '핵심 전환점 다섯 날', t: '2027년의 판이 실제로 바뀌는 시점은 다섯 가지입니다. 입춘(2월 4일)에 해의 기운이 바뀌고, 청명(4월 5일)에 활동의 문이 열리며, 입하(5월 5일)에 사람과 일이 본격적으로 움직입니다. 입추(8월 7일)에는 상반기의 결과가 드러나고, 입동(11월 7일)에는 안으로 들어가 정리하는 국면이 됩니다. 이 다섯 날짜를 달력에 표시해두고, 큰 결정은 그 앞뒤로 미루거나 당기면 훨씬 수월합니다.' });
      add({
        key: 'quarter', no: '02', title: '분기별 흐름과 핵심 전환점',
        tagline: '1~3월 · 4~6월 · 7~9월 · 10~12월, 판이 바뀌는 다섯 날',
        lead: '입춘 2/4 → 청명 4/5 → 입하 5/5 → 입추 8/7 → 입동 11/7',
        paras: paras,
        dosa: [
          '한 해를 넷으로 나눠 보면 흐름이 보이네. 1분기는 준비, 2분기는 만남, 3분기는 결과, 4분기는 정리일세.',
          (goodMonths.length ? goods(months) + '에 힘이 실리니 그때를 놓치지 말게.' : '올해는 유난히 힘이 실리는 달이 적네. 그럴수록 하던 일을 놓지 않는 게 이기는 길일세.'),
          '절기 날짜를 달력에 표시해두게. 그 며칠 앞뒤로 결정을 미루면 판이 달라지네.'
        ],
        chips: ['1분기 준비', '2분기 만남', '3분기 결과', '4분기 정리', '입춘 2/4']
      });
      function goods(ms) { return ms.filter(function (m) { return m.rel === 'good'; }).map(function (m) { return m.m + '월'; }).join('·'); }
    })();

    /* ============ 03 월별 캘린더 ============ */
    add({
      key: 'calendar', no: '03', title: '1월~12월 월별 운세 캘린더',
      tagline: '열두 달의 키워드와 그 달에 할 일',
      lead: '월건(月建)을 절기 기준으로 계산한 결과입니다',
      paras: months.map(function (mo) {
        return { h: mo.m + '월 · ' + mo.ganzi + '월 · ' + mo.keyword, t: monthText(chart, mo, nm) };
      }),
      dosa: [
        '열두 달을 죽 펼쳐봤네. ' + (moneyMonths.length ? moneyMonths.map(function (m) { return m.m + '월'; }).join('·') + '은 돈이 움직이는 달, ' : '') + (spendMonths.length ? spendMonths.map(function (m) { return m.m + '월'; }).join('·') + '은 지출을 조심할 달일세.' : ''),
        '달마다 좋고 나쁨이 있지만, 나쁜 달은 피하는 달이 아니라 준비하는 달이라네.',
        '한 달에 하나만 기억하게. 그 달의 키워드 하나면 충분하네.'
      ],
      chips: ['1월 ' + months[0].ganzi, '6월 ' + months[5].ganzi, '12월 ' + months[11].ganzi, '힘 실리는 달 ' + (goodMonths.length ? goodMonths.map(function (m) { return m.m; }).join('·') : '적음')]
    });

    /* ============ 04 재물 ============ */
    add({
      key: 'money', no: '04', title: '2027년 재물·투자·부업과 이직운',
      tagline: '돈이 모이는 달, 지출을 조심할 달, 움직일 때',
      lead: '재성 ' + jae + '개 · 세운 ' + y27.ganSipsin + ' · 돈 달 ' + (moneyMonths.length ? moneyMonths.map(function (m) { return m.m; }).join('·') : '없음'),
      paras: [
        { h: '2027년 재물의 그릇', t: nm + '의 원국에 재성(정재·편재)은 ' + jae + '개이고, 2027년의 정화는 ' + y27.ganSipsin + '으로 들어옵니다. ' + (jae === 0 ? '원국에 재성이 드러나지 않는 사주라, 돈은 버는 힘보다 관리하는 시스템에서 모입니다. 2027년에는 통장을 나누고 자동이체를 거는 일이 곧 재物운을 만드는 일입니다.' : jae >= 3 ? '재성이 여러 개라 돈이 오가는 일이 잦습니다. 2027년에는 들어오는 돈보다 어디에 둘지를 정하는 눈이 재물의 크기를 가릅니다.' : '재성이 적당히 자리해 한두 개의 확실한 수입원을 깊게 파는 쪽이 맞습니다. 2027년에는 그 수입원을 하나 더 다듬는 해로 쓰세요.') + ' ' + (y27.ganSipsin === '정재' ? '세운이 정재로 들어와 정해진 수입이 단단해지는 해입니다. 월급·계약·정산이 힘을 받습니다.' : y27.ganSipsin === '편재' ? '세운이 편재로 들어와 기회는 크지만 지출도 커집니다. 한 번에 크게보다 여러 번 작게가 맞습니다.' : y27.ganSipsin === '겁재' ? '세운이 겁재로 들어와 돈이 새기 쉬운 해입니다. 보증·동업·지인 대출은 특히 조심하세요.' : y27.ganSipsin === '상관' ? '세운이 상관으로 들어와 재능이 돈이 되는 해입니다. 다만 말과 계약에서 실수가 나면 수입이 끊깁니다.' : '세운이 재성으로 직접 들어오지는 않아, 큰돈보다 기반을 다지는 쪽이 맞습니다.') },
        { h: '돈이 모이는 달', t: (moneyMonths.length ? moneyMonths.map(function (m) { return m.m + '월(' + m.ganzi + '월, ' + m.sipsin + ')'; }).join(', ') + '입니다. ' + MONTH_KEYWORD[moneyMonths[0].sipsin] + '이라 정산·계약·저축에 힘이 붙습니다. ' + (moneyMonths.length >= 3 ? '이 중에서도 두 달을 골라, 하나는 저축과 자산 점검에, 하나는 새 수입원을 만드는 데 쓰세요.' : '이 달들을 놓치지 말고, 미뤄둔 정산과 청구를 이때 끝내세요.') : '뚜렷하게 재성이 들어오는 달이 없습니다. 이럴 때는 큰돈을 좇기보다 새는 지출을 막는 쪽이 남는 장사입니다.') },
        { h: '지출을 조심할 달', t: (spendMonths.length ? spendMonths.map(function (m) { return m.m + '월(' + m.sipsin + ')'; }).join(', ') + '입니다. ' + (spendMonths.some(function (m) { return m.sipsin === '겁재'; }) ? '특히 겁재가 들어오는 달은 사람 문제로 돈이 나갑니다. 빌려주는 돈, 보증, 함께 내는 큰돈을 미루세요.' : '') + (spendMonths.some(function (m) { return m.sipsin === '상관'; }) ? ' 상관이 들어오는 달은 기분에 따른 소비와 계약 실수를 조심해야 합니다.' : '') : '지출이 유난히 튀는 달은 없습니다. 꾸준히 관리하면 한 해를 무난하게 넘깁니다.') + ' 그리고 두 사람 이상이 얽힌 돈(동업·가족 공동지출)은 금액과 날짜를 반드시 문서로 남기세요. 말로 한 약속은 연말에 반드시 흔들립니다.' },
        { h: '투자와 부업', t: (y27.ganSipsin === '편재' || y27.ganSipsin === '편관' ? '2027년은 승부가 걸린 제안이 들어오기 쉬운 해입니다. 다만 이 사주의 용신은 ' + y.elem + ' 기운이라, 잘 모르는 자산에 크게 걸기보다 내가 직접 통제할 수 있는 영역(기술·콘텐츠·작은 사업)에 나눠 담는 편이 승률이 높습니다.' : '2027년은 큰 승부보다 기반을 다지는 해입니다. 투자는 수익률보다 현금 흐름을 먼저 보세요. 부업은 이미 가진 기술을 파는 쪽(강의·외주·콘텐츠)이 새로 배우는 쪽보다 빠릅니다.') + ' ' + (bigo >= 2 ? '비겁이 ' + bigo + '개라 동업과 공동명의는 특히 위험합니다. 혼자 결정할 수 있는 구조를 만드세요.' : '동업을 한다면 지분과 역할을 처음부터 문서로 정하세요.') },
        { h: '부업·이직 타이밍', t: (function () {
          var gwanM = months.filter(function (m) { return m.sipsin === '정관' || m.sipsin === '편관'; });
          return '이직과 부업은 관성(역할·자리)이 들어오는 달에 움직이는 것이 좋습니다. 2027년에는 ' + (gwanM.length ? gwanM.map(function (m) { return m.m + '월'; }).join('·') + '이 그 달입니다. ' : '뚜렷한 달이 없으니 ') + '이직을 생각한다면 서류와 포트폴리오를 먼저 만들고, 면접은 그 달에 몰아두세요. 부업은 ' + (goodMonths.length ? goodMonths[0].m + '월' : '상반기') + '에 시작해 3개월 안에 첫 결과물을 내는 것을 목표로 하세요. 3개월 안에 결과가 안 나오면 구조를 바꾸는 것이지, 더 세게 미는 것이 아닙니다.' + (y27.ganSipsin === '정관' ? ' 2027년은 이름이 오르는 해라, 이직보다 승진·자격 쪽이 더 이득일 수 있습니다.' : '');
        })() },
        { h: '돈을 지키는 세 가지 규칙', t: '2027년에 돈을 지키려면 규칙이 셋이면 충분합니다. 첫째, 통장을 생활비·비상금·투자 셋으로 나누고 월급일 다음 날 자동이체로 순서를 고정하세요. 둘째, ' + y.gisin + ' 기운을 키우는 지출(체면·충동·과한 대접)에 월 상한선을 정하세요. 셋째, 수입이 생기면 절반은 ' + y.elem + ' 기운에 맞는 자기계발이나 기반 다지기에 먼저 배분하세요. ' + (y27.ganSipsin === '편재' || y27.ganSipsin === '겁재' ? '특히 2027년은 기회와 지출이 함께 커지는 해라, 두 번째 규칙이 가장 중요합니다.' : '2027년은 큰 변동이 적은 대신 새는 구멍이 쌓이기 쉬운 해라, 첫 번째 규칙이 가장 중요합니다.') + ' 이 세 가지는 한 해 만에 재물운을 바꾸는 것이 아니라, 10년 대운을 지나는 동안 돈이 새는 자리를 막아주는 장치입니다.' },
        { h: '연말 정리', t: '11~12월은 정리의 달입니다. 1년 장부를 열어 수입·지출·구독·보험을 한 번에 점검하세요. 이 사주는 ' + y.gisin + ' 기운이 강해질 때 새는 지출이 커지므로, 연말에 ' + y.gisin + ' 쪽 소비(체면·충동·과한 대접)를 잘라내면 다음 해 1월이 가볍습니다. 그리고 2028년 예산을 세울 때는 수입의 10%를 ‘잃어도 되는 돈’으로 따로 두세요. 이 한 칸이 판단을 흔들리지 않게 만듭니다.' }
      ],
      dosa: [
        '돈은 ' + (moneyMonths.length ? moneyMonths[0].m + '월에 물길이 트이네. ' : '올해는 큰 물길이 보이지 않네. ') + (spendMonths.length ? spendMonths[0].m + '월은 지갑을 조심하게.' : '대신 새는 곳을 막는 게 이기는 해일세.'),
        '보증과 동업은 이 사주에 특히 위험하네. ' + (bigo >= 2 ? '비겁이 많아 사람 문제로 돈이 나가지.' : '한 번의 실수가 크게 남으니 문서로 남기게.'),
        '부업은 ' + (goodMonths.length ? goodMonths[0].m + '월' : '상반기') + '에 시작해 석 달 안에 결과물을 내게. 안 되면 미는 게 아니라 바꾸는 것일세.'
      ],
      chips: ['재성 ' + jae, '돈 달 ' + (moneyMonths.length ? moneyMonths.map(function (m) { return m.m; }).join('·') : '없음'), '지출 주의 ' + (spendMonths.length ? spendMonths.map(function (m) { return m.m; }).join('·') : '없음'), '용신 ' + y.elem]
    });

    /* ============ 05 연애·인간관계 ============ */
    add({
      key: 'love', no: '05', title: '2027년 연애·인간관계운',
      tagline: '인연이 들어오는 달, 갈등이 생기는 달',
      lead: '배우자성 ' + (chart.input.gender === 'm' ? '재성' : '관성') + ' · 인연 달 ' + (loveMonths.length ? loveMonths.map(function (m) { return m.m; }).join('·') : '없음'),
      paras: [
        { h: '2027년 인연의 문', t: (function () {
          var star = chart.input.gender === 'm' ? ['정재', '편재'] : ['정관', '편관'];
          var starName = chart.input.gender === 'm' ? '재성' : '관성';
          var direct = months.filter(function (m) { return star.indexOf(m.sipsin) >= 0; });
          return '이 사주에서 인연의 문은 ' + starName + '이 세운·월건으로 들어오는 때 열립니다. 2027년에는 ' + (direct.length ? direct.map(function (m) { return m.m + '월(' + m.sipsin + ')'; }).join(', ') + '이 그 달입니다. ' : '배우자성이 직접 들어오는 달이 뚜렷하지 않습니다. ') + '여기에 일지와 육합을 이루는 달(' + (loveMonths.filter(function (m) { return m.relDay.indexOf('육합') >= 0; }).map(function (m) { return m.m + '월'; }).join('·') || '없음') + ')이 겹치면 만남이 실제 관계로 이어질 확률이 높습니다. 이 달에는 새로운 자리·모임·소개에 나가 보세요.' + (y27.ganSipsin === '정관' || y27.ganSipsin === '편관' ? ' 2027년 세운 자체가 ' + y27.ganSipsin + '이라, 관계를 공식화하려는 흐름이 강한 해입니다.' : '');
        })() },
        { h: '관계의 온도', t: nm + '의 일지는 ' + Ji[dayJi].name + '이고, 2027년 미토와는 ' + (dayRel.length ? dayRel.join('·') + '의 관계' : '특별한 관계가 아닌 무난한 자리') + '입니다. ' + (dayRel.indexOf('충') >= 0 ? '충은 배우자 자리가 흔들린다는 뜻이라, 결혼·동거·약속에 변화가 생길 수 있습니다. 나쁜 변화만은 아니어서, 미뤄둔 결정을 내리게 만드는 계기가 됩니다.' : dayRel.indexOf('육합') >= 0 ? '육합은 가까운 사람과의 정이 깊어지는 자리입니다. 관계를 한 단계 진전시키기 좋은 해입니다.' : '겹치는 관계가 없어 관계의 온도는 두 사람이 만드는 대화에 달려 있습니다.') + ' ' + (chart.input.gender === 'm' ? '남성 사주에서는 재성이 배우자성이라, 재성이 들어오는 달에 인연이 움직입니다.' : '여성 사주에서는 관성이 배우자성이라, 관성이 들어오는 달에 인연이 움직입니다.') },
        { h: '갈등이 생기는 달', t: (clashMonths.length ? clashMonths.map(function (m) { return m.m + '월(' + m.relDay.concat(m.relYear).join('·') + ')'; }).join(', ') + '입니다. 세운의 미토가 원국의 지지와 충을 이루는 달이라, 가까운 사람과의 약속이 틀어지거나 오해가 생기기 쉽습니다. ' : '원국과 충을 이루는 달은 뚜렷하지 않습니다. ') + '이 달에는 중요한 대화를 밤늦게 하지 말고, 약속은 문자로 남기세요. ' + (siksang >= 2 ? '식상이 ' + siksang + '개라 말이 먼저 나가 상처를 남기기 쉬우니, 한 박자 쉬고 말하는 습관이 필요합니다.' : '표현이 적은 편이라 서운함을 쌓아두다 한 번에 터뜨리지 않도록, 그날그날 짧게 말하세요.') },
        { h: '기존 관계를 깊게 하는 법', t: '2027년은 새로운 인연보다 이미 있는 관계를 깊게 하는 해로 쓰면 좋습니다. ' + (gwan >= 2 ? '관성이 ' + gwan + '개라 상대의 기대에 맞추다 지치기 쉬우니, “내가 원하는 것”을 먼저 말하는 연습이 필요합니다.' : '관성이 많지 않아 형식보다 둘만의 합의가 중요합니다.') + ' 함께하는 일을 하나 정해 1년 동안 이어가 보세요. 같은 목표를 가진 관계는 감정이 흔들려도 쉽게 끊기지 않습니다. 그리고 ' + (loveMonths.length ? loveMonths[0].m + '월' : '상반기') + '에 고마웠던 일을 한 번 말해두면, 그 말이 연말의 갈등을 막아줍니다.' },
        { h: '가족·친구와의 거리', t: '2027년에는 가까운 사람과의 거리를 다시 재는 일이 생깁니다. ' + (gwan >= 2 ? '관성이 ' + gwan + '개라 가족의 기대를 먼저 의식하는 편입니다. 그 기대가 내 결정을 대신하지 않도록, 중요한 일은 내가 먼저 정하고 알리는 순서를 지키세요.' : '관성이 많지 않아 가족의 기대에 얽매이지 않는 편입니다. 대신 무심하다는 말을 들을 수 있으니, 안부를 먼저 전하는 습관이 관계를 지킵니다.') + ' 친구 관계에서는 ' + (bigo >= 2 ? '비겁이 ' + bigo + '개라 사람이 많고, 그중 돈이 오가는 사이가 문제가 됩니다. 함께 쓰는 돈은 작게, 자주, 기록으로 남기세요.' : '넓게 사귀기보다 오래 볼 사람 몇 명에게 시간을 쓰는 편이 낫습니다.') + ' ' + (clashMonths.length ? clashMonths[0].m + '월에 가족·친구와의 약속이 틀어지기 쉬우니, 그 달의 약속은 하루 전에 확인하세요.' : '연중 큰 마찰은 적지만, 연말에 바빠지면 안부가 끊깁니다. 12월에 한 번 연락을 돌리세요.') },
        { h: '인간관계의 귀인', t: '2027년에 곁에 두면 좋은 사람은 ' + ELEM_INFO[y.elem].what + '의 기운을 가진 사람입니다. 띠로 보면 ' + ({ '목': '호랑이·토끼', '화': '뱀·말', '토': '소·용·양·개', '금': '원숭이·닭', '수': '쥐·돼지' }[y.elem]) + '띠가 편합니다. ' + (bigo >= 2 ? '비겁이 ' + bigo + '개라 사람이 많지만, 그중 내 편과 아닌 편을 가르는 기준이 필요합니다. 돈이 오가는 관계는 특히 조심하세요.' : '인간관계는 넓이보다 깊이가 맞는 사주입니다. 소수의 사람을 오래 챙길 때 기회가 돌아옵니다.') + ' 반대로 ' + y.gisin + ' 기운이 강한 사람과는 아무리 가까워도 에너지가 새니, 만나는 횟수와 시간을 조절하세요.' }
      ],
      dosa: [
        (loveMonths.length ? loveMonths.map(function (m) { return m.m + '월'; }).join('·') + '에 인연의 문이 열리네.' : '올해는 인연의 문이 크게 열리지 않네. 그럴 때는 자리를 넓히는 게 먼저일세.'),
        (clashMonths.length ? clashMonths[0].m + '월은 충이 걸려 말이 어긋나기 쉬우니, 그 달엔 중요한 대화를 피하게.' : '충이 걸리는 달은 적으니, 평소의 대화 습관이 관계를 지키네.'),
        '인연은 찾는 게 아니라 자리를 만드는 것일세. 나가게, 나가.'
      ],
      chips: ['배우자성 ' + (chart.input.gender === 'm' ? '재성' : '관성'), '인연 달 ' + (loveMonths.length ? loveMonths.map(function (m) { return m.m; }).join('·') : '없음'), '갈등 달 ' + (clashMonths.length ? clashMonths.map(function (m) { return m.m; }).join('·') : '없음'), '귀인 ' + ({ '목': '호랑이', '화': '말', '토': '용', '금': '닭', '수': '돼지' }[y.elem]) + '띠']
    });

    /* ============ 06 건강·개운 ============ */
    var EI = ELEM_INFO[y.elem], GI = ELEM_INFO[y.gisin];
    add({
      key: 'health', no: '06', title: '건강·컨디션과 2027년 개운 처방',
      tagline: '조심할 몸, 채울 기운, 피해야 할 습관',
      lead: y.elem + ' 보충 · ' + GI.body + ' 주의 · ' + EI.color + ' · ' + EI.dir,
      paras: [
        { h: '2027년 몸의 흐름', t: '2027년은 미토(未土)가 들어오는 해라 소화기와 체력이 운의 바탕이 됩니다. 이 사주에서 특히 약해지기 쉬운 자리는 ' + GI.body + '입니다. ' + (y.johuWhy === 'winter' ? '겨울에 태어나 사주가 차가우니, 찬 음식과 밤늦은 활동이 몸의 온기를 빼앗습니다. 특히 1~2월과 12월에 컨디션이 흔들립니다.' : y.johuWhy === 'summer' ? '여름에 태어나 사주가 뜨거우니, 한여름의 과로와 수면 부족이 열을 더합니다. 5~8월에 특히 조심하세요.' : '계절의 치우침이 크지 않은 사주라, 생활 리듬이 무너질 때 몸이 먼저 신호를 보냅니다.') + ' ' + (y27.ganSipsin === '편관' || y27.ganSipsin === '편재' ? '2027년은 압박과 활동량이 함께 늘어나는 해라, 무리한 일정을 몸이 버티지 못할 수 있습니다.' : '2027년은 큰 무리는 없지만, 서두르다 잠을 줄이는 습관이 문제입니다.') },
        { h: '컨디션이 흔들리는 달', t: (function () {
          var weak = months.filter(function (m) { return m.rel === 'bad'; });
          var clash = months.filter(function (m) { return m.relYear.indexOf('충') >= 0; });
          var arr = [];
          if (weak.length) arr.push(weak.map(function (m) { return m.m + '월'; }).join('·') + '은 기운이 무거운 달이라 체력이 먼저 떨어집니다');
          if (clash.length) arr.push(clash.map(function (m) { return m.m + '월'; }).join('·') + '은 충이 걸려 잠과 식사가 흐트러지기 쉽습니다');
          if (!arr.length) return '유난히 힘든 달은 없습니다. 대신 계절이 바뀌는 환절기(3월·9월)에 컨디션이 흔들리니, 그때는 일정을 조금 비워두세요.';
          return arr.join('. ') + '. 이 달에는 중요한 일정을 몰아넣지 말고, 하루 30분이라도 몸을 움직이는 시간을 먼저 확보하세요. 그리고 잠은 7시간을 기준으로 지키세요. 이 사주는 잠이 부족하면 판단력이 먼저 떨어져, 몸보다 돈이 먼저 새는 유형입니다.';
        })() },
        { h: '2027년 개운 처방', t: '이 사주의 용신은 ' + y.elem + '(' + EI.what + ') 기운입니다. 색은 ' + EI.color + ', 방향은 ' + EI.dir + ', 시간은 ' + EI.time + '입니다. 음식은 ' + EI.food + '이 좋고, 활동은 ' + EI.act + '입니다. 몸에서는 ' + EI.body + '을 살피세요. 거창하게 바꿀 필요는 없습니다. 매일 눈에 들어오는 것 하나(컵·쿠션·조명)를 이 색으로 바꾸고, 중요한 약속은 이 방향을 등지고 앉으세요. ' + EI.time + '에 몸을 쓰면 기운이 가장 잘 붙습니다.' },
        { h: '피해야 할 것', t: GI.what + ' 기운인 ' + y.gisin + '이 지나칠 때 운이 막힙니다. ' + ({ '목': '밤샘과 결정 미루기', '화': '감정적인 승부와 과한 노출', '토': '끼니 거르기와 걱정으로 밤 새우기', '금': '미룬 일을 쌓아두기와 관계의 매듭 미루기', '수': '카페인으로 밤을 버티며 생각만 쌓기' }[y.gisin]) + '가 대표적입니다. ' + (y27.ganSipsin === '겁재' ? '특히 2027년은 겁재가 들어와 사람 문제로 돈과 감정이 함께 새기 쉬우니, 보증과 공동지출을 피하세요.' : y27.ganSipsin === '상관' ? '특히 2027년은 상관이 들어와 말과 계약에서 실수가 나기 쉬우니, 서류를 두 번 확인하세요.' : '2027년에는 큰 사고보다 작은 방심이 쌓여 피로가 됩니다.') + ' 그리고 ' + GI.body + '이 약해지는 신호(피로·소화 불량·수면 변화)가 보이면 그 주에 일정을 줄이세요.' },
        { h: '계절별 몸 관리', t: '봄(2~4월)에는 ' + EI.body + '을 깨우는 가벼운 운동으로 시작하세요. 겨울에 굳은 몸을 갑자기 몰아붙이면 3월에 탈이 납니다. 여름(5~7월)에는 ' + (y.johuWhy === 'summer' ? '열을 식히는 것이 최우선입니다. 물을 자주 마시고, 한낮의 야외 일정을 줄이세요.' : '땀과 함께 기운이 새니, 짧게 자주 쉬는 편이 좋습니다.') + ' 가을(8~10월)에는 ' + (y.johuWhy === 'winter' ? '몸을 따뜻하게 유지하며 겨울을 준비하세요. 9월부터 아침 햇빛을 쬐는 습관이 겨울 컨디션을 좌우합니다.' : '정리와 결단의 계절이라 일이 몰립니다. 잠을 줄이지 않는 것이 유일한 규칙입니다.') + ' 겨울(11~1월)에는 ' + EI.food + ' 쪽으로 먹고, ' + EI.time + '에 몸을 쓰는 습관을 지키세요. 이 사주는 계절의 기운을 크게 타므로, 계절마다 관리법을 바꾸는 것이 한 가지 방법을 계속 미는 것보다 효과적입니다.' },
        { h: '오늘부터 할 세 가지', t: '첫째, ' + EI.time + '에 맞춰 ' + EI.act + '을 하루 하나씩 하세요. 둘째, 한 달에 한 번은 ' + (moneyMonths.length ? moneyMonths[0].m + '월' : '연말') + '에 장부와 일정을 함께 점검하세요. 셋째, ' + y.gisin + ' 기운이 강해지는 자리(사람·장소·습관)를 하나씩 줄이세요. 세 가지 모두 크게 보이지 않지만, 2027년의 운은 큰 결심보다 매일의 작은 반복에서 바뀝니다. 한 달만 지켜도 판단의 속도와 몸의 온도가 달라집니다.' }
      ],
      dosa: [
        '2027년은 미토의 해라 소화기와 체력이 바탕일세. ' + GI.body + '을 먼저 살피게.',
        '약은 ' + y.elem + ' 기운이라네. ' + EI.color + ', ' + EI.dir + ', ' + EI.food + '. 매일 하나면 충분하네.',
        '잠을 줄여서 버는 건 결국 몸으로 갚게 되어 있네. 허허.'
      ],
      chips: ['용신 ' + y.elem, EI.color, EI.dir, '주의 ' + GI.body, '기신 ' + y.gisin]
    });

    /* ---- 글자수 ---- */
    sections.forEach(function (s) {
      s.chars = s.paras.reduce(function (n, p) { return n + p.t.replace(/\s/g, '').length; }, 0);
    });
    var total = sections.reduce(function (n, s) { return n + s.chars; }, 0);
    var byKey = {};
    sections.forEach(function (s) { byKey[s.key] = s; });

    var talk = [
      { key: 'chong', label: '총평', text: '2027년은 정미년, 작은 불이 흙을 데우는 해일세. ' + nm + ' 일간 기준으로 ' + y27.ganSipsin + ' 운이 들어오고, 흐름 지수는 ' + idx + '점이라네. ' + (idx >= 80 ? '올해보다 힘이 실리는 해니, 미뤄둔 일을 꺼내게.' : idx >= 65 ? '무난하게 쓸 수 있는 해니, 하나만 골라 밀어붙이게.' : '욕심을 줄이고 정비에 쓰는 해일세. 지키는 것도 실력이네.') },
      { key: 'first', label: '상반기', text: '상반기는 1~6월, 그중에서도 입춘(2월 4일)을 지나며 판이 바뀝니다. ' + (goodMonths.filter(function (m) { return m.m >= 2 && m.m <= 6; }).length ? goodMonths.filter(function (m) { return m.m >= 2 && m.m <= 6; }).map(function (m) { return m.m + '월'; }).join('·') + '에 힘이 실리니 미뤄둔 일을 그때 꺼내게. ' : '상반기에 유난히 힘이 실리는 달은 없네. 그래서 더더욱 하던 일을 놓지 않는 게 중요하네. ') + '1~3월은 준비, 4~6월은 실행일세.' },
      { key: 'second', label: '하반기', text: '하반기는 7~12월, 상반기에 벌인 일의 결과가 드러나는 때일세. ' + (clashMonths.filter(function (m) { return m.m >= 7; }).length ? clashMonths.filter(function (m) { return m.m >= 7; }).map(function (m) { return m.m + '월'; }).join('·') + '에 충이 걸리니 그 달엔 큰 결정을 피하게. ' : '') + '입추(8월 7일)에 결과를 확인하고, 입동(11월 7일)부터는 정리와 결산일세.' },
      { key: 'money', label: '재물', text: sections[3].dosa[0] + ' ' + sections[3].dosa[1] },
      { key: 'love', label: '연애·관계', text: sections[4].dosa[0] + ' ' + sections[4].dosa[2] },
      { key: 'health', label: '건강·개운', text: sections[5].dosa[0] + ' ' + sections[5].dosa[1] }
    ];

    return {
      index: idx, talk: talk, sections: sections, byKey: byKey,
      totalChars: total, months: months,
      moneyMonths: moneyMonths, spendMonths: spendMonths,
      loveMonths: loveMonths, clashMonths: clashMonths,
      goodMonths: goodMonths
    };
  };

  global.Year2027 = Y;
  if (typeof module !== 'undefined' && module.exports) module.exports = Y;
})(typeof window !== 'undefined' ? window : globalThis);
