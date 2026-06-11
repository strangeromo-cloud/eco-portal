# 部署到 Zeabur

平台是长驻 Node 服务，用 SQLite 存数据。Zeabur 用**持久化 Volume** 存 SQLite 文件即可，改动最小。
（限制：SQLite = 单实例运行，内部工具足够。需要横向扩展时见末尾「切换 Postgres」。）

## 已为部署做好的改造

- `zbpack.json`：启动时自动 `prisma migrate deploy`（建表）→ `seedIfEmpty.mjs`（关键字为空才灌）→ `next start`。
- `scripts/seedIfEmpty.mjs`：幂等灌入关键字，只用生产依赖，不需要 tsx。
- `prisma` CLI 已移到 `dependencies`，保证运行时能执行迁移。
- `.gitignore`：排除样例大文件（含 10MB 的 `13 Legal Report.xlsx`），**保留** `Key Words List V7 20240626.ods`（seed 用）。

## 一、推送代码到 Git

当前目录还不是 git 仓库，先初始化并推到 GitHub（Zeabur 从 Git 部署）：

```bash
git init
git add .
git commit -m "init eco-portal"
git branch -M main
git remote add origin git@github.com:<你>/<repo>.git
git push -u origin main
```

> 确认 `Key Words List V7 20240626.ods` 被提交了（`git ls-files | grep Key`）。
> 它不在 .gitignore 里，是首次启动 seed 的数据源。

## 二、在 Zeabur 创建服务

1. Zeabur 控制台 → New Project → Deploy from GitHub → 选这个仓库。
2. Zeabur 自动识别 Next.js，执行 `next build`；启动用我们 `zbpack.json` 里的命令。

## 三、加持久化 Volume（关键，否则数据重启即丢）

服务 → **Volumes** → 新建一个卷，**Mount Path 填 `/app/data`**。

## 四、配置环境变量

服务 → Variables，新增：

| 变量 | 值 |
| --- | --- |
| `DATABASE_URL` | `file:/app/data/prod.db` |

> 指向 Volume 目录，数据就持久化在卷里。`KEYWORDS_FILE` 一般不用设（默认读仓库根目录的关键字 .ods）。

## 五、部署 & 绑定域名

1. 触发 Deploy。首次启动日志应看到：迁移已应用 → `[seed] 已导入 331 条关键字` → Next 就绪。
2. 服务 → Networking → Generate Domain，拿到 `*.zeabur.app` 域名（或绑自定义域名）。
3. 打开域名 → `/upload` 上传 OACT 与 Concur，`/` 查看列表。

## 升级 / 日常

- **改代码**：`git push` 即自动重新部署。数据在 Volume 里不受影响。
- **更新关键字表**：替换仓库里的 .ods 后，因为 seed 是「空才灌」，需手动清空 Keyword 表再重启，或在服务里跑一次性命令重灌。
- **备份**：备份 Volume 里的 `prod.db` 一个文件即可。

## 排错

- **上传大文件失败**：检查 Zeabur 网关 body 大小限制；真实 Concur 文件约 10MB。
- **启动报找不到 prisma / migrate 失败**：确认 `prisma` 在 `dependencies`（本仓库已就位），且服务为普通容器部署（非纯 Serverless 模式）。
- **数据重启丢失**：必定是 Volume 没挂或 `DATABASE_URL` 没指到 `/app/data`。

## 可选：切换 Postgres（要公网多人/多实例时）

1. Zeabur 项目里 Add Service → Postgres，拿到注入的连接串。
2. `prisma/schema.prisma` 的 `datasource.provider` 改成 `postgresql`，`DATABASE_URL` 用 Postgres 串。
3. 删掉 `prisma/migrations` 重新 `prisma migrate dev` 生成 Postgres 迁移，提交。
4. 这样就不需要 Volume，可多实例。代码逻辑无需改动。
