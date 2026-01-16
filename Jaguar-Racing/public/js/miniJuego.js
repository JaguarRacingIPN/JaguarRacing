// Variable global para limpiar timeouts si cambias de página
let gameTimeouts = [];

document.addEventListener('astro:page-load', () => {
    const btn = document.getElementById('reaction-btn');
    if (!btn) return;

    // --- DOM ---
    const lights = document.querySelectorAll('.light');
    const resultDisplay = document.getElementById('reaction-result');
    const bestTimeDisplay = document.getElementById('best-time-display');
    const rankDisplay = document.getElementById('player-rank');

    // --- ESTADO ---
    let gameState = 'idle'; 
    let startTime = 0;
    
    // --- LIMPIEZA INICIAL ---
    resetAllTimeouts();

    // --- CARGAR RÉCORD ---
    let personalBest = localStorage.getItem('jaguarReactionRecord');
    updateBestDisplay(personalBest);

    // --- FUNCIONES ---

    function resetAllTimeouts() {
        gameTimeouts.forEach(id => clearTimeout(id));
        gameTimeouts = [];
    }

    function updateBestDisplay(time) {
        if (time && time < 9999) {
            personalBest = parseFloat(time);
            if (bestTimeDisplay) {
                bestTimeDisplay.textContent = `${personalBest} ms`;
                bestTimeDisplay.style.color = "#FFE878";
            }
        } else {
            personalBest = 9999;
            if (bestTimeDisplay) bestTimeDisplay.textContent = "--";
        }
    }

    function resetVisuals() {
        lights.forEach(l => l.classList.remove('red', 'green'));
        
        btn.classList.remove('penalty');
        btn.style.backgroundColor = 'transparent'; 
        btn.style.transform = 'scale(1)';
        resultDisplay.style.color = '#FFE878';
        
        // CORRECCIÓN: Limpiar cualquier color residual del rango
        rankDisplay.style.color = ""; 
        rankDisplay.style.opacity = "0";
    }

    function triggerFault() {
        gameState = 'fault';
        resetAllTimeouts(); 
        resetVisuals();
        
        resultDisplay.textContent = "¡SALIDA EN FALSO!";
        resultDisplay.style.color = "#ff4444";
        
        btn.innerText = "REINTENTAR"; 
        
        rankDisplay.textContent = "DESCALIFICADO 🚫";
        rankDisplay.className = "reaction-rank rank-slow";
        // CORRECCIÓN: Forzar el color rojo aquí también para sobreescribir el verde anterior
        rankDisplay.style.color = "#ff4444"; 
        rankDisplay.style.opacity = "1";
    }

    function startGameSequence() {
        gameState = 'waiting';
        resetVisuals(); // Esto limpia el color verde anterior
        
        btn.innerText = "ESPERA..."; 
        resultDisplay.textContent = "0.000 ms";

        let cumulativeDelay = 0;

        // Secuencia de luces rojas
        lights.forEach((light) => {
            cumulativeDelay += 800;
            const id = setTimeout(() => {
                if (gameState === 'waiting') light.classList.add('red');
            }, cumulativeDelay);
            gameTimeouts.push(id);
        });

        // Tiempo aleatorio extra
        const randomTime = Math.floor(Math.random() * 3000) + 1000;
        const totalWait = cumulativeDelay + randomTime;

        const greenId = setTimeout(() => {
            if (gameState === 'waiting') goGreen();
        }, totalWait);
        gameTimeouts.push(greenId);
    }

    function goGreen() {
        gameState = 'green';
        startTime = performance.now();
        
        lights.forEach(l => {
            l.classList.remove('red');
            l.classList.add('green');
        });
        
        btn.innerText = "¡AHORA!"; 
    }

    function handleInteraction(e) {
        if(e.type === 'touchstart') e.preventDefault(); 

        if (gameState === 'idle' || gameState === 'result' || gameState === 'fault') {
            startGameSequence();
        } else if (gameState === 'waiting') {
            triggerFault();
        } else if (gameState === 'green') {
            finishGame();
        }
    }

    function finishGame() {
        gameState = 'result';
        const endTime = performance.now();
        const reactionTime = Math.floor(endTime - startTime); 

        resultDisplay.textContent = `${reactionTime} ms`;
        
        // --- LÓGICA DE RANGO ---
        let rankTitle, rankClass, color;

        if (reactionTime < 250) { 
            rankTitle = "JAGUAR LEGEND 🐆";
            rankClass = "rank-legend";
            color = "#FFD700";
        } else if (reactionTime < 350) {
            rankTitle = "PILOTO F1 🏎️";
            rankClass = "rank-pro";
            color = "#00ff00";
        } else if (reactionTime < 500) {
            rankTitle = "CONDUCTOR PROMEDIO 🚗";
            rankClass = "rank-avg";
            color = "#fff";
        } else {
            rankTitle = "ABUELITA AL VOLANTE 🐢";
            rankClass = "rank-slow";
            color = "#ff4444";
        }

        rankDisplay.textContent = rankTitle;
        rankDisplay.className = `reaction-rank ${rankClass}`;
        // Aplicamos el color explícitamente
        rankDisplay.style.color = color;
        rankDisplay.style.opacity = "1";
        
        rankDisplay.style.transform = "scale(1.2)";
        setTimeout(() => rankDisplay.style.transform = "scale(1)", 200);

        // Récord
        if (reactionTime < personalBest && reactionTime > 50) { 
            personalBest = reactionTime;
            localStorage.setItem('jaguarReactionRecord', personalBest);
            if(bestTimeDisplay) {
                bestTimeDisplay.textContent = `${personalBest} ms (¡RÉCORD!)`;
                bestTimeDisplay.style.color = "#FFD700";
            }
        }

        btn.innerText = "JUGAR OTRA VEZ"; 
    }

    // --- EVENT LISTENERS ---
    btn.onclick = null; 
    if (window.PointerEvent) {
        btn.onpointerdown = handleInteraction;
    } else {
        btn.ontouchstart = handleInteraction;
        btn.onmousedown = handleInteraction;
    }
});

// Limpieza
document.addEventListener('astro:before-swap', () => {
    gameTimeouts.forEach(id => clearTimeout(id));
    gameTimeouts = [];
});