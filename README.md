德州扑克 Web 游戏 (holdem-poker)
===

基于 Web 的实时多人德州扑克游戏，像素风视觉（参考小丑牌 Balatro），支持趣味道具。

## 技术栈

- **前端**: React 18 + TypeScript + Vite + Tailwind CSS + Framer Motion + Zustand + tsParticles
- **后端**: Node.js + TypeScript + Express + Socket.io
- **共享**: shared 包（类型 + 规则引擎）
- **存储**: 内存 + JSON 文件持久化
- **视觉**: 像素风 + CRT 滤镜 + 强 juice 动效

## 目录结构

```
holdem-poker/
├── frontend/          # React 前端 SPA
├── backend/           # Node 后端服务
├── shared/            # 共享类型与规则引擎
├── docs/              # 项目文档
├── Dockerfile         # Docker 镜像构建
├── docker-compose.yml # 一键启动
└── .dockerignore
```

## 🚀 一键启动（Docker）

```bash
docker compose up -d --build
```

启动后访问 **http://localhost:3000** 即可开始游戏。

- 前端、后端 API、WebSocket 均通过 **3000** 端口提供服务
- 账户数据持久化在 Docker volume `holdem-data` 中
- 停止服务：`docker compose down`

## 本地开发

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
# 终端1：后端
cd backend && npm run dev

# 终端2：前端
cd frontend && npm run dev
```

前端 http://localhost:5173 ，后端 http://localhost:3000 。

### 构建

```bash
npm run build   # shared + backend + frontend
npm test        # 运行单元测试
```

## Docker 架构

单容器单服务，后端托管前端静态产物：

```
浏览器 → :3000 → Express
                   ├── /api/*     → REST API
                   ├── /socket.io → WebSocket
                   └── /*         → 前端静态文件 (SPA)
```

详见 `docs/项目规划书.md` 。
