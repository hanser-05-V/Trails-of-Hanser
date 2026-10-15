# 开发交接：在其他电脑继续

更新日期：2026-10-15。适用于换电脑或开启新会话后接续开发。

## 1. 当前状态

- 仓库：<https://github.com/hanser-05-V/Trails-of-Hanser>，当前开发分支 main。拉取 main 最新内容，不要检出旧六边形原型提交继续当前路线。
- 当前产物是 **独立 1V1 HTML 战斗参考版，含 2.5D 镜头修订**，位于 prototypes/hanser-duel/。没有 Unity 工程。
- 已完成规则与胜负闭环、透视场景、角色旁菜单、目标预览、阶段镜头，以及鼠标和键盘各自完整可玩的流程。
- 当前测试为 **39 项通过**；实际完成纯鼠标胜利、纯键盘胜利、战败重试与其他验证，详情以 [验证记录](../prototypes/hanser-duel/VERIFICATION.md) 为准。
- 用户于 2026-10-15 明确认可当前 HTML 玩法。建议下一项是 [开发计划](development-plan.md) 的 **D3 Unity 最小战斗移植方案与环境检查**；D2 的窗口、镜头与手感调节继续随实机体验推进。Unity 工程范围尚未获批。
- 旧 prototypes/hanser-html/ 保留历史对照，旧 P1-01 不再是默认下一项。
- 本地预览进程、聊天记录、工具权限和本机 Skill 不会随 Git 同步，接续以仓库资料与用户最新指示为准。

## 2. 阅读顺序与规则优先级

1. 用户当前明确指示与 [项目 README](../README.md)。
2. [1V1 设计交接](hanser-duel-handoff.md)：已确认规则、被撤回的旧机制、原始待定边界。
3. [新版原型说明](../prototypes/hanser-duel/README.md)：后续获批的实际操作、临时数值、镜头和实现选择。
4. [新版验证记录](../prototypes/hanser-duel/VERIFICATION.md)：实测证据与限制。
5. [开发任务规划](development-plan.md) 顶部的 D0～D4 当前路线。
6. 涉及剧情时读 [game-setting.md](game-setting.md)。
7. [旧玩法总结](gameplay-summary.md)、[早期问题](open-questions.md) 与旧原型用于历史对照，不覆盖新方案。

原 1V1 设计交接中的“尚未实现”描述对应交接当时状态，文件顶部与完成补记已指向本次交付。测试参数不是正式规则定稿，新的程序或美术方案也不因本文出现就获得写入许可。

## 3. 当前确认方向与后续修订

- 单个白色圆团毛怪，没有可操控队伍，首个参考版为 1V1。
- 战前自由混搭四个普通技能，独立装备一个大招；攻击和物品不占技能槽。
- 按速度形成可见行动顺序，直接选招执行，取消旧提前备招与抽弃牌核心。
- 技能和大招可按配置选择是否带卡点；漏按保留基础效果，成功提供奖励。
- 敌方每击可闪避或精准格挡，成功免除当前击伤害；格挡恢复技力。红光仅对应那一击不能格挡。
- 同一组前一击失误，不剥夺存活角色后续击的应对机会。主动防御菜单已取消。
- 技力与大招能量独立；大招是完整行动结束后插入的额外行动，保留原定正常行动。
- 回血物品占正常行动，不耗技力、无需卡点。
- 用户后续明确要求 2.5D 空间、镜头与菜单配合：指令放在角色身旁，选招后预览目标，确认再执行；QTE 位于动作附近。
- 鼠标点击和键盘均须独立支持完整流程，可以混用。当前键位、时序窗口与错误尝试处理见原型 README。

本次使用中性测试能力和代码绘制占位图形，没有正式客串角色技能或正式资源。没有加入统一标记引爆、特殊连携、群战或自由走位。正式 Unity 的资产与渲染路线尚未定案。

## 4. 在其他电脑取得项目

首次拉取，在希望保存项目的父目录确认没有同名文件夹后运行：

~~~powershell
git clone https://github.com/hanser-05-V/Trails-of-Hanser.git
Set-Location Trails-of-Hanser
git status --short --branch
git log -3 --oneline
~~~

已有仓库时，先进入仓库根目录检查：

~~~powershell
git status --short --branch
git remote -v
~~~

确认是本项目、当前分支 main 且工作区干净后：

~~~powershell
git pull --ff-only origin main
git log -3 --oneline
~~~

有本地改动或分支分歧时，先查看并保留，再决定如何合并；不要强制重置或强制推送。以下命令均从仓库根目录执行，不依赖原电脑的绝对路径。

## 5. 运行与测试

### 打开独立文件

用桌面浏览器打开 prototypes/hanser-duel/index.html，点击“进入试炼”。无需 npm 安装、打包、图片下载或后端依赖。自动浏览器拒绝 file:// 导航，因此双击文件方式尚未实测；实际验证使用下方 HTTP 方式。

### 本地 HTTP 预览

先检查已有工具：

~~~powershell
git --version
node --version
~~~

本次使用 Node.js v24.16.0。没有 Node 时不自动安装，由用户选择或另行授权。

已有 Node 时，在仓库根目录执行以下命令，仅监听本机、仅提供新版这一份 HTML：

~~~powershell
node -e "const http=require('node:http'),fs=require('node:fs');http.createServer((req,res)=>{if(req.url!=='/'&&req.url!=='/index.html'){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(fs.readFileSync('prototypes/hanser-duel/index.html'));}).listen(8765,'127.0.0.1',()=>console.log('Open http://127.0.0.1:8765/'));"
~~~

浏览器打开 http://127.0.0.1:8765/ 。终端保持运行，Ctrl+C 停止。端口已占用时先检查占用进程，或同时更换命令中的端口与提示地址，再访问新地址。

GitHub 推送只同步文件和提交，不会复制预览进程，也没有自动部署 GitHub Pages。

### 自动测试

另开终端进入仓库根目录：

~~~powershell
node --test prototypes/hanser-duel/tests/combat.test.cjs
~~~

当前预期 **39 项通过、0 项失败**。测试直接提取实际 HTML 的核心与菜单脚本，并解析所有内嵌脚本。未来必要变更可能调整总数，须记录实际输出。

旧原型有自己的 rules.test.cjs 与历史 40 项测试记录，不要与新版 combat.test.cjs 混淆。

### 接续后的最小试玩检查

1. 默认四技能与一大招进入战场，确认角色旁显示攻击／技能／物品／大招。
2. 选择一个技能进入目标特写，再取消：资源不变；重新选择并确认后才扣费。
3. 用鼠标或键盘完成卡点、闪避、格挡；普通与红光连击逐击独立，漏卡点仍有基础效果。
4. 能量足够时预约大招，确认其等待完整行动结束且不吞正常行动。
5. 检查暂停／恢复、胜负重试、窄窗口操作区和控制台错误。
6. 运行自动测试并记录当前电脑的实际结果，不把本机历史证据当作另一台机器的验证。

## 6. 代码入口

| 路径 / 标记 | 用途 |
| --- | --- |
| prototypes/hanser-duel/index.html | 独立入口，含 CSS、装配、战斗 HUD、所有脚本和占位图形 |
| script id=duel-core | Duel 规则、DEFAULTS / SKILLS / ULTS / ENEMY_MOVES、BattleMenu 与投影数学 |
| Duel.advanceTo(target, input) | 唯一战斗时钟，处理输入与按时间排序的逐击事件 |
| BattleMenu.activate / confirm / back | 鼠标和键盘共用的选择、目标确认与取消 |
| script id=duel-scene | Canvas 透视场景、二维角色、深度排序与镜头插值 |
| script id=duel-ui | 实际按钮、键盘、状态显示、QTE、暂停与胜负页 |
| prototypes/hanser-duel/tests/combat.test.cjs | Node 内置测试，无第三方依赖 |

调整镜头、动画或提示时，不得另起时钟决定伤害，也不能重复推进 Duel。鼠标按下与键盘输入必须遵守相同的每击尝试、暂停与死亡限制。

## 7. 验证边界和下一项

已验证范围见 [VERIFICATION.md](../prototypes/hanser-duel/VERIFICATION.md)。当前实测包含两种输入分别胜利、失败重试、物品、辅助状态、两种大招、目标取消、手动暂停、630×892 至 1920×1080 的部分布局。

尚未完整验证：

- 人工操作手感、窗口是否适合用户、镜头是否影响读招。
- 真实系统失焦／后台限帧恢复、真实长按跨多击、减少动态效果的系统切换。
- 实体手机触摸、跨浏览器与硬件性能。
- file:// 双击路径、Unity 角色资产、骨骼与镜头管线。

**玩法方向已获用户认可，建议准备 Unity 最小可玩 1V1 战斗切片。** 先只读检查环境并确认工程和资产范围，验证真实 2.5D 空间、摄像机、动作和输入配合，再移植完整战斗闭环并构建可运行版本。具体数值和手感继续在 D2 中迭代。

**D2 的目标是根据用户实际试玩反馈作必要调整。** 先记录触发条件、操作方式、预期、实际和复现步骤，区分规则缺陷与体验建议；规则有改动时运行相关回归，镜头／菜单改动时实际观察和操作。不要为推进进度自动扩大怪物、技能、关卡或正式美术范围。

## 8. 接续协作要求

- 每次写文件前列出目标、修改、影响与验证方法，取得明确批准；范围内常规细节连续完成，范围变化重新确认。
- 保护已有文档、旧原型和用户改动，不自动重写剧情或旧玩法总结。
- 当前这次成果与进度更新的提交推送已获用户授权；未来提交、推送、部署、工具安装或其他外部操作按新的授权范围处理。
- 不依赖旧聊天的进程或绝对路径，先检查 Git、文件和本机环境。
- 不自动创建其他聊天、Unity 工程或大规模框架。
- 本机 Skills 是可选辅助，不是项目依赖；不为接续自动安装或复制。

## 9. 给新会话的接续提示

> 请继续开发《憨之轨迹》。先只读检查当前仓库、Git 状态和本机工具，阅读 README.md、docs/development-handoff.md、docs/development-plan.md 顶部当前路线、docs/hanser-duel-handoff.md 及 prototypes/hanser-duel/README.md 与 VERIFICATION.md。当前已完成独立 1V1 HTML 战斗参考版、2.5D 镜头和角色旁菜单，鼠标与键盘均可完整操作，39 项自动测试通过，Unity 尚未创建。用户已于 2026-10-15 认可当前 HTML 玩法方向。建议下一项为 D3 Unity 最小战斗移植方案与环境检查，输入窗口、镜头和手感继续调节；不接续旧六边形卡牌路线的 P1-01。先只读检查环境，提出最小场景与移植方案，再列具体文件、内容、影响和验证方法，获批后实施。保留可选卡点基础效果、逐击闪避／精准格挡、独立技力和大招能量、大招完整行动后插入且保留正常行动；目标取消不扣费。不要将临时参数或 HTML 空间表现视为正式设计／Unity 管线已定稿，也不要自动安装、部署或创建其他聊天。

完成后更新当前计划状态、验证证据和接续入口；不要把未验证项目写成已完成。
