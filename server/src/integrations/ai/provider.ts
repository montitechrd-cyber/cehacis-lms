/**
 * Contrato de proveedor de IA. El resto del sistema solo conoce esta interfaz,
 * de modo que cambiar de proveedor implica añadir otro adaptador, no tocar los módulos.
 */
export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResult {
  text: string;
  tokensIn?: number;
  tokensOut?: number;
}

export interface AiProvider {
  readonly name: string;
  readonly model: string;
  isConfigured(): boolean;
  /** Conversación libre (simulador, tutor). */
  chat(system: string, turns: ChatTurn[], opts?: { maxTokens?: number }): Promise<ChatResult>;
  /** Respuesta JSON validada contra un JSON Schema (evaluaciones, recomendaciones). */
  json<T>(system: string, prompt: string, schema: Record<string, unknown>, opts?: { maxTokens?: number }): Promise<{ data: T; tokensIn?: number; tokensOut?: number }>;
}
