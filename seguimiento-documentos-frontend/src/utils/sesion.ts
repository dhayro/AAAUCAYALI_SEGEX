const PERFILES_GESTION = ["admin", "jefe", "secretaria"];

export const perfilActual = (): string | null => {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload.perfil ?? null;
  } catch {
    return null;
  }
};

export const puedeGestionarAsignaciones = (): boolean =>
  PERFILES_GESTION.includes(perfilActual() ?? "");
