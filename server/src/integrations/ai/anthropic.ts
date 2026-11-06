import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../config/env.js';
import { AppError, notConfigured } from '../../lib/errors.js';
import type { AiProvider, ChatResult, ChatTurn } from './provider.js';

/**
 * Adaptador Claude (Anthropic). La clave vive solo en el servidor (ANTHROPIC_API_KEY).
 * Usa fallbacks del lado del servidor ante rechazos por políticas de seguridad.
 */
export class AnthropicProvider implements AiProvider {
  readonly name = 'anthropic';
  readonly model = env.AI_MODEL;
  private client: Anthropic | null = env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }) : null;

  isConfigured() {
    return this.client !== null;
  }

  private get api() {
    if (!this.client) throw notConfigured('El entrenador con IA no está configurado. Un administrador debe definir ANTHROPIC_API_KEY en el servidor.');
    return this.client;
  }

  private async create(params: Record<string, unknown>) {
    try {
      // Parámetros recientes (fallbacks, output_config) se envían por el endpoint beta.
      const res = await this.api.beta.messages.create({
        model: this.model,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        ...params,
      } as never);
      return res as unknown as Anthropic.Message;
    } catch (e) {
      if (e instanceof Anthropic.RateLimitError) throw new AppError(429, 'El servicio de IA está saturado. Inténtalo en unos segundos.', 'AI_RATE_LIMIT');
      if (e instanceof Anthropic.AuthenticationError) throw notConfigured('La clave de IA configurada no es válida.');
      if (e instanceof Anthropic.APIError) throw new AppError(502, 'El servicio de IA no respondió correctamente.', 'AI_ERROR');
      throw e;
    }
  }

  private text(msg: Anthropic.Message) {
    if (msg.stop_reason === 'refusal') throw new AppError(422, 'La IA no pudo responder a este contenido. Reformula tu mensaje.', 'AI_REFUSAL');
    return msg.content.map((b) => (b.type === 'text' ? b.text : '')).join('').trim();
  }

  async chat(system: string, turns: ChatTurn[], opts: { maxTokens?: number } = {}): Promise<ChatResult> {
    const msg = await this.create({
      max_tokens: opts.maxTokens ?? 2000,
      system,
      output_config: { effort: 'low' },
      messages: turns.map((t) => ({ role: t.role, content: t.content })),
    });
    return { text: this.text(msg), tokensIn: msg.usage.input_tokens, tokensOut: msg.usage.output_tokens };
  }

  async json<T>(system: string, prompt: string, schema: Record<string, unknown>, opts: { maxTokens?: number } = {}) {
    const msg = await this.create({
      max_tokens: opts.maxTokens ?? 4000,
      system,
      output_config: { effort: 'medium', format: { type: 'json_schema', schema } },
      messages: [{ role: 'user', content: prompt }],
    });
    const raw = this.text(msg);
    try {
      return { data: JSON.parse(raw) as T, tokensIn: msg.usage.input_tokens, tokensOut: msg.usage.output_tokens };
    } catch {
      throw new AppError(502, 'La IA devolvió una respuesta con formato inesperado.', 'AI_FORMAT');
    }
  }
}

let instance: AiProvider | null = null;
export function getAi(): AiProvider {
  instance ??= new AnthropicProvider();
  return instance;
}
