import PageMeta from "@/components/common/PageMeta";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import api from "@/utils/api";
import { DownloadIcon } from "@/icons";
import { formatDate } from "@/utils/dateUtils";
import * as XLSX from "xlsx";

interface RespuestaReporte {
  id: number;
  numero_documento: string;
  usuario_responsable: string;
  fecha_asignacion: string;
  fecha_vencimiento: string;
  fecha_respuesta?: string;
  dias_a_responder?: number;
  estado: string;
  descripcion_respuesta?: string;
}

export default function ReporteDocumentosRespuestas() {
  const [respuestas, setRespuestas] = useState<RespuestaReporte[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    respondidos: 0,
    pendientes: 0,
    terminados: 0,
    promedio_dias: 0,
  });

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 25,
  });

  const [filters, setFilters] = useState({
    filtro: "",
    estado: "",
    fecha_desde: "",
    fecha_hasta: "",
  });

  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchRespuestas();
  }, [pagination, filters]);

  const fetchRespuestas = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
      };

      if (filters.filtro) params.filtro = filters.filtro;
      if (filters.estado) params.estado = filters.estado;
      if (filters.fecha_desde) params.fecha_desde = filters.fecha_desde;
      if (filters.fecha_hasta) params.fecha_hasta = filters.fecha_hasta;

      const response = await api.get("/reportes/respuestas", { params });
      setRespuestas(
        Array.isArray(response.data) ? response.data : response.data.respuestas || []
      );
      setTotalCount(response.data.totalRespuestas || response.data.length);

      // Calcular estadísticas
      if (response.data.estadisticas) {
        setStats(response.data.estadisticas);
      }
    } catch (error) {
      console.error("Error fetching respuestas:", error);
      toast.error("Error al cargar reporte de respuestas");
    } finally {
      setLoading(false);
    }
  }, [pagination, filters]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPagination({ pageIndex: 0, pageSize: 25 });
  };

  const handleExportExcel = () => {
    try {
      const dataToExport = respuestas.map((r, idx) => ({
        "#": pagination.pageIndex * pagination.pageSize + idx + 1,
        "Documento": r.numero_documento,
        "Usuario Responsable": r.usuario_responsable,
        "Fecha Asignación": formatDate(r.fecha_asignacion),
        "Fecha Vencimiento": formatDate(r.fecha_vencimiento),
        "Fecha Respuesta": r.fecha_respuesta ? formatDate(r.fecha_respuesta) : "—",
        "Días Utilizados": r.dias_a_responder || "—",
        "Estado": r.estado,
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Respuestas");

      // Agregar hoja de estadísticas
      const statsData = [
        ["Estadísticas del Reporte"],
        [""],
        ["Total de Asignaciones", stats.total],
        ["Respondidas", stats.respondidos],
        ["Pendientes", stats.pendientes],
        ["Terminadas", stats.terminados],
        ["Promedio de Días para Responder", stats.promedio_dias.toFixed(2)],
      ];

      const statsSheet = XLSX.utils.aoa_to_sheet(statsData);
      XLSX.utils.book_append_sheet(workbook, statsSheet, "Estadísticas");

      const colWidths = [{ wch: 4 }, { wch: 15 }, { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 15 }, { wch: 15 }];
      worksheet["!cols"] = colWidths;

      XLSX.writeFile(workbook, `Reporte-Respuestas-${new Date().toISOString().split("T")[0]}.xlsx`);
      toast.success("Reporte exportado correctamente");
    } catch (error) {
      console.error("Error exporting Excel:", error);
      toast.error("Error al exportar reporte");
    }
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "terminado":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
      case "respondido":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100";
      case "pendiente":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100";
      case "vencido":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100";
    }
  };

  const StatCard = ({ label, value, color }: { label: string; value: number | string; color: string }) => (
    <div className={`rounded-lg ${color} p-4`}>
      <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  );

  return (
    <>
      <PageMeta
        title="Reporte de Respuestas | Sistema de Seguimiento"
        description="Reporte detallado de respuestas recibidas"
      />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Reporte de Respuestas
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Análisis detallado de respuestas recibidas a documentos
            </p>
          </div>
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
          >
            <DownloadIcon className="h-5 w-5" />
            Exportar Excel
          </button>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Total" value={stats.total} color="bg-blue-50 dark:bg-blue-900/20" />
          <StatCard label="Respondidas" value={stats.respondidos} color="bg-green-50 dark:bg-green-900/20" />
          <StatCard label="Pendientes" value={stats.pendientes} color="bg-yellow-50 dark:bg-yellow-900/20" />
          <StatCard label="Terminadas" value={stats.terminados} color="bg-purple-50 dark:bg-purple-900/20" />
          <StatCard label="Promedio Días" value={stats.promedio_dias.toFixed(1)} color="bg-orange-50 dark:bg-orange-900/20" />
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-1 gap-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-800 md:grid-cols-3 lg:grid-cols-5">
          <div>
            <Label>Buscar</Label>
            <Input
              name="filtro"
              value={filters.filtro}
              onChange={handleFilterChange}
              placeholder="Documento o usuario..."
            />
          </div>
          <div>
            <Label>Estado</Label>
            <select
              name="estado"
              value={filters.estado}
              onChange={handleFilterChange}
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-700"
            >
              <option value="">Todos</option>
              <option value="pendiente">Pendiente</option>
              <option value="respondido">Respondido</option>
              <option value="terminado">Terminado</option>
              <option value="vencido">Vencido</option>
            </select>
          </div>
          <div>
            <Label>Desde</Label>
            <Input
              type="date"
              name="fecha_desde"
              value={filters.fecha_desde}
              onChange={handleFilterChange}
            />
          </div>
          <div>
            <Label>Hasta</Label>
            <Input
              type="date"
              name="fecha_hasta"
              value={filters.fecha_hasta}
              onChange={handleFilterChange}
            />
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center text-gray-500">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                <p className="mt-4">Cargando reporte...</p>
              </div>
            ) : respuestas.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50 dark:bg-gray-700">
                    <th className="px-6 py-4 text-start text-sm font-semibold">#</th>
                    <th className="px-6 py-4 text-start text-sm font-semibold">Documento</th>
                    <th className="px-6 py-4 text-start text-sm font-semibold">Usuario</th>
                    <th className="px-6 py-4 text-start text-sm font-semibold">Asignación</th>
                    <th className="px-6 py-4 text-start text-sm font-semibold">Vencimiento</th>
                    <th className="px-6 py-4 text-start text-sm font-semibold">Respuesta</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Días</th>
                    <th className="px-6 py-4 text-start text-sm font-semibold">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {respuestas.map((respuesta, index) => (
                    <tr
                      key={respuesta.id}
                      className="border-b hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <td className="px-6 py-4 text-sm">
                        {pagination.pageIndex * pagination.pageSize + index + 1}
                      </td>
                      <td className="px-6 py-4 font-medium">{respuesta.numero_documento}</td>
                      <td className="px-6 py-4 text-sm">{respuesta.usuario_responsable}</td>
                      <td className="px-6 py-4 text-sm">
                        {formatDate(respuesta.fecha_asignacion)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {formatDate(respuesta.fecha_vencimiento)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {respuesta.fecha_respuesta
                          ? formatDate(respuesta.fecha_respuesta)
                          : "—"}
                      </td>
                      <td className="px-6 py-4 text-center text-sm font-medium">
                        {respuesta.dias_a_responder || "—"}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getEstadoBadge(respuesta.estado)}`}>
                          {respuesta.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center text-gray-500">
                No hay respuestas disponibles
              </div>
            )}
          </div>

          {/* Paginación */}
          {respuestas.length > 0 && (
            <div className="flex items-center justify-between border-t bg-gray-50 px-6 py-4 dark:border-gray-700 dark:bg-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Mostrando {pagination.pageIndex * pagination.pageSize + 1}-
                {Math.min(
                  (pagination.pageIndex + 1) * pagination.pageSize,
                  totalCount
                )}{" "}
                de {totalCount}
              </div>

              <div className="flex items-center gap-4">
                <select
                  value={pagination.pageSize}
                  onChange={(e) =>
                    setPagination({
                      pageIndex: 0,
                      pageSize: Number(e.target.value),
                    })
                  }
                  className="rounded border border-gray-300 bg-white px-3 py-1 text-sm dark:border-gray-600 dark:bg-gray-700"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>

                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setPagination((p) => ({
                        ...p,
                        pageIndex: Math.max(0, p.pageIndex - 1),
                      }))
                    }
                    disabled={pagination.pageIndex === 0}
                    className="rounded border border-gray-300 px-3 py-1 text-sm disabled:opacity-50"
                  >
                    ← Anterior
                  </button>
                  <button
                    onClick={() =>
                      setPagination((p) => ({ ...p, pageIndex: p.pageIndex + 1 }))
                    }
                    disabled={
                      (pagination.pageIndex + 1) * pagination.pageSize >=
                      totalCount
                    }
                    className="rounded border border-gray-300 px-3 py-1 text-sm disabled:opacity-50"
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
