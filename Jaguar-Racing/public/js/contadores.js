document.addEventListener('astro:page-load', () => {
    // --- 1. ANIMACIÓN NÚMEROS (Estadísticas 0 -> 30) ---
    const statsSection = document.getElementById('stats-section');
    const counters = document.querySelectorAll('.stat-number');
    let started = false;

    function startCounters() {
        counters.forEach(counter => {
            const target = +counter.getAttribute('data-target');
            const duration = 2000; 
            const increment = target / (duration / 16); 
            let current = 0;
            const updateCounter = () => {
                current += increment;
                if (current < target) {
                    counter.innerText = Math.ceil(current) + (target > 100 ? '+' : ''); 
                    requestAnimationFrame(updateCounter);
                } else {
                    counter.innerText = target + '+';
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

    // --- 2. CUENTAS REGRESIVAS (Timers con Segundos) ---
    // Fechas objetivo (Ajusta según las fechas reales de 2026)
    const dates = {
        mexico: new Date('2026-11-05T00:00:00').getTime(), // Ejemplo Noviembre
        usa: new Date('2026-05-15T00:00:00').getTime()     // Ejemplo Mayo
    };

    function updateTimers() {
        const now = new Date().getTime();
        
        ['mexico', 'usa'].forEach(key => {
            const el = document.getElementById(`timer-${key}`);
            if (!el) return;

            const distance = dates[key] - now;

            if (distance < 0) {
                el.innerText = "COMPLETED";
                return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            // Formato con ceros a la izquierda: 00d 00h 00m 00s
            const d = days < 10 ? `0${days}` : days;
            const h = hours < 10 ? `0${hours}` : hours;
            const m = minutes < 10 ? `0${minutes}` : minutes;
            const s = seconds < 10 ? `0${seconds}` : seconds;

            el.innerText = `${d}d ${h}h ${m}m ${s}s`;
        });
    }

    // Actualizar cada segundo
    setInterval(updateTimers, 1000);
    updateTimers(); // Ejecutar inmediatamente
});