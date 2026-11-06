import { ButtonLink } from '@/components/ui/Button';

function Shell({ code, title, body }: { code: string; title: string; body: string }) {
  return (
    <div className="mx-auto max-w-[1440px] px-4 py-24 sm:px-8">
      <p className="text-[clamp(4rem,2.5rem+6vw,8rem)] font-extrabold leading-none tracking-[-0.05em] text-orange tnum">{code}</p>
      <h1 className="mt-6 max-w-2xl text-title font-bold">{title}</h1>
      <p className="mt-4 max-w-xl text-lg text-graphite">{body}</p>
      <div className="mt-8 flex gap-3">
        <ButtonLink to="/" variant="ink">
          Volver al inicio
        </ButtonLink>
        <ButtonLink to="/cursos" variant="outline">
          Ver cursos
        </ButtonLink>
      </div>
    </div>
  );
}

export function NotFound() {
  return <Shell code="404" title="Esta página no existe" body="Es posible que el enlace esté incompleto o que el contenido se haya movido." />;
}

export function AccessDenied() {
  return <Shell code="403" title="No tienes acceso a esta sección" body="Tu rol no incluye los permisos necesarios. Si crees que es un error, contacta a la administración académica." />;
}
