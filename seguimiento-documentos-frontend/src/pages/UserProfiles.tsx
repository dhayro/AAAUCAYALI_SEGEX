import PageMeta from "@/components/common/PageMeta";
import { formatFecha } from "@/components/expedientes/format";
import api from "@/utils/api";
import { usuarioActualId } from "@/utils/sesion";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface PerfilUsuario {
  usuario: string;
  nombre: string;
  apellido: string;
  email?: string | null;
  dni?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  fecha_nacimiento?: string | null;
  perfil: string;
  cargo?: string | null;
  area?: string | null;
  estado: boolean;
}

const PERFIL_TEXTO: Record<string, string> = {
  admin: "Administrador",
  jefe: "Jefe",
  secretaria: "Secretaria",
  personal: "Personal",
};

const Dato = ({ titulo, valor }: { titulo: string; valor?: string | null }) => (
  <div>
    <div className="text-xs font-medium text-gray-500 dark:text-gray-400">{titulo}</div>
    <div className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{valor || "—"}</div>
  </div>
);

export default function UserProfiles() {
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [cargando, setCargando] = useState(true);
  const [clave, setClave] = useState({ actual: "", nueva: "", confirmar: "" });
  const [guardandoClave, setGuardandoClave] = useState(false);

  const reglas = [
    { texto: "Más de 6 caracteres", ok: clave.nueva.length >= 7 },
    { texto: "Al menos una mayúscula", ok: /[A-Z]/.test(clave.nueva) },
    { texto: "Al menos un número", ok: /\d/.test(clave.nueva) },
    { texto: "La confirmación coincide", ok: clave.nueva !== "" && clave.nueva === clave.confirmar },
  ];

  const cambiarPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clave.actual) return toast.error("Escriba su contraseña actual");
    if (!reglas.every((r) => r.ok)) return toast.error("La nueva contraseña no cumple los requisitos");
    setGuardandoClave(true);
    try {
      await api.patch("/usuarios/mi-password", clave);
      toast.success("Contraseña actualizada correctamente");
      setClave({ actual: "", nueva: "", confirmar: "" });
    } catch (error: any) {
      toast.error(error.response?.data?.mensaje || "No se pudo cambiar la contraseña");
    } finally {
      setGuardandoClave(false);
    }
  };

  useEffect(() => {
    const id = usuarioActualId();
    if (!id) {
      setCargando(false);
      return;
    }
    api
      .get(`/usuarios/${id}`)
      .then((res) => setPerfil(res.data))
      .catch(() => toast.error("No se pudo cargar tu perfil"))
      .finally(() => setCargando(false));
  }, []);

  return (
    <>
      <PageMeta title="Mi perfil | Sistema de Seguimiento" description="Datos de la cuenta" />
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Mi perfil</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Tus datos registrados en el sistema</p>
        </div>

        {cargando && <div className="p-12 text-center text-gray-500">Cargando perfil...</div>}

        {!cargando && !perfil && (
          <div className="rounded-lg bg-white p-12 text-center text-gray-500 shadow dark:bg-gray-800">
            No se pudo cargar tu perfil.
          </div>
        )}

        {perfil && (
          <>
            <section className="flex flex-col items-center gap-4 rounded-2xl bg-white p-6 shadow sm:flex-row sm:items-center dark:bg-gray-800">
              <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-brand-100 text-2xl font-bold text-brand-700 dark:bg-brand-900 dark:text-brand-200">
                {perfil.nombre.charAt(0)}
                {perfil.apellido.charAt(0)}
              </span>
              <div className="text-center sm:text-left">
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {perfil.nombre} {perfil.apellido}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{perfil.cargo || "Sin cargo"}</div>
                <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
                  <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-900 dark:text-brand-200">
                    {PERFIL_TEXTO[perfil.perfil] || perfil.perfil}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      perfil.estado
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                        : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
                    }`}
                  >
                    {perfil.estado ? "Activo" : "Inactivo"}
                  </span>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="rounded-2xl bg-white p-6 shadow dark:bg-gray-800">
                <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                  Datos personales
                </h2>
                <div className="grid grid-cols-2 gap-5">
                  <Dato titulo="DNI" valor={perfil.dni} />
                  <Dato titulo="Fecha de nacimiento" valor={formatFecha(perfil.fecha_nacimiento)} />
                  <Dato titulo="Teléfono" valor={perfil.telefono} />
                  <Dato titulo="Correo" valor={perfil.email} />
                  <div className="col-span-2">
                    <Dato titulo="Dirección" valor={perfil.direccion} />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-white p-6 shadow dark:bg-gray-800">
                <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                  Datos laborales
                </h2>
                <div className="grid grid-cols-2 gap-5">
                  <Dato titulo="Cargo" valor={perfil.cargo} />
                  <Dato titulo="Área" valor={perfil.area} />
                  <Dato titulo="Perfil en el sistema" valor={PERFIL_TEXTO[perfil.perfil] || perfil.perfil} />
                  <Dato titulo="Usuario" valor={perfil.usuario} />
                </div>
              </div>
            </section>
          </>
        )}

        <section className="rounded-2xl bg-white p-6 shadow dark:bg-gray-800">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
            Cambiar contraseña
          </h2>
          <form onSubmit={cambiarPassword} className="grid max-w-xl gap-4">
            <input
              type="password"
              placeholder="Contraseña actual"
              value={clave.actual}
              onChange={(e) => setClave({ ...clave, actual: e.target.value })}
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            <input
              type="password"
              placeholder="Nueva contraseña"
              value={clave.nueva}
              onChange={(e) => setClave({ ...clave, nueva: e.target.value })}
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            <input
              type="password"
              placeholder="Confirmar nueva contraseña"
              value={clave.confirmar}
              onChange={(e) => setClave({ ...clave, confirmar: e.target.value })}
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            <ul className="space-y-1 text-xs">
              {reglas.map((r) => (
                <li key={r.texto} className={r.ok ? "font-medium text-green-700 dark:text-green-300" : "text-gray-500 dark:text-gray-400"}>
                  {r.ok ? "✓" : "○"} {r.texto}
                </li>
              ))}
            </ul>
            <div>
              <button
                type="submit"
                disabled={guardandoClave}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {guardandoClave ? "Guardando..." : "Guardar contraseña"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </>
  );
}
