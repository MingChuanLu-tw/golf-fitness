// 和 Google Apps Script 同步：本機佇列上傳（upsert，依 id 去重）＋從 Sheet 拉回最新資料
import * as db from "./db.js";

const TABLES = ["Sessions", "SetLogs", "Mobility", "Tests", "Prefs"];
let busy = false;

export async function config() {
  return { url: await db.local("api_url"), token: await db.local("api_token") };
}

export async function pending() { return (await db.all("queue")).length; }

export async function push() {
  const { url, token } = await config();
  if (!url || !token || !navigator.onLine || busy) return { skipped: true };
  busy = true;
  try {
    const q = await db.all("queue");
    for (let i = 0; i < q.length; i += 50) {
      const batch = q.slice(i, i + 50);
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ token, action: "upsert", items: batch.map(b => ({ table: b.table, row: b.row })) }) });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "上傳失敗");
      for (const b of batch) {
        const cur = await db.get("queue", b.id);
        if (cur && cur.row.updated_at === b.row.updated_at) await db.del("queue", b.id);
      }
    }
    await db.local("last_push", db.nowISO());
    return { ok: true, sent: q.length };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  } finally { busy = false; window.dispatchEvent(new Event("gf-synced")); }
}

// 從 Sheet 拉回其他裝置寫入的資料；以 updated_at 較新的為準
export async function pull() {
  const { url, token } = await config();
  if (!url || !token || !navigator.onLine) return { skipped: true };
  try {
    const since = (await db.local("last_pull")) || "";
    const r = await fetch(`${url}?action=pull&token=${encodeURIComponent(token)}&since=${encodeURIComponent(since)}`);
    const j = await r.json();
    if (!j.ok) throw new Error(j.error || "下載失敗");
    let n = 0;
    for (const t of TABLES) for (const row of j.data[t] || []) {
      const mine = await db.get(t, row.id);
      const queued = await db.get("queue", t + ":" + row.id);
      if (queued) continue;                       // 本機還沒上傳的修改優先
      if (!mine || (row.updated_at || "") > (mine.updated_at || "")) { await db.putRaw(t, row); n++; }
    }
    await db.local("last_pull", j.now);
    window.dispatchEvent(new Event("gf-synced"));
    return { ok: true, received: n };
  } catch (e) { return { ok: false, error: String(e.message || e) }; }
}

export async function ping(url, token) {
  const r = await fetch(`${url}?action=ping&token=${encodeURIComponent(token)}`);
  return r.json();
}

export function start() {
  const run = () => push().then(pull);
  window.addEventListener("online", run);
  window.addEventListener("gf-queued", () => setTimeout(push, 500));
  document.addEventListener("visibilitychange", () => { if (!document.hidden) run(); });
  run();
  setInterval(push, 60e3);
}
