import PDFDocument from 'pdfkit';
import XLSX from 'xlsx';
import { round2 } from '../utils/helpers.js';

export const exportExcel = ({ headers, rows, sheetName = 'Report' }) => {
  const data = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
};

/** Renders a simple table report to a PDF buffer. */
export const exportPdf = ({ title, subtitle, headers, rows }) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).text(title, { align: 'center' });
    if (subtitle) doc.fontSize(10).fillColor('#555').text(subtitle, { align: 'center' });
    doc.moveDown(1).fillColor('#000').fontSize(10);

    const widths = headers.map(() => Math.floor((doc.page.width - 80) / headers.length));
    const drawRow = (cells, bold = false) => {
      const y = doc.y;
      cells.forEach((cell, i) => {
        doc
          .font(bold ? 'Helvetica-Bold' : 'Helvetica')
          .text(String(cell ?? ''), 40 + widths.slice(0, i).reduce((a, b) => a + b, 0), y, {
            width: widths[i],
            ellipsis: true,
          });
      });
      doc.moveDown(0.4);
      if (doc.y > doc.page.height - 60) doc.addPage();
    };

    drawRow(headers, true);
    rows.forEach((r) => drawRow(r));
    doc.end();
  });

export const percentageCell = (n) => `${round2(n)}%`;

export default { exportExcel, exportPdf, percentageCell };
