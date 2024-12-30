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

function createLightbox() {
    const lightbox = document.createElement('div');
    lightbox.className = 'lightbox';
    const closeButton = document.createElement('div');
    closeButton.className = 'lightbox-close';
    closeButton.innerHTML = '×';
    lightbox.appendChild(closeButton);
    document.body.appendChild(lightbox);
    
    return lightbox;
}

function displayMediaContent(mediaFiles) {
    const mediaContainer = document.createElement('div');
    mediaContainer.className = 'media-content';
    const lightbox = document.querySelector('.lightbox') || createLightbox();

    mediaFiles.forEach(file => {
        if (file.endsWith('.mp4')) {
            const video = document.createElement('video');
            video.src = file;
            video.controls = true;
            video.className = 'response-media';
            mediaContainer.appendChild(video);
        } else if (file.endsWith('.jpg') || file.endsWith('.png')) {
            const img = document.createElement('img');
            img.src = file;
            img.className = 'response-media';
            img.loading = 'lazy';
            img.onclick = () => {
                const fullImg = document.createElement('img');
                fullImg.src = file;
                lightbox.innerHTML = ''; // Clear previous content
                const closeBtn = document.createElement('div');
                closeBtn.className = 'lightbox-close';
                closeBtn.innerHTML = '×';
                lightbox.appendChild(closeBtn);
                lightbox.appendChild(fullImg);
                lightbox.classList.add('active');
                
                // Close lightbox when clicking outside image or on close button
                const closeLightbox = (e) => {
                    if (e.target === lightbox || e.target === closeBtn) {
                        lightbox.classList.remove('active');
                    }
                };
                lightbox.onclick = closeLightbox;
                closeBtn.onclick = closeLightbox;
            };
            mediaContainer.appendChild(img);
        }
    });

    return mediaContainer;
}

document.addEventListener('DOMContentLoaded', () => {
    createSwirlLines();
    
    const chatToggle = document.querySelector('.chat-toggle');
    const closeButton = document.querySelector('.close-button');
    const chatWindow = document.querySelector('.chat-window');
    
    chatToggle.addEventListener('click', toggleChat);
    
    // Update close button handler to simply hide the chat
    closeButton.addEventListener('click', (e) => {
        e.preventDefault();
        chatWindow.classList.add('hidden');
        chatToggle.classList.remove('hidden');
        const overlay = document.querySelector('.chat-overlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
    });

    const chatInput = document.querySelector('.chat-input');
    const sendButton = document.querySelector('.chat-send');
    const messagesContainer = document.querySelector('.chat-messages');

    // Generate a unique session ID
    const sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    let conversationHistory = [];

    function addMessage(content, isBot = false, mediaFiles = []) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isBot ? 'bot' : 'user'}`;
        
        const textDiv = document.createElement('div');
        textDiv.className = 'message-content';
        
        // Create label with proper styling
        const labelDiv = document.createElement('div');
        labelDiv.className = 'message-label';
        labelDiv.textContent = isBot ? 'Luke:' : 'You:';
        
        // Ensure label is first child
        textDiv.appendChild(labelDiv);
        
        if (isBot) {
            const messageText = document.createElement('div');
            messageText.className = 'message-text';
            textDiv.appendChild(messageText);
            
            messageDiv.appendChild(textDiv);
            messagesContainer.appendChild(messageDiv);
            
            // Animate text
            let currentText = '';
            const words = content.trim().split(' ');
            let wordIndex = 0;

            function typeWord() {
                if (wordIndex < words.length) {
                    currentText += (wordIndex > 0 ? ' ' : '') + words[wordIndex];
                    messageText.textContent = currentText;
                    wordIndex++;
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    setTimeout(typeWord, 50 + Math.random() * 50);
                }
            }

            setTimeout(typeWord, 500);
        } else {
            textDiv.innerHTML += `<div class="message-text">${content.trim()}</div>`;
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
                        // Create message container first
                        const messageDiv = document.createElement('div');
                        messageDiv.className = 'message bot';
                        
                        // Create and append message content
                        const textDiv = document.createElement('div');
                        textDiv.className = 'message-content';
                        
                        const labelDiv = document.createElement('div');
                        labelDiv.className = 'message-label';
                        labelDiv.textContent = 'Luke:';
                        textDiv.appendChild(labelDiv);
                        
                        const messageText = document.createElement('div');
                        messageText.className = 'message-text';
                        textDiv.appendChild(messageText);
                        messageDiv.appendChild(textDiv);
                        
                        // Append message to chat before starting animation
                        messagesContainer.appendChild(messageDiv);

                        // Process media files first
                        const mediaPromises = [];
                        const mediaFiles = [];
                        
                        if (data.sources) {
                            data.sources.forEach(source => {
                                if (typeof source === 'string' && source.includes('pet-media/')) {
                                    const match = source.match(/pet-media\/([^)\s]+)/);
                                    if (match) {
                                        const baseFile = match[1].replace(/\.(jpg|png|mp4|txt)$/, '');
                                        const extensions = ['.jpg', '.png'];
                                        
                                        extensions.forEach(ext => {
                                            const mediaPath = `/static/images/pet-media/${baseFile}${ext}`;
                                            const promise = new Promise((resolve) => {
                                                const img = new Image();
                                                img.onload = () => {
                                                    mediaFiles.push(mediaPath);
                                                    resolve();
                                                };
                                                img.onerror = () => resolve();
                                                img.src = mediaPath;
                                            });
                                            mediaPromises.push(promise);
                                        });
                                    }
                                }
                            });
                        }

                        // Wait for all media files to be checked
                        await Promise.all(mediaPromises);

                        // Add media content if any files were found
                        if (mediaFiles.length > 0) {
                            const mediaCarousel = document.createElement('div');
                            mediaCarousel.className = 'media-carousel';
                            
                            mediaFiles.forEach(file => {
                                const mediaContainer = displayMediaContent([file]);
                                mediaContainer.style.display = 'block';
                                mediaCarousel.appendChild(mediaContainer);
                            });

                            messageDiv.appendChild(mediaCarousel);
                        }

                        // Animate text
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
