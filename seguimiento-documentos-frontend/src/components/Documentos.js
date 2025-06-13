import React, { useState, useEffect, useCallback, useRef } from 'react';
import { debounce } from 'lodash';
import {
  Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, TextField, InputAdornment, Box, Typography, Chip,
  CircularProgress, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  styled
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
// Remove the unused import
// import DescriptionIcon from '@mui/icons-material/Description';
import api from '../services/api';
// import Swal from 'sweetalert2';

// Styled components
const StyledTableRow = styled(TableRow)(({ theme }) => ({
  '&:nth-of-type(odd)': {
    backgroundColor: theme.palette.action.hover,
  },
  '&:hover': {
    backgroundColor: theme.palette.action.selected,
  },
}));

const StyledButton = styled(Button)(({ theme }) => ({
  textTransform: 'none',
  margin: theme.spacing(0.5),
  minWidth: '80px',
}));

const Documentos = () => {
  // State variables
  const [asignaciones, setAsignaciones] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState({
    filtro: '',
    cut: '',
    remitente: '',
    documento: '',
    usuario: ''
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedAsignacion, setSelectedAsignacion] = useState(null);
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);

  // Function to show error alerts
  const showErrorAlert = useCallback((message) => {
    setErrorMessage(message);
    setTimeout(() => {
      setErrorMessage('');
    }, 3000);
  }, []);

  // Use the showSweetAlert function directly where needed instead of defining it separately
  // This will remove the unused variable warning
  
  // Function to fetch paginated asignaciones
  const fetchPaginatedAsignaciones = useCallback(async (currentFilters, currentPagination) => {
    setIsLoading(true);
    try {
      const response = await api.get('/asignaciones', {
        params: {
          page: currentPagination.pageIndex + 1,
          limit: currentPagination.pageSize,
          cut: currentFilters.cut,
          remitente: currentFilters.remitente,
          documento: currentFilters.documento,
          usuario: currentFilters.usuario,
          filtro: currentFilters.filtro,
        },
      });
      
      if (response.data && response.data.asignaciones) {
        setAsignaciones(response.data.asignaciones);
        setTotalCount(response.data.totalAsignaciones);
      } else {
        console.error('Unexpected response format:', response.data);
        showErrorAlert('Formato de respuesta inesperado del servidor.');
      }
    } catch (error) {
      console.error('Error fetching asignaciones:', error);
      showErrorAlert('Error al cargar las asignaciones. Por favor, intente de nuevo más tarde.');
    } finally {
      setIsLoading(false);
    }
  }, [showErrorAlert]);

  // Debounce the fetch function to avoid too many API calls
  const debouncedFetchAsignaciones = useRef(
    debounce((newFilters, newPagination) => {
      fetchPaginatedAsignaciones(newFilters, newPagination);
    }, 300)
  ).current;

  // Effect to fetch data when filters or pagination change
  useEffect(() => {
    debouncedFetchAsignaciones(filters, pagination);
  }, [filters, pagination, debouncedFetchAsignaciones]);

  // Effect to add custom styles for SweetAlert
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .my-swal {
        z-index: 9999;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Handle filter changes
  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters(prevFilters => ({
      ...prevFilters,
      [name]: value
    }));
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  };

  // Handle pagination changes
  const handleChangePage = (event, newPage) => {
    setPagination(old => ({ ...old, pageIndex: newPage }));
  };

  const handleChangeRowsPerPage = (event) => {
    const newPageSize = parseInt(event.target.value, 10);
    setPagination({ pageIndex: 0, pageSize: newPageSize });
  };

  // Format date function
  const formatDate = (dateString) => {
    if (!dateString) return "No especificada";
    const date = new Date(dateString);
    return date.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Calculate days remaining
  const calculateDaysRemaining = (dueDate) => {
    if (!dueDate) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  // Get status color based on days remaining
  const getStatusColor = (daysRemaining) => {
    if (daysRemaining === null) return "default";
    if (daysRemaining < 0) return "error";
    if (daysRemaining === 0) return "warning";
    if (daysRemaining <= 2) return "warning";
    return "success";
  };

  // Handle opening details dialog
  const handleOpenDetails = (asignacion) => {
    setSelectedAsignacion(asignacion);
    setOpenDetailsDialog(true);
  };

  // Handle closing details dialog
  const handleCloseDetails = () => {
    setOpenDetailsDialog(false);
    setSelectedAsignacion(null);
  };

  return (
    <div>
      <h2>Documentos Asignados</h2>
      
      {/* Search and filter section */}
      <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
        <TextField
          name="filtro"
          value={filters.filtro}
          onChange={handleFilterChange}
          placeholder="Buscar en todos los campos"
          variant="outlined"
          size="small"
          sx={{ flexGrow: 1 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Error message display */}
      {errorMessage && (
        <Box sx={{ mb: 2, p: 1, bgcolor: 'error.light', color: 'error.contrastText', borderRadius: 1 }}>
          {errorMessage}
        </Box>
      )}

      {/* Table of asignaciones */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Item</TableCell>
              <TableCell>
                CUT
                <TextField
                  name="cut"
                  value={filters.cut}
                  onChange={handleFilterChange}
                  placeholder="Filtrar por CUT"
                  variant="outlined"
                  size="small"
                  fullWidth
                  margin="dense"
                />
              </TableCell>
              <TableCell>
                Remitente
                <TextField
                  name="remitente"
                  value={filters.remitente}
                  onChange={handleFilterChange}
                  placeholder="Filtrar por remitente"
                  variant="outlined"
                  size="small"
                  fullWidth
                  margin="dense"
                />
              </TableCell>
              <TableCell>
                Documento
                <TextField
                  name="documento"
                  value={filters.documento}
                  onChange={handleFilterChange}
                  placeholder="Filtrar por documento"
                  variant="outlined"
                  size="small"
                  fullWidth
                  margin="dense"
                />
              </TableCell>
              <TableCell>Fecha Documento</TableCell>
              <TableCell>Fecha Asignación</TableCell>
              <TableCell>Fecha Vencimiento</TableCell>
              <TableCell>
                Persona Asignada
                <TextField
                  name="usuario"
                  value={filters.usuario}
                  onChange={handleFilterChange}
                  placeholder="Filtrar por usuario"
                  variant="outlined"
                  size="small"
                  fullWidth
                  margin="dense"
                />
              </TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={10} align="center">
                  <CircularProgress size={24} />
                  <Typography variant="body2" sx={{ ml: 1 }}>
                    Cargando...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : asignaciones.length > 0 ? (
              asignaciones.map((asignacion, index) => {
                const daysRemaining = calculateDaysRemaining(asignacion.fecha_vencimiento);
                const statusColor = getStatusColor(daysRemaining);
                
                return (
                  <StyledTableRow 
                    key={asignacion.id}
                    hover
                    onClick={() => handleOpenDetails(asignacion)}
                    style={{ cursor: 'pointer' }}
                  >
                    <TableCell>{pagination.pageIndex * pagination.pageSize + index + 1}</TableCell>
                    <TableCell>{asignacion.expediente?.cut || 'N/A'}</TableCell>
                    <TableCell>{asignacion.expediente?.remitente || 'N/A'}</TableCell>
                    <TableCell>
                      {asignacion.documento?.TipoDocumento?.nombre || 'N/A'} {asignacion.documento?.numero_documento || ''}
                    </TableCell>
                    <TableCell>{formatDate(asignacion.documento?.fecha_documento)}</TableCell>
                    <TableCell>{formatDate(asignacion.fecha_asignacion)}</TableCell>
                    <TableCell>{formatDate(asignacion.fecha_vencimiento)}</TableCell>
                    <TableCell>
                    {asignacion.usuario?.nombre || ''} {asignacion.usuario?.apellido || ''}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={daysRemaining === null 
                          ? "Sin fecha"
                          : daysRemaining < 0 
                            ? "Vencido" 
                            : daysRemaining === 0 
                              ? "Hoy" 
                              : `${daysRemaining} día(s)`}
                        color={statusColor}
                      />
                    </TableCell>
                    <TableCell>
                      <StyledButton
                        variant="contained"
                        color="primary"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetails(asignacion);
                        }}
                      >
                        Ver Detalles
                      </StyledButton>
                    </TableCell>
                  </StyledTableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={10} align="center">
                  No hay documentos asignados disponibles
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      <TablePagination
        component="div"
        count={totalCount}
        page={pagination.pageIndex}
        onPageChange={handleChangePage}
        rowsPerPage={pagination.pageSize}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[5, 10, 25, 50]}
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`}
        labelRowsPerPage="Filas por página:"
      />

      {/* Details Dialog */}
      <Dialog
        open={openDetailsDialog}
        onClose={handleCloseDetails}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Detalles del Documento
        </DialogTitle>
        <DialogContent dividers>
          {selectedAsignacion && (
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Typography variant="subtitle2">CUT:</Typography>
              <Typography>{selectedAsignacion.expediente?.cut || 'N/A'}</Typography>
              
              <Typography variant="subtitle2">Remitente:</Typography>
              <Typography>{selectedAsignacion.expediente?.remitente || 'N/A'}</Typography>
              
              <Typography variant="subtitle2">Documento:</Typography>
              <Typography>
                {selectedAsignacion.documento?.TipoDocumento?.nombre || 'N/A'} {selectedAsignacion.documento?.numero_documento || ''}
              </Typography>
              
              <Typography variant="subtitle2">Asunto:</Typography>
              <Typography>{selectedAsignacion.documento?.asunto || 'N/A'}</Typography>
              
              <Typography variant="subtitle2">Fecha del Documento:</Typography>
              <Typography>{formatDate(selectedAsignacion.documento?.fecha_documento)}</Typography>
              
              <Typography variant="subtitle2">Fecha de Asignación:</Typography>
              <Typography>{formatDate(selectedAsignacion.fecha_asignacion)}</Typography>
              
              <Typography variant="subtitle2">Fecha de Vencimiento:</Typography>
              <Typography>{formatDate(selectedAsignacion.fecha_vencimiento)}</Typography>
              
              <Typography variant="subtitle2">Persona Asignada:</Typography>
              <Typography>
                {selectedAsignacion.usuario?.nombre || ''} {selectedAsignacion.usuario?.apellido || ''}
              </Typography>
              
              <Typography variant="subtitle2">Instrucciones:</Typography>
              <Typography>{selectedAsignacion.instrucciones || 'Sin instrucciones'}</Typography>
              
              <Typography variant="subtitle2">Estado:</Typography>
              <Typography>
                <Chip
                  size="small"
                  label={calculateDaysRemaining(selectedAsignacion.fecha_vencimiento) === null 
                    ? "Sin fecha" 
                    : calculateDaysRemaining(selectedAsignacion.fecha_vencimiento) < 0 
                      ? "Vencido" 
                      : calculateDaysRemaining(selectedAsignacion.fecha_vencimiento) === 0 
                        ? "Hoy" 
                        : `${calculateDaysRemaining(selectedAsignacion.fecha_vencimiento)} día(s)`}
                  color={getStatusColor(calculateDaysRemaining(selectedAsignacion.fecha_vencimiento))}
                />
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetails} color="primary">
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default Documentos;
