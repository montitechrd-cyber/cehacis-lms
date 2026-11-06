import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { notFound } from '../../lib/errors.js';
import { idParam } from '../../lib/validate.js';
import { assertCourseAccess, can } from '../../middleware/auth.js';
import { userSel, shapeUser, ACTIVE_ENROLLMENT, isCourseStaff } from './common.js';
import { forumInclude, forumList } from './forums.js';
import { shapeAnnouncement } from './announcements.js';

const router = Router();

/** Espacio del curso: foros (curso + mi grupo), anuncios recientes y compañeros/facilitadores. */
router.get('/courses/:courseId/space', async (req, res) => {
  const courseId = idParam(req, 'courseId');
  const course = await prisma.course.findFirst({ where: { id: courseId, deletedAt: null }, select: { id: true, title: true, slug: true } });
  if (!course) throw notFound('Curso no encontrado');
  await assertCourseAccess(req, courseId);
  const uid = req.user!.id;

  // Crea perezosamente el foro general del curso.
  const hasForum = await prisma.forum.findFirst({ where: { courseId }, select: { id: true } });
  if (!hasForum) {
    await prisma.forum.create({
      data: { title: 'Foro general del curso', description: 'Espacio para dudas, ideas y conversación entre participantes y facilitadores.', type: 'COURSE', courseId },
    });
  }

  const staff = await isCourseStaff(req, courseId);
  const myEnr = staff ? null : await prisma.enrollment.findUnique({ where: { userId_courseId: { userId: uid, courseId } }, select: { groupId: true } });
  const forums = await prisma.forum.findMany({
    where: {
      OR: [{ courseId }, { group: { is: { courseId } } }],
      ...(staff ? {} : { AND: [{ OR: [{ groupId: null }, ...(myEnr?.groupId ? [{ groupId: myEnr.groupId }] : [])] }] }),
    },
    include: forumInclude,
    orderBy: [{ groupId: 'asc' }, { id: 'asc' }],
  });

  const [announcements, instructors, students] = await Promise.all([
    prisma.announcement.findMany({
      where: { audience: 'COURSE', courseId },
      include: { author: { select: userSel }, course: { select: { id: true, title: true, slug: true } } },
      orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
      take: 5,
    }),
    prisma.courseInstructor.findMany({
      where: { courseId, instructor: { status: 'ACTIVE', deletedAt: null } },
      select: { instructor: { select: userSel } },
    }),
    prisma.enrollment.findMany({
      where: { courseId, status: { in: [...ACTIVE_ENROLLMENT] }, user: { status: 'ACTIVE', deletedAt: null } },
      select: { user: { select: userSel } },
      orderBy: { user: { firstName: 'asc' } },
      take: 300,
    }),
  ]);

  res.json({
    data: {
      course,
      forums: await forumList(forums),
      announcements: announcements.map(shapeAnnouncement),
      members: [...instructors.map((i) => i.instructor), ...students.map((s) => s.user)].map(shapeUser),
      canModerate: can(req, 'community.moderate'),
    },
  });
});

export default router;
