import PageMeta from "@/components/common/PageMeta";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import api from "@/utils/api";
import { PencilIcon, PlusIcon, CloseIcon } from "@/icons";

interface Accion {
  id: number;
  nombre: string;
  requiere_archivo: boolean;
  activo: boolean;
}

const formVacio = { nombre: "", requiere_archivo: false, activo: true };

export default function AccionesAtencion() {
  const [acciones, setAcciones] = useState<Accion[]>([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState<Accion | "nuevo" | null>(null);
  const [form, setForm] = useState(formVacio);

  const fetchAcciones = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/atenciones/acciones");
      setAcciones(res.data || []);
    } catch {
      toast.error("Error al cargar las acciones");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAcciones();
  }, [fetchAcciones]);

  const abrirNueva = () => {
    setForm(formVacio);
    setEditando("nuevo");
  };

  const abrirEdicion = (accion: Accion) => {
    setForm({ nombre: accion.nombre, requiere_archivo: accion.requiere_archivo, activo: accion.activo });
    setEditando(accion);
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim()) return toast.error("El nombre de la acción es obligatorio");
    try {
      if (editando === "nuevo") {
        await api.post("/atenciones/acciones", form);
        toast.success("Acción creada");
      } else if (editando) {
        await api.put(`/atenciones/acciones/${editando.id}`, form);
        toast.success("Acción actualizada");
      }
      setEditando(null);
      fetchAcciones();
    } catch (error: any) {
      toast.error(error.response?.data?.mensaje || "No se pudo guardar la acción");
    }
  };

  return (
    <>
      <PageMeta title="Acciones de Atención | Sistema de Seguimiento" description="Catálogo de acciones para la atención de llamadas" />
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Acciones de Atención</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Catálogo de acciones que se pueden asignar a una llamada
            </p>
          </div>
          <button
            onClick={abrirNueva}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            <PlusIcon className="h-5 w-5" />
            Nueva Acción
          </button>
        </div>

        {editando && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
            <form onSubmit={guardar} className="w-full max-w-md space-y-4 rounded-lg bg-white p-6 shadow-2xl dark:bg-gray-800">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {editando === "nuevo" ? "Nueva Acción" : "Editar Acción"}
                </h2>
                <button type="button" onClick={() => setEditando(null)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
                  <CloseIcon className="h-6 w-6" />
                </button>
              </div>
              <div>
                <Label>Nombre *</Label>
                <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Emitir informe legal" />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.requiere_archivo}
                  onChange={(e) => setForm({ ...form, requiere_archivo: e.target.checked })}
                />
                Requiere subir un archivo de avance
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} />
                Activa (disponible para nuevas llamadas)
              </label>
              <div className="flex gap-3 border-t pt-4 dark:border-gray-700">
                <button type="submit" className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
                  {editando === "nuevo" ? "Guardar" : "Actualizar"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditando(null)}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center text-gray-500">Cargando acciones...</div>
            ) : acciones.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50 dark:bg-gray-700">
                    <th className="px-6 py-4 text-start text-sm font-semibold">#</th>
                    <th className="px-6 py-4 text-start text-sm font-semibold">Acción</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Requiere archivo</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Estado</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {acciones.map((a, index) => (
                    <tr key={a.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 text-sm">{index + 1}</td>
                      <td className="px-6 py-4 font-medium">{a.nombre}</td>
                      <td className="px-6 py-4 text-center text-sm">{a.requiere_archivo ? "Sí" : "No"}</td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            a.activo
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                              : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200"
                          }`}
                        >
                          {a.activo ? "Activa" : "Inactiva"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button onClick={() => abrirEdicion(a)} className="text-green-600 hover:text-green-800 dark:text-green-400">
                          <PencilIcon className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center text-gray-500">No hay acciones registradas</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
