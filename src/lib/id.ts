let counter = 0;
/** Short, collision-resistant id for local demo data. */
export function uid(prefix = 'id'): string {
  counter = (counter + 1) % 1296;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36).padStart(2, '0')}${Math.random().toString(36).slice(2, 6)}`;
}
