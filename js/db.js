// 本機資料庫（IndexedDB）。每筆紀錄都有 id、created_at、updated_at、source。
const DB_NAME = "golf-fitness";
const STORES = ["Sessions", "SetLogs", "Mobility", "Tests", "Prefs", "queue", "local"];
let dbp;

function open() {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = () => {
      for (const s of STORES) if (!r.result.objectStoreNames.contains(s)) r.result.createObjectStore(s, { keyPath: "id" });
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return dbp;
}

async function tx(store, mode, fn) {
  const db = await open();
  return new Promise((res, rej) => {
    const t = db.transaction(store, mode);
    const out = fn(t.objectStore(store));
    t.oncomplete = () => res(out && "result" in out ? out.result : out);
    t.onerror = () => rej(t.error);
  });
}

export const get = (store, id) => tx(store, "readonly", s => s.get(id));
export const all = (store) => tx(store, "readonly", s => s.getAll());
export const del = (store, id) => tx(store, "readwrite", s => s.delete(id));
export const putRaw = (store, row) => tx(store, "readwrite", s => s.put(row));

export function uuid() {
  return (crypto.randomUUID ? crypto.randomUUID() : "id-" + Date.now() + "-" + Math.random().toString(16).slice(2));
}

// 台北時間 ISO 字串，例如 2026-10-26T20:01:33+08:00
export function nowISO(d = new Date()) {
  const t = new Date(d.getTime() + 8 * 3600e3);
  return t.toISOString().slice(0, 19) + "+08:00";
}
export function todayStr(d = new Date()) { return nowISO(d).slice(0, 10); }

const SYNCED = new Set(["Sessions", "SetLogs", "Mobility", "Tests", "Prefs"]);

// 寫入一筆紀錄並排進上傳佇列
export async function save(store, row) {
  const now = nowISO();
  row.id = row.id || uuid();
  row.created_at = row.created_at || now;
  row.updated_at = now;
  row.source = row.source || "web";
  await putRaw(store, row);
  if (SYNCED.has(store)) {
    await putRaw("queue", { id: store + ":" + row.id, table: store, row });
    window.dispatchEvent(new Event("gf-queued"));
  }
  return row;
}

// 本機設定（不上傳）：同步網址、token、進行中的訓練等
export async function local(key, value) {
  if (value === undefined) { const r = await get("local", key); return r ? r.value : undefined; }
  await putRaw("local", { id: key, value });
  return value;
}
// 會同步的偏好（器材、進入條件、回診問題答案）
export async function pref(key, value) {
  if (value === undefined) { const r = await get("Prefs", key); return r ? JSON.parse(r.value) : undefined; }
  await save("Prefs", { id: key, value: JSON.stringify(value) });
  return value;
}
