import React from 'react';
import { Drawer, List, ListItem, ListItemIcon, ListItemText, Box } from '@mui/material';
import { 
  Dashboard as DashboardIcon, 
  Description as DocumentIcon, 
  Folder as ExpedienteIcon, 
  Work as CargoIcon,
  AccountTree as AreaIcon // Importamos el icono para Áreas
} from '@mui/icons-material';
import { Link } from 'react-router-dom';

const Sidebar = ({ mobileOpen, handleDrawerToggle, drawerWidth }) => {
  const drawerContent = (
    <List>
      <ListItem component={Link} to="/" onClick={handleDrawerToggle}>
        <ListItemIcon><DashboardIcon /></ListItemIcon>
        <ListItemText primary="Dashboard" />
      </ListItem>
      <ListItem component={Link} to="/documentos" onClick={handleDrawerToggle}>
        <ListItemIcon><DocumentIcon /></ListItemIcon>
        <ListItemText primary="Documentos" />
      </ListItem>
      <ListItem component={Link} to="/expedientes" onClick={handleDrawerToggle}>
        <ListItemIcon><ExpedienteIcon /></ListItemIcon>
        <ListItemText primary="Expedientes" />
      </ListItem>
      <ListItem component={Link} to="/cargos" onClick={handleDrawerToggle}>
        <ListItemIcon><CargoIcon /></ListItemIcon>
        <ListItemText primary="Cargos" />
      </ListItem>
      {/* Nuevo elemento para Áreas */}
      <ListItem component={Link} to="/areas" onClick={handleDrawerToggle}>
        <ListItemIcon><AreaIcon /></ListItemIcon>
        <ListItemText primary="Áreas" />
      </ListItem>
    </List>
  );

  return (
    <Box
      component="nav"
      sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      aria-label="mailbox folders"
    >
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { 
            boxSizing: 'border-box', 
            width: drawerWidth,
            top: '64px', // Altura del AppBar
            height: 'calc(100% - 64px)' // Resta la altura del AppBar
          },
        }}
      >
        {drawerContent}
      </Drawer>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': { 
            boxSizing: 'border-box', 
            width: drawerWidth,
            top: '64px', // Altura del AppBar
            height: 'calc(100% - 64px)' // Resta la altura del AppBar
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
};

export default Sidebar;