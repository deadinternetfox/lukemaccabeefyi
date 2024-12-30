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

// Add lightbox function
function openLightbox(imageSrc) {
    const lightbox = document.querySelector('.lightbox') || createLightbox();
    lightbox.innerHTML = '';
    
    const img = document.createElement('img');
    img.src = imageSrc;
    
    const closeBtn = document.createElement('div');
    closeBtn.className = 'lightbox-close';
    closeBtn.innerHTML = '×';
    
    lightbox.appendChild(closeBtn);
    lightbox.appendChild(img);
    lightbox.classList.add('active');
    
    const closeLightbox = () => lightbox.classList.remove('active');
    closeBtn.onclick = (e) => {
        e.stopPropagation();
        closeLightbox();
    };
    lightbox.onclick = closeLightbox;
}

// Example helper function to create a message element with carousel and sources
function createMessageElement(message, images, sources) {
    console.log('Debug: Creating message with:', { message, images, sources });
    
    const msgEl = document.createElement('div');
    msgEl.className = 'message bot';

    // Always create content element first with text
    const contentEl = document.createElement('div');
    contentEl.className = 'message-content';
    
    // Add label
    const labelDiv = document.createElement('div');
    labelDiv.className = 'message-label';
    labelDiv.textContent = 'Luke:';
    contentEl.appendChild(labelDiv);
    
    // Add text with typing animation
    const textEl = document.createElement('div');
    textEl.className = 'message-text';
    contentEl.appendChild(textEl);
    msgEl.appendChild(contentEl);

    // Start typing animation
    let words = message.trim().split(' ');
    let currentText = '';
    let wordIndex = 0;

    function typeWord() {
        if (wordIndex < words.length) {
            currentText += (wordIndex > 0 ? ' ' : '') + words[wordIndex];
            textEl.textContent = currentText;
            wordIndex++;
            requestAnimationFrame(() => setTimeout(typeWord, 50 + Math.random() * 50));
        }
    }
    
    setTimeout(typeWord, 100);

    // Media content handling - now separate from text content
    if (sources && sources.length > 0) {
        console.log('Debug: Processing sources:', sources);
        
        const allMediaFiles = new Set();

        // Extract all media files from all sources
        sources.forEach(source => {
            let baseFilename;
            if (typeof source === 'string') {
                const match = source.match(/pet-media\/([^.]+)\.txt/);
                if (match) {
                    baseFilename = match[1];
                }
            } else if (source.metadata && source.metadata.mediaFiles) {
                source.metadata.mediaFiles.forEach(file => allMediaFiles.add(file));
            }

            if (baseFilename && window.petMediaIndex) {
                const matchingFiles = window.petMediaIndex
                    .filter(file => file.baseName === baseFilename)
                    .map(file => file.fullPath);
                matchingFiles.forEach(file => allMediaFiles.add(file));
            }
        });

        const mediaFilesArray = Array.from(allMediaFiles);
        console.log('Debug: Found all media files:', mediaFilesArray);

        if (mediaFilesArray.length > 0) {
            const mediaEl = document.createElement('div');
            mediaEl.className = 'media-content';
            const carousel = document.createElement('div');
            carousel.className = 'media-carousel';
            let currentIndex = 0;

            const updateMedia = () => {
                carousel.innerHTML = '';
                const file = mediaFilesArray[currentIndex];
                const extension = file.split('.').pop().toLowerCase();
                
                if (['mp4', 'webm', 'ogg'].includes(extension)) {
                    const video = document.createElement('video');
                    video.src = file;
                    video.controls = true;
                    video.className = 'response-media';
                    carousel.appendChild(video);
                } else if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) {
                    const img = document.createElement('img');
                    img.src = file;
                    img.className = 'response-media';
                    img.loading = 'lazy';
                    img.onclick = () => openLightbox(file);
                    carousel.appendChild(img);
                }

                if (mediaFilesArray.length > 1) {
                    const prevBtn = document.createElement('button');
                    prevBtn.className = 'media-nav prev';
                    prevBtn.innerHTML = '❮';
                    prevBtn.onclick = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        currentIndex = (currentIndex - 1 + mediaFilesArray.length) % mediaFilesArray.length;
                        updateMedia();
                    };

                    const nextBtn = document.createElement('button');
                    nextBtn.className = 'media-nav next';
                    nextBtn.innerHTML = '❯';
                    nextBtn.onclick = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        currentIndex = (currentIndex + 1) % mediaFilesArray.length;
                        updateMedia();
                    };

                    const counter = document.createElement('div');
                    counter.className = 'media-counter';
                    counter.textContent = `${currentIndex + 1}/${mediaFilesArray.length}`;

                    carousel.appendChild(prevBtn);
                    carousel.appendChild(nextBtn);
                    carousel.appendChild(counter);
                }
            };

            updateMedia();
            mediaEl.appendChild(carousel);
            
            // Append media after text content
            msgEl.appendChild(mediaEl);
        }
    }

    // Add sources last
    if (sources && sources.length > 0) {
        const sourcesEl = document.createElement('div');
        sourcesEl.className = 'message-sources';
        sourcesEl.textContent = sources.map(source => {
            if (typeof source === 'string') {
                return source;
            }
            return `${source.source || source.id} (${Math.round((source.score || 0) * 100)}% match)`;
        }).join(', ');
        msgEl.appendChild(sourcesEl);
    }

    return msgEl;
}

document.addEventListener('DOMContentLoaded', async () => {
    // Load media index first
    try {
        const response = await fetch('/static/images/pet-media/mediaIndex.json');
        window.petMediaIndex = await response.json();
        console.log('Loaded media index:', window.petMediaIndex);
    } catch (error) {
        console.error('Failed to load media index:', error);
        window.petMediaIndex = [];
    }

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
                    console.log('Debug: Response data:', data);
                    
                    // Pass the matches directly to createMessageElement
                    const messageDiv = createMessageElement(
                        data.text,
                        null,
                        data.matches || data.sources // data.matches contains the full metadata
                    );
                    
                    messagesContainer.appendChild(messageDiv);
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                } else {
                    throw new Error('Failed to get response');
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
