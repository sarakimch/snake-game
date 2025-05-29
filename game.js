// Game constants
const GRID_SIZE = 20;
let CELL_SIZE; // Will be calculated based on canvas size
const INITIAL_SNAKE_LENGTH = 4;
const INITIAL_GAME_SPEED = 200; // Slower initial speed (higher number = slower)
const SPEED_INCREASE_PER_LEVEL = 20; // How much faster per level (ms)
const FRUITS_PER_LEVEL = 10; // Fruits needed to advance level

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
let canvas = document.getElementById('gameCanvas');
let ctx = canvas.getContext('2d');
let score = 0;
let level = 1;
let fruitsInLevel = 0;
let currentSpeed = INITIAL_GAME_SPEED;
let snake = [];
let direction = 'right';
let nextDirection = 'right';
let food = null;
let gameLoop = null;
let gameOver = false;
let currentFlower = FLOWERS[0];

// Touch controls
let touchStartX = null;
let touchStartY = null;
const MIN_SWIPE = 30; // Minimum swipe distance to trigger direction change

// Direction button controls
const directionButtons = {
    'up-btn': 'up',
    'down-btn': 'down',
    'left-btn': 'left',
    'right-btn': 'right'
};

Object.entries(directionButtons).forEach(([btnId, dir]) => {
    const btn = document.getElementById(btnId);
    
    // Handle both touch and click events
    ['touchstart', 'mousedown'].forEach(eventType => {
        btn.addEventListener(eventType, (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (gameOver) {
                init();
                return;
            }
            
            const canChangeDirection = 
                (dir === 'up' && direction !== 'down') ||
                (dir === 'down' && direction !== 'up') ||
                (dir === 'left' && direction !== 'right') ||
                (dir === 'right' && direction !== 'left');
            
            if (canChangeDirection) {
                nextDirection = dir;
            }
        });
    });
});

// Prevent default touch behaviors on game container
const gameContainer = document.getElementById('game-container');
['touchstart', 'touchmove', 'touchend'].forEach(eventType => {
    gameContainer.addEventListener(eventType, (e) => {
        e.preventDefault();
    }, { passive: false });
});

// Handle touch events for swipe controls
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
});

canvas.addEventListener('touchend', (e) => {
    if (touchStartX !== null && touchStartY !== null) {
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;
        
        if (Math.abs(deltaX) < MIN_SWIPE && Math.abs(deltaY) < MIN_SWIPE) {
            if (gameOver) {
                init();
            }
            return;
        }
        
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            if (deltaX > 0 && direction !== 'left') {
                nextDirection = 'right';
            } else if (deltaX < 0 && direction !== 'right') {
                nextDirection = 'left';
            }
        } else {
            if (deltaY > 0 && direction !== 'up') {
                nextDirection = 'down';
            } else if (deltaY < 0 && direction !== 'down') {
                nextDirection = 'up';
            }
        }
        
        touchStartX = null;
        touchStartY = null;
    }
});

// Handle canvas resize
function resizeCanvas() {
    const container = document.getElementById('game-container');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    CELL_SIZE = Math.floor(canvas.width / GRID_SIZE);
}

// Initialize the game
function init() {
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
    
    // Hide game over message
    document.getElementById('game-over').style.display = 'none';
    
    // Update score display
    updateScoreAndLevel();
    
    // Create first food
    createFood();
    
    // Start game loop
    if (gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(gameStep, currentSpeed);
}

// Update score and level display
function updateScoreAndLevel() {
    document.getElementById('score').textContent = `Score: ${score} | Level: ${level}`;
}

// Draw grass pattern
function drawGrassPattern() {
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            ctx.fillStyle = (x + y) % 2 === 0 ? COLORS.darkGrass : COLORS.lightGrass;
            ctx.fillRect(
                x * CELL_SIZE,
                y * CELL_SIZE,
                CELL_SIZE,
                CELL_SIZE
            );
        }
    }
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
    // Draw grass pattern
    drawGrassPattern();
    
    // Draw snake
    snake.forEach((segment, index) => {
        ctx.fillStyle = index === 0 ? COLORS.snakeHead : COLORS.snake;
        ctx.fillRect(
            segment.x * CELL_SIZE + 1,
            segment.y * CELL_SIZE + 1,
            CELL_SIZE - 2,
            CELL_SIZE - 2
        );
    });
    
    // Draw flower (food)
    ctx.font = `${CELL_SIZE * 0.7}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
        currentFlower,
        (food.x * CELL_SIZE) + (CELL_SIZE / 2),
        (food.y * CELL_SIZE) + (CELL_SIZE / 2) + (CELL_SIZE * 0.1)
    );
}

// End the game
function endGame() {
    gameOver = true;
    clearInterval(gameLoop);
    document.getElementById('game-over').style.display = 'block';
}

// Handle keyboard input
document.addEventListener('keydown', (event) => {
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
});

// Handle window resize
window.addEventListener('resize', () => {
    resizeCanvas();
    draw();
});

// Start the game when the page loads
window.onload = init; 