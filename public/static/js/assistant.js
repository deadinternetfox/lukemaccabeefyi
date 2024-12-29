function createSwirlLines() {
    const chatToggle = document.querySelector('.chat-toggle');
    const numLines = 3;
    for (let i = 0; i < numLines; i++) {
        const line = document.createElement('div');
        line.className = 'swirl-line';
        chatToggle.appendChild(line);
    }
}

function createOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'chat-overlay';
    document.body.appendChild(overlay);
    return overlay;
}

function toggleChat() {
    const chatWindow = document.querySelector('.chat-window');
    const chatToggle = document.querySelector('.chat-toggle');
    const overlay = document.querySelector('.chat-overlay') || createOverlay();
    
    chatWindow.classList.toggle('hidden');
    chatToggle.classList.toggle('active');
    overlay.classList.toggle('active');
    
    if (!chatWindow.classList.contains('hidden')) {
        document.querySelector('.chat-input').focus();
    }
}

function displayMediaContent(mediaFiles) {
    const mediaContainer = document.createElement('div');
    mediaContainer.className = 'media-content';

    mediaFiles.forEach(file => {
        if (file.endsWith('.mp4')) {
            const video = document.createElement('video');
            video.src = file;
            video.controls = true;
            video.className = 'response-media';
            mediaContainer.appendChild(video);
        } else {
            const img = document.createElement('img');
            img.src = file;
            img.className = 'response-media';
            mediaContainer.appendChild(img);
        }
    });

    return mediaContainer;
}

document.addEventListener('DOMContentLoaded', () => {
    createSwirlLines();
    const chatInput = document.querySelector('.chat-input');
    const sendButton = document.querySelector('.chat-send');
    const messagesContainer = document.querySelector('.chat-messages');

    function addMessage(content, isBot = false, mediaFiles = []) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isBot ? 'bot' : 'user'}`;
        
        // Add text content
        const textDiv = document.createElement('div');
        textDiv.className = 'message-content';
        textDiv.textContent = content;
        messageDiv.appendChild(textDiv);

        // Add media content if available
        if (mediaFiles && mediaFiles.length > 0) {
            const mediaContainer = displayMediaContent(mediaFiles);
            messageDiv.appendChild(mediaContainer);
        }

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function handleInput() {
        const message = chatInput.value.trim();
        if (message) {
            addMessage(message);
            chatInput.value = '';
            
            // Simulate bot response
            setTimeout(() => {
                let response = "I'll help you with that request. Please contact us directly for detailed information about our services.";
                addMessage(response, true);
            }, 1000);
        }
    }

    sendButton.addEventListener('click', handleInput);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleInput();
        }
    });
});
