/**
 * CDK Pipeline Constants
 * Centralized configuration for BAPS AI deployment
 */

// AWS Account Configuration
export const ACCOUNT_ID = '233573279794';
export const REGION = 'us-east-2';

// Domain Configuration
export const DOMAIN_NAME = 'ai.baps.org';
export const HOSTED_ZONE_ID = 'Z01857651NIQ4MOJMKDQN';

// SSL Certificate (must be in us-east-1 for CloudFront)
export const CERTIFICATE_ARN = 'arn:aws:acm:us-east-1:233573279794:certificate/0e958f65-072d-457f-956d-29d7bfc87a8d';

// GitHub Configuration
export const GITHUB_OWNER = 'bai376';
export const CDK_GITHUB_REPO = 'baps-ai-frontend-cdk'; // CDK repository
export const CDK_GITHUB_BRANCH = 'main';
export const CODESTAR_CONNECTION_ARN = 'arn:aws:codeconnections:us-east-2:233573279794:connection/319525b1-bfa9-45b9-bc7e-220786d55e1f';

// Frontend Source Repository Configuration
export const FRONTEND_GITHUB_REPO = 'baps-ai-frontend'; // Frontend source code repository
export const FRONTEND_GITHUB_BRANCH = 'main';

// Stack Names
export const PIPELINE_STACK_NAME = 'BAPSAI-FE-PipelineStack';
export const INFRASTRUCTURE_STACK_NAME = 'BAPSAI-FE-InfrastructureStack';

// Resource Names
export const PIPELINE_NAME = 'BAPSAI-Frontend';
export const BUCKET_NAME_PREFIX = 'baps-ai-frontend';
export const WAF_NAME = 'BAPSAI-Frontend-CloudFront-WebACL';
