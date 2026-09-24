import { useState } from "react";
import { toast } from "sonner";
import PageMeta from "@/components/common/PageMeta";

export default function ImportarSISGED() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      toast.success(`✅ Archivo seleccionado: ${selectedFile.name}`);
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error("Selecciona un archivo JSON");
      return;
    }

    setLoading(true);
    setProgress("Leyendo archivo...");

    try {
      const text = await file.text();
      let data = JSON.parse(text);

      setProgress("Procesando datos...");

      // Si es un objeto con propiedades, extraer el array
      if (!Array.isArray(data)) {
        data = Object.values(data).flat();
      }

      if (!Array.isArray(data)) {
        throw new Error("El archivo no contiene un array válido");
      }

      // Mapear datos a estructura de expedientes
      const expedientes = data.map((row: any, index: number) => {
        let cut, asunto, usuario, documento, referencia;

        try {
          if (Array.isArray(row)) {
            [, , , , cut, documento, asunto, referencia, , usuario] = row;
          } else if (typeof row === "object") {
            cut = row.cut || row.ncut || row.CUT || "";
            asunto = row.asunto || row.subject || row.ASUNTO || "";
            usuario = row.usuario || row.user || row.USUARIO || "";
            documento = row.documento || row.ndoc || row.DOCUMENTO || "";
            referencia = row.referencia || row.refe || row.REFERENCIA || "";
          }
        } catch (e) {
          console.error("Error parseando fila", index, e);
        }

        return {
          cut: cut || `EXP-${index}`,
          asunto: asunto || "Sin asunto",
          remitente: usuario?.split?.("\n")?.[0] || "Desconocido",
          numero_documento: documento || referencia || `DOC-${index}`,
          tipo_procedimiento: "SISGED",
          estupa: "NO TUPA",
          periodo: new Date().getFullYear().toString(),
          id_usuario_creador: 1,
        };
      });

      setProgress(`Importando ${expedientes.length} expedientes...`);

      let exitosos = 0;
      let errores = 0;

      for (let i = 0; i < expedientes.length; i++) {
        try {
          const response = await fetch("http://localhost:3003/api/expedientes", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify(expedientes[i]),
          });

          if (response.ok) {
            exitosos++;
          } else {
            errores++;
          }

          if ((i + 1) % 5 === 0) {
            setProgress(`Importados: ${exitosos}/${expedientes.length}`);
          }
        } catch (err) {
          errores++;
        }
      }

      setProgress(`✅ Completado: ${exitosos} exitosos, ${errores} errores`);
      toast.success(`✅ ${exitosos} expedientes importados`);

      setTimeout(() => {
        setFile(null);
        setProgress("");
        setLoading(false);
      }, 2000);

    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
      setProgress("");
      setLoading(false);
    }
  };

  return (
    <>
      <PageMeta title="Importar SISGED" description="Importar datos desde JSON" />
      <div className="space-y-6 p-6">
        <h1 className="text-3xl font-bold">📥 Importar Datos SISGED</h1>

        <div className="rounded-lg bg-white p-6 shadow max-w-2xl">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">
                Selecciona archivo JSON
              </label>
              <input
                type="file"
                accept=".json"
                onChange={handleFileChange}
                disabled={loading}
                className="block w-full text-sm border border-gray-300 rounded-lg p-2 mb-4 disabled:opacity-50"
              />
              {file && (
                <p className="text-sm text-green-600">
                  ✅ {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>

            <button
              onClick={handleImport}
              disabled={!file || loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-3 rounded-lg font-semibold"
            >
              {loading ? "Importando..." : "Importar"}
            </button>

            {progress && (
              <div className="rounded-lg bg-blue-50 p-3 border border-blue-200">
                <p className="text-sm text-blue-800">{progress}</p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg bg-green-50 p-4 border border-green-200 max-w-2xl">
          <h3 className="font-semibold text-green-900 mb-2">✅ Pasos:</h3>
          <ol className="text-sm text-green-800 space-y-1 list-decimal list-inside">
            <li>Descargar JSON desde SISGED (consola del navegador)</li>
            <li>Seleccionar el archivo aquí</li>
            <li>Presionar "Importar"</li>
            <li>Los datos se guardan automáticamente</li>
          </ol>
        </div>
      </div>
    </>
  );
}
