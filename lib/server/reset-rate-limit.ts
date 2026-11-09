const attempts = new Map<string, { count: number; expires: number }>();

export function allowResetAttempt(key: string, limit: number): boolean {
  const now = Date.now();
  if (attempts.size >= 10000) {
    for (const [entry, value] of attempts) if (value.expires <= now) attempts.delete(entry);
    if (attempts.size >= 10000) {
      const oldest = attempts.keys().next().value;
      if (oldest) attempts.delete(oldest);
    }
  }
  const current = attempts.get(key);
  if (current && current.expires > now && current.count >= limit) return false;
  const entry = current && current.expires > now ? current : { count: 0, expires: now + 15 * 60 * 1000 };
  attempts.set(key, { ...entry, count: entry.count + 1 });
  return true;
}
