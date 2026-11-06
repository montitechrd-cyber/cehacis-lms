import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { useAction } from '@/lib/hooks';
import { QUESTION_TYPES } from '@/lib/format';
import { Button, IconButton } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Data';
import { EmptyState } from '@/components/ui/Feedback';
import { Input, Select, Textarea } from '@/components/ui/Form';
import { ConfirmDialog, Modal } from '@/components/ui/Overlay';
import { MoveButtons, moveItem, toOptions, type CompetencyOpt } from './shared';

export interface QOption { id?: number; text: string; isCorrect: boolean }
export interface Question {
  id: number; assessmentId: number; type: string; text: string; explanation: string | null; points: number; order: number; scaleMax: number | null; competencyId: number | null; options: QOption[];
}

/** Validación idéntica a la del servidor. Devuelve mensaje o null. */
export function validateQuestion(q: { type: string; text: string; points: number; scaleMax: number | null; options: QOption[] }): string | null {
  if (!q.text.trim()) return 'Escribe el enunciado de la pregunta';
  if (!(q.points > 0)) return 'Los puntos deben ser mayores que 0';
  const opts = q.options.filter((o) => o.text.trim());
  const correct = opts.filter((o) => o.isCorrect).length;
  if (q.type === 'MULTIPLE_CHOICE') {
    if (opts.length < 2) return 'Selección múltiple necesita al menos 2 opciones';
    if (correct !== 1) return 'Marca exactamente 1 opción correcta';
  }
  if (q.type === 'MULTIPLE_SELECT') {
    if (opts.length < 2) return 'Necesitas al menos 2 opciones';
    if (correct < 1) return 'Marca al menos 1 opción correcta';
  }
  if (q.type === 'TRUE_FALSE' && correct !== 1) return 'Indica si la respuesta correcta es Verdadero o Falso';
  if (q.type === 'SCALE' && !(q.scaleMax && q.scaleMax >= 2 && q.scaleMax <= 10)) return 'La escala debe tener un máximo entre 2 y 10';
  return null;
}

const blank = (type = 'MULTIPLE_CHOICE') => ({
  type, text: '', explanation: '', points: '1', scaleMax: '5', competencyId: '',
  options: type === 'TRUE_FALSE' ? [{ text: 'Verdadero', isCorrect: true }, { text: 'Falso', isCorrect: false }] : type === 'MULTIPLE_CHOICE' || type === 'MULTIPLE_SELECT' ? [{ text: '', isCorrect: true }, { text: '', isCorrect: false }] : ([] as QOption[]),
});

export default function QuestionBuilder({ assessmentId, questions, onChanged }: { assessmentId: number; questions: Question[]; onChanged: () => void }) {
  const [edit, setEdit] = useState<Question | 'new' | null>(null);
  const [del, setDel] = useState<Question | null>(null);
  const [list, setList] = useState(questions);
  useEffect(() => setList(questions), [questions]);

  const reorder = useAction((ids: number[]) => api.put(`/assessments/${assessmentId}/questions/order`, { ids }), { onSuccess: onChanged });
  const move = (from: number, to: number) => { const n = moveItem(list, from, to); setList(n); reorder.mutate(n.map((x) => x.id)); };
  const rm = useAction((id: number) => api.del(`/assessments/questions/${id}`), { success: 'Pregunta eliminada', onSuccess: () => { setDel(null); onChanged(); } });
  const total = list.reduce((s, q) => s + Number(q.points), 0);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-graphite tnum">{list.length} preguntas · {total} puntos</p>
        <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setEdit('new')}>Añadir pregunta</Button>
      </div>
      {list.length === 0 ? <EmptyState title="Esta evaluación no tiene preguntas" description="Añade preguntas de selección, verdadero o falso, abiertas o de escala." action={<Button variant="primary" onClick={() => setEdit('new')}>Añadir pregunta</Button>} /> : (
        <ol className="divide-y divide-line border-y border-ink">
          {list.map((q, i) => (
            <li key={q.id} className="flex flex-wrap items-start gap-3 py-3">
              <span className="w-8 pt-0.5 text-sm font-bold tnum">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{q.text}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-graphite">
                  <Tag tone="ink">{QUESTION_TYPES[q.type] ?? q.type}</Tag>
                  <span className="tnum">{q.points} pts</span>
                  {q.type === 'SCALE' && <span>Escala 1–{q.scaleMax}</span>}
                </div>
                {q.options.length > 0 && (
                  <ul className="mt-2 grid gap-0.5 text-sm">
                    {q.options.map((o, j) => <li key={j} className="flex items-center gap-2">{o.isCorrect ? <Check className="size-3.5 text-ink" strokeWidth={3} aria-label="Correcta" /> : <span className="inline-block size-3.5" />}<span className={o.isCorrect ? 'font-semibold' : 'text-graphite'}>{o.text}</span></li>)}
                  </ul>
                )}
              </div>
              <MoveButtons index={i} total={list.length} label={`pregunta ${i + 1}`} onMove={(to) => move(i, to)} />
              <IconButton label={`Editar pregunta ${i + 1}`} size="sm" onClick={() => setEdit(q)}><Pencil className="size-4" /></IconButton>
              <IconButton label={`Eliminar pregunta ${i + 1}`} size="sm" onClick={() => setDel(q)}><Trash2 className="size-4 text-danger" /></IconButton>
            </li>
          ))}
        </ol>
      )}
      {edit && <QuestionModal assessmentId={assessmentId} question={edit === 'new' ? null : edit} onClose={() => setEdit(null)} onSaved={onChanged} />}
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} title="Eliminar pregunta" description="Se eliminará la pregunta. Si ya tiene respuestas de estudiantes, el servidor lo impedirá." confirmLabel="Eliminar" loading={rm.isPending} onConfirm={() => del && rm.mutate(del.id)} />
    </div>
  );
}

function QuestionModal({ assessmentId, question, onClose, onSaved }: { assessmentId: number; question: Question | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState(() => question ? { type: question.type, text: question.text, explanation: question.explanation ?? '', points: String(question.points), scaleMax: String(question.scaleMax ?? 5), competencyId: question.competencyId ? String(question.competencyId) : '', options: question.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })) } : blank());
  const [error, setError] = useState<string | null>(null);
  const comps = useQuery({ queryKey: ['competencies'], queryFn: () => api.get<CompetencyOpt[]>('/competencies') });

  const changeType = (type: string) => {
    const b = blank(type);
    setF((p) => ({ ...p, type, options: b.options }));
  };

  const body = () => ({
    type: f.type, text: f.text.trim(), explanation: f.explanation.trim() || null, points: Number(f.points),
    scaleMax: f.type === 'SCALE' ? Number(f.scaleMax) : null, competencyId: f.competencyId ? Number(f.competencyId) : null,
    options: ['OPEN', 'SCALE'].includes(f.type) ? [] : f.options.filter((o) => o.text.trim()).map((o) => ({ text: o.text.trim(), isCorrect: o.isCorrect })),
  });
  const save = useAction(() => (question ? api.patch(`/assessments/questions/${question.id}`, body()) : api.post(`/assessments/${assessmentId}/questions`, body())),
    { success: 'Pregunta guardada', silentError: true, onSuccess: () => { onSaved(); onClose(); } });
  const submit = async () => {
    const b = body();
    const v = validateQuestion({ type: b.type, text: b.text, points: b.points, scaleMax: b.scaleMax, options: b.options as QOption[] });
    setError(v);
    if (v) return;
    try { await save.mutateAsync(); } catch (e) { if (e instanceof ApiError) { setError(e.message); toast.error(e.message); } }
  };

  const setOpt = (i: number, patch: Partial<QOption>) => setF((p) => ({ ...p, options: p.options.map((o, j) => (j === i ? { ...o, ...patch } : o)) }));
  const setCorrect = (i: number) => setF((p) => ({ ...p, options: p.options.map((o, j) => (p.type === 'MULTIPLE_SELECT' ? (j === i ? { ...o, isCorrect: !o.isCorrect } : o) : { ...o, isCorrect: j === i }) ) }));

  return (
    <Modal open onClose={onClose} size="lg" title={question ? 'Editar pregunta' : 'Nueva pregunta'}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button variant="primary" loading={save.isPending} onClick={submit}>Guardar pregunta</Button></>}>
      <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        {error && <p role="alert" className="border-t border-danger bg-stone px-3 py-2 text-sm font-semibold text-danger">{error}</p>}
        <Select label="Tipo de pregunta" value={f.type} onChange={(e) => changeType(e.target.value)} options={toOptions(QUESTION_TYPES)} disabled={!!question && false} />
        <Textarea label="Enunciado" required value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} rows={3} />
        {['MULTIPLE_CHOICE', 'MULTIPLE_SELECT'].includes(f.type) && (
          <fieldset>
            <legend className="text-[0.8125rem] font-semibold">Opciones <span className="font-normal text-muted">({f.type === 'MULTIPLE_CHOICE' ? 'marca la única correcta' : 'marca todas las correctas'})</span></legend>
            <ul className="mt-2 grid gap-2">
              {f.options.map((o, i) => (
                <li key={i} className="flex items-center gap-2">
                  <input type={f.type === 'MULTIPLE_CHOICE' ? 'radio' : 'checkbox'} name="correct" checked={o.isCorrect} onChange={() => setCorrect(i)} aria-label={`Opción ${i + 1} correcta`} className="size-4 accent-ink" />
                  <input value={o.text} onChange={(e) => setOpt(i, { text: e.target.value })} aria-label={`Texto de la opción ${i + 1}`} placeholder={`Opción ${i + 1}`} className="h-10 min-w-0 flex-1 rounded-sm border border-line-strong px-3 text-sm focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink" />
                  <IconButton label={`Quitar opción ${i + 1}`} size="sm" disabled={f.options.length <= 2} onClick={() => setF({ ...f, options: f.options.filter((_, j) => j !== i) })}><X className="size-4" /></IconButton>
                </li>
              ))}
            </ul>
            <Button variant="ghost" size="sm" className="mt-2" icon={<Plus className="size-4" />} onClick={() => setF({ ...f, options: [...f.options, { text: '', isCorrect: false }] })}>Añadir opción</Button>
          </fieldset>
        )}
        {f.type === 'TRUE_FALSE' && (
          <fieldset>
            <legend className="text-[0.8125rem] font-semibold">Respuesta correcta</legend>
            <div className="mt-2 flex gap-6">
              {f.options.map((o, i) => (
                <label key={i} className="inline-flex items-center gap-2 text-sm"><input type="radio" name="tf" className="size-4 accent-ink" checked={o.isCorrect} onChange={() => setCorrect(i)} />{o.text}</label>
              ))}
            </div>
          </fieldset>
        )}
        {f.type === 'SCALE' && <Input label="Valor máximo de la escala" type="number" min={2} max={10} value={f.scaleMax} onChange={(e) => setF({ ...f, scaleMax: e.target.value })} hint="Entre 2 y 10. Se usa en autoevaluaciones y no cuenta como incorrecta." />}
        {f.type === 'OPEN' && <p className="text-sm text-graphite">Las preguntas abiertas se califican manualmente desde la pestaña Intentos.</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Puntos" type="number" min={0.5} step="0.5" value={f.points} onChange={(e) => setF({ ...f, points: e.target.value })} />
          <Select label="Competencia vinculada" value={f.competencyId} onChange={(e) => setF({ ...f, competencyId: e.target.value })} placeholder="Ninguna" options={(comps.data ?? []).map((c) => ({ value: c.id, label: c.name }))} />
        </div>
        <Textarea label="Explicación (se muestra al revisar resultados)" value={f.explanation} onChange={(e) => setF({ ...f, explanation: e.target.value })} rows={2} />
      </form>
    </Modal>
  );
}
