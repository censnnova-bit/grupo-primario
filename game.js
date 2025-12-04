const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const gameContainer = document.getElementById('game-container');

// Ajustar canvas al tamaño del contenedor (no de la ventana)
function resizeCanvas() {
    if (gameContainer) {
        canvas.width = gameContainer.clientWidth;
        canvas.height = gameContainer.clientHeight;
    } else {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
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
// gameContainer ya definido arriba
const playerElement = document.getElementById('player');

// Contenedor de decoraciones (DOM para GIFs y tamaños grandes)
const decorationsContainer = document.createElement('div');
decorationsContainer.id = 'decorations-container';
gameContainer.appendChild(decorationsContainer);

// Estado del juego
let gamePaused = false;
let currentLevel = 1;
let timerInterval;
let gameWon = false;
let portalRotation = 0;
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

// Cargar Assets de Iconos
const assets = {
    tree: new Image(),
    mountain: new Image(),
    gear: new Image(),
    tower: new Image(),
    kmz: new Image(),
    chip: new Image(),
    electricity: new Image(),
    node: new Image(),
    star: new Image(),
    planet: new Image(),
    rocket: new Image(),
    portal: new Image()
};

assets.tree.src = 'assets/arbol-de-la-vida.png';
assets.mountain.src = 'assets/montana.png';
assets.gear.src = 'assets/engranajes.gif';
assets.tower.src = 'assets/torre-electrica.png';
assets.kmz.src = 'assets/plano.png';
assets.chip.src = 'assets/chip-de-computadora.png';
assets.electricity.src = 'assets/relampago.png';
assets.node.src = 'assets/lineas-electricas.gif';
assets.star.src = 'assets/estrella.gif';
assets.planet.src = 'assets/marte.gif';
assets.rocket.src = 'assets/cohete.png';
assets.portal.src = 'assets/portal.png';

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
    
    // Limpiar decoraciones del DOM
    decorationsContainer.innerHTML = '';
    
    // Asegurar que los contenedores sean visibles (por si se reinicia el juego)
    if (playerElement) playerElement.style.display = 'block';
    if (decorationsContainer) decorationsContainer.style.display = 'block';

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
            } else if (team === 3) { // Gestión de Información (Data/Tech)
                // Cambiado a tonos azules oscuros/petróleo para resaltar la electricidad amarilla
                const blues = ['#006064', '#00838f', '#0097a7', '#00acc1'];
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
    const occupiedMask = Array(ROWS).fill().map(() => Array(COLS).fill(false));
    
    // Contadores para limitar elementos grandes en Censnnova
    let planetCount = 0;
    let rocketCount = 0;

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            // Si no es camino (usamos el color del camino actual para verificar)
            if (mapTiles[r][c] !== finalPathColor && !occupiedMask[r][c]) { 
                if (Math.random() < 0.03) { // Densidad reducida
                    let type, color;
                    
                    if (team === 1) { // Sostenibilidad
                        const rand = Math.random();
                        if (rand < 0.4) {
                            const flowerColors = ['#FF0000', '#FFFF00', '#0000FF', '#FF00FF', '#FFFFFF', '#FFA500'];
                            type = 'flower';
                            color = flowerColors[Math.floor(Math.random() * flowerColors.length)];
                        } else if (rand < 0.7) {
                            type = 'tree';
                            color = '#228B22'; // Forest Green
                        } else {
                            type = 'mountain'; // Montañas
                            color = '#795548'; // Brown
                        }
                    } else if (team === 2) { // Infraestructura
                        const rand = Math.random();
                        if (rand < 0.3) {
                            type = 'gear';
                            color = '#607d8b';
                        } else if (rand < 0.6) {
                            type = 'pipe';
                            color = '#546e7a';
                        } else if (rand < 0.8) {
                            type = 'tower'; // Torre de energía
                            color = '#37474f';
                        } else {
                            type = 'kmz'; // Icono de mapa/KMZ
                            color = '#d32f2f'; // Red pin
                        }
                    } else if (team === 3) { // Gestión de Información
                        const rand = Math.random();
                        if (rand < 0.4) {
                            type = 'node';
                            color = '#0d47a1';
                        } else if (rand < 0.7) {
                            type = 'chip';
                            color = '#1565c0';
                        } else {
                            type = 'electricity'; // Rayo/Chispa
                            color = '#FFD600';
                        }
                    } else { // Censnnova
                        const rand = Math.random();
                        if (rand < 0.6) {
                            type = 'star';
                            color = '#ffffff';
                        } else if (rand < 0.8) {
                            if (planetCount < 2) {
                                type = 'planet';
                                color = '#ffcc80';
                                planetCount++;
                            } else {
                                type = 'star'; // Fallback
                                color = '#ffffff';
                            }
                        } else {
                            if (rocketCount < 2) {
                                type = 'rocket';
                                color = '#ff5252';
                                rocketCount++;
                            } else {
                                type = 'star'; // Fallback
                                color = '#ffffff';
                            }
                        }
                    }

                    // Crear elemento DOM si existe el asset
                    if (assets[type]) {
                        // Tamaño personalizado
                        let size = TILE_SIZE * 2; 
                        if (type === 'tree') size = TILE_SIZE * 1.5; // Reducido
                        if (type === 'tower') size = TILE_SIZE * 2; // Reducido (antes 3)
                        if (type === 'gear') size = TILE_SIZE * 2.5; // Aumentado (antes 2)
                        if (type === 'portal') size = TILE_SIZE * 3;
                        if (type === 'star') size = TILE_SIZE * 1.5;
                        if (type === 'planet' || type === 'rocket') size = TILE_SIZE * 4; // Aumentado significativamente

                        // Calcular radio de ocupación en tiles (aprox)
                        // Usamos un radio un poco mayor para evitar superposición visual
                        const radius = Math.ceil(size / TILE_SIZE / 1.5);
                        
                        // Verificar si el área está libre
                        let areaFree = true;
                        for(let dy = -radius; dy <= radius; dy++) {
                            for(let dx = -radius; dx <= radius; dx++) {
                                const ny = r + dy;
                                const nx = c + dx;
                                if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS) {
                                    if (occupiedMask[ny][nx]) {
                                        areaFree = false;
                                        break;
                                    }
                                }
                            }
                            if(!areaFree) break;
                        }

                        if (areaFree) {
                            const img = document.createElement('img');
                            img.src = assets[type].src;
                            img.className = 'decoration-item';
                            
                            // Posición (Centro del tile)
                            const cx = c * TILE_SIZE + TILE_SIZE / 2;
                            const cy = r * TILE_SIZE + TILE_SIZE / 2;
                            
                            img.style.left = `${cx}px`;
                            img.style.top = `${cy}px`;
                            img.style.width = `${size}px`;
                            
                            decorationsContainer.appendChild(img);
                            
                            // Marcar área como ocupada
                            for(let dy = -radius; dy <= radius; dy++) {
                                for(let dx = -radius; dx <= radius; dx++) {
                                    const ny = r + dy;
                                    const nx = c + dx;
                                    if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS) {
                                        occupiedMask[ny][nx] = true;
                                    }
                                }
                            }
                            
                            // No agregamos a decorations[][] para que no se dibuje en canvas
                            decorations[r][c] = null; 
                        } else {
                            // Si no pudimos poner el planeta/cohete por espacio, devolvemos el contador
                            if (type === 'planet') planetCount--;
                            if (type === 'rocket') rocketCount--;
                        }
                    } else {
                        // Si no hay asset (ej: flower, pipe), lo dejamos para el canvas
                        decorations[r][c] = {
                            xOffset: Math.floor(Math.random() * 5),
                            yOffset: Math.floor(Math.random() * 5),
                            type: type,
                            color: color
                        };
                        occupiedMask[r][c] = true;
                    }
                }
            }
        }
    }

    // Generar Lago (Solo en Sostenibilidad)
    if (team === 1) {
        // Intentar encontrar un lugar libre para el lago
        let lakeCenterX = Math.floor(Math.random() * (COLS - 10)) + 5;
        let lakeCenterY = Math.floor(Math.random() * (ROWS - 10)) + 5;
        const lakeRadius = 4; // Radio en tiles

        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                // Distancia al centro del lago
                const dist = Math.sqrt(Math.pow(c - lakeCenterX, 2) + Math.pow(r - lakeCenterY, 2));
                if (dist < lakeRadius) {
                    // Solo poner agua si no es camino y no es el inicio/fin
                    if (mapTiles[r][c] !== finalPathColor && 
                        !(c === player.x/TILE_SIZE && r === player.y/TILE_SIZE) &&
                        !(c === endX && r === endY)) {
                        
                        mapTiles[r][c] = '#4FC3F7'; // Agua
                        decorations[r][c] = null; // Quitar decoraciones en el agua
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
                { title: 'Logro 1: Carbono Neutral', text: 'Certificación CENS como empresa Carbono Neutral, primera del nororiente colombiano y una de las 5 primeras en el sector eléctrico. Experto: Maryuly Torres y Claudia Suárez', color: '#28a745' },
                { title: 'Logro 2: Obras por Impuestos', text: 'Ejecucion de primer proyecto bajo el mecanismo de Obras por impuestos: Dotación de 7 Centros de Desarrollo Infantil del ICBF en Tibú, Teorama, Convención y El Tarra por M$2,134 para favorecer a 690 niños y niñas entre 0 y 5 años. Experto: Alba Plata y Darly Guerrero', color: '#28a745' },
                { title: 'Logro 3: Impacto Ambiental', text: 'Acciones de impacto ambiental con instalación de sistemas de auto generación solar en Tibú y Aguachica para cubrir el 100% de demanda interna, reduciendo costos por auto consumos en las sedes administrativas, cuidado de especie Mono Alouatta en Buena Esperanza con instalación de pasos de fauna, zonas de alimentación y formación comunitaria, y captura de M$3,846 en beneficios tributarios por inversiones ambientales entre las cuales se resaltan postes de fibra, transformadores de potencia con aceite vegetal y equipo para analizar gas SF6. Experto: Maryuly Torres', color: '#28a745' }
            ];
        } else {
            newPointsData = [
                { title: 'Reto 1: Estrategias Ambientales', text: 'Ejecutar estrategias ambientales territoriales en las regionales CENS para apalancar beneficios económicos, reputacionales y ambientales en zonas de influencia. Experto: Maryuly Torres', color: '#dc3545' },
                { title: 'Reto 2: PMO Empresarial', text: 'Implementación PMO (Oficina de Gestión de Proyectos) empresarial como herramienta clave para fortalecer la gestión del portafolio de proyectos de CENS. Experto: Wilson Lizarazo', color: '#dc3545' },
                { title: 'Reto 3: Obras por Impuestos', text: 'Ejecución de 2 proyectos bajo el mecanismo de Obras por Impuestos (uno CENS como contribuyente y otro una empresa del grupo como contribuyente) en municipios PDET y ZOMAC. Experto: Alba Plata', color: '#dc3545' }
            ];
        }
    } else if (team === 2) { // Planeación de Infraestructura
        if (isAchievements) {
            newPointsData = [
                { title: 'Logro 1: Nuevas Tecnologías', text: 'Viabilización para la incorporación de nuevas tecnologías en la red de CENS. En 2025 el equipo de Planeación de Infraestructura impulsó la incorporación de nuevas tecnologías para aumentar la flexibilidad y resiliencia del sistema eléctrico, incluyendo la planificación y/o puesta en servicio de subestaciones móviles, el uso operativo del Big Jumper para disminuir indisponibilidades en maniobras y mantenimientos, y el avance en nuevas subestaciones que fortalecen la confiabilidad y la capacidad de atención de la demanda en zonas críticas del sistema.', color: '#607d8b' },
                { title: 'Logro 2: SVC a STATCOM', text: 'Cambio de la solución de compensación reactiva de SVC a STATCOM. Se realizó el análisis técnico y la definición estratégica para migrar de una solución SVC a una tecnología STATCOM, con el objetivo de mejorar los perfiles de tensión, la estabilidad del sistema y la respuesta dinámica ante variaciones de carga y generación. Este cambio alinea a CENS con las mejores prácticas del sector y prepara la infraestructura para los retos de la transición energética y el crecimiento de la generación distribuida.', color: '#607d8b' },
                { title: 'Logro 3: Estudios de Conexión', text: 'Fortalecimiento de los estudios de conexión y análisis de pérdidas técnicas. Durante 2025, Planeación de Infraestructura consolidó su rol técnico emitiendo más de 700 insumos para la realización de estudios de conexión y realizando más de 300 revisiones de estudios de conexión de AGPE, Generación Distribuida (GD) y AGGE, asegurando el cumplimiento de criterios técnicos y normativos. Adicionalmente, se ejecutó el estudio de pérdidas técnicas de CENS, que se convierte en una herramienta clave para priorizar inversiones, optimizar la red y soportar discusiones regulatorias y de planeación a mediano y largo plazo.', color: '#607d8b' }
            ];
        } else {
            newPointsData = [
                { title: 'Reto 1: Plan de Cobertura 100%', text: 'Documentar y consolidar el Plan de Cobertura de CENS al 100 %. En 2026 el principal reto será documentar, actualizar y consolidar el Plan de Cobertura de CENS, identificando las brechas de servicio y definiendo la ruta de proyectos de expansión necesarios para avanzar hacia el 100 % de cobertura en el área de influencia. Esto incluye priorizar zonas no atendidas o con baja calidad de suministro, estimar inversiones y articular el plan con el Plan de Inversiones y la estrategia corporativa.', color: '#ff5722' },
                { title: 'Reto 2: Transición Energética', text: 'Identificar y estructurar proyectos para adecuar el sistema para la transición energética. Otro reto clave es gestionar la identificación y estructuración de proyectos que permitan atender las necesidades de la transición energética, incluyendo integración de nuevas tecnologías de generación renovable, almacenamiento, comunidades energéticas y modernización de la red. El objetivo es contar con un portafolio de proyectos preparado para responder de manera oportuna a los cambios en el mercado, la regulación y las políticas públicas en materia de descarbonización y electrificación.', color: '#ff5722' },
                { title: 'Reto 3: Nuevas Señales de Generación', text: 'Atender nuevas señales de generación en el área de influencia de CENS. Finalmente, en 2026 se plantea como reto fortalecer la capacidad de respuesta ante nuevas señales de generación (proyectos de AGPE, GD y AGGE) que se identifiquen en el territorio. Esto implica mejorar los procesos de análisis de conexión, anticipar necesidades de refuerzos y nuevas obras de infraestructura, y asegurar que la red de CENS pueda integrar de forma segura y eficiente la nueva generación, manteniendo la calidad y confiabilidad del servicio para todos los usuarios.', color: '#ff5722' }
            ];
        }
    } else if (team === 3) { // Gestión de información y Estudios Eléctricos
        if (isAchievements) {
            newPointsData = [
                { title: 'Logro 1: Automatización', text: 'Automatización de actividades del equipo: Se realizaron automatizaciones para el seguimiento del PIR desde el MDE, Indicador de efectividad en cambio de fusibles y el seguimiento del PIR para activos centralizados.', color: '#0288d1' },
                { title: 'Logro 2: Contratación Social', text: 'Contratación social para georreferenciación. Se ejecutó el piloto de contratación social para el georeferenciamiento de activos del SDL.', color: '#0288d1' },
                { title: 'Logro 3: Estudios Protecciones', text: 'Estudios de coordinación de protecciones. Atención de más de 100 EACP en autogeneración y generación distribuida. Y Elaboración de EACP para proyectos estratégicos de la empresa como Sevilla 115 kV, La Playa, etc.', color: '#0288d1' }
            ];
        } else {
            newPointsData = [
                { title: 'Reto 1: Actualización PIR', text: 'Optimizar tiempos de actualización del PIR. Aplicación permanente de cargues masivos, flujo de trabajo coordinado de las demás áreas, Integración ARCGIS – MDE.', color: '#d32f2f' },
                { title: 'Reto 2: Auditoría PIR', text: 'Atención auditoría del PIR. Atención de la auditoría de reporte de los planes de inversión.', color: '#d32f2f' },
                { title: 'Reto 3: Calidad de Datos', text: 'Calidad de Datos. Definir indicadores de calidad de los datos.', color: '#d32f2f' }
            ];
        }
    } else { // Censnnova
        if (isAchievements) {
            newPointsData = [
                { title: 'Logro 1: Estrategia TECHNNOVA', text: 'Impacto a más de 500 personas con la estrategia TECHNNOVA y activaciones de innovación y tecnología, generando la capacidad de innovar con el uso de IA, analítica de datos y nuevas técnicas.', color: '#673ab7' },
                { title: 'Logro 2: Agentes de IA', text: 'Construcción de 25 agentes de IA documentados y listos para despliegue, alineados a los retos corporativos.', color: '#673ab7' },
                { title: 'Logro 3: Proyectos y Reconocimientos', text: 'En proyectos digitales logramos la entrega de 6 desarrollos DevOps y 8 en fase final para entrega + avances en TRL 7 de CTS e ITEM. Además, 3er lugar plataforma de innovación CIER 2025 + Finalistas 2025 premios Ambar con DERS.', color: '#673ab7' }
            ];
        } else {
            newPointsData = [
                { title: 'Reto 1: Nuevos Negocios', text: 'Diseñar 2 nuevos negocios para Cens.', color: '#c2185b' },
                { title: 'Reto 2: Escalar Soluciones', text: 'Escalar soluciones de desarrollo en el CIM con el acompañamiento de TI.', color: '#c2185b' },
                { title: 'Reto 3: PMO Centralizada', text: 'Articular la PMO de CENSNNOVA junto al equipo de PMO de sostenibilidad y estrategia para consolidar una PMO centralizada.', color: '#c2185b' }
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

// Asegurar carga correcta en móviles
window.addEventListener('load', () => {
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

// Controles Táctiles
const btnUp = document.getElementById('btn-up');
const btnDown = document.getElementById('btn-down');
const btnLeft = document.getElementById('btn-left');
const btnRight = document.getElementById('btn-right');

function addTouchListeners(btn, key) {
    if (!btn) return;
    
    const startHandler = (e) => {
        if (e.cancelable) e.preventDefault(); // Evitar scroll/zoom
        keys[key] = true;
    };
    
    const endHandler = (e) => {
        if (e.cancelable) e.preventDefault();
        keys[key] = false;
    };

    btn.addEventListener('mousedown', startHandler);
    btn.addEventListener('touchstart', startHandler, { passive: false });
    
    btn.addEventListener('mouseup', endHandler);
    btn.addEventListener('touchend', endHandler);
    btn.addEventListener('mouseleave', endHandler);
}

addTouchListeners(btnUp, 'ArrowUp');
addTouchListeners(btnDown, 'ArrowDown');
addTouchListeners(btnLeft, 'ArrowLeft');
addTouchListeners(btnRight, 'ArrowRight');

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
            // Ocultar elementos del juego para la pantalla de victoria
            if (playerElement) playerElement.style.display = 'none';
            if (decorationsContainer) decorationsContainer.style.display = 'none';
        } else {
            // Cambiar nivel
            currentLevel++;
            // Generar nuevo mapa (el jugador se queda donde está)
            generateMap();
        }
    }

    // Actualizar posición del jugador en el DOM
    if (playerElement) {
        playerElement.style.left = `${player.x + player.width/2}px`;
        playerElement.style.top = `${player.y + player.height/2}px`;
        // Usar rad for rotation since Math.sin returns radians, but CSS rotate uses deg by default or specify unit
        // In update(), rotation is calculated as Math.sin(...) * 0.2. This is small radians.
        playerElement.style.transform = `translate(-50%, -50%) rotate(${player.rotation}rad)`;
        playerElement.style.width = `${player.width}px`;
        playerElement.style.height = `${player.height}px`;
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
        if (currentLevel === 8) {
            // Portal para el último nivel (Ahora usando PNG en el DOM si es posible, pero aquí es canvas fallback o si no se agregó al DOM)
            // Como el portal es un asset importante, mejor lo dibujamos en canvas si no está en decorationsContainer
            // Pero espera, decorationsContainer maneja los assets grandes.
            // El portal se dibuja aquí en el canvas. Deberíamos moverlo al decorationsContainer para consistencia?
            // El usuario pidió usar PNG.
            
            if (assets.portal && assets.portal.complete && assets.portal.naturalWidth !== 0) {
                 // Dibujar portal rotando y más grande
                 const centerX = door.x + door.width / 2;
                 const centerY = door.y + door.height / 2;
                 // Hacerlo más grande visualmente (2x el tamaño lógico de la puerta)
                 const drawSize = door.width * 2; 
                 
                 ctx.save();
                 ctx.translate(centerX, centerY);
                 // Rotación continua
                 const rotation = Date.now() / 2000; // Rotación lenta
                 ctx.rotate(rotation);
                 
                 ctx.drawImage(assets.portal, -drawSize/2, -drawSize/2, drawSize, drawSize);
                 ctx.restore();
            } else {
                // Fallback to code drawing
                const centerX = door.x + door.width / 2;
                const centerY = door.y + door.height / 2;
                const radius = door.width / 2;

                // Efecto de remolino
                const time = Date.now() / 500;
                
                // Fondo del portal
                const gradient = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, radius);
                gradient.addColorStop(0, '#000000');
                gradient.addColorStop(0.5, '#4a148c');
                gradient.addColorStop(1, '#8e24aa');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                ctx.fill();

                // Espirales giratorias
                ctx.save();
                ctx.translate(centerX, centerY);
                ctx.rotate(time);
                ctx.strokeStyle = '#00e5ff';
                ctx.lineWidth = 3;
                for(let i=0; i<3; i++) {
                    ctx.rotate((Math.PI * 2) / 3);
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.quadraticCurveTo(radius/2, radius/2, radius, 0);
                    ctx.stroke();
                }
                ctx.restore();
            }

        } else {
            // Puerta normal
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

    // El jugador ahora es un elemento DOM, no se dibuja en canvas

    // Dibujar logos
    // Logo CENS ahora está en el navbar

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

            // Efecto de agua para el lago
            if (mapTiles[r][c] === '#4FC3F7') {
                ctx.strokeStyle = '#81D4FA';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(c * TILE_SIZE + 5, r * TILE_SIZE + 12);
                ctx.bezierCurveTo(c * TILE_SIZE + 10, r * TILE_SIZE + 8, c * TILE_SIZE + 15, r * TILE_SIZE + 16, c * TILE_SIZE + 20, r * TILE_SIZE + 12);
                ctx.stroke();
            }

            // Dibujar decoración si existe (Solo para elementos sin asset como flower/pipe)
            const deco = decorations[r][c];
            if (deco) {
                // Centrar en el tile
                const cx = c * TILE_SIZE + TILE_SIZE / 2;
                const cy = r * TILE_SIZE + TILE_SIZE / 2;
                const size = TILE_SIZE * 0.9;

                // Fallback a dibujo por código
                if (deco.type === 'flower') {
                    // Flor más detallada
                    ctx.fillStyle = '#2f5719'; // Tallo
                    ctx.fillRect(cx - 1, cy, 2, size/2);
                    
                    ctx.fillStyle = deco.color;
                    for(let i=0; i<5; i++) {
                        const angle = (i * 2 * Math.PI) / 5;
                        const px = cx + Math.cos(angle) * 6;
                        const py = cy - 4 + Math.sin(angle) * 6;
                        ctx.beginPath();
                        ctx.arc(px, py, 4, 0, Math.PI*2);
                        ctx.fill();
                    }
                    ctx.fillStyle = '#FFFF00'; // Centro
                    ctx.beginPath();
                    ctx.arc(cx, cy - 4, 3, 0, Math.PI*2);
                    ctx.fill();

                } else if (deco.type === 'pipe') {
                    // Tubería con codo
                    ctx.fillStyle = '#546e7a';
                    ctx.lineWidth = 6;
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.moveTo(cx - 10, cy);
                    ctx.lineTo(cx, cy);
                    ctx.lineTo(cx, cy + 10);
                    ctx.stroke();
                    // Brillo
                    ctx.strokeStyle = '#78909c';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(cx - 10, cy - 2);
                    ctx.lineTo(cx - 2, cy - 2);
                    ctx.lineTo(cx - 2, cy + 10);
                    ctx.stroke();
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
