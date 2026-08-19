/**
 * 深拷贝工具（替代 structuredClone，避免依赖 DOM lib）
 * 用于游戏状态机不可变更新
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}
