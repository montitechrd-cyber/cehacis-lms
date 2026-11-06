import { Link } from 'react-router';
import { ArrowRight, BookOpen, Clock, Star } from 'lucide-react';
import { LEVELS } from '@/lib/format';
import { priceLabel, type CourseCard } from '@/features/public/data';
import { cardArt, courseArt } from '@/features/home/course-art';

/** Tarjeta de curso al estilo de los grandes catálogos: portada, institución, título, habilidades, datos y precio. */
export function CourseCardView({ course }: { course: CourseCard }) {
  const skills = course.competencies.slice(0, 3).map((c) => c.name);
  const art = cardArt(course) ?? (course.imageUrl ? { src: course.imageUrl, alt: '' } : courseArt(course));
  return (
    <li className="group relative flex flex-col overflow-hidden rounded-xl border border-hairline bg-paper transition-[box-shadow,border-color] duration-200 ease-out hover:border-line-strong hover:shadow-lift">
      <div className="relative aspect-[16/9] overflow-hidden bg-sand">
        <img
          src={art.src}
          alt={art.alt}
          width={800}
          height={450}
          loading="lazy"
          decoding="async"
          className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transition-none"
        />
        <span className="absolute left-4 top-4 rounded-md bg-paper/95 px-2.5 py-1 text-xs font-semibold text-ink shadow-sm">
          {LEVELS[course.level] ?? course.level}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="text-lg font-bold leading-snug tracking-[-0.01em]">
          <Link to={`/cursos/${course.slug}`} className="text-ink no-underline after:absolute after:inset-0 group-hover:underline group-hover:underline-offset-4">
            {course.title}
          </Link>
        </h3>
        {skills.length > 0 && (
          <p className="mt-2 line-clamp-2 text-sm text-graphite">
            <span className="font-semibold text-ink">Habilidades: </span>
            {skills.join(', ')}
          </p>
        )}
        {course.rating && course.rating.count > 0 && (
          <p className="mt-3 flex items-center gap-1 text-sm">
            <Star className="size-4 fill-orange text-orange" aria-hidden />
            <span className="font-semibold tnum">{course.rating.avg.toFixed(1)}</span>
            <span className="text-muted tnum">({course.rating.count})</span>
          </p>
        )}
        <div className="mt-auto pt-5">
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-graphite">
            {course.durationHours ? (
              <li className="inline-flex items-center gap-1.5 tnum">
                <Clock className="size-4 text-muted" strokeWidth={1.75} aria-hidden /> {course.durationHours} h
              </li>
            ) : null}
            {course.lessonsCount > 0 && (
              <li className="inline-flex items-center gap-1.5 tnum">
                <BookOpen className="size-4 text-muted" strokeWidth={1.75} aria-hidden /> {course.lessonsCount} lecciones
              </li>
            )}
          </ul>
          <div className="mt-4 flex items-center justify-between gap-4 border-t border-hairline pt-4">
            <p className="text-xl font-extrabold tracking-tight tnum">{priceLabel(course)}</p>
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange-strong">
              Inscribirme <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
            </span>
          </div>
        </div>
      </div>
    </li>
  );
}
