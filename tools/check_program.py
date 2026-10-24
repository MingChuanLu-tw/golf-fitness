#!/usr/bin/env python3
"""比對 docs/plan.md 的課表表格與 program.json。全部一致才回傳 0。
    python3 tools/check_program.py
"""
import json, re, sys, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
plan = (root / "docs/plan.md").read_text(encoding="utf-8")
prog = json.loads((root / "program.json").read_text(encoding="utf-8"))

def norm(s):
    s = re.sub(r"\*\*", "", s)
    return re.sub(r"\s+", "", s).replace("／", "/").replace("x", "×")

# 依章節找出每份課表的表格
sections = {
    "P1": ("## 六、", "## 七、"), "P2": ("## 七、", "## 八、"), "P3": ("## 八、", "## 九、"),
}
problems, checked = [], 0
for ph, (a, b) in sections.items():
    body = plan[plan.index(a):plan.index(b)]
    blocks = re.split(r"\n\*\*課表 ([ABC])", body)[1:]
    for i in range(0, len(blocks), 2):
        letter, text = blocks[i], blocks[i + 1]
        items = prog["sessions"][f"{ph}-{letter}"]
        rows = [r for r in text.split("\n") if r.startswith("| ") and not r.startswith("| 順序") and not r.startswith("| ---")]
        if len(rows) != len(items):
            problems.append(f"{ph}-{letter}: 計畫書 {len(rows)} 個動作，program.json {len(items)} 個")
        for row, item in zip(rows, items):
            cells = [c.strip() for c in row.strip("|").split("|")]
            pair, name, reps, cue, rp = cells[:5]
            checked += 1
            if norm(pair) != norm(item["pair"]):
                problems.append(f"{ph}-{letter} {pair}: 順序代號不同（program: {item['pair']}）")
            if item.get("by_week"):           # 依週次切換的跳躍
                for kw in ("snap-down", "反向跳"):
                    if kw not in name:
                        problems.append(f"{ph}-{letter} {pair}: 計畫書沒有提到 {kw}")
                continue
            if norm(name) != norm(item["label"]):
                problems.append(f"{ph}-{letter} {pair}: 名稱「{name}」≠「{item['label']}」")
            want = item["reps"] + ("/側" if item["per_side"] else "")
            if "×" in reps:
                want = f"{item.get('rounds')}×" + want
            if norm(reps) != norm(want):
                problems.append(f"{ph}-{letter} {pair}: 次數「{reps}」≠「{want}」")
            full = (item.get("warmup", "") + "當暖身。" if item.get("warmup") and "暖身" not in item["warmup"] else (item.get("warmup", "") + "。" if item.get("warmup") else "")) + item["cue"]
            if norm(cue) not in (norm(item["cue"]), norm(full)):
                problems.append(f"{ph}-{letter} {pair}: 要點不同\n    計畫書：{cue}\n    program：{item['cue']}")
            if norm(rp) != norm(item["regress"] + "/" + item["progress"]):
                problems.append(f"{ph}-{letter} {pair}: 退階／進階「{rp}」≠「{item['regress']}／{item['progress']}」")

# 影片連結都要出現在計畫書裡
for k, e in prog["exercises"].items():
    for key in ("video", "video2"):
        url = e.get(key)
        if url and url not in plan:
            problems.append(f"影片：{e['name']} 的連結不在計畫書影片庫裡：{url}")

# 安全數字
s = prog["safety"]
for txt, ok in [("≥140", s["bp_sys_max"] == 140), ("<95", s["bp_sys_min"] == 95), (">120", s["hr_max"] == 120),
                ("100 以下", s["hr_resume"] == 100), ("RPE 7", s["rpe_cap"] == 7)]:
    if txt not in plan or not ok:
        problems.append(f"安全數字 {txt} 不一致")

print(f"檢查 {checked} 個課表動作、{len(prog['exercises'])} 支動作影片")
if problems:
    print(f"發現 {len(problems)} 個不一致：")
    for p in problems: print(" -", p)
    sys.exit(1)
print("全部一致 ✓")
