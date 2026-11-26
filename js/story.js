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
      face: 'assets/char-doryeong-face.webp', body: 'assets/char-doryeong.webp',
      alt: '부채를 든 꽃미남 도령'
    },
    seonnyeo: {
      name: '선녀 도사', role: '궁합 · 인연',
      face: 'assets/char-seonnyeo-face.webp', body: 'assets/char-seonnyeo.webp',
      alt: '우아한 선녀 도사'
    },
    chic: {
      name: '역술가', role: '2027 신년운세',
      face: 'assets/char-chic-face.webp', body: 'assets/char-chic.webp',
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
    indexBeats: indexBeats
  };
})(window);
