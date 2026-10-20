import { useCallback, useEffect, useState } from "react";
import api from "@/utils/api";
import { CloseIcon } from "@/icons";
import { formatFechaHora } from "./format";
import { ESTILO_ADJUNTO, parseAdjuntos, type AdjuntoSisged } from "./adjuntos";
import EstadoBadge from "./EstadoBadge";
import VisorArchivoModal from "./VisorArchivoModal";
import MovimientosModal from "./MovimientosModal";

type Props = {
  cut: string;
  onClose: () => void;
};

type Visor = { titulo: string; url: string | null; cargando: boolean; error: string };
type Movimientos = { titulo: string; rows: any[]; cargando: boolean; error: string };

export default function TrazabilidadModal({ cut, onClose }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [error, setError] = useState("");
  const [visor, setVisor] = useState<Visor | null>(null);
  const [movimientos, setMovimientos] = useState<Movimientos | null>(null);

  const cargarGuardados = useCallback(async () => {
    const res = await api.get(`/expedientes/por-cut/${encodeURIComponent(cut)}/trazabilidad`);
    return res.data.documentos || [];
  }, [cut]);

  const sincronizar = useCallback(async () => {
    setSincronizando(true);
    setError("");
    try {
      await api.post("/sisged/sincronizar-con-parametros", {
        params: { NRO_CUT: cut },
        endpoint: "trazabilidad",
      });
      setRows(await cargarGuardados());
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.mensaje || "No se pudo consultar SISGED");
    } finally {
      setSincronizando(false);
    }
  }, [cut, cargarGuardados]);

  useEffect(() => {
    let cancelado = false;
    const iniciar = async () => {
      setCargando(true);
      setError("");
      try {
        const guardados = await cargarGuardados();
        if (cancelado) return;
        setRows(guardados);
        setCargando(false);
        if (guardados.length === 0) {
          await sincronizar();
        }
      } catch (err: any) {
        if (!cancelado) setError(err.response?.data?.mensaje || "Error al cargar la trazabilidad");
      } finally {
        if (!cancelado) setCargando(false);
      }
    };
    iniciar();
    return () => {
      cancelado = true;
    };
  }, [cargarGuardados, sincronizar]);

  const pedirArchivo = async (titulo: string, params: Record<string, any>) => {
    setVisor({ titulo, url: null, cargando: true, error: "" });
    try {
      const res = await api.post("/sisged/sincronizar-con-parametros", { params, endpoint: "archivo" });
      if (!res.data.success || !res.data.pdfUrl) throw new Error("SISGED no devolvió el archivo");
      setVisor((prev) => (prev ? { ...prev, url: res.data.pdfUrl, cargando: false } : prev));
    } catch (err: any) {
      setVisor((prev) =>
        prev
          ? { ...prev, cargando: false, error: err.response?.data?.error || err.message || "No se pudo obtener el archivo" }
          : prev
      );
    }
  };

  const verDocumento = (doc: any) => {
    pedirArchivo(doc.ndoc || "Documento", {
      ID_DOCUMENTO: doc.iddocpad || doc.iddocanex || 0,
      ID_USUARIO: 1,
      ID_OFICINA: doc.idofi || 1,
      ID_PERFIL: 1,
      FLG_TIPO: 1,
      FLG_FIRMA: 1,
      CODIGO_ADJUNTO: "-",
    });
  };

  const verAdjunto = (adjunto: AdjuntoSisged, doc: any) => {
    if (adjunto.isUrl) {
      window.open(adjunto.nombre, "_blank");
      return;
    }
    if (adjunto.extension === "pdf") {
      pedirArchivo(adjunto.nombre, {
        ID_DOCUMENTO: adjunto.id,
        ID_USUARIO: 1,
        ID_OFICINA: doc.idofi || 1,
        ID_PERFIL: 1,
        FLG_TIPO: 2,
        FLG_FIRMA: 1,
        CODIGO_ADJUNTO: "-",
      });
      return;
    }
    window.open(
      `https://sisged.ana.gob.pe/SISGED/Recursos/Descarga/FrmDescargaAdjunto.aspx?ID_DOCUMENTO_ADJUNTO=${adjunto.id}&CODIGO_ADJUNTO=--`,
      "_blank"
    );
  };

  const verMovimientos = async (doc: any) => {
    setMovimientos({ titulo: doc.ndoc || "Documento", rows: [], cargando: true, error: "" });
    try {
      const res = await api.post("/sisged/sincronizar-con-parametros", {
        params: { ID_DOCUMENTO: doc.iddocpad || doc.iddocanex || 0 },
        endpoint: "movimientos",
      });
      if (!res.data.success) throw new Error("SISGED no devolvió movimientos");
      const datos = Array.isArray(res.data.data) ? res.data.data.flat() : [];
      setMovimientos((prev) => (prev ? { ...prev, rows: datos, cargando: false } : prev));
    } catch (err: any) {
      setMovimientos((prev) =>
        prev
          ? { ...prev, cargando: false, error: err.response?.data?.error || err.message || "No se pudieron obtener los movimientos" }
          : prev
      );
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-gray-900/50 p-4">
        <div className="flex max-h-[85vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-gray-800">
          <div className="flex items-center gap-3 bg-brand-600 px-5 py-3 text-white">
            <div className="flex items-baseline gap-3">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-white/70">Trazabilidad</span>
              <h2 className="text-lg font-bold">{cut}</h2>
              <span className="text-[11px] text-white/70">{rows.length} documentos</span>
            </div>
            <button
              onClick={sincronizar}
              disabled={sincronizando || cargando}
              className="ml-auto rounded-md bg-white/15 px-2.5 py-1 text-[11px] font-medium hover:bg-white/25 disabled:opacity-50"
            >
              {sincronizando ? "Actualizando..." : "Actualizar desde SISGED"}
            </button>
            <button onClick={onClose} className="rounded-full p-1 text-white/80 hover:bg-white/20 hover:text-white">
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="overflow-auto">
            {(cargando || sincronizando) && rows.length === 0 && (
              <div className="p-10 text-center text-sm text-gray-500">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-brand-600 border-t-transparent"></div>
                <p className="mt-3">Consultando trazabilidad en SISGED...</p>
              </div>
            )}
            {error && (
              <div className="m-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
                {error}
              </div>
            )}
            {!cargando && !sincronizando && !error && rows.length === 0 && (
              <div className="p-10 text-center text-sm text-gray-500">No hay documentos registrados para este CUT.</div>
            )}
            {rows.length > 0 && (
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-gray-50 text-[10px] uppercase tracking-wide text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                  <tr>
                    <th className="px-3 py-2 text-start">N°</th>
                    <th className="px-3 py-2 text-start">Documento</th>
                    <th className="px-3 py-2 text-center">Adjunto</th>
                    <th className="px-3 py-2 text-start">Asunto</th>
                    <th className="px-3 py-2 text-start">Fecha creación</th>
                    <th className="px-3 py-2 text-center">Estado</th>
                    <th className="px-3 py-2 text-center">Folios</th>
                    <th className="px-3 py-2 text-start">Remitente</th>
                    <th className="px-3 py-2 text-start">Destino</th>
                    <th className="px-3 py-2 text-center">Movimientos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {rows.map((d, index) => {
                    const adjuntos = parseAdjuntos(d.adjunto);
                    return (
                      <tr key={d.id} className="align-top hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-3 py-2 text-gray-500">{index + 1}</td>
                        <td className="px-3 py-2">
                          <button
                            onClick={() => verDocumento(d)}
                            className="text-left font-semibold text-brand-600 underline-offset-2 hover:underline dark:text-brand-400"
                          >
                            {d.ndoc || "—"}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-center">
                          {adjuntos.length > 0 ? (
                            <div className="flex flex-wrap justify-center gap-1">
                              {adjuntos.map((adj) => (
                                <button
                                  key={adj.id}
                                  onClick={() => verAdjunto(adj, d)}
                                  title={adj.isUrl ? `Enlace: ${adj.nombre}` : adj.nombre}
                                  className={`inline-flex h-6 min-w-[2.5rem] items-center justify-center rounded-md px-1.5 text-[10px] font-bold tracking-wide text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow ${ESTILO_ADJUNTO[adj.tipo].clases}`}
                                >
                                  {ESTILO_ADJUNTO[adj.tipo].etiqueta}
                                </button>
                              ))}
                            </div>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="max-w-xs px-3 py-2 text-gray-700 dark:text-gray-200">{d.asunto || "—"}</td>
                        <td className="whitespace-nowrap px-3 py-2">{formatFechaHora(d.stfecrea)}</td>
                        <td className="px-3 py-2 text-center"><EstadoBadge estado={d.estado} /></td>
                        <td className="px-3 py-2 text-center">{d.fol ?? "—"}</td>
                        <td className="max-w-[12rem] px-3 py-2 text-gray-700 dark:text-gray-200">{d.remi || "—"}</td>
                        <td className="max-w-[12rem] px-3 py-2 text-gray-700 dark:text-gray-200">{d.destino || "—"}</td>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => verMovimientos(d)}
                            className="whitespace-nowrap rounded-md border border-brand-600 px-2 py-0.5 text-[11px] font-semibold text-brand-600 hover:bg-brand-50 dark:border-brand-400 dark:text-brand-400 dark:hover:bg-gray-700"
                          >
                            Movimientos
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {visor && (
        <VisorArchivoModal
          titulo={visor.titulo}
          url={visor.url}
          cargando={visor.cargando}
          error={visor.error}
          onClose={() => setVisor(null)}
        />
      )}
      {movimientos && (
        <MovimientosModal
          titulo={movimientos.titulo}
          rows={movimientos.rows}
          cargando={movimientos.cargando}
          error={movimientos.error}
          onClose={() => setMovimientos(null)}
        />
      )}
    </>
  );
}
