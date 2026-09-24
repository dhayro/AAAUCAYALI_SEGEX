import { useState } from "react";

export default function Diagnostico() {
  const [results, setResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  const testBackendConnection = async () => {
    setLoading(true);
    const testResults: Record<string, any> = {};

    // Test 1: Backend health check
    try {
      const response = await fetch("http://localhost:3003/health");
      testResults.health = {
        status: response.status,
        data: await response.json(),
      };
    } catch (error: any) {
      testResults.health = { error: error.message };
    }

    // Test 2: Backend CORS with Authorization
    try {
      const response = await fetch("http://localhost:3003/api/sisged/general", {
        method: "GET",
        headers: {
          Authorization: "Bearer test-token",
        },
      });
      testResults.cors = {
        status: response.status,
        statusText: response.statusText,
      };
    } catch (error: any) {
      testResults.cors = { error: error.message };
    }

    // Test 3: Browser info
    testResults.browser = {
      url: window.location.href,
      protocol: window.location.protocol,
      hostname: window.location.hostname,
      port: window.location.port,
    };

    // Test 4: Network test
    try {
      const response = await fetch("http://localhost:3003/api-docs");
      testResults.apiDocs = {
        status: response.status,
        ok: response.ok,
      };
    } catch (error: any) {
      testResults.apiDocs = { error: error.message };
    }

    setResults(testResults);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-8 text-4xl font-bold">🔧 Diagnóstico de Conectividad</h1>

        <button
          onClick={testBackendConnection}
          disabled={loading}
          className="mb-8 rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Testeando..." : "Ejecutar Tests"}
        </button>

        <div className="space-y-4">
          {Object.entries(results).map(([key, value]) => (
            <div key={key} className="rounded-lg bg-white p-4 shadow">
              <h2 className="mb-2 text-lg font-semibold capitalize">{key}</h2>
              <pre className="break-words overflow-auto rounded bg-gray-900 p-3 text-sm text-green-400">
                {JSON.stringify(value, null, 2)}
              </pre>
            </div>
          ))}
        </div>

        {Object.keys(results).length > 0 && (
          <div className="mt-8 rounded-lg bg-yellow-50 p-4">
            <h3 className="font-semibold text-yellow-800">📋 Interpretación:</h3>
            <ul className="mt-2 space-y-2 text-sm text-yellow-700">
              <li>
                <strong>health:</strong> Si ve status 200 = Backend está corriendo ✓
              </li>
              <li>
                <strong>cors:</strong> Si ve status 401 = CORS funciona, token inválido ✓
              </li>
              <li>
                <strong>browser:</strong> Confirma puerto del frontend (localhost:3004)
              </li>
              <li>
                <strong>apiDocs:</strong> Si ve status 200 = Backend totalmente accesible ✓
              </li>
              <li>
                <strong>Si alguno dice "error":</strong> Network issue o firewall bloqueando
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
