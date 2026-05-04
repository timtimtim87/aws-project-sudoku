/**
 * SUDOKOO Puzzle Generator
 * Generates fresh Sudoku puzzles on demand
 */

class SudokuGenerator {
    constructor() {
        this.difficultySettings = {
            'easy':   { min: 45, max: 50, name: 'Easy' },
            'medium': { min: 35, max: 40, name: 'Medium' },
            'hard':   { min: 25, max: 30, name: 'Hard' },
            'expert': { min: 17, max: 22, name: 'Expert' }
        };
    }

    /**
     * Generate a complete valid Sudoku solution
     */
    generateCompletePuzzle() {
        const grid = Array(9).fill().map(() => Array(9).fill(0));
        
        // Fill the grid using backtracking
        this.fillGrid(grid);
        return grid;
    }

    /**
     * Fill grid with valid numbers using backtracking
     */
    fillGrid(grid) {
        const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (grid[row][col] === 0) {
                    // Shuffle numbers for randomness
                    this.shuffleArray(numbers);
                    
                    for (const num of numbers) {
                        if (this.isValidPlacement(grid, row, col, num)) {
                            grid[row][col] = num;
                            
                            if (this.fillGrid(grid)) {
                                return true;
                            }
                            
                            grid[row][col] = 0;
                        }
                    }
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * Check if a number placement is valid
     */
    isValidPlacement(grid, row, col, num) {
        // Check row
        for (let x = 0; x < 9; x++) {
            if (grid[row][x] === num) return false;
        }

        // Check column
        for (let x = 0; x < 9; x++) {
            if (grid[x][col] === num) return false;
        }

        // Check 3x3 box
        const boxRow = Math.floor(row / 3) * 3;
        const boxCol = Math.floor(col / 3) * 3;
        
        for (let i = boxRow; i < boxRow + 3; i++) {
            for (let j = boxCol; j < boxCol + 3; j++) {
                if (grid[i][j] === num) return false;
            }
        }

        return true;
    }

    /**
     * Remove numbers to create puzzle with specified difficulty
     */
    createPuzzle(solution, difficulty = 'medium') {
        const puzzle = solution.map(row => [...row]);
        const settings = this.difficultySettings[difficulty];
        
        if (!settings) {
            console.warn(`Unknown difficulty: ${difficulty}, using medium`);
            difficulty = 'medium';
        }

        // Calculate target number of clues based on difficulty
        let targetClues;
        if (difficulty === 'easy') {
            targetClues = Math.floor(Math.random() * 6) + 45; // 45-50 clues
        } else if (difficulty === 'medium') {
            targetClues = Math.floor(Math.random() * 6) + 35; // 35-40 clues  
        } else if (difficulty === 'hard') {
            targetClues = Math.floor(Math.random() * 6) + 25; // 25-30 clues
        } else { // expert
            targetClues = Math.floor(Math.random() * 6) + 17; // 17-22 clues
        }

        // Create list of all positions
        const positions = [];
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                positions.push({ row, col });
            }
        }

        // Shuffle positions
        this.shuffleArray(positions);

        // Remove numbers until we reach target difficulty
        let currentClues = 81;
        for (const pos of positions) {
            if (currentClues <= targetClues) break;
            
            const { row, col } = pos;
            const backup = puzzle[row][col];
            puzzle[row][col] = 0;
            
            // Check if puzzle still has unique solution (simplified check)
            if (this.hasUniqueSolution(puzzle)) {
                currentClues--;
            } else {
                // Restore if removing creates multiple solutions
                puzzle[row][col] = backup;
            }
        }

        return puzzle;
    }

    /**
     * Simplified check for unique solution (basic validation)
     */
    hasUniqueSolution(puzzle) {
        // Count empty cells - if too few clues, likely multiple solutions
        let emptyCells = 0;
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (puzzle[row][col] === 0) emptyCells++;
            }
        }
        
        // Basic heuristic: if more than 64 empty cells, likely invalid
        return emptyCells <= 64;
    }

    /**
     * Generate a fresh puzzle with specified difficulty
     */
    generateFreshPuzzle(difficulty = 'medium') {
        console.log(`🎲 Generating fresh ${difficulty} puzzle...`);
        
        const startTime = Date.now();
        
        // Generate complete solution
        const solution = this.generateCompletePuzzle();
        
        // Create puzzle by removing numbers
        const puzzle = this.createPuzzle(solution, difficulty);
        
        const endTime = Date.now();
        const generationTime = endTime - startTime;
        
        console.log(`✅ Generated in ${generationTime}ms`);
        
        return {
            id: `generated_${difficulty}_${Date.now()}`,
            name: `Fresh ${this.difficultySettings[difficulty]?.name || 'Medium'} Puzzle`,
            puzzle: puzzle,
            solution: solution,
            difficulty: difficulty,
            generated: true,
            generationTime: generationTime
        };
    }

    /**
     * Shuffle array in place (Fisher-Yates algorithm)
     */
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    /**
     * Get puzzle statistics
     */
    getPuzzleStats(puzzle) {
        let filledCells = 0;
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (puzzle[row][col] !== 0) filledCells++;
            }
        }
        
        return {
            filledCells,
            emptyCells: 81 - filledCells,
            difficulty: this.estimateDifficulty(filledCells)
        };
    }

    /**
     * Estimate difficulty based on number of clues
     */
    estimateDifficulty(clues) {
        if (clues >= 45) return 'easy';
        if (clues >= 35) return 'medium';
        if (clues >= 25) return 'hard';
        return 'expert';
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SudokuGenerator;
} else {
    // Make available globally in browser
    window.SudokuGenerator = SudokuGenerator;
}