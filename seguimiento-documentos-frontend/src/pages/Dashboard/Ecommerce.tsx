import PageMeta from "@/components/common/PageMeta";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { getExpedientes, getAsignaciones, getAsignacionesConProrrogaPendiente, getRespuestas } from "@/utils/api";
import { FileIcon, FolderIcon } from "@/icons";

interface DashboardStats {
  expedientesActivos: number;
  documentosAsignados: number;
  documentosProrroga: number;
  documentosRespuestas: number;
}

export default function Ecommerce() {
  const [stats, setStats] = useState<DashboardStats>({
    expedientesActivos: 0,
    documentosAsignados: 0,
    documentosProrroga: 0,
    documentosRespuestas: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const [expRes, asignRes, prorrogaRes, respuestasRes] = await Promise.all([
        getExpedientes(),
        getAsignaciones(),
        getAsignacionesConProrrogaPendiente(),
        getRespuestas(),
      ]);

      const expedientesCount = expRes.data.totalExpedientes || 0;
      const asignacionesCount = asignRes.data.totalAsignaciones || 0;
      const prorrogasCount = prorrogaRes.data.totalAsignaciones || 0;
      const respuestasCount = respuestasRes.data.totalRespuestas || 0;

      setStats({
        expedientesActivos: expedientesCount,
        documentosAsignados: asignacionesCount,
        documentosProrroga: prorrogasCount,
        documentosRespuestas: respuestasCount,
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      toast.error("Error al cargar estadísticas");
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({
    title,
    value,
    icon,
    color,
  }: {
    title: string;
    value: number;
    icon: React.ReactNode;
    color: string;
  }) => (
    <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {loading ? "..." : value}
          </p>
        </div>
        <div className={`rounded-lg ${color} p-4 text-white`}>
          {icon}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <PageMeta
        title="Dashboard | Sistema de Seguimiento"
        description="Panel de control del sistema de seguimiento de documentos"
      />
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Resumen general del sistema
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Expedientes Activos"
            value={stats.expedientesActivos}
            icon={<FolderIcon className="h-8 w-8" />}
            color="bg-blue-600"
          />
          <StatCard
            title="Documentos Asignados"
            value={stats.documentosAsignados}
            icon={<FileIcon className="h-8 w-8" />}
            color="bg-green-600"
          />
          <StatCard
            title="Documentos con Prórrogas"
            value={stats.documentosProrroga}
            icon={<FileIcon className="h-8 w-8" />}
            color="bg-orange-600"
          />
          <StatCard
            title="Documentos con Respuestas"
            value={stats.documentosRespuestas}
            icon={<FileIcon className="h-8 w-8" />}
            color="bg-purple-600"
          />
        </div>

        {/* Welcome Section */}
        <div className="rounded-lg bg-gradient-to-r from-blue-600 to-blue-800 p-8 text-white shadow-lg">
          <h2 className="text-2xl font-bold">Bienvenido al Sistema</h2>
          <p className="mt-2 text-blue-100">
            Aquí puedes gestionar documentos, expedientes, usuarios y áreas de forma centralizada.
          </p>
          <div className="mt-4 flex gap-4">
            <a
              href="/documentos"
              className="inline-block rounded bg-white px-6 py-2 font-semibold text-blue-600 hover:bg-blue-50"
            >
              Ver Documentos
            </a>
            <a
              href="/expedientes"
              className="inline-block rounded border-2 border-white px-6 py-2 font-semibold hover:bg-blue-700"
            >
              Ver Expedientes
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
