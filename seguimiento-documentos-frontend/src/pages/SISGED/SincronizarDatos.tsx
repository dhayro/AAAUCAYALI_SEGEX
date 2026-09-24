import { useState } from 'react';
import { toast } from 'sonner';
import api from '../../utils/api';

export default function SincronizarDatos() {
  const [loading, setLoading] = useState(false);
  const [datos, setDatos] = useState<any[]>([]);
  const [resultado, setResultado] = useState<any>(null);

  const handleSincronizar = async () => {
    setLoading(true);
    try {
      const response = await api.post('/sisged/sincronizar');

      if (response.data.success) {
        setResultado(response.data.resultado);
        setDatos(response.data.datos || []);
        toast.success(`✅ Sincronización completada: ${response.data.resultado.exitosos} expedientes importados`);
      } else {
        toast.error(`❌ ${response.data.error}`);
      }
    } catch (error: any) {
      toast.error(`❌ Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h1 className="text-3xl font-bold mb-2">Sincronizar SISGED</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Obtén datos de SISGED automáticamente e importalos a tu sistema
        </p>

        <button
          onClick={handleSincronizar}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-8 rounded-lg mb-6 transition"
        >
          {loading ? '⏳ Sincronizando...' : '🔄 Sincronizar Ahora'}
        </button>

        {resultado && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg border border-blue-200 dark:border-blue-700">
            <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-3">📊 Resultado</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{resultado.exitosos}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Exitosos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{resultado.errores}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Errores</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{resultado.total}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total</div>
              </div>
            </div>
          </div>
        )}

        {datos.length > 0 && (
          <div>
            <h3 className="font-bold text-lg mb-4">📋 Primeros registros importados</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-700">
                    <th className="border p-2 text-left">CUT</th>
                    <th className="border p-2 text-left">Asunto</th>
                    <th className="border p-2 text-left">Remitente</th>
                    <th className="border p-2 text-left">Documento</th>
                    <th className="border p-2 text-left">Procedimiento</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="border p-2">{item.ncut || item.CUT || '-'}</td>
                      <td className="border p-2">{item.asunto || item.ASUNTO || '-'}</td>
                      <td className="border p-2">{(item.usurem || item.USUARIO || '').split('\n')[0]}</td>
                      <td className="border p-2">{item.ndoc || item.DOCUMENTO || '-'}</td>
                      <td className="border p-2">{item.proced || item.PROCEDIMIENTO || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && !resultado && (
          <div className="p-6 bg-yellow-50 dark:bg-yellow-900 rounded-lg border border-yellow-200 dark:border-yellow-700">
            <p className="text-yellow-800 dark:text-yellow-100">
              💡 Haz click en el botón para sincronizar datos de SISGED con tu sistema
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
