import { useState } from "react";
import { toast } from "sonner";
import PageMeta from "@/components/common/PageMeta";
import { DownloadIcon, CheckCircleIcon } from "@/icons";

interface SISGEDData {
  success?: boolean;
  statusCode?: number;
  data?: any[];
}

export default function SincronizarSISGED() {
  const [token, setToken] = useState("");
  const [sisgedData, setSISGEDData] = useState<SISGEDData | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState("");

  const BACKEND_URL = "http://localhost:3003";
  const SISGED_URL = "https://sisgedpiloto.ana.gob.pe/apiRestSG/api/SISGED/general?CUT_MIDAGRI=&NRO_DOCUMENTO=&ASUNTO=&ID_TIPO_DOCUMENTO=0&ID_ESTADO_DOCUMENTO=0&ID_OFICINA=0&ID_USUARIO=0&FEC_INICIO=01%2F09%2F2026&FEC_FIN=24%2F09%2F2026&NRO_CUT=&NRO_TICKET=&REFERENCIA=&DESTINOS=&USUARIO_REMITENTE=aliaga+romayna&ID_TUPA_REQUISITO=0&ID_TUPA=0&NRO_EXPEDIENTE=&ID_TIPO_PERSONA=0&NRO_DOC_PERSONA=&FLG_BORRADOR=0&FLG_ANEXO=0";

  const obtenerDatos = async () => {
    if (!token.trim()) {
      toast.error("Token requerido");
      return;
    }

    setLoading(true);
    setImportStatus("");
    try {
      const response = await fetch(`${BACKEND_URL}/api/sisged/proxy`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: SISGED_URL }),
      });

      const result = await response.json();
      setSISGEDData(result);

      if (result.success) {
        const count = Array.isArray(result.data) ? result.data.flat().length : 0;
        toast.success(`✅ ${count} expedientes obtenidos`);

        // Auto-importar automáticamente
        setImportStatus("Importando...");
        await importarAutomatico(result, token);
      } else {
        toast.error(`❌ Error: ${result.statusCode}`);
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const importarAutomatico = async (data: SISGEDData, authToken: string) => {
    setImporting(true);
    try {
      // Extraer datos (puede ser array de arrays o array simple)
      if (!data.data) {
        toast.error("No hay datos para importar");
        setImporting(false);
        return;
      }

      const datosArray = Array.isArray(data.data[0]) ? data.data[0] : data.data;

      if (!datosArray || datosArray.length === 0) {
        toast.error("No hay datos para importar");
        return;
      }

      let exitosos = 0;
      let errores = 0;

      for (let i = 0; i < datosArray.length; i++) {
        const item = datosArray[i];

        try {
          const expediente = {
            cut: item.ncut || "",
            asunto: item.asunto || "Sin asunto",
            remitente: item.usurem?.split('\r')?.[0]?.trim() || item.ofirem || "Desconocido",
            numero_documento: item.ndoc || "",
            tipo_procedimiento: item.proced || "OTROS",
            estupa: item.estupa || "NO TUPA",
            periodo: new Date().getFullYear().toString(),
            id_usuario_creador: 1,
          };

          const response = await fetch(`${BACKEND_URL}/api/expedientes`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${authToken}`,
            },
            body: JSON.stringify(expediente),
          });

          if (response.ok) {
            exitosos++;
          } else {
            errores++;
          }

          // Actualizar status cada 10 items
          if ((i + 1) % 10 === 0) {
            setImportStatus(`Importando: ${i + 1}/${datosArray.length}`);
          }
        } catch (err) {
          errores++;
        }
      }

      setImportStatus(`✅ Completado: ${exitosos} exitosos, ${errores} errores`);
      toast.success(`✅ Importación completada: ${exitosos} expedientes guardados`);

      // Limpiar después de 3 segundos
      setTimeout(() => {
        setSISGEDData(null);
        setToken("");
        setImportStatus("");
      }, 3000);
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
      setImportStatus("");
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <PageMeta title="Sincronizar SISGED" description="Importar datos de SISGED" />
      <div className="space-y-6 p-6">
        <h1 className="text-3xl font-bold">🔄 Sincronizar SISGED</h1>

        {/* Panel de entrada simple */}
        <div className="rounded-lg bg-white p-6 shadow max-w-md">
          <h2 className="mb-4 text-lg font-semibold">📥 Token SISGED</h2>

          <textarea
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Pega tu token JWT aquí"
            className="w-full rounded-lg border border-gray-300 bg-gray-50 p-3 font-mono text-sm mb-4"
            rows={3}
          />

          <button
            onClick={obtenerDatos}
            disabled={loading || importing}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <DownloadIcon className="h-5 w-5" />
            {loading ? "Obteniendo..." : importing ? "Importando..." : "Sincronizar"}
          </button>

          {importStatus && (
            <div className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
              {importStatus}
            </div>
          )}
        </div>

        {/* Resultado final */}
        {sisgedData?.success && (
          <div className="rounded-lg bg-green-50 p-4 border border-green-200 max-w-md">
            <h3 className="font-semibold text-green-900 flex items-center gap-2">
              <CheckCircleIcon className="h-5 w-5" />
              Sincronización Exitosa
            </h3>
            <p className="mt-2 text-sm text-green-800">
              Los datos de SISGED se han importado a tu sistema. Puedes revisarlos en el módulo Expedientes.
            </p>
          </div>
        )}

        {sisgedData && !sisgedData.success && (
          <div className="rounded-lg bg-red-50 p-4 border border-red-200 max-w-md">
            <p className="text-sm text-red-800">
              ❌ Error al obtener datos: {sisgedData.statusCode}
            </p>
          </div>
        )}

        {/* Info */}
        <div className="rounded-lg bg-blue-50 p-4 border border-blue-200 max-w-md">
          <h3 className="font-semibold text-blue-900">ℹ️ Cómo usar:</h3>
          <ol className="mt-2 space-y-1 text-sm text-blue-800 list-decimal list-inside">
            <li>Pega tu token JWT de SISGED</li>
            <li>Presiona "Sincronizar"</li>
            <li>¡Listo! Los datos se importan automáticamente</li>
          </ol>
        </div>
      </div>
    </>
  );
}
