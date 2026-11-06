import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

export type ColType = 'text' | 'date' | 'datetime' | 'money' | 'number' | 'pct';
export interface Col {
  header: string;
  key: string;
  width?: number;
  type?: ColType;
}
export interface Table {
  title: string;
  columns: Col[];
  rows: Record<string, unknown>[];
}

const ORANGE = 'FFEE7A2F';
const pad = (n: number) => String(n).padStart(2, '0');
const fmtDate = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
const fmtDateTime = (d: Date) => `${fmtDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;

function asDate(v: unknown): Date | null {
  if (v instanceof Date) return v;
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export async function buildXlsx(tables: Table[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'CEHACIS';
  wb.created = new Date();
  for (const t of tables) {
    const ws = wb.addWorksheet(t.title.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || 'Reporte');
    ws.columns = t.columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 16 }));
    const head = ws.getRow(1);
    head.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    head.alignment = { vertical: 'middle', wrapText: true };
    head.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ORANGE } };
    });
    head.height = 22;
    for (const row of t.rows) {
      const out: Record<string, unknown> = {};
      for (const c of t.columns) {
        const v = row[c.key];
        if (v == null || v === '') out[c.key] = null;
        else if (c.type === 'date' || c.type === 'datetime') out[c.key] = asDate(v);
        else if (c.type === 'money' || c.type === 'number' || c.type === 'pct') out[c.key] = Number(v);
        else out[c.key] = v;
      }
      ws.addRow(out);
    }
    t.columns.forEach((c, i) => {
      const col = ws.getColumn(i + 1);
      if (c.type === 'date') col.numFmt = 'dd/mm/yyyy';
      else if (c.type === 'datetime') col.numFmt = 'dd/mm/yyyy hh:mm';
      else if (c.type === 'money') col.numFmt = '#,##0.00';
      else if (c.type === 'pct') col.numFmt = '0.0"%"';
      else if (c.type === 'number') col.numFmt = '#,##0.##';
    });
    head.eachCell((cell) => {
      cell.numFmt = 'General';
    });
    ws.views = [{ state: 'frozen', ySplit: 1 }];
    if (t.rows.length) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: t.columns.length } };
  }
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf as ArrayBuffer);
}

function cellText(c: Col, v: unknown): string {
  if (v == null || v === '') return '';
  switch (c.type) {
    case 'date': {
      const d = asDate(v);
      return d ? fmtDate(d) : '';
    }
    case 'datetime': {
      const d = asDate(v);
      return d ? fmtDateTime(d) : '';
    }
    case 'money':
      return Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    case 'pct':
      return `${Number(v).toFixed(1)}%`;
    case 'number':
      return String(Number(v));
    default:
      return String(v);
  }
}

const MAX_PDF_ROWS = 3000;

export function buildPdf(title: string, subtitle: string, tables: Table[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const widest = Math.max(...tables.map((t) => t.columns.length));
    const doc = new PDFDocument({ size: 'A4', layout: widest > 6 ? 'landscape' : 'portrait', margin: 36, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const left = doc.page.margins.left;
    const usable = doc.page.width - left - doc.page.margins.right;
    const bottom = () => doc.page.height - doc.page.margins.bottom - 20;

    const header = () => {
      doc.fillColor('#EE7A2F').font('Helvetica-Bold').fontSize(20).text('CEHACIS', left, 36, { lineBreak: false });
      doc.fillColor('#555555').font('Helvetica').fontSize(9).text('Centro de Habilidades Cognitivas y Sociales', left, 60, { lineBreak: false });
      doc.moveTo(left, 76).lineTo(left + usable, 76).lineWidth(1.5).strokeColor('#EE7A2F').stroke();
      doc.y = 88;
    };
    header();
    doc.fillColor('#111111').font('Helvetica-Bold').fontSize(14).text(title, left, doc.y);
    doc.fillColor('#666666').font('Helvetica').fontSize(9).text(subtitle, left, doc.y + 2);
    doc.moveDown(0.8);

    for (const t of tables) {
      const cols = t.columns;
      const totalW = cols.reduce((s, c) => s + (c.width ?? 16), 0);
      const widths = cols.map((c) => ((c.width ?? 16) / totalW) * usable);
      const rowH = 18;
      const drawHead = () => {
        let x = left;
        const y = doc.y;
        doc.rect(left, y, usable, rowH).fill('#EE7A2F');
        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8);
        cols.forEach((c, i) => {
          doc.text(c.header, x + 3, y + 5, { width: widths[i] - 6, height: rowH - 5, ellipsis: true, lineBreak: false });
          x += widths[i];
        });
        doc.y = y + rowH;
      };
      if (doc.y > bottom() - 60) {
        doc.addPage();
        header();
      }
      if (tables.length > 1) {
        doc.fillColor('#111111').font('Helvetica-Bold').fontSize(11).text(t.title, left, doc.y);
        doc.moveDown(0.3);
      }
      drawHead();
      const rows = t.rows.slice(0, MAX_PDF_ROWS);
      rows.forEach((row, ri) => {
        if (doc.y + rowH > bottom()) {
          doc.addPage();
          header();
          drawHead();
        }
        const y = doc.y;
        if (ri % 2 === 1) doc.rect(left, y, usable, rowH).fill('#FFF4EC');
        doc.fillColor('#222222').font('Helvetica').fontSize(8);
        let x = left;
        cols.forEach((c, i) => {
          const numeric = c.type === 'money' || c.type === 'number' || c.type === 'pct';
          doc.text(cellText(c, row[c.key]), x + 3, y + 5, { width: widths[i] - 6, height: rowH - 5, ellipsis: true, lineBreak: false, align: numeric ? 'right' : 'left' });
          x += widths[i];
        });
        doc.y = y + rowH;
      });
      if (!rows.length) {
        doc.fillColor('#777777').font('Helvetica-Oblique').fontSize(9).text('Sin datos para el periodo seleccionado.', left, doc.y + 6);
        doc.moveDown(1);
      }
      if (t.rows.length > MAX_PDF_ROWS) {
        doc.fillColor('#777777').font('Helvetica-Oblique').fontSize(8).text(`Se muestran ${MAX_PDF_ROWS} de ${t.rows.length} filas. Descarga el XLSX para el detalle completo.`, left, doc.y + 4);
      }
      doc.moveDown(1.2);
    }

    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      doc.page.margins.bottom = 0; // evita que pdfkit añada una página al escribir el pie
      doc.fillColor('#888888').font('Helvetica').fontSize(8);
      doc.text(`CEHACIS · Generado el ${fmtDateTime(new Date())} · Página ${i + 1} de ${range.count}`, left, doc.page.height - 30, { width: usable, align: 'center', lineBreak: false });
    }
    doc.end();
  });
}
