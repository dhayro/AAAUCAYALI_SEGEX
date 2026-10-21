import { useEffect, useState } from "react";
import { toast } from "sonner";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { fechaLegible, limiteDesde } from "@/components/atencion/plazo";
import SearchableSelect from "@/components/form/SearchableSelect";
import api from "@/utils/api";
import { puedeGestionarAsignaciones } from "@/utils/sesion";
import ExpedienteDetalleModal from "@/components/expedientes/ExpedienteDetalleModal";
import { CloseIcon, SearchIcon } from "@/icons";

type AccionCatalogo = { id: number; nombre: string; requiere_archivo: boolean };
type UsuarioSelect = { id: number; nombre: string; usuario: string; cargo?: string | null };

type Props = {
  onClose: () => void;
  onRegistrada: () => void;
};

const ahoraLocal = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

export default function RegistrarLlamadaModal({ onClose, onRegistrada }: Props) {
  const gestiona = puedeGestionarAsignaciones();
  const [catalogo, setCatalogo] = useState<AccionCatalogo[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioSelect[]>([]);
  const [cargandoUsuarios, setCargandoUsuarios] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [verCut, setVerCut] = useState<string | null>(null);
  const [seleccionadas, setSeleccionadas] = useState<Record<number, string>>({});
  const [form, setForm] = useState({
    cut: "",
    fecha_llamada: ahoraLocal(),
    nombre_llamante: "",
    telefono: "",
    motivo: "",
    plazo_dias: "",
    respondido: false,
    id_responsable: "",
  });

  useEffect(() => {
    api.get("/atenciones/acciones", { params: { solo_activas: "true" } })
      .then((res) => setCatalogo(res.data))
      .catch(() => toast.error("No se pudo cargar el catálogo de acciones"));
  }, []);

  const buscarUsuarios = async (filtro = "") => {
    setCargandoUsuarios(true);
    try {
      const params: any = { limit: 10 };
      if (filtro) params.filtro = filtro;
      const res = await api.get("/usuarios/select", { params });
      setUsuarios(Array.isArray(res.data) ? res.data : []);
    } finally {
      setCargandoUsuarios(false);
    }
  };

  useEffect(() => {
    if (gestiona) buscarUsuarios();
  }, [gestiona]);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.cut.trim()) return toast.error("El CUT es obligatorio");
    if (!form.nombre_llamante.trim()) return toast.error("Escribe el nombre de quien llama");
    if (!form.motivo.trim()) return toast.error("Escribe el motivo de la llamada");

    const acciones = Object.entries(seleccionadas).map(([id, observacion]) => ({
      id_accion: Number(id),
      observacion,
    }));

    const payload: any = {
      cut: form.cut,
      fecha_llamada: new Date(form.fecha_llamada).toISOString(),
      nombre_llamante: form.nombre_llamante,
      telefono: form.telefono,
      motivo: form.motivo,
      fecha_respuesta: limiteDesde(form.fecha_llamada, form.plazo_dias),
      respondido: form.respondido && acciones.length > 0,
      acciones,
    };
    if (gestiona && form.id_responsable) payload.id_responsable = Number(form.id_responsable);

    setEnviando(true);
    try {
      await api.post("/atenciones/llamadas", payload);
      toast.success("Llamada registrada");
      onRegistrada();
    } catch (error: any) {
      toast.error(error.response?.data?.mensaje || "No se pudo registrar la llamada");
    } finally {
      setEnviando(false);
    }
  };

  const toggleAccion = (id: number) => {
    setSeleccionadas((prev) => {
      const copia = { ...prev };
      if (id in copia) delete copia[id];
      else copia[id] = "";
      return copia;
    });
  };

  return (
    <>
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={enviar} className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-2xl dark:bg-gray-800">
        <div className="flex items-center justify-between border-b p-5 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Registrar llamada</h2>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
            <CloseIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <Label>CUT *</Label>
              <div className="flex items-center gap-2">
                <Input value={form.cut} onChange={(e) => setForm({ ...form, cut: e.target.value })} placeholder="Ej: 163943-2026" />
                <button
                  type="button"
                  onClick={() => form.cut.trim() && setVerCut(form.cut.trim())}
                  disabled={!form.cut.trim()}
                  title="Ver expediente"
                  aria-label="Ver expediente"
                  className="rounded-md border border-brand-500 bg-brand-50 p-2 text-brand-600 hover:bg-brand-100 disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-100 disabled:text-gray-400 dark:border-brand-400 dark:bg-gray-700 dark:text-brand-300"
                >
                  <SearchIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div>
              <Label>Fecha y hora de la llamada *</Label>
              <input
                type="datetime-local"
                value={form.fecha_llamada}
                onChange={(e) => setForm({ ...form, fecha_llamada: e.target.value })}
                className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700"
              />
            </div>
            <div>
              <Label>Nombre de quien llama *</Label>
              <Input value={form.nombre_llamante} onChange={(e) => setForm({ ...form, nombre_llamante: e.target.value })} />
            </div>
            <div>
              <Label>Teléfono</Label>
              <Input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
            </div>
          </div>

          <div>
            <Label>Motivo *</Label>
            <textarea
              value={form.motivo}
              onChange={(e) => setForm({ ...form, motivo: e.target.value })}
              rows={2}
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-700"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <Label>Plazo para responder al administrado (días)</Label>
              <Input
                type="number"
                min={0}
                value={form.plazo_dias}
                onChange={(e) => setForm({ ...form, plazo_dias: e.target.value })}
                placeholder="Ej: 5"
              />
              {limiteDesde(form.fecha_llamada, form.plazo_dias) && (
                <p className="mt-1 text-xs text-gray-500">
                  Límite: {fechaLegible(limiteDesde(form.fecha_llamada, form.plazo_dias))}
                </p>
              )}
            </div>
            <div className="flex flex-col justify-end gap-1 pb-2 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.respondido}
                  disabled={Object.keys(seleccionadas).length === 0}
                  onChange={(e) => setForm({ ...form, respondido: e.target.checked })}
                />
                Ya se respondió al administrado
              </label>
              {Object.keys(seleccionadas).length === 0 && (
                <span className="text-xs text-gray-500">Seleccione al menos una acción para poder marcarla</span>
              )}
            </div>
          </div>

          {gestiona && (
            <div>
              <Label>Usuario que atiende</Label>
              <SearchableSelect
                value={form.id_responsable ? Number(form.id_responsable) : ""}
                onChange={(value) => setForm({ ...form, id_responsable: String(value) })}
                options={usuarios.map((u) => ({ id: u.id, nombre: u.cargo ? `${u.nombre} (${u.cargo})` : u.nombre }))}
                onSearch={(term) => buscarUsuarios(term)}
                isLoading={cargandoUsuarios}
                placeholder="Por defecto, usted mismo"
              />
            </div>
          )}

          <div>
            <Label>Acciones a realizar</Label>
            <div className="space-y-2 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
              {catalogo.map((accion) => {
                const marcada = accion.id in seleccionadas;
                return (
                  <div key={accion.id} className="flex flex-wrap items-center gap-2">
                    <label className="flex min-w-[16rem] items-center gap-2 text-sm">
                      <input type="checkbox" checked={marcada} onChange={() => toggleAccion(accion.id)} />
                      {accion.nombre}
                      {accion.requiere_archivo && (
                        <span className="rounded bg-amber-100 px-1.5 text-[10px] font-bold text-amber-800">ARCHIVO</span>
                      )}
                    </label>
                    {marcada && (
                      <input
                        value={seleccionadas[accion.id]}
                        onChange={(e) => setSeleccionadas((prev) => ({ ...prev, [accion.id]: e.target.value }))}
                        placeholder="Observación de la acción"
                        className="min-w-[12rem] flex-1 rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex gap-3 border-t p-5 dark:border-gray-700">
          <button
            type="submit"
            disabled={enviando}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {enviando ? "Guardando..." : "Registrar llamada"}
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
    {verCut && <ExpedienteDetalleModal cut={verCut} onClose={() => setVerCut(null)} />}
    </>
  );
}
