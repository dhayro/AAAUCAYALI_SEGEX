const express = require('express');

const app = express();
app.use(express.json());

// Test GET
app.get('/api/test', (req, res) => {
  res.json({ method: 'GET' });
});

// Test POST
app.post('/api/test', (req, res) => {
  res.json({ method: 'POST' });
});

// Test sisgedRoutes
const sisgedRoutes = require('./src/routes/sisgedRoutes');
app.use('/api/sisged', sisgedRoutes);

app.listen(3003, () => {
  console.log('Test server on 3003');
});
