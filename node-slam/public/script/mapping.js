// SLAM Mapping System - Fixed LIDAR Visualization
class SLAMSystem {
  constructor() {
    this.canvas = document.getElementById("mapCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.socket = null;
    this.isMapping = false;

    // Robot state
    this.robotPose = { x: 0, y: 0, theta: 0 };
    this.previousEncoderTicks = null;
    this.robotPath = [];

    // Map data
    this.lidarPoints = [];
    this.landmarks = [];
    this.occupancyGrid = new Map();

    // Visualization
    this.zoom = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.centerX = 0;
    this.centerY = 0;

    // SLAM parameters
    this.mapResolution = 5; // cm per pixel
    this.maxLidarRange = 1000; // cm
    this.qualityThreshold = 0; // Reducido para ver más puntos
    this.loopClosureThreshold = 50; // cm

    // Odometry
    this.ticks_per_rev = 360;
    this.wheel_diameter = 0.87; // cm
    this.wheel_base = 5.5;
    this.k = 1.37; // valor inicial basado en promedio
    this.smoothFactor = 0.95; // entre 0.9 y 0.99 para buena suavidad
    this.previousLeft = 0;
    this.previousRight = 0;

    // Debug mode
    this.debugMode = true;

    // Statistics
    this.stats = {
      mappingQuality: 0,
      loopClosures: 0,
      landmarks: 0,
      trajectoryLength: 0,
    };

    this.initCanvas();
    this.initWebSocket();
    this.startRenderLoop();

    console.log("🚀 SLAM System initialized");
  }

  initCanvas() {
    this.resizeCanvas();
    window.addEventListener("resize", () => this.resizeCanvas());

    // Mouse controls
    let isDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;

    this.canvas.addEventListener("mousedown", (e) => {
      isDragging = true;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    });

    this.canvas.addEventListener("mousemove", (e) => {
      if (isDragging) {
        const deltaX = e.clientX - lastMouseX;
        const deltaY = e.clientY - lastMouseY;
        this.panX += deltaX;
        this.panY += deltaY;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
      }
    });

    this.canvas.addEventListener("mouseup", () => {
      isDragging = false;
    });

    this.canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      this.zoom *= zoomFactor;
      this.zoom = Math.max(0.1, Math.min(10, this.zoom));
      document.getElementById("zoom-level").textContent = this.zoom.toFixed(1) + "x";
    });
  }

  resizeCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.centerX = this.canvas.width / 2;
    this.centerY = this.canvas.height / 2;
  }

  initWebSocket() {
    this.socket = new WebSocket("ws://127.0.0.1:5000");

    this.socket.addEventListener("open", () => {
      console.log("🔗 Conectado al servidor WebSocket");
      this.updateConnectionStatus("websocket", true);
    });

    this.socket.addEventListener("close", () => {
      console.warn("⚠️ Conexión cerrada. Reintentando en 3s...");
      this.updateConnectionStatus("websocket", false);
      setTimeout(() => this.initWebSocket(), 3000);
    });

    this.socket.addEventListener("message", (event) => {
      this.handleWebSocketMessage(event);
    });

    this.socket.addEventListener("error", (error) => {
      console.error("❌ Error WebSocket:", error);
      this.updateConnectionStatus("websocket", false);
    });
  }

  handleWebSocketMessage(event) {
    try {
      const payload = JSON.parse(event.data);
      const data = payload.data;

      if (payload.type === "slam") {
        this.updateConnectionStatus("imu", true);
        this.updateConnectionStatus("lidar", true);

        // Debug: Log received data
        if (this.debugMode) {
          // console.log('📡 Datos recibidos:', {
          //     angle: data.angle,
          //     distance: data.distance,
          //     quality: data.quality,
          //     robotPose: this.robotPose
          // });
        }

        // Update IMU data
        this.updateIMUDisplay(data);

        // Update odometry
        this.updateOdometry(data);

        // Process LIDAR data - SIEMPRE procesar para debug
        this.processLidarData(data);

        // Update timestamp
        if (document.getElementById("last-update-display")) {
          document.getElementById("last-update-display").textContent = `Last update: ${new Date().toISOString()} / ${
            data.timestamp
          }`;
        }
      }
    } catch (error) {
      console.error("❌ Error al procesar el mensaje:", error, event.data);
    }
  }

  updateIMUDisplay(data) {
    const angle = this.getHeading(
      { x: data.mag_x, y: data.mag_y, z: data.mag_z },
      { x: data.accel_x, y: data.accel_y, z: data.accel_z }
    );

    // Update compass
    const needle = document.getElementById("compass-needle");
    if (needle) {
      needle.style.transform = `translate(-50%, -100%) rotate(${angle}deg)`;
    }

    // Update IMU values
    this.updateElementText("imu-accel-x", data.accel_x?.toFixed(2) || "0.00");
    this.updateElementText("imu-accel-y", data.accel_y?.toFixed(2) || "0.00");
    this.updateElementText("imu-accel-z", data.accel_z?.toFixed(2) || "0.00");
    this.updateElementText("imu-gyro-x", data.gyro_x?.toFixed(2) || "0.00");
    this.updateElementText("imu-gyro-y", data.gyro_y?.toFixed(2) || "0.00");
    this.updateElementText("imu-gyro-z", data.gyro_z?.toFixed(2) || "0.00");
    this.updateElementText("imu-mag-x", data.mag_x?.toFixed(2) || "0.00");
    this.updateElementText("imu-mag-y", data.mag_y?.toFixed(2) || "0.00");
    this.updateElementText("imu-mag-z", data.mag_z?.toFixed(2) || "0.00");
    this.updateElementText("imu-azimut", angle.toFixed(2) + "°");
  }

  updateElementText(id, text) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = text;
    }
  }

  updateOdometry(data) {
    if (!data.left || !data.right) {
      return; // Skip if missing odometry data
    }

    let { left, right, timestamp } = data;

    console.log("Left: ", left, "Right:", right);
    // Umbral mínimo de cambio para considerar nueva lectura
    const minChange = 50;

    // Usar valores absolutos para calcular deltas
    const deltaLeft = Math.abs(left - this.previousLeft);
    const deltaRight = Math.abs(right - this.previousRight);

    if (deltaLeft < minChange && deltaRight < minChange) {
      return;
    }

    // Calcular deltas correctamente
    const diffLeft = left - this.previousLeft;
    const diffRight = right - this.previousRight;

    // Actualizar los valores anteriores con los valores absolutos
    this.previousLeft = left;
    this.previousRight = right;

    // Calcular la razón de movimiento actual y suavizar con factor k
    const currentRatio = diffLeft / diffRight;
    this.k = this.smoothFactor * this.k + (1 - this.smoothFactor) * currentRatio;

    // Corregir deltaRight usando la constante k
    const correctedRight = diffRight * this.k;

    // Procesar odometría si ya hay una muestra previa
    if (this.previousEncoderTicks) {
      const deltaL = diffLeft;
      const deltaR = diffRight;

      // Filtro de umbral para eliminar ruido
      const threshold = 200;
      const filteredDeltaLeft = Math.abs(deltaL) > threshold ? deltaL : 0;
      const filteredDeltaRight = Math.abs(deltaR) > threshold ? deltaR : 0;

      // Convertir ticks a distancia
      const distLeft = (filteredDeltaLeft / this.ticks_per_rev) * Math.PI * this.wheel_diameter;
      const distRight = (filteredDeltaRight / this.ticks_per_rev) * Math.PI * this.wheel_diameter;

      const deltaDist = (distLeft + distRight) / 2;
      const deltaTheta = (distRight - distLeft) / this.wheel_base;

      // Actualizar pose del robot
      this.robotPose.theta += deltaTheta;
      this.robotPose.x += deltaDist * Math.cos(this.robotPose.theta);
      this.robotPose.y += deltaDist * Math.sin(this.robotPose.theta);

      this.robotPath.push({ x: this.robotPose.x, y: this.robotPose.y });
      this.stats.trajectoryLength += Math.abs(deltaDist);

      // Limitar la cantidad de puntos en la trayectoria
      if (this.robotPath.length > 1000) {
        this.robotPath.shift();
      }

      this.updateRobotDisplay();
    }

    // Guardar deltas corregidos para próxima iteración
    this.previousEncoderTicks = { left: diffLeft, right: correctedRight };
  }

  processLidarData(data) {
    // Verificar que tenemos datos de LIDAR válidos
    if (data.angle === undefined || data.distance === undefined) {
      console.warn("⚠️ Datos LIDAR incompletos:", data);
      return;
    }

    const angleRad = (data.angle * Math.PI) / 180 + 0.401426;

    const distance = data.distance / 10;
    const quality = data.quality || 100; // Default quality if not provided

    // Debug: Log LIDAR data
    if (this.debugMode && this.lidarPoints.length % 10 === 0) {
      // console.log('📏 LIDAR:', {
      //     angle: data.angle,
      //     distance: distance,
      //     quality: quality,
      //     angleRad: angleRad
      // });
    }

    // Filter out invalid readings - MUY PERMISIVO para debug
    if (distance <= 0 || distance > this.maxLidarRange) {
      // console.log('📏 LIDAR fuera de rango:', distance);
      return;
    }

    if (quality < this.qualityThreshold) {
      console.log("📏 LIDAR calidad baja:", quality);
      return;
    }

    // Convert to robot-local coordinates
    const localX = distance * Math.cos(angleRad);
    const localY = distance * Math.sin(angleRad);

    // Transform to global coordinates
    const globalX = this.robotPose.x / 100 + localX;
    const globalY = this.robotPose.y / 100 + localY;
    // const globalX = this.robotPose.x + localX * Math.cos(this.robotPose.theta) - localY * Math.sin(this.robotPose.theta);
    // const globalY = this.robotPose.y + localX * Math.sin(this.robotPose.theta) + localY * Math.cos(this.robotPose.theta);
    // Add to map
    const point = {
      x: globalX,
      y: globalY,
      quality: quality,
      timestamp: Date.now(),
      angle: data.angle,
      distance: distance,
      localX: localX,
      localY: localY,
    };

    this.lidarPoints.push(point);

    // Debug: Log point added
    if (this.debugMode) {
      // console.log('✅ Punto LIDAR añadido:', {
      //     global: { x: globalX.toFixed(2), y: globalY.toFixed(2) },
      //     local: { x: localX.toFixed(2), y: localY.toFixed(2) },
      //     robot: { x: this.robotPose.x.toFixed(2), y: this.robotPose.y.toFixed(2), theta: this.robotPose.theta.toFixed(2) },
      //     totalPoints: this.lidarPoints.length
      // });
    }

    // Update occupancy grid only if mapping
    if (this.isMapping) {
      this.updateOccupancyGrid(globalX, globalY);
      this.checkLoopClosure(globalX, globalY);
    }

    // Keep point cloud manageable
    if (this.lidarPoints.length > 5000) {
      this.lidarPoints.shift();
    }

    // Update statistics
    this.updateStatistics();
  }

  updateOccupancyGrid(x, y) {
    const gridX = Math.floor(x / this.mapResolution);
    const gridY = Math.floor(y / this.mapResolution);
    const key = `${gridX},${gridY}`;

    if (!this.occupancyGrid.has(key)) {
      this.occupancyGrid.set(key, { occupied: 0, free: 0 });
    }

    this.occupancyGrid.get(key).occupied++;

    // Mark path as free (simplified)
    const robotGridX = Math.floor(this.robotPose.x / this.mapResolution);
    const robotGridY = Math.floor(this.robotPose.y / this.mapResolution);
    const robotKey = `${robotGridX},${robotGridY}`;

    if (!this.occupancyGrid.has(robotKey)) {
      this.occupancyGrid.set(robotKey, { occupied: 0, free: 0 });
    }
    this.occupancyGrid.get(robotKey).free++;
  }

  checkLoopClosure(x, y) {
    const currentPoint = { x, y };
    for (let i = 0; i < this.landmarks.length; i++) {
      const landmark = this.landmarks[i];
      const distance = Math.sqrt(Math.pow(currentPoint.x - landmark.x, 2) + Math.pow(currentPoint.y - landmark.y, 2));

      if (distance < this.loopClosureThreshold) {
        this.stats.loopClosures++;
        console.log("🔄 Loop closure detected!");
        break;
      }
    }

    // Add new landmark occasionally
    if (this.lidarPoints.length % 100 === 0) {
      this.landmarks.push({ x, y, confidence: 1.0 });
    }
  }

  updateStatistics() {
    this.stats.mappingQuality = Math.min(100, (this.lidarPoints.length / 1000) * 100);
    this.stats.landmarks = this.landmarks.length;

    this.updateElementText("mapping-quality", this.stats.mappingQuality.toFixed(1) + "%");
    this.updateElementText("loop-closures", this.stats.loopClosures.toString());
    this.updateElementText("landmarks", this.stats.landmarks.toString());
    this.updateElementText("trajectory-length", this.stats.trajectoryLength.toFixed(1) + " cm");

    const progressBar = document.getElementById("quality-progress");
    if (progressBar) {
      progressBar.style.width = this.stats.mappingQuality + "%";
    }
  }

  updateRobotDisplay() {
    this.updateElementText("robot-x", this.robotPose.x.toFixed(1));
    this.updateElementText("robot-y", this.robotPose.y.toFixed(1));
    this.updateElementText("robot-theta", ((this.robotPose.theta * 180) / Math.PI).toFixed(1) + "°");
  }

  updateConnectionStatus(type, connected) {
    const indicator = document.getElementById(`${type}-status`);
    const text = document.getElementById(`${type}-text`);

    if (indicator) {
      if (connected) {
        indicator.className = "status-indicator status-online";
      } else {
        indicator.className = "status-indicator status-offline";
      }
    }

    if (text) {
      text.textContent = connected
        ? type === "websocket"
          ? "Connected"
          : "Online"
        : type === "websocket"
        ? "Disconnected"
        : "Offline";
    }
  }

  startRenderLoop() {
    const render = () => {
      this.renderMap();
      requestAnimationFrame(render);
    };
    render();
  }

  renderMap() {
    const ctx = this.ctx;

    // Clear canvas
    ctx.fillStyle = "#080808ff";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Save transform
    ctx.save();

    // Apply zoom and pan
    ctx.translate(this.centerX + this.panX, this.centerY + this.panY);
    ctx.rotate(-Math.PI / 2);

    ctx.scale(this.zoom, this.zoom);

    // Draw coordinate axes for reference
    this.drawAxes(ctx);

    // Render occupancy grid
    this.renderOccupancyGrid(ctx);

    // Render LIDAR points - PRIORITARIO
    this.renderLidarPoints(ctx);

    // Render robot path
    this.renderRobotPath(ctx);

    // Render landmarks
    this.renderLandmarks(ctx);

    // Render robot
    this.renderRobot(ctx);

    // Restore transform
    ctx.restore();

    // Update point counter
    this.updateElementText("point-count", this.lidarPoints.length.toString());
  }

  drawAxes(ctx) {
    ctx.save();
    ctx.strokeStyle = "rgba(0, 255, 150, 0.1)";
    ctx.lineWidth = 1;
    ctx.font = "12px sans-serif";
    ctx.fillStyle = "#888";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    const maxDistance = 500; // mm
    const step = 50; // distancia entre guías

    // Ejes X y Y
    ctx.beginPath();
    ctx.moveTo(-maxDistance, 0);
    ctx.lineTo(maxDistance, 0);
    ctx.moveTo(0, -maxDistance);
    ctx.lineTo(0, maxDistance);
    ctx.stroke();

    // Guías rectangulares y líneas
    ctx.strokeStyle = "rgba(0, 255, 150, 0.1)";
    ctx.setLineDash([4, 4]);

    for (let i = step; i <= maxDistance; i += step) {
      // Líneas horizontales
      ctx.beginPath();
      ctx.moveTo(-maxDistance, i);
      ctx.lineTo(maxDistance, i);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-maxDistance, -i);
      ctx.lineTo(maxDistance, -i);
      ctx.stroke();

      // Líneas verticales
      ctx.beginPath();
      ctx.moveTo(i, -maxDistance);
      ctx.lineTo(i, maxDistance);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-i, -maxDistance);
      ctx.lineTo(-i, maxDistance);
      ctx.stroke();
    }

    // Círculos concéntricos con etiquetas
    ctx.strokeStyle = "rgba(0, 255, 150, 0.1)";
    ctx.setLineDash([2, 4]);

    for (let r = step; r <= maxDistance; r += step) {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();

      // Etiqueta de distancia (solo en el eje X positivo, hacia la derecha)
      ctx.fillText(`${r} cm`, r + 5, 0);
    }

    ctx.restore();
  }

  renderOccupancyGrid(ctx) {
    if (!this.isMapping) return;

    ctx.save();
    for (const [key, cell] of this.occupancyGrid) {
      const [x, y] = key.split(",").map(Number);
      const pixelX = x * this.mapResolution;
      const pixelY = -y * this.mapResolution; // Invert Y

      const total = cell.occupied + cell.free;
      const probability = cell.occupied / total;

      if (probability > 0.6) {
        ctx.fillStyle = "#ff4444";
      } else if (probability > 0.3) {
        ctx.fillStyle = "#ffaa44";
      } else {
        ctx.fillStyle = "#44ff44";
      }

      ctx.globalAlpha = 0.3;
      ctx.fillRect(pixelX, pixelY, this.mapResolution, this.mapResolution);
    }
    ctx.restore();
  }

  renderLidarPoints(ctx) {
    if (this.lidarPoints.length === 0) return;

    ctx.save();

    // Render all points
    for (let i = 0; i < this.lidarPoints.length; i++) {
      const point = this.lidarPoints[i];

      // Calculate age-based alpha
      const age = (Date.now() - point.timestamp) / 1000; // seconds
      const alpha = Math.max(0.2, 1 - age / 60); // Fade over 60 seconds
      ctx.fillStyle = "#00ff00"; // Green for high quality

      // Color based on quality
      // if (point.quality > 80) {
      // } else if (point.quality > 50) {
      //     ctx.fillStyle = '#ffff00'; // Yellow for medium quality
      // } else {
      //     ctx.fillStyle = '#ff8800'; // Orange for low quality
      // }

      ctx.globalAlpha = alpha;

      // Draw point
      ctx.beginPath();
      ctx.arc(point.x, -point.y, 3, 0, 2 * Math.PI); // Larger points, invert Y
      ctx.fill();

      // Draw point with stroke for better visibility
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 0.5;
      ctx.globalAlpha = alpha * 0.5;
      ctx.stroke();
    }

    ctx.restore();

    // Debug: Show latest point info
    if (this.debugMode && this.lidarPoints.length > 0) {
      const latest = this.lidarPoints[this.lidarPoints.length - 1];
      // console.log('🎯 Último punto LIDAR renderizado:', {
      //     x: latest.x.toFixed(2),
      //     y: latest.y.toFixed(2),
      //     quality: latest.quality,
      //     age: ((Date.now() - latest.timestamp) / 1000).toFixed(1) + 's'
      // });
    }
  }

  renderRobotPath(ctx) {
    if (this.robotPath.length < 2) return;

    ctx.save();
    ctx.strokeStyle = "#ffff00";
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.7;

    ctx.beginPath();
    ctx.moveTo(this.robotPath[0].x, -this.robotPath[0].y);

    for (let i = 1; i < this.robotPath.length; i++) {
      ctx.lineTo(this.robotPath[i].x, -this.robotPath[i].y);
    }

    ctx.stroke();
    ctx.restore();
  }

  renderLandmarks(ctx) {
    if (this.landmarks.length === 0) return;

    ctx.save();
    ctx.fillStyle = "#ff00ff";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;

    for (const landmark of this.landmarks) {
      ctx.beginPath();
      ctx.arc(landmark.x, -landmark.y, 8, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  renderRobot(ctx) {
    ctx.save();
    ctx.translate(this.robotPose.x, -this.robotPose.y);
    ctx.rotate(this.robotPose.theta);

    const radius = 15;

    // Robot body (circle)
    ctx.fillStyle = "#00ff96";
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    // Direction arrow (reversed – pointing to the back)
    // ctx.fillStyle = '#ffffff';
    // ctx.beginPath();
    // ctx.moveTo(-radius, 0);             // Tip of the arrow (back side)
    // ctx.lineTo(-radius - 10, -6);       // Top
    // ctx.lineTo(-radius - 10, 6);        // Bottom
    // ctx.closePath();
    // ctx.fill();

    // Tail line (like a compass pointer)
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(radius + 10, 1.52); // Line pointing to the back
    ctx.stroke();

    // Robot outline
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  // Utility functions
  getHeading(mag, acc) {
    const { pitch, roll } = this.getPitchRoll(acc.x, acc.y, acc.z);
    const { Xh, Yh } = this.tiltCompensate(mag.x, mag.y, mag.z, pitch, roll);

    let heading = Math.atan2(Yh, Xh) * (180 / Math.PI);
    if (heading < 0) heading += 360;

    // Apply declination correction (for Santiago, DR)
    const declination = 13.3;
    heading += declination;
    return heading;
  }

  getPitchRoll(accX, accY, accZ) {
    const pitch = Math.atan2(-accX, Math.sqrt(accY * accY + accZ * accZ));
    const roll = Math.atan2(accY, accZ);
    return { pitch, roll };
  }

  tiltCompensate(magX, magY, magZ, pitch, roll) {
    const Xh = magX * Math.cos(pitch) + magZ * Math.sin(pitch);
    const Yh =
      magX * Math.sin(roll) * Math.sin(pitch) + magY * Math.cos(roll) - magZ * Math.sin(roll) * Math.cos(pitch);
    return { Xh, Yh };
  }

  sendWebSocketCommand(type, command) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type, command }));
      // console.log("📤 Comando enviado:", command);
    } else {
      console.warn("Socket no conectado. Comando no enviado:", command);
    }
  }

  // SLAM Control Methods
  startMapping() {
    this.isMapping = true;
    const startBtn = document.getElementById("start-mapping");
    const stopBtn = document.getElementById("stop-mapping");
    if (startBtn) startBtn.disabled = true;
    if (stopBtn) stopBtn.disabled = false;
    console.log("🗺️ Mapping iniciado");
  }

  stopMapping() {
    this.isMapping = false;
    const startBtn = document.getElementById("start-mapping");
    const stopBtn = document.getElementById("stop-mapping");
    if (startBtn) startBtn.disabled = false;
    if (stopBtn) stopBtn.disabled = true;
    console.log("🛑 Mapping detenido");
  }

  resetMap() {
    this.lidarPoints = [];
    this.landmarks = [];
    this.occupancyGrid.clear();
    this.robotPath = [];
    this.robotPose = { x: 0, y: 0, theta: 0 };
    this.stats = {
      mappingQuality: 0,
      loopClosures: 0,
      landmarks: 0,
      trajectoryLength: 0,
    };
    this.updateStatistics();
    this.updateRobotDisplay();
    console.log("🔄 Mapa reiniciado");
  }

  async saveMap() {
    const mapData = {
      lidarPoints: this.lidarPoints,
      landmarks: this.landmarks,
      occupancyGrid: Array.from(this.occupancyGrid.entries()),
      robotPath: this.robotPath,
      robotPose: this.robotPose,
      stats: this.stats,
      timestamp: new Date().toISOString(),
    };

    const user = JSON.parse(getCookie());
    const mapname = prompt("Ingrese el nombre del mapa:");

    const metadata = {
      userId: user.id,
      name: mapname || `Mapa ${new Date().toLocaleDateString()}`,
      status: "complete",
      date: new Date().toISOString(),
      size: 0,
      points: this.lidarPoints?.length || 0,
      area: "10m²", // si no tienes este dato aún, usa uno fijo
      duration: "5min", // estimación temporal
      quality: 85,
      landmarks: this.landmarks?.length || 0,
      loops: 0,
    };

    const blob = new Blob([JSON.stringify(mapData, null, 2)], {
      type: "application/json",
    });

    const formData = new FormData();
    formData.append("metadata", JSON.stringify(metadata));
    formData.append("mapFile", blob, `slam_map_${Date.now()}.json`);

    try {
      const response = await fetch("api/map/insert", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Error al guardar el mapa: ${response.statusText}`);
      }

      console.log("Mapa guardado exitosamente en el servidor");
    } catch (error) {
      console.error("Error enviando el mapa:", error);
    }
  }

  loadMap() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";

    input.onchange = (event) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const mapData = JSON.parse(e.target.result);

            this.lidarPoints = mapData.lidarPoints || [];
            this.landmarks = mapData.landmarks || [];
            this.occupancyGrid = new Map(mapData.occupancyGrid || []);
            this.robotPath = mapData.robotPath || [];
            this.robotPose = mapData.robotPose || { x: 0, y: 0, theta: 0 };
            this.stats = mapData.stats || {
              mappingQuality: 0,
              loopClosures: 0,
              landmarks: 0,
              trajectoryLength: 0,
            };

            this.updateStatistics();
            this.updateRobotDisplay();

            console.log("📂 Mapa cargado:", mapData.timestamp);
          } catch (error) {
            console.error("❌ Error al cargar el mapa:", error);
            alert("Error al cargar el mapa. Archivo inválido.");
          }
        };
        reader.readAsText(file);
      }
    };

    input.click();
  }

  // Debug methods
  addTestLidarPoint() {
    const angle = Math.random() * 360;
    const distance = 50 + Math.random() * 200;
    const quality = 80 + Math.random() * 20;

    this.processLidarData({
      angle: angle,
      distance: distance,
      quality: quality,
    });

    console.log("🧪 Punto de prueba añadido:", { angle, distance, quality });
  }

  toggleDebug() {
    this.debugMode = !this.debugMode;
    console.log("🐛 Debug mode:", this.debugMode ? "ON" : "OFF");
  }
}

// Initialize SLAM system
const slam = new SLAMSystem();

// Global functions for UI
function calibrateIMU(type) {
  switch (type) {
    case "accel":
      slam.sendWebSocketCommand(0x02, 0x01);
      break;
    case "mag":
      slam.sendWebSocketCommand(0x02, 0x02);
      break;
    case "gyro":
      slam.sendWebSocketCommand(0x02, 0x03);
      break;
  }
}

// function resizeCanvas() {
//     const container = canvas.parentElement;
//     canvas.width = container.clientWidth;
//     canvas.height = container.clientHeight - 60; // Account for header
//     drawGrid();
// }

function navigateTo(page) {
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.remove("active");
  });

  event.target.closest(".nav-item").classList.add("active");
  switch (page) {
    case "mapping":
      window.location.href = "slam.html";
      break;
    case "saved-maps":
      window.location.href = "saved-maps.html";
      break;
  }
}

function logout() {
  if (confirm("¿Estás seguro de que quieres cerrar sesión?")) {
    window.location.href = "/index.html";
  }
}

// Debug functions (available in console)
window.slam = slam;
window.addTestPoint = () => slam.addTestLidarPoint();
window.toggleDebug = () => slam.toggleDebug();
const keyDown = {};

window.addEventListener("load", () => {
  // resizeCanvas();
  const user = JSON.parse(getCookie());
  const title = document.getElementById("page-title");
  title.textContent = user ? `Saludos, ${user.firstName} ${user.lastName}` : "Bienvenido a OBBOT";
});

// document.addEventListener('resize', resizeCanvas);
document.addEventListener("keydown", (e) => {
  if (keyDown[e.key]) return; // Evita repetir si ya está presionada
  keyDown[e.key] = true;
  console.log(`🔑 Tecla presionada: ${e.key}`);
  switch (e.key) {
    case "s":
      if (e.ctrlKey) {
        e.preventDefault();
        slam.saveMap();
      }
      break;
    case "r":
      if (e.ctrlKey) {
        e.preventDefault();
        slam.resetMap();
      }
      break;
    case " ":
      e.preventDefault();
      if (slam.isMapping) {
        slam.stopMapping();
      } else {
        slam.startMapping();
      }
      break;
    case "Escape":
      slam.zoom = 1.0;
      slam.panX = 0;
      slam.panY = 0;
      const zoomEl = document.getElementById("zoom-level");
      if (zoomEl) zoomEl.textContent = "1.0x";
      break;
    case "t":
      slam.addTestLidarPoint();
      break;
    case "d":
      slam.toggleDebug();
      break;
    case "ArrowUp":
      slam.sendWebSocketCommand(0x01, 0x02);
      break;
    case "ArrowDown":
      slam.sendWebSocketCommand(0x01, 0x01);
      break;
    case "ArrowLeft":
      slam.sendWebSocketCommand(0x01, 0x03);
      break;
    case "ArrowRight":
      slam.sendWebSocketCommand(0x01, 0x04);
      break;
    case "p":
      slam.sendWebSocketCommand(0x01, 0x05);
      break;
  }
});

document.addEventListener("keyup", (e) => {
  keyDown[e.key] = false;

  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
    slam.sendWebSocketCommand(0x01, 0x05); // STOP
  }
});

function getCookie() {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${"user"}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
  return null;
}

function saveMap() {
  slam.saveMap();
}

function resetMap() {
  slam.resetMap();
}

function loadMap(){
  slam.loadMap();
}

let sidebarCollapsed = false;

function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const mainContent = document.getElementById("mainContent");
  const toggleIcon = document.getElementById("toggle-icon");

  sidebarCollapsed = !sidebarCollapsed;

  if (sidebarCollapsed) {
    sidebar.classList.add("collapsed");
    mainContent.classList.add("expanded");
    toggleIcon.textContent = "▶";
  } else {
    sidebar.classList.remove("collapsed");
    mainContent.classList.remove("expanded");
    toggleIcon.textContent = "◀";
  }
}

console.log("🚀 SLAM System initialized with debug features");
console.log("📋 Debug commands:");
console.log("  - Press T to add test LIDAR point");
console.log("  - Press D to toggle debug mode");
console.log("  - Type addTestPoint() in console");
console.log("  - Type toggleDebug() in console");
