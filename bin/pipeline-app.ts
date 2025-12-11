#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { PipelineStack } from '../pipeline-stack';
import {
  PIPELINE_STACK_NAME,
  ACCOUNT_ID,
  REGION,
} from '../config/constants';

const app = new cdk.App();

new PipelineStack(app, PIPELINE_STACK_NAME, {
  env: {
    account: ACCOUNT_ID,
    region: REGION,
  },
  description: 'Pipeline for BAPS AI Frontend',
});

app.synth();

