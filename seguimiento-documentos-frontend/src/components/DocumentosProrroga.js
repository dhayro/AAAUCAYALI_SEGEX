import React, { useState, useEffect, useCallback } from "react";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Button,
  CircularProgress,
  Typography,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  TextField,
  InputAdornment,
  Chip,
  Box,
} from "@mui/material";
import { Autocomplete } from '@mui/material';
import SearchIcon from "@mui/icons-material/Search";
import Swal from "sweetalert2";
import { getAsignacionesConProrrogaPendiente, aceptarProrrogaCalendario } from "../services/api";
import { parseISOToLimaDate, formatDateWithTime } from "../utils/dateUtils";

const DocumentosProrroga = () => {
  const [asignaciones, setAsignaciones] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState({
    general: '',
    cut: '',
    documento: '',
    personaAsignada: '',
  });
  const [openProrrogaDialog, setOpenProrrogaDialog] = useState(false);
  const [selectedAsignacion, setSelectedAsignacion] = useState(null);
  const [plazoProrroga, setPlazoProrroga] = useState(1);

  const fetchAsignacionesConProrrogaPendiente = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getAsignacionesConProrrogaPendiente();
      if (response.data && response.data.asignaciones) {
        setAsignaciones(response.data.asignaciones);
        setTotalCount(response.data.totalAsignaciones);
      } else {
        console.error("Unexpected response format:", response.data);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Formato de respuesta inesperado del servidor.",
          timer: 3000,
          timerProgressBar: true,
          showConfirmButton: false,
        });
      }
    } catch (error) {
      console.error("Error fetching asignaciones:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Error al cargar las asignaciones. Por favor, intente de nuevo más tarde.",
        timer: 3000,
        timerProgressBar: true,
        showConfirmButton: false,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAsignacionesConProrrogaPendiente();
  }, [fetchAsignacionesConProrrogaPendiente]);

  const handleAceptarProrroga = (asignacion) => {
    setSelectedAsignacion(asignacion);
    setPlazoProrroga(asignacion.plazo_prorroga || 1);
    setOpenProrrogaDialog(true);
  };

  const handleSolicitarProrroga = async (asignacionId) => {
    try {
      const response = await aceptarProrrogaCalendario(asignacionId, plazoProrroga);
      if (response.status === 200) {
        Swal.fire({
          icon: "success",
          title: "Éxito",
          text: "Prórroga aceptada correctamente",
          timer: 2500,
          timerProgressBar: true,
          showConfirmButton: false,
        });
        fetchAsignacionesConProrrogaPendiente();
      } else {
        throw new Error("Error al aceptar la prórroga");
      }
    } catch (error) {
      console.error("Error accepting extension:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Error al aceptar la prórroga. Por favor, intente de nuevo.",
        timer: 3000,
        timerProgressBar: true,
        showConfirmButton: false,
      });
    } finally {
      setOpenProrrogaDialog(false);
    }
  };

  const handleCloseProrrogaDialog = () => {
    setOpenProrrogaDialog(false);
    setSelectedAsignacion(null);
  };

  const handleChangePage = (event, newPage) => {
    setPagination((old) => ({ ...old, pageIndex: newPage }));
  };

  const handleChangeRowsPerPage = (event) => {
    const newPageSize = parseInt(event.target.value, 10);
    setPagination({ pageIndex: 0, pageSize: newPageSize });
  };

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prevFilters) => ({
      ...prevFilters,
      [name]: value,
    }));
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  const calculateCalendarDaysRemaining = (dueDate) => {
    if (!dueDate) return null;
  
    const today = new Date();
    const due = parseISOToLimaDate(dueDate);
    
    // Reset hours to compare just the dates
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    
    // Calculate difference in milliseconds and convert to days
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  // const calculateDaysRemaining = (dueDate) => {
  //   if (!dueDate) return null;

  //   let today = new Date();
  //   const due = parseISOToLimaDate(dueDate);

  //   if (today.getDay() === 6) {
  //     today.setDate(today.getDate() + 2);
  //   } else if (today.getDay() === 0) {
  //     today.setDate(today.getDate() + 1);
  //   }

  //   let workingDaysRemaining = 0;
  //   let currentDate = new Date(today);

  //   while (currentDate < due) {
  //     const dayOfWeek = currentDate.getDay();
  //     if (dayOfWeek !== 6 && dayOfWeek !== 0) {
  //       workingDaysRemaining++;
  //     }
  //     currentDate.setDate(currentDate.getDate() + 1);
  //   }

  //   if (today.toDateString() === due.toDateString()) {
  //     return 0;
  //   }

  //   return workingDaysRemaining;
  // };

  const getStatusColor = (daysRemaining) => {
    if (daysRemaining === null) return "default";
    if (daysRemaining < 0) return "error";
    if (daysRemaining === 0) return "warning";
    if (daysRemaining <= 2) return "warning";
    return "success";
  };

  const filteredAsignaciones = asignaciones.filter((asignacion) => {
    const generalFilter = filters.general.toLowerCase();
    const cutFilter = filters.cut.toLowerCase();
    const documentoFilter = filters.documento.toLowerCase();
    const personaAsignadaFilter = filters.personaAsignada.toLowerCase();

    const cut = asignacion.Documento.Expediente?.cut.toLowerCase() || "";
    const documento = `${asignacion.Documento?.TipoDocumento?.nombre || ""} ${asignacion.Documento?.numero_documento || ""}`.toLowerCase();
    const personaAsignada = `${asignacion.asignado?.nombre || ""} ${asignacion.asignado?.apellido || ""}`.toLowerCase();

    return (
      (cut.includes(cutFilter) || cutFilter === "") &&
      (documento.includes(documentoFilter) || documentoFilter === "") &&
      (personaAsignada.includes(personaAsignadaFilter) || personaAsignadaFilter === "") &&
      (cut.includes(generalFilter) || documento.includes(generalFilter) || personaAsignada.includes(generalFilter) || generalFilter === "")
    );
  });

  return (
    <div>
      <h2>Asignaciones con Prórroga Pendiente</h2>

      <Box sx={{ mb: 2, display: "flex", gap: 2 }}>
        <TextField
          name="general"
          value={filters.general}
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
                Documento
                <TextField
                  name="documento"
                  value={filters.documento}
                  onChange={handleFilterChange}
                  placeholder="Filtrar por Documento"
                  variant="outlined"
                  size="small"
                  fullWidth
                  margin="dense"
                />
              </TableCell>
              <TableCell>
                Persona Asignada
                <TextField
                  name="personaAsignada"
                  value={filters.personaAsignada}
                  onChange={handleFilterChange}
                  placeholder="Filtrar por Persona Asignada"
                  variant="outlined"
                  size="small"
                  fullWidth
                  margin="dense"
                />
              </TableCell>
              <TableCell>Fecha Vencimiento</TableCell>
              <TableCell>Fecha de Prórroga Solicitada</TableCell>
              <TableCell>Plazo de Prórroga Solicitado</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <CircularProgress size={24} />
                  <Typography variant="body2" sx={{ ml: 1 }}>
                    Cargando...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : filteredAsignaciones.length > 0 ? (
              filteredAsignaciones.map((asignacion, index) => {
                const daysRemaining = calculateCalendarDaysRemaining(asignacion.fecha_limite);
                const statusColor = getStatusColor(daysRemaining);

                return (
                  <TableRow key={asignacion.id}>
                    <TableCell>
                      {pagination.pageIndex * pagination.pageSize + index + 1}
                    </TableCell>
                    <TableCell>{asignacion.Documento.Expediente?.cut || "N/A"}</TableCell>
                    <TableCell>
                      {asignacion.Documento?.TipoDocumento?.nombre || "N/A"}{" "}
                      {asignacion.Documento?.numero_documento || ""}
                    </TableCell>
                    <TableCell>{asignacion.asignado?.nombre || ""}{" "}
                      {asignacion.asignado?.apellido || ""}</TableCell>
                    <TableCell>{formatDateWithTime(parseISOToLimaDate(asignacion.fecha_limite)) || "N/A"}</TableCell>
                    <TableCell>
                      {formatDateWithTime(parseISOToLimaDate(asignacion.fecha_prorroga)) || "N/A"}
                    </TableCell>
                    <TableCell>
                      {asignacion.plazo_prorroga || "N/A"} días
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={
                          daysRemaining === null
                            ? "Sin fecha"
                            : daysRemaining < 0
                            ? "Vencido"
                            : daysRemaining === 0
                            ? "Hoy"
                            : `${daysRemaining} día(s)`
                        }
                        color={statusColor}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="contained"
                        color="primary"
                        size="small"
                        onClick={() => handleAceptarProrroga(asignacion)}
                      >
                        Aceptar Prórroga
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  No hay asignaciones con prórroga pendiente
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
        labelDisplayedRows={({ from, to, count }) =>
          `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`
        }
        labelRowsPerPage="Filas por página:"
      />

      <Dialog
        open={openProrrogaDialog}
        onClose={handleCloseProrrogaDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Prorroga a aceptar</DialogTitle>
        <DialogContent>
        <FormControl fullWidth margin="dense">
            <Autocomplete
              id="plazo-select"
              freeSolo
              options={[1, 2, 3, 5, 7, 10, 15, 30]}
              value={plazoProrroga}
              onChange={(event, newValue) => {
                // Handle both string input and option selection
                if (typeof newValue === 'string') {
                  // Try to convert to number if it's a valid number
                  const numValue = parseInt(newValue, 10);
                  if (!isNaN(numValue) && numValue > 0) {
                    setPlazoProrroga(numValue);
                  } else if (newValue === '') {
                    setPlazoProrroga('');
                  }
                } else {
                  setPlazoProrroga(newValue);
                }
              }}
              onInputChange={(event, newInputValue) => {
                // Handle input changes
                if (newInputValue === '') {
                  setPlazoProrroga('');
                  return;
                }
                
                const numValue = parseInt(newInputValue, 10);
                if (!isNaN(numValue) && numValue > 0) {
                  setPlazoProrroga(numValue);
                }
              }}
              renderInput={(params) => (
                <TextField 
                  {...params} 
                  label="Plazo de prórroga (días)" 
                  type="text"
                  InputProps={{
                    ...params.InputProps,
                    inputMode: 'numeric',
                    pattern: '[0-9]*'
                  }}
                />
              )}
              renderOption={(props, option) => (
                <li {...props}>
                  {option} {option === 1 ? 'día' : 'días'}
                </li>
              )}
              getOptionLabel={(option) => {
                if (option === '') return '';
                return option.toString();
              }}
            />
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseProrrogaDialog} color="secondary">
            Cancelar
          </Button>
          {selectedAsignacion && (
            <Button
              onClick={() => handleSolicitarProrroga(selectedAsignacion.id)}
              color="primary"
            >
              Aceptar
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default DocumentosProrroga;