import { useState } from "react";
import { toast } from "sonner";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import api from "@/utils/api";
import { CloseIcon } from "@/icons";
import { formatFecha } from "@/components/expedientes/format";

export type AsignacionProrroga = {
  id: number;
  cut: string;
  fecha_vencimiento: string;
  fecha_prorroga?: string | null;
  plazo_prorroga?: number | null;
};

type Props = {
  asignacion: AsignacionProrroga;
  onClose: () => void;
  onRevisada: () => void;
};

export default function RevisionProrrogaModal({ asignacion, onClose, onRevisada }: Props) {
  const [plazo, setPlazo] = useState(String(asignacion.plazo_prorroga ?? ""));
  const [observacion, setObservacion] = useState("");
  const [enviando, setEnviando] = useState(false);

  const aceptar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plazo || Number(plazo) < 1) {
      toast.error("El plazo de prórroga debe ser un número mayor a 0");
      return;
    }
    setEnviando(true);
    try {
      await api.patch(`/asignaciones-expediente/${asignacion.id}/prorroga/aceptar`, {
        plazo_prorroga: Number(plazo),
        observacion,
      });
      toast.success("Prórroga aceptada");
      onRevisada();
    } catch (error: any) {
      toast.error(error.response?.data?.mensaje || "Error al aceptar la prórroga");
    } finally {
      setEnviando(false);
    }
  };

  const rechazar = async () => {
    setEnviando(true);
    try {
      await api.patch(`/asignaciones-expediente/${asignacion.id}/prorroga/rechazar`, { observacion });
      toast.success("Prórroga rechazada");
      onRevisada();
    } catch (error: any) {
      toast.error(error.response?.data?.mensaje || "Error al rechazar la prórroga");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={aceptar} className="w-full max-w-md space-y-4 rounded-lg bg-white p-6 shadow-2xl dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Revisar prórroga — {asignacion.cut}</h2>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
            <CloseIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-700/50">
          <div>
            Solicitada el <strong>{formatFecha(asignacion.fecha_prorroga)}</strong> por{" "}
            <strong>{asignacion.plazo_prorroga}</strong> días calendario.
          </div>
          <div className="mt-1 text-gray-600 dark:text-gray-300">
            Vencimiento actual: {formatFecha(asignacion.fecha_vencimiento)}
          </div>
        </div>
        <div>
          <Label>Días de prórroga a aceptar *</Label>
          <Input type="number" min={1} value={plazo} onChange={(e) => setPlazo(e.target.value)} />
          <p className="mt-1 text-xs text-gray-500">Puedes cambiar los días antes de aceptar.</p>
        </div>
        <div>
          <Label>Observación</Label>
          <textarea
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            rows={2}
            placeholder="Motivo o comentario (opcional)"
            className="w-full rounded border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-700"
          />
        </div>
        <div className="flex gap-3 border-t pt-4 dark:border-gray-700">
          <button
            type="submit"
            disabled={enviando}
            className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
          >
            Aceptar prórroga
          </button>
          <button
            type="button"
            onClick={rechazar}
            disabled={enviando}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50"
          >
            Rechazar
          </button>
        </div>
      </form>
    </div>
  );
}
