# gym — Personal Fitness Coach CLI / 个人健身教练命令行

> 所有命令在对话窗口直接输入，Claude 自动解析并执行。
> All commands are typed in the conversation window. Claude parses and executes them.

---

## COMMANDS / 命令列表

### `gym help` / `gym --help`
显示全部可用命令及用法。**新用户先看这个。**
Show all available commands and usage. **Start here if new.**

```
gym help
gym --help
```

---

### `gym today` / 今日课表
呼出今日课表。根据 Day A → B → C 自动轮换，判断今天练哪个。
Display today's workout plan. Auto-rotates Day A → B → C.

```
gym today           # English
今日课表              # 中文别名
```

---

### `gym checkin <data>` / 打卡
打卡完成训练。格式：动作名 + 重量 + 组数x次数，分号分隔。
Log a completed workout. Format: exercise + weight + sets x reps, semicolons between exercises.

```
gym checkin 卧推 20kg 4x10; 划船 20kg 4x12; 深蹲 22kg 4x12; 推举 14kg 3x10; RDL 18kg 3x12; 侧平举 6kg 3x15; Pallof 3x12 状态8分 泵感胸肩
```

Claude 自动：写入 workout-log.md → 对比上次数据 → 给出反馈。
Claude auto: writes to workout-log.md → compares with previous → gives feedback.

---

### `gym how <动作名>` / 动作查询
查询某个动作的要领、常见错误、参考图例。
Look up form cues, common mistakes, and reference links for an exercise.

```
gym how 卧推
gym how Bulgarian Split Squat
```

---

### `gym log [--all|--last N]` / 训练记录
查看历史训练记录。
View training history.

```
gym log             # 最近 5 条 / last 5 entries
gym log --all       # 全部记录 / all entries
gym log --last 3    # 最近 3 条 / last 3 entries
```

---

### `gym summary` / 训练统计
查看当前训练周期的数据统计：总次数、各动作重量趋势。
Training stats: total sessions, per-exercise weight trends.

```
gym summary
```

---

### `gym switch <A|B|C>` / 切换课表
手动切换到指定训练日。
Manually switch to a specific workout day.

```
gym switch B        # 切换至 Day B / switch to Day B
gym switch C        # 切换至 Day C / switch to Day C
gym next            # 自动推进到下一日 / advance to next day
```

---

### `gym config` / 查看配置
查看当前的训练配置。
View current training configuration.

```
gym config           # 目标/频率/器材/当前进度
```

---

### `gym update <key> <value>` / 修改配置
修改训练配置。
Update training configuration.

```
gym update goal 减脂        # 改目标为减脂 / change goal to fat loss
gym update days 4           # 改为一周 4 练 / change to 4 days/week
gym update equipment 健身房  # 更新器材 / update equipment
```

Valid keys / 可修改项: `goal`, `days`, `split`, `equipment`

---

## WORKFLOW / 使用流程

```
训练前 / Before → gym today         （看今天练什么 / what to train today）
不确定 / Unsure  → gym how <动作>    （查动作要领 / check exercise form）
训练后 / After   → gym checkin ...   （打卡记录 / log workout）
回顾时 / Review  → gym log / summary （看进度趋势 / check progress）
```

---

## FILES / 文件结构

| 文件 / File | 作用 / Purpose |
|-------------|---------------|
| `config.md` | 基础配置 / basic config |
| `workout-plan.md` | Day A/B/C 完整课表 / full workout program |
| `exercise-guide.md` | 17 个动作图解手册 / 17 exercise form guides |
| `workout-log.md` | 训练打卡日志 / training log |
| `gym-help.md` | 本帮助文件 / this help file |
