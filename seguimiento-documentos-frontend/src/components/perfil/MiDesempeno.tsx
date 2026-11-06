import DatePickerLima from "@/components/form/DatePickerLima";
import { formatFecha, formatFechaHora } from "@/components/expedientes/format";
import { DownloadIcon, ChevronLeftIcon } from "@/icons";
import api from "@/utils/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface Resumen {
  asignaciones: number;
  cerradas: number;
  observadas: number;
  vencidas: number;
  tiempo_promedio_horas: number | null;
  llamadas: number;
  presenciales?: number;
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
  tipo_atencion?: "LLAMADA" | "PRESENCIAL";
  motivo: string;
  fecha_limite: string | null;
  dias_restantes: number | null;
  situacion: string;
  respondido: boolean;
  tiempo_respuesta_horas: number | null;
  acciones_pendientes: number;
}

interface Prorroga {
  cut: string;
  fecha_solicitud: string | null;
  plazo_prorroga: number | null;
  motivo: string;
  estado: string;
  vence_original: string;
  vence_nueva: string | null;
}

interface Accion {
  cut: string;
  accion: string;
  estado: string;
  observacion: string;
  fecha_ejecucion: string | null;
}

const TAMANO_PAGINA = 8;

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
  REASIGNADA: { texto: "Reasignada", clases: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100" },
};

const SITUACION: Record<string, { texto: string; clases: string }> = {
  RESPONDIDA: { texto: "Respondida", clases: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" },
  VENCIDA: { texto: "Vencida", clases: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100" },
  POR_VENCER: { texto: "Por vencer", clases: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100" },
  EN_PLAZO: { texto: "En plazo", clases: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100" },
  SIN_PLAZO: { texto: "Sin plazo", clases: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200" },
};

const ESTADO_PRORROGA: Record<string, string> = {
  PENDIENTE: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100",
  ACEPTADA: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
  RECHAZADA: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
};

// Paginador compacto usado por cada tabla de la sección.
function Paginador({ total, pagina, onCambio }: { total: number; pagina: number; onCambio: (p: number) => void }) {
  const paginas = Math.max(1, Math.ceil(total / TAMANO_PAGINA));
  if (total <= TAMANO_PAGINA) return null;
  return (
    <div className="mt-2 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
      <span>
        Mostrando {pagina * TAMANO_PAGINA + 1}-{Math.min((pagina + 1) * TAMANO_PAGINA, total)} de {total}
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onCambio(Math.max(0, pagina - 1))}
          disabled={pagina === 0}
         title="Anterior" aria-label="Anterior" className="inline-flex h-8 w-8 items-center justify-center rounded border border-gray-300 disabled:opacity-50 dark:border-gray-600"><ChevronLeftIcon className="h-4 w-4" /></button>
        <span className="whitespace-nowrap">
          {pagina + 1} / {paginas}
        </span>
        <button
          onClick={() => onCambio(Math.min(paginas - 1, pagina + 1))}
          disabled={pagina + 1 >= paginas}
         title="Siguiente" aria-label="Siguiente" className="inline-flex h-8 w-8 items-center justify-center rounded border border-gray-300 disabled:opacity-50 dark:border-gray-600"><ChevronLeftIcon className="h-4 w-4 rotate-180" /></button>
      </div>
    </div>
  );
}

const celdaVacia = (texto: string) => <div className="p-6 text-center text-sm text-gray-500">{texto}</div>;

// Sección "Mi desempeño" del perfil: solo muestra los datos de quien inicia sesión.
export default function MiDesempeno() {
  const [filtros, setFiltros] = useState(() => {
    const hoy = hoyYMD();
    return { desde: `${hoy.slice(0, 8)}01`, hasta: hoy };
  });
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [llamadas, setLlamadas] = useState<Llamada[]>([]);
  const [prorrogas, setProrrogas] = useState<Prorroga[]>([]);
  const [acciones, setAcciones] = useState<Accion[]>([]);
  const [cargando, setCargando] = useState(false);
  const [paginas, setPaginas] = useState({ asignaciones: 0, llamadas: 0, prorrogas: 0, acciones: 0 });

  const cargar = useCallback(async () => {
    if (filtros.desde > filtros.hasta) return toast.error("La fecha inicial no puede ser mayor que la final");
    setCargando(true);
    try {
      const res = await api.get("/reportes/mi-desempeno", { params: { desde: filtros.desde, hasta: filtros.hasta } });
      setResumen(res.data.resumen);
      setAsignaciones(res.data.asignaciones || []);
      setLlamadas(res.data.llamadas || []);
      setProrrogas(res.data.prorrogas || []);
      setAcciones(res.data.acciones || []);
      setPaginas({ asignaciones: 0, llamadas: 0, prorrogas: 0, acciones: 0 });
    } catch {
      toast.error("No se pudo cargar tu desempeño");
    } finally {
      setCargando(false);
    }
  }, [filtros]);

  useEffect(() => {
    cargar();
  }, []);

  const indicadores = useMemo(
    () =>
      resumen
        ? [
            { titulo: "Asignaciones", valor: resumen.asignaciones, tono: "text-gray-900 dark:text-white" },
            { titulo: "Cerradas", valor: resumen.cerradas, tono: "text-green-600 dark:text-green-400" },
            { titulo: "Observadas", valor: resumen.observadas, tono: "text-amber-600 dark:text-amber-400" },
            { titulo: "Vencidas", valor: resumen.vencidas, tono: "text-red-600 dark:text-red-400" },
            { titulo: "Tiempo promedio", valor: formatoHoras(resumen.tiempo_promedio_horas), tono: "text-gray-900 dark:text-white" },
            { titulo: "Llamadas respondidas", valor: `${resumen.llamadas_respondidas} de ${resumen.llamadas}`, tono: "text-gray-900 dark:text-white" },
            { titulo: "Atenciones presenciales", valor: resumen.presenciales ?? 0, tono: "text-violet-600 dark:text-violet-400" },
            { titulo: "Llamadas vencidas", valor: resumen.llamadas_vencidas, tono: "text-red-600 dark:text-red-400" },
            { titulo: "Acciones pendientes", valor: resumen.acciones_pendientes, tono: "text-amber-600 dark:text-amber-400" },
          ]
        : [],
    [resumen]
  );

  const exportarExcel = () => {
    const libro = XLSX.utils.book_new();
    const hojas: [string, string[], any[][]][] = [
      [
        "Asignaciones",
        ["CUT", "Asignación", "Vence", "Estado", "N° respuestas", "Tiempo", "Días restantes"],
        asignaciones.map((a) => [
          a.cut,
          formatFecha(a.fecha_asignacion),
          formatFecha(a.vence),
          ESTADO_ASIG[a.estado]?.texto ?? a.estado,
          a.total_respuestas,
          a.total_respuestas > 0 && a.tiempo_respuesta_horas !== null ? `Respondiste en ${formatoHoras(a.tiempo_respuesta_horas)}` : a.cerrada ? "Cerrada" : textoFaltante(a.dias_restantes),
          a.dias_restantes ?? "",
        ]),
      ],
      [
        "Llamadas",
        ["Fecha", "CUT", "Quien llama", "Motivo", "Límite", "Situación", "Tiempo", "Acciones pendientes"],
        llamadas.map((l) => [
          formatFechaHora(l.fecha_llamada),
          l.cut,
          l.nombre_llamante,
          l.motivo,
          formatFecha(l.fecha_limite),
          SITUACION[l.situacion]?.texto ?? l.situacion,
          l.respondido ? (l.tiempo_respuesta_horas !== null ? `Respondiste en ${formatoHoras(l.tiempo_respuesta_horas)}` : "Respondida") : textoFaltante(l.dias_restantes),
          l.acciones_pendientes,
        ]),
      ],
      [
        "Prórrogas",
        ["CUT", "Solicitud", "Días pedidos", "Motivo", "Estado", "Vence original", "Vence con prórroga"],
        prorrogas.map((p) => [
          p.cut,
          formatFecha(p.fecha_solicitud),
          p.plazo_prorroga ?? "",
          p.motivo,
          p.estado,
          formatFecha(p.vence_original),
          formatFecha(p.vence_nueva),
        ]),
      ],
      [
        "Acciones",
        ["CUT", "Tipo de acción", "Estado", "Observación", "Fecha de ejecución"],
        acciones.map((a) => [a.cut, a.accion, a.estado, a.observacion, formatFecha(a.fecha_ejecucion)]),
      ],
    ];
    hojas.forEach(([nombre, encabezado, datos]) => {
      const hoja = XLSX.utils.aoa_to_sheet([encabezado, ...datos]);
      hoja["!cols"] = encabezado.map(() => ({ wch: 20 }));
      XLSX.utils.book_append_sheet(libro, hoja, nombre);
    });
    XLSX.writeFile(libro, `Mi-desempeno-${filtros.desde}-a-${filtros.hasta}.xlsx`);
  };

  const ventana = <T,>(lista: T[], pagina: number) => lista.slice(pagina * TAMANO_PAGINA, (pagina + 1) * TAMANO_PAGINA);
  const sinDatos = !cargando && resumen !== null && resumen.asignaciones === 0 && resumen.llamadas === 0 && prorrogas.length === 0 && acciones.length === 0;

  return (
    <section className="space-y-5 rounded-2xl bg-white p-6 shadow dark:bg-gray-800">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">Mi desempeño</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Tus asignaciones, llamadas, prórrogas y acciones en el periodo</p>
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
          <button
            onClick={exportarExcel}
            disabled={!resumen}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          >
            <DownloadIcon className="h-4 w-4" />
            Exportar Excel
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

      {sinDatos && <div className="p-6 text-center text-sm text-gray-500">No tienes movimientos en este periodo.</div>}

      <div>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Mis asignaciones ({asignaciones.length})</h3>
        <div className="overflow-x-auto rounded-lg ring-1 ring-gray-200 dark:ring-gray-700">
          {asignaciones.length === 0 ? (
            celdaVacia("No tienes asignaciones en este periodo")
          ) : (
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                <tr>
                  <th className="px-3 py-2 text-start">CUT</th>
                  <th className="px-3 py-2 text-center">Asignación</th>
                  <th className="px-3 py-2 text-center">Vence</th>
                  <th className="px-3 py-2 text-start">Estado</th>
                  <th className="px-3 py-2 text-start">Tiempo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {ventana(asignaciones, paginas.asignaciones).map((a, i) => (
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
        <Paginador total={asignaciones.length} pagina={paginas.asignaciones} onCambio={(p) => setPaginas({ ...paginas, asignaciones: p })} />
      </div>

      <div>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Mis llamadas ({llamadas.length})</h3>
        <div className="overflow-x-auto rounded-lg ring-1 ring-gray-200 dark:ring-gray-700">
          {llamadas.length === 0 ? (
            celdaVacia("No tienes llamadas en este periodo")
          ) : (
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-700 dark:text-gray-300">
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
                {ventana(llamadas, paginas.llamadas).map((l, i) => (
                  <tr key={`${l.cut}-${i}`}>
                    <td className="px-3 py-2 font-medium">{l.cut}</td>
                    <td className="max-w-xs px-3 py-2">
                      <div>
                        {l.nombre_llamante}
                        <span
                          className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                            l.tipo_atencion === "PRESENCIAL"
                              ? "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-100"
                              : "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-100"
                          }`}
                        >
                          {l.tipo_atencion === "PRESENCIAL" ? "Presencial" : "Llamada"}
                        </span>
                      </div>
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
        <Paginador total={llamadas.length} pagina={paginas.llamadas} onCambio={(p) => setPaginas({ ...paginas, llamadas: p })} />
      </div>

      <div>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Mis prórrogas ({prorrogas.length})</h3>
        <div className="overflow-x-auto rounded-lg ring-1 ring-gray-200 dark:ring-gray-700">
          {prorrogas.length === 0 ? (
            celdaVacia("No tienes prórrogas en este periodo")
          ) : (
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                <tr>
                  <th className="px-3 py-2 text-start">CUT</th>
                  <th className="px-3 py-2 text-center">Solicitud</th>
                  <th className="px-3 py-2 text-center">Días pedidos</th>
                  <th className="px-3 py-2 text-start">Motivo</th>
                  <th className="px-3 py-2 text-start">Estado</th>
                  <th className="px-3 py-2 text-center">Vence con prórroga</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {ventana(prorrogas, paginas.prorrogas).map((p, i) => (
                  <tr key={`${p.cut}-${i}`}>
                    <td className="px-3 py-2 font-medium">{p.cut}</td>
                    <td className="px-3 py-2 text-center">{formatFecha(p.fecha_solicitud)}</td>
                    <td className="px-3 py-2 text-center">{p.plazo_prorroga ?? "—"}</td>
                    <td className="max-w-xs truncate px-3 py-2" title={p.motivo}>
                      {p.motivo || "—"}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${ESTADO_PRORROGA[p.estado] ?? ""}`}>{p.estado}</span>
                    </td>
                    <td className="px-3 py-2 text-center">{p.vence_nueva ? formatFecha(p.vence_nueva) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <Paginador total={prorrogas.length} pagina={paginas.prorrogas} onCambio={(p) => setPaginas({ ...paginas, prorrogas: p })} />
      </div>

      <div>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Mis acciones de llamada ({acciones.length})</h3>
        <div className="overflow-x-auto rounded-lg ring-1 ring-gray-200 dark:ring-gray-700">
          {acciones.length === 0 ? (
            celdaVacia("No tienes acciones de llamada en este periodo")
          ) : (
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                <tr>
                  <th className="px-3 py-2 text-start">CUT</th>
                  <th className="px-3 py-2 text-start">Tipo de acción</th>
                  <th className="px-3 py-2 text-start">Estado</th>
                  <th className="px-3 py-2 text-start">Observación</th>
                  <th className="px-3 py-2 text-center">Fecha de ejecución</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {ventana(acciones, paginas.acciones).map((a, i) => (
                  <tr key={`${a.cut}-${i}`}>
                    <td className="px-3 py-2 font-medium">{a.cut}</td>
                    <td className="px-3 py-2">{a.accion}</td>
                    <td className="px-3 py-2">
                      <span
                        className={
                          a.estado === "Ejecutada"
                            ? "font-semibold text-green-700 dark:text-green-300"
                            : "font-semibold text-amber-700 dark:text-amber-300"
                        }
                      >
                        {a.estado}
                      </span>
                    </td>
                    <td className="max-w-xs truncate px-3 py-2" title={a.observacion}>
                      {a.observacion || "—"}
                    </td>
                    <td className="px-3 py-2 text-center">{formatFecha(a.fecha_ejecucion)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <Paginador total={acciones.length} pagina={paginas.acciones} onCambio={(p) => setPaginas({ ...paginas, acciones: p })} />
      </div>
    </section>
  );
}
