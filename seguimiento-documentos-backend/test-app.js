const express = require('express');
const sisgedRoutes = require('./src/routes/sisgedRoutes');

const app = express();
app.use(express.json());
app.use('/api/sisged', sisgedRoutes);

const PORT = 3003;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});
