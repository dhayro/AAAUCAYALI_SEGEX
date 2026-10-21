import PageMeta from "@/components/common/PageMeta";
import MiDesempeno from "@/components/perfil/MiDesempeno";

export default function MiDesempenoPagina() {
  return (
    <>
      <PageMeta title="Mi desempeño | Sistema de Seguimiento" description="Tus asignaciones, llamadas, prórrogas y acciones" />
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Mi desempeño</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Tu trabajo en el sistema: asignaciones, llamadas, prórrogas y acciones</p>
        </div>
        <MiDesempeno />
      </div>
    </>
  );
}
