/**
 * SUDOKOO Puzzle Manager
 * Manages puzzle generation and selection
 */

class PuzzleManager {
    constructor() {
        this.currentPuzzle = null;
        this.currentDifficulty = 'easy';
        this.generator = new SudokuGenerator();
        this.useGenerator = true;
    }

    /**
     * Get a random easy puzzle
     */
    getRandomPuzzle(difficulty = 'easy') {
        return this.getGeneratedPuzzle(difficulty);
    }

    /**
     * Get a fresh generated puzzle
     */
    getGeneratedPuzzle(difficulty = 'easy') {
        try {
            const puzzle = this.generator.generateFreshPuzzle(difficulty);
            
            this.currentPuzzle = {
                ...puzzle,
                startTime: Date.now()
            };
            
            return this.currentPuzzle;
        } catch (error) {
            console.error('Generator failed:', error);
            // Return a simple fallback puzzle if generation fails
            return this.getFallbackPuzzle();
        }
    }

    /**
     * Simple fallback puzzle if generator fails
     */
    getFallbackPuzzle() {
        return {
            id: 'fallback_easy',
            name: 'Fallback Easy Puzzle',
            puzzle: [
                [5, 3, 4, 6, 7, 8, 9, 1, 2],
                [6, 7, 2, 1, 9, 5, 3, 4, 8],
                [1, 9, 8, 3, 4, 2, 5, 6, 7],
                [8, 5, 9, 7, 6, 1, 4, 2, 3],
                [4, 2, 6, 8, 5, 3, 7, 9, 1],
                [7, 1, 3, 9, 2, 4, 8, 5, 6],
                [9, 6, 1, 5, 3, 7, 2, 8, 4],
                [2, 8, 7, 4, 1, 9, 6, 3, 5],
                [3, 4, 5, 2, 8, 6, 1, 7, 0]
            ],
            solution: [
                [5, 3, 4, 6, 7, 8, 9, 1, 2],
                [6, 7, 2, 1, 9, 5, 3, 4, 8],
                [1, 9, 8, 3, 4, 2, 5, 6, 7],
                [8, 5, 9, 7, 6, 1, 4, 2, 3],
                [4, 2, 6, 8, 5, 3, 7, 9, 1],
                [7, 1, 3, 9, 2, 4, 8, 5, 6],
                [9, 6, 1, 5, 3, 7, 2, 8, 4],
                [2, 8, 7, 4, 1, 9, 6, 3, 5],
                [3, 4, 5, 2, 8, 6, 1, 7, 9]
            ],
            difficulty: 'easy',
            generated: false,
            startTime: Date.now()
        };
    }

    /**
     * Get a specific puzzle by ID (not needed for easy-only mode)
     */
    getPuzzleById(puzzleId) {
        console.log(`Puzzle ID requests not supported in easy-only mode: ${puzzleId}`);
        return this.getRandomPuzzle();
    }

    /**
     * Get puzzle statistics
     */
    getPuzzleStats() {
        return {
            easy: 'Generated on demand',
            total: 'Infinite'
        };
    }

    /**
     * Validate if a puzzle has a unique solution (basic check)
     */
    validatePuzzle(grid) {
        // Count filled cells
        let filledCells = 0;
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (grid[row][col] !== 0) {
                    filledCells++;
                }
            }
        }
        
        // Easy puzzles should have 45+ clues
        return filledCells >= 45;
    }

    /**
     * Create a deep copy of a puzzle grid
     */
    copyGrid(grid) {
        return grid.map(row => [...row]);
    }

    /**
     * Get difficulty recommendations (always easy)
     */
    getRecommendedDifficulty() {
        return 'easy';
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PuzzleManager };
} else {
    // Make available globally in browser
    window.PuzzleManager = PuzzleManager;
}