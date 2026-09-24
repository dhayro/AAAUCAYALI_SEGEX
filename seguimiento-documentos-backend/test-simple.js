const express = require('express');

const app = express();
app.use(express.json());

app.get('/test', (req, res) => res.json({ ok: 'GET' }));
app.post('/test', (req, res) => res.json({ ok: 'POST' }));

app.listen(3003, () => console.log('Simple test on 3003'));
