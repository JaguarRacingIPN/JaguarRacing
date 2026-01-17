/* public/js/contadores.js */

document.addEventListener('astro:page-load', () => {
    
    // ==========================================
    // 1. ANIMACIÓN DE ESTADÍSTICAS (0 -> 30)
    // ==========================================
    const statsSection = document.querySelector('.stats-bar'); // Seleccionamos por clase
    const counters = document.querySelectorAll('.stat-number');
    let started = false;

    function startCounters() {
        counters.forEach(counter => {
            const target = +counter.getAttribute('data-target');
            const duration = 2000; // 2 segundos de animación
            const increment = target / (duration / 16); 
            let current = 0;

            const updateCounter = () => {
                current += increment;
                if (current < target) {
                    // Muestra el número redondeado hacia arriba
                    counter.innerText = Math.ceil(current);
                    requestAnimationFrame(updateCounter);
                } else {
                    // Finaliza en el número exacto
                    counter.innerText = target;
                }
            };
            updateCounter();
        });
    }

    if (statsSection) {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !started) {
                startCounters();
                started = true;
            }
        }, { threshold: 0.5 });
        observer.observe(statsSection);
    }


    // ==========================================
    // 2. CUENTAS REGRESIVAS (CRONOGRAMA)
    // ==========================================
    
    // Configuración de fechas (AÑO, MES [0=Enero, 11=Dic], DÍA, HORA)
    const targets = {
        'timer-mexico': new Date(2026, 10, 5, 8, 0, 0).getTime(),   // 5 Nov 2026 (San Luis)
        'timer-queretaro': new Date(2026, 1, 20, 8, 0, 0).getTime() // 20 Feb 2026 (Querétaro)
    };

    function updateTimers() {
        const now = new Date().getTime();

        // Recorremos los IDs definidos arriba
        for (const [id, targetDate] of Object.entries(targets)) {
            const element = document.getElementById(id);
            if (!element) continue; // Si no existe el elemento en esta página, salta

            const distance = targetDate - now;

            if (distance < 0) {
                element.innerText = "00d 00h 00m 00s"; // O "¡INICIADO!"
                continue;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            // Formato con ceros: 05d 09h...
            const d = days < 10 ? `0${days}` : days;
            const h = hours < 10 ? `0${hours}` : hours;
            const m = minutes < 10 ? `0${minutes}` : minutes;
            const s = seconds < 10 ? `0${seconds}` : seconds;

            element.innerText = `${d}d ${h}h ${m}m ${s}s`;
        }
    }

    // Iniciar intervalo
    const timerInterval = setInterval(updateTimers, 1000);
    updateTimers(); // Ejecutar una vez al inicio para que no tarde 1 seg en aparecer

    // Limpieza al salir de la página (opcional en Astro, pero buena práctica)
    document.addEventListener('astro:before-swap', () => {
        clearInterval(timerInterval);
    }, { once: true });
});