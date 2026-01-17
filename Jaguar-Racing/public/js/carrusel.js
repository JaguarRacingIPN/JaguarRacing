document.addEventListener('astro:page-load', () => {
    const track = document.getElementById('carruselAreas');
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    
    if (!track) return;

    // --- CORRECCIÓN AGRESIVA PARA MÓVIL ---
    // Función que fuerza la vista a la tarjeta 1
    const resetToStart = () => {
        const firstCard = track.querySelector('.area-card');
        if (firstCard) {
            // Calculamos la posición exacta restando el padding del contenedor
            const paddingLeft = parseInt(window.getComputedStyle(track).paddingLeft) || 0;
            const target = firstCard.offsetLeft - paddingLeft;
            
            // Usamos 'instant' para que el usuario no vea el salto
            track.scrollTo({ left: target, behavior: 'instant' });
        } else {
            track.scrollLeft = 0;
        }
    };

    // Ejecutamos el reset inmediatamente
    resetToStart();

    // Y LO REPETIMOS un poco después por si el navegador tardó en pintar el layout
    // Esto arregla el "salto a la 3ra" que ocurre por lag de carga en móviles
    setTimeout(resetToStart, 50);
    setTimeout(resetToStart, 150);

    // --- LÓGICA DE BOTONES (Igual que antes) ---
    const getScrollAmount = () => {
        const card = track.querySelector('.area-card');
        if (!card) return 0;
        const gap = parseInt(window.getComputedStyle(track).gap) || 20;
        return card.offsetWidth + gap;
    };

    if (btnPrev) {
        btnPrev.addEventListener('click', () => {
            track.scrollBy({ left: -getScrollAmount(), behavior: 'smooth' });
        });
    }

    if (btnNext) {
        btnNext.addEventListener('click', () => {
            track.scrollBy({ left: getScrollAmount(), behavior: 'smooth' });
        });
    }

    // --- INDICADORES ---
    const indicators = document.getElementById('indicadores');
    if (indicators) {
        indicators.innerHTML = ''; 
        const cards = track.querySelectorAll('.area-card');
        
        cards.forEach((card, index) => {
            const dot = document.createElement('div');
            dot.classList.add('indicator-dot');
            if (index === 0) dot.classList.add('indicator-dot--active');
            
            dot.addEventListener('click', () => {
                const paddingLeft = parseInt(window.getComputedStyle(track).paddingLeft) || 0;
                const targetPos = card.offsetLeft - paddingLeft;
                track.scrollTo({ left: targetPos, behavior: 'smooth' });
            });
            
            indicators.appendChild(dot);
        });

        const onScroll = () => {
            const center = track.scrollLeft + (track.offsetWidth / 2);
            cards.forEach((card, index) => {
                const cardCenter = card.offsetLeft + (card.offsetWidth / 2);
                const dot = indicators.children[index];
                if (Math.abs(center - cardCenter) < (card.offsetWidth / 2)) {
                    dot?.classList.add('indicator-dot--active');
                } else {
                    dot?.classList.remove('indicator-dot--active');
                }
            });
        };
        track.addEventListener('scroll', onScroll, { passive: true });
    }
});