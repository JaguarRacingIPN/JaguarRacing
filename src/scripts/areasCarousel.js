/**
 * Carrusel de áreas - Optimizado para Astro View Transitions
 * @returns {Function} cleanup - Función de limpieza
 */
export function initAreasCarousel() {
    const track = document.getElementById('carruselAreas');
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    const indicators = document.getElementById('indicadores');
    
    if (!track) {
        return () => {};
    }

    // ============================================
    // UTILIDADES
    // ============================================
    const getScrollAmount = () => {
        const card = track.querySelector('.area-card');
        if (!card) return 0;
        const gap = parseInt(window.getComputedStyle(track).gap) || 20;
        return card.offsetWidth + gap;
    };

    const getPaddingLeft = () => {
        return parseInt(window.getComputedStyle(track).paddingLeft) || 0;
    };

    // ============================================
    // RESET A PRIMERA TARJETA (sin setTimeout hacky)
    // ============================================
    const resetToStart = () => {
        const firstCard = track.querySelector('.area-card');
        if (!firstCard) {
            track.scrollLeft = 0;
            return;
        }
        
        const paddingLeft = getPaddingLeft();
        const targetPos = firstCard.offsetLeft - paddingLeft;
        track.scrollTo({ left: targetPos, behavior: 'instant' });
    };

    // Esperar a que el DOM esté completamente renderizado
    const initPosition = () => {
        // requestAnimationFrame asegura que el layout está listo
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                resetToStart();
            });
        });
    };

    initPosition();

    // ============================================
    // NAVEGACIÓN CON BOTONES
    // ============================================
    const handlePrev = () => {
        track.scrollBy({ left: -getScrollAmount(), behavior: 'smooth' });
    };

    const handleNext = () => {
        track.scrollBy({ left: getScrollAmount(), behavior: 'smooth' });
    };

    if (btnPrev) btnPrev.addEventListener('click', handlePrev);
    if (btnNext) btnNext.addEventListener('click', handleNext);

    // ============================================
    // INDICADORES
    // ============================================
    let scrollTimeout;
    
    const setupIndicators = () => {
        if (!indicators) return;
        
        indicators.innerHTML = '';
        const cards = track.querySelectorAll('.area-card');
        
        if (cards.length === 0) return;
        
        // Crear dots
        cards.forEach((card, index) => {
            const dot = document.createElement('div');
            dot.classList.add('indicator-dot');
            dot.setAttribute('role', 'button');
            dot.setAttribute('aria-label', `Ir a área ${index + 1}`);
            
            if (index === 0) dot.classList.add('indicator-dot--active');
            
            dot.addEventListener('click', () => {
                const paddingLeft = getPaddingLeft();
                const targetPos = card.offsetLeft - paddingLeft;
                track.scrollTo({ left: targetPos, behavior: 'smooth' });
            });
            
            indicators.appendChild(dot);
        });

        // Actualizar indicador activo al hacer scroll (con debounce)
        const updateActiveIndicator = () => {
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

        const onScroll = () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(updateActiveIndicator, 50);
        };

        track.addEventListener('scroll', onScroll, { passive: true });
        
        // Retornar función para limpiar listener
        return () => {
            track.removeEventListener('scroll', onScroll);
            clearTimeout(scrollTimeout);
        };
    };

    const cleanupIndicators = setupIndicators();

    // ============================================
    // TECLADO NAVEGACIÓN (Accesibilidad)
    // ============================================
    const handleKeydown = (e) => {
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            handlePrev();
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            handleNext();
        }
    };

    track.addEventListener('keydown', handleKeydown);

    // ============================================
    // CLEANUP FUNCTION
    // ============================================
    return function cleanup() {
        if (btnPrev) btnPrev.removeEventListener('click', handlePrev);
        if (btnNext) btnNext.removeEventListener('click', handleNext);
        track.removeEventListener('keydown', handleKeydown);
        
        if (cleanupIndicators) cleanupIndicators();
        clearTimeout(scrollTimeout);
    };
}