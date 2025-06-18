import React, { useState, useEffect } from 'react';
import { Typography, Grid, Paper, Box } from '@mui/material';
import { Description, Folder } from '@mui/icons-material';
import { getExpedientes, getAsignaciones, getAsignacionesConProrrogaPendiente, getRespuestas } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from "jwt-decode"; // Ensure correct import

const Dashboard = () => {
  const [expedientesCount, setExpedientesCount] = useState(0);
  const [asignacionesCount, setAsignacionesCount] = useState(0);
  const [prorrogasCount, setProrrogasCount] = useState(0);
  const [respuestasCount, setRespuestasCount] = useState(0);
  const [currentUserperfil, setCurrentUserperfil] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decodedToken = jwtDecode(token);
        setCurrentUserperfil(decodedToken.perfil);
      } catch (error) {
        console.error("Error al decodificar el token:", error);
      }
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch data available to all users
        const asignacionesResponse = await getAsignaciones();
        setAsignacionesCount(asignacionesResponse.data.totalAsignaciones || 0);

        // Fetch additional data based on user profile
        if (currentUserperfil === 'jefe' || currentUserperfil === 'admin' || currentUserperfil === 'secretaria') {
          const expedientesResponse = await getExpedientes();
          setExpedientesCount(expedientesResponse.data.totalExpedientes || 0);

          const prorrogasResponse = await getAsignacionesConProrrogaPendiente();
          setProrrogasCount(prorrogasResponse.data.totalAsignaciones || 0);

          const respuestasResponse = await getRespuestas();
          setRespuestasCount(respuestasResponse.data.totalRespuestas || 0);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };

    fetchData();
  }, [currentUserperfil]); // Add currentUserperfil as a dependency

  const DashboardItem = ({ title, icon, count, onClick }) => (
    <Grid item xs={12} sm={6} md={4}>
      <Paper elevation={3} sx={{ p: 2, height: '100%', cursor: 'pointer' }} onClick={onClick}>
        <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100%">
          {icon}
          <Typography variant="h6" align="center" sx={{ mt: 2 }}>
            {title}
          </Typography>
          <Typography variant="h4" color="primary" sx={{ mt: 1 }}>
            {count}
          </Typography>
        </Box>
      </Paper>
    </Grid>
  );

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Grid container spacing={3}>
        {(currentUserperfil === 'personal') && (
          <>
            <DashboardItem
              title="Documentos Asignados"
              icon={<Description fontSize="large" color="primary" />}
              count={asignacionesCount}
              onClick={() => navigate('/documentos')}
            />
          </>
        )}
        {(currentUserperfil === 'jefe' || currentUserperfil === 'admin' || currentUserperfil === 'secretaria') && (
          <>
            <DashboardItem
              title="Expedientes Activos"
              icon={<Folder fontSize="large" color="primary" />}
              count={expedientesCount}
              onClick={() => navigate('/expedientes')}
            />
            <DashboardItem
              title="Documentos Asignados"
              icon={<Description fontSize="large" color="primary" />}
              count={asignacionesCount}
              onClick={() => navigate('/documentos')}
            />
            <DashboardItem
              title="Documentos con Prórrogas"
              icon={<Description fontSize="large" color="primary" />}
              count={prorrogasCount}
              onClick={() => navigate('/documentos-prorroga')}
            />
            <DashboardItem
              title="Documentos con Respuestas"
              icon={<Description fontSize="large" color="primary" />}
              count={respuestasCount}
              onClick={() => navigate('/documentos-respuestas')}
            />
          </>
        )}
      </Grid>
    </Box>
  );
};

export default Dashboard;