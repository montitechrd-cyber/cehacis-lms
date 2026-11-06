// Contratos del contenido sembrado. Cada curso publicado exporta un `CourseContent`.

export type CompetencyKey =
  | 'comunicacion_verbal' | 'comunicacion_no_verbal' | 'escucha_activa' | 'empatia' | 'inteligencia_emocional'
  | 'asertividad' | 'resolucion_conflictos' | 'negociacion' | 'persuasion' | 'oratoria' | 'expresion_corporal'
  | 'liderazgo' | 'relaciones_interpersonales' | 'pensamiento_critico' | 'conversaciones_dificiles';

export interface QuestionDef {
  /** MC = opción múltiple (1 correcta), MS = selección múltiple (2+ correctas), TF = verdadero/falso, OPEN = respuesta abierta */
  type: 'MC' | 'MS' | 'TF' | 'OPEN';
  text: string;
  explanation: string;
  /** Para MC/MS: opciones (MC exactamente 1 correcta). Para TF: dos opciones "Verdadero"/"Falso" con una correcta. OPEN: omitir. */
  options?: { text: string; correct: boolean }[];
  competency?: CompetencyKey;
  points?: number;
}

export interface LinkDef { title: string; url: string; description: string; required?: boolean }

export interface LessonDef {
  title: string;
  summary: string;
  durationMin: number;
  /** MANUAL (mayoría), VIEW, RESOURCES (requiere `links` con required:true), ASSESSMENT (gated por el quiz del módulo), ACTIVITY (gated por activities[activityIndex]) */
  completionRule: 'MANUAL' | 'VIEW' | 'RESOURCES' | 'ASSESSMENT' | 'ACTIVITY';
  activityIndex?: number;
  /** HTML (p, h2, h3, ul, ol, blockquote, strong, em). 250-500 palabras. */
  content: string;
  links?: LinkDef[];
  /** true => se adjunta un recurso FORUM al foro general del curso */
  forum?: boolean;
  /** true => se adjunta un recurso LIVE_SESSION al primer evento futuro del curso */
  liveSession?: boolean;
}

export interface ModuleDef {
  title: string;
  description: string;
  lessons: LessonDef[];
  quiz: { title: string; description: string; questions: QuestionDef[] };
}

export interface ScaleItem { text: string; competency: CompetencyKey }

export interface RubricDef {
  title: string;
  description: string;
  /** exactamente 4 criterios; levels = descripciones para puntajes 1..5 (5 textos) */
  criteria: { title: string; description: string; competency: CompetencyKey; levels: [string, string, string, string, string] }[];
}

export interface ActivityDef {
  title: string;
  description: string;
  instructions: string;
  scenario: string;
  roles?: { name: string; description: string }[];
  type: 'INDIVIDUAL' | 'GROUP' | 'ROLE_PLAY' | 'NEGOTIATION' | 'DIFFICULT_CONVERSATION' | 'PUBLIC_SPEAKING' | 'CASE_STUDY';
  submissionTypes: ('TEXT' | 'FILE' | 'VIDEO' | 'AUDIO' | 'LINK')[];
  maxScore: number;
  peerReview: boolean;
  peerReviewsRequired: number;
  competencies: CompetencyKey[];
}

export interface CourseContent {
  durationHours: number;
  objectives: string[];
  audience: string;
  requirements: string;
  subtitle: string;
  modules: ModuleDef[];              // 4 módulos
  diagnostic: ScaleItem[];            // 5
  selfAssessment: ScaleItem[];        // 5
  finalExam: QuestionDef[];           // 8-10, incluye 1 OPEN
  rubric: RubricDef;
  activities: ActivityDef[];          // 2
  forumDescription: string;
}
