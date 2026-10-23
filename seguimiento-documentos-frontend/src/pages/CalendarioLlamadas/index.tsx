import PageMeta from "@/components/common/PageMeta";
import CalendarioLlamadas from "@/components/atencion/CalendarioLlamadas";
import DetalleLlamadaModal from "@/components/atencion/DetalleLlamadaModal";
import { useState } from "react";
import { Link } from "react-router";

type Campo = "llamada" | "plazo";

const VISTAS: { value: Campo; texto: string; descripcion: string }[] = [
  {
    value: "llamada",
    texto: "Por día de llamada",
    descripcion: "Cada llamada aparece el día en que se recibió.",
  },
  {
    value: "plazo",
    texto: "Por plazo de respuesta",
    descripcion: "Cada llamada aparece el día en que vence su plazo de respuesta.",
  },
];

// Calendario de llamadas, con dos criterios: día de llamada o día de plazo. El color muestra la situación.
export default function CalendarioLlamadasPagina() {
  const [detalleId, setDetalleId] = useState<number | null>(null);
  const [campo, setCampo] = useState<Campo>("plazo");
  const vista = VISTAS.find((v) => v.value === campo)!;

  return (
    <>
      <PageMeta title="Calendario de llamadas | Sistema de Seguimiento" description="Llamadas por día de llamada o por plazo de respuesta" />
      <div className="min-h-screen bg-gray-100 p-4 dark:bg-gray-900 md:p-6">
        <header className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white md:text-3xl">Calendario de llamadas</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {vista.descripcion} El color muestra si está respondida, vencida, por vencer o en plazo.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {VISTAS.map((v) => (
              <button
                key={v.value}
                onClick={() => setCampo(v.value)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                  campo === v.value
                    ? "bg-brand-600 text-white"
                    : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                }`}
              >
                {v.texto}
              </button>
            ))}
            <Link
              to="/monitor-llamadas"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-center text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            >
              Volver al monitor
            </Link>
          </div>
        </header>

        <CalendarioLlamadas campo={campo} onVerDetalle={setDetalleId} />

        {detalleId !== null && (
          <DetalleLlamadaModal llamadaId={detalleId} soloLectura onClose={() => setDetalleId(null)} onCambio={() => {}} />
        )}
      </div>
    </>
  );
}
