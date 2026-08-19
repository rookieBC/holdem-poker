# ============================================================
# 德州扑克 - 单容器部署
# 多阶段构建：前端构建产物 + 后端运行
# ============================================================

# ---- 阶段1：构建前端 ----
FROM node:20-slim AS frontend-build
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/
RUN npm ci --cache /tmp/npm-cache 2>/dev/null || npm install --cache /tmp/npm-cache
COPY shared/ ./shared/
COPY frontend/ ./frontend/
COPY backend/ ./backend/
RUN npm run build -w shared && npm run build -w frontend

# ---- 阶段2：运行时 ----
FROM node:20-slim AS runtime
WORKDIR /app

# 安装 tsx 用于运行后端源码（避免 tsc 路径别名问题）
RUN npm install -g tsx@4.16.0

# 复制 package 文件并安装生产依赖
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/
RUN npm ci --omit=dev --cache /tmp/npm-cache 2>/dev/null || npm install --omit=dev --cache /tmp/npm-cache

# 复制源码
COPY shared/ ./shared/
COPY backend/ ./backend/

# 复制前端构建产物
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# 数据持久化目录
RUN mkdir -p /app/backend/data
VOLUME /app/backend/data

ENV PORT=3000
ENV CLIENT_URL="*"
EXPOSE 3000

# 用 tsx 运行后端
CMD ["npx", "tsx", "backend/src/index.ts"]
