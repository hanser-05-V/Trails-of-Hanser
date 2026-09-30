# 开发交接：在家里电脑继续

更新日期：2026-09-30。适用于换电脑或开启新会话后接续开发。

## 1. 先看这里

- 仓库：<https://github.com/hanser-05-V/Trails-of-Hanser>，当前开发分支 main。
- 已完成实现基线：4a4b12a（feat: add playable HTML combat prototype）。本交接与规划位于之后的文档提交；拉取 main 最新内容，不要检出旧提交继续开发。
- 当前产物是 HTML 游戏画面版 03，没有 Unity 工程。下一项为 [开发计划](development-plan.md) 中的 **P1-01 行动过程与结果反馈**。
- 本次只交付文档，没有开始 P1。不要把规划或建议当作已完成的功能。
- 本地预览进程、聊天记录、工具权限和本机 Skill 不会随 Git 同步。继续开发所需的背景以仓库资料为准。

## 2. 阅读顺序与规则优先级

1. [项目 README](../README.md)：当前进度。
2. [玩法阶段性总结](gameplay-summary.md)：完整玩法基线与状态区分。
3. 本文第 3 节：玩法总结之后用户明确确认的原型修订。
4. [原型操作说明](../prototypes/hanser-html/README.md)：操作、临时数值与边界。
5. [验证记录](../prototypes/hanser-html/VERIFICATION.md)：哪些确实验证过。
6. [开发任务规划](development-plan.md)：选择下一项并提出具体实施范围。
7. 涉及剧情时读 [game-setting.md](game-setting.md)；[open-questions.md](open-questions.md) 保留早期讨论，不覆盖更新规则。

已确认规则必须遵守；暂定规则先按现方案；候选机制默认不加入；待定事项优先避开，影响运行时提出最小临时处理，说明尚未定稿。

玩法总结开头“尚未实现功能”是记录时的历史状态，当前进度以本交接与代码为准。原型说明末尾关于日志观察、未提交的文字也保留了早期描述：现版已移除画面日志，原型已提交推送。不要因此恢复右侧行动记录。本次不修改正式玩法总结或原型说明。

## 3. 用户后续已确认的原型修订

以下记录用于延续当前原型，不把临时数值自动升级为正式设计。

- 当前先做 HTML 试玩，正式方向仍为 Unity / C#。
- 每个玩家回合一定有移动和普通攻击两种基础卡，独立于准备队列，不依赖随机抽牌。
- 当前初始战斗序列卡为 **小刀、弓箭、魔法**，取代首版原型先做“一攻击招式、一位置招式”的旧配置。不要接续时擅自改回。
- 额外能力卡以 **闪现、回血** 测试，继续遵守概率抽取、免费使用阶段、手牌上限与弃牌规则。
- 卡牌在画面中可见，主要通过拖动执行；点击与键盘操作作为补充。
- 参考用户提供的战场与底部手牌构图：战场占主体、卡牌贴底、序列横排；移除侧边记录与敌人列表，信息采用状态显示和悬停浮层。
- 仅参考画面布局，没有引入参考游戏的行动点系统。

队列容量 3、技能伤害 / 射程 / 冷却、卡组副本、抽牌概率、自动显示距离、增援时点和随机方案仍为测试参数，完整表格见原型操作说明。

## 4. 家里电脑取得项目

### 第一次拉取

在希望保存项目的父目录打开 PowerShell，确认没有同名文件夹后运行：

~~~powershell
git clone https://github.com/hanser-05-V/Trails-of-Hanser.git
Set-Location Trails-of-Hanser
git status --short --branch
git log -3 --oneline
~~~

后续命令均在仓库根目录执行，不依赖办公室的磁盘路径。

### 已有本地仓库

进入已有仓库，先确认分支、远端与本地改动：

~~~powershell
git status --short --branch
git remote -v
~~~

确认是本项目、当前分支为 main 且工作区干净后：

~~~powershell
git pull --ff-only origin main
git log -3 --oneline
~~~

存在本地改动或分支分歧时，先查看并保留改动，再决定合并方式；不要强制重置或强制推送。若在其他开发分支，先明确要继续哪条分支。

## 5. 运行与测试

### 最简单的试玩方式

用桌面浏览器打开 prototypes/hanser-html/index.html，点击“进入测试战场”。单文件没有 npm 安装、打包或后端依赖；双击文件方式尚未由自动化工具实测。

### 本地 HTTP 预览

检查已有工具：

~~~powershell
git --version
node --version
~~~

办公室验证使用 Node.js v24.16.0。家里没有 Node 时可先打开 HTML 试玩；工具安装由用户选择或另行授权，不自动安装。

已有 Node 时，在仓库根目录执行下面命令。它只监听本机地址，只提供这一份 HTML：

~~~powershell
node -e "const http=require('node:http'),fs=require('node:fs');http.createServer((req,res)=>{if(req.url!=='/'&&req.url!=='/index.html'){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(fs.readFileSync('prototypes/hanser-html/index.html'));}).listen(4173,'127.0.0.1',()=>console.log('Open http://127.0.0.1:4173/'));"
~~~

浏览器打开 http://127.0.0.1:4173/ 。终端保持运行，按 Ctrl+C 停止。若端口已占用，先确认占用服务，或把命令中监听端口和提示地址一起改为 4174，再访问对应地址。

这个地址只在运行服务的电脑上有效；GitHub 推送不会带走办公室的预览进程，也没有自动发布 GitHub Pages。

### 规则测试

另开终端并进入仓库根目录：

~~~powershell
node --test prototypes/hanser-html/tests/rules.test.cjs
~~~

实现基线的预期结果为 40 项通过、0 项失败。测试直接提取 HTML 核心脚本，不维护另一套规则实现；未来新增必要测试后，总数以实际输出为准。

### 首次接续的最小检查

1. 默认配置进入战斗，确认两张基础卡与三张初始招式可见。
2. 依次拖入小刀、弓箭、魔法，回合变为 2、3、4；排序 / 移出不耗回合。
3. 释放整组逐招选方向，最后一招后才进入回合 5；新冷却不提前减少。
4. 检查控制台错误，确认窄窗口能横向浏览底部卡牌。
5. 运行规则测试并记录家里环境的实际结果；发现差异先定位，不直接修改正式规则。

## 6. 代码入口

| 路径 / 标记 | 用途 |
| --- | --- |
| prototypes/hanser-html/index.html | CSS、配置 / 结果浮层、战场、卡牌和两段脚本 |
| script id=hanser-core | Hanser / Game 核心规则，DEFAULTS / SKILLS / CARDS 集中参数 |
| Game.drop(payload, target) | 拖放和点击共用的规则入口 |
| script id=hanser-ui | Pointer Events 拖动、目标判断、SVG 战场、卡牌及提示渲染 |
| prototypes/hanser-html/tests/rules.test.cjs | Node 内置测试，不需要第三方依赖 |
| prototypes/hanser-html/qa/ | 测试输出、截图、历史拖卡通关记录 |

P1-01 首先检查 act、render、renderBoard、Game.endAction 与敌方结算路径。当前是同步结算加立即重绘，尚无动作播放队列或独立展示状态，后续表现层须避免重复推进规则。

## 7. 已验证与未验证

- 规则层 40 项通过：回合、队列、冷却、抽弃牌、敌人朝向 / 误伤 / 占位、增援、胜负和随机复现。
- 版本 03 实际拖牌验证了备招、排序、移出、连招、移动、回血、闪现、超限弃牌和战败返回，检查了三个窗口尺寸。
- 完整拖卡胜利证据来自版本 02；版本 03 未重新完整通关，核心规则未改。
- qa/battle.png 与 qa/narrow.png 为版本 03；qa/entry.png、qa/victory.png、qa/defeat.png 与 qa/drag-playthrough.json 是版本 02 历史记录。
- 尚未验证真实手机触摸、跨浏览器矩阵、Unity、同关多战斗与完整探索；家里电脑环境也尚未检查。
- 敌人采用简单趋近策略，没有复杂绕障寻路；行动仍即时结算，反馈不足是 P1 的主要目标。

完整证据见 [验证记录](../prototypes/hanser-html/VERIFICATION.md)，不要把旧记录当作当前电脑的运行结果。

## 8. 接续协作要求

- 每次写文件前列出目标、修改、影响与验证方法，取得明确批准；范围内常规细节连续完成，范围变化重新确认。
- 保护已有文档和用户改动，不自动修改正式玩法总结。
- 未授权时不提交、推送、部署、安装工具、创建其他聊天或大规模重构。
- 不依赖旧聊天的页面、进程或绝对路径，先检查 Git、文件与环境。
- 规划不是实施授权，临时参数不是设计定稿；只在任务需要时处理待定边界。

### 建议的工作流程 / Skills

普通环境检查和局部修改直接处理。需要多步规划或系统排错时，可使用本机已有的 capability-router 选择流程；跨会话整理可使用 handoff；进入 Unity 自动化阶段且已有对应工具时可使用 unity-mcp-orchestrator。它们是可选辅助，不是项目依赖；无需为接续项目自动安装或复制办公室的 Skills。

## 9. 给新会话的接续提示

可复制下面一段作为家里电脑的新任务：

> 请继续开发《憨之轨迹》。先只读检查当前仓库、Git 状态与本机工具，完整阅读 README.md、docs/development-handoff.md、docs/development-plan.md、docs/gameplay-summary.md，以及原型 README 和 VERIFICATION。当前是 HTML 游戏画面版 03，下一项为 P1-01“行动过程与结果反馈”，Unity 尚未创建。遵守交接中的用户修订：固定移动与普攻，初始招式小刀 / 弓箭 / 魔法，额外能力闪现 / 回血，拖牌操作，战场主体与底部卡牌布局。先运行现有检查，给出具体文件清单、实现方式、影响和验证方法，等我批准写入后再实现。不要把计划当作所有后续写入或提交推送的授权，不自动安装工具、创建聊天或修改正式玩法总结。

完成一次开发后，更新计划状态、验证证据与本文的下一项，便于再次换电脑。
