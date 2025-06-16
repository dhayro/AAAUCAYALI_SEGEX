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
  InputLabel,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
  Chip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import Swal from "sweetalert2";
import { getAsignacionesConProrrogaPendiente, aceptarProrroga } from "../services/api";
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
    cut: '',
    personaAsignada: '',
    fechaVencimiento: '',
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
  setPlazoProrroga(asignacion.plazo_prorroga || 1); // Set default to 1 if plazo_prorroga is not defined
  setOpenProrrogaDialog(true);
};

  
const handleSolicitarProrroga = async (asignacionId) => {
  try {

    const response = await aceptarProrroga(asignacionId,  plazoProrroga );
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

  const calculateDaysRemaining = (dueDate) => {
    if (!dueDate) return null;

    let today = new Date();
    const due = parseISOToLimaDate(dueDate);

    if (today.getDay() === 6) {
      today.setDate(today.getDate() + 2);
    } else if (today.getDay() === 0) {
      today.setDate(today.getDate() + 1);
    }

    let workingDaysRemaining = 0;
    let currentDate = new Date(today);

    while (currentDate < due) {
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 6 && dayOfWeek !== 0) {
        workingDaysRemaining++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    if (today.toDateString() === due.toDateString()) {
      return 0;
    }

    return workingDaysRemaining;
  };

  const getStatusColor = (daysRemaining) => {
    if (daysRemaining === null) return "default";
    if (daysRemaining < 0) return "error";
    if (daysRemaining === 0) return "warning";
    if (daysRemaining <= 2) return "warning";
    return "success";
  };

  return (
    <div>
      <h2>Asignaciones con Prórroga Pendiente</h2>

      <div style={{ marginBottom: "1rem", display: "flex", gap: "1rem" }}>
        <TextField
          name="cut"
          value={filters.cut}
          onChange={handleFilterChange}
          placeholder="Filtrar por CUT"
          variant="outlined"
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <TextField
          name="personaAsignada"
          value={filters.personaAsignada}
          onChange={handleFilterChange}
          placeholder="Filtrar por Persona Asignada"
          variant="outlined"
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <TextField
          name="fechaVencimiento"
          value={filters.fechaVencimiento}
          onChange={handleFilterChange}
          placeholder="Filtrar por Fecha Vencimiento"
          variant="outlined"
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </div>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Item</TableCell>
              <TableCell>CUT</TableCell>
              <TableCell>Documento</TableCell>
              <TableCell>Persona Asignada</TableCell>
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
            ) : asignaciones.length > 0 ? (
              asignaciones.map((asignacion, index) => {
                const daysRemaining = calculateDaysRemaining(asignacion.fecha_limite);
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
                      {asignacion.fecha_prorroga || "N/A"}
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
            <InputLabel id="plazo-select-label">
              Plazo de prórroga (días)
            </InputLabel>
            <Select
  labelId="plazo-select-label"
  id="plazo-select"
  value={plazoProrroga}
  onChange={(e) => setPlazoProrroga(e.target.value)}
  label="Plazo de prórroga (días)"
  fullWidth
>
  {[1, 2, 3, 5, 7, 10, 15, 30].map((dias) => (
    <MenuItem key={dias} value={dias}>
      {dias} {dias === 1 ? "día" : "días"}
    </MenuItem>
  ))}
</Select>
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