import { useState } from 'react';
import { toast } from 'sonner';
import api from '../../utils/api';

export default function SincronizarDatos() {
  const [loading, setLoading] = useState(false);
  const [jsonData, setJsonData] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    FEC_INICIO: '01/09/2026',
    FEC_FIN: '24/09/2026',
    USUARIO_REMITENTE: 'aliaga+romayna',
    ASUNTO: '',
    NRO_CUT: '',
    token: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDescargar = async () => {
    setLoading(true);
    try {
      const response = await api.post('/sisged/sincronizar');

      if (response.data.success) {
        setJsonData(response.data.data);
        toast.success(`✅ Datos obtenidos: ${response.data.total} registros`);
      } else {
        toast.error(`❌ ${response.data.error}`);
      }
    } catch (error: any) {
      toast.error(`❌ Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDescargarConParametros = async () => {
    setLoading(true);
    try {
      const params = {
        FEC_INICIO: formData.FEC_INICIO,
        FEC_FIN: formData.FEC_FIN,
        USUARIO_REMITENTE: formData.USUARIO_REMITENTE,
        ASUNTO: formData.ASUNTO,
        NRO_CUT: formData.NRO_CUT,
        ID_TIPO_DOCUMENTO: '0',
        ID_ESTADO_DOCUMENTO: '0',
        ID_OFICINA: '0',
        ID_USUARIO: '0',
        NRO_DOCUMENTO: '',
        CUT_MIDAGRI: '',
        NRO_TICKET: '',
        REFERENCIA: '',
        DESTINOS: '',
        ID_TUPA_REQUISITO: '0',
        ID_TUPA: '0',
        NRO_EXPEDIENTE: '',
        ID_TIPO_PERSONA: '0',
        NRO_DOC_PERSONA: '',
        FLG_BORRADOR: '0',
        FLG_ANEXO: '0'
      };

      const response = await api.post('/sisged/sincronizar-con-parametros', {
        params,
        token: formData.token || undefined
      });

      if (response.data.success) {
        setJsonData(response.data.data);
        toast.success(`✅ Parámetros actualizados en Postman + ${response.data.total} registros obtenidos`);
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
        <h1 className="text-3xl font-bold mb-2">Obtener Datos de SISGED</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Descarga JSON directo desde SISGED vía Postman API
        </p>

        <div className="flex gap-3 mb-6">
          <button
            onClick={handleDescargar}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-8 rounded-lg transition"
          >
            {loading ? '⏳ Descargando...' : '🔄 Descargar JSON'}
          </button>

          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-8 rounded-lg transition"
          >
            {showForm ? '❌ Cerrar Parámetros' : '⚙️ Editar Parámetros'}
          </button>
        </div>

        {showForm && (
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
            <h3 className="font-bold text-lg mb-4">📋 Parámetros de SISGED</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Fecha Inicio (dd/mm/aaaa)</label>
                <input
                  type="text"
                  name="FEC_INICIO"
                  value={formData.FEC_INICIO}
                  onChange={handleInputChange}
                  placeholder="01/09/2026"
                  className="w-full border rounded px-3 py-2 dark:bg-gray-600 dark:border-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Fecha Fin (dd/mm/aaaa)</label>
                <input
                  type="text"
                  name="FEC_FIN"
                  value={formData.FEC_FIN}
                  onChange={handleInputChange}
                  placeholder="24/09/2026"
                  className="w-full border rounded px-3 py-2 dark:bg-gray-600 dark:border-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Usuario Remitente</label>
                <input
                  type="text"
                  name="USUARIO_REMITENTE"
                  value={formData.USUARIO_REMITENTE}
                  onChange={handleInputChange}
                  placeholder="aliaga+romayna"
                  className="w-full border rounded px-3 py-2 dark:bg-gray-600 dark:border-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Asunto (opcional)</label>
                <input
                  type="text"
                  name="ASUNTO"
                  value={formData.ASUNTO}
                  onChange={handleInputChange}
                  placeholder="Búsqueda por asunto..."
                  className="w-full border rounded px-3 py-2 dark:bg-gray-600 dark:border-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">NRO CUT (opcional)</label>
                <input
                  type="text"
                  name="NRO_CUT"
                  value={formData.NRO_CUT}
                  onChange={handleInputChange}
                  placeholder="Número CUT..."
                  className="w-full border rounded px-3 py-2 dark:bg-gray-600 dark:border-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Bearer Token (opcional)</label>
                <input
                  type="password"
                  name="token"
                  value={formData.token}
                  onChange={handleInputChange}
                  placeholder="Nuevo token..."
                  className="w-full border rounded px-3 py-2 dark:bg-gray-600 dark:border-gray-500 text-sm"
                />
              </div>
            </div>

            <button
              onClick={handleDescargarConParametros}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition"
            >
              {loading ? '⏳ Actualizando Postman + Descargando...' : '✅ Actualizar Postman y Descargar'}
            </button>

            <p className="text-xs text-gray-600 dark:text-gray-400 mt-3">
              💡 Los cambios se guardarán en tu colección SISGED de Postman automáticamente
            </p>
          </div>
        )}

        {jsonData && (
          <div>
            <div className="mb-4 flex justify-between items-center">
              <h3 className="font-bold text-lg">📊 JSON Response</h3>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(jsonData, null, 2));
                  toast.success('✅ JSON copiado al portapapeles');
                }}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm"
              >
                📋 Copiar
              </button>
            </div>

            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto max-h-[600px] font-mono text-sm">
              <pre>{JSON.stringify(jsonData, null, 2)}</pre>
            </div>

            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              <p>📦 Total de registros: <span className="font-bold">{Array.isArray(jsonData) ? jsonData.length : 1}</span></p>
            </div>
          </div>
        )}

        {!loading && !jsonData && (
          <div className="p-6 bg-yellow-50 dark:bg-yellow-900 rounded-lg border border-yellow-200 dark:border-yellow-700">
            <p className="text-yellow-800 dark:text-yellow-100">
              💡 Haz click en "Descargar JSON" o edita parámetros y haz click en "Actualizar Postman y Descargar"
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
