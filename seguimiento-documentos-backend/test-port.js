const express = require('express');
const app = express();
app.use(express.json());
app.post('/test', (req, res) => res.json({ ok: 'POST works!' }));
app.listen(5555, () => console.log('Test on 5555'));
