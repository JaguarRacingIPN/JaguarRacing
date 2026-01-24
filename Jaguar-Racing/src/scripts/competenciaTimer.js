/**
 * src/scripts/competenciaTimer.js
 * Maneja la cuenta regresiva de las competencias.
 */

export function initTimer() {
    // Definición de Fechas Objetivo
    // Nota: El mes en JS es base 0 (0 = Enero, 10 = Noviembre)
    const targets = {
        'timer-mexico': new Date(2026, 10, 5, 8, 0, 0).getTime(),   // 5 Nov 2026
        'timer-queretaro': new Date(2026, 1, 20, 8, 0, 0).getTime() // 20 Feb 2026
    };

    // Filtramos solo los timers que existen en el HTML actual
    const activeTimers = Object.keys(targets).filter(id => document.getElementById(id));
    
    // Si no hay timers en esta página, no gastamos CPU
    if (activeTimers.length === 0) return;

    function updateTimers() {
        const now = new Date().getTime();

        activeTimers.forEach(id => {
            const element = document.getElementById(id);
            if (!element) return;

            const distance = targets[id] - now;

            if (distance < 0) {
                element.innerText = "¡EN COMPETENCIA!";
                element.style.color = "#00ff00"; // Feedback visual extra
                return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            const format = (num) => num.toString().padStart(2, '0');
            element.innerText = `${format(days)}d ${format(hours)}h ${format(minutes)}m ${format(seconds)}s`;
        });
    }

    // Iniciamos el intervalo
    updateTimers(); // Ejecución inmediata para no esperar 1 seg
    const timerInterval = setInterval(updateTimers, 1000);

    console.log("Sistema de Cronometraje Iniciado ⏱️");

    // Retornamos función de limpieza para Astro
    return function cleanup() {
        clearInterval(timerInterval);
    };
}