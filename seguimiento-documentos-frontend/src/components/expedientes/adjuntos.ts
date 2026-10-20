export type TipoAdjunto = "pdf" | "word" | "excel" | "url" | "otro";

export type AdjuntoSisged = {
  id: string;
  nombre: string;
  extension: string;
  isUrl: boolean;
  tipo: TipoAdjunto;
};

export const ESTILO_ADJUNTO: Record<TipoAdjunto, { etiqueta: string; clases: string }> = {
  pdf: { etiqueta: "PDF", clases: "bg-red-500" },
  word: { etiqueta: "DOC", clases: "bg-blue-600" },
  excel: { etiqueta: "XLS", clases: "bg-emerald-600" },
  url: { etiqueta: "LINK", clases: "bg-violet-600" },
  otro: { etiqueta: "ARCH", clases: "bg-gray-400" },
};

const tipoAdjunto = (nombre: string): TipoAdjunto => {
  if (nombre.startsWith("http://") || nombre.startsWith("https://")) return "url";
  const extension = nombre.split(".").pop()?.toLowerCase() || "";
  if (extension === "pdf") return "pdf";
  if (["doc", "docx"].includes(extension)) return "word";
  if (["xls", "xlsx", "csv"].includes(extension)) return "excel";
  return "otro";
};

// Formato SISGED: ID"NOMBRE"...  separado por saltos de línea
export const parseAdjuntos = (texto?: string | null): AdjuntoSisged[] => {
  if (!texto) return [];
  return texto
    .split("\r")
    .map((linea) => linea.trim())
    .filter(Boolean)
    .map((linea) => {
      const coincidencia = linea.match(/^(\d+)"([^"]+)"/);
      if (!coincidencia) return null;
      const nombre = coincidencia[2];
      const isUrl = nombre.startsWith("http://") || nombre.startsWith("https://");
      const extension = isUrl ? "url" : nombre.split(".").pop()?.toLowerCase() || "";
      return { id: coincidencia[1], nombre, extension, isUrl, tipo: tipoAdjunto(nombre) };
    })
    .filter((a): a is AdjuntoSisged => a !== null);
};
