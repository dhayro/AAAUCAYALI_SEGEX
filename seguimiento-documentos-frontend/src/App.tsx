import { Route, BrowserRouter as Router, Routes, Navigate } from "react-router";
import { ScrollToTop } from "./components/common/ScrollToTop";
import { Toaster } from "sonner";
import AppLayout from "./layout/AppLayout";
import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";
import Calendar from "./pages/Calendar";
import BarChart from "./pages/Charts/BarChart";
import LineChart from "./pages/Charts/LineChart";
import Home from "./pages/Inicio";
import MonitorLlamadas from "./pages/MonitorLlamadas";
import FormElements from "./pages/Forms/FormElements";
import Blank from "./pages/OtherPage/Blank";
import NotFound from "./pages/OtherPage/NotFound";
import BasicTables from "./pages/Tables/BasicTables";
import Alerts from "./pages/UiElements/Alerts";
import Avatars from "./pages/UiElements/Avatars";
import Badges from "./pages/UiElements/Badges";
import Buttons from "./pages/UiElements/Buttons";
import Images from "./pages/UiElements/Images";
import Videos from "./pages/UiElements/Videos";
import UserProfiles from "./pages/UserProfiles";
import Documentos from "./pages/Documentos";
import Expedientes from "./pages/Expedientes";
import Usuarios from "./pages/Usuarios";
import Areas from "./pages/Areas";
import Cargos from "./pages/Cargos";
import TiposDocumentos from "./pages/TiposDocumentos";
import Procedimientos from "./pages/Procedimientos";
import AsignacionExpediente from "./pages/AsignacionExpediente";
import Prorrogas from "./pages/Prorrogas";
import Llamadas from "./pages/Llamadas";
import AccionesAtencion from "./pages/AccionesAtencion";
import EvaluacionRespuestas from "./pages/EvaluacionRespuestas";
import DocumentosNoAsignados from "./pages/DocumentosNoAsignados";
import DocumentosProrroga from "./pages/DocumentosProrroga";
import DocumentosRespuestas from "./pages/DocumentosRespuestas";
import ReporteAsignaciones from "./pages/ReporteAsignaciones";
import ReporteLlamadas from "./pages/ReporteLlamadas";
import ReporteProductividad from "./pages/ReporteProductividad";
import ReporteProrrogas from "./pages/ReporteProrrogas";
import ReporteExpedientesSinAsignar from "./pages/ReporteExpedientesSinAsignar";
import ReporteAcciones from "./pages/ReporteAcciones";
import ReporteHistorialCut from "./pages/ReporteHistorialCut";
import ReporteResumen from "./pages/ReporteResumen";
import MiDesempenoPagina from "./pages/MiDesempeno";
import SISGED from "./pages/SISGED";
import ImportarSISGED from "./pages/ImportarSISGED";
import SincronizarDatos from "./pages/SISGED/SincronizarDatos";
import AdminTokens from "./pages/SISGED/AdminTokens";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem("token");
  if (!token) {
    return <Navigate to="/signin" replace />;
  }
  return children;
};

export default function App() {
  return (
    <>
      <Router>
        <ScrollToTop />
        <Toaster position="top-right" />
        <Routes>
          {/* Auth Layout */}
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />

          {/* Monitor a pantalla completa, sin menús */}
          <Route
            path="/monitor-llamadas"
            element={
              <ProtectedRoute>
                <MonitorLlamadas />
              </ProtectedRoute>
            }
          />

          {/* Dashboard Layout - Protected */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index path="/" element={<Home />} />

            {/* Módulos principales */}
            <Route path="/documentos" element={<Documentos />} />
            <Route path="/documentos-sin-asignar" element={<DocumentosNoAsignados />} />
            <Route path="/documentos-prorroga" element={<DocumentosProrroga />} />
            <Route path="/documentos-respuestas" element={<DocumentosRespuestas />} />
            <Route path="/reporte-asignaciones" element={<ReporteAsignaciones />} />
            <Route path="/reporte-llamadas" element={<ReporteLlamadas />} />
            <Route path="/reporte-productividad" element={<ReporteProductividad />} />
            <Route path="/reporte-prorrogas" element={<ReporteProrrogas />} />
            <Route path="/reporte-sin-asignar" element={<ReporteExpedientesSinAsignar />} />
            <Route path="/reporte-acciones" element={<ReporteAcciones />} />
            <Route path="/reporte-historial" element={<ReporteHistorialCut />} />
            <Route path="/reporte-resumen" element={<ReporteResumen />} />
            <Route path="/mi-desempeno" element={<MiDesempenoPagina />} />
            <Route path="/expedientes" element={<Expedientes />} />
            <Route path="/usuarios" element={<Usuarios />} />
            <Route path="/areas" element={<Areas />} />
            <Route path="/cargos" element={<Cargos />} />
            <Route path="/tipos-documentos" element={<TiposDocumentos />} />
            <Route path="/procedimientos" element={<Procedimientos />} />
            <Route path="/asignacion-expediente" element={<AsignacionExpediente />} />
            <Route path="/prorrogas" element={<Prorrogas />} />
            <Route path="/llamadas" element={<Llamadas />} />
            <Route path="/acciones-atencion" element={<AccionesAtencion />} />
            <Route path="/evaluacion-respuestas" element={<EvaluacionRespuestas />} />

            {/* Others Page */}
            <Route path="/profile" element={<UserProfiles />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/blank" element={<Blank />} />
            <Route path="/sisged" element={<SISGED />} />
            <Route path="/importar-sisged" element={<ImportarSISGED />} />
            <Route path="/sincronizar-sisged" element={<SincronizarDatos />} />
            <Route path="/admin-sisged-tokens" element={<AdminTokens />} />

            {/* Forms */}
            <Route path="/form-elements" element={<FormElements />} />

            {/* Tables */}
            <Route path="/basic-tables" element={<BasicTables />} />

            {/* Ui Elements */}
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/avatars" element={<Avatars />} />
            <Route path="/badge" element={<Badges />} />
            <Route path="/buttons" element={<Buttons />} />
            <Route path="/images" element={<Images />} />
            <Route path="/videos" element={<Videos />} />

            {/* Charts */}
            <Route path="/line-chart" element={<LineChart />} />
            <Route path="/bar-chart" element={<BarChart />} />
          </Route>

          {/* Default route */}
          <Route path="/" element={<Navigate to="/signin" />} />

          {/* Fallback Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </>
  );
}
