import * as db from "./db.js";
import * as E from "./engine.js";
import * as sync from "./sync.js";

export const APP_VERSION = "0.1.1";
let P;                       // program.json
const $ = s => document.querySelector(s);
const view = () => $("#view");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const today = () => (window.__TODAY__ || db.todayStr());
const PAIN_AREAS = ["下背", "頸", "肩", "肘", "腕", "髖", "膝", "踝", "其他"];

// ---------- 影片 ----------
function ytId(url) { const m = /[?&]v=([\w-]{11})/.exec(url || ""); return m && m[1]; }
function videoHTML(exId, big = true) {
  const ex = P.exercises[exId] || {};
  const id = ytId(ex.video);
  if (!ex.video) return `<div class="novideo">這個動作沒有示範影片<br><small>${esc(ex.name)}</small></div>`;
  if (!id) return `<div class="novideo"><a class="btn" href="${esc(ex.video)}" target="_blank" rel="noopener">開啟示範說明</a></div>`;
  return `<div class="video ${big ? "" : "small"}"><iframe src="https://www.youtube-nocookie.com/embed/${id}?rel=0&playsinline=1&modestbranding=1" title="${esc(ex.name)}" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy"></iframe></div>
    <div class="vlinks"><a href="${esc(ex.video)}" target="_blank" rel="noopener">在 YouTube 開啟</a>${ex.video2 ? ` · <a href="${esc(ex.video2)}" target="_blank" rel="noopener">替代版本</a>` : ""}</div>`;
}

// ---------- 語音與螢幕常亮 ----------
let voiceOn = true, wakeLock = null;
function say(t) {
  if (!voiceOn || !window.speechSynthesis) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(t); u.lang = "zh-TW"; u.rate = 1.05; speechSynthesis.speak(u);
}
async function keepAwake(on) {
  try {
    if (on && "wakeLock" in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request("screen"); wakeLock.onrelease = () => (wakeLock = null); }
    if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch { /* 不支援時忽略，畫面會提示 */ }
}
document.addEventListener("visibilitychange", () => { if (!document.hidden && run) keepAwake(true); });

// ---------- 共用 ----------
async function gates() { return { kb12: !!(await db.pref("gate_kb12")) }; }
function header(title, back) {
  return `<header class="top">${back ? `<a class="back" href="${back}">‹</a>` : ""}<h1>${esc(title)}</h1><span id="syncpill" class="pill"></span></header>`;
}
async function refreshPill() {
  const el = $("#syncpill"); if (!el) return;
  const { url } = await sync.config(); const n = await sync.pending();
  el.textContent = !url ? "未連線 Sheet" : n ? `尚有 ${n} 筆未同步` : "已同步";
  el.className = "pill " + (!url ? "warn" : n ? "warn" : "ok");
}
window.addEventListener("gf-synced", refreshPill);
window.addEventListener("gf-queued", refreshPill);

function sessionName(id) {
  return ({ "P1-A": "第一期 課表 A", "P1-B": "第一期 課表 B", "P1-C": "第一期 課表 C", "P2-A": "第二期 課表 A", "P2-B": "第二期 課表 B", "P2-C": "第二期 課表 C",
            "P3-A": "第三期 課表 A：旋轉爆發力", "P3-B": "第三期 課表 B：下肢爆發力", "P3-C": "第三期 課表 C：整合", "P4": "第四期 維持課表" })[id] || id;
}
function repsText(i) { return (i.seconds ? `${i.seconds} 秒` : `${i.reps} 下`) + (i.per_side ? "／側" : ""); }

// ---------- 今日 ----------
async function renderToday() {
  const t = today();
  const sessions = await db.all("Sessions");
  const info = E.dayInfo(P, t, sessions);
  const g = await gates();
  const travel = !!(await db.local("travel"));
  const mobAll = await db.all("Mobility");
  const mob = mobAll.filter(m => m.done);
  const mobTodayList = mob.filter(m => m.date === t).sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  const sockRow = mobAll.find(m => m.id === "mob:" + t);
  const lastManual = [...mobTodayList].reverse().find(m => m.kind === "自行完成");
  const isWeekend = ["六", "日"].includes(E.weekday(t));
  const owned = (await db.pref("equipment")) || {};
  let html = header("今日");
  html += `<section class="hero"><div class="date">${t.slice(5).replace("-", "/")}（${E.weekday(t)}）</div>`;
  if (info.week === 0) html += `<div class="wk">第 0 週・基準測試</div>`;
  else if (info.week >= 1 && info.phase) html += `<div class="wk">第 ${info.week} 週・${esc(info.phase.name)}期・RPE ${info.phase.rpe}</div>`;
  else if (info.week > P.weeks) html += `<div class="wk">16 週計畫已結束</div>`;
  else html += `<div class="wk">計畫尚未開始（第 1 週從 ${P.start_date} 開始）</div>`;
  if (info.weekStats) html += `<div class="stats"><span>本週訓練 <b>${info.weekStats.count}</b>/3</span><span>活動度 <b>${new Set(mob.filter(m => m.date >= info.weekStats.from && m.date <= info.weekStats.to).map(m => m.date)).size}</b>/7 天</span></div>`;
  html += `</section>`;

  const notes = [];
  if (info.week === 0) notes.push(`<a href="#tests" class="note blue">第 0 週：請完成基準測試（活動度篩檢 12 項＋體能測試）</a>`);
  if (info.retest && info.week > 0) notes.push(`<a href="#tests" class="note blue">第 ${info.week} 週是複測週：週末做複測</a>`);
  if (info.special) notes.push(`<div class="note orange">${esc(info.special.text)}</div>`);
  if (info.holiday) notes.push(`<div class="note orange">${esc(info.holiday.text)}</div>`);
  if (info.restAdvice && !info.special) notes.push(`<div class="note">${esc(info.restAdvice)}</div>`);
  for (const r of P.equipment_reminders) if (t >= r.show_from && !owned[r.id]) notes.push(`<a href="#more" class="note">器材提醒：${esc(r.name)}，${r.due.slice(5).replace("-", "/")} 前要用到（買好後在「更多」勾選）</a>`);
  const answered = (await db.pref("doctor_answers")) || {};
  if (t >= E.addDays(P.doctor_due, -28) && Object.keys(answered).length < P.doctor_questions.length) notes.push(`<a href="#more" class="note">回診提醒：${P.doctor_due.slice(5).replace("-", "/")}（第 10 週）前問完醫師的問題</a>`);
  html += notes.join("");

  // 主卡片：今天的課表
  const mobilityDay = info.special && ["mobility_walk", "mobility_only", "recovery", "round"].includes(info.special.type);
  let sid = (await db.local("pick_" + t)) || info.next || "P1-A";
  const previewWeek = info.week >= 1 ? info.week : 1;
  if (info.doneToday.length) {
    html += `<section class="card"><h2>今天已完成訓練</h2><p>${info.doneToday.map(s => esc(sessionName(s.session_id)) + "（" + esc(s.status) + "）").join("、")}</p></section>`;
  } else if (mobilityDay) {
    html += `<section class="card"><h2>今天只做活動度</h2><p>${esc(info.special.text)}</p><button class="btn big" data-act="mobility">開始活動度跟練</button></section>`;
  } else if (info.week >= -1 && info.week <= P.weeks) {
    const phase = E.phaseOf(P, previewWeek);
    const opt = { gates: g, travel, taperMinus1: info.special?.type === "taper_minus1", taperSession: info.special?.type === "taper_session" };
    const built = E.buildSession(P, sid, previewWeek, opt);
    html += `<section class="card"><div class="row between"><h2>${esc(sessionName(sid))}</h2>
      <select id="pick">${phase.sessions.map(s => `<option value="${s}" ${s === sid ? "selected" : ""}>${esc(sessionName(s))}</option>`).join("")}</select></div>
      ${info.week < 1 ? `<p class="muted">第 1 週（${P.start_date}）才正式開始，現在可以先預覽或試做。</p>` : ""}
      <ol class="plan">${built.items.map(i => `<li><span class="pair">${esc(i.pair)}</span>${esc(i.label)}<span class="muted"> ${i.rounds} 輪 × ${esc(repsText(i))}${i.load && !i.label.includes(i.load) ? "・" + esc(i.load) : ""}</span></li>`).join("")}</ol>
      <div class="toggles"><label><input type="checkbox" id="travel" ${travel ? "checked" : ""}> 出差模式（徒手替代）</label>
      ${isWeekend ? `<label><input type="checkbox" id="weekend"> 週末課（收操前快走 10 分鐘）</label>` : ""}</div>
      <button class="btn big primary" data-act="start" data-sid="${sid}" data-week="${previewWeek}">開始訓練</button></section>`;
  }
  // 每日活動度
  html += `<section class="card"><h2>每日 5 分鐘活動度</h2>
    <p>${mobTodayList.length ? `<span class="ok">今天已做 ${mobTodayList.length} 次 ✓</span>` : `<span class="muted">今天還沒做</span>`}<span class="muted">・有空隨時可以再做一次</span></p>
    <div class="row"><button class="btn" data-act="mobility">跟練</button><button class="btn" data-act="mobdone">我已做完一次</button>
    ${lastManual ? `<button class="btn" data-act="mobundo">撤銷上一筆</button>` : ""}</div>
    ${E.weekday(t) === "日" ? `<label class="field">週日記錄：坐姿穿襪的下背分數（0–10）<input type="number" id="sock" min="0" max="10" inputmode="numeric" value="${esc(sockRow?.sock_pain ?? "")}"></label>` : ""}</section>`;
  if (await db.local("active_run")) html = `<a class="note blue" href="#play">有一次訓練還沒做完，點這裡繼續</a>` + html;
  view().innerHTML = html;
  refreshPill();
  $("#pick")?.addEventListener("change", async e => { await db.local("pick_" + t, e.target.value); renderToday(); });
  $("#travel")?.addEventListener("change", async e => { await db.local("travel", e.target.checked); renderToday(); });
  $("#sock")?.addEventListener("change", async e => db.save("Mobility", { ...(sockRow || { id: "mob:" + t, date: t, done: false }), sock_pain: +e.target.value }));
  view().querySelectorAll("[data-act]").forEach(b => b.addEventListener("click", async () => {
    const a = b.dataset.act;
    if (a === "start") {
      await db.local("pending_start", { sid: b.dataset.sid, week: +b.dataset.week, weekend: !!$("#weekend")?.checked, travel,
        taperMinus1: info.special?.type === "taper_minus1", taperSession: info.special?.type === "taper_session" });
      location.hash = "#precheck";
    }
    if (a === "mobility") startRun({ mobility: true });
    if (a === "mobdone") { await addMobility("自行完成"); renderToday(); }
    if (a === "mobundo" && lastManual) { await db.save("Mobility", { ...lastManual, done: false }); renderToday(); }
  }));
}
// 每做一次活動度就記一筆（一天可以多次）。舊版每天一筆的 id 是 "mob:日期"，仍然算一次；週日的穿襪分數也存在那一筆。
async function addMobility(kind) {
  const t = today();
  await db.save("Mobility", { id: `mob:${t}:${Date.now()}`, date: t, done: true, kind });
}

// ---------- 訓練前檢查 ----------
async function renderPrecheck() {
  const ps = await db.local("pending_start");
  if (!ps) { location.hash = "#today"; return; }
  view().innerHTML = header("訓練前檢查", "#today") + `
  <section class="card"><p class="muted">量之前 30 分鐘不運動、不喝咖啡或茶；先上廁所，背靠椅背坐好、手臂和心臟同高，靜坐 5 分鐘，量的時候不說話。</p>
    <div class="grid2"><label class="field">第 1 次 收縮壓<input id="s1" type="number" inputmode="numeric"></label><label class="field">舒張壓<input id="d1" type="number" inputmode="numeric"></label>
    <label class="field">第 2 次 收縮壓<input id="s2" type="number" inputmode="numeric"></label><label class="field">舒張壓<input id="d2" type="number" inputmode="numeric"></label></div>
    <label class="field">昨晚睡了幾小時<input id="sleep" type="number" step="0.5" inputmode="decimal"></label>
    <div class="toggles"><label><input type="checkbox" id="dizzy"> 站起來會頭暈</label><label><input type="checkbox" id="cold"> 感冒</label><label><input type="checkbox" id="drink"> 應酬隔天</label></div>
    <div class="field">現在有沒有哪裡痛<div class="chips">${PAIN_AREAS.map(a => `<label><input type="checkbox" name="pain" value="${a}">${a}</label>`).join("")}</div>
    <input id="painscore" type="number" min="0" max="10" placeholder="最痛的分數 0–10" inputmode="numeric"></div>
    <div id="pcresult"></div>
    <button class="btn big primary" id="check">判斷今天怎麼練</button></section>`;
  refreshPill();
  let retest = false;
  $("#check").addEventListener("click", async () => {
    const n = id => { const v = $(id).value; return v === "" ? null : +v; };
    const s1 = n("#s1"), s2 = n("#s2");
    if (s1 == null) { $("#pcresult").innerHTML = `<p class="err">請先輸入至少一次收縮壓</p>`; return; }
    const avgSys = Math.round(s2 != null ? (s1 + s2) / 2 : s1);
    const c = { avgSys, retestSys: retest ? n("#rs") : undefined, sleep: n("#sleep"), dizzy: $("#dizzy").checked, cold: $("#cold").checked, drink: $("#drink").checked };
    if (retest && c.retestSys == null) { $("#pcresult").innerHTML += `<p class="err">請輸入重量的收縮壓</p>`; return; }
    const r = E.precheck(P, c);
    const pain = [...document.querySelectorAll("input[name=pain]:checked")].map(x => x.value);
    const painScore = n("#painscore");
    const record = { bp_sys_1: s1, bp_dia_1: n("#d1"), bp_sys_2: s2, bp_dia_2: n("#d2"), bp_retest_sys: c.retestSys ?? null, sleep_h: c.sleep,
      condition: [c.dizzy && "頭暈", c.cold && "感冒", c.drink && "應酬隔天"].filter(Boolean).join("、"), pain_area: pain.join("、"), pain_score: painScore, precheck: r.result };
    if (r.result === "retest") {
      retest = true;
      $("#pcresult").innerHTML = `<div class="note orange">${esc(r.text)}</div><div class="timer small" id="rtimer">5:00</div>
        <label class="field">重量的收縮壓<input id="rs" type="number" inputmode="numeric"></label>`;
      let left = 300; const iv = setInterval(() => { left--; const el = $("#rtimer"); if (!el) return clearInterval(iv); el.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`; if (left <= 0) { clearInterval(iv); say("可以重量血壓了"); } }, 1000);
      $("#check").textContent = "用重量的數字判斷";
      return;
    }
    const warn = painScore >= P.safety.pain_stop ? `<div class="note orange">疼痛 ${painScore}/10：會痛的動作請換退階版；痛往腿延伸、麻木或半夜痛醒，先看物理治療師。</div>` : "";
    const cls = { normal: "green", stepdown: "orange", mobility: "red" }[r.result];
    $("#pcresult").innerHTML = `<div class="note ${cls}"><b>${esc(r.text)}</b></div>${warn}
      ${r.result === "mobility" ? `<button class="btn big" id="go">開始活動度跟練</button>` : `<button class="btn big primary" id="go">開始${r.result === "stepdown" ? "（降一級）" : ""}</button>`}`;
    $("#check").remove();
    $("#go").addEventListener("click", () => startRun({ ...ps, precheck: record, stepDown: r.result === "stepdown", mobility: r.result === "mobility" }));
  });
}

// ---------- 跟練 ----------
let run = null, tick = null;
const PREP_SEC = 5;           // 計時動作按「開始」後的預備秒數
const fmtSec = s => s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : String(s);
async function startRun(o) {
  const g = await gates();
  const week = o.week || Math.max(1, E.weekOf(P, today()));
  let steps, built = null, sid = o.sid;
  if (o.mobility) { steps = E.toSteps(P, null, { mobilityOnly: true }); sid = sid || null; }
  else { built = E.buildSession(P, sid, week, { gates: g, travel: o.travel, stepDown: o.stepDown, taperMinus1: o.taperMinus1, taperSession: o.taperSession });
         steps = E.toSteps(P, built, { weekend: o.weekend }); }
  const phase = E.phaseOf(P, week);
  const sess = await db.save("Sessions", { date: today(), week, phase: phase?.id ?? null, session_id: o.mobility ? null : sid,
    session_type: o.mobility ? (o.precheck ? "只做活動度" : "活動度") : (o.travel ? "出差" : o.weekend ? "週末課" : o.taperMinus1 || o.taperSession ? "減量" : sid.split("-")[1] || sid),
    status: "進行中", started_at: db.nowISO(), step_down: !!o.stepDown, ...(o.precheck || {}) });
  run = { sessionRecordId: sess.id, sid, week, steps, idx: 0, mobility: !!o.mobility, rpeTarget: built?.rpeTarget, startedAt: Date.now(), setsDone: 0 };
  await db.local("active_run", run);
  await db.local("pending_start", null);
  location.hash = "#play";
}

async function renderPlay() {
  run = run || (await db.local("active_run"));
  if (!run) { location.hash = "#today"; return; }
  voiceOn = (await db.local("voice")) !== false;
  keepAwake(true);
  const st = run.steps[run.idx];
  if (!st) return finishRun();
  clearInterval(tick);
  const next = run.steps[run.idx + 1];
  const ex = P.exercises[st.ex] || {};
  const progress = `${run.idx + 1}/${run.steps.length}`;
  let right = "";
  if (st.kind === "timer") {
    right = `<div class="sec">${esc(st.section)} ${progress}</div><h2 class="exname">${esc(st.label)}${st.side ? "・" + st.side : ""}</h2>
      <p class="cue">${esc(st.note || "")}</p><p class="breath">${esc(ex.breath || "")}</p>
      <div class="timer" id="cd">${fmtSec(st.seconds)}</div>
      <button class="btn big primary" id="tgo">開始</button>
      <div class="row"><button class="btn" id="prev">上一個</button><button class="btn" id="skip">下一個</button></div>`;
  } else if (st.kind === "warmupset") {
    right = `<div class="sec">${esc(st.section)} ${progress}・暖身組</div><h2 class="exname">${esc(st.label)}</h2>
      <p class="target">${esc(st.text)}</p><p class="muted">不算在組數裡；感受動作，速度和力量都只用一半。</p>
      <button class="btn big primary" id="done">完成暖身組</button>`;
  } else if (st.kind === "set") {
    const i = st.item;
    const rpeSel = (await db.local("last_rpe")) ?? "";
    right = `<div class="sec">${esc(st.section)} ${progress}・目標 RPE ${esc(run.rpeTarget)}</div>
      <h2 class="exname"><span class="pair">${esc(i.pair)}</span>${esc(st.label)}${st.side ? "・" + st.side : ""}</h2>
      <div class="round">第 ${st.round} 輪／共 ${st.rounds} 輪</div>
      ${st.timedSet ? `<div class="timer" id="cd">${fmtSec(st.seconds)}</div><button class="btn primary" id="tstart">開始計時</button>`
                    : `<div class="target"><span class="big">${esc(i.reps)}</span> 下${i.per_side ? "／側" : ""}${i.load ? `<span class="load">${esc(i.load)}</span>` : ""}</div>`}
      ${i.note ? `<p class="note blue">${esc(i.note)}</p>` : ""}
      <p class="cue">${esc(i.cue)}</p><p class="breath">呼吸：${esc(ex.breath || "")}，全程不憋氣</p>
      ${i.power ? `<p class="note orange">爆發力：每一下最快速度，速度一掉就停；撿球用 hinge 或蹲下撿</p>` : ""}
      <details class="rp"><summary>退階／進階</summary><p>退階：${esc(i.regress)}<br>進階：${esc(i.progress)}</p></details>
      <div class="adj">${st.timedSet ? "" : `<label>實際次數 <span class="step"><button data-d="-1">−</button><input id="reps" type="number" inputmode="numeric" value="${esc(String(i.reps).match(/\d+/g)?.pop() || "")}"><button data-d="1">＋</button></span></label>`}
        ${i.load || P.exercises[i.ex]?.load ? `<label>重量 kg <input id="load" type="number" inputmode="decimal" value="${esc(String(i.load || "").match(/\d+/)?.[0] || "")}"></label>` : ""}</div>
      <div class="rpe"><span>這組 RPE</span>${[3, 4, 5, 6, 7, 8, 9].map(n => `<button data-rpe="${n}" class="${String(rpeSel) === String(n) ? "on" : ""}">${n}</button>`).join("")}</div>
      <div class="toggles"><label><input type="checkbox" id="form"> 動作走樣</label><label><input type="checkbox" id="hurt"> 這組有痛 <input id="hurtscore" type="number" min="0" max="10" placeholder="0–10" inputmode="numeric" class="tiny"></label></div>
      <button class="btn big primary" id="done">完成這組</button>`;
  } else if (st.kind === "rest") {
    right = `<div class="sec">休息 ${progress}</div><h2 class="exname">組間休息</h2>
      <div class="timer" id="cd">${fmtSec(st.seconds)}</div>
      ${st.hrGate ? `<p class="note orange">擺盪後要休息到心率 100 以下才做下一組</p>` : ""}
      <label class="field">看 Apple Watch 輸入目前心率（可略過）<input id="hr" type="number" inputmode="numeric"></label>
      <div id="hrmsg"></div>
      ${next ? `<p class="muted">下一個：${esc(next.label || "")}${next.side ? "・" + next.side : ""}</p>` : ""}
      <div class="row"><button class="btn" id="add30">＋30 秒</button><button class="btn primary" id="skip">繼續</button></div>`;
  }
  const leftEx = st.kind === "rest" ? next?.ex : st.ex;
  const seen = (await db.local("seen_ex")) || {};
  const firstTime = leftEx && !seen[leftEx] && P.exercises[leftEx]?.video;
  view().innerHTML = `<div class="player">
    <div class="pv">${leftEx ? videoHTML(leftEx) : `<div class="novideo">休息</div>`}${firstTime ? `<p class="note blue">第一次做這個動作：請先完整看一次影片</p>` : ""}</div>
    <div class="pc">${right}</div>
    <div class="pbar"><button class="btn danger" id="unwell">不舒服</button><button class="btn" id="quit">結束</button><div class="prog"><i style="width:${(run.idx / run.steps.length) * 100}%"></i></div></div>
  </div>`;
  if (leftEx && firstTime) { seen[leftEx] = true; db.local("seen_ex", seen); }
  if (st.kind !== "rest") say((st.kind === "set" ? "" : "") + (st.label || "") + (st.side ? "，" + st.side : ""));

  const go = async d => { clearInterval(tick); run.idx = Math.max(0, run.idx + d); await db.local("active_run", run); renderPlay(); };
  const countdown = (sec, onEnd) => {
    let left = sec, paused = false; const el = $("#cd");
    const draw = () => el && (el.textContent = fmtSec(left));
    draw(); clearInterval(tick);
    tick = setInterval(() => { if (paused) return; left--; draw(); if (left > 0 && left <= 3) say(String(left)); if (left <= 0) { clearInterval(tick); onEnd(); } }, 1000);
    return { pause: () => (paused = !paused), add: n => { left += n; draw(); } };
  };
  // 按「開始」後先預備幾秒（語音倒數），讓人有時間離開 iPad、擺好姿勢
  const prep = onGo => {
    let left = PREP_SEC; const el = $("#cd");
    const draw = () => { if (el) { el.classList.add("prep"); el.textContent = `預備 ${left}`; } say(String(left)); };
    clearInterval(tick); draw();
    tick = setInterval(() => { left--; if (left > 0) return draw(); clearInterval(tick); el?.classList.remove("prep"); say("開始"); onGo(); }, 1000);
  };
  if (st.kind === "timer") {
    let c = null;
    $("#tgo").onclick = e => {
      const b = e.currentTarget;
      if (!c) { b.disabled = true; b.textContent = "預備中…"; prep(() => { c = countdown(st.seconds, () => go(1)); b.disabled = false; b.textContent = "暫停"; b.classList.remove("primary"); }); }
      else b.textContent = c.pause() ? "繼續" : "暫停";
    };
    $("#skip").onclick = () => go(1); $("#prev").onclick = () => go(-1);
  }
  if (st.kind === "warmupset") $("#done").onclick = () => go(1);
  if (st.kind === "rest") {
    let hrHold = st.hrGate;
    const c = countdown(st.seconds, () => { if (!hrHold) go(1); else { say("輸入心率，100 以下再繼續"); } });
    $("#add30").onclick = () => c.add(30);
    $("#hr").addEventListener("change", e => {
      const hr = +e.target.value;
      if (hr > P.safety.hr_max) { hrHold = true; c.add(60); $("#hrmsg").innerHTML = `<div class="note red">心率 ${hr} 超過 ${P.safety.hr_max}：休息到 ${P.safety.hr_resume} 以下再做。手錶讀數和自覺費力差很多時，以 RPE 為準。</div>`; say("心率太高，多休息"); }
      else if (hr > P.safety.hr_resume) { hrHold = true; $("#hrmsg").innerHTML = `<div class="note orange">心率 ${hr}：等降到 ${P.safety.hr_resume} 以下再繼續</div>`; }
      else { hrHold = false; $("#hrmsg").innerHTML = `<div class="note green">心率 ${hr}，可以繼續</div>`; }
      run.lastHr = hr;
    });
    $("#skip").onclick = () => go(1);
  }
  if (st.kind === "set") {
    let rpe = null;
    view().querySelectorAll("[data-rpe]").forEach(b => b.onclick = () => { rpe = +b.dataset.rpe; view().querySelectorAll("[data-rpe]").forEach(x => x.classList.toggle("on", x === b)); if (rpe > P.safety.rpe_cap) say("超過上限，下一組降一級"); });
    view().querySelectorAll("[data-d]").forEach(b => b.onclick = () => { const r = $("#reps"); r.value = Math.max(0, (+r.value || 0) + +b.dataset.d); });
    if (st.timedSet) $("#tstart").onclick = e => {
      const b = e.currentTarget; b.disabled = true; b.textContent = "預備中…";
      prep(() => countdown(st.seconds, () => { say("時間到"); b.disabled = false; b.textContent = "重新計時"; }));
    };
    $("#done").onclick = async () => {
      const i = st.item;
      await db.save("SetLogs", { session_id: run.sessionRecordId, date: today(), session_plan: run.sid, exercise_id: i.ex, label: st.label, pair: i.pair,
        round: st.round, side: st.side || "", target_reps: st.timedSet ? `${st.seconds} 秒` : i.reps, reps: st.timedSet ? null : (+$("#reps")?.value || null),
        load_kg: $("#load")?.value ? +$("#load").value : null, rpe, form_breakdown: $("#form").checked, pain_score: $("#hurt").checked ? (+$("#hurtscore").value || 1) : null,
        hr_rest: run.lastHr ?? null, seq: Date.now() });
      if (rpe) db.local("last_rpe", rpe);
      if ($("#hurt").checked && (+$("#hurtscore").value || 0) >= P.safety.pain_stop) alertBox(`痛 ${$("#hurtscore").value}/10：這個動作接下來改用退階版（${esc(i.regress)}）；連續兩次都痛就從課表移除。`);
      run.setsDone++; run.lastHr = null;
      go(1);
    };
  }
  $("#unwell").onclick = () => { clearInterval(tick);
    alertBox(`<h2>先停下來，坐好</h2><ul>${P.safety.stop_rules.map(r => `<li>${esc(r)}</li>`).join("")}</ul>`, [
      ["結束今天的訓練", async () => { await db.save("Sessions", { ...(await db.get("Sessions", run.sessionRecordId)), symptom: "訓練中不舒服", symptom_at: db.nowISO() }); finishRun(true); }],
      ["症狀已消失，繼續", () => renderPlay()]]); };
  $("#quit").onclick = () => alertBox("要結束這次訓練嗎？已完成的組數都已存好。", [["結束並填寫紀錄", () => finishRun(true)], ["繼續訓練", () => renderPlay()]]);
}

function alertBox(html, buttons = [["知道了", () => {}]]) {
  const d = document.createElement("div"); d.className = "modal";
  d.innerHTML = `<div class="box">${html}<div class="row">${buttons.map((b, k) => `<button class="btn ${k === 0 ? "primary" : ""}" data-k="${k}">${b[0]}</button>`).join("")}</div></div>`;
  document.body.appendChild(d);
  d.querySelectorAll("button").forEach(b => b.onclick = () => { d.remove(); buttons[+b.dataset.k][1](); });
}

async function finishRun(early = false) {
  clearInterval(tick); keepAwake(false);
  const r = run || (await db.local("active_run"));
  if (!r) { location.hash = "#today"; return; }
  const sess = await db.get("Sessions", r.sessionRecordId);
  const mins = Math.round((Date.now() - r.startedAt) / 60000);
  if (r.mobility && !early) {
    await db.save("Sessions", { ...sess, status: sess.precheck === "mobility" ? "只做活動度" : "完成", duration_min: mins, finished_at: db.nowISO() });
    await addMobility("跟練");
    await db.local("active_run", null); run = null; location.hash = "#today"; return;
  }
  view().innerHTML = header("訓練結束") + `<section class="card">
    <p>${early ? "提早結束" : "完成"}：${esc(sessionName(r.sid) || "活動度")}，共 ${r.setsDone} 組、約 ${mins} 分鐘</p>
    <p class="muted">看 Apple Watch 的這次體能訓練紀錄填入：</p>
    <div class="grid2"><label class="field">平均心率<input id="hra" type="number" inputmode="numeric"></label><label class="field">最高心率<input id="hrm" type="number" inputmode="numeric"></label>
    <label class="field">總時間（分）<input id="dur" type="number" inputmode="numeric" value="${mins}"></label><label class="field">整體 RPE（0–10）<input id="rpes" type="number" min="0" max="10" inputmode="numeric"></label></div>
    <div class="field">哪裡不舒服<div class="chips">${PAIN_AREAS.map(a => `<label><input type="checkbox" name="pa" value="${a}">${a}</label>`).join("")}</div>
    <input id="ps" type="number" min="0" max="10" placeholder="最痛的分數 0–10" inputmode="numeric"></div>
    <label class="field">備註<textarea id="notes" rows="2"></textarea></label>
    <button class="btn big primary" id="save">儲存</button></section>`;
  refreshPill();
  $("#save").onclick = async () => {
    const n = id => { const v = $(id).value; return v === "" ? null : +v; };
    const pa = [...document.querySelectorAll("input[name=pa]:checked")].map(x => x.value);
    await db.save("Sessions", { ...sess, status: early ? "部分" : "完成", hr_avg: n("#hra"), hr_max: n("#hrm"), duration_min: n("#dur"), rpe_session: n("#rpes"),
      pain_area_after: pa.join("、"), pain_score_after: n("#ps"), notes: $("#notes").value, finished_at: db.nowISO() });
    if (r.idx > 7) await addMobility("訓練熱身");   // 熱身就是每日活動度，算一次
    if (n("#hrm") > P.safety.hr_max) alertBox(`最高心率 ${n("#hrm")} 超過 ${P.safety.hr_max}。下次組間休息延長到 120 秒；還是超過就每組減 2 下。`);
    await db.local("active_run", null); run = null;
    location.hash = "#today";
  };
}

// ---------- 紀錄 ----------
async function renderLog() {
  const s = (await db.all("Sessions")).sort((a, b) => (b.started_at || b.date) < (a.started_at || a.date) ? -1 : 1);
  const sets = await db.all("SetLogs");
  view().innerHTML = header("紀錄") + (s.length ? s.map(x => `<details class="card log"><summary><b>${x.date.slice(5).replace("-", "/")}</b> ${esc(x.session_id ? sessionName(x.session_id) : x.session_type)}
      <span class="tag">${esc(x.status)}</span>${x.rpe_session != null ? `<span class="muted"> RPE ${x.rpe_session}</span>` : ""}${x.bp_sys_1 ? `<span class="muted"> 血壓 ${x.bp_sys_1}/${x.bp_dia_1 ?? ""}</span>` : ""}</summary>
      <table><tr><th>動作</th><th>輪</th><th>次數</th><th>kg</th><th>RPE</th><th></th></tr>
      ${sets.filter(t => t.session_id === x.id).sort((a, b) => (a.seq || 0) - (b.seq || 0)).map(t => `<tr><td>${esc(t.label)}${t.side ? "・" + t.side : ""}</td><td>${t.round}</td><td>${t.reps ?? esc(t.target_reps)}</td><td>${t.load_kg ?? ""}</td><td>${t.rpe ?? ""}</td><td>${t.form_breakdown ? "走樣 " : ""}${t.pain_score ? "痛" + t.pain_score : ""}</td></tr>`).join("")}</table>
      ${x.hr_max ? `<p class="muted">心率 平均 ${x.hr_avg ?? "-"}／最高 ${x.hr_max}・${x.duration_min ?? "-"} 分鐘</p>` : ""}${x.notes ? `<p>${esc(x.notes)}</p>` : ""}${x.symptom ? `<p class="err">${esc(x.symptom)}</p>` : ""}</details>`).join("")
    : `<section class="card"><p class="muted">還沒有紀錄。</p></section>`);
  refreshPill();
}

// ---------- 測試與複測 ----------
async function renderTests() {
  const t = today();
  const cur = E.weekOf(P, t);
  let wk = +(await db.local("test_week") ?? NaN);
  if (Number.isNaN(wk)) wk = P.retest_weeks.filter(w => w <= Math.max(0, cur)).pop() ?? 0;
  const rows = await db.all("Tests");
  const val = (w, id, side) => rows.find(r => r.id === `${w}:${id}:${side}`)?.value ?? "";
  const field = (it, side) => {
    const v = val(wk, it.id, side), base = wk > 0 ? val(0, it.id, side) : "";
    const input = it.type === "choice" ? `<select data-id="${it.id}" data-side="${side}"><option value=""></option>${it.options.map(o => `<option ${o === v ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>`
      : it.type === "bp" ? `<input data-id="${it.id}" data-side="${side}" value="${esc(v)}" placeholder="例如 118/76">`
      : `<input type="number" step="any" inputmode="decimal" data-id="${it.id}" data-side="${side}" value="${esc(v)}">`;
    return `<label class="tfield">${side ? side + " " : ""}${input}${base !== "" ? `<small>第 0 週：${esc(base)}</small>` : ""}</label>`;
  };
  const block = (title, list) => `<section class="card"><h2>${title}</h2>${list.map(it => `<div class="test">
      <div class="tname"><b>${esc(it.name)}</b>${it.unit ? `<span class="muted">（${esc(it.unit)}）</span>` : ""}${it.video ? ` <a href="${esc(it.video)}" target="_blank" rel="noopener">影片</a>` : ""}${it.baseline != null ? `<span class="muted"> 先前自評 ${it.baseline}</span>` : ""}</div>
      ${it.how ? `<p class="muted">${esc(it.how)}</p>` : ""}<div class="row">${it.sides ? field(it, "左") + field(it, "右") : field(it, "")}</div></div>`).join("")}</section>`;
  view().innerHTML = header("測試與複測") + `<section class="card"><label class="field">記錄哪一週的測試
      <select id="tw">${P.retest_weeks.map(w => `<option value="${w}" ${w === wk ? "selected" : ""}>第 ${w} 週</option>`).join("")}</select></label>
      <p class="muted">準備：捲尺、紙膠帶（地上貼一條直線和一條 45° 斜線）、量角器、無扶手椅子、一支鐵桿、瑜伽墊、血壓計。每填一格就自動存好。</p></section>`
    + block("A. 活動度篩檢", P.tests.mobility) + block("B. 體能測試", P.tests.fitness);
  refreshPill();
  $("#tw").onchange = async e => { await db.local("test_week", +e.target.value); renderTests(); };
  view().querySelectorAll("[data-id]").forEach(el => el.addEventListener("change", async () => {
    const id = el.dataset.id, side = el.dataset.side;
    await db.save("Tests", { id: `${wk}:${id}:${side}`, date: t, week: wk, test_id: id, side, value: el.value });
    el.classList.add("saved");
  }));
}

// ---------- 動作庫 ----------
async function renderLibrary() {
  const used = new Set(Object.values(P.sessions).flat().map(i => i.ex).concat(P.warmup.map(w => w.ex), P.cooldown.map(w => w.ex)));
  const list = Object.entries(P.exercises).filter(([k]) => used.has(k) || P.exercises[k].video);
  view().innerHTML = header("動作庫") + `<input id="q" class="search" placeholder="搜尋動作">` + list.map(([k, e]) => `<details class="card lib" data-n="${esc(e.name)}"><summary>${esc(e.name)}</summary>
    <div class="libbody" data-ex="${k}"></div><p class="breath">呼吸：${esc(e.breath)}</p></details>`).join("");
  refreshPill();
  view().querySelectorAll("details.lib").forEach(d => d.addEventListener("toggle", () => { const b = d.querySelector(".libbody"); if (d.open && !b.innerHTML) b.innerHTML = videoHTML(b.dataset.ex); }));
  $("#q").oninput = e => view().querySelectorAll("details.lib").forEach(d => d.style.display = d.dataset.n.includes(e.target.value) ? "" : "none");
}

// ---------- 更多（設定、器材、進入條件、回診） ----------
async function renderMore() {
  const { url, token } = await sync.config();
  const owned = (await db.pref("equipment")) || {};
  const gate = !!(await db.pref("gate_kb12"));
  const ans = (await db.pref("doctor_answers")) || {};
  view().innerHTML = header("更多") + `
  <section class="card"><h2>Google Sheet 同步</h2>
    <label class="field">Apps Script 網址<input id="url" value="${esc(url || "")}" placeholder="https://script.google.com/macros/s/…/exec"></label>
    <label class="field">Token<input id="token" value="${esc(token || "")}" type="password"></label>
    <div class="row"><button class="btn" id="savecfg">儲存並測試連線</button><button class="btn" id="syncnow">立即同步</button></div>
    <p id="syncmsg" class="muted">上次上傳：${esc((await db.local("last_push")) || "—")}・尚有 ${await sync.pending()} 筆未同步</p></section>
  <section class="card"><h2>器材（買好後勾選）</h2>${P.equipment_reminders.map(r => `<label class="chk"><input type="checkbox" data-eq="${r.id}" ${owned[r.id] ? "checked" : ""}> ${esc(r.name)}<span class="muted">（${r.due.slice(5).replace("-", "/")} 前）</span></label>`).join("")}</section>
  <section class="card"><h2>${esc(P.gates.kb12.name)}</h2><ol>${P.gates.kb12.criteria.map(c => `<li>${esc(c)}</li>`).join("")}</ol>
    <label class="chk"><input type="checkbox" id="gate" ${gate ? "checked" : ""}> 三項都已達到（開啟後課表改用 12kg、加入壺鈴擺盪）</label></section>
  <section class="card"><h2>回診時問醫師（${P.doctor_due.slice(5).replace("-", "/")} 前）</h2>${P.doctor_questions.map((q, k) => `<div class="dq"><p>${esc(q)}</p><input data-dq="${k}" value="${esc(ans[k] || "")}" placeholder="醫師的回答"></div>`).join("")}</section>
  <section class="card"><h2>其他</h2><label class="chk"><input type="checkbox" id="voice" ${(await db.local("voice")) !== false ? "checked" : ""}> 語音提示</label>
    <div class="row"><button class="btn" id="export">匯出全部資料（JSON）</button></div>
    <p class="muted">版本 ${APP_VERSION}・課表資料 ${esc(P.version)}</p>
    <p class="muted">${"wakeLock" in navigator ? "跟練時會保持螢幕不關閉" : "這台裝置不支援自動保持螢幕常亮：請到「設定 → 螢幕顯示與亮度 → 自動鎖定」改長"}</p></section>`;
  refreshPill();
  $("#savecfg").onclick = async () => {
    const u = $("#url").value.trim(), k = $("#token").value.trim();
    await db.local("api_url", u); await db.local("api_token", k);
    $("#syncmsg").textContent = "測試中…";
    try { const j = await sync.ping(u, k); $("#syncmsg").textContent = j.ok ? `連線成功（Sheet：${j.sheet || ""}）` : "連線失敗：" + (j.error || ""); if (j.ok) sync.push().then(sync.pull); }
    catch (e) { $("#syncmsg").textContent = "連線失敗：" + e.message; }
  };
  $("#syncnow").onclick = async () => { $("#syncmsg").textContent = "同步中…"; const a = await sync.push(); const b = await sync.pull();
    $("#syncmsg").textContent = a.skipped ? "還沒設定網址或沒有網路" : a.ok === false ? "上傳失敗：" + a.error : b.ok === false ? "下載失敗：" + b.error : `完成：上傳 ${a.sent || 0} 筆、下載 ${b.received || 0} 筆`; };
  view().querySelectorAll("[data-eq]").forEach(c => c.onchange = async () => { owned[c.dataset.eq] = c.checked; await db.pref("equipment", owned); });
  $("#gate").onchange = e => db.pref("gate_kb12", e.target.checked);
  view().querySelectorAll("[data-dq]").forEach(i => i.onchange = async () => { if (i.value) ans[i.dataset.dq] = i.value; else delete ans[i.dataset.dq]; await db.pref("doctor_answers", ans); });
  $("#voice").onchange = e => db.local("voice", e.target.checked);
  $("#export").onclick = async () => {
    const data = {}; for (const t of ["Sessions", "SetLogs", "Mobility", "Tests", "Prefs"]) data[t] = await db.all(t);
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: "application/json" }));
    a.download = `golf-fitness-${today()}.json`; a.click();
  };
}

// ---------- 路由 ----------
const routes = { today: renderToday, precheck: renderPrecheck, play: renderPlay, log: renderLog, tests: renderTests, library: renderLibrary, more: renderMore };
async function route() {
  const r = (location.hash || "#today").slice(1);
  if (r !== "play") { clearInterval(tick); if (run && !(await db.local("active_run"))) run = null; }
  document.body.classList.toggle("playing", r === "play");
  document.querySelectorAll("nav a").forEach(a => a.classList.toggle("on", a.getAttribute("href") === "#" + r));
  (routes[r] || renderToday)();
}

async function main() {
  P = await (await fetch("program.json", { cache: "no-cache" })).json();
  window.addEventListener("hashchange", route);
  route();
  sync.start();
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    const reg = await navigator.serviceWorker.register("sw.js");
    const offer = w => { const b = $("#update"); b.hidden = false; b.onclick = () => { w.postMessage("skip"); }; };
    if (reg.waiting) offer(reg.waiting);
    reg.addEventListener("updatefound", () => { const w = reg.installing; w.addEventListener("statechange", () => { if (w.state === "installed" && navigator.serviceWorker.controller) offer(w); }); });
    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => { if (!reloaded) { reloaded = true; location.reload(); } });
    setInterval(() => reg.update(), 30 * 60e3);
  }
}
main();
