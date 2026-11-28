/* ============================================================
   운세도사 · 웹툰 한 컷 스테이지 (story.js)
   - 세로형 컷 프레임 안에 캐릭터와 만화 말풍선이 함께 산다
   - 컷마다 카메라(샷·좌우·배경 톤)와 말풍선 꼬리 방향이 바뀐다
   - 진행 배지(3 / 12), 진행 바, 키워드 칩, 사용자 선택지, 전체 리포트
   ============================================================ */
(function (global) {
  'use strict';

  var doc = document;

  var CASTS = {
    doryeong: {
      name: '도사 도령', role: '정통사주 · 총운',
      face: 'assets/char-doryeong-face.webp?v=2', body: 'assets/char-doryeong.webp?v=2',
      alt: '부채를 든 꽃미남 도령'
    },
    seonnyeo: {
      name: '선녀 도사', role: '궁합 · 인연',
      face: 'assets/char-seonnyeo-face.webp?v=2', body: 'assets/char-seonnyeo.webp?v=2',
      alt: '우아한 선녀 도사'
    },
    chic: {
      name: '시크 역술가', role: '2027 정미년',
      face: 'assets/char-chic-face.webp?v=2', body: 'assets/char-chic.webp?v=2',
      alt: '시크한 역술가'
    }
  };

  /* ---------- 작은 도우미 ---------- */
  function esc(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function clean(text) {
    return String(text || '').replace(/\s+/g, ' ').trim();
  }
  /* 마지막 한글 글자의 받침 여부 (한자가 섞여 있으면 한글 음까지 거슬러 올라간다) */
  function hasJong(word) {
    var t = String(word || ''), c = 0;
    for (var i = t.length - 1; i >= 0; i--) {
      c = t.charCodeAt(i);
      if (c >= 0xAC00 && c <= 0xD7A3) return (c - 0xAC00) % 28 !== 0;
    }
    return false;
  }
  function iga(word) { return String(word || '') + (hasJong(word) ? '이' : '가'); }
  function eul(word) { return String(word || '') + (hasJong(word) ? '을' : '를'); }
  function wa(word) { return String(word || '') + (hasJong(word) ? '과' : '와'); }
  function neun(word) { return String(word || '') + (hasJong(word) ? '은' : '는'); }
  function ira(word) { return String(word || '') + (hasJong(word) ? '이라네' : '라네'); }

  /* **강조** 표시를 말풍선 마크업으로 */
  function bubbleHTML(line) {
    var out = esc(line);
    out = out.replace(/\*\*(.+?)\*\*/g, '<em>$1</em>');
    /* '목·화·토' 같은 낱말이 줄바꿈에서 쪼개지지 않게 묶는다 */
    out = out.replace(/([가-힣A-Za-z0-9]+(?:·[가-힣A-Za-z0-9]+)+)/g, '<span class="nb">$1</span>');
    return out;
  }
  /* 한 문장 안의 낱말을 강조한다 (없으면 그대로) */
  function mark(line, words) {
    var out = String(line || '');
    (words || []).forEach(function (w) {
      if (!w) return;
      if (out.indexOf('**' + w + '**') >= 0) return;
      var i = out.indexOf(w);
      if (i < 0) return;
      out = out.slice(0, i) + '**' + w + '**' + out.slice(i + w.length);
    });
    return out;
  }
  /* 문장들을 말풍선 두 개에 나눠 담는다. 넘치는 문장은 과감히 버린다(전문은 리포트에 있다) */
  function packBubbles(lines, maxLen) {
    var max = maxLen || 52, out = [], cur = '';
    for (var i = 0; i < (lines || []).length && out.length < 2; i++) {
      var t = clean(lines[i]);
      if (!t) continue;
      var cand = cur ? cur + ' ' + t : t;
      if (cand.length <= max) { cur = cand; continue; }
      if (cur) out.push(cur);
      cur = '';
      if (out.length >= 2) break;
      if (t.length <= max) cur = t;
      else out.push(t);
    }
    if (cur && out.length < 2) out.push(cur);
    return out;
  }
  /* 한 문장이 말풍선보다 길면 문장 → 쉼표 → 띄어쓰기 순서로 끊는다 */
  function chunk(text, max) {
    var out = [];
    sentences(text).forEach(function (s) {
      var t = s;
      while (t.length > max) {
        var cut = -1, lo = Math.floor(max * 0.55), i;
        for (i = max; i >= lo; i--) {
          var c = t.charAt(i);
          if (c === ',' || c === '·' || c === '.' || c === '!' || c === '?') { cut = i + 1; break; }
        }
        if (cut < 0) for (i = max; i >= lo; i--) {
          if (t.charAt(i) === ' ') { cut = i; break; }
        }
        if (cut < 0) cut = max;
        out.push(t.slice(0, cut).trim());
        t = t.slice(cut).trim();
      }
      if (t) out.push(t);
    });
    return out;
  }
  /* 여러 문장을 말풍선 두 개에 담는다. 넘치는 꼬리는 버린다(전문은 리포트에 있다) */
  function pack(parts, max) {
    var src = [], out = [], cur = '';
    (parts || []).forEach(function (p) {
      chunk(p, max).forEach(function (c) { if (c) src.push(c); });
    });
    for (var i = 0; i < src.length && out.length < 2; i++) {
      var t = src[i];
      var cand = cur ? cur + ' ' + t : t;
      if (cand.length <= max) { cur = cand; continue; }
      if (cur) { out.push(cur); cur = ''; }
      if (out.length >= 2) break;
      cur = t;
    }
    if (cur && out.length < 2) out.push(cur);
    return out.length ? out : [''];
  }
  /* 두 마디 말풍선 + 골드 강조 */
  function bub(parts, marks) {
    return pack(parts, 46).map(function (t) { return mark(t, marks); });
  }
  /* 마침표 기준으로 문장 나누기 (구형 사파리에서도 도는 단순 구현) */
  function sentences(text) {
    var t = clean(text), out = [], cur = '';
    for (var i = 0; i < t.length; i++) {
      cur += t.charAt(i);
      var c = t.charAt(i);
      if ((c === '.' || c === '!' || c === '?') && (i === t.length - 1 || t.charAt(i + 1) === ' ')) {
        if (cur.trim()) out.push(cur.trim());
        cur = '';
      }
    }
    if (cur.trim()) out.push(cur.trim());
    return out.length ? out : [t];
  }

  /* ---------- 대화 대본 만들기 : 메인 사주 ---------- */
  var ASK_LABEL = {
    summary: '전체 운세부터 들을래',
    personality: '내 성격 좀 더 알려줘',
    elem: '오행은 어떻게 돼?',
    money: '내 재물운부터 물어볼래',
    job: '직업은 뭐가 맞아?',
    love: '연애운도 궁금해',
    daeun: '대운 흐름도 알려줘',
    year2027: '2027년은 어때?',
    remedy: '개운법도 알려줘'
  };

  function indexBeats(chart, themeKey) {
    var F = global.Fortune, T = global.Themes;
    var deep = F.deep(chart);
    var g = F.GAN[chart.dayMaster.gan];
    var m = F.mascotLines(chart);
    var theme = themeKey && T && T.map[themeKey] ? T.map[themeKey] : null;
    var y27 = chart.years[1];
    var P = chart.pillars;
    var who = chart.input.name ? chart.input.name + '님' : '자네';
    var ilju = chart.dayMaster.ilju + (chart.dayMaster.iljuHanja ? '(' + chart.dayMaster.iljuHanja + ')' : '');
    function sec(k) { return deep.byKey[k] || { dosa: [], chips: [] }; }
    function dosa(k) { return (sec(k).dosa || []).slice(); }

    /* 오행 균형 한 줄 (도사의 하게체) */
    var el5 = ['목', '화', '토', '금', '수'];
    var maxV = chart.elements[chart.maxElem], minV = chart.elements[chart.minElem];
    var maxNames = el5.filter(function (e) { return chart.elements[e] === maxV; });
    var minNames = el5.filter(function (e) { return chart.elements[e] === minV; });
    var elemLine = maxV === minV
      ? '오행이 다섯 가지로 고르게 섞여 있구만. 어디 하나 치우치지 않은 드문 사주일세.'
      : '오행을 보니 ' + maxNames.join('·') + '가 가장 많고 ' + minNames.join('·') + '가 가장 적네. ' +
        (maxV - minV >= 2 ? '넘치는 건 나눠 쓰고, 모자란 건 채워주면 되는 법이지.'
          : '크게 기울진 않았으니 균형을 지키며 가면 되겠어.');

    /* 2027 세운 한 줄 */
    var y27line1 = '2027년은 **정미(丁未)**년, **' + y27.ganSipsin + '** 운이 들어오는 해일세.';
    var y27line2 = (y27.ganSipsin === '정관' || y27.ganSipsin === '편관' ? '이름과 자리가 오르는 해니 준비한 것을 내놓게.'
      : y27.ganSipsin === '정재' || y27.ganSipsin === '편재' ? '돈의 물길이 트이니 둑부터 쌓게.'
        : '벌이기보다 다지기에 좋은 해일세.') + ' 지지 **' + y27.jiSipsin + '** 기운도 함께 오네.';

    /* 테마 인사 한 줄 */
    var themeLine = theme ? '오늘은 ‘' + theme.name + '’ 이야기부터 풀어줄세.' : '궁금한 데부터 물어도 좋네.';

    var beats = [
      {
        id: 'hello', shot: 'mid', face: 'l', mood: 'night',
        chips: [chart.dayMaster.ilju + ' 일주', chart.dayMaster.animal + '띠', chart.strength],
        lines: [
          mark('어서 오게, ' + who + '. 여덟 글자를 세어보니 **' + ilju + '** 일주로구만.', []),
          '**' + g.short + '** 기운을 타고났네. ' + themeLine
        ]
      },
      {
        id: 'pillars', shot: 'sky', face: 'r', mood: 'indigo',
        chips: [P.year.hangul, P.month.hangul, P.day.hangul].concat(P.hour ? [P.hour.hangul] : []),
        lines: [
          '년주 **' + P.year.hangul + '**, 월주 **' + P.month.hangul + '**, 일주 **' + P.day.hangul + '**' +
            (P.hour ? ', 시주 **' + P.hour.hangul + '**' : '') + ' — 여덟 글자가 이렇게 섰네.',
          '가운데 ' + iga(g.name) + ' ' + who + ' 중심일세. 띠는 **' + chart.dayMaster.animal + '띠**고.' +
            (P.hour ? '' : ' 시각을 몰라 시주는 비워두고 여섯 글자로 보네.')
        ]
      },
      {
        id: 'summary', shot: 'mid', face: 'l', mood: 'dawn',
        chips: sec('summary').chips.slice(0, 4),
        lines: packBubbles(sentences(dosa('summary').join(' ')), 44)
          .map(function (t) { return mark(t, [g.short, '도움', '금 기운']); })
      },
      {
        id: 'personality', shot: 'close', face: 'r', mood: 'violet',
        chips: sec('personality').chips.slice(0, 4),
        lines: packBubbles(sentences(dosa('personality').join(' ')), 44)
          .map(function (t) { return mark(t, ['겉모습', '상상', '무기']); })
      },
      {
        id: 'elem', shot: 'sky', face: 'l', mood: 'jade',
        chips: ['목 ' + chart.elements['목'], '화 ' + chart.elements['화'], '토 ' + chart.elements['토'],
          '금 ' + chart.elements['금'], '수 ' + chart.elements['수']],
        lines: [
          mark(sentences(elemLine)[0] || elemLine, [maxNames.join('·'), minNames.join('·')]),
          '모자란 ' + chart.minElem + ' 기운은 매일 하나씩 채우면 되네. 채우는 법은 개운법에서 짚어주지.'
        ]
      },
      {
        id: 'money', shot: 'mid', face: 'r', mood: 'gold',
        chips: sec('money').chips.slice(0, 4),
        lines: packBubbles(sentences(dosa('money').join(' ')), 44)
          .map(function (t) { return mark(t, ['반반', '새는 지출', '구멍']); })
      },
      {
        id: 'job', shot: 'close', face: 'l', mood: 'crimson',
        chips: sec('job').chips.slice(0, 4),
        lines: packBubbles(sentences(dosa('job').join(' ')), 44)
          .map(function (t) { return mark(t, [sec('job').chips[0], '무기']); })
      },
      {
        id: 'love', shot: 'mid', face: 'r', mood: 'rose',
        chips: sec('love').chips.slice(0, 4),
        lines: packBubbles(sentences(dosa('love').join(' ')), 44)
          .map(function (t) { return mark(t, ['배우자 자리', '예의', sec('love').chips[1]]); })
      },
      {
        id: 'daeun', shot: 'sky', face: 'l', mood: 'blue',
        chips: sec('daeun').chips.slice(0, 4),
        lines: packBubbles(sentences(dosa('daeun').join(' ')), 44)
          .map(function (t) { return mark(t, ['역행', sec('daeun').chips[1], '상관']); })
      },
      {
        id: 'year2027', shot: 'close', face: 'r', mood: 'night',
        chips: ['2027 ' + y27.ganzi, y27.ganSipsin + ' 운', y27.jiSipsin + ' 운', '용신 ' + chart.yongsin.elem],
        lines: [y27line1, y27line2]
      },
      {
        id: 'remedy', shot: 'mid', face: 'l', mood: 'sand',
        chips: sec('remedy').chips.slice(0, 4),
        lines: packBubbles(sentences(dosa('remedy').join(' ')), 44)
          .map(function (t) { return mark(t, ['금 기운', '흰색·은색', '매일 하나']); })
      },
      {
        id: 'closing', shot: 'sky', face: 'r', mood: 'dawn',
        chips: ['심층 리포트 ' + deep.totalChars.toLocaleString('ko-KR') + '자',
          '읽는 시간 약 ' + Math.max(1, Math.round(deep.totalChars / 480)) + '분'],
        lines: [
          mark(sentences(m.closing)[0] || m.closing, ['타고난 재료']),
          '재료를 어떻게 쓰느냐는 ' + who + '의 몫이야. 더 깊은 풀이는 아래 **전체 리포트**에 있네.'
        ],
        actions: [
          { label: '결과 카드로 저장할래', run: 'card' },
          { label: '친구한테 공유할래', run: 'share' },
          { label: '다른 테마도 들어볼래', run: 'theme' }
        ]
      }
    ];

    /* 테마별 초점 순서에 맞춰 중간 이야기 순서를 바꾼다 */
    var fixedHead = ['hello', 'pillars'];
    var middle = ['summary', 'personality', 'elem', 'money', 'job', 'love', 'daeun', 'year2027', 'remedy'];
    if (theme && theme.focus && theme.focus.length) {
      var first = [], rest = [];
      theme.focus.forEach(function (k) {
        if (middle.indexOf(k) >= 0 && first.indexOf(k) < 0) first.push(k);
      });
      middle.forEach(function (k) { if (first.indexOf(k) < 0) rest.push(k); });
      middle = first.concat(rest);
    }
    var orderIds = fixedHead.concat(middle).concat(['closing']);
    var byId = {};
    beats.forEach(function (b) { byId[b.id] = b; });
    var ordered = orderIds.map(function (id) { return byId[id]; });

    /* 선택지에 쓸 사용자 말투 */
    ordered.forEach(function (b) {
      if (ASK_LABEL[b.id]) b.ask = ASK_LABEL[b.id];
    });

    return { cast: 'doryeong', beats: ordered };
  }

  /* ---------- 대화 대본 만들기 : 궁합 ---------- */
  var SAENG = { '목': '화', '화': '토', '토': '금', '금': '수', '수': '목' };
  var GEUK = { '목': '토', '화': '금', '토': '수', '금': '목', '수': '화' };

  function ganRel(a, b) {
    var ea = a.dayMaster.elem, eb = b.dayMaster.elem;
    if (Math.abs(a.dayMaster.gan - b.dayMaster.gan) === 5) return 'hap';
    if (ea === eb) return 'same';
    if (SAENG[ea] === eb) return 'saeng_ab';
    if (SAENG[eb] === ea) return 'saeng_ba';
    if (GEUK[ea] === eb) return 'geuk_ab';
    return 'geuk_ba';
  }

  var COMPAT_ASK = {
    score: '궁합 점수가 궁금해',
    spark: '어디서 끌렸는지',
    heart: '속마음이 궁금해',
    balance: '채워주는 기운은?',
    life: '같이 살면 어떨까',
    clash: '갈등 피하는 법은?',
    keep: '오래 가는 비결은?',
    year2027: '2027 둘의 흐름은?'
  };

  function compatBeats(a, b, r) {
    var F = global.Fortune;
    if (!F || !r || !a || !b) return null;
    var ga = F.GAN[a.dayMaster.gan], gb = F.GAN[b.dayMaster.gan];
    var Ji = F.JI;
    var ja = a.pillars.day.ji, jb = b.pillars.day.ji;
    var nmA = a.input.name || '첫 번째 분';
    var nmB = b.input.name || '두 번째 분';
    var ilA = a.dayMaster.ilju, ilB = b.dayMaster.ilju;
    var yA = a.years[1], yB = b.years[1];
    var secs = r.byKey || {};
    function dosa(k, i) { var s = secs[k] && secs[k].dosa; return s && s[i] ? s[i] : ''; }
    function chips(k) { return ((secs[k] && secs[k].chips) || []).slice(0, 4); }
    var gs = r.gauges || [];
    var rel = ganRel(a, b);
    var reads = Math.max(1, Math.round((r.totalChars || 0) / 480));
    var relLine = {
      hap: '설명하기 어려운 끌림이 먼저 오지. 처음인데도 오래 안 사람처럼 말이 이어지네.',
      same: '거울을 보는 셈일세. 편한 만큼 같은 곳에서 같이 넘어지지.',
      saeng_ab: nmA + '의 기운이 ' + eul(nmB) + ' 살리는 자리라, 먼저 다가가는 쪽이 정해져 있네.',
      saeng_ba: nmB + '의 기운이 ' + eul(nmA) + ' 살리는 자리라, ' + nmB + ' 쪽이 먼저 마음을 여네.',
      geuk_ab: nmA + '의 기운이 ' + eul(nmB) + ' 누르는 자리라, 그 다름이 끌림이 되려면 시간이 걸리네.',
      geuk_ba: nmB + '의 기운이 ' + eul(nmA) + ' 누르는 자리라, 처음엔 답답하게 느껴질 수 있네.'
    }[rel];

    var beats = [
      {
        id: 'hello', shot: 'mid', face: 'l', mood: 'rose',
        ask: null,
        chips: [ilA + ' · ' + ilB, a.dayMaster.animal + '띠 · ' + b.dayMaster.animal + '띠', '두 사람의 인연'],
        lines: bub([
          '어서 오게, ' + wa(nmA) + ' ' + nmB + '. 여덟 글자를 나란히 놓아봤네.',
          '오늘은 인연의 자리부터 풀어주지. 궁금한 데부터 물어도 좋네.'
        ], [nmA, nmB, '인연의 자리'])
      },
      {
        id: 'score', shot: 'close', face: 'r', mood: 'gold',
        ask: COMPAT_ASK.score,
        chips: [r.score + '점', r.grade, '끌림 ' + (gs[0] ? gs[0].value : '-'), '안정 ' + (gs[3] ? gs[3].value : '-')],
        lines: bub([
          r.score + '점, ' + r.grade + '일세. 두 사람의 자리는 ' + ira(r.relName) + '.',
          '끌림 ' + (gs[0] ? gs[0].value : 0) + ', 대화 ' + (gs[1] ? gs[1].value : 0) +
            ', 안정 ' + (gs[3] ? gs[3].value : 0) + '. 숫자보다 어디가 어긋나는지가 중요하네.'
        ], [r.score + '점', r.grade, r.relName])
      },
      {
        id: 'spark', shot: 'mid', face: 'l', mood: 'dawn',
        ask: COMPAT_ASK.spark,
        chips: [ga.short + ' × ' + gb.short, '음양 ' + (a.dayMaster.yang === b.dayMaster.yang ? '같음' : '다름')].concat(chips('spark').slice(1, 3)),
        lines: bub([
          ga.short === gb.short
            ? '첫인상은 같은 ' + ga.short + ' 기운끼리라, 닮은 점이 먼저 보이네.'
            : '첫인상은 ' + ga.short + ' 기운과 ' + gb.short + ' 기운의 만남에서 갈리네.',
          relLine
        ], [ga.short, gb.short, '끌림'])
      },
      {
        id: 'heart', shot: 'close', face: 'r', mood: 'violet',
        ask: COMPAT_ASK.heart,
        chips: chips('heart'),
        lines: bub([
          '겉과 속마음의 간격은 ' + Ji[ja].name + ' × ' + Ji[jb].name + ' 자리에서 갈리네.',
          ja === jb
            ? '두 사람 다 같은 자리라, 서운함도 같은 곳에서 생기네. 그때 바로 말하게.'
            : '표현의 온도가 달라서, 서운함이 쌓이기 전에 말로 확인하는 게 약일세.'
        ], ['속마음', Ji[ja].name, Ji[jb].name])
      },
      {
        id: 'balance', shot: 'sky', face: 'l', mood: 'jade',
        ask: COMPAT_ASK.balance,
        chips: chips('balance'),
        lines: bub([
          '두 사람 모두 ' + (a.minElem === b.minElem ? a.minElem : a.minElem + '·' + b.minElem) + ' 기운이 가장 얇네.',
          dosa('balance', 2)
        ], [(a.minElem === b.minElem ? a.minElem : a.minElem + '·' + b.minElem) + ' 기운'])
      },
      {
        id: 'life', shot: 'mid', face: 'r', mood: 'sand',
        ask: COMPAT_ASK.life,
        chips: chips('life'),
        lines: bub([
          '연애의 온도와 살림은 다르지.',
          dosa('life', 2)
        ], ['살림'])
      },
      {
        id: 'clash', shot: 'close', face: 'l', mood: 'crimson',
        ask: COMPAT_ASK.clash,
        chips: chips('clash'),
        lines: bub([
          '싸우는 건 사건이 아니라 말의 순서일세.',
          dosa('clash', 2)
        ], ['말의 순서'])
      },
      {
        id: 'keep', shot: 'mid', face: 'r', mood: 'blue',
        ask: COMPAT_ASK.keep,
        chips: chips('remedy'),
        lines: bub([
          '오래 가는 비결은 큰 사랑보다 작은 규칙일세.',
          dosa('remedy', 2)
        ], ['작은 규칙'])
      },
      {
        id: 'year2027', shot: 'sky', face: 'l', mood: 'night',
        ask: COMPAT_ASK.year2027,
        chips: ['2027 ' + yA.ganzi, nmA + ' ' + yA.ganSipsin, nmB + ' ' + yB.ganSipsin],
        lines: bub([
          '2027년 정미(丁未), ' + neun(nmA) + ' ' + yA.ganSipsin + ', ' + neun(nmB) + ' ' + yB.ganSipsin + ' 운일세.',
          dosa('year', 2)
        ], ['정미(丁未)', yA.ganSipsin, yB.ganSipsin])
      },
      {
        id: 'closing', shot: 'mid', face: 'r', mood: 'rose',
        chips: ['심층 리포트 ' + (r.totalChars || 0).toLocaleString('ko-KR') + '자', '읽는 시간 약 ' + reads + '분', '네 가지 지표'],
        lines: bub([
          '여기까지가 두 사람의 큰 그림일세.',
          '더 깊은 풀이는 아래 전체 리포트에 담아뒀네. 점수보다 두 사람이 그리는 날이 더 중요하지.'
        ], ['전체 리포트']),
        actions: [
          { label: '전체 리포트 펼쳐 볼래', run: 'report' },
          { label: '궁합 공유할래', run: 'share' },
          { label: '처음부터 다시 볼래', run: 'again' }
        ]
      }
    ];

    return { cast: 'seonnyeo', beats: beats };
  }

  /* ---------- 대화 대본 만들기 : 2027 신년운세 ---------- */
  var NEWYEAR_ASK = {
    seun: '2027 총운부터 들을래',
    first: '상반기 흐름은?',
    second: '하반기 흐름은?',
    money: '2027 재물운은?',
    love: '연애운은 어때?',
    health: '건강은 조심할 때?',
    calendar: '가장 조심할 달은?',
    remedy: '개운 팁 알려줘'
  };

  function monthsLine(list, suffix) {
    if (!list || !list.length) return '';
    var nums = list.map(function (m) { return m.m !== undefined ? m.m : m; });
    return nums.join('·') + (suffix || '월');
  }

  function newyearBeats(chart, r) {
    var F = global.Fortune;
    if (!F || !r || !chart) return null;
    var nm = chart.input.name || '자네';
    var y27 = chart.years[1];
    var secs = r.byKey || {};
    function dosa(k, i) { var s = secs[k] && secs[k].dosa; return s && s[i] ? s[i] : ''; }
    function chips(k) { return ((secs[k] && secs[k].chips) || []).slice(0, 4); }
    var good = r.goodMonths || [], money = r.moneyMonths || [], spend = r.spendMonths || [];
    var love = r.loveMonths || [], clash = r.clashMonths || [];
    var goodFirst = good.filter(function (m) { return m.m >= 2 && m.m <= 6; });
    var clashSecond = clash.filter(function (m) { return m.m >= 7; });
    var reads = Math.max(1, Math.round((r.totalChars || 0) / 480));

    var beats = [
      {
        id: 'hello', shot: 'mid', face: 'l', mood: 'night',
        ask: null,
        chips: ['2027 정미', y27.ganSipsin + ' 운', y27.jiSipsin + ' 운', '흐름 ' + r.index + '점'],
        lines: bub([
          (chart.input.name ? '어서 오게, ' + chart.input.name + '.' : '어서 오게.'),
          '여덟 글자에 2027 정미(丁未)년을 얹어봤네. ' + chart.dayMaster.ilju + ' 일주, ' + chart.strength + '인 사주지.'
        ], [chart.input.name || '', '2027 정미(丁未)', chart.dayMaster.ilju, chart.strength])
      },
      {
        id: 'seun', shot: 'close', face: 'r', mood: 'gold',
        ask: NEWYEAR_ASK.seun,
        chips: chips('seun'),
        lines: bub([
          dosa('seun', 0),
          dosa('seun', 1)
        ], ['정미년', y27.ganSipsin, '흐름'])
      },
      {
        id: 'first', shot: 'mid', face: 'l', mood: 'jade',
        ask: NEWYEAR_ASK.first,
        chips: ['1~3월 준비', '4~6월 실행'].concat(goodFirst.length ? [monthsLine(goodFirst) + ' 힘'] : []),
        lines: bub([
          '상반기는 1~3월은 준비, 4~6월은 실행일세. 입춘(2월 4일)을 지나며 판이 바뀌지.',
          goodFirst.length ? monthsLine(goodFirst) + '에 힘이 실리니 미뤄둔 일을 그때 꺼내게.'
            : '상반기에 유난히 힘이 실리는 달은 적네. 하던 일을 놓지 않는 게 이기는 길일세.'
        ], ['입춘(2월 4일)'].concat(goodFirst.length ? [monthsLine(goodFirst)] : []))
      },
      {
        id: 'second', shot: 'mid', face: 'r', mood: 'indigo',
        ask: NEWYEAR_ASK.second,
        chips: ['7~9월 결과', '10~12월 정리'].concat(clashSecond.length ? [monthsLine(clashSecond) + ' 주의'] : []),
        lines: bub([
          '하반기는 상반기에 벌인 일의 결과가 드러나는 때일세.',
          clashSecond.length ? monthsLine(clashSecond) + '은 충이 걸리니 큰 결정을 피하고, 입동(11월 7일)부터 정리하게.'
            : '입추(8월 7일)에 결과를 확인하고, 입동(11월 7일)부터 정리와 결산일세.'
        ], ['입추(8월 7일)', '입동(11월 7일)'].concat(clashSecond.length ? [monthsLine(clashSecond)] : []))
      },
      {
        id: 'money', shot: 'close', face: 'l', mood: 'sand',
        ask: NEWYEAR_ASK.money,
        chips: chips('money'),
        lines: bub([
          (money.length ? '돈은 ' + monthsLine(money) + '에 물길이 트이네. ' : '올해는 돈이 크게 트이는 달이 적네. ') +
            (spend.length ? monthsLine(spend) + '은 지갑을 조심하게.' : '새는 곳을 막는 게 먼저일세.'),
          dosa('money', 2)
        ], [money.length ? monthsLine(money) : '물길', spend.length ? monthsLine(spend) : '지갑'])
      },
      {
        id: 'love', shot: 'mid', face: 'r', mood: 'rose',
        ask: NEWYEAR_ASK.love,
        chips: chips('love'),
        lines: bub([
          love.length ? monthsLine(love) + '에 인연의 문이 열리네.' : '인연의 문은 크게 열리지 않는 해일세.',
          dosa('love', 1) + ' ' + dosa('love', 2)
        ], love.length ? [monthsLine(love)] : ['인연'])
      },
      {
        id: 'health', shot: 'close', face: 'l', mood: 'crimson',
        ask: NEWYEAR_ASK.health,
        chips: chips('health'),
        lines: bub([
          '2027년은 건강이 운의 바탕이 되는 해일세.',
          dosa('health', 0).replace('2027년은 ', '')
        ], ['건강'])
      },
      {
        id: 'calendar', shot: 'sky', face: 'r', mood: 'blue',
        ask: NEWYEAR_ASK.calendar,
        chips: [(good.length ? '힘 실리는 달 ' + monthsLine(good, '') : '힘 실리는 달 적음'),
          (clash.length ? '주의 ' + monthsLine(clash, '') : '주의 달 적음'),
          (money.length ? '돈 ' + monthsLine(money, '') : '돈 달 적음')],
        lines: bub([
          (good.length ? monthsLine(good) + '에 힘이 실리고, ' : '') + (clash.length ? monthsLine(clash) + '은 큰 결정을 피할 달일세.' : '큰 충돌 없이 지나가는 해일세.'),
          dosa('calendar', 1)
        ], good.length ? [monthsLine(good)] : [])
      },
      {
        id: 'remedy', shot: 'mid', face: 'l', mood: 'jade',
        ask: NEWYEAR_ASK.remedy,
        chips: ['용신 ' + chart.yongsin.elem, '개운 ' + chart.yongsin.elem + ' 기운', '잠 7시간'],
        lines: bub([
          '개운은 거창할 것 없네. 색과 방향 하나면 되지.',
          dosa('health', 1)
        ], ['금 기운', chart.yongsin.elem + ' 기운'])
      },
      {
        id: 'closing', shot: 'mid', face: 'r', mood: 'dawn',
        chips: ['심층 리포트 ' + (r.totalChars || 0).toLocaleString('ko-KR') + '자', '읽는 시간 약 ' + reads + '분', '12개월 캘린더'],
        lines: bub([
          '여기까지가 2027년의 큰 흐름일세.',
          '달마다 할 일과 개운법은 아래 전체 리포트에 자세히 담아뒀네.'
        ], ['전체 리포트']),
        actions: [
          { label: '전체 리포트 펼쳐 볼래', run: 'report' },
          { label: '2027 운세 공유할래', run: 'share' },
          { label: '처음부터 다시 볼래', run: 'again' }
        ]
      }
    ];

    return { cast: 'chic', beats: beats };
  }

  /* ---------- 웹툰 컷 렌더 · 진행 ---------- */
  function mount(opts) {
    var host = opts.host;
    if (!host) return null;
    var beats = (opts.beats || []).filter(function (b) { return b; });
    if (!beats.length) return null;
    var cast = CASTS[opts.cast] || CASTS.doryeong;
    var byId = {};
    beats.forEach(function (b) { byId[b.id] = b; });
    var order = beats.map(function (b) { return b.id; });
    var reduced = !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var idx = 0, visited = {}, timer = null, pending = null;

    host.innerHTML =
      '<div class="wt">' +
        '<div class="wt-cut" id="wt-cut" data-shot="mid" data-face="l" data-mood="night" role="group" ' +
          'aria-label="웹툰 컷">' +
          '<div class="wt-art" aria-hidden="true">' +
            '<span class="wt-sky"></span>' +
            '<span class="wt-orb"></span>' +
            '<span class="wt-mist"></span>' +
            '<span class="wt-ridge r1"></span><span class="wt-ridge r2"></span>' +
            '<span class="wt-rays"></span>' +
            '<span class="wt-halftone"></span>' +
            '<span class="wt-speck s1"></span><span class="wt-speck s2"></span><span class="wt-speck s3"></span>' +
          '</div>' +
          '<div class="wt-figure" aria-hidden="true">' +
            '<img class="wt-char" src="' + cast.body + '" alt="' + esc(cast.alt) + '" width="660" height="870" decoding="async">' +
          '</div>' +
          '<span class="wt-grade" aria-hidden="true"></span>' +
          '<span class="wt-frame" aria-hidden="true"></span>' +
          '<span class="wt-scrim" aria-hidden="true"></span>' +
          '<div class="wt-bubbles" id="wt-bubbles" aria-live="polite"></div>' +
          '<span class="wt-bar"><i id="wt-fill"></i></span>' +
          '<div class="wt-top">' +
            '<button type="button" class="wt-back" id="wt-back" aria-label="이전 컷 다시 보기">‹</button>' +
            '<span class="wt-step"><b id="wt-cur">1</b><i>/</i><span id="wt-total">' + beats.length + '</span></span>' +
            '<span class="wt-who"><span class="wt-ava"><img src="' + cast.face + '" alt="" width="40" height="40"></span>' +
              '<span class="wt-whotx"><b>' + esc(cast.name) + '</b><small>' + esc(cast.role) + '</small></span></span>' +
          '</div>' +
          '<div class="wt-chips" id="wt-chips"></div>' +
          '<span class="wt-cue" id="wt-cue" aria-hidden="true">▸</span>' +
        '</div>' +
        '<div class="wt-said" id="wt-said" hidden></div>' +
        '<div class="wt-acts">' +
          '<button type="button" class="wt-next" id="wt-next">다음 컷 <span aria-hidden="true">→</span></button>' +
          '<div class="wt-jumps" id="wt-jumps"></div>' +
        '</div>' +
      '</div>';

    var $ = function (s) { return host.querySelector(s); };
    var cutEl = $('#wt-cut'), bubblesEl = $('#wt-bubbles'), chipsEl = $('#wt-chips');
    var saidEl = $('#wt-said'), cueEl = $('#wt-cue'), nextEl = $('#wt-next'), jumpsEl = $('#wt-jumps');

    function setChips(chips) {
      chipsEl.innerHTML = (chips || []).map(function (c) { return '<span>' + esc(c) + '</span>'; }).join('');
      chipsEl.classList.toggle('is-empty', !(chips && chips.length));
    }

    /* 말풍선이 컷의 안전 영역(캐릭터 얼굴 위쪽)을 넘지 않게 글자를 줄인다 */
    function fitBubbles() {
      var list = bubblesEl.querySelectorAll('.wt-bubble');
      if (!list.length) return;
      var fs = cutEl.clientWidth >= 400 ? 15.8 : 14.4, guard = 0;
      var limit = cutEl.clientHeight * 0.472 - bubblesEl.offsetTop;
      bubblesEl.style.setProperty('--bub-fs', fs + 'px');
      bubblesEl.style.setProperty('--bub-w', '70%');
      function tooTall() {
        var h = 0;
        for (var i = 0; i < list.length; i++) h += list[i].offsetHeight;
        h += 9 * (list.length - 1);
        return h > limit;
      }
      while (tooTall() && guard++ < 24) {
        fs -= 0.35;
        bubblesEl.style.setProperty('--bub-fs', fs + 'px');
        if (fs < 13) bubblesEl.style.setProperty('--bub-w', '78%');
      }
    }

    function renderBubbles(lines, animate) {
      if (!lines || !lines.length) lines = ['자세한 풀이는 아래 리포트에 담아뒀네.'];
      var html = (lines || []).map(function (line, i) {
        var tail = i === 0 ? 'bl' : 'tl';
        return '<p class="wt-bubble' + (animate && !reduced ? ' pop' : '') + '" data-tail="' + tail + '" style="--d:' + (i * 0.11) + 's">' +
          bubbleHTML(line) + '</p>';
      }).join('');
      bubblesEl.innerHTML = html;
      bubblesEl.classList.toggle('one', (lines || []).length < 2);
      if (animate) {
        cutEl.classList.remove('is-cut');
        void cutEl.offsetWidth;
        cutEl.classList.add('is-cut');
      }
      fitBubbles();
    }

    function showChoices(beat) {
      var i = order.indexOf(beat.id);
      var nextId = order[i + 1];
      var hasActions = beat.actions && beat.actions.length;
      nextEl.hidden = !nextId && !hasActions ? true : !nextId;
      if (nextId) {
        nextEl.hidden = false;
        nextEl.innerHTML = '다음 컷 <span aria-hidden="true">→</span>';
      }
      var html = '';
      if (hasActions) {
        nextEl.hidden = true;
        html = beat.actions.map(function (a) {
          return '<button type="button" class="wt-jump" data-run="' + esc(a.run) + '">' + esc(a.label) + '</button>';
        }).join('');
      } else {
        var jumps = order.filter(function (id) {
          return id !== beat.id && id !== nextId && !visited[id] && byId[id].ask;
        }).slice(0, 2);
        html = jumps.map(function (id) {
          return '<button type="button" class="wt-jump" data-go="' + esc(id) + '" data-say="' + esc(byId[id].ask) + '">' +
            esc(byId[id].ask) + '</button>';
        }).join('');
      }
      jumpsEl.innerHTML = html;
      jumpsEl.classList.toggle('is-empty', !html);
    }

    function render(id, userSay) {
      clearTimeout(pending);
      pending = null;
      var i = order.indexOf(id);
      if (i < 0) return;
      idx = i;
      var beat = byId[id];
      visited[id] = true;
      cutEl.setAttribute('data-shot', beat.shot || 'mid');
      cutEl.setAttribute('data-face', beat.face || 'l');
      cutEl.setAttribute('data-mood', beat.mood || 'night');
      $('#wt-cur').textContent = String(i + 1);
      $('#wt-total').textContent = String(order.length);
      $('#wt-fill').style.width = Math.round((i + 1) / order.length * 100) + '%';
      $('#wt-back').disabled = i === 0;
      setChips(beat.chips);
      saidEl.hidden = !userSay;
      saidEl.textContent = userSay ? '“' + userSay + '”' : '';
      cueEl.hidden = false;
      renderBubbles(beat.lines, true);
      showChoices(beat);
    }

    /* 선택지를 누르면 사용자 말이 먼저 뜨고, 잠깐 뒤 캐릭터가 대답한다 */
    function respond(id, userSay) {
      if (!byId[id]) return;
      if (!userSay) { render(id); return; }
      clearTimeout(timer);
      jumpsEl.classList.remove('is-empty');
      jumpsEl.innerHTML = '';
      nextEl.hidden = true;
      saidEl.hidden = false;
      saidEl.textContent = '“' + userSay + '”';
      cueEl.hidden = true;
      bubblesEl.innerHTML = '<p class="wt-bubble typing" data-tail="bl"><span class="wt-dots"><i></i><i></i><i></i></span></p>';
      bubblesEl.classList.remove('one');
      clearTimeout(pending);
      pending = setTimeout(function () { render(id, userSay); }, reduced ? 40 : 340);
    }

    function advance() {
      if (pending) return;   /* 선택지에 대답하는 중이면 그 대답을 먼저 들려준다 */
      var nextId = order[idx + 1];
      if (nextId) render(nextId);
    }
    function back() {
      if (idx === 0) return;
      clearTimeout(pending);
      pending = null;
      render(order[idx - 1]);
    }

    jumpsEl.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button') : null;
      if (!b) return;
      if (b.getAttribute('data-run')) {
        var run = b.getAttribute('data-run');
        saidEl.hidden = false;
        saidEl.textContent = '“' + b.textContent.trim() + '”';
        if (opts.onAction) opts.onAction(run);
        return;
      }
      var go = b.getAttribute('data-go');
      if (!go) return;
      respond(go, b.getAttribute('data-say'));
    });

    nextEl.addEventListener('click', advance);
    cutEl.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('#wt-back')) return;
      advance();
    });
    $('#wt-back').addEventListener('click', function (e) { e.stopPropagation(); back(); });

    /* 좌우 스와이프로도 넘긴다 */
    var sx = 0, sy = 0;
    cutEl.addEventListener('touchstart', function (e) {
      var t = e.changedTouches[0]; sx = t.clientX; sy = t.clientY;
    }, { passive: true });
    cutEl.addEventListener('touchend', function (e) {
      var t = e.changedTouches[0];
      var dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.abs(dx) < 44 || Math.abs(dy) > Math.abs(dx)) return;
      if (dx < 0) advance(); else back();
    }, { passive: true });

    var resizeTimer = null;
    global.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(fitBubbles, 180);
    });
    /* 결과 화면이 처음엔 숨어 있어 컷 높이가 0일 수 있다 — 보이게 되면 다시 맞춘다 */
    if (global.ResizeObserver) {
      new global.ResizeObserver(function () { fitBubbles(); }).observe(cutEl);
    }

    render(order[0]);

    return { go: function (id) { respond(id); }, back: back, advance: advance };
  }

  global.Story = {
    cast: CASTS,
    mount: mount,
    indexBeats: indexBeats,
    compatBeats: compatBeats,
    newyearBeats: newyearBeats
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = global.Story;
})(typeof window !== 'undefined' ? window : globalThis);
