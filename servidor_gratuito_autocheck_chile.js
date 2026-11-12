// server.js - Backend gratuito ($0 CLP) para AutoCheck Chile
// Dependencias: npm install express cors axios cheerio
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
app.use(cors());
app.use(express.json());

// Ruta principal para verificar que está activo
app.get('/', (req, res) => {
    res.send('AutoCheck Chile API Proxy activo ($0 CLP)');
});

// Ruta que consulta la patente desde tu página web
app.get('/api/vehiculo/:patente', async (req, res) => {
    const patente = req.params.patente.toUpperCase();
    try {
        // Respuesta de prueba para confirmar enlace exitoso
        res.json({
            patente: patente,
            marca: "Vehículo Verificado",
            ano: "2020",
            estado: "Conexión exitosa con Render - Sin multas pendientes"
        });
    } catch (error) {
        res.status(500).json({ error: "No se pudo procesar la solicitud en el servidor." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});
