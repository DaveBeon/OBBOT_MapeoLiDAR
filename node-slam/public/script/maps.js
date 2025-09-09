// Sample map data

async function fetchMaps() {
  const userId = JSON.parse(getCookie());
  const response = await fetch(`/api/map/maps/${userId.id}`);
  const data = await response.json();
  return data;
}

let filteredMaps = [];

// Sidebar functionality
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

function toggleMobileSidebar() {
  const sidebar = document.getElementById("sidebar");
  sidebar.classList.toggle("mobile-open");
}

// Navigation
function navigateTo(page) {
  // Remove active class from all nav items
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.remove("active");
  });

  // Add active class to clicked item
  event.target.closest(".nav-item").classList.add("active");

  // Navigation logic
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
    alert("Cerrando sesión...");
  }
}

// Map rendering
function drawMapPreview(canvas, mapData) {
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // Draw background
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, width, height);

  // Draw grid
  ctx.strokeStyle = "rgba(0, 255, 150, 0.1)";
  ctx.lineWidth = 1;
  const gridSize = 20;

  for (let x = 0; x <= width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  for (let y = 0; y <= height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Generate random map points based on map data
  ctx.fillStyle = "rgba(0, 255, 150, 0.8)";
  const numPoints = Math.min(mapData.points / 100, 200); // Scale down for preview

  for (let i = 0; i < numPoints; i++) {
    const x = Math.random() * (width - 40) + 20;
    const y = Math.random() * (height - 40) + 20;

    ctx.beginPath();
    ctx.arc(x, y, 1.5, 0, 2 * Math.PI);
    ctx.fill();
  }

  // Draw some obstacle shapes to simulate walls/furniture
  ctx.strokeStyle = "#00ff96";
  ctx.lineWidth = 2;

  // Random rectangles representing rooms/obstacles
  const numRects = Math.floor(Math.random() * 5) + 3;
  for (let i = 0; i < numRects; i++) {
    const x = Math.random() * (width - 100) + 20;
    const y = Math.random() * (height - 60) + 20;
    const w = Math.random() * 80 + 40;
    const h = Math.random() * 40 + 20;

    ctx.strokeRect(x, y, w, h);
  }

  // Draw robot path
  ctx.strokeStyle = "rgba(255, 165, 0, 0.6)";
  ctx.lineWidth = 2;
  ctx.beginPath();

  let pathX = width * 0.1;
  let pathY = height * 0.5;
  ctx.moveTo(pathX, pathY);

  for (let i = 0; i < 20; i++) {
    pathX += (Math.random() - 0.5) * 30 + width * 0.04;
    pathY += (Math.random() - 0.5) * 20;
    ctx.lineTo(pathX, pathY);
  }

  ctx.stroke();

  // Draw robot current position
  ctx.fillStyle = "#ffa502";
  ctx.beginPath();
  ctx.arc(pathX, pathY, 4, 0, 2 * Math.PI);
  ctx.fill();
}

// Create map cards
function createMapCard(mapData) {
  const card = document.createElement("div");
  card.className = "map-card";
  card.setAttribute("data-map-id", mapData.id);
  const creationDate = new Date(mapData.date); // convierte ISO string a Date

  const statusClass = `status-${mapData.status}`;
  const statusText = {
    complete: "Completo",
    partial: "Parcial",
    processing: "Procesando",
  }[mapData.status];

  const mapId = mapData._id;
  console.log("Map data z:", mapId);

  card.innerHTML = `
                <div class="map-preview">
                    <canvas class="map-canvas" width="350" height="200"></canvas>
                    <div class="map-overlay"></div>
                </div>
                <div class="map-info">
                    <div class="map-name">
                        ${mapData.name}
                        <span class="map-status ${statusClass}">${statusText}</span>
                    </div>
                    <div class="map-details">
                        <div class="detail-item">
                            <span>Fecha:</span>
                            <span class="detail-value">${creationDate.toLocaleDateString()}</span>
                        </div>
                        <div class="detail-item">
                            <span>Puntos:</span>
                            <span class="detail-value">${mapData.points.toLocaleString()}</span>
                        </div>
                    </div>
                    <div class="map-actions">
                        <button class="btn-action btn-view" onclick="viewMapDetails('${mapId}')">Ver</button>
                        <button class="btn-action btn-download" onclick="downloadMap('${mapId}')">Descargar</button>
                        <button class="btn-action btn-delete" onclick="deleteMap('${mapId}')">Eliminar</button>
                    </div>
                </div>
            `;

  // Draw map preview after card is added to DOM
  setTimeout(() => {
    const canvas = card.querySelector(".map-canvas");
    if (canvas) {
      drawMapPreview(canvas, mapData);
    }
  }, 100);

  return card;
}

// Render maps
function renderMaps(maps = filteredMaps) {
  const container = document.getElementById("mapsContainer");

  if (maps.length === 0) {
    container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">🗺️</div>
                        <h3 class="empty-state-title">No se encontraron mapas</h3>
                        <p class="empty-state-text">No hay mapas que coincidan con los filtros seleccionados.</p>
                        <a href="#" class="btn-primary" onclick="createNewMap()">
                            <span>➕</span>
                            Crear Primer Mapa
                        </a>
                    </div>
                `;
    return;
  }

  container.innerHTML = "";
  maps.forEach((mapData) => {
    const card = createMapCard(mapData);
    container.appendChild(card);
  });

  updateStats(maps);
}

// Update statistics
function updateStats(maps) {
  const totalMaps = maps.length;
  const completeMaps = maps.filter((m) => m.status === "complete").length;
  const totalSize = maps.reduce((sum, m) => sum + m.size, 0).toFixed(1);

  document.getElementById("totalMaps").textContent = totalMaps;
  document.getElementById("completeMaps").textContent = completeMaps;
  document.getElementById("totalSize").textContent = totalSize + "MB";
}

// Filter maps
function filterMaps() {
  const searchTerm = document.getElementById("searchInput").value.toLowerCase();
  const statusFilter = document.getElementById("statusFilter").value;
  const dateFilter = document.getElementById("dateFilter").value;
  const sizeFilter = document.getElementById("sizeFilter").value;

  filteredMaps = sampleMaps.filter((map) => {
    // Search filter
    const matchesSearch = map.name.toLowerCase().includes(searchTerm);

    // Status filter
    const matchesStatus = !statusFilter || map.status === statusFilter;

    // Date filter
    let matchesDate = true;
    if (dateFilter) {
      const now = new Date();
      const mapDate = map.date;

      switch (dateFilter) {
        case "today":
          matchesDate = mapDate.toDateString() === now.toDateString();
          break;
        case "week":
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDate = mapDate >= weekAgo;
          break;
        case "month":
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          matchesDate = mapDate >= monthAgo;
          break;
      }
    }

    // Size filter
    let matchesSize = true;
    if (sizeFilter) {
      switch (sizeFilter) {
        case "small":
          matchesSize = map.size < 1;
          break;
        case "medium":
          matchesSize = map.size >= 1 && map.size <= 10;
          break;
        case "large":
          matchesSize = map.size > 10;
          break;
      }
    }

    return matchesSearch && matchesStatus && matchesDate && matchesSize;
  });

  renderMaps(filteredMaps);
}

// Map actions
async function viewMapDetails(mapId) {
  console.log("Fetching map details for ID:", mapId);
  const mapData = await getMapById(mapId);
  console.log("Map Data:", mapData);
  if (!mapData) return;

  // Populate modal
  document.getElementById("modalTitle").textContent = `${mapData.name} - Detalles`;
  // General info
  const generalInfo = document.getElementById("generalInfo");
  const creationDate = new Date(mapData.date); // convierte ISO string a Date

  generalInfo.innerHTML = `
                <li><span>Nombre:</span><span>${mapData.name}</span></li>
                <li><span>Estado:</span><span>${
                  mapData.status === "complete" ? "Completo" : mapData.status === "partial" ? "Parcial" : "Procesando"
                }</span></li>
                <li><span>Fecha de creación:</span><span>${new Date(creationDate).toLocaleDateString()}</span></li>
                <li><span>Duración del mapeo:</span><span>${mapData.duration}</span></li>
                <li><span>Calidad del mapa:</span><span>${mapData.quality}%</span></li>
                <li><span>Área mapeada:</span><span>${mapData.area}</span></li>
            `;

  // Technical info
  const technicalInfo = document.getElementById("technicalInfo");
  technicalInfo.innerHTML = `
                <li><span>Puntos de datos:</span><span>${mapData.points.toLocaleString()}</span></li>
                <li><span>Landmarks:</span><span>${mapData.landmarks}</span></li>
                <li><span>Loop closures:</span><span>${mapData.loops}</span></li>
                <li><span>Tamaño del archivo:</span><span>${mapData.size} MB</span></li>
                <li><span>Formato:</span><span>SLAM-MAP v2.1</span></li>
                <li><span>Resolución:</span><span>5cm/pixel</span></li>
            `;

  // Draw detailed map in modal
  const modalCanvas = document.getElementById("modalCanvas");
  drawMapPreview(modalCanvas, mapData);

  // Show modal
  document.getElementById("mapModal").classList.add("active");
}

async function downloadMap(mapId) {
  const mapData = await getMapById(mapId);
  if (!mapData) return;

  // Create a download link simulation
  const link = document.createElement("a");
  link.download = `${mapData.name.replace(/\s+/g, "_")}_map.slam`;

  // Create a blob with dummy data
  const dummyData = JSON.stringify(mapData, null, 2);
  const blob = new Blob([dummyData], { type: "application/json" });
  link.href = URL.createObjectURL(blob);

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  alert(`Descargando mapa: ${mapData.name}`);
}

async function deleteMap(mapId) {
  console.log("Deleting map:", mapId);

  const mapData = await getMapById(mapId);
  if (
    confirm(`¿Estás seguro de que quieres eliminar el mapa "${mapData.name}"?\n\nEsta acción no se puede deshacer.`)
  ) {
    const response = await fetch(`/api/map/delete/${mapId}`, { method: "DELETE" });
    console.log("Map deleted:", response);
  }
}

function createNewMap() {
  if (confirm("¿Quieres iniciar una nueva sesión de mapeo?\n\nSerás redirigido al sistema SLAM.")) {
    alert("Redirigiendo al sistema de mapeo...");
    window.location.href = 'slam.html';
  }
}

// Modal functions
function closeModal() {
  document.getElementById("mapModal").classList.remove("active");
}

// Close modal when clicking outside
document.getElementById("mapModal").addEventListener("click", function (e) {
  if (e.target === this) {
    closeModal();
  }
});

// Keyboard shortcuts
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape" && document.getElementById("mapModal").classList.contains("active")) {
    closeModal();
  }

  if (e.ctrlKey) {
    switch (e.key) {
      case "n":
        e.preventDefault();
        createNewMap();
        break;
      case "f":
        e.preventDefault();
        document.getElementById("searchInput").focus();
        break;
    }
  }
});

// Close mobile sidebar when clicking outside
document.addEventListener("click", (e) => {
  const sidebar = document.getElementById("sidebar");
  const toggleBtn = document.querySelector(".mobile-menu-toggle");

  if (
    window.innerWidth <= 768 &&
    sidebar.classList.contains("mobile-open") &&
    !sidebar.contains(e.target) &&
    !toggleBtn.contains(e.target)
  ) {
    sidebar.classList.remove("mobile-open");
  }
});

// Auto-refresh maps every 30 seconds (simulate real-time updates)
setInterval(() => {
  // Simulate some maps changing status or getting updates
  sampleMaps.forEach((map) => {
    if (map.status === "processing") {
      map.quality = Math.min(100, map.quality + Math.random() * 15);
      if (map.quality >= 100) {
        map.status = "complete";
      }
    }
  });

  if (filteredMaps.some((map) => map.status === "processing")) {
    renderMaps(filteredMaps);
  }
}, 30000);

// Sort functionality
function sortMaps(criteria) {
  switch (criteria) {
    case "name":
      filteredMaps.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "date":
      filteredMaps.sort((a, b) => b.date - a.date);
      break;
    case "size":
      filteredMaps.sort((a, b) => b.size - a.size);
      break;
    case "quality":
      filteredMaps.sort((a, b) => b.quality - a.quality);
      break;
  }
  renderMaps(filteredMaps);
}

// Add context menu for maps
document.addEventListener("contextmenu", function (e) {
  const mapCard = e.target.closest(".map-card");
  if (mapCard) {
    e.preventDefault();
    const mapId = parseInt(mapCard.getAttribute("data-map-id"));
    showContextMenu(e.clientX, e.clientY, mapId);
  }
});

function showContextMenu(x, y, mapId) {
  // Remove existing context menu
  const existingMenu = document.querySelector(".context-menu");
  if (existingMenu) {
    existingMenu.remove();
  }

  const menu = document.createElement("div");
  menu.className = "context-menu";
  menu.style.cssText = `
                position: fixed;
                top: ${y}px;
                left: ${x}px;
                background: rgba(15, 15, 35, 0.95);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(0, 255, 150, 0.2);
                border-radius: 8px;
                padding: 0.5rem 0;
                z-index: 3000;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            `;

  const menuItems = [
    { text: "Ver detalles", action: () => viewMapDetails(mapId) },
    { text: "Descargar", action: () => downloadMap(mapId) },
    { text: "Duplicar", action: () => duplicateMap(mapId) },
    { text: "Renombrar", action: () => renameMap(mapId) },
    { text: "---", action: null },
    { text: "Eliminar", action: () => deleteMap(mapId), danger: true },
  ];

  menuItems.forEach((item) => {
    if (item.text === "---") {
      const divider = document.createElement("div");
      divider.style.cssText = "height: 1px; background: rgba(0, 255, 150, 0.1); margin: 0.5rem 0;";
      menu.appendChild(divider);
    } else {
      const menuItem = document.createElement("div");
      menuItem.textContent = item.text;
      menuItem.style.cssText = `
                        padding: 0.75rem 1rem;
                        cursor: pointer;
                        color: ${item.danger ? "#ff4757" : "#ccd6f6"};
                        font-size: 0.9rem;
                        transition: all 0.2s ease;
                    `;

      menuItem.addEventListener("mouseenter", () => {
        menuItem.style.background = item.danger ? "rgba(255, 71, 87, 0.1)" : "rgba(0, 255, 150, 0.1)";
      });

      menuItem.addEventListener("mouseleave", () => {
        menuItem.style.background = "transparent";
      });

      menuItem.addEventListener("click", () => {
        if (item.action) item.action();
        menu.remove();
      });

      menu.appendChild(menuItem);
    }
  });

  document.body.appendChild(menu);

  // Remove menu when clicking elsewhere
  setTimeout(() => {
    document.addEventListener("click", function removeMenu() {
      menu.remove();
      document.removeEventListener("click", removeMenu);
    });
  }, 100);
}

function duplicateMap(mapId) {
  const mapData = sampleMaps.find((m) => m.id === mapId);
  if (!mapData) return;

  const newMap = {
    ...mapData,
    id: Math.max(...sampleMaps.map((m) => m.id)) + 1,
    name: `${mapData.name} (Copia)`,
    date: new Date(),
  };

  sampleMaps.unshift(newMap);
  filterMaps();
  alert(`Mapa "${mapData.name}" duplicado exitosamente.`);
}

function renameMap(mapId) {
  const mapData = sampleMaps.find((m) => m.id === mapId);
  if (!mapData) return;

  const newName = prompt("Nuevo nombre para el mapa:", mapData.name);
  if (newName && newName.trim()) {
    mapData.name = newName.trim();
    filterMaps();
    alert(`Mapa renombrado a "${newName}".`);
  }
}

function getCookie() {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${"user"}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
  return null;
}

async function getMapById(mapId) {
  const maps = await fetchMaps();

  return maps.find((m) => m._id === mapId);
}

// Initialize the page
window.addEventListener("load", async () => {
  filteredMaps = await fetchMaps();
  renderMaps(filteredMaps);

  setTimeout(() => {
    document.querySelectorAll(".map-card").forEach((card, index) => {
      card.style.animationDelay = `${index * 0.1}s`;
    });
  }, 100);
});
