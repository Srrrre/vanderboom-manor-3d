# 第一阶段实施记录

目标：按参考轮廓重建可绕行的室外庄园，以 Vite / TypeScript / Three.js 构建，公开 GitHub 仓库及 Pages。

采用架构型项目路径；用户已明确要求自主执行全部阶段，因此设计与计划保存在项目中，直接实施，不重复索取批准。

1. 参考分析：实际读取四张外景图，标注依据与推测（见 reference-analysis.md）。
2. 工程：在 outputs/vanderboom-manor-3d 建独立项目；统一 config、world 类型、材质及场景接口。
3. 建筑：主体、右塔及折坡帽顶、前廊四柱、窗格、右附屋、台阶；模型 group 与碰撞分别维护。
4. 环境：连续高度函数、草地、曲线路、左后湖、林带、右后岩山和马车占位。
5. 漫游：眼高 1.68 m，步行 2.6 m/s、快走 5.2 m/s，圆形角色与 AABB/圆形障碍碰撞；位移细分防穿透，失焦清键，湖岸和边界不可穿越。
6. 表现：柔光、静态阴影、低饱和雾色、欢迎页、暂停/重置与画质按钮；DPR 上限 1.5。
7. 验收：运动/碰撞行为测试、TypeScript + 生产构建、浏览器实际截图/控制测试、独立代码审查；记录局限。
8. 发布：检查追踪文件、首次提交、创建授权 Public 仓库，推送 main，以 Actions 构建 Pages；核实线上资源。

## 模块契约

- src/config.ts：MANOR/WORLD/PLAYER 集中尺寸与位置。
- src/world/types.ts：Collider 为 box(minX,maxX,minZ,maxZ) 或 circle(x,z,radius)；WorldPart 为 {group: THREE.Group, colliders: Collider[]}。
- src/world/manor.ts：createManor(): WorldPart；地坪 y=0，正面朝 +Z，主立面前缘 z=4。
- src/world/environment.ts：createEnvironment(): WorldPart；terrainHeight(x,z)、walkableHeight(x,z) 共享视觉与运动高度。
- src/controls/FirstPersonController.ts：摄像机/画布/碰撞/高度函数构造，update(delta)、reset()、lock()、unlock()。
- src/main.ts：编排场景、UI、渲染和可见性暂停，不掺入几何生成。

## 重点回归

高速接近薄柱不穿透；按对角线不加速；失去焦点后不持续移动；台阶与湖岸不下坠；生产子路径加载与 WebGL/鼠标锁定失败显示可操作提示。
