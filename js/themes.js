/* ============================================================
   운세도사 · 테마 피드 데이터 (themes.js)
   - 홈 피드의 카테고리 칩과 테마 사주 카드
   - 테마별 결과 화면의 초점(심층 리포트 항목 순서)과 도사 첫마디
   ============================================================ */
(function (global) {
  'use strict';

  var CATS = [
    { key: 'all', label: '전체' },
    { key: 'jeontong', label: '정통·총운', title: '내 인생의 큰 줄기부터', sub: '여덟 글자가 말하는 내 자리' },
    { key: 'love', label: '연애·솔로', title: '내 연애는 언제 찾아올까?', sub: '인연의 시기와 상대의 결' },
    { key: 'money', label: '재물·직업', title: '돈도 일도, 언제쯤 풀릴까?', sub: '벌이의 그릇과 일의 방향' },
    { key: 'packpok', label: '팩폭·성격', title: '듣기 싫은데 맞는 말', sub: '겉과 속, 반복하는 습관까지' },
    { key: 'newyear', label: '신년·궁합', title: '2027 정미년, 내게 오는 기운', sub: '해마다 바뀌는 판과 두 사람의 케미' }
  ];

  var THEMES = [
    /* ---------- 정통·총운 ---------- */
    {
      key: 'jeontong-total', cat: 'jeontong', badge: 'BEST', tone: 'gold', glyph: '命', featured: 1,
      name: '정통사주 총평', hook: '여덟 글자에\n다 적혀 있다',
      sub: '일주 · 신강신약 · 용신 · 인생 키워드',
      quote: '사주는 정해진 운명이 아니라 타고난 재료일 뿐일세.',
      focus: ['summary', 'personality', 'money', 'job', 'love', 'daeun', 'remedy']
    },
    {
      key: 'jeontong-ilju', cat: 'jeontong', tone: 'gold', glyph: '柱', featured: 1,
      name: '60갑자 일주 풀이', hook: '나는 어떤\n일주인가',
      sub: '일간 성격 · 일지 기질 · 관계 습관',
      quote: '같은 날 태어나도 시각 하나로 글자가 달라지네.',
      focus: ['summary', 'personality', 'love']
    },
    {
      key: 'jeontong-strength', cat: 'jeontong', tone: 'gold', glyph: '强弱',
      name: '신강·신약 진단', hook: '내 사주는 센 편일까,\n여린 편일까',
      sub: '세력 계산 · 용신 · 기신',
      quote: '기운이 세면 밀어붙이고, 여리면 곁을 살피는 법이지.',
      focus: ['personality', 'remedy', 'summary']
    },
    {
      key: 'jeontong-remedy', cat: 'jeontong', badge: '추천', tone: 'gold', glyph: '運',
      name: '개운법', hook: '부족한 기운을\n채우는 법',
      sub: '색 · 방향 · 음식 · 매일의 습관',
      quote: '운은 큰 결심이 아니라 매일의 작은 반복에서 바뀌네.',
      focus: ['remedy', 'summary']
    },

    /* ---------- 연애·솔로 ---------- */
    {
      key: 'love-main', cat: 'love', badge: '인기', tone: 'rose', glyph: '緣', featured: 1,
      name: '연애운 사주', hook: '내 연애는\n언제, 누구에게로',
      sub: '연애 패턴 · 만남 시기 · 상대의 기운',
      quote: '인연은 찾는 게 아니라 자리를 만드는 것일세.',
      focus: ['love', 'daeun', 'summary']
    },
    {
      key: 'love-spouse', cat: 'love', badge: 'BEST', tone: 'rose', glyph: '配', featured: 1,
      name: '배우자상 사주', hook: '결혼할 사람,\n사주에 있을까',
      sub: '배우자 자리 · 잘 맞는 띠 · 인연의 시기',
      quote: '배우자 자리는 일지에 있네. 하루를 함께 보내는 자리지.',
      focus: ['love', 'summary', 'daeun']
    },
    {
      key: 'love-som', cat: 'love', tone: 'rose', glyph: '戀',
      name: '썸·짝사랑 궁합', hook: '그 사람 마음이\n궁금할 때',
      sub: '상대 성향 · 다가갈 타이밍 · 둘의 케미',
      quote: '마음은 소리가 없어도 글자에는 남는다네.',
      focus: ['love', 'personality']
    },
    {
      key: 'love-reunion', cat: 'love', tone: 'rose', glyph: '返',
      name: '이별·재회 사주', hook: '헤어진 인연,\n다시 이어질까',
      sub: '이별의 원인 · 남은 인연 · 새로 오는 사람',
      quote: '끝난 인연도 사주에 자리가 남아 있게 마련이지.',
      focus: ['love', 'daeun']
    },

    /* ---------- 재물·직업 ---------- */
    {
      key: 'money-main', cat: 'money', badge: 'BEST', tone: 'jade', glyph: '財', featured: 1,
      name: '재물운 사주', hook: '돈이 들어오는 통로와\n새는 구멍',
      sub: '재성 개수 · 재물 그릇 · 투자 성향',
      quote: '벌기 전에 막는 법부터 배우게. 그게 순서일세.',
      focus: ['money', 'daeun', 'summary']
    },
    {
      key: 'money-job', cat: 'money', badge: '인기', tone: 'jade', glyph: '職', featured: 1,
      name: '직업·적성 사주', hook: '내가 잘할 수\n있는 일',
      sub: '적성 5종 · 조직형과 독립형 · 성공 환경',
      quote: '직함보다 하루를 무엇으로 쓰는지가 먼저라네.',
      focus: ['job', 'personality', 'summary']
    },
    {
      key: 'money-move', cat: 'money', tone: 'jade', glyph: '轉',
      name: '이직·커리어 타이밍', hook: '지금 움직여도\n될까',
      sub: '대운 흐름 · 유리한 환경 · 피할 자리',
      quote: '때를 아는 사람은 서두르지 않아도 앞서 가지.',
      focus: ['job', 'daeun']
    },
    {
      key: 'money-side', cat: 'money', tone: 'jade', glyph: '業',
      name: '부업·사업운', hook: '혼자 벌어도\n될 사주인가',
      sub: '독립 성향 · 돈 관리 · 동업 주의',
      quote: '관성 없는 사주는 남 밑에 오래 있기 답답한 법이지.',
      focus: ['job', 'money', 'summary']
    },

    /* ---------- 팩폭·성격 ---------- */
    {
      key: 'packpok-main', cat: 'packpok', badge: 'BEST', tone: 'violet', glyph: '毒', featured: 1,
      name: '팩폭 사주', hook: '듣기 싫은데\n맞는 말',
      sub: '겉과 속 · 반복하는 실수 · 고칠 약점',
      quote: '성격을 고치라는 게 아니라, 피하는 지혜를 배우라는 뜻일세.',
      focus: ['personality', 'love', 'summary']
    },
    {
      key: 'packpok-weapon', cat: 'packpok', tone: 'violet', glyph: '性',
      name: '성격 심층 분석', hook: '타고난 무기와\n급소',
      sub: '무기 · 스트레스 패턴 · 판단 방식',
      quote: '무기는 만드는 게 아니라 이미 손에 있는 도구라네.',
      focus: ['personality', 'summary']
    },
    {
      key: 'packpok-relation', cat: 'packpok', tone: 'violet', glyph: '人',
      name: '인간관계 패턴', hook: '왜 가까운 사람에게\n상처를 줄까',
      sub: '일지 기질 · 갈등 포인트 · 귀인',
      quote: '가까운 사이일수록 말의 온도를 먼저 살피게.',
      focus: ['love', 'personality']
    },

    /* ---------- 신년·궁합 ---------- */
    {
      key: 'newyear-main', cat: 'newyear', badge: 'BEST', tone: 'ember', glyph: '未', featured: 1,
      name: '2027 정미년 신년운세', hook: '붉은 양의 해,\n내게 오는 기운',
      sub: '세운 십신 · 상·하반기 · 계절별 흐름',
      quote: '2027년은 정미년, 붉은 양의 기운이 들어오는 해라네.',
      focus: ['daeun', 'summary', 'money']
    },
    {
      key: 'newyear-daeun', cat: 'newyear', tone: 'ember', glyph: '大',
      name: '10년 대운 흐름', hook: '10년마다 바뀌는\n내 판',
      sub: '현재 대운 · 다음 대운 · 준비할 시점',
      quote: '10년마다 판이 바뀌니 지금 안 풀린다고 조급해할 것 없네.',
      focus: ['daeun', 'job', 'summary']
    },
    {
      key: 'newyear-compat', cat: 'newyear', tone: 'sky', glyph: '合', href: 'compatibility.html',
      name: '궁합 사주', hook: '우리 둘,\n몇 점일까',
      sub: '일간·일지 관계 · 오행 보완도 · 갈등 지점',
      quote: '두 글자를 마주 보게 하면 맞고 어긋나는 자리가 보이네.',
      focus: []
    }
  ];

  var ORDER = THEMES.map(function (t) { return t.key; });
  var MAP = {};
  THEMES.forEach(function (t) { MAP[t.key] = t; CATS.forEach(function (c) { if (c.key === t.cat) t.catLabel = c.label; }); });

  function catOf(key) {
    for (var i = 0; i < CATS.length; i++) if (CATS[i].key === key) return CATS[i];
    return CATS[0];
  }

  /* ---------- 테마별 도사 첫마디 (사주 값으로 채운다) ---------- */
  function intro(theme, chart) {
    var F = global.Fortune;
    var g = F.GAN[chart.dayMaster.gan];
    var j = F.JI[chart.pillars.day.ji];
    var y27 = chart.years[1];
    var d = chart.daeun.current;
    var jae = (chart.sipsinCount['정재'] || 0) + (chart.sipsinCount['편재'] || 0);
    var name = chart.input.name ? chart.input.name + '님' : '자네';
    var ilju = chart.dayMaster.ilju;

    switch (theme.key) {
      case 'jeontong-total':
        return '어서 오게, ' + name + '. ' + ilju + '(' + chart.dayMaster.iljuHanja + ') 일주에 ' + josa(g.short, '이', '가') + ' 중심일세. 여덟 글자를 세어보니 ' + chart.strength + ' 쪽으로 기우네. 큰 줄기부터 차근히 짚어주지.';
      case 'jeontong-ilju':
        return ilju + ' 일주라. 겉으로는 ' + g.short + ', 속으로는 ' + j.keyword + '의 기운이 도는 사람이지. 이 두 결이 어떻게 부딪히고 맞물리는지가 인생의 리듬을 만드네.';
      case 'jeontong-strength':
        return '이 사주는 ' + chart.strength + '일세. ' + (chart.strength === '신강' ? '기운이 세니 밀고 나가는 힘은 좋은데, 그 힘이 사람을 밀어내지 않게 해야 하네.' : chart.strength === '신약' ? '기운이 여린 대신 주변의 도움을 잘 받는 사주라네. 누구를 곁에 두느냐가 곧 운이지.' : '기운이 고르게 잡혀 어디서든 적응하네. 다만 스스로 기준을 세우지 않으면 남의 판에 끌려다니지.') + ' 약은 ' + chart.yongsin.elem + ' 기운이라네.';
      case 'jeontong-remedy':
        return '이 사주에 약은 ' + chart.yongsin.elem + ' 기운일세. 넘치는 ' + chart.maxElem + '은 덜어내고 모자란 ' + chart.minElem + '은 채우게. 거창할 것 없네, 매일 하나면 충분하네.';
      case 'love-main':
        return name + ', 연애 자리부터 보세. 일지 ' + josa(j.name, '이', '가') + ' 배우자 자리라네. ' + j.relation + ' 인연의 문이 열리는 때는 ' + (chart.input.gender === 'm' ? '재성' : '관성') + '이 들어오는 해일세.';
      case 'love-spouse':
        return '배우자 자리인 일지 ' + josa(j.name, '이', '가') + ' ' + j.keyword + '의 결일세. 여기에 ' + chart.yongsin.elem + ' 기운을 가진 사람이 곁에 오면 생활이 편안해지지. 언제, 어떤 결의 사람인지 풀어주겠네.';
      case 'love-som':
        return '마음이 가는 사람이 있나 보군. ' + josa(j.name, '과', '와') + ' 잘 맞는 상대, 피해야 할 결이 따로 있네. 조급해하지 말고 그 사람의 글자부터 보게.';
      case 'love-reunion':
        return '끝난 인연을 다시 보려는 게군. 이별은 사주에 흔적을 남기네. 남은 인연이 있는지, 새 인연이 먼저 오는지 차근히 짚어주지.';
      case 'money-main':
        return name + ', 돈 이야기부터 하세. 재성(財星)이 ' + jae + '개라네. ' + (jae === 0 ? '원국에 드러나지 않으니 버는 힘보다 관리하는 시스템에서 돈이 모이는 사주일세.' : jae >= 3 ? '많이 들어오는 만큼 새는 자리도 많으니, 어디에 둘지를 정하는 눈이 재물의 크기를 가르네.' : '한두 개의 확실한 수입원을 깊게 파는 쪽이 맞는 사주일세.') + ' 유리한 기운은 ' + chart.yongsin.elem + '이라네.';
      case 'money-job':
        var jobWords = String(g.job || '').split('·').slice(0, 2).join(', ');
        return '일은 ' + jobWords + ' 쪽으로 가닥을 잡게. 어디서 힘이 붙고 어디서 지치는지까지 짚어주지.';
      case 'money-move':
        return '지금 ' + (d ? d.ganzi + ' 대운(' + d.startAge + '~' + d.endAge + '세), ' + d.ganSipsin + '의 흐름' : '아직 대운이 열리기 전') + '일세. 2027 ' + y27.ganzi + '년은 ' + y27.ganSipsin + ' 운이니, 움직일 때와 버틸 때를 나눠 보게.';
      case 'money-side':
        var gwanCnt = (chart.sipsinCount['정관'] || 0) + (chart.sipsinCount['편관'] || 0);
        return '혼자 벌어볼 생각인가. ' + (gwanCnt === 0
          ? '이 사주는 관성이 드러나지 않아 남 밑에 오래 있기 답답한 사주라네. 대신 동업과 돈 관리에서 새는 구멍을 조심해야 하지.'
          : '관성이 ' + gwanCnt + '개 있어 조직에서 실력을 쌓은 뒤 움직이는 순서가 안전하네.');
      case 'packpok-main':
        return name + ', 팩폭이라 했으니 미리 마음의 준비를 하게. 겉은 ' + g.short + ', 속은 ' + j.keyword + '일세. 사람들이 모르는 그 속을 내가 말해주지.';
      case 'packpok-weapon':
        return '무기는 ' + g.strength + '일세. 이건 억지로 만드는 게 아니라 이미 손에 있는 도구라, 쓸 줄만 알면 되네. 급소도 함께 알려주지.';
      case 'packpok-relation':
        return '일지 ' + josa(j.name, '이', '가') + ' 관계의 자리일세. 이 사주는 ' + j.caution + ' 가까운 사람에게 특히 그 결이 나오지.';
      case 'newyear-main':
        return '2027년은 정미(丁未)년, 붉은 양의 해일세. 자네 일간 기준으로 ' + y27.ganSipsin + '(' + F.SIPSIN[y27.ganSipsin].hanja + ') 운이 들어오네. ' + F.YEAR2027[y27.ganSipsin] + ' 상·하반기를 나눠 짚어주지.';
      case 'newyear-daeun':
        return (d ? '지금은 ' + d.ganzi + '(' + d.hanja + ') 대운의 ' + chart.daeun.yearsIntoDaeun + '년째일세. ' : '아직 대운이 열리기 전일세. ') + '10년마다 판이 바뀌니, 다음 판을 언제 준비할지 함께 보세.';
      case 'newyear-compat':
        return '두 사람의 글자를 마주 보게 하면, 무엇이 맞고 무엇이 어긋나는지 보이네.';
      default:
        return '어서 오게. 생년월일만 알려주면 내가 여덟 글자를 풀어주지.';
    }
  }

  function josa(word, withJong, withoutJong) {
    var t = String(word || ''), c = 0;
    for (var i = t.length - 1; i >= 0; i--) {
      c = t.charCodeAt(i);
      if (c >= 0xAC00 && c <= 0xD7A3) return t + ((c - 0xAC00) % 28 !== 0 ? withJong : withoutJong);
    }
    return t + withoutJong;
  }

  global.Themes = {
    cats: CATS,
    list: THEMES,
    order: ORDER,
    map: MAP,
    catOf: catOf,
    intro: intro
  };
})(window);
