import * as cdk from 'aws-cdk-lib';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as pipelines from 'aws-cdk-lib/pipelines';
import { Construct } from 'constructs';
import {
  CDK_GITHUB_BRANCH,
  CDK_GITHUB_REPO,
  CODESTAR_CONNECTION_ARN,
  FRONTEND_GITHUB_BRANCH,
  FRONTEND_GITHUB_REPO,
  GITHUB_OWNER,
  PIPELINE_NAME,
} from './config/constants';
import { InfrastructureStack } from './infrastructure-stack';


export class PipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Source stages: Connect to GitHub repositories via CodeStar Connections
    // CDK source (this repository)
    const cdkSource = pipelines.CodePipelineSource.connection(
      `${GITHUB_OWNER}/${CDK_GITHUB_REPO}`,
      CDK_GITHUB_BRANCH,
      {
        connectionArn: CODESTAR_CONNECTION_ARN,
      }
    );

    // Frontend source (separate repository)
    const frontendSource = pipelines.CodePipelineSource.connection(
      `${GITHUB_OWNER}/${FRONTEND_GITHUB_REPO}`,
      FRONTEND_GITHUB_BRANCH,
      {
        connectionArn: CODESTAR_CONNECTION_ARN,
      }
    );

    // CloudWatch log group for CodeBuild logs with one month retention
    const codeBuildLogGroup = new logs.LogGroup(this, 'CodeBuildLogs', {
      logGroupName: `/aws/codebuild/${PIPELINE_NAME}`,
      retention: logs.RetentionDays.ONE_MONTH,
    });

    // Create pipeline
    const pipeline = new pipelines.CodePipeline(this, 'BAPSAI-Frontend-Pipeline', {
      pipelineName: PIPELINE_NAME,
      pipelineType: codepipeline.PipelineType.V2,
      synth: new pipelines.ShellStep('Synth', {
        input: cdkSource,
        installCommands: [
          'npm ci',
        ],
        commands: [
          'npx cdk synth',
        ],
        primaryOutputDirectory: 'cdk.out',
      }),
      codeBuildDefaults: {
        buildEnvironment: {
          buildImage: codebuild.LinuxArmBuildImage.AMAZON_LINUX_2023_STANDARD_3_0,
        },
        logging: {
          cloudWatch: {
            logGroup: codeBuildLogGroup,
          },
        },
        rolePolicy: [
          new iam.PolicyStatement({
            actions: [
              'secretsmanager:GetSecretValue',
              'secretsmanager:DescribeSecret',
            ],
            resources: ['*'],
          }),
        ],
      },
      // Enable cross-account keys for v2
      crossAccountKeys: false,
    });

    // Create build step for Next.js app
    const buildStep = new pipelines.CodeBuildStep('BuildFrontendArtifacts', {
      input: frontendSource,
        buildEnvironment: {
          buildImage: codebuild.LinuxArmBuildImage.AMAZON_LINUX_2023_STANDARD_3_0,
        },
      installCommands: [
        'npm ci',
      ],
      commands: [
        'echo "Building Next.js app..."',
        'npm run build',
        'echo "Preparing artifacts..."',
        'mkdir -p build-output',
        // Next.js static export outputs to 'out' directory
        'if [ -d ".next/out" ]; then cp -r .next/out/* build-output/; fi',
        'if [ -d "out" ]; then cp -r out/* build-output/; fi',
        'if [ -d "dist" ]; then cp -r dist/* build-output/; fi',
        'echo "Build artifacts prepared"',
      ],
      primaryOutputDirectory: 'build-output',
      rolePolicyStatements: [
        new iam.PolicyStatement({
          actions: ['ssm:GetParameter', 'ssm:GetParameters'],
          resources: ['*'],
        }),
      ],
    });

    // Add deployment stage - infrastructure is provisioned first
    const deployStageInstance = new DeployStage(this, 'Deploy', {});
    const deployStage = pipeline.addStage(deployStageInstance);

    // Deploy build artifacts to S3 and invalidate CloudFront
    // Following baps-ai-admin-cdk pattern: use CodeBuild steps with AWS CLI
    if (buildStep.primaryOutput) {
      const publishFrontendStep = new pipelines.CodeBuildStep('PublishFrontendArtifacts', {
        input: buildStep.primaryOutput,
        envFromCfnOutputs: {
          FRONTEND_BUCKET_NAME: deployStageInstance.infrastructureStack.bucketNameOutput,
          CLOUDFRONT_DISTRIBUTION_ID: deployStageInstance.infrastructureStack.distributionIdOutput,
        },
        commands: [
          'ls -al',
          'echo "Syncing to bucket: $FRONTEND_BUCKET_NAME"',
          `export AWS_REGION=${this.region}`,
          // Sync frontend files to S3 bucket
          'aws s3 sync . s3://$FRONTEND_BUCKET_NAME --region $AWS_REGION --delete --exact-timestamps',
          // Invalidate CloudFront cache to serve new content
          'aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_DISTRIBUTION_ID --paths "/*" --region $AWS_REGION',
        ],
        rolePolicyStatements: [
          new iam.PolicyStatement({
            actions: ['s3:PutObject', 's3:DeleteObject', 's3:ListBucket', 's3:GetObject'],
            resources: ['arn:aws:s3:::*', 'arn:aws:s3:::*/*'],
          }),
          new iam.PolicyStatement({
            actions: ['cloudfront:CreateInvalidation'],
            resources: ['*'],
          }),
        ],
        buildEnvironment: {
          buildImage: codebuild.LinuxArmBuildImage.AMAZON_LINUX_2023_STANDARD_3_0,
        },
      });
      deployStage.addPost(publishFrontendStep);
    }

    // Add build step as pre-deploy step
    deployStage.addPre(buildStep);

    // Build the pipeline to access underlying resources
    pipeline.buildPipeline();

    // Output pipeline URL
    new cdk.CfnOutput(this, 'PipelineUrl', {
      value: `https://${this.region}.console.aws.amazon.com/codesuite/codepipeline/pipelines/${pipeline.pipeline.pipelineName}/view`,
      description: 'CodePipeline Console URL',
    });
  }
}

// Deploy stage
class DeployStage extends cdk.Stage {
  public readonly infrastructureStack: InfrastructureStack;

  constructor(
    scope: Construct,
    id: string,
    props?: cdk.StageProps
  ) {
    super(scope, id, props);

    this.infrastructureStack = new InfrastructureStack(this, 'Infrastructure');
  }
}

