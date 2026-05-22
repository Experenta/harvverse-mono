#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { harvverseConfig, stackId } from "../lib/config";
import { CicdStack } from "../lib/cicd-stack";
import { DataStack } from "../lib/data-stack";
import { EcrStack } from "../lib/ecr-stack";
import { MigrateStack } from "../lib/migrate-stack";
import { NetworkStack } from "../lib/network-stack";
import { PlatformStack } from "../lib/platform-stack";
import { StorageStack } from "../lib/storage-stack";
import { WebStack } from "../lib/web-stack";

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

const network = new NetworkStack(app, stackId("Network"), {
	env,
	description: "Harvverse VPC, subnets, NAT gateway, and security groups",
});

const ecr = new EcrStack(app, stackId("Ecr"), {
	env,
	description: "Harvverse ECR repositories for container images",
});

const data = new DataStack(app, stackId("Data"), {
	env,
	description: "Harvverse RDS PostgreSQL and database credentials",
	vpc: network.vpc,
	rdsSecurityGroup: network.rdsSecurityGroup,
	terminationProtection: true,
});
data.addDependency(network);

const storage = new StorageStack(app, stackId("Storage"), {
	env,
	description: "Harvverse S3 bucket for farm image storage",
	terminationProtection: true,
});

const platform = new PlatformStack(app, stackId("Platform"), {
	env,
	description: "Harvverse ECS cluster and HTTPS load balancer",
	vpc: network.vpc,
	albSecurityGroup: network.albSecurityGroup,
});
platform.addDependency(network);

const web = new WebStack(app, stackId("Web"), {
	env,
	description: "Harvverse Next.js web service on ECS Fargate",
	vpc: network.vpc,
	cluster: platform.cluster,
	webTargetGroup: platform.webTargetGroup,
	ecsSecurityGroup: network.ecsSecurityGroup,
	webRepository: ecr.webRepository,
	farmImagesBucket: storage.farmImagesBucket,
	farmImagesPrefix: harvverseConfig.farmImagesPrefix,
	webLogGroup: platform.webLogGroup,
});
web.addDependency(platform);
web.addDependency(ecr);
web.addDependency(storage);
web.addDependency(data);

const migrate = new MigrateStack(app, stackId("Migrate"), {
	env,
	description: "Harvverse one-off database migration ECS task definition",
	vpc: network.vpc,
	migrationSecurityGroup: network.migrationSecurityGroup,
	migrateRepository: ecr.migrateRepository,
	migrateLogGroup: platform.migrateLogGroup,
});
migrate.addDependency(platform);
migrate.addDependency(ecr);
migrate.addDependency(data);

const githubConnectionArn = app.node.tryGetContext("githubConnectionArn") as
	| string
	| undefined;

if (githubConnectionArn) {
	const cicd = new CicdStack(app, stackId("Cicd"), {
		env,
		description:
			"Harvverse CodePipeline: GitHub main → build/migrate → ECS deploy",
		githubConnectionArn,
		webRepository: ecr.webRepository,
		migrateRepository: ecr.migrateRepository,
		cluster: platform.cluster,
		webService: web.service,
		migrateTaskDefinition: migrate.taskDefinition,
		migrateExecutionRole: migrate.executionRole,
		migrateSubnetIds: network.vpc.selectSubnets({
			subnetGroupName: "PrivateApp",
		}).subnetIds,
		migrateSecurityGroup: network.migrationSecurityGroup,
	});
	cicd.addDependency(web);
	cicd.addDependency(migrate);
} else {
	cdk.Annotations.of(app).addWarningV2(
		"Harvversev2CicdSkipped",
		"Harvversev2Cicd not synthesized — pass -c githubConnectionArn=<CodeConnections ARN> to deploy CI/CD",
	);
}

cdk.Tags.of(app).add("Project", "Harvverse");
cdk.Tags.of(app).add("ManagedBy", "CDK");
