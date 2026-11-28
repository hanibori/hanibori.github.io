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
      alt: '부채를 든 꽃미남 도령',
      fx: 'ember'
    },
    seonnyeo: {
      name: '선녀 도사', role: '궁합 · 인연',
      face: 'assets/char-seonnyeo-face.webp?v=2', body: 'assets/char-seonnyeo.webp?v=2',
      alt: '우아한 선녀 도사',
      fx: 'petal'
    },
    chic: {
      name: '시크 역술가', role: '2027 정미년',
      face: 'assets/char-chic-face.webp?v=2', body: 'assets/char-chic.webp?v=2',
      alt: '시크한 역술가',
      fx: 'star'
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
  /* 테마별 무대 캐릭터 — 정통·총운은 도령, 연애·궁합은 선녀, 재물·팩폭·신년은 역술가 */
  var CAST_OF_CAT = { jeontong: 'doryeong', love: 'seonnyeo', money: 'chic', packpok: 'chic', newyear: 'chic' };
  /* 테마 색(tone) → 컷 분위기 */
  var MOOD_OF_TONE = { gold: 'gold', rose: 'rose', jade: 'jade', violet: 'violet', ember: 'crimson', sky: 'blue' };

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

  function indexBeatsJeontong(chart, themeKey) {
    var F = global.Fortune, T = global.Themes;
    var deep = F.deep(chart);
    var g = F.GAN[chart.dayMaster.gan];
    var m = F.mascotLines(chart);
    var theme = themeKey && T && T.map[themeKey] ? T.map[themeKey] : null;
    /* 테마로 들어왔으면 그 테마의 첫마디부터 들려준다 (배우자상이면 배우자 이야기부터) */
    var themeIntro = theme && T.intro ? T.intro(theme, chart) : '';
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
          mark(theme ? '이제 ' + who + '의 여덟 글자를 세어보니 **' + ilju + '** 일주로구만.'
            : '어서 오게, ' + who + '. 여덟 글자를 세어보니 **' + ilju + '** 일주로구만.', []),
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

    /* 테마 첫 컷 — 고른 테마의 첫마디로 시작한다 */
    if (theme && themeIntro) {
      beats.unshift({
        id: 'theme-open', shot: 'mid', face: 'l', mood: MOOD_OF_TONE[theme.tone] || 'night',
        chips: [theme.name, chart.dayMaster.ilju + ' 일주', '용신 ' + chart.yongsin.elem],
        lines: packBubbles(sentences(themeIntro), 46)
      });
    }

    /* 테마별 초점 순서에 맞춰 중간 이야기 순서를 바꾼다 */
    var fixedHead = theme && themeIntro ? ['theme-open', 'hello', 'pillars'] : ['hello', 'pillars'];
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

    return {
      cast: theme ? (CAST_OF_CAT[theme.cat] || 'doryeong') : 'doryeong',
      role: theme ? theme.catLabel : null,
      beats: ordered
    };
  }

  /* ============================================================
     테마별 맞춤 컷 흐름
     - 정통·총운은 기존 종합 풀코스(indexBeatsJeontong) 그대로
     - 연애·재물·팩폭·신년은 그 테마에만 있는 컷을 따로 세운다
       (배우자 자리 → 원하는 상 → 갈등 → 인연 시기 …처럼 순서와 내용이 통째로 달라진다)
     ============================================================ */
  function firstSentence(t) { var s = sentences(t); return s[0] || clean(t); }
  function nthSentence(t, n) { var s = sentences(t); return s[n] || s[0] || clean(t); }

  /* 리포트용 해요체 문장을 도사의 하게체로 (문장 끝맺음만 바꾼다) */
  function speak(t) {
    return clean(t)
      .replace(/하십시오\./g, '하게.')
      .replace(/하세요\./g, '하게.')
      .replace(/해요\./g, '하게.')
      .replace(/입니다\./g, '일세.')
      .replace(/됩니다\./g, '되네.')
      .replace(/합니다\./g, '하네.')
      .replace(/갑니다\./g, '가네.')
      .replace(/옵니다\./g, '오네.')
      .replace(/큽니다\./g, '크네.')
      .replace(/립니다\./g, '리네.')
      .replace(/있습니다\./g, '있네.')
      .replace(/없습니다\./g, '없네.')
      .replace(/킵니다\./g, '키네.')
      .replace(/집니다\./g, '지네.')
      .replace(/습니다\./g, '네.')
      .replace(/니다\./g, '네.');
  }

  function themeCtx(chart, theme) {
    var F = global.Fortune, T = global.Themes;
    var deep = F.deep(chart);
    var prof = F.profile(chart);
    var d = chart.daeun;
    return {
      chart: chart, theme: theme, deep: deep, prof: prof, F: F, T: T,
      g: F.GAN[chart.dayMaster.gan], m: F.mascotLines(chart),
      P: chart.pillars, ji: F.JI[chart.pillars.day.ji], y: chart.yongsin,
      y27: chart.years[1], cur: d.current, nxt: d.next,
      who: chart.input.name ? chart.input.name + '님' : '자네',
      ilju: chart.dayMaster.ilju,
      intro: T.intro ? T.intro(theme, chart) : ''
    };
  }

  /* 테마 첫 컷 — 고른 테마의 첫마디 */
  function openCut(c) {
    var intro = c.intro || '어서 오게. 여덟 글자부터 풀어주지.';
    return {
      id: 'theme-open', shot: 'mid', face: 'l', mood: MOOD_OF_TONE[c.theme.tone] || 'night',
      chips: [c.theme.name, c.ilju + ' 일주', '용신 ' + c.y.elem],
      lines: packBubbles(sentences(intro), 46)
    };
  }

  /* 테마 마지막 컷 — 리포트·공유로 이어지는 자리 */
  function closeCut(c, chips) {
    var deep = c.deep, m = c.m;
    return {
      id: 'closing', shot: 'sky', face: 'r', mood: 'dawn',
      chips: chips || ['심층 리포트 ' + deep.totalChars.toLocaleString('ko-KR') + '자',
        '읽는 시간 약 ' + Math.max(1, Math.round(deep.totalChars / 480)) + '분'],
      lines: [
        mark(sentences(m.closing)[0] || m.closing, ['타고난 재료']),
        '재료를 어떻게 쓰느냐는 ' + c.who + '의 몫이야. 더 깊은 풀이는 아래 **전체 리포트**에 있네.'
      ],
      actions: [
        { label: '결과 카드로 저장할래', run: 'card' },
        { label: '친구한테 공유할래', run: 'share' },
        { label: '다른 테마도 들어볼래', run: 'theme' }
      ]
    };
  }

  /* 테마별 컷 묶음 — 첫 컷 + 고른 순서 + 마지막 컷 */
  function assemble(c, map, order, ASK, OVR) {
    var out = [openCut(c)];
    (order || []).forEach(function (id) {
      var b = map[id];
      if (!b) return;
      b.chips = (b.chips || []).filter(function (x) { return !!x; }).slice(0, 4);
      if (OVR && OVR[b.id]) b.ask = OVR[b.id];
      else if (ASK && ASK[b.id]) b.ask = ASK[b.id];
      out.push(b);
    });
    out.push(closeCut(c));
    return out;
  }

  function money27Line(y27) {
    var s = y27.ganSipsin;
    if (s === '정재' || s === '편재') return '돈의 물길이 트이니 둑부터 쌓게.';
    if (s === '정관' || s === '편관') return '이름과 자리가 오르니 준비한 것을 내놓게.';
    if (s === '겁재') return '경쟁과 변동이 크니 큰 지출은 한 박자 늦추게.';
    return '벌이보다 다지기에 좋은 해일세.';
  }
  function loveHit27(chart, y27) {
    var star = chart.input.gender === 'm' ? ['정재', '편재'] : ['정관', '편관'];
    return star.indexOf(y27.ganSipsin) >= 0 || star.indexOf(y27.jiSipsin) >= 0;
  }

  /* ---------- 연애·솔로 : 배우자 자리 → 원하는 상 → 갈등 → 인연 시기 → 조언 ---------- */
  var LOVE_ASK = {
    'l-seat': '배우자 자리부터 볼래',
    'l-want': '내 배우자상은?',
    'l-style': '내 연애 스타일은?',
    'l-pattern': '왜 자꾸 어긋날까?',
    'l-match': '잘 맞는 띠는?',
    'l-timing': '인연은 언제 와?',
    'l-advice': '연애 조언 해줘',
    'l-wed': '결혼 생활은 어떨까',
    'l-som': '다가갈 타이밍은?',
    'l-reunion': '재회할 수 있을까',
    'l-newface': '새 인연은 올까',
    'l-end': '한 줄로 정리해줘'
  };

  function loveBeats(chart, theme) {
    var c = themeCtx(chart, theme);
    var prof = c.prof, DG = prof.deepGan, DJ = prof.deepJi, TS = prof.sipsin, y = c.y, J = c.ji;
    var y27 = c.y27, nxt = c.nxt, cur = c.cur;
    var elemBands = prof.elemAnimals.join('·');
    var partnerBands = prof.partnerAnimals.join('·');
    var nowHit = loveHit27(chart, y27);
    var star = chart.input.gender === 'm' ? ['정재', '편재'] : ['정관', '편관'];
    var nxtHit = !!(nxt && (star.indexOf(nxt.ganSipsin) >= 0 || star.indexOf(nxt.jiSipsin) >= 0));
    var nowStar = star.indexOf(y27.ganSipsin) >= 0 ? y27.ganSipsin
      : (star.indexOf(y27.jiSipsin) >= 0 ? y27.jiSipsin : '');
    var timingLines = nowHit
      ? ['2027 정미년이 인연의 문이 열리는 해일세.', nowStar + ' 운이 들어오니 나가는 자리를 만들게.']
      : nxtHit
        ? ['다음 ' + nxt.ganzi + ' 대운(' + nxt.startAge + '세부터)에 인연의 문이 열리네.', '그 전까지 내 생활을 정돈해두면 만남의 질이 달라지지.']
        : ['인연의 별이 크게 드러나는 때는 아직 아닐세.', '찾기보다 생활 반경을 넓히는 쪽이 효율일세.'];

    var map = {
      'l-seat': {
        id: 'l-seat', shot: 'mid', face: 'r', mood: 'rose',
        chips: [J.name + ' 일지', J.keyword, '배우자 자리'],
        lines: bub(['배우자 자리는 일지 ' + J.name + ', ' + J.keyword + '의 결일세.',
          speak(firstSentence(DJ.spouseDetail))], [J.name, J.keyword])
      },
      'l-want': {
        id: 'l-want', shot: 'close', face: 'l', mood: 'dawn',
        chips: ['원하는 배우자상', '용신 ' + y.elem, c.g.short],
        lines: bub(['곁에 두고 싶은 사람은 ' + DG.spouseWant + '일세.',
          '그 사람이 오면 ' + y.elem + ' 기운이 차오르지.'], ['사람', y.elem + ' 기운'])
      },
      'l-style': {
        id: 'l-style', shot: 'mid', face: 'l', mood: 'violet',
        chips: [c.g.short, '연애 스타일', J.keyword],
        lines: bub([speak(firstSentence(DG.loveStyle)), speak(J.relation)], ['신뢰'])
      },
      'l-pattern': {
        id: 'l-pattern', shot: 'close', face: 'r', mood: 'crimson',
        chips: ['반복 갈등', TS.weak, '고칠 지점'],
        lines: bub(['연애에서 되풀이되는 건 ' + TS.weak + '일세.',
          speak(firstSentence(DG.loveConflict))], [TS.weak])
      },
      'l-match': {
        id: 'l-match', shot: 'sky', face: 'l', mood: 'jade',
        chips: prof.elemAnimals.slice(0, 2).concat(prof.partnerAnimals.slice(0, 2)),
        lines: bub(['잘 맞는 상대는 ' + elemBands + '라네.',
          partnerBands ? partnerBands + '도 귀인이라 잘 맞지.' : '대화의 속도가 비슷한 사람이 오래 가네.'],
        [elemBands])
      },
      'l-timing': {
        id: 'l-timing', shot: 'sky', face: 'r', mood: 'blue',
        chips: ['2027 ' + y27.ganSipsin + ' 운', nxt ? '다음 대운 ' + nxt.ganzi : '대운 전',
          chart.input.gender === 'm' ? '배우자성: 재성' : '배우자성: 관성'],
        lines: bub(timingLines, ['2027 정미년'])
      },
      'l-advice': {
        id: 'l-advice', shot: 'mid', face: 'l', mood: 'sand',
        chips: ['연애 처방', y.elem + ' 기운', '매일 하나'],
        lines: bub(['싸울 때 ' + (prof.siksang >= 2 ? '말이 먼저 나가는 것' : '서운함을 쌓아두는 것') + '만 조심하게.',
          '그리고 ' + prof.deepElem.habit + ' 하나를 같이 해보게.'], ['작은 규칙'])
      },
      'l-wed': {
        id: 'l-wed', shot: 'mid', face: 'r', mood: 'gold',
        chips: ['결혼 생활', J.keyword, prof.gwan >= 1 ? '역할 분담' : '둘의 규칙'],
        lines: bub(['일지 ' + J.name + '의 결은 살림에서도 그대로 나오네.',
          speak(nthSentence(DJ.spouseDetail, 1))], [J.keyword])
      },
      'l-som': {
        id: 'l-som', shot: 'close', face: 'r', mood: 'rose',
        chips: ['다가갈 타이밍', c.g.short, '상대 성향'],
        lines: bub(['마음은 소리가 없어도 글자에는 남네.',
          '재촉하지 말고 ' + (prof.siksang >= 2 ? '말보다 행동으로 보여주게.' : '한 번에 하나씩 다가가게.')], ['타이밍'])
      },
      'l-reunion': {
        id: 'l-reunion', shot: 'close', face: 'l', mood: 'indigo',
        chips: ['재회', '이별의 원인', TS.weak],
        lines: bub(['이별의 원인은 대개 ' + TS.weak + '에서 왔네.',
          prof.jae + prof.gwan > 0 ? '남은 인연의 자리가 아직 비어 있지 않네.' : '인연의 자리가 비어 새 사람이 먼저 올 수 있네.'], [TS.weak])
      },
      'l-newface': {
        id: 'l-newface', shot: 'mid', face: 'r', mood: 'dawn',
        chips: ['새 인연', y.elem + ' 기운', prof.elemAnimals[0]],
        lines: bub(['새 인연은 ' + elemBands + ' 쪽에서 오네.',
          '옛 사람을 붙잡는 동안엔 그 문이 열리지 않네.'], [elemBands])
      },
      'l-end': {
        id: 'l-end', shot: 'sky', face: 'l', mood: 'rose',
        chips: ['한 줄 정리', J.name + ' 일지', y.elem + ' 기운'],
        lines: bub(['정리하면 ' + J.keyword + '의 결을 가진 사람, ' +
          (nowHit ? '2027년이 인연의 문일세.' : nxtHit ? nxt.ganzi + ' 대운이 인연의 문일세.' : '아직은 내 자리를 다지는 때일세.'),
          '찾지 말고 자리를 만들게.'], ['인연의 문'])
      }
    };

    var order = ({
      'love-main': ['l-seat', 'l-style', 'l-want', 'l-pattern', 'l-match', 'l-timing', 'l-advice', 'l-end'],
      'love-spouse': ['l-seat', 'l-want', 'l-wed', 'l-match', 'l-pattern', 'l-timing', 'l-advice', 'l-end'],
      'love-som': ['l-style', 'l-som', 'l-want', 'l-pattern', 'l-match', 'l-timing', 'l-advice', 'l-end'],
      'love-reunion': ['l-reunion', 'l-pattern', 'l-newface', 'l-match', 'l-timing', 'l-advice', 'l-end']
    })[theme.key] || ['l-seat', 'l-want', 'l-pattern', 'l-match', 'l-timing', 'l-advice', 'l-end'];

    var ask = theme.key === 'love-spouse' ? { 'l-timing': '결혼 시기는?' }
      : theme.key === 'love-som' ? { 'l-timing': '그 사람과 될까?' } : null;
    return assemble(c, map, order, LOVE_ASK, ask);
  }

  /* ---------- 재물·직업 : 새는 구멍 → 재물 그릇 → 맞는 일 → 직장 vs 사업 → 시기 ---------- */
  var MONEY_ASK = {
    'm-habit': '돈 새는 구멍은?',
    'm-leak': '어디서 새는 거야?',
    'm-bowl': '내 재물 그릇은?',
    'm-work': '맞는 일은 뭐야?',
    'm-org': '직장과 사업, 뭐가 맞아?',
    'm-invest': '투자는 해도 될까?',
    'm-timing': '돈은 언제 풀려?',
    'm-advice': '돈 관리 조언 해줘',
    'm-career': '피할 자리는 어디야?',
    'm-jend': '한 줄로 정리해줘',
    'm-end': '한 줄로 정리해줘'
  };

  function moneyBeats(chart, theme) {
    var c = themeCtx(chart, theme);
    var prof = c.prof, DG = prof.deepGan, DJ = prof.deepJi, TS = prof.sipsin, y = c.y;
    var C = prof.count, y27 = c.y27, cur = c.cur;
    var jobs = DG.jobs || [];
    var bowl = C['편재'] > C['정재'] ? '편재가 더 많아 돈이 크게 돌아 들어오는 그릇일세.'
      : C['정재'] > C['편재'] ? '정재가 더 많아 차곡차곡 쌓이는 그릇일세.'
        : '정재와 편재가 반반이라 안정과 변동을 함께 가져가네.';
    if (prof.jae === 0) bowl = '재성이 원국에 드러나지 않아 관리하는 시스템에서 돈이 모이네.';

    var map = {
      'm-habit': {
        id: 'm-habit', shot: 'mid', face: 'l', mood: 'gold',
        chips: ['돈 모으는 습관', '재성 ' + prof.jae + '개', '새는 곳 ' + y.gisin],
        lines: bub(['돈은 버는 힘보다 막는 힘에서 모이네.', speak(DJ.moneyHabit)], ['막는 힘'])
      },
      'm-leak': {
        id: 'm-leak', shot: 'close', face: 'r', mood: 'crimson',
        chips: ['새는 구멍', '기신 ' + y.gisin, '비겁 ' + prof.bigo + '개'],
        lines: bub([speak(firstSentence(DG.leak)),
          prof.bigo >= 2 ? '사람 문제로 나가는 돈이 많으니 보증은 특히 조심하게.' : '기분 따라 트는 지출이 구멍일세.'], ['구멍'])
      },
      'm-bowl': {
        id: 'm-bowl', shot: 'sky', face: 'l', mood: 'jade',
        chips: ['재성 ' + prof.jae + '개', '편재 ' + C['편재'], '정재 ' + C['정재']],
        lines: bub([bowl, '재성 ' + prof.jae + '개, 식상 ' + prof.siksang + '개로 보는 그릇일세.'], [y.elem + ' 기운'])
      },
      'm-work': {
        id: 'm-work', shot: 'mid', face: 'r', mood: 'sand',
        chips: jobs.slice(0, 3).concat(['용신 ' + y.elem]),
        lines: bub([jobs.slice(0, 2).join('·') + ' 쪽이 자네 자리일세.',
          '용신 ' + y.elem + ' 기운이 도는 ' + prof.deepElem.jobField + '도 좋네.'], [jobs[0]])
      },
      'm-org': {
        id: 'm-org', shot: 'close', face: 'l', mood: 'violet',
        chips: ['직장 vs 사업', '관성 ' + prof.gwan + '개', chart.strength],
        lines: bub([prof.gwan >= 2 ? '관성이 ' + prof.gwan + '개라 조직에서 자리를 잡는 쪽이 편하네.'
          : prof.gwan === 0 ? '관성이 없으니 남 밑에 오래 있기는 답답한 사주일세.'
            : '관성이 적당해 조직과 독립을 골라도 되네.',
        chart.strength === '신강' ? '밀 힘은 있으니 사람 쓰는 법과 돈 관리부터 배우게.' : '혼자 다 떠안지 않게 동료와 시스템부터 만들게.'], ['독립'])
      },
      'm-invest': {
        id: 'm-invest', shot: 'mid', face: 'r', mood: 'blue',
        chips: ['투자 성향', '기신 ' + y.gisin, y.group === '재성' ? '내 수입원' : '분산'],
        lines: bub([speak(firstSentence(DG.invest)),
          y.group === '재성' ? '용신이 재성이라 내가 만든 수입원이 답일세.' : '잘 모르는 자산은 비중을 확 줄이게.'], ['투자'])
      },
      'm-timing': {
        id: 'm-timing', shot: 'sky', face: 'l', mood: 'night',
        chips: ['2027 ' + y27.ganzi, y27.ganSipsin + ' 운', cur ? '대운 ' + cur.ganzi : '대운 전'],
        lines: bub([cur ? (prof.daeunTalk[cur.ganSipsin] || '지금 ' + cur.ganzi + ' 대운 흐름일세.') : '아직 대운이 열리기 전, 기반을 다지는 때일세.',
          '2027년은 ' + y27.ganSipsin + ' 운, ' + money27Line(y27)], ['2027년'])
      },
      'm-move': {
        id: 'm-move', shot: 'mid', face: 'r', mood: 'blue',
        chips: ['움직일 때', '버틸 때', '2027 ' + y27.ganzi],
        lines: bub(['움직이는 때는 ' + (cur ? cur.ganSipsin + ' 대운이 끝나기 전' : '대운이 바뀌는 해') + '일세.',
          '2027년은 ' + (y27.ganSipsin === '정관' || y27.ganSipsin === '편관' ? '자리가 오르니 옮길 명분이 생기네.' : '준비를 마치고 판을 저울질하기 좋은 해일세.')], ['움직이는 때'])
      },
      'm-career': {
        id: 'm-career', shot: 'close', face: 'r', mood: 'sand',
        chips: ['피할 자리', '성공 환경', y.elem + ' 기운'],
        lines: bub(['연봉보다 환경부터 보게.', speak(firstSentence(DG.avoid))], ['환경'])
      },
      'm-jend': {
        id: 'm-jend', shot: 'sky', face: 'l', mood: 'jade',
        chips: ['한 줄 정리', jobs[0], chart.strength],
        lines: bub(['정리하면 ' + jobs[0] + ' 쪽에서 ' + c.g.strength + '이 터지는 사주일세.',
          prof.gwan >= 1 ? '조직에서 자리를 밟은 뒤 움직이게.' : '내 이름을 건 일로 바로 나가게.'], [jobs[0]])
      },
      'm-advice': {
        id: 'm-advice', shot: 'mid', face: 'r', mood: 'jade',
        chips: ['통장 셋', '자동이체', y.gisin + ' 지출 상한'],
        lines: bub(['생활비·비상금·투자, 통장 셋으로 나누게.', eul(y.gisin) + ' 키우는 지출엔 상한을 두게.'], ['통장 셋'])
      },
      'm-end': {
        id: 'm-end', shot: 'sky', face: 'l', mood: 'gold',
        chips: ['한 줄 정리', '재물 그릇', '재성 ' + prof.jae + '개'],
        lines: bub(['정리하면 ' + (prof.jae === 0 ? '막는 힘' : '한 우물') + '에서 돈이 모이는 사주일세.',
          prof.gwan >= 1 ? '조직의 자리를 밟아 올라가며 모으게.' : '내 이름을 건 일에서 단가를 올리게.'], ['한 우물'])
      }
    };

    var order = ({
      'money-main': ['m-habit', 'm-leak', 'm-bowl', 'm-invest', 'm-timing', 'm-advice', 'm-end'],
      'money-job': ['m-work', 'm-org', 'm-career', 'm-bowl', 'm-timing', 'm-jend'],
      'money-move': ['m-timing', 'm-move', 'm-org', 'm-work', 'm-career', 'm-jend'],
      'money-side': ['m-habit', 'm-leak', 'm-bowl', 'm-org', 'm-timing', 'm-advice', 'm-end']
    })[theme.key] || ['m-habit', 'm-leak', 'm-bowl', 'm-invest', 'm-timing', 'm-advice', 'm-end'];

    var ask = theme.key === 'money-move' ? { 'm-timing': '지금 움직여도 될까?', 'm-move': '언제가 좋을까?' }
      : theme.key === 'money-job' ? { 'm-timing': '언제 옮기는 게 좋아?' }
        : theme.key === 'money-side' ? { 'm-org': '혼자 벌어도 될까?' } : null;
    return assemble(c, map, order, MONEY_ASK, ask);
  }

  /* ---------- 팩폭·성격 : 내면 → 급소 → 새는 습관 → 멘탈 → 반전 무기 ---------- */
  var PACKPOK_ASK = {
    'p-inner': '내 속마음은?',
    'p-caution': '내 급소가 뭐야?',
    'p-drain': '뭐가 발목 잡아?',
    'p-mental': '멘탈 관리법은?',
    'p-weapon': '내 반전 무기는?',
    'p-fix': '한 줄 처방 해줘',
    'p-relation': '인간관계 패턴은?',
    'p-end': '한 줄로 정리해줘'
  };

  function packpokBeats(chart, theme) {
    var c = themeCtx(chart, theme);
    var prof = c.prof, DG = prof.deepGan, DJ = prof.deepJi, TS = prof.sipsin, y = c.y;
    var EI = prof.elementInfo;

    var map = {
      'p-inner': {
        id: 'p-inner', shot: 'close', face: 'l', mood: 'violet',
        chips: ['내면', DG.words[0], DG.words[1]],
        lines: bub([DG.talk, speak(firstSentence(DJ.innerWorld))], ['속'])
      },
      'p-caution': {
        id: 'p-caution', shot: 'mid', face: 'r', mood: 'crimson',
        chips: ['급소', TS.weak, DG.words[2]],
        lines: bub(['가장 조심할 흠은 ' + TS.weak + '일세.', speak(firstSentence(DG.stress))], [TS.weak])
      },
      'p-drain': {
        id: 'p-drain', shot: 'close', face: 'l', mood: 'gold',
        chips: ['새는 습관', TS.weak, '기신 ' + y.gisin],
        lines: bub(['무기를 깎아먹는 습관은 ' + prof.gisinDeep.avoidPattern + '일세.', '그게 ' + TS.weak + '을 키우네.'], [TS.weak])
      },
      'p-mental': {
        id: 'p-mental', shot: 'sky', face: 'r', mood: 'jade',
        chips: ['멘탈 관리', '용신 ' + y.elem, EI.color],
        lines: bub([speak(EI.advice), '색은 ' + EI.color + ', 방향은 ' + EI.place + '일세.'], [EI.color])
      },
      'p-weapon': {
        id: 'p-weapon', shot: 'mid', face: 'l', mood: 'dawn',
        chips: ['반전 무기', c.g.short, DG.words[0]],
        lines: bub(['반전 무기는 ' + c.g.strength + '일세.', speak(firstSentence(TS.mind))], [c.g.strength])
      },
      'p-fix': {
        id: 'p-fix', shot: 'mid', face: 'r', mood: 'sand',
        chips: ['한 줄 처방', y.elem + ' 기운', '매일 하나'],
        lines: bub([speak(firstSentence(DG.fix)), '이 한 가지만 피해도 절반은 개운되네.'], ['개운'])
      },
      'p-relation': {
        id: 'p-relation', shot: 'mid', face: 'l', mood: 'rose',
        chips: ['인간관계', c.ji.keyword, '갈등 포인트'],
        lines: bub([DJ.talk, speak(firstSentence(DJ.conflict))], ['관계'])
      },
      'p-end': {
        id: 'p-end', shot: 'sky', face: 'r', mood: 'violet',
        chips: ['한 줄 정리', TS.weak, DG.words[0]],
        lines: bub(['정리하면 ' + TS.weak + '만 피하면 ' + DG.words[0] + '이 살아나는 사주일세.',
          '성격을 고치지 말고 상황을 피하게.'], [TS.weak])
      }
    };

    var order = ({
      'packpok-main': ['p-inner', 'p-caution', 'p-drain', 'p-mental', 'p-weapon', 'p-fix', 'p-end'],
      'packpok-weapon': ['p-weapon', 'p-inner', 'p-caution', 'p-drain', 'p-mental', 'p-fix', 'p-end'],
      'packpok-relation': ['p-relation', 'p-inner', 'p-caution', 'p-drain', 'p-mental', 'p-fix', 'p-end']
    })[theme.key] || ['p-inner', 'p-caution', 'p-drain', 'p-mental', 'p-weapon', 'p-fix', 'p-end'];

    return assemble(c, map, order, PACKPOK_ASK);
  }

  /* ---------- 신년·대운 : 2027 세운 → 대운 → 상·하반기 → 돈·인연 ---------- */
  var NEWYEAR_CUT_ASK = {
    'n-seun': '2027 총운부터',
    'n-daeun': '대운은 어떻게 흘러?',
    'n-half': '상·하반기 흐름은?',
    'n-money': '2027 돈은?',
    'n-love': '2027 인연은?',
    'n-advice': '2027 개운 팁은?',
    'n-end': '한 줄로 정리해줘'
  };

  function newyearCuts(chart, theme) {
    var c = themeCtx(chart, theme);
    var prof = c.prof, y = c.y, y27 = c.y27, cur = c.cur, nxt = c.nxt, EI = prof.elementInfo;
    var loveHit = loveHit27(chart, y27);

    var map = {
      'n-seun': {
        id: 'n-seun', shot: 'close', face: 'r', mood: 'gold',
        chips: ['2027 정미', y27.ganSipsin + ' 운', y27.jiSipsin + ' 운'],
        lines: bub(['2027년은 정미(丁未)년, ' + y27.ganSipsin + ' 운이 들어오는 해일세.',
          speak(firstSentence(c.F.YEAR2027[y27.ganSipsin])).replace(/^2027년은 /, '')], ['2027년'])
      },
      'n-daeun': {
        id: 'n-daeun', shot: 'sky', face: 'l', mood: 'indigo',
        chips: [cur ? '대운 ' + cur.ganzi : '대운 전', nxt ? '다음 ' + nxt.ganzi : '다음 판', chart.daeun.dirText + ' 대운'],
        lines: bub([cur ? '지금은 ' + cur.ganzi + ' 대운, ' + cur.ganSipsin + ' 흐름일세.' : '아직 대운이 열리기 전일세.',
          nxt ? '다음 판은 ' + nxt.startAge + '세 ' + nxt.ganzi + ' 대운에 열리네.' : '10년마다 판이 바뀌니 조급해할 것 없네.'], [nxt ? nxt.ganzi : ''])
      },
      'n-half': {
        id: 'n-half', shot: 'mid', face: 'l', mood: 'jade',
        chips: ['상반기 실행', '하반기 정리', '2027 흐름'],
        lines: bub(['상반기 1~3월은 준비, 4~6월은 실행일세.', '하반기 7~9월은 결과, 10~12월은 정리일세.'], ['입춘'])
      },
      'n-money': {
        id: 'n-money', shot: 'close', face: 'r', mood: 'sand',
        chips: ['2027 재물', y27.ganSipsin, y27.jiSipsin],
        lines: bub(['2027년은 ' + y27.ganSipsin + ' 운, ' + money27Line(y27),
          '지지 ' + y27.jiSipsin + ' 기운도 함께 오네.'], ['2027년'])
      },
      'n-love': {
        id: 'n-love', shot: 'mid', face: 'l', mood: 'rose',
        chips: ['2027 인연', y27.ganSipsin, '배우자성 ' + (chart.input.gender === 'm' ? '재성' : '관성')],
        lines: loveHit
          ? bub(['2027년은 인연의 문이 열리는 해일세.', '나가는 자리를 만들면 사람이 따라오네.'], ['인연의 문'])
          : bub(['2027년은 인연의 문이 크게 열리진 않네.', '내 자리를 다지면 만남의 질이 달라지지.'], ['인연'])
      },
      'n-advice': {
        id: 'n-advice', shot: 'mid', face: 'r', mood: 'jade',
        chips: ['개운', y.elem + ' 기운', EI.color],
        lines: bub([speak(EI.advice), '색은 ' + EI.color + ', 방향은 ' + EI.place + '일세.'], [EI.color])
      },
      'n-end': {
        id: 'n-end', shot: 'sky', face: 'l', mood: 'dawn',
        chips: ['한 줄 정리', y27.ganzi + '년', y.elem + ' 기운'],
        lines: bub(['정리하면 ' + y.elem + ' 기운을 키우는 해일세.', '상반기에 벌이고, 하반기에 매듭짓게.'], [y.elem + ' 기운'])
      }
    };

    var order = ({
      'newyear-main': ['n-seun', 'n-half', 'n-money', 'n-love', 'n-advice', 'n-end'],
      'newyear-daeun': ['n-daeun', 'n-seun', 'n-half', 'n-money', 'n-advice', 'n-end']
    })[theme.key] || ['n-seun', 'n-half', 'n-money', 'n-love', 'n-advice', 'n-end'];

    var ask = theme.key === 'newyear-daeun' ? { 'n-seun': '2027년은 어때?' } : null;
    return assemble(c, map, order, NEWYEAR_CUT_ASK, ask);
  }

  var FLOW_OF_CAT = { love: loveBeats, money: moneyBeats, packpok: packpokBeats, newyear: newyearCuts };

  /* 테마 카테고리별 전용 대본으로 갈라보내고, 정통·총운은 기존 코스로 */
  function indexBeats(chart, themeKey) {
    var T = global.Themes;
    var theme = themeKey && T && T.map[themeKey] ? T.map[themeKey] : null;
    var flow = theme && FLOW_OF_CAT[theme.cat];
    if (flow) {
      try {
        var beats = flow(chart, theme);
        if (beats && beats.length) {
          return { cast: CAST_OF_CAT[theme.cat] || 'doryeong', role: theme.catLabel, beats: beats };
        }
      } catch (err) {
        if (global.console && global.console.error) global.console.error('[story:theme]', err);
      }
    }
    return indexBeatsJeontong(chart, themeKey);
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
          '<canvas class="wt-fx" id="wt-fx" aria-hidden="true"></canvas>' +
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
              '<span class="wt-whotx"><b>' + esc(cast.name) + '</b><small>' + esc(opts.role || cast.role) + '</small></span></span>' +
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

    /* 테마별 빛 입자 — 도령은 금빛 불티, 선녀는 꽃빛, 역술가는 은빛 별빛 */
    var fxEl = $('#wt-fx');
    if (fxEl && global.FX && global.FX.mount) global.FX.mount(fxEl, cast.fx || 'ember');

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
