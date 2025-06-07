import React, { useState } from 'react';
import { TextField, Button, Typography, Container, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { login } from '../../services/api';

const Login = ({ onLogin }) => {
  const [credentials, setCredentials] = useState({ usuario: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await login(credentials);
      localStorage.setItem('token', response.data.token);
      onLogin(response.data);
      navigate('/dashboard'); // Redirige al dashboard después de iniciar sesión
    } catch (error) {
      console.error('Error de inicio de sesión:', error);
      setError('Error de inicio de sesión. Por favor, verifica tus credenciales.');
    }
  };

  return (
    <Container maxWidth="xs">
      <Typography variant="h4">Iniciar Sesión</Typography>
      {error && <Alert severity="error" style={{ marginTop: 16, marginBottom: 16 }}>{error}</Alert>}
      <form onSubmit={handleSubmit}>
        <TextField
          fullWidth
          margin="normal"
          name="usuario"
          label="Usuario"
          value={credentials.usuario}
          onChange={handleChange}
        />
        <TextField
          fullWidth
          margin="normal"
          name="password"
          label="Contraseña"
          type="password"
          value={credentials.password}
          onChange={handleChange}
        />
        <Button type="submit" fullWidth variant="contained" color="primary" style={{ marginTop: 16 }}>
          Iniciar Sesión
        </Button>
      </form>
    </Container>
  );
};

export default Login;