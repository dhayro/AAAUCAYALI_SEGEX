import { useEffect, useState } from "react";
import { toast } from "sonner";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { fechaLegible, limiteDesde } from "@/components/atencion/plazo";
import DatePickerLima from "@/components/form/DatePickerLima";
import SearchableSelect from "@/components/form/SearchableSelect";
import api from "@/utils/api";
import { nombreActual, usuarioActualId } from "@/utils/sesion";
import ExpedienteDetalleModal from "@/components/expedientes/ExpedienteDetalleModal";
import { CloseIcon, SearchIcon } from "@/icons";
import { formatFechaHora } from "@/components/expedientes/format";

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
  const [catalogo, setCatalogo] = useState<AccionCatalogo[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioSelect[]>([]);
  const [cargandoUsuarios, setCargandoUsuarios] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [verCut, setVerCut] = useState<string | null>(null);
  const [seleccionadas, setSeleccionadas] = useState<Record<number, string>>({});
  const [previas, setPrevias] = useState<any[]>([]);
  const [modoPlazo, setModoPlazo] = useState<"dias" | "fecha">("dias");
  // LLAMADA o PRESENCIAL: la atención en persona usa el mismo registro y flujo, solo cambia el tipo.
  const [tipo, setTipo] = useState<"LLAMADA" | "PRESENCIAL">("LLAMADA");
  const presencial = tipo === "PRESENCIAL";
  const [form, setForm] = useState({
    cut: "",
    fecha_llamada: ahoraLocal(),
    nombre_llamante: "",
    telefono: "",
    motivo: "",
    plazo_dias: "",
    fecha_limite: "",
    respondido: false,
    // Por defecto, la llamada queda a cargo del usuario logueado.
    id_responsable: String(usuarioActualId() ?? ""),
  });

  // Busca llamadas anteriores del mismo CUT mientras se escribe.
  useEffect(() => {
    const cut = form.cut.trim();
    if (cut.length < 5) {
      setPrevias([]);
      return;
    }
    const espera = setTimeout(() => {
      api
        .get(`/atenciones/llamadas/por-cut/${encodeURIComponent(cut)}`)
        .then((res) => setPrevias(res.data || []))
        .catch(() => setPrevias([]));
    }, 400);
    return () => clearTimeout(espera);
  }, [form.cut]);

  useEffect(() => {
    api.get("/atenciones/acciones", { params: { solo_activas: "true" } })
      .then((res) => setCatalogo(res.data))
      .catch(() => toast.error("No se pudo cargar el catálogo de acciones"));
  }, []);

  const buscarUsuarios = async (filtro = "") => {
    setCargandoUsuarios(true);
    try {
      const params: any = {};
      if (filtro) params.filtro = filtro;
      const res = await api.get("/usuarios/select", { params });
      setUsuarios(Array.isArray(res.data) ? res.data : []);
    } finally {
      setCargandoUsuarios(false);
    }
  };

  useEffect(() => {
    buscarUsuarios();
  }, []);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.cut.trim()) return toast.error("El CUT es obligatorio");
    if (modoPlazo === "fecha" && form.fecha_limite && form.fecha_limite < form.fecha_llamada.slice(0, 10)) {
      return toast.error(`La fecha límite no puede ser anterior a ${presencial ? "la atención" : "la llamada"}`);
    }
    if (!form.nombre_llamante.trim()) {
      return toast.error(presencial ? "Escribe el nombre de quien fue atendido" : "Escribe el nombre de quien llama");
    }
    if (!form.motivo.trim()) {
      return toast.error(presencial ? "Escribe el motivo de la atención" : "Escribe el motivo de la llamada");
    }

    const acciones = Object.entries(seleccionadas).map(([id, observacion]) => ({
      id_accion: Number(id),
      observacion,
    }));

    const payload: any = {
      cut: form.cut,
      fecha_llamada: new Date(form.fecha_llamada).toISOString(),
      nombre_llamante: form.nombre_llamante,
      tipo_atencion: tipo,
      telefono: form.telefono,
      motivo: form.motivo,
      fecha_respuesta:
        modoPlazo === "fecha" ? form.fecha_limite || null : limiteDesde(form.fecha_llamada, form.plazo_dias),
      respondido: form.respondido && acciones.length > 0,
      acciones,
    };
    if (form.id_responsable) payload.id_responsable = Number(form.id_responsable);

    setEnviando(true);
    try {
      await api.post("/atenciones/llamadas", payload);
      toast.success(presencial ? "Atención presencial registrada" : "Llamada registrada");
      onRegistrada();
    } catch (error: any) {
      toast.error(error.response?.data?.mensaje || (presencial ? "No se pudo registrar la atención" : "No se pudo registrar la llamada"));
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
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={enviar} className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-2xl dark:bg-gray-800">
        <div className="flex items-center justify-between border-b p-5 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {presencial ? "Registrar atención presencial" : "Registrar llamada"}
          </h2>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
            <CloseIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-5">
          <div className="inline-flex rounded-lg border border-gray-300 p-1 dark:border-gray-600">
            {(
              [
                { value: "LLAMADA", texto: "Llamada" },
                { value: "PRESENCIAL", texto: "Atención presencial" },
              ] as const
            ).map((op) => (
              <button
                key={op.value}
                type="button"
                onClick={() => setTipo(op.value)}
                className={`rounded-md px-4 py-1.5 text-sm font-semibold ${
                  tipo === op.value
                    ? "bg-brand-600 text-white"
                    : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {op.texto}
              </button>
            ))}
          </div>
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
              {previas.length > 0 && (
                <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs dark:border-amber-700 dark:bg-amber-900/30">
                  <div className="font-semibold text-amber-900 dark:text-amber-100">
                    Este CUT ya tiene {previas.length} registro{previas.length === 1 ? "" : "s"} previo{previas.length === 1 ? "" : "s"}
                  </div>
                  <ul className="mt-1 space-y-1 text-amber-900 dark:text-amber-100">
                    {previas.map((p) => (
                      <li key={p.id}>
                        {formatFechaHora(p.fecha_llamada)} · {p.tipo_atencion === "PRESENCIAL" ? "atendido" : "llamó"} {p.nombre_llamante} ·{" "}
                        {p.respondido ? "Respondida" : "Sin respuesta"} ·{" "}
                        {p.responsable ? `${p.responsable.nombre} ${p.responsable.apellido}` : "Sin responsable"} — {p.motivo}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div>
              <Label>{presencial ? "Fecha y hora de la atención *" : "Fecha y hora de la llamada *"}</Label>
              <input
                type="datetime-local"
                value={form.fecha_llamada}
                onChange={(e) => setForm({ ...form, fecha_llamada: e.target.value })}
                className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700"
              />
            </div>
            <div>
              <Label>{presencial ? "Nombre de quien fue atendido *" : "Nombre de quien llama *"}</Label>
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
              <Label>Plazo para responder al administrado</Label>
              <div className="mb-2 inline-flex rounded-lg bg-gray-100 p-1 text-xs font-semibold dark:bg-gray-700">
                {(["dias", "fecha"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setModoPlazo(m)}
                    className={`rounded-md px-3 py-1 ${
                      modoPlazo === m
                        ? "bg-white text-brand-600 shadow dark:bg-gray-800 dark:text-brand-300"
                        : "text-gray-600 dark:text-gray-300"
                    }`}
                  >
                    {m === "dias" ? "Por días" : "Fecha exacta"}
                  </button>
                ))}
              </div>
              {modoPlazo === "dias" ? (
                <>
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
                </>
              ) : (
                <DatePickerLima
                  label="Fecha límite de respuesta"
                  value={form.fecha_limite}
                  onChange={(date) => setForm({ ...form, fecha_limite: date })}
                  placeholder="DD/MM/YYYY"
                />
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

          <div>
            <Label>Usuario que atiende</Label>
            <SearchableSelect
              value={form.id_responsable ? Number(form.id_responsable) : ""}
              onChange={(value) => setForm({ ...form, id_responsable: String(value) })}
              options={usuarios.map((u) => ({ id: u.id, nombre: u.cargo ? `${u.nombre} (${u.cargo})` : u.nombre }))}
              onSearch={(term) => buscarUsuarios(term)}
              isLoading={cargandoUsuarios}
              selectedLabel={Number(form.id_responsable) === usuarioActualId() ? nombreActual() : undefined}
              placeholder="Buscar usuario..."
            />
          </div>

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
            {enviando ? "Guardando..." : presencial ? "Registrar atención" : "Registrar llamada"}
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
