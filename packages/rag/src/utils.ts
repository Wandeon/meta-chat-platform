import { Prisma } from '@meta-chat/database';

export function mergeMetadata(
  existing: Prisma.JsonValue | undefined | null,
  addition?: Record<string, any>
): Record<string, any> {
  const base: Record<string, any> =
    typeof existing === 'object' && existing !== null && !Array.isArray(existing)
      ? { ...(existing as Record<string, any>) }
      : {};

  if (!addition) {
    return base;
  }

  for (const [key, value] of Object.entries(addition)) {
    if (value === undefined) continue;
    const existingValue = base[key];
    if (isPlainObject(existingValue) && isPlainObject(value)) {
      base[key] = mergeMetadata(existingValue, value);
    } else {
      base[key] = value;
    }
  }

  return base;
}

function isPlainObject(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
