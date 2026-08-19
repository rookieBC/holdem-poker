type Level = 'info' | 'warn' | 'error';

function ts(): string {
  return new Date().toISOString().slice(11, 23);
}

function fmt(level: Level, msg: string): string {
  const tag =
    level === 'info'
      ? '\x1b[36m[INFO]\x1b[0m'
      : level === 'warn'
        ? '\x1b[33m[WARN]\x1b[0m'
        : '\x1b[31m[ERR ]\x1b[0m';
  return `${ts()} ${tag} ${msg}`;
}

export const logger = {
  info: (msg: string) => console.log(fmt('info', msg)),
  warn: (msg: string) => console.warn(fmt('warn', msg)),
  error: (msg: string) => console.error(fmt('error', msg)),
};
