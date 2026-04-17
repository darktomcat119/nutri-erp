import PDFDocument from 'pdfkit';

export interface PdfTableColumn {
  header: string;
  key: string;
  width: number;
  align?: 'left' | 'center' | 'right';
}

export function createPdfDocument(): typeof PDFDocument.prototype {
  return new PDFDocument({ size: 'LETTER', margin: 40 });
}

export function drawHeader(doc: typeof PDFDocument.prototype, title: string, subtitle: string) {
  doc.fontSize(18).font('Helvetica-Bold').text('Nutri Cafeteria S.A. de C.V.', { align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(14).text(title, { align: 'center' });
  doc.moveDown(0.2);
  doc.fontSize(10).font('Helvetica').fillColor('#666').text(subtitle, { align: 'center' });
  doc.fillColor('#000');
  doc.moveDown(0.5);
  doc.moveTo(40, doc.y).lineTo(572, doc.y).stroke('#ddd');
  doc.moveDown(0.5);
}

export function drawInfoRow(doc: typeof PDFDocument.prototype, label: string, value: string) {
  doc.fontSize(10).font('Helvetica-Bold').text(label + ': ', { continued: true });
  doc.font('Helvetica').text(value);
}

export function drawTable(doc: typeof PDFDocument.prototype, columns: PdfTableColumn[], rows: Record<string, string | number>[]) {
  const startX = 40;
  let y = doc.y + 5;

  // Header
  doc.fontSize(8).font('Helvetica-Bold');
  doc.rect(startX, y, 532, 18).fill('#3b82f6');
  doc.fillColor('#fff');
  let x = startX;
  for (const col of columns) {
    doc.text(col.header, x + 4, y + 4, { width: col.width - 8, align: col.align || 'left' });
    x += col.width;
  }
  doc.fillColor('#000');
  y += 18;

  // Rows
  doc.font('Helvetica').fontSize(8);
  for (let i = 0; i < rows.length; i++) {
    if (y > 700) {
      doc.addPage();
      y = 40;
    }
    const row = rows[i];
    if (i % 2 === 0) {
      doc.rect(startX, y, 532, 16).fill('#f8fafc');
      doc.fillColor('#000');
    }
    x = startX;
    for (const col of columns) {
      const val = String(row[col.key] ?? '');
      doc.text(val, x + 4, y + 3, { width: col.width - 8, align: col.align || 'left' });
      x += col.width;
    }
    y += 16;
  }

  doc.y = y + 5;
}

export function drawFooter(doc: typeof PDFDocument.prototype) {
  const bottom = doc.page.height - 40;
  doc.fontSize(8).fillColor('#999').text(
    `Generado: ${new Date().toLocaleString('es-MX')} — Nutri Cafeteria ERP`,
    40, bottom, { align: 'center', width: 532 }
  );
  doc.fillColor('#000');
}
