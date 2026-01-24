/**
 * src/scripts/miniJuego.js
 * Lógica del juego encapsulada para Astro.
 */

export function initGame() {
    // --- ESTADO LOCAL (Se reinicia cada vez que entras a la página) ---
    let gameTimeouts = [];
    let pollingInterval = null;
    let gameState = 'idle';
    let startTime = 0;

    // --- DOM ELEMENTOS ---
    const btn = document.getElementById('reaction-btn');
    if (!btn) return; // Si no existe el botón, no estamos en la página correcta.

    const lights = document.querySelectorAll('.light');
    const resultDisplay = document.getElementById('reaction-result');
    const rankDisplay = document.getElementById('player-rank');

    // --- RANKING DOM ---
    const leaderboardContainer = document.getElementById('top-ranks');
    const userRankRow = document.getElementById('user-rank-row');
    const userTimeDisplay = document.getElementById('user-time');
    const userPosDisplay = document.getElementById('user-pos');
    const userPilotDisplay = userRankRow ? userRankRow.querySelector('.pilot') : null;

    // --- MODAL DOM ---
    const modal = document.getElementById('name-modal');

    // --- USUARIO INICIAL ---
    let userId = localStorage.getItem('jaguar_user');
    if (userId && userPilotDisplay) userPilotDisplay.textContent = userId.split('#')[0];

    // --- FUNCIONES DE UTILIDAD ---
    
    function resetAllTimeouts() {
        gameTimeouts.forEach(id => clearTimeout(id));
        gameTimeouts = [];
    }

    function resetVisuals() {
        lights.forEach(l => l.classList.remove('red', 'green'));
        btn.classList.remove('penalty');
        btn.style.backgroundColor = 'transparent'; btn.style.transform = 'scale(1)';
        resultDisplay.style.color = '#FFE878';
        if (rankDisplay) { 
            rankDisplay.style.opacity = "0"; 
            rankDisplay.className = "reaction-rank"; 
        }
    }

    function showUserRow(mejorTiempo, posicionTexto) {
        if (!userRankRow) return;
        userRankRow.classList.remove('hidden');
        userTimeDisplay.textContent = mejorTiempo.toFixed(3) + " s";
        userPosDisplay.innerText = posicionTexto;
        const isFirst = String(posicionTexto) === "#1";
        userPosDisplay.style.color = isFirst ? "#FFD700" : "#fff";
    }

    // --- LÓGICA DE RANKING ---

    async function loadLeaderboard() {
        if (!leaderboardContainer) return;
        try {
            const res = await fetch('/api/game/ranking?t=' + Date.now());
            if (!res.ok) return;
            const top10 = await res.json();

            leaderboardContainer.innerHTML = '';

            if (!top10 || top10.length === 0) {
                leaderboardContainer.innerHTML = '<div class="rank-row" style="display:block; text-align:center;">Sé el primero 🏆</div>';
                return;
            }

            top10.forEach((player, index) => {
                const cleanName = String(player.member).split('#')[0];
                const timeStr = Number(player.score).toFixed(3);

                const row = document.createElement('div');
                row.className = 'rank-row';
                row.innerHTML = `
                    <span class="pos">${index + 1}</span>
                    <span class="pilot-col"></span>
                    <span class="time">${timeStr} s</span>
                `;
                row.querySelector('.pilot-col').textContent = cleanName;
                leaderboardContainer.appendChild(row);
            });
        } catch (e) { /* Silencio en producción */ }
    }

    async function submitScoreToRanking(tiempoMs) {
        const tiempoSegundos = tiempoMs / 1000;
        let currentBest = localStorage.getItem('jaguarReactionRecord');
        let recordHistorico = currentBest ? (parseFloat(currentBest) / 1000) : Infinity;
        let isSynced = localStorage.getItem('jaguar_server_synced');
        
        const lastKnownRank = localStorage.getItem('jaguar_last_rank');

        // 1. Guardar Récord Local
        if (tiempoSegundos < recordHistorico) {
            recordHistorico = tiempoSegundos;
            localStorage.setItem('jaguarReactionRecord', recordHistorico * 1000);
        }

        // 2. Si falta nombre, pedirlo
        if (!userId) {
            setTimeout(async () => {
                const newId = await promptForName(); 
                if (newId) {
                    userId = newId;
                    localStorage.setItem('jaguar_user', userId);
                    if (userPilotDisplay) userPilotDisplay.textContent = newId.split('#')[0];
                    submitScoreToRanking(tiempoMs);
                }
            }, 800);
            return;
        }

        // 3. Filtro Inteligente
        const faltaDatoRango = isSynced && !lastKnownRank;
        const mereceEnvio = (tiempoSegundos <= recordHistorico) || (!isSynced) || faltaDatoRango || (tiempoSegundos < 0.250);

        if (!mereceEnvio) {
            const rankText = lastKnownRank ? `#${lastKnownRank}` : "-";
            showUserRow(recordHistorico, rankText);
            return;
        }

        // 4. Envío al Servidor
        try {
            const res = await fetch('/api/game/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombre: userId,
                    tiempo: tiempoSegundos,
                    recordLocal: recordHistorico
                })
            });
            const data = await res.json();

            if (res.status === 200) {
                localStorage.setItem('jaguar_server_synced', 'true');
                if (data.new_rank) {
                    localStorage.setItem('jaguar_last_rank', data.new_rank);
                }
                loadLeaderboard();
                const rankPosition = data.new_rank ? `#${data.new_rank}` : "-";
                showUserRow(recordHistorico, rankPosition);
            }
        } catch (error) { /* Silencio */ }
    }

    // --- MODAL ---

    function promptForName(isRename = false) {
        return new Promise((resolve) => {
            if (!modal) return resolve(null);

            const nameInput = document.getElementById('pilot-name-input');
            const modalTitle = modal.querySelector('h3');
            const emailInput = document.getElementById('pilot-gmail-input');
            if (emailInput) emailInput.style.display = 'none';

            modal.classList.add('active');
            if (modalTitle) modalTitle.innerText = isRename ? "NUEVO ALIAS" : "LICENCIA DE PILOTO";

            nameInput.value = "";
            nameInput.style.borderColor = "#444";
            nameInput.focus();

            const handleClose = () => {
                modal.classList.remove('active');
                cleanupModal();
                resolve(null);
            };

            const handleSave = (e) => {
                if (e) e.preventDefault();
                let rawValue = nameInput.value;
                let name = rawValue.replace(/[^a-zA-Z0-9 _-]/g, "").trim();

                if (name.length < 3) {
                    nameInput.style.borderColor = "#ff4444";
                    nameInput.classList.add('shake');
                    setTimeout(() => nameInput.classList.remove('shake'), 500);
                    return;
                }

                const suffix = Math.floor(1000 + Math.random() * 9000);
                const fullId = `${name}#${suffix}`;
                modal.classList.remove('active');
                cleanupModal();
                resolve(fullId);
            };

            const handleOutsideClick = (e) => {
                if (e.target === modal) handleClose();
            };

            function cleanupModal() {
                modal.removeEventListener('click', handleOutsideClick);
                const newNameInput = nameInput.cloneNode(true);
                nameInput.parentNode.replaceChild(newNameInput, nameInput);
            }

            // Gestión de Botones (Clonación para limpiar listeners)
            const currentSaveBtn = document.getElementById('save-name-btn');
            const currentCloseBtn = document.getElementById('close-modal-btn');
            const newSaveBtn = currentSaveBtn.cloneNode(true);
            currentSaveBtn.parentNode.replaceChild(newSaveBtn, currentSaveBtn);
            newSaveBtn.addEventListener('click', handleSave);

            if (currentCloseBtn) {
                const newCloseBtn = currentCloseBtn.cloneNode(true);
                currentCloseBtn.parentNode.replaceChild(newCloseBtn, currentCloseBtn);
                newCloseBtn.addEventListener('click', handleClose);
            }

            modal.addEventListener('click', handleOutsideClick);
            
            // Re-bind input keydown
            const reInput = document.getElementById('pilot-name-input');
            if (reInput) {
                reInput.onkeydown = (e) => {
                    if (e.key === 'Enter') handleSave(e);
                    if (e.key === 'Escape') handleClose();
                }
            }
        });
    }

    // --- EVENTOS UI ---

    // 1. Botón Refresh
    const refreshBtn = document.getElementById('refresh-rank-btn');
    if (refreshBtn) {
        refreshBtn.onclick = () => {
            refreshBtn.style.transform = "rotate(360deg)";
            refreshBtn.disabled = true;
            refreshBtn.style.opacity = "0.5";
            refreshBtn.style.cursor = "wait";

            loadLeaderboard();

            setTimeout(() => refreshBtn.style.transform = "rotate(0deg)", 500);
            setTimeout(() => {
                refreshBtn.disabled = false;
                refreshBtn.style.opacity = "1";
                refreshBtn.style.cursor = "pointer";
            }, 10000); 
        };
    }

    // 2. Botón Rename (Con corrección de Rango)
    const editBtn = document.getElementById('edit-name-btn');
    if (editBtn) {
        editBtn.onclick = async () => {
            const oldId = userId;
            const newId = await promptForName(true);

            if (!newId || newId === oldId) return;

            if (userPilotDisplay) {
                userPilotDisplay.style.opacity = "0.5";
                userPilotDisplay.textContent = "Sincronizando...";
            }

            try {
                const res = await fetch('/api/game/rename', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ oldName: oldId, newName: newId })
                });

                const data = await res.json();

                if (res.ok) {
                    userId = newId;
                    localStorage.setItem('jaguar_user', userId);
                    
                    if (userPilotDisplay) {
                        userPilotDisplay.style.opacity = "1";
                        userPilotDisplay.style.color = "#FFD700";
                        userPilotDisplay.textContent = userId.split('#')[0];
                        setTimeout(() => userPilotDisplay.style.color = "#fff", 1000);
                    }

                    if (data.new_rank) {
                        localStorage.setItem('jaguar_last_rank', data.new_rank);
                        let storedRecord = localStorage.getItem('jaguarReactionRecord');
                        let recordVal = storedRecord ? (parseFloat(storedRecord) / 1000) : 0;
                        showUserRow(recordVal, `#${data.new_rank}`);
                    } 

                    loadLeaderboard();
                } else {
                    throw new Error(data.message || 'Error');
                }
            } catch (e) {
                if (userPilotDisplay) {
                    userPilotDisplay.style.opacity = "1";
                    userPilotDisplay.textContent = oldId.split('#')[0];
                    alert("No se pudo cambiar el nombre.");
                }
            }
        };
    }

    // --- MECÁNICA DEL JUEGO ---

    function triggerFault() {
        gameState = 'fault'; resetAllTimeouts(); resetVisuals();
        resultDisplay.textContent = "¡SALIDA EN FALSO!";
        resultDisplay.style.setProperty('color', '#ff4444', 'important');
        btn.innerText = "REINTENTAR";
        if (rankDisplay) { rankDisplay.textContent = "DESCALIFICADO 🚫"; rankDisplay.style.opacity = "1"; rankDisplay.style.color = "#ff4444"; }
    }

    function startGameSequence() {
        gameState = 'waiting'; resetVisuals(); btn.innerText = "ESPERA..."; resultDisplay.textContent = "0.000 ms";
        let cumulativeDelay = 0;
        lights.forEach((light) => {
            cumulativeDelay += 800;
            const id = setTimeout(() => { if (gameState === 'waiting') light.classList.add('red'); }, cumulativeDelay);
            gameTimeouts.push(id);
        });
        const randomTime = Math.floor(Math.random() * 3000) + 1000;
        const totalWait = cumulativeDelay + randomTime;
        const greenId = setTimeout(() => { if (gameState === 'waiting') goGreen(); }, totalWait);
        gameTimeouts.push(greenId);
    }

    function goGreen() {
        gameState = 'green'; startTime = performance.now();
        lights.forEach(l => { l.classList.remove('red'); l.classList.add('green'); });
        btn.innerText = "¡AHORA!";
    }

    function finishGame() {
        gameState = 'result';
        const endTime = performance.now();
        const reactionTime = Math.floor(endTime - startTime);
        resultDisplay.textContent = `${reactionTime} ms`;

        let rankTitle, rankClass, color;
        if (reactionTime < 250) { rankTitle = "JAGUAR LEGEND 🐆"; rankClass = "rank-legend"; color = "#FFD700"; }
        else if (reactionTime < 350) { rankTitle = "PILOTO F1 🏎️"; rankClass = "rank-pro"; color = "#00ff00"; }
        else if (reactionTime < 500) { rankTitle = "CONDUCTOR PROMEDIO 🚗"; rankClass = "rank-avg"; color = "#fff"; }
        else { rankTitle = "ABUELITA AL VOLANTE 🐢"; rankClass = "rank-slow"; color = "#ff4444"; }

        rankDisplay.textContent = rankTitle; rankDisplay.className = `reaction-rank ${rankClass}`;
        rankDisplay.style.color = color; rankDisplay.style.opacity = "1"; rankDisplay.style.transform = "scale(1.2)";
        setTimeout(() => rankDisplay.style.transform = "scale(1)", 200);

        if (reactionTime > 50 && reactionTime < 5000) submitScoreToRanking(reactionTime);
        btn.innerText = "JUGAR OTRA VEZ";
    }

    function handleInteraction(e) {
        if (e.type === 'touchstart') e.preventDefault();
        if (gameState === 'idle' || gameState === 'result' || gameState === 'fault') startGameSequence();
        else if (gameState === 'waiting') triggerFault();
        else if (gameState === 'green') finishGame();
    }

    // --- INICIALIZACIÓN ---
    
    resetAllTimeouts();
    const storedRecord = localStorage.getItem('jaguarReactionRecord');
    let recordInit = storedRecord ? parseFloat(storedRecord) : Infinity;
    
    // Carga inicial (Intentamos mostrar la fila del usuario de inmediato si tenemos datos)
    let lastRankInit = localStorage.getItem('jaguar_last_rank');
    if (userId) showUserRow((recordInit/1000), lastRankInit ? `#${lastRankInit}` : "-");

    loadLeaderboard();
    
    function startPolling() {
        if (pollingInterval) clearInterval(pollingInterval);
        pollingInterval = setInterval(() => {
            if (gameState === 'idle') loadLeaderboard();
        }, 30000); 
    }
    startPolling();

    // Listeners del Botón Principal
    btn.onclick = null;
    if (window.PointerEvent) btn.onpointerdown = handleInteraction;
    else { btn.ontouchstart = handleInteraction; btn.onmousedown = handleInteraction; }

    // Listener de Visibilidad (Definido para poder removerlo luego)
    const handleVisibilityChange = () => {
        if (document.hidden && pollingInterval) clearInterval(pollingInterval);
        else if (!document.hidden) startPolling();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    console.log("Sistema de Semáforo Iniciado 🏎️");

    // === RETURN CLEANUP ===
    // Esto se ejecutará cuando Astro desmonte el componente
    return function cleanup() {
        resetAllTimeouts(); // Limpia timeouts del juego
        if (pollingInterval) clearInterval(pollingInterval);
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        
        // Limpieza de botón principal para evitar duplicados si el nodo persiste (raro en Astro pero seguro)
        if (btn) {
            btn.onpointerdown = null;
            btn.ontouchstart = null;
            btn.onmousedown = null;
        }
    };
}