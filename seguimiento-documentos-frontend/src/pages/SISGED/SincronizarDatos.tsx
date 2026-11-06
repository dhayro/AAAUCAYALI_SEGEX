import { useState } from 'react';
import { toast } from 'sonner';
import api from '../../utils/api';

export default function SincronizarDatos() {
  const [loading, setLoading] = useState(false);
  const [jsonData, setJsonData] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [endpoint, setEndpoint] = useState('general');
  const [viewMode, setViewMode] = useState<'json' | 'table'>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(15);
  const [showTrazabilidadModal, setShowTrazabilidadModal] = useState(false);
  const [trazabilidadData, setTrazabilidadData] = useState<any>(null);
  const [selectedCut, setSelectedCut] = useState<string>('');
  const [loadingTrazabilidad, setLoadingTrazabilidad] = useState(false);
  const [showArchivoModal, setShowArchivoModal] = useState(false);
  const [archivoUrl, setArchivoUrl] = useState<string>('');
  const [showMovimientosModal, setShowMovimientosModal] = useState(false);
  const [movimientosData, setMovimientosData] = useState<any>(null);
  const [loadingMovimientos, setLoadingMovimientos] = useState(false);

  const [formData, setFormData] = useState({
    // GENERAL
    CUT_MIDAGRI: '',
    NRO_DOCUMENTO: '',
    ASUNTO: '',
    ID_TIPO_DOCUMENTO: '0',
    ID_ESTADO_DOCUMENTO: '0',
    ID_OFICINA: '0',
    ID_USUARIO: '0',
    FEC_INICIO: '',
    FEC_FIN: '',
    NRO_CUT: '',
    NRO_TICKET: '',
    REFERENCIA: '',
    DESTINOS: '',
    USUARIO_REMITENTE: '',
    ID_TUPA_REQUISITO: '0',
    ID_TUPA: '0',
    NRO_EXPEDIENTE: '',
    ID_TIPO_PERSONA: '0',
    NRO_DOC_PERSONA: '',
    FLG_BORRADOR: '0',
    FLG_ANEXO: '0',
    // TRAZABILIDAD
    ID_OFICINA_TRAZ: '92',
    ID_USUARIO_TRAZ: '860',
    ID_PERFIL: '16',
    FLG_ANULADO: '1',
    token: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (value) {
      const [year, month, day] = value.split('-');
      const formattedDate = `${day}/${month}/${year}`;
      setFormData(prev => ({ ...prev, [name]: formattedDate }));
    } else {
      setFormData(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleDescargar = async () => {
    setLoading(true);
    try {
      const response = await api.post('/sisged/sincronizar');

      if (response.data.success) {
        setJsonData(Array.isArray(response.data.data) ? response.data.data.flat() : response.data.data);
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
      let params = {};

      if (endpoint === 'general') {
        params = {
          CUT_MIDAGRI: formData.CUT_MIDAGRI,
          NRO_DOCUMENTO: formData.NRO_DOCUMENTO,
          ASUNTO: formData.ASUNTO,
          ID_TIPO_DOCUMENTO: formData.ID_TIPO_DOCUMENTO,
          ID_ESTADO_DOCUMENTO: formData.ID_ESTADO_DOCUMENTO,
          ID_OFICINA: formData.ID_OFICINA,
          ID_USUARIO: formData.ID_USUARIO,
          FEC_INICIO: formData.FEC_INICIO,
          FEC_FIN: formData.FEC_FIN,
          NRO_CUT: formData.NRO_CUT,
          NRO_TICKET: formData.NRO_TICKET,
          REFERENCIA: formData.REFERENCIA,
          DESTINOS: formData.DESTINOS,
          USUARIO_REMITENTE: formData.USUARIO_REMITENTE,
          ID_TUPA_REQUISITO: formData.ID_TUPA_REQUISITO,
          ID_TUPA: formData.ID_TUPA,
          NRO_EXPEDIENTE: formData.NRO_EXPEDIENTE,
          ID_TIPO_PERSONA: formData.ID_TIPO_PERSONA,
          NRO_DOC_PERSONA: formData.NRO_DOC_PERSONA,
          FLG_BORRADOR: formData.FLG_BORRADOR,
          FLG_ANEXO: formData.FLG_ANEXO
        };
      } else {
        params = {
          NRO_CUT: formData.NRO_CUT,
          ID_OFICINA: formData.ID_OFICINA_TRAZ,
          ID_USUARIO: formData.ID_USUARIO_TRAZ,
          ID_PERFIL: formData.ID_PERFIL,
          FLG_ANULADO: formData.FLG_ANULADO
        };
      }

      const response = await api.post('/sisged/sincronizar-con-parametros', {
        params,
        token: formData.token || undefined,
        endpoint
      });

      if (response.data.success) {
        setJsonData(Array.isArray(response.data.data) ? response.data.data.flat() : response.data.data);
        toast.success(`✅ Postman actualizado + ${response.data.total} registros obtenidos`);
      } else {
        toast.error(`❌ ${response.data.error}`);
      }
    } catch (error: any) {
      toast.error(`❌ Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTrazabilidad = async (ncut: string) => {
    setLoadingTrazabilidad(true);
    setSelectedCut(ncut);
    try {
      const response = await api.post('/sisged/sincronizar-con-parametros', {
        params: { NRO_CUT: ncut },
        endpoint: 'trazabilidad'
      });

      if (response.data.success) {
        setTrazabilidadData(Array.isArray(response.data.data) ? response.data.data.flat() : response.data.data);
        setShowTrazabilidadModal(true);
        toast.success(`✅ Trazabilidad obtenida: ${response.data.total} registros`);
      } else {
        toast.error(`❌ ${response.data.error}`);
      }
    } catch (error: any) {
      toast.error(`❌ Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoadingTrazabilidad(false);
    }
  };

  const handleVerArchivo = (item: any, flgTipo: number = 1, codigoAdjunto: string = '-') => {
    const params = {
      ID_DOCUMENTO: item?.iddocpad || item?.iddocanex || 0,
      ID_USUARIO: 1,
      ID_OFICINA: item?.idofi || 1,
      ID_PERFIL: 1,
      FLG_TIPO: flgTipo,
      FLG_FIRMA: 1,
      CODIGO_ADJUNTO: codigoAdjunto
    };

    api.post('/sisged/sincronizar-con-parametros', { params, endpoint: 'archivo' })
      .then((response) => {
        if (response.data.success && response.data.pdfUrl) {
          setArchivoUrl(response.data.pdfUrl);
          setShowArchivoModal(true);
          toast.success('✅ Documento cargado');
        } else {
          toast.error('❌ No se pudo obtener el URL del PDF');
        }
      })
      .catch((error) => {
        toast.error(`❌ Error: ${error.response?.data?.error || error.message}`);
      });
  };

  const handleVerMovimientos = (idDocumento: number) => {
    setLoadingMovimientos(true);
    try {
      const params = { ID_DOCUMENTO: idDocumento };

      api.post('/sisged/sincronizar-con-parametros', { params, endpoint: 'movimientos' })
        .then((response) => {
          if (response.data.success) {
            setMovimientosData(Array.isArray(response.data.data) ? response.data.data.flat() : response.data.data);
            setShowMovimientosModal(true);
            toast.success(`✅ Movimientos obtenidos: ${response.data.total} registros`);
          } else {
            toast.error(`❌ ${response.data.error}`);
          }
        })
        .catch((error) => {
          toast.error(`❌ Error: ${error.response?.data?.error || error.message}`);
        })
        .finally(() => setLoadingMovimientos(false));
    } catch (error) {
      setLoadingMovimientos(false);
    }
  };

  const getIconoAdjunto = (nombre: string) => {
    // Si es URL, mostrar icono de enlace
    if (nombre.startsWith('http://') || nombre.startsWith('https://')) {
      return '🔗';
    }

    const extension = nombre.split('.').pop()?.toLowerCase() || '';
    if (extension === 'pdf') return '📕';
    if (['doc', 'docx'].includes(extension)) return '📝';
    if (['xls', 'xlsx'].includes(extension)) return '📊';
    if (['ppt', 'pptx'].includes(extension)) return '🎯';
    if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) return '🖼️';
    if (['zip', 'rar', '7z'].includes(extension)) return '🗜️';
    return '📎';
  };

  const parseAdjuntos = (adjuntoStr: string) => {
    if (!adjuntoStr) return [];
    const adjuntos = adjuntoStr.split('\r').filter(a => a.trim());
    return adjuntos.map((adj: string) => {
      // Formato: 5089229"TÉRMINOS DE REFERENCIA...pdf".pdf"1"0 o 5087998"https://...""2"0
      const match = adj.match(/^(\d+)"([^"]+)"/);
      if (match) {
        const nombre = match[2];
        const isUrl = nombre.startsWith('http://') || nombre.startsWith('https://');
        const extension = isUrl ? 'url' : (nombre.split('.').pop()?.toLowerCase() || '');
        return { id: match[1], nombre, extension, isUrl, icono: getIconoAdjunto(nombre) };
      }
      return null;
    }).filter(Boolean);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h1 className="text-3xl font-bold mb-2">Obtener Datos de SISGED</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Descarga JSON directo desde SISGED vía Postman API
        </p>

        <div className="flex gap-3 mb-6 flex-wrap">
          <button
            onClick={handleDescargar}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-8 rounded-lg transition"
          >
            {loading ? '⏳ Cargando...' : '🔄 Obtener Datos'}
          </button>

          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-8 rounded-lg transition"
          >
            {showForm ? '❌ Cerrar' : '⚙️ Editar Parámetros'}
          </button>

          <button
            onClick={async () => {
              try {
                await api.post('/sisged/limpiar-cache');
                toast.success('✅ Cache de token limpiado. Próximo request obtendrá nuevo token');
              } catch (error: any) {
                toast.error(`❌ Error: ${error.response?.data?.error || error.message}`);
              }
            }}
            className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-8 rounded-lg transition"
          >
            🔃 Limpiar Cache Token
          </button>
        </div>

        {showForm && (
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">🔗 Endpoint SISGED</label>
              <select
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                className="border rounded px-4 py-2 dark:bg-gray-600 dark:border-gray-500 font-medium"
              >
                <option value="general">📋 GENERAL - Búsqueda de documentos</option>
                <option value="trazabilidad">🔍 TRAZABILIDAD - Traza de expediente</option>
              </select>
            </div>

            {endpoint === 'general' ? (
              <div>
                <h3 className="font-bold text-lg mb-4">📋 Parámetros - GENERAL</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">CUT MIDAGRI</label>
                    <input type="text" name="CUT_MIDAGRI" value={formData.CUT_MIDAGRI} onChange={handleInputChange} className="w-full border rounded px-3 py-2 dark:bg-gray-600 dark:border-gray-500 text-sm" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">NRO DOCUMENTO</label>
                    <input type="text" name="NRO_DOCUMENTO" value={formData.NRO_DOCUMENTO} onChange={handleInputChange} className="w-full border rounded px-3 py-2 dark:bg-gray-600 dark:border-gray-500 text-sm" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">ASUNTO</label>
                    <input type="text" name="ASUNTO" value={formData.ASUNTO} onChange={handleInputChange} className="w-full border rounded px-3 py-2 dark:bg-gray-600 dark:border-gray-500 text-sm" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">NRO CUT</label>
                    <input type="text" name="NRO_CUT" value={formData.NRO_CUT} onChange={handleInputChange} className="w-full border rounded px-3 py-2 dark:bg-gray-600 dark:border-gray-500 text-sm" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">NRO TICKET</label>
                    <input type="text" name="NRO_TICKET" value={formData.NRO_TICKET} onChange={handleInputChange} className="w-full border rounded px-3 py-2 dark:bg-gray-600 dark:border-gray-500 text-sm" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">👤 USUARIO REMITENTE</label>
                    <input type="text" name="USUARIO_REMITENTE" value={formData.USUARIO_REMITENTE} onChange={handleInputChange} placeholder="ej: aliaga+romayna" className="w-full border rounded px-3 py-2 dark:bg-gray-600 dark:border-gray-500 text-sm" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">📅 Fecha Inicio</label>
                    <input type="date" name="FEC_INICIO" onChange={handleDateChange} className="w-full border rounded px-3 py-2 dark:bg-gray-600 dark:border-gray-500 text-sm" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">📅 Fecha Fin</label>
                    <input type="date" name="FEC_FIN" onChange={handleDateChange} className="w-full border rounded px-3 py-2 dark:bg-gray-600 dark:border-gray-500 text-sm" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">ID TIPO DOCUMENTO</label>
                    <input type="text" name="ID_TIPO_DOCUMENTO" value={formData.ID_TIPO_DOCUMENTO} onChange={handleInputChange} className="w-full border rounded px-3 py-2 dark:bg-gray-600 dark:border-gray-500 text-sm" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">ID ESTADO DOCUMENTO</label>
                    <input type="text" name="ID_ESTADO_DOCUMENTO" value={formData.ID_ESTADO_DOCUMENTO} onChange={handleInputChange} className="w-full border rounded px-3 py-2 dark:bg-gray-600 dark:border-gray-500 text-sm" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">ID OFICINA</label>
                    <input type="text" name="ID_OFICINA" value={formData.ID_OFICINA} onChange={handleInputChange} className="w-full border rounded px-3 py-2 dark:bg-gray-600 dark:border-gray-500 text-sm" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">ID USUARIO</label>
                    <input type="text" name="ID_USUARIO" value={formData.ID_USUARIO} onChange={handleInputChange} className="w-full border rounded px-3 py-2 dark:bg-gray-600 dark:border-gray-500 text-sm" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">REFERENCIA</label>
                    <input type="text" name="REFERENCIA" value={formData.REFERENCIA} onChange={handleInputChange} className="w-full border rounded px-3 py-2 dark:bg-gray-600 dark:border-gray-500 text-sm" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">DESTINOS</label>
                    <input type="text" name="DESTINOS" value={formData.DESTINOS} onChange={handleInputChange} className="w-full border rounded px-3 py-2 dark:bg-gray-600 dark:border-gray-500 text-sm" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">ID TUPA REQUISITO</label>
                    <input type="text" name="ID_TUPA_REQUISITO" value={formData.ID_TUPA_REQUISITO} onChange={handleInputChange} className="w-full border rounded px-3 py-2 dark:bg-gray-600 dark:border-gray-500 text-sm" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">ID TUPA</label>
                    <input type="text" name="ID_TUPA" value={formData.ID_TUPA} onChange={handleInputChange} className="w-full border rounded px-3 py-2 dark:bg-gray-600 dark:border-gray-500 text-sm" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">NRO EXPEDIENTE</label>
                    <input type="text" name="NRO_EXPEDIENTE" value={formData.NRO_EXPEDIENTE} onChange={handleInputChange} className="w-full border rounded px-3 py-2 dark:bg-gray-600 dark:border-gray-500 text-sm" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">ID TIPO PERSONA</label>
                    <input type="text" name="ID_TIPO_PERSONA" value={formData.ID_TIPO_PERSONA} onChange={handleInputChange} className="w-full border rounded px-3 py-2 dark:bg-gray-600 dark:border-gray-500 text-sm" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">NRO DOC PERSONA</label>
                    <input type="text" name="NRO_DOC_PERSONA" value={formData.NRO_DOC_PERSONA} onChange={handleInputChange} className="w-full border rounded px-3 py-2 dark:bg-gray-600 dark:border-gray-500 text-sm" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">FLG BORRADOR (0/1)</label>
                    <input type="text" name="FLG_BORRADOR" value={formData.FLG_BORRADOR} onChange={handleInputChange} className="w-full border rounded px-3 py-2 dark:bg-gray-600 dark:border-gray-500 text-sm" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">FLG ANEXO (0/1)</label>
                    <input type="text" name="FLG_ANEXO" value={formData.FLG_ANEXO} onChange={handleInputChange} className="w-full border rounded px-3 py-2 dark:bg-gray-600 dark:border-gray-500 text-sm" />
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium mb-1">🔢 NRO CUT (requerido)</label>
                <input type="text" name="NRO_CUT" value={formData.NRO_CUT} onChange={handleInputChange} placeholder="ej: 274582-2025" className="w-full border rounded px-3 py-2 dark:bg-gray-600 dark:border-gray-500 text-sm font-bold" />
              </div>
            )}

            <div className="mt-4">
              <label className="block text-sm font-medium mb-1">🔑 Bearer Token (opcional)</label>
              <input type="password" name="token" value={formData.token} onChange={handleInputChange} placeholder="Nuevo token..." className="w-full border rounded px-3 py-2 dark:bg-gray-600 dark:border-gray-500 text-sm" />
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={handleDescargarConParametros}
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition"
              >
                {loading ? '⏳ Descargando...' : '✅ Descargar'}
              </button>

              <button
                onClick={async () => {
                  try {
                    let params = {};
                    if (endpoint === 'general') {
                      params = {
                        CUT_MIDAGRI: formData.CUT_MIDAGRI,
                        NRO_DOCUMENTO: formData.NRO_DOCUMENTO,
                        ASUNTO: formData.ASUNTO,
                        ID_TIPO_DOCUMENTO: formData.ID_TIPO_DOCUMENTO,
                        ID_ESTADO_DOCUMENTO: formData.ID_ESTADO_DOCUMENTO,
                        ID_OFICINA: formData.ID_OFICINA,
                        ID_USUARIO: formData.ID_USUARIO,
                        FEC_INICIO: formData.FEC_INICIO,
                        FEC_FIN: formData.FEC_FIN,
                        NRO_CUT: formData.NRO_CUT,
                        NRO_TICKET: formData.NRO_TICKET,
                        REFERENCIA: formData.REFERENCIA,
                        DESTINOS: formData.DESTINOS,
                        USUARIO_REMITENTE: formData.USUARIO_REMITENTE,
                        ID_TUPA_REQUISITO: formData.ID_TUPA_REQUISITO,
                        ID_TUPA: formData.ID_TUPA,
                        NRO_EXPEDIENTE: formData.NRO_EXPEDIENTE,
                        ID_TIPO_PERSONA: formData.ID_TIPO_PERSONA,
                        NRO_DOC_PERSONA: formData.NRO_DOC_PERSONA,
                        FLG_BORRADOR: formData.FLG_BORRADOR,
                        FLG_ANEXO: formData.FLG_ANEXO
                      };
                    } else {
                      params = { NRO_CUT: formData.NRO_CUT };
                    }

                    await api.post('/sisged/sincronizar-postman', { params, endpoint, token: formData.token });
                    toast.success('✅ Postman sincronizado con los parámetros actuales');
                  } catch (error: any) {
                    toast.error(`❌ Error: ${error.response?.data?.error || error.message}`);
                  }
                }}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition text-sm"
              >
                🔄 Sync Postman
              </button>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-400 mt-3">
              ⚡ Ahora es MÁS RÁPIDO (sin actualizar Postman automáticamente)
            </p>
          </div>
        )}

        {jsonData && (
          <div>
            <div className="mb-4 flex justify-between items-center gap-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-4 py-2 rounded text-sm font-medium transition ${
                    viewMode === 'table'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200'
                  }`}
                >
                  📊 Tabla
                </button>
                <button
                  onClick={() => setViewMode('json')}
                  className={`px-4 py-2 rounded text-sm font-medium transition ${
                    viewMode === 'json'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200'
                  }`}
                >
                  📋 JSON
                </button>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(jsonData, null, 2));
                  toast.success('✅ Copiado al portapapeles');
                }}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm"
              >
                📋 Copiar
              </button>
            </div>

            {viewMode === 'json' ? (
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto max-h-[600px] font-mono text-sm">
                <pre>{JSON.stringify(jsonData, null, 2)}</pre>
              </div>
            ) : (
              <div style={{ height: '550px', marginBottom: '1rem' }} className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <div className="bg-white dark:bg-gray-700 p-4" style={{ borderBottom: '1px solid #CCCCCC' }}>
                  <h3 className="text-lg font-bold">Lista de Documentos SISGED</h3>
                </div>
                <div style={{ overflow: 'auto', height: '410px' }} className="bg-white dark:bg-gray-800">
                  <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr className="bg-gray-100 dark:bg-gray-700 font-bold border-b text-xs">
                        <th className="p-2 text-center sticky top-0 bg-white dark:bg-gray-700 z-10" style={{ minWidth: '35px' }}>N°</th>
                        <th className="p-2 text-left sticky top-0 bg-white dark:bg-gray-700 z-10" style={{ minWidth: '80px' }}>N° CUT</th>
                        <th className="p-2 text-center sticky top-0 bg-white dark:bg-gray-700 z-10" style={{ minWidth: '60px' }}>Origen</th>
                        <th className="p-2 text-center sticky top-0 bg-white dark:bg-gray-700 z-10" style={{ minWidth: '50px' }}>TUPA</th>
                        <th className="p-2 text-center sticky top-0 bg-white dark:bg-gray-700 z-10" style={{ minWidth: '50px' }}>Destip</th>
                        <th className="p-2 text-left sticky top-0 bg-white dark:bg-gray-700 z-10" style={{ minWidth: '150px' }}>Procedimiento</th>
                        <th className="p-2 text-left sticky top-0 bg-white dark:bg-gray-700 z-10" style={{ minWidth: '120px' }}>N° Documento</th>
                        <th className="p-2 text-left sticky top-0 bg-white dark:bg-gray-700 z-10" style={{ minWidth: '200px' }}>Asunto</th>
                        <th className="p-2 text-left sticky top-0 bg-white dark:bg-gray-700 z-10" style={{ minWidth: '100px' }}>Referencia</th>
                        <th className="p-2 text-center sticky top-0 bg-white dark:bg-gray-700 z-10" style={{ minWidth: '40px' }}>Fol</th>
                        <th className="p-2 text-left sticky top-0 bg-white dark:bg-gray-700 z-10" style={{ minWidth: '120px' }}>Fecha Creación</th>
                        <th className="p-2 text-left sticky top-0 bg-white dark:bg-gray-700 z-10" style={{ minWidth: '120px' }}>Usuario Remitente</th>
                        <th className="p-2 text-left sticky top-0 bg-white dark:bg-gray-700 z-10" style={{ minWidth: '130px' }}>Oficina Remitente</th>
                        <th className="p-2 text-left sticky top-0 bg-white dark:bg-gray-700 z-10" style={{ minWidth: '120px' }}>Destinos</th>
                        <th className="p-2 text-left sticky top-0 bg-white dark:bg-gray-700 z-10" style={{ minWidth: '50px' }}>Tema</th>
                        <th className="p-2 text-center sticky top-0 bg-white dark:bg-gray-700 z-10" style={{ minWidth: '50px' }}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jsonData && Array.isArray(jsonData) && jsonData.map((row: any, idx: number) => {
                        const item = Array.isArray(row) ? row[0] : row;
                        return (
                          <tr key={idx} className="border-b hover:bg-gray-50 dark:hover:bg-gray-600 text-xs">
                            <td className="p-2 text-center font-bold">{idx + 1}</td>
                            <td className="p-2 font-bold text-blue-600">{item?.ncut || '-'}</td>
                            <td className="p-2 text-center">{item?.origen || '-'}</td>
                            <td className="p-2 text-center">
                              <span className={`px-2 py-1 rounded text-xs font-bold ${
                                item?.estupa === 'TUPA' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {item?.estupa || '-'}
                              </span>
                            </td>
                            <td className="p-2 text-center">{item?.destip || '-'}</td>
                            <td className="p-2 text-xs max-w-xs truncate" title={item?.proced}>{item?.proced || '-'}</td>
                            <td className="p-2 text-xs max-w-xs truncate font-semibold">{item?.ndoc || '-'}</td>
                            <td className="p-2 text-xs max-w-sm truncate" title={item?.asunto}>{item?.asunto || '-'}</td>
                            <td className="p-2 text-xs max-w-xs truncate" title={item?.refe}>{item?.refe || '-'}</td>
                            <td className="p-2 text-center text-xs">{item?.fol || '-'}</td>
                            <td className="p-2 text-xs">{item?.feccrea || '-'}</td>
                            <td className="p-2 text-xs whitespace-pre-wrap">{item?.usurem || '-'}</td>
                            <td className="p-2 text-xs">{item?.ofirem || '-'}</td>
                            <td className="p-2 text-xs whitespace-pre-wrap">{item?.destinos || '-'}</td>
                            <td className="p-2 text-xs">{item?.tema || '-'}</td>
                            <td className="p-2 text-center">
                              <button
                                onClick={() => handleTrazabilidad(item?.ncut)}
                                disabled={loadingTrazabilidad}
                                className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-2 py-1 rounded text-xs"
                                title="Ver trazabilidad del documento"
                              >
                                🔍
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="bg-white dark:bg-gray-800 p-3 border-t">
                  <div className="flex justify-between items-center text-sm">
                    <div className="text-gray-600 dark:text-gray-400">
                      Mostrando <strong>{jsonData && Array.isArray(jsonData) ? jsonData.length : 0}</strong> registros
                    </div>
                    <select
                      value={recordsPerPage}
                      onChange={(e) => {
                        setRecordsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="border rounded px-2 py-1 dark:bg-gray-600 dark:border-gray-500 text-sm"
                    >
                      <option value={15}>15</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              <p>📦 Total de registros: <span className="font-bold">{Array.isArray(jsonData) ? jsonData.length : 1}</span></p>
            </div>
          </div>
        )}

        {!loading && !jsonData && (
          <div className="p-6 bg-yellow-50 dark:bg-yellow-900 rounded-lg border border-yellow-200 dark:border-yellow-700">
            <p className="text-yellow-800 dark:text-yellow-100">
              💡 Haz click en "Descargar JSON" o edita parámetros de GENERAL o TRAZABILIDAD
            </p>
          </div>
        )}
      </div>

      {showArchivoModal && (
        <div className="fixed inset-0 bg-black/50 z-[999999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-6xl w-full h-[87vh] z-[10001] flex flex-col">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">📄 Visor de Archivo</h2>
              <button
                onClick={() => setShowArchivoModal(false)}
                className="text-white hover:bg-blue-800 rounded-full p-2 text-2xl"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-hidden bg-gray-100">
              <iframe
                src={archivoUrl}
                className="w-full h-full border-0"
                title="Visor de documento"
                onError={() => toast.error('❌ No se pudo cargar el documento')}
              />
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-4 flex justify-end gap-2">
              <button
                onClick={() => window.open(archivoUrl, '_blank')}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition"
              >
                🔗 Abrir en pestaña nueva
              </button>
              <button
                onClick={() => setShowArchivoModal(false)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {showTrazabilidadModal && (
        <div className="fixed inset-0 bg-black/50 z-[999999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-auto z-[9999]">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 border-b sticky top-0">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">📋 Trazabilidad del CUT</h2>
                  <p className="text-blue-100 mt-1">Estado: {selectedCut}</p>
                </div>
                <button
                  onClick={() => setShowTrazabilidadModal(false)}
                  className="text-white hover:bg-blue-800 rounded-full p-2 text-2xl"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6">
              {loadingTrazabilidad ? (
                <div className="flex justify-center items-center h-40">
                  <span className="text-lg">⏳ Cargando trazabilidad...</span>
                </div>
              ) : trazabilidadData && Array.isArray(trazabilidadData) && trazabilidadData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-100 dark:bg-gray-700 border-b-2 border-gray-300">
                        <th className="p-3 text-center font-bold">N°</th>
                        <th className="p-3 text-left font-bold">Documento</th>
                        <th className="p-3 text-center font-bold">Adjuntos</th>
                        <th className="p-3 text-left font-bold">Asunto</th>
                        <th className="p-3 text-left font-bold">Fecha Creación</th>
                        <th className="p-3 text-left font-bold">Estado</th>
                        <th className="p-3 text-center font-bold">Folios</th>
                        <th className="p-3 text-left font-bold">Remitente</th>
                        <th className="p-3 text-left font-bold">Destino</th>
                        <th className="p-3 text-center font-bold">Movimientos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trazabilidadData.flat().map((item: any, idx: number) => (
                        <tr key={idx} className="border-b hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="p-3 text-center font-bold text-blue-600">{idx + 1}</td>
                          <td className="p-3 text-sm font-semibold">
                            <button
                              onClick={() => handleVerArchivo(item)}
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline cursor-pointer"
                              title="Ver archivo del documento"
                            >
                              {item?.ndoc || '-'}
                            </button>
                          </td>
                          <td className="p-3 text-center">
                            {item?.adjunto ? (
                              <div className="flex gap-1 flex-wrap justify-center">
                                {parseAdjuntos(item.adjunto).map((adj: any, adjIdx: number) => (
                                  <button
                                    key={adjIdx}
                                    onClick={() => {
                                      // Si es URL, abrir directamente
                                      if (adj.isUrl) {
                                        window.open(adj.nombre, '_blank');
                                        toast.success('✅ Abriendo enlace...');
                                      }
                                      // Si es PDF, usar visor
                                      else if (adj.extension === 'pdf') {
                                        const paramsAdj = {
                                          ID_DOCUMENTO: adj.id,
                                          ID_USUARIO: 1,
                                          ID_OFICINA: item?.idofi || 1,
                                          ID_PERFIL: 1,
                                          FLG_TIPO: 2,
                                          FLG_FIRMA: 1,
                                          CODIGO_ADJUNTO: '-'
                                        };
                                        api.post('/sisged/sincronizar-con-parametros', { params: paramsAdj, endpoint: 'archivo' })
                                          .then((response) => {
                                            if (response.data.success && response.data.pdfUrl) {
                                              setArchivoUrl(response.data.pdfUrl);
                                              setShowArchivoModal(true);
                                              toast.success('✅ PDF cargado');
                                            } else {
                                              toast.error('❌ No se pudo obtener el URL');
                                            }
                                          })
                                          .catch((error) => {
                                            toast.error(`❌ Error: ${error.response?.data?.error || error.message}`);
                                          });
                                      }
                                      // Si es otro formato, descargar directo
                                      else {
                                        const downloadUrl = `https://sisged.ana.gob.pe/SISGED/Recursos/Descarga/FrmDescargaAdjunto.aspx?ID_DOCUMENTO_ADJUNTO=${adj.id}&CODIGO_ADJUNTO=--`;
                                        window.open(downloadUrl, '_blank');
                                        toast.success(`✅ Descargando ${adj.nombre}`);
                                      }
                                    }}
                                    className="hover:scale-125 transition text-lg"
                                    title={adj.isUrl ? `Enlace: ${adj.nombre}` : `${adj.nombre} (${adj.extension.toUpperCase()})`}
                                  >
                                    {adj.icono}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="p-3 text-sm max-w-sm truncate" title={item?.asunto}>{item?.asunto || '-'}</td>
                          <td className="p-3 text-sm">{item?.stfecrea || item?.feccrea || '-'}</td>
                          <td className="p-3 text-sm">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                              item?.estado === 'Pendiente' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100' :
                              item?.estado === 'Atendido' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100'
                            }`}>
                              {item?.estado || '-'}
                            </span>
                          </td>
                          <td className="p-3 text-center text-sm">{item?.fol || '-'}</td>
                          <td className="p-3 text-sm whitespace-pre-wrap text-xs">{item?.remi || '-'}</td>
                          <td className="p-3 text-sm whitespace-pre-wrap text-xs max-w-sm truncate" title={item?.destino}>{item?.destino || '-'}</td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleVerMovimientos(item?.iddocpad || 0)}
                              disabled={loadingMovimientos}
                              className="bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white px-3 py-1 rounded text-xs"
                              title="Ver movimientos del documento"
                            >
                              📋
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-600 dark:text-gray-400">❌ No hay datos disponibles</p>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 dark:bg-gray-700 p-4 border-t flex justify-between items-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                📦 Total: <span className="font-bold">{trazabilidadData ? trazabilidadData.flat().length : 0}</span> documentos
              </p>
              <button
                onClick={() => setShowTrazabilidadModal(false)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {showMovimientosModal && (
        <div className="fixed inset-0 bg-black/50 z-[999999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-5xl w-full max-h-[90vh] overflow-auto z-[9999]">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 border-b sticky top-0">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">📋 Movimientos del Documento</h2>
                <button
                  onClick={() => setShowMovimientosModal(false)}
                  className="text-white hover:bg-purple-800 rounded-full p-2 text-2xl"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6">
              {loadingMovimientos ? (
                <div className="flex justify-center items-center h-40">
                  <span className="text-lg">⏳ Cargando movimientos...</span>
                </div>
              ) : movimientosData && Array.isArray(movimientosData) && movimientosData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-100 dark:bg-gray-700 border-b-2 border-gray-300">
                        <th className="p-3 text-center font-bold">N°</th>
                        <th className="p-3 text-left font-bold">Oficina Envía</th>
                        <th className="p-3 text-center font-bold">Fecha Envío</th>
                        <th className="p-3 text-left font-bold">Oficina Recibe</th>
                        <th className="p-3 text-center font-bold">Fecha Recepción</th>
                        <th className="p-3 text-left font-bold">Acción</th>
                        <th className="p-3 text-left font-bold">Documento</th>
                        <th className="p-3 text-left font-bold">Estado</th>
                        <th className="p-3 text-left font-bold">Comentario Envía</th>
                        <th className="p-3 text-left font-bold">Comentario Recibe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movimientosData.map((item: any, idx: number) => (
                        <tr key={idx} className="border-b hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="p-3 text-center font-bold text-purple-600">{idx + 1}</td>
                          <td className="p-3 text-xs max-w-xs truncate" title={item?.DESC_OFICINA_ENVIA}>{item?.DESC_OFICINA_ENVIA || '-'}</td>
                          <td className="p-3 text-xs text-center">{item?.STR_FEC_INICIO || '-'}</td>
                          <td className="p-3 text-xs max-w-xs truncate" title={item?.DESC_OFICINA_RECIBE}>{item?.DESC_OFICINA_RECIBE || '-'}</td>
                          <td className="p-3 text-xs text-center">{item?.STR_FEC_FIN || '-'}</td>
                          <td className="p-3 text-xs font-semibold">{item?.MOVIMIENTO || '-'}</td>
                          <td className="p-3 text-xs">{item?.NRO_DOCUMENTO || '-'}</td>
                          <td className="p-3 text-xs">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                              item?.ESTADO === 'Atendido' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' :
                              item?.ESTADO === 'No Recibido' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100'
                            }`}>
                              {item?.ESTADO || '-'}
                            </span>
                          </td>
                          <td className="p-3 text-xs whitespace-pre-wrap max-w-sm truncate" title={item?.COMENTARIO_ENVIA}>{item?.COMENTARIO_ENVIA || '-'}</td>
                          <td className="p-3 text-xs whitespace-pre-wrap max-w-sm truncate" title={item?.COMENTARIO_RECIBE}>{item?.COMENTARIO_RECIBE || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-600 dark:text-gray-400">❌ No hay movimientos disponibles</p>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 dark:bg-gray-700 p-4 border-t flex justify-between items-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                📦 Total: <span className="font-bold">{movimientosData ? movimientosData.length : 0}</span> movimientos
              </p>
              <button
                onClick={() => setShowMovimientosModal(false)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
