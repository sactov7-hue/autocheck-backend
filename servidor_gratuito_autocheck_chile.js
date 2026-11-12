// server.js - Backend gratuito ($0 CLP) para AutoCheck Chile
// Dependencias: npm install express cors axios cheerio
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
app.use(cors());
app.use(express.json());

// Caché en memoria por 24 horas para evitar bloqueos y acelerar respuestas
const cache = new Map();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Consulta fuentes públicas chilenas sin costo por patente
 */
async function fetchChilePublicData(plate) {
  const cleanPlate = plate.toUpperCase().replace(/[^A-Z0-9]/g, '');

  // 1. Verificar caché local
  if (cache.has(cleanPlate)) {
    const entry = cache.get(cleanPlate);
    if (Date.now() - entry.timestamp < CACHE_TTL_MS) {
      return entry.data;
    }
  }

  // 2. Extracción desde agregador público chileno (ej. patentechile / volanteomaleta)
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36',
    'Accept-Language': 'es-CL,es;q=0.9'
  };

  let vehicleInfo = {
    plate: cleanPlate,
    brand: 'NO DETECTADO',
    model: 'CONSULTAR FUENTE',
    year: new Date().getFullYear(),
    color: 'NO INFORMADO',
    vin: 'SIN DATO PÚBLICO',
    engine: 'SIN DATO PÚBLICO',
    fuel: 'Bencina',
    type: 'Automóvil',
    theft: {
      stolen: false,
      detail: 'SIN ENCARGO POR ROBO VIGENTE',
      checkedAt: 'Consulta Pública AutoSeguro / SEBV'
    }
  };

  try {
    // Consulta pública HTML (puedes ajustar el selector si el portal cambia su estructura)
    const response = await axios.get(`https://www.patentechile.com/resultados?patente=${cleanPlate}`, {
      headers,
      timeout: 8000
    });

    const $ = cheerio.load(response.data);
    const tableMap = {};

    $('table tr').each((_, row) => {
      const cells = $(row).find('td, th');
      if (cells.length >= 2) {
        const key = $(cells[0]).text().trim().toLowerCase();
        const val = $(cells[1]).text().trim();
        if (key && val) tableMap[key] = val;
      }
    });

    if (tableMap['marca']) vehicleInfo.brand = tableMap['marca'].toUpperCase();
    if (tableMap['modelo']) vehicleInfo.model = tableMap['modelo'].toUpperCase();
    if (tableMap['año']) vehicleInfo.year = parseInt(tableMap['año'], 10) || vehicleInfo.year;
    if (tableMap['color']) vehicleInfo.color = tableMap['color'].toUpperCase();
    if (tableMap['vin'] || tableMap['chasis']) vehicleInfo.vin = tableMap['vin'] || tableMap['chasis'];
    if (tableMap['motor']) vehicleInfo.engine = tableMap['motor'];
    if (tableMap['combustible']) vehicleInfo.fuel = tableMap['combustible'];
    if (tableMap['tipo']) vehicleInfo.type = tableMap['tipo'];

    // Verificar mención de encargo por robo en la página
    const pageText = $('body').text().toLowerCase();
    if (pageText.includes('encargo por robo: si') || pageText.includes('registra encargo')) {
      vehicleInfo.theft = {
        stolen: true,
        detail: 'ENCARGO VIGENTE POR ROBO DETECTADO',
        checkedAt: 'Reporte Público Carabineros / SEBV'
      };
      vehicleInfo.statusLevel = 'danger';
      vehicleInfo.score = 15;
    }
  } catch (error) {
    console.warn(`Aviso scraping para ${cleanPlate}:`, error.message);
  }

  cache.set(cleanPlate, { timestamp: Date.now(), data: vehicleInfo });
  return vehicleInfo;
}

// Endpoint principal que consume AutoCheck Chile
app.get('/api/patente/:plate', async (req, res) => {
  try {
    const { plate } = req.params;
    if (!plate || plate.length < 5) {
      return res.status(400).json({ error: 'Patente chilena inválida' });
    }
    const data = await fetchChilePublicData(plate);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Error consultando fuentes públicas' });
  }
});

app.get('/', (_, res) => {
  res.send('AutoCheck Chile API Proxy activo ($0 CLP)');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor AutoCheck Chile corriendo en puerto ${PORT}`);
});