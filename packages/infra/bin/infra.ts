#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { harvverseConfig, stackId } from "../lib/config";
import { EcrStack } from "../lib/ecr-stack";
import { NetworkStack } from "../lib/network-stack";

const app = new cdk.App();

const account = process.env.CDK_DEFAULT_ACCOUNT;
const region = process.env.CDK_DEFAULT_REGION ?? harvverseConfig.region;

const env =
	account && region
		? {
				account,
				region,
			}
		: undefined;

new NetworkStack(app, stackId("Network"), {
	env,
	description: "Harvverse VPC, subnets, NAT gateway, and security groups",
});

new EcrStack(app, stackId("Ecr"), {
	env,
	description: "Harvverse ECR repositories for container images",
});

cdk.Tags.of(app).add("Project", "Harvverse");
cdk.Tags.of(app).add("ManagedBy", "CDK");
