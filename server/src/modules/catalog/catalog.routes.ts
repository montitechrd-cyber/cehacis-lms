import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import courses from './courses.routes.js';
import content from './content.routes.js';
import misc from './misc.routes.js';

/** Gestión académica del catálogo (montado en /api/catalog). Todo requiere sesión. */
const r = Router();
r.use(requireAuth);
r.use(courses);
r.use(content);
r.use(misc);

export default r;
