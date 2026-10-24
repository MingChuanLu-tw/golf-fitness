#!/usr/bin/env python3
"""產生 program.json。內容逐項轉自 docs/plan.md；修改計畫書後，改這裡再重新執行：
    python3 tools/build_program.py
"""
import json, pathlib

YT = "https://www.youtube.com/watch?v="

# ---------- 動作庫：名稱、影片、預設呼吸提示、出差替代 ----------
EX = {
  # 活動度與伸展
  "cat_cow":        dict(name="貓牛式", video=YT+"1Y0YjXS9sKI", breath="跟著呼吸慢慢做"),
  "open_book":      dict(name="開書式", video=YT+"rDviWORCWEw", breath="轉開時吐氣"),
  "hip_9090":       dict(name="90/90 坐姿髖轉換", video=YT+"HUZimFZJZWU", breath="持續呼吸"),
  "wgs":            dict(name="世界最偉大伸展", video=YT+"Znj8go4fIyc", breath="轉開時吐氣"),
  "dowel_hinge":    dict(name="球桿 hip hinge", video=YT+"PG67O49Hsso", breath="起身時吐氣"),
  "seated_trot":    dict(name="坐姿胸椎旋轉", video=YT+"KDq-oykm89U", breath="轉身時吐氣"),
  "ham_strap":      dict(name="仰躺彈力繩拉腿後側", video=YT+"Il1L75v6gq0", breath="持續呼吸"),
  "childs_pose":    dict(name="嬰兒式", video=YT+"-dZXkwzSzF4", breath="慢慢吐氣放鬆"),
  "walk":           dict(name="慢走", video=None, breath="自然呼吸"),
  "brisk_walk":     dict(name="快走", video=None, breath="自然呼吸，心率 ≤120"),
  # 核心與抗旋轉
  "dead_bug":       dict(name="死蟲式", video=YT+"g_BYB0R-4Ws", breath="伸手腳時吐氣"),
  "bird_dog":       dict(name="鳥狗式", video=YT+"dDMvch2Z9yY", breath="伸展時吐氣"),
  "pallof":         dict(name="彈力繩 Pallof press", video=YT+"lqPrSGXfL1Q", breath="推出時吐氣", travel="side_plank"),
  "pallof_walk":    dict(name="步行 Pallof press", video=YT+"C_lfM3v9HOc", breath="推出後持續呼吸", travel="side_plank"),
  "side_plank":     dict(name="側棒式（膝蓋著地）", video=YT+"s8Hh8UI0l_Q", breath="持續呼吸，不憋氣"),
  "hk_chop":        dict(name="半跪姿彈力繩木砍", video=YT+"knZfggvbS50", breath="拉時吐氣", travel="hk_trunk_rot"),
  "fast_chop":      dict(name="彈力繩快速木砍", video=YT+"knZfggvbS50", breath="快速拉時吐氣", travel="hk_trunk_rot"),
  "hk_trunk_rot":   dict(name="半跪姿徒手轉體", video=None, breath="轉身時吐氣"),
  # 上肢
  "incline_pushup": dict(name="斜板伏地挺身", video=YT+"y8I66lWtNB8", breath="推起時吐氣"),
  "pushup":         dict(name="伏地挺身", video=YT+"zMiEZ96UZc0", breath="推起時吐氣"),
  "band_press":     dict(name="彈力繩胸推", video=YT+"WHSlwHqCO6Q", breath="推出時吐氣", travel="pushup_bed"),
  "pushup_bed":     dict(name="伏地挺身（撐在床緣或桌邊）", video=YT+"y8I66lWtNB8", breath="推起時吐氣"),
  "band_row":       dict(name="彈力繩划船", video=YT+"nnAt37a46Kg", breath="拉時吐氣", travel="towel_row"),
  "band_row_1arm":  dict(name="彈力繩單手划船", video=YT+"qUIBmTsLplo", breath="拉時吐氣", travel="towel_row"),
  "towel_row":      dict(name="毛巾掛門把划船", video=None, breath="拉時吐氣"),
  "face_pull":      dict(name="彈力繩 face pull", video=YT+"G4pTTvKpVO0", breath="拉時吐氣", travel="prone_yt"),
  "prone_yt":       dict(name="俯臥 Y-T 舉手", video=None, breath="舉起時吐氣"),
  # 下肢與後側鏈
  "kb_rdl":         dict(name="壺鈴羅馬尼亞硬舉", video=YT+"Uc5rP5xs7qQ", breath="起身時吐氣", travel="sl_rdl_bw", load=True),
  "sl_rdl":         dict(name="單腳羅馬尼亞硬舉", video=YT+"Nenu2LI9_dw", breath="起身時吐氣", travel="sl_rdl_bw", load=True),
  "sl_rdl_bw":      dict(name="單腳羅馬尼亞硬舉（徒手，次數加倍）", video=YT+"Nenu2LI9_dw", breath="起身時吐氣"),
  "kb_deadlift":    dict(name="壺鈴硬舉（起身加速）", video=YT+"sDbMsk3d6F4", breath="起身時吐氣", travel="hip_thrust_bed", load=True),
  "kb_swing":       dict(name="壺鈴擺盪", video=YT+"yeB_J0rqc5Q", breath="頂髖時吐氣", travel="hip_thrust_bed", load=True, power=True),
  "hip_thrust_bed": dict(name="臀推（肩膀靠床緣）", video=YT+"3NXv0Nany-Q", breath="頂起時吐氣"),
  "goblet_squat":   dict(name="高腳杯深蹲", video=YT+"MWHIs0zxkCU", breath="站起時吐氣", travel="bw_squat", load=True),
  "bw_squat":       dict(name="徒手深蹲（下蹲放慢 3 秒）", video=YT+"MWHIs0zxkCU", breath="站起時吐氣"),
  "rev_lunge":      dict(name="後退弓箭步", video=YT+"ALl174GTuoY", breath="站起時吐氣"),
  "glute_bridge":   dict(name="橋式", video=YT+"3NXv0Nany-Q", breath="頂起時吐氣"),
  "sl_bridge":      dict(name="單腳橋式", video=YT+"3NXv0Nany-Q", breath="頂起時吐氣"),
  "suitcase_carry": dict(name="壺鈴手提行走", video=YT+"Q1GjhRDAil0", breath="持續呼吸", load=True),
  # 爆發力
  "mb_rot_slam":    dict(name="藥球旋轉砸地", video=YT+"zH6GLmlBj7M", breath="砸球瞬間吐氣", travel="fast_trunk_rot", power=True),
  "mb_slam":        dict(name="藥球正面砸地", video=YT+"c-p3Zxgr0Z4", video2=YT+"-nFIB7SgQbQ", breath="砸球瞬間吐氣", travel="fast_trunk_rot", power=True),
  "fast_trunk_rot": dict(name="快速徒手轉體（每組 6 下）", video=None, breath="轉身時吐氣"),
  "snap_down":      dict(name="落地練習 snap-down", video=YT+"4BkMWe3au9w", breath="下沉時吐氣", power=True),
  "cmj":            dict(name="低幅反向跳", video=YT+"sLvArswhYMQ", breath="起跳時吐氣", power=True),
  "skater_stick":   dict(name="側向跨跳停住", video=YT+"niEGdFUQ6sY", breath="落地停住時吐氣", power=True),
}

def it(pair, ex, reps, cue, regress, progress, *, rounds=None, side=False, sec=None,
       load=None, label=None, gate=None, warmup=None, rest=None, by_week=None):
    d = dict(pair=pair, ex=ex, label=label or EX[ex]["name"], reps=reps, cue=cue,
             regress=regress, progress=progress, per_side=side)
    if rounds is not None: d["rounds"] = rounds
    if sec is not None: d["seconds"] = sec
    if load: d["load"] = load
    if gate: d["gate"] = gate
    if warmup: d["warmup"] = warmup
    if rest: d["rest_s"] = rest
    if by_week: d["by_week"] = by_week
    return d

KB = {"gate": "kb12", "before": "8–10kg", "after": "12kg"}   # 第七節負重順序

SESSIONS = {
  # ---------- 第一期（第六節） ----------
  "P1-A": [
    it("A1","dowel_hinge","10","後腦、上背、尾椎三點不離桿","膝蓋多彎一些","放慢速度"),
    it("A2","incline_pushup","6–8","身體一直線，推起時吐氣","撐更高的地方","更低的地方"),
    it("B1","goblet_squat","10","站起時吐氣","坐到椅子","底部停 2 秒",load="6kg",label="高腳杯深蹲 6kg"),
    it("B2","band_row","12","夾背、手肘往後拉，拉時吐氣","換輕的繩","換重的繩"),
    it("C1","dead_bug","8","下背貼地，伸手腳時吐氣","只動腳","手持壺鈴",side=True),
    it("C2","seated_trot","10","鐵桿橫放胸前、靠近鎖骨，雙手交叉壓住；骨盆和肩胛不動","縮小幅度","轉到底停 3 秒",side=True),
  ],
  "P1-B": [
    it("A1","kb_rdl","12","臀部往後推、背打直，起身時吐氣","徒手","底部停 2 秒",load="6kg",label="壺鈴羅馬尼亞硬舉 6kg"),
    it("A2","band_press","12","錨點在背後、分腿站，推出時吐氣，身體不前傾","換輕的繩","單手"),
    it("B1","rev_lunge","8","前膝對齊腳尖","扶牆","手持壺鈴",side=True),
    it("B2","band_row_1arm","10","骨盆和肩膀不轉","雙手版","換重的繩",side=True),
    it("C1","pallof","10","側對固定點，推出時吐氣，身體不被拉轉","站近一點","站遠或分腿站",side=True),
    it("C2","open_book","8","側躺、膝蓋疊好不動，轉開時吐氣","縮小幅度","停留 3 秒",side=True),
  ],
  "P1-C": [
    it("A1","glute_bridge","12","用臀部出力，不是腰；頂起時吐氣","縮小幅度","單腳橋"),
    it("A2","incline_pushup","6","慢慢下放，推起時吐氣","撐更高的地方","更低的地方",label="斜板伏地挺身（下放 3 秒）"),
    it("B1","goblet_squat","8","停住時持續呼吸","坐到椅子","延長停頓",load="6kg",label="高腳杯深蹲 6kg（底部停 2 秒）"),
    it("B2","face_pull","15","拉到臉前、手肘外開，拉時吐氣","換輕的繩","停頓 2 秒"),
    it("C1","hk_chop","10","由高往低斜拉，轉的是胸椎不是腰","站姿","縮小幅度",side=True,label="半跪姿彈力繩木砍（慢速）"),
    it("C2","bird_dog","8","骨盆保持水平，伸展時吐氣","只伸手","停留 3 秒",side=True),
  ],
  # ---------- 第二期（第七節） ----------
  "P2-A": [
    it("A1","kb_rdl","10","起身時吐氣，背打直","減輕重量","底部停 2 秒",load=KB,label="壺鈴羅馬尼亞硬舉 8–10kg → 12kg（見進入條件）"),
    it("A2","pushup","6–8","身體一直線，推起時吐氣。第 4 週複測少於 8 下，先用低一點的斜板版","斜板版","下放 3 秒"),
    it("B1","goblet_squat","10","站起時吐氣","減輕重量","底部停 2 秒",load=KB,label="高腳杯深蹲 8–10kg → 12kg"),
    it("B2","band_row_1arm","12","骨盆和肩膀不轉","雙手版","換重的繩",side=True),
    it("C1","hk_chop","10","由高往低，轉的是胸椎不是腰","站姿","加快拉的速度",side=True),
    it("C2","side_plank","30 秒","持續呼吸，不憋氣","縮短秒數","腳伸直",side=True,sec=30),
  ],
  "P2-B": [
    it("A1","sl_rdl","8","骨盆保持水平","手扶牆","8kg",side=True,load="6kg",label="單腳羅馬尼亞硬舉 6kg"),
    it("A2","band_press","12","推出時吐氣，身體不前傾","換輕的繩","單手"),
    it("B1","rev_lunge","8","前膝對齊腳尖","徒手","8–10kg",side=True,load="6kg",label="後退弓箭步 6kg"),
    it("B2","face_pull","15","拉到臉前、手肘外開，拉時吐氣","換輕的繩","停頓 2 秒"),
    it("C1","pallof_walk","6 步","手推出後側向小步移動，身體不被拉轉","原地版","換重的繩",side=True),
    it("C2","sl_bridge","10","頂起時吐氣","雙腳橋","腳放在沙發上",side=True),
  ],
  "P2-C": [
    it("先做","kb_swing","5","擺盪是 hip hinge 的爆發，不是深蹲；頂髖時吐氣。每組休息到心率 <100","壺鈴硬舉","每組 6 下",
       rounds=3,load=KB,label="壺鈴擺盪 8–10kg → 12kg（未達進入條件改壺鈴硬舉 3 × 8）",
       gate={"id":"kb12","alt":{"ex":"kb_deadlift","rounds":3,"reps":"8","label":"壺鈴硬舉（起身加速）3 × 8"}},
       warmup="先做 5 下壺鈴硬舉當暖身",rest=90),
    it("A1","goblet_squat","8","停住時持續呼吸","減輕重量","延長停頓",load=KB,label="高腳杯深蹲 8–10kg → 12kg（底部停 2 秒）"),
    it("A2","pushup","6–8","推起時吐氣","斜板版","下放 3 秒"),
    it("B1","suitcase_carry","30 秒","身體不歪，持續呼吸（也負責抗旋轉）","減輕重量","延長到 45 秒",side=True,sec=30,load=KB,label="壺鈴手提行走 8–10kg → 12kg"),
    it("B2","band_row","12","夾背，拉時吐氣","換輕的繩","換重的繩"),
  ],
  # ---------- 第三期（第八節） ----------
  "P3-A": [
    it("1a","mb_rot_slam","4","右打者：球舉到右肩上方（像上桿頂點），髖先轉，砸在左腳外側前方；另一側反過來做","正面砸地","加快節奏",
       rounds=3,side=True,label="藥球旋轉砸地 2–3kg",warmup="先用約 50% 力量做 3–4 下"),
    it("1b","fast_chop","6","慢慢回、快速拉；和 1a 輪流做","慢速版","換重的繩",rounds=2,side=True,warmup="先用約 50% 力量做 3–4 下"),
    it("A1","kb_rdl","8","維持肌力","減輕重量","下一個重量",rounds=2,load=KB),
    it("A2","pushup","8–10","維持肌力","斜板版","下放 3 秒",rounds=2),
    it("B1","band_row_1arm","12","維持肌力","雙手版","換重的繩",rounds=2,side=True),
  ],
  "P3-B": [
    it("1a","kb_swing","6","頂髖時吐氣；做完休息到心率 <100","壺鈴硬舉","下一個重量",rounds=3,load=KB,
       gate={"id":"kb12","alt":{"ex":"kb_deadlift","rounds":3,"reps":"8","label":"壺鈴硬舉（起身加速）3 × 8"}},
       warmup="先做 5 下壺鈴硬舉",rest=90),
    it("1b","snap_down","5","踮腳後快速下沉成半蹲停住","—","—",rounds=3,label="跳躍（依週次）",
       by_week=[{"weeks":[10,10],"ex":"snap_down","rounds":3,"reps":"5","label":"落地練習 snap-down","cue":"踮腳後快速下沉成半蹲停住"},
                {"weeks":[11,16],"ex":"cmj","rounds":3,"reps":"3","label":"低幅反向跳","cue":"落地輕、膝蓋對齊腳尖，落地停 2 秒。下背或膝蓋 >2/10 就退回 snap-down"}]),
    it("1c","skater_stick","4","往側邊跨跳，單腳落地停 2 秒","側向跨步不跳","加大距離",rounds=2,side=True,label="側向跨跳停住（skater to stick）"),
    it("A1","sl_rdl","8","維持肌力","手扶牆","8–10kg",rounds=2,side=True),
    it("A2","band_press","12","維持肌力","換輕的繩","單手",rounds=2),
  ],
  "P3-C": [
    it("1a","mb_slam","6","用髖往後坐、胸口朝前往下砸，不要彎腰去追球；砸時吐氣。下背 ≥3/10 的那週改成胸前往下推砸，不舉過頭","胸前推砸","加快節奏",rounds=2,warmup="先用約 50% 力量做 3–4 下"),
    it("1b","mb_rot_slam","4","同課表 A；和 1a 輪流做","正面砸地","加快節奏",rounds=2,side=True),
    it("A1","goblet_squat","10","站起時吐氣","減輕重量","停頓 2 秒",rounds=2,load=KB),
    it("A2","band_row","12","夾背，拉時吐氣","換輕的繩","換重的繩",rounds=2),
    it("B1","rev_lunge","8","前膝對齊腳尖","扶牆","手持壺鈴",rounds=2,side=True),
    it("B2","pallof","10","維持抗旋轉","站近","站遠",rounds=2,side=True),
  ],
  # ---------- 第四期（第九節） ----------
  "P4": [
    it("1a","mb_rot_slam","4","髖先轉，砸在左腳外側前方；撿球用 hinge","正面砸地","加快節奏",rounds=2,side=True,warmup="先用約 50% 力量做 3–4 下"),
    it("1b","kb_swing","6","頂髖時吐氣；做完休息到心率 <100","壺鈴硬舉","下一個重量",rounds=2,load=KB,
       gate={"id":"kb12","alt":{"ex":"kb_deadlift","rounds":2,"reps":"8","label":"壺鈴硬舉（起身加速）2 × 8"}},warmup="先做 5 下壺鈴硬舉",rest=90),
    it("A1","kb_rdl","8","維持肌力","減輕重量","下一個重量",rounds=2,load=KB),
    it("A2","pushup","8","維持肌力","斜板版","下放 3 秒",rounds=2),
    it("B1","band_row","12","維持肌力","換輕的繩","換重的繩",rounds=2),
    it("B2","pallof","10","維持抗旋轉","站近","站遠",rounds=2,side=True),
  ],
}

def step(ex, sec, note="", side=False):
    return dict(ex=ex, label=EX[ex]["name"], seconds=sec, note=note, per_side=side)

program = {
  "version": "2026-10-24.1",
  "source": "docs/plan.md（Claude Docs 計畫書 rev 67 匯出）",
  "week0_start": "2026-10-22",
  "start_date": "2026-10-26",
  "weeks": 16,
  "safety": {"bp_sys_max": 140, "bp_sys_min": 95, "hr_max": 120, "hr_resume": 100,
             "rpe_cap": 7, "sleep_min_h": 6, "pain_stop": 4,
             "stop_rules": ["心悸、心跳不規則、胸悶、頭暈、異常喘、冒冷汗：立即停止並坐下",
                            "胸痛或快要昏倒：直接打 119",
                            "其他症狀：先用 Apple Watch 錄 ECG，不緩解就立刻就醫",
                            "尿液變成深色（可樂色）或明顯無力：當天就醫"]},
  "phases": [
    {"id":1,"name":"活動度與動作學習","weeks":[1,4],"rpe":"4–5","default_rounds":2,"rest_s":45,
     "sessions":["P1-A","P1-B","P1-C"],"reps_plus_from_week":3,"reps_plus":2,
     "overrides":[{"week":4,"session":"P1-B","pair":"A1","rounds":3,"reps":"12","note":"第二期進入條件測試：3 輪 12 下"}]},
    {"id":2,"name":"肌力","weeks":[5,9],"rpe":"6–7","default_rounds":2,"rest_s":60,"sessions":["P2-A","P2-B","P2-C"]},
    {"id":3,"name":"速度與旋轉爆發力","weeks":[10,14],"rpe":"6–7","default_rounds":2,"rest_s":60,"power_rest_s":90,"sessions":["P3-A","P3-B","P3-C"]},
    {"id":4,"name":"維持與複測","weeks":[15,16],"rpe":"6","default_rounds":2,"rest_s":60,"power_rest_s":90,"sessions":["P4"]},
  ],
  "sessions": SESSIONS,
  "warmup": [step("cat_cow",60,"慢慢做，跟著呼吸"), step("open_book",30,"左右各 30 秒",True),
             step("hip_9090",60,"左右來回"), step("wgs",30,"左右各 30 秒",True),
             step("dowel_hinge",60,"鐵桿貼背")],
  "cooldown": [step("ham_strap",45,"左右各 45 秒",True), step("childs_pose",30,"做完下背分數變高，改成俯臥休息或站姿輕微後仰"),
               step("walk",60,"起身前先坐 3 秒")],
  "weekend_walk": step("brisk_walk",600,"週末課：收操前快走 10 分鐘"),
  "gates": {"kb12": {"name":"12kg 進入條件","criteria":[
      "坐姿穿襪的下背痛 ≤1/10，連續 2 週（每週日記錄）",
      "球桿 hip hinge 2 × 10，三點都不離桿",
      "6kg 羅馬尼亞硬舉 3 × 12，RPE ≤5 而且不痛（第 4 週課表 B 測）"]}},
  "special_days": {
    "2026-12-21":{"type":"taper_minus1","text":"下場前 6 或 5 天（擇一天）：正常課表，但每個動作少 1 組"},
    "2026-12-22":{"type":"taper_minus1","text":"下場前 6 或 5 天（擇一天）：正常課表，但每個動作少 1 組"},
    "2026-12-23":{"type":"mobility_walk","text":"下場前 4 天：活動度＋快走"},
    "2026-12-24":{"type":"taper_session","text":"下場前 3 天：減量課表，每個動作 2 組、RPE ≤6"},
    "2026-12-25":{"type":"mobility_only","text":"下場前 2 天：只做每日活動度"},
    "2026-12-26":{"type":"mobility_only","text":"下場前 1 天：只做每日活動度；可以在模擬器輕鬆打 30 球"},
    "2026-12-27":{"type":"round","text":"下場日：下場前 10 分鐘熱身；回來後記錄成績"},
    "2026-12-28":{"type":"recovery","text":"下場隔天：快走 20 分鐘＋活動度，記錄身體狀況"},
    "2026-12-29":{"type":"recovery","text":"第 10 週恢復日：只做活動度和快走"},
    "2027-01-17":{"type":"taper_minus1","text":"下場前 6 天（也是第 12 週複測日）：做了複測就以複測取代課表；否則正常課表少 1 組"},
    "2027-01-18":{"type":"taper_minus1","text":"下場前 5 天（與 1/17 擇一天）：正常課表，但每個動作少 1 組"},
    "2027-01-19":{"type":"mobility_walk","text":"下場前 4 天：活動度＋快走"},
    "2027-01-20":{"type":"taper_session","text":"下場前 3 天：減量課表，每個動作 2 組、RPE ≤6"},
    "2027-01-21":{"type":"mobility_only","text":"下場前 2 天：只做每日活動度"},
    "2027-01-22":{"type":"mobility_only","text":"下場前 1 天：只做每日活動度；可以在模擬器輕鬆打 30 球"},
    "2027-01-23":{"type":"round","text":"下場日：下場前 10 分鐘熱身；回來後記錄成績"},
    "2027-01-24":{"type":"recovery","text":"下場隔天：快走 20 分鐘＋活動度，記錄身體狀況"},
  },
  "holiday": {"from":"2027-02-04","to":"2027-02-10","text":"春節連假：改做出差徒手版，或把第四期課表做 2 次"},
  "retest_weeks": [0,4,8,12,16],
  "tests": {
    "mobility": [
      {"id":"pelvic_tilt","name":"骨盆前後傾","how":"擺好擊球站姿，雙手抱胸，只讓骨盆前後傾，上半身不動","type":"choice","options":["順暢","卡卡","做不到"],"video":YT+"H2LJrdWwHgs"},
      {"id":"pelvic_rot","name":"骨盆旋轉","how":"擊球站姿、雙手抱胸，肩膀不動，只轉骨盆","type":"choice","options":["能分離","做不到"],"video":YT+"-EJhFOAru1s"},
      {"id":"t_rot","name":"胸椎旋轉","how":"坐椅子、雙腳併攏、鐵桿橫放在胸前，骨盆不動轉身，看桿子對到地上的哪條線","type":"choice","sides":True,"options":["<45°","約 45°",">45°"],"video":YT+"KDq-oykm89U"},
      {"id":"neck_rot","name":"頸椎旋轉","how":"坐直，下巴往肩膀轉","type":"choice","sides":True,"options":["碰到","差一指","差兩指以上"]},
      {"id":"hip_ir","name":"髖內旋","how":"坐椅子、膝蓋 90°，大腿不動，小腿往外擺","type":"choice","sides":True,"options":["<30°","30–45°",">45°"],"video":YT+"hWpJ2fY6QqQ"},
      {"id":"sl_balance","name":"單腳平衡（閉眼）","how":"雙手叉腰、閉眼單腳站，最多 30 秒","type":"number","sides":True,"unit":"秒"},
      {"id":"bridge_ext","name":"橋式伸腿","how":"躺姿橋式撐起後，一腳伸直，維持 10 秒","type":"choice","sides":True,"options":["骨盆不掉","會掉"],"video":"https://www.mytpi.com/articles/screening/the-bridge-with-leg-extension-test"},
      {"id":"er_9090","name":"90/90 肩外旋","how":"擊球站姿，右手臂抬到 90° 並往後轉，對鏡子看前臂能否和脊椎平行","type":"choice","options":["能","不能"],"video":YT+"O6UUmv6y0KQ"},
      {"id":"lat","name":"背闊肌","how":"背貼牆、下背貼牆，前臂併攏往上舉；碰到牆填 0","type":"number","unit":"cm（離牆）"},
      {"id":"toe_touch","name":"Toe touch","how":"站姿、膝蓋打直，慢慢往下彎腰（不彈震）","type":"number","unit":"cm（指尖離地）","baseline":27},
      {"id":"ohs","name":"過頂深蹲","how":"雙手舉高，腳跟不離地往下蹲","type":"choice","options":["穩","會往後倒","蹲不到平行"],"video":YT+"uyLZi9O5hpA"},
      {"id":"sock_pain","name":"坐姿穿襪","how":"坐著彎腰穿襪","type":"number","unit":"下背疼痛 0–10","baseline":3},
    ],
    "fitness": [
      {"id":"rest_bp","name":"安靜血壓","how":"坐著休息 5 分鐘，量兩次取平均","type":"bp"},
      {"id":"rest_hr","name":"安靜心率","how":"同上","type":"number","unit":"bpm"},
      {"id":"weight","name":"體重","how":"早上空腹","type":"number","unit":"kg"},
      {"id":"waist","name":"腰圍","how":"早上空腹","type":"number","unit":"cm"},
      {"id":"pushup","name":"伏地挺身","how":"標準版，做到「還能再做 1–2 下」或動作走樣就停，推起時吐氣","type":"number","unit":"次","baseline":4,"video":YT+"zMiEZ96UZc0"},
      {"id":"chair_stand","name":"30 秒坐站","how":"雙手抱胸，從椅子站起再坐下","type":"number","unit":"次","video":YT+"hIigNquv6Do"},
      {"id":"step_hr3","name":"3 分鐘踏步：第 3 分鐘末心率","how":"節拍器每分鐘 100 步，膝蓋抬到髕骨和髂骨頂的中點；心率超過 120 就停，記下時間","type":"number","unit":"bpm","video":YT+"toA-gIyU_WQ"},
      {"id":"step_hr_rec","name":"3 分鐘踏步：停止後 1 分鐘心率","how":"","type":"number","unit":"bpm"},
      {"id":"step_stop","name":"3 分鐘踏步：提早停止的時間（做完填 180）","how":"","type":"number","unit":"秒"},
    ],
  },
  "equipment_reminders": [
    {"id":"kb8_10","name":"8 或 10kg 壺鈴","due":"2026-11-16","show_from":"2026-11-02"},
    {"id":"kb12","name":"12kg 壺鈴","due":"2026-11-23","show_from":"2026-11-09"},
    {"id":"slam_ball","name":"2–3kg 軟式藥球（不反彈）","due":"2026-12-28","show_from":"2026-12-07"},
    {"id":"kb16","name":"16kg 壺鈴（視第 12 週複測結果）","due":"2027-01-17","show_from":"2027-01-11"},
  ],
  "doctor_questions": [
    "需要先做運動心電圖嗎？如果做了，可以依結果訂出我的心率範圍嗎？",
    "收縮壓 ≥140 暫停訓練，這個門檻可以嗎？",
    "降 LDL 的藥：訓練後如果出現什麼樣的肌肉痠痛，需要回來看？",
    "Apple Watch 的 ECG 和心律不整通知，對我的狀況有參考價值嗎？發作時怎麼錄最有用？",
    "晚上 8 點訓練，服藥時間需要調整嗎？",
    "這次輕微復發，還需要追蹤或做其他檢查嗎？",
    "當年電燒的是哪一種心律不整？這次復發有沒有被心電圖確認，是同一種嗎？",
    "除了可悅您和脂妥，我有沒有在服抗凝血劑或抗心律不整藥？",
    "我的血壓目標是 <120，訓練前收縮壓多低就不應該練？運動後頭暈要怎麼處理？",
    "如果再出現心悸，適合安排 Holter 或事件記錄器嗎？",
    "我的 HbA1c 或空腹血糖是多少？腎功能正常嗎？",
  ],
  "doctor_due": "2026-12-28",
  "exercises": EX,
}

out = pathlib.Path(__file__).resolve().parent.parent / "program.json"
out.write_text(json.dumps(program, ensure_ascii=False, indent=1), encoding="utf-8")
print("wrote", out, sum(len(v) for v in SESSIONS.values()), "session items,", len(EX), "exercises")
