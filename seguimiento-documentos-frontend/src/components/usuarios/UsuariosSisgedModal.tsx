import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import DatePickerLima from "@/components/form/DatePickerLima";
import { formatFecha } from "@/components/expedientes/format";
import api from "@/utils/api";
import { PencilIcon, TrashBinIcon, PlusIcon } from "@/icons";

interface RegistroSisged {
  id: number;
  usuario_sisged: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  observacion: string | null;
  vigencia: "VIGENTE" | "VENCIDO" | "FUTURO";
}

const VIGENCIA: Record<RegistroSisged["vigencia"], { texto: string; clases: string }> = {
  VIGENTE: { texto: "Vigente", clases: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" },
  VENCIDO: { texto: "Vencido", clases: "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200" },
  FUTURO: { texto: "Por iniciar", clases: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100" },
};

const FORM_VACIO = { usuario_sisged: "", fecha_inicio: "", fecha_fin: "", observacion: "" };

type Props = {
  usuarioId: number;
  nombreUsuario: string;
  onClose: () => void;
};

// Usuarios de SISGED asociados a un usuario del sistema, con su vigencia.
export default function UsuariosSisgedModal({ usuarioId, nombreUsuario, onClose }: Props) {
  const [registros, setRegistros] = useState<RegistroSisged[]>([]);
  const [cargando, setCargando] = useState(true);
  const [editandoId, setEditandoId] = useState<number | null | "nuevo">(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await api.get(`/usuarios/${usuarioId}/sisged`);
      setRegistros(res.data || []);
    } catch {
      toast.error("No se pudieron cargar los usuarios de SISGED");
    } finally {
      setCargando(false);
    }
  }, [usuarioId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const abrirNuevo = () => {
    setForm(FORM_VACIO);
    setEditandoId("nuevo");
  };

  const abrirEdicion = (r: RegistroSisged) => {
    setForm({
      usuario_sisged: r.usuario_sisged,
      fecha_inicio: r.fecha_inicio,
      fecha_fin: r.fecha_fin || "",
      observacion: r.observacion || "",
    });
    setEditandoId(r.id);
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.usuario_sisged.trim()) return toast.error("Indique el nombre de usuario de SISGED");
    if (!form.fecha_inicio) return toast.error("Indique la fecha de inicio");
    if (form.fecha_fin && form.fecha_fin < form.fecha_inicio) {
      return toast.error("La fecha de fin no puede ser anterior a la de inicio");
    }
    setGuardando(true);
    try {
      const datos = { ...form, fecha_fin: form.fecha_fin || null };
      if (editandoId === "nuevo") {
        await api.post(`/usuarios/${usuarioId}/sisged`, datos);
        toast.success("Usuario de SISGED agregado");
      } else {
        await api.put(`/usuarios/${usuarioId}/sisged/${editandoId}`, datos);
        toast.success("Usuario de SISGED actualizado");
      }
      setEditandoId(null);
      await cargar();
    } catch (error: any) {
      toast.error(error.response?.data?.mensaje || "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  };

  const quitar = async (r: RegistroSisged) => {
    if (!window.confirm(`¿Quitar el usuario de SISGED "${r.usuario_sisged}"?`)) return;
    try {
      await api.delete(`/usuarios/${usuarioId}/sisged/${r.id}`);
      toast.success("Usuario de SISGED quitado");
      await cargar();
    } catch (error: any) {
      toast.error(error.response?.data?.mensaje || "No se pudo quitar");
    }
  };

  return (
    <Modal isOpen onClose={onClose} className="max-w-3xl p-6 sm:p-8">
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Usuarios de SISGED</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {nombreUsuario}. Un usuario puede tener varios usuarios de SISGED, cada uno con su vigencia.
          </p>
        </div>

        {cargando ? (
          <div className="p-6 text-center text-gray-500">Cargando...</div>
        ) : registros.length === 0 ? (
          <div className="rounded-lg bg-gray-50 p-6 text-center text-sm text-gray-500 dark:bg-gray-800">
            Este usuario no tiene usuarios de SISGED registrados.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                <tr>
                  <th className="px-3 py-2 text-start">Usuario SISGED</th>
                  <th className="px-3 py-2 text-center">Inicio</th>
                  <th className="px-3 py-2 text-center">Fin</th>
                  <th className="px-3 py-2 text-center">Vigencia</th>
                  <th className="px-3 py-2 text-start">Observación</th>
                  <th className="px-3 py-2 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {registros.map((r) => (
                  <tr key={r.id}>
                    <td className="px-3 py-2 font-semibold">{r.usuario_sisged}</td>
                    <td className="px-3 py-2 text-center">{formatFecha(r.fecha_inicio)}</td>
                    <td className="px-3 py-2 text-center">{r.fecha_fin ? formatFecha(r.fecha_fin) : "Sin fin"}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${VIGENCIA[r.vigencia].clases}`}>
                        {VIGENCIA[r.vigencia].texto}
                      </span>
                    </td>
                    <td className="max-w-xs break-words px-3 py-2 text-gray-600 dark:text-gray-300">{r.observacion || "—"}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => abrirEdicion(r)} className="p-1 text-green-600 hover:text-green-800" title="Editar">
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button onClick={() => quitar(r)} className="p-1 text-red-600 hover:text-red-800" title="Quitar">
                          <TrashBinIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {editandoId === null ? (
          <button
            onClick={abrirNuevo}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <PlusIcon className="h-4 w-4" /> Agregar usuario de SISGED
          </button>
        ) : (
          <form onSubmit={guardar} className="grid grid-cols-1 gap-4 rounded-lg bg-gray-50 p-4 md:grid-cols-2 dark:bg-gray-800">
            <div className="md:col-span-2">
              <Label>Nombre de usuario en SISGED *</Label>
              <Input
                value={form.usuario_sisged}
                onChange={(e) => setForm({ ...form, usuario_sisged: e.target.value })}
                placeholder="Ej: dkong"
              />
            </div>
            <div>
              <Label>Fecha de inicio *</Label>
              <DatePickerLima value={form.fecha_inicio} onChange={(v) => setForm({ ...form, fecha_inicio: v })} placeholder="Seleccione" />
            </div>
            <div>
              <Label>Fecha de fin (opcional)</Label>
              <DatePickerLima value={form.fecha_fin} onChange={(v) => setForm({ ...form, fecha_fin: v })} placeholder="Sin fin" />
            </div>
            <div className="md:col-span-2">
              <Label>Observación</Label>
              <Input value={form.observacion} onChange={(e) => setForm({ ...form, observacion: e.target.value })} placeholder="Opcional" />
            </div>
            <div className="flex gap-3 md:col-span-2">
              <button
                type="submit"
                disabled={guardando}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {guardando ? "Guardando..." : "Guardar"}
              </button>
              <button
                type="button"
                onClick={() => setEditandoId(null)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
          >
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  );
}
