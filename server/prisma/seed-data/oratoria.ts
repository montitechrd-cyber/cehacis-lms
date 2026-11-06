import type { CourseContent } from './types.js';

export const content: CourseContent = {
  durationHours: 10,
  subtitle: 'Habla con claridad, seguridad y presencia en presentaciones, reuniones y eventos.',
  objectives: [
    'Manejar los nervios y la ansiedad antes y durante una presentación.',
    'Proyectar la voz y el lenguaje corporal con seguridad y naturalidad.',
    'Organizar las ideas en un discurso claro, con inicio, desarrollo y cierre.',
    'Persuadir a una audiencia con mensajes concretos, ejemplos y una llamada a la acción.',
    'Comunicarte con naturalidad en presentaciones, reuniones y eventos.',
  ],
  audience:
    'Personas de nivel básico que quieren perder el miedo a hablar en público: estudiantes, profesionales, emprendedores, docentes y líderes de equipo.',
  requirements:
    'Computador o celular con acceso a internet y cámara o micrófono para grabar tus prácticas; disposición para practicar en voz alta. No se requiere experiencia previa.',
  modules: [
    {
      title: 'Miedo escénico y mentalidad',
      description:
        'Comprende de dónde viene el miedo a hablar en público y aprende a convertir los nervios en energía útil.',
      lessons: [
        {
          title: 'Qué es el miedo escénico y por qué aparece',
          summary: 'Entiende las reacciones del cuerpo ante la exposición y por qué son normales.',
          durationMin: 30,
          completionRule: 'MANUAL',
          forum: true,
          content: `<p>Casi todas las personas sienten algo de tensión antes de hablar frente a otras. El corazón se acelera, las manos sudan, la voz tiembla o la mente parece quedarse en blanco. Esto se conoce como <strong>miedo escénico</strong> y es una reacción natural: el cuerpo interpreta la exposición ante un grupo como una situación importante y se prepara para responder.</p>
<h2>Lo que ocurre en el cuerpo</h2>
<p>Cuando percibes una amenaza social, tu organismo se activa. Esa activación es la misma que te ayuda a estar alerta y a rendir. El problema no es la energía, sino cómo la interpretamos: si pensamos "algo va mal", la tensión crece; si pensamos "estoy listo para actuar", esa misma energía se vuelve concentración.</p>
<h3>Las tres señales más comunes</h3>
<ul>
<li><strong>Físicas:</strong> palpitaciones, respiración corta, temblor, boca seca.</li>
<li><strong>Mentales:</strong> pensamientos como "se van a dar cuenta de que estoy nervioso" o "me voy a equivocar".</li>
<li><strong>De conducta:</strong> hablar muy rápido, evitar la mirada, leer todo de la hoja o evitar hablar.</li>
</ul>
<blockquote>Idea clave: los nervios no desaparecen, se aprenden a dirigir. Sentirlos no significa que lo harás mal.</blockquote>
<h2>El efecto del foco</h2>
<p>Muchas veces creemos que el público ve todo lo que sentimos. En realidad, la audiencia percibe mucho menos de lo que imaginas. Además, la mayoría de las personas que escuchan quiere que el orador tenga éxito y entienda el mensaje.</p>
<h2>Ejercicio guiado: mapa de mis nervios</h2>
<ol>
<li>Recuerda la última vez que hablaste frente a otras personas (clase, trabajo, reunión).</li>
<li>Escribe tres señales físicas que notaste en tu cuerpo.</li>
<li>Escribe dos pensamientos que tenías justo antes de empezar.</li>
<li>Marca del 1 al 10 cuánta tensión sentías al inicio y cuánta al final.</li>
<li>Comparte en el foro una conclusión: ¿bajó la tensión una vez que empezaste a hablar? ¿Qué te ayudó?</li>
</ol>
<p>Este mapa será tu punto de partida: sabrás qué trabajar primero a lo largo del curso.</p>`,
        },
        {
          title: 'Técnicas para calmar el cuerpo y enfocar la mente',
          summary: 'Practica respiración, anclaje y visualización antes de hablar.',
          durationMin: 35,
          completionRule: 'VIEW',
          content: `<p>Si el miedo escénico se manifiesta primero en el cuerpo, la forma más rápida de influir en él es empezar por ahí. Las siguientes técnicas son sencillas, no requieren materiales y se pueden usar minutos antes de hablar.</p>
<h2>1. Respiración diafragmática</h2>
<p>La respiración corta y alta aumenta la sensación de alarma. Respirar hacia el abdomen, de forma lenta, ayuda a recuperar el control.</p>
<ol>
<li>Siéntate o ponte de pie con la espalda larga y los hombros relajados.</li>
<li>Coloca una mano sobre el abdomen.</li>
<li>Inhala por la nariz contando cuatro tiempos; siente cómo el abdomen se expande.</li>
<li>Sostén el aire un instante.</li>
<li>Exhala lentamente por la boca contando seis tiempos.</li>
<li>Repite entre cinco y ocho ciclos.</li>
</ol>
<h2>2. Anclaje con los pies</h2>
<p>Siente el contacto de tus pies con el suelo y reparte el peso de forma pareja. Esta atención al cuerpo saca la mente del "¿qué pensarán?" y la trae al presente.</p>
<h2>3. Visualización breve</h2>
<p>Cierra los ojos y recorre mentalmente los primeros treinta segundos de tu presentación: cómo te presentas, cómo saludas, cómo miras a una persona amiga del grupo. Imaginar un inicio claro reduce la incertidumbre.</p>
<blockquote>Idea clave: lo que se ensaya con calma en la mente y en el cuerpo llega con menos sorpresa al escenario.</blockquote>
<h3>Cuidados previos</h3>
<ul>
<li>Llega con tiempo y reconoce el espacio.</li>
<li>Bebe agua a temperatura ambiente.</li>
<li>Evita cargar la cabeza con información nueva minutos antes.</li>
</ul>
<h2>Ejercicio guiado: rutina de tres minutos</h2>
<ol>
<li>Elige una presentación o reunión próxima, aunque sea pequeña.</li>
<li>Define tu rutina: cinco respiraciones, un minuto de anclaje con los pies y una visualización del inicio.</li>
<li>Pon un temporizador de tres minutos y practícala hoy.</li>
<li>Anota cómo cambió tu nivel de tensión (de 1 a 10) antes y después.</li>
</ol>
<p>Repite la rutina durante la semana hasta que se vuelva un hábito automático.</p>`,
        },
        {
          title: 'Evaluación del módulo 1',
          summary: 'Comprueba lo aprendido sobre miedo escénico y mentalidad.',
          durationMin: 20,
          completionRule: 'ASSESSMENT',
          content: `<p>Has recorrido el primer módulo: entendiste por qué aparece el miedo escénico, cómo se manifiesta y qué técnicas puedes usar para dirigir esa energía. Antes de avanzar, es momento de comprobar qué ideas ya dominas.</p>
<h2>Repaso de ideas centrales</h2>
<ul>
<li>El miedo escénico es una reacción natural ante la exposición; no es una señal de incapacidad.</li>
<li>La activación del cuerpo se puede interpretar como amenaza o como energía para rendir.</li>
<li>Las señales aparecen en tres planos: físico, mental y de conducta.</li>
<li>La respiración lenta, el anclaje con los pies y la visualización ayudan a recuperar el control.</li>
</ul>
<blockquote>Idea clave: no necesitas eliminar los nervios; necesitas una rutina que te ayude a orientarlos a favor de tu mensaje.</blockquote>
<h2>Antes de comenzar la evaluación</h2>
<ol>
<li>Relee tu mapa de nervios del primer ejercicio.</li>
<li>Repasa tu rutina de tres minutos.</li>
<li>Piensa en un ejemplo propio donde aplicarías cada técnica.</li>
<li>Responde el quiz con calma; puedes pensar cada pregunta en función de situaciones reales.</li>
</ol>
<h2>Cómo usar los resultados</h2>
<p>El objetivo de la evaluación no es solo obtener un puntaje, sino identificar qué conceptos debes reforzar. Lee con atención la explicación de cada respuesta, incluso las que acertaste: muchas contienen consejos prácticos que puedes llevar a tu próxima presentación.</p>
<h3>Ejercicio guiado de cierre</h3>
<ol>
<li>Escribe una situación real próxima en la que tendrás que hablar ante otras personas.</li>
<li>Elige las dos técnicas de este módulo que usarás y en qué momento exacto.</li>
<li>Anota una frase que te digas a ti mismo antes de empezar, por ejemplo: "Estoy preparado y tengo algo útil que compartir".</li>
</ol>
<p>Cuando completes la evaluación con el puntaje requerido, esta lección se marcará como completada y podrás continuar con el módulo de voz y dicción, donde empezarás a trabajar el instrumento principal del orador: tu voz.</p>`,
        },
      ],
      quiz: {
        title: 'Quiz: Miedo escénico y mentalidad',
        description: 'Verifica tu comprensión de los nervios al hablar y las técnicas para manejarlos.',
        questions: [
          {
            type: 'MC',
            text: 'Antes de una presentación, notas el corazón acelerado y las manos sudorosas. ¿Cuál es la interpretación más útil?',
            explanation:
              'La activación del cuerpo es una respuesta normal y puede convertirse en energía y concentración si la interpretas como preparación y no como amenaza.',
            competency: 'oratoria',
            options: [
              { text: 'Es una señal de que no estoy preparado y debería cancelar.', correct: false },
              { text: 'Es energía de activación que puedo dirigir a favor de mi mensaje.', correct: true },
              { text: 'Solo les ocurre a las personas sin experiencia y no tiene solución.', correct: false },
              { text: 'Debo ocultarlo por completo o el público lo notará todo.', correct: false },
            ],
          },
          {
            type: 'MS',
            text: 'Selecciona las técnicas que ayudan a calmar el cuerpo antes de hablar.',
            explanation:
              'La respiración abdominal lenta y el anclaje con los pies regulan la activación y centran la atención. Memorizar cada palabra o hablar más rápido tiende a aumentar la tensión.',
            competency: 'oratoria',
            options: [
              { text: 'Respiración abdominal lenta', correct: true },
              { text: 'Anclaje sintiendo los pies en el suelo', correct: true },
              { text: 'Hablar lo más rápido posible para terminar pronto', correct: false },
              { text: 'Memorizar el texto palabra por palabra sin margen de error', correct: false },
            ],
          },
          {
            type: 'TF',
            text: 'El público suele percibir con claridad todo lo que el orador siente por dentro.',
            explanation:
              'En general la audiencia nota mucho menos de lo que el orador imagina. Creer que todos ven tus nervios aumenta la tensión innecesariamente.',
            competency: 'oratoria',
            options: [
              { text: 'Verdadero', correct: false },
              { text: 'Falso', correct: true },
            ],
          },
          {
            type: 'MC',
            text: '¿Qué conducta es típica del miedo escénico en el plano de la conducta?',
            explanation:
              'Leer todo de la hoja, evitar la mirada o acelerar el ritmo son formas de protegerse de la exposición. Reconocerlas es el primer paso para corregirlas.',
            competency: 'comunicacion_verbal',
            options: [
              { text: 'Hacer pausas conscientes y mirar a distintas personas.', correct: false },
              { text: 'Leer todo el texto sin levantar la vista y hablar muy rápido.', correct: true },
              { text: 'Respirar de forma lenta antes de comenzar.', correct: false },
              { text: 'Preparar una frase inicial clara.', correct: false },
            ],
          },
        ],
      },
    },
    {
      title: 'Voz y dicción',
      description:
        'Aprende a usar tu voz como herramienta: volumen, ritmo, pausas y claridad al pronunciar.',
      lessons: [
        {
          title: 'Proyección y volumen de la voz',
          summary: 'Descubre cómo hablar con fuerza sin gritar ni forzar la garganta.',
          durationMin: 35,
          completionRule: 'MANUAL',
          content: `<p>Proyectar la voz no significa gritar. Significa que tu mensaje llegue con claridad a la persona más lejana de la sala, sin esfuerzo excesivo para ti ni incomodidad para el oyente. La clave está en el apoyo respiratorio y la postura.</p>
<h2>El soporte de la voz</h2>
<p>La voz se produce al pasar el aire por las cuerdas vocales. Si el aire viene de una respiración alta y superficial, la voz se debilita o se tensa; si viene del abdomen, suena estable y cálida. Por eso los ejercicios del módulo anterior también son ejercicios de voz.</p>
<h3>Elementos que influyen</h3>
<ul>
<li><strong>Postura:</strong> espalda larga, cuello libre y mentón paralelo al suelo.</li>
<li><strong>Apertura de boca:</strong> pronunciar con la boca ligeramente más abierta mejora el volumen sin esfuerzo.</li>
<li><strong>Intención:</strong> hablar "hacia" el fondo de la sala, no hacia el suelo ni hacia tus notas.</li>
</ul>
<blockquote>Idea clave: el volumen se construye con aire, postura e intención; la garganta no debe hacer el trabajo sola.</blockquote>
<h2>Cuida tu instrumento</h2>
<p>Hidrátate, evita carraspear de forma constante y descansa la voz después de prácticas largas. Si notas dolor o ronquera persistente, consulta a un profesional de la salud.</p>
<h2>Ejercicio guiado: tres niveles de volumen</h2>
<ol>
<li>Elige una frase corta, por ejemplo: "Buenos días, gracias por estar aquí".</li>
<li>Dila en volumen de conversación a un metro de distancia (nivel 1).</li>
<li>Dila como si hablaras con alguien al otro lado de una habitación (nivel 2).</li>
<li>Dila como si te dirigieras al fondo de una sala pequeña (nivel 3), sin gritar y con respiración abdominal.</li>
<li>Grábate con el celular y escucha. ¿Notas diferencia de claridad entre niveles? ¿Cuál usarías en tu próxima presentación?</li>
</ol>
<p>Practica cada día dos o tres minutos hasta que el nivel 3 te resulte cómodo.</p>`,
        },
        {
          title: 'Ritmo, pausas y entonación',
          summary: 'Usa la velocidad, el silencio y la melodía de la voz para dar vida a tu mensaje.',
          durationMin: 35,
          completionRule: 'MANUAL',
          content: `<p>Dos personas pueden decir las mismas palabras y generar efectos muy distintos según cómo las digan. El ritmo, las pausas y la entonación son los recursos que permiten que una idea se entienda, se recuerde y se sienta.</p>
<h2>El ritmo</h2>
<p>Cuando estamos nerviosos hablamos más rápido. Un ritmo moderado transmite seguridad y le da tiempo al oyente para procesar. Aun así, conviene variar: acelerar un poco al narrar y desacelerar para los puntos importantes.</p>
<h2>El poder de la pausa</h2>
<p>La pausa no es un error ni un vacío incómodo. Sirve para:</p>
<ul>
<li>Resaltar una idea importante justo antes o después de decirla.</li>
<li>Permitir que tú respires y pienses la siguiente frase.</li>
<li>Reemplazar las muletillas ("eh", "este", "o sea").</li>
</ul>
<h2>La entonación</h2>
<p>Hablar en un solo tono, aunque el contenido sea excelente, cansa a la audiencia. Subir o bajar la voz, enfatizar palabras clave y variar la melodía mantiene la atención.</p>
<blockquote>Idea clave: lo que dices importa, pero cómo lo dices decide si te escuchan hasta el final.</blockquote>
<h2>Ejercicio guiado: la frase con tres intenciones</h2>
<ol>
<li>Toma la frase: "Este proyecto puede cambiar la forma en que trabajamos".</li>
<li>Léela primero en un tono plano, sin pausas.</li>
<li>Léela de nuevo haciendo una pausa breve después de "proyecto" y otra antes de "cambiar", y enfatizando "cambiar".</li>
<li>Léela una tercera vez con un tono más pausado y cálido, como si hablaras con un compañero.</li>
<li>Grábalas y compáralas. Anota qué versión suena más convincente y por qué.</li>
<li>Marca en un texto propio de un minuto dónde harías pausas y qué palabras enfatizarías.</li>
</ol>
<p>Con la práctica, estas decisiones se vuelven naturales y dejan de sonar ensayadas.</p>`,
        },
        {
          title: 'Dicción, claridad y muletillas',
          summary: 'Mejora la articulación y reduce los vicios del lenguaje con recursos de práctica.',
          durationMin: 40,
          completionRule: 'RESOURCES',
          links: [
            {
              title: 'Oratoria (Wikipedia)',
              url: 'https://es.wikipedia.org/wiki/Oratoria',
              description: 'Panorama general del arte de hablar en público y sus fundamentos.',
              required: true,
            },
            {
              title: 'Comunicación no verbal (Wikipedia)',
              url: 'https://es.wikipedia.org/wiki/Comunicaci%C3%B3n_no_verbal',
              description: 'Lectura complementaria sobre cómo el cuerpo y la voz acompañan el mensaje.',
            },
          ],
          content: `<p>Una buena dicción significa pronunciar las palabras de forma clara y completa, de modo que el oyente no tenga que esforzarse para entender. No se trata de hablar "perfecto" ni de eliminar tu acento natural, sino de articular con cuidado.</p>
<h2>Articulación</h2>
<p>Los problemas más frecuentes son comerse las terminaciones de las palabras, juntar sílabas y hablar con la mandíbula tensa. Mover bien labios y lengua es como calentar un músculo antes del ejercicio.</p>
<h3>Calentamiento diario</h3>
<ul>
<li>Masajea suavemente mandíbula y mejillas.</li>
<li>Haz movimientos amplios con los labios, como una sonrisa y un beso exagerados.</li>
<li>Repite lentamente trabalenguas sencillos, aumentando la velocidad solo cuando salgan limpios.</li>
</ul>
<h2>Las muletillas</h2>
<p>Palabras como "eh", "o sea", "¿verdad?" o "digamos" aparecen cuando el cerebro busca la siguiente idea. No son un delito, pero en exceso distraen. La mejor solución es la pausa en silencio: sustituye el sonido de relleno por un instante de calma.</p>
<blockquote>Idea clave: una pausa silenciosa suena segura; una muletilla suena a duda.</blockquote>
<h2>Ejercicio guiado: detector de muletillas</h2>
<ol>
<li>Lee los recursos de esta lección para reforzar la base teórica.</li>
<li>Graba un audio de un minuto explicando cómo preparas tu día.</li>
<li>Escúchalo con lápiz y papel y marca cada muletilla.</li>
<li>Identifica cuáles son tus dos muletillas más frecuentes.</li>
<li>Graba de nuevo el mismo tema, cambiando cada muletilla por una pausa breve.</li>
<li>Compara ambas versiones y anota cuántas muletillas lograste reducir.</li>
</ol>
<p>Repite el ejercicio con distintos temas durante la semana para consolidar el cambio.</p>
<h3>Trabalenguas para empezar</h3>
<p>Prueba con "tres tristes tigres tragaban trigo en un trigal" y "el cielo está enladrillado, ¿quién lo desenladrillará?". Dilos primero muy despacio, exagerando cada sonido, y después a velocidad normal. El objetivo no es la rapidez, sino que cada sílaba se escuche completa.</p>`,
        },
      ],
      quiz: {
        title: 'Quiz: Voz y dicción',
        description: 'Comprueba lo que sabes sobre proyección, ritmo, pausas y claridad.',
        questions: [
          {
            type: 'MC',
            text: '¿Cuál es la base de una buena proyección de voz?',
            explanation:
              'Proyectar es un trabajo de respiración abdominal, postura e intención. Gritar fuerza la garganta y no mejora la claridad.',
            competency: 'comunicacion_verbal',
            options: [
              { text: 'Forzar la garganta para subir el volumen.', correct: false },
              { text: 'Apoyo respiratorio, buena postura e intención de llegar al fondo.', correct: true },
              { text: 'Hablar lo más rápido posible.', correct: false },
              { text: 'Mantener la boca casi cerrada para no cansarse.', correct: false },
            ],
          },
          {
            type: 'MS',
            text: 'Selecciona las funciones de una pausa bien utilizada.',
            explanation:
              'La pausa destaca ideas, te da tiempo para respirar y sustituye muletillas. No sirve para esconder falta de preparación ni para llenar tiempo sin sentido.',
            competency: 'comunicacion_verbal',
            options: [
              { text: 'Resaltar una idea importante', correct: true },
              { text: 'Reemplazar muletillas y respirar', correct: true },
              { text: 'Ocultar que no se preparó el tema', correct: false },
              { text: 'Reducir la claridad para que el público no cuestione', correct: false },
            ],
          },
          {
            type: 'TF',
            text: 'Hablar siempre en el mismo tono y velocidad ayuda a mantener la atención de la audiencia.',
            explanation:
              'La variedad de entonación y ritmo mantiene el interés. Un tono monótono cansa incluso si el contenido es bueno.',
            competency: 'comunicacion_verbal',
            options: [
              { text: 'Verdadero', correct: false },
              { text: 'Falso', correct: true },
            ],
          },
          {
            type: 'MC',
            text: 'Si notas que dices "eh" cada pocas palabras, ¿qué estrategia es más recomendable?',
            explanation:
              'Cambiar el sonido de relleno por un breve silencio te da tiempo para pensar y suena más seguro. Hablar más rápido o más bajo solo oculta el problema.',
            competency: 'oratoria',
            options: [
              { text: 'Hablar más rápido para que no se noten.', correct: false },
              { text: 'Bajar el volumen cuando aparezcan.', correct: false },
              { text: 'Reemplazarlas por pausas en silencio.', correct: true },
              { text: 'Eliminar todas las pausas del discurso.', correct: false },
            ],
          },
          {
            type: 'MC',
            text: '¿Para qué sirve el calentamiento de labios y lengua antes de hablar?',
            explanation:
              'Calentar los órganos de la articulación facilita pronunciar con claridad, igual que se calienta un músculo antes del ejercicio.',
            competency: 'comunicacion_verbal',
            options: [
              { text: 'Para cambiar el acento natural.', correct: false },
              { text: 'Para preparar la articulación y pronunciar con más claridad.', correct: true },
              { text: 'Para hablar más rápido sin errores.', correct: false },
              { text: 'No tiene ninguna utilidad comprobada.', correct: false },
            ],
          },
        ],
      },
    },
    {
      title: 'Lenguaje corporal y presencia',
      description:
        'Utiliza postura, gestos, mirada y espacio para reforzar lo que dices y proyectar confianza.',
      lessons: [
        {
          title: 'Postura, gestos y movimiento',
          summary: 'Haz que tu cuerpo apoye tu mensaje en lugar de contradecirlo.',
          durationMin: 35,
          completionRule: 'MANUAL',
          liveSession: true,
          content: `<p>Antes de que pronuncies la primera palabra, tu cuerpo ya comunicó algo. La postura, los gestos y el movimiento envían señales sobre tu seguridad, tu interés y tu actitud hacia la audiencia. Cuando esas señales coinciden con tu mensaje, ganas credibilidad; cuando lo contradicen, el público confía en lo que ve.</p>
<h2>La postura base</h2>
<ul>
<li>Pies a la altura de los hombros, peso repartido.</li>
<li>Rodillas sin bloquear, espalda larga, hombros abajo.</li>
<li>Brazos con libertad de movimiento, no cruzados ni escondidos.</li>
</ul>
<h2>Gestos que suman</h2>
<p>Los gestos naturales ayudan a ilustrar tus ideas: abrir las manos para invitar, contar con los dedos los puntos, señalar una dirección. Deben nacer de lo que dices, no de un guion mecánico.</p>
<h3>Distracciones frecuentes</h3>
<ul>
<li>Jugar con el bolígrafo, el anillo o las llaves.</li>
<li>Balancearse de un pie a otro.</li>
<li>Guardar y sacar las manos de los bolsillos constantemente.</li>
</ul>
<h2>Movimiento con propósito</h2>
<p>Moverse puede ayudar a marcar transiciones: un paso al lado al cambiar de tema, un paso adelante para enfatizar. Evita pasearte sin rumbo.</p>
<blockquote>Idea clave: cada movimiento debe tener un propósito; si no suma, mejor quietud tranquila.</blockquote>
<h2>Ejercicio guiado: espejo y cámara</h2>
<ol>
<li>Párate frente a un espejo o apoya tu celular a la altura del pecho para grabarte de cuerpo entero.</li>
<li>Presenta tu nombre y a qué te dedicas durante 30 segundos con las manos relajadas.</li>
<li>Repite incorporando dos gestos intencionales (por ejemplo, abrir las manos y contar con los dedos).</li>
<li>Revisa el video: anota una distracción y un gesto que funcionó.</li>
<li>Elige un hábito corporal para mejorar esta semana.</li>
</ol>
<p>Lleva tus observaciones a la sesión en vivo para recibir comentarios.</p>`,
        },
        {
          title: 'Mirada, expresión facial y conexión con el público',
          summary: 'Conecta con las personas a través del contacto visual y la expresión del rostro.',
          durationMin: 30,
          completionRule: 'MANUAL',
          content: `<p>La conexión con una audiencia se construye en buena medida con la mirada y el rostro. Una sonrisa honesta, una ceja que se levanta al hacer una pregunta o una mirada tranquila hacen que las personas sientan que les hablas a ellas y no al aire.</p>
<h2>El contacto visual</h2>
<p>Mirar a la gente no significa clavar la vista en alguien ni recorrer la sala a gran velocidad. Una técnica útil es completar una idea mirando a una sola persona, y pasar a otra con la siguiente idea.</p>
<h3>Cómo practicarlo</h3>
<ul>
<li>Divide mentalmente el público en zonas (izquierda, centro, derecha).</li>
<li>Dedica una idea completa a cada zona o a cada persona.</li>
<li>Si es una reunión virtual, mira la cámara en los momentos clave.</li>
</ul>
<h2>Expresión facial</h2>
<p>El rostro debe acompañar el contenido: serio cuando abordas un problema, cálido cuando agradeces, animado cuando cuentas una experiencia positiva. Cuando estamos nerviosos tendemos a poner una cara rígida; recordarte respirar y relajar la mandíbula ayuda a soltar.</p>
<blockquote>Idea clave: mirar y sonreír con intención no es actuar; es reconocer que hablas con personas.</blockquote>
<h2>Ejercicio guiado: una idea, una persona</h2>
<ol>
<li>Prepara una presentación de un minuto con tres ideas claras.</li>
<li>Pide a tres personas de confianza (o coloca tres objetos como "público") en distintos puntos de la habitación.</li>
<li>Expón la primera idea a la primera persona, la segunda a la segunda y la tercera a la tercera, sin leer.</li>
<li>Haz una pausa breve entre ideas para cambiar la mirada.</li>
<li>Pide retroalimentación: ¿se sintieron mirados? ¿Se notó tu intención?</li>
<li>Repite hasta que el movimiento de la mirada fluya con naturalidad.</li>
</ol>
<p>En videollamadas, practica dirigir la mirada a la cámara al iniciar y al cerrar cada punto importante.</p>`,
        },
        {
          title: 'Actividad: discurso de 2 minutos',
          summary: 'Graba y entrega un discurso breve aplicando voz, pausas y lenguaje corporal.',
          durationMin: 60,
          completionRule: 'ACTIVITY',
          activityIndex: 0,
          content: `<p>Llegó el momento de integrar lo que has practicado en los módulos de voz y presencia. En esta lección grabarás un discurso de dos minutos y lo entregarás como evidencia de tu avance. No se busca perfección, sino aplicación consciente de las herramientas.</p>
<h2>Qué se espera</h2>
<ul>
<li>Un tema que domines o te interese (una experiencia, una recomendación, una idea que quieras defender).</li>
<li>Una apertura clara, tres ideas y un cierre.</li>
<li>Voz proyectada, pausas intencionales y gestos naturales.</li>
</ul>
<h2>Paso a paso para prepararte</h2>
<ol>
<li>Elige el tema y escribe en una línea qué quieres que el público recuerde.</li>
<li>Anota solo palabras clave (no el texto completo) para cada una de las tres ideas.</li>
<li>Haz tu rutina de respiración de tres minutos.</li>
<li>Ensaya dos veces en voz alta, cronometrando que llegues a unos dos minutos.</li>
<li>Coloca el celular a la altura de los ojos o del pecho, con buena luz de frente y un fondo ordenado.</li>
<li>Graba el discurso de corrido. Puedes repetir hasta tener una versión con la que te sientas satisfecho, sin buscar una toma perfecta.</li>
<li>Revisa tu video buscando: volumen, pausas, muletillas, mirada y gestos.</li>
<li>Entrega el archivo en la plataforma, siguiendo las instrucciones de la actividad.</li>
</ol>
<blockquote>Idea clave: tu mejor discurso no es el más largo ni el más elaborado, sino el que se entiende, se siente y se recuerda.</blockquote>
<h2>Autoevaluación rápida</h2>
<p>Antes de entregar, responde para ti: ¿qué fue lo que más me costó?, ¿qué hice mejor que al inicio del curso? y ¿qué haré distinto la próxima vez? Estas notas te servirán para tu reflexión final.</p>`,
        },
      ],
      quiz: {
        title: 'Quiz: Lenguaje corporal y presencia',
        description: 'Repasa el uso de postura, gestos, mirada y movimiento en una presentación.',
        questions: [
          {
            type: 'MC',
            text: 'Un orador dice que está entusiasmado con su proyecto, pero habla con los brazos cruzados y mirando al suelo. ¿Qué suele ocurrir?',
            explanation:
              'Cuando lo que dices y lo que el cuerpo expresa no coinciden, la audiencia tiende a creer lo que ve. La coherencia entre ambos mejora la credibilidad.',
            competency: 'comunicacion_no_verbal',
            options: [
              { text: 'El público confía más en las palabras que en el cuerpo.', correct: false },
              { text: 'La audiencia percibe incoherencia y suele creer más lo que ve.', correct: true },
              { text: 'No tiene ningún efecto en la percepción.', correct: false },
              { text: 'Aumenta automáticamente la persuasión.', correct: false },
            ],
          },
          {
            type: 'MS',
            text: 'Selecciona las prácticas que mejoran el contacto visual con el público.',
            explanation:
              'Dedicar una idea completa a una persona y distribuir la mirada por zonas genera conexión natural. Recorrer la sala sin detenerse o leer de la pantalla rompe el vínculo.',
            competency: 'comunicacion_no_verbal',
            options: [
              { text: 'Dedicar una idea completa a una persona antes de pasar a otra', correct: true },
              { text: 'Repartir la mirada entre distintas zonas de la sala', correct: true },
              { text: 'Mirar rápido a todos sin detenerse en nadie', correct: false },
              { text: 'Leer de la pantalla durante toda la presentación', correct: false },
            ],
          },
          {
            type: 'TF',
            text: 'Todo movimiento durante una presentación debe tener un propósito, como marcar una transición o enfatizar una idea.',
            explanation:
              'El movimiento intencional apoya el mensaje, mientras que pasearse sin rumbo o balancearse distrae a la audiencia.',
            competency: 'expresion_corporal',
            options: [
              { text: 'Verdadero', correct: true },
              { text: 'Falso', correct: false },
            ],
          },
          {
            type: 'MC',
            text: '¿Qué hábito corporal conviene evitar en una presentación?',
            explanation:
              'Jugar con objetos o balancearse son distracciones que desvían la atención del mensaje. Los gestos que ilustran las ideas, en cambio, suman.',
            competency: 'expresion_corporal',
            options: [
              { text: 'Abrir las manos para invitar a la audiencia.', correct: false },
              { text: 'Contar con los dedos los puntos clave.', correct: false },
              { text: 'Balancearse constantemente de un pie al otro.', correct: true },
              { text: 'Mantener los hombros relajados.', correct: false },
            ],
          },
        ],
      },
    },
    {
      title: 'Estructura del discurso y persuasión',
      description:
        'Organiza tus ideas en un discurso claro y aprende a persuadir con mensajes concretos y ejemplos.',
      lessons: [
        {
          title: 'Inicio, desarrollo y cierre',
          summary: 'Construye un discurso con una estructura simple que cualquier audiencia pueda seguir.',
          durationMin: 40,
          completionRule: 'MANUAL',
          content: `<p>Un buen discurso no depende de frases rebuscadas, sino de una estructura que el oyente pueda seguir sin perderse. La más sencilla, y también la más efectiva, tiene tres partes: inicio, desarrollo y cierre.</p>
<h2>El inicio: captar la atención</h2>
<p>Los primeros segundos deciden si te escuchan con interés. Puedes abrir con una pregunta, una breve historia, un dato concreto o una situación que el público reconozca. Después, presenta con claridad de qué hablarás.</p>
<h2>El desarrollo: tres ideas</h2>
<p>La mente retiene mejor pocas ideas bien explicadas. Limítate a dos o tres puntos principales y apoya cada uno con un ejemplo o una explicación breve.</p>
<h3>Cómo ordenar las ideas</h3>
<ul>
<li><strong>De lo general a lo particular:</strong> parte del panorama y baja al detalle.</li>
<li><strong>Cronológico:</strong> pasado, presente y futuro.</li>
<li><strong>Problema, causa y solución:</strong> útil en presentaciones de trabajo.</li>
</ul>
<h2>El cierre: dejar huella</h2>
<p>Recuerda la idea central y termina con una frase memorable o una invitación a la acción. Evita cerrar con "eso es todo" o disculparte por el tiempo.</p>
<blockquote>Idea clave: si no puedes decir tu mensaje principal en una sola frase, todavía no está listo para presentarse.</blockquote>
<h2>Ejercicio guiado: el esquema de una hoja</h2>
<ol>
<li>Elige un tema que podrías presentar en tres minutos.</li>
<li>Escribe en una frase el mensaje principal.</li>
<li>Define cómo abrirás (pregunta, historia o dato).</li>
<li>Anota tres ideas con un ejemplo breve para cada una.</li>
<li>Redacta la frase final y la invitación a la acción.</li>
<li>Explica el esquema en voz alta a alguien de confianza y pregúntale cuál fue el mensaje que entendió.</li>
</ol>
<p>Si su respuesta coincide con tu mensaje principal, tu estructura funciona.</p>`,
        },
        {
          title: 'Persuadir con claridad, ejemplos y emoción',
          summary: 'Combina razones, historias y una llamada a la acción para convencer con honestidad.',
          durationMin: 40,
          completionRule: 'MANUAL',
          content: `<p>Persuadir no es manipular. Es presentar tus ideas de modo que la otra persona pueda entenderlas, valorarlas y decidir con libertad. Una persuasión ética se apoya en tres elementos: razones sólidas, ejemplos concretos y conexión humana.</p>
<h2>Razones: el porqué</h2>
<p>Explica con claridad por qué lo que propones es útil o importante. Una buena razón es específica y relevante para esa audiencia. Pregúntate: ¿qué gana esta gente si me hace caso?</p>
<h2>Ejemplos e historias</h2>
<p>Una historia breve vale más que una lista de afirmaciones. Un caso real o verosímil, con personajes y una situación, hace que la idea se vuelva memorable. Por ejemplo, para defender la puntualidad en reuniones, puedes contar cómo un equipo perdía veinte minutos cada día esperando a quienes llegaban tarde.</p>
<h2>Conexión emocional</h2>
<p>Las decisiones no se toman solo con la lógica. Reconoce lo que siente tu audiencia, usa un lenguaje cercano y demuestra interés genuino. La credibilidad se construye siendo honesto, aceptando límites y evitando exagerar.</p>
<blockquote>Idea clave: se persuade mejor cuando el público siente que lo entiendes, que tienes buenas razones y que te importa su beneficio.</blockquote>
<h2>La llamada a la acción</h2>
<p>Termina diciendo con claridad qué esperas: aprobar una propuesta, probar una idea, cambiar un hábito. Mientras más concreta sea la acción, más fácil será que alguien la realice.</p>
<h2>Ejercicio guiado: del argumento a la acción</h2>
<ol>
<li>Elige una idea que quieras defender ante un grupo.</li>
<li>Escribe dos razones concretas y explica a quién benefician.</li>
<li>Prepara una historia de treinta segundos que ilustre una de las razones.</li>
<li>Redacta una llamada a la acción en una sola frase.</li>
<li>Exponlo en voz alta en menos de dos minutos y revisa si algo suena exagerado o confuso.</li>
</ol>
<p>Ajusta el texto hasta que suene claro, honesto y cercano.</p>`,
        },
        {
          title: 'Actividad: plan de mi presentación',
          summary: 'Diseña por escrito tu presentación y compártela para recibir comentarios de tus pares.',
          durationMin: 60,
          completionRule: 'ACTIVITY',
          activityIndex: 1,
          content: `<p>En esta última lección reunirás lo aprendido en un plan completo para una presentación real o realista. El plan es tu mapa: te ayuda a decidir qué decir, cómo decirlo y qué hacer con tu voz y tu cuerpo. Además, lo compartirás para recibir retroalimentación de tus compañeros.</p>
<h2>Qué debe incluir tu plan</h2>
<ul>
<li>Audiencia, contexto y objetivo de la presentación.</li>
<li>Mensaje principal en una frase.</li>
<li>Inicio, tres ideas con ejemplos y cierre con llamada a la acción.</li>
<li>Decisiones de voz: dónde harás pausas, qué palabras enfatizarás.</li>
<li>Decisiones de cuerpo: gestos, movimiento y manejo de la mirada.</li>
<li>Tu rutina de calma previa y qué harás si te quedas en blanco.</li>
</ul>
<h2>Paso a paso</h2>
<ol>
<li>Define quién te escuchará y qué quieres que piensen, sientan o hagan después.</li>
<li>Escribe el mensaje principal y revisa que se entienda en menos de diez segundos.</li>
<li>Arma el esquema de inicio, desarrollo y cierre.</li>
<li>Anota dos recursos de persuasión: una historia y una razón concreta.</li>
<li>Agrega indicaciones de voz y cuerpo en los momentos clave.</li>
<li>Prepara un plan B para un imprevisto (por ejemplo, fallo del proyector o pérdida del hilo).</li>
<li>Entrega el plan como texto o archivo y revisa el de tus compañeros con una mirada constructiva.</li>
</ol>
<blockquote>Idea clave: improvisar con naturalidad es el resultado de una preparación cuidadosa, no de la falta de ella.</blockquote>
<p>Al dar comentarios a otras personas, señala primero lo que funciona, luego una sugerencia concreta. Esa práctica también mejora tu criterio como orador.</p>
<h3>Lista de verificación final</h3>
<ul>
<li>¿Mi mensaje principal cabe en una sola frase?</li>
<li>¿Cada idea tiene un ejemplo o una razón concreta?</li>
<li>¿Mi cierre invita a hacer algo específico?</li>
<li>¿Tengo una rutina de calma y un plan B?</li>
</ul>`,
        },
      ],
      quiz: {
        title: 'Quiz: Estructura del discurso y persuasión',
        description: 'Revisa cómo organizar un discurso y persuadir con claridad y honestidad.',
        questions: [
          {
            type: 'MC',
            text: '¿Cuántas ideas principales se recomienda desarrollar en un discurso breve?',
            explanation:
              'Dos o tres ideas bien explicadas se recuerdan mejor que una lista larga. Más ideas diluyen el mensaje y cansan a la audiencia.',
            competency: 'oratoria',
            options: [
              { text: 'Todas las que se me ocurran.', correct: false },
              { text: 'Dos o tres, con un ejemplo cada una.', correct: true },
              { text: 'Ocho o diez para parecer completo.', correct: false },
              { text: 'Ninguna: solo conviene improvisar.', correct: false },
            ],
          },
          {
            type: 'MS',
            text: 'Selecciona los elementos de una persuasión ética y eficaz.',
            explanation:
              'Las razones concretas, las historias y una llamada a la acción clara ayudan a decidir con libertad. Exagerar o presionar daña la credibilidad.',
            competency: 'persuasion',
            options: [
              { text: 'Razones concretas y relevantes para la audiencia', correct: true },
              { text: 'Historias o ejemplos que ilustren la idea', correct: true },
              { text: 'Exagerar los beneficios para convencer más rápido', correct: false },
              { text: 'Presionar para que decidan sin tiempo de pensar', correct: false },
            ],
          },
          {
            type: 'TF',
            text: 'Un buen cierre puede recordar la idea central y proponer una acción concreta.',
            explanation:
              'Cerrar con la idea central y una invitación clara ayuda a que el mensaje se recuerde y se traduzca en acción.',
            competency: 'persuasion',
            options: [
              { text: 'Verdadero', correct: true },
              { text: 'Falso', correct: false },
            ],
          },
          {
            type: 'MC',
            text: 'Tu apertura debe captar la atención. ¿Cuál es una opción adecuada?',
            explanation:
              'Una pregunta, una historia breve o un dato concreto despiertan interés. Disculparse o enumerar el protocolo suele restar energía desde el inicio.',
            competency: 'oratoria',
            options: [
              { text: 'Comenzar disculpándote por no ser buen orador.', correct: false },
              { text: 'Abrir con una pregunta o historia breve relacionada con el tema.', correct: true },
              { text: 'Leer en voz alta toda la agenda sin pausas.', correct: false },
              { text: 'Empezar directamente con los datos más técnicos.', correct: false },
            ],
          },
          {
            type: 'MC',
            text: '¿Qué indica que tu mensaje principal está claro?',
            explanation:
              'Si una persona puede repetir tu mensaje central con sus palabras, tu estructura funciona. La extensión o el uso de términos complejos no garantizan claridad.',
            competency: 'comunicacion_verbal',
            options: [
              { text: 'Que el discurso dura más de lo esperado.', correct: false },
              { text: 'Que usas términos muy técnicos.', correct: false },
              { text: 'Que alguien puede repetirlo con sus palabras después de escucharte.', correct: true },
              { text: 'Que incluyes muchos datos en cada diapositiva.', correct: false },
            ],
          },
        ],
      },
    },
  ],
  diagnostic: [
    { text: 'Me siento seguro/a al hablar frente a un grupo de personas.', competency: 'oratoria' },
    { text: 'Puedo controlar mis nervios cuando debo hablar en público.', competency: 'oratoria' },
    { text: 'Mi voz se escucha clara y con buen volumen cuando presento un tema.', competency: 'comunicacion_verbal' },
    { text: 'Uso mi postura, mis gestos y mi mirada para reforzar lo que digo.', competency: 'expresion_corporal' },
    { text: 'Logro que mis ideas se entiendan y convenzan cuando las expongo.', competency: 'persuasion' },
  ],
  selfAssessment: [
    { text: 'Después del curso, reconozco mis señales de nervios y sé aplicar técnicas para manejarlas.', competency: 'oratoria' },
    { text: 'Después del curso, uso pausas, ritmo y entonación para que mi voz sea clara y expresiva.', competency: 'comunicacion_verbal' },
    { text: 'Después del curso, cuido mi postura y mantengo contacto visual con mi audiencia.', competency: 'comunicacion_no_verbal' },
    { text: 'Después del curso, mis gestos y movimientos tienen un propósito y apoyan mi mensaje.', competency: 'expresion_corporal' },
    { text: 'Después del curso, organizo mis presentaciones con inicio, desarrollo y cierre, e incluyo una llamada a la acción.', competency: 'persuasion' },
  ],
  finalExam: [
    {
      type: 'MC',
      text: 'Faltan cinco minutos para tu presentación y sientes el corazón acelerado. ¿Qué es lo más útil que puedes hacer?',
      explanation:
        'La respiración abdominal lenta y el anclaje con los pies ayudan a regular la activación. Memorizar a última hora o intentar suprimir lo que sientes suele aumentar la tensión.',
      competency: 'oratoria',
      options: [
        { text: 'Repasar a toda velocidad el texto completo.', correct: false },
        { text: 'Hacer varias respiraciones abdominales lentas y sentir los pies en el suelo.', correct: true },
        { text: 'Convencerte de que no estás nervioso y evitar pensar en ello.', correct: false },
        { text: 'Pedir que cambien tu turno al final del día.', correct: false },
      ],
    },
    {
      type: 'MS',
      text: 'Selecciona los elementos que mejoran la proyección y claridad de tu voz.',
      explanation:
        'El apoyo respiratorio y la apertura de boca mejoran el volumen y la articulación sin forzar la garganta. Hablar con la mandíbula tensa o gritar perjudica la claridad.',
      competency: 'comunicacion_verbal',
      options: [
        { text: 'Respiración abdominal y buena postura', correct: true },
        { text: 'Abrir la boca y articular con cuidado', correct: true },
        { text: 'Gritar para que llegue al fondo', correct: false },
        { text: 'Mantener la mandíbula tensa y los dientes apretados', correct: false },
      ],
    },
    {
      type: 'TF',
      text: 'Las pausas en silencio pueden reemplazar muletillas y hacer que el orador suene más seguro.',
      explanation:
        'Una pausa te da tiempo para pensar y respirar, y destaca las ideas. Las muletillas, en exceso, suenan a duda.',
      competency: 'comunicacion_verbal',
      options: [
        { text: 'Verdadero', correct: true },
        { text: 'Falso', correct: false },
      ],
    },
    {
      type: 'MC',
      text: 'Un orador mueve sin parar un bolígrafo y camina de un lado a otro sin rumbo. ¿Cuál es el principal efecto?',
      explanation:
        'Los movimientos sin propósito distraen del mensaje. Los gestos y desplazamientos deben apoyar las ideas, no competir con ellas.',
      competency: 'expresion_corporal',
      options: [
        { text: 'Se percibe más dinámico y la audiencia lo valora por ello.', correct: false },
        { text: 'Distrae a la audiencia y resta atención al contenido.', correct: true },
        { text: 'No tiene ningún efecto en el público.', correct: false },
        { text: 'Aumenta la claridad del mensaje.', correct: false },
      ],
    },
    {
      type: 'MS',
      text: 'Selecciona las prácticas que ayudan a conectar con el público a través del lenguaje corporal.',
      explanation:
        'Mirar a las personas por ideas completas y mantener una expresión acorde al contenido genera confianza. Evitar la mirada o mostrar rigidez total crea distancia.',
      competency: 'comunicacion_no_verbal',
      options: [
        { text: 'Dedicar cada idea a una persona o zona del público', correct: true },
        { text: 'Hacer que el rostro acompañe el tono del mensaje', correct: true },
        { text: 'Evitar la mirada para no ponerse nervioso', correct: false },
        { text: 'Mantener los brazos cruzados todo el tiempo', correct: false },
      ],
    },
    {
      type: 'MC',
      text: '¿Cuál es la forma más adecuada de comprobar que tu mensaje principal es claro?',
      explanation:
        'Si una persona puede explicarlo con sus palabras, el mensaje está claro. Aumentar los datos o la duración no garantiza comprensión.',
      competency: 'oratoria',
      options: [
        { text: 'Agregar más diapositivas con texto detallado.', correct: false },
        { text: 'Extender la presentación para cubrir más puntos.', correct: false },
        { text: 'Pedir a alguien que lo repita con sus propias palabras tras escucharte.', correct: true },
        { text: 'Usar un vocabulario más técnico y complejo.', correct: false },
      ],
    },
    {
      type: 'TF',
      text: 'Persuadir de forma ética implica exagerar los beneficios para lograr que la audiencia decida rápido.',
      explanation:
        'La persuasión ética se basa en razones honestas, ejemplos reales y respeto por la libertad de decisión. Exagerar daña la credibilidad.',
      competency: 'persuasion',
      options: [
        { text: 'Verdadero', correct: false },
        { text: 'Falso', correct: true },
      ],
    },
    {
      type: 'MC',
      text: '¿Cuál de estas es una llamada a la acción bien formulada?',
      explanation:
        'Una llamada a la acción efectiva es concreta, medible y fácil de realizar. Las frases vagas no orientan a nadie.',
      competency: 'persuasion',
      options: [
        { text: 'Ojalá piensen en esto algún día.', correct: false },
        { text: 'Gracias por su atención, eso es todo.', correct: false },
        { text: 'Les propongo que prueben esta rutina de cinco minutos desde el lunes y compartan su experiencia el viernes.', correct: true },
        { text: 'Pueden hacer lo que consideren, no es tan importante.', correct: false },
      ],
    },
    {
      type: 'OPEN',
      text: 'Imagina que debes presentar durante tres minutos, ante tu equipo de trabajo o tu clase, una propuesta que te importa. Describe cómo prepararías y entregarías tu presentación: cómo manejarías los nervios, cómo estructurarías el mensaje y qué harías con tu voz y tu cuerpo.',
      explanation:
        'Una buena respuesta incluye: (1) una rutina concreta para manejar los nervios, como respiración abdominal y anclaje; (2) un mensaje principal en una frase y una estructura de inicio, desarrollo con dos o tres ideas y cierre con llamada a la acción; (3) decisiones de voz, como volumen, ritmo, pausas y énfasis; (4) decisiones de lenguaje corporal, como postura, gestos y contacto visual; y (5) algún recurso de persuasión honesto, como una historia o una razón concreta para esa audiencia.',
      competency: 'oratoria',
      points: 5,
    },
  ],
  rubric: {
    title: 'Rúbrica de Oratoria',
    description:
      'Evalúa el desempeño del participante al preparar y entregar una presentación oral, desde el manejo de los nervios hasta la estructura y la persuasión.',
    criteria: [
      {
        title: 'Manejo de la ansiedad y presencia',
        description: 'Capacidad de controlar los nervios y proyectar seguridad al hablar.',
        competency: 'oratoria',
        levels: [
          'Se muestra muy tenso, interrumpe su discurso con frecuencia y no aplica ninguna técnica de calma.',
          'Muestra tensión visible durante buena parte de la presentación y aplica técnicas de forma esporádica.',
          'Mantiene la compostura en general, con algunos momentos de tensión que logra controlar.',
          'Se muestra tranquilo y seguro, y recupera el control con rapidez si surge un imprevisto.',
          'Proyecta calma y confianza durante toda la presentación y convierte la energía de los nervios en entusiasmo evidente.',
        ],
      },
      {
        title: 'Voz y dicción',
        description: 'Uso de volumen, ritmo, pausas, entonación y claridad al pronunciar.',
        competency: 'comunicacion_verbal',
        levels: [
          'La voz es inaudible o confusa; abundan las muletillas y no hay pausas.',
          'Se le escucha con dificultad en algunos tramos; el ritmo es uniforme y las muletillas son frecuentes.',
          'Volumen adecuado y pronunciación comprensible; usa algunas pausas y presenta pocas muletillas.',
          'Voz clara y proyectada, con ritmo variado, pausas intencionales y muletillas casi ausentes.',
          'Voz expresiva y muy clara, con entonación, ritmo y pausas que resaltan cada idea clave sin muletillas.',
        ],
      },
      {
        title: 'Lenguaje corporal',
        description: 'Coherencia entre mensaje, postura, gestos, mirada y movimiento.',
        competency: 'expresion_corporal',
        levels: [
          'Postura cerrada o rígida, sin contacto visual y con movimientos que distraen.',
          'Gestos y mirada limitados; algunas distracciones frecuentes, como jugar con objetos.',
          'Postura estable y contacto visual ocasional; gestos naturales aunque poco variados.',
          'Postura abierta, mirada dirigida a distintas personas y gestos que acompañan las ideas.',
          'Presencia sólida: postura abierta, contacto visual por ideas completas y gestos y movimientos con propósito claro.',
        ],
      },
      {
        title: 'Estructura y persuasión del mensaje',
        description: 'Organización de las ideas y capacidad de convencer con razones, ejemplos y llamada a la acción.',
        competency: 'persuasion',
        levels: [
          'El mensaje no se entiende; no hay inicio, desarrollo ni cierre identificables.',
          'La estructura es confusa; hay ideas sueltas sin ejemplos ni conclusión clara.',
          'Presenta inicio, desarrollo y cierre reconocibles, con al menos una razón o ejemplo.',
          'Mensaje principal claro, ideas ordenadas con ejemplos relevantes y una llamada a la acción concreta.',
          'Mensaje memorable y bien estructurado, con razones sólidas, historia efectiva y llamada a la acción clara y honesta.',
        ],
      },
    ],
  },
  activities: [
    {
      title: 'Discurso de 2 minutos',
      description:
        'Graba un discurso breve donde apliques el manejo de nervios, la voz, el lenguaje corporal y la estructura que has aprendido.',
      instructions: `1. Elige un tema que conozcas o que te interese: una experiencia, una recomendación o una idea que quieras defender.
2. Escribe en una frase qué quieres que tu público recuerde.
3. Prepara un esquema con una apertura, dos o tres ideas con un ejemplo cada una y un cierre con llamada a la acción. Usa solo palabras clave, no el texto completo.
4. Realiza tu rutina de calma de tres minutos (respiración abdominal, anclaje con los pies y visualización del inicio).
5. Ensaya en voz alta al menos dos veces, cuidando volumen, pausas y gestos. Cronometra para quedar cerca de los dos minutos.
6. Coloca tu celular a la altura de los ojos o del pecho, con buena luz de frente y un fondo ordenado.
7. Graba el discurso de corrido en video (o en audio si no puedes grabar video).
8. Revisa tu grabación y anota brevemente qué hiciste bien y qué mejorarías.
9. Sube el archivo y, si lo deseas, agrega tu nota de reflexión.`,
      scenario:
        'Te han invitado a dar una intervención de dos minutos en una reunión de tu comunidad, centro de estudios o trabajo. Debes presentar una idea o experiencia ante un grupo de unas veinte personas que no conocen el tema en profundidad. Tu objetivo es que lo entiendan, lo recuerden y se animen a actuar.',
      type: 'PUBLIC_SPEAKING',
      submissionTypes: ['VIDEO', 'AUDIO'],
      maxScore: 100,
      peerReview: false,
      peerReviewsRequired: 0,
      competencies: ['oratoria', 'comunicacion_verbal', 'comunicacion_no_verbal', 'expresion_corporal'],
    },
    {
      title: 'Plan de mi presentación',
      description:
        'Diseña por escrito el plan completo de una presentación y recibe comentarios constructivos de tus compañeros.',
      instructions: `1. Elige una presentación real o realista que debas o quieras dar (por ejemplo, una propuesta en el trabajo, una exposición en clase o una charla en tu comunidad).
2. Describe a tu audiencia, el contexto y el objetivo: qué quieres que piensen, sientan o hagan.
3. Escribe tu mensaje principal en una sola frase.
4. Detalla la estructura: apertura, dos o tres ideas con un ejemplo cada una y cierre con llamada a la acción.
5. Incluye al menos un recurso de persuasión honesto: una historia breve o una razón concreta para esa audiencia.
6. Anota tus decisiones de voz (dónde harás pausas y qué palabras enfatizarás) y de cuerpo (gestos, movimiento y mirada).
7. Describe tu rutina de calma previa y tu plan B si te quedas en blanco o falla algún recurso.
8. Entrega tu plan como texto o archivo.
9. Revisa los planes de dos compañeros y deja comentarios: primero un aspecto que funciona y después una sugerencia concreta de mejora.`,
      scenario:
        'Dentro de dos semanas debes presentar una propuesta ante un grupo que no conoce el tema. Tienes diez minutos y quieres lograr que apoyen tu idea. Antes de ensayar, elaboras un plan escrito que te servirá de guía y que tus compañeros revisarán para ayudarte a mejorarlo.',
      type: 'CASE_STUDY',
      submissionTypes: ['TEXT', 'FILE'],
      maxScore: 100,
      peerReview: true,
      peerReviewsRequired: 2,
      competencies: ['oratoria', 'persuasion', 'comunicacion_verbal'],
    },
  ],
  forumDescription:
    'Te damos la bienvenida al foro del Curso de Oratoria: un espacio seguro para compartir tus avances, dudas y aprendizajes con el grupo.',
};
