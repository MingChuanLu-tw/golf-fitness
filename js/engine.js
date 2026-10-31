// 規則引擎：日期 → 週次、期別、今天的課表；課表展開成跟練步驟。所有數字來自 program.json。

const DAY = 864e5;
const d0 = s => Date.parse(s + "T00:00:00+08:00");

export function weekOf(P, dateStr) {
  const t = d0(dateStr), start = d0(P.start_date);
  if (t < start) return t >= d0(P.week0_start) ? 0 : -1;
  return Math.floor((t - start) / DAY / 7) + 1;
}
export function phaseOf(P, week) {
  return P.phases.find(p => week >= p.weeks[0] && week <= p.weeks[1]) || null;
}
export function weekRange(P, week) {
  const s = d0(P.start_date) + (week - 1) * 7 * DAY;
  const f = t => new Date(t + 8 * 3600e3).toISOString().slice(0, 10);
  return [f(s), f(s + 6 * DAY)];
}
export function addDays(dateStr, n) {
  return new Date(d0(dateStr) + n * DAY + 8 * 3600e3).toISOString().slice(0, 10);
}
export function weekday(dateStr) { return "日一二三四五六"[new Date(d0(dateStr) + 8 * 3600e3).getUTCDay()]; }

// 今天的狀態：一般訓練日、特殊日（減量、下場）、春節、計畫外
export function dayInfo(P, dateStr, sessions) {
  const week = weekOf(P, dateStr);
  const phase = phaseOf(P, week);
  const special = P.special_days[dateStr] || null;
  const holiday = dateStr >= P.holiday.from && dateStr <= P.holiday.to ? P.holiday : null;
  const done = sessions.filter(s => s.status !== "取消").sort((a, b) => a.date < b.date ? -1 : 1);
  const doneToday = done.filter(s => s.date === dateStr && s.session_type !== "活動度");
  const last = done.filter(s => s.date < dateStr && s.session_type !== "活動度").pop();
  let next = null;
  if (phase) {
    const inPhase = done.filter(s => s.phase === phase.id && P.phases.find(p => p.id === phase.id).sessions.includes(s.session_id));
    next = phase.sessions[inPhase.length % phase.sessions.length];
  }
  const restAdvice = last && last.date === addDays(dateStr, -1) ? "昨天練過，建議今天休息或只做活動度（兩次訓練之間至少隔 1 天）" : null;
  let wk = null;
  if (week >= 1) {
    const [a, b] = weekRange(P, week);
    wk = { from: a, to: b, count: done.filter(s => s.date >= a && s.date <= b && s.session_type !== "活動度" && s.status !== "只做活動度").length };
  }
  return { week, phase, special, holiday, next, doneToday, restAdvice, weekStats: wk, retest: P.retest_weeks.includes(week) };
}

const bump = (reps, n) => reps.replace(/\d+/g, m => String(+m + n));

// 展開一份課表：解析進入條件、依週次切換、第一期第 3–4 週 +2 下、出差替代、降級、減量
export function buildSession(P, sessionId, week, opt = {}) {
  const phase = phaseOf(P, week) || P.phases[0];
  const items = P.sessions[sessionId].map(src => {
    let it = { ...src };
    if (it.by_week) {
      const v = it.by_week.find(v => week >= v.weeks[0] && week <= v.weeks[1]) || it.by_week[0];
      it = { ...it, ex: v.ex, rounds: v.rounds, reps: v.reps, label: v.label, cue: v.cue };
    }
    if (it.gate && !opt.gates?.[it.gate.id]) {
      const a = it.gate.alt;
      it = { ...it, ex: a.ex, rounds: a.rounds, reps: a.reps, label: a.label, cue: "從地上拉起，起身時加速；背打直，起身時吐氣", gated: true };
    }
    let rounds = it.rounds ?? phase.default_rounds;
    let reps = it.reps;
    const ov = (phase.overrides || []).find(o => o.week === week && o.session === sessionId && o.pair === src.pair);
    if (phase.reps_plus_from_week && week >= phase.reps_plus_from_week && !it.seconds) reps = bump(reps, phase.reps_plus);
    if (ov) { rounds = ov.rounds; reps = ov.reps; it.note = ov.note; }
    let load = it.load;
    if (load && typeof load === "object") load = opt.gates?.[load.gate] ? load.after : load.before;
    const ex = P.exercises[it.ex];
    if (opt.travel && ex.travel) {
      const t = P.exercises[ex.travel];
      it = { ...it, ex: ex.travel, label: t.name, cue: "出差替代：" + it.cue, travel: true };
      load = null;
    }
    if (opt.stepDown || opt.taperMinus1) rounds = Math.max(1, rounds - 1);
    if (opt.taperSession) rounds = Math.min(rounds, 2);
    const isPower = !!P.exercises[src.ex]?.power && !it.gated;
    return { ...it, rounds, reps, load, power: isPower,
             rest_s: it.rest_s || (isPower && phase.power_rest_s) || phase.rest_s };
  });
  return { sessionId, week, phase, items,
           rpeTarget: opt.taperSession ? "≤6" : opt.stepDown ? "比平常低 1–2" : phase.rpe };
}

// 把課表展開成一步一步的跟練清單
export function toSteps(P, built, opt = {}) {
  const steps = [];
  const timed = (list, section) => list.forEach(s => {
    if (s.per_side) for (const side of ["左側", "右側"]) steps.push({ kind: "timer", section, ex: s.ex, label: s.label, side, seconds: s.seconds, note: s.note });
    else steps.push({ kind: "timer", section, ex: s.ex, label: s.label, seconds: s.seconds, note: s.note });
  });
  timed(P.warmup, "熱身");
  // 平衡（每日活動度第 6 項）：依目前階段，做完問一次是否達標
  const bal = P.balance?.stages.find(s => s.stage === (opt.balanceStage || 1));
  if (bal) {
    timed(bal.steps, `平衡・第 ${bal.stage} 階段`);
    steps.push({ kind: "balancecheck", section: `平衡・第 ${bal.stage} 階段`, ex: bal.steps[0].ex, label: "平衡達標了嗎？", stage: bal.stage, pass: bal.pass });
  }
  if (opt.mobilityOnly) { timed([P.weekend_walk].map(w => ({ ...w, seconds: 300, note: "慢走 5 分鐘" })), "慢走"); return steps; }
  // 依 pair 的字首分組：A1/A2 → A，1a/1b/1c → 1，「先做」單獨一組
  const groups = [];
  for (const it of built.items) {
    const g = it.pair === "先做" ? "先做" : it.pair.replace(/[0-9]+$|[a-z]$/, "");
    let grp = groups.find(x => x.key === g);
    if (!grp) groups.push(grp = { key: g, items: [] });
    grp.items.push(it);
  }
  for (const grp of groups) {
    const maxR = Math.max(...grp.items.map(i => i.rounds));
    grp.items.filter(i => i.warmup).forEach(i =>
      steps.push({ kind: "warmupset", section: "主訓練", ex: i.ex, label: i.label, text: i.warmup, item: i }));
    for (let r = 1; r <= maxR; r++) {
      const inRound = grp.items.filter(i => r <= i.rounds);
      inRound.forEach(i => {
        if (i.seconds) {
          for (const side of i.per_side ? ["左側", "右側"] : [""])
            steps.push({ kind: "set", timedSet: true, section: "主訓練", group: grp.key, round: r, rounds: maxR, item: i, ex: i.ex, label: i.label, side, seconds: i.seconds });
        } else steps.push({ kind: "set", section: "主訓練", group: grp.key, round: r, rounds: maxR, item: i, ex: i.ex, label: i.label });
      });
      const rest = Math.max(...inRound.map(i => i.rest_s));
      const hrGate = inRound.some(i => i.ex === "kb_swing");
      const isLast = grp === groups[groups.length - 1] && r === maxR;
      if (!isLast) steps.push({ kind: "rest", section: "主訓練", seconds: rest, hrGate });
    }
  }
  if (opt.weekend) timed([P.weekend_walk], "快走");
  timed(P.cooldown, "收操");
  return steps;
}

// 訓練前檢查的判斷（計畫書第二節）
export function precheck(P, c) {
  const s = P.safety;
  const sys = c.retestSys ?? c.avgSys;
  if (c.avgSys >= s.bp_sys_max && c.retestSys == null) return { result: "retest", text: `收縮壓 ${c.avgSys} ≥${s.bp_sys_max}：再靜坐 5 分鐘後重量一次` };
  if (sys >= s.bp_sys_max) return { result: "mobility", text: `重量後收縮壓仍 ${sys} ≥${s.bp_sys_max}：今天只做活動度和慢走` };
  if (sys < s.bp_sys_min || c.dizzy) return { result: "mobility", text: c.dizzy ? "站起來會頭暈：今天只做活動度" : `收縮壓 ${sys} <${s.bp_sys_min}：今天只做活動度` };
  const reasons = [];
  if (c.sleep != null && c.sleep < s.sleep_min_h) reasons.push(`睡不到 ${s.sleep_min_h} 小時`);
  if (c.cold) reasons.push("感冒");
  if (c.drink) reasons.push("應酬隔天");
  if (reasons.length) return { result: "stepdown", text: `${reasons.join("、")}：今天降一級（每對少 1 輪、RPE 比平常低 1–2）` };
  return { result: "normal", text: "可以照原課表訓練" };
}
