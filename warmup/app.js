// 高爾夫熱身：首頁、跟練、不舒服、結束、動作庫。內容全部來自 warmup.json，這裡不寫任何規則數字。
let W;                                  // warmup.json
const $ = s => document.querySelector(s);
const view = () => $("#view");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const newTag = ex => (ex.new ? `<span class="tag">計畫書沒有</span>` : "");
const fmt = s => (s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : String(s));

// ---------- 影片 ----------
function ytId(url) { const m = /(?:[?&]v=|\/shorts\/)([\w-]{11})/.exec(url || ""); return m && m[1]; }
function videoHTML(exId, autoplay = false) {
  const ex = W.exercises[exId];
  if (!navigator.onLine) return `<div class="novideo">${esc(ex.cue)}<small>沒有網路，影片不顯示</small></div>`;
  const id = ytId(ex.video);
  if (!id) return `<div class="novideo">${esc(ex.cue)}</div>`;
  return `<div class="video"><iframe src="https://www.youtube-nocookie.com/embed/${id}?rel=0&playsinline=1&mute=1&loop=1&playlist=${id}${autoplay ? "&autoplay=1" : ""}" title="${esc(ex.name)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>
    <div class="vlinks"><a href="${esc(ex.video)}" target="_blank" rel="noopener">在 YouTube 開啟</a> · <span class="muted">影片未逐支確認，和要點不一致時以要點為準${ex.video_note ? "；" + esc(ex.video_note) : ""}</span></div>`;
}

// ---------- 時間 ----------
function segments(key) {
  const segs = [];
  W.routines[key].steps.forEach((st, n) => {
    const sides = st.per_side ? ["左側", "右側"] : [""];
    sides.forEach((side, k) => segs.push({ step: n, ex: st.ex, qty: st.qty, side, seconds: st.seconds,
      prep: k === 0 ? W.timing.prep_s : W.timing.switch_s }));
  });
  return segs;
}
const totalSeconds = key => segments(key).reduce((a, s) => a + s.seconds + s.prep, 0);

// ---------- 螢幕常亮 ----------
let wakeLock = null, wakeOK = true;
async function keepAwake(on) {
  try {
    if (on && !("wakeLock" in navigator)) { wakeOK = false; return; }
    if (on && !wakeLock) { wakeLock = await navigator.wakeLock.request("screen"); wakeLock.onrelease = () => (wakeLock = null); }
    if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch { wakeOK = false; }
}
document.addEventListener("visibilitychange", () => { if (!document.hidden && run) keepAwake(true); });

// ---------- 首頁 ----------
function renderHome() {
  stopRun();
  const card = key => {
    const R = W.routines[key];
    return `<section class="card">
      <h2>${esc(R.name)}<span class="muted" style="font-weight:400;font-size:16px">　約 ${Math.round(totalSeconds(key) / 30) / 2} 分鐘・${esc(R.where)}</span></h2>
      <ol class="plan">${R.steps.map(st => { const ex = W.exercises[st.ex];
        return `<li><span>${esc(ex.name)}${newTag(ex)}</span><span class="q">${esc(st.qty)}</span></li>`; }).join("")}
        ${R.finish.map(f => `<li><span>${esc(f.label)}</span><span class="q">${esc(f.qty)}</span></li>`).join("")}</ol>
      <a class="btn big primary" href="#play/${key}">開始${esc(R.name)}熱身</a>
    </section>`;
  };
  view().innerHTML = `<header class="top"><h1>高爾夫熱身</h1><span class="pill ${navigator.onLine ? "ok" : "warn"}">${navigator.onLine ? "有網路" : "離線：只顯示文字要點"}</span></header>
    ${card("sim")}${card("round")}
    <p class="note blue">${esc(W.safety.breath_rule)}。全部動作都站著做。</p>
    <a class="btn" href="#library" style="width:100%">動作庫</a>`;
}

// ---------- 跟練 ----------
let run = null, tick = null;
function stopRun() { clearInterval(tick); tick = null; run = null; keepAwake(false); document.body.classList.remove("playing"); }

function startRun(key) {
  stopRun();
  run = { key, segs: segments(key), i: 0, phase: "prep", endAt: 0, left: 0, paused: false, shownEx: null };
  keepAwake(true);
  document.body.classList.add("playing");
  enter(0);
}

function enter(i) {
  if (i >= run.segs.length) { const k = run.key; stopRun(); location.hash = `#done/${k}`; return; }
  run.i = Math.max(0, i);
  setPhase("prep", run.segs[run.i].prep);
}

function setPhase(phase, seconds) {
  run.phase = phase; run.paused = false;
  run.endAt = Date.now() + seconds * 1000; run.left = seconds;
  drawPlayer();
  clearInterval(tick);
  tick = setInterval(onTick, 200);
}

function onTick() {
  if (!run || run.paused) return;
  const left = Math.max(0, Math.ceil((run.endAt - Date.now()) / 1000));
  if (left !== run.left) { run.left = left; const el = $("#cd"); if (el) el.textContent = fmt(left); }
  if (Date.now() >= run.endAt) {
    if (run.phase === "prep") setPhase("go", run.segs[run.i].seconds);
    else enter(run.i + 1);
  }
}

function togglePause() {
  if (run.paused) { run.paused = false; run.endAt = Date.now() + run.left * 1000; }
  else { run.left = Math.max(0, Math.ceil((run.endAt - Date.now()) / 1000)); run.paused = true; }
  const b = $("#pause"); if (b) b.textContent = run.paused ? "繼續" : "暫停";
}

function drawPlayer() {
  const R = W.routines[run.key], seg = run.segs[run.i], ex = W.exercises[seg.ex];
  const next = run.segs[run.i + 1];
  const nextTxt = !next ? "最後一個" : next.ex === seg.ex ? `換邊：${next.side}` : `${W.exercises[next.ex].name}${next.side ? "・" + next.side : ""}`;
  const isPrep = run.phase === "prep";
  const prepLabel = seg.side === "右側" && run.segs[run.i - 1]?.ex === seg.ex ? "換邊，準備" : "準備";
  if (!$(".player") || run.shownEx !== seg.ex) {
    run.shownEx = seg.ex;
    view().innerHTML = `<div class="player"><div class="pv" id="pv"></div><div class="pc" id="pc"></div>
      <div class="pbar"><div class="ctl"><button class="btn" id="prev">上一個</button><button class="btn" id="pause">暫停</button><button class="btn primary" id="next">下一個</button></div>
        <div class="row2"><button class="btn danger" id="unwell">不舒服</button><button class="btn" id="quit">結束</button><div class="prog"><i id="prog"></i></div></div></div></div>`;
    $("#prev").onclick = () => enter(run.i - 1);
    $("#next").onclick = () => enter(run.i + 1);
    $("#pause").onclick = togglePause;
    $("#pv").innerHTML = videoHTML(seg.ex, true);
    $("#unwell").onclick = unwell;
    $("#quit").onclick = () => { stopRun(); location.hash = "#home"; };
  }
  $("#pc").innerHTML = `<div class="sec">${esc(R.name)}・第 ${seg.step + 1} / ${R.steps.length} 個</div>
    <h2 class="exname">${esc(ex.name)}${newTag(ex)}</h2>
    <div>${seg.side ? `<span class="side">${seg.side}</span>　` : ""}<span class="qty">${esc(seg.qty)}</span></div>
    <div class="phase ${isPrep ? "prep" : "go"}">${isPrep ? prepLabel : "開始"}</div>
    <div class="timer ${isPrep ? "prep" : ""}" id="cd">${fmt(run.left)}</div>
    <p class="cue">${esc(ex.cue)}</p>
    ${ex.caution ? `<p class="cue muted">${esc(ex.caution)}</p>` : ""}
    <p class="breath">呼吸：${esc(ex.breath ? ex.breath + "，全程不憋氣" : W.safety.breath_rule)}</p>
    ${!wakeOK ? `<p class="note orange">這台裝置不支援螢幕常亮：請到「設定 → 螢幕顯示與亮度 → 自動鎖定」改長一點</p>` : ""}
    <p class="nextup">下一個：${esc(nextTxt)}</p>`;
  $("#prog").style.width = `${(run.i / run.segs.length) * 100}%`;
  $("#pause").textContent = run.paused ? "繼續" : "暫停";
}

function unwell() {
  if (!run.paused) togglePause();
  const S = W.safety;
  const d = document.createElement("div"); d.className = "modal";
  d.innerHTML = `<div class="box"><h2>先停下來，坐好</h2>
    <ul>${S.stop_rules.map(r => `<li>${esc(r)}</li>`).join("")}<li>${esc(S.pain_rule)}</li></ul>
    <a class="btn big danger" href="tel:${esc(S.emergency_tel)}">撥打 ${esc(S.emergency_tel)}</a>
    <div class="row" style="margin-top:12px"><button class="btn primary" id="ok">我沒事，繼續</button><button class="btn" id="end">結束熱身</button></div></div>`;
  document.body.appendChild(d);
  d.querySelector("#ok").onclick = () => { d.remove(); if (run?.paused) togglePause(); };
  d.querySelector("#end").onclick = () => { d.remove(); stopRun(); location.hash = "#home"; };
}

// ---------- 結束 ----------
function renderDone(key) {
  stopRun();
  const R = W.routines[key]; if (!R) return (location.hash = "#home");
  const cap = W.safety.sim_ball_cap;
  view().innerHTML = `<header class="top"><h1>${esc(R.name)}熱身完成</h1></header>
    ${R.finish.map(f => `<p class="note green" style="font-size:22px">${esc(f.label)}</p>`).join("")}
    ${R.finish_ball_cap ? `<p class="note orange">這週坐姿穿襪的下背分數 ≥${cap.sock_pain_min} 時，今天最多打 ${cap.balls} 球。</p>` : ""}
    <a class="btn big primary" href="#home">回首頁</a>`;
}

// ---------- 動作庫 ----------
function renderLibrary() {
  stopRun();
  view().innerHTML = `<header class="top"><a class="back" href="#home">‹</a><h1>動作庫</h1></header>
    <p class="note orange">影片都沒有逐支播放確認過；和要點不一致時，以要點為準。</p>
    ${Object.entries(W.exercises).map(([k, ex]) => `<section class="card lib">
      <h2>${esc(ex.name)}${newTag(ex)}</h2>
      <p class="cue">${esc(ex.cue)}</p>${ex.caution ? `<p class="muted">${esc(ex.caution)}</p>` : ""}
      <p class="breath">呼吸：${esc(ex.breath || W.safety.breath_rule)}</p>
      <div id="v-${k}"><button class="btn" data-v="${k}">播放示範影片</button></div>
    </section>`).join("")}`;
  view().querySelectorAll("[data-v]").forEach(b => b.onclick = () => { $(`#v-${b.dataset.v}`).innerHTML = videoHTML(b.dataset.v); });
}

// ---------- 路由 ----------
function route() {
  const [name, arg] = location.hash.slice(1).split("/");
  if (name === "play" && W.routines[arg]) return startRun(arg);
  if (name === "done") return renderDone(arg);
  if (name === "library") return renderLibrary();
  renderHome();
}

async function main() {
  W = await (await fetch("warmup.json")).json();
  window.addEventListener("hashchange", route);
  window.addEventListener("online", () => (run ? ((run.shownEx = null), drawPlayer()) : route()));
  window.addEventListener("offline", () => (run ? ((run.shownEx = null), drawPlayer()) : route()));
  route();
  if ("serviceWorker" in navigator) {
    const reg = await navigator.serviceWorker.register("sw.js");
    const show = w => { const b = $("#update"); b.hidden = false; b.onclick = () => w.postMessage("skip"); };
    if (reg.waiting && navigator.serviceWorker.controller) show(reg.waiting);
    reg.addEventListener("updatefound", () => { const w = reg.installing;
      w.addEventListener("statechange", () => { if (w.state === "installed" && navigator.serviceWorker.controller) show(w); }); });
    // 只有按「有新版本」換版時才重新整理；第一次安裝不重新整理，避免打斷正在進行的熱身
    let reloaded = false; const hadController = !!navigator.serviceWorker.controller?.scriptURL.endsWith("/warmup/sw.js");
    navigator.serviceWorker.addEventListener("controllerchange", () => { if (hadController && !reloaded) { reloaded = true; location.reload(); } });
  }
}
main();
