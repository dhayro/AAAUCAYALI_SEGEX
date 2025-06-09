import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Button, TextField, Dialog, DialogActions, DialogContent, DialogTitle,
  Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, InputAdornment, CircularProgress
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { getExpedientes, createExpediente, updateExpediente, deleteExpediente } from '../services/api';
import Swal from 'sweetalert2';
import SearchIcon from '@mui/icons-material/Search';
import { debounce } from 'lodash';
import { readExcelFile } from '../utils/excelUtils'; // Importa la funci&#243;n para leer Excel

// Definimos estilos personalizados para los botones
const BootstrapButton = styled(Button)(({ theme, color }) => ({
  boxShadow: 'none',
  textTransform: 'none',
  fontSize: 16,
  padding: '6px 12px',
  border: '1px solid',
  lineHeight: 1.5,
  backgroundColor:
    color === 'primary' ? '#0063cc' :
    color === 'secondary' ? '#dc3545' :
    color === 'success' ? '#28a745' :
    color === 'celeste' ? '#00bfff' : '#0063cc', // Add celeste color
  borderColor:
    color === 'primary' ? '#0063cc' :
    color === 'secondary' ? '#dc3545' :
    color === 'success' ? '#28a745' :
    color === 'celeste' ? '#00bfff' : '#0063cc',
  color: '#ffffff',
  fontFamily: [
    '-apple-system',
    'BlinkMacSystemFont',
    '"Segoe UI"',
    'Roboto',
    '"Helvetica Neue"',
    'Arial',
    'sans-serif',
    '"Apple Color Emoji"',
    '"Segoe UI Emoji"',
    '"Segoe UI Symbol"',
  ].join(','),
  '&:hover': {
    backgroundColor:
      color === 'primary' ? '#0069d9' :
      color === 'secondary' ? '#c82333' :
      color === 'success' ? '#218838' :
      color === 'celeste' ? '#00a3cc' : '#0069d9', // Add hover color for celeste
    borderColor:
      color === 'primary' ? '#0062cc' :
      color === 'secondary' ? '#bd2130' :
      color === 'success' ? '#1e7e34' :
      color === 'celeste' ? '#00a3cc' : '#0062cc',
    boxShadow: 'none',
  },
  '&:active': {
    boxShadow: 'none',
    backgroundColor:
      color === 'primary' ? '#0062cc' :
      color === 'secondary' ? '#bd2130' :
      color === 'success' ? '#1e7e34' :
      color === 'celeste' ? '#0099cc' : '#0062cc', // Add active color for celeste
    borderColor:
      color === 'primary' ? '#005cbf' :
      color === 'secondary' ? '#b21f2d' :
      color === 'success' ? '#1c7e30' :
      color === 'celeste' ? '#0099cc' : '#005cbf',
  },
  '&:focus': {
    boxShadow: `0 0 0 0.2rem ${color === 'primary' ? 'rgba(0,123,255,.5)' :
      color === 'secondary' ? 'rgba(220,53,69,.5)' :
      color === 'success' ? 'rgba(40,167,69,.5)' :
      color === 'celeste' ? 'rgba(0,191,255,.5)' : 'rgba(0,123,255,.5)'
    }`,
  },
}));

const Expedientes = () => {
  const [expedientes, setExpedientes] = useState([]);
  const [open, setOpen] = useState(false);
  const [currentExpediente, setCurrentExpediente] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({ filtro: '', cut: '', asunto: '' });
  const [selectedFile, setSelectedFile] = useState(null); // New state for selected file
  const [isProcessing, setIsProcessing] = useState(false); // New state for processing

  const fileInputRef = useRef();

  const showSweetAlert = (options) => {
    return Swal.fire({
      ...options,
      customClass: { container: 'my-swal' }
    });
  };

  const fetchPaginatedExpedientes = useCallback(async (currentFilters, currentPagination) => {
    setIsLoading(true);
    try {
      const response = await getExpedientes({
        page: currentPagination.pageIndex + 1,
        limit: currentPagination.pageSize,
        cut: currentFilters.cut,
        asunto: currentFilters.asunto,
        filtro: currentFilters.filtro,
      });
      if (response.data && response.data.expedientes) {
        setExpedientes(response.data.expedientes);
        setTotalCount(response.data.totalExpedientes);
      } else {
        console.error('Unexpected response format:', response.data);
        showSweetAlert({ icon: 'error', title: 'Error', text: 'Formato de respuesta inesperado del servidor.' });
      }
    } catch (error) {
      console.error('Error fetching expedientes:', error);
      showSweetAlert({ icon: 'error', title: 'Error', text: 'Error al cargar los expedientes. Por favor, intente de nuevo m&#225;s tarde.' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const debouncedFetchExpedientes = useRef(
    debounce((newFilters, newPagination) => {
      fetchPaginatedExpedientes(newFilters, newPagination);
    }, 300)
  ).current;

  useEffect(() => {
    debouncedFetchExpedientes(filters, pagination);
  }, [filters, pagination, debouncedFetchExpedientes]);

  const handleOpen = () => {
    setCurrentExpediente({});
    setIsEditing(false);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleInputChange = (e) => {
    setCurrentExpediente({ ...currentExpediente, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await updateExpediente(currentExpediente.id, currentExpediente);
      } else {
        await createExpediente(currentExpediente);
      }
      fetchPaginatedExpedientes(filters, pagination);
      handleClose();
      showSweetAlert({ icon: 'success', title: '&#201;xito', text: isEditing ? 'Expediente actualizado correctamente' : 'Expediente agregado correctamente' });
    } catch (error) {
      console.error('Error submitting expediente:', error);
      showSweetAlert({ icon: 'error', title: 'Error', text: 'Error al procesar la solicitud. Por favor, intente de nuevo.' });
    }
  };

  const handleEdit = (expediente) => {
    setCurrentExpediente(expediente);
    setIsEditing(true);
    setOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      const result = await showSweetAlert({
        title: '&#191;Est&#225; seguro?',
        text: "No podr&#225; revertir esta acci&#243;n",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'S&#237;, eliminar',
        cancelButtonText: 'Cancelar'
      });

      if (result.isConfirmed) {
        await deleteExpediente(id);
        fetchPaginatedExpedientes(filters, pagination);
        showSweetAlert({ icon: 'success', title: 'Eliminado', text: 'El expediente ha sido eliminado.' });
      }
    } catch (error) {
      console.error('Error deleting expediente:', error);
      showSweetAlert({ icon: 'error', title: 'Error', text: 'Error al eliminar el expediente. Por favor, intente de nuevo.' });
    }
  };

  const handleChangePage = (event, newPage) => {
    setPagination(old => ({ ...old, pageIndex: newPage }));
  };

  const handleChangeRowsPerPage = (event) => {
    const newPageSize = parseInt(event.target.value, 10);
    setPagination({ pageIndex: 0, pageSize: newPageSize });
  };

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters(prevFilters => ({
      ...prevFilters,
      [name]: value
    }));
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    setSelectedFile(file); // Set the selected file
  };

  const handleImport = async () => {
    if (selectedFile) {
      setIsProcessing(true); // Start processing
      try {
        const data = await readExcelFile(selectedFile);
        
        // Skip the first two rows (headers) and start processing from the third row
        const expedientes = data.slice(2).map(row => ({
          cut: row[1] ? row[1].trim() : '', // Ensure cut is a string
          estupa: row[4] || '',
          tipo_procedimiento: row[5] || '',
          periodo: row[7] || '',
          fecha_creacion: row[6] || '',
          asunto: row[9] || '',
          remitente: row[11] || '',
        }));

        for (const expediente of expedientes) {
          if (!expediente.cut) {
            console.warn('CUT is blank, skipping:', expediente);
            continue; // Skip if CUT is blank
          }

          // Create new expediente
          try {
            const response = await createExpediente(expediente);
            if (response.data.alert) {
              console.log('Expediente with CUT already exists:', expediente);
            } else {
              console.log('Expediente created:', expediente);
            }
          } catch (error) {
            console.error('Error creating expediente:', error);
            // Handle specific error messages from the backend
            const errorMessage = error.response?.data?.message || 'Error al crear el expediente.';
            showSweetAlert({ icon: 'error', title: 'Error', text: errorMessage });
          }
        }

        showSweetAlert({ icon: 'success', title: 'Éxito', text: 'Expedientes importados correctamente.' });
        
        // Refresh the table after import
        fetchPaginatedExpedientes(filters, pagination);
        
      } catch (error) {
        console.error('Error reading Excel file:', error);
        showSweetAlert({ icon: 'error', title: 'Error', text: 'Error al leer el archivo Excel.' });
      } finally {
        setIsProcessing(false); // End processing
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  return (
    <div>
      <h2>Gesti[&#243;]n de Expedientes</h2>
      <input
        type="file"
        accept=".xlsx, .xls"
        onChange={handleFileUpload}
        ref={fileInputRef}
        style={{ display: 'none' }}
      />
      <BootstrapButton
        variant="contained"
        color="celeste" // Use the new celeste color
        onClick={triggerFileInput}
        style={{ marginBottom: '1rem' }}
      >
        Seleccionar Archivo
      </BootstrapButton>
      
      {selectedFile && (
        <BootstrapButton
          variant="contained"
          color="primary"
          onClick={handleImport}
          style={{ marginBottom: '1rem', marginLeft: '1rem' }}
        >
          Importar
        </BootstrapButton>
      )}

      {isProcessing && (
        <div style={{ marginBottom: '1rem' }}>
          <CircularProgress />
          <span style={{ marginLeft: '10px' }}>Procesando archivo...</span>
        </div>
      )}
      
      <BootstrapButton variant="contained" color="primary" onClick={handleOpen} style={{ marginBottom: '1rem' }}>
        Agregar Nuevo Expediente
      </BootstrapButton>
      
      <TextField
        name="filtro"
        value={filters.filtro}
        onChange={handleFilterChange}
        placeholder="Buscar en todos los campos"
        variant="outlined"
        size="small"
        style={{ marginBottom: '1rem', marginRight: '1rem' }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Item</TableCell>
              <TableCell>CUT</TableCell>
              <TableCell>Asunto</TableCell>
              <TableCell>Remitente</TableCell>
              <TableCell>Documento</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">Cargando...</TableCell>
              </TableRow>
            ) : expedientes.length > 0 ? (
              expedientes.map((expediente, index) => (
                <TableRow
                  key={expediente.id}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleEdit(expediente);
                    }
                  }}
                >
                  <TableCell>{pagination.pageIndex * pagination.pageSize + index + 1}</TableCell>
                  <TableCell>{expediente.cut || ''}</TableCell>
                  <TableCell>{expediente.asunto || ''}</TableCell>
                  <TableCell>{expediente.remitente || ''}</TableCell>
                  <TableCell>{`${expediente.tipo_documento || ''} ${expediente.numero_documento || ''}`.trim()}</TableCell>
                  <TableCell align="right">
                    <BootstrapButton
                      color="info"
                      onClick={() => handleEdit(expediente)}
                      style={{ marginRight: '8px', padding: '4px 8px' }}
                      size="small"
                    >
                      Editar
                    </BootstrapButton>
                    <BootstrapButton
                      color="secondary"
                      onClick={() => handleDelete(expediente.id)}
                      style={{ padding: '4px 8px' }}
                      size="small"
                    >
                      Eliminar
                    </BootstrapButton>
                    <BootstrapButton
                      color="primary"
                      onClick={() => alert(`Listar documentos para expediente ${expediente.id}`)} // Use backticks for template literals
                      style={{ padding: '4px 8px' }}
                      size="small"
                    >
                      Listar Documentos
                    </BootstrapButton>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center">No hay expedientes disponibles</TableCell>
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
        rowsPerPageOptions={[5, 10, 25]}
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count !== -1 ? count : 'm&#225;s de ' + to}`}
        labelRowsPerPage="Filas por p&#225;gina:"
      />

      <Dialog 
        open={open} 
        onClose={handleClose}
        aria-labelledby="dialog-title"
      >
        <form onSubmit={handleSubmit}>
          <DialogTitle id="dialog-title">{isEditing ? 'Editar Expediente' : 'Agregar Nuevo Expediente'}</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              name="cut"
              label="CUT"
              type="text"
              fullWidth
              value={currentExpediente.cut || ''}
              onChange={handleInputChange}
            />
            <TextField
              margin="dense"
              name="asunto"
              label="Asunto"
              type="text"
              fullWidth
              value={currentExpediente.asunto || ''}
              onChange={handleInputChange}
            />
            {/* Add more fields as necessary */}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose} color="secondary">
              Cancelar
            </Button>
            <Button type="submit" color="primary">
              {isEditing ? 'Actualizar' : 'Agregar'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </div>
  );
};

export default Expedientes;