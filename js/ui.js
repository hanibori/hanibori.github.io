/* ============================================================
   운세도사 · 화면 동작 (ui.js)
   - 입력 폼, 결과 렌더링, 도사 말풍선 타이핑
   - 결과 카드 이미지 저장, 카톡/링크 공유
   ============================================================ */
(function (global) {
  'use strict';

  var S = global.Saju;
  var F = global.Fortune;
  var T = global.Themes;
  var doc = document;

  var ELEM_CLASS = { '목': 'mok', '화': 'hwa', '토': 'to', '금': 'geum', '수': 'su' };
  var PAGE = doc.body ? doc.body.getAttribute('data-page') : '';
  var PROFILE_KEY = 'saju-profile';
  var pendingTheme = null;

  function qs(sel, root) { return (root || doc).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || doc).querySelectorAll(sel)); }
  function el(tag, cls, html) {
    var e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  function esc(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  /* 마지막 한글 글자에 받침이 있는지 (끝이 한자가 아니면 한글 음까지 거슬러 올라간다) */
  function hasJong(word) {
    var t = String(word || ''), c = 0;
    for (var i = t.length - 1; i >= 0; i--) {
      c = t.charCodeAt(i);
      if (c >= 0xAC00 && c <= 0xD7A3) return (c - 0xAC00) % 28 !== 0;
    }
    return false;
  }
  /* 월지 → 그 달을 여는 절입(節) */
  var JEOL_OF_MONTH = { 2: '입춘', 3: '경칩', 4: '청명', 5: '입하', 6: '망종', 7: '소서', 8: '입추', 9: '백로', 10: '한로', 11: '입동', 0: '대설', 1: '소한' };
  /* 받침에 맞춰 조사를 붙인다: pair('과','와'), josa('이','가'), ro('으로','로'), ra('이라','라') */
  function pair(word, withJong, withoutJong) {
    return String(word || '') + (hasJong(word) ? withJong : withoutJong);
  }
  function josa(word, withJong, withoutJong) { return pair(word, withJong, withoutJong); }

  var toastTimer = null;
  function toast(msg) {
    var t = qs('#toast');
    if (!t) { t = el('div', 'toast'); t.id = 'toast'; doc.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2200);
  }

  /* ---------- 타이핑 효과 ---------- */
  var typingToken = 0;
  function typeText(node, text, speed) {
    var token = ++typingToken;
    var reduce = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    node.textContent = '';
    if (reduce) { node.textContent = text; return; }
    var i = 0, step = speed || 34;
    node.classList.add('caret');
    var timer = setInterval(function () {
      if (token !== typingToken) { clearInterval(timer); node.classList.remove('caret'); return; }
      i += 1;
      node.textContent = text.slice(0, i);
      if (i >= text.length) {
        clearInterval(timer);
        setTimeout(function () { if (token === typingToken) node.classList.remove('caret'); }, 600);
      }
    }, step);
  }

  /* ---------- 하단 탭바 현재 페이지 표시 ---------- */
  function markNav() {
    var tab = PAGE === 'index' ? 'home'
      : PAGE.indexOf('compat') === 0 ? 'compat'
        : PAGE.indexOf('newyear') === 0 ? 'newyear'
          : PAGE === 'guide' ? 'guide' : '';
    qsa('.tabbar a').forEach(function (a) {
      if (a.getAttribute('data-tab') === tab) a.classList.add('on');
      a.addEventListener('click', function () {
        if (a.getAttribute('data-tab') === 'saju' && PAGE === 'index') {
          qsa('.tabbar a').forEach(function (x) { x.classList.remove('on'); });
          a.classList.add('on');
        }
      });
    });
  }

  /* ---------- 입력값 저장 / 복원 ---------- */
  function saveProfile(p) {
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
      localStorage.setItem('saju-last', JSON.stringify({
        name: p.name, y: p.year, m: p.month, d: p.day, cal: p.calendar, gender: p.gender
      }));
    } catch (e) { }
  }

  function readProfile() {
    try {
      var p = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null');
      if (p && p.year && p.month && p.day) return p;
      /* 예전 버전이 남긴 saju-last 도 읽는다 */
      var old = JSON.parse(localStorage.getItem('saju-last') || 'null');
      if (old && old.y) {
        return {
          year: old.y, month: old.m, day: old.d, hour: null, minute: 0,
          calendar: old.cal || 'solar', leap: false, gender: old.gender || 'm', name: old.name || ''
        };
      }
    } catch (e) { }
    return null;
  }

  function buildFromProfile() {
    var p = readProfile();
    if (!p) return null;
    var chart = S.build(p);
    return chart && !chart.error ? chart : null;
  }

  function themeFromHash() {
    var m = /^#theme-([a-z-]+)$/.exec(location.hash || '');
    return m && T.map[m[1]] ? m[1] : null;
  }

  function setHash(key) {
    try {
      var h = key ? '#theme-' + key : '#result';
      if (location.hash !== h) history.replaceState(null, '', h);
    } catch (e) { }
  }

  /* ---------- 히어로 말풍선 문구 순환 ---------- */
  function heroBubbleCycle() {
    var box = qs('#hero-bubble-text');
    if (!box) return;
    var lines = [
      '어서 오게. 생일만 알려주면 여덟 글자를 풀어주지.',
      '사주는 정해진 운명이 아니라 타고난 재료일 뿐이라네.',
      '2027년 붉은 양의 기운도 함께 봐주겠네. 허허.'
    ];
    var k = 0;
    function next() {
      typeText(box, lines[k % lines.length], 40);
      k += 1;
    }
    next();
    setInterval(function () {
      if (doc.hidden) return;
      next();
    }, 7600);
  }

  /* ---------- 날짜 셀렉트 채우기 ---------- */
  function fillDateSelects(y, m, d, baseYear) {
    var now = new Date();
    var maxY = baseYear || now.getFullYear();
    for (var i = 1900; i <= maxY; i++) y.appendChild(new Option(i + '년', i));
    for (var j = 1; j <= 12; j++) m.appendChild(new Option(j + '월', j));
    y.value = 1996; m.value = 3;
    refreshDays(y, m, d);
  }

  function refreshDays(yEl, mEl, dEl, keep) {
    var yv = +yEl.value, mv = +mEl.value;
    var dim = new Date(yv, mv, 0).getDate();
    var prev = keep || +dEl.value || 1;
    dEl.innerHTML = '';
    for (var k = 1; k <= dim; k++) dEl.appendChild(new Option(k + '일', k));
    dEl.value = Math.min(prev, dim);
  }

  function fillTimeSelects(hEl, mEl) {
    for (var i = 0; i < 24; i++) hEl.appendChild(new Option(String(i).padStart(2, '0') + '시', i));
    for (var j = 0; j < 60; j += 5) mEl.appendChild(new Option(String(j).padStart(2, '0') + '분', j));
    hEl.value = 12; mEl.value = 0;
  }

  /* ---------- 결과 렌더 ---------- */
  var lastChart = null, lastLines = null;

  function elemSpan(elem) {
    return '<span class="e-' + ELEM_CLASS[elem] + '">' + elem + '</span>';
  }

  function pillarHTML(title, p, isDayMaster) {
    if (!p) {
      return '<div class="pillar"><div class="role">' + title + '</div>' +
        '<div class="char" style="color:var(--muted-2)">?<span class="hz">모름</span></div></div>';
    }
    return '<div class="pillar' + (isDayMaster ? ' dm' : '') + '">' +
      '<div class="role">' + title + '</div>' +
      '<div class="char">' +
      '<span class="e-' + ELEM_CLASS[p.ganElem] + '">' + p.ganName + '</span>' +
      '<span class="e-' + ELEM_CLASS[p.jiElem] + '">' + p.jiName + '</span>' +
      '<span class="hz">' + p.hanja + '</span></div>' +
      '<div class="ss">' + p.ganSipsin + ' · ' + p.jiSipsin + '</div>' +
      '<div class="bar b-' + ELEM_CLASS[p.ganElem] + '"></div>' +
      '</div>';
  }

  function renderElements(chart) {
    var order = ['목', '화', '토', '금', '수'];
    var max = Math.max(1, Math.max.apply(null, order.map(function (e) { return chart.elements[e]; })));
    return order.map(function (e) {
      var v = chart.elements[e], pct = chart.percents[e];
      var w = Math.round(v / max * 100);
      return '<div class="elem-row">' +
        '<div class="name e-' + ELEM_CLASS[e] + '">' + e + '</div>' +
        '<div class="elem-track"><div class="elem-fill b-' + ELEM_CLASS[e] + '" style="width:' + w + '%"></div></div>' +
        '<div class="val">' + v + '개 · ' + pct + '%</div>' +
        '</div>';
    }).join('');
  }

  function dosaInline(text, label) {
    return '<div class="dosa-inline">' +
      '<img src="mascot.webp" alt="" width="46" height="77" loading="lazy" decoding="async">' +
      '<div class="dosa-inline-body"><span class="dosa-inline-label">' + esc(label) + '</span>' +
      '<p>' + esc(text) + '</p></div></div>';
  }

  function deepSectionHTML(s, i, total, nextTitle) {
    var body = '';
    body += '<p class="deep-lead">' + esc(s.lead) + '</p>';
    s.paras.forEach(function (p, idx) {
      body += '<div class="deep-para"><h4>' + esc(p.h) + '</h4><p>' + esc(p.t) + '</p></div>';
      if (idx === 1 && s.dosa.length > 1) body += dosaInline(s.dosa[0], '도사님 한마디');
    });
    if (s.dosa.length > 1) body += dosaInline(s.dosa.slice(1).join(' '), '도사님 정리');
    body += '<div class="chips">' + s.chips.map(function (c) { return '<span class="chip">' + esc(c) + '</span>'; }).join('') + '</div>';
    if (i < total - 1) {
      body += '<button type="button" class="deep-next" data-next="' + (i + 1) + '">다음 항목 · ' + esc(nextTitle) + ' →</button>';
    }
    return '<article class="card deep-sec' + (i === 0 ? ' open' : '') + '" id="sec-' + s.key + '" data-key="' + s.key + '">' +
      '<button type="button" class="deep-head" aria-expanded="' + (i === 0 ? 'true' : 'false') + '">' +
      '<span class="deep-no">' + s.no + '</span>' +
      '<span class="deep-titlewrap"><span class="deep-title">' + esc(s.title) + '</span>' +
      '<span class="deep-tag">' + esc(s.tagline) + '</span></span>' +
      '<span class="deep-meta">' + s.chars + '자</span>' +
      '<span class="deep-toggle" aria-hidden="true"></span>' +
      '</button>' +
      '<div class="deep-body">' + body + '</div></article>';
  }

  function renderResult(chart, themeKey) {
    lastChart = chart;
    lastLines = F.mascotLines(chart);
    var deep = F.deep(chart);
    var theme = themeKey && T && T.map[themeKey] ? T.map[themeKey] : null;
    var g = F.GAN[chart.dayMaster.gan];
    var j = F.JI[chart.pillars.day.ji];
    var name = chart.input.name || '나';
    var host = qs('#result-body');
    var solar = chart.solar, lunar = chart.lunar;
    var timeTxt = chart.input.hour === null ? '시간 모름' :
      String(chart.input.hour).padStart(2, '0') + ':' + String(chart.input.minute).padStart(2, '0');
    var calTxt = chart.input.calendar === 'lunar'
      ? '음력 ' + chart.input.year + '.' + chart.input.month + '.' + chart.input.day + (chart.input.leap ? ' (윤달)' : '') + ' → 양력 ' + solar.y + '.' + solar.m + '.' + solar.d
      : '양력 ' + solar.y + '.' + solar.m + '.' + solar.d;
    var lunarTxt = lunar ? '음력 ' + lunar.y + '.' + lunar.m + '.' + lunar.d + (lunar.leap ? ' (윤달)' : '') : '';

    var y27 = chart.years[1], y26 = chart.years[0];
    var em = F.elemSummary(chart);
    var d = chart.daeun;
    var sipsinTop = ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인'].slice()
      .sort(function (a, b) { return (chart.sipsinCount[b] || 0) - (chart.sipsinCount[a] || 0); })[0];
    var readMin = Math.max(1, Math.round(deep.totalChars / 480));

    var html = '';

    /* 테마 배너 */
    if (theme) {
      html += '<div class="theme-banner" data-tone="' + theme.tone + '">' +
        '<span class="tb-glyph" aria-hidden="true">' + theme.glyph + '</span>' +
        '<div class="tb-main"><div class="tb-cat">' + esc(theme.catLabel) + '</div>' +
        '<h2 class="tb-name">' + esc(theme.name) + '</h2></div>' +
        '<div class="tb-badge">' + badgeHTML(theme) + '</div></div>';
    }

    html += '<div class="result-top">' +
      '<h2>' + (chart.input.name ? esc(name) + '님의 사주팔자' : '나의 사주팔자') + '</h2>' +
      '<div class="meta">' + esc(calTxt) + ' · ' + timeTxt + ' · ' + (chart.input.gender === 'f' ? '여성' : '남성') + '</div>' +
      '</div>';

    /* 테마 초점 순서 */
    var secs = deep.sections.slice();
    if (theme && theme.focus && theme.focus.length) {
      var ordered = [], used = {};
      theme.focus.forEach(function (k) {
        if (deep.byKey[k] && !used[k]) { ordered.push(deep.byKey[k]); used[k] = true; }
      });
      secs.forEach(function (s) { if (!used[s.key]) ordered.push(s); });
      secs = ordered;
    }

    html += '<div class="pillars">' +
      pillarHTML('시주', chart.pillars.hour, false) +
      pillarHTML('일주', chart.pillars.day, true) +
      pillarHTML('월주', chart.pillars.month, false) +
      pillarHTML('년주', chart.pillars.year, false) +
      '</div>';

    /* 도사 말풍선 */
    var tabs = [
      ['greeting', '첫인사'], ['summary', '총평'], ['personality', '성격'], ['money', '재물운'],
      ['job', '직업운'], ['love', '애정운'], ['daeun', '대운'], ['remedy', '개운법'], ['year2027', '2027']
    ];
    html += '<div class="card dosa-talk" style="margin-top:16px">' +
      '<div class="stage"><img class="mascot" src="mascot.webp" alt="사주를 풀어주는 도사 캐릭터" width="132" height="221"></div>' +
      '<div><div class="bubble"><div class="who"><i></i>도사님의 한마디</div>' +
      '<div id="talk-text" style="min-height:76px"></div></div>' +
      '<div class="talk-tabs" id="talk-tabs">' +
      tabs.map(function (t, i) { return '<button type="button" data-k="' + t[0] + '"' + (i === 0 ? ' class="on"' : '') + '>' + t[1] + '</button>'; }).join('') +
      '</div>' +
      '<p class="talk-hint">항목을 누르면 그 자리의 핵심을 도사님이 짚어줍니다. 자세한 풀이는 아래 심층 리포트에 이어집니다.</p>' +
      '</div></div>';

    /* 한눈에 보는 요약 */
    html += '<div class="card block">' +
      '<h3><span class="dot"></span>한눈에 보는 요약</h3>' +
      '<div class="chips">' +
      '<span class="chip">일간 ' + g.name + '</span>' +
      '<span class="chip">일주 ' + chart.dayMaster.ilju + ' (' + chart.dayMaster.iljuHanja + ')</span>' +
      '<span class="chip">' + chart.dayMaster.animal + '띠</span>' +
      '<span class="chip">' + chart.strength + '</span>' +
      '<span class="chip">용신 ' + chart.yongsin.elem + ' · 기신 ' + chart.yongsin.gisin + '</span>' +
      '<span class="chip">' + (d.current ? '대운 ' + d.current.ganzi + ' (' + d.current.startAge + '~' + d.current.endAge + '세)' : '대운 시작 전') + '</span>' +
      '<span class="chip">2027 ' + y27.ganSipsin + '</span>' +
      '</div>' +
      '<div class="quote">' + esc(g.personality.split('.')[0]) + '.</div>' +
      '<p style="color:var(--muted);font-size:14px;margin:0">' + esc(j.life) + '</p>' +
      '<p style="color:var(--muted-2);font-size:12.5px;margin:12px 0 0">' + esc(lunarTxt) + ' · ' + esc(JEOL_OF_MONTH[chart.pillars.month.ji]) + ' 이후 ' + esc(chart.pillars.month.jiName) + '월 출생 · ' + chart.strength + ' (세력 ' + Math.round(chart.supportRatio * 100) + '%)</p>' +
      '</div>';

    /* 오행 */
    html += '<div class="card block">' +
      '<h3><span class="dot"></span>오행 비율</h3>' +
      '<div class="elem-list">' + renderElements(chart) + '</div>' +
      '<p style="color:var(--muted);font-size:14px;margin:14px 0 0">' + esc(lastLines.elem) + '</p>' +
      '</div>';

    /* 심층 리포트 */
    html += '<div class="report-head">' +
      '<div class="report-kicker">DEEP READING</div>' +
      '<h3>' + (theme ? esc(theme.name) + ' · ' : '') + '심층 리포트 7가지</h3>' +
      '<p>일간·일지·십신·신강신약·용신·대운·2027 세운을 겹쳐 읽은 풀이입니다. 약 ' +
      deep.totalChars.toLocaleString('ko-KR') + '자, 읽는 시간 약 ' + readMin + '분.</p>' +
      '<div class="report-tools">' +
      '<button type="button" class="btn btn-ghost btn-sm" id="deep-toggle-all">전체 펼치기</button>' +
      '<a class="btn btn-ghost btn-sm" href="#sec-summary">총평부터 읽기</a>' +
      '</div>' +
      '</div>';

    html += '<nav class="report-toc" aria-label="심층 리포트 목차">' +
      secs.map(function (s) {
        return '<a href="#sec-' + s.key + '" data-jump="' + s.key + '">' + s.no + ' ' + esc(s.title) + '</a>';
      }).join('') + '</nav>';

    html += '<div class="deep-list">' +
      secs.map(function (s, i) {
        var art = deepSectionHTML(s, i, secs.length, secs[i + 1] ? secs[i + 1].title : '');
        if (theme && theme.focus && theme.focus.indexOf(s.key) >= 0) {
          art = art.replace('class="card deep-sec', 'class="card deep-sec focus');
        }
        return art;
      }).join('') +
      '</div>';

    /* 액션 */
    html += '<div class="actions">' +
      '<button class="btn btn-primary" id="save-card">결과 카드 저장</button>' +
      '<button class="btn btn-ghost" id="share-btn">카톡·SNS로 공유</button>' +
      '<button class="btn btn-ghost" id="copy-link">링크 복사</button>' +
      '<a class="btn btn-ghost" href="compatibility.html">궁합 보기</a>' +
      '<button class="btn btn-ghost" id="again-btn">다시 풀기</button>' +
      '</div>';

    /* 다른 테마로 보기 */
    if (theme) {
      var others = T.list.filter(function (t) {
        return t.key !== theme.key && t.cat === theme.cat && t.focus.length;
      }).concat(T.list.filter(function (t) {
        return t.key !== theme.key && t.cat !== theme.cat && t.focus.length;
      })).slice(0, 8);
      html += '<div class="theme-switch"><h4>같은 사주로 다른 테마 보기</h4><div class="chips">' +
        others.map(function (t) {
          return '<button type="button" class="chip" data-theme="' + t.key + '">' + esc(t.name) + '</button>';
        }).join('') +
        '<a class="chip" href="compatibility.html">궁합 사주</a>' +
        '</div></div>';
    }

    html += '<p class="note">이 결과는 사주 명리학의 기본 규칙(절기·입춘 기준)으로 계산한 참고용 풀이입니다. 일주는 자정(00:00)에 바뀌는 것으로 계산했고, 태어난 시각을 모르면 시주를 뺀 여섯 글자로 풀이합니다. 대운은 3일=1년 환산으로 시작 나이를 근사했고, 용신은 계절·세력 분포·조후를 함께 본 근사치입니다. 운세는 재미와 참고로만 봐 주세요.</p>';

    host.innerHTML = html;

    /* 말풍선 탭 */
    var talkText = qs('#talk-text');
    function showTalk(key) {
      var v = lastLines[key];
      var text = Array.isArray(v) ? v.join(' ') : (v || '');
      typeText(talkText, text, 16);
    }
    qsa('#talk-tabs button').forEach(function (b) {
      b.addEventListener('click', function () {
        qsa('#talk-tabs button').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        showTalk(b.getAttribute('data-k'));
      });
    });
    if (theme && T.intro) typeText(talkText, T.intro(theme, chart), 20);
    else showTalk('greeting');

    /* 아코디언 */
    function openSection(sec, scroll) {
      if (!sec) return;
      sec.classList.add('open');
      var head = qs('.deep-head', sec);
      if (head) head.setAttribute('aria-expanded', 'true');
      if (scroll) {
        var y = sec.getBoundingClientRect().top + global.pageYOffset - 74;
        global.scrollTo({ top: y, behavior: 'smooth' });
      }
    }
    qsa('.deep-sec .deep-head').forEach(function (head) {
      head.addEventListener('click', function () {
        var sec = head.parentNode;
        var open = sec.classList.toggle('open');
        head.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    });
    qsa('.deep-next').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = +btn.getAttribute('data-next');
        var sec = qsa('.deep-sec')[idx];
        openSection(sec, true);
      });
    });
    qsa('.report-toc a').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var key = a.getAttribute('data-jump');
        openSection(qs('#sec-' + key), true);
      });
    });
    var toggleAll = qs('#deep-toggle-all');
    if (toggleAll) {
      toggleAll.addEventListener('click', function () {
        var allOpen = qsa('.deep-sec').every(function (s) { return s.classList.contains('open'); });
        qsa('.deep-sec').forEach(function (s) {
          s.classList.toggle('open', !allOpen);
          var h = qs('.deep-head', s);
          if (h) h.setAttribute('aria-expanded', allOpen ? 'false' : 'true');
        });
        toggleAll.textContent = allOpen ? '전체 펼치기' : '전체 접기';
      });
    }

    qs('#save-card').addEventListener('click', function () { saveCard(chart); });
    qs('#share-btn').addEventListener('click', function () { share(chart); });
    qs('#copy-link').addEventListener('click', function () {
      copyText(shareText(chart) + '\n' + location.href, '링크와 결과 요약을 복사했어요');
    });
    qs('#again-btn').addEventListener('click', function () {
      var r = qs('#result');
      r.classList.remove('show');
      setHash(null);
      qs('#saju-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    qsa('.theme-switch [data-theme]').forEach(function (b) {
      b.addEventListener('click', function () { openTheme(b.getAttribute('data-theme'), chart); });
    });

    var res = qs('#result');
    res.classList.add('show');
    setTimeout(scrollResult, 60);
  }

  /* ---------- 테마 카드 / 피드 ---------- */
  function badgeHTML(t) {
    if (!t.badge) return '';
    var cls = t.badge === 'BEST' ? 'best' : t.badge === '인기' ? 'pop' : 'rec';
    var label = t.badge === 'BEST' ? '★ BEST' : t.badge;
    return '<span class="badge ' + cls + '">' + label + '</span>';
  }

  function fcardHTML(t) {
    return '<button type="button" class="fcard" data-tone="' + t.tone + '" data-theme="' + t.key + '" aria-label="' + esc(t.name) + ' 무료로 보기">' +
      '<span class="fcard-art">' +
      '<span class="fcard-glyph" aria-hidden="true">' + t.glyph + '</span>' +
      '<span class="fcard-top">' + badgeHTML(t) + '</span>' +
      '<span class="fcard-hook">' + t.hook + '</span>' +
      '<span class="fcard-quote">“' + esc(t.quote) + '”</span>' +
      '<span class="fcard-cta">무료로 보기 →</span>' +
      '</span>' +
      '<img class="fcard-mascot" src="mascot.webp" alt="" width="120" height="201" loading="lazy" decoding="async">' +
      '</button>';
  }

  function tcardHTML(t) {
    return '<button type="button" class="tcard" data-tone="' + t.tone + '" data-theme="' + t.key + '">' +
      '<span class="tcard-art">' +
      '<span class="tcard-glyph" aria-hidden="true">' + t.glyph + '</span>' +
      (t.badge ? '<span class="tcard-badge">' + badgeHTML(t) + '</span>' : '') +
      '<span class="tcard-hook">' + t.hook + '</span>' +
      '<img class="tcard-mascot" src="mascot.webp" alt="" width="80" height="134" loading="lazy" decoding="async">' +
      '</span>' +
      '<span class="tcard-body"><span class="tcard-name">' + esc(t.name) + '</span>' +
      '<span class="tcard-cta">무료로 보기 →</span>' +
      '<span class="tcard-sub">' + esc(t.sub) + '</span></span>' +
      '</button>';
  }

  function renderFeed() {
    var chipRow = qs('#chip-row');
    var host = qs('#feed');
    if (!chipRow || !host || !T) return;

    chipRow.className = 'chips-row';
    chipRow.innerHTML = T.cats.map(function (c) {
      return '<button type="button" class="chip-btn' + (c.key === 'all' ? ' on' : '') + '" data-cat="' + c.key + '" role="tab" aria-selected="' + (c.key === 'all') + '">' + c.label + '</button>';
    }).join('');

    host.innerHTML = T.cats.filter(function (c) { return c.key !== 'all'; }).map(function (c) {
      var items = T.list.filter(function (t) { return t.cat === c.key; });
      return '<section class="feed-sec" data-cat="' + c.key + '" id="cat-' + c.key + '">' +
        '<div class="sec-head"><span class="sec-kicker">' + c.label + '</span>' +
        '<h2>' + c.title + '<span class="sec-count">' + items.length + '가지</span></h2>' +
        '<p>' + c.sub + '</p></div>' +
        '<div class="tgrid">' + items.map(tcardHTML).join('') + '</div></section>';
    }).join('');

    var ft = qs('#featured-track');
    if (ft) {
      ft.innerHTML = T.list.filter(function (t) { return t.featured && t.focus.length; }).map(fcardHTML).join('');
      ft.addEventListener('click', function (e) {
        var b = e.target.closest ? e.target.closest('[data-theme]') : null;
        if (b) openTheme(b.getAttribute('data-theme'));
      });
    }

    chipRow.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-cat]') : null;
      if (b) filterFeed(b.getAttribute('data-cat'));
    });
    host.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-theme]') : null;
      if (b) openTheme(b.getAttribute('data-theme'));
    });
  }

  function filterFeed(cat) {
    qsa('#chip-row [data-cat]').forEach(function (b) {
      var on = b.getAttribute('data-cat') === cat;
      b.classList.toggle('on', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    var feat = qs('#featured-section');
    if (feat) feat.classList.toggle('is-hidden', cat !== 'all');
    qsa('#feed .feed-sec').forEach(function (s) {
      s.classList.toggle('is-hidden', cat !== 'all' && s.getAttribute('data-cat') !== cat);
    });
    var target = cat === 'all' ? qs('#featured-section') : qs('#cat-' + cat);
    if (target) scrollPastBars(target);
  }

  function scrollOffset() {
    var a = qs('.appbar'), c = qs('.chipbar');
    return (a ? a.offsetHeight : 0) + (c ? c.offsetHeight : 0) + 6;
  }

  function scrollPastBars(el, smooth) {
    var top = el.getBoundingClientRect().top + global.pageYOffset - scrollOffset();
    global.scrollTo({ top: Math.max(0, top), behavior: smooth === false ? 'auto' : 'smooth' });
  }

  function scrollResult() {
    var r = qs('#result');
    if (r) scrollPastBars(r, false);
  }

  /* 테마 열기: 저장된 생년월일이 있으면 원클릭, 없으면 입력으로 안내 */
  function openTheme(key, chart) {
    var t = T && T.map[key];
    if (!t) return;
    if (t.href) { location.href = t.href; return; }
    var c = chart || lastChart || buildFromProfile();
    if (!c) { pendingTheme = key; askProfile(t); return; }
    renderResult(c, key);
    setHash(key);
  }

  function askProfile(t) {
    var form = qs('#saju-form');
    if (!form) { location.href = 'index.html#theme-' + t.key; return; }
    var hint = qs('#form-hint');
    if (hint) hint.textContent = '‘' + t.name + '’ 볼 생일만 넣으면 돼';
    var cal = qs('#cal-hint');
    if (cal) cal.textContent = '‘' + t.name + '’ 테마로 바로 풀어드리지. 생일과 태어난 시각만 알려주게.';
    form.classList.remove('attn');
    void form.offsetWidth;
    form.classList.add('attn');
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    toast('‘' + t.name + '’를 보려면 생년월일만 알려주게');
  }

  function shareText(chart) {
    return '🔮 ' + (chart.input.name || '나') + '의 사주: ' +
      chart.dayMaster.ilju + '(' + chart.dayMaster.iljuHanja + ') · ' +
      chart.dayMaster.animal + '띠 · ' + chart.dayMaster.elem + ' 기운 / ' +
      '2027 정미년 ' + chart.years[1].ganSipsin + ' 운';
  }

  function copyText(text, msg) {
    function fallback() {
      var ta = doc.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      doc.body.appendChild(ta);
      ta.select();
      try { doc.execCommand('copy'); toast(msg || '복사했어요'); } catch (e) { toast('복사에 실패했어요'); }
      doc.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast(msg || '복사했어요'); }, fallback);
    } else fallback();
  }

  function share(chart) {
    var data = {
      title: '운세도사 — 무료 사주풀이',
      text: shareText(chart),
      url: location.href
    };
    if (navigator.share) {
      navigator.share(data).catch(function () { });
    } else {
      copyText(data.text + '\n' + data.url, '공유 문구를 복사했어요. 카톡에 붙여넣으세요!');
    }
  }

  /* ---------- 결과 카드 이미지 ---------- */
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  var ELEM_HEX = { '목': '#5aa36f', '화': '#d9604f', '토': '#c9a44c', '금': '#a9b4c2', '수': '#4f7fb8' };

  function saveCard(chart) {
    var W = 1080, H = 1350;
    var cv = doc.createElement('canvas');
    cv.width = W; cv.height = H;
    var ctx = cv.getContext('2d');

    var ready = doc.fonts && doc.fonts.load ? doc.fonts.load('700 60px "Noto Serif KR"', '가나다') : Promise.resolve();
    var mi = new Image();
    var mascotReady = new Promise(function (res) {
      mi.onload = function () { res(true); };
      mi.onerror = function () { res(false); };
      mi.src = 'mascot.webp';
    });
    /* file:// 로 열면 이미지를 캔버스에 그릴 때 보안 오류가 나므로 미리 확인한다 */
    function canDraw(img) {
      try {
        var t = doc.createElement('canvas');
        t.width = t.height = 1;
        var c2 = t.getContext('2d');
        c2.drawImage(img, 0, 0, 1, 1);
        c2.getImageData(0, 0, 1, 1);
        return true;
      } catch (e) { return false; }
    }
    Promise.all([ready.catch(function () { }), mascotReady]).then(function (r) {
      var hasMascot = r[1] && canDraw(mi);
      var g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, '#0d1220');
      g.addColorStop(0.55, '#121a2c');
      g.addColorStop(1, '#0a0e18');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      var glow = ctx.createRadialGradient(880, 120, 20, 880, 120, 520);
      glow.addColorStop(0, 'rgba(216,178,106,0.32)');
      glow.addColorStop(1, 'rgba(216,178,106,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);

      ctx.strokeStyle = 'rgba(216,178,106,0.55)';
      ctx.lineWidth = 2;
      roundRect(ctx, 40, 40, W - 80, H - 80, 34);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(216,178,106,0.18)';
      roundRect(ctx, 56, 56, W - 112, H - 112, 26);
      ctx.stroke();

      if (hasMascot) {
        ctx.drawImage(mi, 832, 44, 158, 268);
      }

      ctx.fillStyle = '#d8b268';
      ctx.font = '600 26px "Noto Sans KR", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('운세도사 · 무료 사주풀이', 92, 128);

      var name = chart.input.name || '나';
      ctx.fillStyle = '#f8f2e4';
      ctx.font = '700 74px "Noto Serif KR", serif';
      ctx.fillText(name + '님의 사주', 92, 236);

      var sub = chart.solar.y + '.' + padded(chart.solar.m) + '.' + padded(chart.solar.d) + ' · ' +
        (chart.input.hour === null ? '시간 모름' : padded(chart.input.hour) + ':' + padded(chart.input.minute)) +
        ' · ' + (chart.input.gender === 'f' ? '여성' : '남성');
      ctx.fillStyle = 'rgba(232,228,218,0.6)';
      ctx.font = '400 27px "Noto Sans KR", sans-serif';
      ctx.fillText(sub, 92, 288);

      /* 사주 네 기둥 */
      var order = ['년주', '월주', '일주', '시주'];
      var keys = ['year', 'month', 'day', 'hour'];
      var bw = 196, bh = 250, gap = 18, x0 = 92, y0 = 320;
      keys.forEach(function (k, i) {
        var p = chart.pillars[k];
        var x = x0 + i * (bw + gap);
        ctx.fillStyle = (k === 'day') ? 'rgba(216,178,106,0.14)' : 'rgba(255,255,255,0.045)';
        roundRect(ctx, x, y0, bw, bh, 22);
        ctx.fill();
        ctx.strokeStyle = (k === 'day') ? 'rgba(216,178,106,0.75)' : 'rgba(255,255,255,0.09)';
        ctx.lineWidth = (k === 'day') ? 2.5 : 1.5;
        roundRect(ctx, x, y0, bw, bh, 22);
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(232,228,218,0.55)';
        ctx.font = '400 22px "Noto Sans KR", sans-serif';
        ctx.fillText(order[i], x + bw / 2, y0 + 40);

        if (!p) {
          ctx.fillStyle = 'rgba(232,228,218,0.4)';
          ctx.font = '700 44px "Noto Serif KR", serif';
          ctx.fillText('?', x + bw / 2, y0 + 130);
          return;
        }
        ctx.fillStyle = ELEM_HEX[p.ganElem];
        ctx.font = '700 60px "Noto Serif KR", serif';
        ctx.fillText(p.ganName, x + bw / 2, y0 + 108);
        ctx.fillStyle = ELEM_HEX[p.jiElem];
        ctx.fillText(p.jiName, x + bw / 2, y0 + 176);
        ctx.fillStyle = 'rgba(232,228,218,0.5)';
        ctx.font = '400 22px "Noto Sans KR", sans-serif';
        ctx.fillText(p.hanja, x + bw / 2, y0 + 214);
      });

      /* 한 줄 요약 */
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(216,178,106,0.95)';
      ctx.font = '600 29px "Noto Sans KR", sans-serif';
      ctx.fillText(chart.dayMaster.ilju + ' · ' + chart.dayMaster.animal + '띠 · ' + chart.strength + ' · ' + chart.years[1].ganSipsin + ' 운', 92, 646);

      var ginfo = F.GAN[chart.dayMaster.gan];
      wrapText(ctx, ginfo.personality, 92, 700, W - 184, 42, '400 29px "Noto Sans KR", sans-serif', 'rgba(232,228,218,0.88)', 3);

      /* 오행 바 */
      var em = ['목', '화', '토', '금', '수'];
      var maxV = Math.max(1, Math.max.apply(null, em.map(function (e) { return chart.elements[e]; })));
      var by = 856, rowH = 46;
      em.forEach(function (e, i) {
        var y = by + i * rowH;
        ctx.fillStyle = ELEM_HEX[e];
        ctx.font = '600 25px "Noto Sans KR", sans-serif';
        ctx.fillText(e, 92, y + 24);
        ctx.fillStyle = 'rgba(255,255,255,0.09)';
        roundRect(ctx, 140, y + 4, W - 320, 20, 10);
        ctx.fill();
        var wBar = Math.max(10, (W - 320) * (chart.elements[e] / maxV));
        ctx.fillStyle = ELEM_HEX[e];
        roundRect(ctx, 140, y + 4, wBar, 20, 10);
        ctx.fill();
        ctx.fillStyle = 'rgba(232,228,218,0.6)';
        ctx.font = '400 22px "Noto Sans KR", sans-serif';
        ctx.fillText(chart.elements[e] + '개', W - 156, y + 25);
      });

      /* 2027 */
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      roundRect(ctx, 92, 1128, W - 184, 112, 20);
      ctx.fill();
      ctx.fillStyle = '#f2d9a3';
      ctx.font = '700 28px "Noto Serif KR", serif';
      ctx.fillText('2027 정미년 · ' + chart.years[1].ganSipsin + ' 운', 118, 1176);
      ctx.fillStyle = 'rgba(232,228,218,0.72)';
      ctx.font = '400 23px "Noto Sans KR", sans-serif';
      ctx.fillText('사주풀이 · 궁합 · 신년운세 → 운세도사', 118, 1214);

      cv.toBlob(function (blob) {
        if (!blob) { toast('이미지를 만들지 못했어요'); return; }
        var url = URL.createObjectURL(blob);
        var a = doc.createElement('a');
        a.href = url;
        a.download = '운세도사_사주카드_' + (chart.input.name || '나') + '.png';
        doc.body.appendChild(a); a.click(); doc.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
        toast('결과 카드를 저장했어요');
      }, 'image/png');
    });
  }

  function padded(n) { return String(n).padStart(2, '0'); }

  function wrapText(ctx, text, x, y, maxW, lineH, font, color, maxLines) {
    ctx.font = font;
    ctx.fillStyle = color;
    var words = String(text).split(' ');
    var line = '', lines = [];
    words.forEach(function (w) {
      var test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; }
      else line = test;
    });
    if (line) lines.push(line);
    if (maxLines && lines.length > maxLines) {
      lines = lines.slice(0, maxLines);
      lines[maxLines - 1] = lines[maxLines - 1].replace(/.$/, '…');
    }
    lines.forEach(function (l, i) { ctx.fillText(l, x, y + i * lineH); });
  }

  /* ---------- 메인 페이지 ---------- */
  function initHome() {
    var form = qs('#saju-form');
    if (!form) return;
    var y = qs('#year'), m = qs('#month'), d = qs('#day'), h = qs('#hour'), mi = qs('#minute');
    fillDateSelects(y, m, d, 2026);
    fillTimeSelects(h, mi);
    refreshDays(y, m, d);

    y.addEventListener('change', function () { refreshDays(y, m, d); });
    m.addEventListener('change', function () { refreshDays(y, m, d); });

    var cal = 'solar', gender = 'm';
    function paintCal(v) {
      qsa('#cal-seg button').forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-cal') === v); });
      qs('#leap-wrap').hidden = v !== 'lunar';
      var t = qs('#cal-hint');
      if (t) t.textContent = v === 'lunar'
        ? '음력 생일이면 윤달 여부도 확인해 주세요. (1900~2035년 지원)'
        : '주민등록상 생일을 그대로 넣으면 됩니다. 음력은 1900~2035년까지 지원.';
    }
    function paintGender(g) {
      qsa('#gender-seg button').forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-g') === g); });
    }
    qsa('#cal-seg button').forEach(function (b) {
      b.addEventListener('click', function () { cal = b.getAttribute('data-cal'); paintCal(cal); });
    });
    qsa('#gender-seg button').forEach(function (b) {
      b.addEventListener('click', function () { gender = b.getAttribute('data-g'); paintGender(gender); });
    });

    var noTime = qs('#no-time');
    noTime.addEventListener('change', function () {
      h.disabled = noTime.checked;
      mi.disabled = noTime.checked;
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var profile = {
        year: +y.value, month: +m.value, day: +d.value,
        hour: noTime.checked ? null : +h.value,
        minute: noTime.checked ? 0 : +mi.value,
        calendar: cal,
        leap: qs('#leap') ? qs('#leap').checked : false,
        gender: gender,
        name: qs('#name').value
      };
      var chart = S.build(profile);
      if (chart.error) { toast(chart.error); return; }
      saveProfile(profile);
      var key = pendingTheme || themeFromHash();
      pendingTheme = null;
      renderResult(chart, key);
      setHash(key);
    });

    /* 마지막 입력 복원 */
    var p = readProfile();
    if (p) {
      if (p.calendar === 'lunar') { cal = 'lunar'; paintCal('lunar'); }
      if (p.leap) { var lw = qs('#leap'); if (lw) lw.checked = true; }
      if (p.gender === 'f') { gender = 'f'; paintGender('f'); }
      y.value = p.year; m.value = p.month;
      refreshDays(y, m, d, p.day);
      if (p.hour !== null && p.hour !== undefined) {
        h.value = p.hour; mi.value = p.minute || 0;
      } else {
        noTime.checked = true;
        h.disabled = true; mi.disabled = true;
      }
      if (p.name) qs('#name').value = p.name;
    }
  }

  /* ---------- 궁합 페이지 ---------- */
  function initCompat() {
    var form = qs('#compat-form');
    if (!form) return;
    var a = { y: qs('#a-year'), m: qs('#a-month'), d: qs('#a-day') };
    var b = { y: qs('#b-year'), m: qs('#b-month'), d: qs('#b-day') };
    fillDateSelects(a.y, a.m, a.d, 2026);
    fillDateSelects(b.y, b.m, b.d, 2026);
    a.y.value = 1996; b.y.value = 1996;
    refreshDays(a.y, a.m, a.d); refreshDays(b.y, b.m, b.d);
    [a, b].forEach(function (o) {
      o.y.addEventListener('change', function () { refreshDays(o.y, o.m, o.d); });
      o.m.addEventListener('change', function () { refreshDays(o.y, o.m, o.d); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ca = S.build({ year: a.y.value, month: a.m.value, day: a.d.value, hour: null, gender: qs('#a-gender').value, name: qs('#a-name').value });
      var cb = S.build({ year: b.y.value, month: b.m.value, day: b.d.value, hour: null, gender: qs('#b-gender').value, name: qs('#b-name').value });
      if (ca.error) { toast('첫 번째 생일: ' + ca.error); return; }
      if (cb.error) { toast('두 번째 생일: ' + cb.error); return; }
      var r = S.compatibility(ca, cb);
      var host = qs('#compat-result');
      var nmA = ca.input.name || '첫 번째 분';
      var nmB = cb.input.name || '두 번째 분';
      var lines = F.mascotLines(ca);
      host.innerHTML =
        '<div class="card dosa-talk">' +
        '<div class="stage"><img class="mascot" src="mascot.webp" alt="궁합을 풀어주는 도사 캐릭터" width="132" height="221"></div>' +
        '<div><div class="bubble"><div class="who"><i></i>도사님의 궁합 풀이</div>' +
        '<div id="compat-talk" style="min-height:70px"></div></div></div></div>' +
        '<div class="card block" style="text-align:center">' +
        '<div style="font-family:var(--serif);font-size:56px;color:var(--gold-2);line-height:1.1">' + r.score + '<span style="font-size:22px;color:var(--muted)">점</span></div>' +
        '<div style="color:var(--gold);font-size:15px;letter-spacing:.1em">' + r.grade + '</div>' +
        '<div class="elem-track" style="margin:18px 0 6px"><div class="elem-fill" style="width:' + r.score + '%;background:linear-gradient(90deg,#4f7fb8,#d8b268,#d9604f)"></div></div>' +
        '<p style="color:var(--muted);font-size:13.5px;margin:10px 0 0">' + esc(nmA) + ' · ' + ca.dayMaster.ilju + ' (' + ca.dayMaster.iljuHanja + ') / ' +
        esc(nmB) + ' · ' + cb.dayMaster.ilju + ' (' + cb.dayMaster.iljuHanja + ')</p>' +
        '</div>' +
        '<div class="card block"><h3><span class="dot"></span>두 사람의 연결고리</h3>' +
        r.notes.map(function (n) {
          return '<p style="margin:10px 0;font-size:14.5px">' +
            '<span style="color:' + (n.type === 'good' ? '#8fd0a5' : n.type === 'warn' ? '#e0a097' : 'var(--muted)') + '">●</span> ' + esc(n.text) + '</p>';
        }).join('') +
        '</div>' +
        '<div class="pair block">' +
        '<div class="card"><h3><span class="dot"></span>' + esc(nmA) + '</h3>' +
        '<div class="chips"><span class="chip">' + ca.dayMaster.ilju + '</span><span class="chip">' + ca.dayMaster.animal + '띠</span><span class="chip">' + ca.maxElem + ' 강 · ' + ca.minElem + ' 약</span></div>' +
        '<p style="font-size:14px;color:var(--muted);margin:10px 0 0">' + esc(F.GAN[ca.dayMaster.gan].personality.split('.')[0]) + '.</p></div>' +
        '<div class="card"><h3><span class="dot"></span>' + esc(nmB) + '</h3>' +
        '<div class="chips"><span class="chip">' + cb.dayMaster.ilju + '</span><span class="chip">' + cb.dayMaster.animal + '띠</span><span class="chip">' + cb.maxElem + ' 강 · ' + cb.minElem + ' 약</span></div>' +
        '<p style="font-size:14px;color:var(--muted);margin:10px 0 0">' + esc(F.GAN[cb.dayMaster.gan].personality.split('.')[0]) + '.</p></div>' +
        '</div>' +
        '<div class="actions"><button class="btn btn-ghost" id="compat-share">궁합 공유하기</button>' +
        '<a class="btn btn-ghost" href="index.html">내 사주 보기</a></div>' +
        '<p class="note">궁합 점수는 일간·일지의 생극 관계와 오행 보완도를 바탕으로 계산한 참고용 지표입니다. 점수보다 두 사람이 어떤 부분에서 맞고 어긋나는지가 더 중요합니다.</p>';

      var shA = F.GAN[ca.dayMaster.gan].short, shB = F.GAN[cb.dayMaster.gan].short;
      typeText(qs('#compat-talk'), josa(nmA, '과', '와') + ' ' + nmB + ', 두 사람의 여덟 글자를 마주 보게 했네. ' +
        (shA === shB ? '일간은 둘 다 ' + shA + ', 일지는 ' : '일간은 ' + josa(shA, '과', '와') + ' ' + shB + ', 일지는 ') +
        josa(F.JI[ca.pillars.day.ji].name, '과', '와') + ' ' + F.JI[cb.pillars.day.ji].name + '일세. ' +
        '점수는 ' + r.score + '점, ' + josa(r.grade, '이라', '라') + ' 할 수 있겠구만. 허허.', 24);

      host.classList.add('show');
      host.scrollIntoView({ behavior: 'smooth', block: 'start' });
      var sh = qs('#compat-share');
      if (sh) sh.addEventListener('click', function () {
        copyText('💞 ' + nmA + ' · ' + nmB + ' 궁합 ' + r.score + '점 (' + r.grade + ')\n' + location.href, '궁합 결과를 복사했어요');
      });
    });
  }

  /* ---------- 가이드 페이지 ---------- */
  function initGuide() {
    var host = qs('#ilju-list');
    if (!host) return;
    var list = F.iljuList();
    host.innerHTML = list.map(function (i) {
      return '<a class="ilju-item" href="index.html" title="' + esc(i.oneLine) + '"><div class="no">' + (i.idx < 10 ? '0' + i.idx : i.idx) + '번째</div>' +
        '<div class="nm">' + i.hanja + ' <span style="font-size:14px;color:var(--muted)">' + i.hangul + '</span></div>' +
        '<div class="kw">' + esc(i.keyword) + '</div></a>';
    }).join('');

    var elemHost = qs('#elem-guide');
    if (elemHost) {
      elemHost.innerHTML = ['목', '화', '토', '금', '수'].map(function (e) {
        var d = F.ELEM[e];
        return '<div class="card elem-card"><h3><span class="dot"></span><span class="e-' + ELEM_CLASS[e] + '">' + e + ' · ' + d.nature + '</span></h3>' +
          '<p>' + esc(d.advice) + '</p>' +
          '<div class="chips"><span class="chip">' + d.color + '</span><span class="chip">' + d.place + '</span><span class="chip">' + d.time + '</span><span class="chip">' + d.body + '</span></div></div>';
      }).join('');
    }
  }

  /* ---------- 2027 페이지 ---------- */
  function initNewYear() {
    var host = qs('#year2027-grid');
    if (!host) return;
    var order = ['비견', '겁재', '식신', '상관', '편재', '정재', '정관', '편관', '정인', '편인'];
    host.innerHTML = order.map(function (k) {
      var s = F.SIPSIN[k];
      return '<div class="card elem-card"><h3 style="font-size:14.5px"><span class="dot"></span>' + k + ' <span style="color:var(--muted);font-size:11.5px;font-weight:400">' + s.hanja + '</span></h3>' +
        '<p>' + esc(F.YEAR2027[k]) + '</p></div>';
    }).join('');
  }

  /* ---------- 공통 실행 ---------- */
  function init() {
    markNav();
    heroBubbleCycle();
    if (PAGE === 'index') {
      renderFeed();
      initHome();
      var k = themeFromHash();
      if (k) setTimeout(function () { openTheme(k); }, 120);
      global.addEventListener('hashchange', function () {
        var hk = themeFromHash();
        if (hk) openTheme(hk);
      });
    }
    if (PAGE.indexOf('compat') === 0) initCompat();
    if (PAGE === 'guide') initGuide();
    if (PAGE.indexOf('newyear') === 0) initNewYear();
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();

  global.UI = { toast: toast, typeText: typeText, openTheme: openTheme };
})(window);
