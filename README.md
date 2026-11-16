# 竹木碳足迹核算系统 · 原型部署说明

## 部署目标

| 项 | 值 |
| :--- | :--- |
| 平台 | 腾讯云 CloudBase 静态托管（Static Hosting） |
| 环境 | `gjpcloud-123`（EnvId: `gjpcloud-123-d9gb21tzf65e81394`，地域 `ap-shanghai`） |
| 源码 | `06prototypes/系统原型/`（Vite + React + TypeScript 前端原型，纯前端 + Mock 数据层，无后端服务） |
| 静态域名 | `gjpcloud-123-d9gb21tzf65e81394-1475495599.tcloudbaseapp.com` |

## 访问地址

- 应用入口：`https://gjpcloud-123-d9gb21tzf65e81394-1475495599.tcloudbaseapp.com/caronacounting/`
- 说明：测试域名（`*.tcloudbaseapp.com`）首次访问会显示平台「风险提示」中间页，点击「确定访问」即可进入。如需去除中间页、提升并发与稳定性，请绑定正式自定义域名（CloudBase 控制台 → 静态托管 → 自定义域名）。

## 本地开发

```bash
cd 06prototypes/系统原型
npm install
npm run dev
```

浏览器访问 `http://localhost:5173/`。本地开发基址为 `/`，`npm run build` / `npm run preview` 与线上部署仍使用 `/caronacounting/`。若访问根地址出现 404，通常是旧的 Vite 进程仍在占用 5173 端口，停止该进程后重新启动即可。

## 构建与部署

`vite.config.ts` 中构建基址为 `/caronacounting/`，因此构建产物需上传到托管桶路径 `caronacounting/`（`index.html` 在根，静态资源在 `caronacounting/assets/`）。

```bash
cd 06prototypes/系统原型
npm install
npm run build          # 产物输出 dist/
```

通过 CloudBase 静态托管上传 `dist/`：

- 上传目录 `dist` → `cloudPath = caronacounting`（会上传 `assets/`）
- **注意**：目录上传会漏掉根级 `index.html`，需单独再上传 `dist/index.html` → `caronacounting/index.html`

也可使用部署命令/工具完成上述两步。每次重新构建后重新上传即可更新。

## 备注

- 托管桶内另有历史部署目录 `caronacount/`、`carbonaccounting/`（旧版本，对应早期 base 路径），如不再需要可自行清理，不影响当前 `caronacounting/` 访问。
- SPA 深链已配置回退：静态托管 `ErrorDocument` 与 404 路由规则均指向 `caronacounting/index.html`，直接访问 `…/caronacounting/screen/platform` 等路径会回退到应用入口并由前端路由接管。

## 部署记录

| 日期 | 操作 | 说明 |
| :--- | :--- | :--- |
| 2026-11-16 | 修复 SPA 深链 404 | 静态托管配置 `ErrorDocument=caronacounting/index.html` 与 404 → `caronacounting/index.html` 回退规则；顶栏「数据驾驶舱」新页签直达 `/caronacounting/screen/platform` 不再 404。 |
| 2026-11-16 | 重新部署（redeploy） | 重新 `npm run build`（Vite 5.4.21，6333 modules，产物 `index-D1gUIjKG.js` / `index-DxMeNgLI.css`），按文件精确覆盖上传 64 个产物至托管路径 `caronacounting/`（含根 `index.html` 与 `assets/`）。已核验新文件 `LastModified=2026-11-16T08:43:01Z`、网关默认静态路由 `Enable=true`。环境、访问地址均不变。 |
| 2026-11-11 | 重新部署（redeploy） | 重新 `npm run build` 并覆盖上传 `dist/` 至托管路径 `caronacounting/`（含根 `index.html` 与 `assets/`）。环境、访问地址均不变。 |
