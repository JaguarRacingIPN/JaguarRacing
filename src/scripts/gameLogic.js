/**
 * src/scripts/gameLogic.js
 * SEASON 1 - PRODUCTION RELEASE (Patch: Modal Close + Button UX)
 * Description: Core logic for the reaction time game including F1 light sequence,
 * precise timing, anti-cheat validation, and backend synchronization.
 */

export function initGame() {
    // --- CONFIGURATION CONSTANTS ---
    const STORAGE_KEY_RECORD = 'jaguar_record_s1'; 
    const STORAGE_KEY_USER = 'jaguar_user_id';     
    const STORAGE_KEY_SYNC = 'jaguar_s1_synced';

    // --- LOCAL STATE MANAGEMENT ---
    let gameTimeouts = [];
    let pollingInterval = null;
    let gameState = 'idle'; // States: idle, waiting, green, result, fault, cooldown
    let startTime = 0;
    let currentGameId = 0; 

    // --- DOM ELEMENTS REFERENCE ---
    const gameContainer = document.querySelector('.game-container');
    const btn = document.getElementById('reaction-btn');
    const editBtn = document.getElementById('edit-name-btn');
    const refreshBtn = document.getElementById('refresh-rank-btn');

    // Validation: Ensure critical elements exist
    if (!btn) return; 

    const lights = document.querySelectorAll('.light');
    const resultDisplay = document.getElementById('reaction-result');
    const rankDisplay = document.getElementById('player-rank');
    const leaderboardContainer = document.getElementById('top-ranks');
    const userRankRow = document.getElementById('user-rank-row');
    const userTimeDisplay = document.getElementById('user-time');
    const userPosDisplay = document.getElementById('user-pos');
    const userPilotDisplay = userRankRow ? userRankRow.querySelector('.pilot') : null;
    const modal = document.getElementById('name-modal');

    // --- USER INITIALIZATION & SANITIZATION ---
    let userId = localStorage.getItem(STORAGE_KEY_USER);
    
    // Validate retrieved ID structure (UUIDs or invalid strings are purged)
    const isValidId = userId && userId.length >= 3 && userId.length <= 25 && /^[a-zA-Z0-9 _#-]+$/.test(userId);

    if (userId && !isValidId) {
        console.warn("[GameLogic] Corrupt User ID detected and purged.");
        localStorage.removeItem(STORAGE_KEY_USER);
        userId = null; 
    }

    if (userId && userPilotDisplay) {
        userPilotDisplay.textContent = userId.split('#')[0];
    }

    // --- UTILITY FUNCTIONS ---
    
    function resetAllTimeouts() {
        gameTimeouts.forEach(id => clearTimeout(id));
        gameTimeouts = [];
    }

    function resetVisuals() {
        lights.forEach(l => {
            l.classList.remove('red', 'green'); 
            l.style.backgroundColor = ''; 
        });
        
        // Reset button state
        btn.classList.remove('penalty', 'locked');
        btn.innerText = "INICIAR TEST";
        btn.style.opacity = "1";
        
        resultDisplay.style.color = '#FFE878';
        if (rankDisplay) { 
            rankDisplay.style.opacity = "0"; 
            rankDisplay.className = "reaction-rank"; 
        }
    }

    function showUserRow(score, positionText) {
        if (!userRankRow) return;
        userRankRow.classList.remove('hidden');
        userTimeDisplay.textContent = score.toFixed(3) + " s";
        userPosDisplay.innerText = positionText;
        const isFirst = String(positionText) === "#1";
        userPosDisplay.style.color = isFirst ? "#FFD700" : "#fff";
    }

    // --- CORE GAME LOGIC ---

    function triggerFault() {
        if (gameState === 'fault' || gameState === 'result') return;
        gameState = 'fault';
        resetAllTimeouts();
        
        // Visual feedback: Flash red lights
        lights.forEach(l => l.classList.add('red'));
        setTimeout(() => lights.forEach(l => l.classList.remove('red')), 200);

        resultDisplay.textContent = "JUMP START!";
        resultDisplay.style.color = '#ff4444';
        
        btn.innerText = "REINTENTAR";
        btn.classList.add('penalty');
        
        if (rankDisplay) { 
            rankDisplay.textContent = "PENALIZACION"; 
            rankDisplay.style.opacity = "1"; 
            rankDisplay.style.color = "#ff4444"; 
        }

        // Lock button briefly
        enterCooldown();
    }

    function startGameSequence() {
        currentGameId++; 
        if (gameState === 'waiting') return;
        
        gameState = 'waiting';
        resetVisuals();
        btn.innerText = "ESPERA...";
        resultDisplay.textContent = "0.000 ms";

        let cumulativeDelay = 0;
        
        // Sequence: Light 1 to 5 (Red)
        lights.forEach((light) => {
            cumulativeDelay += 1000;
            const id = setTimeout(() => { 
                if (gameState === 'waiting') light.classList.add('red'); 
            }, cumulativeDelay);
            gameTimeouts.push(id);
        });

        // Random hold time between 0.5s and 3.5s
        const randomHold = Math.floor(Math.random() * 3000) + 500; 
        const totalWait = cumulativeDelay + randomHold;

        const goGreenId = setTimeout(() => { 
            if (gameState === 'waiting') goGreen(); 
        }, totalWait);
        gameTimeouts.push(goGreenId);
    }

    function goGreen() {
        gameState = 'green'; 
        startTime = performance.now();
        
        // Visuals: Switch Red to Green
        lights.forEach(l => {
            l.classList.remove('red');
            l.classList.add('green');
        });
        
        btn.innerText = "¡YA!";
    }

    function finishGame() {
        if (gameState !== 'green') return;
        gameState = 'result';
        
        const endTime = performance.now();
        const reactionTime = Math.floor(endTime - startTime);
        
        resultDisplay.textContent = `${reactionTime} ms`;

        // Classification Logic
        let rankTitle, rankClass, color;
        if (reactionTime < 200) { rankTitle = "NIVEL F1"; rankClass = "rank-legend"; color = "#d108c7"; }
        else if (reactionTime < 300) { rankTitle = "GRAN PILOTO"; rankClass = "rank-pro"; color = "#FFD700"; }
        else if (reactionTime < 400) { rankTitle = "BUENOS REFLEJOS"; rankClass = "rank-avg"; color = "#00ff00"; }
        else { rankTitle = "MUY LENTO"; rankClass = "rank-slow"; color = "#fff"; }

        if (rankDisplay) {
            rankDisplay.textContent = rankTitle; 
            rankDisplay.className = `reaction-rank ${rankClass}`;
            rankDisplay.style.color = color; 
            rankDisplay.style.opacity = "1";
        }

        // Backend Submission (Anti-cheat filter: 100ms - 5000ms)
        if (reactionTime > 100 && reactionTime < 5000) {
            submitScoreToRanking(reactionTime, currentGameId);
        }

        btn.innerText = "JUGAR DE NUEVO";
        
        // Lock button briefly
        enterCooldown();
    }

    /**
     * Applies a temporary visual lock to the button.
     * Prevents spam clicking and gives feedback.
     */
    function enterCooldown() {
        const previousState = gameState;
        gameState = 'cooldown';
        
        // Visual feedback for locking (handled via CSS)
        btn.classList.add('locked');

        setTimeout(() => {
            if (gameState === 'cooldown') {
                gameState = previousState; 
                btn.classList.remove('locked');
            }
        }, 800); // 800ms cooldown
    }

    function handleGlobalInteraction(e) {
        if (modal && modal.classList.contains('active')) return;
        if (gameState === 'cooldown') return;

        switch (gameState) {
            case 'idle':
            case 'result':
            case 'fault':
                // Only start if clicking the button (or its children)
                if (e.target === btn || btn.contains(e.target)) {
                    startGameSequence();
                }
                break; 
            case 'waiting':
                // Clicking ANYWHERE while waiting is a fault
                triggerFault();
                break;
            case 'green':
                // Clicking ANYWHERE while green stops the timer
                finishGame();
                break;
        }
    }

    // --- API & DATA HANDLING ---

    async function loadLeaderboard() {
        if (!leaderboardContainer) return;
        try {
            const res = await fetch('/api/game/ranking?t=' + Date.now());
            if (!res.ok) return;
            const top10 = await res.json();

            leaderboardContainer.innerHTML = '';
            if (!top10 || top10.length === 0) {
                leaderboardContainer.innerHTML = '<div class="rank-row" style="text-align:center;">Temporada 1 Iniciada</div>';
                return;
            }

            top10.forEach((player, index) => {
                const rankPos = index + 1;
                
                if (userId && player.member === userId) {
                    let localRecord = localStorage.getItem(STORAGE_KEY_RECORD);
                    let displayTime = localRecord ? (parseFloat(localRecord)/1000) : player.score;
                    showUserRow(displayTime, `#${rankPos}`);
                }

                const row = document.createElement('div');
                row.className = 'rank-row';
                if (userId && player.member === userId) row.style.border = "1px solid #FFD700"; 

                row.innerHTML = `
                    <span class="pos">${rankPos}</span>
                    <span class="pilot-col">${player.member.split('#')[0]}</span>
                    <span class="time">${player.score.toFixed(3)} s</span>
                `;
                leaderboardContainer.appendChild(row);
            });

        } catch (e) {
            console.error("[GameLogic] Leaderboard fetch failed", e);
        }
    }

    async function submitScoreToRanking(tiempoMs, executionId) {
        const tiempoSegundos = tiempoMs / 1000;
        
        let currentBest = localStorage.getItem(STORAGE_KEY_RECORD);
        let recordHistorico = currentBest ? (parseFloat(currentBest) / 1000) : Infinity;
        
        if (tiempoSegundos < recordHistorico) {
            recordHistorico = tiempoSegundos;
            localStorage.setItem(STORAGE_KEY_RECORD, recordHistorico * 1000);
        }

        if (!userId) {
            setTimeout(async () => {
                if (executionId !== currentGameId) return; 
                const newId = await promptForName(); 
                if (newId) {
                    userId = newId;
                    localStorage.setItem(STORAGE_KEY_USER, userId);
                    if (userPilotDisplay) userPilotDisplay.textContent = newId.split('#')[0];
                    submitScoreToRanking(tiempoMs, executionId);
                }
            }, 1000);
            return;
        }

        try {
            const res = await fetch('/api/game/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    nombre: userId, 
                    tiempo: tiempoSegundos 
                })
            });
            
            const data = await res.json();
            if (res.ok) {
                localStorage.setItem(STORAGE_KEY_SYNC, 'true');
                loadLeaderboard();
                const rankText = data.new_rank ? `#${data.new_rank}` : "-";
                showUserRow(recordHistorico, rankText);
            }
        } catch (error) {
            console.error("[GameLogic] Score submission failed", error);
        }
    }

    // --- MODAL HANDLING ---
    function promptForName(isRename = false) {
        return new Promise((resolve) => {
            if (!modal) return resolve(null);
            
            const nameInput = document.getElementById('pilot-name-input');
            const saveBtn = document.getElementById('save-name-btn');
            const closeBtn = document.getElementById('close-modal-btn'); // FIXED: Select Close Button
            const modalTitle = modal.querySelector('h3'); 
            
            modal.classList.add('active');
            if(modalTitle) modalTitle.textContent = isRename ? "CAMBIAR ALIAS" : "LICENCIA DE PILOTO";
            
            nameInput.value = "";
            nameInput.focus();

            const onSave = () => {
                let raw = nameInput.value;
                let name = raw.replace(/[^a-zA-Z0-9 _-]/g, "").trim();
                if (name.length < 3) {
                    nameInput.style.borderColor = "red";
                    return;
                }
                const suffix = Math.floor(1000 + Math.random() * 9000);
                const fullId = `${name}#${suffix}`;
                
                modal.classList.remove('active');
                cleanListeners();
                resolve(fullId);
            };

            const onCancel = (e) => {
                 // Close on background click OR close button click
                 if (e.target === modal || e.target === closeBtn) {
                     modal.classList.remove('active');
                     cleanListeners();
                     resolve(null);
                 }
            };

            const onKey = (e) => { if (e.key === 'Enter') onSave(); };

            function cleanListeners() {
                saveBtn.onclick = null;
                modal.onclick = null;
                if (closeBtn) closeBtn.onclick = null; // Clean up
                nameInput.onkeydown = null;
            }

            saveBtn.onclick = onSave;
            modal.onclick = onCancel;
            if (closeBtn) closeBtn.onclick = onCancel; // FIXED: Bind click event
            nameInput.onkeydown = onKey;
        });
    }

    // --- UI EVENT LISTENERS ---
    
    // Refresh Button Logic
    if (refreshBtn) {
        refreshBtn.onclick = () => {
            refreshBtn.style.transform = "rotate(360deg)";
            refreshBtn.style.transition = "transform 0.5s";
            loadLeaderboard();
            setTimeout(() => {
                refreshBtn.style.transform = "rotate(0deg)";
                refreshBtn.style.transition = "none";
            }, 500);
        };
    }

    // Rename Button Logic
    if (editBtn) {
        editBtn.onclick = async () => {
            const oldId = userId;
            const newId = await promptForName(true); 

            if (!newId || newId === oldId) return;

            if (userPilotDisplay) userPilotDisplay.textContent = "Guardando...";

            try {
                const res = await fetch('/api/game/rename', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ oldName: oldId, newName: newId })
                });

                if (res.ok) {
                    userId = newId;
                    localStorage.setItem(STORAGE_KEY_USER, userId);
                    if (userPilotDisplay) userPilotDisplay.textContent = newId.split('#')[0];
                    loadLeaderboard(); 
                } else {
                    throw new Error("Rename failed");
                }
            } catch (e) {
                if (userPilotDisplay) userPilotDisplay.textContent = oldId.split('#')[0];
            }
        };
    }

    // --- INITIALIZATION ---
    resetAllTimeouts();
    loadLeaderboard();
    
    function startPolling() {
        if (pollingInterval) clearInterval(pollingInterval);
        pollingInterval = setInterval(() => {
            if (gameState === 'idle') loadLeaderboard();
        }, 30000); 
    }
    startPolling();

    // Global Interaction Listeners
    const eventType = window.PointerEvent ? 'pointerdown' : 'touchstart';
    if (gameContainer) {
        gameContainer.removeEventListener(eventType, handleGlobalInteraction);
        gameContainer.addEventListener(eventType, handleGlobalInteraction);
    }
    
    // Fallback for button click
    btn.onclick = (e) => { if(gameState === 'idle') startGameSequence(); };

    // Visibility Handler
    const handleVis = () => {
        if (document.hidden) clearInterval(pollingInterval);
        else startPolling();
    };
    document.addEventListener("visibilitychange", handleVis);

    console.log("[GameLogic] System initialized successfully.");

    return function cleanup() {
        resetAllTimeouts();
        if (pollingInterval) clearInterval(pollingInterval);
        document.removeEventListener("visibilitychange", handleVis);
        if (gameContainer) gameContainer.removeEventListener(eventType, handleGlobalInteraction);
        
        if (editBtn) editBtn.onclick = null;
        if (refreshBtn) refreshBtn.onclick = null;
    };
}