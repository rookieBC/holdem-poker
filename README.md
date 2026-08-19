# 德州扑克 Web 游戏 (holdem-poker)

基于 Web 的实时多人德州扑克游戏，像素风视觉（参考小丑牌 Balatro），支持趣味道具。

## 技术栈

- **前端**: React 18 + TypeScript + Vite + Tailwind CSS + Framer Motion + Zustand + tsParticles
- **后端**: Node.js + TypeScript + Express + Socket.io
- **共享**: shared 包（类型 + 规则）
- **存储**: 内存 + JSON 文件持久化
- **视觉**: 像素风 + CRT 滤镜 + 强 juice 动效

## 目录结构

```
holdem-poker/
├── frontend/      # React 前端 SPA
├── backend/       # Node 后端服务
├── shared/        # 共享类型与规则引擎
└── docs/          # 项目文档
```

## 快速开始

### 安装依赖

```powershell
# 在每个包目录安装依赖（单仓多包，workspace 关联）
# 根目录执行
npm install          # 安装根 + workspace 依赖
```

### 启动开发

```powershell
# 终端1：启动后端
cd backend
npm run dev

# 终端2：启动前端
cd frontend
npm run dev
```

前端默认运行在 http://localhost:5173 ，后端在 http://localhost:3000 。

## 开发说明

> Node.js 通过 scoop 安装。若 `node`/`npm` 不在 PATH，使用全路径：
> `$node = "$env:USERPROFILE\home\Scoop\apps\nodejs\current\node.exe"`
> `$npm  = "$env:USERPROFILE\home\Scoop\apps\nodejs\current\npm.cmd"`

详见 `docs/项目规划书.md` 。
