/** Keep the identity after an uncertain response, navigation, or page reload. */
const memory = new Map<string, string>();

export function renewalOperationId(
  subscriptionId: number,
  periodDays: number,
  endDate: string,
): string {
  const key = `cabinet:renewal:${subscriptionId}:${periodDays}:${endDate}`;
  try {
    const stored = localStorage.getItem(key);
    if (stored && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(stored)) {
      return stored;
    }
  } catch {
    // The server also rejects stale subscription snapshots when storage is unavailable.
  }
  const id = memory.get(key) ?? crypto.randomUUID();
  memory.set(key, id);
  try {
    localStorage.setItem(key, id);
  } catch {
    // Private mode / storage quota: keep the current attempt in memory.
  }
  return id;
}
