import PageMeta from "@/components/common/PageMeta";
import CalendarioLlamadas from "@/components/atencion/CalendarioLlamadas";
import DetalleLlamadaModal from "@/components/atencion/DetalleLlamadaModal";
import { useState } from "react";
import { Link } from "react-router";

// Calendario de llamadas: cada llamada en el día de su plazo, con su situación y su detalle.
export default function CalendarioLlamadasPagina() {
  const [detalleId, setDetalleId] = useState<number | null>(null);

  return (
    <>
      <PageMeta title="Calendario de llamadas | Sistema de Seguimiento" description="Llamadas por día de plazo y su situación" />
      <div className="min-h-screen bg-gray-100 p-4 dark:bg-gray-900 md:p-6">
        <header className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white md:text-3xl">Calendario de llamadas</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Cada llamada está en el día de su plazo. El color muestra si está respondida, vencida, por vencer o en plazo.
            </p>
          </div>
          <Link
            to="/monitor-llamadas"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-center text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
          >
            Volver al monitor
          </Link>
        </header>

        <CalendarioLlamadas onVerDetalle={setDetalleId} />

        {detalleId !== null && (
          <DetalleLlamadaModal llamadaId={detalleId} soloLectura onClose={() => setDetalleId(null)} onCambio={() => {}} />
        )}
      </div>
    </>
  );
}
