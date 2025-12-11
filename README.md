# CDK Pipeline for BAPS AI Frontend

This directory contains the AWS CDK infrastructure code for deploying the BAPS AI Next.js application to S3 with CloudFront and WAF.

## Architecture

- **S3 Bucket**: Hosts static frontend files
- **CloudFront Distribution**: CDN for fast global delivery
- **WAF (Web Application Firewall)**: Global WAF for CloudFront with security rules
- **Route53**: DNS record pointing `ai.baps.org` to CloudFront
- **CodePipeline**: Automated CI/CD pipeline for deployments

## Prerequisites

1. AWS CLI configured with appropriate credentials
2. CDK CLI installed: `npm install -g aws-cdk`
3. Node.js and pnpm installed
4. GitHub repository access configured (either CodeStar Connection or GitHub token in Secrets Manager)

## Configuration

All configuration constants are in `config/constants.ts`:

- Account ID: `233573279794`
- Region: `us-east-2`
- Domain: `ai.baps.org`
- Certificate ARN: `arn:aws:acm:us-east-1:233573279794:certificate/0e958f65-072d-457f-956d-29d7bfc87a8d`
- Route53 Hosted Zone ID: `Z01857651NIQ4MOJMKDQN`

Update GitHub configuration in `config/constants.ts`:
- `GITHUB_OWNER`: Your GitHub organization/username
- `GITHUB_REPO`: Repository name
- `GITHUB_BRANCH`: Branch to trigger pipeline (default: `main`)
- `CODESTAR_CONNECTION_ARN`: Optional CodeStar Connection ARN

## Setup

1. Install CDK dependencies:
```bash
cd cdk
pnpm install
```

2. Bootstrap CDK (first time only):
```bash
cdk bootstrap aws://233573279794/us-east-2
```

3. Set up GitHub authentication (choose one):

   **Option A: CodeStar Connection (Recommended)**
   - Create a CodeStar Connection in AWS Console
   - Update `CODESTAR_CONNECTION_ARN` in `config/constants.ts`

   **Option B: GitHub Token**
   - Store GitHub personal access token in AWS Secrets Manager:
   ```bash
   aws secretsmanager create-secret \
     --name github-token \
     --secret-string '{"token":"your-github-token"}'
   ```

4. Deploy the pipeline:
```bash
cdk deploy
```

## Deployment

The pipeline automatically:
1. Builds the Next.js app (static export)
2. Deploys infrastructure (S3, CloudFront, WAF, Route53)
3. Uploads build artifacts to S3
4. Invalidates CloudFront cache

## Manual Deployment (if needed)

If you need to deploy the infrastructure stack separately:

```bash
cdk deploy BAPSAI-InfrastructureStack
```

## Useful Commands

- `cdk synth` - Synthesize CloudFormation template
- `cdk diff` - Compare deployed stack with current state
- `cdk deploy` - Deploy this stack to your default AWS account/region
- `cdk destroy` - Destroy the stack
- `cdk bootstrap` - Bootstrap CDK environment

## Stack Outputs

After deployment, the stack outputs:
- `DistributionId`: CloudFront Distribution ID
- `DistributionDomainName`: CloudFront domain name
- `BucketName`: S3 bucket name
- `WebACLArn`: WAF Web ACL ARN
- `FrontendUrl`: Production frontend URL (https://ai.baps.org)
- `CloudFrontUrl`: CloudFront distribution URL

## WAF Rules

The WAF includes:
- AWS Managed Common Rule Set
- AWS Managed Known Bad Inputs Rule Set
- AWS Managed Linux Rule Set
- Rate limiting (2000 requests per IP)

## Next.js Configuration

The Next.js app is configured for static export in `next.config.ts`:
- `output: 'export'` - Enables static export
- `images.unoptimized: true` - Required for static export
- `trailingSlash: true` - Recommended for S3 hosting

## Troubleshooting

1. **Certificate not found**: Ensure the certificate exists in `us-east-1` (required for CloudFront)

2. **Route53 record fails**: Verify the hosted zone ID is correct and you have permissions

3. **Build fails**: Check that Next.js is configured for static export and all environment variables are set

4. **WAF association fails**: Ensure the WAF is created in CloudFront scope (global)

