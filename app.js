// State
const STATE = {
    currentView: 'home', // 'home' or 'overworld'
    gridSize: 20,
    homeGrid: [],
    overworldGrid: []
};

// Initialize grids
for (let y = 0; y < STATE.gridSize; y++) {
    STATE.homeGrid[y] = [];
    STATE.overworldGrid[y] = [];
    for (let x = 0; x < STATE.gridSize; x++) {
        STATE.homeGrid[y][x] = null; // null means empty
        STATE.overworldGrid[y][x] = null;
    }
}

// DOM Elements
let btnHome, btnOverworld, currentViewText;
let canvas, ctx, gameContainer;

function initUI() {
    btnHome = document.getElementById('btn-home');
    btnOverworld = document.getElementById('btn-overworld');
    currentViewText = document.getElementById('current-view-text');
    gameContainer = document.getElementById('game-container');
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');

    btnHome.addEventListener('click', () => switchView('home'));
    btnOverworld.addEventListener('click', () => switchView('overworld'));

    canvas.addEventListener('click', handleCanvasClick);

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
}

function handleCanvasClick(event) {
    // Get click coordinates relative to the canvas
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Calculate cell size
    const cellSize = canvas.width / STATE.gridSize;

    // Determine grid coordinates
    const gridX = Math.floor(x / cellSize);
    const gridY = Math.floor(y / cellSize);

    // Ensure the click is within the grid bounds
    if (gridX >= 0 && gridX < STATE.gridSize && gridY >= 0 && gridY < STATE.gridSize) {
        if (STATE.currentView === 'home') {
            // Home Base Interaction: Place a building (represented by a color)
            // Toggle between empty and filled
            if (STATE.homeGrid[gridY][gridX]) {
                STATE.homeGrid[gridY][gridX] = null;
            } else {
                STATE.homeGrid[gridY][gridX] = '#4CAF50'; // Green for home buildings
            }
        } else {
            // Overworld Interaction: Claim territory
            if (STATE.overworldGrid[gridY][gridX]) {
                STATE.overworldGrid[gridY][gridX] = null;
            } else {
                STATE.overworldGrid[gridY][gridX] = '#F44336'; // Red for territory
            }
        }
        // Redraw to show changes
        draw();
    }
}


function resizeCanvas() {
    // Get the size of the container
    const containerWidth = gameContainer.clientWidth;
    const containerHeight = gameContainer.clientHeight;

    // Determine the size of the square canvas (fit within container)
    const size = Math.min(containerWidth, containerHeight) - 20; // 20px padding

    // Make sure we have a positive size
    if (size > 0) {
        canvas.width = size;
        canvas.height = size;
        draw();
    }
}

function switchView(view) {
    if (STATE.currentView === view) return;

    STATE.currentView = view;

    // Update UI
    if (view === 'home') {
        btnHome.classList.add('active');
        btnOverworld.classList.remove('active');
        currentViewText.innerText = 'Home Base';
    } else {
        btnOverworld.classList.add('active');
        btnHome.classList.remove('active');
        currentViewText.innerText = 'Overworld';
    }

    draw();
}

function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate cell size
    const cellSize = canvas.width / STATE.gridSize;

    // Set colors based on view
    const lineColor = STATE.currentView === 'home' ? '#444' : '#555';
    const bgColor = STATE.currentView === 'home' ? '#222' : '#2a2a2a';

    // Fill background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid cells (buildings or territory)
    const grid = STATE.currentView === 'home' ? STATE.homeGrid : STATE.overworldGrid;

    for (let y = 0; y < STATE.gridSize; y++) {
        for (let x = 0; x < STATE.gridSize; x++) {
            if (grid[y][x]) {
                ctx.fillStyle = grid[y][x];
                // Draw slightly smaller to leave a gap for grid lines
                ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
            }
        }
    }

    // Draw grid lines on top
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1;

    for (let i = 0; i <= STATE.gridSize; i++) {
        const pos = i * cellSize;
        // Vertical lines
        ctx.beginPath();
        ctx.moveTo(pos, 0);
        ctx.lineTo(pos, canvas.height);
        ctx.stroke();

        // Horizontal lines
        ctx.beginPath();
        ctx.moveTo(0, pos);
        ctx.lineTo(canvas.width, pos);
        ctx.stroke();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("Game initialized.");
    initUI();
});