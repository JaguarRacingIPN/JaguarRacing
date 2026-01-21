// Función para enviar el puntaje al terminar el juego
async function enviarScore(nombreUsuario, tiempoObtenido) {
  
  // Referencia a un elemento HTML para mostrar mensajes (ej: <p id="status-msg"></p>)
  const statusElement = document.getElementById("status-msg");
  statusElement.innerText = "Subiendo récord...";

  try {
    const response = await fetch("/api/game/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nombre: nombreUsuario, // Ej: "Adolfo#4921"
        tiempo: tiempoObtenido, // Ej: 0.254
      }),
    });

    const data = await response.json();

    if (response.status === 200) {
      // ÉXITO
      statusElement.innerText = "✅ ¡Récord guardado en el Ranking!";
      statusElement.style.color = "green";
      // Aquí podrías llamar a una función para refrescar la tabla de líderes
      // actualizarTablaRanking(); 
    } else if (response.status === 429) {
      // COOLDOWN (El usuario fue muy rápido)
      statusElement.innerText = "⏳ Récord guardado localmente. Espera 1 min para subir otro.";
      statusElement.style.color = "orange";
    } else {
      // OTRO ERROR
      statusElement.innerText = "❌ Error al guardar.";
      statusElement.style.color = "red";
    }

  } catch (error) {
    console.error("Error de conexión:", error);
    statusElement.innerText = "⚠️ Error de conexión";
  }
}