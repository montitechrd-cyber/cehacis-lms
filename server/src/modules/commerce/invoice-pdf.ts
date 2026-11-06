import PDFDocument from 'pdfkit';
import type { Response } from 'express';
import { prisma } from '../../lib/prisma.js';
import { getBrand } from '../../lib/settings.js';
import { notFound } from '../../lib/errors.js';

const usd = (n: unknown) => 'USD ' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d: Date) => d.toLocaleDateString('es-DO', { year: 'numeric', month: 'long', day: 'numeric' });

/** Carga la factura con todo lo necesario para dibujarla. */
export async function loadInvoice(id: number) {
  const inv = await prisma.invoice.findUnique({
    where: { id },
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
      order: { include: { items: true } },
    },
  });
  if (!inv) throw notFound('Factura no encontrada');
  return inv;
}

export async function streamInvoicePdf(res: Response, inv: Awaited<ReturnType<typeof loadInvoice>>) {
  const brand = await getBrand();
  const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: `Factura ${inv.number}`, Author: brand.name } });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${inv.number}.pdf"`);
  doc.pipe(res);

  const left = 50;
  const right = doc.page.width - 50;
  const width = right - left;
  let y = 50;

  if (inv.isTest) {
    doc.save().rect(0, 0, doc.page.width, 30).fill('#B91C1C').restore();
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(11).text('DOCUMENTO DE PRUEBA — SIN VALIDEZ FISCAL', 0, 10, { width: doc.page.width, align: 'center' });
    y = 55;
  }

  doc.fillColor(brand.primaryColor || '#EE7A2F').font('Helvetica-Bold').fontSize(20).text(brand.name, left, y);
  doc.fillColor('#1b2236').font('Helvetica').fontSize(9).text(brand.legalName, left, y + 26, { width: 300 });
  doc.text([brand.contactEmail, brand.contactPhone].filter(Boolean).join('  ·  '), left, doc.y + 2, { width: 300 });
  if (brand.address) doc.text(brand.address, left, doc.y + 2, { width: 300 });

  doc.fillColor('#1b2236').font('Helvetica-Bold').fontSize(18).text('FACTURA', left, y, { width, align: 'right' });
  doc.font('Helvetica').fontSize(10).text(`N.º ${inv.number}`, left, y + 24, { width, align: 'right' });
  doc.text(`Fecha: ${fmtDate(inv.issuedAt)}`, left, y + 38, { width, align: 'right' });
  doc.text(`Pedido: ${inv.order.number}`, left, y + 52, { width, align: 'right' });
  doc.text(`NCF: ${inv.ncf ?? 'Pendiente de configuración'}`, left, y + 66, { width, align: 'right' });

  y = Math.max(doc.y, y + 90) + 20;
  doc.moveTo(left, y).lineTo(right, y).strokeColor('#DDDDDD').stroke();
  y += 12;
  doc.fillColor('#6B6B6B').font('Helvetica-Bold').fontSize(8).text('FACTURADO A', left, y);
  doc.fillColor('#1b2236').font('Helvetica').fontSize(10);
  doc.text(inv.billingName, left, y + 12);
  if (inv.billingTaxId) doc.text(`RNC / Cédula: ${inv.billingTaxId}`, left, doc.y + 1);
  doc.text(inv.user.email, left, doc.y + 1);

  y = doc.y + 22;
  const colQty = left + width - 215;
  const colUnit = left + width - 150;
  const colTotal = left + width - 75;
  const header = (yy: number) => {
    doc.save().rect(left, yy, width, 20).fill('#F3F3F3').restore();
    doc.fillColor('#1b2236').font('Helvetica-Bold').fontSize(9);
    doc.text('Descripción', left + 8, yy + 6, { width: colQty - left - 16 });
    doc.text('Cant.', colQty, yy + 6, { width: 40, align: 'right' });
    doc.text('Precio', colUnit, yy + 6, { width: 70, align: 'right' });
    doc.text('Importe', colTotal, yy + 6, { width: 75 - 8, align: 'right' });
    return yy + 26;
  };
  y = header(y);
  doc.font('Helvetica').fontSize(9.5);
  for (const it of inv.order.items) {
    if (y > doc.page.height - 190) {
      doc.addPage();
      y = header(50);
      doc.font('Helvetica').fontSize(9.5);
    }
    const h = doc.heightOfString(it.description, { width: colQty - left - 16 });
    doc.fillColor('#1b2236');
    doc.text(it.description, left + 8, y, { width: colQty - left - 16 });
    doc.text(String(it.quantity), colQty, y, { width: 40, align: 'right' });
    doc.text(usd(it.unitPrice), colUnit, y, { width: 70, align: 'right' });
    doc.text(usd(it.total), colTotal, y, { width: 67, align: 'right' });
    y += Math.max(h, 12) + 8;
    doc.moveTo(left, y - 4).lineTo(right, y - 4).strokeColor('#EEEEEE').stroke();
  }

  if (y > doc.page.height - 170) {
    doc.addPage();
    y = 50;
  }
  y += 10;
  const lbl = left + width - 230;
  const row = (label: string, val: string, bold = false) => {
    doc.fillColor('#1b2236').font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 11 : 10);
    doc.text(label, lbl, y, { width: 120 });
    doc.text(val, lbl + 110, y, { width: 120, align: 'right' });
    y += bold ? 20 : 16;
  };
  row('Subtotal', usd(inv.subtotal));
  row('Descuento', '- ' + usd(inv.discount));
  row('Impuestos', usd(inv.tax));
  doc.moveTo(lbl, y).lineTo(right, y).strokeColor('#1b2236').stroke();
  y += 6;
  row('TOTAL', usd(inv.total), true);

  doc.fillColor('#6B6B6B').font('Helvetica').fontSize(8);
  doc.text(`Moneda: ${inv.currency}. Comprobante fiscal (NCF): ${inv.ncf ?? 'Pendiente de configuración'}.`, left, y + 20, { width });
  if (inv.isTest) {
    doc.fillColor('#B91C1C').font('Helvetica-Bold').fontSize(9).text('Esta factura corresponde a una transacción de prueba (entorno sandbox). No se realizó ningún cobro real y no tiene validez fiscal.', left, doc.y + 6, { width });
  }
  doc.end();
}
