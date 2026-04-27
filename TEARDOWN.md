# Infrastructure Teardown — April 2026

## What Was Removed

All AWS infrastructure for SUDOKOO was torn down on 27 April 2026. The following resource types were deleted (us-east-1):

| Resource | Name |
|---|---|
| API Gateway | `sudokoo-api-prod` |
| Lambda Function | `sudokoo-scanner-prod` |
| CloudFront Distribution | `sudokoo` distribution |
| S3 Bucket | `sudokoo-website-prod-<account-id>` |
| CloudFormation Stack | `sudokoo-infrastructure` |

All local code is intact. Nothing in this repository was modified.

---

## Why It Was Torn Down

The API Gateway endpoint had no authentication (`AuthorizationType: NONE`). The live URL was hardcoded in `js/app.js`, meaning anyone who viewed the page source could find it and call it directly — bypassing CORS entirely via curl or any server-side HTTP client.

Each call to the `/scan-sudoku` endpoint invoked Claude 3.5 Sonnet via AWS Bedrock at ~$0.007 per request, with no rate limiting per caller and no WAF in place. There was no mechanism to block or detect abuse.

The infrastructure was a portfolio project with no active users, so the risk outweighed the benefit of keeping it live.

---

## What You Have Locally

Everything needed to rebuild is in this repo:

- `sudokoo-infrastructure.yaml` — CloudFormation template for all AWS resources
- `js/app.js` — frontend app including the camera scan feature
- `lambda/index.js` — Lambda function that calls Bedrock
- `lambda/package.json` — Lambda dependencies
- `index.html` / `css/styles.css` — full frontend
- `deploy.sh` — deployment script
- `package-lambda.sh` — packages the Lambda zip for upload

---

## How to Rebuild

### Prerequisites
- AWS CLI configured with credentials for the target account
- An AWS account with Bedrock access and Claude 3.5 Sonnet enabled in `us-east-1`
- Node.js (for packaging the Lambda)

### Step 1 — Add API authentication (do this before deploying)

The original infrastructure had no API key. Before redeploying, add a usage plan and API key to `sudokoo-infrastructure.yaml`. In the `ScanSudokuMethod` resource, change:

```yaml
AuthorizationType: 'NONE'
```

to:

```yaml
AuthorizationType: 'API_KEY'
ApiKeyRequired: true
```

Then add these resources to the template:

```yaml
ApiKey:
  Type: 'AWS::ApiGateway::ApiKey'
  Properties:
    Name: !Sub '${ProjectName}-api-key-${Environment}'
    Enabled: true

UsagePlan:
  Type: 'AWS::ApiGateway::UsagePlan'
  DependsOn: ApiDeployment
  Properties:
    UsagePlanName: !Sub '${ProjectName}-usage-plan-${Environment}'
    ApiStages:
      - ApiId: !Ref ApiGateway
        Stage: !Ref Environment
    Throttle:
      RateLimit: 10
      BurstLimit: 5

UsagePlanKey:
  Type: 'AWS::ApiGateway::UsagePlanKey'
  Properties:
    KeyId: !Ref ApiKey
    KeyType: API_KEY
    UsagePlanId: !Ref UsagePlan
```

Update the frontend in `js/app.js` to send the key in the request header:

```javascript
headers: {
    'Content-Type': 'application/json',
    'x-api-key': '<your-api-key-value>'
}
```

### Step 2 — Deploy the CloudFormation stack

```bash
aws cloudformation create-stack \
  --stack-name sudokoo-infrastructure \
  --template-body file://sudokoo-infrastructure.yaml \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1
```

### Step 3 — Package and upload the Lambda

```bash
bash package-lambda.sh
aws lambda update-function-code \
  --function-name sudokoo-scanner-prod \
  --zip-file fileb://lambda-package/function.zip \
  --region us-east-1
```

### Step 4 — Upload the frontend to S3

Get the bucket name from the stack outputs, then:

```bash
aws s3 sync . s3://<bucket-name> \
  --exclude "*" \
  --include "index.html" \
  --include "error.html" \
  --include "css/*" \
  --include "js/*"
```

### Step 5 — Retrieve the live URL

```bash
aws cloudformation describe-stacks \
  --stack-name sudokoo-infrastructure \
  --query 'Stacks[0].Outputs[?OutputKey==`WebsiteURL`].OutputValue' \
  --output text
```

