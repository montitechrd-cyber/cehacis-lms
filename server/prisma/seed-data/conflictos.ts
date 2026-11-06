import type { CourseContent } from './types.js';

export const content: CourseContent = {
  durationHours: 10,
  subtitle: 'Identifica el origen real de los conflictos, regula tus emociones y llega a acuerdos con negociación y mediación.',
  objectives: [
    'Identificar el origen real de un conflicto distinguiendo causas, tipos, niveles, posiciones e intereses.',
    'Manejar tus emociones y las de otros en situaciones tensas mediante regulación y escucha activa.',
    'Aplicar técnicas de negociación basada en intereses y principios básicos de mediación.',
    'Conducir conversaciones difíciles con un marco claro y dar seguimiento a los acuerdos alcanzados.',
    'Resolver casos prácticos de tu entorno laboral con inteligencia social.',
  ],
  audience: 'Líderes, equipos de trabajo, profesionales y personas que desean gestionar conflictos con inteligencia social. Nivel básico a intermedio.',
  requirements: 'No se requieren estudios previos. Se recomienda tener acceso a una situación real o reciente de conflicto (laboral, académica o personal) para usarla como caso de práctica, y disposición para participar en ejercicios de rol y reflexión.',
  modules: [
    {
      title: 'Anatomía del conflicto',
      description: 'Comprende qué es un conflicto, de dónde nace, cómo escala y por qué distinguir posiciones de intereses cambia la forma de abordarlo.',
      lessons: [
        {
          title: 'Qué es un conflicto y por qué no siempre es negativo',
          summary: 'Define el conflicto, sus componentes y su potencial constructivo.',
          durationMin: 25,
          completionRule: 'VIEW',
          content: `<p>Un conflicto surge cuando dos o más personas perciben que sus necesidades, metas o valores son incompatibles, o que lo son sus formas de lograrlos. Fíjate en la palabra <strong>perciben</strong>: el conflicto vive tanto en los hechos como en la interpretación que hacemos de ellos.</p>
<h2>Los componentes de todo conflicto</h2>
<ul>
<li><strong>Las personas</strong>: quiénes están involucradas y qué relación tienen.</li>
<li><strong>El problema</strong>: el asunto concreto sobre el que se discrepa.</li>
<li><strong>El proceso</strong>: cómo se está manejando la diferencia (evitando, gritando, dialogando).</li>
<li><strong>El contexto</strong>: reglas, cultura del equipo, presión de tiempo y recursos disponibles.</li>
</ul>
<h2>Conflicto no es lo mismo que violencia</h2>
<p>Muchas personas asocian conflicto con pelea. Sin embargo, la diferencia de opiniones es normal en cualquier grupo que trabaja junto. Lo que daña no es el desacuerdo, sino la manera de gestionarlo: ataques personales, silencios prolongados o decisiones tomadas a espaldas del otro.</p>
<blockquote>Un conflicto bien gestionado puede mejorar una relación y una decisión; un conflicto ignorado casi siempre empeora ambas.</blockquote>
<h3>Estilos frecuentes ante el conflicto</h3>
<p>Solemos responder con evitación, imposición, cesión, concesiones mutuas o colaboración. Ninguno es malo en sí mismo: la evitación puede servir para enfriar una situación, pero pierde utilidad si se convierte en hábito.</p>
<h3>Ejercicio guiado</h3>
<ol>
<li>Recuerda un desacuerdo reciente y descríbelo en tres líneas, solo con hechos observables.</li>
<li>Identifica a las personas, el problema, el proceso y el contexto.</li>
<li>Anota cuál fue tu estilo habitual de respuesta y qué resultado produjo.</li>
<li>Escribe una cosa que el conflicto te enseñó o podría enseñarte.</li>
</ol>
<p>Guarda este caso: lo retomaremos en las próximas lecciones para analizarlo con más herramientas.</p>`,
        },
        {
          title: 'Causas, tipos y niveles de conflicto',
          summary: 'Clasifica los conflictos para elegir una respuesta adecuada.',
          durationMin: 30,
          completionRule: 'MANUAL',
          content: `<p>No todos los conflictos se resuelven igual. Clasificarlos te ayuda a elegir la herramienta correcta en lugar de aplicar siempre la misma receta.</p>
<h2>Causas frecuentes</h2>
<ul>
<li><strong>Recursos</strong>: tiempo, presupuesto, espacio o personal que no alcanzan para todos.</li>
<li><strong>Información</strong>: datos incompletos, rumores o mensajes interpretados de forma distinta.</li>
<li><strong>Roles</strong>: responsabilidades poco claras o superpuestas.</li>
<li><strong>Valores</strong>: creencias distintas sobre lo que es justo, correcto o prioritario.</li>
<li><strong>Relaciones</strong>: historia previa, falta de confianza o estilos de comunicación incompatibles.</li>
</ul>
<h2>Tipos</h2>
<p>Se habla de conflictos de <strong>tarea</strong> (qué hacer y cómo), de <strong>relación</strong> (cómo nos tratamos) y de <strong>proceso</strong> (quién decide y de qué manera). Un conflicto de tarea mal manejado suele derivar en uno de relación.</p>
<h2>Niveles</h2>
<p>Pueden ser <em>intrapersonales</em> (dudas internas), <em>interpersonales</em> (entre dos personas), <em>grupales</em> (dentro de un equipo) o <em>intergrupales</em> (entre áreas). A mayor nivel, suele haber más actores y más intereses por considerar.</p>
<blockquote>Antes de resolver, diagnostica: la causa y el nivel determinan la intervención.</blockquote>
<h3>Ejercicio guiado</h3>
<ol>
<li>Toma el caso de la lección anterior.</li>
<li>Marca cuál de las cinco causas aparece con más fuerza y cuáles lo alimentan en segundo plano.</li>
<li>Clasifícalo como tarea, relación o proceso, y justifica con un hecho.</li>
<li>Indica en qué nivel se ubica y quién más debería participar en la solución.</li>
<li>Escribe una hipótesis: &quot;Creo que el conflicto persiste porque...&quot;.</li>
</ol>`,
        },
        {
          title: 'Posiciones e intereses: lo que se dice y lo que se necesita',
          summary: 'Aprende a distinguir lo que alguien exige de lo que realmente necesita.',
          durationMin: 30,
          completionRule: 'RESOURCES',
          links: [
            { title: 'Negociación (Wikipedia)', url: 'https://es.wikipedia.org/wiki/Negociaci%C3%B3n', description: 'Panorama general de la negociación y sus enfoques. Lectura requerida.', required: true },
            { title: 'Escucha activa (Wikipedia)', url: 'https://es.wikipedia.org/wiki/Escucha_activa', description: 'Lectura complementaria para preguntar mejor y descubrir intereses.' },
          ],
          content: `<p>Dos compañeros discuten por una sala de reuniones. Uno dice: &quot;La necesito el jueves a las 10&quot;. El otro responde: &quot;Yo la tengo reservada ese día&quot;. Ambos defienden <strong>posiciones</strong>: lo que piden de manera explícita.</p>
<h2>Qué es un interés</h2>
<p>El <strong>interés</strong> es la razón profunda detrás de la posición: la necesidad, preocupación o deseo que se quiere satisfacer. En el ejemplo, el primero quizá necesita un espacio silencioso para una capacitación; el segundo, un lugar con proyector para presentar a un cliente. Si ambos requisitos pueden cubrirse con otra sala o con otro horario, el conflicto desaparece.</p>
<h2>Por qué importa la diferencia</h2>
<ul>
<li>Las posiciones suelen ser incompatibles: solo una gana.</li>
<li>Los intereses suelen ser compatibles o combinables: hay más opciones.</li>
<li>Discutir posiciones endurece a las partes; explorar intereses abre la conversación.</li>
</ul>
<blockquote>Detrás de cada posición hay un interés; detrás de cada interés, una necesidad humana.</blockquote>
<h3>Preguntas que revelan intereses</h3>
<ul>
<li>&quot;¿Qué es lo más importante para ti en esto?&quot;</li>
<li>&quot;¿Qué te preocupa que pase si no se hace así?&quot;</li>
<li>&quot;¿Para qué lo necesitas?&quot;</li>
</ul>
<h3>Ejercicio guiado</h3>
<ol>
<li>Vuelve a tu caso y escribe la posición de cada parte en una frase.</li>
<li>Para cada posición, formula tres preguntas &quot;¿para qué?&quot; hasta llegar a una necesidad.</li>
<li>Subraya los intereses que se comparten o no se contradicen.</li>
<li>Propón dos opciones que satisfagan al menos un interés de cada parte.</li>
</ol>
<p>Completa las lecturas indicadas para cerrar la lección.</p>`,
        },
        {
          title: 'Evaluación del módulo 1',
          summary: 'Comprueba lo aprendido sobre la anatomía del conflicto.',
          durationMin: 20,
          completionRule: 'ASSESSMENT',
          content: `<p>Has recorrido los fundamentos para analizar un conflicto: sus componentes, causas, tipos, niveles y la diferencia entre posiciones e intereses.</p>
<h2>Antes de iniciar el quiz</h2>
<ul>
<li>Repasa la clasificación de causas: recursos, información, roles, valores y relaciones.</li>
<li>Recuerda que el conflicto se basa en la percepción, no solo en los hechos.</li>
<li>Practica en voz alta la pregunta &quot;¿para qué lo necesitas?&quot;.</li>
</ul>
<blockquote>Diagnosticar bien es la mitad de la solución.</blockquote>
<h3>Ejercicio guiado de repaso</h3>
<ol>
<li>Escribe en una hoja las cinco causas frecuentes y un ejemplo de tu entorno para cada una.</li>
<li>Elige un conflicto cualquiera y redacta una posición y su interés posible.</li>
<li>Identifica qué información te faltaría para estar seguro de tu diagnóstico.</li>
<li>Cuando termines, abre el quiz del módulo desde la sección de evaluaciones.</li>
</ol>
<p>Esta lección se completa al aprobar el quiz del módulo. Si no alcanzas el puntaje mínimo, revisa las lecciones anteriores y vuelve a intentarlo con calma. El objetivo no es memorizar términos, sino usarlos para entender mejor las situaciones reales que enfrentas con tu equipo.</p>
<p>Recuerda también que un buen diagnóstico requiere humildad: tu primera lectura del conflicto puede estar incompleta, y escuchar a las demás partes casi siempre la corrige.</p>`,
        },
      ],
      quiz: {
        title: 'Quiz: Anatomía del conflicto',
        description: 'Verifica tu comprensión de causas, tipos, niveles, posiciones e intereses.',
        questions: [
          { type: 'MC', competency: 'resolucion_conflictos', text: 'Dos jefes de área exigen el mismo presupuesto trimestral. Al preguntar "¿para qué lo necesitas?", uno busca renovar equipos y el otro capacitar personal. ¿Qué se ha identificado?', explanation: 'Las exigencias iniciales son posiciones; renovar equipos y capacitar son los intereses, que pueden satisfacerse con distintas combinaciones del presupuesto.', options: [{ text: 'Los intereses detrás de cada posición', correct: true }, { text: 'Las causas de valores del conflicto', correct: false }, { text: 'El nivel intergrupal del conflicto', correct: false }, { text: 'El estilo de evitación de ambos jefes', correct: false }] },
          { type: 'TF', competency: 'resolucion_conflictos', text: 'Un conflicto siempre es perjudicial y la meta debe ser eliminarlo lo antes posible.', explanation: 'Falso. Un conflicto bien gestionado puede mejorar decisiones y relaciones; lo dañino es la mala gestión.', options: [{ text: 'Verdadero', correct: false }, { text: 'Falso', correct: true }] },
          { type: 'MS', competency: 'resolucion_conflictos', text: '¿Cuáles de las siguientes son causas frecuentes de conflicto en equipos? (Selecciona todas las correctas)', explanation: 'Los recursos limitados, los roles poco claros y la información incompleta son causas típicas. La puntualidad del reloj no es una causa en sí misma.', options: [{ text: 'Recursos limitados', correct: true }, { text: 'Roles superpuestos o poco claros', correct: true }, { text: 'Información incompleta o malinterpretada', correct: true }, { text: 'Que el reloj de la oficina marque la hora exacta', correct: false }] },
          { type: 'MC', competency: 'conversaciones_dificiles', text: 'Un conflicto empezó como una discrepancia sobre cómo hacer un informe y ahora los dos evitan saludarse. ¿Cómo se describe mejor esta evolución?', explanation: 'Un conflicto de tarea mal manejado suele derivar en uno de relación, como ocurre en este caso.', options: [{ text: 'Pasó de un conflicto de tarea a uno de relación', correct: true }, { text: 'Pasó de un conflicto de proceso a uno de valores', correct: false }, { text: 'Se convirtió en un conflicto intrapersonal', correct: false }, { text: 'Dejó de ser un conflicto', correct: false }] },
          { type: 'TF', competency: 'resolucion_conflictos', text: 'Las posiciones de las partes suelen ser incompatibles, mientras que sus intereses con frecuencia pueden combinarse.', explanation: 'Verdadero. Por eso explorar intereses amplía las opciones de solución.', options: [{ text: 'Verdadero', correct: true }, { text: 'Falso', correct: false }] },
        ],
      },
    },
    {
      title: 'Emociones y escucha en situaciones tensas',
      description: 'Aprende a reconocer y regular las emociones propias y a usar la escucha activa para desescalar tensiones.',
      lessons: [
        {
          title: 'Emociones bajo tensión: reconocer y regular',
          summary: 'Identifica tus disparadores emocionales y aplica estrategias de regulación.',
          durationMin: 30,
          completionRule: 'MANUAL',
          content: `<p>Cuando percibimos una amenaza, el cuerpo reacciona antes que el razonamiento: se acelera el corazón, se tensan los músculos y la atención se estrecha. Reconocer esa reacción es el primer paso de la inteligencia emocional aplicada al conflicto.</p>
<h2>Señales de que estás escalando</h2>
<ul>
<li>Tono de voz más alto o más rápido.</li>
<li>Pensamientos absolutos: &quot;siempre&quot;, &quot;nunca&quot;, &quot;todos&quot;.</li>
<li>Ganas de tener la última palabra o de huir de la conversación.</li>
<li>Tensión en mandíbula, hombros o estómago.</li>
</ul>
<h2>Estrategias de regulación</h2>
<ul>
<li><strong>Pausa consciente</strong>: respira lento, alargando la exhalación, durante un minuto.</li>
<li><strong>Nombrar la emoción</strong>: &quot;Siento frustración&quot; reduce su intensidad al darle forma.</li>
<li><strong>Pedir tiempo</strong>: &quot;Quiero responderte bien, ¿podemos retomarlo en media hora?&quot;.</li>
<li><strong>Reencuadrar</strong>: preguntarte qué más podría explicar la conducta del otro además de mala intención.</li>
</ul>
<blockquote>No puedes controlar el primer impulso, pero sí lo que haces con el segundo.</blockquote>
<h3>Ejercicio guiado: mapa de disparadores</h3>
<ol>
<li>Lista tres situaciones laborales que te hayan irritado o angustiado.</li>
<li>Para cada una, anota la sensación física, el pensamiento automático y la conducta que siguió.</li>
<li>Identifica el patrón común: ¿qué valor o necesidad sentías amenazada?</li>
<li>Elige una estrategia de regulación y escribe la frase exacta que usarás la próxima vez.</li>
<li>Practica la respiración lenta durante un minuto y registra cómo cambió tu cuerpo.</li>
</ol>`,
        },
        {
          title: 'Escucha activa para desescalar',
          summary: 'Usa parafraseo, validación y preguntas abiertas para bajar la tensión.',
          durationMin: 30,
          completionRule: 'MANUAL',
          forum: true,
          content: `<p>En medio de una discusión, lo que más necesita una persona suele ser sentirse escuchada. La escucha activa no significa estar de acuerdo: significa demostrar que comprendiste el mensaje y la emoción que lo acompaña.</p>
<h2>Técnicas básicas</h2>
<ul>
<li><strong>Parafrasear</strong>: &quot;Si te entiendo bien, lo que te preocupa es que el plazo no sea realista&quot;.</li>
<li><strong>Reflejar la emoción</strong>: &quot;Parece que esto te ha dejado agotada&quot;.</li>
<li><strong>Preguntas abiertas</strong>: &quot;¿Cómo ves tú la situación?&quot;, &quot;¿Qué sería lo ideal para ti?&quot;.</li>
<li><strong>Resumir</strong>: sintetizar los puntos principales antes de responder.</li>
<li><strong>Silencio atento</strong>: dejar que la otra persona termine sin interrumpir.</li>
</ul>
<h2>Validar no es ceder</h2>
<p>Decir &quot;Entiendo que te moleste que no te avisaran&quot; reconoce una experiencia legítima sin aceptar necesariamente todas las conclusiones. Primero validas, luego aportas tu perspectiva.</p>
<blockquote>Quien se siente escuchado baja la guardia; quien baja la guardia puede empezar a escuchar.</blockquote>
<h3>Obstáculos comunes</h3>
<p>Preparar la respuesta mientras el otro habla, aconsejar demasiado pronto, minimizar (&quot;no es para tanto&quot;) o interrumpir con aclaraciones defensivas.</p>
<h3>Ejercicio guiado en parejas</h3>
<ol>
<li>Una persona relata durante dos minutos algo que le incomodó en el trabajo.</li>
<li>La otra solo puede parafrasear, reflejar emociones y hacer preguntas abiertas; sin consejos.</li>
<li>Quien relató indica si se sintió comprendido y qué frase ayudó más.</li>
<li>Inviertan los roles.</li>
</ol>
<p>Comparte en el foro del curso una frase de validación que te resultó útil y otra que te costó pronunciar.</p>`,
        },
        {
          title: 'Evaluación del módulo 2',
          summary: 'Comprueba tus conocimientos sobre manejo emocional y escucha.',
          durationMin: 20,
          completionRule: 'ASSESSMENT',
          content: `<p>En este módulo trabajaste dos habilidades que sostienen todo lo demás: regular tus emociones cuando hay tensión y escuchar de manera activa para desescalar.</p>
<h2>Puntos clave para repasar</h2>
<ul>
<li>Las señales físicas y mentales de que la tensión está subiendo.</li>
<li>Las estrategias de regulación: pausa, nombrar la emoción, pedir tiempo y reencuadrar.</li>
<li>Las técnicas de escucha: parafrasear, reflejar, preguntar y resumir.</li>
<li>La diferencia entre validar y estar de acuerdo.</li>
</ul>
<blockquote>La calma no es ausencia de emoción, sino decidir cómo actuar con ella.</blockquote>
<h3>Ejercicio guiado de repaso</h3>
<ol>
<li>Escribe una situación en la que perdiste la calma o estuviste cerca de perderla.</li>
<li>Redacta cómo habrías parafraseado el mensaje de la otra persona en una sola frase.</li>
<li>Escribe una frase de validación que no implique ceder en el fondo del asunto.</li>
<li>Define una señal personal de alerta temprana y la acción que tomarás al detectarla.</li>
<li>Abre el quiz del módulo y respóndelo con tranquilidad.</li>
</ol>
<p>La lección se marca como completada al aprobar el quiz. Si necesitas repetirlo, aprovecha la retroalimentación de cada pregunta para entender el porqué de cada respuesta, no solo cuál era la correcta.</p>`,
        },
      ],
      quiz: {
        title: 'Quiz: Emociones y escucha en situaciones tensas',
        description: 'Aplica regulación emocional y escucha activa a situaciones de tensión.',
        questions: [
          { type: 'MC', competency: 'escucha_activa', text: 'Un colega te dice con voz tensa: "Nadie me avisó del cambio y quedé como tonto frente al cliente". ¿Qué respuesta aplica mejor la escucha activa?', explanation: 'Parafrasear y reflejar la emoción demuestra comprensión antes de explicar o corregir.', options: [{ text: 'Parece que te sentiste expuesto frente al cliente porque no tenías la información, ¿es así?', correct: true }, { text: 'No es para tanto, el cliente ya lo olvidó.', correct: false }, { text: 'Yo envié el correo, revisa tu bandeja.', correct: false }, { text: 'Lo que debes hacer es pedir confirmación siempre.', correct: false }] },
          { type: 'MS', competency: 'inteligencia_emocional', text: '¿Cuáles son estrategias válidas para regular una emoción intensa durante una discusión?', explanation: 'La pausa respirada, nombrar la emoción y pedir un tiempo ayudan a regular. Contener todo sin expresarlo no es regulación sino supresión.', options: [{ text: 'Respirar lento alargando la exhalación', correct: true }, { text: 'Nombrar la emoción que sientes', correct: true }, { text: 'Pedir un breve receso para retomar la conversación', correct: true }, { text: 'Callarte y aparentar que nada te afecta', correct: false }] },
          { type: 'TF', competency: 'escucha_activa', text: 'Validar la emoción de una persona implica que estás de acuerdo con todas sus conclusiones.', explanation: 'Falso. Validar reconoce la experiencia emocional sin aceptar necesariamente sus conclusiones.', options: [{ text: 'Verdadero', correct: false }, { text: 'Falso', correct: true }] },
          { type: 'MC', competency: 'inteligencia_emocional', text: 'Notas que usas palabras como "siempre" y "nunca" y que tu voz sube de volumen. ¿Qué indica esto?', explanation: 'Son señales tempranas de escalada; reconocerlas permite aplicar una pausa antes de responder.', options: [{ text: 'Que estás escalando y conviene hacer una pausa', correct: true }, { text: 'Que tienes razón y debes insistir', correct: false }, { text: 'Que el otro ha dejado de escuchar', correct: false }, { text: 'Que la conversación ya terminó', correct: false }] },
          { type: 'MC', competency: 'escucha_activa', text: '¿Cuál de estas es una pregunta abierta apropiada para explorar el punto de vista de alguien?', explanation: 'Las preguntas abiertas no se responden con sí o no e invitan a explicar la perspectiva.', options: [{ text: '¿Cómo ves tú la situación?', correct: true }, { text: '¿Estás molesto, verdad?', correct: false }, { text: '¿No crees que exageras?', correct: false }, { text: '¿Entonces fue culpa del proveedor?', correct: false }] },
        ],
      },
    },
    {
      title: 'Negociación y mediación',
      description: 'Aprende a negociar por intereses, preparar alternativas y facilitar acuerdos de beneficio mutuo.',
      lessons: [
        {
          title: 'Negociar por intereses: opciones y alternativas',
          summary: 'Prepara una negociación con intereses claros, opciones creativas y una alternativa.',
          durationMin: 35,
          completionRule: 'MANUAL',
          content: `<p>Negociar es conversar para decidir algo cuando las partes dependen una de la otra pero no coinciden por completo. El enfoque más útil para relaciones de trabajo continuas es la negociación <strong>basada en intereses</strong>, que busca acuerdos de beneficio mutuo sin deteriorar la relación.</p>
<h2>Cuatro pilares</h2>
<ul>
<li><strong>Separar a las personas del problema</strong>: atacar el asunto, no a quien lo plantea.</li>
<li><strong>Centrarse en intereses</strong>, no en posiciones.</li>
<li><strong>Generar opciones</strong> antes de decidir: lluvia de ideas sin juzgar.</li>
<li><strong>Usar criterios objetivos</strong>: normas, precedentes, datos o referencias que ambas partes acepten.</li>
</ul>
<h2>Prepara tu alternativa</h2>
<p>Antes de negociar, define qué harás si no hay acuerdo. Conocer tu mejor alternativa te da seguridad para no aceptar algo peor y para saber cuándo levantarte de la mesa. Piensa también en la alternativa de la otra parte.</p>
<blockquote>Se negocia mejor cuando se sabe qué se necesita, qué se puede ofrecer y qué pasa si no hay trato.</blockquote>
<h3>Acuerdos ganar-ganar</h3>
<p>No siempre significa repartir mitad y mitad. Se logra ampliando las opciones: intercambiar lo que para ti vale poco y para el otro mucho, y viceversa.</p>
<h3>Ejercicio guiado: plan de negociación</h3>
<ol>
<li>Elige una negociación pendiente (plazos, recursos, funciones).</li>
<li>Escribe tus intereses y los que supones en la otra parte.</li>
<li>Genera al menos cinco opciones, incluso las que parezcan poco probables.</li>
<li>Define un criterio objetivo para evaluar las opciones.</li>
<li>Redacta tu alternativa si no hay acuerdo y la posible alternativa del otro.</li>
</ol>`,
        },
        {
          title: 'Mediación y práctica de negociación',
          summary: 'Conoce el rol del mediador y practica una negociación guiada.',
          durationMin: 45,
          completionRule: 'ACTIVITY',
          activityIndex: 0,
          liveSession: true,
          content: `<p>La mediación es un proceso en el que un tercero neutral ayuda a las partes a comunicarse y a construir su propio acuerdo. A diferencia de un juez o un árbitro, el mediador <strong>no decide</strong>: facilita.</p>
<h2>Principios del mediador</h2>
<ul>
<li><strong>Neutralidad e imparcialidad</strong>: no toma partido ni favorece una versión.</li>
<li><strong>Confidencialidad</strong>: lo que se habla en la sesión no se divulga.</li>
<li><strong>Voluntariedad</strong>: las partes participan por decisión propia.</li>
<li><strong>Protagonismo de las partes</strong>: las soluciones nacen de ellas.</li>
</ul>
<h2>Etapas de una mediación</h2>
<ol>
<li>Apertura: se explican reglas y el rol del mediador.</li>
<li>Exposición: cada parte cuenta su versión sin interrupciones.</li>
<li>Identificación de intereses: se resumen necesidades y puntos en común.</li>
<li>Generación de opciones: se proponen alternativas conjuntas.</li>
<li>Acuerdo: se redacta con compromisos concretos y verificables.</li>
</ol>
<blockquote>El mediador no resuelve el conflicto; crea las condiciones para que las partes lo resuelvan.</blockquote>
<h3>Ejercicio guiado</h3>
<ol>
<li>Lee el escenario de la actividad &quot;Negociación de recursos del equipo&quot;.</li>
<li>Elige tu rol: jefa de área, coordinador de proyecto o mediador.</li>
<li>Prepara tus intereses y, si eres mediador, tus preguntas para cada etapa.</li>
<li>Realiza la negociación y registra tu entrega en texto o audio.</li>
<li>Evalúa el trabajo de dos compañeros con la rúbrica.</li>
</ol>
<p>Participa en la sesión en vivo para resolver dudas y observar una demostración antes de entregar.</p>`,
        },
        {
          title: 'Evaluación del módulo 3',
          summary: 'Comprueba lo aprendido sobre negociación y mediación.',
          durationMin: 20,
          completionRule: 'ASSESSMENT',
          content: `<p>En este módulo aprendiste a negociar por intereses, a preparar alternativas y a comprender el papel de un mediador. Ahora es momento de consolidar esas ideas.</p>
<h2>Repaso rápido</h2>
<ul>
<li>Los cuatro pilares: personas y problema, intereses, opciones y criterios objetivos.</li>
<li>La importancia de definir tu mejor alternativa antes de sentarte a negociar.</li>
<li>El rol del mediador: facilita, no decide.</li>
<li>Las características de un acuerdo concreto y verificable.</li>
</ul>
<blockquote>Un buen acuerdo es el que ambas partes entienden, pueden cumplir y quieren cumplir.</blockquote>
<h3>Ejercicio guiado de repaso</h3>
<ol>
<li>Resume en tres líneas la diferencia entre negociar y mediar.</li>
<li>Escribe dos opciones creativas para un conflicto de recursos en tu equipo.</li>
<li>Redacta un compromiso concreto con responsable, acción y fecha.</li>
<li>Reflexiona sobre qué parte de la negociación te resultó más difícil.</li>
<li>Abre el quiz del módulo y respóndelo.</li>
</ol>
<p>Esta lección se completa al aprobar el quiz del módulo. Aprovecha los comentarios de cada pregunta para detectar qué conceptos conviene reforzar antes del siguiente módulo, donde integraremos todo en conversaciones difíciles reales.</p>`,
        },
      ],
      quiz: {
        title: 'Quiz: Negociación y mediación',
        description: 'Verifica tu dominio de la negociación por intereses y los principios de mediación.',
        questions: [
          { type: 'MC', competency: 'negociacion', text: 'Antes de una negociación importante, ¿qué te da mayor seguridad para decidir si aceptas o no una oferta?', explanation: 'Conocer tu mejor alternativa si no hay acuerdo te permite comparar cualquier oferta con una referencia real.', options: [{ text: 'Haber definido tu mejor alternativa si no hay acuerdo', correct: true }, { text: 'Haber memorizado tus argumentos más fuertes', correct: false }, { text: 'Hablar primero para fijar el punto de partida', correct: false }, { text: 'Evitar mencionar tus intereses', correct: false }] },
          { type: 'MS', competency: 'negociacion', text: '¿Cuáles son pilares de la negociación basada en intereses?', explanation: 'Separar personas y problema, centrarse en intereses y usar criterios objetivos son pilares. Ganar a toda costa contradice el enfoque.', options: [{ text: 'Separar a las personas del problema', correct: true }, { text: 'Centrarse en intereses y no en posiciones', correct: true }, { text: 'Usar criterios objetivos aceptables para ambos', correct: true }, { text: 'Lograr que la otra parte ceda lo más posible', correct: false }] },
          { type: 'TF', competency: 'resolucion_conflictos', text: 'El mediador decide cuál de las partes tiene la razón y propone la solución obligatoria.', explanation: 'Falso. El mediador facilita la comunicación y las partes construyen el acuerdo; no impone decisiones.', options: [{ text: 'Verdadero', correct: false }, { text: 'Falso', correct: true }] },
          { type: 'MC', competency: 'negociacion', text: 'Dos equipos disputan un único vehículo de la empresa. Uno lo necesita por la mañana y el otro por la tarde. ¿Qué se logró al descubrirlo?', explanation: 'Al explorar intereses (horarios) aparece una opción de beneficio mutuo: compartir según el horario.', options: [{ text: 'Una opción ganar-ganar basada en los intereses de cada equipo', correct: true }, { text: 'Una cesión unilateral de uno de los equipos', correct: false }, { text: 'Una decisión impuesta por un superior', correct: false }, { text: 'Un empate sin solución', correct: false }] },
          { type: 'MC', competency: 'resolucion_conflictos', text: '¿Cuál de estos principios corresponde a la mediación?', explanation: 'La confidencialidad protege lo dicho en sesión y favorece que las partes hablen con franqueza.', options: [{ text: 'Confidencialidad de lo hablado en la sesión', correct: true }, { text: 'Participación forzosa de las partes', correct: false }, { text: 'Decisión final del mediador', correct: false }, { text: 'Preferencia por la parte más afectada', correct: false }] },
        ],
      },
    },
    {
      title: 'Conversaciones difíciles y seguimiento de acuerdos',
      description: 'Estructura conversaciones delicadas, da retroalimentación con respeto y asegura que los acuerdos se cumplan.',
      lessons: [
        {
          title: 'Estructura de una conversación difícil',
          summary: 'Prepara y conduce una conversación delicada con un marco claro.',
          durationMin: 35,
          completionRule: 'MANUAL',
          content: `<p>Una conversación se vuelve difícil cuando hay emociones fuertes, intereses en juego o consecuencias importantes. Evitarla suele agravar el problema; abordarla sin preparación también. La clave es un marco simple.</p>
<h2>Antes: prepárate</h2>
<ul>
<li>Define tu propósito: ¿qué quiero lograr y qué no?</li>
<li>Separa hechos, interpretaciones y emociones.</li>
<li>Considera la perspectiva del otro: ¿qué podría estar viviendo?</li>
<li>Elige momento y lugar adecuados, con privacidad y sin prisa.</li>
</ul>
<h2>Durante: un marco en cuatro pasos</h2>
<ol>
<li><strong>Hecho observable</strong>: &quot;En las dos últimas reuniones llegaste después de iniciar&quot;.</li>
<li><strong>Impacto</strong>: &quot;Eso retrasa al equipo y me preocupa&quot;.</li>
<li><strong>Pregunta o petición</strong>: &quot;¿Qué está pasando? ¿Podemos acordar una hora de llegada?&quot;.</li>
<li><strong>Escucha y acuerdo</strong>: atiende la respuesta y definan juntos el siguiente paso.</li>
</ol>
<blockquote>Habla de lo que observas y de lo que sientes, no de lo que supones sobre la intención del otro.</blockquote>
<h3>Lenguaje que ayuda</h3>
<p>Usa mensajes en primera persona, evita etiquetas (&quot;eres irresponsable&quot;) y generalizaciones. Cuida el tono y el lenguaje corporal: una postura abierta transmite disposición a dialogar.</p>
<h3>Ejercicio guiado</h3>
<ol>
<li>Elige una conversación que has postergado.</li>
<li>Redacta tu propósito en una frase.</li>
<li>Escribe el hecho observable, el impacto y la petición.</li>
<li>Anticipa dos reacciones posibles y cómo responderías con calma.</li>
<li>Ensaya la apertura en voz alta.</li>
</ol>`,
        },
        {
          title: 'Dar retroalimentación y practicar la conversación',
          summary: 'Practica una conversación de retroalimentación con enfoque constructivo.',
          durationMin: 45,
          completionRule: 'ACTIVITY',
          activityIndex: 1,
          content: `<p>La retroalimentación es una de las conversaciones difíciles más frecuentes en el trabajo. Bien dada, mejora el desempeño y fortalece la confianza; mal dada, genera defensividad y distancia.</p>
<h2>Principios de una buena retroalimentación</h2>
<ul>
<li><strong>Oportuna</strong>: cuanto antes, mientras el hecho es reciente.</li>
<li><strong>Específica</strong>: describe conductas concretas, no rasgos de personalidad.</li>
<li><strong>Equilibrada</strong>: reconoce lo que funciona y señala lo que debe cambiar.</li>
<li><strong>Orientada al futuro</strong>: termina con acuerdos de mejora.</li>
<li><strong>Bidireccional</strong>: invita a la otra persona a dar su visión.</li>
</ul>
<h2>Errores comunes</h2>
<p>El &quot;sándwich&quot; tan cargado de elogios que el mensaje central se pierde, las generalizaciones, los reproches acumulados y la retroalimentación en público.</p>
<blockquote>La retroalimentación efectiva cuida la relación y es clara con el mensaje al mismo tiempo.</blockquote>
<h3>Cómo reaccionar si el otro se pone a la defensiva</h3>
<p>Reconoce su emoción, repite el objetivo común y vuelve al hecho concreto. Si la tensión sube, ofrece una pausa.</p>
<h3>Ejercicio guiado</h3>
<ol>
<li>Lee el escenario de la actividad &quot;Conversación difícil: dar retroalimentación&quot;.</li>
<li>Prepara tu propósito, el hecho, el impacto y la petición.</li>
<li>Practica la conversación con un compañero o frente a la cámara.</li>
<li>Entrega tu reflexión escrita o un video de la práctica.</li>
<li>Revisa la retroalimentación recibida y define tu siguiente mejora.</li>
</ol>
<p>Recuerda que el objetivo es practicar, no lograr una actuación perfecta. Cada intento te da información útil sobre tu estilo.</p>`,
        },
        {
          title: 'Seguimiento de acuerdos y evaluación final del módulo',
          summary: 'Asegura el cumplimiento de acuerdos y comprueba lo aprendido.',
          durationMin: 30,
          completionRule: 'ASSESSMENT',
          content: `<p>Un acuerdo sin seguimiento es una buena intención. Muchos conflictos reaparecen no porque no se haya llegado a un acuerdo, sino porque este no se concretó ni se revisó.</p>
<h2>Características de un acuerdo sólido</h2>
<ul>
<li><strong>Específico</strong>: qué se hará, con qué criterio de calidad.</li>
<li><strong>Con responsables</strong>: quién hace cada cosa.</li>
<li><strong>Con fecha</strong>: cuándo y cuándo se revisará.</li>
<li><strong>Realista</strong>: ambas partes pueden cumplirlo.</li>
<li><strong>Por escrito</strong>: un resumen breve evita malentendidos.</li>
</ul>
<h2>Cómo dar seguimiento</h2>
<p>Agenda una revisión corta, reconoce los avances, pregunta qué obstáculos surgieron y ajusta con flexibilidad. Si hay incumplimientos, vuelve a la conversación con hechos y busca la causa antes de asumir mala fe.</p>
<blockquote>La confianza se construye cumpliendo acuerdos pequeños de manera constante.</blockquote>
<h3>Ejercicio guiado</h3>
<ol>
<li>Toma un acuerdo que hayas hecho recientemente, formal o informal.</li>
<li>Reescríbelo con acción, responsable, fecha de cumplimiento y fecha de revisión.</li>
<li>Define una pregunta que usarás en la revisión para explorar obstáculos.</li>
<li>Prepara una frase para retomar el tema si el acuerdo no se cumplió.</li>
<li>Abre el quiz del módulo para completar esta lección.</li>
</ol>
<p>Al aprobar el quiz habrás cerrado el recorrido de contenido; te esperan el examen final y la autoevaluación para integrar lo aprendido en tu práctica diaria.</p>`,
        },
      ],
      quiz: {
        title: 'Quiz: Conversaciones difíciles y seguimiento',
        description: 'Aplica el marco de conversación difícil, la retroalimentación y el seguimiento de acuerdos.',
        questions: [
          { type: 'MC', competency: 'conversaciones_dificiles', text: 'Para abrir una conversación sobre retrasos reiterados, ¿cuál es la formulación más adecuada?', explanation: 'Describe un hecho observable e invita al diálogo sin etiquetar ni suponer intenciones.', options: [{ text: 'En las últimas dos reuniones llegaste después de iniciar y eso retrasó al grupo; me gustaría entender qué pasa.', correct: true }, { text: 'Siempre llegas tarde porque no te importa el equipo.', correct: false }, { text: 'Todo el mundo está molesto contigo.', correct: false }, { text: 'Quizá deberías ser más responsable.', correct: false }] },
          { type: 'MS', competency: 'conversaciones_dificiles', text: '¿Cuáles son características de una retroalimentación constructiva?', explanation: 'Debe ser oportuna, específica y bidireccional. Acumular reproches para un solo momento la vuelve ineficaz.', options: [{ text: 'Es oportuna y se da cerca del hecho', correct: true }, { text: 'Describe conductas concretas', correct: true }, { text: 'Invita a la otra persona a dar su visión', correct: true }, { text: 'Acumula varios reproches para decirlos de una vez', correct: false }] },
          { type: 'TF', competency: 'resolucion_conflictos', text: 'Un acuerdo verbal general, como "vamos a coordinarnos mejor", es suficiente para evitar que el conflicto reaparezca.', explanation: 'Falso. Un acuerdo debe ser específico, tener responsables, fechas y revisión para poder cumplirse.', options: [{ text: 'Verdadero', correct: false }, { text: 'Falso', correct: true }] },
          { type: 'MC', competency: 'conversaciones_dificiles', text: 'Durante una retroalimentación, la persona se pone a la defensiva y levanta la voz. ¿Qué conviene hacer primero?', explanation: 'Reconocer la emoción y ofrecer una pausa ayuda a bajar la tensión antes de volver al hecho.', options: [{ text: 'Reconocer su emoción, recordar el objetivo común y ofrecer una pausa si hace falta', correct: true }, { text: 'Elevar el tono para que te tome en serio', correct: false }, { text: 'Cancelar la conversación definitivamente', correct: false }, { text: 'Agregar más ejemplos de errores pasados', correct: false }] },
          { type: 'MC', competency: 'resolucion_conflictos', text: 'Una semana después de un acuerdo, ves que no se ha cumplido. ¿Cuál es el mejor paso?', explanation: 'Volver a hablar con hechos y explorar obstáculos permite corregir sin romper la confianza.', options: [{ text: 'Revisar con hechos y preguntar qué obstáculos surgieron', correct: true }, { text: 'Asumir mala fe y escalar de inmediato', correct: false }, { text: 'Olvidar el tema para no generar tensión', correct: false }, { text: 'Comentarlo con terceros antes de hablar con la persona', correct: false }] },
        ],
      },
    },
  ],
  diagnostic: [
    { text: 'Cuando hay un desacuerdo, suelo identificar qué necesita realmente cada parte más allá de lo que exige.', competency: 'resolucion_conflictos' },
    { text: 'Puedo mantener la calma y pensar con claridad cuando una conversación se pone tensa.', competency: 'inteligencia_emocional' },
    { text: 'Logro que la otra persona se sienta escuchada antes de dar mi opinión.', competency: 'escucha_activa' },
    { text: 'Preparo mis intereses y alternativas antes de negociar algo importante.', competency: 'negociacion' },
    { text: 'Abordo a tiempo las conversaciones incómodas en lugar de postergarlas.', competency: 'conversaciones_dificiles' },
  ],
  selfAssessment: [
    { text: 'Después del curso, distingo con mayor claridad las posiciones de los intereses en los conflictos que enfrento.', competency: 'resolucion_conflictos' },
    { text: 'Después del curso, reconozco mis señales de escalada y aplico estrategias para regularme.', competency: 'inteligencia_emocional' },
    { text: 'Después del curso, parafraseo y valido emociones antes de responder en situaciones tensas.', competency: 'escucha_activa' },
    { text: 'Después del curso, planifico mis negociaciones con opciones y una alternativa preparada.', competency: 'negociacion' },
    { text: 'Después del curso, conduzco conversaciones difíciles con un marco claro y doy seguimiento a los acuerdos.', competency: 'conversaciones_dificiles' },
  ],
  finalExam: [
    { type: 'MC', competency: 'resolucion_conflictos', text: 'Dos áreas discuten por la asignación de una persona de apoyo. Al explorar, una necesita ayuda con un cierre contable y la otra con una campaña. ¿Qué paso del análisis permitió descubrirlo?', explanation: 'Preguntar por las necesidades detrás de las demandas permite distinguir posiciones de intereses y abre opciones como repartir tiempos.', options: [{ text: 'Explorar los intereses detrás de las posiciones', correct: true }, { text: 'Clasificar el conflicto como de valores', correct: false }, { text: 'Escalar el caso a un nivel superior', correct: false }, { text: 'Aplicar un estilo de evitación', correct: false }] },
    { type: 'MS', competency: 'resolucion_conflictos', text: '¿Cuáles de las siguientes son causas frecuentes de conflicto en el trabajo?', explanation: 'Los roles poco claros, la información incompleta y la competencia por recursos son causas habituales. Un clima agradable no es causa de conflicto.', options: [{ text: 'Roles poco definidos', correct: true }, { text: 'Información incompleta', correct: true }, { text: 'Competencia por recursos escasos', correct: true }, { text: 'Un clima de confianza y claridad', correct: false }] },
    { type: 'TF', competency: 'inteligencia_emocional', text: 'Nombrar la emoción que sientes puede ayudar a disminuir su intensidad.', explanation: 'Verdadero. Poner palabras a la emoción favorece la regulación y evita actuar por impulso.', options: [{ text: 'Verdadero', correct: true }, { text: 'Falso', correct: false }] },
    { type: 'MC', competency: 'escucha_activa', text: 'Alguien te explica con enojo que su propuesta fue ignorada. ¿Cuál es la mejor primera respuesta?', explanation: 'Reflejar la emoción y parafrasear demuestra escucha antes de aportar tu punto de vista.', options: [{ text: 'Entiendo que te moleste sentir que tu propuesta no fue considerada; cuéntame cómo ocurrió.', correct: true }, { text: 'Tu propuesta no cumplía los criterios, así que no hay problema.', correct: false }, { text: 'No te lo tomes personal.', correct: false }, { text: 'Hablemos mejor cuando estés más tranquilo.', correct: false }] },
    { type: 'MC', competency: 'negociacion', text: '¿Qué función cumple definir tu mejor alternativa antes de negociar?', explanation: 'Te da una referencia para evaluar ofertas y decidir si aceptar o no, sin presión.', options: [{ text: 'Te permite comparar cualquier oferta con lo que harías si no hay acuerdo', correct: true }, { text: 'Garantiza que obtendrás todo lo que pides', correct: false }, { text: 'Evita tener que explicar tus intereses', correct: false }, { text: 'Obliga a la otra parte a ceder', correct: false }] },
    { type: 'MS', competency: 'negociacion', text: 'En una mediación, ¿qué se espera del mediador?', explanation: 'Debe ser imparcial, mantener la confidencialidad y facilitar el diálogo. No impone la solución.', options: [{ text: 'Mantener imparcialidad', correct: true }, { text: 'Resguardar la confidencialidad', correct: true }, { text: 'Facilitar que las partes construyan el acuerdo', correct: true }, { text: 'Decidir quién tiene razón y obligar a cumplir', correct: false }] },
    { type: 'TF', competency: 'conversaciones_dificiles', text: 'En una conversación difícil conviene describir hechos observables y evitar etiquetas sobre la persona.', explanation: 'Verdadero. Los hechos reducen la defensividad; las etiquetas la aumentan.', options: [{ text: 'Verdadero', correct: true }, { text: 'Falso', correct: false }] },
    { type: 'MC', competency: 'conversaciones_dificiles', text: '¿Qué elemento hace que un acuerdo tenga más probabilidad de cumplirse?', explanation: 'Un acuerdo con acciones concretas, responsables y fechas de revisión es verificable y reduce malentendidos.', options: [{ text: 'Que incluya acciones, responsables y fechas de revisión', correct: true }, { text: 'Que sea lo más general posible', correct: false }, { text: 'Que se mantenga solo en la memoria de las partes', correct: false }, { text: 'Que lo defina únicamente quien tiene mayor cargo', correct: false }] },
    { type: 'OPEN', competency: 'resolucion_conflictos', points: 5, text: 'Describe un conflicto real o plausible de tu entorno de trabajo. Analiza su causa, distingue posiciones e intereses y explica cómo conducirías una conversación para llegar a un acuerdo, incluyendo cómo manejarías tus emociones y cómo darías seguimiento.', explanation: 'Una buena respuesta describe el conflicto con hechos, identifica su causa y tipo, diferencia posiciones de intereses de cada parte, propone al menos una opción de beneficio mutuo, explica una estrategia de regulación emocional y técnicas de escucha, y concreta un acuerdo con responsables, fechas y revisión.' },
  ],
  rubric: {
    title: 'Rúbrica de desempeño en resolución de conflictos',
    description: 'Evalúa de forma observable el desempeño en las actividades prácticas de negociación y conversación difícil.',
    criteria: [
      {
        title: 'Análisis del conflicto',
        description: 'Capacidad de identificar causas, intereses y necesidades de las partes.',
        competency: 'resolucion_conflictos',
        levels: [
          'Describe el conflicto de forma confusa y se limita a las posiciones de las partes.',
          'Identifica el problema, pero confunde causas con síntomas y menciona pocos intereses.',
          'Identifica causas e intereses principales de las partes con apoyo de hechos.',
          'Distingue con claridad causas, posiciones e intereses de todas las partes y detecta puntos en común.',
          'Realiza un análisis completo y matizado, propone hipótesis y opciones que integran los intereses de todas las partes.',
        ],
      },
      {
        title: 'Manejo emocional y escucha',
        description: 'Regulación propia y uso de escucha activa durante la interacción.',
        competency: 'inteligencia_emocional',
        levels: [
          'Reacciona de forma impulsiva, interrumpe o ignora las emociones del otro.',
          'Mantiene la calma por momentos, pero interrumpe o responde a la defensiva.',
          'Se mantiene sereno en general y usa algún parafraseo o pregunta abierta.',
          'Regula sus emociones de forma consistente y combina parafraseo, validación y preguntas abiertas.',
          'Regula sus emociones y desescala la tensión de manera ejemplar mediante escucha activa, validación y pausas oportunas.',
        ],
      },
      {
        title: 'Negociación y construcción de acuerdos',
        description: 'Uso de intereses, opciones y criterios para llegar a acuerdos.',
        competency: 'negociacion',
        levels: [
          'Defiende su posición sin considerar a la otra parte; no se llega a ningún acuerdo.',
          'Reconoce algunos intereses, pero ofrece pocas opciones y cede o impone sin criterio.',
          'Plantea intereses y al menos una opción de beneficio mutuo con un acuerdo básico.',
          'Genera varias opciones, usa criterios objetivos y concreta un acuerdo con compromisos claros.',
          'Conduce una negociación estratégica con alternativas preparadas, opciones creativas y un acuerdo específico, verificable y aceptado por todos.',
        ],
      },
      {
        title: 'Conducción de la conversación difícil',
        description: 'Claridad, respeto y estructura al abordar un tema delicado y dar seguimiento.',
        competency: 'conversaciones_dificiles',
        levels: [
          'Usa etiquetas, generalizaciones o reproches y no plantea una petición concreta.',
          'Aborda el tema, pero mezcla hechos con juicios y no define próximos pasos.',
          'Describe hechos e impacto y formula una petición, con estructura básica.',
          'Sigue un marco claro, usa mensajes en primera persona, escucha la respuesta y acuerda próximos pasos.',
          'Conduce la conversación con precisión y empatía, maneja la defensividad y establece un plan de seguimiento específico.',
        ],
      },
    ],
  },
  activities: [
    {
      title: 'Negociación de recursos del equipo',
      description: 'Simulación de una negociación por recursos limitados con ayuda de un mediador.',
      instructions: `Trabajen en grupos de tres personas o realicen la simulación de forma individual con apoyo de un compañero.
1. Lee el escenario y elige uno de los roles: Jefa de área, Coordinador de proyecto o Mediador.
2. Preparación (15 minutos): anota tus intereses, las opciones que podrías ofrecer, un criterio objetivo y tu mejor alternativa si no hay acuerdo. El mediador prepara sus preguntas para cada etapa.
3. Simulación (20 minutos): el mediador abre la sesión, cada parte expone su versión sin interrupciones, se identifican intereses, se generan opciones y se llega a un acuerdo.
4. Registro: entrega en texto o audio un resumen con los intereses identificados, las opciones consideradas y el acuerdo, con responsables y fechas.
5. Reflexión: indica qué técnica del curso te resultó más útil y qué mejorarías.
6. Revisión entre pares: evalúa las entregas de dos compañeros usando la rúbrica y deja un comentario específico y respetuoso.`,
      scenario: 'Un equipo de proyecto necesita ampliar su presupuesto y sumar a una persona de apoyo para cumplir una entrega. La jefa de área debe distribuir recursos limitados entre varios proyectos y el coordinador del proyecto teme perder el plazo. La relación se ha tensado por correos poco claros y expectativas diferentes. Se pide la intervención de un mediador para llegar a un acuerdo viable.',
      roles: [
        { name: 'Jefa de área', description: 'Responsable de distribuir recursos limitados entre varios proyectos; le preocupa la equidad y la sostenibilidad del presupuesto.' },
        { name: 'Coordinador de proyecto', description: 'Necesita recursos adicionales para cumplir una entrega; le preocupa el plazo y la carga de su equipo.' },
        { name: 'Mediador', description: 'Facilita la conversación con neutralidad, ayuda a identificar intereses y a construir un acuerdo concreto, sin imponer soluciones.' },
      ],
      type: 'NEGOTIATION',
      submissionTypes: ['TEXT', 'AUDIO'],
      maxScore: 100,
      peerReview: true,
      peerReviewsRequired: 2,
      competencies: ['negociacion', 'resolucion_conflictos', 'escucha_activa'],
    },
    {
      title: 'Conversación difícil: dar retroalimentación',
      description: 'Práctica de una conversación de retroalimentación sobre un desempeño que debe mejorar.',
      instructions: `1. Lee el escenario y define tu propósito en una frase.
2. Separa hechos observables, impacto y petición. Escribe cada uno de forma breve.
3. Anticipa dos reacciones posibles de la otra persona (por ejemplo, justificación o enojo) y prepara cómo responderás con calma y escucha activa.
4. Practica la conversación con un compañero o frente a una cámara, durante unos cinco minutos. Incluye una pregunta abierta y una frase de validación.
5. Cierra la conversación con un acuerdo concreto: acción, responsable, fecha y momento de revisión.
6. Entrega un video de tu práctica o un texto con el guion y una reflexión sobre qué funcionó, qué te costó y qué harás distinto.`,
      scenario: 'Eres líder de un equipo. Una colega con buen potencial ha entregado en las últimas tres semanas informes con errores y fuera de plazo, lo que afecta el trabajo de otras personas. Es una persona comprometida, pero parece abrumada. Debes tener una conversación privada para dar retroalimentación, entender qué ocurre y acordar una mejora, cuidando la relación.',
      type: 'DIFFICULT_CONVERSATION',
      submissionTypes: ['TEXT', 'VIDEO'],
      maxScore: 100,
      peerReview: false,
      peerReviewsRequired: 0,
      competencies: ['conversaciones_dificiles', 'inteligencia_emocional', 'escucha_activa'],
    },
  ],
  forumDescription: 'Bienvenido al foro del curso: comparte tus aprendizajes, casos prácticos y dudas sobre cómo gestionar conflictos con inteligencia social.',
};
