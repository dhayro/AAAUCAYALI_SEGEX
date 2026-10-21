import DatePickerLima from "@/components/form/DatePickerLima";
import { formatFecha } from "@/components/expedientes/format";
import api from "@/utils/api";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface Resumen {
  asignaciones: number;
  cerradas: number;
  observadas: number;
  vencidas: number;
  tiempo_promedio_horas: number | null;
  llamadas: number;
  llamadas_respondidas: number;
  llamadas_vencidas: number;
  acciones_pendientes: number;
}

interface Asignacion {
  cut: string;
  fecha_asignacion: string;
  vence: string;
  estado: string;
  total_respuestas: number;
  tiempo_respuesta_horas: number | null;
  dias_restantes: number | null;
  cerrada: boolean;
}

interface Llamada {
  fecha_llamada: string;
  cut: string;
  nombre_llamante: string;
  motivo: string;
  fecha_limite: string | null;
  dias_restantes: number | null;
  situacion: string;
  respondido: boolean;
  tiempo_respuesta_horas: number | null;
  acciones_pendientes: number;
}

const hoyYMD = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

const formatoHoras = (horas: number | null) => {
  if (horas === null || horas === undefined) return "—";
  const dias = Math.floor(horas / 24);
  const resto = Math.round(horas - dias * 24);
  return dias > 0 ? `${dias} d ${resto} h` : `${Math.round(horas)} h`;
};

const textoFaltante = (dias: number | null) => {
  if (dias === null) return "—";
  if (dias < 0) return `Vencida hace ${-dias} d`;
  if (dias === 0) return "Vence hoy";
  return `Le faltan ${dias} d`;
};

const ESTADO_ASIG: Record<string, { texto: string; clases: string }> = {
  SIN_RESPUESTA: { texto: "Sin respuesta", clases: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200" },
  POR_EVALUAR: { texto: "Por evaluar", clases: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100" },
  RESPONDIDA: { texto: "Respondida", clases: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-100" },
  OBSERVADA: { texto: "Observada", clases: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100" },
  CERRADA: { texto: "Cerrada", clases: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" },
};

const SITUACION: Record<string, { texto: string; clases: string }> = {
  RESPONDIDA: { texto: "Respondida", clases: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" },
  VENCIDA: { texto: "Vencida", clases: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100" },
  POR_VENCER: { texto: "Por vencer", clases: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100" },
  EN_PLAZO: { texto: "En plazo", clases: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100" },
  SIN_PLAZO: { texto: "Sin plazo", clases: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200" },
};

// Sección "Mi desempeño" del perfil: solo muestra los datos de quien inicia sesión.
export default function MiDesempeno() {
  const [filtros, setFiltros] = useState(() => {
    const hoy = hoyYMD();
    return { desde: `${hoy.slice(0, 8)}01`, hasta: hoy };
  });
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [llamadas, setLlamadas] = useState<Llamada[]>([]);
  const [cargando, setCargando] = useState(false);

  const cargar = useCallback(async () => {
    if (filtros.desde > filtros.hasta) return toast.error("La fecha inicial no puede ser mayor que la final");
    setCargando(true);
    try {
      const res = await api.get("/reportes/mi-desempeno", { params: { desde: filtros.desde, hasta: filtros.hasta } });
      setResumen(res.data.resumen);
      setAsignaciones(res.data.asignaciones || []);
      setLlamadas(res.data.llamadas || []);
    } catch {
      toast.error("No se pudo cargar tu desempeño");
    } finally {
      setCargando(false);
    }
  }, [filtros]);

  useEffect(() => {
    cargar();
  }, []);

  const indicadores = resumen
    ? [
        { titulo: "Asignaciones", valor: resumen.asignaciones, tono: "text-gray-900 dark:text-white" },
        { titulo: "Cerradas", valor: resumen.cerradas, tono: "text-green-600 dark:text-green-400" },
        { titulo: "Observadas", valor: resumen.observadas, tono: "text-amber-600 dark:text-amber-400" },
        { titulo: "Vencidas", valor: resumen.vencidas, tono: "text-red-600 dark:text-red-400" },
        { titulo: "Tiempo promedio", valor: formatoHoras(resumen.tiempo_promedio_horas), tono: "text-gray-900 dark:text-white" },
        { titulo: "Llamadas respondidas", valor: `${resumen.llamadas_respondidas} de ${resumen.llamadas}`, tono: "text-gray-900 dark:text-white" },
        { titulo: "Llamadas vencidas", valor: resumen.llamadas_vencidas, tono: "text-red-600 dark:text-red-400" },
        { titulo: "Acciones pendientes", valor: resumen.acciones_pendientes, tono: "text-amber-600 dark:text-amber-400" },
      ]
    : [];

  return (
    <section className="space-y-5 rounded-2xl bg-white p-6 shadow dark:bg-gray-800">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">Mi desempeño</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Tus asignaciones y llamadas en el periodo</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="w-44">
            <DatePickerLima label="Desde" value={filtros.desde} onChange={(d) => setFiltros({ ...filtros, desde: d })} placeholder="DD/MM/YYYY" />
          </div>
          <div className="w-44">
            <DatePickerLima label="Hasta" value={filtros.hasta} onChange={(d) => setFiltros({ ...filtros, hasta: d })} placeholder="DD/MM/YYYY" />
          </div>
          <button
            onClick={cargar}
            disabled={cargando}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {cargando ? "Cargando..." : "Actualizar"}
          </button>
        </div>
      </div>

      {resumen && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {indicadores.map((i) => (
            <div key={i.titulo} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200 dark:bg-gray-700/50 dark:ring-gray-700">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{i.titulo}</div>
              <div className={`mt-1 text-xl font-bold ${i.tono}`}>{i.valor}</div>
            </div>
          ))}
        </div>
      )}

      <div>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Mis asignaciones ({asignaciones.length})
        </h3>
        <div className="max-h-96 overflow-auto rounded-lg ring-1 ring-gray-200 dark:ring-gray-700">
          {asignaciones.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500">No tienes asignaciones en este periodo</div>
          ) : (
            <table className="w-full min-w-[640px] text-sm">
              <thead className="sticky top-0 bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                <tr>
                  <th className="px-3 py-2 text-start">CUT</th>
                  <th className="px-3 py-2 text-center">Asignación</th>
                  <th className="px-3 py-2 text-center">Vence</th>
                  <th className="px-3 py-2 text-start">Estado</th>
                  <th className="px-3 py-2 text-start">Tiempo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {asignaciones.map((a, i) => (
                  <tr key={`${a.cut}-${i}`}>
                    <td className="px-3 py-2 font-medium">{a.cut}</td>
                    <td className="px-3 py-2 text-center">{formatFecha(a.fecha_asignacion)}</td>
                    <td className="px-3 py-2 text-center">{formatFecha(a.vence)}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${ESTADO_ASIG[a.estado]?.clases ?? ""}`}>
                        {ESTADO_ASIG[a.estado]?.texto ?? a.estado}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-semibold">
                      {a.total_respuestas > 0 && a.tiempo_respuesta_horas !== null
                        ? `Respondiste en ${formatoHoras(a.tiempo_respuesta_horas)}`
                        : a.cerrada
                        ? "Cerrada"
                        : textoFaltante(a.dias_restantes)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Mis llamadas ({llamadas.length})
        </h3>
        <div className="max-h-96 overflow-auto rounded-lg ring-1 ring-gray-200 dark:ring-gray-700">
          {llamadas.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500">No tienes llamadas en este periodo</div>
          ) : (
            <table className="w-full min-w-[720px] text-sm">
              <thead className="sticky top-0 bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                <tr>
                  <th className="px-3 py-2 text-start">CUT</th>
                  <th className="px-3 py-2 text-start">Quien llama</th>
                  <th className="px-3 py-2 text-center">Límite</th>
                  <th className="px-3 py-2 text-start">Situación</th>
                  <th className="px-3 py-2 text-start">Tiempo</th>
                  <th className="px-3 py-2 text-center">Acciones pendientes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {llamadas.map((l, i) => (
                  <tr key={`${l.cut}-${i}`}>
                    <td className="px-3 py-2 font-medium">{l.cut}</td>
                    <td className="max-w-xs px-3 py-2">
                      <div>{l.nombre_llamante}</div>
                      <div className="truncate text-xs text-gray-500" title={l.motivo}>
                        {l.motivo}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center">{formatFecha(l.fecha_limite)}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${SITUACION[l.situacion]?.clases ?? ""}`}>
                        {SITUACION[l.situacion]?.texto ?? l.situacion}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-semibold">
                      {l.respondido
                        ? l.tiempo_respuesta_horas !== null
                          ? `Respondiste en ${formatoHoras(l.tiempo_respuesta_horas)}`
                          : "Respondida"
                        : textoFaltante(l.dias_restantes)}
                    </td>
                    <td className="px-3 py-2 text-center">{l.acciones_pendientes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
}
