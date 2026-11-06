import type { Request } from 'express';
import { z, type ZodTypeAny } from 'zod';
import { badRequest } from './errors.js';

/** Valida y devuelve datos tipados. Lanza 400 con los errores por campo. */
export function parse<S extends ZodTypeAny>(schema: S, data: unknown): z.infer<S> {
  const r = schema.safeParse(data);
  if (!r.success) throw badRequest('Revisa los datos enviados', r.error.flatten().fieldErrors);
  return r.data;
}

export const body = <S extends ZodTypeAny>(req: Request, schema: S) => parse(schema, req.body);
export const query = <S extends ZodTypeAny>(req: Request, schema: S) => parse(schema, req.query);

/** Id numérico de req.params. */
export function idParam(req: Request, name = 'id'): number {
  const n = Number(req.params[name]);
  if (!Number.isInteger(n) || n <= 0) throw badRequest(`Parámetro ${name} inválido`);
  return n;
}

// Esquemas reutilizables
export const zId = z.coerce.number().int().positive();
export const zOptId = z.coerce.number().int().positive().nullable().optional();
export const zDate = z.coerce.date();
export const zOptDate = z.coerce.date().nullable().optional();
export const zMoney = z.coerce.number().min(0).max(1_000_000);
export const zText = (max = 5000) => z.string().trim().max(max);
