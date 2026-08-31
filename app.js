/* ============================================================
   UI: 입력 · 계산 · 렌더
   ============================================================ */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
const esc = (t) => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CITIES = [
  ['서울', 126.978], ['인천', 126.705], ['수원', 127.010], ['춘천', 127.729], ['강릉', 128.896],
  ['세종', 127.289], ['대전', 127.385], ['청주', 127.489], ['천안', 127.115],
  ['전주', 127.148], ['광주', 126.852], ['목포', 126.392], ['여수', 127.662],
  ['대구', 128.601], ['안동', 128.729], ['포항', 129.365], ['창원', 128.681],
  ['부산', 129.075], ['울산', 129.311], ['제주', 126.531],
];

const state = { gender: 'M', calendar: 'solar', mbti: [null, null, null, null] };
const EL_VAR = { 목: '--el-mok', 화: '--el-hwa', 토: '--el-to', 금: '--el-geum', 수: '--el-su' };
const NOW = new Date();

/* ---------- 셀렉트 ---------- */
function fill(sel, items, val) {
  sel.innerHTML = items.map(([v, t]) => `<option value="${v}">${t}</option>`).join('');
  if (val != null) sel.value = val;
}
fill($('#by'), Array.from({ length: NOW.getFullYear() - 1929 }, (_, i) => {
  const y = NOW.getFullYear() - i; return [y, y + '년'];
}), 1995);
fill($('#bm'), Array.from({ length: 12 }, (_, i) => [i + 1, (i + 1) + '월']), 1);
fill($('#bh'), Array.from({ length: 24 }, (_, i) => [i, String(i).padStart(2, '0') + '시']), 12);
fill($('#bi'), Array.from({ length: 60 }, (_, i) => [i, String(i).padStart(2, '0') + '분']), 0);
fill($('#city'), CITIES.map(([n, lo]) => [lo, n]), 126.978);

function refreshDays() {
  const y = +$('#by').value, m = +$('#bm').value, keep = +$('#bd').value;
  let n;
  if (state.calendar === 'lunar') {
    const lp = leapMonthOf(y);
    const wrap = $('#leapWrap');
    if (lp === m) { wrap.style.display = 'flex'; $('#leapText').textContent = `윤${m}월로 계산`; }
    else { wrap.style.display = 'none'; $('#leap').checked = false; }
    n = lunarMonthLength(y, m, $('#leap').checked) || 29;
  } else {
    $('#leapWrap').style.display = 'none';
    n = new Date(y, m, 0).getDate();
  }
  fill($('#bd'), Array.from({ length: n }, (_, i) => [i + 1, (i + 1) + '일']), Math.min(keep || 1, n));
}
refreshDays();

/* ---------- 입력 위젯 ---------- */
function segment(sel, key, after) {
  $$('#' + sel + ' button').forEach(b => b.addEventListener('click', () => {
    $$('#' + sel + ' button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    state[key] = b.dataset.v;
    if (after) after();
  }));
}
segment('gender', 'gender');
segment('cal', 'calendar', refreshDays);

$$('#mbti .axis').forEach(ax => {
  const i = +ax.dataset.axis;
  $$('button', ax).forEach(b => b.addEventListener('click', () => {
    $$('button', ax).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    state.mbti[i] = b.dataset.v;
    syncMbti();
  }));
});
function syncMbti() {
  $('#mbtiOut').textContent = state.mbti.map(c => c || '○').join(' ');
  $('#go').disabled = !state.mbti.every(Boolean);
}
$('#by').addEventListener('change', refreshDays);
$('#bm').addEventListener('change', refreshDays);
$('#leap').addEventListener('change', refreshDays);
$('#notime').addEventListener('change', e => {
  const off = e.target.checked;
  $('#bh').disabled = off; $('#bi').disabled = off;
  $('#bh').style.opacity = $('#bi').style.opacity = off ? .4 : 1;
});
$('#go').addEventListener('click', run);

function readInput() {
  return {
    name: $('#name').value.trim(),
    year: +$('#by').value, month: +$('#bm').value, day: +$('#bd').value,
    hour: +$('#bh').value, minute: +$('#bi').value,
    unknownTime: $('#notime').checked,
    gender: state.gender, calendar: state.calendar, leapMonth: $('#leap').checked,
    longitude: +$('#city').value, trueSolar: $('#tsolar').checked,
    lateNight: $('#yaja').checked ? 'yaja' : 'joja',
    mbti: state.mbti.join(''),
  };
}

function run() {
  $('#err').innerHTML = '';
  const inp = readInput();
  let s;
  try { s = buildSaju(inp); } catch (e) { s = { error: '계산 중 문제가 생겼어요. 날짜를 다시 확인해 주세요.' }; }
  if (!s || s.error) {
    $('#err').innerHTML = `<div class="err">${esc(s ? s.error : '계산에 실패했어요.')}</div>`;
    return;
  }
  render(s, inp);
  $('#result').classList.add('on');            // 결과 표시가 최우선
  // 주소 갱신은 실패해도 무시. 샌드박스 iframe에서는 막혀 있다
  try { history.replaceState(null, '', '#' + encodeState(inp)); }
  catch (e) { try { location.hash = encodeState(inp); } catch (e2) { /* 공유 링크만 포기 */ } }
  try { requestAnimationFrame(() => $('#result').scrollIntoView({ behavior: 'smooth', block: 'start' })); }
  catch (e) { /* 스크롤 실패는 무시 */ }
}

/* ---------- 조각 렌더러 ---------- */
function codeRow(label, code, diffAgainst, tone) {
  const letters = code.split('').map((c, i) =>
    `<span class="${diffAgainst && diffAgainst[i] !== c ? 'diff' : ''}">${c}</span>`).join('');
  return `<div class="codebox ${tone}"><span class="ck">${label}</span><span class="code">${letters}</span></div>`;
}

function compareChart(rep, mbtiKey) {
  const rows = AXES.map((ax, i) => {
    const a = rep.innate;
    const born = Math.max(6, Math.min(94, (a.values[i] + 1) / 2 * 100));
    const nowLetter = mbtiKey[i];
    const changed = a.code[i] !== nowLetter;
    const border = a.power[i] < 0.25;
    return `
      <div class="cmp">
        <div class="cmp-head">
          <span class="cmp-name">${ax.name}<em class="conf">신뢰도 ${ax.conf}</em></span>
          <span class="cmp-tag ${border ? 'bd' : changed ? 'ch' : 'sm'}">${border ? '경계' : changed ? `${a.code[i]} → ${nowLetter}` : `${nowLetter} 그대로`}</span>
        </div>
        <div class="cmp-row">
          <span class="cmp-end ${nowLetter === ax.neg ? 'on' : ''}">${ax.neg}</span>
          <div class="rail">
            <span class="zone ${nowLetter === ax.neg ? 'l' : 'r'}"></span>
            <i class="mid"></i><i class="ctr"></i>
            <b class="mk born ${border ? 'bd' : changed ? 'out' : ''}" style="left:${born}%"></b>
          </div>
          <span class="cmp-end ${nowLetter === ax.pos ? 'on' : ''}">${ax.pos}</span>
        </div>
        <div class="cmp-foot"><span>${ax.negL}</span><span>${ax.posL}</span></div>
      </div>`;
  }).join('');

  return `
    <section class="card">
      <span class="label"><em>先天 · 後天</em>타고난 기질과 지금의 나</span>
      <div class="codes">
        ${codeRow('사주가 말하는 나', rep.innate.code, mbtiKey, 'born')}
        <span class="codes-arrow">→</span>
        ${codeRow('지금의 나', mbtiKey, rep.innate.code, 'now')}
      </div>
      <div class="cmp-legend">
        <span><b class="lg born"></b>사주가 가리키는 위치</span>
        <span><b class="lg zone"></b>지금 서 있는 쪽</span>
      </div>
      <div class="cmps">${rows}</div>
      <p class="cmp-note">${rep.lead}</p>
      <p class="cmp-basis">판정 근거는 <b>격국(월지) &gt; 십신 분포 &gt; 오행 비율 &gt; 신살</b> 순으로 가중치를 둡니다.
         이 사주의 격국은 <b>${rep.gyeok}</b>이에요. 신강·신약은 방향이 아니라 성향이 드러나는 강도에만 씁니다.
         네 축의 신뢰도는 같지 않습니다. 판단(T/F) 축은 명리에 정서를 재는 언어가 없어서 가장 약해요.</p>
    </section>`;
}

const HUE_VAR = { 목: '--el-mok', 화: '--el-hwa', 토: '--el-to', 금: '--el-geum', 수: '--el-su' };
function sectionCard(x) {
  const last = x.body.length - 1;
  const hue = x.hue ? ` style="--sec:var(${HUE_VAR[x.hue]})"` : '';
  const paras = x.body.map((p, i) =>
    `<p class="${x.soothe && i === last ? 'soothe' : ''}${x.lead && i === 0 ? ' lead' : ''}">${p}</p>`).join('');
  return `
    <section class="card sec ${x.accent ? 'accent' : ''}"${hue}>
      <span class="tag">${x.tag}</span>
      <h3>${x.title}</h3>
      ${paras}
      ${x.chips ? `<div class="chips">${x.chips.map(c => `<span class="pill">${c}</span>`).join('')}</div>` : ''}
    </section>`;
}

/* ---------- 렌더 ---------- */
function render(s, inp) {
  const rep = generateReport(s, inp.mbti);
  const fort = yearFortune(s, NOW.getFullYear());
  const cp = compatibility(s, rep.innate.code, inp.mbti);
  const kit = luckyKit(s);
  const who = inp.name ? `${esc(inp.name)}님` : '당신';

  /* 원국 */
  const cols = [
    ['year', '년주', '뿌리·어린 시절'], ['month', '월주', '부모·사회'],
    ['day', '일주', '나·배우자'], ['hour', '시주', '자식·말년'],
  ];
  const pillarsHtml = cols.map(([k, t, sub], i) => {
    const p = s.pillars[k];
    if (!p) return `<div class="pil" style="animation-delay:${i * 80}ms">
      <div class="head">${t}<br><span style="font-weight:400">${sub}</span></div>
      <div class="glyph" style="padding:26px 2px"><span class="kr" style="font-size:12px">시간 미상</span></div></div>`;
    const g = GAN[p.gan], j = JI[p.ji];
    const gGod = k === 'day' ? '나' : tenGod(s.dayGan, p.gan);
    const jGod = tenGod(s.dayGan, GAN.findIndex(x => x.k === j.hidden[j.hidden.length - 1][0]));
    return `<div class="pil ${k === 'day' ? 'me' : ''}" style="animation-delay:${i * 80}ms">
      <div class="head">${t}<br><span style="font-weight:400">${sub}</span></div>
      <div class="glyph"><span class="ch hanja">${g.h}</span><span class="kr">${g.k}</span><span class="god">${gGod}</span></div>
      <div class="divide"></div>
      <div class="glyph"><span class="ch hanja">${j.h}</span><span class="kr">${j.k}</span><span class="god">${jGod}</span></div>
      <div class="hid">${j.hidden.map(h => h[0]).join('·')}</div>
    </div>`;
  }).join('');

  const total = Object.values(s.oheng).reduce((a, b) => a + b, 0) || 1;
  const barHtml = OHENG.map(e =>
    `<i style="width:${(s.oheng[e] / total * 100).toFixed(2)}%;background:var(${EL_VAR[e]})"></i>`).join('');
  const OH_HANJA = { 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' };
  const keyHtml = OHENG.map(e =>
    `<span><em style="color:var(${EL_VAR[e]})">${OH_HANJA[e]}</em>${e} ${s.oheng[e].toFixed(1)}</span>`).join('');

  const born = new Date(s.solar.y, s.solar.m - 1, s.solar.d);
  let age = NOW.getFullYear() - born.getFullYear();
  if (NOW < new Date(NOW.getFullYear(), born.getMonth(), born.getDate())) age--;
  const daeunHtml = s.daeun.map(d => {
    const on = age >= d.age && age < d.age + 10;
    return `<div class="du ${on ? 'now' : ''}">
      <div class="age">${d.age}세</div>
      <div class="gz">${GAN[d.gan].h}${JI[d.ji].h}</div>
      <div class="kr">${GAN[d.gan].k}${JI[d.ji].k}</div></div>`;
  }).join('');

  const cal = `양력 ${s.solar.y}.${s.solar.m}.${s.solar.d} · 음력 ${s.lunar.y}.${s.lunar.leap ? '윤' : ''}${s.lunar.m}.${s.lunar.d}`;
  const timeTxt = s.unknownTime ? '시간 미상'
    : `${String(s.solar.hour).padStart(2, '0')}:${String(s.solar.minute).padStart(2, '0')}`;

  const wongook = `
    <section class="card">
      <span class="label"><em>四柱八字</em>사주 원국</span>
      <div class="wongook" style="margin-top:11px">${pillarsHtml}</div>
      <div class="meta-line">
        <span class="pill">${cal}</span>
        <span class="pill">${timeTxt}</span>
        <span class="pill">${s.jeolgi} 절입</span>
        ${s.correction.lonCorrMin ? `<span class="pill">진태양시 ${s.correction.lonCorrMin > 0 ? '+' : ''}${s.correction.lonCorrMin}분</span>` : ''}
        ${s.correction.dst ? '<span class="pill">서머타임 −1h</span>' : ''}
        ${s.correction.stdOffset !== 9 ? `<span class="pill">당시 표준시 UTC+${s.correction.stdOffset}</span>` : ''}
      </div>
      <div class="obar" style="margin-top:18px">${barHtml}</div>
      <div class="okey">${keyHtml}</div>
    </section>`;

  const secs = rep.sections;
  const head = secs[0], rest = secs.slice(1);

  $('#result').innerHTML = `
    <div class="hero">
      <div class="eyebrow">${esc(rep.eyebrow)}</div>
      <div class="seal" aria-label="일주 ${GAN[s.pillars.day.gan].k}${JI[s.pillars.day.ji].k}">
        <b>${GAN[s.pillars.day.gan].h}</b><b>${JI[s.pillars.day.ji].h}</b>
      </div>
      <h2>${rep.headline}</h2>
      <div class="hero-meta">
        <b>${rep.changed.length === 0 ? '네 축 모두 그대로' : rep.changed.length + '개 축이 달라짐'}</b>
        · ${s.strength} · ${JI[s.pillars.year.ji].animal}띠${s.shinsal.length ? ' · ' + s.shinsal.slice(0, 3).join(' · ') : ''}
      </div>
    </div>

    <div class="eomi"><i></i></div>
    ${compareChart(rep, inp.mbti)}
    ${sectionCard(head)}
    ${wongook}
    ${rest.map(sectionCard).join('')}

    <section class="card sec" style="--sec:var(--el-su)">
      <span class="tag">${NOW.getFullYear()}년 운</span>
      <h3>올해는 어떤 바람이 부나</h3>
      <div class="fortune-head">
        <span class="y">${fort.label}</span>
        <span class="tone ${fort.tone}">${fort.tone}</span>
      </div>
      ${fort.lines.map(p => `<p>${p}</p>`).join('')}
    </section>

    <section class="card sec" style="--sec:var(--el-hwa)">
      <span class="tag">궁합</span>
      <h3>옆에 두면 숨이 트이는 사람</h3>
      <div class="compat">
        <div class="cbox">
          <div class="t">잘 맞는 MBTI</div>
          <div class="list">${cp.goodMbti.map(m => `<span class="tagm">${m}</span>`).join('')}</div>
          <p>${cp.goodWhy}</p>
        </div>
        <div class="cbox">
          <div class="t">${cp.homeSame ? '지금의 나 = 타고난 나' : '이상하게 편해지는 사람'}</div>
          <div class="list"><span class="tagm gold">${cp.homeMbti}</span></div>
          <p>${cp.homeWhy}</p>
        </div>
        ${cp.watchMbti.length ? `<div class="cbox">
          <div class="t">같이 뜨거워지는 MBTI</div>
          <div class="list">${cp.watchMbti.map(m => `<span class="tagm">${m}</span>`).join('')}</div>
          <p>${cp.watchWhy}</p></div>` : ''}
        <div class="cbox">
          <div class="t">띠 궁합</div>
          <div class="list">${cp.goodAnimals.map(a => `<span class="tagm">${a}띠</span>`).join('')}</div>
          <p>일지 ${cp.dayJi.k}(${cp.dayJi.h})와 합(合)을 이루는 띠입니다.
             반대로 <b>${cp.hardAnimals.join('·')}띠</b>와는 충(沖)이라 결이 자주 부딪혀요. 나쁜 게 아니라 자극이 큰 관계입니다.</p>
        </div>
      </div>
    </section>

    <section class="card sec" style="--sec:var(--el-mok)">
      <span class="tag">처방</span>
      <h3>기울어진 쪽을 채우는 법</h3>
      <div class="kit">${kit.map(k => `<div><div class="k">${k.k}</div><div class="v">${k.v}</div></div>`).join('')}</div>
      <p style="margin-top:15px">용신 <b>${s.yongshin}</b>${jong(s.yongshin) > 0 ? '을' : '를'} 일상에 조금씩 늘리는 방식입니다. 부적 같은 게 아니라, 부족한 기운 쪽으로 습관을 살짝 기울여 두라는 뜻이에요.</p>
    </section>

    ${s.shinsal.length ? `<section class="card sec" style="--sec:var(--el-to)">
      <span class="tag">신살</span>
      <h3>원국에 박힌 특수 기운</h3>
      ${s.shinsal.map(k => `<p><b>${k}</b>. ${SHINSAL_DESC[k]}</p>`).join('')}
    </section>` : ''}

    <section class="card sec" style="--sec:var(--el-geum)">
      <span class="tag">대운</span>
      <h3>10년마다 바뀌는 판</h3>
      <p style="margin-bottom:15px">${s.daeun[0].age}세부터 ${s.forward ? '순행' : '역행'}으로 흐릅니다. 강조된 칸이 ${who}이 지금(만 ${age}세) 지나고 있는 대운이에요.</p>
      <div class="daeun">${daeunHtml}</div>
    </section>

    <div class="eomi"><i></i></div>
    <div class="actions">
      <button class="btn2" id="share">결과 링크 복사</button>
      <button class="btn2" id="again">다시 보기</button>
    </div>

    <p class="note">
      사주는 태어난 순간의 절기와 시각을 천문 계산으로 환산한 결과이고, ‘타고난 기질’은 그 원국을 MBTI 네 축으로 옮겨 본 추정입니다.<br>
      사람은 사주로도 MBTI로도 다 설명되지 않아요. 맞는 문장만 가져가고, 나머지는 흘려보내면 됩니다.
    </p>`;

  $('#share').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      const t = $('#toast'); t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 1800);
    } catch { prompt('이 주소를 복사하세요', location.href); }
  });
  $('#again').addEventListener('click', () => {
    $('#result').classList.remove('on');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ---------- 링크 공유 ---------- */
function encodeState(i) {
  return [1, i.year, i.month, i.day, i.unknownTime ? 'x' : i.hour, i.minute, i.gender,
    i.calendar === 'lunar' ? (i.leapMonth ? 'L' : 'l') : 's', i.mbti,
    Math.round(i.longitude * 1000), i.trueSolar ? 1 : 0, i.lateNight === 'yaja' ? 1 : 0,
    encodeURIComponent(i.name || '')].join('.');
}
function decodeState() {
  const h = location.hash.slice(1);
  if (!h) return null;
  const p = h.split('.');
  if (p[0] !== '1' || p.length < 12) return null;
  return {
    year: +p[1], month: +p[2], day: +p[3], hour: p[4] === 'x' ? 12 : +p[4], minute: +p[5],
    unknownTime: p[4] === 'x', gender: p[6], calendar: p[7] === 's' ? 'solar' : 'lunar',
    leapMonth: p[7] === 'L', mbti: p[8], longitude: +p[9] / 1000,
    trueSolar: p[10] === '1', lateNight: p[11] === '1' ? 'yaja' : 'joja',
    name: decodeURIComponent(p[12] || ''),
  };
}
(function restore() {
  let d = null;
  try { d = decodeState(); } catch (e) { return; }
  if (!d || !MBTI[d.mbti]) return;
  state.gender = d.gender; state.calendar = d.calendar; state.mbti = d.mbti.split('');
  $$('#gender button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === d.gender)));
  $$('#cal button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === d.calendar)));
  $$('#mbti .axis').forEach((ax, i) =>
    $$('button', ax).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === state.mbti[i]))));
  $('#by').value = d.year; $('#bm').value = d.month;
  $('#leap').checked = d.leapMonth; refreshDays(); $('#bd').value = d.day;
  $('#bh').value = d.hour; $('#bi').value = d.minute;
  $('#notime').checked = d.unknownTime; $('#notime').dispatchEvent(new Event('change'));
  $('#city').value = d.longitude; $('#tsolar').checked = d.trueSolar;
  $('#yaja').checked = d.lateNight === 'yaja'; $('#name').value = d.name;
  syncMbti();
  run();
})();
syncMbti();
