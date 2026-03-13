import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
import { getCurrentPeriodKey, getPeriodLabel, CATEGORIA_LABELS, formatDateShort } from '@/lib/obligaciones';

interface Obligacion {
  id: string;
  nombre: string;
  categoria: string;
  presentacion: string | null;
  fecha_vencimiento: string | null;
}

interface Props {
  obligaciones: Obligacion[];
  cumplimientos: Record<string, boolean>;
  empresaNombre: string;
}

export function ExportarCumplimientoButton({ obligaciones, cumplimientos, empresaNombre }: Props) {
  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const now = new Date().toLocaleDateString('es-MX');

    // Header
    doc.setFontSize(16);
    doc.text(`Reporte de Cumplimiento - ${empresaNombre}`, 14, 20);
    doc.setFontSize(10);
    doc.text(`Generado: ${now}`, 14, 28);

    // Table header
    const startY = 38;
    const cols = [14, 90, 140, 185, 230];
    const headers = ['Obligación', 'Categoría', 'Presentación', 'Vencimiento', 'Estado'];

    doc.setFillColor(41, 37, 36);
    doc.rect(14, startY - 6, 270, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    headers.forEach((h, i) => doc.text(h, cols[i], startY));

    // Rows
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    let y = startY + 10;

    obligaciones.forEach(ob => {
      if (y > 190) {
        doc.addPage();
        y = 20;
      }
      const pk = getCurrentPeriodKey(ob.presentacion);
      const isCompleted = cumplimientos[`${ob.id}:${pk}`] || false;
      const nombre = ob.nombre.length > 40 ? ob.nombre.substring(0, 40) + '…' : ob.nombre;

      doc.text(nombre, cols[0], y);
      doc.text(CATEGORIA_LABELS[ob.categoria] || ob.categoria, cols[1], y);
      doc.text(ob.presentacion || '-', cols[2], y);
      doc.text(formatDateShort(ob.fecha_vencimiento), cols[3], y);
      doc.text(isCompleted ? '✓ Cumplida' : '○ Pendiente', cols[4], y);
      y += 7;
    });

    // Summary
    const completadas = obligaciones.filter(ob => {
      const pk = getCurrentPeriodKey(ob.presentacion);
      return cumplimientos[`${ob.id}:${pk}`];
    }).length;

    y += 5;
    if (y > 185) { doc.addPage(); y = 20; }
    doc.setFontSize(10);
    doc.text(`Total: ${obligaciones.length} | Cumplidas: ${completadas} | Pendientes: ${obligaciones.length - completadas}`, 14, y);

    doc.save(`Cumplimiento_${empresaNombre.replace(/\s+/g, '_')}_${now}.pdf`);
  };

  return (
    <Button variant="outline" size="sm" onClick={exportPDF} className="gap-1.5">
      <FileDown className="w-4 h-4" />
      Exportar PDF
    </Button>
  );
}
