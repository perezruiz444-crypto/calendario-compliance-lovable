import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';
import { PDFDocument, rgb, StandardFonts } from 'https://esm.sh/pdf-lib@1.17.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReportPDFRequest {
  empresaId: string;
  reportData: any;
  period: string;
  reportType: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { empresaId, reportData, period, reportType }: ReportPDFRequest = await req.json();

    console.log('Generating PDF report for empresa:', empresaId);

    // Get empresa details
    const { data: empresa, error: empresaError } = await supabaseClient
      .from('empresas')
      .select('razon_social, rfc')
      .eq('id', empresaId)
      .single();

    if (empresaError) throw empresaError;

    // Create PDF document
    const pdfDoc = await PDFDocument.create();
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let page = pdfDoc.addPage([595, 842]); // A4 size
    const { width, height } = page.getSize();
    let yPosition = height - 50;

    const periodText = period === 'mes_actual' ? 'Mes Actual' :
                       period === 'mes_anterior' ? 'Mes Anterior' :
                       period === 'trimestre' ? 'Último Trimestre' :
                       period === 'semestre' ? 'Último Semestre' : 'Año Actual';

    // Header
    page.drawText('REPORTE DE GESTIÓN', {
      x: 50,
      y: yPosition,
      size: 24,
      font: helveticaBold,
      color: rgb(0.12, 0.25, 0.69), // Blue color
    });
    yPosition -= 30;

    page.drawText(`${empresa.razon_social}`, {
      x: 50,
      y: yPosition,
      size: 14,
      font: helveticaBold,
      color: rgb(0.2, 0.2, 0.2),
    });
    yPosition -= 20;

    page.drawText(`RFC: ${empresa.rfc}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: helveticaFont,
      color: rgb(0.4, 0.4, 0.4),
    });
    yPosition -= 15;

    page.drawText(`Período: ${periodText}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: helveticaFont,
      color: rgb(0.4, 0.4, 0.4),
    });
    yPosition -= 15;

    page.drawText(`Tipo: ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: helveticaFont,
      color: rgb(0.4, 0.4, 0.4),
    });
    yPosition -= 30;

    // Horizontal line
    page.drawLine({
      start: { x: 50, y: yPosition },
      end: { x: width - 50, y: yPosition },
      thickness: 2,
      color: rgb(0.12, 0.25, 0.69),
    });
    yPosition -= 30;

    // Resumen Section
    page.drawText('RESUMEN', {
      x: 50,
      y: yPosition,
      size: 16,
      font: helveticaBold,
      color: rgb(0.12, 0.25, 0.69),
    });
    yPosition -= 25;

    const resumen = [
      { label: 'Total Tareas:', value: reportData.resumen.totalTareas.toString() },
      { label: 'Completadas:', value: reportData.resumen.tareasCompletadas.toString() },
      { label: 'Pendientes:', value: reportData.resumen.tareasPendientes.toString() },
      { label: 'Tasa de Completitud:', value: `${reportData.resumen.tasaCompletitud}%` },
    ];

    for (const item of resumen) {
      if (yPosition < 100) {
        page = pdfDoc.addPage([595, 842]);
        yPosition = height - 50;
      }

      page.drawText(item.label, {
        x: 70,
        y: yPosition,
        size: 11,
        font: helveticaFont,
        color: rgb(0.3, 0.3, 0.3),
      });

      page.drawText(item.value, {
        x: 250,
        y: yPosition,
        size: 11,
        font: helveticaBold,
        color: rgb(0, 0, 0),
      });
      yPosition -= 20;
    }

    yPosition -= 20;

    // Tareas por Estado
    if (reportData.tareasPorEstado.length > 0) {
      if (yPosition < 200) {
        page = pdfDoc.addPage([595, 842]);
        yPosition = height - 50;
      }

      page.drawText('TAREAS POR ESTADO', {
        x: 50,
        y: yPosition,
        size: 14,
        font: helveticaBold,
        color: rgb(0.12, 0.25, 0.69),
      });
      yPosition -= 25;

      for (const item of reportData.tareasPorEstado) {
        if (yPosition < 100) {
          page = pdfDoc.addPage([595, 842]);
          yPosition = height - 50;
        }

        page.drawText(`${item.name}:`, {
          x: 70,
          y: yPosition,
          size: 10,
          font: helveticaFont,
          color: rgb(0.3, 0.3, 0.3),
        });

        page.drawText(item.value.toString(), {
          x: 250,
          y: yPosition,
          size: 10,
          font: helveticaBold,
          color: rgb(0, 0, 0),
        });
        yPosition -= 18;
      }
      yPosition -= 20;
    }

    // Tareas por Prioridad
    if (reportData.tareasPorPrioridad.length > 0) {
      if (yPosition < 200) {
        page = pdfDoc.addPage([595, 842]);
        yPosition = height - 50;
      }

      page.drawText('TAREAS POR PRIORIDAD', {
        x: 50,
        y: yPosition,
        size: 14,
        font: helveticaBold,
        color: rgb(0.12, 0.25, 0.69),
      });
      yPosition -= 25;

      for (const item of reportData.tareasPorPrioridad) {
        if (yPosition < 100) {
          page = pdfDoc.addPage([595, 842]);
          yPosition = height - 50;
        }

        page.drawText(`${item.name}:`, {
          x: 70,
          y: yPosition,
          size: 10,
          font: helveticaFont,
          color: rgb(0.3, 0.3, 0.3),
        });

        page.drawText(item.value.toString(), {
          x: 250,
          y: yPosition,
          size: 10,
          font: helveticaBold,
          color: rgb(0, 0, 0),
        });
        yPosition -= 18;
      }
      yPosition -= 20;
    }

    // Certificaciones próximas a vencer
    if (reportData.certificacionesVencimiento.length > 0) {
      if (yPosition < 250) {
        page = pdfDoc.addPage([595, 842]);
        yPosition = height - 50;
      }

      page.drawText('CERTIFICACIONES PRÓXIMAS A VENCER', {
        x: 50,
        y: yPosition,
        size: 14,
        font: helveticaBold,
        color: rgb(0.96, 0.6, 0.05), // Warning color
      });
      yPosition -= 25;

      for (const cert of reportData.certificacionesVencimiento.slice(0, 10)) {
        if (yPosition < 100) {
          page = pdfDoc.addPage([595, 842]);
          yPosition = height - 50;
        }

        page.drawText(`${cert.tipo}`, {
          x: 70,
          y: yPosition,
          size: 10,
          font: helveticaBold,
          color: rgb(0.2, 0.2, 0.2),
        });
        yPosition -= 15;

        page.drawText(`Vence: ${cert.fecha_vencimiento} (${cert.dias_restantes} días)`, {
          x: 70,
          y: yPosition,
          size: 9,
          font: helveticaFont,
          color: rgb(0.5, 0.5, 0.5),
        });
        yPosition -= 20;
      }
    }

    // Footer
    const currentPage = pdfDoc.getPages()[pdfDoc.getPageCount() - 1];
    const footerY = 30;
    currentPage.drawText(`Generado el ${new Date().toLocaleString('es-MX')}`, {
      x: 50,
      y: footerY,
      size: 8,
      font: helveticaFont,
      color: rgb(0.5, 0.5, 0.5),
    });

    // Save PDF
    const pdfBytes = await pdfDoc.save();

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="reporte-${empresa.razon_social.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('Error in generate-report-pdf function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
