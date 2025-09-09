const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();
const { getMaps, createMap, getMapById, updateMap, deleteMap } = require("../controller/map");
const multer = require("multer");

// Carpeta donde guardaremos los mapas
const MAPS_DIR = path.join(__dirname, "../maps");
const upload = multer({ dest: MAPS_DIR });

if (!fs.existsSync(MAPS_DIR)) {
  fs.mkdirSync(MAPS_DIR, { recursive: true });
}

// Obtener todos los mapas
router.get("/maps/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const maps = await getMaps(userId);
    res.json(maps);
  } catch (err) {
    console.error("Error al obtener mapas:", err);
    res.status(500).send("Error interno del servidor");
  }
});

// Insertar un nuevo mapa
router.post("/insert", upload.single("mapFile"), async (req, res) => {
  try {
    const metadata = JSON.parse(req.body.metadata);
    const mapFilePath = req.file.path; // ruta temporal del archivo subido

    // Aquí guardas la metadata en la BD y la referencia al archivo
    const mapData = { ...metadata, mapFilePath };
    const savedMap = await createMap(mapData);

    res.status(201).json({ success: true, map: savedMap });
  } catch (error) {
    console.error("Error al guardar el mapa:", error);
    res.status(500).send("Error interno al guardar el mapa");
  }
});

// Actualizar mapa
router.put("/update/:id", async (req, res) => {
  try {
    const mapId = req.params.id;
    const mapData = req.body;
    const updatedMap = await updateMap(mapId, mapData);
    res.json(updatedMap);
  } catch (err) {
    console.error("Error al actualizar mapa:", err);
    res.status(500).send("Error interno del servidor");
  }
});

// Eliminar mapa
router.delete("/delete/:id", async (req, res) => {
  try {
    console.log("Deleting map:", req.params.id);
    const mapId = req.params.id;
    const deletedMap = await deleteMap(mapId);
    res.json(deletedMap);
  } catch (err) {
    console.error("Error al eliminar mapa:", err);
    res.status(500).send("Error interno del servidor");
  }
});

module.exports = router;
