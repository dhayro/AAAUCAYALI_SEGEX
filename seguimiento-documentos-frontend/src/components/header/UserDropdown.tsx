import { useEffect, useState } from "react";
import api from "@/utils/api";
import { nombreActual, usuarioActualId } from "@/utils/sesion";

export default function UserDropdown() {
  const [cargo, setCargo] = useState<string | null>(null);
  const nombre = nombreActual() || "Usuario";

  useEffect(() => {
    const id = usuarioActualId();
    if (!id) return;
    api
      .get(`/usuarios/${id}`)
      .then((res) => setCargo(res.data.cargo ?? null))
      .catch(() => setCargo(null));
  }, []);

  return (
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700 dark:bg-brand-900 dark:text-brand-200">
        {nombre.charAt(0).toUpperCase()}
      </span>
      <div className="min-w-0 leading-tight">
        <div className="truncate text-sm font-semibold text-gray-800 dark:text-gray-100">{nombre}</div>
        {cargo && <div className="truncate text-xs text-gray-500 dark:text-gray-400">{cargo}</div>}
      </div>
    </div>
  );
}
