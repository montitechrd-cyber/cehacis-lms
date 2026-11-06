# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Definido por el usuario: React + TypeScript + Vite + Tailwind CSS (frontend); Node.js + Express + TypeScript, API REST modular (backend); MySQL + Prisma (base de datos). Desarrollo local sobre MySQL 8.4 de Laragon.

## Users

- **Estudiantes**: adultos y profesionales hispanohablantes (República Dominicana y Latinoamérica) que quieren hablar en público con seguridad, comunicarse con asertividad, manejar conflictos y desenvolverse socialmente. Estudian online, a menudo desde el móvil y fuera del horario laboral.
- **Facilitadores**: entrenadores que imparten cursos y talleres, evalúan prácticas (role-playing, oratoria, negociación) con rúbricas y dan retroalimentación.
- **Administración académica y superadministración**: gestionan catálogo, inscripciones, pagos, certificados y reportes.

## Product Purpose

LMS propio de CEHACIS (Centro de Entrenamiento en Habilidades Comunicativas e Inteligencia Social): portal público con catálogo y compra, campus virtual con aulas de navegación lineal y secuencia forzada, y panel administrativo. Éxito = estudiantes que completan cursos, demuestran evolución medible en competencias y obtienen certificados verificables.

## Positioning

Formación centrada en competencias interpersonales medidas con rúbricas y seguimiento histórico (no solo consumo de contenido), con práctica deliberada: role-playing, simulaciones y un entrenador conversacional con IA revisable por facilitadores.

## Operating Context

- Lema real: "Transformamos tu voz, tu presencia y tu capacidad de conectar."
- Contacto real: contacto@cehacis.com · +1 849-535-0203 (WhatsApp) · Instagram @cehacis.
- Catálogo real (cehacis.com, nov. 2026): Curso de Oratoria (USD 39), Curso de Comunicación Asertiva (USD 29, nivel básico), Curso de Resolución de Conflictos (USD 39, básico–intermedio), Etiqueta y Urbanidad (precio no publicado). Modalidad online.
- Moneda: USD.

## Capabilities and Constraints

- Roles: superadministrador, administrador académico, facilitador, estudiante. RBAC validado en frontend y backend.
- Aula virtual: botones Anterior/Siguiente, secuencia forzada configurable, índice lateral, recursos de tipo documento, archivo, examen, foro, enlace, carpeta, multimedia.
- IA: proveedor por defecto Claude (Anthropic) vía backend; sin clave configurada el módulo se muestra "no configurado". Las puntuaciones de IA no son diagnósticos y las revisa un facilitador.
- Pagos: entorno de pruebas (sandbox) propio; Azul y otras pasarelas dominicanas quedan como integración pendiente de credenciales.
- Correo: SMTP opcional; sin configurar, los envíos quedan registrados en una bandeja interna.
- Interfaz inicialmente en español; marca (logo, nombre, colores, contacto) configurable desde ajustes.

## Brand Commitments

- Nombre: CEHACIS. Logo: templo clásico naranja con mariposa y ondas de voz; tipografía gris oscuro del nombre y descriptor. Naranja y gris son los colores institucionales del logo.
- Aspiración declarada por el cliente: apariencia de universidad de máximo prestigio, moderna, minimalista, académica y con intención comercial.

## Evidence on Hand

- Logo proporcionado por el cliente (imagen adjunta en la sesión).
- Testimonios en la web actual (Mariana López, Carlos Herrera, Elena Gutiérrez) y calificación 4.8/5: no se reproducen como datos del LMS sin confirmación.
- No hay nombres de facilitadores, fotos, cifras de egresados ni acreditaciones publicadas: no deben inventarse. Los datos demo se marcan como tales.

## Product Principles

1. La competencia demostrada pesa más que el contenido consumido.
2. Ninguna pantalla promete lo que el sistema no hace: integraciones no configuradas se muestran como tales.
3. El estudiante siempre sabe dónde está y qué sigue.
4. El facilitador tiene la última palabra sobre cualquier evaluación automatizada.

## Accessibility & Inclusion

WCAG 2.1 AA como objetivo: contraste, navegación por teclado, foco visible, textos en español claro, uso fluido en móvil.
