# SUDOKOO

Interactive Sudoku game with a camera scanning feature powered by AWS Bedrock.

## What it does

Play Sudoku in the browser. The camera scan feature lets you photograph a printed puzzle — from a newspaper or book — and load it digitally. AWS Bedrock (Claude 3.5 Sonnet) reads the image and returns a structured 9x9 grid ready to play.

## Architecture

```
Browser (S3 + CloudFront)
    ↓ base64 image
API Gateway → Lambda → Amazon Bedrock (Claude 3.5 Sonnet)
    ↓ 9x9 array
Game engine (client-side validation + backtracking solver)
```

## Tech stack

- Vanilla JavaScript, HTML, CSS
- AWS Lambda (Node.js 18)
- Amazon Bedrock — Claude 3.5 Sonnet (vision)
- API Gateway
- S3 + CloudFront
- CloudFormation

## Running locally

```bash
python3 -m http.server 3000
```

## Deploying

See [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md) for full setup instructions.

Before deploying, read [TEARDOWN.md](TEARDOWN.md) — the original API Gateway had no authentication. The teardown doc covers what needs fixing before going live again.

## Project structure

```
├── sudokoo-infrastructure.yaml   # CloudFormation — all AWS resources
├── deploy.sh                     # Deployment script
├── package-lambda.sh             # Packages Lambda zip for upload
├── index.html
├── css/styles.css
├── js/
│   ├── app.js                    # UI controller, camera scan flow
│   ├── sudoku.js                 # Game engine and move validation
│   ├── generator.js              # Puzzle generation
│   └── puzzles.js                # Puzzle library
└── lambda/
    └── index.js                  # Bedrock image processing + backtracking solver
```
