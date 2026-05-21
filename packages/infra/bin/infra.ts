#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { InfraStack } from "../lib/infra-stack";

const app = new cdk.App();

const account = process.env.CDK_DEFAULT_ACCOUNT;
const region = process.env.CDK_DEFAULT_REGION;

new InfraStack(app, "HarvverseInfraStack", {
	env:
		account && region
			? {
					account,
					region,
				}
			: undefined,
	description: "Harvverse core infrastructure",
});

cdk.Tags.of(app).add("Project", "Harvverse");
cdk.Tags.of(app).add("ManagedBy", "CDK");
