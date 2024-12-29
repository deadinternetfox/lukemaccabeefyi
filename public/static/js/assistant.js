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
    chatToggle.classList.toggle('hidden'); // Hide/show toggle button
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
    
    // Add click handlers for chat toggle and close button
    const chatToggle = document.querySelector('.chat-toggle');
    const closeButton = document.querySelector('.close-button');
    
    chatToggle.addEventListener('click', toggleChat);
    closeButton.addEventListener('click', toggleChat);
    
    const chatInput = document.querySelector('.chat-input');
    const sendButton = document.querySelector('.chat-send');
    const messagesContainer = document.querySelector('.chat-messages');

    // Generate a unique session ID
    const sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    let conversationHistory = [];

    function addMessage(content, isBot = false, mediaFiles = []) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isBot ? 'bot' : 'user'}`;
        
        // Add text content
        const textDiv = document.createElement('div');
        textDiv.className = 'message-content';
        
        // Add label
        const labelDiv = document.createElement('div');
        labelDiv.className = 'message-label';
        labelDiv.textContent = isBot ? 'Luke:' : 'You:';
        textDiv.appendChild(labelDiv);
        
        if (isBot) {
            // Create typing indicator
            const typingDiv = document.createElement('div');
            typingDiv.className = 'typing-indicator';
            typingDiv.textContent = '...';
            textDiv.appendChild(typingDiv);
            
            // Add to messages immediately to show typing
            messageDiv.appendChild(textDiv);
            messagesContainer.appendChild(messageDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;

            // Animate text
            let currentText = '';
            const words = content.trim().split(' '); // Trim content before splitting
            let wordIndex = 0;

            function typeWord() {
                if (wordIndex < words.length) {
                    currentText += (wordIndex > 0 ? ' ' : '') + words[wordIndex];
                    textDiv.textContent = currentText;
                    // Re-add the label after content update
                    const label = document.createElement('div');
                    label.className = 'message-label';
                    label.textContent = 'Luke:';
                    textDiv.insertBefore(label, textDiv.firstChild);
                    wordIndex++;
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    setTimeout(typeWord, 50 + Math.random() * 50);
                }
            }

            setTimeout(typeWord, 500); // Start typing after showing indicator
        } else {
            textDiv.textContent = content.trim(); // Trim user content
            // Re-add the label for user messages
            const label = document.createElement('div');
            label.className = 'message-label';
            label.textContent = 'You:';
            textDiv.insertBefore(label, textDiv.firstChild);
            messageDiv.appendChild(textDiv);
            messagesContainer.appendChild(messageDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }

        // Add media content if available
        if (mediaFiles && mediaFiles.length > 0) {
            const mediaContainer = displayMediaContent(mediaFiles);
            messageDiv.appendChild(mediaContainer);
        }
    }

    function addLoadingMessage() {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot loading';
        
        const textDiv = document.createElement('div');
        textDiv.className = 'message-content';
        
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'typing-dots';
        loadingDiv.innerHTML = '<span>.</span><span>.</span><span>.</span>';
        
        textDiv.appendChild(loadingDiv);
        messageDiv.appendChild(textDiv);
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        return messageDiv;
    }

    async function handleInput() {
        const message = chatInput.value.trim();
        if (message) {
            // Add user message to history
            conversationHistory.push({ role: 'user', content: message });
            addMessage(message);
            chatInput.value = '';
            
            const loadingMessage = addLoadingMessage();
            
            try {
                const isPetSittingPage = window.location.pathname.includes('house-sitting');
                const context = isPetSittingPage 
                    ? 'You are Luke\'s AI assistant. Focus on providing accurate information about pet and house sitting services from the provided context. Cite your sources.'
                    : 'You are Luke\'s AI assistant, offering multiple professional services. Cite your sources.';

                const response = await fetch('/api/openai', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        input: message,
                        context: context,
                        conversation_history: conversationHistory,
                        sessionId: sessionId,
                        isPetSitting: isPetSittingPage
                    })
                });

                loadingMessage.remove();

                if (response.ok) {
                    const data = await response.json();
                    if (data.status === 'complete') {
                        // Add bot response to history
                        conversationHistory.push({ role: 'assistant', content: data.text });
                        
                        // Create message container
                        const messageDiv = document.createElement('div');
                        messageDiv.className = 'message bot';
                        
                        // Add main message content
                        const textDiv = document.createElement('div');
                        textDiv.className = 'message-content';
                        
                        // Add label
                        const labelDiv = document.createElement('div');
                        labelDiv.className = 'message-label';
                        labelDiv.textContent = 'Luke:';
                        textDiv.appendChild(labelDiv);
                        
                        // Add message text with typing animation
                        const messageText = document.createElement('div');
                        messageText.className = 'message-text';
                        textDiv.appendChild(messageText);
                        messageDiv.appendChild(textDiv);
                        messagesContainer.appendChild(messageDiv);

                        // Animate text typing
                        let currentText = '';
                        const words = data.text.split(' ');
                        let wordIndex = 0;

                        function typeWord() {
                            if (wordIndex < words.length) {
                                currentText += (wordIndex > 0 ? ' ' : '') + words[wordIndex];
                                messageText.textContent = currentText;
                                wordIndex++;
                                messagesContainer.scrollTop = messagesContainer.scrollHeight;
                                setTimeout(typeWord, 30 + Math.random() * 30);
                            } else {
                                // Add sources after typing is complete
                                if (data.sources && data.sources.length > 0) {
                                    const sourcesDiv = document.createElement('div');
                                    sourcesDiv.className = 'message-sources';
                                    sourcesDiv.textContent = data.sources.join(', ');
                                    messageDiv.appendChild(sourcesDiv);
                                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                                }
                            }
                        }

                        typeWord(); // Start typing animation
                    } else {
                        throw new Error('Failed to get response');
                    }
                } else {
                    throw new Error('Network response was not ok');
                }
            } catch (error) {
                console.error('Error:', error);
                loadingMessage.remove();
                addMessage("I apologize, but I'm having trouble connecting right now. Please try again later.", true);
            }
        }
    }

    // Add function to clear chat history
    function clearChatHistory() {
        conversationHistory = [];
        messagesContainer.innerHTML = '';
        // Re-add the welcome message
        addMessage("Hi! I'm Luke's assistant. I can help you learn more about our services. What would you like to know?", true);
    }

    // Add clear chat handler to close button
    closeButton.addEventListener('click', () => {
        toggleChat();
        clearChatHistory();
    });

    sendButton.addEventListener('click', handleInput);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleInput();
        }
    });

    // Add prompt button handlers
    const promptButtons = document.querySelectorAll('.prompt-button');
    promptButtons.forEach(button => {
        button.addEventListener('click', () => {
            chatInput.value = button.textContent;
            handleInput();
        });
    });
});
