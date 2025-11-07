import { Request, Response } from 'express';

/**
 * Ensure a required route param exists. Returns the param string or sends a 400 response and returns null.
 */
export function requireParam(req: Request, res: Response, name: string): string | null {
  const value = (req.params as Record<string, any>)[name] as string | undefined;
  if (!value) {
    res.status(400).json({ error: `${name} is required` });
    return null;
  }
  return value;
}

/**
 * Return a new object with all undefined properties removed.
 * Useful to pass objects to Prisma when exactOptionalPropertyTypes are enabled.
 */
export function stripUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const key of Object.keys(obj)) {
    const v = obj[key as keyof T];
    if (v !== undefined) out[key as keyof T] = v;
  }
  return out;
}
