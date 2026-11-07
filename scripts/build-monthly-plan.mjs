import { mkdir, readFile, writeFile } from "node:fs/promises";

const legacy = JSON.parse(
  await readFile(new URL("../src/data/unity-ta.json", import.meta.url), "utf8")
);

const docs = {
  urpBasic: {
    label: "Unity 6 · URP 无光照 Shader",
    href: "https://docs.unity3d.com/cn/6000.0/Manual/urp/writing-shaders-urp-basic-unlit-structure.html"
  },
  semantics: {
    label: "Unity 6 · HLSL 语义参考",
    href: "https://docs.unity3d.com/cn/6000.0/Manual/SL-HLSLSemantics.html"
  },
  rendererFeature: {
    label: "Unity 6 · URP Renderer Feature",
    href: "https://docs.unity3d.com/cn/6000.0/Manual/urp/urp-renderer-feature.html"
  },
  customPass: {
    label: "Unity 6 · URP 自定义渲染通道",
    href: "https://docs.unity3d.com/cn/6000.0/Manual/urp/renderer-features/custom-rendering-pass-workflow-in-urp.html"
  },
  fullScreen: {
    label: "Unity 6 · URP 全屏 Pass",
    href: "https://docs.unity3d.com/cn/6000.0/Manual/urp/renderer-features/renderer-feature-full-screen-pass.html"
  },
  compute: {
    label: "Unity 6 · 创建 Compute Shader",
    href: "https://docs.unity3d.com/cn/6000.0/Manual/class-ComputeShader-create.html"
  },
  profiler: {
    label: "Unity 6 · Profiler 窗口",
    href: "https://docs.unity3d.com/cn/6000.0/Manual/profiler-window-navigating.html"
  },
  frameDebugger: {
    label: "Unity 6 · Frame Debugger",
    href: "https://docs.unity3d.com/cn/6000.0/ScriptReference/FrameDebugger.html"
  },
  csharp: {
    label: "Microsoft Learn · C# 指南",
    href: "https://learn.microsoft.com/zh-cn/dotnet/csharp/"
  }
};

const phases = [
  {
    id: "phase-foundation",
    title: "第一阶段：补齐基础，真正理解 Shader",
    range: "2026.11—2027.01",
    description: "从当前进度继续，围绕顶点片元数据流、纹理、光照和 URP 结构建立可解释、可独立实现的基础。"
  },
  {
    id: "phase-advanced",
    title: "第二阶段：进阶学习与作品制作",
    range: "2027.02—2027.04",
    description: "围绕动态效果、水面、环境材质和可讲述的完整作品展开。"
  },
  {
    id: "phase-specialize",
    title: "第三阶段：深入 URP、工具与专项能力",
    range: "2027.05—2027.08",
    description: "从单体效果进入工程化、性能分析与 Editor 工具，形成可展示的作品集。"
  },
  {
    id: "phase-career",
    title: "第四阶段：集中投递与面试迭代",
    range: "2027.09—2027.10",
    description: "通过投递、模拟面试和作品复盘，发现并补齐真实岗位差距。"
  },
  {
    id: "phase-job-ready",
    title: "第五阶段：高级能力与岗位衔接",
    range: "2027.11—2028.06",
    description: "在实战中提升 GPU 计算、渲染优化和技术表达，面向实习与初级岗位。"
  }
];

const month = (value) => {
  const [year, rawMonth] = value.split(".").map(Number);
  const last = new Date(Date.UTC(year, rawMonth, 0)).getUTCDate();
  return {
    month: value,
    monthKey: `${year}-${String(rawMonth).padStart(2, "0")}`,
    startDate:
      value === "2026.11"
        ? "2026-11-09"
        : `${year}-${String(rawMonth).padStart(2, "0")}-01`,
    endDate:
      value === "2028.06"
        ? "2028-06-30"
        : `${year}-${String(rawMonth).padStart(2, "0")}-${String(last).padStart(2, "0")}`
  };
};

const rawMonths = [
  {
    month: "2026.11",
    phaseId: "phase-foundation",
    title: "Shader 基础与 GPU 渲染数据流",
    learning: [
      "从当前《Unity Shader 入门精要》的 9.3 章附近继续，不从头复习",
      "顶点着色器、光栅化、片元着色器与最终像素之间的完整数据流",
      "Position、Normal、UV、Tangent、Color 等常用顶点数据",
      "语义 input、语义 output 与 vert/frag 函数之间的关系",
      "模型空间、世界空间、观察空间和裁剪空间",
      "矩阵如何组合 MVP 变换，以及乘法顺序为什么重要",
      "向量点乘、叉乘、归一化在光照和方向判断中的用途",
      "UV 插值、顶点颜色插值和屏幕空间插值的直觉",
      "ShaderLab 中 Properties、SubShader、Pass、Tags 的基础结构",
      "Alpha Test 与 Alpha Blend 的初步区别",
      "URP 中 `#pragma vertex`、`#pragma fragment` 的基础写法"
    ],
    practice: [
      "从空白 Shader 写出顶点片元最小结构，并能在 URP 中运行",
      "分别显示 UV、顶点颜色和法线三种可视化结果",
      "手写 Lambert 漫反射并逐项解释计算含义",
      "写一个可调颜色与强度的基础材质",
      "绘制一张从模型顶点到片元像素的数据流图"
    ],
    weeklyFocus: [
      "先补齐 ShaderLab/HLSL 基础语法和 URP 最小结构",
      "专门理解坐标空间与矩阵，不急于堆复杂效果",
      "把 Lambert 公式拆成法线、光照方向和点乘",
      "独立复写一次基础 Shader，并录下讲解"
    ],
    acceptance: [
      "从空白工程独立写出一个可运行的 URP 顶点片元 Shader",
      "能口头解释顶点数据如何到达片元着色器",
      "能解释 UV、Normal、顶点颜色三种数据分别如何参与输出",
      "基础 Shader 至少保留一次不看教程的独立复写"
    ],
    pitfalls: [
      "把 Shader 的运行成功当成理解，但无法说明每个变量来自哪里",
      "忽略不同坐标空间，直接把位置或法线混用",
      "只会改颜色参数，没有真正实现光照公式",
      "过早追求复杂效果，基础语义和插值仍然模糊"
    ],
    refs: ["urpBasic", "semantics", "book"],
    resumeEvidence: [
      "能够独立编写基础顶点/片元 Shader",
      "理解并可视化常见顶点数据和坐标空间",
      "形成 Shader 数据流与技术说明的雏形"
    ]
  },
  {
    month: "2026.12",
    phaseId: "phase-foundation",
    title: "纹理采样、透明与常见 Shader 效果",
    learning: [
      "纹理坐标、纹理空间与 UV 的对应关系",
      "采样器、过滤模式、Wrap Mode 和 MipMap 的作用",
      "Shader Properties、材质参数与运行时修改",
      "纹理颜色如何参与光照、遮罩和混合",
      "Alpha Test 与 Alpha Blend 的渲染差异",
      "透明物体排序、深度测试和深度写入",
      "step、smoothstep、lerp、saturate 的值域与用途",
      "噪声纹理的基本采样与阈值控制",
      "Fresnel 边缘光与视线、法线的关系",
      "溶解效果的阈值、边缘区间与颜色控制",
      "URP 光照模式下纹理与颜色的基本组合"
    ],
    practice: [
      "完成 UV 滚动、UV 扭曲和滚动速度参数",
      "完成透明材质与 Alpha 裁剪两种对照实验",
      "独立实现带边缘颜色的溶解 Shader",
      "完成 Fresnel 边缘光与可控强度参数",
      "整理至少 5 个效果的效果合集和截图"
    ],
    weeklyFocus: [
      "先把采样、过滤和 MipMap 观察清楚，再写效果",
      "对比 Alpha Test 与 Alpha Blend 的视觉和排序差异",
      "用 smoothstep 控制溶解边缘并独立推导参数范围",
      "整理效果合集，删除只能复制代码的无效案例"
    ],
    acceptance: [
      "效果合集中至少 5 个效果可独立复现",
      "能解释纹理过滤、Wrap Mode 和 MipMap 的作用",
      "能说明透明物体出现排序问题的原因",
      "溶解效果包含可调阈值和边缘颜色，并能讲清核心计算"
    ],
    pitfalls: [
      "复制节点或代码后只调参数，没有理解采样与阈值逻辑",
      "透明物体出现排序错误时只调整 Render Queue 而不分析原因",
      "把 smoothstep 参数顺序写反，导致边缘不可控",
      "效果数量很多，但没有一个能从空工程独立复写"
    ],
    refs: ["urpBasic", "semantics", "book"],
    resumeEvidence: [
      "具备纹理采样、透明混合和溶解效果实现经验",
      "能够为 Shader 参数设计可视化调节项",
      "完成一套可展示的基础 Shader 效果合集"
    ]
  },
  {
    month: "2027.01",
    phaseId: "phase-foundation",
    title: "光照模型与 URP 基础渲染结构",
    learning: [
      "Lambert 与 Half-Lambert 漫反射模型",
      "Blinn-Phong 的视线、半程向量和高光计算",
      "法线、切线空间和光照方向的基本关系",
      "环境光、漫反射、高光和色调映射的基本组合",
      "PBR 中 Albedo、Metallic、Roughness、Normal 的含义",
      "URP Shader 的 LightMode、Pass 和 Tags 基础",
      "Built-in 与 URP 在 Shader include 和光照宏上的差异",
      "阴影采样和光照衰减的基本概念",
      "卡通光照的色阶化处理与阈值",
      "风格化渲染中形状、颜色与光照的取舍",
      "顶点/片元计算成本和常见性能约束"
    ],
    practice: [
      "独立实现 Lambert、Half-Lambert 和 Blinn-Phong 对照场景",
      "制作一个带高光和阴影控制的卡通光照材质",
      "实现一个风格化材质并录制参数变化演示",
      "把一份 Built-in 基础 Shader 改写为 URP 可运行版本",
      "整理一张 Lambert 与 Blinn-Phong 的计算对照表"
    ],
    weeklyFocus: [
      "把光照公式逐项写出，不依赖宏或教程抄写",
      "比较 Lambert、Half-Lambert 和 Blinn-Phong 的差异",
      "完成 Built-in 到 URP 的迁移，记录 API 变化",
      "集中打磨一个风格化材质，而不是同时做多个半成品"
    ],
    acceptance: [
      "能独立实现基础光照并解释每个向量和参数",
      "能展示 Built-in 到 URP 的一次完整改写",
      "完成一个有展示价值的风格化光照 Shader",
      "能从计算成本角度说明为什么选择某种光照模型"
    ],
    pitfalls: [
      "只会使用 URP 自带光照宏，无法解释公式",
      "法线空间处理错误，导致高光或边缘方向异常",
      "在 Built-in 与 URP 之间直接复制代码而不处理 include 和 Pass",
      "风格化效果只有颜色变化，没有一致的光照规则"
    ],
    refs: ["urpBasic", "semantics", "book"],
    resumeEvidence: [
      "掌握基础光照模型并能迁移到 URP",
      "具备风格化 Shader 设计和参数调优能力",
      "形成可以进入作品集的光照实验记录"
    ]
  },
  {
    month: "2027.02",
    phaseId: "phase-advanced",
    title: "动态 Shader 与程序化视觉",
    learning: [
      "`_Time` 及其不同时间分量的用途",
      "UV 平移动画、缩放与旋转",
      "顶点位移、振幅、频率和相位",
      "Sine、Cosine 和周期函数在动画中的组合",
      "插值、阈值和平滑过渡的动态控制",
      "噪声纹理、FBM 和扰动的基本思想",
      "Fresnel 边缘光随时间变化的应用",
      "火焰、扫描线、护盾等效果的结构拆解",
      "顶点风动与物体空间方向的关系",
      "动态溶解的阈值、边缘和噪声组合",
      "效果参数的可复用组织方式"
    ],
    practice: [
      "完成流动纹理、扫描线和顶点波动三个基础实验",
      "实现一个可调速度、方向和强度的动态水面原型",
      "制作能量护盾、Fresnel 边缘和扰动组合效果",
      "完成动态溶解与自定义边缘颜色",
      "制作动态 Shader 效果合集并录制演示"
    ],
    weeklyFocus: [
      "先掌握时间、UV 和周期函数的共同结构",
      "比较顶点动画与片元动画的视觉差异和成本",
      "完成护盾或能量类综合效果",
      "整理 5 个动态效果并逐个讲清核心公式"
    ],
    acceptance: [
      "至少 5 个动态效果能脱离教程独立复现",
      "能解释时间、UV、噪声和顶点位移的组合关系",
      "参数变化能够稳定呈现预期视觉，不依赖固定资源",
      "具备一个可继续扩展的动态 Shader 原型"
    ],
    pitfalls: [
      "效果只在某一套贴图上成立，换成基础纹理就无法工作",
      "直接复制公式但不知道频率、振幅和相位各控制什么",
      "动态效果缺乏参数约束，运行后出现不可控闪烁",
      "全部工作都放在片元阶段，忽略顶点动画的可能"
    ],
    refs: ["urpBasic", "semantics", "book"],
    resumeEvidence: [
      "能够使用时间、UV 和噪声构建动态 Shader",
      "掌握顶点与片元阶段的效果分工",
      "完成可展示的动态效果合集"
    ]
  },
  {
    month: "2027.03",
    phaseId: "phase-advanced",
    title: "动态水面系统与作品化",
    learning: [
      "水面 UV 动画与多方向法线滚动",
      "法线贴图、切线空间和双法线叠加",
      "Fresnel、视线方向与水面边缘",
      "深度纹理、场景深度和水深感知",
      "透明混合、渲染顺序和深度写入",
      "反射、折射与简化的环境颜色近似",
      "顶点波动与片元法线扰动的配合",
      "岸边泡沫、深度交界和遮罩控制",
      "参数面板、材质属性与脚本控制",
      "水面场景的灯光、相机和展示构图",
      "性能预算与效果复杂度取舍"
    ],
    practice: [
      "搭建 URP 水面基础场景和可调材质",
      "实现双层法线滚动和顶点波动",
      "加入水深颜色、Fresnel 和岸边泡沫",
      "增加脚本统一控制流速、强度和颜色",
      "录制演示、整理源码、参数说明与限制"
    ],
    weeklyFocus: [
      "先完成能运行的水面基础，再逐项叠加效果",
      "优先解决透明度、深度和法线方向问题",
      "做一轮性能观察并记录瓶颈",
      "整理成作品：演示视频、README 和关键代码"
    ],
    acceptance: [
      "水面项目在 Unity 6 + URP 中稳定运行",
      "至少包含双层法线、波动、Fresnel 和深度交界",
      "参数可调并有清晰的场景演示",
      "具备演示视频、技术说明和一次独立复写记录"
    ],
    pitfalls: [
      "只在演示场景好看，换相机或光照后效果失效",
      "透明排序和深度读取没有处理好",
      "法线叠加过强，导致高光和水面方向失真",
      "作品只有视频，没有说明核心计算和可运行工程"
    ],
    refs: ["urpBasic", "customPass", "book"],
    resumeEvidence: [
      "完成 Unity 6 + URP 动态水面作品",
      "具备多纹理、深度与透明效果整合经验",
      "能够围绕渲染效果写技术说明和展示材料"
    ]
  },
  {
    month: "2027.04",
    phaseId: "phase-advanced",
    title: "环境材质与风格化渲染",
    learning: [
      "多纹理混合、遮罩和权重控制",
      "Triplanar Mapping 的坐标选择与混合",
      "世界坐标与物体坐标在纹理映射中的差异",
      "顶点颜色作为混合遮罩的用法",
      "高度混合、噪声遮罩和过渡控制",
      "法线混合的基础方法与常见失真",
      "积雪、湿润和地表材质的状态变化",
      "风格化草地的形状、颜色与风动",
      "水彩、手绘或卡通材质的实现原则",
      "参数组织和材质变体控制",
      "环境材质系统的可维护性设计"
    ],
    practice: [
      "完成地面多纹理和遮罩混合实验",
      "实现积雪、湿润地面和岩石过渡",
      "制作基于顶点颜色的材质控制",
      "完成风格化草地与风动效果",
      "搭建一个可展示的环境材质场景"
    ],
    weeklyFocus: [
      "先做通用混合框架，再添加不同材质",
      "验证世界/物体坐标变化时纹理是否稳定",
      "集中处理法线、颜色和高光的统一性",
      "把多个原型收拢成一个环境材质系统"
    ],
    acceptance: [
      "环境场景至少整合三种材质变化",
      "能解释纹理混合、坐标空间和遮罩的作用",
      "至少完成一种风格化环境材质",
      "材质参数可调且效果在场景中保持一致"
    ],
    pitfalls: [
      "纹理混合只靠固定贴图，坐标变化后失效",
      "多个材质都各自实现，后续无法统一控制",
      "法线混合过度，导致光照方向和水面/地面表现错误",
      "风格化仅靠颜色调整，缺少材质结构和笔触感"
    ],
    refs: ["urpBasic", "customPass", "book"],
    resumeEvidence: [
      "掌握环境材质混合与风格化渲染",
      "能够将多个 Shader 效果整合成系统",
      "具备可展现场景与材质参数设计能力"
    ]
  },
  {
    month: "2027.05",
    phaseId: "phase-specialize",
    title: "URP 渲染管线、Pass 与后处理",
    learning: [
      "URP Asset、Renderer 与 Render Pass 的职责",
      "ScriptableRenderPass 的基本生命周期",
      "Renderer Feature 的注册与渲染注入点",
      "Opaque Texture、Depth Texture 和法线纹理",
      "全屏 Blit、后处理和屏幕空间采样",
      "灰度、描边、屏幕扭曲等基础后处理",
      "CommandBuffer 与渲染指令组织",
      "RenderGraph 的基本概念与使用边界",
      "渲染事件的执行顺序",
      "后处理对性能与分辨率的影响",
      "自定义渲染功能的调试方法"
    ],
    practice: [
      "实现一个简单全屏灰度或色彩后处理",
      "完成基于法线/深度的描边实验",
      "实现一个自定义 Renderer Feature",
      "用 Frame Debugger 记录完整 Pass 顺序",
      "将一个后处理原型整理成可复用组件"
    ],
    weeklyFocus: [
      "先理解 URP 渲染顺序，再写自定义 Pass",
      "完成最小 Renderer Feature 并验证注入点",
      "用 Frame Debugger 对照代码与渲染事件",
      "整理一个后处理案例与性能观察"
    ],
    acceptance: [
      "能够说明自定义 Pass 在 URP 流程中的位置",
      "完成一个可稳定运行的 Renderer Feature",
      "能解释 Depth/Opaque Texture 的来源和用途",
      "至少保留一个基于 Frame Debugger 的调试记录"
    ],
    pitfalls: [
      "只调用现成后处理组件，没有理解 Pass 注入",
      "未处理分辨率或平台差异，效果在不同设备上失真",
      "在错误阶段读取深度或颜色纹理",
      "每次修改都重新编译并猜结果，没有使用 Frame Debugger 验证"
    ],
    refs: ["rendererFeature", "customPass", "fullScreen", "frameDebugger"],
    resumeEvidence: [
      "能够开发 URP 自定义 Renderer Feature",
      "理解渲染管线阶段、全屏后处理与纹理读取",
      "具备使用 Frame Debugger 定位渲染问题的经验"
    ]
  },
  {
    month: "2027.06",
    phaseId: "phase-specialize",
    title: "C# 与 Unity Editor 工具开发",
    learning: [
      "类、继承、接口与组合的基本取舍",
      "List、Dictionary、HashSet 的典型用途",
      "委托、事件与 Editor 工具解耦",
      "AssetDatabase 的资源扫描和路径处理",
      "EditorWindow、MenuItem 与 Custom Inspector",
      "SerializedObject、SerializedProperty 和撤销支持",
      "材质、Shader 和贴图资源的引用检查",
      "批量修改参数与异常输入处理",
      "进度、提示、预览和用户体验",
      "工具代码的模块拆分和可测试性",
      "Unity Editor API 的版本兼容意识"
    ],
    practice: [
      "实现材质扫描并输出结果列表",
      "检查材质缺失贴图和无效引用",
      "实现批量修改材质参数",
      "制作查找指定 Shader 或材质的 EditorWindow",
      "导出资源检查报告并提供错误提示"
    ],
    weeklyFocus: [
      "先做资源扫描最小闭环",
      "把数据读取、规则判断和 UI 展示拆开",
      "补齐异常处理和撤销支持",
      "整理成能在真实项目运行的工具"
    ],
    acceptance: [
      "工具能在 Editor 中扫描并修改真实材质",
      "可处理缺失资源、空引用和无效输入",
      "界面能看到结果、进度和错误原因",
      "具备 README、演示和至少一次独立复写"
    ],
    pitfalls: [
      "工具仅在测试资源上有效，真实工程路径和权限未验证",
      "所有逻辑堆在 OnGUI 或按钮回调中",
      "批量修改没有 Undo 或备份，误操作难以恢复",
      "扫描大量资源时没有进度与取消提示"
    ],
    refs: ["csharp", "book"],
    resumeEvidence: [
      "具备 Unity Editor 工具开发经验",
      "能够设计资源扫描与批量处理流程",
      "形成可运行、可演示的工具项目"
    ]
  },
  {
    month: "2027.07",
    phaseId: "phase-specialize",
    title: "动态环境材质系统与工程整合",
    learning: [
      "环境 Shader 的统一参数接口",
      "全局 Shader 参数与场景状态控制",
      "MaterialPropertyBlock 的适用边界",
      "C# 脚本与 Shader 参数的交互",
      "积雪、湿润、混合和风动的统一更新",
      "批量材质的性能与 Draw Call 基础",
      "资源组织的命名、目录和依赖规范",
      "状态切换的过渡与防抖",
      "工具与运行时代码的职责分离",
      "可调参数和预设的持久化",
      "项目 README 与技术讲解结构"
    ],
    practice: [
      "建立统一的材质参数管理组件",
      "实现积雪、湿润和草地状态联动",
      "用 Editor 工具批量维护材质资源",
      "加入天气/时间状态切换与过渡",
      "录制完整系统演示并整理技术文档"
    ],
    weeklyFocus: [
      "先确定统一参数与状态模型",
      "完成 Shader 与 C# 的闭环控制",
      "检查批量和性能数据",
      "集中完成展示、文档和工程清理"
    ],
    acceptance: [
      "环境材质系统包含至少三种可协同效果",
      "能通过脚本统一控制场景表现",
      "Editor 工具能辅助维护材质",
      "具备演示视频、性能记录和可运行工程"
    ],
    pitfalls: [
      "每个效果独立调参，状态切换后互相覆盖",
      "滥用 MaterialPropertyBlock 导致材质状态不可追踪",
      "工具和运行时脚本重复维护同一套参数",
      "工程依赖混乱，换机器后无法打开"
    ],
    refs: ["urpBasic", "customPass", "book"],
    resumeEvidence: [
      "完成动态环境材质系统项目",
      "掌握 Shader、C# 与 Editor 工具联动",
      "能够从工程结构角度组织技术美术项目"
    ]
  },
  {
    month: "2027.08",
    phaseId: "phase-specialize",
    title: "作品集整理与专业表达",
    learning: [
      "技术美术作品集应证明什么能力",
      "项目痛点、方案、结果三段式叙事",
      "核心技术亮点的筛选方法",
      "演示视频的节奏、画面对比和字幕",
      "README、架构图和技术说明结构",
      "GitHub 仓库清理与运行依赖说明",
      "性能数据如何表达才可信",
      "作品截图与封面设计规范",
      "不同岗位对 Shader/工具/环境方向的要求",
      "简历中的项目责任与结果描述",
      "作品集入口与链接组织"
    ],
    practice: [
      "筛选至少三个可以公开展示的核心作品",
      "为每个作品录制 30–90 秒演示视频",
      "补齐 README、核心代码、截图和性能分析",
      "整理 GitHub 仓库与可运行说明",
      "做一版个人作品集入口页"
    ],
    weeklyFocus: [
      "盘点项目，坚决删掉缺乏完成度的 Demo",
      "统一视频与截图风格",
      "补齐每个项目的技术说明和性能证据",
      "从招聘方视角审阅一遍作品集"
    ],
    acceptance: [
      "至少 3 个完整作品可在新环境中运行",
      "每个作品有视频、源码、截图和技术说明",
      "作品集首页能在 30 秒内看出方向与能力",
      "性能和核心实现不是只靠口头描述"
    ],
    pitfalls: [
      "堆叠大量半成品，没有完整项目",
      "视频只展示效果，不说明实现和取舍",
      "仓库缺少依赖、运行步骤或平台说明",
      "把学习笔记当作技术能力证明"
    ],
    refs: ["urpBasic", "csharp"],
    resumeEvidence: [
      "拥有可公开展示的 Unity TA 作品集",
      "具备项目包装、技术表达和演示制作能力",
      "形成多个可复用的项目案例"
    ]
  },
  {
    month: "2027.09",
    phaseId: "phase-career",
    title: "技术提升与招聘准备",
    learning: [
      "GPU 与 CPU 的工作分工",
      "Draw Call、Batching 与 Instancing 基础",
      "Shader 变体与关键字",
      "纹理压缩和带宽的直观影响",
      "Profiler、Frame Debugger 的定位流程",
      "性能瓶颈的分类与验证方法",
      "常见 Shader 面试题的知识结构",
      "作品讲解中的技术取舍表达",
      "Unity TA、Shader 开发和实时特效岗位差异",
      "简历关键词与项目证据的对应",
      "目标岗位能力矩阵"
    ],
    practice: [
      "对一个现有作品做性能分析",
      "优化至少一个 Shader 或渲染配置",
      "整理技术博客或原理说明",
      "收集目标岗位招聘要求并建立能力矩阵",
      "完成一版技术简历"
    ],
    weeklyFocus: [
      "建立性能分析基线",
      "把优化前后结果量化",
      "研究真实招聘要求而非泛泛准备",
      "完成简历与作品链接的统一叙事"
    ],
    acceptance: [
      "能解释一次真实性能瓶颈和优化结果",
      "完成岗位能力矩阵和简历初稿",
      "至少一篇技术说明能支撑作品讲解",
      "能区分不同 TA 岗位的技术侧重点"
    ],
    pitfalls: [
      "优化只凭感觉，没有 Profiler 证据",
      "简历堆技术名词，没有可验证项目",
      "把 Draw Call 降低误认为性能一定提升",
      "目标岗位范围过大，准备没有优先级"
    ],
    refs: ["profiler", "frameDebugger", "csharp"],
    resumeEvidence: [
      "能够使用 Profiler 和 Frame Debugger 分析渲染问题",
      "具备性能优化与结果验证经验",
      "完成面向 Unity TA 岗位的求职材料"
    ]
  },
  {
    month: "2027.10",
    phaseId: "phase-career",
    title: "实习投递与面试反馈迭代",
    learning: [
      "岗位 JD 的硬性要求与加分项拆解",
      "简历投递渠道与岗位匹配方法",
      "技术面试中的项目追问方式",
      "Shader 基础题的表达结构",
      "C#、Unity 生命周期和组件题",
      "矩阵、光照、深度和渲染流程口述",
      "面试反馈记录与复盘方法",
      "作品集针对性调整策略",
      "技术演示中的边界与局限性说明",
      "常见行为面试问题",
      "投递节奏与时间管理"
    ],
    practice: [
      "每周投递一批匹配岗位并记录反馈",
      "进行至少两轮模拟技术面试",
      "根据反馈修改简历和作品集",
      "完成一次 10 分钟项目讲解",
      "整理面试错题和知识缺口"
    ],
    weeklyFocus: [
      "建立持续投递和反馈记录",
      "围绕高频面试题做口头训练",
      "针对反馈只补最重要短板",
      "复盘项目讲述而非重复背答案"
    ],
    acceptance: [
      "正式开始实习投递并形成记录表",
      "至少完成两轮模拟面试",
      "能连续讲清一个作品的痛点、方案和结果",
      "根据真实反馈完成一次简历或作品修订"
    ],
    pitfalls: [
      "只投递不记录，无法判断问题来源",
      "面试后只记题目，不分析回答结构",
      "被拒后立刻更换学习方向",
      "项目讲解只讲功能，不讲技术选择与限制"
    ],
    refs: ["profiler", "frameDebugger", "csharp"],
    resumeEvidence: [
      "具备完整实习投递和面试复盘流程",
      "能够围绕 Unity TA 项目进行技术表达",
      "形成基于岗位反馈的持续改进机制"
    ]
  },
  {
    month: "2027.11",
    phaseId: "phase-job-ready",
    title: "Compute Shader 入门",
    learning: [
      "CPU 与 GPU 并行执行模型的差异",
      "Compute Shader 资产与 kernel",
      "线程组、线程 ID 和分组 ID",
      "numthreads 与 Dispatch 的参数关系",
      "ComputeBuffer 的创建、填充、读取与释放",
      "StructuredBuffer、纹理与 RWTexture 的基础用途",
      "CPU 与 GPU 数据同步和异步回读",
      "边界判断、越界访问与线程安全",
      "简单并行算法的分解方式",
      "平台支持与运行能力检查",
      "Compute Shader 调试与性能观察"
    ],
    practice: [
      "运行最小 Compute Shader 并输出结果",
      "用 ComputeBuffer 在 CPU/GPU 间传递数组",
      "实现一个简单并行计算 Demo",
      "比较不同线程组大小的执行结果",
      "整理一次 Dispatch 参数与数据流说明"
    ],
    weeklyFocus: [
      "先跑通最小 kernel 和 Dispatch",
      "理解线程索引与 buffer 下标",
      "验证边界条件和资源释放",
      "完成一个可解释的小型计算案例"
    ],
    acceptance: [
      "能从 C# 创建并 dispatch 一个 Compute Shader",
      "能解释线程组和全局线程索引的关系",
      "资源使用后正确释放，没有明显内存泄漏",
      "至少完成一个可重复运行的并行计算实验"
    ],
    pitfalls: [
      "Dispatch 线程数与 numthreads 混为一谈",
      "数组越界导致结果随机或崩溃",
      "频繁同步回读造成 CPU/GPU 性能下降",
      "只会在固定设备上运行，没有检查平台支持"
    ],
    refs: ["compute", "csharp"],
    resumeEvidence: [
      "具备 Compute Shader 数据传递和 Dispatch 基础",
      "理解 GPU 并行计算与线程索引",
      "完成可运行的 GPU 计算实验"
    ]
  },
  {
    month: "2027.12",
    phaseId: "phase-job-ready",
    title: "GPU 粒子与实时特效",
    learning: [
      "粒子位置、速度和生命周期的模拟结构",
      "基于时间的积分和边界处理",
      "粒子发射、回收与容量管理",
      "Compute Shader 写入粒子 Buffer",
      "Instanced Mesh 或 DrawMeshInstancedIndirect",
      "粒子材质、排序与混合模式",
      "噪声、外力与随机种子",
      "CPU/GPU 参数同步",
      "粒子系统性能预算",
      "交互输入与特效反馈",
      "GPU 粒子调试与可视化"
    ],
    practice: [
      "实现 CPU 版粒子原型作为对照",
      "用 Compute Shader 更新粒子位置与速度",
      "渲染一万级粒子并观察性能",
      "加入噪声、风力和交互吸引效果",
      "制作并录制一个实时特效 Demo"
    ],
    weeklyFocus: [
      "先完成最小粒子状态更新",
      "把模拟与渲染链路接通",
      "加入交互并控制粒子数量",
      "记录性能数据并完成展示材料"
    ],
    acceptance: [
      "GPU 粒子系统可连续运行并正确回收粒子",
      "粒子效果包含至少一种外部扰动或交互",
      "完成 CPU/GPU 方案在性能或实现上的对比",
      "项目具备演示视频和关键技术说明"
    ],
    pitfalls: [
      "粒子容量无限增长，长时间运行后崩溃",
      "随机数与时间状态不稳定，导致效果闪烁",
      "只优化模拟而忽略绘制和 Overdraw",
      "项目展示效果好看但无法解释 Buffer 数据流"
    ],
    refs: ["compute", "profiler"],
    resumeEvidence: [
      "完成 GPU 粒子实时特效项目",
      "掌握 Compute Shader 与 Instanced 渲染组合",
      "具备 GPU 资源管理和性能分析经验"
    ]
  },
  {
    month: "2028.01",
    phaseId: "phase-job-ready",
    title: "渲染优化与性能分析",
    learning: [
      "GPU Instancing 和 SRP Batcher",
      "Shader 变体、multi_compile 与 shader_feature",
      "纹理压缩、尺寸和采样成本",
      "Overdraw 与透明渲染成本",
      "Draw Call 与状态切换",
      "CPU/GPU 帧时间与瓶颈判断",
      "Profiler 模块和采样解释",
      "Frame Debugger 的 Draw Call 分析",
      "RenderDoc 基础抓帧思路",
      "不同平台的质量级别",
      "性能优化前后对照记录"
    ],
    practice: [
      "给现有项目建立性能基线",
      "减少一组不必要的 Shader 变体",
      "比较 Batching/Instancing 的实际效果",
      "记录一次 Overdraw 优化",
      "整理性能报告和可复现实验步骤"
    ],
    weeklyFocus: [
      "先测基线，不先写优化",
      "分别检查 CPU 和 GPU 指标",
      "每次只改变一个变量并复测",
      "用图表和抓帧证据整理结果"
    ],
    acceptance: [
      "能定位至少一个真实性能瓶颈",
      "优化前后有可复现的对比数据",
      "能解释 Batching、Instancing 与 Draw Call 的关系",
      "优化没有破坏视觉一致性或工程稳定性"
    ],
    pitfalls: [
      "只盯着 Draw Call 数量",
      "没有固定测试场景就进行前后对比",
      "关闭效果换取性能，却不说明视觉取舍",
      "将 Editor 数据当成目标平台真实数据"
    ],
    refs: ["profiler", "frameDebugger"],
    resumeEvidence: [
      "能够建立渲染性能基线并定位瓶颈",
      "掌握 Batching、Instancing、Shader 变体优化",
      "形成有数据支撑的优化案例"
    ]
  },
  {
    month: "2028.02",
    phaseId: "phase-job-ready",
    title: "高级 Shader 技术与屏幕空间效果",
    learning: [
      "深度缓冲重建世界坐标",
      "屏幕空间 UV 和纹理采样",
      "描边、雾、热扰动和色差效果",
      "屏幕空间扭曲与采样偏移",
      "边缘检测的 Sobel 基础",
      "HDR、色彩空间和后处理顺序",
      "透明与后处理的交互",
      "URP Pass 注入与 RenderGraph",
      "多 Pass 效果的性能成本",
      "平台差异与纹理格式",
      "高级 Shader 的可维护性"
    ],
    practice: [
      "实现基于深度的屏幕空间描边",
      "完成一个屏幕扭曲或热扰动效果",
      "实现灰度、色差与暗角组合后处理",
      "用 Frame Debugger 验证 Pass 顺序",
      "整理技术说明与性能结果"
    ],
    weeklyFocus: [
      "先打通深度纹理和屏幕坐标",
      "完成单一高级效果而不混入过多功能",
      "验证正确渲染顺序和透明物体",
      "整理成可复用后处理组件"
    ],
    acceptance: [
      "能说明屏幕空间效果如何在 URP Pass 中执行",
      "至少完成两种基于深度或屏幕纹理的效果",
      "效果有合理性能与平台限制说明",
      "核心计算能够脱离教程独立复写"
    ],
    pitfalls: [
      "直接复制全屏 Shader，不理解采样坐标和 Pass 注入",
      "忽略透明或后处理顺序导致叠加错误",
      "边缘检测参数无限放大，效果噪声明显",
      "未检查移动端纹理采样和深度支持"
    ],
    refs: ["rendererFeature", "customPass", "fullScreen"],
    resumeEvidence: [
      "掌握 URP 屏幕空间后处理与 Pass 注入",
      "能够使用深度纹理和屏幕坐标构建高级效果",
      "具备后处理性能和兼容性分析能力"
    ]
  },
  {
    month: "2028.03",
    phaseId: "phase-job-ready",
    title: "综合实时渲染项目",
    learning: [
      "场景美术方向与技术约束的统一",
      "Shader 效果与场景灯光的配合",
      "材质系统、后处理和性能预算",
      "模块拆分、接口与参数组织",
      "资源加载与版本管理",
      "相机、分辨率和画质设置",
      "项目演示场景与镜头设计",
      "性能数据采集与优化闭环",
      "跨场景稳定性",
      "项目风险与功能取舍",
      "技术文档结构"
    ],
    practice: [
      "确定项目范围、视觉目标和验收指标",
      "整合至少两项此前作品中的技术",
      "搭建完整展示场景和交互",
      "进行性能优化与跨场景测试",
      "完成演示视频、README 和技术架构图"
    ],
    weeklyFocus: [
      "锁定范围，优先完成稳定可演示的闭环",
      "整合已有技术而不是继续堆新名词",
      "处理性能和平台兼容问题",
      "完成项目包装与完整验收"
    ],
    acceptance: [
      "综合场景能够在新环境稳定运行",
      "至少整合两项此前核心技术并说明取舍",
      "具备演示视频、技术文档和性能数据",
      "项目有清晰的完成边界，不依赖未说明资源"
    ],
    pitfalls: [
      "范围持续扩张，最终没有完整版本",
      "视觉效果依赖开发机环境和未提交资源",
      "只有功能展示，没有性能与工程说明",
      "多技术叠加后系统不稳定，无法复现"
    ],
    refs: ["rendererFeature", "compute", "profiler"],
    resumeEvidence: [
      "完成综合 Unity 实时渲染项目",
      "能够整合 Shader、工具与性能优化能力",
      "具备完整项目的架构和交付经验"
    ]
  },
  {
    month: "2028.04",
    phaseId: "phase-job-ready",
    title: "作品集升级与面试材料",
    learning: [
      "作品集的岗位匹配和排序策略",
      "项目亮点与关键难点重构",
      "技术取舍与失败实验的表达",
      "架构图、数据流图和效果对比",
      "演示视频的画面节奏与字幕",
      "GitHub 目录、提交历史和发布说明",
      "性能报告的可信度",
      "求职平台作品链接组织",
      "面试中的反问与岗位匹配",
      "技术博客与作品集的关系",
      "作品集维护节奏"
    ],
    practice: [
      "重构至少一个项目的代码结构",
      "为每个核心作品补齐技术说明",
      "录制或重剪高质量演示视频",
      "整理 GitHub README 和运行步骤",
      "完成一版面向目标岗位的作品集"
    ],
    weeklyFocus: [
      "从一个最强项目开始升级",
      "补齐工程可运行性和代码可读性",
      "统一所有作品的视觉与叙事",
      "做一次模拟面试式作品讲解"
    ],
    acceptance: [
      "核心作品能够一站式查看视频、代码和说明",
      "至少一个项目完成代码重构和性能补测",
      "每个作品都能讲清一个问题、一个方案和一个结果",
      "所有公开链接在未登录状态可用"
    ],
    pitfalls: [
      "不断添加项目却不提升现有项目质量",
      "项目说明泄露依赖但没有提供安装步骤",
      "演示视频只追求炫技，缺少技术信息",
      "代码与 README 在后续改动中失配"
    ],
    refs: ["profiler", "frameDebugger", "csharp"],
    resumeEvidence: [
      "完成高质量 Unity TA 作品集升级",
      "能够组织项目技术证据和性能结果",
      "掌握面向岗位的演示与技术沟通"
    ]
  },
  {
    month: "2028.05",
    phaseId: "phase-job-ready",
    title: "集中求职、岗位专项与面试反馈",
    learning: [
      "目标岗位分层与投递策略",
      "JD 关键词与项目证据映射",
      "Shader 手写题和代码题训练",
      "Unity/C# 基础问题复盘",
      "图形学原理的口述结构",
      "行为面试中的项目冲突与取舍",
      "面试记录和问题归类",
      "offer 选择与岗位成长空间",
      "作品集定向修改方法",
      "持续学习与求职时间分配",
      "招聘流程中的风险信号"
    ],
    practice: [
      "持续投递高度匹配的岗位",
      "每周完成一轮模拟面试",
      "根据反馈修补一个核心作品",
      "建立面试题库和回答提纲",
      "定期更新求职进度与下一步行动"
    ],
    weeklyFocus: [
      "维持稳定投递节奏",
      "优先修补重复出现的技术短板",
      "把项目讲述压缩到 5–10 分钟",
      "在反馈中调整岗位和作品策略"
    ],
    acceptance: [
      "保持连续投递并记录完整反馈",
      "至少完成四轮模拟或真实技术面试",
      "主要高频问题形成自己的回答提纲",
      "作品集根据岗位反馈完成至少一次升级"
    ],
    pitfalls: [
      "只追求投递数量，忽略岗位匹配",
      "面试失败后开始无计划地学习新内容",
      "没有记录问题，导致同类错误重复出现",
      "把全部时间投入求职，作品维护停滞"
    ],
    refs: ["profiler", "frameDebugger", "csharp"],
    resumeEvidence: [
      "具备持续求职和面试迭代经验",
      "能够围绕目标岗位调整技术表达",
      "形成系统化面试题库和反馈闭环"
    ]
  },
  {
    month: "2028.06",
    phaseId: "phase-job-ready",
    title: "毕业与岗位能力衔接",
    learning: [
      "最终作品集与技术材料归档",
      "岗位职责与入职能力差距",
      "项目交接、文档与版本管理",
      "持续学习路线与专项深化",
      "技术表达中的事实与边界",
      "职业初期的协作方式",
      "求职风险与备选方案",
      "维护个人作品入口",
      "复盘能力成长与项目结果",
      "下一阶段学习优先级",
      "实习/正式岗位评估方法"
    ],
    practice: [
      "整理最终作品集和技术备份",
      "完成一次综合能力自测",
      "更新简历和岗位匹配矩阵",
      "准备入职后的学习计划",
      "把当前网站与作品集整理成长期入口"
    ],
    weeklyFocus: [
      "完成材料归档和最终检查",
      "做一次完整技术复盘",
      "确定入职或继续求职的优先级",
      "为下一阶段留下可执行的路线"
    ],
    acceptance: [
      "作品集、源码、视频和文档均有备份",
      "能完整陈述个人能力、项目和限制",
      "明确下一阶段的岗位方向和能力缺口",
      "网站与作品集链接在手机和电脑均可用"
    ],
    pitfalls: [
      "求职结束后停止整理，资料分散丢失",
      "把计划结果当成实际能力结果",
      "没有说明个人职责，夸大项目贡献",
      "把所有时间用于继续学习，忽略真实岗位反馈"
    ],
    refs: ["profiler", "csharp"],
    resumeEvidence: [
      "形成可持续维护的 Unity TA 作品集",
      "具备岗位导向的自我评估与学习规划能力",
      "完成从学习阶段到职业阶段的衔接"
    ]
  }
];

const monthly = rawMonths.map((item, index) => {
  const range = month(item.month);
  return {
    id: `month-${range.monthKey}`,
    month: item.month,
    monthKey: range.monthKey,
    stageId: item.phaseId,
    title: item.title,
    phaseGoal: item.title,
    startDate: range.startDate,
    endDate: range.endDate,
    status: "not_started",
    completedAt: null,
    sortOrder: index + 1,
    learning: item.learning,
    practice: item.practice,
    weeklyFocus: item.weeklyFocus,
    acceptance: item.acceptance,
    pitfalls: item.pitfalls,
    references: item.refs.map((key) =>
      key === "book"
        ? { label: "《Unity Shader 入门精要》", href: "" }
        : docs[key]
    ),
    resumeEvidence: item.resumeEvidence
  };
});

if (monthly.length !== 20) {
  throw new Error(`Expected 20 months, received ${monthly.length}`);
}
if (monthly.some((item) => item.learning.length < 10)) {
  throw new Error("Every month needs at least 10 learning points.");
}
if (monthly.some((item) => item.practice.length < 5)) {
  throw new Error("Every month needs at least 5 practice tasks.");
}
if (monthly.some((item) => item.acceptance.length < 3)) {
  throw new Error("Every month needs at least 3 acceptance checks.");
}

const output = {
  schemaVersion: 2,
  importedAt: new Date().toISOString(),
  sourceDocument: "新建 文本文档.txt",
  plan: {
    ...legacy.plan,
    subtitle: "月度主线 · 每日打卡 · 每周复盘",
    periodLabel: "2026.11 — 2028.06",
    stageGoal:
      "2028 年大四期间，具备应聘 Unity TA 实习的能力。主线聚焦 Unity 6、URP、HLSL、C#、实时渲染与技术美术工具开发。",
    principle:
      "每月只回答三个问题：学什么、做什么、达到什么水平。验收没过就补齐，再进入下一阶段。",
    principles: [
      "C# 不作为独立课程刷，而是服务于 Unity 项目和 Editor 工具开发。",
      "数学在光照、坐标、水面和性能问题中按需补，不单独安排漫长复习。",
      "每个核心效果都要保留一次不看教程的独立复现。",
      "周重点只用于安排节奏，不形成新的周任务或周完成状态。",
      "每月验收没过时先补齐，不用日期压力掩盖能力缺口。"
    ]
  },
  phases,
  months: monthly,
  portfolio: legacy.portfolio
};

await mkdir(new URL("../src/data", import.meta.url), { recursive: true });
await writeFile(
  new URL("../src/data/unity-ta-monthly.json", import.meta.url),
  `${JSON.stringify(output, null, 2)}\n`,
  "utf8"
);

console.log(
  `Built ${monthly.length} monthly plans across ${phases.length} phases.`
);
