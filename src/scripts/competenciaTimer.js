/**
 * @file competitionTimer.js
 * @description Manages countdown timers for Jaguar Racing competitions.
 * @version 2.0.1
 */

/**
 * Initializes countdown timers for active competition targets.
 * @returns {Function} Cleanup function to clear the interval.
 */
export function initTimer() {
  const targets = {
    'timer-mexico': new Date(2026, 10, 20, 8, 0, 0).getTime(), // Nov 20
    'timer-allterrain': new Date(2026, 8, 11, 8, 0, 0).getTime() // Sep 11
  };

  // Cache DOM elements to avoid repetitive lookups in the interval
  const activeTimers = Object.entries(targets)
    .map(([id, targetTime]) => ({
      element: document.getElementById(id),
      targetTime
    }))
    .filter(timer => timer.element);

  if (activeTimers.length === 0) return () => {};

  const fmt = (num) => num.toString().padStart(2, '0');

  const update = () => {
    const now = Date.now();

    activeTimers.forEach(({ element, targetTime }) => {
      const distance = targetTime - now;

      if (distance < 0) {
        element.innerText = "COMPETITION ACTIVE";
        element.style.color = "var(--jaguar-gold, #A67C00)";
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      element.innerText = `${days}d ${fmt(hours)}h ${fmt(minutes)}m ${fmt(seconds)}s`;
    });
  };

  update();
  const intervalId = setInterval(update, 1000);

  return () => clearInterval(intervalId);
}