---
name: CEHACIS
description: Centro de entrenamiento en habilidades comunicativas; portal, campus virtual y panel de gestión anunciados como un ciclo de conferencias universitario, bajo el templo del logo institucional.
colors:
  orange: "#ee7a2f"
  orange-hover: "#f28c48"
  orange-soft: "#fbe3d2"
  orange-deep: "#a8501a"
  orange-strong: "#c25414"
  orange-tint: "#fdf3eb"
  ink: "#1b2236"
  charcoal: "#1f1f22"
  graphite: "#4a4a4d"
  muted: "#616165"
  paper: "#ffffff"
  stone: "#f2f2f0"
  stone-2: "#e8e8e4"
  sand: "#f6f4f1"
  hairline: "#e4e2dd"
  line: "#d9d9d4"
  line-strong: "#b9b9b3"
  success: "#1f7a4d"
  danger: "#b42318"
  danger-soft: "#fbe5e3"
typography:
  hero:
    fontFamily: "Schibsted Grotesk Variable, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(2.25rem, 1.2rem + 3.4vw, 4.5rem)"
    fontWeight: 800
    lineHeight: 0.98
    letterSpacing: "-0.035em"
  home-hero:
    fontFamily: "Schibsted Grotesk Variable, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(2.5rem, 1.5rem + 3.2vw, 4.25rem)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.04em"
  home-closing:
    fontFamily: "Schibsted Grotesk Variable, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(2.25rem, 1.4rem + 2.6vw, 3.75rem)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.04em"
  home-section:
    fontFamily: "Schibsted Grotesk Variable, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(1.75rem, 1.3rem + 1.4vw, 2.5rem)"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  display:
    fontFamily: "Schibsted Grotesk Variable, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(2rem, 1.4rem + 2vw, 3.5rem)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Schibsted Grotesk Variable, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(1.5rem, 1.2rem + 0.9vw, 2.125rem)"
    fontWeight: 700
    lineHeight: 1.02
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Schibsted Grotesk Variable, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  lesson-h2:
    fontFamily: "Schibsted Grotesk Variable, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.4rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  lesson-h3:
    fontFamily: "Schibsted Grotesk Variable, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.25
  body-lead:
    fontFamily: "Schibsted Grotesk Variable, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.625
  body:
    fontFamily: "Schibsted Grotesk Variable, Helvetica Neue, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "'ss01'"
  body-lesson:
    fontFamily: "Schibsted Grotesk Variable, Helvetica Neue, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.7
  body-ui:
    fontFamily: "Schibsted Grotesk Variable, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.625
  label:
    fontFamily: "Schibsted Grotesk Variable, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.4
  label-caps:
    fontFamily: "Schibsted Grotesk Variable, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.06em"
  tag:
    fontFamily: "Schibsted Grotesk Variable, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.05em"
  micro:
    fontFamily: "Schibsted Grotesk Variable, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 700
    lineHeight: 1.6
  serial:
    fontFamily: "Schibsted Grotesk Variable, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
    lineHeight: 1.4
    fontFeature: "'tnum'"
rounded:
  none: "0px"
  xs: "1px"
  sm: "2px"
  home-tag: "6px"
  home-control: "8px"
  home-card: "12px"
  home-panel: "16px"
  home-field: "28px"
  full: "9999px"
spacing:
  gutter-mobile: "16px"
  gutter: "32px"
  stack-sm: "12px"
  stack-md: "24px"
  section: "48px"
  section-lg: "80px"
  container: "1440px"
components:
  button-primary:
    backgroundColor: "{colors.orange}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.orange-hover}"
  button-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "40px"
  button-ink-hover:
    backgroundColor: "{colors.graphite}"
  button-outline:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "40px"
  button-outline-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  button-ghost-hover:
    backgroundColor: "{colors.stone}"
    textColor: "{colors.ink}"
  button-lg:
    padding: "0 24px"
    height: "52px"
  button-sm:
    padding: "0 12px"
    height: "32px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body-ui}"
    rounded: "{rounded.sm}"
    padding: "0 12px"
    height: "40px"
  tag:
    textColor: "{colors.ink}"
    typography: "{typography.tag}"
    rounded: "{rounded.xs}"
    padding: "2px 6px"
  tag-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  tag-orange:
    backgroundColor: "{colors.orange}"
    textColor: "{colors.ink}"
  tag-danger:
    textColor: "{colors.danger}"
  alert:
    backgroundColor: "{colors.stone}"
    textColor: "{colors.ink}"
    padding: "12px 16px"
  alert-danger:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.ink}"
  nav-item-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.sm}"
    padding: "8px"
  dialog:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "20px 24px"
  button-home:
    rounded: "{rounded.home-control}"
    padding: "0 28px"
    height: "48px"
  card-home:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.charcoal}"
    rounded: "{rounded.home-card}"
    padding: "24px"
  chip-competency:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.charcoal}"
    typography: "{typography.body-ui}"
    rounded: "{rounded.full}"
    padding: "8px 16px"
  chip-competency-active:
    backgroundColor: "{colors.charcoal}"
    textColor: "{colors.paper}"
  tag-example:
    backgroundColor: "{colors.orange-tint}"
    textColor: "{colors.orange-strong}"
    rounded: "{rounded.home-tag}"
    padding: "2px 8px"
  cartel-field:
    backgroundColor: "{colors.orange}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "40px"
---

# Design System: CEHACIS

## Overview

**Creative North Star: "El cartel del ciclo de conferencias"**

> **Portal público (nov. 2026, decisión de la clienta):** el portal (home, catálogo, acceso, pie) es naranja y blanco, sin la tinta azul. La clase `.theme-portal` en PublicLayout redefine `ink` al carbón neutro (charcoal); el pie y los campos con texto blanco usan el naranja fuerte (orange-strong, 4.6:1). Cabecera, pie naranja y páginas interiores siguen como están.
>
> **Home canon (nov. 2026, cambio aprobado solo para la home):** la usuaria eligió el estándar de la categoría, con Coursera y edX como vara. La home es la portada de una academia online de referencia: la oferta y la acción primero, y enseguida la prueba de que el aprendizaje se mide (rúbrica, progreso, certificado verificable). Fondo blanco con bandas de arena, tarjetas blancas de 12px con borde hairline, botones de 8px, sombra solo en paneles flotantes y en hover, iconos Lucide de trazo 1.75 y el templo pequeño, nunca a escala de ornamento. Se retiraron el Pórtico, el campo naranja con tarjetas flotantes giradas, la franja de iconos en círculos naranjas y los campos de cartel a sangre de la home. Es un dialecto local: el campus y el panel siguen con el sistema de abajo (esquinas de 2px, reglas de tinta, sin sombras) y ninguna regla propia de la home sale de ella.

Cada curso se anuncia como una conferencia magistral de un ciclo universitario de tradición suiza, bajo el templo del logo institucional. El sistema es una retícula de 12 columnas que se nota en el ritmo, sobre papel blanco frío y gris piedra, con una grotesca de gran escala que hace de titular de cartel. La tinta azul marino de la comunicación de marca estructura todo con reglas de 1px; el naranja institucional aparece en campos planos a sangre y solo donde hay acción o anuncio.

El logo es la fuente del ornamento. Su templo (frontón con mariposa y ondas de voz, entablamento, cuatro columnas y basamento escalonado) está redibujado en vector y descompuesto en piezas: los campos de cartel naranjas se construyen como templo (frontón arriba, columnata de fondo, basamento abajo), el templo en línea es marca de agua y sello, las ondas de voz marcan ritmo y actividad, y la mariposa señala transformación. De las piezas de redes de la marca llegan dos acentos más: el subrayado en trazo naranja bajo la palabra clave y las tres chispas del titular.

La densidad cambia de registro sin cambiar de mundo. El portal público persuade con titulares de hasta 4.5rem, campos de color a sangre y listas numeradas "N.º 01". El campus y el panel operan con el mismo vocabulario de reglas, tabla y libro de registro, más contenido, y el naranja reducido a la marca "ahora", la pestaña activa y la acción principal. Rechazos confirmados en el contrato de dirección: el héroe SaaS centrado con una fila de tarjetas iguales, y la plantilla LMS gris de avatares. No hay sombras difusas ni degradados decorativos.

**Key Characteristics:**
- Retícula de 12 columnas (6/6 en el héroe de la home, 7/5 en acceso, 4/8 en las secciones), contenedor de 1440px.
- Reglas de 1px como estructura principal; reglas de tinta abren bloques y reglas claras dividen filas.
- Esquinas rectas fuera de la home: 2px como máximo en controles, 0 en campos y diálogos. La home usa su propia escala redondeada (6, 8, 12, 16 y 28px).
- Naranja plano, racionado a acción, cartel e indicador de estado.
- El templo del logo como único repertorio ornamental: frontón, columnata, basamento, ondas de voz, mariposa.
- Numeración de serie tabular "N.º 01" para cursos, módulos y pasos.
- Estado codificado por forma, nunca solo por color.

## Colors

Una paleta neutra fría con una tinta azul marino, un solo acento cálido y saturado, y semánticos reducidos a lo estrictamente destructivo.

### Primary
- **Naranja institucional** (orange): campo de cartel a sangre (curso en marcha del campus), fondo del botón primario (también en la home), relleno de las barras de progreso y rúbrica de la home, estrella de valoración, subrayado de la navegación activa, pestaña activa, indicador "ahora" sobre papel, núcleo de la marca "en curso", viñetas de lección, borde superior de 6px de los diálogos, templo del BrandMark, ondas de voz, subrayado en trazo y chispas. También es el color de selección de texto. Sobre él siempre va tinta, nunca blanco. Su hover en el botón primario es un naranja algo más claro (orange-hover).
- **Naranja profundo** (orange-deep): el naranja que puede ser texto. Enlaces dentro de la lección, números de serie del catálogo, asterisco de campo obligatorio, cursor de los campos y regla del aviso de advertencia.
- **Naranja suave** (orange-soft): lavado de apoyo puntual; nunca un fondo de sección.
- **Naranja fuerte** (orange-strong): el naranja del portal que admite texto blanco (4.6:1). Fondo del pie y del campo de acceso; en la home, color de enlaces, flechas, iconos de la franja de hechos y texto de la etiqueta "Ejemplo".
- **Tinte naranja** (orange-tint): lavado muy suave exclusivo de la home. Campos redondeados del héroe y del cierre, pestaña activa de "Qué entrenamos" y cuadros de icono de sus competencias, fondo de la etiqueta "Ejemplo", de las marcas de verificación y de la miniatura del curso en la vista previa.

### Neutral
- **Tinta azul marino** (ink): el azul marino de la comunicación de marca. Texto principal, reglas que abren bloques, botón por defecto, ítem activo de la barra lateral, banda de certificación y pie invertidos, contorno de foco, frontón y basamento sobre naranja, indicador "ahora" sobre naranja. También es el trazo de las gráficas del panel.
- **Carbón** (charcoal): el `ink` del portal bajo `.theme-portal`. En la home es el texto de titulares y cuerpo, la competencia activa invertida, el borde hover de los enlaces rápidos y el botón "Verificar".
- **Grafito del logo** (graphite): texto secundario, descripciones, encabezados de tabla, hover del botón de tinta, segmento "iniciado" de la fila de pasos.
- **Gris apagado** (muted): metadatos, contadores, marcas de ayuda y placeholders.
- **Papel** (paper): fondo de toda superficie de trabajo.
- **Piedra** (stone): fondo de los avisos, pie de diálogo, hover de filas, botones fantasma.
- **Piedra 2** (stone-2): pista de la regla de progreso, pasos disponibles, esqueletos de carga y templo de la barra lateral.
- **Arena** (sand): bandas alternas de la home ("Cómo aprendes", certificado, franja de hechos), pistas de las barras de progreso y rúbrica, bloque "Siguiente" de la vista previa, esqueletos de carga y hover de los botones de contorno de la home.
- **Hairline** (hairline): borde de 1px de toda tarjeta, panel y enlace rápido de la home, y sus divisores internos.
- **Regla clara** (line): divisores entre filas, bordes de cabecera del campus, pestañas.
- **Regla fuerte** (line-strong): borde de campos, trazo cortado de paso bloqueado, contorno de etiqueta neutra, templo en línea de estados vacíos y cabeceras, sello de certificado no válido.

### Semánticos
- **Peligro** (danger, danger-soft): lo destructivo y el error. Botón de peligro, etiqueta de estado fallido o revocado (texto y borde rojo), aviso de error (lavado suave con regla roja), regla del estado de error.
- **Éxito** (success): uso residual. Éxito, advertencia e información ya no tienen color propio en etiquetas ni avisos: se distinguen por forma y por regla.

### Named Rules
**The Orange Ration Rule.** El naranja aparece como campo plano o como marca de acción, estado y ornamento de marca. Nunca va como texto de cuerpo sobre papel (para eso existe el naranja profundo) y nunca lleva texto blanco encima.

**The Home Orange Rule.** En la home el naranja institucional solo rellena la acción primaria, las barras de progreso y rúbrica y marcas de dato; el texto naranja es siempre naranja fuerte y las superficies naranjas se reducen al tinte.

**The Red Is Destructive Rule.** El rojo queda solo para errores y acciones destructivas. Los demás estados se dicen en tinta o grafito, con la forma de su marca y el color de su regla.

## Typography

**Display Font:** Schibsted Grotesk Variable (con Helvetica Neue, Arial)
**Body Font:** Schibsted Grotesk Variable (misma familia)

**Character:** Una sola grotesca neo-suiza para todo, con alternativas estilísticas ss01 activadas. La jerarquía sale del tamaño, el peso (400 a 800) y el interletrado negativo de los titulares, nunca de una segunda familia. La escala se redujo a petición de la usuaria: titulares de cartel firmes, pero sin gritar.

### Hierarchy
- **Hero** (800, clamp hasta 4.5rem, 0.98, -0.035em): titular de cartel del portal fuera de la home.
- **Home: héroe** (home-hero, 800, de 2.5rem a 4.25rem, 1, -0.04em): el titular único de la home, en 6 columnas. Entradilla a 1.125rem (1.25rem desde sm) en grafito.
- **Home: sección** (home-section, 800, de 1.75rem a 2.5rem, 1.05, -0.03em): títulos de "Elige tu curso", "Cómo aprendes", "Qué entrenamos", certificado y preguntas, seguidos de una entradilla de 1.125rem en grafito. Títulos de tarjeta a 1.125rem en 700; el paso del aula de ejemplo de 1.5rem a 2.25rem en 800.
- **Home: cierre** (home-closing, 800, de 2.25rem a 3.75rem, 1, -0.04em): "Empieza hoy tu entrenamiento."
- **Display** (800, clamp de 2rem a 3.5rem, 1, -0.035em): cabecera de página interior, banda de certificación.
- **Headline** (700, clamp de 1.5rem a 2.125rem, 1.02, -0.03em): títulos de sección del portal en la columna de 4, títulos de acceso y de página del campus.
- **Title** (700, 1.5rem): términos de definición, filas de método, estados vacíos, cifras de precio. Títulos de diálogo y panel lateral a 1.125 a 1.25rem.
- **Lección** (body-lesson 1rem, interlineado 1.7, medida 70ch; h2 1.4rem; h3 1.125rem; cita 1.15rem en 600 entre reglas de tinta).
- **Body** (400, 1rem, 1.5): texto de interfaz. Las descripciones largas sin HTML (body-lead) suben a 1.0625rem.
- **Body UI** (0.9375rem): texto de campos de formulario, mensajes, hilos del foro, comentarios, opciones de evaluación, descripción de página y filas del temario. Es el tamaño de lectura dentro de la herramienta.
- **Label** (600, 0.8125rem): etiquetas de campo, botones pequeños y datos de apoyo.
- **Label en versales** (600, 0.75rem, 0.06em, mayúsculas): encabezados de tabla y columnas del pie (0.08em).
- **Etiqueta** (600, 0.6875rem, 0.05em, mayúsculas en las etiquetas de estado): etiquetas de estado, grupos de la barra lateral (0.08em), rol de usuario, eventos del calendario, claves técnicas en monoespaciada y contadores.
- **Micro** (0.625rem): solo números de los contadores de notificación y la línea descriptiva bajo el nombre en el BrandMark. Nunca para frases que haya que leer.
- **Serie** (700, 0.875rem, cifras tabulares): el número "N.º 01" que antecede a cursos, módulos y pasos.

Los pasos 0.625, 0.6875, 0.8125 y 0.9375rem están fuera de la escala de Tailwind y el detector los marca como off-ramp. Son pasos intencionales del sistema, con los usos de arriba, y no deben redondearse a text-xs o text-sm.

### Named Rules
**The Tabular Ledger Rule.** Toda cifra que se compara (precios, porcentajes, contadores, fechas en tabla, series) usa cifras tabulares.

**The Caps Are Furniture Rule.** Las versales pequeñas son mobiliario de datos (cabeceras de tabla y columna, grupos de navegación, etiquetas de estado). No se ponen encima de un titular como antetítulo.

## Layout

Retícula de 12 columnas visible en el ritmo, dentro de un contenedor de 1440px con márgenes laterales de 16px (32px desde sm). En el portal, la home canon sigue esta secuencia: héroe en 6/6 (titular, entradilla, "Ver cursos" y "Crear cuenta", y debajo los cursos abiertos como enlaces rápidos con precio; a la derecha la vista previa del aula sobre un campo de tinte naranja de 28px), una franja de hechos reales en arena entre reglas hairline, "Elige tu curso" en tarjetas a 3 columnas (2 desde sm, 1 en móvil), "Cómo aprendes" en banda de arena (5/7), "Qué entrenamos" en papel (7/5, con el panel de detalle pegajoso desde lg), el certificado en banda de arena (6/6), las preguntas frecuentes en 4/8 y el cierre en un campo de tinte naranja de 28px dentro del contenedor. Las secciones de la home no abren con regla de tinta: se separan por la alternancia papel/arena y por 64px de relleno vertical (96px desde lg). En móvil todo se apila en una columna y la ficha de certificado superpuesta se oculta por debajo de sm. Las pantallas de acceso conservan el reparto 7/5 con el formulario a la izquierda y el campo naranja con el lema a la derecha. Fuera de la home, cada sección sigue el patrón 4/8: título en 4 columnas y contenido en 8, con una regla de tinta encima y 48px de relleno vertical (80px desde lg). Las bandas invertidas (tinta) y el campo naranja de cierre ocupan todo el ancho.

El campus y el panel usan una barra lateral fija de 256px con regla derecha y una cabecera de 64px pegajosa con papel al 95% y desenfoque ligero. El contenido se apila con 48px entre secciones. Los datos clave van en un libro de registro horizontal, con columnas separadas por reglas verticales, en lugar de tarjetas de métricas. Por debajo de lg, la retícula se colapsa a una columna y la navegación pasa a un menú desplegable con divisores.

## Elevation & Depth

Sistema plano. La profundidad no existe como sombra: la separación sale de las reglas de 1px, los cambios tonales (papel, piedra, tinta) y los campos de color plano. Las capas superpuestas (diálogo, panel lateral) se distinguen con un velo de tinta al 45-55% y un borde: 6px de naranja arriba en los diálogos y una regla de tinta a la izquierda en el panel lateral. Las notificaciones también anulan su sombra por defecto. Los ornamentos del templo que van detrás del contenido (columnata, templo en línea) son planos y de opacidad muy baja, nunca relieve.

La home es la única excepción, con dos sombras suaves de carbón: flotación para los paneles que representan una pantalla o un documento (vista previa del aula y su ficha de certificado, aula de ejemplo, certificado de muestra) y elevación solo como respuesta al hover de las tarjetas de curso.

### Shadow Vocabulary
- **Elevación** (shadow-lift, `0 1px 2px rgba(31,31,34,0.06), 0 12px 32px -12px rgba(31,31,34,0.18)`): hover de la tarjeta de curso de la home, junto con el borde que pasa a regla fuerte (200ms). Nunca en reposo.
- **Flotación** (shadow-float, `0 2px 4px rgba(31,31,34,0.06), 0 24px 48px -20px rgba(31,31,34,0.28)`): paneles flotantes de la home en reposo. Nada más la lleva.

### Named Rules
**The No Blur Shadow Rule.** En campus, panel y portal fuera de la home, ningún elemento proyecta sombra. Si algo necesita destacar, lleva una regla, un cambio de tono o un campo de color.

**The Float Or Hover Rule.** En la home la sombra se gana: flotación solo para paneles que representan una pantalla o un documento, elevación solo en hover. Una tarjeta en reposo es plana, con borde hairline.

## Shapes

Esquinas rectas. Botones, campos, ítems de navegación, avatares, esqueletos y paginación llevan un radio de 2px; las etiquetas de estado, 1px. Los campos de cartel, los diálogos, las bandas y la fila de pasos no tienen radio. La silueta recurrente es el rectángulo: las marcas de estado son cuadros (relleno, anillo con núcleo naranja, vacío, trazo cortado, tachado) y el indicador "ahora" es una barra vertical de 3px. Las viñetas de lección son guiones naranjas de 2px de grosor, no puntos.

La home tiene su propia escala redondeada y no la exporta: 6px en la etiqueta "Ejemplo" y las marcas de verificación, 8px en botones (`rounded-lg!` sobre el botón compartido), enlaces rápidos, pasos del método y certificado de muestra, 12px en tarjetas, panel de detalle y ficha de certificado, 16px en la vista previa del aula y 28px en los campos de tinte del héroe y del cierre. Las competencias son píldoras y las barras de progreso y rúbrica tienen extremos redondos. El botón "Crear cuenta" de la cabecera compartida conserva 2px.

La segunda silueta es la del templo: el triángulo del frontón, los fustes verticales de la columnata y los tres escalones del basamento, todos con esquinas vivas. La única excepción a la esquina recta son las barras de las ondas de voz, cápsulas de extremo redondo como en el logo, y los trazos curvos del subrayado y las chispas, que vienen de la caligrafía de las piezas de redes.

## Components

### Buttons
Planos y firmes; se hunden 1px al pulsar.
- **Shape:** esquinas casi rectas (2px), borde de 1px del mismo color que el fondo.
- **Primary:** campo naranja con texto en tinta, peso 600. Solo para la acción principal de una vista (Ver cursos, Crear cuenta, Inscribirme).
- **Ink (por defecto):** tinta con texto en papel; el hover pasa a grafito. Es el botón de trabajo del campus y el panel, el "Inscribirme" de cada fila de la cartelera y el "Continuar" sobre el campo naranja del campus.
- **Outline:** papel con borde de tinta; en hover se invierte a tinta.
- **Ghost / Link:** el fantasma solo gana fondo piedra en hover; el enlace es texto subrayado de 1px que pasa a 2px.
- **Danger:** campo rojo de peligro con texto en papel.
- **Tamaños:** sm 32px, md 40px y lg 52px de alto. El estado deshabilitado baja la opacidad al 45%.
- **En la home:** los mismos botones con radio de 8px; 48px de alto y 28px de relleno lateral en el héroe. El contorno lleva borde de regla fuerte y su hover pasa a arena con texto en carbón, sin invertirse. Flecha a la derecha en las acciones que avanzan.

### Chips / Tags
Etiquetas de estado codificadas por forma: el estado se lee por la marca de 8px que antecede al texto, no por el matiz.
- **Style:** rectángulo de 1px de radio, versales de 0.6875rem con 0.05em y peso 600, contorno de 1px.
- **Marcas:** éxito = cuadro relleno (publicado, pagado, completado); advertencia = cuadro vacío (pendiente, borrador, por hacer); información = cuadro de trazo cortado con contorno cortado en grafito (en desarrollo, devuelto); peligro = cuadro tachado, con texto y borde rojos (fallido, revocado). Éxito y advertencia van en tinta; neutra y contorno, en grafito sobre regla fuerte.
- **Tonos planos:** tinta (campo de tinta, texto papel) y naranja (campo naranja, texto tinta), sin marca.

### Alerts
Avisos dentro del mundo: fondo piedra con una regla superior de 2px e icono a 16px. La regla dice el tono: tinta para información y éxito, naranja profundo para advertencia. Solo el error cambia de fondo, a peligro suave con regla roja. Título en negrita y cuerpo en grafito a 0.875rem.

### Cards / Containers
Fuera de la home, el sistema no usa tarjetas. Los contenedores son filas entre reglas: una regla de tinta abre la lista y reglas claras separan cada fila. El hover de una fila clicable pasa a piedra.

**Tarjeta de curso de la home:** papel, borde hairline de 1px, radio de 12px y 24px de relleno. Título a 1.125rem en 700 que enlaza toda la tarjeta, "Habilidades:" con hasta tres competencias, valoración con estrella naranja si hay reseñas, y al pie nivel, horas y lecciones con iconos Lucide, una regla hairline, el precio en 800 tabular y "Inscribirme" con flecha en naranja fuerte. La portada solo aparece si el curso tiene imagen propia (16:9, escala 1.03 en hover); no hay portada de relleno. En hover, el borde pasa a regla fuerte, entra la elevación y el título se subraya.

### Inputs / Fields
- **Style:** papel, borde de 1px en regla fuerte, radio de 2px, 40px de alto y texto de 0.9375rem. La etiqueta va encima en peso 600 y la ayuda debajo en 0.75rem gris apagado.
- **Focus:** el borde pasa a tinta y suma un anillo de 1px de tinta. El hover oscurece el borde a grafito.
- **Error / Disabled:** el error pone borde y anillo de peligro y un mensaje en negrita roja; el deshabilitado usa fondo piedra y texto apagado.

### Navigation
- **BrandMark:** el templo vectorial relleno en naranja (vaciados en papel, o en tinta sobre fondo oscuro) a 36px de alto, más el nombre en 800 a 1.0625rem y la línea descriptiva en micro. Si la administración sube un logo propio desde Configuración, se muestra esa imagen en lugar del templo.
- **Portal:** cabecera pegajosa de 64px con regla de tinta inferior. Los enlaces van en una línea, a 0.875rem y peso 600, en grafito; el activo pasa a tinta con subrayado naranja de 2px y 6px de separación. En móvil, una lista a 1.125rem en negrita con divisores.
- **Campus / Panel:** barra lateral con grupos titulados en versales apagadas. El ítem activo es un campo de tinta con texto en papel e icono naranja; el hover usa fondo piedra. Al pie de la navegación, el templo en línea en piedra 2 (96px) como remate.
- **Tabs:** separadas por una regla clara, con la pestaña activa subrayada en naranja de 2px.

### Ornamento del templo (componente firma)
Repertorio vectorial redibujado del logo; todas las piezas pintan con currentColor.
- **Templo completo:** relleno (vaciados en papel, tinta u naranja según el fondo) o en línea. Relleno en el BrandMark, como sello del certificado de muestra de la home (36 a 40px, naranja con vaciados en papel) y en su ficha superpuesta (36px de alto) y en la página de verificación (80 a 96px; naranja si es válido, regla fuerte si no) y en la lista de certificados (48px). En línea como marca de agua: gran templo en papel al 4.5% en el pie, en tinta al 80% en la cabecera de la ficha de curso, en regla fuerte en las cabeceras de página interior sin acciones (224px), en naranja al 70% sobre las portadas tipográficas de curso, en regla fuerte (48px) como icono por defecto del estado vacío y en piedra 2 al pie de la barra lateral.
- **Templo de acceso:** en las pantallas de acceso, la columna de 5 es piedra y lleva el templo completo, sin recortar: frontón de tinta con mariposa y ondas en naranja, arquitrabe de tinta con el lema en papel y subrayado naranja, banda delgada, cuatro fustes naranjas estriados entre capitel y plinto de tinta, y tres escalones de tinta. Se construye al cargar.
- **Columnata:** cuatro fustes como reglas verticales de fondo en un contenedor relativo, al 6% en tinta en la cabecera naranja, la ficha de curso, el inicio del curso y el curso en marcha del campus.
- **Ondas de voz:** barras de 3px de extremo redondo. En la home, siete barras naranjas en la miniatura del curso de la vista previa y 41 barras en naranja al 20% al fondo del cierre; estáticas en el pie (21 barras); animadas (pulso de 1.1s, desfase por barra) como indicador de carga de página y como "escribiendo…" del tutor y la simulación con IA. El giro clásico queda solo para el spinner en línea de los botones.
- **Mariposa:** marca de transformación al completar un curso (64px, naranja).
- **Subrayado en trazo:** trazo naranja (o tinta sobre naranja) bajo la palabra clave. En el campo de acceso; la home no lo usa. Una palabra por titular.
- **Chispas:** tres trazos naranjas de énfasis, reservados al lema de portada. Ninguna superficie las usa hoy.

### Fila de pasos (componente firma)
Las lecciones del aula se leen como una única fila de segmentos de 14px de alto separados por 3px. Completado = tinta, iniciado = grafito, disponible = piedra 2 (hover regla fuerte), bloqueado = trazo cortado en regla fuerte con un candado en el primer tramo bloqueado. La lección actual es un segmento de papel con anillo interior de tinta de 1.5px. El indicador "ahora" se desplaza hasta la lección actual (700ms, ease-out-expo): sobre papel es una barra naranja de 3px por 22px; con tone="orange", sobre un campo naranja, pasa a tinta y crece a 30px para sobresalir por encima y por debajo de la fila. La marca de estado del temario repite la lógica por forma: cuadro relleno con check, anillo con núcleo naranja, cuadro vacío, candado.

### Cartelera (componente firma)
Una lista numerada sobre papel en el catálogo. La home no la usa: allí los cursos van en tarjetas (ver Cards / Containers). Cada fila abre con una regla de tinta y lleva serie "N.º 01" tabular, título en negrita ajustada, datos de nivel y precio en cifras tabulares, y un botón de tinta pequeño.

### Secciones de la home
- **Vista previa del aula (firma):** dibujada en código, nunca una captura, con rol de imagen y etiqueta accesible. Panel de 16px con flotación sobre el campo de tinte: cabecera "Mi aprendizaje" con la etiqueta "Ejemplo", el curso con su miniatura de ondas y su barra de progreso, el bloque "Siguiente" en arena, y la rúbrica por competencia (escala 1–4, cuatro barras por criterio) con "Evaluado por tu facilitador". Desde sm se superpone abajo a la derecha una ficha de certificado verificable de 12px. Al cargar, la barra de progreso se llena y las de la rúbrica crecen escalonadas.
- **Etiqueta "Ejemplo":** toda muestra que no es dato real (vista previa, aula de ejemplo, certificado de muestra) la lleva: tinte naranja, texto en naranja fuerte a 0.75rem en 600, radio de 6px.
- **Enlaces rápidos del héroe:** hasta cuatro cursos abiertos, cada uno una fila de 8px con borde hairline, título, precio tabular y flecha; el borde pasa a carbón en hover.
- **Franja de hechos:** solo cifras reales (cursos publicados, competencias medidas, 100 % online, certificado verificable), a 0.875rem en 600 grafito, cada una con un icono de verificación en naranja fuerte.
- **Cómo aprendes:** a la izquierda, los cinco pasos como lista de botones de 8px (el activo en papel con borde hairline); a la derecha, el aula de ejemplo: panel de 12px con flotación, cabecera con "Paso N de 5" y "Ejemplo", barra de progreso de 6px en arena y naranja, el paso a escala de 1.5 a 2.25rem y los botones Anterior (contorno) y Siguiente (primario); el último paso lleva a "Elegir un curso".
- **Qué entrenamos:** pestañas por pilar (icono en cuadro de 8px, nombre y número de competencias); en escritorio forman una columna de 4/12 y en móvil una fila que se desliza. La pestaña activa toma el tinte naranja con borde naranja al 40 % y el icono en naranja lleno. A la derecha, las competencias del pilar como tarjetas hairline de 12px en dos columnas: icono en tinte, nombre, descripción completa y "Se entrena en N cursos" o "Próximamente". Teclado de pestañas WAI-ARIA (flechas, Inicio, Fin).
- **Ficha de curso (/cursos/:slug):** mismo mundo que la home. Encabezado en banda arena con ruta (Inicio › Cursos › nombre), título de 2.25rem a 3.75rem en 800, entradilla en grafito, datos clave como píldoras blancas con icono naranja, botón de inscripción de 8px y la portada temática a la derecha (radio 16px, sombra float). Cuerpo en 8/12: «Lo que aprenderás» en caja hairline con marcas, habilidades como píldoras de tinte, «Sobre este curso» con dos cajas arena (para quién es, qué necesitas), temario en módulos plegables hairline de 12px (el primero abierto) y facilitadores y reseñas en tarjetas. Columna 4/12 con tarjeta de inscripción fija (precio, botón, «Este curso incluye»). Relacionados como tarjetas de curso de la home en banda arena. Sin el cartel naranja, la columnata ni los «N.º».
- **Ficha de programa (/programas/:slug):** mismo encabezado arena que la ficha de curso, con la etiqueta «Programa formativo» en tinte y, a la derecha, un mosaico con las portadas de sus cursos (una ancha arriba y dos debajo). El cuerpo presenta «Tu ruta, curso a curso»: pasos numerados en círculos naranjas unidos por un filete hairline, cada uno con una tarjeta horizontal del curso (portada, nivel, título, entradilla, horas, lecciones y «Ver curso»). La tarjeta de la derecha lleva el precio conjunto, el botón y «El programa incluye».
- **Catálogo (/cursos):** encabezado arena con ruta, título «Cursos», entradilla y un buscador grande (56px, radio 12px, sombra lift) a la derecha. Debajo, una caja hairline de filtros (categoría, nivel, modalidad, solo gratuitos) con controles de 44px y radio 8px; en móvil nivel y modalidad van lado a lado. Recuento y «Limpiar filtros» en naranja, rejilla 1/2/3 de las mismas tarjetas con foto de la home (9 por página) y estado vacío en caja arena centrada.
- **Certificado de muestra:** papel de 8px con proporción A (1.414:1) desde sm, flotación, marco interior en regla clara, sello del templo, nombre, QR real de muestra y código tabular, con la etiqueta "Ejemplo". Al lado, tres garantías con marca de verificación y la verificación rápida por código.
- **Cierre:** campo de tinte naranja de 28px dentro del contenedor, titular a escala de cierre, entradilla, y los botones primario y de contorno a la derecha desde lg.

### Libro de registro
Fila de cifras clave: una etiqueta pequeña en grafito sobre una cifra grande en negrita (hasta 1.75rem) con cifras tabulares, columnas separadas por reglas verticales y una regla de tinta encima. Sustituye a las tarjetas de métricas.

### Diálogos y panel lateral
Diálogo sin radio, con borde superior naranja de 6px, cabecera con regla clara y pie en piedra. El panel lateral entra desde la derecha (360ms, ease-out-expo) con una regla de tinta a la izquierda.

### Motion
Las entradas de contenido suben 14px con fundido (520ms, ease-out-quint), escalonadas 60ms por fila. En la home, el titular, la entradilla y las acciones del héroe suben con la entrada estándar (0, 60 y 120ms). La vista previa del aula se arma al cargar con el crecimiento (grow, 700ms, ease-out-expo, escala horizontal desde la izquierda): la barra de progreso desde 150ms y las barras de la rúbrica escalonadas desde 350ms (140ms por criterio y 70ms por barra); con movimiento reducido se muestran llenas. La barra del aula de ejemplo avanza en 500ms (ease-out-quint) y el texto del paso sube al cambiar. Las demás secciones de la home no tienen animación de entrada. Los velos usan un fundido de 320ms. Las ondas de voz animadas pulsan en escala vertical de 0.45 a 1. Con prefers-reduced-motion, toda animación y transición se reduce a 1ms y una sola iteración.

## Do's and Don'ts

### Do:
- **Do** fuera de la home, abrir cada sección y cada lista con una regla de tinta de 1px y separar las filas con regla clara.
- **Do** poner tinta sobre naranja, nunca papel ni blanco.
- **Do** usar naranja profundo cuando el naranja tenga que ser texto o enlace sobre papel.
- **Do** codificar el estado por forma (relleno, anillo, vacío, trazo cortado, tachado, candado) además de por color.
- **Do** numerar las series con "N.º 01" en cifras tabulares.
- **Do** mantener los radios en 2px para controles y en 0 para campos, diálogos y bandas en campus, panel y portal fuera de la home.
- **Do** usar un libro de registro o una tabla con reglas para los datos clave, en vez de tarjetas (campus y panel).
- **Do** fuera de la home, construir los campos naranjas de anuncio como templo: frontón arriba, columnata de fondo, basamento abajo.
- **Do** usar las ondas de voz animadas para carga y para la IA escribiendo, y la mariposa para logros de cierre.
- **Do** en la home, usar tarjetas de 12px con borde hairline, botones de 8px y sombra solo en paneles flotantes y en hover.
- **Do** etiquetar "Ejemplo" toda muestra de la home que no sea dato real (vista previa del aula, aula de ejemplo, certificado).
- **Do** usar en la home solo cifras reales en la franja de hechos. Cada tarjeta de curso lleva portada 16:9: la imagen propia del curso si existe; si no, una foto temática de Unsplash guardada en web/public/home/cursos y elegida por tema en web/src/features/home/course-art.ts (personas reales en situaciones de comunicación, luz cálida), con la etiqueta de nivel en una placa blanca arriba a la izquierda.
- **Do** usar los pasos de texto 0.6875, 0.8125 y 0.9375rem para sus usos asignados en lugar de redondearlos.

### Don't:
- **Don't** usar sombras difusas (salvo las dos sombras de la home) ni degradados decorativos; los únicos patrones repetidos permitidos son el trazo cortado del paso bloqueado y la columnata del templo.
- **Don't** inventar ornamentos fuera del templo del logo y los acentos de redes (subrayado en trazo, chispas); nada de ilustraciones genéricas, blobs ni iconos decorativos.
- **Don't** poner más de una palabra con subrayado en trazo por titular, ni las chispas fuera del lema de portada.
- **Don't** construir un héroe centrado con una fila de tarjetas iguales debajo.
- **Don't** usar la plantilla LMS gris de avatares, ni tarjetas redondeadas fuera de la home; el avatar es un cuadro de 2px con iniciales en tinta.
- **Don't** colocar antetítulos en versales encima de los titulares; las versales son solo para cabeceras de tabla, grupos de navegación y etiquetas.
- **Don't** exportar la escala redondeada, el tinte, la arena, el hairline ni las sombras de la home al campus, al panel ni a la cabecera compartida.
- **Don't** poner en la home antetítulos sobre los titulares, portadas de relleno con números o patrones, sombra en tarjetas en reposo, campos naranjas a sangre ni el templo a escala de ornamento.
- **Don't** introducir una segunda familia tipográfica; la jerarquía sale del tamaño y el peso de Schibsted Grotesk.
- **Don't** usar el naranja como fondo de sección de lectura larga ni como color de texto de cuerpo.
- **Don't** usar el rojo para estados que no sean error o destrucción, ni el paso micro de 0.625rem para frases que haya que leer.
