import { useState } from "react";
import { toast } from "sonner";

interface TestResult {
  endpoint: string;
  method: string;
  status: number;
  data: any;
  timestamp: string;
}

export default function TestMenu() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState("");
  const [formData, setFormData] = useState({
    cut: "",
    nroDocumento: "",
    asunto: "",
    usuario: "aliaga romayna",
    fechaInicio: "01/09/2026",
    fechaFin: "24/09/2026",
    idOficina: "92",
    idUsuario: "860",
    idPerfil: "16",
  });

  const endpoints = {
    general: {
      url: "http://localhost:3003/api/sisged/general",
      externalUrl: "https://sisgedpiloto.ana.gob.pe/apiRestSG/api/SISGED/general",
      method: "GET",
      description: "Obtener datos generales de SISGED (a través del proxy)",
    },
    trazabilidad: {
      url: "http://localhost:3003/api/sisged/trazabilidad",
      externalUrl: "https://sisgedpiloto.ana.gob.pe/apiRestSG/api/SISGED/trazabilidad",
      method: "GET",
      description: "Obtener trazabilidad de un CUT (a través del proxy)",
    },
  };

  const buildUrl = (endpoint: string): { local: string; external: string } => {
    const ep = endpoints[endpoint as keyof typeof endpoints];
    const base = ep.url;
    const externalBase = ep.externalUrl;
    const params = new URLSearchParams();

    if (endpoint === "general") {
      params.append("CUT_MIDAGRI", "");
      params.append("NRO_DOCUMENTO", formData.nroDocumento);
      params.append("ASUNTO", formData.asunto);
      params.append("ID_TIPO_DOCUMENTO", "0");
      params.append("ID_ESTADO_DOCUMENTO", "0");
      params.append("ID_OFICINA", "0");
      params.append("ID_USUARIO", "0");
      params.append("FEC_INICIO", formData.fechaInicio);
      params.append("FEC_FIN", formData.fechaFin);
      params.append("NRO_CUT", formData.cut);
      params.append("NRO_TICKET", "");
      params.append("REFERENCIA", "");
      params.append("DESTINOS", "");
      params.append("USUARIO_REMITENTE", formData.usuario);
      params.append("ID_TUPA_REQUISITO", "0");
      params.append("ID_TUPA", "0");
      params.append("NRO_EXPEDIENTE", "");
      params.append("ID_TIPO_PERSONA", "0");
      params.append("NRO_DOC_PERSONA", "");
      params.append("FLG_BORRADOR", "0");
      params.append("FLG_ANEXO", "0");
    } else if (endpoint === "trazabilidad") {
      params.append("NRO_CUT", formData.cut);
      params.append("ID_OFICINA", formData.idOficina);
      params.append("ID_USUARIO", formData.idUsuario);
      params.append("ID_PERFIL", formData.idPerfil);
      params.append("FLG_ANULADO", "1");
    }

    return {
      local: `${base}?${params.toString()}`,
      external: `${externalBase}?${params.toString()}`,
    };
  };

  const testEndpoint = async (endpoint: string) => {
    if (!token) {
      toast.error("Token requerido");
      return;
    }

    setLoading(true);
    try {
      const urls = buildUrl(endpoint);
      const config = endpoints[endpoint as keyof typeof endpoints];

      const response = await fetch(urls.local, {
        method: config.method,
        headers: {
          "Accept": "application/json, text/javascript, */*; q=0.01",
          "Accept-Language": "es-ES,es;q=0.9",
          "Authorization": `Bearer ${token}`,
          "X-Requested-With": "XMLHttpRequest",
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-site",
        },
        credentials: "include",
        mode: "cors",
      });

      let data: any;
      const contentType = response.headers.get("content-type");

      if (contentType?.includes("application/json")) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      const result: TestResult = {
        endpoint: urls.local,
        method: config.method,
        status: response.status,
        data: {
          success: response.ok,
          statusText: response.statusText,
          contentType,
          localUrl: urls.local,
          externalUrl: urls.external,
          data,
          headers: Object.fromEntries(response.headers.entries()),
        },
        timestamp: new Date().toLocaleString("es-PE"),
      };

      setResults([result, ...results]);

      if (response.ok) {
        toast.success(`✅ ${endpoint} - Status: ${response.status}`);
      } else {
        toast.error(`❌ ${endpoint} - Status: ${response.status} ${response.statusText}`);
      }
    } catch (error: any) {
      console.error("Fetch error:", error);
      toast.error(`Error: ${error.message}`);
      const result: TestResult = {
        endpoint: endpoints[endpoint as keyof typeof endpoints].url,
        method: endpoints[endpoint as keyof typeof endpoints].method,
        status: 0,
        data: {
          error: error.message,
          type: error.name,
          stack: error.stack,
        },
        timestamp: new Date().toLocaleString("es-PE"),
      };
      setResults([result, ...results]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-8 text-4xl font-bold text-gray-900">🧪 SISGED Test Menu</h1>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Panel de Configuración */}
          <div className="lg:col-span-1">
            <div className="rounded-lg bg-white p-6 shadow-lg">
              <h2 className="mb-4 text-xl font-semibold">⚙️ Configuración</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Token JWT
                  </label>
                  <textarea
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Pega tu token aquí..."
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-gray-50 p-2 text-xs font-mono"
                    rows={4}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    CUT
                  </label>
                  <input
                    type="text"
                    value={formData.cut}
                    onChange={(e) =>
                      setFormData({ ...formData, cut: e.target.value })
                    }
                    placeholder="Ej: 187610-2026"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Documento
                  </label>
                  <input
                    type="text"
                    value={formData.nroDocumento}
                    onChange={(e) =>
                      setFormData({ ...formData, nroDocumento: e.target.value })
                    }
                    placeholder="Nro documento"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Asunto
                  </label>
                  <input
                    type="text"
                    value={formData.asunto}
                    onChange={(e) =>
                      setFormData({ ...formData, asunto: e.target.value })
                    }
                    placeholder="Asunto"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Usuario
                  </label>
                  <input
                    type="text"
                    value={formData.usuario}
                    onChange={(e) =>
                      setFormData({ ...formData, usuario: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Fecha Inicio
                    </label>
                    <input
                      type="text"
                      value={formData.fechaInicio}
                      onChange={(e) =>
                        setFormData({ ...formData, fechaInicio: e.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Fecha Fin
                    </label>
                    <input
                      type="text"
                      value={formData.fechaFin}
                      onChange={(e) =>
                        setFormData({ ...formData, fechaFin: e.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="mt-4 rounded-lg bg-yellow-50 p-3">
                  <p className="text-xs font-semibold text-yellow-800">💡 Tips:</p>
                  <ul className="mt-2 space-y-1 text-xs text-yellow-700">
                    <li>• Usa el mismo token del navegador</li>
                    <li>• Status 200 = Éxito</li>
                    <li>• CORS error = verifica el token</li>
                    <li>• Copia URL y headers si necesitas debuggear</li>
                  </ul>
                </div>
              </div>

              <div className="mt-6 space-y-2">
                <h3 className="font-semibold text-gray-700">Endpoints:</h3>
                {Object.entries(endpoints).map(([key]) => (
                  <button
                    key={key}
                    onClick={() => testEndpoint(key)}
                    disabled={loading}
                    className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
                  >
                    📡 {key}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Panel de Resultados */}
          <div className="lg:col-span-2">
            <div className="rounded-lg bg-white p-6 shadow-lg">
              <h2 className="mb-4 text-xl font-semibold">📊 Resultados</h2>

              {results.length === 0 ? (
                <div className="rounded-lg bg-gray-50 p-8 text-center text-gray-500">
                  <p>Haz un test para ver resultados...</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {results.map((result, idx) => (
                    <div
                      key={idx}
                      className={`rounded-lg border-l-4 p-4 ${
                        result.status === 200
                          ? "border-green-500 bg-green-50"
                          : "border-red-500 bg-red-50"
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div>
                          <span className="font-mono text-sm font-semibold">
                            {result.method} - Status: {result.status}
                          </span>
                          <p className="text-xs text-gray-600">{result.timestamp}</p>
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(
                              JSON.stringify(result.data, null, 2)
                            );
                            toast.success("Copiado al portapapeles");
                          }}
                          className="rounded bg-blue-500 px-3 py-1 text-xs text-white hover:bg-blue-600"
                        >
                          📋 Copiar
                        </button>
                      </div>
                      <pre className="break-words rounded-lg bg-gray-900 p-3 text-xs text-green-400 overflow-x-auto">
                        {JSON.stringify(result.data, null, 2).substring(0, 1000)}
                        {JSON.stringify(result.data, null, 2).length > 1000 &&
                          "\n... (truncado)"}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
