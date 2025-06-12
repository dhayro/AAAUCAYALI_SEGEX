import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  formatDate,
  parseISOToLimaDate,
  toISOLimaDate,
  // formatDateWithTime,
} from "../utils/dateUtils";

import {
  Box,
  Chip,
  Button,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  InputAdornment,
  CircularProgress,
  Autocomplete,
  Tooltip,
  Typography, // Add Typography here
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";

import { es } from "date-fns/locale";

import { styled } from "@mui/material/styles";
import {
  getExpedientes,
  createExpediente,
  updateExpediente,
  deleteExpediente,
  createDocumento,
  getTiposProcedimientos,
  getExpedienteById,
  getNombresUnicosTiposDocumentos,
  updateDocumento,
  getDocumentosByExpedienteId,
  getDocumentosRelacionados,
  getDocumentoById 
} from "../services/api";
import Swal from "sweetalert2";
import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import NoteAddIcon from "@mui/icons-material/NoteAdd";
import ListAltIcon from "@mui/icons-material/ListAlt";
import { debounce } from "lodash";
import { readExcelFile } from "../utils/excelUtils";
import { jwtDecode } from "jwt-decode";
import AddIcon from "@mui/icons-material/Add";
import DescriptionIcon from "@mui/icons-material/Description";

// Add this function at the top of your component or outside it
const isEqual = (obj1, obj2) => {
  return JSON.stringify(obj1) === JSON.stringify(obj2);
};

// Definimos estilos personalizados para los botones
const BootstrapButton = styled(Button)(({ theme, color }) => ({
  boxShadow: "none",
  textTransform: "none",
  fontSize: 16,
  padding: "6px 12px",
  border: "1px solid",
  lineHeight: 1.5,
  backgroundColor:
    color === "primary"
      ? "#0063cc"
      : color === "secondary"
      ? "#dc3545"
      : color === "success"
      ? "#28a745"
      : color === "celeste"
      ? "#00bfff"
      : "#0063cc", // Add celeste color
  borderColor:
    color === "primary"
      ? "#0063cc"
      : color === "secondary"
      ? "#dc3545"
      : color === "success"
      ? "#28a745"
      : color === "celeste"
      ? "#00bfff"
      : "#0063cc",
  color: "#ffffff",
  fontFamily: [
    "-apple-system",
    "BlinkMacSystemFont",
    '"Segoe UI"',
    "Roboto",
    '"Helvetica Neue"',
    "Arial",
    "sans-serif",
    '"Apple Color Emoji"',
    '"Segoe UI Emoji"',
    '"Segoe UI Symbol"',
  ].join(","),
  "&:hover": {
    backgroundColor:
      color === "primary"
        ? "#0069d9"
        : color === "secondary"
        ? "#c82333"
        : color === "success"
        ? "#218838"
        : color === "celeste"
        ? "#00a3cc"
        : "#0069d9", // Add hover color for celeste
    borderColor:
      color === "primary"
        ? "#0062cc"
        : color === "secondary"
        ? "#bd2130"
        : color === "success"
        ? "#1e7e34"
        : color === "celeste"
        ? "#00a3cc"
        : "#0062cc",
  },
  "&:active": {
    boxShadow: "none",
    backgroundColor:
      color === "primary"
        ? "#0062cc"
        : color === "secondary"
        ? "#bd2130"
        : color === "success"
        ? "#1e7e34"
        : color === "celeste"
        ? "#0099cc"
        : "#0062cc", // Add active color for celeste
    borderColor:
      color === "primary"
        ? "#005cbf"
        : color === "secondary"
        ? "#b21f2d"
        : color === "success"
        ? "#1c7e30"
        : color === "celeste"
        ? "#0099cc"
        : "#005cbf",
  },
  "&:focus": {
    boxShadow: `0 0 0 0.2rem ${
      color === "primary"
        ? "rgba(0,123,255,.5)"
        : color === "secondary"
        ? "rgba(220,53,69,.5)"
        : color === "success"
        ? "rgba(40,167,69,.5)"
        : color === "celeste"
        ? "rgba(0,191,255,.5)"
        : "rgba(0,123,255,.5)"
    }`,
  },
}));

// // Añade esto justo después de la definición de BootstrapButton
// const DialogButton = styled(Button)(({ theme, color }) => ({
//   textTransform: "none",
//   padding: "6px 16px",
//   borderRadius: "4px",
//   fontWeight: "bold",
//   color: theme.palette.getContrastText(theme.palette.primary.main),
//   backgroundColor:
//     color === "primary"
//       ? theme.palette.primary.main
//       : theme.palette.secondary.main,
//   "&:hover": {
//     backgroundColor:
//       color === "primary"
//         ? theme.palette.primary.dark
//         : theme.palette.secondary.dark,
//   },
// }));

// Nuevo estilo para las filas de la tabla
const StyledTableRow = styled(TableRow)(({ theme }) => ({
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
    cursor: "pointer",
  },
  "&:focus": {
    backgroundColor: theme.palette.action.selected,
    outline: "none",
  },
}));

// Añadir un estilo específico para los botones de diálogo
const StyledDialogButton = styled(Button)(({ theme, color }) => ({
  boxShadow: "none",
  textTransform: "none",
  fontSize: 14,
  padding: "4px 10px",
  borderRadius: "4px",
  fontWeight: "bold",
  backgroundColor:
    color === "primary"
      ? "#0063cc"
      : color === "secondary"
      ? "#dc3545"
      : color === "success"
      ? "#28a745"
      : "#0063cc",
  borderColor:
    color === "primary"
      ? "#0063cc"
      : color === "secondary"
      ? "#dc3545"
      : color === "success"
      ? "#28a745"
      : "#0063cc",
  color: "#ffffff",
  "&:hover": {
    backgroundColor:
      color === "primary"
        ? "#0069d9"
        : color === "secondary"
        ? "#c82333"
        : color === "success"
        ? "#218838"
        : "#0069d9",
    borderColor:
      color === "primary"
        ? "#0062cc"
        : color === "secondary"
        ? "#bd2130"
        : color === "success"
        ? "#1e7e34"
        : "#0062cc",
  },
  "&:focus": {
    boxShadow: `0 0 0 0.2rem ${
      color === "primary"
        ? "rgba(0,123,255,.5)"
        : color === "secondary"
        ? "rgba(220,53,69,.5)"
        : color === "success"
        ? "rgba(40,167,69,.5)"
        : "rgba(0,123,255,.5)"
    }`,
  },
}));

let id_usuario_creador = 0;
let token = localStorage.getItem("token");
if (token) {
  try {
    let decodedToken = jwtDecode(token);
    id_usuario_creador = decodedToken.id;
  } catch (error) {
    console.error("Error al decodificar el token:", error);
  }
}

// const formatDate = (dateString) => {
//   if (!dateString) return '';

//   // Crear una fecha a partir del string, pero asegurando que se interprete como UTC
//   const date = new Date(dateString);

//   // Ajustar la fecha para compensar la zona horaria
//   const utcDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);

//   // Formatear la fecha en formato DD/MM/YYYY
//   const day = String(utcDate.getDate()).padStart(2, '0');
//   const month = String(utcDate.getMonth() + 1).padStart(2, '0');
//   const year = utcDate.getFullYear();

//   return `${day}/${month}/${year}`;
// };

// const toISODateString = (date) => {
//   if (!date) return null;
//   return date.toISOString().split("T")[0];
// };

const Expedientes = () => {
  const [expedientes, setExpedientes] = useState([]);
  const [open, setOpen] = useState(false);
  const [currentExpediente, setCurrentExpediente] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    filtro: "",
    cut: "",
    asunto: "",
    remitente: "",
    documento: "",
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [tiposProcedimientos, setTiposProcedimientos] = useState([]);
  const [procedimientoInputValue, setProcedimientoInputValue] = useState("");
  const [nombresUnicosTiposDocumentos, setNombresUnicosTiposDocumentos] =
    useState([]);
  const [tipoDocumentoInputValue, setTipoDocumentoInputValue] = useState("");
  const [openDocumentosListDialog, setOpenDocumentosListDialog] =
    useState(false);
  const [documentosList, setDocumentosList] = useState([]);
  const [isLoadingDocumentos, setIsLoadingDocumentos] = useState(false);
  const [currentExpedienteForList, setCurrentExpedienteForList] =
    useState(null);
  const [originalNumeroDocumento, setOriginalNumeroDocumento] = useState("");
  const [originalIdTipoDocumento, setOriginalIdTipoDocumento] = useState("");
  const [originalDocumento, setOriginalDocumento] = useState("");

  const [isEditingDocumento, setIsEditingDocumento] = useState(false);
  
  const handleEditDocumento = async (documentoId) => {
    try {
      setIsLoadingDocumentos(true);
      await fetchNombresUnicosTiposDocumentos("");


      const response = await getDocumentoById(documentoId);
      if (response.data) {
        const documentoToEdit = response.data;
        setCurrentDocumento({
          id: documentoToEdit.id,
          id_expediente: documentoToEdit.id_expediente,
          id_tipo_documento: documentoToEdit.TipoDocumento || null,
          numero_documento: documentoToEdit.numero_documento || '',
          asunto: documentoToEdit.asunto || '',
          fecha_documento: documentoToEdit.fecha_documento || null,
          estado: documentoToEdit.estado || 'PENDIENTE'
        });
        setIsEditingDocumento(true);
        setOpenDocumentoDialog(true);
      }
    } catch (error) {
      console.error('Error fetching documento details:', error);
      showSweetAlert({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo cargar la información del documento',
        timer: 3000,
        timerProgressBar: true,
        showConfirmButton: false
      });
    } finally {
      setIsLoadingDocumentos(false);
    }
  };

  const [fechaBrecha, setFechaBrecha] = useState(null);

  // Add these state variables at the beginning of your component
  const [openDocumentoDialog, setOpenDocumentoDialog] = useState(false);
  const [currentDocumento, setCurrentDocumento] = useState({
    id_expediente: null,
    id_tipo_documento: "",
    numero_documento: "",
    asunto: "",
    fecha_documento: null,
  });
  const [currentExpedienteForDocumento, setCurrentExpedienteForDocumento] =
    useState(null);

  const fileInputRef = useRef();

  const showSweetAlert = useCallback((options) => {
    return Swal.fire({
      ...options,
      customClass: { container: "my-swal" },
    });
  }, []);

  const fetchPaginatedExpedientes = useCallback(
    async (currentFilters, currentPagination) => {
      setIsLoading(true);
      try {
        const response = await getExpedientes({
          page: currentPagination.pageIndex + 1,
          limit: currentPagination.pageSize,
          cut: currentFilters.cut,
          asunto: currentFilters.asunto,
          filtro: currentFilters.filtro,
          remitente: currentFilters.remitente,
          documento: currentFilters.documento,
        });
        if (response.data && response.data.expedientes) {
          setExpedientes(response.data.expedientes);
          setTotalCount(response.data.totalExpedientes);
        } else {
          console.error("Unexpected response format:", response.data);
          showSweetAlert({
            icon: "error",
            title: "Error",
            text: "Formato de respuesta inesperado del servidor.",
          });
        }
      } catch (error) {
        console.error("Error fetching expedientes:", error);
        showSweetAlert({
          icon: "error",
          title: "Error",
          text: "Error al cargar los expedientes. Por favor, intente de nuevo más tarde.",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [showSweetAlert]
  );

  const debouncedFetchExpedientes = useRef(
    debounce((newFilters, newPagination) => {
      fetchPaginatedExpedientes(newFilters, newPagination);
    }, 300)
  ).current;

  useEffect(() => {
    debouncedFetchExpedientes(filters, pagination);
  }, [filters, pagination, debouncedFetchExpedientes]);

  const fetchTiposProcedimientos = useCallback(async (inputValue) => {
    try {
      const response = await getTiposProcedimientos({ search: inputValue });
      if (response.data) {
        setTiposProcedimientos(response.data);
      }
    } catch (error) {
      console.error("Error fetching tipos de procedimientos:", error);
    }
  }, []);

  const debouncedFetchTiposProcedimientos = useRef(
    debounce((inputValue) => {
      fetchTiposProcedimientos(inputValue);
    }, 300)
  ).current;

  useEffect(() => {
    if (procedimientoInputValue) {
      debouncedFetchTiposProcedimientos(procedimientoInputValue);
    }
  }, [procedimientoInputValue, debouncedFetchTiposProcedimientos]);

  useEffect(() => {
    if (procedimientoInputValue) {
      fetchTiposProcedimientos(procedimientoInputValue);
    }
  }, [procedimientoInputValue, fetchTiposProcedimientos]);

  const fetchNombresUnicosTiposDocumentos = useCallback(async (inputValue) => {
    try {
      const response = await getNombresUnicosTiposDocumentos({
        search: inputValue,
      });
      if (response.data) {
        setNombresUnicosTiposDocumentos(response.data);
      }
    } catch (error) {
      console.error(
        "Error fetching nombres únicos de tipos de documentos:",
        error
      );
    }
  }, []);

  const debouncedFetchNombresUnicosTiposDocumentos = useRef(
    debounce((inputValue) => {
      fetchNombresUnicosTiposDocumentos(inputValue);
    }, 300)
  ).current;

  useEffect(() => {
    if (tipoDocumentoInputValue) {
      debouncedFetchNombresUnicosTiposDocumentos(tipoDocumentoInputValue);
    }
  }, [tipoDocumentoInputValue, debouncedFetchNombresUnicosTiposDocumentos]);

  useEffect(() => {
    if (tipoDocumentoInputValue) {
      fetchNombresUnicosTiposDocumentos(tipoDocumentoInputValue);
    }
  }, [tipoDocumentoInputValue, fetchNombresUnicosTiposDocumentos]);

  const handleOpen = () => {
    setCurrentExpediente({
      cut: "",
      estupa: "",
      tipo_procedimiento: "",
      tipo_documento: "",
      numero_documento: "",
      periodo: "",
      asunto: "",
      remitente: "",
      id_usuario_creador: "",
    });
    setIsEditing(false);
    setOriginalDocumento({
      id_expediente: null,
      id_tipo_documento: "",
      numero_documento: "",
      asunto: "",
      fecha_documento: null,
    });
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentExpediente((prevExpediente) => ({
      ...prevExpediente,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validar campos obligatorios y enfocar el primero que esté vacío
    if (!currentExpediente.cut || currentExpediente.cut.trim() === "") {
      showSweetAlert({
        icon: "error",
        title: "Error",
        text: "El campo CUT es obligatorio.",
      });
      cutRef.current.focus();
      return;
    }
    if (
      !currentExpediente.tipo_procedimiento ||
      currentExpediente.tipo_procedimiento.trim() === ""
    ) {
      showSweetAlert({
        icon: "error",
        title: "Error",
        text: "El campo Tipo de Procedimiento es obligatorio.",
      });
      tipoProcedimientoRef.current.focus();
      return;
    }
    if (!currentExpediente.id_tipo_documento) {
      showSweetAlert({
        icon: "error",
        title: "Error",
        text: "El campo Tipo de Documento es obligatorio.",
      });
      tipoDocumentoRef.current.focus();
      return;
    }
    if (
      !currentExpediente.numero_documento ||
      currentExpediente.numero_documento.trim() === ""
    ) {
      showSweetAlert({
        icon: "error",
        title: "Error",
        text: "El campo Número de Documento es obligatorio.",
      });
      numeroDocumentoRef.current.focus();
      return;
    }
    if (
      !currentExpediente.periodo ||
      (typeof currentExpediente.periodo === "string" &&
        currentExpediente.periodo.trim() === "")
    ) {
      showSweetAlert({
        icon: "error",
        title: "Error",
        text: "El campo Periodo es obligatorio.",
      });
      periodoRef.current.focus();
      return;
    }
    if (!currentExpediente.asunto || currentExpediente.asunto.trim() === "") {
      showSweetAlert({
        icon: "error",
        title: "Error",
        text: "El campo Asunto es obligatorio.",
      });
      asuntoRef.current.focus();
      return;
    }
    if (
      !currentExpediente.remitente ||
      currentExpediente.remitente.trim() === ""
    ) {
      showSweetAlert({
        icon: "error",
        title: "Error",
        text: "El campo Remitente es obligatorio.",
      });
      remitenteRef.current.focus();
      return;
    }

    try {
      const expediente = {
        ...currentExpediente,
        id_tipo_documento: currentExpediente.id_tipo_documento.id || "", // Extract ID from tipo_documento object
        id_usuario_creador, // Usar el ID del usuario obtenido del token
      };

      let expedienteId;
      let expedienteId_tipo_documento;

      if (isEditing) {
        // Check if there are changes before updating
        const originalExpediente = expedientes.find(
          (exp) => exp.id === currentExpediente.id
        );
        if (originalExpediente && isEqual(originalExpediente, expediente)) {
          showSweetAlert({
            icon: "info",
            title: "Sin cambios",
            text: "No se han realizado cambios en el expediente.",
            timer: 2500,
            timerProgressBar: true,
            showConfirmButton: false,
          });
          handleClose();
          return;
        }

        expediente.id_usuario_modificador = id_usuario_creador; // Actualizar el usuario modificador
        await updateExpediente(currentExpediente.id, expediente);
        expedienteId = currentExpediente.id;
        expedienteId_tipo_documento = expediente.id_tipo_documento;

        // Actualizar el documento asociado al expediente si existe
        try {
          // Primero obtenemos el documento asociado al expediente

          const expedienteResponse = await getDocumentosRelacionados(
            expedienteId,
            originalNumeroDocumento,
            originalIdTipoDocumento
          );
          if (expedienteResponse.data) {
            const documentoId = expedienteResponse.data.id;

            // Actualizamos el documento con los nuevos datos
            const documentoActualizado = {
              id_expediente: expedienteId,
              id_tipo_documento: expedienteId_tipo_documento,
              numero_documento: currentExpediente.numero_documento || "",
              asunto: currentExpediente.asunto || "",
              fecha_documento:
                (originalDocumento.fecha_documento
                  ? parseISOToLimaDate(originalDocumento.fecha_documento)
                  : "") || null,
              id_usuario_modificador: id_usuario_creador,
            };

            await updateDocumento(documentoId, documentoActualizado);
          }
        } catch (docError) {
          console.error("Error updating associated document:", docError);
          // No interrumpimos el flujo si falla la actualización del documento
        }
      } else {
        const response = await createExpediente(expediente);
        expedienteId = response.data.id;
        expedienteId_tipo_documento = response.data.id_tipo_documento;
        // Crear el documento asociado al expediente
        if (expedienteId && expedienteId_tipo_documento) {
          const documento = {
            id_expediente: expedienteId,
            id_tipo_documento: expedienteId_tipo_documento || "",
            numero_documento: currentExpediente.numero_documento || "",
            asunto: currentExpediente.asunto || "",
            fecha_documento:
              (originalDocumento.fecha_documento
                ? parseISOToLimaDate(originalDocumento.fecha_documento)
                : "") || null,
            estado: "PENDIENTE",
            id_usuario_creador,
          };

          await createDocumento(documento);
        }
      }

      fetchPaginatedExpedientes(filters, pagination);
      handleClose();
      showSweetAlert({
        icon: "success",
        title: "Éxito",
        text: isEditing
          ? "Expediente actualizado correctamente"
          : "Expediente agregado correctamente",
      });
    } catch (error) {
      console.error("Error submitting expediente:", error);
      showSweetAlert({
        icon: "error",
        title: "Error",
        text: "Error al procesar la solicitud. Por favor, intente de nuevo.",
      });
    }
  };

  const handleEdit = async (expediente) => {
    try {
      await fetchNombresUnicosTiposDocumentos("");
      const response = await getExpedienteById(expediente.id);
      if (response.data) {
        const expedienteData = response.data;

        // Asignar correctamente el tipo de documento
        if (expedienteData.TipoDocumento) {
          expedienteData.id_tipo_documento = {
            id: expedienteData.TipoDocumento.id,
            nombre: expedienteData.TipoDocumento.nombre,
          };
        } else if (expedienteData.tipo_documento) {
          expedienteData.id_tipo_documento = {
            id: expedienteData.tipo_documento.id,
            nombre: expedienteData.tipo_documento.nombre,
          };
        }
        console.log("Expediente data:", expedienteData);

        setOriginalNumeroDocumento(expedienteData.numero_documento || "");
        setOriginalIdTipoDocumento(expedienteData.id_tipo_documento.id || "");

        // console.log('Expediente data:', originalNumeroDocumento);
        // console.log('Expediente data:', originalIdTipoDocumento);

        const documentosResponse = await getDocumentosRelacionados(
          expedienteData.id,
          expedienteData.numero_documento,
          expedienteData.id_tipo_documento.id
        );
        setOriginalDocumento(documentosResponse.data || "");

        setCurrentExpediente(expedienteData);
        setIsEditing(true);
        setOpen(true);
      } else {
        showSweetAlert({
          icon: "error",
          title: "Error",
          text: "No se pudo obtener los datos completos del expediente.",
        });
      }
    } catch (error) {
      // console.error('Error fetching expediente by ID:', error);
      showSweetAlert({
        icon: "error",
        title: "Error",
        text: "Error al obtener los datos del expediente. Por favor, intente de nuevo.",
      });
    }
  };

  const handleDelete = async (id) => {
    try {
      const result = await showSweetAlert({
        title: "¿Está seguro?",
        text: "No podrá revertir esta acción",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Sí, eliminar",
        cancelButtonText: "Cancelar",
      });

      if (result.isConfirmed) {
        await deleteExpediente(id);
        fetchPaginatedExpedientes(filters, pagination);
        showSweetAlert({
          icon: "success",
          title: "Eliminado",
          text: "El expediente ha sido eliminado.",
        });
      }
    } catch (error) {
      console.error("Error deleting expediente:", error);
      showSweetAlert({
        icon: "error",
        title: "Error",
        text: "Error al eliminar el expediente. Por favor, intente de nuevo.",
      });
    }
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

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];

    if (file) {
      try {
        // Leer el archivo para validar su estructura
        const data = await readExcelFile(file);

        // Verificar que tenga al menos 2 filas (para los encabezados)
        if (data.length < 2) {
          showSweetAlert({
            icon: "error",
            title: "Formato Incorrecto",
            text: "El archivo no tiene el formato esperado. Debe contener al menos una fila de encabezados.",
          });
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
          return;
        }

        // Verificar los encabezados en la segunda fila (índice 1)
        const expectedHeaders = [
          "N°",
          "CUT",
          "Tipo",
          "Tipo_Origen",
          "Estupa",
          "Procedimiento",
          "Fecha de Creación de Tramite",
          "Año",
          "Documento Origen",
          "Asunto Origen",
          "Dias Totales Transcurridos",
          "Remitente",
          "Último Documento",
          "Ultimo Escritorio",
          "Grupo",
          "Ultimo Sede Area",
          "Dias Transcurridos",
          "Fecha Ingreso Ultimo Escritorio",
          "Tarea",
        ];

        const headerRow = data[1];

        // Verificar que todos los encabezados esperados estén presentes
        const missingHeaders = [];
        for (let i = 0; i < expectedHeaders.length; i++) {
          if (
            !headerRow[i] ||
            headerRow[i].toString().trim() !== expectedHeaders[i]
          ) {
            missingHeaders.push(expectedHeaders[i]);
          }
        }

        if (missingHeaders.length > 0) {
          showSweetAlert({
            icon: "error",
            title: "Formato Incorrecto",
            text: `El archivo no tiene el formato esperado. Faltan o no coinciden los siguientes encabezados: ${missingHeaders.join(
              ", "
            )}`,
          });
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
          return;
        }

        // Si pasa todas las validaciones, establecer el archivo seleccionado
        setSelectedFile(file);
      } catch (error) {
        console.error("Error validating Excel file:", error);
        showSweetAlert({
          icon: "error",
          title: "Error",
          text: "Error al leer el archivo Excel. Asegúrese de que sea un archivo Excel válido.",
        });
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    } else {
      setSelectedFile(null);
    }
  };

  const parseDate = (dateString) => {
    const [datePart, timePart] = dateString.split(" ");
    const [day, month, year] = datePart.split("/").map(Number);
    const [hours, minutes, seconds] = timePart.split(":").map(Number);
    return new Date(year, month - 1, day, hours, minutes, seconds);
  };

  const handleImport = async () => {
    if (selectedFile && fechaBrecha && !isProcessing) {
      setIsProcessing(true);
      try {
        const data = await readExcelFile(selectedFile);

        // Verificar nuevamente el formato antes de procesar
        const expectedHeaders = [
          "N°",
          "CUT",
          "Tipo",
          "Tipo_Origen",
          "Estupa",
          "Procedimiento",
          "Fecha de Creación de Tramite",
          "Año",
          "Documento Origen",
          "Asunto Origen",
          "Dias Totales Transcurridos",
          "Remitente",
          "Último Documento",
          "Ultimo Escritorio",
          "Grupo",
          "Ultimo Sede Area",
          "Dias Transcurridos",
          "Fecha Ingreso Ultimo Escritorio",
          "Tarea",
        ];

        const headerRow = data[1];
        let isValidFormat = true;

        for (let i = 0; i < expectedHeaders.length; i++) {
          if (
            !headerRow[i] ||
            headerRow[i].toString().trim() !== expectedHeaders[i]
          ) {
            isValidFormat = false;
            break;
          }
        }

        if (!isValidFormat) {
          throw new Error(
            "El formato del archivo ha cambiado desde la validación inicial."
          );
        }

        const fechaBrechaISO = parseISOToLimaDate(fechaBrecha);

        for (const row of data.slice(2)) {
          const expediente = {
            cut: row[1] ? row[1].trim() : "",
            estupa: row[4] || "",
            tipo_procedimiento: row[5] || "",
            tipo_documento: row[10] || "",
            numero_documento: row[8] ? row[8].toString().toUpperCase() : "",
            periodo: row[7] || "",
            fecha_creacion: row[6] ? parseDate(row[6]) : null,
            asunto: row[9] || "",
            fecha_documento: null,
            remitente: row[11] || "",
            id_usuario_creador,
          };

          if (!expediente.cut) {
            console.warn("CUT is blank, skipping:", expediente);
            continue;
          }

          try {
            const response = await createExpediente(expediente);
            const expedienteId = response.data.id;

            if (response.data.alert) {
              console.log("Expediente with CUT already exists:", expediente);
            } else {
              console.log("Expediente created:", expediente);
            }

            const documento = {
              id_expediente: expedienteId,
              numero_documento: row[12] ? row[12].toString().toUpperCase() : "",
              asunto: "", //row[9] ||
              ultimo_escritorio: row[13] || "",
              ultima_oficina_area: row[15] || "",
              fecha_ingreso_ultimo_escritorio: row[17]
                ? parseDate(row[17])
                : null,
              bandeja: row[18] || "",
              estado: "PENDIENTE",
              id_usuario_creador,
              brecha: fechaBrechaISO,
            };

            await createDocumento(documento);
            console.log("Documento created:", documento);
          } catch (error) {
            console.error("Error creating expediente or documento:", error);
            const errorMessage =
              error.response?.data?.message ||
              "Error al crear el expediente o documento.";
            showSweetAlert({
              icon: "error",
              title: "Error",
              text: errorMessage,
            });
          }
        }

        showSweetAlert({
          icon: "success",
          title: "Éxito",
          text: "Expedientes y documentos importados correctamente.",
        });
        setSelectedFile(null);
        setFechaBrecha(null);

        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }

        fetchPaginatedExpedientes(filters, pagination);
      } catch (error) {
        console.error("Error reading Excel file:", error);
        showSweetAlert({
          icon: "error",
          title: "Error",
          text: error.message || "Error al leer el archivo Excel.",
        });
      } finally {
        setIsProcessing(false);
      }
    } else if (!selectedFile) {
      showSweetAlert({
        icon: "error",
        title: "Error",
        text: "Por favor, seleccione un archivo Excel válido.",
      });
    } else if (!fechaBrecha) {
      showSweetAlert({
        icon: "error",
        title: "Error",
        text: "Por favor, seleccione una fecha de brecha.",
      });
    }
  };
  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  // Crear referencias para los campos de entrada
  const cutRef = useRef();
  const tipoProcedimientoRef = useRef();
  const tipoDocumentoRef = useRef();
  const numeroDocumentoRef = useRef();
  const periodoRef = useRef();
  const asuntoRef = useRef();
  const remitenteRef = useRef();

  // Add these handler functions
  const handleOpenDocumentoDialog = (expediente) => {
    setCurrentExpedienteForDocumento(expediente);
    setCurrentDocumento({
      id_expediente: expediente?.id || null,
      id_tipo_documento: null,
      numero_documento: '',
      asunto: '',
      fecha_documento: null,
    });
    setIsEditingDocumento(false);
    setOpenDocumentoDialog(true);
  };

  const handleCloseDocumentoDialog = () => {
    setOpenDocumentoDialog(false);
    setCurrentDocumento({
      id_expediente: currentExpedienteForDocumento?.id || null,
      id_tipo_documento: null,
      numero_documento: '',
      asunto: '',
      fecha_documento: null,
    });
    setIsEditingDocumento(false);
  };

  const handleDocumentoInputChange = (e) => {
    setCurrentDocumento({
      ...currentDocumento,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmitDocumento = async (e) => {
    e.preventDefault();

    // Validate required fields
    if (!currentDocumento.id_tipo_documento) {
      showSweetAlert({
        icon: "error",
        title: "Error",
        text: "El campo Tipo de Documento es obligatorio.",
      });
      return;
    }
    if (
      !currentDocumento.numero_documento ||
      currentDocumento.numero_documento.trim() === ""
    ) {
      showSweetAlert({
        icon: "error",
        title: "Error",
        text: "El campo Número de Documento es obligatorio.",
      });
      return;
    }
    if (!currentDocumento.asunto || currentDocumento.asunto.trim() === "") {
      showSweetAlert({
        icon: "error",
        title: "Error",
        text: "El campo Asunto es obligatorio.",
      });
      return;
    }

    try {

      const documentoData = {
        id_expediente: currentDocumento.id_expediente,
        id_tipo_documento: currentDocumento.id_tipo_documento.id,
        numero_documento: currentDocumento.numero_documento,
        asunto: currentDocumento.asunto,
        fecha_documento:
          (currentDocumento.fecha_documento
            ? parseISOToLimaDate(currentDocumento.fecha_documento)
            : "") || null,
        estado: currentDocumento.estado || 'PENDIENTE'
      };

      let response;
      if (isEditingDocumento) {
        response = await updateDocumento(currentDocumento.id, documentoData);
      } else {
        response = await createDocumento(documentoData);
      }

      if (response.status === 200 || response.status === 201) {
      
        handleCloseDocumentoDialog();
        
         if (openDocumentosListDialog && currentExpedienteForList) {
          handleOpenDocumentosList(currentExpedienteForList);
        }
        showSweetAlert({
          icon: 'success',
          title: 'Éxito',
          text: isEditingDocumento ? 'Documento actualizado correctamente' : 'Documento agregado correctamente',
          timer: 2500,
          timerProgressBar: true,
          showConfirmButton: false
        });
      
      // const documento = {
      //   ...currentDocumento,
      //   id_tipo_documento:
      //     typeof currentDocumento.id_tipo_documento === "object"
      //       ? currentDocumento.id_tipo_documento.id
      //       : currentDocumento.id_tipo_documento,
      //   fecha_documento:
      //     (currentDocumento.fecha_documento
      //       ? parseISOToLimaDate(currentDocumento.fecha_documento)
      //       : "") || null,
      //   id_usuario_creador,
      //   estado: "PENDIENTE",
      // };

      // await createDocumento(documento);
      // handleCloseDocumentoDialog();
      // showSweetAlert({
      //   icon: "success",
      //   title: "Éxito",
      //   text: "Documento agregado correctamente",
      //   timer: 2500,
      //   timerProgressBar: true,
      //   showConfirmButton: false,
      // });

      // // Optionally refresh the expediente data if needed
      // fetchPaginatedExpedientes(filters, pagination);
      } 
    } catch (error) {
      console.error("Error submitting documento:", error);
      showSweetAlert({
        icon: "error",
        title: "Error",
        text: "Error al procesar la solicitud. Por favor, intente de nuevo.",
      });
    }
  };

  const handleOpenDocumentosList = async (expediente) => {
    setCurrentExpedienteForList(expediente);
    setIsLoadingDocumentos(true);
    setOpenDocumentosListDialog(true);

    try {
      const response = await getDocumentosByExpedienteId(expediente.id);
      if (response.data && Array.isArray(response.data)) {
        setDocumentosList(response.data);
      } else {
        setDocumentosList([]);
        console.error("Unexpected response format:", response.data);
      }
    } catch (error) {
      console.error("Error fetching documentos by expediente ID:", error);
      showSweetAlert({
        icon: "error",
        title: "Error",
        text: "Error al cargar los documentos asociados al expediente.",
      });
      setDocumentosList([]);
    } finally {
      setIsLoadingDocumentos(false);
    }
  };

  const handleCloseDocumentosList = () => {
    setOpenDocumentosListDialog(false);
    setDocumentosList([]);
    setCurrentExpedienteForList(null);
  };

  return (
    <LocalizationProvider
      dateAdapter={AdapterDateFns}
      adapterLocale={es}
      dateLibInstance={{
        // Configurar para que siempre use la zona horaria de Lima
        formatString: (date, format) => {
          // Implementar formateo personalizado si es necesario
          return format;
        },
        parse: (value, format) => {
          // Implementar parseo personalizado si es necesario
          return new Date(value);
        },
      }}>
      <div>
        <h2>Gestión de Expedientes</h2>
        <input
          type="file"
          accept=".xlsx, .xls"
          onChange={handleFileUpload}
          ref={fileInputRef}
          style={{ display: "none" }}
        />
        <div style={{ marginBottom: "1rem" }}>
          <BootstrapButton
            variant="contained"
            color="celeste"
            onClick={triggerFileInput}
            style={{ marginRight: "1rem" }}>
            Seleccionar Archivo
          </BootstrapButton>

          <>
            <DatePicker
              label="Fecha de Brecha"
              value={parseISOToLimaDate(fechaBrecha) || null}
              onChange={(newValue) => {
                setFechaBrecha(toISOLimaDate(newValue));
              }}
              slotProps={{
                textField: {
                  size: "small",
                  style: { marginRight: "1rem", width: "200px" },
                  helperText: "Fecha requerida para importar",
                  required: true,
                },
              }}
              format="dd/MM/yyyy"
            />

            <BootstrapButton
              variant="contained"
              color="primary"
              onClick={handleImport}
              disabled={!fechaBrecha || isProcessing} // Añadido isProcessing para deshabilitar durante el proceso
              style={{ marginRight: "1rem" }}>
              {isProcessing ? "Importando..." : "Importar"}
            </BootstrapButton>
          </>
        </div>

        {isProcessing && (
          <div style={{ marginBottom: "1rem" }}>
            <CircularProgress />
            <span style={{ marginLeft: "10px" }}>Procesando archivo...</span>
          </div>
        )}

        <div style={{ marginBottom: "1rem" }}>
          <BootstrapButton
            variant="contained"
            color="primary"
            onClick={handleOpen}
            style={{ marginRight: "1rem" }}>
            Agregar Nuevo Expediente
          </BootstrapButton>

          <TextField
            name="filtro"
            value={filters.filtro}
            onChange={handleFilterChange}
            placeholder="Buscar en todos los campos"
            variant="outlined"
            size="small"
            style={{ marginRight: "1rem" }}
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
                  Asunto
                  <TextField
                    name="asunto"
                    value={filters.asunto}
                    onChange={handleFilterChange}
                    placeholder="Filtrar por Asunto"
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
                    placeholder="Filtrar por Remitente"
                    variant="outlined"
                    size="small"
                    fullWidth
                    margin="dense"
                  />
                </TableCell>
                <TableCell>
                  Documento Origen
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
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : expedientes.length > 0 ? (
                expedientes.map((expediente, index) => (
                  <StyledTableRow
                    key={expediente.id}
                    tabIndex={0}
                    // onKeyDown={(e) => {
                    //   if (e.key === 'Enter') {
                    //     handleEdit(expediente);
                    //   }
                    // }}
                  >
                    <TableCell>
                      {pagination.pageIndex * pagination.pageSize + index + 1}
                    </TableCell>
                    <TableCell>{expediente.cut || ""}</TableCell>
                    <TableCell>{expediente.asunto || ""}</TableCell>
                    <TableCell>{expediente.remitente || ""}</TableCell>
                    <TableCell>
                      {`${expediente.TipoDocumento?.nombre || ""} ${
                        expediente.numero_documento || ""
                      }`.trim()}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Listar Documentos">
                        <BootstrapButton
                          color="celeste"
                          onClick={() => handleOpenDocumentosList(expediente)}
                          style={{ marginRight: "8px", padding: "4px 8px" }}
                          size="small">
                          <ListAltIcon fontSize="small" />
                        </BootstrapButton>
                      </Tooltip>
                      <Tooltip title="Agregar Documento">
                        <BootstrapButton
                          color="primary"
                          onClick={() => handleOpenDocumentoDialog(expediente)}
                          style={{ marginRight: "8px", padding: "4px 8px" }}
                          size="small">
                          <NoteAddIcon fontSize="small" />
                        </BootstrapButton>
                      </Tooltip>
                      <Tooltip title="Editar Expediente">
                        <BootstrapButton
                          color="success"
                          onClick={() => handleEdit(expediente)}
                          style={{ marginRight: "8px", padding: "4px 8px" }}
                          size="small">
                          <EditIcon fontSize="small" />
                        </BootstrapButton>
                      </Tooltip>
                      <Tooltip title="Eliminar Expediente">
                        <BootstrapButton
                          color="secondary"
                          onClick={() => handleDelete(expediente.id)}
                          style={{ padding: "4px 8px" }}
                          size="small">
                          <DeleteIcon fontSize="small" />
                        </BootstrapButton>
                      </Tooltip>
                    </TableCell>
                  </StyledTableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    No hay expedientes disponibles
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
          rowsPerPageOptions={[5, 10, 25]}
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} de ${count !== -1 ? count : "más de " + to}`
          }
          labelRowsPerPage="Filas por página:"
        />

        <Dialog
          open={open}
          onClose={handleClose}
          aria-labelledby="dialog-title">
          <form onSubmit={handleSubmit}>
            <DialogTitle id="dialog-title">
              {isEditing ? "Editar Expediente" : "Agregar Nuevo Expediente"}
            </DialogTitle>
            <DialogContent>
              <TextField
                autoFocus
                margin="dense"
                name="cut"
                label="CUT *"
                type="text"
                fullWidth
                value={currentExpediente.cut || ""}
                onChange={handleInputChange}
                inputRef={cutRef}
              />
              <TextField
                margin="dense"
                name="estupa"
                label="Estupa"
                type="text"
                fullWidth
                value={currentExpediente.estupa || ""}
                onChange={handleInputChange}
              />
              <Autocomplete
                options={tiposProcedimientos}
                getOptionLabel={(option) => option}
                value={currentExpediente.tipo_procedimiento || null}
                onInputChange={(event, newInputValue) => {
                  setProcedimientoInputValue(newInputValue);
                  // Update currentExpediente directly with the input value
                  setCurrentExpediente({
                    ...currentExpediente,
                    tipo_procedimiento: newInputValue || "",
                  });
                }}
                onChange={(event, newValue) => {
                  setCurrentExpediente({
                    ...currentExpediente,
                    tipo_procedimiento: newValue || "",
                  });
                }}
                freeSolo // Allow users to enter values that don't exist in the options
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Tipo de Procedimiento *"
                    margin="dense"
                    fullWidth
                    inputRef={tipoProcedimientoRef}
                  />
                )}
              />
              <Autocomplete
                options={nombresUnicosTiposDocumentos}
                getOptionLabel={(option) => {
                  // Si option es un objeto con nombre, usa eso
                  if (option && option.nombre) {
                    return option.nombre;
                  }
                  // Si no hay option pero hay un tipo de documento en currentExpediente, usa eso
                  if (
                    currentExpediente.TipoDocumento &&
                    currentExpediente.TipoDocumento.nombre
                  ) {
                    return currentExpediente.TipoDocumento.nombre;
                  }
                  // Valor por defecto
                  return "";
                }}
                value={currentExpediente.id_tipo_documento || null}
                onInputChange={(event, newInputValue) => {
                  setTipoDocumentoInputValue(newInputValue);
                }}
                onChange={(event, newValue) => {
                  setCurrentExpediente({
                    ...currentExpediente,
                    id_tipo_documento: newValue || null, // Store the entire object
                  });
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Tipo de Documento *"
                    margin="dense"
                    fullWidth
                    inputRef={tipoDocumentoRef}
                  />
                )}
                isOptionEqualToValue={(option, value) => {
                  // Compara por ID si ambos tienen ID
                  if (option && value && option.id && value.id) {
                    return option.id === value.id;
                  }
                  // Si no tienen ID, compara por nombre
                  if (option && value && option.nombre && value.nombre) {
                    return option.nombre === value.nombre;
                  }
                  // Si no hay forma de comparar, son diferentes
                  return false;
                }}
              />
              <TextField
                margin="dense"
                name="numero_documento"
                label="Número de Documento *"
                type="text"
                fullWidth
                value={currentExpediente.numero_documento || ""}
                onChange={handleInputChange}
                inputRef={numeroDocumentoRef}
              />

              <DatePicker
                label="Fecha del documento"
                value={
                  originalDocumento.fecha_documento
                    ? parseISOToLimaDate(originalDocumento.fecha_documento)
                    : null
                }
                onChange={(newValue) => {
                  setOriginalDocumento({
                    ...originalDocumento,
                    fecha_documento: newValue ? toISOLimaDate(newValue) : null,
                  });
                }}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    margin: "dense",
                    variant: "outlined",
                    error: false,
                    helperText: "",
                  },
                }}
                format="dd/MM/yyyy"
              />

              <TextField
                margin="dense"
                name="periodo"
                label="Periodo *"
                type="text"
                fullWidth
                value={currentExpediente.periodo || ""}
                onChange={handleInputChange}
                inputRef={periodoRef}
              />
              <TextField
                margin="dense"
                name="asunto"
                label="Asunto *"
                type="text"
                fullWidth
                value={currentExpediente.asunto || ""}
                onChange={handleInputChange}
                inputRef={asuntoRef}
              />
              <TextField
                margin="dense"
                name="remitente"
                label="Remitente *"
                type="text"
                fullWidth
                value={currentExpediente.remitente || ""}
                onChange={handleInputChange}
                inputRef={remitenteRef}
              />
            </DialogContent>
            <DialogActions>
              <StyledDialogButton onClick={handleClose} color="secondary">
                Cancelar
              </StyledDialogButton>
              <StyledDialogButton type="submit" color="primary">
                {isEditing ? "Actualizar" : "Agregar"}
              </StyledDialogButton>
            </DialogActions>
          </form>
        </Dialog>

        {/* Documento Dialog */}
        <Dialog
          open={openDocumentoDialog}
          onClose={handleCloseDocumentoDialog}
          aria-labelledby="dialog-documento-title"
          fullWidth
          maxWidth="md">
          <form onSubmit={handleSubmitDocumento}>
            <DialogTitle id="dialog-documento-title">
              {isEditingDocumento 
                ? `Editar Documento para Expediente ${currentExpedienteForDocumento?.cut || ""}`
                : `Agregar Documento para Expediente ${currentExpedienteForDocumento?.cut || ""}`}
            </DialogTitle>
            <DialogContent>
              <div style={{ marginBottom: "10px" }}>
                <strong>Expediente:</strong>{" "}
                {currentExpedienteForDocumento?.cut || ""} -{" "}
                {currentExpedienteForDocumento?.asunto || ""}
              </div>

              <Autocomplete
                id="tipo-documento-select"
                options={nombresUnicosTiposDocumentos}
                getOptionLabel={(option) => option.nombre || ""}
                value={currentDocumento.id_tipo_documento}
                onChange={(event, newValue) => {
                  setCurrentDocumento({
                    ...currentDocumento,
                    id_tipo_documento: newValue,
                  });
                }}
                onInputChange={(event, newInputValue) => {
                  setTipoDocumentoInputValue(newInputValue);
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Tipo de Documento"
                    variant="outlined"
                    margin="normal"
                    fullWidth
                    required
                  />
                )}
              />

              <TextField
                margin="normal"
                name="numero_documento"
                label="Número de Documento"
                type="text"
                fullWidth
                required
                value={currentDocumento.numero_documento}
                onChange={handleDocumentoInputChange}
              />

              <TextField
                margin="normal"
                name="asunto"
                label="Asunto"
                type="text"
                fullWidth
                required
                multiline
                rows={3}
                value={currentDocumento.asunto}
                onChange={handleDocumentoInputChange}
              />

              <DatePicker
                label="Fecha del Documento"
                value={
                  currentDocumento.fecha_documento
                    ? parseISOToLimaDate(currentDocumento.fecha_documento)
                    : null
                }
                onChange={(newValue) => {
                  setCurrentDocumento((prevDocumento) => ({
                    ...prevDocumento,
                    fecha_documento: newValue ? toISOLimaDate(newValue) : null,
                  }));
                }}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    margin: "normal",
                    variant: "outlined",
                  },
                }}
                format="dd/MM/yyyy"
              />
            </DialogContent>
            <DialogActions>
              <StyledDialogButton
                onClick={handleCloseDocumentoDialog}
                color="primary"
                style={{ minWidth: "80px", padding: "4px 8px" }}
                size="small">
                Cancelar
              </StyledDialogButton>
              <StyledDialogButton
                type="submit"
                color="primary"
                style={{ minWidth: "80px", padding: "4px 8px" }}
                size="small">
                {isEditingDocumento ? "Actualizar" : "Guardar"}
              </StyledDialogButton>
            </DialogActions>
          </form>
        </Dialog>
        <Dialog
          open={openDocumentosListDialog}
          onClose={handleCloseDocumentosList}
          aria-labelledby="documentos-list-dialog-title"
          maxWidth="md"
          fullWidth>
          <DialogTitle
            id="documentos-list-dialog-title"
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
            <div>
              {currentExpedienteForList
                ? `Documentos del Expediente: ${currentExpedienteForList.cut}`
                : "Documentos del Expediente"}
            </div>
            <Typography variant="subtitle2" color="text.secondary">
              {documentosList.length} documento(s) encontrado(s)
            </Typography>
          </DialogTitle>
          <DialogContent dividers>
            {isLoadingDocumentos ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  padding: "20px",
                }}>
                <CircularProgress />
              </div>
            ) : documentosList.length > 0 ? (
              <TableContainer component={Paper} sx={{ maxHeight: 440 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Item</TableCell>
                      <TableCell>Tipo Documento</TableCell>
                      <TableCell>Número</TableCell>
                      <TableCell>Asunto</TableCell>
                      <TableCell>Fecha</TableCell>
                      <TableCell>Estado</TableCell>
                      <TableCell>Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {documentosList.map((documento, index) => (
                      <StyledTableRow key={documento.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>
                          {documento.TipoDocumento?.nombre || ""}
                        </TableCell>
                        <TableCell>
                          {documento.numero_documento || "Sin número"}
                        </TableCell>
                        <TableCell>
                          {documento.asunto || "Sin asunto"}
                        </TableCell>
                        <TableCell>
                          {documento.fecha_documento
                            ? formatDate(documento.fecha_documento)
                            : "No especificada"}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={documento.estado || "No especificado"}
                            color={
                              documento.estado === "PENDIENTE"
                                ? "warning"
                                : documento.estado === "ASIGNADO"
                                ? "info"
                                : documento.estado === "EN_REVISION"
                                ? "primary"
                                : documento.estado === "CERRADO"
                                ? "success"
                                : documento.estado === "ANULADO"
                                ? "error"
                                : documento.estado === "ARCHIVADO"
                                ? "secondary"
                                : "default"
                            }
                          />
                        </TableCell>
                        <TableCell>
                           <Button 
                            size="small" 
                            color="primary"
                            onClick={() => handleEditDocumento(documento.id)}
                          >
                            Editar
                          </Button>
                          <Button size="small" color="secondary">
                            Asignar
                          </Button>
                        </TableCell>
                      </StyledTableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  padding: "40px 20px",
                }}>
                <DescriptionIcon
                  sx={{ fontSize: 60, color: "text.disabled", mb: 2 }}
                />
                <Typography variant="h6" color="text.secondary">
                  No hay documentos asociados
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Este expediente no tiene documentos registrados.
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ padding: "16px" }}>
            <Button
              onClick={() => handleCloseDocumentosList()}
              color="primary"
              variant="outlined">
              Cerrar
            </Button>
            <Button
              onClick={() =>
                handleOpenDocumentoDialog(currentExpedienteForList)
              }
              color="primary"
              variant="contained"
              startIcon={<AddIcon />}>
              Agregar Documento
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    </LocalizationProvider>
  );
};

export default Expedientes;
