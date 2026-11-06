import type { CourseContent } from './types.js';

export const content: CourseContent = {
  durationHours: 8,
  subtitle: 'Expresa lo que piensas y sientes con claridad, empatía y firmeza, sin culpa ni agresividad.',
  audience:
    'Personas de cualquier edad y ocupación que quieren expresar opiniones y emociones con respeto, aprender a decir "no" con seguridad y mejorar sus relaciones personales y laborales. Nivel básico.',
  requirements:
    'No se requieren conocimientos previos. Solo disposición para reflexionar sobre tu forma de comunicarte, practicar los ejercicios y compartir tus avances con tus compañeros.',
  objectives: [
    'Distinguir los estilos de comunicación pasivo, agresivo, pasivo-agresivo y asertivo, e identificar el tuyo.',
    'Reconocer y expresar tus emociones y necesidades sin culpa ni agresividad.',
    'Aplicar técnicas asertivas como el yo-mensaje, el disco rayado y el "no" respetuoso.',
    'Pedir, dar y recibir críticas de forma constructiva.',
    'Poner en práctica la asertividad en situaciones personales y profesionales para mejorar tus relaciones.',
  ],
  modules: [
    {
      title: 'Estilos de comunicación',
      description:
        'Comprende qué es la asertividad y cómo se diferencia de la pasividad, la agresividad y el estilo pasivo-agresivo.',
      lessons: [
        {
          title: 'Comunicar no es solo hablar',
          summary: 'Qué significa comunicar desde el respeto y la empatía, y por qué la asertividad es una habilidad que se entrena.',
          durationMin: 30,
          completionRule: 'VIEW',
          forum: true,
          content: `<p>Muchas veces creemos que comunicar es simplemente hablar. Sin embargo, una conversación incluye lo que decimos, cómo lo decimos, lo que sentimos y cómo escuchamos. Comunicarse bien es <strong>decir lo que piensas desde el respeto y la empatía</strong>: respetándote a ti y respetando a la otra persona al mismo tiempo.</p>
<h2>¿Qué es la asertividad?</h2>
<p>La asertividad es la capacidad de expresar opiniones, emociones, necesidades y límites de manera clara, directa y respetuosa, sin atacar y sin callarte. No es una cualidad con la que se nace: es una habilidad que se aprende y se mejora con práctica, como montar bicicleta o conducir.</p>
<h3>Qué NO es la asertividad</h3>
<ul>
<li>No es imponer tu punto de vista ni "ganar" la discusión.</li>
<li>No es ser frío o cortante.</li>
<li>No es decir siempre lo que se te ocurre sin pensar en el otro.</li>
<li>No garantiza que los demás estén de acuerdo; garantiza que serás escuchado y que tú escucharás.</li>
</ul>
<blockquote>Ser asertivo es decir lo que piensas de manera que la otra persona pueda escucharlo, y permitir que ella haga lo mismo.</blockquote>
<h3>Los tres ingredientes</h3>
<p>Una comunicación asertiva combina <strong>claridad</strong> (se entiende lo que quieres), <strong>empatía</strong> (reconoces lo que el otro puede sentir o necesitar) y <strong>firmeza</strong> (mantienes tu posición con calma).</p>
<h3>Ejercicio guiado: mi punto de partida</h3>
<ol>
<li>Recuerda una conversación reciente en la que te quedaste con ganas de decir algo, o en la que dijiste algo de lo que te arrepentiste.</li>
<li>Escribe qué pasó en dos o tres líneas, sin juzgar.</li>
<li>Anota qué querías lograr realmente en esa conversación.</li>
<li>Escribe una frase que sí hubieras podido decir, respetuosa y clara.</li>
<li>Compártela en el foro del curso si te sientes cómodo; no es obligatorio dar detalles personales.</li>
</ol>
<p>Guarda tus notas: las retomarás al final del curso para comparar tu avance.</p>`,
        },
        {
          title: 'Los cuatro estilos: pasivo, agresivo, pasivo-agresivo y asertivo',
          summary: 'Características, señales y consecuencias de cada estilo de comunicación.',
          durationMin: 40,
          completionRule: 'RESOURCES',
          links: [
            {
              title: 'Asertividad (Wikipedia)',
              url: 'https://es.wikipedia.org/wiki/Asertividad',
              description: 'Lectura introductoria sobre el concepto de asertividad y sus componentes.',
              required: true,
            },
            {
              title: 'Comunicación no verbal (Wikipedia)',
              url: 'https://es.wikipedia.org/wiki/Comunicaci%C3%B3n_no_verbal',
              description: 'Complemento opcional: el cuerpo y la voz también comunican.',
            },
          ],
          content: `<p>Todos usamos distintos estilos según la situación, la persona y nuestro estado de ánimo. Conocerlos te ayuda a detectar cuándo te alejas de lo que realmente quieres comunicar.</p>
<h2>Estilo pasivo</h2>
<p>La persona evita el conflicto a costa de sus propias necesidades. Suele decir "sí" cuando quiere decir "no", habla bajito, pide disculpas en exceso y se queda con lo que siente. <em>Consecuencia habitual:</em> acumula frustración y otros no saben lo que necesita.</p>
<h2>Estilo agresivo</h2>
<p>Defiende lo propio a costa de los demás: interrumpe, levanta la voz, acusa, ordena o ironiza. <em>Consecuencia habitual:</em> logra resultados a corto plazo, pero deteriora la confianza y genera resistencia.</p>
<h2>Estilo pasivo-agresivo</h2>
<p>Expresa el malestar de forma indirecta: sarcasmo, silencios castigadores, "olvidos" convenientes, indirectas. Por fuera parece calma; por dentro hay enojo no dicho. <em>Consecuencia habitual:</em> confusión y desconfianza, porque el mensaje real nunca se aclara.</p>
<h2>Estilo asertivo</h2>
<p>Expresa lo que piensa, siente y necesita de forma directa y respetuosa, y escucha al otro. Mantiene contacto visual cómodo, voz firme y tranquila, y propone soluciones.</p>
<blockquote>Un mismo desacuerdo puede sonar a sumisión, a ataque, a indirecta o a diálogo. Lo que cambia es el estilo, no la razón que tienes.</blockquote>
<h3>Ejemplo</h3>
<p>Un compañero llega tarde a una reunión por tercera vez. Pasivo: "No pasa nada, tranquilo". Agresivo: "Tú nunca respetas a nadie". Pasivo-agresivo: "Qué bueno que al fin nos acompañas". Asertivo: "Hemos comenzado a las nueve y llegaste a las nueve y media. Me gustaría que avisemos si hay retraso para organizar mejor el tiempo".</p>
<h3>Ejercicio guiado</h3>
<ol>
<li>Lee la lectura obligatoria sobre asertividad.</li>
<li>Piensa en una situación de esta semana en la que sentiste molestia.</li>
<li>Escribe cómo la responderías en cada uno de los cuatro estilos, una frase por estilo.</li>
<li>Subraya la frase asertiva y verifica que no contenga acusaciones.</li>
</ol>`,
        },
        {
          title: '¿Cuál es mi estilo? Repaso del módulo',
          summary: 'Identifica tus patrones habituales y consolida lo aprendido antes del quiz.',
          durationMin: 30,
          completionRule: 'ASSESSMENT',
          content: `<p>Rara vez usamos un único estilo. Es común ser asertivo en el trabajo y pasivo en la familia, o agresivo cuando estamos cansados. Detectar tus patrones es el primer paso del cambio.</p>
<h2>Señales para reconocer tu patrón</h2>
<ul>
<li><strong>Cuerpo:</strong> tensión en la mandíbula, hombros encogidos, puños cerrados o respiración corta antes de hablar.</li>
<li><strong>Voz:</strong> tono muy bajo y vacilante, o muy alto y cortante.</li>
<li><strong>Lenguaje:</strong> "es que...", "perdona la molestia, pero...", "siempre haces...", "nunca me escuchas".</li>
<li><strong>Después:</strong> culpa, resentimiento, arrepentimiento o sensación de no haber sido escuchado.</li>
</ul>
<blockquote>Tu estilo no te define; es un hábito aprendido, y todo hábito puede reentrenarse.</blockquote>
<h2>Repaso rápido</h2>
<ul>
<li>El estilo pasivo evita el conflicto sacrificando lo propio.</li>
<li>El agresivo impone sacrificando al otro.</li>
<li>El pasivo-agresivo comunica de forma indirecta y confusa.</li>
<li>El asertivo es claro, empático y firme.</li>
</ul>
<h3>Ejercicio guiado: mapa de mis estilos</h3>
<ol>
<li>Dibuja una tabla con cuatro espacios: familia, pareja o amistades, trabajo o estudio, y desconocidos (tiendas, transporte).</li>
<li>En cada espacio escribe el estilo que usas con más frecuencia.</li>
<li>Anota una situación concreta que lo ejemplifique.</li>
<li>Elige el espacio donde más te gustaría cambiar y escribe una meta pequeña, por ejemplo: "Esta semana pediré con claridad lo que necesito en una conversación".</li>
</ol>
<p>Cuando termines, realiza el quiz del módulo. Podrás revisar la explicación de cada respuesta para reforzar lo aprendido.</p>`,
        },
      ],
      quiz: {
        title: 'Quiz: Estilos de comunicación',
        description: 'Verifica que distingues los cuatro estilos y los componentes de la asertividad.',
        questions: [
          {
            type: 'MC',
            text: 'Una persona responde "Claro, no hay problema" a una petición que le molesta, y luego evita saludar a quien se la hizo. ¿Qué estilo predomina?',
            explanation: 'Aceptar sin decir lo que se siente y luego expresar el malestar con distanciamiento es característico del estilo pasivo-agresivo: el enojo sale de forma indirecta.',
            competency: 'asertividad',
            options: [
              { text: 'Pasivo-agresivo', correct: true },
              { text: 'Agresivo', correct: false },
              { text: 'Asertivo', correct: false },
              { text: 'Pasivo puro', correct: false },
            ],
          },
          {
            type: 'MS',
            text: '¿Cuáles de las siguientes son características de una comunicación asertiva?',
            explanation: 'La asertividad combina claridad, respeto y escucha. Ceder siempre o imponer el criterio propio corresponde a otros estilos.',
            competency: 'comunicacion_verbal',
            options: [
              { text: 'Expresar lo que se piensa de forma directa y respetuosa', correct: true },
              { text: 'Escuchar el punto de vista de la otra persona', correct: true },
              { text: 'Evitar siempre cualquier desacuerdo', correct: false },
              { text: 'Lograr que el otro acepte mi opinión', correct: false },
            ],
          },
          {
            type: 'TF',
            text: 'Ser asertivo significa conseguir siempre lo que uno quiere.',
            explanation: 'La asertividad no garantiza el resultado: garantiza que expresas lo tuyo con respeto y que el otro también pueda hacerlo. Puede haber desacuerdo y aun así comunicarse bien.',
            competency: 'asertividad',
            options: [
              { text: 'Verdadero', correct: false },
              { text: 'Falso', correct: true },
            ],
          },
          {
            type: 'MC',
            text: '"Tú nunca me escuchas, eres un egoísta." ¿Qué estilo refleja esta frase?',
            explanation: 'Las generalizaciones ("nunca") y los calificativos personales atacan a la persona en lugar de describir un hecho; es típico del estilo agresivo.',
            competency: 'comunicacion_verbal',
            options: [
              { text: 'Agresivo', correct: true },
              { text: 'Pasivo', correct: false },
              { text: 'Asertivo', correct: false },
              { text: 'Pasivo-agresivo', correct: false },
            ],
          },
          {
            type: 'MC',
            text: '¿Cuál de estas frases es la más asertiva ante un compañero que no entrega su parte del trabajo a tiempo?',
            explanation: 'La opción asertiva describe el hecho, expresa su efecto y propone algo concreto, sin acusar ni callar.',
            competency: 'asertividad',
            options: [
              { text: '"La parte de datos llegó dos días después de lo acordado y retrasó la entrega. ¿Podemos fijar fechas más realistas?"', correct: true },
              { text: '"No te preocupes, yo lo hago todo yo."', correct: false },
              { text: '"Eres un irresponsable, nadie quiere trabajar contigo."', correct: false },
              { text: '"Qué raro que ahora sí estés disponible."', correct: false },
            ],
          },
        ],
      },
    },
    {
      title: 'Emociones, límites y autoestima comunicativa',
      description:
        'Aprende a identificar lo que sientes, a poner límites claros y a fortalecer la confianza al expresarte.',
      lessons: [
        {
          title: 'Reconocer y nombrar lo que siento',
          summary: 'Cómo identificar emociones y necesidades para expresarlas sin explotar ni callarlas.',
          durationMin: 35,
          completionRule: 'MANUAL',
          liveSession: true,
          content: `<p>No es posible comunicar con claridad lo que no hemos identificado. Muchas reacciones agresivas o pasivas nacen de emociones que no supimos nombrar a tiempo.</p>
<h2>Emoción, pensamiento y necesidad</h2>
<p>Ante una situación aparecen tres cosas que solemos mezclar: el <strong>hecho</strong> (lo que ocurrió), la <strong>emoción</strong> (lo que sentí) y la <strong>necesidad</strong> (lo que me hace falta). Separarlas ayuda a hablar con precisión.</p>
<ul>
<li>Hecho: "Cambiaron la reunión sin avisarme".</li>
<li>Emoción: molestia, desconcierto.</li>
<li>Necesidad: previsibilidad y respeto por mi agenda.</li>
</ul>
<h3>Ampliar el vocabulario emocional</h3>
<p>Decir "estoy mal" dice poco. Probar palabras más precisas, como frustrado, decepcionado, inseguro, abrumado, agradecido o tranquilo, facilita que el otro entienda y que tú mismo sepas qué hacer.</p>
<blockquote>Toda emoción es válida; lo que elegimos es qué hacemos con ella.</blockquote>
<h3>La pausa de tres pasos</h3>
<ol>
<li><strong>Detente:</strong> respira lentamente dos o tres veces antes de responder.</li>
<li><strong>Nombra:</strong> di internamente "siento ____ porque ____".</li>
<li><strong>Decide:</strong> pregúntate qué quieres lograr y qué frase respetuosa lo permite.</li>
</ol>
<h3>Ejercicio guiado: diario de emociones</h3>
<ol>
<li>Elige tres momentos de hoy en que sentiste una emoción intensa, agradable o desagradable.</li>
<li>Para cada uno escribe: el hecho, la emoción con una palabra precisa y la necesidad detrás.</li>
<li>Reescribe cómo lo habrías dicho en voz alta usando "Siento... porque necesito...".</li>
<li>Trae tus dudas a la sesión en vivo para trabajarlas con el grupo.</li>
</ol>
<p>Practicar a diario, aunque sea en una nota breve, convierte esta pausa en un reflejo.</p>`,
        },
        {
          title: 'Límites sanos: qué son y cómo comunicarlos',
          summary: 'Diferencia entre límite, castigo y rechazo; cómo identificar y expresar tus límites con respeto.',
          durationMin: 35,
          completionRule: 'MANUAL',
          content: `<p>Un límite es la línea que indica qué conductas, tiempos y exigencias puedes aceptar sin dejar de respetarte. Poner límites no es rechazar a las personas: es cuidar la relación para que sea sostenible.</p>
<h2>Límite no es castigo</h2>
<p>Un castigo busca que el otro "pague". Un límite informa qué harás tú. Compara:</p>
<ul>
<li>Castigo: "Como llegaste tarde, ya no cuentes conmigo".</li>
<li>Límite: "Necesito empezar a la hora acordada; si hay retraso de más de diez minutos, comenzaré sin ti y te pongo al día después".</li>
</ul>
<h3>Cómo detectar un límite que necesitas</h3>
<ul>
<li>Sientes resentimiento al aceptar algo.</li>
<li>Te ves evitando a alguien o una situación.</li>
<li>Dices "sí" y enseguida piensas "¿por qué dije que sí?".</li>
<li>Tu cuerpo se tensa o pierdes energía antes de un compromiso.</li>
</ul>
<blockquote>Un límite claro y amable evita muchos conflictos que el silencio solo posterga.</blockquote>
<h3>Fórmula para comunicar un límite</h3>
<ol>
<li><strong>Describe</strong> la situación sin juzgar.</li>
<li><strong>Expresa</strong> lo que necesitas o puedes hacer.</li>
<li><strong>Ofrece</strong> una alternativa si es posible.</li>
<li><strong>Mantén</strong> la calma si la otra persona se molesta; su reacción no invalida tu límite.</li>
</ol>
<h3>Ejercicio guiado</h3>
<ol>
<li>Haz una lista de tres situaciones donde sientes que no hay límite claro (horarios, favores, mensajes fuera de horario, préstamos de tiempo).</li>
<li>Elige una y escribe qué necesitas realmente.</li>
<li>Redacta el límite con la fórmula anterior en dos o tres frases.</li>
<li>Léelo en voz alta frente al espejo hasta que suene firme pero amable.</li>
</ol>`,
        },
        {
          title: 'Autoestima comunicativa y repaso',
          summary: 'Cómo la forma en que me hablo y me valoro influye en cómo me expreso.',
          durationMin: 30,
          completionRule: 'ASSESSMENT',
          content: `<p>Nuestra forma de comunicarnos con los demás suele reflejar cómo nos hablamos a nosotros mismos. Si pensamos "mi opinión no importa", será difícil expresarla con firmeza. La autoestima comunicativa es la confianza en que tu voz tiene derecho a ser escuchada.</p>
<h2>Derechos asertivos básicos</h2>
<ul>
<li>Tengo derecho a expresar mis opiniones y emociones.</li>
<li>Tengo derecho a decir "no" sin sentir culpa.</li>
<li>Tengo derecho a cambiar de opinión.</li>
<li>Tengo derecho a pedir aclaraciones y a cometer errores.</li>
<li>Los demás tienen estos mismos derechos.</li>
</ul>
<blockquote>Respetar tus derechos no significa pasar por encima de los de otros: significa que ambos cuentan.</blockquote>
<h3>De la voz interna crítica a la voz aliada</h3>
<p>Presta atención a frases como "voy a quedar mal" o "mejor no digo nada". Puedes sustituirlas por otras más realistas: "Puedo decirlo con respeto" o "Si no lo digo, nadie lo sabrá".</p>
<h3>Ejercicio guiado: reescribir mi diálogo interno</h3>
<ol>
<li>Anota tres pensamientos que te frenan al hablar.</li>
<li>Pregúntate para cada uno: "¿Qué evidencia tengo? ¿Qué le diría a un amigo en mi lugar?".</li>
<li>Reescribe cada pensamiento de forma realista y amable.</li>
<li>Elige uno y llévalo a la práctica en una conversación breve esta semana.</li>
</ol>
<h2>Repaso del módulo</h2>
<p>Nombrar emociones, formular límites con descripción, necesidad y alternativa, y reconocer tus derechos son la base de las técnicas del siguiente módulo. Completa el quiz para continuar.</p>`,
        },
      ],
      quiz: {
        title: 'Quiz: Emociones, límites y autoestima comunicativa',
        description: 'Comprueba tu comprensión sobre emociones, límites y derechos asertivos.',
        questions: [
          {
            type: 'MC',
            text: '¿Cuál de las siguientes frases expresa un límite y no un castigo?',
            explanation: 'Un límite dice qué haré yo y qué necesito; el castigo busca que el otro "pague" retirando algo o culpándolo.',
            competency: 'asertividad',
            options: [
              { text: '"No puedo atender llamadas de trabajo después de las ocho; las respondo al día siguiente."', correct: true },
              { text: '"Si me vuelves a llamar tarde, no te hablo más."', correct: false },
              { text: '"Haz lo que quieras, a mí ya no me importa."', correct: false },
              { text: '"Eres un desconsiderado con mi tiempo."', correct: false },
            ],
          },
          {
            type: 'MS',
            text: '¿Qué elementos conviene separar para describir con precisión lo que me ocurre en una situación?',
            explanation: 'Distinguir el hecho, la emoción y la necesidad evita mezclar juicios con descripciones y permite hablar con claridad. Las suposiciones sobre las intenciones del otro no ayudan.',
            competency: 'inteligencia_emocional',
            options: [
              { text: 'El hecho ocurrido', correct: true },
              { text: 'La emoción que siento', correct: true },
              { text: 'Las supuestas intenciones del otro', correct: false },
              { text: 'Quién tiene la culpa', correct: false },
            ],
          },
          {
            type: 'TF',
            text: 'Sentir enojo es un signo de mala comunicación y debe evitarse.',
            explanation: 'Las emociones son válidas. Lo importante es reconocer el enojo y expresarlo con respeto en lugar de reprimirlo o descargarlo contra otros.',
            competency: 'inteligencia_emocional',
            options: [
              { text: 'Verdadero', correct: false },
              { text: 'Falso', correct: true },
            ],
          },
          {
            type: 'MC',
            text: 'Antes de responder a un mensaje que te molestó, ¿qué conviene hacer primero?',
            explanation: 'La pausa permite nombrar la emoción y decidir qué quieres lograr. Responder de inmediato suele producir reacciones impulsivas.',
            competency: 'inteligencia_emocional',
            options: [
              { text: 'Respirar, nombrar lo que siento y decidir qué quiero lograr', correct: true },
              { text: 'Responder cuanto antes para que quede claro mi enojo', correct: false },
              { text: 'No responder nunca para evitar problemas', correct: false },
              { text: 'Pedir a otra persona que responda por mí', correct: false },
            ],
          },
          {
            type: 'MC',
            text: 'Una persona piensa "si digo lo que pienso, voy a quedar mal". ¿Cuál es una reformulación más realista?',
            explanation: 'Reformular el pensamiento en términos de lo que sí puede hacer (decirlo con respeto) fortalece la autoestima comunicativa sin negar el riesgo.',
            competency: 'asertividad',
            options: [
              { text: '"Puedo decirlo con respeto y dar espacio a que el otro responda."', correct: true },
              { text: '"Nunca debo opinar para no molestar."', correct: false },
              { text: '"Mi opinión es mejor que la de los demás."', correct: false },
              { text: '"Lo diré cuando esté tan molesto que no me importe."', correct: false },
            ],
          },
        ],
      },
    },
    {
      title: 'Técnicas asertivas',
      description:
        'Practica herramientas concretas: yo-mensajes, disco rayado, decir "no" y manejo de críticas.',
      lessons: [
        {
          title: 'El yo-mensaje',
          summary: 'Cómo expresar un desacuerdo o una petición describiendo hechos, emociones y necesidades.',
          durationMin: 35,
          completionRule: 'MANUAL',
          content: `<p>El yo-mensaje es una forma de hablar desde tu experiencia en lugar de acusar al otro. Cambia "tú haces" por "yo siento", lo que reduce la defensividad y abre espacio al diálogo.</p>
<h2>Estructura en cuatro partes</h2>
<ol>
<li><strong>Cuando...</strong> (hecho observable, sin juicios).</li>
<li><strong>Me siento...</strong> (emoción).</li>
<li><strong>Porque...</strong> (efecto o necesidad).</li>
<li><strong>Me gustaría / te pido...</strong> (petición concreta y posible).</li>
</ol>
<h3>Comparación</h3>
<p>Tú-mensaje: "Eres un desordenado, dejas todo tirado". Yo-mensaje: "Cuando encuentro los platos sin lavar al llegar, me siento cansada porque tengo que empezar limpiando. Me gustaría que los laves antes de salir o que acordemos un horario".</p>
<blockquote>Describe lo que ves y lo que sientes; deja que el otro explique lo que piensa.</blockquote>
<h3>Errores frecuentes</h3>
<ul>
<li>Disfrazar una acusación: "Siento que eres injusto".</li>
<li>Mezclar varios reclamos del pasado en una sola frase.</li>
<li>Pedir cosas vagas como "sé más considerado" en lugar de acciones concretas.</li>
<li>Usar un tono sarcástico que anule la frase.</li>
</ul>
<h3>Ejercicio guiado</h3>
<ol>
<li>Piensa en tres situaciones recientes que te incomodaron.</li>
<li>Escribe primero la frase "tú" que se te ocurre de forma natural.</li>
<li>Reescríbela con las cuatro partes del yo-mensaje.</li>
<li>Léela en voz alta y ajusta lo que suene artificial; tu estilo personal importa.</li>
<li>Escoge una y pruébala esta semana en un contexto de bajo riesgo.</li>
</ol>`,
        },
        {
          title: 'Disco rayado y el arte de decir "no"',
          summary: 'Cómo mantener tu posición con calma y rechazar una petición sin culpa ni agresividad.',
          durationMin: 45,
          completionRule: 'ACTIVITY',
          activityIndex: 0,
          content: `<p>Decir "no" no te hace una mala persona. Se trata de elegir con libertad en qué inviertes tu tiempo y energía. El problema no es el "no", sino la manera en que lo decimos o las explicaciones excesivas que lo debilitan.</p>
<h2>Estructura de un "no" respetuoso</h2>
<ol>
<li><strong>Reconoce</strong> la petición o a la persona ("Gracias por pensar en mí").</li>
<li><strong>Di no</strong> con claridad ("No puedo asumirlo esta semana").</li>
<li><strong>Explica brevemente</strong>, si lo deseas, sin justificarte de más.</li>
<li><strong>Ofrece una alternativa</strong> cuando sea real ("Puedo ayudarte el viernes con una parte").</li>
</ol>
<h3>La técnica del disco rayado</h3>
<p>Cuando alguien insiste, repites tu mensaje con calma, con las mismas palabras u otras equivalentes, sin entrar en discusiones ni agresiones. No se trata de ignorar al otro, sino de mantener tu decisión.</p>
<p>Ejemplo: "Entiendo que te urge. No puedo cubrir tu turno". / "Pero es solo esta vez". / "Lo sé y aun así no puedo cubrirlo".</p>
<blockquote>Una explicación breve respeta a la otra persona; una justificación interminable le da material para negociar tu límite.</blockquote>
<h3>Cuidado con los "noes" disfrazados</h3>
<ul>
<li>"Voy a ver" cuando ya sabes que no.</li>
<li>Excusas inventadas que luego debes sostener.</li>
<li>Decir "sí" y no cumplir.</li>
</ul>
<h3>Ejercicio guiado para la actividad</h3>
<ol>
<li>Anota una petición real que te cueste rechazar.</li>
<li>Redacta tu "no" con las cuatro partes.</li>
<li>Prepara dos frases de disco rayado por si insisten.</li>
<li>Realiza la actividad de juego de roles "Decir no sin culpa" y entrégala para completar esta lección.</li>
</ol>`,
        },
        {
          title: 'Pedir y recibir críticas',
          summary: 'Cómo dar retroalimentación constructiva y recibirla sin ponerse a la defensiva.',
          durationMin: 40,
          completionRule: 'MANUAL',
          content: `<p>La crítica bien manejada es una oportunidad de mejora, pero suele ser difícil darla y recibirla. La asertividad nos ofrece pautas para ambas direcciones.</p>
<h2>Dar una crítica constructiva</h2>
<ol>
<li>Elige un momento y un lugar adecuados, preferiblemente en privado.</li>
<li>Habla de conductas concretas, no de la persona ("En el informe faltan las cifras de marzo", no "Eres descuidado").</li>
<li>Explica el efecto y ofrece una sugerencia.</li>
<li>Pregunta cómo lo ve la otra persona.</li>
</ol>
<h2>Recibir una crítica</h2>
<ul>
<li><strong>Escucha completo</strong> antes de responder.</li>
<li><strong>Pide ejemplos</strong> si no queda claro: "¿Puedes decirme en qué parte lo notaste?".</li>
<li><strong>Reconoce lo cierto</strong>: "Tienes razón en que no avisé a tiempo".</li>
<li><strong>Aclara sin atacar</strong> si hay algo que no compartes: "Esa parte no la veo igual; te explico lo que ocurrió".</li>
<li><strong>Agradece</strong> y decide qué harás con ello.</li>
</ul>
<blockquote>Una crítica es información; lo que hagas con ella es decisión tuya.</blockquote>
<h3>Cuando la crítica es injusta o agresiva</h3>
<p>Puedes responder con calma: "Estoy dispuesto a hablar de esto, pero necesito que lo hagamos sin gritos. ¿Lo conversamos en diez minutos?".</p>
<h3>Ejercicio guiado: pedir retroalimentación</h3>
<ol>
<li>Elige a una persona de confianza (colega, familiar o amigo).</li>
<li>Prepara dos preguntas concretas: "¿Qué hago bien al comunicarme?" y "¿Qué podría hacer distinto?".</li>
<li>Escúchala sin interrumpir ni justificarte; solo toma notas.</li>
<li>Agradece y escribe dos aprendizajes y una acción que aplicarás.</li>
</ol>`,
        },
        {
          title: 'Integrando las técnicas y repaso',
          summary: 'Combina yo-mensajes, límites y disco rayado en una conversación real.',
          durationMin: 30,
          completionRule: 'ASSESSMENT',
          content: `<p>Las técnicas funcionan mejor combinadas y adaptadas a tu manera de hablar. No se trata de recitar fórmulas, sino de comprender su lógica: claridad, respeto y consistencia.</p>
<h2>Un ejemplo integrado</h2>
<p>Marta le pide a su vecino que baje el volumen de la música por las noches. Usa un yo-mensaje ("Cuando suena música fuerte después de las diez, me cuesta dormir"), presenta una petición concreta ("¿Puedes bajarla a esa hora?") y, ante el "es solo un rato", aplica disco rayado ("Entiendo, y necesito que después de las diez esté bajo"). Cierra agradeciendo la disposición.</p>
<blockquote>Elige la técnica según el objetivo: expresar, pedir, negar, aclarar o recibir.</blockquote>
<h3>Mapa rápido</h3>
<ul>
<li><strong>Expresar un malestar:</strong> yo-mensaje.</li>
<li><strong>Rechazar una petición:</strong> no respetuoso con alternativa.</li>
<li><strong>Mantener tu posición:</strong> disco rayado.</li>
<li><strong>Dar o recibir feedback:</strong> conductas concretas y escucha completa.</li>
</ul>
<h3>Ejercicio guiado: guion de una conversación pendiente</h3>
<ol>
<li>Elige una conversación que has postergado.</li>
<li>Escribe tu objetivo en una frase.</li>
<li>Redacta el comienzo con yo-mensaje.</li>
<li>Prepara dos posibles reacciones del otro y cómo responderías.</li>
<li>Ensaya en voz alta y decide cuándo la tendrás.</li>
</ol>
<p>Con tu guion listo, realiza el quiz del módulo para consolidar los conceptos.</p>`,
        },
      ],
      quiz: {
        title: 'Quiz: Técnicas asertivas',
        description: 'Evalúa tu dominio de los yo-mensajes, el disco rayado, el "no" respetuoso y la gestión de críticas.',
        questions: [
          {
            type: 'MC',
            text: '¿Cuál es un yo-mensaje bien formulado?',
            explanation: 'Un yo-mensaje describe el hecho, la emoción, el efecto y una petición. Las demás opciones acusan, generalizan o son indirectas.',
            competency: 'comunicacion_verbal',
            options: [
              { text: '"Cuando las reuniones se alargan, me siento agotado porque no alcanzo a terminar mis tareas; ¿podemos fijar un límite de tiempo?"', correct: true },
              { text: '"Siento que eres un maleducado con el tiempo de todos."', correct: false },
              { text: '"Tú siempre alargas las reuniones."', correct: false },
              { text: '"No sé, algunas personas deberían respetar más el horario."', correct: false },
            ],
          },
          {
            type: 'MS',
            text: '¿Qué elementos favorecen un "no" asertivo?',
            explanation: 'Reconocer a la persona, ser claro y breve, y ofrecer una alternativa cuando es real son prácticas asertivas. Inventar excusas o justificarse sin fin debilita el mensaje.',
            competency: 'asertividad',
            options: [
              { text: 'Decir "no" con claridad y sin rodeos', correct: true },
              { text: 'Ofrecer una alternativa real, si existe', correct: true },
              { text: 'Dar muchas excusas para que no se moleste', correct: false },
              { text: 'Responder "voy a ver" aunque ya sepas que no', correct: false },
            ],
          },
          {
            type: 'TF',
            text: 'La técnica del disco rayado consiste en repetir con calma tu mensaje sin discutir ni agredir.',
            explanation: 'Se trata de mantener tu posición repitiendo el mensaje central con tono sereno y reconociendo al otro, sin ceder ni atacar.',
            competency: 'asertividad',
            options: [
              { text: 'Verdadero', correct: true },
              { text: 'Falso', correct: false },
            ],
          },
          {
            type: 'MC',
            text: 'Un jefe te señala un error en un informe. ¿Qué respuesta es más asertiva?',
            explanation: 'Reconocer lo cierto, pedir precisión y comprometerse a corregir es una respuesta madura que evita la defensividad y el servilismo.',
            competency: 'comunicacion_verbal',
            options: [
              { text: '"Gracias por avisarme. ¿Puedes mostrarme en qué parte? Lo corrijo hoy."', correct: true },
              { text: '"Es que nadie me explicó cómo hacerlo."', correct: false },
              { text: '"Perdón, perdón, soy un desastre."', correct: false },
              { text: '"El error no es mío, revisa a quien lo revisó antes."', correct: false },
            ],
          },
          {
            type: 'MC',
            text: 'Alguien insiste después de tu "no". ¿Qué es lo más coherente con la asertividad?',
            explanation: 'Mantener la decisión con calma, reconociendo la situación del otro, preserva tu límite y la relación. Ceder por presión o contraatacar rompe la coherencia.',
            competency: 'relaciones_interpersonales',
            options: [
              { text: 'Repetir tu decisión con calma y reconocer su situación', correct: true },
              { text: 'Ceder para que deje de insistir', correct: false },
              { text: 'Elevar la voz hasta que se detenga', correct: false },
              { text: 'Ignorarlo sin decir nada más', correct: false },
            ],
          },
        ],
      },
    },
    {
      title: 'Asertividad en lo personal y profesional',
      description:
        'Aplica lo aprendido en la familia, las amistades y el trabajo, y construye tu plan de práctica.',
      lessons: [
        {
          title: 'Asertividad en la familia y las amistades',
          summary: 'Cómo cuidar los vínculos cercanos expresando necesidades con cariño y claridad.',
          durationMin: 35,
          completionRule: 'MANUAL',
          content: `<p>Con las personas que queremos suele ser más difícil ser asertivos, porque tememos herir o perder el afecto. Sin embargo, callar lo que sentimos desgasta más una relación que una conversación honesta.</p>
<h2>Claves para los vínculos cercanos</h2>
<ul>
<li><strong>Elige el momento:</strong> evita conversaciones importantes cuando alguien está cansado, con prisa o en público.</li>
<li><strong>Comienza por lo valioso:</strong> "Me importa nuestra relación y por eso quiero hablarte de algo".</li>
<li><strong>Habla de situaciones, no de la esencia de la persona.</strong></li>
<li><strong>Pide, no supongas:</strong> los demás no adivinan lo que necesitamos.</li>
<li><strong>Acepta el ritmo del otro:</strong> puede necesitar tiempo para procesar.</li>
</ul>
<blockquote>Quien te quiere no necesita que te calles; necesita saber qué te pasa para poder cuidarte mejor.</blockquote>
<h3>Situaciones frecuentes</h3>
<p>Una hija adulta recibe opiniones constantes sobre cómo educar a sus hijos: "Agradezco que te preocupes. Esta decisión la tomamos nosotros; si necesito consejo, te lo pediré". Un amigo cancela planes repetidamente: "Cuando se cancelan nuestros planes a última hora, me siento desplazado. ¿Podemos confirmar con un día de anticipación?".</p>
<h3>Ejercicio guiado</h3>
<ol>
<li>Escribe el nombre de una persona cercana con quien tienes un tema pendiente.</li>
<li>Identifica el hecho, tu emoción y tu necesidad.</li>
<li>Redacta un inicio cálido y un yo-mensaje con una petición concreta.</li>
<li>Define cuándo y dónde tendrás la conversación.</li>
<li>Después de hacerlo, anota cómo te sentiste y qué ajustarías.</li>
</ol>`,
        },
        {
          title: 'Asertividad en el trabajo',
          summary: 'Cómo comunicar con firmeza y respeto en equipos, con jefes, colegas y clientes.',
          durationMin: 40,
          completionRule: 'ACTIVITY',
          activityIndex: 1,
          content: `<p>En el entorno profesional, la asertividad mejora la colaboración, aclara expectativas y reduce malentendidos. También protege tu bienestar al establecer cargas de trabajo realistas.</p>
<h2>Situaciones típicas</h2>
<ul>
<li><strong>Pedir aclaraciones:</strong> "Para entregar lo que necesitas, ¿podrías precisar el formato y la fecha límite?".</li>
<li><strong>Negociar prioridades:</strong> "Tengo tres entregas esta semana. ¿Cuál tiene prioridad si no alcanzo a todas?".</li>
<li><strong>Dar mi opinión en una reunión:</strong> "Veo otra opción; ¿puedo compartirla?".</li>
<li><strong>Manejar interrupciones:</strong> "Déjame terminar la idea y luego escucho tu aporte".</li>
<li><strong>Atender a un cliente molesto:</strong> reconoce su frustración y propone qué sí puedes hacer.</li>
</ul>
<blockquote>En el trabajo, la asertividad no es desafiar a la autoridad: es dar información clara para que las decisiones sean mejores.</blockquote>
<h3>Con tu jefe o jefa</h3>
<p>Presenta la situación, tu limitación y una propuesta: "Puedo asumir el nuevo proyecto si movemos el informe mensual a la semana siguiente. ¿Te parece?". Así no sólo dices no: ayudas a resolver.</p>
<h3>Ejercicio guiado: mi diario asertivo</h3>
<ol>
<li>Durante tres días anota una situación diaria, laboral o de estudio, en la que tuviste que expresarte.</li>
<li>Describe qué dijiste, qué estilo usaste y cómo te sentiste después.</li>
<li>Reescribe, si hace falta, una versión más asertiva de tu respuesta.</li>
<li>Entrega la actividad "Mi diario asertivo" para completar esta lección.</li>
</ol>`,
        },
        {
          title: 'Mi plan de práctica asertiva y repaso final',
          summary: 'Consolida tus aprendizajes y diseña un plan personal para seguir entrenando.',
          durationMin: 30,
          completionRule: 'ASSESSMENT',
          content: `<p>La asertividad se fortalece con la práctica constante, no con una sola conversación. Terminar el curso es el inicio de un entrenamiento continuo en el que cada situación cotidiana es una oportunidad.</p>
<h2>Lo que llevas contigo</h2>
<ul>
<li>Distingues los cuatro estilos y reconoces tus patrones.</li>
<li>Nombras emociones y necesidades antes de reaccionar.</li>
<li>Formulas límites sin culpa ni agresividad.</li>
<li>Usas yo-mensajes, disco rayado y un "no" respetuoso.</li>
<li>Das y recibes retroalimentación con apertura.</li>
</ul>
<blockquote>El progreso asertivo se mide en pequeñas conversaciones honestas, no en grandes discursos.</blockquote>
<h3>Cuidado con las recaídas</h3>
<p>Habrá días en que vuelvas a un estilo pasivo o agresivo. No lo tomes como fracaso: identifica qué lo desencadenó, repara si hace falta ("Ayer me expresé con demasiada dureza; quiero decirlo de otra forma") y continúa.</p>
<h3>Ejercicio guiado: plan de treinta días</h3>
<ol>
<li>Elige dos situaciones concretas donde quieres mejorar (por ejemplo, decir "no" a favores en el trabajo y expresar necesidades en casa).</li>
<li>Define una acción pequeña por semana, medible y realista.</li>
<li>Elige a una persona que te dé apoyo y retroalimentación.</li>
<li>Programa una fecha para revisar tu avance y celebrar los logros.</li>
<li>Escribe una frase que te recuerde tu compromiso, por ejemplo: "Me respeto y respeto a los demás".</li>
</ol>
<p>Completa el quiz del módulo y continúa con la autoevaluación y el examen final del curso.</p>`,
        },
      ],
      quiz: {
        title: 'Quiz: Asertividad en lo personal y profesional',
        description: 'Aplica lo aprendido a situaciones de la vida cotidiana y el trabajo.',
        questions: [
          {
            type: 'MC',
            text: 'Tu jefe te asigna un nuevo proyecto cuando ya tienes la agenda llena. ¿Cuál es la respuesta más asertiva?',
            explanation: 'Plantear la situación y proponer una alternativa permite decidir con información y mantiene la relación profesional, sin aceptar todo ni rechazar de plano.',
            competency: 'asertividad',
            options: [
              { text: '"Puedo asumirlo si movemos el informe mensual a la próxima semana. ¿Te parece?"', correct: true },
              { text: '"Claro, lo hago sin problema" y trabajar hasta tarde en silencio', correct: false },
              { text: '"No puedo, estoy hasta el cuello, busca a otro."', correct: false },
              { text: '"Haré lo que pueda" y entregar a medias sin avisar', correct: false },
            ],
          },
          {
            type: 'MS',
            text: '¿Qué prácticas ayudan a ser asertivo con familiares y amistades?',
            explanation: 'Elegir el momento, hablar de situaciones concretas y pedir lo que necesitas fortalece el vínculo. Esperar a que adivinen o acumular reproches lo deteriora.',
            competency: 'relaciones_interpersonales',
            options: [
              { text: 'Elegir un momento tranquilo para conversar', correct: true },
              { text: 'Pedir de forma concreta lo que necesito', correct: true },
              { text: 'Esperar que el otro adivine lo que me molesta', correct: false },
              { text: 'Acumular molestias hasta poder decirlo todo de una vez', correct: false },
            ],
          },
          {
            type: 'TF',
            text: 'Ser asertivo en el trabajo implica contradecir siempre a las figuras de autoridad.',
            explanation: 'La asertividad consiste en comunicar de manera clara y respetuosa, también a la autoridad. No implica contradecir por sistema.',
            competency: 'asertividad',
            options: [
              { text: 'Verdadero', correct: false },
              { text: 'Falso', correct: true },
            ],
          },
          {
            type: 'MC',
            text: 'Después de reaccionar con dureza en una discusión, ¿qué conviene hacer?',
            explanation: 'Reparar con una disculpa específica y reformular lo que querías decir demuestra responsabilidad y mantiene el progreso. Justificarse o ignorar el hecho prolonga el malestar.',
            competency: 'relaciones_interpersonales',
            options: [
              { text: 'Reconocerlo y reformular lo que quería decir de manera respetuosa', correct: true },
              { text: 'Ignorarlo y esperar a que se olvide', correct: false },
              { text: 'Culpar al otro por haberme provocado', correct: false },
              { text: 'Decidir que ser asertivo no es para mí', correct: false },
            ],
          },
          {
            type: 'MC',
            text: 'Un cliente está muy molesto por un retraso. ¿Qué respuesta combina empatía y firmeza?',
            explanation: 'Reconocer la frustración, aclarar lo que sí se puede hacer y ofrecer un siguiente paso es empático y firme sin prometer lo imposible.',
            competency: 'empatia',
            options: [
              { text: '"Entiendo su molestia por el retraso. Lo que puedo hacer hoy es priorizar su pedido y avisarle a las cuatro."', correct: true },
              { text: '"Eso no depende de mí, hable con otra área."', correct: false },
              { text: '"Le prometo que llegará hoy" sin saber si es posible', correct: false },
              { text: '"Si no está contento, puede cancelar."', correct: false },
            ],
          },
        ],
      },
    },
  ],
  diagnostic: [
    { text: 'Me cuesta decir "no" a las peticiones de otras personas aunque me resulten incómodas.', competency: 'asertividad' },
    { text: 'Cuando algo me molesta, suelo guardármelo o expresarlo de manera indirecta.', competency: 'comunicacion_verbal' },
    { text: 'Puedo identificar con precisión lo que siento antes de responder en una conversación difícil.', competency: 'inteligencia_emocional' },
    { text: 'Me pongo en el lugar de la otra persona antes de expresar mi desacuerdo.', competency: 'empatia' },
    { text: 'Mis relaciones personales y laborales se benefician de lo claro que soy al expresar lo que necesito.', competency: 'relaciones_interpersonales' },
  ],
  selfAssessment: [
    { text: 'Después del curso, puedo decir "no" de manera clara y respetuosa sin sentir culpa excesiva.', competency: 'asertividad' },
    { text: 'Después del curso, expreso mis opiniones y emociones con yo-mensajes en lugar de reproches.', competency: 'comunicacion_verbal' },
    { text: 'Después del curso, reconozco mis emociones y hago una pausa antes de reaccionar.', competency: 'inteligencia_emocional' },
    { text: 'Después del curso, reconozco las necesidades y sentimientos de la otra persona al plantear un límite.', competency: 'empatia' },
    { text: 'Después del curso, mis conversaciones con familiares, amistades y colegas son más claras y respetuosas.', competency: 'relaciones_interpersonales' },
  ],
  finalExam: [
    {
      type: 'MC',
      text: 'Un compañero te pide con frecuencia que cubras sus tareas. Siempre aceptas, pero te sientes molesto y le respondes con sarcasmo. ¿Qué estilo predomina?',
      explanation: 'Aceptar sin decir lo que se siente y luego expresar el malestar con sarcasmo es la combinación típica del estilo pasivo-agresivo.',
      competency: 'asertividad',
      options: [
        { text: 'Pasivo-agresivo', correct: true },
        { text: 'Asertivo', correct: false },
        { text: 'Agresivo directo', correct: false },
        { text: 'Pasivo puro', correct: false },
      ],
    },
    {
      type: 'MS',
      text: '¿Cuáles son componentes de un yo-mensaje bien construido?',
      explanation: 'Un yo-mensaje describe el hecho, nombra la emoción, expresa el efecto o la necesidad y plantea una petición concreta. Las etiquetas personales acusan y no forman parte de la técnica.',
      competency: 'comunicacion_verbal',
      options: [
        { text: 'Describir el hecho sin juzgar', correct: true },
        { text: 'Nombrar lo que siento', correct: true },
        { text: 'Hacer una petición concreta', correct: true },
        { text: 'Calificar la personalidad del otro', correct: false },
      ],
    },
    {
      type: 'TF',
      text: 'Poner un límite claro suele dañar la relación, por lo que es mejor evitarlo en los vínculos importantes.',
      explanation: 'Un límite comunicado con respeto protege la relación porque evita el resentimiento. Callarlo suele ser lo que más la desgasta.',
      competency: 'relaciones_interpersonales',
      options: [
        { text: 'Verdadero', correct: false },
        { text: 'Falso', correct: true },
      ],
    },
    {
      type: 'MC',
      text: 'Ante la insistencia de alguien que no acepta tu "no", ¿qué estrategia es más acorde con la asertividad?',
      explanation: 'El disco rayado mantiene la decisión con calma y reconoce al otro, sin ceder ni escalar el conflicto.',
      competency: 'asertividad',
      options: [
        { text: 'Repetir tu mensaje con calma reconociendo su situación', correct: true },
        { text: 'Dar nuevas excusas hasta que se canse', correct: false },
        { text: 'Aceptar para evitar tensión', correct: false },
        { text: 'Responder con una crítica a su carácter', correct: false },
      ],
    },
    {
      type: 'MC',
      text: '¿Qué hacer primero cuando sientes una emoción intensa en medio de una discusión?',
      explanation: 'La pausa para respirar y nombrar la emoción permite elegir cómo responder, en lugar de reaccionar por impulso.',
      competency: 'inteligencia_emocional',
      options: [
        { text: 'Hacer una pausa, respirar y nombrar lo que siento', correct: true },
        { text: 'Responder de inmediato para no perder el hilo', correct: false },
        { text: 'Retirarse sin decir nada ni volver al tema', correct: false },
        { text: 'Elevar la voz para que se note la importancia', correct: false },
      ],
    },
    {
      type: 'MS',
      text: 'Al recibir una crítica de tu supervisor, ¿qué conductas son asertivas?',
      explanation: 'Escuchar completo, pedir ejemplos y reconocer lo cierto muestra apertura. Contraatacar o justificar sin escuchar son respuestas defensivas.',
      competency: 'comunicacion_verbal',
      options: [
        { text: 'Escuchar hasta el final antes de responder', correct: true },
        { text: 'Pedir ejemplos concretos si no está claro', correct: true },
        { text: 'Señalar los errores del supervisor como respuesta', correct: false },
        { text: 'Cambiar de tema para evitar la incomodidad', correct: false },
      ],
    },
    {
      type: 'MC',
      text: 'Un amigo cancela planes a última hora con frecuencia. ¿Cuál es la mejor manera de abordarlo?',
      explanation: 'Describir el hecho, expresar el efecto y proponer una solución cuida la amistad y deja claro lo que necesitas.',
      competency: 'relaciones_interpersonales',
      options: [
        { text: '"Cuando cancelamos a última hora me siento desplazado. ¿Podemos confirmar el día anterior?"', correct: true },
        { text: '"Ya no cuento contigo para nada."', correct: false },
        { text: 'No responder sus mensajes durante una semana', correct: false },
        { text: '"No pasa nada" y dejar de proponer planes', correct: false },
      ],
    },
    {
      type: 'TF',
      text: 'Reconocer los sentimientos de la otra persona al plantear un límite resta firmeza a tu mensaje.',
      explanation: 'La empatía y la firmeza no se oponen: reconocer lo que el otro siente facilita que escuche, y mantener tu posición conserva la firmeza.',
      competency: 'empatia',
      options: [
        { text: 'Verdadero', correct: false },
        { text: 'Falso', correct: true },
      ],
    },
    {
      type: 'OPEN',
      text: 'Describe una situación real o realista de tu vida personal o laboral en la que necesites poner un límite o decir "no". Redacta lo que dirías aplicando al menos dos técnicas del curso (yo-mensaje, "no" respetuoso con alternativa o disco rayado) y explica por qué tu respuesta es asertiva.',
      explanation: 'Una buena respuesta describe un contexto concreto, presenta un mensaje redactado en primera persona que incluya hecho, emoción o necesidad y una petición o alternativa, usa de forma identificable al menos dos técnicas, evita acusaciones y generalizaciones, y justifica por qué equilibra claridad, empatía y firmeza.',
      competency: 'asertividad',
      points: 5,
    },
  ],
  rubric: {
    title: 'Rúbrica de comunicación asertiva',
    description:
      'Evalúa las actividades prácticas del curso según la claridad del mensaje, el respeto, la gestión emocional y la efectividad en la relación.',
    criteria: [
      {
        title: 'Claridad y firmeza del mensaje',
        description: 'Capacidad de expresar lo que piensa, siente o necesita de forma directa y sostenerlo.',
        competency: 'asertividad',
        levels: [
          'El mensaje es confuso o no se expresa la necesidad; se evita el tema.',
          'Se menciona la necesidad de forma vaga o con excesivas disculpas; la petición no es concreta.',
          'El mensaje es comprensible y plantea una petición, aunque con titubeos o justificaciones largas.',
          'El mensaje es claro y concreto, con una petición específica, y se mantiene con calma ante la insistencia.',
          'El mensaje es claro, breve y consistente; sostiene la posición con serenidad y propone alternativas viables.',
        ],
      },
      {
        title: 'Uso de técnicas verbales',
        description: 'Aplicación de yo-mensajes, "no" respetuoso, disco rayado y lenguaje sin acusaciones.',
        competency: 'comunicacion_verbal',
        levels: [
          'Predominan acusaciones, generalizaciones o indirectas; no se aplica ninguna técnica.',
          'Se intenta una técnica, pero se mezcla con reproches o resulta forzada.',
          'Aplica correctamente una técnica y evita acusaciones en la mayor parte del mensaje.',
          'Aplica dos o más técnicas de manera adecuada y natural, con lenguaje descriptivo.',
          'Integra varias técnicas con fluidez, adaptadas al contexto y al estilo propio, sin recurrir a fórmulas rígidas.',
        ],
      },
      {
        title: 'Empatía y relación',
        description: 'Reconocimiento de la perspectiva del otro y cuidado de la relación.',
        competency: 'empatia',
        levels: [
          'No reconoce al otro o lo descalifica.',
          'Reconoce al otro de forma mínima o sólo al final, sin conectarlo con su mensaje.',
          'Reconoce la situación del otro al menos una vez y mantiene un tono respetuoso.',
          'Reconoce la perspectiva del otro, valida sus sentimientos y mantiene su propio límite.',
          'Combina validación genuina y firmeza, propone soluciones que consideran ambas necesidades y fortalece el vínculo.',
        ],
      },
      {
        title: 'Gestión emocional y reflexión',
        description: 'Identificación y manejo de las propias emociones, y análisis del propio desempeño.',
        competency: 'inteligencia_emocional',
        levels: [
          'No identifica emociones; reacciona impulsivamente o evita el análisis.',
          'Nombra emociones de manera general ("mal", "bien") y la reflexión es superficial.',
          'Identifica sus emociones y describe lo que sintió, con una reflexión básica sobre lo ocurrido.',
          'Nombra emociones con precisión, usa la pausa y analiza qué haría distinto con ejemplos concretos.',
          'Muestra autoconocimiento profundo, regula su reacción y define acciones claras de mejora basadas en su práctica.',
        ],
      },
    ],
  },
  activities: [
    {
      title: 'Decir no sin culpa',
      description:
        'Juego de roles para practicar un "no" respetuoso y el disco rayado en una situación cotidiana.',
      instructions: `1. Formen grupos de tres personas y repartan los roles: Persona que solicita, Persona que dice no y Observador.
2. Lean el escenario y acuerden los detalles (quién es cada quien y qué se pide).
3. La persona que solicita presenta la petición e insiste dos veces con calma, sin agredir.
4. La persona que dice no aplica: reconocimiento, "no" claro, explicación breve y una alternativa. Si insisten, usa el disco rayado.
5. El observador toma nota de las frases utilizadas, el tono de voz y el lenguaje corporal, y señala lo que funcionó y una sugerencia de mejora.
6. Roten los roles hasta que todos hayan practicado como quien dice no.
7. Graba un audio de entre uno y dos minutos con tu mejor versión del "no", o escribe el diálogo, e incluye una breve reflexión de lo que sentiste.
8. Entrega tu aporte y revisa los de dos compañeros con la rúbrica, ofreciendo una fortaleza y una sugerencia.`,
      scenario:
        'Un compañero de trabajo te pide que cubras su turno el sábado, como ya lo ha hecho varias veces. Ese día tienes un compromiso familiar que no quieres cancelar. Necesitas decir que no manteniendo una buena relación.',
      roles: [
        { name: 'Persona que solicita', description: 'Presenta la petición de cubrir el turno, expone su urgencia e insiste con calma, sin agredir.' },
        { name: 'Persona que dice no', description: 'Rechaza la petición con respeto: reconoce, dice no, explica brevemente, ofrece alternativa y usa disco rayado si insisten.' },
        { name: 'Observador', description: 'Registra frases, tono y lenguaje corporal; da retroalimentación con una fortaleza y una sugerencia.' },
      ],
      type: 'ROLE_PLAY',
      submissionTypes: ['AUDIO', 'TEXT'],
      maxScore: 100,
      peerReview: true,
      peerReviewsRequired: 2,
      competencies: ['asertividad', 'comunicacion_verbal', 'empatia'],
    },
    {
      title: 'Mi diario asertivo',
      description:
        'Registro reflexivo de tres situaciones reales en las que practicaste, o pudiste practicar, una comunicación asertiva.',
      instructions: `1. Durante tres días identifica una situación cada día en la que tuviste que expresar una opinión, emoción, petición o límite.
2. Para cada situación escribe: contexto, lo que dijiste o hiciste, el estilo que predominó (pasivo, agresivo, pasivo-agresivo o asertivo) y la emoción que sentiste antes y después.
3. Reescribe tu respuesta aplicando al menos una técnica del curso (yo-mensaje, "no" respetuoso o disco rayado).
4. Si puedes, pon la nueva versión en práctica y anota lo que ocurrió.
5. Cierra con una reflexión de cinco a ocho líneas: qué patrón notaste, qué te costó más y qué meta de práctica te propones para las próximas semanas.
6. Entrega tu diario en formato de texto. Evita incluir datos privados de otras personas: usa nombres ficticios o iniciales.`,
      scenario:
        'Eres una persona que quiere mejorar su comunicación en el trabajo y en casa. A lo largo de tres días observas tus conversaciones habituales, como pedir un favor, recibir una crítica o expresar un desacuerdo, y analizas cómo podrías responder de forma más asertiva.',
      type: 'INDIVIDUAL',
      submissionTypes: ['TEXT'],
      maxScore: 100,
      peerReview: false,
      peerReviewsRequired: 0,
      competencies: ['asertividad', 'inteligencia_emocional', 'comunicacion_verbal'],
    },
  ],
  forumDescription:
    'Bienvenido al foro del curso: comparte tus avances, dudas y experiencias de práctica asertiva en un ambiente de respeto y apoyo mutuo.',
};
