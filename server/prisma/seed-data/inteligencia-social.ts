import type { CourseContent } from './types.js';

export const content: CourseContent = {
  durationHours: 10,
  subtitle: 'Lee el entorno social, escucha con empatía, construye confianza e influye con ética para colaborar mejor y cuidar tus relaciones profesionales.',
  objectives: [
    'Leer el entorno social y las señales no verbales con atención y sin sobreinterpretar.',
    'Practicar la empatía y la escucha activa para comprender mejor a las demás personas.',
    'Construir rapport y confianza, e influir de manera ética sin recurrir a la manipulación.',
    'Colaborar eficazmente en equipos y cuidar tus relaciones profesionales a lo largo del tiempo.',
    'Aplicar la inteligencia social a situaciones reales de tu entorno laboral.',
  ],
  audience: 'Profesionales, estudiantes, líderes y equipos que desean fortalecer su manera de relacionarse y colaborar. Nivel básico a intermedio.',
  requirements: 'No se requieren estudios previos. Se recomienda tener acceso a un entorno de trabajo, estudio o comunidad donde puedas observar e interactuar con otras personas, y disposición para participar en ejercicios de observación, práctica y reflexión.',
  modules: [
    {
      title: 'Leer el entorno social',
      description: 'Comprende qué es la inteligencia social y desarrolla la observación del contexto y de las señales no verbales.',
      lessons: [
        {
          title: 'Qué es la inteligencia social y por qué importa',
          summary: 'Define el concepto, sus componentes y su valor en la vida profesional.',
          durationMin: 25,
          completionRule: 'VIEW',
          content: `<p>La inteligencia social es la capacidad de comprender a las demás personas y de actuar con acierto en las relaciones. El concepto tiene antecedentes en las primeras décadas del siglo XX, cuando el psicólogo Edward Thorndike habló de una inteligencia para manejarse entre las personas, y fue popularizado más tarde por Daniel Goleman en el contexto de la inteligencia emocional.</p>
<h2>Qué incluye</h2>
<ul>
<li><strong>Conciencia social</strong>: percibir lo que ocurre en las personas y en el entorno.</li>
<li><strong>Empatía</strong>: comprender cómo se siente y cómo piensa alguien más.</li>
<li><strong>Habilidad relacional</strong>: comunicarte, cooperar e influir de forma respetuosa.</li>
<li><strong>Autoconciencia</strong>: saber cómo tu estado y tu conducta afectan a los demás.</li>
</ul>
<h2>No es carisma ni habilidad para agradar</h2>
<p>Una persona puede ser muy simpática y aun así no leer lo que pasa en una reunión. La inteligencia social no consiste en caer bien a todo el mundo, sino en <strong>percibir con precisión y responder de forma adecuada</strong> al contexto y a las personas, sin renunciar a tus valores.</p>
<blockquote>Entender a los demás empieza por mirar con curiosidad, no con prisa por juzgar.</blockquote>
<h3>Por qué importa en el trabajo</h3>
<p>Casi todo lo que hacemos depende de otras personas: pedir apoyo, coordinar tareas, negociar plazos, dar y recibir retroalimentación. Mejorar tu lectura social facilita la colaboración, reduce malentendidos y te ayuda a tomar mejores decisiones.</p>
<h3>Ejercicio guiado</h3>
<ol>
<li>Recuerda una interacción reciente que salió bien y otra que salió mal.</li>
<li>Para cada una, anota qué señales del otro percibiste y cuáles pasaste por alto.</li>
<li>Califica del 1 al 5 tu habilidad actual en cada componente de la lista.</li>
<li>Elige el componente que más quieres desarrollar en este curso y escribe por qué.</li>
</ol>
<p>Conserva tus notas: las usarás para medir tu avance al final del recorrido.</p>`,
        },
        {
          title: 'Señales no verbales: observar sin sobreinterpretar',
          summary: 'Aprende a observar gestos, voz, postura y mirada con cautela y en contexto.',
          durationMin: 30,
          completionRule: 'RESOURCES',
          links: [
            { title: 'Comunicación no verbal (Wikipedia)', url: 'https://es.wikipedia.org/wiki/Comunicaci%C3%B3n_no_verbal', description: 'Panorama general de los canales de la comunicación no verbal. Lectura requerida.', required: true },
            { title: 'Empatía (Wikipedia)', url: 'https://es.wikipedia.org/wiki/Empat%C3%ADa', description: 'Lectura complementaria que anticipa el siguiente módulo.' },
          ],
          content: `<p>Gran parte de lo que comunicamos viaja por canales distintos de las palabras: la expresión del rostro, la mirada, la postura, los gestos, la distancia entre las personas y las características de la voz, como el tono, el ritmo o las pausas. Observarlos mejora tu comprensión de lo que alguien siente o necesita.</p>
<h2>Canales que conviene observar</h2>
<ul>
<li><strong>Rostro y mirada</strong>: expresiones, contacto visual, momentos en que se desvía la vista.</li>
<li><strong>Cuerpo</strong>: postura abierta o cerrada, orientación del torso, tensión en hombros o manos.</li>
<li><strong>Voz</strong>: volumen, velocidad, vacilaciones y silencios.</li>
<li><strong>Espacio</strong>: cuánto se acerca o se aleja una persona, y cómo se ubica en la sala.</li>
</ul>
<h2>Tres reglas para leer con prudencia</h2>
<ol>
<li><strong>Busca la línea de base</strong>: compara a la persona consigo misma. Alguien reservado que habla bajo no está necesariamente molesto.</li>
<li><strong>Observa grupos de señales</strong>, no gestos aislados. Un brazo cruzado puede significar frío, comodidad o desacuerdo.</li>
<li><strong>Considera el contexto y la cultura</strong>: el contacto visual, la cercanía y los gestos significan cosas distintas según el entorno y la persona.</li>
</ol>
<blockquote>Una señal no verbal es una pregunta, no una respuesta: confírmala con la persona.</blockquote>
<h3>Cómo verificar tu lectura</h3>
<p>Convierte tu observación en una pregunta amable: &quot;Noto que te quedaste callado cuando hablamos del plazo, ¿cómo lo ves?&quot;. Así evitas diagnósticos erróneos y muestras interés genuino.</p>
<h3>Ejercicio guiado</h3>
<ol>
<li>Elige una reunión o conversación de esta semana y observa solo la comunicación no verbal durante cinco minutos.</li>
<li>Anota lo que ves, separando el hecho (&quot;se inclinó hacia atrás&quot;) de la interpretación (&quot;está desinteresado&quot;).</li>
<li>Escribe dos interpretaciones alternativas para cada señal.</li>
<li>Completa las lecturas indicadas para cerrar la lección.</li>
</ol>`,
        },
        {
          title: 'Conciencia situacional: leer el contexto y la dinámica del grupo',
          summary: 'Observa normas, roles, alianzas y clima para ajustar tu conducta.',
          durationMin: 30,
          completionRule: 'MANUAL',
          content: `<p>La conciencia situacional es la capacidad de percibir qué está ocurriendo a tu alrededor y qué significa para lo que estás por decir o hacer. Un mismo comentario puede ser oportuno en una conversación informal y desafortunado en una reunión con tensión previa.</p>
<h2>Qué mirar en un entorno social</h2>
<ul>
<li><strong>Normas explícitas e implícitas</strong>: horarios, formalidad, quién habla primero y cómo se toman las decisiones.</li>
<li><strong>Roles y relaciones</strong>: quién tiene autoridad formal, quién influye de manera informal y quiénes colaboran más.</li>
<li><strong>Clima emocional</strong>: ambiente distendido, cansancio, incertidumbre o tensión.</li>
<li><strong>Momento</strong>: qué pasó antes y qué viene después, porque condiciona la disposición de las personas.</li>
</ul>
<h2>Un ciclo simple: observar, interpretar, ajustar</h2>
<ol>
<li><strong>Observa</strong> con atención antes de intervenir, aunque sean solo unos segundos.</li>
<li><strong>Interpreta</strong> con hipótesis abiertas: &quot;Quizá estén preocupados por el recorte&quot;.</li>
<li><strong>Ajusta</strong> tu mensaje, tu tono o el momento elegido.</li>
<li><strong>Revisa</strong> el efecto y corrige si hace falta.</li>
</ol>
<blockquote>Leer el contexto no es adivinar: es reunir indicios y ajustar con humildad.</blockquote>
<h3>Cuidado con los sesgos</h3>
<p>Tendemos a confirmar lo que ya creemos de alguien y a atribuir sus conductas a su carácter más que a su situación. Preguntarte &quot;¿qué otra cosa podría explicar esto?&quot; te protege de conclusiones apresuradas.</p>
<h3>Ejercicio guiado: mapa de una reunión</h3>
<ol>
<li>Dibuja un esquema de una reunión reciente con las personas participantes.</li>
<li>Marca quién habló más, quién habló menos y quién influyó en las decisiones.</li>
<li>Anota el clima emocional que percibiste y dos señales que lo sustentan.</li>
<li>Escribe qué harías distinto en tu forma de intervenir si volvieras a esa reunión.</li>
</ol>
<p>Repite este mapa en otras ocasiones: con la práctica, tu lectura del entorno será más rápida y más precisa.</p>`,
        },
        {
          title: 'Evaluación del módulo 1',
          summary: 'Comprueba lo aprendido sobre lectura del entorno y señales no verbales.',
          durationMin: 20,
          completionRule: 'ASSESSMENT',
          content: `<p>Has recorrido las bases de la inteligencia social: qué es, cómo observar las señales no verbales con prudencia y cómo leer el contexto y la dinámica de un grupo antes de intervenir.</p>
<h2>Antes de iniciar el quiz</h2>
<ul>
<li>Recuerda los componentes: conciencia social, empatía, habilidad relacional y autoconciencia.</li>
<li>Repasa las tres reglas de lectura: línea de base, grupos de señales y contexto.</li>
<li>Ten presente el ciclo observar, interpretar, ajustar y revisar.</li>
<li>Diferencia siempre un hecho observable de una interpretación.</li>
</ul>
<blockquote>Observar bien es la mitad de comprender bien.</blockquote>
<h3>Ejercicio guiado de repaso</h3>
<ol>
<li>Escribe tres señales no verbales que hayas visto hoy y, para cada una, el hecho y dos interpretaciones posibles.</li>
<li>Redacta una pregunta amable para verificar una de esas interpretaciones.</li>
<li>Describe en dos líneas el clima emocional del último grupo en el que participaste.</li>
<li>Identifica un sesgo propio que podría distorsionar tu lectura de una persona.</li>
<li>Cuando termines, abre el quiz del módulo desde la sección de evaluaciones.</li>
</ol>
<p>Esta lección se completa al aprobar el quiz del módulo. Si no alcanzas el puntaje mínimo, revisa las lecciones anteriores y vuelve a intentarlo con calma. Aprovecha la explicación de cada pregunta para entender el razonamiento, no solo la respuesta correcta.</p>
<h3>Cómo estudiar para el quiz</h3>
<p>Relee tus notas de las tres lecciones y busca ejemplos propios para cada concepto. Pregúntate en cada caso: ¿qué hecho observé?, ¿qué interpretación hice?, ¿qué otra explicación era posible? Esa costumbre de cuestionar tu primera lectura es la habilidad central del módulo y te ayudará tanto en el quiz como en tu trabajo diario.</p>
<p>Recuerda que la inteligencia social se entrena con práctica cotidiana: cada conversación es una oportunidad para observar un poco mejor y responder con más criterio.</p>`,
        },
      ],
      quiz: {
        title: 'Quiz: Leer el entorno social',
        description: 'Verifica tu comprensión de la inteligencia social, las señales no verbales y la conciencia situacional.',
        questions: [
          { type: 'MC', competency: 'comunicacion_no_verbal', text: 'Notas que una colega, que normalmente habla con energía, hoy responde en voz baja y evita mirarte. ¿Cuál es la mejor reacción inicial?', explanation: 'El cambio respecto de su línea de base es una pista, no una conclusión. Lo adecuado es verificarla con una pregunta amable.', options: [{ text: 'Preguntarle con amabilidad cómo se encuentra, sin dar por hecho lo que le pasa', correct: true }, { text: 'Concluir que está molesta contigo', correct: false }, { text: 'Ignorarlo porque las señales no verbales no significan nada', correct: false }, { text: 'Comentarlo con el resto del equipo para confirmar tu sospecha', correct: false }] },
          { type: 'TF', competency: 'relaciones_interpersonales', text: 'La inteligencia social consiste principalmente en ser simpático y caerle bien a todo el mundo.', explanation: 'Falso. Se trata de percibir con precisión y responder de forma adecuada al contexto y a las personas, no de agradar a toda costa.', options: [{ text: 'Verdadero', correct: false }, { text: 'Falso', correct: true }] },
          { type: 'MS', competency: 'comunicacion_no_verbal', text: '¿Cuáles son buenas prácticas para interpretar señales no verbales? (Selecciona todas las correctas)', explanation: 'Comparar con la línea de base, observar grupos de señales y considerar el contexto reduce errores. Un gesto aislado no permite un diagnóstico fiable.', options: [{ text: 'Comparar a la persona consigo misma (línea de base)', correct: true }, { text: 'Observar varias señales en conjunto', correct: true }, { text: 'Considerar el contexto y la cultura', correct: true }, { text: 'Deducir un estado emocional a partir de un solo gesto', correct: false }] },
          { type: 'MC', competency: 'inteligencia_emocional', text: '¿Cuál de las siguientes opciones describe mejor el ciclo de la conciencia situacional?', explanation: 'El ciclo propuesto es observar, interpretar con hipótesis abiertas, ajustar la conducta y revisar el efecto.', options: [{ text: 'Observar, interpretar, ajustar y revisar', correct: true }, { text: 'Opinar, defender y concluir', correct: false }, { text: 'Interpretar, actuar y no volver a pensarlo', correct: false }, { text: 'Esperar, callar y evitar', correct: false }] },
          { type: 'TF', competency: 'comunicacion_no_verbal', text: 'Un brazo cruzado siempre indica desacuerdo o rechazo.', explanation: 'Falso. Puede indicar frío, comodidad o hábito; conviene interpretarlo junto con otras señales y con el contexto.', options: [{ text: 'Verdadero', correct: false }, { text: 'Falso', correct: true }] },
        ],
      },
    },
    {
      title: 'Empatía y escucha activa',
      description: 'Desarrolla la empatía y practica una escucha que haga sentir comprendidas a las personas.',
      lessons: [
        {
          title: 'Empatía: comprender sin perderte a ti mismo',
          summary: 'Distingue empatía cognitiva, emocional y compasiva, y aprende a practicarlas.',
          durationMin: 30,
          completionRule: 'MANUAL',
          content: `<p>La empatía es la capacidad de comprender lo que otra persona piensa y siente, y de reconocerlo. No equivale a estar de acuerdo, ni a sentir exactamente lo mismo, ni a resolverle el problema. Es una forma de acercarte a su experiencia con respeto.</p>
<h2>Tres modos de empatía</h2>
<ul>
<li><strong>Cognitiva</strong>: entender la perspectiva del otro, qué piensa y por qué lo ve así.</li>
<li><strong>Emocional</strong>: resonar con lo que siente la persona y reconocerlo.</li>
<li><strong>Compasiva</strong>: además de comprender, sentir el deseo de ayudar y actuar si corresponde.</li>
</ul>
<h2>Empatía no es simpatía ni lástima</h2>
<p>La simpatía mira desde afuera (&quot;qué pena&quot;); la empatía intenta ver desde dentro (&quot;parece que esto te preocupa mucho porque tienes poco margen&quot;). Tampoco es adivinar: es preguntar y escuchar para comprobar tu comprensión.</p>
<blockquote>Comprender la experiencia de alguien no te obliga a aceptar su conclusión.</blockquote>
<h3>Límites sanos</h3>
<p>Absorber en exceso las emociones ajenas agota y reduce tu capacidad de ayudar. Mantén tu centro: reconoce lo que sientes tú, distingue entre lo tuyo y lo del otro, y cuida tus pausas.</p>
<h3>Obstáculos a la empatía</h3>
<ul>
<li>Cambiar el tema hacia tus propias experiencias demasiado pronto.</li>
<li>Minimizar: &quot;no es para tanto&quot;.</li>
<li>Aconsejar antes de comprender.</li>
<li>Prejuzgar por la etiqueta del grupo al que pertenece la persona.</li>
</ul>
<h3>Ejercicio guiado</h3>
<ol>
<li>Piensa en alguien con quien tienes un desacuerdo o poca afinidad.</li>
<li>Escribe su situación desde su punto de vista, en primera persona, durante cinco minutos.</li>
<li>Anota qué necesidad podría estar detrás de su conducta.</li>
<li>Redacta una frase empática que podrías decirle y una pregunta para verificar tu comprensión.</li>
</ol>`,
        },
        {
          title: 'Escucha activa en la práctica',
          summary: 'Usa atención plena, parafraseo, preguntas abiertas y validación para escuchar mejor.',
          durationMin: 35,
          completionRule: 'MANUAL',
          forum: true,
          content: `<p>Escuchar es mucho más que esperar tu turno para hablar. La escucha activa consiste en dar toda tu atención, comprender el contenido y la emoción del mensaje y demostrarlo, de modo que la otra persona se sienta realmente atendida.</p>
<h2>Habilidades clave</h2>
<ul>
<li><strong>Atención plena</strong>: deja el teléfono, mira a la persona y silencia tu diálogo interno.</li>
<li><strong>Lenguaje corporal receptivo</strong>: orientación hacia el otro, asentimientos suaves, gesto relajado.</li>
<li><strong>Parafrasear</strong>: &quot;Si te entiendo bien, lo que más te preocupa es el tiempo&quot;.</li>
<li><strong>Preguntas abiertas</strong>: &quot;¿Cómo viviste ese cambio?&quot;, &quot;¿Qué sería útil para ti?&quot;.</li>
<li><strong>Reflejar emociones</strong>: &quot;Suena a que te sentiste poco valorada&quot;.</li>
<li><strong>Silencio atento</strong>: permitir pausas sin llenarlas de inmediato.</li>
</ul>
<h2>Escuchar en tres niveles</h2>
<ol>
<li><strong>Hechos</strong>: qué ocurrió.</li>
<li><strong>Emociones</strong>: cómo lo vive la persona.</li>
<li><strong>Necesidades</strong>: qué busca o qué le importa en el fondo.</li>
</ol>
<blockquote>Cuando alguien se siente escuchado, suele necesitar menos palabras para explicarse.</blockquote>
<h3>Errores frecuentes</h3>
<p>Interrumpir, terminar las frases del otro, ofrecer soluciones inmediatas, mirar el reloj o responder con un &quot;te entiendo&quot; automático que no refleja nada concreto.</p>
<h3>Ejercicio guiado en parejas</h3>
<ol>
<li>Una persona cuenta durante tres minutos algo que la ocupó esta semana.</li>
<li>La otra solo parafrasea, refleja emociones y hace preguntas abiertas, sin aconsejar.</li>
<li>Quien habló indica qué le hizo sentir comprendido y qué le resultó artificial.</li>
<li>Inviertan los roles.</li>
</ol>
<h3>Escuchar también es cuidar el entorno</h3>
<p>Elige un lugar y un momento adecuados: una conversación importante en un pasillo ruidoso o con prisa transmite poco interés. Si no es posible hablar en ese instante, di con claridad cuándo podrás dedicarle atención completa y cumple ese compromiso.</p>
<p>Comparte en el foro del curso una frase de escucha que te resultó útil y un obstáculo que descubriste en ti.</p>`,
        },
        {
          title: 'Evaluación del módulo 2',
          summary: 'Comprueba tus conocimientos sobre empatía y escucha activa.',
          durationMin: 20,
          completionRule: 'ASSESSMENT',
          content: `<p>En este módulo trabajaste dos habilidades que sostienen buena parte de las relaciones: comprender a las personas desde su perspectiva y demostrarlo con una escucha atenta.</p>
<h2>Puntos clave para repasar</h2>
<ul>
<li>Los tres modos de empatía: cognitiva, emocional y compasiva.</li>
<li>La diferencia entre empatía, simpatía y acuerdo.</li>
<li>Las técnicas de escucha: parafrasear, reflejar, preguntar y permitir el silencio.</li>
<li>Los tres niveles de escucha: hechos, emociones y necesidades.</li>
<li>La importancia de mantener límites sanos para no agotarte.</li>
</ul>
<blockquote>Escuchar bien es una forma de respeto que se nota.</blockquote>
<h3>Ejercicio guiado de repaso</h3>
<ol>
<li>Escribe una conversación reciente en la que no te sentiste escuchado y otra en la que sí. ¿Qué cambió?</li>
<li>Redacta tres preguntas abiertas que podrías usar en tu trabajo esta semana.</li>
<li>Escribe una frase que refleje una emoción sin juzgarla ni minimizarla.</li>
<li>Define una señal personal que te avise cuando estás escuchando &quot;a medias&quot;.</li>
<li>Abre el quiz del módulo y respóndelo con tranquilidad.</li>
</ol>
<h3>Una idea para llevarte</h3>
<p>La escucha activa no requiere tiempo extra, sino otra calidad de atención. Incluso una conversación de dos minutos puede ser un buen espacio de práctica si dejas el teléfono, haces una pregunta abierta y compruebas que entendiste antes de responder.</p>
<p>Piensa también en cómo se conectan ambas habilidades: la empatía te orienta sobre qué le importa a la otra persona, y la escucha te permite confirmarlo. Sin escucha, la empatía queda en suposición.</p>
<p>La lección se marca como completada al aprobar el quiz. Si necesitas repetirlo, revisa la retroalimentación de cada pregunta para detectar qué técnica conviene reforzar antes de pasar al siguiente módulo, donde usarás estas bases para construir confianza e influir de manera ética.</p>`,
        },
      ],
      quiz: {
        title: 'Quiz: Empatía y escucha activa',
        description: 'Aplica la empatía y las técnicas de escucha activa a situaciones cotidianas.',
        questions: [
          { type: 'MC', competency: 'escucha_activa', text: 'Una compañera te dice: "Me asignaron este proyecto sin consultarme y ya tengo demasiado". ¿Qué respuesta aplica mejor la escucha activa?', explanation: 'Parafrasear y reflejar la emoción demuestra comprensión antes de proponer soluciones.', options: [{ text: 'Suena a que te sientes sobrecargada y sin voz en la decisión, ¿es así?', correct: true }, { text: 'No es para tanto, todos tenemos mucho trabajo.', correct: false }, { text: 'Lo que debes hacer es hablar con tu jefe de inmediato.', correct: false }, { text: 'A mí me pasó algo peor el año pasado.', correct: false }] },
          { type: 'TF', competency: 'empatia', text: 'Ser empático implica estar de acuerdo con las conclusiones de la otra persona.', explanation: 'Falso. La empatía comprende la experiencia del otro sin obligarte a aceptar su conclusión.', options: [{ text: 'Verdadero', correct: false }, { text: 'Falso', correct: true }] },
          { type: 'MS', competency: 'escucha_activa', text: '¿Cuáles son técnicas de escucha activa? (Selecciona todas las correctas)', explanation: 'Parafrasear, hacer preguntas abiertas y reflejar emociones son técnicas de escucha activa. Interrumpir para dar la solución la obstaculiza.', options: [{ text: 'Parafrasear lo que dijo la persona', correct: true }, { text: 'Formular preguntas abiertas', correct: true }, { text: 'Reflejar la emoción percibida', correct: true }, { text: 'Interrumpir para dar la solución cuanto antes', correct: false }] },
          { type: 'MC', competency: 'empatia', text: '¿Cuál describe mejor la empatía cognitiva?', explanation: 'La empatía cognitiva consiste en entender la perspectiva de otra persona, es decir, cómo piensa y por qué lo ve así.', options: [{ text: 'Comprender el punto de vista del otro y las razones que lo sustentan', correct: true }, { text: 'Sentir exactamente lo mismo que la otra persona', correct: false }, { text: 'Darle consejos para resolver su problema', correct: false }, { text: 'Evitar cualquier desacuerdo con ella', correct: false }] },
          { type: 'MC', competency: 'empatia', text: 'Después de varias conversaciones intensas sientes que cargas con las emociones de los demás y estás agotado. ¿Qué conviene hacer?', explanation: 'Mantener límites sanos, distinguir lo propio de lo ajeno y cuidar tus pausas te permite seguir ayudando sin agotarte.', options: [{ text: 'Mantener límites sanos y cuidar tus pausas sin dejar de escuchar', correct: true }, { text: 'Dejar de escuchar a las personas para protegerte', correct: false }, { text: 'Absorber aún más las emociones para ser más empático', correct: false }, { text: 'Fingir que nada te afecta', correct: false }] },
        ],
      },
    },
    {
      title: 'Rapport, confianza e influencia ética',
      description: 'Aprende a construir conexión y confianza, e influye en otras personas de forma honesta y respetuosa.',
      lessons: [
        {
          title: 'Construir rapport y confianza',
          summary: 'Genera conexión auténtica y sostén la confianza con coherencia.',
          durationMin: 35,
          completionRule: 'MANUAL',
          content: `<p>El rapport es una sensación de sintonía y comodidad mutua que facilita conversar y colaborar. La confianza es algo más profundo: la expectativa de que la otra persona actuará con buena intención y de manera confiable. El rapport puede surgir en minutos; la confianza se gana con el tiempo.</p>
<h2>Cómo favorecer el rapport</h2>
<ul>
<li><strong>Interés genuino</strong>: haz preguntas sobre la persona y recuerda lo que te cuenta.</li>
<li><strong>Puntos en común</strong>: intereses, experiencias o metas compartidas, sin forzarlos.</li>
<li><strong>Sintonía natural</strong>: adaptar de manera sutil tu ritmo y tono a los del otro, sin imitar de forma mecánica.</li>
<li><strong>Calidez y presencia</strong>: atención plena y una actitud abierta.</li>
</ul>
<h2>Cómo se construye la confianza</h2>
<p>Se apoya en tres pilares: <strong>competencia</strong> (haces bien tu trabajo), <strong>integridad</strong> (eres coherente y honesto) y <strong>benevolencia</strong> (te importa el bienestar de los demás, no solo el tuyo).</p>
<ol>
<li>Cumple lo que prometes, incluso lo pequeño.</li>
<li>Admite errores con rapidez y repara el efecto.</li>
<li>Comparte información con transparencia y oportunidad.</li>
<li>Protege la confidencialidad de lo que se te confía.</li>
</ol>
<blockquote>La confianza se construye en pequeños momentos de coherencia y se pierde en un solo gesto de deslealtad.</blockquote>
<h3>Cuidado con la imitación forzada</h3>
<p>Copiar gestos o frases de alguien para generar cercanía suele percibirse como falso. El rapport duradero nace de la atención sincera, no de una técnica aplicada de forma mecánica.</p>
<h3>Ejercicio guiado</h3>
<ol>
<li>Elige a una persona con quien te gustaría mejorar la relación profesional.</li>
<li>Escribe tres cosas que sabes de ella y dos preguntas de interés genuino que podrías hacerle.</li>
<li>Identifica un compromiso pequeño que puedas cumplir esta semana para reforzar tu confiabilidad.</li>
<li>Anota cómo evaluarás si la conexión mejora.</li>
</ol>`,
        },
        {
          title: 'Influir sin manipular',
          summary: 'Distingue persuasión ética de manipulación y practica una influencia respetuosa.',
          durationMin: 45,
          completionRule: 'ACTIVITY',
          activityIndex: 0,
          liveSession: true,
          content: `<p>Influir es lograr que otra persona considere una idea, una propuesta o un cambio. Es parte natural de la vida laboral: proponer un proyecto, pedir apoyo o convencer a un equipo. La pregunta clave no es si influyes, sino <strong>cómo</strong> lo haces.</p>
<h2>Influencia ética frente a manipulación</h2>
<ul>
<li><strong>Transparencia</strong>: en la influencia ética tu intención es clara; en la manipulación se oculta.</li>
<li><strong>Libertad</strong>: la otra persona puede decir que no sin castigo; el manipulador presiona o engaña.</li>
<li><strong>Beneficio</strong>: buscas un resultado que también sirva a la otra parte, no solo a ti.</li>
<li><strong>Información</strong>: das datos veraces y completos; manipular implica distorsionar o callar lo relevante.</li>
</ul>
<blockquote>Una buena prueba: si la otra persona supiera exactamente lo que estás haciendo y por qué, ¿seguiría sintiéndose respetada?</blockquote>
<h2>Herramientas de influencia respetuosa</h2>
<ol>
<li><strong>Entiende primero</strong> lo que le importa a la otra persona.</li>
<li><strong>Presenta razones claras</strong> y datos verificables que ella pueda valorar.</li>
<li><strong>Vincula tu propuesta con sus intereses</strong>, sin ocultar los tuyos.</li>
<li><strong>Ofrece opciones</strong> y respeta su decisión.</li>
<li><strong>Construye credibilidad</strong> con coherencia y conocimiento.</li>
</ol>
<h3>Señales de manipulación</h3>
<p>Generar culpa, urgencias falsas, halagos interesados, aislar a alguien de otras opiniones o aprovechar sus inseguridades. Si identificas estas tácticas en ti o en otros, detente y replantea el enfoque.</p>
<h3>Ejercicio guiado</h3>
<ol>
<li>Lee el escenario de la actividad &quot;Influir con ética: una propuesta al equipo&quot;.</li>
<li>Elige tu rol y prepara tus intereses, tus argumentos y las preguntas que harás.</li>
<li>Realiza la práctica y registra tu entrega en texto o audio.</li>
<li>Evalúa el trabajo de dos compañeros con la rúbrica.</li>
</ol>
<p>Participa en la sesión en vivo para resolver dudas y observar una demostración antes de entregar.</p>`,
        },
        {
          title: 'Evaluación del módulo 3',
          summary: 'Comprueba lo aprendido sobre rapport, confianza e influencia ética.',
          durationMin: 20,
          completionRule: 'ASSESSMENT',
          content: `<p>En este módulo trabajaste cómo generar conexión, cómo ganarte la confianza y cómo influir de manera respetuosa sin caer en la manipulación.</p>
<h2>Repaso rápido</h2>
<ul>
<li>Diferencia entre rapport (sintonía) y confianza (expectativa de buena intención).</li>
<li>Los tres pilares de la confianza: competencia, integridad y benevolencia.</li>
<li>Los criterios que distinguen la influencia ética de la manipulación: transparencia, libertad, beneficio mutuo e información veraz.</li>
<li>La importancia de entender primero lo que importa al otro.</li>
</ul>
<blockquote>Influir bien es proponer con claridad y dejar libre la decisión.</blockquote>
<h3>Ejercicio guiado de repaso</h3>
<ol>
<li>Escribe un ejemplo de tu entorno donde la confianza se fortaleció y qué conductas lo permitieron.</li>
<li>Redacta una propuesta breve en la que expliques tus intereses y los de la otra parte.</li>
<li>Identifica una táctica de presión que hayas visto o usado y cómo la reemplazarías por una alternativa ética.</li>
<li>Define un compromiso concreto para cumplir esta semana.</li>
<li>Abre el quiz del módulo y respóndelo.</li>
</ol>
<h3>Un recordatorio sobre la ética</h3>
<p>Las técnicas de este módulo son herramientas neutras: lo que las hace éticas o no es la intención con que se usan. Si tu propósito es comprender y proponer algo que también beneficie a la otra persona, tu influencia será legítima. Si buscas aprovecharte de sus debilidades, deja de aplicarlas y revisa tu enfoque.</p>
<p>Recuerda además que la confianza es frágil: si dudas sobre cómo actuar en una situación delicada, elige la opción más transparente.</p>
<p>Esta lección se completa al aprobar el quiz del módulo. Aprovecha los comentarios de cada pregunta para reforzar los conceptos antes del último módulo, donde integraremos todo en la colaboración en equipo y el cuidado de tus relaciones profesionales.</p>`,
        },
      ],
      quiz: {
        title: 'Quiz: Rapport, confianza e influencia ética',
        description: 'Verifica tu comprensión de cómo construir confianza e influir sin manipular.',
        questions: [
          { type: 'MC', competency: 'relaciones_interpersonales', text: '¿Cuáles son los tres pilares de la confianza presentados en el curso?', explanation: 'La confianza se apoya en competencia, integridad y benevolencia.', options: [{ text: 'Competencia, integridad y benevolencia', correct: true }, { text: 'Carisma, rapidez y firmeza', correct: false }, { text: 'Simpatía, humor y puntualidad', correct: false }, { text: 'Jerarquía, experiencia y antigüedad', correct: false }] },
          { type: 'MS', competency: 'persuasion', text: '¿Cuáles de las siguientes características corresponden a una influencia ética? (Selecciona todas las correctas)', explanation: 'Transparencia, libertad para decir que no e información veraz definen la influencia ética. Generar urgencias falsas es manipulación.', options: [{ text: 'La intención es clara y transparente', correct: true }, { text: 'La otra persona puede decir que no sin consecuencias', correct: true }, { text: 'Se ofrece información veraz y relevante', correct: true }, { text: 'Se crea una urgencia falsa para acelerar la decisión', correct: false }] },
          { type: 'TF', competency: 'relaciones_interpersonales', text: 'Imitar de forma mecánica los gestos y las frases de una persona es la mejor manera de construir un rapport duradero.', explanation: 'Falso. La imitación forzada suele percibirse como falsa; el rapport duradero nace de la atención y el interés sinceros.', options: [{ text: 'Verdadero', correct: false }, { text: 'Falso', correct: true }] },
          { type: 'MC', competency: 'persuasion', text: 'Para que un colega considere tu propuesta, ¿cuál es el mejor primer paso?', explanation: 'Entender lo que le importa permite vincular la propuesta con sus intereses sin ocultar los tuyos.', options: [{ text: 'Preguntar y comprender qué le importa en este tema', correct: true }, { text: 'Resaltar solo los beneficios y omitir los riesgos', correct: false }, { text: 'Mencionar que otros ya lo aceptaron aunque no sea cierto', correct: false }, { text: 'Pedirle una respuesta inmediata', correct: false }] },
          { type: 'MC', competency: 'relaciones_interpersonales', text: 'Prometiste enviar un informe el lunes y no podrás cumplir. ¿Qué acción fortalece más la confianza?', explanation: 'Avisar con anticipación, explicar la situación y proponer una nueva fecha demuestra integridad y respeto.', options: [{ text: 'Avisar cuanto antes, explicar el motivo y proponer una nueva fecha', correct: true }, { text: 'Esperar a que te lo reclamen', correct: false }, { text: 'Enviar algo incompleto sin decirlo', correct: false }, { text: 'Culpar a otra área del retraso', correct: false }] },
        ],
      },
    },
    {
      title: 'Colaboración en equipo y relaciones profesionales',
      description: 'Colabora de forma eficaz en equipos diversos y aprende a cuidar tu red de relaciones profesionales a lo largo del tiempo.',
      lessons: [
        {
          title: 'Colaborar en equipos: dinámicas, roles y diversidad',
          summary: 'Comprende cómo funcionan los equipos y qué conductas favorecen la cooperación.',
          durationMin: 35,
          completionRule: 'MANUAL',
          content: `<p>Un equipo no es solo un grupo de personas que trabajan en el mismo lugar: es un conjunto de personas que dependen unas de otras para lograr un resultado común. La inteligencia social ayuda a que esa dependencia sea una fortaleza y no una fuente de fricción.</p>
<h2>Condiciones que favorecen la colaboración</h2>
<ul>
<li><strong>Objetivos compartidos</strong>: todas las personas saben qué se busca y por qué.</li>
<li><strong>Roles claros</strong>: se entiende quién hace qué y quién decide.</li>
<li><strong>Seguridad psicológica</strong>: se puede opinar, preguntar o equivocarse sin temor a ser ridiculizado.</li>
<li><strong>Comunicación abierta</strong>: la información circula a tiempo y en ambos sentidos.</li>
</ul>
<h2>Conductas que suman</h2>
<ol>
<li>Escuchar antes de proponer y reconocer las ideas de otros.</li>
<li>Pedir ayuda y ofrecerla con naturalidad.</li>
<li>Dar crédito de forma justa por los logros colectivos.</li>
<li>Expresar desacuerdos sobre las ideas, no sobre las personas.</li>
<li>Cumplir los compromisos o avisar con tiempo si cambian.</li>
</ol>
<blockquote>Un equipo es más inteligente cuando todas las voces pueden hacerse oír.</blockquote>
<h3>Diversidad de estilos y perspectivas</h3>
<p>Las personas difieren en edad, formación, cultura y forma de trabajar. Esa diversidad enriquece las soluciones, pero exige curiosidad: pregunta cómo prefiere trabajar cada persona en lugar de asumir que todos piensan como tú.</p>
<h3>Ejercicio guiado</h3>
<ol>
<li>Piensa en un equipo del que formes parte y evalúa del 1 al 5 los cuatro factores de la lista.</li>
<li>Identifica quién habla menos en las reuniones y qué podrías hacer para abrir espacio a su voz.</li>
<li>Escribe una conducta tuya que suma y otra que podría restar.</li>
<li>Propón una acción sencilla para mejorar el factor con menor puntaje.</li>
</ol>`,
        },
        {
          title: 'Cuidar y sostener tus relaciones profesionales',
          summary: 'Diseña hábitos para mantener vínculos de confianza y reparar rupturas.',
          durationMin: 45,
          completionRule: 'ACTIVITY',
          activityIndex: 1,
          content: `<p>Las relaciones profesionales no se improvisan cuando se necesitan: se cultivan con constancia. Una red sana está hecha de vínculos de confianza mantenidos en el tiempo, no de contactos acumulados sin relación real.</p>
<h2>Hábitos que sostienen una relación</h2>
<ul>
<li><strong>Contacto regular</strong>: un mensaje breve, una felicitación o un aporte útil, sin esperar a necesitar algo.</li>
<li><strong>Reciprocidad</strong>: ofrecer ayuda, información o reconocimiento, sin llevar una cuenta estricta.</li>
<li><strong>Gratitud concreta</strong>: agradecer indicando qué hizo la persona y qué efecto tuvo.</li>
<li><strong>Respeto por los límites</strong>: de tiempo, de privacidad y de carga de trabajo.</li>
</ul>
<h2>Reparar una relación dañada</h2>
<ol>
<li>Reconoce tu parte con claridad, sin excusas ni justificaciones largas.</li>
<li>Expresa cómo entiendes el impacto en la otra persona.</li>
<li>Pregunta qué necesita para recomponer la confianza.</li>
<li>Propón una acción concreta y cúmplela.</li>
</ol>
<blockquote>Una disculpa sincera sin cambio de conducta vale poco; un cambio constante habla por sí mismo.</blockquote>
<h3>Diversificar y cuidar tu red</h3>
<p>Mantener vínculos con personas de distintas áreas y niveles amplía tu comprensión del entorno y las oportunidades de colaboración. Piensa en cómo puedes aportar valor en cada relación, no solo en qué puedes recibir.</p>
<h3>Ejercicio guiado</h3>
<ol>
<li>Lee el escenario de la actividad &quot;Plan para fortalecer relaciones en el equipo&quot;.</li>
<li>Elabora tu mapa de relaciones e identifica los vínculos que requieren atención.</li>
<li>Diseña un plan concreto con acciones, frecuencias e indicadores sencillos.</li>
<li>Entrega tu plan en texto o con un enlace a tu documento.</li>
</ol>
<h3>Cuando la relación es asimétrica</h3>
<p>Con personas de mayor jerarquía, la cercanía se construye con claridad y confiabilidad: comunicar avances, anticipar problemas y pedir orientación de manera concreta. Con quienes dependen de ti, se construye reconociendo su trabajo y cuidando que tu posición no limite su voz.</p>
<p>Recuerda que cuidar una relación es una práctica pequeña y sostenida, no un gran gesto aislado.</p>`,
        },
        {
          title: 'Cierre e integración: evaluación final del módulo',
          summary: 'Integra lo aprendido en tu práctica diaria y comprueba el módulo.',
          durationMin: 30,
          completionRule: 'ASSESSMENT',
          content: `<p>Llegaste al cierre del recorrido. La inteligencia social no se aprende de una vez: se practica en las pequeñas interacciones de cada día. Este es un buen momento para integrar lo aprendido.</p>
<h2>Ideas que conviene llevarte</h2>
<ul>
<li><strong>Observa antes de interpretar</strong>: separa hechos de suposiciones y verifica con preguntas.</li>
<li><strong>Escucha para comprender</strong>: parafrasea, refleja y deja espacio al silencio.</li>
<li><strong>Construye confianza con coherencia</strong>: cumple, sé transparente y repara cuando fallas.</li>
<li><strong>Influye con respeto</strong>: propón con claridad y deja libre la decisión.</li>
<li><strong>Cuida tus vínculos</strong>: pequeños hábitos sostenidos valen más que grandes gestos aislados.</li>
</ul>
<blockquote>La inteligencia social es, en el fondo, atención sincera al otro puesta en práctica.</blockquote>
<h3>Ejercicio guiado</h3>
<ol>
<li>Escribe tres compromisos de práctica para las próximas cuatro semanas, uno por cada área: observar, escuchar y relacionarte.</li>
<li>Elige a una persona con quien aplicarás de forma intencional una habilidad del curso.</li>
<li>Define cómo notarás si funciona, con una señal concreta y observable.</li>
<li>Agenda una revisión breve de tu avance dentro de un mes.</li>
<li>Abre el quiz del módulo para completar esta lección.</li>
</ol>
<h3>Un plan de práctica sencillo</h3>
<p>Cada semana, elige una sola habilidad para entrenar de forma deliberada: por ejemplo, hacer una pregunta abierta en cada reunión, agradecer de forma concreta una vez al día o revisar tus compromisos pendientes. Al final de la semana anota qué observaste y qué ajustarías. Los cambios pequeños y constantes son los que perduran.</p>
<p>Al aprobar el quiz habrás cerrado el recorrido de contenido; te esperan el examen final y la autoevaluación para medir tu avance respecto del diagnóstico inicial. Recuerda que el objetivo no es la perfección, sino un progreso constante y consciente.</p>`,
        },
      ],
      quiz: {
        title: 'Quiz: Colaboración y relaciones profesionales',
        description: 'Aplica los principios de colaboración en equipo y el cuidado de las relaciones.',
        questions: [
          { type: 'MC', competency: 'relaciones_interpersonales', text: 'En las reuniones de tu equipo, una persona casi nunca habla, aunque se sabe que tiene experiencia. ¿Qué acción favorece más la colaboración?', explanation: 'Abrir espacios seguros y preguntar de forma directa y respetuosa fomenta la participación sin presionar.', options: [{ text: 'Invitarla con una pregunta abierta y crear un clima donde opinar sea seguro', correct: true }, { text: 'Asumir que no tiene nada que aportar', correct: false }, { text: 'Exponerla frente a todos exigiéndole una opinión inmediata', correct: false }, { text: 'Evitar pedirle su punto de vista para no incomodarla', correct: false }] },
          { type: 'MS', competency: 'relaciones_interpersonales', text: '¿Cuáles son condiciones que favorecen la colaboración en un equipo? (Selecciona todas las correctas)', explanation: 'Objetivos compartidos, roles claros y seguridad psicológica favorecen la colaboración. Ocultar información la deteriora.', options: [{ text: 'Objetivos compartidos', correct: true }, { text: 'Roles claros', correct: true }, { text: 'Seguridad psicológica para opinar', correct: true }, { text: 'Reservar información para tener ventaja', correct: false }] },
          { type: 'TF', competency: 'relaciones_interpersonales', text: 'Para sostener una buena red profesional basta con contactar a las personas únicamente cuando se necesita su ayuda.', explanation: 'Falso. Las relaciones se cultivan con contacto regular, reciprocidad y gratitud, sin esperar a necesitar algo.', options: [{ text: 'Verdadero', correct: false }, { text: 'Falso', correct: true }] },
          { type: 'MC', competency: 'empatia', text: 'Cometiste un error que afectó el trabajo de un colega. ¿Cuál es la mejor manera de comenzar a reparar la relación?', explanation: 'Reconocer tu parte, comprender el impacto y proponer una acción concreta son los pasos iniciales de una reparación auténtica.', options: [{ text: 'Reconocer tu parte, reconocer el impacto en él y proponer una acción concreta', correct: true }, { text: 'Minimizar el error y seguir como si nada', correct: false }, { text: 'Dar una explicación larga para justificarte', correct: false }, { text: 'Esperar a que el tiempo lo resuelva', correct: false }] },
          { type: 'MC', competency: 'inteligencia_emocional', text: '¿Qué enfoque describe mejor la expresión de un desacuerdo en un equipo sano?', explanation: 'Un desacuerdo saludable se centra en las ideas y en los hechos, no en descalificar a las personas.', options: [{ text: 'Cuestionar las ideas con respeto, sin atacar a quien las propone', correct: true }, { text: 'Evitar siempre cualquier desacuerdo', correct: false }, { text: 'Comentar el desacuerdo solo a espaldas de la persona', correct: false }, { text: 'Imponer la opinión de quien tiene más antigüedad', correct: false }] },
        ],
      },
    },
  ],
  diagnostic: [
    { text: 'Suelo darme cuenta de los cambios en el ánimo de las personas a partir de su voz, su postura o sus gestos.', competency: 'comunicacion_no_verbal' },
    { text: 'Cuando alguien me habla, logro comprender cómo se siente además de lo que dice.', competency: 'empatia' },
    { text: 'Hago sentir escuchadas a las personas antes de dar mi opinión.', competency: 'escucha_activa' },
    { text: 'Me resulta fácil generar confianza con personas nuevas o con quienes tengo poca afinidad.', competency: 'relaciones_interpersonales' },
    { text: 'Reconozco cómo mi estado emocional influye en la manera en que me relaciono con los demás.', competency: 'inteligencia_emocional' },
  ],
  selfAssessment: [
    { text: 'Después del curso, observo las señales no verbales con más atención y verifico mis interpretaciones antes de concluir.', competency: 'comunicacion_no_verbal' },
    { text: 'Después del curso, comprendo mejor la perspectiva y las emociones de las personas aunque no coincida con ellas.', competency: 'empatia' },
    { text: 'Después del curso, parafraseo, hago preguntas abiertas y reflejo emociones al escuchar.', competency: 'escucha_activa' },
    { text: 'Después del curso, construyo confianza, influyo con transparencia y cuido mis relaciones profesionales con hábitos concretos.', competency: 'relaciones_interpersonales' },
    { text: 'Después del curso, reconozco y regulo mejor mi estado emocional al interactuar con otras personas.', competency: 'inteligencia_emocional' },
  ],
  finalExam: [
    { type: 'MC', competency: 'comunicacion_no_verbal', text: 'Durante una reunión, un compañero se cruza de brazos cuando se menciona un cambio. ¿Cuál es la interpretación más prudente?', explanation: 'Un gesto aislado admite varias explicaciones; conviene observar otras señales, considerar el contexto y verificar con una pregunta.', options: [{ text: 'Es una pista que debo verificar con otras señales, el contexto y una pregunta amable', correct: true }, { text: 'Significa con certeza que rechaza el cambio', correct: false }, { text: 'No aporta ninguna información', correct: false }, { text: 'Indica que está mintiendo', correct: false }] },
    { type: 'MS', competency: 'comunicacion_no_verbal', text: '¿Cuáles de las siguientes son recomendaciones para leer el entorno social con precisión?', explanation: 'Distinguir hechos de interpretaciones, comparar con la línea de base y considerar el contexto reduce errores. Confiar en la primera impresión sin revisarla favorece los sesgos.', options: [{ text: 'Separar los hechos observados de las interpretaciones', correct: true }, { text: 'Comparar a la persona con su comportamiento habitual', correct: true }, { text: 'Considerar el contexto y la cultura', correct: true }, { text: 'Mantener siempre la primera impresión sin revisarla', correct: false }] },
    { type: 'TF', competency: 'empatia', text: 'La empatía implica comprender la experiencia de otra persona sin que ello signifique estar de acuerdo con ella.', explanation: 'Verdadero. Comprender la perspectiva del otro es distinto de aceptar su conclusión.', options: [{ text: 'Verdadero', correct: true }, { text: 'Falso', correct: false }] },
    { type: 'MC', competency: 'escucha_activa', text: 'Una persona te cuenta con frustración que su propuesta fue ignorada. ¿Cuál es la mejor primera respuesta?', explanation: 'Reflejar la emoción y pedir más información demuestra escucha antes de aportar tu punto de vista.', options: [{ text: 'Parece que te frustra sentir que no tomaron en cuenta tu propuesta; cuéntame cómo ocurrió.', correct: true }, { text: 'Seguro tenían buenas razones, no te lo tomes personal.', correct: false }, { text: 'Deberías presentarla de otra forma la próxima vez.', correct: false }, { text: 'A mí también me pasó y fue peor.', correct: false }] },
    { type: 'MS', competency: 'persuasion', text: '¿Qué características distinguen la influencia ética de la manipulación?', explanation: 'La influencia ética es transparente, respeta la libertad de decidir y se basa en información veraz. Ocultar la intención es propio de la manipulación.', options: [{ text: 'Intención transparente', correct: true }, { text: 'Libertad real para aceptar o rechazar', correct: true }, { text: 'Información veraz y relevante', correct: true }, { text: 'Ocultar la intención para evitar resistencia', correct: false }] },
    { type: 'MC', competency: 'relaciones_interpersonales', text: '¿Cuál de las siguientes conductas fortalece más la confianza en una relación profesional a largo plazo?', explanation: 'Cumplir los compromisos, incluso los pequeños, y avisar con tiempo si cambian demuestra integridad y fiabilidad.', options: [{ text: 'Cumplir lo que prometes y avisar con tiempo cuando algo cambie', correct: true }, { text: 'Prometer mucho para generar buena impresión', correct: false }, { text: 'Evitar admitir errores para proteger tu imagen', correct: false }, { text: 'Compartir confidencias ajenas para generar cercanía', correct: false }] },
    { type: 'TF', competency: 'relaciones_interpersonales', text: 'La seguridad psicológica significa que en un equipo se puede opinar o equivocarse sin temor a ser ridiculizado.', explanation: 'Verdadero. Es una condición que favorece la participación, el aprendizaje y la colaboración.', options: [{ text: 'Verdadero', correct: true }, { text: 'Falso', correct: false }] },
    { type: 'MC', competency: 'inteligencia_emocional', text: 'Notas que, tras una discusión, tu irritación te lleva a responder con sarcasmo a un colega que no tuvo que ver. ¿Qué habilidad de la inteligencia social entra en juego?', explanation: 'Reconocer cómo tu estado emocional influye en tu conducta (autoconciencia) te permite regularte y reparar el efecto en los demás.', options: [{ text: 'La autoconciencia, para reconocer el efecto de tu estado en los demás y repararlo', correct: true }, { text: 'La imitación mecánica del tono del otro', correct: false }, { text: 'La evitación total del contacto', correct: false }, { text: 'La competencia por tener la razón', correct: false }] },
    { type: 'OPEN', competency: 'relaciones_interpersonales', points: 5, text: 'Describe una situación real o plausible de tu entorno profesional en la que necesites colaborar con alguien con quien tienes poca afinidad. Explica qué señales observarías, cómo mostrarías empatía y escucha activa, cómo construirías confianza e influirías de manera ética, y qué harías para cuidar la relación a futuro.', explanation: 'Una buena respuesta describe la situación con hechos, distingue observaciones de interpretaciones, incluye técnicas concretas de escucha y empatía (parafraseo, preguntas abiertas, reflejo de emociones), propone acciones para generar confianza e influir con transparencia y respeto, y plantea hábitos concretos para sostener la relación con el tiempo.' },
  ],
  rubric: {
    title: 'Rúbrica de desempeño en inteligencia social',
    description: 'Evalúa de forma observable el desempeño en las actividades prácticas de influencia ética y de cuidado de relaciones.',
    criteria: [
      {
        title: 'Lectura del entorno y de las señales',
        description: 'Capacidad de observar el contexto y las señales de las personas, y de verificar interpretaciones.',
        competency: 'comunicacion_no_verbal',
        levels: [
          'No describe el contexto ni las señales de las personas, o las interpreta como certezas sin fundamento.',
          'Menciona algunas señales, pero mezcla hechos con juicios y no considera explicaciones alternativas.',
          'Distingue hechos de interpretaciones y toma en cuenta el contexto de forma básica.',
          'Observa señales en conjunto, considera el contexto y formula preguntas para verificar sus lecturas.',
          'Realiza una lectura precisa y matizada, contrasta hipótesis alternativas y ajusta su conducta a partir de lo observado.',
        ],
      },
      {
        title: 'Empatía y escucha activa',
        description: 'Comprensión de la perspectiva ajena y uso de técnicas de escucha.',
        competency: 'escucha_activa',
        levels: [
          'Interrumpe, minimiza o ignora lo que la otra persona expresa.',
          'Escucha de forma parcial y usa pocas técnicas; tiende a aconsejar antes de comprender.',
          'Parafrasea o hace preguntas abiertas y reconoce en parte las emociones de la otra persona.',
          'Combina parafraseo, preguntas abiertas y reflejo de emociones, validando la perspectiva ajena.',
          'Escucha en los niveles de hechos, emociones y necesidades, y logra que la otra persona se sienta genuinamente comprendida.',
        ],
      },
      {
        title: 'Rapport, confianza e influencia ética',
        description: 'Capacidad de generar conexión y de proponer ideas con transparencia y respeto.',
        competency: 'relaciones_interpersonales',
        levels: [
          'Presiona, oculta información o ignora los intereses de la otra parte.',
          'Plantea su propuesta con claridad limitada y atiende poco a lo que le importa al otro.',
          'Presenta una propuesta transparente y menciona algunos intereses de la otra persona.',
          'Vincula su propuesta con los intereses de ambas partes, ofrece opciones y respeta la libertad de decidir.',
          'Genera una conexión auténtica y propone con argumentos veraces y opciones creativas, reforzando la confianza mutua.',
        ],
      },
      {
        title: 'Colaboración y cuidado de relaciones',
        description: 'Calidad del plan para colaborar con otros y sostener vínculos profesionales.',
        competency: 'inteligencia_emocional',
        levels: [
          'No presenta acciones concretas para colaborar ni para cuidar las relaciones.',
          'Propone acciones generales, sin responsables, frecuencia ni forma de seguimiento.',
          'Presenta acciones concretas para algunas relaciones, con un seguimiento básico.',
          'Diseña un plan realista con acciones, frecuencias e indicadores, y considera su propio estado emocional.',
          'Presenta un plan integral y sostenible que incluye reciprocidad, reparación de rupturas y una reflexión autocrítica sobre su práctica.',
        ],
      },
    ],
  },
  activities: [
    {
      title: 'Influir con ética: una propuesta al equipo',
      description: 'Simulación en la que se presenta una propuesta de cambio con escucha, transparencia y respeto por la decisión de los demás.',
      instructions: `Trabajen en grupos de tres personas o realicen la simulación de forma individual con apoyo de un compañero.
1. Lee el escenario y elige uno de los roles: Líder de proyecto, Compañera escéptica u Observador.
2. Preparación (15 minutos): anota tus intereses, los datos o argumentos veraces que usarás y las preguntas con las que explorarás lo que le importa a la otra persona. El observador prepara una lista de señales verbales y no verbales a registrar.
3. Simulación (20 minutos): quien propone escucha primero, presenta la propuesta con transparencia, vincula los beneficios con los intereses de ambos y ofrece opciones, respetando la decisión final de la otra persona.
4. Registro: entrega en texto o audio un resumen con las señales observadas, las preguntas realizadas, la propuesta final y la respuesta recibida.
5. Reflexión: indica qué técnica del curso te resultó más útil, qué señales de manipulación evitaste y qué mejorarías.
6. Revisión entre pares: evalúa las entregas de dos compañeros usando la rúbrica y deja un comentario específico y respetuoso.`,
      scenario: 'Un equipo de trabajo utiliza hace años un proceso manual para registrar solicitudes de clientes. La líder de proyecto cree que una herramienta compartida reduciría errores y quiere proponer su adopción. Una compañera con mucha experiencia teme que el cambio aumente su carga y que se pierdan prácticas que funcionan. La relación entre ambas es correcta, pero distante. La líder debe presentar su propuesta con respeto, comprender las preocupaciones de su compañera y evitar presiones.',
      roles: [
        { name: 'Líder de proyecto', description: 'Propone el cambio; busca comprender las preocupaciones de la otra persona y presentar su idea con transparencia y respeto por su decisión.' },
        { name: 'Compañera escéptica', description: 'Tiene experiencia en el proceso actual; le preocupa la carga de trabajo y la pérdida de prácticas útiles. Reacciona de forma realista según cómo la traten.' },
        { name: 'Observador', description: 'Registra señales verbales y no verbales, las técnicas de escucha utilizadas y cualquier conducta que se acerque a la presión o la manipulación.' },
      ],
      type: 'ROLE_PLAY',
      submissionTypes: ['TEXT', 'AUDIO'],
      maxScore: 100,
      peerReview: true,
      peerReviewsRequired: 2,
      competencies: ['persuasion', 'escucha_activa', 'empatia', 'comunicacion_no_verbal'],
    },
    {
      title: 'Plan para fortalecer relaciones en el equipo',
      description: 'Análisis de un caso de equipo y diseño de un plan realista para colaborar mejor y cuidar vínculos profesionales.',
      instructions: `1. Lee el escenario y describe en pocas líneas la situación con hechos observables, separándolos de las interpretaciones.
2. Elabora un mapa de relaciones: identifica a las personas clave, el tipo de vínculo con cada una y su estado actual (sólido, distante o tenso).
3. Para dos relaciones que requieran atención, escribe una hipótesis sobre lo que cada persona podría necesitar y una pregunta con la que la verificarías.
4. Diseña un plan para las próximas cuatro semanas con al menos cinco acciones concretas, su frecuencia y una señal observable para saber si funcionan.
5. Incluye una acción de reparación si existe alguna ruptura de confianza y explica cómo cuidarás tu propio estado emocional durante el proceso.
6. Entrega tu plan en texto o con un enlace a tu documento, e incluye una breve reflexión sobre lo que aprendiste.`,
      scenario: 'Te incorporaste hace tres meses a un equipo de seis personas que trabaja en distintas áreas. Hay buena disposición general, pero la comunicación es fragmentada: dos compañeros casi no se hablan tras un malentendido, una persona nueva casi no participa en las reuniones y tu relación con tu jefe directo es formal y escasa. Necesitas colaborar con todas estas personas para cumplir los objetivos del trimestre. Diseña un plan para mejorar la colaboración y fortalecer tus relaciones profesionales.',
      type: 'CASE_STUDY',
      submissionTypes: ['TEXT', 'LINK'],
      maxScore: 100,
      peerReview: false,
      peerReviewsRequired: 0,
      competencies: ['relaciones_interpersonales', 'empatia', 'inteligencia_emocional'],
    },
  ],
  forumDescription: 'Bienvenido al foro del curso: comparte tus observaciones, casos prácticos y dudas sobre cómo leer el entorno social, escuchar mejor, construir confianza y colaborar con otras personas.',
};
