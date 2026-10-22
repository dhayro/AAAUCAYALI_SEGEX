import { useEffect } from "react";

// Minutos sin actividad (mouse, teclado, scroll o toque) antes de cerrar la sesión.
const MINUTOS_INACTIVIDAD = 60;
const EVENTOS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"] as const;

// Cierra la sesión cuando el usuario deja de usar el sistema por el tiempo indicado.
export const useInactividad = () => {
  useEffect(() => {
    let temporizador: ReturnType<typeof setTimeout>;

    const cerrarSesion = () => {
      localStorage.removeItem("token");
      window.location.href = "/signin";
    };

    const reiniciar = () => {
      clearTimeout(temporizador);
      temporizador = setTimeout(cerrarSesion, MINUTOS_INACTIVIDAD * 60 * 1000);
    };

    EVENTOS.forEach((evento) => window.addEventListener(evento, reiniciar, { passive: true }));
    reiniciar();

    return () => {
      clearTimeout(temporizador);
      EVENTOS.forEach((evento) => window.removeEventListener(evento, reiniciar));
    };
  }, []);
};
