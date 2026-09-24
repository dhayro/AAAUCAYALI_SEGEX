import { useState } from "react";
import { toast } from "sonner";
import PageMeta from "@/components/common/PageMeta";

export default function SISGED() {
  const [token, setToken] = useState(
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1lIjoicHJlbWdpZm8iLCJleHAiOjE3OTAzMTIzOTksImlzcyI6IlNJU0dFRElzc3VlciIsImF1ZCI6IlNJU0dFREF1ZGllbmNlIn0.9RFhp_68N9cFgBbUj199wxQlxjmtyAPexr4CZggmJj4"
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const SISGED_URL =
    "https://sisgedpiloto.ana.gob.pe/apiRestSG/api/SISGED/general?CUT_MIDAGRI=&NRO_DOCUMENTO=&ASUNTO=&ID_TIPO_DOCUMENTO=0&ID_ESTADO_DOCUMENTO=0&ID_OFICINA=0&ID_USUARIO=0&FEC_INICIO=01%2F09%2F2026&FEC_FIN=24%2F09%2F2026&NRO_CUT=&NRO_TICKET=&REFERENCIA=&DESTINOS=&USUARIO_REMITENTE=aliaga+romayna&ID_TUPA_REQUISITO=0&ID_TUPA=0&NRO_EXPEDIENTE=&ID_TIPO_PERSONA=0&NRO_DOC_PERSONA=&FLG_BORRADOR=0&FLG_ANEXO=0";

  const obtenerDatos = async () => {
    if (!token.trim()) {
      toast.error("Token requerido");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      toast.info("⏳ Obteniendo datos de SISGED (espera...)...");

      // Usar backend como proxy para evitar problemas de CORS del navegador
      const response = await fetch("http://localhost:3003/api/sisged/proxy", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: SISGED_URL }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResult(data.data);
        toast.success("✅ Datos obtenidos de SISGED");
      } else {
        setError(`Error: ${data.error || data.statusCode}`);
        toast.error(`Error: ${data.error || data.statusCode}`);
      }
    } catch (err: any) {
      setError(err.message);
      toast.error(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageMeta title="SISGED" description="Conexión directa a SISGED" />
      <div className="space-y-6 p-6">
        <h1 className="text-3xl font-bold">🔗 SISGED Directo</h1>

        {/* Token Input */}
        <div className="rounded-lg bg-white p-6 shadow max-w-2xl">
          <label className="block text-sm font-semibold mb-2">Token JWT</label>
          <textarea
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="w-full rounded-lg border border-gray-300 p-3 font-mono text-xs mb-4"
            rows={2}
          />
          <button
            onClick={obtenerDatos}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-semibold"
          >
            {loading ? "⏳ Obteniendo... (puede demorar)" : "Obtener Datos"}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 max-w-4xl">
            <p className="text-red-800 font-semibold">Error:</p>
            <pre className="text-xs text-red-700 mt-2 overflow-auto bg-red-100 p-2 rounded">
              {error}
            </pre>
          </div>
        )}

        {/* Result JSON */}
        {result && (
          <div className="rounded-lg bg-green-50 border border-green-200 p-4 max-w-4xl">
            <p className="text-green-800 font-semibold mb-2">✅ Resultado:</p>
            <pre className="text-xs text-green-900 overflow-auto bg-white p-3 rounded border border-green-300 max-h-96">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        {/* Info */}
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 max-w-2xl">
          <p className="text-blue-900 font-semibold">ℹ️ Llamada Directa a SISGED</p>
          <p className="text-sm text-blue-800 mt-2">
            Esta página llama directamente a SISGED sin pasar por el backend.
          </p>
        </div>
      </div>
    </>
  );
}
