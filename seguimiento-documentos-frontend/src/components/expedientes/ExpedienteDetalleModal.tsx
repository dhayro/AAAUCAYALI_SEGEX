import { useEffect, useState } from "react";
import api from "@/utils/api";
import { CloseIcon } from "@/icons";
import { formatFecha, formatFechaHora } from "./format";
import TrazabilidadModal from "./TrazabilidadModal";

type Props = {
  cut: string;
  onClose: () => void;
};

type FormatoCampo = "texto" | "largo" | "fecha" | "fechahora";

const SECCIONES: { titulo: string; campos: { clave: string; etiqueta: string; formato?: FormatoCampo }[] }[] = [
  {
    titulo: "Identificación",
    campos: [
      { clave: "ndoc", etiqueta: "Documento" },
      { clave: "origen", etiqueta: "Origen" },
      { clave: "destip", etiqueta: "Destino (tipo)" },
    ],
  },
  {
    titulo: "Trámite",
    campos: [
      { clave: "proced", etiqueta: "Procedimiento", formato: "largo" },
      { clave: "fol", etiqueta: "Folios" },
    ],
  },
  {
    titulo: "Contenido",
    campos: [
      { clave: "asunto", etiqueta: "Asunto", formato: "largo" },
      { clave: "refe", etiqueta: "Referencia", formato: "largo" },
      { clave: "destinos", etiqueta: "Destinos", formato: "largo" },
      { clave: "tema", etiqueta: "Tema", formato: "largo" },
    ],
  },
  {
    titulo: "Remitente y fechas",
    campos: [
      { clave: "usurem", etiqueta: "Remitente", formato: "largo" },
      { clave: "ofirem", etiqueta: "Oficina remitente" },
      { clave: "feccrea", etiqueta: "Fecha de creación", formato: "fechahora" },
      { clave: "solfec", etiqueta: "Fecha de solicitud", formato: "fecha" },
      { clave: "solhor", etiqueta: "Hora de solicitud" },
    ],
  },
];

const valorCampo = (valor: any, formato: FormatoCampo = "texto") => {
  const vacio = valor === null || valor === undefined || valor === "" || String(valor).trim() === "-";
  if (vacio) return "—";
  if (formato === "fecha") return formatFecha(String(valor));
  if (formato === "fechahora") return formatFechaHora(String(valor));
  return String(valor);
};

export default function ExpedienteDetalleModal({ cut, onClose }: Props) {
  const [expediente, setExpediente] = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [trazabilidadAbierta, setTrazabilidadAbierta] = useState(false);
  const [asignaciones, setAsignaciones] = useState<any[]>([]);

  useEffect(() => {
    let cancelado = false;
    api
      .get("/asignaciones-expediente", { params: { cut, estado: "true", limit: 50 } })
      .then((res) => {
        if (!cancelado) setAsignaciones((res.data.asignaciones || []).filter((a: any) => a.cut === cut));
      })
      .catch(() => {
        if (!cancelado) setAsignaciones([]);
      });
    return () => {
      cancelado = true;
    };
  }, [cut]);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    setError("");
    api
      .get(`/expedientes/por-cut/${encodeURIComponent(cut)}`)
      .then((res) => {
        if (!cancelado) setExpediente(res.data.expediente);
      })
      .catch((err) => {
        if (!cancelado) setError(err.response?.data?.mensaje || "Error al consultar el expediente");
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [cut]);

  const copiarCut = async () => {
    try {
      await navigator.clipboard.writeText(cut);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      setCopiado(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-900/50 p-4">
        <div className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-gray-800">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-brand-600 px-5 py-3 text-white">
            <div className="flex items-baseline gap-3">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-white/70">Expediente</span>
              <h2 className="text-lg font-bold">{cut}</h2>
            </div>
            <button onClick={copiarCut} className="rounded-md bg-white/15 px-2 py-0.5 text-[11px] font-medium hover:bg-white/25">
              {copiado ? "Copiado" : "Copiar"}
            </button>
            {expediente && (
              <div className="flex items-center gap-2 text-[11px]">
                <span
                  className={`rounded-full px-2 py-0.5 font-bold ${
                    expediente.estupa === "TUPA" ? "bg-white text-brand-700" : "bg-white/15"
                  }`}
                >
                  {expediente.estupa === "TUPA" ? "TUPA" : "NO TUPA"}
                </span>
                {expediente.origen && (
                  <span className="rounded-full bg-white/15 px-2 py-0.5">Origen {expediente.origen}</span>
                )}
              </div>
            )}
            <div className="ml-auto flex items-center gap-2">
              {expediente && (
                <button
                  onClick={() => setTrazabilidadAbierta(true)}
                  className="rounded-md bg-white px-2 py-0.5 text-[11px] font-semibold text-brand-700 hover:bg-white/90"
                >
                  Trazabilidad
                </button>
              )}
              <button onClick={onClose} className="rounded-full p-1 text-white/80 hover:bg-white/20 hover:text-white">
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto bg-gray-50 p-3 dark:bg-gray-900/40">
            {cargando && (
              <div className="grid animate-pulse grid-cols-1 gap-3 md:grid-cols-2">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-24 rounded-xl bg-white dark:bg-gray-800"></div>
                ))}
              </div>
            )}
            {!cargando && error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
                {error}
              </div>
            )}
            {!cargando && expediente && (
              <section className="mb-3 rounded-xl bg-white p-3 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
                <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                  Asignación
                </h3>
                {asignaciones.length === 0 ? (
                  <div className="text-xs text-gray-500">Sin asignar en el sistema (o no visible para tu perfil).</div>
                ) : (
                  <div className="space-y-2">
                    {asignaciones.map((a) => (
                      <div key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {a.asignado ? `${a.asignado.nombre} ${a.asignado.apellido}` : "—"}
                        </span>
                        {a.asignado?.Cargo?.nombre && <span className="text-gray-500">{a.asignado.Cargo.nombre}</span>}
                        <span className="text-gray-500">Asignado {formatFecha(a.fecha_asignacion)}</span>
                        <span className="text-gray-500">Vence {formatFecha(a.fecha_vencimiento)}</span>
                        {a.numero_orden && <span className="text-gray-500">Orden {a.numero_orden}</span>}
                        {a.estado_prorroga && <span className="font-semibold">Prórroga: {a.estado_prorroga}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
            {!cargando && expediente && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {SECCIONES.map((seccion) => (
                  <section
                    key={seccion.titulo}
                    className="h-full rounded-xl bg-white p-3 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700"
                  >
                    <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                      {seccion.titulo}
                    </h3>
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
                      {seccion.campos.map((campo) => {
                        const valor = valorCampo(expediente[campo.clave], campo.formato);
                        const esLargo = campo.formato === "largo";
                        return (
                          <div key={campo.clave} className={esLargo ? "col-span-2" : ""}>
                            <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                              {campo.etiqueta}
                            </dt>
                            <dd
                              className={`whitespace-pre-wrap break-words text-gray-900 dark:text-white ${
                                esLargo ? "border-l-2 border-brand-500 pl-2 text-xs leading-snug" : "text-xs font-semibold"
                              }`}
                            >
                              {valor}
                            </dd>
                          </div>
                        );
                      })}
                    </dl>
                  </section>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {trazabilidadAbierta && (
        <TrazabilidadModal cut={cut} onClose={() => setTrazabilidadAbierta(false)} />
      )}
    </>
  );
}
