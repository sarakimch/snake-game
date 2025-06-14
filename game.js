// Game constants
const GRID_SIZE = 20;
let CELL_SIZE; // Will be calculated based on canvas size
const INITIAL_SNAKE_LENGTH = 4;
const INITIAL_GAME_SPEED = 200; // Slower initial speed (higher number = slower)
const SPEED_INCREASE_PER_LEVEL = 20; // How much faster per level (ms)
const FRUITS_PER_LEVEL = 10; // Fruits needed to advance level

// Debug logging
function debug(msg) {
    console.log(`[DEBUG] ${msg}`);
    // Also display on screen for mobile debugging
    const debugDiv = document.getElementById('debug-log');
    if (debugDiv) {
        debugDiv.textContent = msg;
        setTimeout(() => debugDiv.textContent = '', 3000); // Clear after 3 seconds
    }
}

// Error logging
function logError(error) {
    console.error('[ERROR]', error);
    const debugDiv = document.getElementById('debug-log');
    if (debugDiv) {
        debugDiv.textContent = `Error: ${error.message}`;
        debugDiv.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
        setTimeout(() => {
            debugDiv.textContent = '';
            debugDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        }, 5000);
    }
}

// Colors
const COLORS = {
    darkGrass: '#2d5a3c',
    lightGrass: '#3a734d',
    snake: '#8fde5d',
    snakeHead: '#b6ff82'
};

// Flower emojis for food
const FLOWERS = ['🌸', '🌹', '🌺', '🌻', '🌼', '💐', '🌷'];

// Game variables
let canvas, ctx, gameLoop;
let score = 0;
let level = 1;
let fruitsInLevel = 0;
let currentSpeed = INITIAL_GAME_SPEED;
let snake = [];
let direction = 'right';
let nextDirection = 'right';
let food = null;
let gameOver = false;
let currentFlower = FLOWERS[0];
let isInitialized = false;

// Touch controls
let touchStartX = null;
let touchStartY = null;
const MIN_SWIPE = 30; // Minimum swipe distance to trigger direction change

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    debug('DOM loaded, waiting for window load...');
    
    // Wait for window load to ensure all resources are loaded
    window.addEventListener('load', function() {
        debug('Window loaded, initializing game...');
        try {
            // Initialize game elements
            canvas = document.getElementById('gameCanvas');
            if (!canvas) {
                throw new Error('Canvas element not found after DOM load');
            }
            ctx = canvas.getContext('2d');
            if (!ctx) {
                throw new Error('Could not get canvas context after DOM load');
            }

            // Set up event listeners
            setupEventListeners();
            
            // Initialize the game
            init();
            
            // Hide loading screen
            const loading = document.getElementById('loading');
            if (loading) {
                loading.style.display = 'none';
            }
            
            debug('Game initialization complete');
        } catch (error) {
            logError(error);
            debug('Error during game initialization: ' + error.message);
            
            // Show error in loading screen
            const loading = document.getElementById('loading');
            if (loading) {
                loading.textContent = 'Error loading game: ' + error.message;
                loading.style.color = '#ff6b6b';
            }
        }
    });
});

// Set up event listeners
function setupEventListeners() {
    debug('Setting up event listeners...');
    
    try {
        // Direction button controls
        const directionButtons = {
            'up-btn': 'up',
            'down-btn': 'down',
            'left-btn': 'left',
            'right-btn': 'right'
        };

        Object.entries(directionButtons).forEach(([btnId, dir]) => {
            const btn = document.getElementById(btnId);
            if (!btn) {
                debug(`Button not found: ${btnId}`);
                return;
            }
            
            const handleDirectionInput = (e) => {
                e.preventDefault();
                e.stopPropagation();
                debug(`Direction button pressed: ${dir}`);
                
                if (gameOver) {
                    debug('Game over, restarting');
                    init();
                    return;
                }
                
                const canChangeDirection = 
                    (dir === 'up' && direction !== 'down') ||
                    (dir === 'down' && direction !== 'up') ||
                    (dir === 'left' && direction !== 'right') ||
                    (dir === 'right' && direction !== 'left');
                
                if (canChangeDirection) {
                    debug(`Direction changed to: ${dir}`);
                    nextDirection = dir;
                } else {
                    debug(`Invalid direction change: ${dir} (current: ${direction})`);
                }
            };
            
            // Remove any existing listeners before adding new ones
            btn.removeEventListener('touchstart', handleDirectionInput);
            btn.removeEventListener('mousedown', handleDirectionInput);
            
            // Add new listeners
            btn.addEventListener('touchstart', handleDirectionInput, { passive: false });
            btn.addEventListener('mousedown', handleDirectionInput);
        });

        // Prevent default touch behaviors on game container
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            const preventDefaultTouch = (e) => {
                if (e.target.closest('#direction-controls')) {
                    debug('Touch on controls, allowing event');
                    return;
                }
                debug('Preventing default touch behavior');
                e.preventDefault();
            };

            // Remove any existing listeners before adding new ones
            ['touchstart', 'touchmove', 'touchend'].forEach(eventType => {
                gameContainer.removeEventListener(eventType, preventDefaultTouch);
                gameContainer.addEventListener(eventType, preventDefaultTouch, { passive: false });
            });
        } else {
            debug('Game container not found');
        }

        // Handle touch events for swipe controls on canvas
        if (canvas) {
            // Remove any existing listeners before adding new ones
            canvas.removeEventListener('touchstart', handleCanvasTouch);
            canvas.removeEventListener('touchmove', handleCanvasMove);
            canvas.removeEventListener('touchend', handleCanvasEnd);
            
            // Add new listeners
            canvas.addEventListener('touchstart', handleCanvasTouch, { passive: false });
            canvas.addEventListener('touchmove', handleCanvasMove, { passive: false });
            canvas.addEventListener('touchend', handleCanvasEnd);
        } else {
            debug('Canvas not found for touch events');
        }

        // Handle window resize
        window.removeEventListener('resize', resizeCanvas);
        window.addEventListener('resize', () => {
            debug('Window resized');
            resizeCanvas();
            draw();
        });

        // Handle keyboard input
        document.removeEventListener('keydown', handleKeydown);
        document.addEventListener('keydown', handleKeydown);
        
        debug('Event listeners setup complete');
    } catch (error) {
        logError(error);
        debug('Error setting up event listeners: ' + error.message);
    }
}

// Handle touch events for swipe controls on canvas
const handleCanvasTouch = (e) => {
    if (e.target !== canvas) {
        debug('Touch not on canvas, ignoring');
        return;
    }
    e.preventDefault();
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    debug(`Canvas touch start: (${touchStartX}, ${touchStartY})`);
};

const handleCanvasMove = (e) => {
    if (e.target !== canvas) return;
    e.preventDefault();
};

const handleCanvasEnd = (e) => {
    if (e.target !== canvas) {
        debug('Touch end not on canvas, ignoring');
        return;
    }
    
    if (touchStartX === null || touchStartY === null) {
        debug('No touch start coordinates, ignoring');
        return;
    }
    
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    
    debug(`Swipe delta: (${deltaX}, ${deltaY})`);
    
    if (Math.abs(deltaX) < MIN_SWIPE && Math.abs(deltaY) < MIN_SWIPE) {
        if (gameOver) {
            debug('Small movement during game over, restarting');
            init();
        }
        touchStartX = null;
        touchStartY = null;
        return;
    }
    
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX > 0 && direction !== 'left') {
            debug('Swipe right');
            nextDirection = 'right';
        } else if (deltaX < 0 && direction !== 'right') {
            debug('Swipe left');
            nextDirection = 'left';
        }
    } else {
        if (deltaY > 0 && direction !== 'up') {
            debug('Swipe down');
            nextDirection = 'down';
        } else if (deltaY < 0 && direction !== 'down') {
            debug('Swipe up');
            nextDirection = 'up';
        }
    }
    
    touchStartX = null;
    touchStartY = null;
};

// Handle canvas resize
function resizeCanvas() {
    const container = document.getElementById('game-container');
    const oldWidth = canvas.width;
    const oldHeight = canvas.height;
    
    // Get the actual dimensions of the container
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    // Calculate cell size based on the smaller dimension
    CELL_SIZE = Math.floor(Math.min(canvas.width, canvas.height) / GRID_SIZE);
    
    debug(`Canvas resized: ${oldWidth}x${oldHeight} -> ${canvas.width}x${canvas.height}, Cell size: ${CELL_SIZE}`);
    
    // Redraw if game is already running
    if (isInitialized) {
        draw();
    }
}

// Initialize the game
function init() {
    debug('Initializing game');
    
    // Set up canvas size
    resizeCanvas();
    
    // Create initial snake
    snake = [];
    for (let i = INITIAL_SNAKE_LENGTH - 1; i >= 0; i--) {
        snake.push({ x: i, y: 0 });
    }
    
    direction = 'right';
    nextDirection = 'right';
    score = 0;
    level = 1;
    fruitsInLevel = 0;
    currentSpeed = INITIAL_GAME_SPEED;
    gameOver = false;
    isInitialized = true;
    
    // Hide game over message
    document.getElementById('game-over').style.display = 'none';
    
    // Update score display
    updateScoreAndLevel();
    
    // Create first food
    createFood();
    
    // Draw initial state
    draw();
    
    // Start game loop
    if (gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(gameStep, currentSpeed);
    
    debug('Game initialized and started');
}

// Update score and level display
function updateScoreAndLevel() {
    document.getElementById('score').textContent = `Score: ${score} | Level: ${level}`;
}

// Draw grass pattern
function drawGrassPattern() {
    const offsetX = (canvas.width - GRID_SIZE * CELL_SIZE) / 2;
    const offsetY = (canvas.height - GRID_SIZE * CELL_SIZE) / 2;
    
    // Clear the canvas
    ctx.fillStyle = COLORS.darkGrass;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw the game grid
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            ctx.fillStyle = (x + y) % 2 === 0 ? COLORS.darkGrass : COLORS.lightGrass;
            ctx.fillRect(
                offsetX + x * CELL_SIZE,
                offsetY + y * CELL_SIZE,
                CELL_SIZE,
                CELL_SIZE
            );
        }
    }
    return { offsetX, offsetY };
}

// Create new food at random position
function createFood() {
    let x, y;
    do {
        x = Math.floor(Math.random() * GRID_SIZE);
        y = Math.floor(Math.random() * GRID_SIZE);
    } while (snake.some(segment => segment.x === x && segment.y === y));
    
    food = { x, y };
    currentFlower = FLOWERS[Math.floor(Math.random() * FLOWERS.length)];
}

// Level up function
function levelUp() {
    level++;
    fruitsInLevel = 0;
    currentSpeed = Math.max(50, INITIAL_GAME_SPEED - (level - 1) * SPEED_INCREASE_PER_LEVEL);
    
    // Restart game loop with new speed
    if (gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(gameStep, currentSpeed);
    
    updateScoreAndLevel();
}

// Game step function
function gameStep() {
    if (gameOver) return;
    
    // Update direction
    direction = nextDirection;
    
    // Calculate new head position
    let head = { ...snake[0] };
    switch (direction) {
        case 'up': head.y--; break;
        case 'down': head.y++; break;
        case 'left': head.x--; break;
        case 'right': head.x++; break;
    }
    
    // Check for collisions
    if (head.x < 0 || head.x >= GRID_SIZE || 
        head.y < 0 || head.y >= GRID_SIZE ||
        snake.some(segment => segment.x === head.x && segment.y === head.y)) {
        endGame();
        return;
    }
    
    // Add new head
    snake.unshift(head);
    
    // Check if food is eaten
    if (head.x === food.x && head.y === food.y) {
        score++;
        fruitsInLevel++;
        
        // Check for level up
        if (fruitsInLevel >= FRUITS_PER_LEVEL) {
            levelUp();
        }
        
        updateScoreAndLevel();
        createFood();
    } else {
        snake.pop();
    }
    
    // Draw everything
    draw();
}

// Draw the game state
function draw() {
    if (!ctx || !canvas) {
        debug('Cannot draw: context or canvas not available');
        return;
    }
    
    const { offsetX, offsetY } = drawGrassPattern();
    
    // Draw snake
    snake.forEach((segment, index) => {
        ctx.fillStyle = index === 0 ? COLORS.snakeHead : COLORS.snake;
        ctx.fillRect(
            offsetX + segment.x * CELL_SIZE + 1,
            offsetY + segment.y * CELL_SIZE + 1,
            CELL_SIZE - 2,
            CELL_SIZE - 2
        );
    });
    
    // Draw flower (food)
    if (food) {
        ctx.font = `${CELL_SIZE * 0.7}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
            currentFlower,
            offsetX + (food.x * CELL_SIZE) + (CELL_SIZE / 2),
            offsetY + (food.y * CELL_SIZE) + (CELL_SIZE / 2)
        );
    }
}

// End the game
function endGame() {
    gameOver = true;
    clearInterval(gameLoop);
    document.getElementById('game-over').style.display = 'block';
}

// Handle keyboard input
function handleKeydown(event) {
    switch (event.key) {
        case 'ArrowUp':
            if (direction !== 'down') nextDirection = 'up';
            break;
        case 'ArrowDown':
            if (direction !== 'up') nextDirection = 'down';
            break;
        case 'ArrowLeft':
            if (direction !== 'right') nextDirection = 'left';
            break;
        case 'ArrowRight':
            if (direction !== 'left') nextDirection = 'right';
            break;
        case ' ':
            if (gameOver) init();
            break;
    }
} 