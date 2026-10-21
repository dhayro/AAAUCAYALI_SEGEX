import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { useClickOutside } from "@/hooks/useClickOutside";
import { LogoutIcon, UserCircleIcon } from "@/icons";
import api from "@/utils/api";
import { nombreActual, perfilActual, usuarioActualId } from "@/utils/sesion";
import { Dropdown } from "../ui/dropdown/Dropdown";

const PERFIL_TEXTO: Record<string, string> = {
  admin: "Administrador",
  jefe: "Jefe",
  secretaria: "Secretaria",
  personal: "Personal",
};

const ITEM =
  "group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5";

export default function UserDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [datos, setDatos] = useState<{ cargo?: string | null; email?: string | null }>({});
  const ref = useRef<HTMLDivElement>(null);
  const nombre = nombreActual() || "Usuario";
  const perfil = PERFIL_TEXTO[perfilActual() ?? ""] ?? "";

  useClickOutside(ref, () => setIsOpen(false));

  useEffect(() => {
    const id = usuarioActualId();
    if (!id) return;
    api
      .get(`/usuarios/${id}`)
      .then((res) => setDatos({ cargo: res.data.cargo, email: res.data.email }))
      .catch(() => setDatos({}));
  }, []);

  const cerrarSesion = () => {
    localStorage.removeItem("token");
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="dropdown-toggle flex items-center gap-2 text-gray-700 dark:text-gray-400"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700 dark:bg-brand-900 dark:text-brand-200">
          {nombre.charAt(0).toUpperCase()}
        </span>
        <span className="hidden text-sm font-medium md:block">{nombre.split(" ")[0]}</span>
        <svg
          className={`stroke-gray-500 transition-transform duration-200 dark:stroke-gray-400 ${isOpen ? "rotate-180" : ""}`}
          width="18"
          height="20"
          viewBox="0 0 18 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M4.3125 8.65625L9 13.3437L13.6875 8.65625" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        className="absolute inset-e-0 mt-4 flex w-64 flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark"
      >
        <div className="px-3 pb-3">
          <span className="block text-sm font-semibold text-gray-800 dark:text-gray-100">{nombre}</span>
          {datos.cargo && <span className="mt-0.5 block text-xs font-medium text-gray-600 dark:text-gray-300">{datos.cargo}</span>}
          {perfil && <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">Perfil: {perfil}</span>}
          {datos.email && <span className="mt-0.5 block truncate text-xs text-gray-500 dark:text-gray-400">{datos.email}</span>}
        </div>

        <ul className="flex flex-col gap-1 border-t border-gray-200 pt-3 dark:border-gray-800">
          <li>
            <Link to="/profile" onClick={() => setIsOpen(false)} className={ITEM}>
              <UserCircleIcon className="h-5 w-5" />
              Mi perfil
            </Link>
          </li>
          <li>
            <Link to="/signin" onClick={cerrarSesion} className={`${ITEM} text-red-600 dark:text-red-400`}>
              <LogoutIcon className="h-5 w-5" />
              Cerrar sesión
            </Link>
          </li>
        </ul>
      </Dropdown>
    </div>
  );
}
