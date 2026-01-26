/**
 * src/scripts/heroSlider.js
 * Lógica del slider optimizada para no bloquear el hilo principal.
 */
export function initHeroSlider() {
    const wrapper = document.querySelector('.slideshow-wrapper');
    if (!wrapper) return;

    const slides = wrapper.querySelectorAll('.bg-slide');
    if (slides.length <= 1) return;

    let currentIndex = 0;
    // Intervalo de 3s 
    const intervalTime = 3000; 
    let interval;

    function startSlider() {
        interval = setInterval(() => {
            // Si el elemento ya no existe en el DOM (cambio de página rápido), paramos
            if (!document.contains(wrapper)) {
                clearInterval(interval);
                return;
            }

            // 1. Quitar clase al actual (CSS se encarga del fade-out)
            slides[currentIndex].classList.remove('active');

            // 2. Calcular siguiente
            currentIndex = (currentIndex + 1) % slides.length;

            // 3. Poner clase al siguiente (CSS se encarga del fade-in)
            slides[currentIndex].classList.add('active');

        }, intervalTime);
    }

    startSlider();

    // Retornamos cleanup
    return function cleanup() {
        if (interval) clearInterval(interval);
    };
}