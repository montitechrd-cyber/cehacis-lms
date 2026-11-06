import { useEffect, useMemo } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Youtube from '@tiptap/extension-youtube';
import clsx from 'clsx';
import { Bold, Heading2, Heading3, Italic, Link2, List, ListOrdered, Minus, Quote, Redo2, Undo2, Youtube as YoutubeIcon } from 'lucide-react';

/** Saneado defensivo en cliente (el servidor ya sanea al guardar). Elimina scripts, manejadores on* y URLs javascript:. */
export function sanitizeHtml(html: string) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script,style,object,embed,form,input,button,textarea,select').forEach((n) => n.remove());
  doc.querySelectorAll('iframe').forEach((f) => {
    const src = f.getAttribute('src') ?? '';
    if (!/^https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com|player\.vimeo\.com)\//.test(src)) f.remove();
  });
  doc.querySelectorAll('*').forEach((el) => {
    for (const a of Array.from(el.attributes)) {
      if (a.name.startsWith('on') || (['href', 'src'].includes(a.name) && /^\s*javascript:/i.test(a.value))) el.removeAttribute(a.name);
    }
    if (el.tagName === 'A') {
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener noreferrer');
    }
  });
  return doc.body.innerHTML;
}

/** Muestra HTML de lecciones saneado con la tipografía editorial del aula. */
export function RichTextView({ html, className }: { html?: string | null; className?: string }) {
  const clean = useMemo(() => sanitizeHtml(html ?? ''), [html]);
  if (!clean.trim()) return null;
  return <div className={clsx('prose-lesson', className)} dangerouslySetInnerHTML={{ __html: clean }} />;
}

function Tool({ onClick, active, label, children, disabled }: { onClick: () => void; active?: boolean; label: string; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={clsx('inline-flex size-8 items-center justify-center rounded-xs transition-colors disabled:opacity-35', active ? 'bg-ink text-paper' : 'text-ink hover:bg-stone-2')}
    >
      {children}
    </button>
  );
}

/** Editor de contenido enriquecido para lecciones, anuncios y descripciones. */
export function RichTextEditor({ value, onChange, placeholder = 'Escribe el contenido…', minHeight = 288 }: { value: string; onChange: (html: string) => void; placeholder?: string; minHeight?: number }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, link: false }),
      Link.configure({ openOnClick: false, autolink: true, protocols: ['http', 'https', 'mailto'] }),
      Youtube.configure({ nocookie: true, width: 640, height: 360 }),
    ],
    content: value,
    editorProps: { attributes: { class: 'prose-lesson tiptap px-4 py-4', 'data-placeholder': placeholder, style: `min-height:${minHeight}px` } },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) editor.commands.setContent(value || '', { emitUpdate: false });
  }, [value, editor]);

  if (!editor) return null;
  const setLink = () => {
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Dirección del enlace (https://…)', prev ?? 'https://');
    if (url === null) return;
    if (url === '') editor.chain().focus().unsetLink().run();
    else editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };
  const addVideo = () => {
    const url = window.prompt('Enlace de YouTube');
    if (url) editor.commands.setYoutubeVideo({ src: url });
  };
  return (
    <div className="rounded-sm border border-line-strong bg-paper focus-within:border-ink focus-within:ring-1 focus-within:ring-ink">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-line bg-stone px-1.5 py-1" role="toolbar" aria-label="Formato">
        <Tool label="Título" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="size-4" /></Tool>
        <Tool label="Subtítulo" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 className="size-4" /></Tool>
        <span className="mx-1 h-5 w-px bg-line" />
        <Tool label="Negrita" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="size-4" /></Tool>
        <Tool label="Cursiva" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="size-4" /></Tool>
        <Tool label="Enlace" active={editor.isActive('link')} onClick={setLink}><Link2 className="size-4" /></Tool>
        <span className="mx-1 h-5 w-px bg-line" />
        <Tool label="Lista" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="size-4" /></Tool>
        <Tool label="Lista numerada" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="size-4" /></Tool>
        <Tool label="Cita destacada" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote className="size-4" /></Tool>
        <Tool label="Separador" onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus className="size-4" /></Tool>
        <Tool label="Video de YouTube" onClick={addVideo}><YoutubeIcon className="size-4" /></Tool>
        <span className="ml-auto flex">
          <Tool label="Deshacer" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}><Undo2 className="size-4" /></Tool>
          <Tool label="Rehacer" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}><Redo2 className="size-4" /></Tool>
        </span>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
