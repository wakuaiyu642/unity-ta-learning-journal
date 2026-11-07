import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import XLSX from "xlsx";

const source =
  process.argv[2] ??
  String.raw`D:\xz\Unity_TA_%E6%9C%88%E5%BA%A6%E4%B8%8E%E6%AF%8F%E5%91%A8%E6%89%93%E5%8D%A1%E5%AD%A6%E4%B9%A0%E8%AE%A1%E5%88%92-1.xlsx`;
const output = resolve("src/data/unity-ta.json");
const workbook = XLSX.read(await readFile(source), {
  type: "buffer",
  cellDates: false
});
const rows = (sheetName) =>
  XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    defval: "",
    raw: false
  });
const clean = (value) => String(value ?? "").trim();
const read = (row, index) => clean(row?.[index]);

const statusMap = {
  "未开始": "not_started",
  "进行中": "in_progress",
  "✓ 已完成": "done",
  "已完成": "done",
  "顺延": "deferred"
};

const mapStatus = (value) => statusMap[clean(value)] ?? "not_started";

const parseRange = (value, weekNo) => {
  const match = clean(value).match(
    /^(\d{4}-\d{2}-\d{2})\s*[—–-]\s*(\d{4}-\d{2}-\d{2})$/
  );
  if (!match) {
    throw new Error(`${weekNo} 的日期范围无法解析：${value}`);
  }
  return { startDate: match[1], endDate: match[2], label: clean(value) };
};

const overviewRows = rows("总览");
const monthlyRows = rows("月度路线").slice(1).filter((row) => read(row, 0));
const weeklyRows = rows("每周打卡").slice(1).filter((row) => read(row, 0));
const portfolioRows = rows("作品集验收").slice(1).filter((row) => read(row, 0));

const overviewValue = (label) => {
  const row = overviewRows.find((item) => read(item, 0) === label);
  return read(row, 1);
};

const principles = overviewRows
  .slice(9, 16)
  .map((row) => read(row, 1))
  .filter(Boolean);

const weeklyTargets = overviewRows
  .slice(19, 23)
  .map((row) => ({ label: read(row, 0), value: read(row, 1) }))
  .filter((item) => item.label);

const tracks = [
  {
    id: "track-shader",
    key: "shader",
    label: "Shader / 教材",
    shortLabel: "Shader",
    color: "#1f776d",
    icon: "sparkles",
    sortOrder: 1
  },
  {
    id: "track-unity",
    key: "unity",
    label: "C# / Unity",
    shortLabel: "C#",
    color: "#426d9b",
    icon: "braces",
    sortOrder: 2
  },
  {
    id: "track-math",
    key: "math",
    label: "数学 / 图形学",
    shortLabel: "数学",
    color: "#9b6b38",
    icon: "sigma",
    sortOrder: 3
  },
  {
    id: "track-practice",
    key: "practice",
    label: "本周实践与验收",
    shortLabel: "实践",
    color: "#9a4f5f",
    icon: "flask",
    sortOrder: 4
  }
];

const months = monthlyRows.map((row, index) => {
  const month = read(row, 0);
  return {
    id: `month-${month.replace(".", "-")}`,
    month,
    phaseGoal: read(row, 1),
    items: [
      { trackKey: "shader", content: read(row, 2) },
      { trackKey: "unity", content: read(row, 3) },
      { trackKey: "math", content: read(row, 4) },
      { trackKey: "practice", content: read(row, 5) }
    ].filter((item) => item.content),
    sortOrder: index + 1
  };
});

const weeks = weeklyRows.map((row, index) => {
  const weekNo = read(row, 0);
  const range = parseRange(read(row, 1), weekNo);
  return {
    id: `week-${weekNo.toLowerCase()}`,
    weekNo,
    weekIndex: index + 1,
    startDate: range.startDate,
    endDate: range.endDate,
    dateLabel: range.label,
    theme: read(row, 2),
    tasks: [
      { trackKey: "shader", content: read(row, 3) },
      { trackKey: "unity", content: read(row, 4) },
      { trackKey: "math", content: read(row, 5) },
      { trackKey: "practice", content: read(row, 6) }
    ].map((task, taskIndex) => ({
      id: `task-${weekNo.toLowerCase()}-${task.trackKey}`,
      ...task,
      title: tracks.find((track) => track.key === task.trackKey)?.shortLabel ?? "",
      sortOrder: taskIndex + 1
    })),
    status: mapStatus(read(row, 7)),
    reflection: read(row, 9),
    updatedAt: null
  };
});

const portfolio = portfolioRows.map((row, index) => {
  const sourceTitle = read(row, 0);
  const [possibleCode, possibleTitle] = sourceTitle.split("｜");
  const hasCode = Boolean(possibleTitle);
  return {
    id: `portfolio-${String(index + 1).padStart(2, "0")}`,
    code: hasCode ? possibleCode : "",
    title: hasCode ? possibleTitle : sourceTitle,
    summary: read(row, 1),
    acceptance: read(row, 2),
    status: mapStatus(read(row, 3)),
    completedOn: read(row, 4) || null,
    notes: read(row, 5),
    demoUrl: "",
    repoUrl: "",
    coverUrl: "",
    techStack: [],
    published: false,
    sortOrder: index + 1
  };
});

if (months.length !== 20) {
  throw new Error(`月份数量应为 20，实际为 ${months.length}`);
}
if (weeks.length !== 86) {
  throw new Error(`周任务数量应为 86，实际为 ${weeks.length}`);
}
if (portfolio.length !== 9) {
  throw new Error(`作品集验收数量应为 9，实际为 ${portfolio.length}`);
}

const plan = {
  id: "local-unity-ta",
  slug: "unity-ta",
  title: "Unity 技术美术 TA",
  subtitle: "Shader / HLSL / URP 实时渲染学习与求职计划",
  periodLabel: overviewValue("计划周期"),
  primaryFocus: overviewValue("主攻方向"),
  supportingFocus: overviewValue("辅助方向"),
  stageGoal: overviewValue("阶段目标"),
  principle: overviewValue("学习原则"),
  principles,
  weeklyTargets,
  startDate: weeks[0].startDate,
  endDate: weeks.at(-1).endDate,
  isPublic: true
};

const payload = {
  schemaVersion: 1,
  importedAt: new Date().toISOString(),
  sourceFile: source.split(/[\\/]/).at(-1),
  plan,
  tracks,
  months,
  weeks,
  portfolio
};

await mkdir(resolve("src/data"), { recursive: true });
await writeFile(output, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

console.log(
  `Imported ${months.length} months, ${weeks.length} weeks and ${portfolio.length} portfolio items.`
);
