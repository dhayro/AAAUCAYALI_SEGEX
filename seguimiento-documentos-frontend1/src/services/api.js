import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token expirado o inválido
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const login = (credentials) => api.post('/usuarios/login', credentials);
export const register = (userData) => api.post('/usuarios/registro', userData);

export const getDocumentos = () => api.get('/documentos');
export const createDocumento = (documentoData) => api.post('/documentos', documentoData);

export const getExpedientes = () => api.get('/expedientes');
export const createExpediente = (expedienteData) => api.post('/expedientes', expedienteData);

export const getUsuarios = () => api.get('/usuarios');
export const createUsuario = (usuarioData) => api.post('/usuarios', usuarioData);

// ... otras importaciones y configuraciones

export const getAreas = (params) => api.get('/areas', { params });
export const getAreasPrincipales = (params) => api.get('/areas/principales', { params });
export const getAreasHijas = (parentId) => api.get(`/areas/${parentId}/hijas`);

// ... otras exportaciones

// Agrega más funciones para otras rutas de la API según sea necesario

export default api;