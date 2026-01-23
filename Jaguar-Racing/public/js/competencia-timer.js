/* public/js/competencia-timer.js */
document.addEventListener('astro:page-load', () => {
    const targets = {
        'timer-mexico': new Date(2026, 10, 5, 8, 0, 0).getTime(),   // 5 Nov 2026
        'timer-queretaro': new Date(2026, 1, 20, 8, 0, 0).getTime() // 20 Feb 2026
    };

    // Verificar si al menos uno de los timers existe en la página actual
    const activeTimers = Object.keys(targets).filter(id => document.getElementById(id));
    if (activeTimers.length === 0) return;

    function updateTimers() {
        const now = new Date().getTime();

        activeTimers.forEach(id => {
            const element = document.getElementById(id);
            if (!element) return;

            const distance = targets[id] - now;

            if (distance < 0) {
                element.innerText = "¡EN COMPETENCIA!";
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

    const timerInterval = setInterval(updateTimers, 1000);
    updateTimers();

    // Limpieza específica para Astro View Transitions
    document.addEventListener('astro:before-swap', () => {
        clearInterval(timerInterval);
    }, { once: true });
});