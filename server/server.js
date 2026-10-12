const express = require('express');
const path = require('path');
const rates = require('./rates.json');

const app = express();
const PORT = 3000;
// Корінь проєкту: тут лежать index.html, css/, js/
const ROOT = path.join(__dirname, '..');

// GET /api/rates - усі курси; з параметрами from і to - курс однієї пари
app.get('/api/rates', (req, res) => {
  const { from, to } = req.query;

  if (from === undefined && to === undefined) {
    return res.json(rates);
  }
  if (typeof from !== 'string' || typeof to !== 'string') {
    return res.status(400).json({ error: 'Потрібні обидва параметри: from і to' });
  }

  const base = from.toUpperCase();
  const quote = to.toUpperCase();

  if (!Object.hasOwn(rates.rates, base) || !Object.hasOwn(rates.rates, quote)) {
    return res.status(404).json({ error: 'Невідома валюта' });
  }

  const amount = req.query.amount === undefined ? 1 : Number(req.query.amount);
  if (!(amount > 0) || !Number.isFinite(amount)) {
    return res.status(400).json({ error: 'Некоректна сума' });
  }

  const rate = rates.rates[quote] / rates.rates[base];
  res.json({
    base,
    quote,
    amount,
    rate: Number(rate.toPrecision(6)),
    result: Number((amount * rate).toFixed(2)),
    date: rates.date
  });
});

// Роздача клієнтської частини застосунку
app.use('/css', express.static(path.join(ROOT, 'css')));
app.use('/js', express.static(path.join(ROOT, 'js')));
app.get('/', (req, res) => {
  res.sendFile(path.join(ROOT, 'index.html'));
});

// Будь-який інший шлях /api/... - JSON 404 замість HTML
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Не знайдено' });
});

app.listen(PORT, () => {
  console.log(`Сервер запущено на http://localhost:${PORT}`);
});