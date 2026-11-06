import { prisma } from './prisma.js';

/** Configuración institucional editable desde el panel (no secreta). */
export interface BrandSettings {
  name: string;
  legalName: string;
  tagline: string;
  logoUrl: string;
  primaryColor: string;
  inkColor: string;
  contactEmail: string;
  contactPhone: string;
  whatsapp: string;
  instagram: string;
  address: string;
  currency: string;
}

export const DEFAULT_BRAND: BrandSettings = {
  name: 'CEHACIS',
  legalName: 'Centro de Entrenamiento en Habilidades Comunicativas e Inteligencia Social',
  tagline: 'Transformamos tu voz, tu presencia y tu capacidad de conectar.',
  logoUrl: '/brand/logo-cehacis.png',
  primaryColor: '#EE7A2F',
  inkColor: '#1b2236',
  contactEmail: 'contacto@cehacis.com',
  contactPhone: '+1 849-535-0203',
  whatsapp: '18495350203',
  instagram: 'cehacis',
  address: '',
  currency: 'USD',
};

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await prisma.setting.findUnique({ where: { key } });
  return row ? ({ ...fallback, ...(row.value as object) } as T) : fallback;
}

export function setSetting(key: string, value: unknown) {
  return prisma.setting.upsert({ where: { key }, update: { value: value as object }, create: { key, value: value as object } });
}

export const getBrand = () => getSetting<BrandSettings>('brand', DEFAULT_BRAND);
