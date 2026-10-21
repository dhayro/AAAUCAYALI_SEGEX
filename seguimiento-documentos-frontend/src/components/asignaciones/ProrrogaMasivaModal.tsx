import { useState } from "react";
import { toast } from "sonner";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import api from "@/utils/api";
import { CloseIcon } from "@/icons";

export type ModoMasivo = "solicitar" | "aceptar" | "rechazar";

type Props = {
  modo: ModoMasivo;
  ids: number[];
  onClose: () => void;
  onDone: () => void;
};

const TITULOS: Record<ModoMasivo, string> = {
  solicitar: "Solicitar prórroga",
  aceptar: "Aceptar prórrogas",
  rechazar: "Rechazar prórrogas",
};

const RUTAS: Record<ModoMasivo, string> = {
  solicitar: "/asignaciones-expediente/prorroga-masiva/solicitar",
  aceptar: "/asignaciones-expediente/prorroga-masiva/aceptar",
  rechazar: "/asignaciones-expediente/prorroga-masiva/rechazar",
};

export default function ProrrogaMasivaModal({ modo, ids, onClose, onDone }: Props) {
  const [plazo, setPlazo] = useState("");
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload: any = { ids };
    if (modo === "solicitar") {
      if (!plazo || Number(plazo) < 1) {
        toast.error("El plazo de prórroga debe ser un número mayor a 0");
        return;
      }
      if (!texto.trim()) {
        toast.error("Escribe el motivo por el que solicitas la prórroga");
        return;
      }
      payload.plazo_prorroga = Number(plazo);
      payload.motivo = texto;
    }
    if (modo === "rechazar") {
      if (!texto.trim()) {
        toast.error("Escribe el motivo del rechazo");
        return;
      }
      payload.observacion = texto;
    }
    if (modo === "aceptar") {
      payload.observacion = texto;
    }

    setEnviando(true);
    try {
      const res = await api.post(RUTAS[modo], payload);
      const { ok, errores } = res.data;
      if (errores.length === 0) {
        toast.success(`${ok.length} prórroga(s) procesada(s)`);
      } else {
        toast.warning(`${ok.length} procesada(s), ${errores.length} con error: ${errores[0].mensaje}`);
      }
      onDone();
    } catch (error: any) {
      toast.error(error.response?.data?.mensaje || "Error al procesar las prórrogas");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={enviar} className="w-full max-w-md space-y-4 rounded-lg bg-white p-6 shadow-2xl dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{TITULOS[modo]}</h2>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
            <CloseIcon className="h-6 w-6" />
          </button>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400">
          Se aplicará a <strong>{ids.length}</strong> asignación(es) seleccionada(s).
          {modo === "aceptar" && " Cada una se acepta con los días que solicitó."}
        </p>

        {modo === "solicitar" && (
          <div>
            <Label>Plazo de prórroga (días calendario) *</Label>
            <Input type="number" min={1} value={plazo} onChange={(e) => setPlazo(e.target.value)} placeholder="Ej: 5" />
          </div>
        )}

        <div>
          <Label>
            {modo === "solicitar" && "Motivo de la prórroga *"}
            {modo === "aceptar" && "Observación (opcional)"}
            {modo === "rechazar" && "Motivo del rechazo *"}
          </Label>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={3}
            className="w-full rounded border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-700"
          />
        </div>

        <div className="flex gap-3 border-t pt-4 dark:border-gray-700">
          <button
            type="submit"
            disabled={enviando}
            className={`flex-1 rounded-lg px-4 py-2 text-white disabled:opacity-50 ${
              modo === "rechazar" ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {enviando ? "Procesando..." : TITULOS[modo]}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
