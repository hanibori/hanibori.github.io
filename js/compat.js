/* ============================================================
   운세도사 · 심층 궁합 리포트 엔진 (compat.js)
   - 두 사주의 일간·일지·오행·십신·세운을 겹쳐 7개 챕터로 조합
   - 서버·API 없이 브라우저에서 문장을 만든다 (window.Compat)
   ============================================================ */
(function (global) {
  'use strict';

  var COMPAT = {};

  var ELEMS = ['목', '화', '토', '금', '수'];
  var SAENG = { '목': '화', '화': '토', '토': '금', '금': '수', '수': '목' };
  var GEUK = { '목': '토', '화': '금', '토': '수', '금': '목', '수': '화' };
  var GEUK_REV = { '토': '목', '금': '화', '수': '토', '목': '금', '화': '수' };
  var SAENG_REV = { '화': '목', '토': '화', '금': '토', '수': '금', '목': '수' };
  var GAN_ELEM = ['목', '목', '화', '화', '토', '토', '금', '금', '수', '수'];
  var JI_ELEM = ['수', '토', '목', '목', '토', '화', '화', '토', '금', '금', '토', '수'];

  /* ---------- 합·충·형·파·해 ---------- */
  var GAN_HAP = [[0, 5, '토'], [1, 6, '금'], [2, 7, '수'], [3, 8, '목'], [4, 9, '화']];
  var GAN_CHUNG = [[0, 6], [1, 7], [2, 8], [3, 9]];
  var JI_YUKHAP = [[0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7]];
  var JI_CHUNG = [[0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11]];
  var JI_SAMHAP = [[8, 0, 4], [11, 3, 7], [2, 6, 10], [5, 9, 1]];
  var JI_HYUNG = [[2, 5], [5, 8], [2, 8], [1, 10], [10, 7], [1, 7], [0, 3]];
  var JI_SELF_HYUNG = [4, 6, 9, 11];
  var JI_PA = [[0, 9], [6, 3], [8, 5], [2, 11], [4, 1], [10, 7]];
  var JI_HAE = [[0, 7], [1, 6], [2, 5], [3, 4], [8, 11], [9, 10]];

  function pairIn(list, a, b) {
    for (var i = 0; i < list.length; i++) {
      if ((list[i][0] === a && list[i][1] === b) || (list[i][0] === b && list[i][1] === a)) return list[i];
    }
    return null;
  }
  function ganHapOf(a, b) {
    var p = pairIn(GAN_HAP, a, b);
    return p ? p[2] : null;
  }
  function jiHapOf(a, b) { return !!pairIn(JI_YUKHAP, a, b); }
  function jiSamhapOf(a, b) {
    for (var i = 0; i < JI_SAMHAP.length; i++) {
      var g = JI_SAMHAP[i];
      if (g.indexOf(a) >= 0 && g.indexOf(b) >= 0 && a !== b) return g;
    }
    return null;
  }
  function jiChungOf(a, b) { return !!pairIn(JI_CHUNG, a, b); }
  function jiHyungOf(a, b) {
    if (a === b && JI_SELF_HYUNG.indexOf(a) >= 0) return '자형';
    return pairIn(JI_HYUNG, a, b) ? '형' : null;
  }
  function jiPaOf(a, b) { return !!pairIn(JI_PA, a, b); }
  function jiHaeOf(a, b) { return !!pairIn(JI_HAE, a, b); }

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
    if (j === 8) return String(w) + '로';   /* ㄹ 받침은 '로' */
    return String(w) + (j > 0 ? '으로' : '로');
  }
  function ira(w) { return josa(w, '이라', '라'); }

  /* ---------- 문장 데이터 : 일간 ---------- */
  var GAN_ATTRACT = [
    '곧게 뻗은 나무처럼 단정하고, 말에 자기 기준이 묻어납니다. 처음 만난 자리에서도 “이 사람은 어설픈 타협을 하지 않겠다”는 인상을 줍니다.',
    '부드럽고 눈치가 빨라 처음 만난 사람도 금세 편해집니다. 다만 그 편안함 뒤에 조용한 계산이 있다는 걸 아는 사람은 드뭅니다.',
    '들어서는 순간 자리의 온도가 올라갑니다. 웃음과 말이 크고 분명해서 좋고 싫음이 얼굴에 그대로 적혀 있습니다.',
    '조용하고 다정한데, 말할 때 상대의 눈을 정확히 봅니다. 자기 이야기는 적게 하고 남의 표정을 오래 기억합니다.',
    '말수가 적고 동작이 느긋해 처음엔 무뚝뚝해 보입니다. 대신 약속을 어기는 일이 거의 없어 두 번째 만남부터 신뢰가 쌓입니다.',
    '차분하고 실속이 있어 보입니다. 대화의 주인공이 되기보다 필요한 말을 정확히 하는 쪽이라, 함께 있으면 이상하게 안심이 됩니다.',
    '단호하고 깔끔합니다. 좋고 싫음이 분명해 호불호가 갈리지만, 한 번 내 편이라고 생각하면 앞장서서 챙깁니다.',
    '세련되고 정돈된 인상입니다. 취향이 분명하고 말과 옷차림에 기준이 보여, 상대도 모르게 긴장하게 만듭니다.',
    '여유 있고 쿨해 보입니다. 큰일에도 동요하지 않는 태도가 매력이지만, 속을 잘 보여주지 않아 알 수 없는 사람으로 남습니다.',
    '조용하고 부드럽게 스며듭니다. 말수는 적은데 상대가 했던 사소한 말을 기억해 한참 뒤에 다시 꺼내 주는 사람입니다.'
  ];
  var GAN_LOVE = [
    '좋아하면 직진합니다. 애매한 관계를 못 견디고 이름을 빨리 정하고 싶어 하며, 데이트 코스도 자기가 짜는 쪽이 편합니다.',
    '상대에게 맞춰주며 시작합니다. 좋아한다는 말을 아껴 상대가 먼저 확인하게 만들고, 한 번 마음을 열면 오래 갑니다.',
    '표현이 크고 빠릅니다. 만나면 온도를 확 올려놓고, 그 열기를 유지하는 데는 생각보다 힘을 쓰지 않습니다.',
    '한 사람에게 깊게 들어갑니다. 기념일과 사소한 말을 오래 기억하고, 서운한 것을 말로 꺼내기까지 시간이 걸립니다.',
    '느리지만 단단합니다. 만나는 횟수보다 함께한 시간의 길이를 중요하게 여기고, 표현보다 행동으로 챙깁니다.',
    '챙기는 것으로 사랑합니다. 밥과 일정을 챙기는 다정함이 크지만, 그게 간섭으로 읽히는 순간 관계가 무거워집니다.',
    '의리로 갑니다. 좋아하면 끝까지 지키고, 상대가 흔들리면 더 단단하게 붙잡습니다. 말이 퉁명스러운 게 흠입니다.',
    '품위를 지키며 다가갑니다. 마음이 있어도 먼저 고백하기보다 상대가 확실한 신호를 주기를 기다립니다.',
    '쿨한 척하지만 속으로는 많이 의식합니다. 상대의 자유를 인정해 주는 사람에게 마음을 엽니다.',
    '정이 많고 섬세합니다. 상대의 기분을 먼저 알아채고 맞춰주지만, 상처를 오래 기억해 조용히 마음을 닫습니다.'
  ];
  var GAN_CONFLICT = [
    '옳고 그름을 먼저 따지다 상대의 기분을 지나칩니다. “그건 네가 틀렸어”로 시작하는 대화가 다툼의 씨앗입니다.',
    '서운함을 그 자리에서 말하지 않고 미룹니다. 나중에 엉뚱한 일로 터져 상대는 이유를 모릅니다.',
    '감정이 올라오면 말이 빨라지고 목소리가 커집니다. 그날 밤에 결론을 내버리려는 습관이 관계를 태웁니다.',
    '확인하지 않은 것을 혼자 상상해 결론을 냅니다. 상대는 아무 일도 없었는데 이상하게 서늘한 공기를 느낍니다.',
    '변경과 즉흥을 싫어해 상대의 새로운 제안을 대번에 “안 돼”로 자릅니다.',
    '걱정을 조언으로 포장해 쏟아냅니다. 상대는 챙김보다 잔소리로 듣습니다.',
    '맞는 말을 칼처럼 던집니다. 이기려는 대화가 되어 정작 마음은 전달되지 않습니다.',
    '지적과 기준이 먼저 나옵니다. 상대는 사랑받기보다 평가받는다고 느낍니다.',
    '결론을 미루고 말을 아낍니다. 상대는 “나를 별로 안 좋아하나”라는 생각을 하게 됩니다.',
    '말하지 않고 기대했다가 혼자 실망합니다. 그 실망이 쌓이면 조용히 연락이 끊깁니다.'
  ];
  var GAN_REPAIR = [
    '결론을 미루지 말고 “내가 그 부분은 틀렸어”라고 먼저 인정하면 문이 열립니다. 사과 뒤에 설명을 붙이지 않는 게 요령입니다.',
    '상대가 먼저 다가오면 받아주되 “그때 내가 서운했던 건 이거야”를 짧게 말해야 같은 일이 반복되지 않습니다.',
    '싸운 당일엔 결론을 내지 말고 하루 묵혀야 합니다. 다음 날 먼저 웃으면 대부분의 다툼이 그것으로 풀립니다.',
    '상대가 말로 확인해 주면 금방 풀립니다. “내가 혼자 상상했어”라는 한마디가 약입니다.',
    '말보다 행동이 편한 사람이라, 시간을 두고 평소처럼 챙기면 그것이 사과가 됩니다. 다만 상대는 말을 기다린다는 걸 알아야 합니다.',
    '서운한 이유를 차분히 정리해 말로 전달하면 잘 통합니다. 조언은 요청받았을 때만 꺼내는 게 좋습니다.',
    '“미안해”를 말하는 사람은 드물지만, 말하면 효과가 큽니다. 말투를 한 단계 낮추는 것만으로도 풀립니다.',
    '완벽한 사과를 준비하려다 때를 놓칩니다. 짧게라도 먼저 말하는 게 낫습니다.',
    '혼자 정리할 시간을 가진 뒤 결론을 말로 꺼내야 합니다. 침묵이 길어지면 상대는 포기합니다.',
    '서운함을 그날 말하는 연습이 필요합니다. “괜찮아?”라고 물을 때 “괜찮지 않아”라고 말할 수 있어야 합니다.'
  ];
  var GAN_LIFE = [
    '집에서도 계획표가 있어야 편합니다. 주말 계획을 세우고 지키는 것을 사랑의 증거로 여깁니다.',
    '집의 분위기와 온도를 맞추는 데 재주가 있습니다. 다만 하고 싶은 말을 미루다 보면 어느 순간 방이 조용해집니다.',
    '집에 사람이 많아도, 밖으로 나가도 좋습니다. 다만 조용한 시간이 길어지면 답답해합니다.',
    '집 안의 작은 것에 민감합니다. 조명·향·정리 상태가 마음에 걸리면 표정이 먼저 어두워집니다.',
    '집은 성(城)입니다. 살림의 큰 틀과 안정을 중시하고, 갑작스러운 일정 변경을 싫어합니다.',
    '살림은 시스템입니다. 냉장고와 생활비 통장을 정리해두고, 정해진 시간에 밥을 먹는 것을 좋아합니다.',
    '집에서도 몸을 씁니다. 고치고 만들고 움직이는 일을 맡으면 만족도가 높고, 잔소리는 줄여야 합니다.',
    '집이 깨끗해야 마음이 놓입니다. 수납과 취향을 함께 맞추면 만족도가 크게 올라갑니다.',
    '집에 오래 있기보다 움직이는 편이 좋습니다. 함께 여행하고 새로운 곳을 가는 것이 살림의 윤활유입니다.',
    '집에서 쉬는 것을 좋아합니다. 영화·음악·늦은 밤의 대화가 이 사람에게는 가장 큰 애정 표현입니다.'
  ];

  /* ---------- 문장 데이터 : 일지 ---------- */
  var JI_INNER = [
    '낮에는 조용한데 밤이 되면 생각이 많아집니다. 혼자 결론을 내고 말을 아껴, 상대가 소외감을 느끼는 순간이 있습니다.',
    '말수는 적어도 속은 깊습니다. 서운함을 오래 삭이다가 어느 날 문을 닫아버리는 것이 가장 큰 위험입니다.',
    '먼저 시작하고 먼저 이끌려 합니다. 자기 속도가 느려지는 순간을 견디지 못합니다.',
    '분위기를 읽고 맞춰주지만, 갈등을 피하려고 문제를 미루는 습관이 있습니다.',
    '큰 그림을 보려 하고 사람을 넓게 품습니다. 다만 그 넓이가 자기 경계를 흐리기도 합니다.',
    '확인하고 계산한 뒤 움직입니다. 의심이 시작되면 혼자 상상하고 혼자 상처받습니다.',
    '인정받고 싶은 마음이 큽니다. 감정이 앞서면 말이 빨라지고 그 말이 오래 남습니다.',
    '정서적 안정과 작은 정을 중시합니다. 결정을 미루다 기회를 놓치는 것이 약점입니다.',
    '효율과 정확을 따집니다. 다정함을 건너뛰고 결론부터 말해 무뚝뚝하게 들립니다.',
    '기준이 분명하고 선을 긋습니다. 그 선이 차갑게 느껴질 때가 있습니다.',
    '책임과 의리를 중시합니다. 혼자 다 짊어지려다 상대가 할 일을 빼앗습니다.',
    '마음이 넓고 낭만이 있습니다. 편안함에 기대어 표현을 게을리합니다.'
  ];
  var JI_EXPRESS = [
    '좋아한다는 말 대신 늦은 밤 연락과 정보를 보냅니다. 답장이 늦으면 곧바로 마음을 접으려 합니다.',
    '말보다 행동입니다. 밥을 챙기고 약속을 지키는 것으로 마음을 보여줍니다.',
    '표현이 앞섭니다. 좋으면 바로 말하고, 서운하면 바로 표정에 나옵니다.',
    '다정한 말과 작은 선물로 표현합니다. 갈등은 웃어넘기려 합니다.',
    '큰 결정을 함께 의논하는 것으로 사랑을 표현합니다. 잔잔한 애정 표현은 서툽니다.',
    '표현이 분명하고 온도가 높습니다. 확인과 질문이 많아 상대가 시험받는 느낌을 받을 수 있습니다.',
    '함께 밖으로 나가는 것을 사랑으로 여깁니다. 집에만 있으면 애정이 식었다고 느낍니다.',
    '말과 정으로 표현합니다. 기념일과 편지 같은 형식에 마음이 담깁니다.',
    '유쾌한 농담과 재치로 표현합니다. 진지한 대화를 피하려는 습관이 있습니다.',
    '예의와 정돈된 태도로 표현합니다. 서운함도 정중하게 말합니다.',
    '한 번 정한 사람에게는 끝까지입니다. 표현보다 책임으로 보여줍니다.',
    '편안함과 여유로 표현합니다. 함께 아무것도 하지 않아도 좋은 사이를 꿈꿉니다.'
  ];
  var JI_LIFE = [
    '밤형입니다. 늦게 자고 늦게 일어나며, 저녁 이후에 집중이 올라갑니다.',
    '아침형에 가깝고 루틴을 지킵니다. 계획이 흐트러지면 컨디션이 먼저 무너집니다.',
    '활동량이 많습니다. 아침에 일어나 몸을 움직여야 하루가 열립니다.',
    '감각적인 생활을 좋아합니다. 집 안의 빛과 냄새, 음악에 민감합니다.',
    '큰 흐름을 보고 살림의 틀을 잡습니다. 집·차·계획처럼 오래 가는 것을 좋아합니다.',
    '손이 빠르고 재주가 많습니다. 취미가 곧 부업이 되기도 합니다.',
    '사람을 만나야 기운이 삽니다. 주말에 약속이 없으면 허전합니다.',
    '느긋한 아침과 정갈한 저녁을 좋아합니다. 식사 시간의 정을 중시합니다.',
    '일정이 촘촘해야 편합니다. 빈 시간이 길면 오히려 불안합니다.',
    '정리정돈이 생활의 기본입니다. 물건 자리가 바뀌면 예민해집니다.',
    '집에 대한 책임이 큽니다. 수리·관리·보안에 신경을 씁니다.',
    '느긋하고 편안한 생활을 좋아합니다. 함께 쉬는 시간이 관계의 연료입니다.'
  ];

  /* ---------- 십신 : 상대가 나에게 주는 결 ---------- */
  var SIPSIN_GIVE = {
    '비견': { look: '친구처럼 편한 사람', body: '같은 편에 서서 내 이야기를 들어주고 내 속도로 가게 해줍니다. 다만 둘 다 주도권을 쥐려 하면 사소한 일로 자존심 싸움이 납니다.' },
    '겁재': { look: '라이벌 같은 사람', body: '나를 자극하고 더 세게 만듭니다. 비교와 경쟁이 관계의 연료가 되지만, 그 불이 과하면 서로를 태웁니다.' },
    '식신': { look: '편안하게 먹여주는 사람', body: '함께 있으면 긴장이 풀리고 밥과 일상의 즐거움을 알려줍니다. 다만 편안함이 나태함이 되지 않게 해야 합니다.' },
    '상관': { look: '나를 웃게 하고 판을 뒤집는 사람', body: '재미와 설렘을 주지만, 말이 날카로워 모르는 사이에 상처를 남깁니다.' },
    '편재': { look: '설레고 자유로운 사람', body: '새로운 세계를 보여주고 기회를 데려옵니다. 다만 붙잡으려 하면 빠르게 멀어집니다.' },
    '정재': { look: '현실을 함께 세는 사람', body: '약속과 숫자를 지키고 생활을 단단하게 만들어 줍니다. 대신 낭만이 부족하다고 느낄 수 있습니다.' },
    '편관': { look: '나를 긴장시키는 사람', body: '나를 시험하고 더 강하게 만듭니다. 긴장이 애정으로 바뀌면 강한 관계가 되고, 아니면 압박이 됩니다.' },
    '정관': { look: '나를 세워주는 사람', body: '예의와 신뢰로 나를 다루고, 관계를 공식적인 자리까지 끌고 갑니다.' },
    '편인': { look: '나를 이해하는 사람', body: '말하지 않아도 알아주는 감각이 있습니다. 다만 서로 혼자만의 시간이 필요해 거리가 생기기도 합니다.' },
    '정인': { look: '나를 감싸는 사람', body: '돌보고 가르쳐 주는 사람입니다. 고마움이 의존으로 바뀌지 않게 해야 합니다.' }
  };

  /* ---------- 오행 ---------- */
  var ELEM_FILL = {
    '목': { what: '새로운 것을 시작하고 배우는 기운', give: '없던 시작의 힘을 넣어줍니다', tip: '함께 배우는 일(클래스·전시·여행)이 두 사람에게 약이 됩니다', date: '새로 생긴 카페, 산책로, 전시, 서점' },
    '화': { what: '표현하고 드러내는 기운', give: '말과 온기를 보태줍니다', tip: '함께 웃고 떠드는 자리가 관계의 연료가 됩니다', date: '공연, 야경, 축제, 사람 많은 시장' },
    '토': { what: '중심을 잡고 안정시키는 기운', give: '흔들리는 중심을 잡아줍니다', tip: '같은 시간에 밥을 먹고 잠드는 규칙이 관계를 살립니다', date: '집밥, 전통시장, 온천, 조용한 드라이브' },
    '금': { what: '정리하고 결단하는 기운', give: '미루던 결론을 내리게 해줍니다', tip: '한 달에 한 번 집과 돈을 함께 정리하는 날을 만드세요', date: '미술관, 조용한 레스토랑, 정리 데이트' },
    '수': { what: '쉬고 생각하는 지혜의 기운', give: '과열된 마음을 식혀줍니다', tip: '말이 많아질 때 물을 마시고 10분 쉬는 규칙이 필요합니다', date: '영화, 밤 산책, 물가, 늦은 대화' }
  };
  var ELEM_OVER = {
    '목': '둘 다 시작은 잘 하는데 마무리가 약합니다. 벌인 일이 둘로 늘어나 서로 지칩니다',
    '화': '둘 다 표현이 세서 다툼이 커집니다. 말의 온도를 낮춰 줄 사람이 필요합니다',
    '토': '둘 다 고집이 세고 변화를 싫어합니다. 결정이 느려지고 생활이 굳습니다',
    '금': '둘 다 결론을 빨리 내리고 칼같이 말합니다. 상처가 쌓이면 회복이 늦습니다',
    '수': '둘 다 생각이 많고 말을 아낍니다. 문제가 있어도 오래 방치됩니다'
  };
  var ELEM_LACK_TOGETHER = {
    '목': '시작하는 힘', '화': '표현하는 온기', '토': '생활의 중심', '금': '정리하는 결단', '수': '쉬어 가는 지혜'
  };
  var ELEM_FEEL = {
    '목': '새로운 걸 같이 시작하고 싶은 마음',
    '화': '말이 많아지고 표정이 밝아지는 온기',
    '토': '이상하게 마음이 놓이는 안정감',
    '금': '미루던 걸 정리하고 싶은 결심',
    '수': '말을 멈추고 생각할 여유'
  };

  /* ---------- 점수 ---------- */
  function ganRelation(a, b) {
    var ea = GAN_ELEM[a.dayMaster.gan], eb = GAN_ELEM[b.dayMaster.gan];
    var hap = ganHapOf(a.dayMaster.gan, b.dayMaster.gan);
    if (hap) return { code: 'hap', ea: ea, eb: eb, hapElem: hap };
    if (ea === eb) return { code: 'same', ea: ea, eb: eb };
    if (SAENG[ea] === eb) return { code: 'saeng_ab', ea: ea, eb: eb };
    if (SAENG[eb] === ea) return { code: 'saeng_ba', ea: ea, eb: eb };
    if (GEUK[ea] === eb) return { code: 'geuk_ab', ea: ea, eb: eb };
    return { code: 'geuk_ba', ea: ea, eb: eb };
  }
  function jiTags(ja, jb) {
    var t = [];
    if (jiHapOf(ja, jb)) t.push('육합');
    if (jiSamhapOf(ja, jb)) t.push('삼합');
    if (jiChungOf(ja, jb)) t.push('충');
    var hy = jiHyungOf(ja, jb);
    if (hy) t.push(hy);
    if (jiPaOf(ja, jb)) t.push('파');
    if (jiHaeOf(ja, jb)) t.push('해');
    return t;
  }
  function fillList(a, b) {
    var out = [];
    ELEMS.forEach(function (e) {
      if (a.elements[e] <= 1 && b.elements[e] >= 2) out.push({ e: e, gap: a.elements[e], give: b.elements[e] });
    });
    out.sort(function (x, y) { return (y.give - y.gap) - (x.give - x.gap); });
    return out;
  }
  function overlapList(a, b) {
    return ELEMS.filter(function (e) { return a.elements[e] >= 2 && b.elements[e] >= 2; })
      .sort(function (x, y) { return (b.elements[y] + a.elements[y]) - (b.elements[x] + a.elements[x]); });
  }
  function bothLackList(a, b) {
    return ELEMS.filter(function (e) { return a.elements[e] === 0 && b.elements[e] === 0; });
  }

  COMPAT.score = function (a, b) {
    var rel = ganRelation(a, b), tags = jiTags(a.pillars.day.ji, b.pillars.day.ji);
    var score = 60, why = [];
    if (rel.code === 'hap') { score += 9; why.push({ type: 'good', text: '일간이 천간합(合)을 이루어 처음부터 서로에게 끌리는 힘이 있습니다.' }); }
    else if (rel.code === 'saeng_ab' || rel.code === 'saeng_ba') { score += 10; why.push({ type: 'good', text: '일간이 상생(相生) 관계로, 한쪽이 자연스럽게 다른 쪽을 살려줍니다.' }); }
    else if (rel.code === 'same') { score += 4; why.push({ type: 'mid', text: '일간의 기운이 같아 말하지 않아도 통하는 대신, 같은 약점도 함께 있습니다.' }); }
    else { score -= 6; why.push({ type: 'warn', text: '일간이 상극(相剋) 관계로, 서로의 방식을 인정하는 노력이 필요합니다.' }); }

    if (tags.indexOf('육합') >= 0) { score += 12; why.push({ type: 'good', text: '일지가 육합(六合)이라 함께 있을 때 편안하고 정이 깊어집니다.' }); }
    else if (tags.indexOf('삼합') >= 0) { score += 8; why.push({ type: 'good', text: '일지가 삼합의 짝이라 목표를 함께할 때 힘이 배가 됩니다.' }); }
    if (tags.indexOf('충') >= 0) { score -= 10; why.push({ type: 'warn', text: '일지가 충(沖)이라 부딪히는 지점이 있지만, 그만큼 서로를 자극해 성장시킵니다.' }); }
    if (tags.indexOf('형') >= 0 || tags.indexOf('자형') >= 0) { score -= 6; why.push({ type: 'warn', text: '일지에 형(刑)이 있어 말과 태도가 서로에게 상처로 남기 쉽습니다.' }); }
    if (tags.indexOf('파') >= 0) { score -= 4; why.push({ type: 'warn', text: '일지가 파(破)라 계획이 중간에 어긋나는 일이 생깁니다.' }); }
    if (tags.indexOf('해') >= 0) { score -= 5; why.push({ type: 'warn', text: '일지가 해(害)라 작은 서운함이 쌓이기 쉽습니다.' }); }
    if (!tags.length) { why.push({ type: 'mid', text: '일지가 무난한 조합이라 관계의 온도는 두 사람의 대화가 결정합니다.' }); }

    var fa = fillList(a, b), fb = fillList(b, a);
    fa.forEach(function (f) {
      score += 5;
      why.push({ type: 'good', text: (a.input.name || '첫 번째 분') + '에게 부족한 ' + f.e + ' 기운을 상대가 ' + f.give + '개나 채워줍니다.' });
    });
    fb.forEach(function (f) {
      score += 5;
      why.push({ type: 'good', text: (b.input.name || '두 번째 분') + '에게 부족한 ' + f.e + ' 기운을 상대가 ' + f.give + '개나 채워줍니다.' });
    });
    var both = bothLackList(a, b);
    if (both.length) { score -= 3; why.push({ type: 'warn', text: '두 사람 모두 ' + both.join('·') + ' 기운이 없어, 이 부분은 의식적으로 함께 채워야 합니다.' }); }

    if (a.dayMaster.yang !== b.dayMaster.yang) { score += 3; why.push({ type: 'good', text: '일간의 음양이 달라 리드와 배려의 역할이 자연스럽게 나뉩니다.' }); }
    var sa = a.strength, sb = b.strength;
    if ((sa === '신강' && sb === '신약') || (sa === '신약' && sb === '신강')) { score += 4; why.push({ type: 'good', text: '한쪽이 신강, 다른 쪽이 신약이라 서로의 빈 곳을 채우는 짝입니다.' }); }
    else if (sa === sb && sa !== '중화') { score += 1; }

    score = Math.max(38, Math.min(97, Math.round(score)));
    var grade = score >= 85 ? '천생연분' : score >= 75 ? '잘 맞는 사이' : score >= 65 ? '무난한 사이' : score >= 55 ? '노력이 필요한 사이' : '서로 다른 세계';
    return { score: score, grade: grade, notes: why };
  };

  /* ---------- 네 가지 지표 ---------- */
  function gauges(a, b, rel, tags) {
    var yukhap = tags.indexOf('육합') >= 0, samhap = tags.indexOf('삼합') >= 0;
    var chung = tags.indexOf('충') >= 0;
    var draw = 55;
    if (rel.code === 'hap') draw += 22;
    else if (rel.code === 'saeng_ab' || rel.code === 'saeng_ba') draw += 25;
    else if (rel.code === 'same') draw += 10;
    else draw -= 6;
    if (yukhap) draw += 8; else if (samhap) draw += 4;
    draw = Math.max(40, Math.min(98, draw));

    var talk = 56;
    if (rel.code === 'saeng_ab' || rel.code === 'saeng_ba') talk += 18;
    else if (rel.code === 'hap') talk += 12;
    else if (rel.code === 'same') talk += 14;
    else talk -= 8;
    if (yukhap) talk += 8;
    if (chung) talk -= 6;
    var sx = (a.sipsinCount['식신'] + a.sipsinCount['상관']) + (b.sipsinCount['식신'] + b.sipsinCount['상관']);
    talk += Math.min(10, sx * 2);
    talk = Math.max(40, Math.min(97, talk));

    var chem = 58;
    if (yukhap) chem += 16; else if (samhap) chem += 10; else if (chung) chem += 4;
    if (a.dayMaster.yang !== b.dayMaster.yang) chem += 6;
    var fire = (a.elements['화'] || 0) + (b.elements['화'] || 0);
    var water = (a.elements['수'] || 0) + (b.elements['수'] || 0);
    chem += Math.min(8, fire * 2) + Math.min(6, water);
    if (tags.indexOf('형') >= 0) chem -= 4;
    chem = Math.max(40, Math.min(97, chem));

    var stable = 58;
    var earth = (a.elements['토'] || 0) + (b.elements['토'] || 0);
    var metal = (a.elements['금'] || 0) + (b.elements['금'] || 0);
    stable += Math.min(10, earth * 3) + Math.min(8, metal * 2);
    stable += (a.sipsinCount['정재'] + b.sipsinCount['정재']) * 2 + (a.sipsinCount['정관'] + b.sipsinCount['정관']) * 2;
    if (chung) stable -= 8;
    if (tags.indexOf('형') >= 0) stable -= 4;
    if (tags.indexOf('파') >= 0) stable -= 4;
    if (yukhap) stable += 6;
    if (saengPair(a, b)) stable += 3;
    stable = Math.max(40, Math.min(96, stable));

    return [
      { key: 'draw', label: '끌림', value: draw, note: '첫 만남의 설렘' },
      { key: 'talk', label: '대화', value: talk, note: '말이 통하는 정도' },
      { key: 'chem', label: '속궁합', value: chem, note: '몸과 온기의 결' },
      { key: 'stable', label: '안정도', value: stable, note: '오래 가는 힘' }
    ];
  }
  function saengPair(a, b) {
    var ea = GAN_ELEM[a.dayMaster.gan], eb = GAN_ELEM[b.dayMaster.gan];
    return SAENG[ea] === eb || SAENG[eb] === ea || ea === eb;
  }

  /* ---------- 관계 한 줄 이름 ---------- */
  function relName(rel, tags) {
    var base = rel.code === 'hap' ? '천간합의 끌림'
      : rel.code === 'saeng_ab' || rel.code === 'saeng_ba' ? '상생의 짝'
        : rel.code === 'same' ? '같은 물의 동지' : '상극의 긴장';
    if (tags.indexOf('육합') >= 0) base += ' · 일지 육합';
    else if (tags.indexOf('삼합') >= 0) base += ' · 일지 삼합';
    else if (tags.indexOf('충') >= 0) base += ' · 일지 충';
    return base;
  }

  /* ---------- 본문 ---------- */
  function who(nm, text) { return eun(nm) + ' ' + text; }
  function duo(nmA, nmB, ta, tb) {
    if (ta === tb) return '두 사람 모두 ' + ta;
    return who(nmA, ta) + ' ' + who(nmB, tb);
  }

  COMPAT.report = function (a, b) {
    var rel = ganRelation(a, b);
    var tags = jiTags(a.pillars.day.ji, b.pillars.day.ji);
    var base = COMPAT.score(a, b);
    var G = global.Fortune;
    var nmA = a.input.name || '첫 번째 분';
    var nmB = b.input.name || '두 번째 분';
    var ga = G.GAN[a.dayMaster.gan], gb = G.GAN[b.dayMaster.gan];
    var ja = a.pillars.day.ji, jb = b.pillars.day.ji;
    var Ji = G.JI;
    var ea = GAN_ELEM[a.dayMaster.gan], eb = GAN_ELEM[b.dayMaster.gan];
    var fillA = fillList(a, b), fillB = fillList(b, a);
    var over = overlapList(a, b), both = bothLackList(a, b);
    var gs = gauges(a, b, rel, tags);
    var sameGan = a.dayMaster.gan === b.dayMaster.gan;
    var sameJi = ja === jb;

    /* 상대에게 보이는 나 / 내게 보이는 상대 */
    var aToB = global.Saju.sipsin(b.dayMaster.gan, a.dayMaster.gan);  /* B가 A를 보는 십신 */
    var bToA = global.Saju.sipsin(a.dayMaster.gan, b.dayMaster.gan);  /* A가 B를 보는 십신 */
    var sgAB = SIPSIN_GIVE[aToB], sgBA = SIPSIN_GIVE[bToA];

    var relLead = {
      hap: nmA + '의 ' + gwa(ga.name) + ' ' + nmB + '의 ' + gb.name + '은 천간합으로 ' + rel.hapElem + ' 기운을 함께 만듭니다. 명리에서 천간합은 “처음 보는 순간 이유 없이 끌리는” 관계로 봅니다.',
      same: gwa(nmA) + ' ' + eun(nmB) + ' 둘 다 ' + ea + ' 기운의 일간입니다. 같은 결이라 설명하지 않아도 통하는 부분이 많고, 그만큼 같은 약점도 나란히 드러납니다.',
      saeng_ab: nmA + '의 ' + ea + ' 기운이 ' + nmB + '의 ' + eb + ' 기운을 살립니다. 한쪽이 자연스럽게 다른 쪽에 힘을 보태는 구조라, 처음에는 ' + iga(nmA) + ' 먼저 다가갈 확률이 높습니다.',
      saeng_ba: nmB + '의 ' + eb + ' 기운이 ' + nmA + '의 ' + ea + ' 기운을 살립니다. ' + iga(nmB) + ' 먼저 ' + nmA + '의 기운을 깨우는 구조라, ' + eun(nmA) + ' 이 사람 곁에서 평소보다 말이 많아집니다.',
      geuk_ab: nmA + '의 ' + ea + ' 기운이 ' + nmB + '의 ' + eb + ' 기운을 누릅니다. 서로 다른 세계에서 왔다는 느낌이 먼저 오고, 그 다름이 끌림이 되려면 시간이 필요합니다.',
      geuk_ba: nmB + '의 ' + eb + ' 기운이 ' + nmA + '의 ' + ea + ' 기운을 누릅니다. 상대가 나를 다루는 방식이 처음엔 낯설고 답답하게 느껴질 수 있습니다.'
    }[rel.code];

    function jiSentence(ja2, jb2, tags2) {
      var t = [];
      if (tags2.indexOf('육합') >= 0) t.push('육합(六合)');
      if (tags2.indexOf('삼합') >= 0) t.push('삼합(三合)');
      if (tags2.indexOf('충') >= 0) t.push('충(沖)');
      if (tags2.indexOf('형') >= 0) t.push('형(刑)');
      if (tags2.indexOf('자형') >= 0) t.push('자형(自刑)');
      if (tags2.indexOf('파') >= 0) t.push('파(破)');
      if (tags2.indexOf('해') >= 0) t.push('해(害)');
      if (!t.length) return '두 사람의 일지는 ' + gwa(Ji[ja2].name) + ' ' + euro(Ji[jb2].name) + ', 합도 충도 없는 무난한 자리입니다. 부딪힘이 적은 대신 관계의 온도는 두 사람이 만드는 대화에 달려 있습니다.';
      return '두 사람의 일지는 ' + gwa(Ji[ja2].name) + ' ' + euro(Ji[jb2].name) + ' ' + t.join('·') + '의 관계입니다. ' +
        (tags2.indexOf('육합') >= 0 ? '육합은 배우자 자리의 합이라, 함께 있을 때 말보다 편안함이 먼저 옵니다. ' : '') +
        (tags2.indexOf('삼합') >= 0 ? '삼합은 목표를 함께할 때 힘이 배가 되는 짝입니다. ' : '') +
        (tags2.indexOf('충') >= 0 ? '충은 정면으로 부딪히는 자리라, 좋고 싫음이 빠르게 드러납니다. ' : '') +
        (tags2.indexOf('형') >= 0 || tags2.indexOf('자형') >= 0 ? '형은 말과 태도가 서로에게 상처로 남기 쉬운 자리입니다. ' : '') +
        (tags2.indexOf('파') >= 0 ? '파는 계획이 중간에 어긋나는 자리입니다. ' : '') +
        (tags2.indexOf('해') >= 0 ? '해는 작은 서운함이 오래 쌓이는 자리입니다. ' : '') +
        '같은 자리에 겹친 관계가 많을수록 두 사람의 감정선이 자주 요동칩니다.';
    }

    /* 오행 퍼센트 문장 */
    var pctLine = ELEMS.map(function (e) { return e + ' ' + a.percents[e] + '%'; }).join(' · ');
    var pctLineB = ELEMS.map(function (e) { return e + ' ' + b.percents[e] + '%'; }).join(' · ');

    var sa = a.sipsinCount, sb = b.sipsinCount;
    var jaCount = sa['정재'] + sa['편재'], jbCount = sb['정재'] + sb['편재'];
    var gaCount = sa['정관'] + sa['편관'], gbCount = sb['정관'] + sb['편관'];
    var saCount = sa['식신'] + sa['상관'], sbCount = sb['식신'] + sb['상관'];
    var inCount = sa['정인'] + sa['편인'] + sb['정인'] + sb['편인'];
    var ya = a.years[1], yb = b.years[1];
    var yaElem = a.yongsin.elem, ybElem = b.yongsin.elem;
    var COLOR = { '목': '초록·청록', '화': '붉은색·주황', '토': '노랑·베이지', '금': '흰색·은색', '수': '검정·남색' };

    var sections = [];
    function add(o) { sections.push(o); }

    /* ============ 01 설렘 ============ */
    add({
      key: 'spark', no: '01', title: '두 사람의 타고난 기운과 첫인상·끌림',
      tagline: '일간 ' + ga.short + ' × ' + gb.short + ' — 어디서 끌리고 어디서 어긋나나',
      lead: relName(rel, tags) + ' · ' + ga.name + ' × ' + gb.name,
      paras: [
        { h: '두 사람의 중심, 일간', t: relLead + ' 일간은 그 사람의 중심 성격이자 스스로를 움직이는 동력입니다. 그래서 궁합에서 제일 먼저 보는 자리가 여기입니다. ' + nmA + '의 일간은 ' + ga.name + ' — ' + ga.keywords.join('·') + '이고, ' + nmB + '의 일간은 ' + gb.name + ' — ' + gb.keywords.join('·') + '입니다.' },
        { h: '첫 만남의 공기', t: (sameGan
          ? gwa(nmA) + ' ' + eun(nmB) + ' 같은 ' + ga.short + ' 기운을 나눠 가졌습니다. ' + GAN_ATTRACT[a.dayMaster.gan] + ' 그래서 두 사람이 처음 마주 앉으면 대화의 속도가 비슷해 편합니다. 다만 둘 다 자기 이야기를 아끼는 편이라, 한쪽이 먼저 속을 열지 않으면 오래 “잘 모르겠는 사이”로 남습니다.'
          : who(nmA, GAN_ATTRACT[a.dayMaster.gan]) + ' ' + who(nmB, GAN_ATTRACT[b.dayMaster.gan]) + ' 두 사람이 처음 마주 앉으면 ' + (rel.code === 'hap' ? '어색함이 오래가지 않습니다. 합은 설명하기 어려운 친밀감을 만들기 때문에, 처음인데도 오래 안 사람처럼 말이 이어집니다.' : rel.code === 'saeng_ab' || rel.code === 'saeng_ba' ? '한쪽이 다른 쪽을 편하게 만들어 주는 공기가 흐릅니다. 말수가 적은 쪽이 이상하게 말이 많아지고, 상대의 이야기를 오래 듣게 됩니다.' : '서로 낯선 공기가 조금 흐릅니다. 그런데 그 낯섦이 오히려 궁금증을 만들고, 한 번 대화가 트이면 몰입의 깊이가 남다릅니다.')) },
        { h: iga(nmA) + ' 보는 ' + nmB, t: (sameGan
          ? '두 사람의 일간이 같아 서로에게 ' + bToA + '의 사람으로 보입니다. ' + sgBA.look + '이라는 뜻입니다. ' + sgBA.body + ' 거울을 보는 것 같아 편하지만, 내가 싫어하는 내 모습이 상대에게도 보인다는 뜻이니 그 점은 각오해야 합니다.'
          : who(nmB, nmA + '에게는 ' + bToA + '의 사람으로 보입니다. ' + sgBA.look + '이라는 뜻입니다. ' + sgBA.body) + ' 그러니 ' + iga(nmA) + ' ' + nmB + '에게 처음 느끼는 감정은 설렘이라기보다 ‘이 사람은 나와 다르게 움직인다’는 호기심에 가깝습니다. 그 호기심이 애정으로 바뀌는 데는 대화 몇 번이면 충분합니다.') },
        { h: iga(nmB) + ' 보는 ' + nmA, t: (sameGan
          ? '각도만 바꾸면 ' + nmB + '도 ' + eul(nmA) + ' 같은 눈으로 봅니다. 서로가 서로에게 거울이라, 두 사람이 다투면 대개 같은 이유로 다툽니다. 그 사실을 알면 싸움의 절반은 예방할 수 있습니다.'
          : '반대로 ' + nmB + '에게 ' + eun(nmA) + ' ' + aToB + '의 사람입니다. ' + sgAB.look + ', ' + sgAB.body + ' 두 사람이 서로를 보는 각도가 이렇게 다르기 때문에, 같은 사건을 겪고도 기억하는 장면이 다릅니다. 그것이 서운함이 되기도 하고, 대화의 재료가 되기도 합니다.') },
        { h: '끌림이 오래가려면', t: '끌림은 대개 첫인상에서 시작되지만 오래가는 힘은 다른 데서 나옵니다. ' + (rel.code === 'hap' ? '천간합은 강한 끌림을 주지만, 합이 강한 관계일수록 서로의 생활을 너무 빨리 하나로 합치려 합니다. 각자의 방 하나는 남겨두세요.' : rel.code === 'same' ? '같은 기운의 관계는 편안함이 무기지만, 둘 다 같은 방식으로 화를 내고 같은 방식으로 숨기 때문에 교착이 길어집니다. 한 사람이 먼저 규칙을 깨야 합니다.' : rel.code === 'saeng_ab' || rel.code === 'saeng_ba' ? '상생은 한쪽이 계속 주고 다른 쪽이 받는 구조로 굳어지기 쉽습니다. 받는 쪽도 표현을 해야 주는 쪽이 지치지 않습니다.' : '상극은 긴장이 매력이지만, 긴장만으로 오래 버티기는 어렵습니다. 서로가 잘하는 영역을 나눠 ‘네가 없으면 안 되는 일’을 하나씩 만드세요.') + ' 그리고 두 사람의 일간이 ' + (a.dayMaster.yang !== b.dayMaster.yang ? '음과 양으로 갈려 있어, 결정을 내릴 때 한쪽이 밀고 한쪽이 멈추는 역할이 자연스럽게 생깁니다. 이 리듬을 억지로 바꾸지 마세요.' : '같은 음양이라 리드가 겹칩니다. 한 사안에서는 한 사람만 결정권을 갖는 규칙이 필요합니다.') }
      ],
      dosa: [
        nmA + '의 ' + ga.short + ' 기운과 ' + nmB + '의 ' + gb.short + ' 기운이 만났네. ' + (sameGan ? '같은 기운이라 거울을 보는 셈이지. 편한 만큼 같은 곳에서 같이 넘어지네.' : relLead.split('. ').slice(1).join('. ')),
        '끌림은 첫눈에 오지만 정은 대화에서 쌓이네. 두 사람은 ' + (rel.code === 'hap' ? '말이 통하는 것처럼 느끼지만, 그게 합의 착각일 수 있으니 확인하게.' : rel.code === 'same' ? '닮아서 편한 대신, 한 사람이 달라져야 관계가 자라네.' : '서로 다른 온도라, 그 차이를 재미로 볼 수 있어야 하네.'),
        '허허, 첫인상은 반이고 나머지 반은 두 사람이 만드는 것일세.'
      ],
      chips: [ga.short + ' × ' + gb.short, relName(rel, tags), '끌림 ' + gs[0].value, '음양 ' + (a.dayMaster.yang === b.dayMaster.yang ? '같음' : '다름')]
    });

    /* ============ 02 일지 ============ */
    add({
      key: 'heart', no: '02', title: '일지 — 배우자 자리의 합·충과 속마음',
      tagline: '생활의 자리 ' + Ji[ja].name + ' × ' + Ji[jb].name + ' · 감정 표현의 온도차',
      lead: Ji[ja].name + '(' + Ji[ja].animal + ') × ' + Ji[jb].name + '(' + Ji[jb].animal + ') — ' + (tags.length ? tags.join('·') : '무난한 조합'),
      paras: [
        { h: '배우자 자리란', t: '일지(日支)는 태어난 날의 아래 글자로, 명리에서 배우자 자리이자 생활의 자리라고 부릅니다. 성격의 중심인 일간과 달리, 일지는 ‘집에서의 나’와 ‘가까운 사람에게 보이는 나’를 보여줍니다. 그래서 궁합에서 일간이 끌림을 본다면, 일지는 같이 살았을 때의 리듬을 봅니다.' },
        { h: '두 사람의 일지', t: jiSentence(ja, jb, tags) },
        { h: nmA + '의 속마음과 표현', t: nmA + '의 일지는 ' + Ji[ja].name + '입니다. ' + JI_INNER[ja] + ' 감정 표현은 이렇습니다. ' + JI_EXPRESS[ja] + ' 겉으로 보이는 모습과 실제 속마음의 간격이 ' + (ja === 0 || ja === 1 || ja === 9 ? '특히 큰 편' : '크지 않은 편') + '이라, 가까운 사람일수록 이 간격을 오해하기 쉽습니다.' },
        { h: nmB + '의 속마음과 표현', t: (sameJi
          ? nmB + '도 같은 ' + Ji[jb].name + ' 자리입니다. 표현 방식까지 닮아서, 두 사람은 서로의 서운함을 남보다 빨리 알아채고 남보다 오래 기억합니다. 그래서 위로도 빠르지만 앙금도 오래갑니다.'
          : nmB + '의 일지는 ' + Ji[jb].name + '입니다. ' + JI_INNER[jb] + ' 감정 표현은 이렇습니다. ' + JI_EXPRESS[jb] + ' 두 사람의 표현 방식이 이렇게 다르기 때문에, 같은 애정을 담아도 전달되는 온도가 다릅니다.') },
        { h: '겹친 자리가 말하는 것', t: (function () {
          var extra = [];
          var cross1 = jiTags(ja, b.pillars.month.ji);
          var cross2 = jiTags(jb, a.pillars.month.ji);
          if (cross1.indexOf('충') >= 0 || cross2.indexOf('충') >= 0) extra.push('한쪽의 일지와 다른 쪽의 월지가 충을 이루어, 생활 습관보다 가족·직장의 리듬에서 부딪힐 수 있습니다.');
          if (cross1.indexOf('육합') >= 0 || cross2.indexOf('육합') >= 0) extra.push('일지와 월지 사이에 육합이 겹쳐, 두 사람의 생활 반경이 자연스럽게 겹칩니다.');
          var s = tags.length
            ? '합이 있으면 생활의 리듬이 자연스럽게 맞물리고, 충·형·파·해가 있으면 같은 집에서 서로의 속도를 맞추는 훈련이 필요합니다.'
            : '겹치는 관계가 없어 생활의 리듬은 두 사람이 처음부터 함께 만들어야 합니다.';
          if (tags.indexOf('육합') >= 0) s += ' 육합은 특히 잠자리와 식탁처럼 가까운 거리에서 편안함을 만듭니다.';
          if (tags.indexOf('충') >= 0) s += ' 충은 가까울수록 크게 부딪히지만, 부딪힌 뒤에 관계가 더 선명해지는 자리이기도 합니다.';
          if (tags.indexOf('형') >= 0 || tags.indexOf('자형') >= 0) s += ' 형은 애정이 없어서가 아니라 표현이 어긋나서 생기는 상처가 많다는 뜻입니다.';
          return s + ' ' + extra.join(' ');
        })() },
        { h: '감정이 상했을 때', t: duo(nmA, nmB, GAN_REPAIR[a.dayMaster.gan], GAN_REPAIR[b.dayMaster.gan]) + ' 두 사람이 싸운 뒤에 가장 조심할 것은 ‘먼저 연락하는 쪽이 지는 것’이라는 생각입니다. 이 관계에서 먼저 말을 거는 사람은 지는 사람이 아니라 관계를 살리는 사람입니다. 감정이 가라앉는 데 걸리는 시간도 다르니, ' + (a.dayMaster.yang !== b.dayMaster.yang ? '빠르게 풀고 싶은 쪽이 느린 쪽을 재촉하지 않는 것' : '둘 다 비슷하게 오래 끄는 편이라 하루 안에 한 번은 말을 거는 규칙') + '이 필요합니다.' }
      ],
      dosa: [
        '일지가 ' + gwa(Ji[ja].name) + ' ' + Ji[jb].name + '이라 ' + (tags.length ? tags.join('·') + '의 자리일세. ' : '무난한 자리일세. '),
        JI_INNER[ja] + ' ' + (sameJi ? '두 사람이 같은 자리라 이 성질이 두 배로 나타나네.' : JI_EXPRESS[jb]),
        '부부 자리는 합보다 ‘말이 통하는가’가 오래 가네. 두 사람은 ' + (tags.indexOf('충') >= 0 || tags.indexOf('형') >= 0 ? '부딪히는 걸 피하지 말고 그 자리에서 정리하게.' : '편안함에 기대어 말을 아끼지 않게.')
      ],
      chips: [Ji[ja].name + ' × ' + Ji[jb].name, tags.length ? tags.join('·') : '무난', '감정 표현 ' + (JI_EXPRESS[ja].indexOf('말보다') >= 0 ? '행동형' : '말형') + '·' + (JI_EXPRESS[jb].indexOf('말보다') >= 0 ? '행동형' : '말형')]
    });

    /* ============ 03 오행 ============ */
    add({
      key: 'balance', no: '03', title: '오행 밸런스 — 채워주는 기운과 부딪히는 기운',
      tagline: '퍼센트로 보는 두 사람의 기운 지도',
      lead: '보완 ' + (fillA.length + fillB.length) + '곳 · 겹침 ' + (over.length ? over.join('·') : '없음') + ' · 함께 부족 ' + (both.length ? both.join('·') : '없음'),
      paras: [
        { h: '두 사람의 오행 지도', t: nmA + '의 여덟 글자는 ' + pctLine + '입니다. ' + who(nmB, pctLineB + '입니다.') + ' 숫자만 보면 ' + who(nmA, iga(a.maxElem) + ' 가장 많고 ' + iga(a.minElem) + ' 가장 적으며,') + ' ' + who(nmB, iga(b.maxElem) + ' 가장 많고 ' + iga(b.minElem) + ' 가장 적습니다.') + ' 궁합에서 오행을 보는 이유는 잘 맞고 안 맞고를 가르기 위해서가 아니라, 서로가 어떤 기운을 보태고 어떤 기운에서 부딪히는지 알기 위해서입니다.' },
        { h: nmA + '에게 ' + iga(nmB) + ' 채워주는 것', t: (fillA.length
          ? fillA.map(function (f) { return nmA + '에게 ' + (f.gap === 0 ? '아예 없던 ' : '거의 없던 ') + f.e + ' 기운(' + ELEM_FILL[f.e].what + ')을 ' + iga(nmB) + ' ' + f.give + '개나 가지고 있습니다. ' + nmB + ' 곁에 있으면 ' + ELEM_FEEL[f.e] + '이 생깁니다. ' + ELEM_FILL[f.e].tip + '.'; }).join(' ')
          : who(nmA, '부족한 오행을 ' + iga(nmB) + ' 크게 채워주지는 못합니다. 대신 ' + nmA + '의 ' + a.minElem + ' 기운은 스스로 생활 속에서 채워야 하고, ' + eun(nmB) + ' 그 과정을 방해하지 않는 것만으로 도움이 됩니다.')) },
        { h: nmB + '에게 ' + iga(nmA) + ' 채워주는 것', t: (fillB.length
          ? fillB.map(function (f) { return nmB + '에게 ' + (f.gap === 0 ? '아예 없던 ' : '거의 없던 ') + f.e + ' 기운을 ' + iga(nmA) + ' ' + f.give + '개 가지고 있습니다. ' + eun(nmB) + ' ' + gwa(nmA) + ' 함께 있을 때 ' + ELEM_FILL[f.e].give + ' 그래서 ' + nmB + ' 쪽이 이 관계에서 ‘나를 채워주는 사람’이라고 느끼기 쉽습니다.'; }).join(' ')
          : who(nmB, '목마른 오행을 ' + iga(nmA) + ' 채워주지는 못합니다. 이 경우 두 사람은 서로의 빈 곳을 알아도 채워줄 수 없다는 것을 인정하고, 각자 생활에서 그 기운을 만드는 편이 낫습니다.')) },
        { h: '겹쳐서 넘치는 기운', t: (over.length
          ? '두 사람 모두 ' + over.map(function (e) { return e + '(' + a.elements[e] + '개·' + b.elements[e] + '개)'; }).join(', ') + ' 기운이 넉넉합니다. 같은 기운이 두 배가 되면 장점도 두 배지만 단점도 두 배가 됩니다. ' + over.map(function (e) { return ELEM_OVER[e] + '.'; }).join(' ') + ' 이 기운이 넘치는 날에는 큰 결정을 미루고, 산책이나 물을 마시며 온도를 낮추는 습관이 필요합니다.'
          : '두 사람 사이에 유난히 겹쳐 넘치는 오행은 없습니다. 이건 다행입니다. 같은 기운이 두 배가 되면 장점도 두 배지만 단점도 두 배가 되기 때문입니다. 다만 겹침이 없다는 것은 생활 리듬도 서로 다르다는 뜻이라, 시간표를 맞추는 노력은 필요합니다.') },
        { h: '함께 부족한 기운', t: (both.length
          ? '두 사람 모두 ' + both.join('·') + ' 기운이 여덟 글자에 없습니다. ' + both.map(function (e) { return ELEM_LACK_TOGETHER[e]; }).join('·') + '이 두 사람의 공통 약점이라는 뜻입니다. 이 기운은 상대에게 기대할 수 없으니 생활로 직접 채워야 합니다. ' + both.map(function (e) { return ELEM_FILL[e].tip; }).join(' ') + ' 두 사람이 함께 이 습관을 만들면, 궁합 점수보다 훨씬 현실적인 도움이 됩니다.'
          : '두 사람이 함께 비어 있는 오행은 없습니다. 적어도 한쪽은 각 기운을 가지고 있어, 서로의 빈 곳을 메울 여지가 있습니다.') },
        { h: '신강·신약의 짝', t: eun(nmA) + ' ' + a.strength + '(세력 ' + Math.round(a.supportRatio * 100) + '%), ' + who(nmB, b.strength + '(세력 ' + Math.round(b.supportRatio * 100) + '%)입니다.') + ' ' + ((a.strength === '신강' && b.strength === '신약') || (a.strength === '신약' && b.strength === '신강') ? '한쪽이 세고 한쪽이 여린 짝이라, 세 쪽이 여린 쪽을 감싸고 여린 쪽이 세 쪽의 속도를 늦춰 주는 이상적인 구조입니다. 다만 세 쪽이 감싸는 것을 통제로 착각하지 않아야 합니다.' : a.strength === b.strength && a.strength === '신강' ? '둘 다 기운이 센 짝이라 주도권 다툼이 생기기 쉽습니다. 싸울 때 결론을 내는 사람을 사안별로 정해두면 마찰이 크게 줄어듭니다.' : a.strength === b.strength && a.strength === '신약' ? '둘 다 기운이 여린 짝이라 서로에게 기대는 마음이 큽니다. 기대는 것이 나쁘지는 않지만, 두 사람 다 무너지는 날이 겹치면 회복이 늦으니 각자 기댈 곳을 하나씩 더 만들어 두세요.' : '두 사람 다 기운이 고르게 잡혀 있어 어디서든 적응합니다. 대신 기준이 흐려지면 결정을 미루게 되니, 중요한 일은 먼저 원칙을 정해두세요.') }
      ],
      dosa: [
        '오행을 겹쳐 보니 ' + (fillA.length + fillB.length ? '서로 채워주는 자리가 ' + (fillA.length + fillB.length) + '곳이나 있네. 드문 일일세.' : '서로 채워주는 자리가 많지는 않네. 그건 나쁜 게 아니라 각자 채워야 할 숙제가 있다는 뜻이지.'),
        (over.length ? '허나 ' + over.join('·') + ' 기운이 겹쳐 넘치네. ' + ELEM_OVER[over[0]] + '.' : '크게 겹치는 기운이 없어 부딪힘이 적은 편일세.'),
        '기운은 점수가 아니라 생활에서 채우는 것일세. 밥과 잠, 산책이 곧 개운이지.'
      ],
      chips: [nmA + ' ' + a.minElem + ' 부족', nmB + ' ' + b.minElem + ' 부족'].concat(fillA.concat(fillB).map(function (f) { return f.e + ' 보완'; })).concat(over.map(function (e) { return e + ' 겹침'; }))
    });

    /* ============ 04 연애 vs 결혼 ============ */
    add({
      key: 'life', no: '04', title: '연애할 때와 결혼·동거했을 때의 온도 차이',
      tagline: '재성·관성·식상·인성으로 보는 현실의 결',
      lead: '재성 ' + jaCount + '·' + jbCount + ' · 관성 ' + gaCount + '·' + gbCount + ' · 식상 ' + saCount + '·' + sbCount,
      paras: [
        { h: '연애할 때의 온도', t: duo(nmA, nmB, GAN_LOVE[a.dayMaster.gan], GAN_LOVE[b.dayMaster.gan]) + ' 연애 초반에는 ' + (saCount + sbCount >= 4 ? '두 사람 다 표현이 많은 편이라 감정이 빠르게 뜨겁습니다. 문제는 그 열기가 식는 속도도 서로 다르다는 것입니다.' : saCount + sbCount <= 1 ? '두 사람 다 표현이 적은 편이라, 좋아하는 마음이 말보다 행동으로 천천히 드러납니다. 상대가 그것을 알아채기까지 시간이 걸린다는 것을 기억하세요.' : '한쪽은 말로, 한쪽은 행동으로 애정을 표현합니다. 이 차이를 오해라고 부르지 않으면 관계가 훨씬 편해집니다.') },
        { h: '동거·결혼하면 드러나는 것', t: (function () {
          var t = '';
          if (gaCount + gbCount >= 3) t += '두 사람 모두 관성(역할·책임)이 ' + (gaCount + gbCount) + '개로 많은 편입니다. 결혼을 하면 각자 ‘내가 해야 할 일’을 먼저 떠안고, 상대가 그것을 알아주지 않으면 크게 서운해합니다. 역할을 말로 정하지 않으면 조용한 불만이 쌓입니다. ';
          else t += '두 사람의 관성이 많지 않아, 결혼 같은 제도보다 함께 사는 방식 자체를 중요하게 여깁니다. 대신 주변의 기대와 형식에 흔들리지 않도록 두 사람만의 규칙을 만들어야 합니다. ';
          if (jaCount + jbCount >= 3) t += '재성이 ' + (jaCount + jbCount) + '개라 살림의 현실 감각이 좋습니다. 생활비와 저축을 함께 설계하면 오히려 관계가 단단해집니다. ';
          else t += '재성이 많지 않아 살림의 숫자에 둔한 편입니다. 생활비·저축·보험을 한 사람에게 맡기지 말고 정기적으로 함께 확인하세요. ';
          t += '두 사람 모두 인성이 ' + inCount + '개로, 힘들 때 보호받고 싶은 마음이 큽니다. 서로가 서로의 보호자가 되려 하면 둘 다 지칩니다. ';
          return t;
        })() },
        { h: '돈과 살림의 결', t: nmA + '의 재물 습관은 ' + ga.money.split('.')[0] + '입니다. ' + (jaCount >= 2 ? '재성이 여러 개라 돈이 오가는 일이 잦고, 그만큼 관리가 중요합니다.' : '재성이 적어 돈을 버는 힘보다 지키는 힘이 더 중요합니다.') + ' ' + who(nmB, gb.money.split('.')[0] + '입니다.') + ' ' + (jbCount >= 2 ? '역시 재성이 여러 개라 두 사람이 함께 쓰면 지출이 커질 수 있습니다. 통장을 나누는 것이 좋습니다.' : '재성이 적어 큰 지출에 신중한 편입니다.') + ' 두 사람이 함께 살면 ' + (jaCount + jbCount >= 4 ? '생활비가 커지기 쉬우니 고정지출을 먼저 정하고 남는 돈으로 각자 쓰는 방식이 맞습니다.' : '한 명이 관리하고 한 명이 확인하는 구조가 잘 맞습니다. 다만 확인하는 사람이 잔소리꾼이 되면 안 됩니다.') },
        { h: '가족·주변과의 관계', t: '궁합은 두 사람만의 문제가 아닙니다. ' + nmA + '의 일지 ' + Ji[ja].name + '은 ' + Ji[ja].relation + ' ' + nmB + '의 일지 ' + Ji[jb].name + '은 ' + Ji[jb].relation + ' 두 사람이 각자의 가족·친구와 맺는 거리도 다릅니다. ' + (jaCount + gbCount >= 3 ? '특히 한쪽이 가족의 기대를 크게 의식하는 편이라, 두 사람 사이의 결정을 주변에 먼저 알리면 갈등이 생깁니다. 결정은 두 사람이 먼저 하고 알리는 순서를 지키세요.' : '두 사람 다 주변의 시선을 크게 의식하지 않는 편이라, 각자의 시간과 관계를 존중하면 문제가 적습니다.') },
        { h: '같이 사는 시간표', t: duo(nmA, nmB, JI_LIFE[ja], JI_LIFE[jb]) + ' ' + (jiHapOf(ja, jb) ? '두 사람의 생활 리듬이 합을 이루는 자리라, 함께 사는 것이 생각보다 수월합니다.' : '생활 리듬이 다른 자리라, 잔소리로 맞추려 하면 둘 다 지칩니다. “평일은 각자, 주말은 함께” 같은 규칙을 정해두면 훨씬 편합니다.') + ' 그리고 ' + gwa(ga.short) + ' ' + gb.short + '의 기운이 서로 다르게 작동하니, 집안일을 정할 때 잘하는 것을 나누고 못하는 것을 억지로 고치려 하지 마세요.' }
      ],
      dosa: [
        '연애할 때와 살 때는 다르네. 연애는 ' + ga.short + '의 온도로 하지만, 살림은 ' + (jaCount + jbCount >= 3 ? '재성의 숫자로 하지.' : '생활의 규칙으로 하지.'),
        duo(nmA, nmB, GAN_LIFE[a.dayMaster.gan], GAN_LIFE[b.dayMaster.gan]),
        '같이 살려면 큰 사랑보다 작은 규칙이 필요하네. 밥 시간과 돈 통장, 이 두 가지만 정하면 절반은 해결되지.'
      ],
      chips: ['재성 ' + (jaCount + jbCount), '관성 ' + (gaCount + gbCount), '식상 ' + (saCount + sbCount), '생활 리듬 ' + (jiHapOf(ja, jb) ? '합' : '조정 필요')]
    });

    /* ============ 05 갈등 ============ */
    add({
      key: 'clash', no: '05', title: '가장 자주 부딪히는 지점과 화해 패턴',
      tagline: '말투 팩폭 · 싸움이 커지는 순서 · 풀리는 법',
      lead: '갈등 자리 ' + (tags.length ? tags.join('·') : '무난') + ' · 상극 ' + (rel.code.indexOf('geuk') === 0 ? '있음' : '없음'),
      paras: [
        { h: '부딪히는 지점', t: (tags.indexOf('충') >= 0 ? '일지가 충이라, 두 사람은 정면으로 부딪히는 자리가 있습니다. 좋고 싫음이 빠르게 드러나고, 같은 사안을 두고 서로 다른 결론을 자신 있게 말합니다. ' : tags.indexOf('형') >= 0 || tags.indexOf('자형') >= 0 ? '일지에 형이 있어, 애정이 부족해서가 아니라 표현이 어긋나서 상처가 생깁니다. 말의 내용보다 말의 각도가 문제입니다. ' : tags.indexOf('해') >= 0 ? '일지가 해라, 큰 싸움보다 작은 서운함이 쌓이는 쪽이 위험합니다. ' : tags.indexOf('파') >= 0 ? '일지가 파라, 계획한 일이 중간에 어긋나면서 감정이 상합니다. 약속이 틀어지는 상황을 서로가 어떻게 다루는지가 관건입니다. ' : '일지가 무난해 큰 충돌은 적습니다. 다만 무난함이 방심이 되면 서운함이 쌓입니다. ') + (rel.code.indexOf('geuk') === 0 ? '게다가 일간이 상극이라, 한쪽이 당연하게 여기는 방식을 다른 쪽이 답답해합니다. ' : '일간은 상극이 아니라서, 대화의 방향만 잡으면 풀릴 여지가 큽니다. ') + (saCount + sbCount >= 4 ? '식상이 많은 편이라 말이 먼저 나가고 생각이 따라옵니다.' : '표현이 적은 편이라 말보다 침묵으로 상처를 주는 쪽을 조심해야 합니다.') },
        { h: nmA + '의 말투 팩폭', t: nmA + '의 갈등 유발 지점은 이렇습니다. ' + GAN_CONFLICT[a.dayMaster.gan] + ' 본인은 논리적으로 말했다고 생각하지만, 상대는 공격으로 받을 수 있습니다. 특히 ' + (saCount >= 2 ? '식상이 ' + saCount + '개라 말이 빠르고 날카로워집니다.' : '말수가 많지 않아 오히려 침묵이 무기가 됩니다.') + ' ' + iga(nmB) + ' 이 말투에 상처받는 순간을 알려주면, 고칠 수 있는 부분과 못 고치는 부분이 나뉩니다.' },
        { h: nmB + '의 말투 팩폭', t: (sameGan ? '두 사람의 말투가 같은 방향이라, 다툼의 패턴도 똑같습니다. ' + GAN_CONFLICT[b.dayMaster.gan] + ' 서로가 같은 방식으로 상처를 주고받으니, 한 사람이 말투를 바꾸면 관계 전체가 바뀝니다.' : nmB + '의 갈등 유발 지점은 이렇습니다. ' + GAN_CONFLICT[b.dayMaster.gan] + ' 마찬가지로 본인은 ‘사실을 말한 것’이라고 생각합니다. ' + (sbCount >= 2 ? '식상이 ' + sbCount + '개라 감정이 말로 바로 나옵니다.' : '표현이 적어 서운함이 해소되지 않고 쌓입니다.')) + ' 두 사람의 말투가 이렇게 다르기 때문에, 싸움의 원인은 사건이 아니라 말의 순서인 경우가 많습니다.' },
        { h: '싸움이 커지는 순서', t: '두 사람의 다툼은 대개 이렇게 커집니다. 1단계, 사소한 사실 하나가 어긋납니다. 2단계, 한쪽이 “왜 그걸 말 안 했어”라고 확인을 요구합니다. 3단계, 다른 쪽이 그 요구를 추궁으로 받아 말투가 세집니다. 4단계, 원래 사건은 사라지고 “너는 항상 그렇다”는 말이 나옵니다. 여기까지 오면 결론이 아니라 상처만 남습니다. 2단계에서 멈추는 규칙을 만드세요. 예를 들어 “지금은 사실만 확인하고, 감정은 한 시간 뒤에 말한다” 같은 약속입니다.' },
        { h: '화해 패턴', t: duo(nmA, nmB, GAN_REPAIR[a.dayMaster.gan], GAN_REPAIR[b.dayMaster.gan]) + ' 이 두 방식이 다르기 때문에, 한쪽이 사과했다고 생각해도 다른 쪽은 아직 기다리는 중일 수 있습니다. ' + (a.dayMaster.yang !== b.dayMaster.yang ? '양과 음이 갈린 짝이라, 먼저 다가가는 역할이 늘 한쪽으로 고정되기 쉽습니다. 그 역할이 억울해지면 관계가 흔들리니, 번갈아 먼저 다가가는 규칙을 만들어 두세요.' : '같은 음양의 짝이라 둘 다 먼저 다가가기를 기다립니다. “먼저 연락하는 사람이 이기는 것”이라는 규칙을 없애는 것이 첫걸음입니다.') },
        { h: '피해야 할 말과 상황', t: '두 사람 사이에서 특히 위험한 말이 있습니다. “네가 항상 그래”, “그건 네 착각이야”, “됐어, 알아서 해”, “너는 나를 이해 못 해”. 이 네 마디는 이 관계에서 상처가 오래 남는 말입니다. 상황으로는 ' + (jaCount + jbCount >= 3 || gaCount + gbCount >= 3 ? '돈과 가족이 얽힌 결정을 밤늦게 하는 것' : '피곤한 밤늦게 중요한 이야기를 꺼내는 것') + ', 그리고 둘 중 한 사람이 배고픈 상태에서 시작하는 대화입니다. 사소해 보이지만 이 두 가지를 피하는 것만으로 다툼의 절반이 줄어듭니다.' }
      ],
      dosa: [
        '싸우는 이유는 사건이 아니라 말의 순서일세. ' + (tags.indexOf('충') >= 0 ? '충이니 정면으로 부딪히는 건 피할 수 없어. 대신 부딪힌 뒤에 어떻게 정리하느냐가 관건이지.' : '겉으로는 조용히 부딪히니, 그 조용함을 방심하지 말게.'),
        GAN_CONFLICT[a.dayMaster.gan] + ' ' + (sameGan ? '상대도 같은 방식이라 서로가 서로에게 상처를 주네.' : GAN_CONFLICT[b.dayMaster.gan]),
        '화해는 지는 게 아니라 관계를 살리는 일일세. 먼저 말 거는 사람이 진짜 어른이지. 허허.'
      ],
      chips: ['갈등 ' + (tags.indexOf('충') >= 0 ? '충' : tags.indexOf('형') >= 0 ? '형' : tags.indexOf('해') >= 0 ? '해' : '낮음'), '말투 차이 큼', '화해 규칙 필요']
    });

    /* ============ 06 2027 ============ */
    add({
      key: 'year', no: '06', title: '2027년 두 사람의 흐름과 시기별 조언',
      tagline: '정미년이 두 사람 사이에 들어올 때',
      lead: nmA + ' ' + ya.ganSipsin + ' · ' + nmB + ' ' + yb.ganSipsin + ' · 정미(丁未)년',
      paras: [
        { h: '2027 정미년이란', t: '2027년은 정미(丁未)년입니다. 위 글자 정(丁)은 촛불 같은 작은 불, 아래 글자 미(未)는 여름 끝의 부드러운 흙입니다. 불이 흙을 데우는 구조라, 크게 터지기보다 익히고 마무리하는 해입니다. 두 사람의 사주에 이 기운이 들어오면, 관계에서도 ‘새로 시작’보다 ‘정리와 확인’이 중요해집니다.' },
        { h: nmA + '의 2027', t: nmA + '에게 2027년은 ' + ya.ganSipsin + '의 해입니다. ' + (ya.ganSipsin === '정관' || ya.ganSipsin === '편관' ? '책임과 자리가 커지는 해라, 관계에서도 “이 사람과 어디까지 갈 것인가”를 진지하게 묻게 됩니다. 결혼·동거·소개 같은 공식적인 이야기가 나오기 좋습니다.' : ya.ganSipsin === '정재' || ya.ganSipsin === '편재' ? '돈과 현실이 커지는 해입니다. 함께 쓰는 돈, 생활비, 집 문제가 대화의 중심이 됩니다. 감정보다 숫자로 이야기하면 오해가 줄어듭니다.' : ya.ganSipsin === '식신' || ya.ganSipsin === '상관' ? '표현이 늘어나는 해입니다. 하고 싶은 말이 많아지고, 그 말이 관계를 밀기도 하고 상하게도 합니다. 말을 고르는 연습이 필요한 해입니다.' : ya.ganSipsin === '정인' || ya.ganSipsin === '편인' ? '배움과 정리의 해입니다. 관계를 서두르기보다 서로의 생활을 정돈하고, 문서로 남길 일(계약·이사·가족 행사)을 정리하기 좋습니다.' : '내 힘과 경쟁이 커지는 해입니다. 관계에서도 주도권 이야기가 나오기 쉬우니, 양보를 ‘지는 것’으로 생각하지 않는 연습이 필요합니다.') },
        { h: nmB + '의 2027', t: nmB + '에게 2027년은 ' + yb.ganSipsin + '의 해입니다. ' + (yb.ganSipsin === '정관' || yb.ganSipsin === '편관' ? '책임이 늘고 시험대에 서는 해입니다. 관계에서도 상대의 기대에 맞추다 지치기 쉬우니, “내가 원하는 것”을 먼저 말하는 연습이 필요합니다.' : yb.ganSipsin === '정재' || yb.ganSipsin === '편재' ? '현실 감각이 좋아지는 해입니다. 함께 사는 계획을 구체적인 숫자로 만들어보기 좋고, 이 시기에 정한 예산이 오래갑니다.' : yb.ganSipsin === '식신' || yb.ganSipsin === '상관' ? '표현과 재능이 드러나는 해입니다. 두 사람 사이에서도 말이 많아지고, 그 말이 애정이 되기도 무기가 되기도 합니다.' : yb.ganSipsin === '정인' || yb.ganSipsin === '편인' ? '생각과 배움이 깊어지는 해입니다. 혼자만의 시간이 필요해지니, 그 필요를 상대에게 미리 말해두어야 오해가 없습니다.' : '경쟁과 변동의 해입니다. 사람과 돈이 정리되는 느낌이 들 수 있으니, 두 사람 사이의 약속을 문서로 남기는 것이 안전합니다.') },
        { h: '두 사람에게 겹치는 흐름', t: '두 사람이 같은 해에 ' + (ya.ganSipsin === yb.ganSipsin ? '같은 ' + ya.ganSipsin + ' 운을 받는 것은 흔치 않은 일입니다. 같은 방향으로 힘이 실리니, 함께 결정하면 속도가 붙습니다. 대신 둘 다 같은 약점이 커지므로 한 사람이 브레이크 역할을 맡아야 합니다.' : '서로 다른 ' + gwa(ya.ganSipsin) + ' ' + yb.ganSipsin + ' 운을 받습니다. 한쪽은 밀고 한쪽은 정리하는 흐름이라, 역할을 나누면 오히려 좋습니다. 한쪽이 결정을 재촉할 때 다른 쪽이 준비할 시간을 달라고 말할 수 있어야 합니다.') + ' 2027년의 지지 미(未)는 두 사람의 일지 ' + gwa(Ji[ja].name) + ' ' + Ji[jb].name + '는 각각 ' + (jiTags(ja, 7).length ? jiTags(ja, 7).join('·') : '특별한 관계 없음') + ', ' + (jiTags(jb, 7).length ? jiTags(jb, 7).join('·') : '특별한 관계 없음') + '의 관계를 만듭니다. ' + (jiTags(ja, 7).indexOf('충') >= 0 || jiTags(jb, 7).indexOf('충') >= 0 ? '미토가 충을 이루는 쪽은 2027년에 생활의 변화(이사·직장·가족)가 겹칠 수 있으니, 관계의 결정을 서두르지 마세요.' : '큰 충돌 없이 지나가는 자리라, 관계를 한 단계 정리하기 좋은 해입니다.') },
        { h: '시기별 조언', t: '봄(2~4월)은 시작의 기운입니다. 두 사람이 함께 새로 하는 일 하나를 정하세요. 여름(5~7월)은 감정의 온도가 올라갑니다. 큰 결정보다 함께 노는 시간을 늘리는 편이 낫습니다. 가을(8~10월)은 정리의 기운입니다. 돈과 약속을 정리하고, 겨울(11~1월)은 쉬는 기운입니다. 이 시기에 관계를 평가하지 말고, 다음 해 계획을 함께 적어두세요.' },
        { h: '관계의 분기점', t: '2027년은 두 사람에게 ‘관계를 공식화할 것인가’를 묻는 해가 될 수 있습니다. ' + (gaCount + gbCount >= 3 ? '두 사람 모두 관성이 있어, 공식적인 자리와 주변의 인정을 의식합니다. 그래서 시기를 정하는 것이 중요합니다.' : '두 사람 모두 관성이 많지 않아, 형식보다 둘만의 합의가 중요합니다.') + ' 분기점은 대개 상반기(4~6월)와 하반기(10~12월)에 옵니다. 이 두 시기에 큰 대화를 미리 잡아두면, 감정이 아니라 계획으로 이야기할 수 있습니다.' }
      ],
      dosa: [
        '2027년은 정미년, 작은 불이 흙을 데우는 해일세. 크게 벌이기보다 익히는 해지.',
        who(nmA, ya.ganSipsin + ',') + ' ' + who(nmB, yb.ganSipsin + ' 운이라네.') + ' ' + (ya.ganSipsin === yb.ganSipsin ? '같은 방향이라 함께 가면 빠르네. 대신 브레이크가 필요하지.' : '한쪽이 밀고 한쪽이 정리하는 흐름이라, 역할을 나누면 좋네.'),
        '봄에 시작하고 가을에 정리하게. 겨울엔 평가하지 말고 내년 계획이나 적어두게. 허허.'
      ],
      chips: ['2027 ' + ya.ganzi, nmA + ' ' + ya.ganSipsin, nmB + ' ' + yb.ganSipsin, '미토 ' + (jiTags(ja, 7).concat(jiTags(jb, 7)).join('·') || '무난')]
    });

    /* ============ 07 처방전 ============ */
    add({
      key: 'remedy', no: '07', title: '도사님의 궁합 처방전',
      tagline: '오래 가는 데이트 · 소통 규칙 · 행운의 색과 시기',
      lead: nmA + ' ' + yaElem + ' · ' + nmB + ' ' + ybElem + ' — 두 사람의 균형추',
      paras: [
        { h: '오래 가는 데이트', t: '두 사람에게 좋은 데이트는 비싼 곳이 아니라 기운이 맞는 곳입니다. ' + nmA + '에게는 ' + ELEM_FILL[yaElem].date + ' 같은 곳이 약이 되고, ' + nmB + '에게는 ' + ELEM_FILL[ybElem].date + '이 잘 맞습니다. 두 사람이 함께 가기 좋은 곳은 ' + gwa(ELEM_FILL[yaElem].date.split(',')[0]) + ' ' + ELEM_FILL[ybElem].date.split(',')[0] + '를 번갈아 가는 것입니다. 한쪽만 계속 맞춰주면 그 사람이 지칩니다.' },
        { h: '소통 규칙 세 가지', t: '첫째, 중요한 이야기는 앉아서 하세요. 걷거나 운전하면서 하는 대화는 결론이 나지 않습니다. 둘째, 감정이 올라오면 30분 규칙을 적용하세요. 30분은 자리를 비우는 시간이 아니라, 각자 생각을 정리해 한 문장으로 돌아오는 시간입니다. 셋째, 한 주에 한 번 ‘고마웠던 일 하나’를 말하세요. ' + (tags.indexOf('충') >= 0 || tags.indexOf('형') >= 0 ? '특히 부딪히는 자리가 있는 두 사람에게 이 규칙은 싸움의 빈도를 실제로 줄입니다.' : '부딪힘이 적은 두 사람일수록 이 규칙이 관계의 온도를 유지합니다.') },
        { h: '행운의 색과 장소', t: nmA + '의 균형추는 ' + yaElem + '(' + a.yongsin.group + ') 기운입니다. ' + ELEM_FILL[yaElem].what + '이 ' + nmA + '에게 약이 되고, 색으로는 ' + COLOR[yaElem] + '이 좋습니다. ' + nmB + '의 균형추는 ' + ybElem + ' 기운으로, 색은 ' + COLOR[ybElem] + '입니다. 두 사람이 함께 쓰는 물건 하나(쿠션·컵·커튼)를 이 색으로 맞추면 기분 좋은 공통점이 생깁니다.' },
        { h: '주의할 시기', t: '2027년에 두 사람이 특히 조심할 때는 ' + (jiTags(ja, 7).indexOf('충') >= 0 || jiTags(jb, 7).indexOf('충') >= 0 ? '미토가 충을 이루는 7~9월' : '감정의 온도가 올라가는 5~7월') + '입니다. 이 시기에는 큰 결정(이사·결혼·투자)을 미루고, 이미 정한 일을 실행하는 데 집중하세요. 그리고 ' + nmA + '의 기신은 ' + a.yongsin.gisin + ', ' + nmB + '의 기신은 ' + b.yongsin.gisin + ' 기운입니다. 기신이 겹치는 날은 서로의 말이 유난히 크게 들리니, 그런 날엔 중요한 대화를 피하는 것이 좋습니다.' },
        { h: '도사님의 마지막 처방', t: '궁합은 점수가 아니라 사용법입니다. ' + gwa(nmA) + ' ' + nmB + ' ' + base.score + '점, ' + ira(base.grade) + '고 했지만 그 숫자는 두 사람이 어떤 날을 어떻게 보내느냐에 따라 달라집니다. 이 리포트에서 기억할 것은 세 가지입니다. 첫째, ' + (fillA.length || fillB.length ? '서로가 채워주는 기운을 고맙게 여기세요.' : '서로에게 없는 기운은 함께 생활로 채우세요.') + ' 둘째, 싸움이 커지는 순서를 알고 2단계에서 멈추세요. 셋째, 한 달에 한 번은 ‘우리 잘 지내고 있나’를 묻는 시간을 가지세요. 이 세 가지면 충분합니다. 나머지는 두 사람이 만드는 것입니다.' }
      ],
      dosa: [
        '처방은 간단하네. ' + nmA + '에겐 ' + yaElem + ', ' + nmB + '에겐 ' + ybElem + ' 기운일세. 색과 장소를 곁에 두게.',
        '싸움은 2단계에서 멈추게. 사실만 확인하고 감정은 한 시간 뒤에 말하는 것일세.',
        '한 달에 한 번 “우리 잘 지내고 있나” 묻는 것. 그거면 반은 산 것일세. 허허.'
      ],
      chips: [yaElem + '·' + ybElem + ' 보완', '데이트 ' + ELEM_FILL[yaElem].date.split(',')[0], '주의 ' + (jiTags(ja, 7).indexOf('충') >= 0 || jiTags(jb, 7).indexOf('충') >= 0 ? '7~9월' : '5~7월')]
    });

    /* ---- 글자수 ---- */
    sections.forEach(function (s) {
      s.chars = s.paras.reduce(function (n, p) { return n + p.t.replace(/\s/g, '').length; }, 0);
    });

    var total = sections.reduce(function (n, s) { return n + s.chars; }, 0);
    var byKey = {};
    sections.forEach(function (s) { byKey[s.key] = s; });

    /* 도사 말풍선 탭 */
    var talk = [
      { key: 'chong', label: '총평', text: gwa(nmA) + ' ' + nmB + ', ' + base.score + '점, ' + ira(base.grade) + '고 했네. ' + relLead.split('. ').slice(1).join(' ') + ' 다만 점수는 참고일 뿐, 두 사람이 어디서 맞고 어디서 어긋나는지가 더 중요하네.' },
      { key: 'spark', label: '설렘·끌림', text: sections[0].dosa[0] + ' ' + sections[0].dosa[1] },
      { key: 'heart', label: '속마음', text: JI_INNER[ja] + ' ' + Ji[jb].name + ' 자리의 ' + eun(nmB) + ' ' + JI_EXPRESS[jb] + ' 이 차이를 알면 서운함의 절반이 줄어드네.' },
      { key: 'life', label: '현실·생활', text: sections[3].dosa[1] + ' ' + (jiHapOf(ja, jb) ? '생활 리듬이 합을 이루니 같이 사는 게 수월하네.' : '생활 리듬이 달라 규칙이 필요하네. 밥 시간과 돈 통장부터 정하게.') },
      { key: 'clash', label: '갈등 포인트', text: sections[4].dosa[0] + ' ' + sections[4].dosa[1] },
      { key: 'keep', label: '오래가는 비결', text: sections[6].dosa[0] + ' ' + sections[6].dosa[2] },
      { key: 'year', label: '2027', text: sections[5].dosa[0] + ' ' + sections[5].dosa[1] }
    ];

    return {
      score: base.score, grade: base.grade, notes: base.notes,
      gauges: gs, talk: talk, sections: sections, byKey: byKey,
      totalChars: total, relName: relName(rel, tags)
    };
  };

  global.Compat = COMPAT;
  if (typeof module !== 'undefined' && module.exports) module.exports = COMPAT;
})(typeof window !== 'undefined' ? window : globalThis);
