# My TA Journey

Unity 技术美术学习打卡与作品集 PWA，基于 `Unity_TA_月度与每周打卡学习计划` 工作簿制作。

## 当前内容

- 20 个阶段月、86 个学习周、9 个作品/能力验收项
- 每日打卡、学习时长、复盘和附件
- 每周手动完成状态
- 月度路线搜索与展开
- 作品集验收看板、演示/源码链接和首页发布开关
- 公开只读、邮箱验证码所有者、受邀编辑者
- PWA 安装、离线外壳和最近数据查看
- 本地演示模式，无需 Supabase 即可体验

## 本地运行

```powershell
npm install
npm run dev
```

打开 `http://127.0.0.1:5173`。未配置 Supabase 时自动进入本地演示模式，右上角可切换“公开浏览 / 演示编辑”。本地编辑内容保存在浏览器 `localStorage`，附件保存在 IndexedDB。

## 接入 Supabase

1. 新建 Supabase 项目。
2. 在 SQL Editor 中执行 `supabase/migrations/202611070001_learning_journal.sql`。
3. 在 Authentication → Email 配置邮箱验证码模板。模板中需要显示 `{{ .Token }}`。
4. 把前端配置写入 `.env.local`：

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

`SUPABASE_SERVICE_ROLE_KEY` 只用于本地种子脚本和 Edge Function，绝不能加 `VITE_` 前缀，也不能提交到 Git。

5. 启动页面，用所有者邮箱登录一次。
6. 导入计划并把该账号设为所有者：

```powershell
npm run seed:supabase -- --owner-email=you@example.com
```

种子脚本可以安全重跑：它会刷新课程内容并保留每周状态、复盘、每日记录、附件和已编辑的作品集。

7. 部署协作者管理函数：

```powershell
npx supabase functions deploy manage-collaborators
```

函数会使用 Supabase 自动提供的 `SUPABASE_URL`、`SUPABASE_ANON_KEY` 和 `SUPABASE_SERVICE_ROLE_KEY`。

## GitHub Pages 部署

### 方式一：GitHub Desktop

1. 打开 GitHub Desktop，选择 **File → Add local repository**，目录选当前项目。
2. 填写首次提交说明并点击 **Commit to main**。
3. 点击 **Publish repository**，建议取消“Private”，因为 GitHub Free 的 Pages 需要公开仓库。
4. 发布后打开仓库网页，进入 **Settings → Pages**，把 Source 改为 **GitHub Actions**。
5. 在 **Settings → Secrets and variables → Actions** 添加前文两个 `VITE_SUPABASE_*` Secret。
6. 再提交一次或手动运行 Actions，等待部署完成即可。

### 方式二：命令行

1. 把项目推到 GitHub 的公开仓库。
2. 在仓库 Settings → Pages 中把 Source 设为 **GitHub Actions**。
3. 在仓库 Secrets 中添加：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. 推送到 `main`。`.github/workflows/deploy.yml` 会运行类型检查、单元测试、端到端测试、构建和部署。
5. 发布地址为 `https://<用户名>.github.io/<仓库名>/`。

构建会生成 `dist/404.html`，因此直接打开周次、路线或作品集子路径不会因 GitHub Pages 静态路由而丢失页面。

## 托管后如何编辑

- **学习内容、打卡、复盘、附件和作品集**：配置 Supabase 后，用所有者邮箱登录网页直接编辑。数据保存在 Supabase，保存后立即生效，不需要重新提交 GitHub，也不需要等待 Pages 重新部署。
- **页面样式、功能或计划模板**：在本地修改代码，提交并推送到 `main`。GitHub Actions 会自动测试、构建并重新发布，通常几分钟内更新。
- **未配置 Supabase 时**：当前版本仍可使用本地演示编辑，但内容只保存在浏览器中，其他设备或公开访问者看不到这些修改。

## 数据与权限

- 匿名访问：读取公开计划、周状态、复盘、每日记录、附件和作品集。
- 所有者：全部编辑权限，并可在“协作者”页邀请编辑者。
- 编辑者：修改当前计划、打卡、附件和作品集。
- 邮箱：只在服务端函数内读取，不进入公开 API 结果。
- 单附件上限 10MB，每周最多 10 个；支持 PNG、JPG、WebP、HEIC、PDF、Markdown 和文本。

## 测试

```powershell
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Windows 本地端到端测试默认使用已安装的 Microsoft Edge；CI 使用 Playwright Chromium。

## 重新导入 Excel

```powershell
npm run import:plan -- "D:\path\to\plan.xlsx"
```

导入脚本会校验月份、周次和作品集数量，并把标准化数据写入 `src/data/unity-ta.json`。当前工作簿实际为 20 个月，而不是规划文字中提到的 21 个月；重复出现的 7 组周主题会按原表保留。
