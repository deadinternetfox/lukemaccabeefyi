document.addEventListener('DOMContentLoaded', () => {
    const background = document.createElement('div');
    background.className = 'pet-background';
    document.body.appendChild(background);

    const elements = ['🐾', '🐱', '🐶', '🏠', '❤️', '🦮', '🐈', '🐕', '🐩', '🏡'];
    const numElements = 30; // Reduced for better performance
    let activeElements = 0;
    const maxElements = 15; // Maximum concurrent elements

    function createFloatingElement() {
        if (activeElements >= maxElements) return;
        
        activeElements++;
        const element = document.createElement('div');
        element.className = 'floating-element';
        element.textContent = elements[Math.floor(Math.random() * elements.length)];
        
        // Random position
        element.style.left = `${Math.random() * 100}%`;
        element.style.top = `${Math.random() * 100}%`;
        
        // Random size
        const size = 20 + Math.random() * 20;
        element.style.fontSize = `${size}px`;

        // Custom animation duration and delay
        const duration = 3 + Math.random() * 2;
        element.style.animation = `floatAndFade ${duration}s ease-in-out`;
        
        background.appendChild(element);

        // Remove element after animation
        setTimeout(() => {
            element.remove();
            activeElements--;
            // Create new element after random delay
            setTimeout(createFloatingElement, Math.random() * 2000);
        }, duration * 1000);
    }

    // Create initial elements with random delays
    for (let i = 0; i < numElements; i++) {
        setTimeout(createFloatingElement, Math.random() * 4000);
    }

    // Continuously check and add new elements
    setInterval(() => {
        if (activeElements < maxElements) {
            createFloatingElement();
        }
    }, 1000);
});
