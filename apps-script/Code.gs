/**
 * 高爾夫體能網頁 App 的後端（Google Apps Script，綁定在 Google Sheet 上）。
 *
 * 部署步驟見 README.md。重點：
 *  - 「專案設定 → 指令碼屬性」新增 TOKEN_WEB（網頁用）與 TOKEN_SIM（模擬器上傳程式用，只能寫 Shots）。
 *  - 改程式後，要在「部署 → 管理部署作業」編輯原本的部署、選「新版本」，
 *    不要按「新增部署作業」，否則網址會改變，網頁就連不上。
 */

const TABLES = {
  Sessions:    ['id','date','week','phase','session_id','session_type','status','bp_sys_1','bp_dia_1','bp_sys_2','bp_dia_2','bp_retest_sys','sleep_h','condition','pain_area','pain_score','precheck','step_down','hr_avg','hr_max','duration_min','rpe_session','pain_area_after','pain_score_after','symptom','symptom_at','notes','started_at','finished_at','created_at','updated_at','source'],
  SetLogs:     ['id','session_id','date','session_plan','exercise_id','label','pair','round','side','target_reps','reps','load_kg','rpe','form_breakdown','pain_score','hr_rest','seq','created_at','updated_at','source'],
  Mobility:    ['id','date','done','kind','sock_pain','created_at','updated_at','source'],
  Tests:       ['id','date','week','test_id','side','value','created_at','updated_at','source'],
  Shots:       ['id','datetime','club','ball_speed','club_speed','smash','carry','total','back_spin','side_spin','offline','hla','vla','peak_height','aoa','block','file_name','created_at','updated_at','source'],
  Rounds:      ['id','date','course','score','front9','back9','fairways','gir','putts','late_energy','next_day_pain','created_at','updated_at','source'],
  Body:        ['id','date','weight_kg','waist_cm','resting_hr','created_at','updated_at','source'],
  CoachNotes:  ['id','date','content','needs_program_change','done','created_at','updated_at','source'],
  Medical:     ['id','date','type','content','answer','file_link','created_at','updated_at','source'],
  Suggestions: ['id','date','exercise_id','change','reason','accepted','created_at','updated_at','source'],
  Prefs:       ['id','value','created_at','updated_at','source'],
};
const PULL_TABLES = ['Sessions', 'SetLogs', 'Mobility', 'Tests', 'Prefs'];

/** 第一次使用時在編輯器裡手動執行一次：建立所有分頁與標題列。 */
function setupSheets() {
  const ss = SpreadsheetApp.getActive();
  Object.keys(TABLES).forEach(name => sheetFor_(ss, name));
  const first = ss.getSheetByName('工作表1') || ss.getSheetByName('Sheet1');
  if (first && ss.getSheets().length > 1) ss.deleteSheet(first);
}

function doGet(e) {
  const p = e.parameter || {};
  const role = auth_(p.token);
  if (!role) return json_({ ok: false, error: 'token 錯誤' });
  if (p.action === 'ping') return json_({ ok: true, sheet: SpreadsheetApp.getActive().getName(), role: role });
  if (p.action === 'pull') {
    if (role !== 'web') return json_({ ok: false, error: '權限不足' });
    const since = p.since || '';
    const ss = SpreadsheetApp.getActive(), data = {};
    PULL_TABLES.forEach(t => { data[t] = readRows_(sheetFor_(ss, t)).filter(r => String(r.updated_at || '') > since); });
    return json_({ ok: true, now: nowISO_(), data: data });
  }
  return json_({ ok: false, error: '未知的 action' });
}

function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: '格式錯誤' }); }
  const role = auth_(body.token);
  if (!role) return json_({ ok: false, error: 'token 錯誤' });
  if (body.action !== 'upsert') return json_({ ok: false, error: '未知的 action' });
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return json_({ ok: false, error: '忙碌中，請稍後再試' });
  try {
    const ss = SpreadsheetApp.getActive();
    const byTable = {};
    (body.items || []).forEach(it => {
      if (!TABLES[it.table]) return;
      if (role === 'sim' && it.table !== 'Shots') return;          // 模擬器只能寫 Shots
      (byTable[it.table] = byTable[it.table] || []).push(it.row);
    });
    let n = 0;
    Object.keys(byTable).forEach(t => { n += upsert_(sheetFor_(ss, t), byTable[t]); });
    return json_({ ok: true, written: n });
  } finally { lock.releaseLock(); }
}

// ---------- 內部 ----------
function auth_(token) {
  const props = PropertiesService.getScriptProperties();
  if (token && token === props.getProperty('TOKEN_WEB')) return 'web';
  if (token && token === props.getProperty('TOKEN_SIM')) return 'sim';
  return null;
}

function sheetFor_(ss, name) {
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, TABLES[name].length).setValues([TABLES[name]]).setFontWeight('bold');
    sh.setFrozenRows(1);
    textCols_(sh, TABLES[name], 0);
  }
  return sh;
}

/** 日期、時間、id 等欄位設成純文字，避免 Sheet 自動轉成日期（例如 118/76）。 */
const TEXT_COL = /^(id|date|datetime|value|side|target_reps|session_id|session_plan|label|pair|club|file_name|condition|pain_area|pain_area_after|notes|content|answer|.*_at)$/;
function textCols_(sh, names, offset) {
  names.forEach((k, i) => { if (TEXT_COL.test(k)) sh.getRange(1, offset + i + 1, sh.getMaxRows(), 1).setNumberFormat('@'); });
}

function headers_(sh) {
  const last = sh.getLastColumn();
  return last ? sh.getRange(1, 1, 1, last).getValues()[0].map(String) : [];
}

function readRows_(sh) {
  const h = headers_(sh), n = sh.getLastRow() - 1;
  if (n < 1) return [];
  return sh.getRange(2, 1, n, h.length).getValues().map(v => {
    const o = {}; h.forEach((k, i) => { if (v[i] !== '') o[k] = v[i] instanceof Date ? Utilities.formatDate(v[i], 'Asia/Taipei', "yyyy-MM-dd") : v[i]; });
    return o;
  });
}

/** 依 id 新增或更新；較舊的 updated_at 不會蓋掉較新的資料。新欄位自動加在最右邊。 */
function upsert_(sh, rows) {
  let h = headers_(sh);
  const extra = [];
  rows.forEach(r => Object.keys(r).forEach(k => { if (h.indexOf(k) < 0 && extra.indexOf(k) < 0) extra.push(k); }));
  if (extra.length) { sh.getRange(1, h.length + 1, 1, extra.length).setValues([extra]).setFontWeight('bold'); textCols_(sh, extra, h.length); h = h.concat(extra); }
  const idCol = h.indexOf('id'), upCol = h.indexOf('updated_at');
  const n = sh.getLastRow() - 1;
  const existing = n > 0 ? sh.getRange(2, 1, n, h.length).getValues() : [];
  const index = {}; existing.forEach((v, i) => { index[String(v[idCol])] = i; });
  const appends = []; let written = 0;
  rows.forEach(r => {
    const line = h.map(k => (r[k] === undefined || r[k] === null) ? '' : (typeof r[k] === 'object' ? JSON.stringify(r[k]) : r[k]));
    const i = index[String(r.id)];
    if (i === undefined) { appends.push(line); index[String(r.id)] = -1; written++; }
    else if (i >= 0 && String(existing[i][upCol] || '') <= String(r.updated_at || '')) {
      sh.getRange(i + 2, 1, 1, h.length).setValues([line]); written++;
    }
  });
  if (appends.length) sh.getRange(sh.getLastRow() + 1, 1, appends.length, h.length).setValues(appends);
  return written;
}

function nowISO_() { return Utilities.formatDate(new Date(), 'Asia/Taipei', "yyyy-MM-dd'T'HH:mm:ss") + '+08:00'; }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
