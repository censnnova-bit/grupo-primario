const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Ajustar canvas al tamaño de la ventana
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();

// Elementos del DOM
const popup = document.getElementById('popup');
const popupTitle = document.getElementById('popup-title');
const popupText = document.getElementById('popup-text');
const popupTimer = document.getElementById('popup-timer');
const closeBtn = document.getElementById('close-btn');
const teamDisplay = document.getElementById('team-display');
const victoryModal = document.getElementById('victory-modal');

// Estado del juego
let gamePaused = false;
let currentLevel = 1;
let timerInterval;
let gameWon = false;
let confettiParticles = [];

// Configuración del mapa (Pixel Art)
const TILE_SIZE = 25;
let COLS = Math.ceil(canvas.width / TILE_SIZE);
let ROWS = Math.ceil(canvas.height / TILE_SIZE);
let mapTiles = [];
let decorations = [];
let pathTiles = []; // Almacenar coordenadas del camino
const points = []; // Puntos de interés (Logros y Retos)
let door = null; // Puerta al siguiente nivel

// Jugador
const playerImage = new Image();
playerImage.src = 'image-removebg-preview.png';

// Logos
const logoCens = new Image();
logoCens.src = 'Logo_Cens.png';

const logoCensnova = new Image();
logoCensnova.src = 'Logo_Censnova.png';

const player = {
    x: 50,
    y: 50,
    width: 150,
    height: 150,
    speed: 2,
    rotation: 0,
    walkAnimTimer: 0,
    isMoving: false
};

// Generar mapa de pasto aleatorio y camino
function generateMap() {
    // Recalcular filas y columnas por si cambió el tamaño
    COLS = Math.ceil(canvas.width / TILE_SIZE);
    ROWS = Math.ceil(canvas.height / TILE_SIZE);
    mapTiles = [];
    decorations = [];
    pathTiles = [];

    const team = Math.ceil(currentLevel / 2); // 1, 2, 3, 4

    // Actualizar nombre del equipo
    let teamName = '';
    if (team === 1) teamName = 'Equipo: Sostenibilidad';
    else if (team === 2) teamName = 'Equipo: Planeación de Infraestructura';
    else if (team === 3) teamName = 'Equipo: Gestión de Información y Estudios';
    else teamName = 'Equipo: Censnnova';
    
    teamDisplay.innerText = teamName;

    // Inicializar mapa según nivel
    for (let r = 0; r < ROWS; r++) {
        const row = [];
        const decoRow = [];
        for (let c = 0; c < COLS; c++) {
            let baseColor;
            if (team === 1) { // Sostenibilidad (Nature)
                const greens = ['#76c442', '#6ab03b', '#82d649', '#5e9e35'];
                baseColor = greens[Math.floor(Math.random() * greens.length)];
            } else if (team === 2) { // Infraestructura (Factory/Retro)
                const grays = ['#cfd8dc', '#b0bec5', '#90a4ae', '#78909c'];
                baseColor = grays[Math.floor(Math.random() * grays.length)];
            } else if (team === 3) { // Eléctricos (Electrical/Map)
                const blues = ['#e3f2fd', '#bbdefb', '#90caf9', '#64b5f6'];
                baseColor = blues[Math.floor(Math.random() * blues.length)];
            } else { // Censnnova (Futuristic/Space)
                const darks = ['#263238', '#37474f', '#455a64', '#102027'];
                baseColor = darks[Math.floor(Math.random() * darks.length)];
            }
            row.push(baseColor);
            decoRow.push(null); // Inicialmente sin decoración
        }
        mapTiles.push(row);
        decorations.push(decoRow);
    }

    // Generar camino: Bottom-Left -> Top-Right
    let currentX = 2;
    let currentY = ROWS - 3;
    
    // Posicionar al jugador al inicio
    player.x = currentX * TILE_SIZE;
    player.y = currentY * TILE_SIZE - player.height + TILE_SIZE;

    // Punto final (Top-Right)
    let endX = COLS - 8; // Más lejos de la esquina derecha para que el jugador quepa bien
    let endY = 8; // Más abajo para evitar el navbar
    
    // Asegurar que el camino llegue al final
    while (currentX !== endX || currentY !== endY) {
        pathTiles.push({x: currentX, y: currentY});
        
        // Marcar en el mapa visual
        let pathColor;
        if (team === 1) pathColor = '#FFD700'; // Amarillo
        else if (team === 2) pathColor = '#5d4037'; // Marrón industrial
        else if (team === 3) pathColor = '#1565c0'; // Azul oscuro
        else pathColor = '#00e676'; // Verde neón

        // Dibujamos un bloque de 3x3 alrededor del punto actual
        for(let dy = -1; dy <= 1; dy++) {
            for(let dx = -1; dx <= 1; dx++) {
                const py = currentY + dy;
                const px = currentX + dx;
                if (py >= 0 && py < ROWS && px >= 0 && px < COLS) {
                    mapTiles[py][px] = pathColor;
                }
            }
        }

        // Decidir siguiente paso (Sesgado hacia Top-Right: +X, -Y)
        const moveX = endX - currentX;
        const moveY = endY - currentY;
        
        const random = Math.random();
        
        // Priorizar el eje más lejano, pero con aleatoriedad
        if (Math.abs(moveX) > Math.abs(moveY)) {
            if (random < 0.6) {
                currentX += Math.sign(moveX);
            } else {
                // Moverse en Y o variar un poco
                if (moveY !== 0) currentY += Math.sign(moveY);
                else currentY += (Math.random() < 0.5 ? 1 : -1);
            }
        } else {
            if (random < 0.6) {
                currentY += Math.sign(moveY);
            } else {
                // Moverse en X o variar un poco
                if (moveX !== 0) currentX += Math.sign(moveX);
                else currentX += (Math.random() < 0.5 ? 1 : -1);
            }
        }
        
        // Limites
        currentX = Math.max(1, Math.min(currentX, COLS - 2));
        currentY = Math.max(1, Math.min(currentY, ROWS - 2));
    }
    // Agregar el punto final
    pathTiles.push({x: endX, y: endY});
    let finalPathColor;
    if (team === 1) finalPathColor = '#FFD700';
    else if (team === 2) finalPathColor = '#5d4037';
    else if (team === 3) finalPathColor = '#1565c0';
    else finalPathColor = '#00e676';
    mapTiles[endY][endX] = finalPathColor;

    // Configurar puerta
    // Hacer la puerta más grande (2x2 tiles) para facilitar el acceso
    door = {
        x: endX * TILE_SIZE,
        y: endY * TILE_SIZE,
        width: TILE_SIZE * 2,
        height: TILE_SIZE * 2
    };

    // Agregar decoraciones
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            // Si no es camino (usamos el color del camino actual para verificar)
            if (mapTiles[r][c] !== finalPathColor) { 
                if (Math.random() < 0.4) { // Densidad media
                    let type, color;
                    
                    if (team === 1) { // Flores
                        const flowerColors = ['#FF0000', '#FFFF00', '#0000FF', '#FF00FF', '#FFFFFF', '#FFA500'];
                        type = 'flower';
                        color = flowerColors[Math.floor(Math.random() * flowerColors.length)];
                    } else if (team === 2) { // Engranajes/Tuercas
                        type = Math.random() < 0.5 ? 'gear' : 'pipe';
                        color = '#607d8b';
                    } else if (team === 3) { // Circuitos
                        type = Math.random() < 0.5 ? 'node' : 'chip';
                        color = '#0d47a1';
                    } else { // Espacio
                        type = Math.random() < 0.7 ? 'star' : 'planet';
                        color = '#ffffff';
                    }

                    decorations[r][c] = {
                        xOffset: Math.floor(Math.random() * (TILE_SIZE - 10)),
                        yOffset: Math.floor(Math.random() * (TILE_SIZE - 10)),
                        type: type,
                        color: color
                    };
                }
            }
        }
    }

    // Reposicionar puntos de control en el camino
    repositionPoints();
}

function repositionPoints() {
    if (pathTiles.length < 3) return;
    
    // Índices para 3 puntos distribuidos
    const indices = [
        Math.floor(pathTiles.length * 0.25),
        Math.floor(pathTiles.length * 0.50),
        Math.floor(pathTiles.length * 0.75)
    ];

    // Actualizar coordenadas de los puntos existentes
    let newPointsData = [];
    const team = Math.ceil(currentLevel / 2);
    const isAchievements = (currentLevel % 2 !== 0); // Impares son Logros, Pares son Retos
    
    if (team === 1) { // Sostenibilidad
        if (isAchievements) {
            newPointsData = [
                { title: 'Logro 1: Sostenibilidad', text: 'Reducción de huella de carbono en un 15%.', color: '#28a745' },
                { title: 'Logro 2: Reciclaje', text: 'Implementación de programa de reciclaje integral.', color: '#28a745' },
                { title: 'Logro 3: Energía', text: 'Uso de energías renovables en un 30%.', color: '#28a745' }
            ];
        } else {
            newPointsData = [
                { title: 'Reto 1: Agua', text: 'Optimizar el consumo de agua en procesos industriales.', color: '#dc3545' },
                { title: 'Reto 2: Residuos', text: 'Disminuir residuos no aprovechables.', color: '#dc3545' },
                { title: 'Reto 3: Conciencia', text: 'Aumentar la conciencia ambiental en la comunidad.', color: '#dc3545' }
            ];
        }
    } else if (team === 2) { // Planeación de Infraestructura
        if (isAchievements) {
            newPointsData = [
                { title: 'Logro 1: Modernización', text: 'Modernización del 40% de la infraestructura física.', color: '#607d8b' },
                { title: 'Logro 2: Mantenimiento', text: 'Reducción de costos de mantenimiento correctivo.', color: '#607d8b' },
                { title: 'Logro 3: Expansión', text: 'Apertura de 2 nuevas plantas regionales.', color: '#607d8b' }
            ];
        } else {
            newPointsData = [
                { title: 'Reto 1: Obsolescencia', text: 'Gestionar la obsolescencia de equipos críticos.', color: '#ff5722' },
                { title: 'Reto 2: Capacidad', text: 'Aumentar la capacidad de producción en un 20%.', color: '#ff5722' },
                { title: 'Reto 3: Seguridad', text: 'Mejorar los estándares de seguridad industrial.', color: '#ff5722' }
            ];
        }
    } else if (team === 3) { // Gestión de información y Estudios Eléctricos
        if (isAchievements) {
            newPointsData = [
                { title: 'Logro 1: Digitalización', text: 'Digitalización del 80% de los expedientes.', color: '#0288d1' },
                { title: 'Logro 2: Analítica', text: 'Implementación de dashboard de control en tiempo real.', color: '#0288d1' },
                { title: 'Logro 3: Redes', text: 'Mejora en la estabilidad de la red eléctrica.', color: '#0288d1' }
            ];
        } else {
            newPointsData = [
                { title: 'Reto 1: Big Data', text: 'Procesamiento eficiente de grandes volúmenes de datos.', color: '#d32f2f' },
                { title: 'Reto 2: Predicción', text: 'Mejorar modelos predictivos de demanda.', color: '#d32f2f' },
                { title: 'Reto 3: Integración', text: 'Integrar sistemas de información geográfica.', color: '#d32f2f' }
            ];
        }
    } else { // Censnnova
        if (isAchievements) {
            newPointsData = [
                { title: 'Logro 1: Innovación', text: 'Lanzamiento de 5 pilotos de innovación abierta.', color: '#673ab7' },
                { title: 'Logro 2: Ecosistema', text: 'Alianza con 3 universidades líderes.', color: '#673ab7' },
                { title: 'Logro 3: Patentes', text: 'Registro de 2 nuevas patentes tecnológicas.', color: '#673ab7' }
            ];
        } else {
            newPointsData = [
                { title: 'Reto 1: Disrupción', text: 'Identificar tecnologías disruptivas para el sector.', color: '#c2185b' },
                { title: 'Reto 2: Cultura', text: 'Fomentar la cultura de intraemprendimiento.', color: '#c2185b' },
                { title: 'Reto 3: Futuro', text: 'Definir la visión tecnológica a 10 años.', color: '#c2185b' }
            ];
        }
    }

    points.length = 0; // Limpiar array actual
    
    indices.forEach((pathIndex, i) => {
        if (i < newPointsData.length) {
            const tile = pathTiles[pathIndex];
            points.push({
                x: tile.x * TILE_SIZE, // Ocupar todo el tile
                y: tile.y * TILE_SIZE,
                width: TILE_SIZE,
                height: TILE_SIZE,
                color: newPointsData[i].color,
                title: newPointsData[i].title,
                text: newPointsData[i].text,
                visited: false
            });
        }
    });
}

generateMap();

// Manejar redimensionamiento de ventana
window.addEventListener('resize', () => {
    resizeCanvas();
    generateMap();
});

// Jugador
// (Definido arriba para usar sus coordenadas en generateMap)

// Controles
const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false
};

window.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.code)) {
        keys[e.code] = true;
    }
});

window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.code)) {
        keys[e.code] = false;
    }
});

closeBtn.addEventListener('click', () => {
    closePopup();
});

function startTimer() {
    let timeLeft = 420; // 7 minutos en segundos
    updateTimerDisplay(timeLeft);
    
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay(timeLeft);
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            closePopup();
        }
    }, 1000);
}

function updateTimerDisplay(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    popupTimer.innerText = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function stopTimer() {
    clearInterval(timerInterval);
}

function closePopup() {
    popup.classList.add('hidden');
    gamePaused = false;
    stopTimer();
    // Mover al jugador un poco para que no active el popup inmediatamente de nuevo
    player.y += 10; 
}

function update() {
    if (gamePaused) return;

    player.isMoving = false;

    // Movimiento
    if (keys.ArrowUp && player.y > 0) { player.y -= player.speed; player.isMoving = true; }
    if (keys.ArrowDown && player.y + player.height < canvas.height) { player.y += player.speed; player.isMoving = true; }
    if (keys.ArrowLeft && player.x > 0) { player.x -= player.speed; player.isMoving = true; }
    if (keys.ArrowRight && player.x + player.width < canvas.width) { player.x += player.speed; player.isMoving = true; }

    // Animación de "caminar" (rotación)
    if (player.isMoving) {
        player.walkAnimTimer += 0.2;
        player.rotation = Math.sin(player.walkAnimTimer) * 0.2;
    } else {
        player.rotation = 0; // Resetear rotación al detenerse
        player.walkAnimTimer = 0;
    }

    // Colisiones
    // Definir hitbox más pequeño para el jugador (centro del sprite)
    // Ajustado para tamaño de jugador 150px: 150 - (60*2) = 30px de hitbox central
    const hitboxMargin = 60; 
    const playerHitbox = {
        x: player.x + hitboxMargin,
        y: player.y + hitboxMargin,
        width: player.width - (hitboxMargin * 2),
        height: player.height - (hitboxMargin * 2)
    };

    points.forEach(point => {
        if (!point.visited && checkCollision(playerHitbox, point)) {
            showPopup(point);
            point.visited = true; // Marcar como visitado para cambiar color o no volver a mostrar
        }
    });

    // Colisión con puerta
    if (door && checkCollision(playerHitbox, door)) {
        if (currentLevel >= 8) {
            gameWon = true;
            initConfetti();
        } else {
            // Cambiar nivel
            currentLevel++;
            // Generar nuevo mapa (el jugador se queda donde está)
            generateMap();
        }
    }
}

function checkCollision(rect1, rect2) {
    return (
        rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y
    );
}

function showPopup(point) {
    gamePaused = true;
    popupTitle.innerText = point.title;
    popupText.innerText = point.text;
    popup.classList.remove('hidden');
    startTimer();
}

function draw() {
    // Limpiar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (gameWon) {
        drawVictoryScreen();
        return;
    }

    // Dibujar fondo (Pasto Pixel Art)
    drawBackground();

    // Dibujar puerta
    if (door) {
        ctx.fillStyle = '#654321'; // Marrón oscuro
        ctx.fillRect(door.x, door.y, door.width, door.height);
        // Marco
        ctx.strokeStyle = '#3e2723';
        ctx.lineWidth = 3;
        ctx.strokeRect(door.x, door.y, door.width, door.height);
        // Pomo
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(door.x + door.width - 10, door.y + door.height / 2, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    // Dibujar puntos
    points.forEach(point => {
        ctx.fillStyle = point.visited ? '#6c757d' : point.color; // Gris si ya fue visitado
        ctx.fillRect(point.x, point.y, point.width, point.height);
        
        // Borde pixel art para los puntos
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(point.x, point.y, point.width, point.height);

        // Etiqueta simple (opcional)
        ctx.fillStyle = '#000';
        ctx.font = 'bold 14px monospace';
        ctx.fillText('?', point.x + 15, point.y - 10);
    });

    // Dibujar jugador con rotación
    ctx.save();
    ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
    ctx.rotate(player.rotation);
    if (playerImage.complete) {
        ctx.drawImage(playerImage, -player.width / 2, -player.height / 2, player.width, player.height);
    } else {
        // Fallback si la imagen no ha cargado
        ctx.fillStyle = '#007bff';
        ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height);
    }
    ctx.restore();

    // Dibujar logos
    // Logo CENS (Esquina inferior derecha)
    if (logoCens.complete) {
        const w = 150;
        const h = (logoCens.height / logoCens.width) * w;
        ctx.drawImage(logoCens, canvas.width - w - 20, canvas.height - h - 20, w, h);
    }

    // Logo Censnova (Esquina inferior izquierda)
    if (logoCensnova.complete) {
        const w = 120;
        const h = (logoCensnova.height / logoCensnova.width) * w;
        ctx.drawImage(logoCensnova, 20, canvas.height - h - 20, w, h);
    }
}

function initConfetti() {
    for (let i = 0; i < 200; i++) {
        // Decidir si sale de la izquierda o derecha
        const fromLeft = Math.random() < 0.5;
        confettiParticles.push({
            x: fromLeft ? -10 : canvas.width + 10,
            y: Math.random() * canvas.height,
            color: `hsl(${Math.random() * 360}, 100%, 50%)`,
            size: Math.random() * 10 + 5,
            // Velocidad hacia el centro
            speedX: fromLeft ? (Math.random() * 5 + 2) : -(Math.random() * 5 + 2),
            speedY: Math.random() * 4 - 2, // Un poco de movimiento vertical
            rotation: Math.random() * 360,
            rotationSpeed: Math.random() * 10 - 5
        });
    }
}

function updateConfetti() {
    confettiParticles.forEach(p => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.rotation += p.rotationSpeed;
        
        // Gravedad ligera
        p.speedY += 0.05;

        // Reiniciar si salen de la pantalla
        if (p.y > canvas.height || (p.speedX > 0 && p.x > canvas.width) || (p.speedX < 0 && p.x < 0)) {
            const fromLeft = Math.random() < 0.5;
            p.x = fromLeft ? -10 : canvas.width + 10;
            p.y = Math.random() * canvas.height * 0.5; // Reiniciar más arriba
            p.speedX = fromLeft ? (Math.random() * 5 + 2) : -(Math.random() * 5 + 2);
            p.speedY = Math.random() * 4 - 2;
        }
    });
}

function drawVictoryScreen() {
    // Fondo blanco
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Actualizar confeti
    updateConfetti();

    // Dibujar confeti
    confettiParticles.forEach(p => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation * Math.PI / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
    });

    // Mostrar el modal HTML
    victoryModal.classList.remove('hidden');
}

function drawBackground() {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            // Dibujar tile base
            ctx.fillStyle = mapTiles[r][c];
            ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);

            // Dibujar decoración si existe
            const deco = decorations[r][c];
            if (deco) {
                const x = c * TILE_SIZE + deco.xOffset;
                const y = r * TILE_SIZE + deco.yOffset;

                if (deco.type === 'flower') {
                    // Tallo
                    ctx.fillStyle = '#2f5719';
                    ctx.fillRect(x + 2, y + 4, 2, 6);
                    // Flor
                    ctx.fillStyle = deco.color;
                    ctx.fillRect(x, y, 6, 6);
                    // Centro
                    ctx.fillStyle = '#FFFF00'; // Amarillo
                    ctx.fillRect(x + 2, y + 2, 2, 2);
                } else if (deco.type === 'gear') {
                    // Engranaje (Nivel 2)
                    ctx.fillStyle = deco.color;
                    ctx.beginPath();
                    ctx.arc(x + 6, y + 6, 5, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#37474f'; // Centro oscuro
                    ctx.beginPath();
                    ctx.arc(x + 6, y + 6, 2, 0, Math.PI * 2);
                    ctx.fill();
                } else if (deco.type === 'pipe') {
                    // Tubería (Nivel 2)
                    ctx.fillStyle = '#546e7a';
                    ctx.fillRect(x, y + 4, 12, 4);
                    ctx.fillStyle = '#78909c'; // Brillo
                    ctx.fillRect(x, y + 5, 12, 1);
                } else if (deco.type === 'node') {
                    // Nodo (Nivel 3)
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc(x + 6, y + 6, 3, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = deco.color;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(x + 6, y + 6);
                    ctx.lineTo(x + 12, y + 12);
                    ctx.stroke();
                } else if (deco.type === 'chip') {
                    // Chip (Nivel 3)
                    ctx.fillStyle = '#1565c0';
                    ctx.fillRect(x + 2, y + 2, 8, 8);
                    ctx.fillStyle = '#ffd600'; // Pines
                    ctx.fillRect(x, y + 3, 2, 1);
                    ctx.fillRect(x, y + 7, 2, 1);
                    ctx.fillRect(x + 10, y + 3, 2, 1);
                    ctx.fillRect(x + 10, y + 7, 2, 1);
                } else if (deco.type === 'star') {
                    // Estrella (Nivel 4)
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(x + 2, y, 1, 5);
                    ctx.fillRect(x, y + 2, 5, 1);
                } else if (deco.type === 'planet') {
                    // Planeta (Nivel 4)
                    ctx.fillStyle = '#e91e63';
                    ctx.beginPath();
                    ctx.arc(x + 6, y + 6, 4, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.ellipse(x + 6, y + 6, 6, 2, Math.PI / 4, 0, Math.PI * 2);
                    ctx.stroke();
                } else if (deco.type === 'pine') {
                    // Pino (Legacy)
                    ctx.fillStyle = '#1b5e20';
                    ctx.beginPath();
                    ctx.moveTo(x + 6, y);
                    ctx.lineTo(x + 12, y + 12);
                    ctx.lineTo(x, y + 12);
                    ctx.fill();
                    ctx.fillStyle = '#3e2723';
                    ctx.fillRect(x + 5, y + 12, 2, 4);
                } else if (deco.type === 'rock') {
                    // Roca (Legacy)
                    ctx.fillStyle = '#9e9e9e';
                    ctx.fillRect(x, y + 8, 8, 6);
                    ctx.fillStyle = '#bdbdbd';
                    ctx.fillRect(x + 2, y + 8, 2, 2);
                }
            }
        }
    }
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Iniciar juego
gameLoop();