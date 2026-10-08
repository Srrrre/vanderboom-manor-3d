# Vanderboom Manor 3D

**范德布姆庄园 · 第一阶段：建筑白模与室外漫游**

一个基于《Servant of the Lake / 湖之仆从》参考截图制作的非官方同人三维网页。使用 Vite、TypeScript 与 Three.js。最终艺术方向为莫奈印象派油画；当前版本着重建筑体块、空间尺度与可用的第一人称控制，尚未加入油画着色器。

- 在线体验：[GitHub Pages](https://srrrre.github.io/vanderboom-manor-3d/)
- 源码：[GitHub 仓库](https://github.com/Srrrre/vanderboom-manor-3d)
- 建筑依据：[参考分析](docs/reference-analysis.md)
- 验收说明：[测试报告](docs/test-report.md)

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
npm test          # 核心运动、碰撞、输入生命周期与环境高度回归
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
| Shift | 从 2.6 m/s 步行切换为 5.2 m/s 快走 |
| Esc | 暂停并释放鼠标 |
| 继续探索 | 恢复当前地点 |
| 重新从前庭开始 / 回到前庭 | 重置位置和视角 |
| 标准画质 / 轻量画质 | 切换阴影与像素倍率 |

眼高 1.68 m。支持墙壁/立柱、主要树干/岩石/马车、湖岸和场景边界碰撞。门目前关闭，不进入室内。小地图用于方位参考，不是原作的官方平面图。

## 已实现

- 不对称主屋、右侧方塔及折线四坡帽顶、两个阁楼窗、宽檐口。
- 四柱前廊、入口三阶、带上亮窗和嵌板的门、底层两侧 3×5 多格窗、上层三窗、低矮右附屋及棕红坡顶。
- 可从正面、侧面、背面及远处观察的实体三维建筑；暖灰白墙体、青灰屋顶、木墙挂板和简化线脚。
- 草地起伏、入口小径与环屋道路、实例化针叶树林、岩石、湖泊、远山与马车占位。
- 柔和半球光、方向光、静态阴影、灰蓝天空、距离雾、欢迎/暂停界面、坐标与方位图。
- 相对资源路径和 GitHub Actions 自动构建部署。

## 项目结构

```text
src/
  config.ts                       集中管理建筑、人物和场景尺度
  main.ts                         场景组装、渲染循环、UI 生命周期
  controls/
    movement.ts                   可独立测试的移动和碰撞求解
    FirstPersonController.ts      原生 Pointer Lock、键鼠和失焦处理
  world/
    types.ts                      模块统一接口 WorldPart / Collider
    manor.ts                      程序化庄园与建筑碰撞体
    terrain.ts                    可见地形和同三角面的高度采样
    environment.ts                树林、湖、岩山、道路与环境碰撞
    carriage.ts                   马车占位
  render/
    materials.ts                  可替换的建筑材质库
    scene.ts                      光照、雾与渲染配置
  ui/minimap.ts                   轻量二维方位图
tests/                            Node 内置测试，无额外测试依赖
docs/                             参考、实施和验收说明
.github/workflows/deploy.yml       main 分支自动部署
```

建筑部件有独立命名根节点；同材质静态窗框/线脚合批。树木和岸边装饰使用实例化。标准画质 DPR 上限 1.5、轻量画质上限 1，阴影仅在静态场景首次生成。无物理引擎、后端、框架或运行时素材依赖。

## 依据与推测

实际读取了全貌、正门、猎场、外廊四张本机截图。主立面的层次、窗户数量、四柱前廊、塔顶轮廓、附屋及林湖岩山的视觉关系有图像依据。

没有测绘图或完整正交视图。**建筑绝对尺寸、进深、侧背窗位、后坡及环境距离为可调整推测**。环屋步道、湖泊岸线和具体树石坐标为漫游设计补全；马车仅表示位置与体量。详见参考分析，不能把模型当作官方建筑设定。

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
- 碰撞为二维圆形角色与简化障碍，允许上下低台阶；不包含跳跃、游泳、屋顶攀爬或室内。
- 基础湖面无动态反射；树木、远山及马车保持低多边形占位风格。普通笔记本性能取决于显卡与驱动，可切换轻量画质。
- 后续优先：更多侧面/背面参考校准 → Blender 建筑细化及 GLB 替换 → 更自然的坡地/岸线和植被 → 莫奈式材质、笔触、色彩与后处理。应保持当前碰撞和场景模块接口，将新 GLB 放入相应 group，并显式维护碰撞代理。

## 非官方声明与素材

This is an **unofficial, non-commercial fan project**, not affiliated with, endorsed by, or sponsored by Rusty Lake. Rusty Lake, Servant of the Lake, Vanderboom Manor, and their associated characters and original artwork belong to their respective rights holders.

本仓库仅包含原创程序代码和程序生成的几何场景。**不包含原作截图、纹理、音乐、人物立绘或其他从游戏提取的素材**。本机参考截图仅用于结构研究，不随源码或网页发布。本项目不授予任何原作知识产权的使用许可。
