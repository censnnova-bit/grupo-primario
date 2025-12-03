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
const closeBtn = document.getElementById('close-btn');

// Estado del juego
let gamePaused = false;
let currentLevel = 1;

// Configuración del mapa (Pixel Art)
const TILE_SIZE = 40;
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

const player = {
    x: 50,
    y: 50,
    width: 250,
    height: 250,
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

    // Inicializar mapa con pasto o nieve según nivel
    for (let r = 0; r < ROWS; r++) {
        const row = [];
        const decoRow = [];
        for (let c = 0; c < COLS; c++) {
            let baseColor;
            if (currentLevel === 1) {
                const greens = ['#76c442', '#6ab03b', '#82d649', '#5e9e35'];
                baseColor = greens[Math.floor(Math.random() * greens.length)];
            } else {
                // Nivel 2: Nieve/Hielo
                const whites = ['#e3f2fd', '#bbdefb', '#90caf9', '#ffffff'];
                baseColor = whites[Math.floor(Math.random() * whites.length)];
            }
            row.push(baseColor);
            decoRow.push(null); // Inicialmente sin decoración
        }
        mapTiles.push(row);
        decorations.push(decoRow);
    }

    // Generar camino sinuoso (Random Walk sesgado hacia la meta)
    // Empezar en los pies del jugador
    let currentX = Math.floor((player.x + player.width / 2) / TILE_SIZE);
    let currentY = Math.floor((player.y + player.height - 50) / TILE_SIZE); // Ajustado a los pies
    
    // Asegurar que esté dentro de los límites
    currentX = Math.max(1, Math.min(currentX, COLS - 2));
    currentY = Math.max(1, Math.min(currentY, ROWS - 2));

    // Definir punto final lejos del inicio y con margen de seguridad
    // Si estamos a la derecha, ir a la izquierda. Si estamos abajo, ir arriba.
    let endX, endY;
    
    if (currentX > COLS / 2) {
        endX = 5; // Ir a la izquierda (margen de 5 bloques)
    } else {
        endX = COLS - 8; // Ir a la derecha (margen de 8 bloques para evitar borde)
    }

    if (currentY > ROWS / 2) {
        endY = 5; // Ir arriba
    } else {
        endY = ROWS - 8; // Ir abajo
    }
    
    // Asegurar que el camino llegue al final
    while (currentX !== endX || currentY !== endY) {
        pathTiles.push({x: currentX, y: currentY});
        
        // Marcar en el mapa visual (más ancho y amarillo)
        // Dibujamos un bloque de 3x3 alrededor del punto actual
        for(let dy = -1; dy <= 1; dy++) {
            for(let dx = -1; dx <= 1; dx++) {
                const py = currentY + dy;
                const px = currentX + dx;
                if (py >= 0 && py < ROWS && px >= 0 && px < COLS) {
                    mapTiles[py][px] = currentLevel === 1 ? '#FFD700' : '#795548'; // Amarillo o Tierra
                }
            }
        }

        // Decidir siguiente paso
        // Mayor probabilidad de moverse hacia la meta
        const moveX = endX - currentX;
        const moveY = endY - currentY;
        
        // Aleatoriedad para curvas
        const random = Math.random();
        
        if (Math.abs(moveX) > Math.abs(moveY)) {
            // Moverse en X preferiblemente
            if (random < 0.7) {
                currentX += Math.sign(moveX);
            } else {
                currentY += Math.sign(moveY) !== 0 ? Math.sign(moveY) : (Math.random() < 0.5 ? 1 : -1);
            }
        } else {
            // Moverse en Y preferiblemente
            if (random < 0.7) {
                currentY += Math.sign(moveY);
            } else {
                currentX += Math.sign(moveX) !== 0 ? Math.sign(moveX) : (Math.random() < 0.5 ? 1 : -1);
            }
        }
        
        // Limites
        currentX = Math.max(1, Math.min(currentX, COLS - 2));
        currentY = Math.max(1, Math.min(currentY, ROWS - 2));
    }
    // Agregar el punto final
    pathTiles.push({x: endX, y: endY});
    mapTiles[endY][endX] = currentLevel === 1 ? '#FFD700' : '#795548';

    // Configurar puerta
    door = {
        x: endX * TILE_SIZE,
        y: endY * TILE_SIZE,
        width: TILE_SIZE,
        height: TILE_SIZE
    };

    // Agregar decoraciones (Flores de colores o Pinos)
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (mapTiles[r][c] !== (currentLevel === 1 ? '#FFD700' : '#795548')) { // Si no es camino
                if (Math.random() < 0.6) { // Alta densidad
                    if (currentLevel === 1) {
                        const flowerColors = ['#FF0000', '#FFFF00', '#0000FF', '#FF00FF', '#FFFFFF', '#FFA500'];
                        decorations[r][c] = {
                            xOffset: Math.floor(Math.random() * (TILE_SIZE - 10)),
                            yOffset: Math.floor(Math.random() * (TILE_SIZE - 10)),
                            type: 'flower',
                            color: flowerColors[Math.floor(Math.random() * flowerColors.length)]
                        };
                    } else {
                        // Nivel 2: Pinos o Rocas
                        decorations[r][c] = {
                            xOffset: Math.floor(Math.random() * (TILE_SIZE - 10)),
                            yOffset: Math.floor(Math.random() * (TILE_SIZE - 10)),
                            type: Math.random() < 0.7 ? 'pine' : 'rock'
                        };
                    }
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
        Math.floor(pathTiles.length * 0.2),
        Math.floor(pathTiles.length * 0.5),
        Math.floor(pathTiles.length * 0.75)
    ];

    // Actualizar coordenadas de los puntos existentes
    // Solo usamos los primeros 3 puntos de la lista original o creamos nuevos si faltan
    let newPointsData = [];
    
    if (currentLevel === 1) {
        newPointsData = [
            { title: 'Logro: Implementación', text: 'Se logró implementar el nuevo módulo de analítica con un 99% de disponibilidad.', color: '#28a745' },
            { title: 'Reto: Integración', text: 'La integración con el sistema legado presentó inconsistencias que estamos resolviendo.', color: '#dc3545' },
            { title: 'Próximos Pasos', text: 'Iniciar la fase 2 del proyecto enfocada en la experiencia de usuario móvil.', color: '#ffc107' }
        ];
    } else {
        newPointsData = [
            { title: 'Estrategia Digital', text: 'Consolidación de la hoja de ruta digital para el próximo quinquenio.', color: '#00bcd4' },
            { title: 'Ciberseguridad', text: 'Implementación de doble factor de autenticación en todos los sistemas críticos.', color: '#673ab7' },
            { title: 'Innovación Abierta', text: 'Lanzamiento de 3 retos de innovación con startups locales.', color: '#e91e63' }
        ];
    }

    points.length = 0; // Limpiar array actual
    
    indices.forEach((pathIndex, i) => {
        const tile = pathTiles[pathIndex];
        points.push({
            x: tile.x * TILE_SIZE + (TILE_SIZE - 40) / 2, // Centrar en el tile
            y: tile.y * TILE_SIZE + (TILE_SIZE - 40) / 2,
            width: 40,
            height: 40,
            color: newPointsData[i].color,
            title: newPointsData[i].title,
            text: newPointsData[i].text,
            visited: false
        });
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
    popup.classList.add('hidden');
    gamePaused = false;
    // Mover al jugador un poco para que no active el popup inmediatamente de nuevo
    player.y += 10; 
});

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
    const hitboxMargin = 100; // Reducir 100px por cada lado (250 - 200 = 50px de hitbox)
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
        // Cambiar nivel
        currentLevel++;
        // Generar nuevo mapa (el jugador se queda donde está)
        generateMap();
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
}

function draw() {
    // Limpiar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

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

    // Dibujar texto CENS en la esquina superior derecha
    ctx.fillStyle = 'white';
    ctx.font = 'bold 80px monospace';
    ctx.textAlign = 'right';
    ctx.shadowColor = "black";
    ctx.shadowBlur = 5;
    ctx.fillText('CENS', canvas.width - 50, canvas.height - 100);
    ctx.shadowBlur = 0; // Resetear sombra
    ctx.textAlign = 'left'; // Resetear alineación
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
                } else if (deco.type === 'pine') {
                    // Pino (Nivel 2)
                    ctx.fillStyle = '#1b5e20'; // Verde oscuro
                    // Triángulo simple
                    ctx.beginPath();
                    ctx.moveTo(x + 6, y);
                    ctx.lineTo(x + 12, y + 12);
                    ctx.lineTo(x, y + 12);
                    ctx.fill();
                    // Tronco
                    ctx.fillStyle = '#3e2723';
                    ctx.fillRect(x + 5, y + 12, 2, 4);
                } else if (deco.type === 'rock') {
                    // Roca (Nivel 2)
                    ctx.fillStyle = '#9e9e9e'; // Gris
                    ctx.fillRect(x, y + 8, 8, 6);
                    ctx.fillStyle = '#bdbdbd'; // Brillo
                    ctx.fillRect(x + 2, y + 8, 2, 2);
                } else if (deco.type === 'grass') {
                    // Pasto pequeño
                    ctx.fillStyle = '#3e7023';
                    ctx.fillRect(x, y, 4, 4);
                    ctx.fillRect(x + 4, y - 4, 4, 4);
                    ctx.fillRect(x + 8, y, 4, 4);
                } else {
                    // Matorral pequeño
                    ctx.fillStyle = '#2f5719';
                    ctx.fillRect(x, y, 12, 12);
                    ctx.fillStyle = '#4a8529'; // Brillo
                    ctx.fillRect(x + 2, y + 2, 4, 4);
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