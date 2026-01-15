document.addEventListener('astro:page-load', () => {
    const btn = document.getElementById('reaction-btn');
    const resultDisplay = document.getElementById('reaction-result');
    const lights = document.querySelectorAll('.light');
    
    if(!btn) return; // Evita errores si no carga el componente

    let gameState = 'idle'; // idle, waiting, ready, finished
    let startTime = 0;
    let timeoutIds = [];

    btn.addEventListener('click', () => {
        if (gameState === 'idle' || gameState === 'finished') {
            startGame();
        } else if (gameState === 'waiting') {
            earlyStart();
        } else if (gameState === 'ready') {
            finishGame();
        }
    });

    function startGame() {
        gameState = 'waiting';
        resultDisplay.innerText = "ESPERA...";
        resultDisplay.style.color = "#fff";
        btn.innerText = "¡ESPERA!";
        
        // Reset luces (Rojas apagadas)
        lights.forEach(l => {
            l.className = 'light red'; // Resetea clases, mantiene base
            l.style.backgroundColor = "#333"; // Apagado visual
            l.style.boxShadow = "none";
        });

        // Secuencia de encendido (Rojo uno por uno)
        let delay = 0;
        lights.forEach((l, i) => {
            const id = setTimeout(() => {
                l.style.backgroundColor = "#ff0000";
                l.style.boxShadow = "0 0 15px #ff0000";
            }, delay);
            timeoutIds.push(id);
            delay += 1000;
        });

        // Apagón aleatorio (Verde - GO!)
        const randomDelay = delay + 500 + Math.random() * 2500;
        const finalId = setTimeout(() => {
            goGreen();
        }, randomDelay);
        timeoutIds.push(finalId);
    }

    function goGreen() {
        gameState = 'ready';
        startTime = Date.now();
        lights.forEach(l => {
            l.style.backgroundColor = "#00ff00"; // Verde
            l.style.boxShadow = "0 0 20px #00ff00";
        });
        btn.innerText = "¡AHORA!";
    }

    function finishGame() {
        const reaction = Date.now() - startTime;
        gameState = 'finished';
        resultDisplay.innerText = reaction + " ms";
        resultDisplay.style.color = "var(--gold, #FFE878)"; // Usa variable o fallback
        btn.innerText = "REINTENTAR";
    }

    function earlyStart() {
        gameState = 'finished';
        timeoutIds.forEach(id => clearTimeout(id));
        resultDisplay.innerText = "SALIDA EN FALSO";
        resultDisplay.style.color = "red";
        btn.innerText = "REINTENTAR";
        lights.forEach(l => {
            l.style.backgroundColor = "#333";
            l.style.boxShadow = "none";
        });
    }
});