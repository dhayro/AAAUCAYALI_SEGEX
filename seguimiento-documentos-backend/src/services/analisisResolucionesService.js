// Análisis de los PDF de resoluciones (port del script de Python): número, fecha, CUT, ALA,
// administrado y contenido del artículo primero.
const pdfParse = require('pdf-parse/lib/pdf-parse.js');

const quitarTildes = (texto) => texto.normalize('NFKD').replace(/[̀-ͯ]/g, '');
const normalizarEspacios = (texto) => texto.replace(/[\s​‬]+/g, ' ');

const PATRONES_NUMERO = [
  /RESOLUCIONDIRECTORALN[°º](\d{4}-\d{4}-ANA-AAA\.U)/i,
  /RESOLUCI[OÓ]N\s+DIRECTORAL\s+N\s*[°º]\s*\.?\s*(\d{4}\s*-\s*\d{4}\s*-\s*ANA\s*-\s*AAA\.U)/i,
  /RESOLUCION\s+DIRECTORAL\s+N\s*[°º]\s*\.?\s*(\d{4}\s*-\s*\d{4}\s*-\s*ANA\s*-\s*AAA\.U)/i,
  /RESOLUCI[OÓ]N\s+DIRECTORAL\s+N[°º]?\s*\.?\s*(\d{4}\s*-\s*\d{4}\s*-\s*ANA\s*-\s*AAA\.U)/i,
  /RESOLUCION\s+DIRECTORAL\s+N[°º]?\s*\.?\s*(\d{4}\s*-\s*\d{4}\s*-\s*ANA\s*-\s*AAA\.U)/i,
  /RESOLUCI[OÓ]N\s+JEFATURAL\s+N\s*[°º]\s*\.?\s*(\d{4}\s*-\s*\d{4}\s*-\s*ANA\s*-\s*AAA\.U)/i,
  /RESOLUCION\s+JEFATURAL\s+N\s*[°º]\s*\.?\s*(\d{4}\s*-\s*\d{4}\s*-\s*ANA\s*-\s*AAA\.U)/i,
  /RESOLUCI[OÓ]N\s+JEFATURAL\s+N[°º]?\s*\.?\s*(\d{4}\s*-\s*\d{4}\s*-\s*ANA\s*-\s*AAA\.U)/i,
  /RESOLUCION\s+JEFATURAL\s+N[°º]?\s*\.?\s*(\d{4}\s*-\s*\d{4}\s*-\s*ANA\s*-\s*AAA\.U)/i,
  /R\.D\.\s+N\s*[°º]\s*\.?\s*(\d{4}\s*-\s*\d{4}\s*-\s*ANA\s*-\s*AAA\.U)/i,
  /R\.D\.\s+N[°º]?\s*\.?\s*(\d{4}\s*-\s*\d{4}\s*-\s*ANA\s*-\s*AAA\.U)/i,
];

const extraerNumeroResolucion = (texto) => {
  const textoSinTildes = quitarTildes(texto);
  const variantes = [texto, normalizarEspacios(texto), textoSinTildes, normalizarEspacios(textoSinTildes)];

  const flexible = /RESOLUCI[OÓ]N\s*DIRECTORAL\s*N\s*[°º]\s*([\d\s]{3,5}-\s*\d{4}\s*-\s*ANA\s*-\s*AAA\.U)/i;
  for (const v of variantes) {
    const m = v.match(flexible);
    if (m) return m[1].replace(/\s/g, '');
  }
  for (const patron of PATRONES_NUMERO) {
    for (const v of variantes) {
      const m = v.match(patron);
      if (m) return m[1].replace(/\s/g, '');
    }
  }
  const general = /(\d{4}-\d{4}-ANA-AAA\.U)/;
  for (const v of variantes) {
    const m = v.match(general);
    if (m) return m[1].replace(/\s/g, '');
  }
  return 'No se encontró el número de resolución';
};

// La fecha está en la línea debajo del número: "Caballería, 01 de octubre de 2026."
const extraerFecha = (texto) => {
  const patron = /RESOLUCI[OÓ]N\s+DIRECTORAL\s+N\s*[°º\W]*\s*\d{4}\s*-\s*\d{4}\s*-\s*ANA\s*-\s*AAA\.U\s*\n\s*[^\n]*?(\d{1,2}\s+de\s+\w+\s+de\s+\d{4})/i;
  for (const v of [texto, quitarTildes(texto)]) {
    const m = v.match(patron);
    if (m) return m[1].replace(/\s+/g, ' ').trim();
  }
  return 'No se encontró la fecha';
};

const extraerCut = (texto) => {
  const m = quitarTildes(texto).match(/C[UÚ]T\s*:?\s*(\d{2,8})\s*[-–—]\s*(\d{4})/i);
  return m ? `${m[1]}-${m[2]}` : 'No se encontró el CUT';
};

const PATRONES_ADMINISTRADO = [
  /Notificar\s+la\s+presente\s+Resoluci[oó]n\s+Directoral\s+a[\s\n]+([\s\S]+?)(?:,|$)/i,
  /Notificar\s+la\s+presente\s+Resoluci[oó]n\s+Directoral\s+al\s+([\s\S]+?)(?:,|$)/i,
  /Notificar\s+la\s+presente\s+resoluci[oó]n\s+a\s+la\s+([\s\S]+?)(?:,|$)/i,
  /Notificar\s+la\s+presente\s+resoluci[oó]n\s+a\s+([\s\S]+?)(?:,|$)/i,
  /Notificar\s+la\s+presente\s+resoluci[oó]n\s+al\s+([\s\S]+?)(?:,|$)/i,
  /Notificar\s+la\s+presente\s+Resoluci[oó]n\s+Administrativa\s+a\s+la\s+([\s\S]+?)(?:,|$)/i,
  /Notificar\s+la\s+presente\s+Resoluci[oó]n\s+Administrativa\s+a\s+([\s\S]+?)(?:,|$)/i,
  /Notificar\s+la\s+presente\s+Resoluci[oó]n\s+Directoral\s+a\s+([\s\S]+?)(?:,|$)/i,
  /Notificar\s+la\s+presente\s+resoluci[oó]n\s+a\s+la\s+([\s\S]+?)(?:,|"|$)/i,
  /Notificar\s+la\s+presente\s+resoluci[oó]n\s+a\s+la[\s\n]+([\s\S]+?)(?:,|"|”|$)/i,
];

const extraerAdministrado = (texto) => {
  for (const patron of PATRONES_ADMINISTRADO) {
    const m = texto.match(patron);
    if (m) {
      const administrado = m[1].replace(/[\s\n]+/g, ' ').trim();
      // Se corta la frase de autenticidad que SISGED agrega al final.
      return administrado.split(/Esta es una copia auténtica imprimible de un documento electrónico archivado de ANA.*/i)[0].trim();
    }
  }
  return 'No se pudo identificar al administrado';
};

const FIN_ARTICULO = '(?:detalle|continuaci[oó]n|siguiente cuadro|cuadros siguientes|detalle siguiente|siguiente detalle|cuadros adjuntos)(?::|\\b)|\\bpresente resoluci[oó]n\\.';
// El artículo primero termina donde empieza el segundo, escrito como "SEGUNDO" o "2°".
const CORTE_ARTICULO = `(?=\\b(?:${FIN_ARTICULO})|\\bART[IÍ]CULO\\s+(?:SEGUNDO|2\\s*[°º.])|\\bsiguientes:|$)`;
const FIN_ARTICULO_REGEX = new RegExp(`\\b(?:${FIN_ARTICULO})|\\bpresente resoluci[oó]n\\.`, 'i');

const PATRONES_ARTICULO = [
  new RegExp(`SE\\s+RESUELVE\\s*:[\\s\\n]*ART[IÍ]CULO\\s+PRIMERO([\\s\\S]*?)${CORTE_ARTICULO}`, 'i'),
  new RegExp(`SE\\s+RESUELVE\\s*:[\\s\\n]*ARTICULO\\s+PRIMERO([\\s\\S]*?)${CORTE_ARTICULO}`, 'i'),
  new RegExp(`Art[ií]culo\\s+1[°º]([\\s\\S]*?)${CORTE_ARTICULO}`, 'i'),
];
const PATRON_ARTICULO_GENERICO = new RegExp(`(?:SE\\s+RESUELVE\\s*:[\\s\\n]*)?(?:ART[IÍ]CULO\\s+PRIMERO)([\\s\\S]*?)${CORTE_ARTICULO}`, 'i');

// Devuelve el texto del artículo primero y el patrón que lo encontró.
const extraerArticuloPrimero = (texto) => {
  const sinTildes = quitarTildes(texto);
  const patrones = [
    { p: PATRONES_ARTICULO[0], nombre: 'SE RESUELVE: ARTÍCULO PRIMERO' },
    { p: PATRONES_ARTICULO[1], nombre: 'SE RESUELVE: ARTICULO PRIMERO' },
    { p: PATRONES_ARTICULO[2], nombre: 'Artículo 1°' },
    { p: PATRON_ARTICULO_GENERICO, nombre: 'ARTÍCULO PRIMERO (genérico)' },
  ];

  for (const { p, nombre } of patrones) {
    for (const v of [texto, sinTildes]) {
      const m = v.match(p);
      if (!m) continue;
      let contenido = m[1].trim();
      // Como en el script original: se agrega la frase de corte que sigue al contenido.
      const fin = v.slice(m[0].length).match(FIN_ARTICULO_REGEX);
      if (fin) contenido += ` ${fin[0]}`;
      if (contenido.trim().toLowerCase().endsWith('siguientes:')) {
        contenido = contenido.slice(0, contenido.toLowerCase().lastIndexOf('siguientes:')).trim();
      }
      return { contenido, patron: nombre };
    }
  }
  return { contenido: 'No se encontró el artículo en el documento.', patron: 'Ninguno' };
};

const ALAS = [
  ['pucallpa', 'ALA.PUC'],
  ['perene', 'ALA.PE'],
  ['tarma', 'ALA.TAR'],
  ['atalaya', 'ALA.ATA'],
];

const determinarAla = (texto) => {
  const sinTildes = quitarTildes(texto);
  for (const [palabra, ala] of ALAS) {
    const regex = new RegExp(`(?<!\\p{L})${palabra}(?!\\p{L})`, 'iu');
    if (regex.test(sinTildes) || regex.test(texto)) return ala;
  }
  return 'OTROS';
};

// Pie de autenticidad que SISGED agrega al final de cada resolución: no es parte del artículo primero.
const PIE_AUTENTICIDAD = /Esta es una copia aut[eé]ntica imprimible de un documento electr[oó]nico archivado de ANA[\s\S]*?clave\s*:\s*[A-Z0-9]{8}/gi;

// Delimitación de fajas: el artículo primero solo aprueba la delimitación y la decisión está en el artículo segundo.
const DELIMITACION_BLOQUE = /^[\s.\-–:]*aprobar\s+la\s+delimitacion\s+del\s+bloque/i;
const ARTICULO_SEGUNDO = /Art[ií]culo\s+(?:SEGUNDO|2\s*[°º.])\s*[.:\-–]*\s*([\s\S]*?)(?=\bART[IÍ]CULO\s+(?:TERCERO|3\s*[°º.])|\bReg[ií]strese|\bFIRMADO|$)/i;

// Analiza un PDF (Buffer) y devuelve una fila para el Excel.
const analizarPdf = async (buffer, nombreArchivo) => {
  const { text } = await pdfParse(buffer);
  const texto = (text || '').replace(/\r\n/g, '\n');
  const articulo = extraerArticuloPrimero(texto);
  let contenido = articulo.contenido;
  let patron = articulo.patron;
  if (DELIMITACION_BLOQUE.test(quitarTildes(contenido))) {
    const segundo = texto.match(ARTICULO_SEGUNDO);
    if (segundo) {
      contenido = segundo[1];
      patron = 'Artículo 2° (delimitación del bloque)';
    }
  }
  return {
    archivo: nombreArchivo,
    numero_resolucion: extraerNumeroResolucion(texto),
    fecha: extraerFecha(texto),
    cut: extraerCut(texto),
    ala: determinarAla(texto),
    administrado: extraerAdministrado(texto),
    // Se quita el ".-" o ".–" que abre el artículo (ej. ".- Declarar FUNDADO…").
    contenido: contenido.replace(PIE_AUTENTICIDAD, '').replace(/^\s*\.\s*[-–—]\s*/, '').trim(),
    patron,
  };
};

module.exports = { analizarPdf };
