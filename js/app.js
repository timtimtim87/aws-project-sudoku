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
            gameStarted: false,
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

    init() {
        this.setupUI();
        this.attachEventListeners();
        this.startNewGame();
    }

    setupUI() {
        this.ui.grid = document.getElementById('sudoku-grid');
        this.ui.timer = document.getElementById('timer');
        this.ui.statusMessage = document.getElementById('status-message');
        this.ui.pencilBtn = document.getElementById('pencil-btn');

        this.createGrid();

        this.ui.numberBtns = Array.from(document.querySelectorAll('.number-btn'));

        this.setupCameraFeature();
    }

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

                const pencilMarks = document.createElement('div');
                pencilMarks.className = 'pencil-marks';
                cell.appendChild(pencilMarks);

                this.ui.grid.appendChild(cell);
                this.ui.cells[row][col] = cell;
            }
        }
    }

    attachEventListeners() {
        this.ui.grid.addEventListener('click', (e) => {
            if (e.target.classList.contains('sudoku-cell')) {
                const row = parseInt(e.target.dataset.row);
                const col = parseInt(e.target.dataset.col);
                this.selectCell(row, col);
            }
        });

        this.ui.numberBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const number = btn.dataset.number;
                if (number) this.inputNumber(parseInt(number));
            });
        });

        document.getElementById('erase-btn').addEventListener('click', () => this.eraseCell());
        document.getElementById('new-game-btn').addEventListener('click', () => this.startNewGame());
        document.getElementById('solve-btn').addEventListener('click', () => this.showSolution());
        document.getElementById('clear-btn').addEventListener('click', () => this.clearProgress());

        document.addEventListener('keydown', (e) => this.handleKeyboard(e));

        this.ui.pencilBtn.addEventListener('click', () => this.togglePencilMode());

        const playAgainBtn = document.getElementById('play-again-btn');
        if (playAgainBtn) {
            playAgainBtn.addEventListener('click', () => {
                this.hideModal('win-modal');
                this.startNewGame();
            });
        }

        const closeModalBtn = document.getElementById('close-modal-btn');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => this.hideModal('win-modal'));
        }
    }

    handleKeyboard(e) {
        if (!this.gameState.selectedCell) return;

        if (e.key >= '1' && e.key <= '9') {
            e.preventDefault();
            this.inputNumber(parseInt(e.key));
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault();
            this.eraseCell();
        } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.preventDefault();
            this.navigateGrid(e.key);
        } else if (e.key === ' ') {
            e.preventDefault();
            this.togglePencilMode();
        } else if (e.key === 'Escape') {
            this.deselectCell();
        }
    }

    navigateGrid(direction) {
        if (!this.gameState.selectedCell) return;

        let { row, col } = this.gameState.selectedCell;

        switch (direction) {
            case 'ArrowUp':    row = row > 0 ? row - 1 : 8; break;
            case 'ArrowDown':  row = row < 8 ? row + 1 : 0; break;
            case 'ArrowLeft':  col = col > 0 ? col - 1 : 8; break;
            case 'ArrowRight': col = col < 8 ? col + 1 : 0; break;
        }

        this.selectCell(row, col);
    }

    setupCameraFeature() {
        const cameraBtn = document.getElementById('camera-btn');
        const cameraInput = document.getElementById('camera-input');

        cameraBtn.addEventListener('click', () => cameraInput.click());

        cameraInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) await this.processSudokuImage(file);
        });
    }

    async processSudokuImage(imageFile) {
        this.showModal('processing-modal');
        this.showStatus('Analyzing image with AI...', 'info');

        try {
            const base64Data = await this.fileToBase64(imageFile);

            const apiEndpoint = 'https://<api-id>.execute-api.us-east-1.amazonaws.com/prod/scan-sudoku';

            const response = await fetch(apiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: base64Data })
            });

            if (!response.ok) throw new Error(`API request failed: ${response.status}`);

            const result = await response.json();

            this.hideModal('processing-modal');

            if (result.success && result.puzzle && result.solution) {
                this.engine.init(result.puzzle, result.solution);

                this.gameState.selectedCell = null;
                this.gameState.gameStarted = false;
                this.gameState.startTime = null;
                this.stopTimer();

                this.updateGrid();
                this.showStatus('Puzzle loaded from image!', 'success');
            } else {
                this.showStatus(result.message || 'Could not detect puzzle. Try a clearer image.', 'error');
            }

        } catch (error) {
            this.hideModal('processing-modal');
            console.error('Image processing error:', error);
            this.showStatus('Image processing failed. Please try again.', 'error');
        }

        document.getElementById('camera-input').value = '';
    }

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    startNewGame() {
        this.gameState.selectedCell = null;
        this.gameState.gameStarted = false;
        this.gameState.startTime = null;
        this.gameState.isPaused = false;
        this.stopTimer();

        const puzzle = this.puzzleManager.getRandomPuzzle('easy');
        this.engine.init(puzzle.puzzle, puzzle.solution);

        this.updateGrid();
        this.resetTimer();

        this.showStatus('New puzzle loaded! Start playing to begin the timer.', 'info');
    }

    startGameTimer() {
        if (!this.gameState.gameStarted) {
            this.gameState.gameStarted = true;
            this.gameState.startTime = Date.now();
            this.startTimer();
        }
    }

    selectCell(row, col) {
        this.deselectCell();

        this.gameState.selectedCell = { row, col };
        this.ui.cells[row][col].classList.add('selected');

        this.highlightRelatedCells(row, col);
        this.updateNumberButtons();
    }

    deselectCell() {
        this.ui.cells.forEach(row => {
            row.forEach(cell => cell.classList.remove('selected', 'highlighted', 'conflict'));
        });

        this.gameState.selectedCell = null;
        this.updateNumberButtons();
    }

    highlightRelatedCells(row, col) {
        const num = this.engine.grid[row][col];

        for (let i = 0; i < 9; i++) {
            this.ui.cells[row][i].classList.add('highlighted');
            this.ui.cells[i][col].classList.add('highlighted');
        }

        const boxRow = Math.floor(row / 3) * 3;
        const boxCol = Math.floor(col / 3) * 3;

        for (let i = boxRow; i < boxRow + 3; i++) {
            for (let j = boxCol; j < boxCol + 3; j++) {
                this.ui.cells[i][j].classList.add('highlighted');
            }
        }

        if (num !== 0) {
            this.engine.getHighlightedCells(row, col).forEach(({ row: r, col: c }) => {
                this.ui.cells[r][c].classList.add('highlighted');
            });

            this.engine.getConflictingCells(row, col, num).forEach(({ row: r, col: c }) => {
                this.ui.cells[r][c].classList.add('conflict');
            });
        }
    }

    inputNumber(num) {
        if (!this.gameState.selectedCell) {
            this.showStatus('Please select a cell first', 'warning');
            return;
        }

        const { row, col } = this.gameState.selectedCell;

        if (this.engine.isGivenCell(row, col)) {
            this.showStatus('Cannot modify given numbers', 'error');
            return;
        }

        this.startGameTimer();

        if (this.gameState.pencilMode) {
            const added = this.engine.togglePencilMark(row, col, num);
            this.updateCell(row, col);
            this.showStatus(`Pencil mark ${added ? 'added' : 'removed'}`, 'info');
        } else {
            const result = this.engine.placeNumber(row, col, num);

            if (result.success) {
                this.updateCell(row, col);
                this.highlightRelatedCells(row, col);

                if (this.engine.isCorrectMove(row, col, num)) {
                    if (this.engine.isSolved()) {
                        this.onGameWin();
                    } else {
                        this.showStatus('Correct!', 'success');
                    }
                } else {
                    this.ui.cells[row][col].classList.add('error');
                    setTimeout(() => this.ui.cells[row][col].classList.remove('error'), 500);
                    this.showStatus('Try again!', 'warning');
                }
            } else {
                this.showStatus(result.error, 'error');
            }
        }
    }

    eraseCell() {
        if (!this.gameState.selectedCell) return;

        const { row, col } = this.gameState.selectedCell;

        if (this.engine.isGivenCell(row, col)) {
            this.showStatus('Cannot modify given numbers', 'error');
            return;
        }

        this.startGameTimer();

        if (this.gameState.pencilMode) {
            this.engine.clearPencilMarksForCell(row, col);
            this.updateCell(row, col);
            this.showStatus('Pencil marks cleared', 'info');
        } else {
            this.engine.placeNumber(row, col, 0);
            this.updateCell(row, col);
            this.highlightRelatedCells(row, col);
        }
    }

    togglePencilMode() {
        this.gameState.pencilMode = !this.gameState.pencilMode;
        this.ui.pencilBtn.setAttribute('data-active', this.gameState.pencilMode);
        this.ui.pencilBtn.classList.toggle('active', this.gameState.pencilMode);
        this.showStatus(`Pencil mode ${this.gameState.pencilMode ? 'enabled' : 'disabled'}`, 'info');
    }

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

    clearProgress() {
        if (confirm('Are you sure you want to clear your progress?')) {
            this.engine.reset();

            this.gameState.gameStarted = false;
            this.gameState.startTime = null;
            this.stopTimer();
            this.resetTimer();

            this.updateGrid();
            this.showStatus('Progress cleared! Start playing to begin the timer.', 'info');
        }
    }

    updateGrid() {
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                this.updateCell(row, col);
            }
        }
    }

    updateCell(row, col) {
        const cell = this.ui.cells[row][col];
        const value = this.engine.grid[row][col];
        const isGiven = this.engine.isGivenCell(row, col);
        const pencilMarks = this.engine.getPencilMarks(row, col);

        cell.classList.remove('given', 'user-input', 'error');

        if (value !== 0) {
            cell.textContent = value;

            const pencilContainer = cell.querySelector('.pencil-marks');
            if (pencilContainer) pencilContainer.innerHTML = '';

            cell.classList.add(isGiven ? 'given' : 'user-input');
        } else {
            cell.textContent = '';

            let pencilContainer = cell.querySelector('.pencil-marks');
            if (!pencilContainer) {
                pencilContainer = document.createElement('div');
                pencilContainer.className = 'pencil-marks';
                cell.appendChild(pencilContainer);
            }

            pencilContainer.innerHTML = '';

            pencilMarks.forEach(mark => {
                const el = document.createElement('div');
                el.className = 'pencil-mark';
                el.textContent = mark;
                pencilContainer.appendChild(el);
            });
        }
    }

    updateNumberButtons() {
        this.ui.numberBtns.forEach(btn => btn.classList.remove('selected'));

        if (this.gameState.selectedCell) {
            const { row, col } = this.gameState.selectedCell;
            const value = this.engine.grid[row][col];

            if (value !== 0) {
                const btn = this.ui.numberBtns.find(b => parseInt(b.dataset.number) === value);
                if (btn) btn.classList.add('selected');
            }
        }
    }

    resetTimer() {
        if (this.ui.timer) this.ui.timer.textContent = '--:--';
    }

    startTimer() {
        this.stopTimer();

        this.gameState.timer = setInterval(() => {
            if (!this.gameState.isPaused && this.gameState.startTime) {
                const elapsed = Date.now() - this.gameState.startTime;
                const minutes = Math.floor(elapsed / 60000);
                const seconds = Math.floor((elapsed % 60000) / 1000);
                this.ui.timer.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            }
        }, 1000);
    }

    stopTimer() {
        if (this.gameState.timer) {
            clearInterval(this.gameState.timer);
            this.gameState.timer = null;
        }
    }

    showStatus(message, type = 'info') {
        if (!this.ui.statusMessage) return;

        this.ui.statusMessage.textContent = message;
        this.ui.statusMessage.className = `status-message ${type}`;

        if (type !== 'error') {
            setTimeout(() => {
                this.ui.statusMessage.textContent = '';
                this.ui.statusMessage.className = 'status-message';
            }, 3000);
        }
    }

    onGameWin() {
        this.stopTimer();

        let timeString = '--:--';
        if (this.gameState.startTime) {
            const elapsed = Date.now() - this.gameState.startTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }

        const finalTimeEl = document.getElementById('final-time');
        if (finalTimeEl) finalTimeEl.textContent = timeString;

        const finalSourceEl = document.getElementById('final-source');
        if (finalSourceEl) finalSourceEl.textContent = 'Easy Puzzle';

        this.showModal('win-modal');
        this.showStatus('Congratulations! You solved the puzzle!', 'success');
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('hidden');
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('hidden');
    }

    getDebugInfo() {
        return {
            gameState: this.gameState,
            engineStats: this.engine.getStats(),
            grid: this.engine.getGrid(),
            solution: this.engine.getSolution()
        };
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.sudokooApp = new SudokooApp();

    window.sudokooDebug = {
        getInfo: () => window.sudokooApp.getDebugInfo(),
        solve: () => window.sudokooApp.showSolution(),
        newGame: () => window.sudokooApp.startNewGame(),
        togglePencil: () => window.sudokooApp.togglePencilMode()
    };
});

document.addEventListener('visibilitychange', () => {
    if (window.sudokooApp) {
        window.sudokooApp.gameState.isPaused = document.hidden;
    }
});

window.addEventListener('beforeunload', (e) => {
    if (window.sudokooApp && window.sudokooApp.engine.getProgress().filled > 0) {
        e.preventDefault();
        e.returnValue = 'You have unsaved progress. Are you sure you want to leave?';
        return e.returnValue;
    }
});
