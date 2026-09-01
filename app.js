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
/* ---------- 시각 블록 렌더러 ---------- */
function matchCard(title, name, kw, line) {
  return `<div class="mcard">
    <div class="mc-t">${title}</div>
    <div class="mc-n">${name}</div>
    <div class="mc-k">${kw.map(k => `<span>${k}</span>`).join('')}</div>
    <p>${line}</p>
  </div>`;
}

function checkList(title, items) {
  if (!items.length) return '';
  return `<div class="clist">
    <div class="cl-t">${title}</div>
    ${items.map(t => `<div class="cl-i"><i></i><span>${t}</span></div>`).join('')}
  </div>`;
}

function marryTimeline(w) {
  const pct = (a) => ((a - w.min) / (w.max - w.min)) * 100;
  const bars = w.spans.map(sp => {
    const from = Math.max(sp.from, w.min), to = Math.min(sp.to, w.max);
    return `<b class="tl-bar" style="left:${pct(from)}%;width:${pct(to) - pct(from)}%"></b>
            <span class="tl-lab" style="left:${pct(from)}%">${sp.from}세</span>`;
  }).join('');
  const nowPct = w.age >= w.min && w.age <= w.max ? pct(w.age) : null;
  return `<div class="tl">
    <div class="tl-t">${w.grp}이 드는 구간 · 인연이 눈에 보이는 시기</div>
    <div class="tl-track">
      ${bars}
      ${nowPct != null ? `<b class="tl-now" style="left:${nowPct}%"></b>` : ''}
    </div>
    <div class="tl-ax"><span>15세</span><span>35세</span><span>55세</span></div>
    ${w.spans.length ? '' : '<p class="tl-none">이 구간에는 해당 시기가 없습니다. 10년 단위의 흐름보다 그해의 운이나 일상의 계기로 만나는 쪽이에요.</p>'}
  </div>`;
}

function jobGrid(picks) {
  return `<div class="jobs">${picks.map(j =>
    `<div class="job"><b>${j.name}</b><span>${j.why}</span></div>`).join('')}</div>`;
}

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
/* 연애와 결혼을 한 칸 안에서 탭으로 */
function pairCard(a, b, extraA, extraB) {
  const para = (x) => x.body.map((p, i) =>
    `<p class="${x.soothe && i === x.body.length - 1 ? 'soothe' : ''}">${p}</p>`).join('');
  const chips = (x) => x.chips ? `<div class="chips">${x.chips.map(k => `<span class="pill">${k}</span>`).join('')}</div>` : '';
  return `
    <section class="card sec" style="--sec:var(--el-hwa)">
      <span class="tag">연애와 결혼</span>
      <div class="subtabs" role="tablist">
        <button type="button" role="tab" aria-selected="true" data-p="A">연애</button>
        <button type="button" role="tab" aria-selected="false" data-p="B">결혼</button>
      </div>
      <div class="pane" data-p="A">
        <h3>${a.title}</h3>
        ${para(a)}${extraA}${chips(a)}
      </div>
      <div class="pane" data-p="B" hidden>
        <h3>${b.title}</h3>
        ${para(b)}${extraB}${chips(b)}
      </div>
    </section>`;
}

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
      <div class="stage">${twelveStage(s.dayGan, p.ji)}</div>
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

  /* 새 콘텐츠 */
  const stages = lifeStages(s);
  const health = healthReport(s);
  const job = GYEOK_JOB[rep.gyeok];
  const dstory = daeunStory(s, age);
  const todayJD = gregorianToJDN(NOW.getFullYear(), NOW.getMonth() + 1, NOW.getDate()) - 0.5;
  const months = monthlyFortune(s, NOW.getFullYear(), todayJD);

  const picks = jobPicks(s, rep.gyeok);

  const aptitudeSec = `
    <section class="card sec" style="--sec:var(--el-geum)">
      <span class="tag">적성</span>
      <h3>${job.tag}</h3>
      <p>월지에서 잡히는 격국이 <b>${rep.gyeok}</b>입니다. 사주에서 사람의 틀을 가장 크게 정하는 자리이고, 어떤 판에 놓였을 때 가장 자기답게 움직이는지를 보여줍니다.</p>
      <p>${job.line}</p>
      <div class="blk-t">잘 맞는 직업</div>
      ${jobGrid(picks)}
      <p style="margin-top:16px">다만 격국은 직업의 이름이 아니라 <b>일하는 방식의 결</b>입니다. 위 목록은 예시일 뿐이고, 같은 회사 안에서도 이 결에 맞는 자리로 옮기면 훨씬 덜 지칩니다.</p>
    </section>`;

  const healthSec = `
    <section class="card sec" style="--sec:var(--el-mok)">
      <span class="tag">몸</span>
      <h3>기운이 몰리는 곳과 비는 곳</h3>
      <p>사주에서 오행은 몸의 장부와 이어집니다. 넘치는 쪽과 모자란 쪽 모두 신호를 보냅니다.</p>
      <p><b>${health.top}이 가장 두껍습니다.</b> ${health.topH.organ} 쪽입니다. ${health.topH.over}</p>
      <p><b>${health.low}이 가장 얇습니다.</b> ${health.lowH.organ} 쪽입니다. ${health.lowH.under}</p>
      <p class="soothe">몸이 정해져 있다는 뜻은 아닙니다. 어느 쪽이 먼저 신호를 보내는지 알아두면, 무리하기 전에 한 박자 먼저 쉴 수 있어요. 그 정도로 쓰면 충분합니다.</p>
    </section>`;

  const stageSec = `
    <section class="card sec" style="--sec:var(--el-su)">
      <span class="tag">십이운성</span>
      <h3>기운의 사계절</h3>
      <p>일간이 각 기둥의 지지에서 갖는 힘의 단계를 십이운성이라 합니다. 씨앗에서 자라 무성해졌다가 갈무리되는 흐름이고, 네 기둥이 인생의 사계절에 대응합니다.</p>
      ${stages.map(x => `<p><b>${x.label} · ${x.span}</b><br>${x.ji.k}(${x.ji.h})에서 <b>${x.stage}</b>, ${x.desc.short}. ${x.desc.line}</p>`).join('')}
    </section>`;

  const monthSec = `
    <section class="card sec" style="--sec:var(--el-hwa)">
      <span class="tag">${NOW.getFullYear()}년 월운</span>
      <h3>달마다 부는 바람</h3>
      <p>절기를 기준으로 나눈 열두 달입니다. 표시된 달이 지금 지나는 구간이에요.</p>
      <div class="months">
        ${months.map(m => `<div class="mrow ${m.isNow ? 'now' : ''}">
          <span class="m">${m.label}</span>
          <b class="gz hanja">${m.gz}</b>
          <span class="l"><b>${m.god}${m.good ? ' ◎' : ''}</b> ${m.line}</span>
        </div>`).join('')}
      </div>
      <p style="margin-top:16px">◎ 표시는 당신에게 부족한 기운(용신 ${s.yongshin})이 들어오는 달입니다. 미뤄둔 일을 꺼내기 좋아요.</p>
    </section>`;

  const daeunSec = `<section class="card sec" style="--sec:var(--el-geum)">
      <span class="tag">대운</span>
      <h3>10년마다 바뀌는 판</h3>
      <p>${s.daeun[0].age}세부터 ${s.forward ? '순행' : '역행'}으로 흐릅니다. 아래에서 강조된 칸이 ${who}이 지금(만 ${age}세) 지나고 있는 자리예요.</p>
      ${dstory.now ? `<p><b>지금 ${dstory.now.age}세 대운 · ${dstory.now.gzk}(${dstory.now.gz}) · ${dstory.now.god}</b><br>${dstory.now.line}</p>
      <p>이 10년의 십이운성은 <b>${dstory.now.stage}</b>입니다. ${STAGE_DESC[dstory.now.stage].line}</p>` : ''}
      ${dstory.next ? `<p><b>다음 ${dstory.next.age}세 대운 · ${dstory.next.gzk}(${dstory.next.gz}) · ${dstory.next.god}</b><br>${dstory.next.line}</p>` : ''}
      <div class="daeun" style="margin-top:18px">${daeunHtml}</div>
    </section>`;

  const secs = rep.sections;
  const head = secs[0], rest = secs.slice(1);

  /* 연애·결혼 시각 블록 */
  const loveSec = secs.find(x => x.id === 'love');
  const marSec = secs.find(x => x.id === 'marriage');
  const partner = PARTNER_TYPE[s.spouseGod];
  const elp = EL_PARTNER[s.yongshin];
  const cautions = loveCautions(s, rep);
  const mw = marryWindow(s, age);
  const loveExtra = `
    <div class="blk-t">이런 사람과 잘 맞아요</div>
    <div class="mcards">
      ${matchCard('끌리는 쪽', partner.name, partner.kw, partner.line)}
      ${matchCard('숨이 트이는 쪽', elp.name, elp.kw, elp.line)}
      ${matchCard('띠 궁합', cp.goodAnimals.map(a => a + '띠').join(' · '), ['일지 합'], `일지 ${cp.dayJi.k}(${cp.dayJi.h})와 합을 이루는 띠입니다. 반대로 ${cp.hardAnimals.join('·')}띠와는 자극이 큰 관계예요.`)}
    </div>
    ${checkList('연애할 때 조심할 것', cautions)}`;
  const marryExtra = `${marryTimeline(mw)}`;
  const lovePair = loveSec && marSec ? pairCard(loveSec, marSec, loveExtra, marryExtra) : '';


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
    ${rest.map(x => x.id === 'love' ? lovePair : x.id === 'marriage' ? '' : sectionCard(x)).join('')}
    ${aptitudeSec}
    ${healthSec}

    <div class="eomi"><i></i></div>
    ${stageSec}
    ${daeunSec}

    <section class="card sec" style="--sec:var(--el-su)">
      <span class="tag">${NOW.getFullYear()}년 운</span>
      <h3>올해는 어떤 바람이 부나</h3>
      <div class="fortune-head">
        <span class="y">${fort.label}</span>
        <span class="tone ${fort.tone}">${fort.tone}</span>
      </div>
      ${fort.lines.map(p => `<p>${p}</p>`).join('')}
    </section>

    ${monthSec}

    <div class="eomi"><i></i></div>

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
      <span class="tag">신살 목록</span>
      <h3>원국에 박힌 기운들</h3>
      <p>아래 기운들은 앞의 각 항목에서 해당하는 자리에 이미 설명해 두었습니다. 여기서는 무엇이 걸려 있는지만 모아 봅니다.</p>
      <div class="chips">${s.shinsal.map(k => `<span class="pill">${k}</span>`).join('')}</div>
    </section>` : ''}

    <div class="eomi"><i></i></div>
    <div class="actions">
      <button class="btn2" id="share">결과 링크 복사</button>
      <button class="btn2" id="again">다시 보기</button>
    </div>

    <p class="note">
      사주는 태어난 순간의 절기와 시각을 천문 계산으로 환산한 결과이고, ‘타고난 기질’은 그 원국을 MBTI 네 축으로 옮겨 본 추정입니다.<br>
      사람은 사주로도 MBTI로도 다 설명되지 않아요. 맞는 문장만 가져가고, 나머지는 흘려보내면 됩니다.
    </p>`;

  /* 연애·결혼 탭 */
  $$('.subtabs button').forEach(b => b.addEventListener('click', () => {
    const box = b.closest('.sec');
    $$('.subtabs button', box).forEach(x => x.setAttribute('aria-selected', String(x === b)));
    $$('.pane', box).forEach(p => { p.hidden = p.dataset.p !== b.dataset.p; });
  }));
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
