import crypto from 'node:crypto';
import { env } from '../../config/env.js';
import { notConfigured } from '../../lib/errors.js';

/**
 * Contrato de pasarela de pago. El módulo de pagos solo habla con esta interfaz.
 *
 * - SandboxGateway: entorno de PRUEBAS interno. No mueve dinero real; aprueba o rechaza
 *   según la tarjeta de prueba elegida. Todo pago queda marcado isTest = true.
 * - AzulGateway: integración con AZUL (Banco Popular, RD). PENDIENTE DE CONFIGURAR:
 *   requiere AZUL_MERCHANT_ID, AZUL_AUTH1, AZUL_AUTH2 y certificado del comercio.
 */
export interface ChargeRequest {
  orderNumber: string;
  amount: number;
  currency: string;
  /** Solo sandbox: escenario de prueba ('approve' | 'decline'). */
  testCard?: 'approve' | 'decline';
}

export interface ChargeResult {
  status: 'APPROVED' | 'DECLINED' | 'PENDING';
  providerRef: string;
  isTest: boolean;
  method: string;
  message: string;
  raw?: Record<string, unknown>;
  /** Si la pasarela requiere redirigir al cliente (páginas de pago alojadas). */
  redirectUrl?: string;
}

export interface PaymentGateway {
  readonly name: 'SANDBOX' | 'AZUL';
  isConfigured(): boolean;
  charge(req: ChargeRequest): Promise<ChargeResult>;
}

export class SandboxGateway implements PaymentGateway {
  readonly name = 'SANDBOX' as const;
  isConfigured() {
    return true;
  }
  async charge(req: ChargeRequest): Promise<ChargeResult> {
    const approved = req.testCard !== 'decline';
    return {
      status: approved ? 'APPROVED' : 'DECLINED',
      providerRef: 'SBX-' + crypto.randomBytes(6).toString('hex').toUpperCase(),
      isTest: true,
      method: 'TARJETA_PRUEBA',
      message: approved ? 'Pago de prueba aprobado (entorno sandbox, sin cargo real)' : 'Pago de prueba rechazado (simulación de fondos insuficientes)',
      raw: { sandbox: true, order: req.orderNumber, amount: req.amount, currency: req.currency },
    };
  }
}

export class AzulGateway implements PaymentGateway {
  readonly name = 'AZUL' as const;
  isConfigured() {
    return Boolean(env.AZUL_MERCHANT_ID && env.AZUL_AUTH1 && env.AZUL_AUTH2);
  }
  async charge(): Promise<ChargeResult> {
    // Punto de integración pendiente: AZUL Payment Page o Webservices API.
    // Implementar aquí la firma (AuthHash) y la redirección, y validar el retorno en /api/payments/webhook/azul.
    throw notConfigured('La pasarela AZUL aún no está configurada. Completa las credenciales del comercio en el servidor.');
  }
}

export function getGateway(): PaymentGateway {
  return env.PAYMENT_PROVIDER === 'azul' ? new AzulGateway() : new SandboxGateway();
}

export function integrationStatus() {
  const azul = new AzulGateway();
  return {
    active: env.PAYMENT_PROVIDER === 'azul' ? 'AZUL' : 'SANDBOX',
    sandbox: { configured: true, note: 'Entorno de pruebas: no realiza cobros reales.' },
    azul: { configured: azul.isConfigured(), env: env.AZUL_ENV, note: azul.isConfigured() ? 'Credenciales presentes; falta completar la implementación de firma y retorno.' : 'Pendiente: credenciales del comercio AZUL.' },
  };
}
