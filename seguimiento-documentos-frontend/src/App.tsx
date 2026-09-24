import { Route, BrowserRouter as Router, Routes, Navigate } from "react-router";
import { ScrollToTop } from "./components/common/ScrollToTop";
import { Toaster } from "sonner";
import AppLayout from "./layout/AppLayout";
import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";
import Calendar from "./pages/Calendar";
import BarChart from "./pages/Charts/BarChart";
import LineChart from "./pages/Charts/LineChart";
import Home from "./pages/Dashboard/Ecommerce";
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
import DocumentosNoAsignados from "./pages/DocumentosNoAsignados";
import DocumentosProrroga from "./pages/DocumentosProrroga";
import DocumentosRespuestas from "./pages/DocumentosRespuestas";
import ReporteAsignaciones from "./pages/ReporteAsignaciones";
import ReporteDocumentosRespuestas from "./pages/ReporteDocumentosRespuestas";
import TestMenu from "./pages/TestMenu";
import Diagnostico from "./pages/Diagnostico";
import SincronizarSISGED from "./pages/SincronizarSISGED";

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
            <Route path="/reporte-respuestas" element={<ReporteDocumentosRespuestas />} />
            <Route path="/expedientes" element={<Expedientes />} />
            <Route path="/usuarios" element={<Usuarios />} />
            <Route path="/areas" element={<Areas />} />
            <Route path="/cargos" element={<Cargos />} />
            <Route path="/tipos-documentos" element={<TiposDocumentos />} />

            {/* Others Page */}
            <Route path="/profile" element={<UserProfiles />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/blank" element={<Blank />} />
            <Route path="/test-menu" element={<TestMenu />} />
            <Route path="/diagnostico" element={<Diagnostico />} />
            <Route path="/sincronizar-sisged" element={<SincronizarSISGED />} />

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
