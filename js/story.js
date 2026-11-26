/* ============================================================
   운세도사 · 비주얼 노벨 대화 스테이지 (story.js)
   - 캐릭터가 무대에 서고, 아래 대사창의 말이 한 컷씩 교체된다
   - 진행 바(3 / 12), 이전 대사, 사용자 선택지 버튼
   - 심층 리포트 전문은 접었다 펼 수 있다
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
  /* 문장 몇 개를 골라 이어 붙이되 너무 길면 자른다 (조사가 걸리지 않게 문장 단위로) */
  function joinSentences(lines, maxLen) {
    var out = '';
    for (var i = 0; i < lines.length; i++) {
      var t = clean(lines[i]);
      if (!t) continue;
      if (!out) out = t;
      else if (maxLen && (out + ' ' + t).length > maxLen) break;
      else out += ' ' + t;
    }
    return out;
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
    var F = global.Fortune, T = global.Themes, S = global.Saju;
    var deep = F.deep(chart);
    var g = F.GAN[chart.dayMaster.gan];
    var m = F.mascotLines(chart);
    var theme = themeKey && T && T.map[themeKey] ? T.map[themeKey] : null;
    var y27 = chart.years[1];
    var P = chart.pillars;
    var who = chart.input.name ? chart.input.name + '님' : '자네';
    function sec(k) { return deep.byKey[k] || { dosa: [], chips: [] }; }
    function dosa(k, n) { return sec(k).dosa.slice(0, n || 2); }

    var pillars = '년주 ' + P.year.hangul + ', 월주 ' + P.month.hangul + ', 일주 ' + P.day.hangul +
      (P.hour ? ', 시주 ' + P.hour.hangul : '') + ' — 여덟 글자가 이렇게 섰네.';

    /* 오행 균형 한 줄 (도사의 하게체) */
    var el5 = ['목', '화', '토', '금', '수'];
    var maxV = chart.elements[chart.maxElem], minV = chart.elements[chart.minElem];
    var maxNames = el5.filter(function (e) { return chart.elements[e] === maxV; });
    var minNames = el5.filter(function (e) { return chart.elements[e] === minV; });
    var elemLine = maxV === minV
      ? '오행이 다섯 가지로 고르게 섞여 있구만. 어디 하나 치우치지 않은 드문 사주일세.'
      : maxV - minV >= 2
        ? '오행을 보니 ' + chart.maxElem + ' 기운이 넘치고 ' + chart.minElem + ' 기운이 모자라네. 넘치는 건 나눠 쓰고, 모자란 건 채워주면 되는 법이지.'
        : '오행을 보니 ' + (maxNames.length > 1 ? maxNames.join('·') + '가 가장 많고' : chart.maxElem + ' 기운이 조금 더 많고') + ' ' +
          (minNames.length > 1 ? minNames.join('·') + '가 가장 적네.' : chart.minElem + ' 기운이 조금 적네.') +
          ' 크게 기울진 않았으니 균형을 지키며 가면 되겠어.';

    /* 2027 세운 한 줄 */
    var y27line = '2027년은 정미(丁未)년, ' + y27.ganSipsin + '(' + F.SIPSIN[y27.ganSipsin].hanja + ') 운이 들어오는 해일세. ' +
      (y27.ganSipsin === '정관' || y27.ganSipsin === '편관' ? '이름과 자리가 오르는 해니 준비한 것을 내놓게.'
        : y27.ganSipsin === '정재' || y27.ganSipsin === '편재' ? '돈의 물길이 트이니 둑부터 쌓게.'
          : '벌이기보다 다지기에 좋은 해일세.') +
      ' 지지 ' + y27.jiSipsin + ' 기운도 함께 오네.';

    var beats = [
      {
        id: 'hello',
        chips: [chart.dayMaster.ilju + ' 일주', chart.dayMaster.animal + '띠', chart.strength],
        text: joinSentences([m.greeting,
          theme ? '오늘은 ‘' + theme.name + '’ 이야기부터 풀어줄세.' : '',
          '여덟 글자 하나씩 짚어줄 테니, 궁금한 데부터 물어도 좋네.'], 190)
      },
      {
        id: 'pillars',
        chips: [P.year.hangul, P.month.hangul, P.day.hangul].concat(P.hour ? [P.hour.hangul] : []),
        text: pillars + ' 가운데 ' + iga(g.name) + ' ' + who + ' 중심일세. 띠는 ' + chart.dayMaster.animal + '띠고.' +
          (P.hour ? '' : ' 태어난 시각을 몰라 시주는 비워두고 여섯 글자로 보네.')
      },
      {
        id: 'summary',
        chips: sec('summary').chips.slice(0, 4),
        text: joinSentences(dosa('summary', 2), 210)
      },
      {
        id: 'personality',
        chips: sec('personality').chips.slice(0, 4),
        text: joinSentences(dosa('personality', 2), 210)
      },
      {
        id: 'elem',
        chips: ['목 ' + chart.elements['목'], '화 ' + chart.elements['화'], '토 ' + chart.elements['토'], '금 ' + chart.elements['금'], '수 ' + chart.elements['수']],
        text: elemLine + ' 모자란 ' + chart.minElem + ' 기운은 매일 하나씩 채우면 되네. 채우는 법은 개운법에서 짚어주지.'
      },
      {
        id: 'money',
        chips: sec('money').chips.slice(0, 4),
        text: joinSentences(dosa('money', 2), 210)
      },
      {
        id: 'job',
        chips: sec('job').chips.slice(0, 4),
        text: joinSentences(dosa('job', 2), 210)
      },
      {
        id: 'love',
        chips: sec('love').chips.slice(0, 4),
        text: joinSentences(dosa('love', 2), 210)
      },
      {
        id: 'daeun',
        chips: sec('daeun').chips.slice(0, 4),
        text: joinSentences([sec('daeun').dosa[0], sec('daeun').dosa[1]], 210)
      },
      {
        id: 'year2027',
        chips: ['2027 ' + y27.ganzi, y27.ganSipsin + ' 운', y27.jiSipsin + ' 운', '용신 ' + chart.yongsin.elem],
        text: y27line
      },
      {
        id: 'remedy',
        chips: sec('remedy').chips.slice(0, 4),
        text: joinSentences(dosa('remedy', 2), 210)
      },
      {
        id: 'closing',
        chips: ['심층 리포트 ' + deep.totalChars.toLocaleString('ko-KR') + '자', '읽는 시간 약 ' + Math.max(1, Math.round(deep.totalChars / 480)) + '분'],
        text: joinSentences([m.closing, '더 파고들고 싶으면 아래 ‘전체 리포트 한눈에 보기’를 눌러보게. 여덟 글자 풀이를 6천 자로 적어뒀네.'], 200),
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

  /* ---------- 무대 렌더 · 진행 ---------- */
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
    var idx = 0, visited = {}, typing = false, timer = null, fullText = '', pending = null;

    host.innerHTML =
      '<div class="vn">' +
      '<div class="vn-stage" id="vn-stage">' +
      '<div class="vn-art" aria-hidden="true"><span class="vn-arch"></span><span class="vn-arch b"></span><span class="vn-moon"></span><span class="vn-lantern l"></span><span class="vn-lantern r"></span></div>' +
      '<img class="vn-char" src="' + cast.body + '" alt="' + esc(cast.alt) + '" width="330" height="440" decoding="async">' +
      '<div class="vn-fade" aria-hidden="true"></div>' +
      '<div class="vn-track"><i id="vn-bar"></i></div>' +
      '<div class="vn-hud">' +
      '<button type="button" class="vn-back" id="vn-back" aria-label="이전 대사 다시 보기">‹</button>' +
      '<div class="vn-id"><span class="vn-ava"><img src="' + cast.face + '" alt="" width="44" height="44"></span>' +
      '<span class="vn-idtx"><b>' + esc(cast.name) + '</b><small>' + esc(cast.role) + '</small></span></div>' +
      '<div class="vn-step"><b id="vn-cur">1</b><span>/</span><i id="vn-total">' + beats.length + '</i></div>' +
      '</div>' +
      '<div class="vn-tags" id="vn-tags"></div>' +
      '</div>' +
      '<div class="vn-said" id="vn-said" hidden></div>' +
      '<div class="vn-panel" id="vn-panel" role="button" tabindex="0" aria-label="대사창. 누르면 다음 대사로 넘어갑니다">' +
      '<p class="vn-line" id="vn-line" aria-live="polite"></p>' +
      '<span class="vn-cue" id="vn-cue">탭하면 다음 대사 ▸</span>' +
      '</div>' +
      '<div class="vn-choices" id="vn-choices"></div>' +
      '</div>';

    var $ = function (s) { return host.querySelector(s); };
    var lineEl = $('#vn-line'), tagsEl = $('#vn-tags'), choicesEl = $('#vn-choices');
    var saidEl = $('#vn-said'), cueEl = $('#vn-cue'), panelEl = $('#vn-panel'), stageEl = $('#vn-stage');

    function setTags(chips) {
      tagsEl.innerHTML = (chips || []).map(function (c) { return '<span>' + esc(c) + '</span>'; }).join('');
      tagsEl.classList.toggle('is-empty', !(chips && chips.length));
    }

    function typeLine(text) {
      clearInterval(timer);
      fullText = text;
      lineEl.textContent = '';
      if (reduced) { lineEl.textContent = text; typing = false; cueEl.hidden = false; return; }
      typing = true;
      cueEl.hidden = true;
      var i = 0, chunk = text.length > 150 ? 2 : 1;
      timer = setInterval(function () {
        i += chunk;
        lineEl.textContent = text.slice(0, i);
        if (i >= text.length) {
          clearInterval(timer);
          lineEl.textContent = text;
          typing = false;
          cueEl.hidden = false;
        }
      }, 17);
    }
    function finishTyping() {
      if (!typing) return false;
      clearInterval(timer);
      lineEl.textContent = fullText;
      typing = false;
      cueEl.hidden = false;
      return true;
    }

    function showChoices(beat) {
      var html = '';
      if (beat.actions && beat.actions.length) {
        html += '<div class="vn-jumps">' + beat.actions.map(function (a) {
          return '<button type="button" class="vn-choice jump" data-run="' + esc(a.run) + '">' + esc(a.label) + '</button>';
        }).join('') + '</div>';
      } else {
        var nextId = order[order.indexOf(beat.id) + 1];
        if (nextId) {
          html += '<button type="button" class="vn-choice main" data-go="' + esc(nextId) + '">다음 이야기 계속 듣기 <span aria-hidden="true">→</span></button>';
        }
        var jumps = order.filter(function (id) {
          return id !== beat.id && id !== nextId && !visited[id] && byId[id].ask;
        }).slice(0, 2);
        if (jumps.length) {
          html += '<div class="vn-jumps">' + jumps.map(function (id) {
            return '<button type="button" class="vn-choice jump" data-go="' + esc(id) + '" data-say="' + esc(byId[id].ask) + '">' + esc(byId[id].ask) + '</button>';
          }).join('') + '</div>';
        }
      }
      choicesEl.innerHTML = html;
      choicesEl.classList.add('show');
    }

    function render(id, userSay) {
      clearTimeout(pending);
      pending = null;
      var i = order.indexOf(id);
      if (i < 0) return;
      idx = i;
      var beat = byId[id];
      visited[id] = true;
      $('#vn-cur').textContent = String(i + 1);
      $('#vn-total').textContent = String(order.length);
      $('#vn-bar').style.width = Math.round((i + 1) / order.length * 100) + '%';
      $('#vn-back').disabled = i === 0;
      setTags(beat.chips);
      saidEl.hidden = !userSay;
      saidEl.textContent = userSay ? '“' + userSay + '”' : '';
      typeLine(beat.text);
      showChoices(beat);
      if (!reduced && choicesEl.animate) {
        choicesEl.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 240, easing: 'ease-out' });
      }
    }

    /* 선택지를 누르면 사용자 말이 먼저 뜨고, 잠깐 뒤 캐릭터가 대답한다 */
    function respond(id, userSay) {
      if (!byId[id]) return;
      if (!userSay) { render(id); return; }
      clearInterval(timer);
      typing = false;
      choicesEl.classList.remove('show');
      choicesEl.innerHTML = '';
      saidEl.hidden = false;
      saidEl.textContent = '“' + userSay + '”';
      lineEl.innerHTML = '<span class="vn-dots"><i></i><i></i><i></i></span>';
      cueEl.hidden = true;
      clearTimeout(pending);
      pending = setTimeout(function () { render(id, userSay); }, reduced ? 40 : 430);
    }

    function advance() {
      if (pending) return;   /* 선택지에 대답하는 중이면 그 대답을 먼저 들려준다 */
      if (finishTyping()) return;
      var nextId = order[idx + 1];
      if (nextId) render(nextId);
    }
    function back() {
      if (idx === 0) return;
      clearTimeout(pending);
      pending = null;
      render(order[idx - 1]);
    }

    choicesEl.addEventListener('click', function (e) {
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

    panelEl.addEventListener('click', advance);
    stageEl.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('#vn-back')) return;
      advance();
    });
    panelEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); advance(); }
    });
    $('#vn-back').addEventListener('click', function (e) { e.stopPropagation(); back(); });

    /* 좌우 스와이프로도 넘긴다 */
    var sx = 0, sy = 0;
    stageEl.addEventListener('touchstart', function (e) {
      var t = e.changedTouches[0]; sx = t.clientX; sy = t.clientY;
    }, { passive: true });
    stageEl.addEventListener('touchend', function (e) {
      var t = e.changedTouches[0];
      var dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.abs(dx) < 44 || Math.abs(dy) > Math.abs(dx)) return;
      if (dx < 0) advance(); else back();
    }, { passive: true });

    render(order[0]);

    return { go: function (id) { respond(id); }, back: back, advance: advance };
  }

  global.Story = {
    cast: CASTS,
    mount: mount,
    indexBeats: indexBeats
  };
})(window);
