import { Router } from 'express';
import students from './students.routes.js';
import instructors from './instructors.routes.js';

/** Personas: expedientes de estudiantes, facilitadores, notas académicas, evaluación docente y reseñas. */
const r = Router();
r.use(students);
r.use(instructors);

export default r;
