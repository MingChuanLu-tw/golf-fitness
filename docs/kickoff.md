# 開工說明與進度

## 第一次開工時，貼給 Claude Code 的話

> 請先讀 CLAUDE.md、docs/plan.md、docs/spec.md 和這份 docs/kickoff.md。讀完後，用條列告訴我你理解的範圍，以及「今天就能做」那一段的工作清單和預計檔案結構；有不清楚或兩份文件矛盾的地方一併列出來。等我確認後再開始寫程式。

## 已確定的條件

| 項目 | 內容 |
| --- | --- |
| 使用者 | 只有我一人；不做帳號系統 |
| 裝置 | iPad（橫向跟練）與 iPhone（直向跟練、打卡、補登、週報），都用 Safari，加到主畫面 |
| 部署 | GitHub Pages（public repo）＋PWA |
| 資料 | Google Sheet（10 個分頁，見規格書第六節）＋Google Apps Script Web App 當 API；POST 用 `text/plain` |
| 計畫資料 | `program.json`，從 `docs/plan.md` 完整轉入 |
| 提醒 | 只在網頁「今日」顯示，不推播、不寫行事曆；包含器材添購提醒 |
| 心率 | 第一版手動輸入（組間可略過、結束時輸入平均與最高） |
| 模擬器數據 | 第一版：GSPro「Export CSV to Desktop」＋ Windows 上的 Python 上傳程式監看桌面；第二版再評估 Open Connect |
| 時程 | 第 0 週 2026/10/22–10/25；第 1 週 2026/10/26（一）開始；目標第 1 週開始前能在 iPad 和 iPhone 上跟練 |

## 工作順序

### 今天就能做（不需要任何帳號）

1. **建立專案結構**：`index.html`、`styles.css`、`js/`（app、規則引擎、儲存、同步）、`program.json`、`sw.js`、`manifest.webmanifest`、`tools/check_program.py`、`apps-script/Code.gs`（草稿）、`uploader/`（先放空資料夾）。
2. **把計畫書完整轉成 `program.json`**：四期所有課表（A／B／C、第四期）、熱身、收操、週末課、下場週減量表、出差替代動作、每個動作的要點／呼吸提示／退階／進階／影片連結、進入條件、安全數字、特殊日期（複測週、下場日、春節、回診問題、器材提醒）。
3. **寫 `tools/check_program.py`**：比對 `docs/plan.md` 的課表與 `program.json`，列出任何不一致（動作、組數、次數、影片連結）。必須全部一致才算完成 M0 的這一部分。
4. **做 M1 的本機版**：今日、訓練前檢查、跟練模式（iPad 橫向＋iPhone 直向）、訓練結束、紀錄，資料先只存在 IndexedDB；含離線、中斷恢復、Screen Wake Lock、語音提示。
5. **本機測試**：用 `python3 -m http.server` 開起來，電腦瀏覽器用 iPad／iPhone 尺寸測；再用同一個 Wi-Fi 下的電腦 IP 在 iPad、iPhone 上實際打開。

### 拿到 GitHub 與 Google 帳號後（預計 10/22）

6. 建 GitHub repo（public）、開 GitHub Pages、加到 iPad 和 iPhone 主畫面。
7. 建 Google Sheet 與 10 個分頁、部署 Apps Script、設定 token；接上同步佇列。
8. 完成 M1 驗收：iPad 和 iPhone 各完成一次第一期課表 A；中途關閉 Wi-Fi 仍能做完，恢復後 Sheet 有每一組的紀錄。

### 之後

- M2：規則引擎（進度建議、12kg 進入條件、減量週、出差模式）、16 週日曆、動作庫
- M3：模擬器上傳程式（需要先拿到一份 GSPro CSV 確認欄位）、擊球數據、測試與複測、下場成績、趨勢圖
- M4：教練週報圖卡、教練回饋、醫療紀錄、資料匯出

## 還沒提供的資料（見規格書第十一節）

- [ ] GitHub 帳號、repo 名稱
- [ ] 用哪個 Google 帳號
- [ ] iPad、iPhone 型號與 iOS 版本
- [ ] 模擬器 PC 的 Windows 版本、GSPro 版本
- [ ] 一份 GSPro 匯出的 CSV
- [ ] 上傳程式要開機自動執行或手動啟動
- [ ] 是否把「Claude 遠端讀取模擬器 PC」列入第二版

## 進度紀錄

（每完成一個階段，在這裡加一行：日期、階段、做了什麼、驗收結果）

- 2026-10-24　M0 程式部分＋M1 本機版完成（在 claude.ai 對話中開發）：program.json 與比對檢查（51 個課表動作、45 支影片全部一致）、今日／訓練前檢查／跟練（iPad 橫向、iPhone 直向）／訓練結束／紀錄／測試／動作庫／更多、離線佇列與 Google Sheet 同步、Apps Script 後端。自動測試：規則引擎 29 項、後端 10 項、完整一次課表、離線後恢復同步、兩台裝置互相看到紀錄，全部通過。待辦：部署到 GitHub Pages、建立 Sheet、實機驗收。
- 2026-10-25　部署完成：GitHub Pages（mingchuanlu-tw.github.io/golf-fitness）、Google Sheet「高爾夫體能紀錄」11 個分頁與 Apps Script；iPhone 連線成功。
- 2026-10-25　v0.1.1 依實測修正：計時步驟（熱身、活動度、收操、計時組）切換後不再自動倒數，按「開始」後預備 5 秒再計時，左右側各按一次；每日活動度一天可記錄多次（跟練、手動、訓練熱身各算一次，可撤銷手動那筆），本週統計仍以天數計。瀏覽器自動測試通過。
- 2026-10-29　v0.1.2：計畫書加入 11/21（六）幸福球場下場（claude.ai 正本與 docs/plan.md 同步修改）：第 4 週課表 C 取消、11/19 速度區塊 1 組、11/20 只做活動度、11/22 恢復、第 4 週複測改到 11/23；program.json 加入對應的特殊日與複測改期提示。check_program 全部一致，瀏覽器檢查 11/16–11/23 的「今日」頁提示正確。
