document.addEventListener('DOMContentLoaded', () => {
    const chatInput = document.querySelector('.chat-input');
    const chatButton = document.querySelector('.chat-button');
    const promptButtons = document.querySelectorAll('.prompt-button');

    chatButton.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // Add event listeners to prompt buttons
    promptButtons.forEach(button => {
        button.addEventListener('click', () => {
            chatInput.value = button.textContent;
            chatInput.focus();
        });
    });

    // Modal functionality
    const modal = document.getElementById('welcome-modal');
    const modalCloseButton = document.getElementById('modal-close-button');

    if (!localStorage.getItem('modalDisplayed')) {
        modal.style.display = 'flex';
    }

    modalCloseButton.addEventListener('click', () => {
        modal.style.display = 'none';
        localStorage.setItem('modalDisplayed', 'true');
    });

    let conversationHistory = [];

    const avatarContainer = document.querySelector('.avatar-container');
    let isResponding = false;

    // Add audio context
    let audioCtx = null;
    
    function initAudio() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    function playWordSound() {
        if (!audioCtx) return;
        
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440 + Math.random() * 220, audioCtx.currentTime);
        
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.2);
    }

    function createSwirlLines() {
        const numLines = 3;
        for (let i = 0; i < numLines; i++) {
            const line = document.createElement('div');
            line.className = 'swirl-line';
            avatarContainer.appendChild(line);
        }
    }

    function startGlowEffect() {
        isResponding = true;
        avatarContainer.classList.add('active');
        // Reset animation for each swirl line
        document.querySelectorAll('.swirl-line').forEach((line, i) => {
            line.style.animation = 'none';
            line.offsetHeight; // Trigger reflow
            line.style.animation = `swirlRotate 8s linear infinite ${-i * 2.5}s`;
        });
    }

    function stopGlowEffect() {
        isResponding = false;
        avatarContainer.classList.remove('active');
        // Stop animations
        document.querySelectorAll('.swirl-line').forEach(line => {
            line.style.animation = 'none';
        });
    }

    function createFloatingWord(word) {
        initAudio();
        const span = document.createElement('span');
        span.textContent = word;
        span.className = 'floating-word';
        
        // Improved random positioning
        const angle = Math.random() * Math.PI * 2;
        const minRadius = 100;
        const maxRadius = 150;
        const radius = minRadius + Math.random() * (maxRadius - minRadius);
        
        const startX = Math.cos(angle) * radius;
        const startY = Math.sin(angle) * radius;
        
        span.style.setProperty('--x-offset', Math.cos(angle + Math.PI / 2));
        span.style.setProperty('--y-offset', Math.sin(angle + Math.PI / 2));
        
        span.style.left = `calc(50% + ${startX}px)`;
        span.style.top = `calc(50% + ${startY}px)`;
        
        avatarContainer.appendChild(span);
        playWordSound();
        
        setTimeout(() => span.remove(), 2500);
    }

    let currentEngine = 'novelai';
    const engineButtons = document.querySelectorAll('.engine-button');

    engineButtons.forEach(button => {
        button.addEventListener('click', () => {
            engineButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            currentEngine = button.dataset.engine;
        });
    });

    // Update sendMessage function
    async function sendMessage() {
        const message = chatInput.value.trim();
        if (message !== '') {
            addMessage('user', message);
            conversationHistory.push({ role: 'user', content: message });
            chatInput.value = '';

            startGlowEffect();

            try {
                const response = await fetch(`/api/${currentEngine}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ 
                        input: message,
                        conversation_history: conversationHistory
                    })
                });

                const data = await response.json();
                
                if (data.status === 'complete') {
                    addMessage('bot', data.text, currentEngine, data.sources);
                    conversationHistory.push({ role: 'bot', content: data.text });
                } else {
                    throw new Error(data.message || 'Unknown error');
                }
            } catch (error) {
                console.error('Error details:', error);
                addMessage('bot', `Error: ${error.message}`);
            } finally {
                stopGlowEffect();
            }
        }
    }

    function formatText(text) {
        if (!text) return '';
        return text
            // Remove special markers
            .replace(/\[Character:[^\]]+\]/g, '')
            .replace(/YouareLukeMaccabeerespondingto:/g, '')
            // Add spaces after punctuation if missing
            .replace(/([.,!?])([A-Za-z])/g, '$1 $2')
            // Fix multiple spaces
            .replace(/\s+/g, ' ')
            // Add space after comma if missing
            .replace(/,([^\s])/g, ', $1')
            // Add space after period if missing
            .replace(/\.([^\s])/g, '. $1')
            .trim();
    }

    function formatMessageContent(text) {
        // Convert bullet points
        text = text.replace(/^(\d+\.|[-*•]) /gm, '<li>').replace(/\n(?=\d+\.|[-*•] )/g, '</li>\n');
        if (text.includes('<li>')) {
            text = '<ul>' + text + '</li></ul>';
        }

        // Convert code blocks
        text = text.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => 
            `<pre><code class="language-${lang}">${code.trim()}</code></pre>`
        );

        // Convert inline code
        text = text.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Convert paragraphs
        text = text.split('\n\n').map(p => `<p>${p}</p>`).join('');

        return text;
    }

    // Update addMessage function
    function addMessage(sender, text, engine = currentEngine, sources = null) {
        const chatMessages = document.querySelector('.chat-messages');
        const messageWrapper = document.createElement('div');
        messageWrapper.classList.add('message', sender);

        if (sender === 'bot') {
            const messageHeader = document.createElement('div');
            messageHeader.className = 'message-header';
            messageHeader.innerHTML = `<span>via ${engine === 'novelai' ? 'NovelAI' : 'GPT-4'}</span>`;
            messageWrapper.appendChild(messageHeader);
        }

        const messageContent = document.createElement('div');
        messageContent.classList.add('message-content');

        if (sender === 'bot') {
            const formattedText = formatText(text);
            
            // Create text container for animated content
            const textContainer = document.createElement('div');
            textContainer.className = 'animated-text';
            messageContent.appendChild(textContainer);

            let words = formattedText.match(/\S+|\s+|[.,!?]+/g) || [];
            let currentIndex = 0;
            let lastWasSpace = false;

            function animateNextWord() {
                if (currentIndex < words.length) {
                    const word = words[currentIndex];
                    const span = document.createElement('span');
                    
                    if (/^\s+$/.test(word)) {
                        span.textContent = word;
                        lastWasSpace = true;
                    } else {
                        // Only add space if not at start and previous wasn't space
                        if (currentIndex > 0 && !lastWasSpace) {
                            textContainer.appendChild(document.createTextNode(' '));
                        }
                        
                        span.textContent = word;
                        span.classList.add('char-animation');
                        lastWasSpace = false;

                        if (!/^[.,!?]+$/.test(word)) {
                            createFloatingWord(word);
                        }
                    }
                    
                    textContainer.appendChild(span);
                    currentIndex++;
                    setTimeout(animateNextWord, 150);
                }
            }

            animateNextWord();

            // Remove or comment out the old sources block
            /*
            if (sources && sources.length > 0) {
                const sourcesDiv = document.createElement('div');
                // ...existing code...
                messageWrapper.appendChild(sourcesDiv);
            }
            */
            
            // Add model selection and regenerate button
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'message-actions';
            actionsDiv.innerHTML = `
                <select class="model-select">
                    <option value="novelai" ${engine === 'novelai' ? 'selected' : ''}>NovelAI</option>
                    <option value="openai" ${engine === 'openai' ? 'selected' : ''}>GPT-4</option>
                </select>
                <button class="regenerate-button" title="Regenerate with selected model">
                    <svg width="16" height="16" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                    </svg>
                </button>
            `;
            messageWrapper.appendChild(actionsDiv);

            // Insert inline sources
            if (sources && sources.length > 0) {
                const sourcesInline = document.createElement('div');
                sourcesInline.className = 'sources-inline';
                sourcesInline.innerHTML = `
                    <span>Sources:</span>
                    ${sources.map(source => {
                        const previewLength = 100;
                        // Clean up content by removing extra spaces
                        const cleanContent = source.content.replace(/\s+/g, ' ').trim();
                        const previewText = cleanContent.substring(0, previewLength);
                        const remainingText = cleanContent.substring(previewLength);
                        return `
                            <div class="source-item">
                                <span class="source-file">
                                    ${source.filename} (${Math.round(source.score * 100)}%)
                                </span>
                                <div class="source-preview collapsed">
                                    <div class="preview-content">${previewText}</div>
                                    ${remainingText ? `
                                        <div class="remaining-content hidden">${remainingText}</div>
                                        <button class="expand-button">Show more</button>
                                    ` : ''}
                                </div>
                            </div>
                        `;
                    }).join('')}
                `;
                actionsDiv.appendChild(sourcesInline);

                // Add expand/collapse functionality
                sourcesInline.querySelectorAll('.expand-button').forEach(button => {
                    button.addEventListener('click', () => {
                        const preview = button.closest('.source-preview');
                        const remaining = preview.querySelector('.remaining-content');
                        if (preview.classList.contains('collapsed')) {
                            preview.classList.remove('collapsed');
                            remaining.classList.remove('hidden');
                            button.textContent = 'Show less';
                        } else {
                            preview.classList.add('collapsed');
                            remaining.classList.add('hidden');
                            button.textContent = 'Show more';
                        }
                    });
                });
            }
        } else {
            messageContent.textContent = text;
        }

        messageWrapper.appendChild(messageContent);
        chatMessages.appendChild(messageWrapper);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    async function regenerateResponse(originalPrompt, newEngine) {
        startGlowEffect();
        try {
            const response = await fetch(`/api/${newEngine}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    input: originalPrompt,
                    conversation_history: conversationHistory
                })
            });

            const data = await response.json();
            
            if (data.status === 'complete') {
                addMessage('bot', data.text, newEngine);
            } else {
                throw new Error(data.message || 'Unknown error');
            }
        } catch (error) {
            console.error('Error details:', error);
            addMessage('bot', `Error: ${error.message}`);
        } finally {
            stopGlowEffect();
        }
    }

    // Add swirl lines on start
    createSwirlLines();
});