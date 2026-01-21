// src/scripts/chatWidget.js

export function initChatWidget() {
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send-btn');
    const chatWindow = document.getElementById('chat-window');
    const trigger = document.getElementById('chat-trigger');
    const closeBtn = document.getElementById('chat-close-btn');
    const suggestionsContainer = document.getElementById('suggestions-container');
    const chatMessages = document.getElementById('chat-messages');
    const typingIndicator = document.getElementById('typing-indicator');

    if (!trigger || !chatWindow || !chatMessages || !input || !sendBtn) return;

    // --- ESTADO GLOBAL DEL WIDGET ---
    // 🔒 SEMÁFORO DE SEGURIDAD
    let isProcessing = false; 

    // --- FUNCIONES CORE ---
    const scrollAlFondo = () => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    };

    const mostrarTyping = (show) => {
        if (typingIndicator) typingIndicator.style.display = show ? 'block' : 'none';
        if (show) scrollAlFondo();
    };

    const formatearTexto = (texto) => {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return texto.replace(urlRegex, (url) => {
            const cleanUrl = url.replace(/[.,;]$/, ''); 
            return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="chat-link">${cleanUrl}</a>`;
        });
    };

    // Función para bloquear/desbloquear TODO (Input, Botón y Sugerencias)
    const toggleInteractions = (disable) => {
        isProcessing = disable; // Actualizamos el semáforo
        
        input.disabled = disable;
        sendBtn.disabled = disable;
        
        if (disable) {
            sendBtn.classList.add('chat-input__send--disabled');
            suggestionsContainer.classList.add('disabled'); // CSS se encarga del pointer-events
        } else {
            sendBtn.classList.remove('chat-input__send--disabled');
            suggestionsContainer.classList.remove('disabled');
        }
    };

    const agregarMensaje = (texto, clase, guardar = false) => {
        const div = document.createElement('div');
        div.className = `chat-message ${clase}`;
        div.innerHTML = formatearTexto(texto);
        chatMessages.appendChild(div);
        scrollAlFondo();

        if (guardar) {
            let h = JSON.parse(sessionStorage.getItem('jaguar_chat_history') || '[]');
            h.push({ texto, remitente: clase.includes('user') ? 'user' : 'bot' });
            sessionStorage.setItem('jaguar_chat_history', JSON.stringify(h.slice(-20)));
        }
    };

    const enviarMensaje = async (textoManual = null, mantenerFoco = true) => {
        // 🛡️ SEGURIDAD: Si ya estamos procesando, ignoramos clics
        if (isProcessing) return;

        const texto = textoManual || input.value.trim();
        if (!texto) return;

        let userId = localStorage.getItem('jaguar_user_id');
        if (!userId) {
            userId = crypto.randomUUID?.() || Math.random().toString(36).substring(2);
            localStorage.setItem('jaguar_user_id', userId);
        }

        // 🔒 BLOQUEAMOS INTERFAZ
        toggleInteractions(true);

        if (!textoManual) input.value = ''; // Limpiar solo si vino del input
        
        agregarMensaje(texto, 'chat-message--user', true);
        mostrarTyping(true);

        const historial = JSON.parse(sessionStorage.getItem('jaguar_chat_history') || '[]');
        const messages = historial.slice(-6).map((m) => ({
            role: m.remitente === 'user' ? 'user' : 'assistant',
            content: m.texto
        }));

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
                body: JSON.stringify({ messages })
            });

            const data = await response.json();
            mostrarTyping(false);

            if (response.status === 429) {
                agregarMensaje(data.content || "Demasiadas peticiones. Calma.", 'chat-message--bot');
            } else if (response.ok) {
                agregarMensaje(data.content, 'chat-message--bot', true);
            } else {
                agregarMensaje("Tuve un problema técnico.", 'chat-message--bot');
            }
            
        } catch (error) {
            mostrarTyping(false);
            agregarMensaje("Error de conexión.", 'chat-message--bot');
        } finally {
            // 🔓 DESBLOQUEAMOS INTERFAZ
            toggleInteractions(false);
            if (mantenerFoco && !textoManual) input.focus();
        }
    };

    const toggleChat = () => {
        chatWindow.classList.toggle('chat-window--open');
        trigger.classList.toggle('chat-trigger--active');
        if (chatWindow.classList.contains('chat-window--open')) {
            mostrarSugerencias();
            scrollAlFondo();
            setTimeout(() => input?.focus(), 100);
        }
    };

    const mostrarSugerencias = () => {
        if (!suggestionsContainer) return;
        const preguntas = ["¿Cómo unirme?", "Patrocinios", "Ubicación"];
        suggestionsContainer.innerHTML = '';
        preguntas.forEach(p => {
            const chip = document.createElement('div');
            chip.className = 'suggestion-chip';
            chip.innerText = p;
            // Al hacer click, pasamos el texto directo a enviarMensaje
            chip.onclick = () => enviarMensaje(p, false); 
            suggestionsContainer.appendChild(chip);
        });
    };

    // --- CARGA INICIAL ---
    chatMessages.innerHTML = '';
    const historial = JSON.parse(sessionStorage.getItem('jaguar_chat_history') || '[]');
    historial.forEach((m) => {
        agregarMensaje(m.texto, m.remitente === 'user' ? 'chat-message--user' : 'chat-message--bot', false);
    });

    // Limpieza de eventos previos (importante en Astro ViewTransitions)
    trigger.onclick = toggleChat;
    closeBtn.onclick = toggleChat;
    // Removemos listener anterior para evitar duplicados si usas clonación, 
    // pero al ser módulo externo se gestiona mejor.
    const newSendBtn = sendBtn.cloneNode(true);
    sendBtn.parentNode.replaceChild(newSendBtn, sendBtn);
    newSendBtn.onclick = () => enviarMensaje();
    
    input.onkeypress = (e) => { 
        if (e.key === 'Enter') enviarMensaje(); 
    };
}