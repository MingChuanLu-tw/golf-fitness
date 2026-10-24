# 高爾夫體能訓練網頁 App

單一使用者（MingLu）的 16 週高爾夫體能訓練 PWA：iPad 與 iPhone 都能跟練、記錄、依規則調整課表，並產生給揮桿教練的 LINE 週報圖卡。

## 每次開工前

1. 先讀 `docs/plan.md`（訓練計畫書，所有規則的唯一來源）和 `docs/spec.md`（網頁規格書）。
2. 再讀 `docs/kickoff.md`，確認目前做到哪個階段。

## 工作規則

- 和我溝通、介面文字都用繁體中文；專業術語保留英文（例如 Pallof press、RPE）。
- **規則只能來自 `docs/plan.md`**。計畫書沒寫、或計畫書和規格書不一致時，停下來問我，不要自行決定。
- **安全規則必須完全照計畫書第二節實作**：訓練前收縮壓重量後仍 ≥140 或 <95、站起頭暈 → 只做活動度；心率 >120 → 休息到 100 以下；RPE 上限 7；「不舒服」按鈕立即暫停並顯示停止規則與 119 提示。這些數字放在 `program.json` 的 `safety`，不要寫死在程式裡。
- **repo 會是公開的**（GitHub Pages 免費方案）。程式碼和 `program.json` 不能含任何個人資料：病史、血壓、用藥、token 一律不進 repo。token 只在網頁「設定」輸入，存在裝置上。
- 技術：純 HTML／CSS／JavaScript，不用建置工具；圖表用 Chart.js（CDN）；離線用 service worker＋IndexedDB；後端是 Google Apps Script＋Google Sheet。
- iPad 橫向與 iPhone 直向都要能完整跟練（規格書第四節）。用 Safari 測試。
- 每完成一個階段（M0、M1…）就 commit，並告訴我：做了什麼、怎麼測的、我要在 iPad 和 iPhone 上怎麼驗收。我確認後才進下一階段。
- 修改 `docs/plan.md` 或 `docs/spec.md` 前先問我；這兩份的正本在 claude.ai，我會在那邊改好再匯出覆蓋。
