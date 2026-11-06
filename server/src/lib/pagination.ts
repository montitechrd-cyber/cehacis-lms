import type { Request } from 'express';

export interface Page {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
  search?: string;
  sort?: string;
  order: 'asc' | 'desc';
}

/** Lee ?page=&pageSize=&q=&sort=&order= con límites seguros. */
export function getPage(req: Request, defaultSize = 20): Page {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || defaultSize));
  const search = typeof req.query.q === 'string' && req.query.q.trim() ? req.query.q.trim().slice(0, 100) : undefined;
  const sort = typeof req.query.sort === 'string' ? req.query.sort : undefined;
  const order = req.query.order === 'asc' ? 'asc' : 'desc';
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize, search, sort, order };
}

/** Respuesta paginada estándar: { data, meta } */
export function paged<T>(data: T[], total: number, p: Page) {
  return { data, meta: { total, page: p.page, pageSize: p.pageSize, pages: Math.max(1, Math.ceil(total / p.pageSize)) } };
}

/** Restringe el orden a campos permitidos. */
export function orderBy(p: Page, allowed: string[], fallback = 'createdAt') {
  const field = p.sort && allowed.includes(p.sort) ? p.sort : fallback;
  return { [field]: p.order };
}
