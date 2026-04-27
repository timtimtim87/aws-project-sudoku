/**
 * SUDOKOO Game Application
 * Main game controller and UI management
 */

class SudokooApp {
    constructor() {
        this.engine = new SudokuEngine();
        this.puzzleManager = new PuzzleManager();
        this.gameState = {
            selectedCell: null,
            pencilMode: false,
            startTime: null,
            timer: null,
            isPaused: false,
            gameStarted: false, // Track if user has started playing
            difficulty: 'easy'
        };
        this.ui = {
            grid: null,
            cells: [],
            timer: null,
            statusMessage: null,
            pencilBtn: null,
            numberBtns: []
        };
        
        this.init();
    }

    /**
     * Initialize the application
     */
    init() {
        this.setupUI();
        this.attachEventListeners();
        this.startNewGame();
    }

    /**
     * Setup UI elements
     */
    setupUI() {
        // Get DOM elements
        this.ui.grid = document.getElementById('sudoku-grid');
        this.ui.timer = document.getElementById('timer');
        this.ui.statusMessage = document.getElementById('status-message');
        this.ui.pencilBtn = document.getElementById('pencil-btn');

        // Create grid cells
        this.createGrid();

        // Get number buttons
        this.ui.numberBtns = Array.from(document.querySelectorAll('.number-btn'));

        // Setup camera functionality
        this.setupCameraFeature();
    }

    /**
     * Create the Sudoku grid
     */
    createGrid() {
        this.ui.grid.innerHTML = '';
        this.ui.cells = [];

        for (let row = 0; row < 9; row++) {
            this.ui.cells[row] = [];
            for (let col = 0; col < 9; col++) {
                const cell = document.createElement('div');
                cell.className = 'sudoku-cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                cell.tabIndex = 0;
                
                // Add pencil marks container
                const pencilMarks = document.createElement('div');
                pencilMarks.className = 'pencil-marks';
                cell.appendChild(pencilMarks);
                
                this.ui.grid.appendChild(cell);
                this.ui.cells[row][col] = cell;
            }
        }
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Grid cell clicks
        this.ui.grid.addEventListener('click', (e) => {
            if (e.target.classList.contains('sudoku-cell')) {
                const row = parseInt(e.target.dataset.row);
                const col = parseInt(e.target.dataset.col);
                this.selectCell(row, col);
            }
        });

        // Number pad clicks
        this.ui.numberBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const number = btn.dataset.number;
                if (number) {
                    this.inputNumber(parseInt(number));
                }
            });
        });

        // Erase button
        document.getElementById('erase-btn').addEventListener('click', () => {
            this.eraseCell();
        });

        // Keyboard input
        document.addEventListener('keydown', (e) => {
            this.handleKeyboard(e);
        });

        // Control buttons
        document.getElementById('new-game-btn').addEventListener('click', () => {
            this.startNewGame();
        });

        document.getElementById('solve-btn').addEventListener('click', () => {
            this.showSolution();
        });

        document.getElementById('clear-btn').addEventListener('click', () => {
            this.clearProgress();
        });

        // Pencil mode toggle
        this.ui.pencilBtn.addEventListener('click', () => {
            this.togglePencilMode();
        });

        // Modal buttons - using the correct IDs from your HTML
        const playAgainBtn = document.getElementById('play-again-btn');
        if (playAgainBtn) {
            playAgainBtn.addEventListener('click', () => {
                this.hideModal('win-modal');
                this.startNewGame();
            });
        }

        const closeModalBtn = document.getElementById('close-modal-btn');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => {
                this.hideModal('win-modal');
            });
        }
    }

    /**
     * Handle keyboard input
     */
    handleKeyboard(e) {
        if (!this.gameState.selectedCell) return;

        const { row, col } = this.gameState.selectedCell;

        // Number keys 1-9
        if (e.key >= '1' && e.key <= '9') {
            e.preventDefault();
            this.inputNumber(parseInt(e.key));
        }
        // Delete/Backspace to erase
        else if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault();
            this.eraseCell();
        }
        // Arrow keys for navigation
        else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.preventDefault();
            this.navigateGrid(e.key);
        }
        // Space to toggle pencil mode
        else if (e.key === ' ') {
            e.preventDefault();
            this.togglePencilMode();
        }
        // Escape to deselect
        else if (e.key === 'Escape') {
            this.deselectCell();
        }
    }

    /**
     * Navigate grid with arrow keys
     */
    navigateGrid(direction) {
        if (!this.gameState.selectedCell) return;

        let { row, col } = this.gameState.selectedCell;

        switch (direction) {
            case 'ArrowUp':
                row = row > 0 ? row - 1 : 8;
                break;
            case 'ArrowDown':
                row = row < 8 ? row + 1 : 0;
                break;
            case 'ArrowLeft':
                col = col > 0 ? col - 1 : 8;
                break;
            case 'ArrowRight':
                col = col < 8 ? col + 1 : 0;
                break;
        }

        this.selectCell(row, col);
    }

    /**
     * Setup camera scanning feature
     */
    setupCameraFeature() {
        const cameraBtn = document.getElementById('camera-btn');
        const cameraInput = document.getElementById('camera-input');

        // Camera button click opens file picker
        cameraBtn.addEventListener('click', () => {
            cameraInput.click();
        });

        // Handle file selection
        cameraInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                await this.processSudokuImage(file);
            }
        });
    }

    /**
     * Process uploaded Sudoku image with AWS Bedrock
     */
    async processSudokuImage(imageFile) {
        // Show processing modal
        this.showModal('processing-modal');
        this.showStatus('Analyzing image with AI...', 'info');
        
        try {
            // Convert file to base64
            const base64Data = await this.fileToBase64(imageFile);
            
            // API endpoint - using your actual API Gateway URL
            const apiEndpoint = 'https://<api-id>.execute-api.us-east-1.amazonaws.com/prod/scan-sudoku';
            
            const response = await fetch(apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    image: base64Data
                })
            });
            
            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }
            
            const result = await response.json();
            
            this.hideModal('processing-modal');
            
            if (result.success && result.puzzle && result.solution) {
                // Load the detected puzzle into game engine
                this.engine.init(result.puzzle, result.solution);
                
                // Reset game state for new scanned puzzle
                this.gameState.selectedCell = null;
                this.gameState.gameStarted = false;
                this.gameState.startTime = null;
                this.stopTimer();
                
                // Update UI
                this.updateGrid();
                this.showStatus('Puzzle successfully loaded from image! 📸', 'success');
                
                console.log('Scanned puzzle loaded:', result.debug);
            } else {
                this.showStatus(result.message || 'Could not detect puzzle. Please try a clearer image.', 'error');
            }
            
        } catch (error) {
            this.hideModal('processing-modal');
            console.error('Image processing error:', error);
            this.showStatus('Image processing failed. Please try again with a clearer photo.', 'error');
        }
        
        // Clear the file input for next use
        document.getElementById('camera-input').value = '';
    }

    /**
     * Convert file to base64
     */
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    /**
     * Start a new game
     */
    startNewGame() {
        // Reset game state
        this.gameState.selectedCell = null;
        this.gameState.gameStarted = false;
        this.gameState.startTime = null;
        this.gameState.isPaused = false;
        this.stopTimer();

        // Get new easy puzzle
        const puzzle = this.puzzleManager.getRandomPuzzle('easy');
        this.engine.init(puzzle.puzzle, puzzle.solution);

        // Update UI
        this.updateGrid();
        this.resetTimer();
        
        this.showStatus(`New puzzle loaded! Start playing to begin the timer.`, 'info');
        console.log('New game started:', puzzle.name);
    }

    /**
     * Start the timer when user makes their first move
     */
    startGameTimer() {
        if (!this.gameState.gameStarted) {
            this.gameState.gameStarted = true;
            this.gameState.startTime = Date.now();
            this.startTimer();
        }
    }

    /**
     * Select a cell
     */
    selectCell(row, col) {
        // Deselect previous cell
        this.deselectCell();

        // Select new cell
        this.gameState.selectedCell = { row, col };
        const cell = this.ui.cells[row][col];
        cell.classList.add('selected');

        // Highlight related cells
        this.highlightRelatedCells(row, col);

        // Update number button states
        this.updateNumberButtons();
    }

    /**
     * Deselect current cell
     */
    deselectCell() {
        // Remove all highlights and selections
        this.ui.cells.forEach(row => {
            row.forEach(cell => {
                cell.classList.remove('selected', 'highlighted', 'conflict');
            });
        });

        this.gameState.selectedCell = null;
        this.updateNumberButtons();
    }

    /**
     * Highlight cells related to the selected cell
     */
    highlightRelatedCells(row, col) {
        const num = this.engine.grid[row][col];
        
        // Highlight same row, column, and box
        for (let i = 0; i < 9; i++) {
            // Same row
            this.ui.cells[row][i].classList.add('highlighted');
            // Same column
            this.ui.cells[i][col].classList.add('highlighted');
        }

        // Same 3x3 box
        const boxRow = Math.floor(row / 3) * 3;
        const boxCol = Math.floor(col / 3) * 3;
        
        for (let i = boxRow; i < boxRow + 3; i++) {
            for (let j = boxCol; j < boxCol + 3; j++) {
                this.ui.cells[i][j].classList.add('highlighted');
            }
        }

        // Highlight same numbers
        if (num !== 0) {
            const highlighted = this.engine.getHighlightedCells(row, col);
            highlighted.forEach(({ row: r, col: c }) => {
                this.ui.cells[r][c].classList.add('highlighted');
            });
        }

        // Show conflicts
        if (num !== 0) {
            const conflicts = this.engine.getConflictingCells(row, col, num);
            conflicts.forEach(({ row: r, col: c }) => {
                this.ui.cells[r][c].classList.add('conflict');
            });
        }
    }

    /**
     * Input a number into the selected cell
     */
    inputNumber(num) {
        if (!this.gameState.selectedCell) {
            this.showStatus('Please select a cell first', 'warning');
            return;
        }

        const { row, col } = this.gameState.selectedCell;

        // Check if it's a given cell
        if (this.engine.isGivenCell(row, col)) {
            this.showStatus('Cannot modify given numbers', 'error');
            return;
        }

        // Start timer on first move
        this.startGameTimer();

        if (this.gameState.pencilMode) {
            // Toggle pencil mark
            const added = this.engine.togglePencilMark(row, col, num);
            this.updateCell(row, col);
            this.showStatus(`Pencil mark ${added ? 'added' : 'removed'}`, 'info');
        } else {
            // Place number
            const result = this.engine.placeNumber(row, col, num);
            
            if (result.success) {
                // Check if it's the correct answer
                if (this.engine.isCorrectMove(row, col, num)) {
                    this.updateCell(row, col);
                    this.highlightRelatedCells(row, col);
                    
                    // Check if puzzle is solved
                    if (this.engine.isSolved()) {
                        this.onGameWin();
                    } else {
                        this.showStatus('Correct!', 'success');
                    }
                } else {
                    // Incorrect move - just show error, no game over
                    this.updateCell(row, col);
                    this.highlightRelatedCells(row, col);
                    
                    // Show error animation
                    this.ui.cells[row][col].classList.add('error');
                    setTimeout(() => {
                        this.ui.cells[row][col].classList.remove('error');
                    }, 500);
                    
                    this.showStatus('Try again!', 'warning');
                }
            } else {
                this.showStatus(result.error, 'error');
            }
        }
    }

    /**
     * Erase the selected cell
     */
    eraseCell() {
        if (!this.gameState.selectedCell) return;

        const { row, col } = this.gameState.selectedCell;

        if (this.engine.isGivenCell(row, col)) {
            this.showStatus('Cannot modify given numbers', 'error');
            return;
        }

        // Start timer on first move (even erasing counts as a move)
        this.startGameTimer();

        if (this.gameState.pencilMode) {
            // Clear all pencil marks
            this.engine.clearPencilMarksForCell(row, col);
            this.updateCell(row, col);
            this.showStatus('Pencil marks cleared', 'info');
        } else {
            // Clear the cell
            this.engine.placeNumber(row, col, 0);
            this.updateCell(row, col);
            this.highlightRelatedCells(row, col);
        }
    }

    /**
     * Toggle pencil mode
     */
    togglePencilMode() {
        this.gameState.pencilMode = !this.gameState.pencilMode;
        this.ui.pencilBtn.setAttribute('data-active', this.gameState.pencilMode);
        
        if (this.gameState.pencilMode) {
            this.ui.pencilBtn.classList.add('active');
            this.showStatus('Pencil mode enabled', 'info');
        } else {
            this.ui.pencilBtn.classList.remove('active');
            this.showStatus('Pencil mode disabled', 'info');
        }
    }

    /**
     * Show the complete solution
     */
    showSolution() {
        if (confirm('Are you sure you want to see the solution? This will end the current game.')) {
            const solution = this.engine.getSolution();
            
            for (let row = 0; row < 9; row++) {
                for (let col = 0; col < 9; col++) {
                    this.engine.grid[row][col] = solution[row][col];
                }
            }
            
            this.updateGrid();
            this.stopTimer();
            this.showStatus('Solution revealed!', 'info');
        }
    }

    /**
     * Clear user progress
     */
    clearProgress() {
        if (confirm('Are you sure you want to clear your progress?')) {
            this.engine.reset();
            
            // Reset timer state
            this.gameState.gameStarted = false;
            this.gameState.startTime = null;
            this.stopTimer();
            this.resetTimer();
            
            this.updateGrid();
            this.showStatus('Progress cleared! Start playing to begin the timer.', 'info');
        }
    }

    /**
     * Update the entire grid display
     */
    updateGrid() {
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                this.updateCell(row, col);
            }
        }
    }

    /**
     * Update a single cell display
     */
    updateCell(row, col) {
        const cell = this.ui.cells[row][col];
        const value = this.engine.grid[row][col];
        const isGiven = this.engine.isGivenCell(row, col);
        const pencilMarks = this.engine.getPencilMarks(row, col);

        // Clear existing classes
        cell.classList.remove('given', 'user-input', 'error');

        if (value !== 0) {
            // Show the number
            cell.textContent = value;
            
            // Clear pencil marks
            let pencilContainer = cell.querySelector('.pencil-marks');
            if (pencilContainer) {
                pencilContainer.innerHTML = '';
            }
            
            if (isGiven) {
                cell.classList.add('given');
            } else {
                cell.classList.add('user-input');
            }
        } else {
            // Empty cell - show pencil marks if any
            cell.textContent = '';
            
            let pencilContainer = cell.querySelector('.pencil-marks');
            if (!pencilContainer) {
                // Create pencil marks container if it doesn't exist
                pencilContainer = document.createElement('div');
                pencilContainer.className = 'pencil-marks';
                cell.appendChild(pencilContainer);
            }
            
            pencilContainer.innerHTML = '';
            
            if (pencilMarks.length > 0) {
                pencilMarks.forEach(mark => {
                    const markElement = document.createElement('div');
                    markElement.className = 'pencil-mark';
                    markElement.textContent = mark;
                    pencilContainer.appendChild(markElement);
                });
            }
        }
    }

    /**
     * Update number button states
     */
    updateNumberButtons() {
        this.ui.numberBtns.forEach(btn => {
            btn.classList.remove('selected');
        });

        // If a cell is selected, highlight the number button for that cell's value
        if (this.gameState.selectedCell) {
            const { row, col } = this.gameState.selectedCell;
            const value = this.engine.grid[row][col];
            
            if (value !== 0) {
                const btn = this.ui.numberBtns.find(b => parseInt(b.dataset.number) === value);
                if (btn) {
                    btn.classList.add('selected');
                }
            }
        }
    }

    /**
     * Reset timer display
     */
    resetTimer() {
        if (this.ui.timer) {
            this.ui.timer.textContent = '--:--';
        }
    }

    /**
     * Start the game timer
     */
    startTimer() {
        this.stopTimer(); // Clear any existing timer
        
        this.gameState.timer = setInterval(() => {
            if (!this.gameState.isPaused && this.gameState.startTime) {
                const elapsed = Date.now() - this.gameState.startTime;
                const minutes = Math.floor(elapsed / 60000);
                const seconds = Math.floor((elapsed % 60000) / 1000);
                
                this.ui.timer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        }, 1000);
    }

    /**
     * Stop the game timer
     */
    stopTimer() {
        if (this.gameState.timer) {
            clearInterval(this.gameState.timer);
            this.gameState.timer = null;
        }
    }

    /**
     * Show status message
     */
    showStatus(message, type = 'info') {
        if (this.ui.statusMessage) {
            this.ui.statusMessage.textContent = message;
            this.ui.statusMessage.className = `status-message ${type}`;
            
            // Auto-hide after 3 seconds for non-error messages
            if (type !== 'error') {
                setTimeout(() => {
                    this.ui.statusMessage.textContent = '';
                    this.ui.statusMessage.className = 'status-message';
                }, 3000);
            }
        }
    }

    /**
     * Handle game win
     */
    onGameWin() {
        this.stopTimer();
        
        // Calculate final time
        let timeString = '--:--';
        if (this.gameState.startTime) {
            const elapsed = Date.now() - this.gameState.startTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        
        // Update win modal
        const finalTimeElement = document.getElementById('final-time');
        if (finalTimeElement) {
            finalTimeElement.textContent = timeString;
        }
        
        // Update source in win modal
        const finalSource = document.getElementById('final-source');
        if (finalSource) {
            finalSource.textContent = 'Easy Puzzle';
        }
        
        // Show win modal
        this.showModal('win-modal');
        
        this.showStatus('Congratulations! You solved the puzzle!', 'success');
        
        console.log('Game won!', {
            time: timeString,
            difficulty: 'easy'
        });
    }

    /**
     * Show modal
     */
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
        }
    }

    /**
     * Hide modal
     */
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    /**
     * Get game statistics for debugging
     */
    getDebugInfo() {
        return {
            gameState: this.gameState,
            engineStats: this.engine.getStats(),
            grid: this.engine.getGrid(),
            solution: this.engine.getSolution()
        };
    }
}

/**
 * Initialize the application when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('🧩 SUDOKOO - Interactive Sudoku Game');
    console.log('Built with AWS by Tim for Solutions Architect Portfolio');
    
    // Initialize the game
    window.sudokooApp = new SudokooApp();
    
    // Add some helpful console commands for debugging
    window.sudokooDebug = {
        getInfo: () => window.sudokooApp.getDebugInfo(),
        solve: () => window.sudokooApp.showSolution(),
        newGame: () => window.sudokooApp.startNewGame(),
        togglePencil: () => window.sudokooApp.togglePencilMode()
    };
    
    console.log('Debug commands available: sudokooDebug.getInfo(), sudokooDebug.solve(), etc.');
});

/**
 * Handle page visibility changes (pause when tab is hidden)
 */
document.addEventListener('visibilitychange', () => {
    if (window.sudokooApp) {
        if (document.hidden) {
            window.sudokooApp.gameState.isPaused = true;
        } else {
            window.sudokooApp.gameState.isPaused = false;
        }
    }
});

/**
 * Handle window beforeunload (warn about unsaved progress)
 */
window.addEventListener('beforeunload', (e) => {
    if (window.sudokooApp && window.sudokooApp.engine.getProgress().filled > 0) {
        e.preventDefault();
        e.returnValue = 'You have unsaved progress. Are you sure you want to leave?';
        return e.returnValue;
    }
});