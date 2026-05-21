import * as cdk from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { EcrStack } from "../lib/ecr-stack";
import { NetworkStack } from "../lib/network-stack";

describe("NetworkStack", () => {
	test("creates VPC with public, app, and data subnets", () => {
		const app = new cdk.App();
		const stack = new NetworkStack(app, "TestNetwork");
		const template = Template.fromStack(stack);

		template.resourceCountIs("AWS::EC2::VPC", 1);
		template.resourceCountIs("AWS::EC2::NatGateway", 1);
		template.hasResourceProperties("AWS::EC2::VPC", {
			CidrBlock: "10.0.0.0/16",
		});
		template.resourceCountIs("AWS::EC2::SecurityGroup", 4);
	});

	test("RDS security group allows PostgreSQL from ECS and migration", () => {
		const app = new cdk.App();
		const stack = new NetworkStack(app, "TestNetwork");
		const template = Template.fromStack(stack);

		template.hasResourceProperties("AWS::EC2::SecurityGroup", {
			GroupDescription: "RDS PostgreSQL - private only",
		});

		template.hasResourceProperties("AWS::EC2::SecurityGroupIngress", {
			FromPort: 5432,
			ToPort: 5432,
			IpProtocol: "tcp",
		});
	});
});

describe("EcrStack", () => {
	test("creates web repository with scan on push and lifecycle rule", () => {
		const app = new cdk.App();
		const stack = new EcrStack(app, "TestEcr");
		const template = Template.fromStack(stack);

		template.hasResourceProperties("AWS::ECR::Repository", {
			RepositoryName: "harvverse/web",
			ImageScanningConfiguration: {
				ScanOnPush: true,
			},
			LifecyclePolicy: Match.objectLike({
				LifecyclePolicyText: Match.stringLikeRegexp("imageCountMoreThan"),
			}),
		});
	});
});
