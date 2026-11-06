// Datos de referencia estáticos del seed: competencias, escenarios de IA, FAQ, insignias.
import type { CompetencyKey } from './types.js';

export const SCALE_LABELS = ['Inicial', 'Básico', 'En desarrollo', 'Competente', 'Sobresaliente'];

export const COMPETENCIES: { key: CompetencyKey; name: string; group: string; description: string }[] = [
  { key: 'comunicacion_verbal', name: 'Comunicación verbal', group: 'Comunicación', description: 'Capacidad de expresar ideas con claridad, precisión y adecuación al interlocutor y al contexto, cuidando el vocabulario, la estructura del mensaje y la dicción.' },
  { key: 'comunicacion_no_verbal', name: 'Comunicación no verbal', group: 'Comunicación', description: 'Uso consciente de la mirada, los gestos, la postura y la proximidad para reforzar el mensaje y leer las señales de los demás.' },
  { key: 'escucha_activa', name: 'Escucha activa', group: 'Comunicación', description: 'Atender con plena presencia, parafrasear, preguntar y validar para comprender el mensaje y la intención de la otra persona antes de responder.' },
  { key: 'empatia', name: 'Empatía', group: 'Inteligencia social', description: 'Reconocer y comprender las emociones y perspectivas de otras personas, y responder a ellas con respeto y sensibilidad.' },
  { key: 'inteligencia_emocional', name: 'Inteligencia social', group: 'Inteligencia social', description: 'Comprender las situaciones sociales, leer las emociones propias y ajenas, y actuar con acierto en la interacción con los demás.' },
  { key: 'asertividad', name: 'Asertividad', group: 'Influencia', description: 'Expresar opiniones, necesidades y límites de manera directa, honesta y respetuosa, sin agresividad ni sumisión.' },
  { key: 'resolucion_conflictos', name: 'Resolución de conflictos', group: 'Liderazgo', description: 'Identificar el origen de un desacuerdo, gestionar las emociones involucradas y construir acuerdos sostenibles mediante el diálogo.' },
  { key: 'negociacion', name: 'Negociación', group: 'Influencia', description: 'Preparar y conducir una negociación centrada en intereses, explorar alternativas y alcanzar acuerdos mutuamente beneficiosos.' },
  { key: 'persuasion', name: 'Persuasión', group: 'Influencia', description: 'Presentar argumentos con lógica, credibilidad y conexión emocional para motivar a otros a considerar o adoptar una idea.' },
  { key: 'oratoria', name: 'Oratoria', group: 'Comunicación', description: 'Estructurar y presentar discursos ante un público con seguridad, naturalidad y control de la voz, el ritmo y el manejo de los nervios.' },
  { key: 'expresion_corporal', name: 'Expresión corporal', group: 'Comunicación', description: 'Aprovechar el cuerpo, el espacio y los movimientos para transmitir presencia, energía y coherencia con el mensaje hablado.' },
  { key: 'liderazgo', name: 'Liderazgo', group: 'Liderazgo', description: 'Inspirar, orientar y movilizar a otras personas hacia objetivos comunes mediante una comunicación clara, coherente y humana.' },
  { key: 'relaciones_interpersonales', name: 'Relaciones interpersonales', group: 'Inteligencia social', description: 'Construir y mantener vínculos de confianza y cooperación en contextos personales y profesionales.' },
  { key: 'pensamiento_critico', name: 'Pensamiento crítico', group: 'Pensamiento', description: 'Analizar información y argumentos de forma objetiva, distinguir hechos de opiniones y fundamentar juicios y decisiones.' },
  { key: 'conversaciones_dificiles', name: 'Conversaciones difíciles', group: 'Comunicación', description: 'Abordar temas sensibles o tensos con preparación, claridad y cuidado por la relación, buscando un resultado constructivo.' },
];

export interface ScenarioDef {
  key: string; title: string; description: string; persona: string; context: string;
  objectives: string[]; difficulty: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED'; openingLine: string; competencies: CompetencyKey[];
}

export const SCENARIOS: ScenarioDef[] = [
  {
    key: 'entrevista_laboral', title: 'Entrevista laboral', difficulty: 'BASIC',
    description: 'Practica una entrevista de trabajo para un puesto administrativo: presenta tu perfil, responde preguntas de experiencia y formula tus propias preguntas.',
    persona: 'Marisol Peña, gerente de Recursos Humanos de una empresa mediana de servicios. Es profesional, observadora y cordial, pero va directo al grano. Valora la honestidad, los ejemplos concretos y la capacidad de trabajar en equipo. Le molestan las respuestas vagas y que se exageren los logros.',
    context: 'Eres candidato(a) a un puesto de asistente administrativo. La entrevista dura unos 20 minutos, en la oficina de la empresa. Marisol ya revisó tu currículo y quiere conocer tu experiencia, tus motivaciones y cómo manejas situaciones de presión.',
    objectives: ['Presentarte de forma clara y segura en menos de un minuto', 'Responder con ejemplos concretos usando una estructura ordenada (situación, acción, resultado)', 'Mostrar motivación genuina por el puesto sin exagerar', 'Cerrar con preguntas pertinentes sobre el rol'],
    openingLine: 'Buenos días, gracias por venir. Soy Marisol Peña, de Recursos Humanos. Ya leí su currículo, pero me gustaría escucharlo de usted: cuénteme brevemente quién es y por qué le interesa este puesto.',
    competencies: ['comunicacion_verbal', 'asertividad', 'oratoria'],
  },
  {
    key: 'negociacion_comercial', title: 'Negociación comercial', difficulty: 'INTERMEDIATE',
    description: 'Negocia las condiciones de un contrato de servicios con un cliente que quiere reducir el precio y ampliar el alcance.',
    persona: 'Ramón Cabrera, director de compras de una cadena de tiendas. Es analítico, competitivo y siempre pide más de lo que espera obtener. Respeta a quien argumenta con datos y sostiene sus límites con calma; se distancia de quienes ceden de inmediato o se ponen a la defensiva.',
    context: 'Tu empresa ofrece un servicio de capacitación al personal de la cadena de Ramón. Él quiere un 20 % de descuento y más sesiones al mismo precio. Tú tienes margen limitado y te interesa una relación a largo plazo. Dispones de una reunión para cerrar condiciones.',
    objectives: ['Explorar los intereses de la otra parte antes de proponer', 'Defender el valor del servicio sin ceder de inmediato', 'Ofrecer concesiones a cambio de contrapartidas', 'Cerrar un acuerdo claro y verificar los compromisos'],
    openingLine: 'Buenas tardes. Voy a ser directo: el presupuesto de este año es ajustado y su propuesta nos queda por encima de lo previsto. Si quiere que sigamos adelante, necesito un descuento importante y más sesiones incluidas. ¿Qué me puede ofrecer?',
    competencies: ['negociacion', 'persuasion', 'asertividad'],
  },
  {
    key: 'resolucion_conflictos', title: 'Resolución de un conflicto de equipo', difficulty: 'INTERMEDIATE',
    description: 'Actúa como mediador(a) entre dos compañeros que discuten por la división de tareas y están a punto de dejar de colaborar.',
    persona: 'Daniela Rosario, analista senior del equipo. Es perfeccionista y muy comprometida, pero se siente sobrecargada y poco reconocida. Habla con tono tenso y tiende a recordar agravios pasados. Se abre cuando percibe que la escuchan de verdad.',
    context: 'Daniela y otro compañero del equipo discuten desde hace semanas por quién asume las tareas de reporte. Tú coordinas el área y has convocado a Daniela a una conversación previa para entender su versión antes de reunir a ambos.',
    objectives: ['Escuchar sin interrumpir y reflejar lo que Daniela expresa', 'Distinguir posiciones de intereses', 'Mantener la neutralidad y evitar tomar partido', 'Acordar un siguiente paso concreto'],
    openingLine: 'Mira, ya no aguanto más esta situación. Yo hago casi todo el trabajo de los reportes y nadie lo ve. Si esto sigue así, prefiero que me cambien de proyecto. ¿Para eso me llamaste?',
    competencies: ['resolucion_conflictos', 'escucha_activa', 'inteligencia_emocional'],
  },
  {
    key: 'conversacion_dificil_companero', title: 'Conversación difícil con un compañero', difficulty: 'INTERMEDIATE',
    description: 'Habla con un compañero que llega tarde con frecuencia y afecta al equipo, cuidando la relación y siendo claro con el problema.',
    persona: 'Javier Almonte, diseñador con dos años en el equipo. Es simpático y creativo, pero se pone a la defensiva cuando siente críticas. Atraviesa una situación personal que no ha comentado. Responde bien al respeto, a los hechos concretos y a las preguntas abiertas.',
    context: 'Durante el último mes Javier ha llegado tarde a las reuniones de la mañana y el equipo debe repetirle información. Eres su compañero(a) de confianza y has decidido hablar con él en privado antes de que el tema llegue a la jefatura.',
    objectives: ['Abrir la conversación sin acusar', 'Describir hechos concretos y su impacto', 'Escuchar la versión de Javier con empatía', 'Acordar un compromiso realista y un seguimiento'],
    openingLine: 'Ey, ¿qué tal? Me dijeron que querías hablar conmigo. Espero que no sea nada grave, porque ando con la cabeza llena de cosas esta semana.',
    competencies: ['conversaciones_dificiles', 'empatia', 'asertividad'],
  },
  {
    key: 'atencion_cliente_dificil', title: 'Atención a un cliente difícil', difficulty: 'BASIC',
    description: 'Atiende a un cliente molesto por un pedido que llegó incompleto y busca una solución que lo deje satisfecho.',
    persona: 'Esperanza Valdez, clienta frecuente de una tienda en línea. Está molesta y habla con rapidez y firmeza porque necesitaba el pedido para un evento familiar. No es agresiva por naturaleza: busca que reconozcan el problema y le den una solución concreta con fecha.',
    context: 'Trabajas en servicio al cliente. Esperanza llama porque faltaban dos artículos en su pedido, que ya pagó. El inventario muestra que ambos artículos están disponibles y pueden enviarse en 48 horas.',
    objectives: ['Contener la emoción del cliente con escucha y validación', 'Pedir disculpas sin excusas ni culpar a terceros', 'Ofrecer una solución concreta con plazos', 'Confirmar que el cliente queda conforme'],
    openingLine: 'Buenas. Llamo por tercera vez por mi pedido, y es inaceptable. Pagué todo y me faltan dos artículos que necesitaba para el sábado. ¿Alguien me va a resolver esto de una vez o tengo que seguir llamando?',
    competencies: ['empatia', 'inteligencia_emocional', 'comunicacion_verbal'],
  },
  {
    key: 'presentacion_profesional', title: 'Presentación profesional', difficulty: 'INTERMEDIATE',
    description: 'Presenta una propuesta de mejora ante un comité directivo que hará preguntas incisivas.',
    persona: 'Ing. Héctor Sánchez, miembro del comité directivo. Es pragmático y con poco tiempo, escucha con atención y hace preguntas directas sobre costos, riesgos y plazos. Respeta a quien conoce sus números, admite lo que no sabe y responde sin rodeos.',
    context: 'Debes presentar en cinco minutos una propuesta para implementar un nuevo sistema de seguimiento de pedidos. El comité decidirá si aprueba el proyecto. Héctor interrumpirá con preguntas durante o después de tu exposición.',
    objectives: ['Abrir con un mensaje central claro', 'Estructurar la propuesta en pocos puntos', 'Responder preguntas difíciles con calma y honestidad', 'Cerrar con una solicitud concreta al comité'],
    openingLine: 'Adelante, tiene cinco minutos. Le aviso que me interesan sobre todo el costo, el riesgo y el tiempo de implementación. ¿Cuál es la propuesta?',
    competencies: ['oratoria', 'persuasion', 'comunicacion_verbal'],
  },
  {
    key: 'manejo_objeciones', title: 'Manejo de objeciones', difficulty: 'INTERMEDIATE',
    description: 'Presenta un servicio a un prospecto que plantea dudas sobre el precio, el tiempo y la necesidad real.',
    persona: 'Lucía Brito, dueña de una pequeña empresa familiar. Es cautelosa, ha tenido malas experiencias con proveedores y teme invertir mal. Hace muchas preguntas y objeta con franqueza. Se abre cuando percibe honestidad y casos relevantes para su negocio.',
    context: 'Representas un servicio de capacitación en comunicación para equipos de atención al cliente. Lucía te recibió por cortesía y no está convencida de que valga la pena. Tienes 15 minutos.',
    objectives: ['Identificar la preocupación de fondo detrás de cada objeción', 'Responder sin presionar ni discutir', 'Conectar el servicio con las necesidades expresadas por Lucía', 'Acordar un siguiente paso'],
    openingLine: 'Le agradezco que haya venido, pero le soy sincera: ya me han ofrecido cosas parecidas y no me funcionaron. Además, ahora mismo no tengo presupuesto para esto. ¿Por qué debería escucharle?',
    competencies: ['persuasion', 'escucha_activa', 'negociacion'],
  },
  {
    key: 'conversacion_liderazgo', title: 'Conversación de liderazgo', difficulty: 'ADVANCED',
    description: 'Conversa con un colaborador de alto potencial que se siente desmotivado y está pensando en renunciar.',
    persona: 'Andrés Núñez, coordinador de proyectos con tres años en la empresa. Es talentoso, reservado y orgulloso. Se siente estancado y poco escuchado, y ha recibido una oferta externa que no ha mencionado. Valora que su líder sea transparente y le hable de futuro con hechos.',
    context: 'Eres jefe(a) de Andrés. Notaste que ha bajado su participación y entrega las tareas sin su entusiasmo habitual. Lo invitas a una conversación uno a uno para entender qué ocurre y reconstruir su compromiso.',
    objectives: ['Crear un espacio seguro para que Andrés hable con franqueza', 'Explorar sus motivaciones y expectativas con preguntas abiertas', 'Reconocer su aporte de manera específica', 'Acordar acciones concretas de desarrollo con fechas'],
    openingLine: 'Hola, jefe. Me dijiste que querías hablar. La verdad no sé de qué se trata; yo he estado cumpliendo con lo mío. ¿Pasó algo?',
    competencies: ['liderazgo', 'empatia', 'conversaciones_dificiles'],
  },
];

export const FAQS: { question: string; answer: string }[] = [
  { question: '¿Los cursos son presenciales o en línea?', answer: 'Los cursos que ofrece CEHACIS en este campus son 100 % en línea (modalidad virtual). Puedes estudiar desde cualquier lugar con acceso a internet.' },
  { question: '¿Cuándo puedo acceder a los materiales?', answer: 'Los materiales del curso están disponibles las 24 horas, todos los días, para que avances a tu propio ritmo. Algunas actividades pueden incluir sesiones en vivo con fecha y hora publicadas en el calendario del campus.' },
  { question: '¿Cómo se registra mi progreso?', answer: 'El campus registra automáticamente las lecciones que completas, tus evaluaciones y tus entregas. Puedes consultar tu avance en cualquier momento desde tu panel de estudiante.' },
  { question: '¿Qué incluye cada lección?', answer: 'Cada lección incluye el material de estudio, ejercicios prácticos y, cuando corresponde, recursos complementarios y evaluaciones. Todo el material necesario está incluido en el curso.' },
  { question: '¿Recibiré un certificado?', answer: 'Sí. Al completar el curso y cumplir los requisitos académicos establecidos, recibes un certificado de aprobación con un código de verificación.' },
  { question: '¿Cómo me inscribo y cómo pago?', answer: 'Puedes inscribirte desde el campus eligiendo el curso. Los pagos se realizan en línea; mientras la pasarela de pagos no esté activa, escríbenos por WhatsApp al +1 849-535-0203 o a contacto@cehacis.com y te ayudamos a completar tu inscripción.' },
  { question: '¿Qué pasa si no apruebo una evaluación?', answer: 'Cada evaluación indica cuántos intentos permite. Si no alcanzas la nota mínima, puedes repetirla dentro del número de intentos disponibles, repasando antes el material.' },
  { question: '¿Cómo puedo contactar a CEHACIS?', answer: 'Escríbenos a contacto@cehacis.com, por WhatsApp al +1 849-535-0203 o síguenos en Instagram como @cehacis.' },
];

export const BADGES: { key: string; name: string; description: string; icon: string; criteria: { type: string; min: number }; competency?: CompetencyKey; points: number }[] = [
  { key: 'primera_leccion', name: 'Primer paso', description: 'Completaste tu primera lección.', icon: 'star', criteria: { type: 'LESSONS_COMPLETED', min: 1 }, points: 5 },
  { key: 'diez_lecciones', name: 'Aprendiz constante', description: 'Completaste 10 lecciones.', icon: 'flame', criteria: { type: 'LESSONS_COMPLETED', min: 10 }, points: 20 },
  { key: 'primer_curso', name: 'Curso superado', description: 'Completaste tu primer curso.', icon: 'graduation-cap', criteria: { type: 'COURSES_COMPLETED', min: 1 }, points: 50 },
  { key: 'tres_cursos', name: 'Trayectoria sólida', description: 'Completaste 3 cursos.', icon: 'trophy', criteria: { type: 'COURSES_COMPLETED', min: 3 }, points: 100 },
  { key: 'primera_simulacion', name: 'Práctica con IA', description: 'Completaste tu primera simulación con IA.', icon: 'sparkles', criteria: { type: 'SIMULATIONS_COMPLETED', min: 1 }, points: 10 },
  { key: 'cinco_simulaciones', name: 'Interlocutor entrenado', description: 'Completaste 5 simulaciones con IA.', icon: 'users', criteria: { type: 'SIMULATIONS_COMPLETED', min: 5 }, points: 40 },
  { key: 'voz_comunidad', name: 'Voz de la comunidad', description: 'Publicaste 10 mensajes en los foros.', icon: 'message-circle', criteria: { type: 'FORUM_POSTS', min: 10 }, points: 20 },
  { key: 'primer_certificado', name: 'Certificado en mano', description: 'Obtuviste tu primer certificado.', icon: 'award', criteria: { type: 'CERTIFICATES', min: 1 }, points: 30 },
  { key: 'quinientos_puntos', name: 'Medalla de 500', description: 'Alcanzaste 500 puntos.', icon: 'medal', criteria: { type: 'POINTS', min: 500 }, points: 25 },
  { key: 'orador_destacado', name: 'Orador destacado', description: 'Lograste una nota de 4 o más en la competencia de oratoria.', icon: 'mic', criteria: { type: 'COMPETENCY_SCORE', min: 4 }, competency: 'oratoria', points: 50 },
];
