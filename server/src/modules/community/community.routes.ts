import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import forums from './forums.js';
import comments from './comments.js';
import messages from './messages.js';
import announcements from './announcements.js';
import notifications from './notifications.js';
import moderation from './moderation.js';
import space from './space.js';

/** Comunidad y comunicación (/api/community): foros, comentarios, mensajería, anuncios, notificaciones y moderación. */
const router = Router();
router.use(requireAuth);
router.use(forums);
router.use(moderation);
router.use(comments);
router.use(messages);
router.use(announcements);
router.use(notifications);
router.use(space);

export default router;
