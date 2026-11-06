---
version: 1
slug: "web-src-app-tsx"
primary_target: "web/src/App.tsx"
related_targets: ["web/src/pages"]
---

# Surface brief — CEHACIS LMS (portal público + campus + panel)

Scope: whole web app. Portal público = Persuade. Campus virtual y panel admin = Operate (mismo mundo, expresión más contenida).
Audience/job: profesionales hispanohablantes que compran e inscriben cursos de habilidades comunicativas; estudiantes que avanzan por aulas lineales; facilitadores y admins que operan.
Primary action (portal): Inscribirme / Ver curso desde la cartelera de cursos.

## Direction contract

THESIS: Cada curso se anuncia como una conferencia magistral de un ciclo universitario suizo. Se rechaza el héroe SaaS centrado con fila de tarjetas iguales y la plantilla LMS gris con avatares.

OWN-WORLD: Fondo blanco frío y gris piedra #F2F2F0; tinta #141414; grafito #4A4A4D del logo; naranja institucional #EE7A2F en campos planos a sangre, racionado a acción y cartel. Grotesca neo-suiza de gran escala (Schibsted Grotesk / Archivo) + numerales tabulares; numeración de serie "N.º 01". Reglas de 1px, retícula de 12 columnas visible en el ritmo, esquinas rectas (radio 2px máx.), sin sombras difusas, sin degradados.

STORY: El visitante entiende que CEHACIS entrena voz, presencia y conexión con rigor académico; ve la cartelera real de cursos con precio y nivel; se inscribe.

FIRST VIEWPORT: Portal 1440: banda superior con logo y navegación en una línea. Izquierda 7 col: titular grotesco 120px+ "Transformamos tu voz, tu presencia y tu capacidad de conectar." Derecha 5 col: campo naranja a sangre tipo cartel con la "cartelera" de cursos numerados (N.º, título, nivel, precio USD) y botón primario Inscribirme. Debajo, regla y línea de datos del ciclo.

SIGNATURE INTERACTION: Fila de pasos del aula: módulos y lecciones como una única fila numerada; el indicador "ahora" se desplaza al avanzar; completado = marca rellena, en curso = anillo, bloqueado = trazo cortado + candado.

MOTION: Entradas de texto por líneas con desplazamiento corto (ease-out-quint, 500ms), barrido del indicador "ahora"; prefers-reduced-motion lo anula.

FORM: Cartel de ciclo de conferencias universitario (candidato 4 de 7); seed key 1bf2c891. Raises: fila de pasos (drum-machine), estado por forma (jackfield), naranja racionado (agit-train).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Home (web/src/pages/public/Home.tsx) — Direction contract (nov. 2026, reemplaza al Pórtico)

THESIS: La home es la portada de una academia online de referencia, al nivel de acabado de Coursera y edX: la oferta y la acción primero, y enseguida la prueba de que aquí el aprendizaje se mide (rúbrica, progreso, certificado verificable). Se rechazan el campo naranja con tarjetas flotantes giradas, la franja de iconos en círculos naranjas y el templo como ornamento a escala.

OWN-WORLD: blanco con bandas de arena clara #f6f4f1, carbón #1f1f22 para texto, grafito para secundario; naranja institucional #ee7a2f solo en la acción primaria, la barra de progreso y marcas de dato; naranja fuerte #c25414 para enlaces y texto naranja. Schibsted Grotesk en 700–800 para titulares, 400 para lectura. Tarjetas blancas con borde de 1px #e4e2dd, radio 12px, sombra suave con desplazamiento solo en hover; botones con radio 8px y 48px de alto en el héroe. Iconos Lucide de trazo 1.75.

STORY: el visitante entiende en una línea qué entrena CEHACIS, ve los cursos abiertos con nivel, duración y precio, comprueba cómo se evalúa y se certifica, y se inscribe o crea su cuenta.

FIRST VIEWPORT: 1440: cabecera del portal. Izquierda 6 col: titular a ~4.25rem "Habla con seguridad. Conecta con cualquiera.", entradilla, "Ver cursos" (primario naranja) y "Crear cuenta" (contorno), y debajo los cursos abiertos como enlaces rápidos con precio. Derecha 6 col: vista previa del aula dibujada en código y etiquetada "Ejemplo": curso, progreso, próxima lección, rúbrica por competencia evaluada por facilitador, y una ficha de certificado verificable que se superpone. Debajo, una línea de hechos reales (cursos publicados, competencias, 100 % online, certificado verificable).

SIGNATURE: la vista previa se arma al cargar: la barra de progreso se llena y las barras de la rúbrica crecen escalonadas (ease-out-expo, 700ms); prefers-reduced-motion las muestra llenas.

FORM: estándar de la categoría elegido por la usuaria (canon), vara de calidad Coursera / edX; seed key 0d61f197.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
