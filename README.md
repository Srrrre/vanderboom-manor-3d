# Vanderboom Manor 3D

**范德布姆庄园 · 第二阶段：室内贯通、互动门与二层漫游**

一个基于《Servant of the Lake / 湖之仆从》参考截图制作的非官方同人三维网页。使用 Vite、TypeScript 与 Three.js。当前版本可从前院开门进入庄园，探索门厅、厨房、主客厅、餐厅，并沿楼梯到达二层栏廊与威廉客房。最终艺术方向为莫奈印象派油画；本阶段仍采用程序化几何与低饱和材质，尚未加入油画着色器。

- 在线体验：[GitHub Pages](https://srrrre.github.io/vanderboom-manor-3d/)
- 源码：[GitHub 仓库](https://github.com/Srrrre/vanderboom-manor-3d)
- 第一阶段建筑依据：[室外参考分析](docs/reference-analysis.md)
- 第二阶段空间依据：[室内参考与布局](docs/interior-reference-analysis.md)
- 第二阶段实现安排：[室内实施计划](docs/interior-implementation-plan.md)
- 第一阶段历史验收：[室外测试报告](docs/test-report.md)
- 第二阶段浏览器与部署验收记录：[室内测试报告](docs/interior-test-report.md)（独立记录，不由下述自动测试结果替代）

## 启动

推荐 Node.js 24 LTS，最低 Node.js 22.18。Windows PowerShell：

```powershell
git clone https://github.com/Srrrre/vanderboom-manor-3d.git
cd vanderboom-manor-3d
npm install
npm run dev
```

打开终端提示的 `http://127.0.0.1:5173`。若 PowerShell 的执行策略阻止 `npm.ps1`，使用 `npm.cmd install`、`npm.cmd run dev` 即可，无需修改系统策略。

```powershell
npm test          # 运动、高度支撑、互动门、室内路线与室外环境回归
npm run build    # TypeScript 检查 + 生产构建到 dist/
npm run preview  # 本地检查生产构建
```

请通过开发服务器/HTTPS 页面运行，不能直接双击 `index.html`。首次安装需要网络，场景运行不请求 CDN、外部图片、字体或音频。

## 操作

| 操作 | 功能 |
| --- | --- |
| 开始按钮 / 点击三维画布 | 进入第一人称并锁定鼠标 |
| W / A / S / D | 前后左右移动 |
| 鼠标 | 转动观察方向 |
| E | 靠近并看向门时开门 / 关门；锁闭区域显示说明 |
| Shift | 从 2.6 m/s 步行切换为 5.2 m/s 快走 |
| Esc | 暂停并释放鼠标 |
| 继续探索 | 恢复当前地点 |
| 重新从前庭开始 / 回到前庭 | 重置位置和视角 |
| 标准画质 / 轻量画质 | 切换阴影与像素倍率 |

眼高 1.68 m。角色沿地面、台阶和室内楼梯行走；碰撞考虑墙体、家具、楼板、扶手以及随开门角度旋转的门扇。只有在第一人称探索时才能操作门，暂停时不会触发 E。房间名称与小地图会随位置和楼层切换；小地图是本项目的试作平面，不是原作的官方平面图。

建议路线：正门 → 门厅 → 正前方主客厅 → 北侧楼梯 → 二层西侧栏廊 → 威廉客房。门厅左侧通往厨房，右侧经东过厅进入餐厅。书房、浴室与阁楼入口目前保留为锁闭的后续区域。

## 已实现

第二阶段：

- 在原主屋、方塔和附屋尺寸内增加实体内墙与门窗洞，窗户可从内外观察，动态门独立于静态建筑。
- 正门、主客厅、厨房、餐厅和二层客房支持 E 键开关、距离与视线判断、门扇旋转碰撞和避免夹人的扫掠检测。
- 门厅圆桌与吊灯；厨房操作桌、椅子和铸铁炉；主客厅粉色扶手椅、白壁炉、地毯和柜；餐厅白布长桌、木椅与竖琴；卧室绿长椅、白色立钟、小桌、鸟笼和床。
- 20 级直跑楼梯连接二层西侧栏廊；二层楼板只覆盖栏廊和卧室，主厅与楼梯上方保留挑空，开口设扶手与护栏。
- 用有高度范围的碰撞体和可站立表面区分上下楼层，避免一楼吸附到二楼；支持沿楼梯连续上下与完整出入路线。
- 室内暖色补光、环境光平滑变化、房间提示、楼层方位图；保持原有暂停、失焦、画质与回到前庭操作。

第一阶段建筑白模与室外漫游继续保留：

- 不对称主屋、右侧方塔及折线四坡帽顶、两个阁楼窗、宽檐口。
- 四柱前廊、入口三阶、嵌板入口门、底层两侧 3×5 多格窗、上层三窗、低矮右附屋及棕红坡顶。
- 可从正面、侧面、背面及远处观察的实体三维建筑；暖灰白墙体、青灰屋顶、木墙挂板和简化线脚。
- 草地起伏、入口小径与环屋道路、实例化针叶树林、岩石、湖泊、远山与马车占位。
- 柔和半球光、方向光、静态阴影、灰蓝天空、距离雾、欢迎/暂停界面、坐标与方位图。
- 相对资源路径和 GitHub Actions 自动构建部署。

2026-10-08 本地自动验证：`npm test` 的 69 项 Node 测试通过，`npm run build` 的 TypeScript 检查与生产构建通过。测试包含真实外壳、家具和动态门的跨房间往返，以及前院到二层卧室再返回的逐帧高度检查；浏览器操作与线上部署结果见独立的第二阶段验收记录。

## 项目结构

```text
src/
  config.ts                       集中管理建筑、人物和场景尺度
  main.ts                         场景组装、渲染循环、UI 生命周期
  controls/
    movement.ts                   可独立测试的移动和碰撞求解
    surfaces.ts                   可站立表面、楼梯坡道与高度碰撞
    FirstPersonController.ts      原生 Pointer Lock、键鼠和失焦处理
  interactions/
    doors.ts                      E键交互、动态门扇与旋转碰撞
  world/
    types.ts                      WorldPart / Collider / WalkSurface 接口
    architecture.ts               墙体开洞、构件与静态合批
    manor.ts                      有厚度的庄园外壳、门窗洞与屋顶
    interior-layout.ts            房间边界、楼层、楼梯与门定义
    interior.ts                   内墙、家具、楼板、楼梯和栏杆
    terrain.ts                    可见地形和同三角面的高度采样
    environment.ts                树林、湖、岩山、道路与环境碰撞
    carriage.ts                   马车占位
  render/
    materials.ts                  可替换的建筑材质库
    scene.ts                      光照、雾与渲染配置
    interior-lighting.ts          室内补光与环境光过渡
  ui/minimap.ts                   室外方位图与室内楼层平面
tests/                            Node 内置测试，无额外测试依赖
docs/                             参考、实施和验收说明
.github/workflows/deploy.yml       main 分支自动部署
```

建筑与房间有独立命名根节点；同材质静态构件按组合批，动态门保持独立。室内模块共 8 个分组、66 个合批 Mesh、21,976 个三角面与 98 个有高度范围的碰撞体。树木和岸边装饰使用实例化。标准画质 DPR 上限 1.5、轻量画质上限 1；阴影在首次渲染、画质切换和门运动时更新，室内补光不投实时阴影。无物理引擎、后端、框架或运行时素材依赖。

## 依据与推测

第一阶段实际读取了全貌、正门、猎场、外廊四张本机截图；第二阶段另外查看了 16 张室内参考。主立面的层次、窗户数量、四柱前廊、塔顶轮廓、附屋及林湖岩山的视觉关系有图像依据；绿色门厅、挑空厅、楼梯栏廊，以及厨房、餐厅和威廉房间中的主要家具也有对应图像依据。

没有测绘图或完整正交视图。**建筑绝对尺寸、进深、侧背窗位、楼梯朝向、各室连接与家具摆位均为可调整推测**。主客厅合并了参考中的挑空绿厅和壁炉客厅；将餐厅放在右附屋是本项目的布局选择；卧室床是未见视角的补全。环屋步道、湖泊岸线和具体树石坐标为漫游设计补全；马车仅表示位置与体量。详见两阶段参考分析，不能把模型当作官方建筑设定或精确测绘结果。

## 更新和部署

修改后先运行测试和构建，再提交：

```powershell
npm test
npm run build
git add src docs tests
git commit -m "feat: refine manor geometry"
git push origin main
```

需要同时变更配置或其他文件时，先 `git status` 检查再逐项添加。GitHub 的 Actions 会使用 Node 24 执行 `npm ci`、测试、构建并部署 `dist`。首次启用入口：仓库 **Settings → Pages → Build and deployment → Source → GitHub Actions**。资源使用 `base: './'`，适配项目子路径。

如 Actions 失败，先查看该次任务日志；不要上传本机 `node_modules` 或手工覆盖远程历史。部署后浏览器强制刷新以加载新版本。

## 已知范围与后续

- 当前面向桌面键鼠，未实现触屏摇杆；需要支持 WebGL 2 和 Pointer Lock 的浏览器。嵌入式浏览器可能限制鼠标锁定，必要时用独立 Chrome/Edge/Firefox 打开。
- 角色水平碰撞采用圆形近似，结合脚底高度、楼板与坡道支撑；这不是完整刚体物理系统。不包含跳跃、游泳、屋顶攀爬，书房、浴室与阁楼暂未开放。
- 基础湖面无动态反射；树木、远山及马车保持低多边形占位风格。普通笔记本性能取决于显卡与驱动，可切换轻量画质。
- 后续优先：更多空间参考校准与未开放房间 → Blender 建筑和家具细化及 GLB 替换 → 更自然的坡地/岸线和植被 → 莫奈式材质、笔触、色彩与后处理。应保持当前碰撞和场景模块接口，将新 GLB 放入相应 group，并显式维护碰撞代理与可站立表面。

## 非官方声明与素材

This is an **unofficial, non-commercial fan project**, not affiliated with, endorsed by, or sponsored by Rusty Lake. Rusty Lake, Servant of the Lake, Vanderboom Manor, and their associated characters and original artwork belong to their respective rights holders.

本仓库仅包含原创程序代码和程序生成的几何场景。**不包含原作截图、纹理、音乐、人物立绘或其他从游戏提取的素材**。本机参考截图仅用于结构研究，不随源码或网页发布。本项目不授予任何原作知识产权的使用许可。
