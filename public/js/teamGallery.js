document.addEventListener('astro:page-load', () => {
    const track = document.getElementById('galleryTrack');
    const btnPrev = document.getElementById('galleryPrev');
    const btnNext = document.getElementById('galleryNext');

    if (!track) return;

    // 1. FIX DE INICIO (Móvil)
    const resetPosition = () => {
        const firstCard = track.querySelector('.gallery-card');
        if(firstCard) {
            const paddingLeft = parseInt(window.getComputedStyle(track).paddingLeft) || 0;
            track.scrollTo({ left: firstCard.offsetLeft - paddingLeft, behavior: 'instant' });
        }
    };
    
    // Doble check para asegurar carga
    setTimeout(resetPosition, 50);
    setTimeout(resetPosition, 200);

    // 2. NAVEGACIÓN
    const scrollAmount = () => {
        const card = track.querySelector('.gallery-card');
        if(!card) return 300;
        const gap = 20; // Gap CSS
        return card.offsetWidth + gap;
    };

    if (btnPrev) {
        btnPrev.addEventListener('click', () => {
            track.scrollBy({ left: -scrollAmount(), behavior: 'smooth' });
        });
    }

    if (btnNext) {
        btnNext.addEventListener('click', () => {
            track.scrollBy({ left: scrollAmount(), behavior: 'smooth' });
        });
    }
});