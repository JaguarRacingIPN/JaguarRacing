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

    // 1. Validación de existencia
    if (!trigger || !chatWindow || !chatMessages || !input || !sendBtn) return;

    // 2. IDEMPOTENCIA
    if (trigger.dataset.initialized === "true") return;

    // --- ESTADO GLOBAL ---
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

    const toggleInteractions = (disable) => {
        isProcessing = disable; 
        input.disabled = disable;
        sendBtn.disabled = disable;
        
        if (disable) {
            sendBtn.classList.add('chat-input__send--disabled');
            suggestionsContainer?.classList.add('disabled');
        } else {
            sendBtn.classList.remove('chat-input__send--disabled');
            suggestionsContainer?.classList.remove('disabled');
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
        if (isProcessing) return;

        const texto = textoManual || input.value.trim();
        if (!texto) return;

        let userId = localStorage.getItem('jaguar_user_id');
        if (!userId) {
            userId = crypto.randomUUID?.() || Math.random().toString(36).substring(2);
            localStorage.setItem('jaguar_user_id', userId);
        }

        toggleInteractions(true);
        if (!textoManual) input.value = ''; 
        
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
                agregarMensaje(data.content || "Demasiadas peticiones.", 'chat-message--bot');
            } else if (response.ok) {
                agregarMensaje(data.content, 'chat-message--bot', true);
            } else {
                agregarMensaje("Tuve un problema técnico.", 'chat-message--bot');
            }
            
        } catch (error) {
            mostrarTyping(false);
            agregarMensaje("Error de conexión.", 'chat-message--bot');
        } finally {
            toggleInteractions(false);
            if (mantenerFoco && !textoManual) input.focus();
        }
    };

    // --- AQUÍ ESTÁ EL CAMBIO CLAVE PARA EL NUEVO CSS ---
    const toggleChat = () => {
        // Verificamos si tiene la clase de ABIERTO (tu CSS v3.4 usa chat-window--open)
        const isOpen = chatWindow.classList.contains('chat-window--open');
        
        if (isOpen) {
            // CERRAR: Quitamos las clases activas
            chatWindow.classList.remove('chat-window--open');
            trigger.classList.remove('chat-trigger--active');
        } else {
            // ABRIR: Agregamos las clases activas para activar la transición
            chatWindow.classList.add('chat-window--open');
            trigger.classList.add('chat-trigger--active');
            
            mostrarSugerencias();
            scrollAlFondo();
            
            // Foco al input con delay para esperar la animación CSS
            setTimeout(() => input?.focus(), 300);

            // Ocultar notificación (el número 1 rojo) al abrir
            const badge = trigger.querySelector('.chat-notification-badge');
            if (badge) badge.style.display = 'none';
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
            chip.onclick = () => enviarMensaje(p, false); 
            suggestionsContainer.appendChild(chip);
        });
    };

    // --- CARGA INICIAL ---
    if (chatMessages.children.length === 0) {
        const historial = JSON.parse(sessionStorage.getItem('jaguar_chat_history') || '[]');
        if (historial.length > 0) {
            historial.forEach((m) => {
                const div = document.createElement('div');
                div.className = `chat-message ${m.remitente === 'user' ? 'chat-message--user' : 'chat-message--bot'}`;
                div.innerHTML = formatearTexto(m.texto);
                chatMessages.appendChild(div);
            });
        } else {
            const welcomeDiv = document.createElement('div');
            welcomeDiv.className = 'chat-message chat-message--bot';
            welcomeDiv.innerText = 'Hola, soy el asistente virtual de Jaguar Racing. ¿En qué puedo ayudarte hoy?';
            chatMessages.appendChild(welcomeDiv);
        }
    }

    // --- EVENT LISTENERS ---
    trigger.addEventListener('click', toggleChat);
    closeBtn?.addEventListener('click', toggleChat);
    
    // Fix: Clonación para limpiar listeners viejos si se recarga el componente
    const newSendBtn = sendBtn.cloneNode(true);
    sendBtn.parentNode.replaceChild(newSendBtn, sendBtn);
    newSendBtn.addEventListener('click', () => enviarMensaje());
    
    // Referencia al nuevo botón para el scope local
    const currentSendBtn = newSendBtn; 

    input.addEventListener('keypress', (e) => { 
        if (e.key === 'Enter') enviarMensaje(); 
    });

    // 3. MARCADO FINAL
    trigger.dataset.initialized = "true";
}