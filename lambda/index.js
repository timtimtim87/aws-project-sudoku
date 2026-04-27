const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");

const bedrockClient = new BedrockRuntimeClient({
    region: process.env.AWS_REGION || 'us-east-1'
});

exports.handler = async (event) => {
    try {
        const imageData = extractImageFromEvent(event);

        if (!imageData) {
            return createErrorResponse(400, 'No image data provided');
        }

        const analysisResult = await analyzeImageWithBedrock(imageData);
        const validation = validateAndSolvePuzzle(analysisResult.puzzle);

        if (!validation.isValid) {
            return createErrorResponse(400, validation.error || 'Invalid puzzle detected');
        }

        return createSuccessResponse({
            success: true,
            puzzle: analysisResult.puzzle,
            solution: validation.solution,
            metadata: {
                confidence: analysisResult.confidence || 'high',
                processingTime: Date.now() - (event.requestTime || Date.now()),
                detectionMethod: 'bedrock-claude-vision'
            }
        });

    } catch (error) {
        console.error('Error processing image:', error);
        return createErrorResponse(500, 'Image processing failed: ' + error.message);
    }
};

function extractImageFromEvent(event) {
    try {
        if (!event.body) return null;

        const boundary = event.headers['content-type']?.split('boundary=')[1];
        if (boundary && event.isBase64Encoded) {
            const body = Buffer.from(event.body, 'base64').toString();
            const imageMatch = body.match(/Content-Type: image\/[^\r\n]*\r\n\r\n([^\r\n]*)/);
            if (imageMatch) return imageMatch[1];
        }

        const parsedBody = JSON.parse(event.body);
        return parsedBody.image || null;

    } catch (error) {
        console.error('Error extracting image:', error);
        return null;
    }
}

async function analyzeImageWithBedrock(imageBase64) {
    const prompt = `Analyze this Sudoku puzzle image very carefully. Look for a 9x9 grid with numbers 1-9.

Return ONLY a JSON object in this exact format:
{
    "puzzle": [
        [0,5,0,1,0,0,0,0,9],
        [0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0]
    ],
    "confidence": "high"
}

Where:
- 0 = empty cell
- 1-9 = the number you see in that cell
- Be very careful about row and column positions
- Only return valid JSON, no other text
- If you can't clearly read a number, use 0`;

    const command = new InvokeModelCommand({
        modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
        contentType: "application/json",
        body: JSON.stringify({
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 2000,
            messages: [{
                role: "user",
                content: [
                    { type: "text", text: prompt },
                    {
                        type: "image",
                        source: { type: "base64", media_type: "image/jpeg", data: imageBase64 }
                    }
                ]
            }]
        })
    });

    const response = await bedrockClient.send(command);
    const result = JSON.parse(new TextDecoder().decode(response.body));

    let responseText = result.content[0].text;
    // Claude sometimes wraps JSON in markdown code fences
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    const parsedResult = JSON.parse(responseText);

    if (!parsedResult.puzzle || !Array.isArray(parsedResult.puzzle)) {
        throw new Error('Invalid response structure from Bedrock');
    }

    if (parsedResult.puzzle.length !== 9 || !parsedResult.puzzle.every(row => Array.isArray(row) && row.length === 9)) {
        throw new Error('Invalid puzzle dimensions from Bedrock');
    }

    return parsedResult;
}

function validateAndSolvePuzzle(puzzle) {
    try {
        if (!puzzle || !Array.isArray(puzzle) || puzzle.length !== 9) {
            return { isValid: false, error: 'Invalid puzzle format' };
        }

        for (let row = 0; row < 9; row++) {
            if (!Array.isArray(puzzle[row]) || puzzle[row].length !== 9) {
                return { isValid: false, error: 'Invalid puzzle row format' };
            }

            for (let col = 0; col < 9; col++) {
                const val = puzzle[row][col];
                if (!Number.isInteger(val) || val < 0 || val > 9) {
                    return { isValid: false, error: 'Invalid cell value' };
                }
            }
        }

        if (!isValidPuzzleState(puzzle)) {
            return { isValid: false, error: 'Puzzle has conflicts' };
        }

        const solution = solvePuzzle(puzzle.map(row => [...row]));

        if (!solution) {
            return { isValid: false, error: 'Puzzle has no valid solution' };
        }

        return { isValid: true, solution };

    } catch (error) {
        return { isValid: false, error: `Validation failed: ${error.message}` };
    }
}

function isValidPuzzleState(grid) {
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            const num = grid[row][col];
            if (num !== 0) {
                // Temporarily clear the cell to check whether its own placement is valid
                grid[row][col] = 0;
                const valid = isValidMove(grid, row, col, num);
                grid[row][col] = num;
                if (!valid) return false;
            }
        }
    }
    return true;
}

function solvePuzzle(grid) {
    return solveRecursive(grid) ? grid : null;
}

function solveRecursive(grid) {
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (grid[row][col] === 0) {
                for (let num = 1; num <= 9; num++) {
                    if (isValidMove(grid, row, col, num)) {
                        grid[row][col] = num;
                        if (solveRecursive(grid)) return true;
                        grid[row][col] = 0;
                    }
                }
                return false;
            }
        }
    }
    return true;
}

function isValidMove(grid, row, col, num) {
    for (let x = 0; x < 9; x++) {
        if (grid[row][x] === num || grid[x][col] === num) return false;
    }

    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;

    for (let i = boxRow; i < boxRow + 3; i++) {
        for (let j = boxCol; j < boxCol + 3; j++) {
            if (grid[i][j] === num) return false;
        }
    }

    return true;
}

function createResponse(statusCode, data) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        },
        body: JSON.stringify(data)
    };
}

function createSuccessResponse(data) {
    return createResponse(200, data);
}

function createErrorResponse(statusCode, message) {
    return createResponse(statusCode, { success: false, error: message });
}
