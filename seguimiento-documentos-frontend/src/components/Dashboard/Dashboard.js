import React from 'react';
import { Typography, Grid, Paper, Box } from '@mui/material';
import { Description, Folder, People } from '@mui/icons-material';

const Dashboard = () => {
  // Eliminamos la línea de useTheme si no la estamos usando
  // const theme = useTheme();

  const DashboardItem = ({ title, icon, count }) => (
    <Grid item xs={12} sm={6} md={4}>
      <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
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
        <DashboardItem 
          title="Documentos Pendientes" 
          icon={<Description fontSize="large" color="primary" />} 
          count={15} 
        />
        <DashboardItem 
          title="Expedientes Activos" 
          icon={<Folder fontSize="large" color="primary" />} 
          count={8} 
        />
        <DashboardItem 
          title="Usuarios Activos" 
          icon={<People fontSize="large" color="primary" />} 
          count={42} 
        />
      </Grid>
    </Box>
  );
};

export default Dashboard;