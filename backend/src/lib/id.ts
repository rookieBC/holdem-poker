let counter = 0;
export function genId(prefix: string): string {
  counter = (counter + 1) % 100000;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36).padStart(4, '0')}`;
}

export function genToken(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 18)}`;
}
