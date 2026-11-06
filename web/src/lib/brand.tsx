import { useQuery } from '@tanstack/react-query';
import { api } from './api';

export interface Brand {
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

export const DEFAULT_BRAND: Brand = {
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

/** Marca institucional configurable desde el panel (logo, nombre, colores, contacto). */
export function useBrand(): Brand {
  const { data } = useQuery({
    queryKey: ['brand'],
    queryFn: async () => (await api.get<{ data: Brand }>('/public/brand')).data,
    staleTime: 30 * 60 * 1000,
  });
  return { ...DEFAULT_BRAND, ...(data ?? {}) };
}
