import { useState } from "react";
import { toast } from "sonner";
import Input from "@/components/form/input/InputField";
import api from "@/utils/api";
import { estadoPlazo, fechaLegible, limiteDesde } from "@/components/atencion/plazo";

export const BadgePlazo = ({ respondido, fechaLimite }: { respondido: boolean; fechaLimite?: string | null }) => {
  const estado = estadoPlazo(respondido, fechaLimite);
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${estado.clases}`}>{estado.texto}</span>;
};

interface EditorPlazoProps {
  llamadaId: number;
  fechaLlamada: string;
  respondido: boolean;
  onGuardado: () => Promise<void> | void;
}

// Permite cambiar el plazo mientras la llamada siga sin respuesta.
export function EditorPlazo({ llamadaId, fechaLlamada, respondido, onGuardado }: EditorPlazoProps) {
  const [dias, setDias] = useState("");
  const [guardando, setGuardando] = useState(false);

  if (respondido) return null;

  const guardar = async () => {
    const limite = limiteDesde(fechaLlamada, dias);
    if (!limite) return toast.error("Indique los días de plazo");
    setGuardando(true);
    try {
      await api.put(`/atenciones/llamadas/${llamadaId}`, { fecha_respuesta: limite });
      toast.success(`Plazo actualizado: hasta ${fechaLegible(limite)}`);
      setDias("");
      await onGuardado();
    } catch (error: any) {
      toast.error(error.response?.data?.mensaje || "No se pudo actualizar el plazo");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="mt-2 flex items-center gap-2">
      <div className="w-24">
        <Input type="number" min={0} value={dias} onChange={(e) => setDias(e.target.value)} placeholder="Días" />
      </div>
      <button
        type="button"
        onClick={guardar}
        disabled={guardando}
        className="rounded-lg border border-brand-600 px-3 py-1.5 text-xs font-semibold text-brand-600 hover:bg-brand-50 disabled:opacity-50 dark:border-brand-400 dark:text-brand-400"
      >
        {guardando ? "Guardando..." : "Cambiar plazo"}
      </button>
    </div>
  );
}
