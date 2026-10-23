import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import api from "@/utils/api";

interface LlamadaCalendario {
  id: number;
  cut: string;
  nombre_llamante: string;
  motivo: string;
  fecha_respuesta: string;
  respondido: boolean;
  situacion: "RESPONDIDA" | "VENCIDA" | "POR_VENCER" | "EN_PLAZO";
  responsable: string;
}

const SITUACION: Record<LlamadaCalendario["situacion"], { texto: string; clases: string }> = {
  VENCIDA: { texto: "Vencida", clases: "border-red-400 bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-100" },
  POR_VENCER: { texto: "Por vencer", clases: "border-amber-400 bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100" },
  EN_PLAZO: { texto: "En plazo", clases: "border-blue-400 bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-100" },
  RESPONDIDA: { texto: "Respondida", clases: "border-green-400 bg-green-100 text-green-900 dark:bg-green-900/40 dark:text-green-100" },
};

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (anio: number, mes: number, dia: number) => `${anio}-${pad(mes)}-${pad(dia)}`;
const hoyYMD = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

type Props = {
  onVerDetalle: (id: number) => void;
};

// Calendario mensual de llamadas: cada llamada cae en el día de su plazo y su color muestra su situación.
export default function CalendarioLlamadas({ onVerDetalle }: Props) {
  const hoy = hoyYMD();
  const [anio, setAnio] = useState(Number(hoy.slice(0, 4)));
  const [mes, setMes] = useState(Number(hoy.slice(5, 7)));
  const [llamadas, setLlamadas] = useState<LlamadaCalendario[]>([]);
  const [cargando, setCargando] = useState(true);

  const diasDelMes = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  const primerDiaSemana = (new Date(Date.UTC(anio, mes - 1, 1)).getUTCDay() + 6) % 7; // lunes = 0

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await api.get("/atenciones/calendario", {
        params: { desde: ymd(anio, mes, 1), hasta: ymd(anio, mes, diasDelMes) },
      });
      setLlamadas(res.data || []);
    } catch {
      toast.error("No se pudo cargar el calendario");
    } finally {
      setCargando(false);
    }
  }, [anio, mes, diasDelMes]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const porDia = new Map<string, LlamadaCalendario[]>();
  llamadas.forEach((l) => {
    const dia = String(l.fecha_respuesta).slice(0, 10);
    porDia.set(dia, [...(porDia.get(dia) || []), l]);
  });

  const conteos = { VENCIDA: 0, POR_VENCER: 0, EN_PLAZO: 0, RESPONDIDA: 0 };
  llamadas.forEach((l) => {
    conteos[l.situacion] += 1;
  });

  const irA = (delta: number) => {
    const nuevo = new Date(Date.UTC(anio, mes - 1 + delta, 1));
    setAnio(nuevo.getUTCFullYear());
    setMes(nuevo.getUTCMonth() + 1);
  };

  const celdas: (number | null)[] = [
    ...Array(primerDiaSemana).fill(null),
    ...Array.from({ length: diasDelMes }, (_, i) => i + 1),
  ];
  while (celdas.length % 7 !== 0) celdas.push(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => irA(-1)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
          >
            ‹
          </button>
          <h2 className="min-w-[10rem] text-center text-xl font-bold text-gray-900 dark:text-white">
            {MESES[mes - 1]} {anio}
          </h2>
          <button
            onClick={() => irA(1)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
          >
            ›
          </button>
          <button
            onClick={() => {
              setAnio(Number(hoy.slice(0, 4)));
              setMes(Number(hoy.slice(5, 7)));
            }}
            className="ml-2 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Hoy
          </button>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          {(Object.keys(SITUACION) as LlamadaCalendario["situacion"][]).map((s) => (
            <span key={s} className={`rounded-full border px-2.5 py-1 ${SITUACION[s].clases}`}>
              {SITUACION[s].texto} · {conteos[s]}
            </span>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg bg-white shadow dark:bg-gray-800">
        <div className="grid min-w-[56rem] grid-cols-7 border-b text-center text-xs font-semibold uppercase text-gray-500 dark:border-gray-700 dark:text-gray-400">
          {DIAS_SEMANA.map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>
        {cargando ? (
          <div className="p-12 text-center text-gray-500">Cargando calendario...</div>
        ) : (
          <div className="grid min-w-[56rem] grid-cols-7">
            {celdas.map((dia, i) => {
              if (dia === null) {
                return <div key={`vacio-${i}`} className="min-h-[7rem] border-b border-r bg-gray-50 dark:border-gray-700 dark:bg-gray-900/40" />;
              }
              const fecha = ymd(anio, mes, dia);
              const lista = porDia.get(fecha) || [];
              const esHoy = fecha === hoy;
              return (
                <div
                  key={fecha}
                  className={`flex min-h-[7rem] flex-col border-b border-r p-1.5 dark:border-gray-700 ${esHoy ? "bg-brand-50 dark:bg-brand-900/20" : ""}`}
                >
                  <div className={`mb-1 text-xs font-bold ${esHoy ? "text-brand-700 dark:text-brand-300" : "text-gray-600 dark:text-gray-300"}`}>
                    {dia}
                  </div>
                  <div className="max-h-32 space-y-1 overflow-y-auto">
                    {lista.map((l) => (
                      <button
                        key={l.id}
                        onClick={() => onVerDetalle(l.id)}
                        title={`${l.cut} · ${l.nombre_llamante} · ${l.motivo}`}
                        className={`block w-full rounded border px-1.5 py-1 text-left text-[11px] leading-tight hover:opacity-80 ${SITUACION[l.situacion].clases}`}
                      >
                        <div className="truncate font-bold">{l.cut}</div>
                        <div className="truncate">{l.nombre_llamante}</div>
                        {l.responsable && <div className="truncate opacity-75">{l.responsable}</div>}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
