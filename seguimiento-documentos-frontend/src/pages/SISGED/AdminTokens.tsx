import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import api from '../../utils/api';

export default function AdminTokens() {
  const [tokens, setTokens] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    token: '',
    fecha_vencimiento: '',
    dias_validez: '30',
    notas: ''
  });

  // Decodificar JWT para extraer fecha de vencimiento
  const decodificarJWT = (token: string) => {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        toast.error('❌ Token inválido (no es un JWT válido)');
        return null;
      }

      // Decodificar el payload (segunda parte del JWT)
      const payload = JSON.parse(atob(parts[1]));

      if (!payload.exp) {
        toast.error('❌ El token no tiene información de expiración');
        return null;
      }

      // Convertir timestamp de segundos a milisegundos
      const fechaVencimiento = new Date(payload.exp * 1000);
      const fechaFormato = fechaVencimiento.toISOString().split('T')[0];

      return { fechaVencimiento: fechaFormato, diasValidez: payload.exp };
    } catch (error) {
      toast.error('❌ Error al decodificar el token');
      return null;
    }
  };

  useEffect(() => {
    cargarTokens();
  }, []);

  const cargarTokens = async () => {
    setLoading(true);
    try {
      const response = await api.get('/sisged/tokens/historial');
      if (response.data.success) {
        setTokens(response.data.data);
      }
    } catch (error: any) {
      toast.error(`❌ Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAgregarToken = async () => {
    if (!formData.token.trim()) {
      toast.error('❌ El token es requerido');
      return;
    }
    if (!formData.fecha_vencimiento) {
      toast.error('❌ No se pudo extraer la fecha de vencimiento del token. Verifica que sea válido');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/sisged/tokens/agregar', {
        token: formData.token,
        fecha_vencimiento: formData.fecha_vencimiento,
        dias_validez: parseInt(formData.dias_validez),
        notas: formData.notas || 'Token agregado manualmente'
      });

      if (response.data.success) {
        toast.success('✅ Token agregado correctamente');
        setFormData({ token: '', fecha_vencimiento: '', dias_validez: '30', notas: '' });
        setShowForm(false);
        cargarTokens();
      }
    } catch (error: any) {
      toast.error(`❌ Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDesactivarToken = async (id: number) => {
    if (!confirm('¿Desactivar este token?')) return;

    try {
      const response = await api.post(`/sisged/tokens/${id}/desactivar`);
      if (response.data.success) {
        toast.success('✅ Token desactivado');
        cargarTokens();
      }
    } catch (error: any) {
      toast.error(`❌ Error: ${error.response?.data?.error || error.message}`);
    }
  };

  const diasRestantes = (fechaVencimiento: string) => {
    const hoy = new Date();
    const vencimiento = new Date(fechaVencimiento);
    const diff = vencimiento.getTime() - hoy.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="container mx-auto p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h1 className="text-3xl font-bold mb-2">🔐 Administración de Tokens SISGED</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Gestiona los tokens de autenticación para SISGED. El sistema usará el token más reciente y vigente.
        </p>

        <div className="flex gap-3 mb-6">
          <button
            onClick={cargarTokens}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-8 rounded-lg transition"
          >
            {loading ? '⏳ Recargando...' : '🔄 Recargar'}
          </button>

          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg transition"
          >
            {showForm ? '❌ Cerrar' : '➕ Agregar Token'}
          </button>
        </div>

        {showForm && (
          <div className="mb-6 p-6 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
            <h2 className="text-xl font-bold mb-4">Nuevo Token SISGED</h2>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">🔑 Token (JWT Bearer)</label>
                <textarea
                  value={formData.token}
                  onChange={(e) => {
                    const token = e.target.value;
                    setFormData({ ...formData, token });

                    // Auto-detectar fecha de vencimiento
                    if (token.trim()) {
                      const decoded = decodificarJWT(token);
                      if (decoded) {
                        setFormData(prev => ({
                          ...prev,
                          fecha_vencimiento: decoded.fechaVencimiento,
                          dias_validez: '30'
                        }));
                      }
                    }
                  }}
                  placeholder="Pega tu Bearer token aquí (se detectará automáticamente la fecha de vencimiento)..."
                  className="w-full border rounded px-4 py-3 dark:bg-gray-600 dark:border-gray-500 font-mono text-sm"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">📅 Fecha Vencimiento (Auto-detectada)</label>
                  <input
                    type="date"
                    value={formData.fecha_vencimiento}
                    onChange={(e) => setFormData({ ...formData, fecha_vencimiento: e.target.value })}
                    disabled
                    className="w-full border rounded px-4 py-2 dark:bg-gray-600 dark:border-gray-500 bg-gray-100 dark:bg-gray-700 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">Se detecta automáticamente del token</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">📝 Notas</label>
                <input
                  type="text"
                  value={formData.notas}
                  onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                  placeholder="ej: Token del usuario X, renovado el 25/09/2026"
                  className="w-full border rounded px-4 py-2 dark:bg-gray-600 dark:border-gray-500 text-sm"
                />
              </div>
            </div>

            <button
              onClick={handleAgregarToken}
              disabled={loading}
              className="w-full mt-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition"
            >
              {loading ? '⏳ Guardando...' : '✅ Guardar Token'}
            </button>
          </div>
        )}

        {/* Tokens Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-700 border-b-2">
                <th className="p-3 text-left font-bold">ID</th>
                <th className="p-3 text-center font-bold">Estado</th>
                <th className="p-3 text-center font-bold">Fecha Vencimiento</th>
                <th className="p-3 text-center font-bold">Días Restantes</th>
                <th className="p-3 text-center font-bold">Días Validez</th>
                <th className="p-3 text-left font-bold">Notas</th>
                <th className="p-3 text-center font-bold">Creado</th>
                <th className="p-3 text-center font-bold">Acción</th>
              </tr>
            </thead>
            <tbody>
              {tokens.map((token: any, idx: number) => {
                const diasRest = diasRestantes(token.fecha_vencimiento);
                const isVigente = diasRest > 0;

                return (
                  <tr key={idx} className="border-b hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="p-3 font-bold text-blue-600">{token.id}</td>
                    <td className="p-3 text-center">
                      <span className={`px-3 py-1 rounded text-xs font-bold ${
                        token.activo
                          ? isVigente
                            ? 'bg-green-100 text-green-800 dark:bg-green-900'
                            : 'bg-red-100 text-red-800 dark:bg-red-900'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900'
                      }`}>
                        {token.activo ? (isVigente ? '✅ Vigente' : '⚠️ Vencido') : '❌ Inactivo'}
                      </span>
                    </td>
                    <td className="p-3 text-center text-sm">{new Date(token.fecha_vencimiento).toLocaleDateString()}</td>
                    <td className="p-3 text-center font-bold">
                      <span className={isVigente ? 'text-green-600' : 'text-red-600'}>
                        {diasRest}d
                      </span>
                    </td>
                    <td className="p-3 text-center">{token.dias_validez || '-'}</td>
                    <td className="p-3 text-xs truncate max-w-xs" title={token.notas}>{token.notas || '-'}</td>
                    <td className="p-3 text-center text-xs">{new Date(token.fecha_creacion).toLocaleDateString()}</td>
                    <td className="p-3 text-center">
                      {token.activo && (
                        <button
                          onClick={() => handleDesactivarToken(token.id)}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs"
                        >
                          Desactivar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {tokens.length === 0 && (
            <div className="p-6 text-center text-gray-600 dark:text-gray-400">
              <p>📭 No hay tokens registrados</p>
            </div>
          )}
        </div>

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg border border-blue-200 dark:border-blue-700">
          <p className="text-blue-800 dark:text-blue-100 text-sm">
            💡 <strong>Nota:</strong> El sistema buscará automáticamente el token más reciente y vigente de esta tabla.
            Si todos están vencidos, usará el token de Postman por defecto.
          </p>
        </div>
      </div>
    </div>
  );
}
