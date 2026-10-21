import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { useClickOutside } from "@/hooks/useClickOutside";
import api from "@/utils/api";
import { Dropdown } from "../ui/dropdown/Dropdown";

type Motivo =
  | "OBSERVADA"
  | "VENCIDA"
  | "POR_VENCER"
  | "POR_EVALUAR"
  | "RESPONDIDA"
  | "LLAMADA_VENCIDA"
  | "LLAMADA_POR_VENCER"
  | "LLAMADA_SIN_RESPUESTA";

interface Pendiente {
  id: number | string;
  cut: string;
  asignado: string | null;
  vence: string;
  dias: number | null;
  motivo: Motivo;
}

const MOTIVO: Record<Motivo, { texto: string; ruta: string; clases: string }> = {
  LLAMADA_SIN_RESPUESTA: { texto: "Llamada sin respuesta", ruta: "/llamadas", clases: "text-gray-600 dark:text-gray-300" },
  OBSERVADA: { texto: "Observada: responder", ruta: "/asignacion-expediente", clases: "text-amber-700 dark:text-amber-300" },
  VENCIDA: { texto: "Asignación vencida", ruta: "/asignacion-expediente", clases: "text-red-600 dark:text-red-400" },
  POR_VENCER: { texto: "Asignación por vencer", ruta: "/asignacion-expediente", clases: "text-amber-700 dark:text-amber-300" },
  POR_EVALUAR: { texto: "Respuesta por evaluar", ruta: "/evaluacion-respuestas", clases: "text-blue-700 dark:text-blue-300" },
  RESPONDIDA: { texto: "Respondida, por evaluar", ruta: "/evaluacion-respuestas", clases: "text-indigo-700 dark:text-indigo-300" },
  LLAMADA_VENCIDA: { texto: "Llamada vencida", ruta: "/llamadas", clases: "text-red-600 dark:text-red-400" },
  LLAMADA_POR_VENCER: { texto: "Llamada por vencer", ruta: "/llamadas", clases: "text-amber-700 dark:text-amber-300" },
};

const textoDias = (dias: number | null) => (dias === null ? "sin plazo" : dias < 0 ?`vencida hace ${-dias} d` : dias === 0 ? "vence hoy" : `${dias} d`);

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [pendientes, setPendientes] = useState<Pendiente[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useClickOutside(ref, () => setIsOpen(false));

  const cargar = useCallback(async () => {
    try {
      const res = await api.get("/dashboard/resumen");
      setPendientes(res.data.atencion || []);
    } catch {
      setPendientes([]);
    }
  }, []);

  useEffect(() => {
    cargar();
    const intervalo = setInterval(cargar, 60000);
    return () => clearInterval(intervalo);
  }, [cargar]);

  const hayPendientes = pendientes.length > 0;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => {
          setIsOpen((prev) => !prev);
          if (!isOpen) cargar();
        }}
        aria-label="Atención requerida"
        className="dropdown-toggle relative flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
      >
        {hayPendientes && (
          <span className="absolute -end-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {pendientes.length > 9 ? "9+" : pendientes.length}
          </span>
        )}
        <svg className="fill-current" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C5.85786 1.54248 2.5 4.90034 2.5 9.04248V12.7925L1.20949 14.3335C0.906505 14.6903 0.849754 15.1883 1.03735 15.6138C1.22494 16.0392 1.64741 16.3125 2.11475 16.3125H17.8852C18.3526 16.3125 18.775 16.0392 18.9626 15.6138C19.1502 15.1883 19.0935 14.6903 18.7905 14.3335L17.5 12.7925V9.04248C17.5 8.5 17.4 7.975 17.2112 7.48L10.75 2.29248Z"
          />
        </svg>
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        className="absolute -right-16 mt-4 flex max-h-[70vh] w-[22rem] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg sm:w-96 dark:border-gray-800 dark:bg-gray-dark"
      >
        <div className="flex items-center justify-between px-2 pb-3">
          <h5 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Atención requerida</h5>
          <span className="text-xs text-gray-500">{pendientes.length} pendiente{pendientes.length === 1 ? "" : "s"}</span>
        </div>

        <ul className="flex min-h-0 flex-col gap-1 overflow-y-auto border-t border-gray-200 pt-2 dark:border-gray-800">
          {pendientes.length === 0 && (
            <li className="p-4 text-center text-sm text-gray-500">No hay pendientes. Todo está al día.</li>
          )}
          {pendientes.map((p) => (
            <li key={p.id}>
              <Link
                to={MOTIVO[p.motivo].ruta}
                onClick={() => setIsOpen(false)}
                className="flex flex-col gap-0.5 rounded-lg px-3 py-2 hover:bg-gray-100 dark:hover:bg-white/5"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-gray-900 dark:text-white">{p.cut}</span>
                  <span className="shrink-0 text-xs font-medium text-gray-500">{textoDias(p.dias)}</span>
                </span>
                <span className={`text-xs font-medium ${MOTIVO[p.motivo].clases}`}>{MOTIVO[p.motivo].texto}</span>
                {p.asignado && <span className="truncate text-xs text-gray-500 dark:text-gray-400">{p.asignado}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </Dropdown>
    </div>
  );
}
