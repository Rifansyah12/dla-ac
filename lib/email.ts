export function normalizeEmail(value: string): string | null {
  const email = value.trim();
  if (!email || email.length > 254 || !/^[\x21-\x7e]+$/.test(email)) return null;
  const parts = email.split("@");
  if (parts.length !== 2) return null;
  const [local, domain] = parts;
  if (!local || local.length > 64 || local.startsWith(".") || local.endsWith(".") || local.includes("..") || !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(local)) return null;
  const labels = domain.split(".");
  if (labels.length < 2 || labels[labels.length - 1].length < 2 || !labels.every((label) => label.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label))) return null;
  return email.toLowerCase();
}
