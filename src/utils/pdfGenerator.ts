import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper to get image ratio
const getImageRatio = (base64: string): Promise<number> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve(img.height / img.width);
    };
    img.onerror = () => {
      resolve(0.6); // default ratio
    };
    img.src = base64;
  });
};

// Helper to load image as base64
const loadImageAsBase64 = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Error loading image as base64:", error);
    return "";
  }
};

export const generateInvoicePDF = async (invoiceData: any, configData: any) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Datos base
  const razonSocial = configData.nombreEmisor || "Nombre de Empresa";
  const nombreFantasia = configData.nombreFantasia || razonSocial;
  const cuit = configData.cuit || "00-00000000-0";
  const ptoVta = (invoiceData.ptoVta || configData.puntoVenta || "1").toString().padStart(5, '0');
  const cbteNro = (invoiceData.voucherNumber || "0").toString().padStart(8, '0');
  const fechaEmi = invoiceData.date || new Date().toISOString().split('T')[0];
  const total = invoiceData.amount || 0;

  // Nuevos datos fiscales editables
  const ingresosBrutos = configData.ingresosBrutos || cuit;
  const inicioActividad = configData.monotributoStartDate || "01/05/2026";
  const domicilioComercial = configData.domicilioComercial || "";

  // --- Configuraciones Estéticas de ConfigData ---
  const colorPalette = configData.pdfColorPalette || "slate";
  const logoPosition = configData.pdfLogoPosition || "izquierda"; // "izquierda" | "derecha" | "oculto"
  const logoSizeWidth = configData.pdfLogoSizeWidth ? Number(configData.pdfLogoSizeWidth) : 30; // mm
  const pdfLogoX = configData.pdfLogoX ? Number(configData.pdfLogoX) : 15;
  const pdfLogoY = configData.pdfLogoY ? Number(configData.pdfLogoY) : 12;

  const lynxLogoPosition = configData.pdfLynxPosition || "abajo_derecha"; // "abajo_derecha" | "abajo_izquierda" | "abajo_centro" | "marca_agua" | "oculto"
  const lynxLogoSizeWidth = configData.pdfLynxSize ? Number(configData.pdfLynxSize) : 25; // mm
  const lynxLogoOpacity = configData.pdfLynxOpacity ? Number(configData.pdfLynxOpacity) : 0.08;

  // Ajustes de Maquetación (Anti-superposiciones)
  const headerHeight = configData.pdfHeaderHeight ? Number(configData.pdfHeaderHeight) : 55;
  const companyNameSize = configData.pdfCompanyNameSize ? Number(configData.pdfCompanyNameSize) : 16;
  const companyNameY = configData.pdfCompanyNameY ? Number(configData.pdfCompanyNameY) : 25;

  const rightColumnTitleSize = configData.pdfRightColTitleSize ? Number(configData.pdfRightColTitleSize) : 18;
  const rightColumnDetailsSize = configData.pdfRightColDetailsSize ? Number(configData.pdfRightColDetailsSize) : 9;
  const rightColumnY = configData.pdfRightColY ? Number(configData.pdfRightColY) : 15;

  const invoiceTypeX = configData.pdfInvoiceTypeX ? Number(configData.pdfInvoiceTypeX) : 95;
  const invoiceTypeY = configData.pdfInvoiceTypeY ? Number(configData.pdfInvoiceTypeY) : 10;

  // Nuevas configuraciones de alineación horizontal y coordenadas X
  const pdfLeftColAlign = configData.pdfLeftColAlign || "centrado"; // "izquierda" | "centrado"
  const pdfLeftColX = configData.pdfLeftColX ? Number(configData.pdfLeftColX) : 15;
  const pdfRightColX = configData.pdfRightColX ? Number(configData.pdfRightColX) : 110;

  const receptorStartY = 10 + headerHeight + 5;
  const receptorHeight = 22;
  const receptorEndY = receptorStartY + receptorHeight;
  const tableStartY = configData.pdfTableStartY ? Number(configData.pdfTableStartY) : (receptorEndY + 5);

  // Paleta de colores
  const palettes: Record<string, { primary: [number, number, number], secondary: [number, number, number] }> = {
    slate: { primary: [30, 41, 59], secondary: [148, 163, 184] },
    blue: { primary: [30, 58, 138], secondary: [96, 165, 250] },
    emerald: { primary: [6, 78, 59], secondary: [52, 211, 153] },
    amber: { primary: [120, 53, 15], secondary: [251, 191, 36] },
    monochrome: { primary: [0, 0, 0], secondary: [113, 113, 122] },
    soft_white: { primary: [241, 245, 249], secondary: [203, 213, 225] }
  };
  const activePalette = palettes[colorPalette] || palettes.slate;
  const pCol = activePalette.primary;
  const sCol = activePalette.secondary;

  // --- Cargar y pintar Marca de Agua (LYNX) ---
  let lynxLogoBase64 = configData.pdfLynxLogo || "";
  if (!lynxLogoBase64 && lynxLogoPosition !== "oculto") {
    lynxLogoBase64 = await loadImageAsBase64('/lynx-consulting-logo.png');
  }

  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;

  if (lynxLogoBase64 && lynxLogoPosition === "marca_agua") {
    try {
      const lynxRatio = await getImageRatio(lynxLogoBase64);
      const lynxHeight = lynxLogoSizeWidth * lynxRatio;
      
      const cx = (pageWidth / 2) - (lynxLogoSizeWidth / 2);
      const cy = (pageHeight / 2) - (lynxHeight / 2);
      
      try {
        const gState = new (doc as any).GState({ opacity: lynxLogoOpacity });
        doc.saveGraphicsState();
        doc.setGState(gState);
      } catch (e) {
        console.warn("jsPDF GState not supported, drawing watermark without transparency.");
      }
      
      doc.addImage(lynxLogoBase64, 'PNG', cx, cy, lynxLogoSizeWidth, lynxHeight);
      
      try {
        doc.restoreGraphicsState();
      } catch (e) {}
    } catch (e) {
      console.error("Error rendering LYNX watermark:", e);
    }
  }

  // --- Dibujar Estructura de Cabecera ---
  doc.setDrawColor(pCol[0], pCol[1], pCol[2]);
  doc.setLineWidth(0.4);
  
  // Recuadro Principal (Cabecera)
  doc.rect(10, 10, 190, headerHeight);
  doc.line(105, 10, 105, 10 + headerHeight);

  // Tipo de Factura (C) - Relleno sólido
  doc.setFillColor(pCol[0], pCol[1], pCol[2]);
  doc.rect(invoiceTypeX, invoiceTypeY, 20, 20, 'F');
  
  if (colorPalette === 'soft_white') {
    doc.setTextColor(30, 41, 59);
  } else {
    doc.setTextColor(255, 255, 255);
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.text("C", invoiceTypeX + 10, invoiceTypeY + 12, { align: "center" });
  doc.setFontSize(8);
  doc.text("Cod. 11", invoiceTypeX + 10, invoiceTypeY + 17, { align: "center" });

  // --- Dibujar Logo de Negocio ---
  if (configData.invoiceLogo && logoPosition !== "oculto") {
    try {
      const ratio = await getImageRatio(configData.invoiceLogo);
      const logoHeight = logoSizeWidth * ratio;
      
      let lx = pdfLogoX;
      let ly = pdfLogoY;
      
      if (logoPosition === "derecha" && lx === 15) {
        lx = 195 - logoSizeWidth;
      }
      
      doc.addImage(configData.invoiceLogo, 'PNG', lx, ly, logoSizeWidth, logoHeight);
    } catch (e) {
      console.error("Error drawing business logo:", e);
    }
  }

  // --- Datos de Razón Social (Lado Izquierdo) ---
  doc.setTextColor(0, 0, 0);
  
  let finalCompanyNameY = companyNameY;
  if (logoPosition === "izquierda" && configData.invoiceLogo && companyNameY === 25) {
    finalCompanyNameY = 36; // Desplazar abajo del logo por defecto
  }

  const drawLeftText = (text: string, y: number, isBold = false, size = 9) => {
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.setFontSize(size);
    if (pdfLeftColAlign === "centrado") {
      doc.text(text, 57.5, y, { align: "center" });
    } else {
      doc.text(text, pdfLeftColX, y);
    }
  };

  drawLeftText(nombreFantasia.toUpperCase(), finalCompanyNameY, true, companyNameSize);
  if (domicilioComercial) {
    const lines = domicilioComercial.split('\n');
    lines.forEach((line: string, index: number) => {
      drawLeftText(line.trim(), finalCompanyNameY + 6 + (index * 4.5), false, 8);
    });
  }

  // --- Datos del Comprobante (Lado Derecho) ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(rightColumnTitleSize);
  doc.text("FACTURA", pdfRightColX, rightColumnY);
  
  const drawRightLine = (label: string, value: string, y: number) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(rightColumnDetailsSize);
    doc.text(label, pdfRightColX, y);
    
    const labelWidth = doc.getTextWidth(label + " ");
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(rightColumnDetailsSize);
    doc.text(value, pdfRightColX + labelWidth, y);
  };

  drawRightLine("Punto de Venta: ", ptoVta, rightColumnY + 8);
  drawRightLine("Comp. Nro: ", cbteNro, rightColumnY + 13);
  drawRightLine("Fecha de Emisión: ", fechaEmi, rightColumnY + 18);
  drawRightLine("Fecha de Vencimiento: ", fechaEmi, rightColumnY + 23);
  drawRightLine("CUIT: ", cuit, rightColumnY + 28);
  drawRightLine("Ing. Brutos C.M: ", ingresosBrutos, rightColumnY + 33);
  drawRightLine("Inicio de Actividad: ", inicioActividad, rightColumnY + 38);
  drawRightLine("Razón social: ", razonSocial, rightColumnY + 43);

  // --- Datos del Receptor ---
  doc.setDrawColor(pCol[0], pCol[1], pCol[2]);
  doc.rect(10, receptorStartY, 190, receptorHeight);
  
  doc.setFillColor(pCol[0], pCol[1], pCol[2]);
  doc.rect(10, receptorStartY, 190, 6, 'F');
  
  if (colorPalette === 'soft_white') {
    doc.setTextColor(30, 41, 59);
  } else {
    doc.setTextColor(255, 255, 255);
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("DATOS DEL RECEPTOR", 13, receptorStartY + 4.5);
  
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`CUIT/DNI: ${invoiceData.clientCuit || '0'}`, 15, receptorStartY + 12);
  doc.text(`Nombre/Razón Social: ${invoiceData.clientName || 'CONSUMIDOR FINAL'}`, 15, receptorStartY + 17);
  doc.text(`Condición IVA: Consumidor Final`, 110, receptorStartY + 12);

  // --- Items ---
  autoTable(doc, {
    startY: tableStartY,
    head: [['Cod.', 'Descripción / Producto / Servicio', 'Total']],
    body: [
      ['1', invoiceData.description || 'Servicios', `$ ${total.toLocaleString('es-AR')}`]
    ],
    theme: 'grid',
    headStyles: { 
      fillColor: [pCol[0], pCol[1], pCol[2]], 
      textColor: colorPalette === 'soft_white' ? [30, 41, 59] : [255, 255, 255], 
      fontStyle: 'bold' 
    },
    styles: { 
      fontSize: 10, 
      cellPadding: 5,
      lineColor: [sCol[0], sCol[1], sCol[2]],
      lineWidth: 0.1
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    }
  });

  // --- Totales ---
  const finalY = (doc as any).lastAutoTable.finalY + 8;
  doc.setDrawColor(pCol[0], pCol[1], pCol[2]);
  doc.rect(120, finalY, 80, 24);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Importe Neto No Gravado: $ 0.00", 125, finalY + 6);
  doc.text("Importe Exento: $ 0.00", 125, finalY + 11);
  
  doc.setDrawColor(sCol[0], sCol[1], sCol[2]);
  doc.line(120, finalY + 15, 200, finalY + 15);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`TOTAL: $ ${total.toLocaleString('es-AR')}`, 125, finalY + 20);

  // --- Footer (CAE y QR) ---
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  
  if (invoiceData.cae) {
    doc.text(`CAE: ${invoiceData.cae}`, 145, pageHeight - 33);
    doc.text(`Fecha Vto. CAE: ${invoiceData.caeVto}`, 145, pageHeight - 29);
  }

  // Leyenda ARCA
  doc.setDrawColor(200);
  doc.line(10, pageHeight - 20, 200, pageHeight - 20);
  
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text("Comprobante Autorizado por AFIP (ARCA)", 15, pageHeight - 14);
  doc.text("Este PDF ha sido generado por Factureando un producto de LYNX Consulting", 15, pageHeight - 10);
  
  // --- Pintar Logo LYNX en Footer ---
  if (lynxLogoBase64 && lynxLogoPosition !== "oculto" && lynxLogoPosition !== "marca_agua") {
    try {
      const lynxRatio = await getImageRatio(lynxLogoBase64);
      const lynxHeight = lynxLogoSizeWidth * lynxRatio;
      const footerLogoY = pageHeight - 18 - (lynxHeight / 2);
      
      if (lynxLogoPosition === "abajo_derecha") {
        doc.addImage(lynxLogoBase64, 'PNG', 195 - lynxLogoSizeWidth, footerLogoY, lynxLogoSizeWidth, lynxHeight);
      } else if (lynxLogoPosition === "abajo_izquierda") {
        doc.addImage(lynxLogoBase64, 'PNG', 15, footerLogoY, lynxLogoSizeWidth, lynxHeight);
      } else if (lynxLogoPosition === "abajo_centro") {
        doc.addImage(lynxLogoBase64, 'PNG', (pageWidth / 2) - (lynxLogoSizeWidth / 2), footerLogoY, lynxLogoSizeWidth, lynxHeight);
      }
    } catch (e) {
      console.error("Error drawing footer LYNX logo:", e);
    }
  } else if (lynxLogoPosition !== "oculto" && lynxLogoPosition !== "marca_agua") {
    doc.setFont("helvetica", "bolditalic");
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text("Powered by LYNX CONSULTING", 145, pageHeight - 12);
  }

  return doc.output('bloburl');
};
