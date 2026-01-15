document.addEventListener('astro:page-load', () => {
    // 1. Encontrar el contenedor
    const wrapper = document.querySelector('.slideshow-wrapper');
    if (!wrapper) return;

    // 2. Encontrar las imágenes
    const slides = wrapper.querySelectorAll('.bg-slide');
    if (slides.length <= 1) return;

    let currentIndex = 0;
    const intervalTime = 4000; // 4 segundos

    // 3. Función de cambio
    const interval = setInterval(() => {
        // Seguridad: si cambiamos de página, parar
        if (!document.contains(wrapper)) {
            clearInterval(interval);
            return;
        }

        // Quitar active actual
        slides[currentIndex].classList.remove('active');

        // Calcular siguiente
        currentIndex = (currentIndex + 1) % slides.length;

        // Poner active siguiente
        slides[currentIndex].classList.add('active');

    }, intervalTime);

    // 4. Limpieza al salir de la página
    document.addEventListener('astro:before-swap', () => {
        clearInterval(interval);
    }, { once: true });
});