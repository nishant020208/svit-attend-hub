import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function exportTablePdf(opts: {
  title: string;
  subtitle?: string;
  columns: string[];
  rows: (string | number)[][];
  filename?: string;
}) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  doc.setFontSize(16);
  doc.text(opts.title, 40, 40);
  if (opts.subtitle) {
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(opts.subtitle, 40, 58);
  }
  autoTable(doc, {
    startY: 75,
    head: [opts.columns],
    body: opts.rows,
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { left: 40, right: 40 },
  });
  doc.save(opts.filename || `${opts.title.replace(/\s+/g, "_").toLowerCase()}.pdf`);
}
