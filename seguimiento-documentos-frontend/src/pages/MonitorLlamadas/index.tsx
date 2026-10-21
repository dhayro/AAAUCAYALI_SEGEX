import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import PageMeta from "@/components/common/PageMeta";
import { estadoPlazo, fechaLegible } from "@/components/atencion/plazo";
import DetalleLlamadaModal from "@/components/atencion/DetalleLlamadaModal";
import SearchableSelect from "@/components/form/SearchableSelect";
import { formatFechaHora } from "@/components/expedientes/format";
import { SearchIcon } from "@/icons";
import api from "@/utils/api";
import { colorUsuario } from "@/utils/colorUsuario";

interface LlamadaMonitor {
  id: number;
  cut: string;
  nombre_llamante: string;
  telefono?: string | null;
  motivo: string;
  fecha_llamada: string;
  fecha_respuesta: string | null;
  dias: number | null;
  responsable?: { id: number; nombre: string; apellido: string } | null;
  acciones_pendientes: number;
  total_del_cut: number;
}

interface ResumenMonitor {
  total: number;
  vencidas: number;
  por_vencer: number;
  sin_plazo: number;
}

interface UsuarioOpcion {
  id: number;
  nombre: string;
  usuario: string;
  cargo?: string | null;
}

const etiquetaUsuario = (u: UsuarioOpcion) => (u.cargo ? `${u.nombre} (${u.cargo})` : u.nombre);

const INTERVALO_MS = 10000;
const DURACION_NUEVA_MS = 120000;

const bordeDe = (dias: number | null) => {
  if (dias === null) return "border-gray-400";
  if (dias < 0) return "border-red-500";
  if (dias <= 5) return "border-amber-500";
  return "border-green-500";
};

const iniciales = (u: { nombre: string; apellido: string }) => `${u.nombre.charAt(0)}${u.apellido.charAt(0)}`.toUpperCase();

const horaLima = (fecha: Date) =>
  fecha.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "America/Lima" });

// Dos tonos ascendentes generados en el navegador (no requiere archivo de audio).
const sonarAviso = (ctx: AudioContext) => {
  [880, 1175].forEach((frecuencia, i) => {
    const oscilador = ctx.createOscillator();
    const ganancia = ctx.createGain();
    const inicio = ctx.currentTime + i * 0.25;
    oscilador.type = "sine";
    oscilador.frequency.value = frecuencia;
    ganancia.gain.setValueAtTime(0.0001, inicio);
    ganancia.gain.exponentialRampToValueAtTime(0.3, inicio + 0.02);
    ganancia.gain.exponentialRampToValueAtTime(0.0001, inicio + 0.4);
    oscilador.connect(ganancia).connect(ctx.destination);
    oscilador.start(inicio);
    oscilador.stop(inicio + 0.45);
  });
};

const TONOS = {
  rojo: "text-red-600 dark:text-red-400",
  ambar: "text-amber-600 dark:text-amber-400",
  gris: "text-gray-600 dark:text-gray-300",
  neutro: "text-gray-900 dark:text-white",
} as const;

function Indicador({ titulo, valor, tono }: { titulo: string; valor: number; tono: keyof typeof TONOS }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700 md:p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{titulo}</div>
      <div className={`mt-1 text-3xl font-bold md:text-4xl ${TONOS[tono]}`}>{valor}</div>
    </div>
  );
}

function TarjetaLlamada({
  llamada: l,
  nueva,
  onAbrir,
}: {
  llamada: LlamadaMonitor;
  nueva: boolean;
  onAbrir: () => void;
}) {
  const estado = estadoPlazo(false, l.fecha_respuesta);
  const color = colorUsuario(l.responsable?.id);
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onAbrir}
      onKeyDown={(e) => e.key === "Enter" && onAbrir()}
      className={`cursor-pointer rounded-2xl border-l-8 bg-white p-5 shadow transition hover:shadow-lg ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700 ${bordeDe(l.dias)} ${
        nueva ? "animate-pulse ring-4 ring-brand-500" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">CUT</div>
          <div className="truncate text-2xl font-bold text-gray-900 dark:text-white">{l.cut}</div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {l.total_del_cut > 1 && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 dark:bg-amber-900 dark:text-amber-100">
              {l.total_del_cut} llamadas por este CUT
            </span>
          )}
          {nueva && <span className="rounded-full bg-brand-600 px-3 py-1 text-xs font-bold text-white">Nueva</span>}
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${estado.clases}`}>{estado.texto}</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Fecha límite</div>
          <div className="font-semibold text-gray-900 dark:text-white">{fechaLegible(l.fecha_respuesta)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Acciones pendientes</div>
          <div className="font-semibold text-gray-900 dark:text-white">{l.acciones_pendientes}</div>
        </div>
      </div>

      <div className="mt-4 text-sm">
        <div className="font-semibold text-gray-900 dark:text-white">{l.nombre_llamante}</div>
        <div className="text-gray-500 dark:text-gray-400">{l.telefono || "Sin teléfono"}</div>
        <p className="mt-2 line-clamp-2 text-gray-700 dark:text-gray-300">{l.motivo}</p>
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">Llamó: {formatFechaHora(l.fecha_llamada)}</div>
      </div>

      <div className="mt-4 flex items-center gap-2 border-t pt-3 text-sm dark:border-gray-700">
        {l.responsable ? (
          <>
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${color.etiqueta}`}
            >
              {iniciales(l.responsable)}
            </span>
            <span className="text-gray-900 dark:text-white">
              {l.responsable.nombre} {l.responsable.apellido}
            </span>
          </>
        ) : (
          <span className="text-gray-500 dark:text-gray-400">Sin responsable</span>
        )}
      </div>
    </article>
  );
}

export default function MonitorLlamadas() {
  const [llamadas, setLlamadas] = useState<LlamadaMonitor[]>([]);
  const [resumen, setResumen] = useState<ResumenMonitor | null>(null);
  const [cargando, setCargando] = useState(true);
  const [actualizado, setActualizado] = useState<Date | null>(null);
  const [sonidoListo, setSonidoListo] = useState(false);
  // id de llamada -> momento en que apareció (para marcarla como nueva un rato)
  const [nuevas, setNuevas] = useState<Record<number, number>>({});
  const [detalleId, setDetalleId] = useState<number | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [busquedaAplicada, setBusquedaAplicada] = useState("");
  const [responsable, setResponsable] = useState<number | "">("");
  const [responsableNombre, setResponsableNombre] = useState("");
  const [usuarios, setUsuarios] = useState<UsuarioOpcion[]>([]);

  const ctxRef = useRef<AudioContext | null>(null);
  const idsConocidos = useRef<Set<number> | null>(null);
  const filtroActual = useRef("");

  const fetchUsuarios = useCallback(async (filtro = "") => {
    try {
      const params: Record<string, string | number> = { limit: 10 };
      if (filtro) params.filtro = filtro;
      const res = await api.get("/usuarios/select", { params });
      setUsuarios(Array.isArray(res.data) ? res.data : []);
    } catch {
      setUsuarios([]);
    }
  }, []);

  useEffect(() => {
    fetchUsuarios();
  }, [fetchUsuarios]);

  // Espera a que el usuario deje de escribir antes de consultar.
  useEffect(() => {
    const espera = setTimeout(() => setBusquedaAplicada(busqueda.trim()), 400);
    return () => clearTimeout(espera);
  }, [busqueda]);

  const cargar = useCallback(async () => {
    try {
      const clave = `${busquedaAplicada}|${responsable}`;
      if (filtroActual.current !== clave) {
        // Al cambiar el filtro la lista cambia por completo: no se avisa como llamadas nuevas.
        filtroActual.current = clave;
        idsConocidos.current = null;
      }

      const params: Record<string, string> = {};
      if (busquedaAplicada) params.q = busquedaAplicada;
      if (responsable !== "") params.responsable = String(responsable);
      const res = await api.get("/dashboard/monitor-llamadas", { params });
      const lista: LlamadaMonitor[] = res.data.llamadas || [];
      const ids = new Set(lista.map((l) => l.id));

      // La primera carga no avisa; después, solo lo que no estaba antes.
      if (idsConocidos.current) {
        const entrantes = lista.filter((l) => !idsConocidos.current!.has(l.id));
        if (entrantes.length > 0) {
          const ahora = Date.now();
          setNuevas((prev) => ({ ...prev, ...Object.fromEntries(entrantes.map((l) => [l.id, ahora])) }));
          toast(`Entraron ${entrantes.length} llamada${entrantes.length === 1 ? "" : "s"} nueva${entrantes.length === 1 ? "" : "s"}`);
          if (ctxRef.current) sonarAviso(ctxRef.current);
        }
      }
      idsConocidos.current = ids;

      setLlamadas(lista);
      setResumen(res.data.resumen);
      setActualizado(new Date());
    } catch {
      toast.error("No se pudo actualizar el monitor");
    } finally {
      setCargando(false);
    }
  }, [busquedaAplicada, responsable]);

  useEffect(() => {
    cargar();
    const intervalo = setInterval(cargar, INTERVALO_MS);
    return () => clearInterval(intervalo);
  }, [cargar]);

  // El navegador solo deja sonar después de un gesto del usuario: el primer clic o tecla en la página lo activa.
  useEffect(() => {
    const desbloquear = () => {
      if (!ctxRef.current || ctxRef.current.state === "closed") ctxRef.current = new AudioContext();
      ctxRef.current.resume().then(() => setSonidoListo(true));
    };
    window.addEventListener("pointerdown", desbloquear, { once: true });
    window.addEventListener("keydown", desbloquear, { once: true });
    return () => {
      window.removeEventListener("pointerdown", desbloquear);
      window.removeEventListener("keydown", desbloquear);
      ctxRef.current?.close();
      ctxRef.current = null;
    };
  }, []);

  const filtrando = busquedaAplicada !== "" || responsable !== "";
  const ahora = Date.now();

  return (
    <>
      <PageMeta title="Monitor de llamadas | Sistema de Seguimiento" description="Llamadas sin respuesta por fecha límite" />
      <div className="min-h-screen bg-gray-100 p-4 dark:bg-gray-900 md:p-6">
        <div className="sticky top-0 z-30 -mx-4 mb-4 bg-gray-100/95 px-4 pb-3 pt-1 shadow-sm backdrop-blur dark:bg-gray-900/95 md:-mx-6 md:px-6">
        <header className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white md:text-3xl">Monitor de llamadas sin respuesta</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Ordenadas por fecha límite · se actualiza cada 10 segundos
              {actualizado && ` · última actualización ${horaLima(actualizado)}`}
              {!sonidoListo && " · haz clic en la pantalla para activar el aviso sonoro"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={cargar}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Actualizar
            </button>
            <Link
              to="/llamadas"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            >
              Control de llamadas
            </Link>
          </div>
        </header>

        <section className="mb-3 flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por CUT o por quien llamó"
              className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-10 pr-3 text-base shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2 md:w-96">
            <div className="flex-1">
              <SearchableSelect
                value={responsable}
                onChange={(valor) => {
                  const id = Number(valor);
                  const u = usuarios.find((x) => x.id === id);
                  setResponsable(id);
                  setResponsableNombre(u ? etiquetaUsuario(u) : "");
                }}
                options={usuarios.map((u) => ({ id: u.id, nombre: etiquetaUsuario(u) }))}
                onSearch={(termino) => fetchUsuarios(termino)}
                placeholder="Atiende: todos · buscar persona"
                selectedLabel={responsableNombre}
              />
            </div>
            {responsable !== "" && (
              <button
                onClick={() => {
                  setResponsable("");
                  setResponsableNombre("");
                }}
                className="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
              >
                Quitar
              </button>
            )}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Indicador titulo="Vencidas" valor={resumen?.vencidas ?? 0} tono="rojo" />
          <Indicador titulo="Por vencer (5 días)" valor={resumen?.por_vencer ?? 0} tono="ambar" />
          <Indicador titulo="Sin plazo" valor={resumen?.sin_plazo ?? 0} tono="gris" />
          <Indicador titulo="Total sin respuesta" valor={resumen?.total ?? 0} tono="neutro" />
        </section>
        </div>

        {cargando && <p className="p-10 text-center text-gray-500">Cargando llamadas...</p>}

        {!cargando && llamadas.length === 0 && (
          <div className="rounded-2xl bg-white p-12 text-center text-lg font-semibold text-green-700 shadow dark:bg-gray-800 dark:text-green-300">
            {filtrando ? "Ninguna llamada sin respuesta coincide con la búsqueda." : "No hay llamadas sin respuesta."}
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {llamadas.map((l) => (
            <TarjetaLlamada
              key={l.id}
              llamada={l}
              nueva={nuevas[l.id] !== undefined && ahora - nuevas[l.id] < DURACION_NUEVA_MS}
              onAbrir={() => setDetalleId(l.id)}
            />
          ))}
        </section>

        {detalleId !== null && (
          <DetalleLlamadaModal llamadaId={detalleId} soloLectura onClose={() => setDetalleId(null)} onCambio={cargar} />
        )}
      </div>
    </>
  );
}
