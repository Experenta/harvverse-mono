import * as cdk from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { harvverseConfig } from "../lib/config";
import { CicdStack } from "../lib/cicd-stack";
import { DataStack } from "../lib/data-stack";
import { EcrStack } from "../lib/ecr-stack";
import { MigrateStack } from "../lib/migrate-stack";
import { NetworkStack } from "../lib/network-stack";
import { PlatformStack } from "../lib/platform-stack";
import { StorageStack } from "../lib/storage-stack";
import { WebStack } from "../lib/web-stack";

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
	test("creates web and migrate repositories with scan on push", () => {
		const app = new cdk.App();
		const stack = new EcrStack(app, "TestEcr");
		const template = Template.fromStack(stack);

		template.resourceCountIs("AWS::ECR::Repository", 2);
		template.hasResourceProperties("AWS::ECR::Repository", {
			RepositoryName: "harvverse/web",
			ImageScanningConfiguration: {
				ScanOnPush: true,
			},
		});
		template.hasResourceProperties("AWS::ECR::Repository", {
			RepositoryName: "harvverse/migrate",
		});
	});
});

describe("PlatformStack", () => {
	test("creates HTTPS and HTTP redirect listeners with ACM certificate", () => {
		const app = new cdk.App();
		const network = new NetworkStack(app, "TestNetworkForPlatform");
		const stack = new PlatformStack(app, "TestPlatform", {
			vpc: network.vpc,
			albSecurityGroup: network.albSecurityGroup,
		});
		const template = Template.fromStack(stack);

		template.resourceCountIs("AWS::ElasticLoadBalancingV2::LoadBalancer", 1);
		template.resourceCountIs("AWS::ECS::Cluster", 1);
		template.hasResourceProperties("AWS::ElasticLoadBalancingV2::Listener", {
			Port: 443,
			Protocol: "HTTPS",
			Certificates: [
				{
					CertificateArn: Match.stringLikeRegexp(
						"1318b7d2-f7b2-4849-a7d2-cc320e3b0d3d",
					),
				},
			],
		});
		template.hasResourceProperties("AWS::ElasticLoadBalancingV2::Listener", {
			Port: 80,
			Protocol: "HTTP",
		});
	});
});

describe("DataStack", () => {
	test("creates MVP-sized PostgreSQL instance with generated secret", () => {
		const app = new cdk.App();
		const network = new NetworkStack(app, "TestNetworkForData");
		const stack = new DataStack(app, "TestData", {
			vpc: network.vpc,
			rdsSecurityGroup: network.rdsSecurityGroup,
		});
		const template = Template.fromStack(stack);

		template.resourceCountIs("AWS::RDS::DBInstance", 1);
		template.hasResourceProperties("AWS::RDS::DBInstance", {
			DBInstanceClass: "db.t4g.micro",
			AllocatedStorage: "20",
			StorageType: "gp3",
			MultiAZ: false,
			PubliclyAccessible: false,
			StorageEncrypted: true,
			EnablePerformanceInsights: false,
			BackupRetentionPeriod: 1,
		});
		template.hasResourceProperties("AWS::SecretsManager::Secret", {
			Name: "harvverse/prod/database",
		});
	});
});

describe("MigrateStack", () => {
	test("creates Fargate migration task with DATABASE_URL secret", () => {
		const app = new cdk.App();
		const network = new NetworkStack(app, "TestNetworkForMigrate");
		const ecr = new EcrStack(app, "TestEcrForMigrate");
		const platform = new PlatformStack(app, "TestPlatformForMigrate", {
			vpc: network.vpc,
			albSecurityGroup: network.albSecurityGroup,
		});
		const stack = new MigrateStack(app, "TestMigrate", {
			vpc: network.vpc,
			migrationSecurityGroup: network.migrationSecurityGroup,
			migrateRepository: ecr.migrateRepository,
			migrateLogGroup: platform.migrateLogGroup,
		});
		const template = Template.fromStack(stack);

		template.hasResourceProperties("AWS::ECS::TaskDefinition", {
			Family: harvverseConfig.migrateTaskFamily,
			Cpu: String(harvverseConfig.migrateTaskCpu),
			Memory: String(harvverseConfig.migrateTaskMemoryMiB),
			RequiresCompatibilities: ["FARGATE"],
			NetworkMode: "awsvpc",
			RuntimePlatform: {
				CpuArchitecture: "ARM64",
			},
		});

		template.hasResourceProperties("AWS::ECS::TaskDefinition", {
			ContainerDefinitions: Match.arrayWith([
				Match.objectLike({
					Name: "migrate",
					Secrets: Match.arrayWith([
						Match.objectLike({
							Name: "DATABASE_URL",
						}),
					]),
				}),
			]),
		});
	});
});

describe("StorageStack", () => {
	test("creates private encrypted farm images bucket", () => {
		const app = new cdk.App();
		const stack = new StorageStack(app, "TestStorage");
		const template = Template.fromStack(stack);

		template.resourceCountIs("AWS::S3::Bucket", 1);
		template.hasResourceProperties("AWS::S3::Bucket", {
			BucketEncryption: {
				ServerSideEncryptionConfiguration: [
					{
						ServerSideEncryptionByDefault: {
							SSEAlgorithm: "AES256",
						},
					},
				],
			},
			PublicAccessBlockConfiguration: {
				BlockPublicAcls: true,
				BlockPublicPolicy: true,
				IgnorePublicAcls: true,
				RestrictPublicBuckets: true,
			},
		});
	});
});

describe("CicdStack", () => {
	test("creates CodePipeline with build and ECS deploy stages", () => {
		const app = new cdk.App();
		const network = new NetworkStack(app, "TestNetworkForCicd");
		const ecrStack = new EcrStack(app, "TestEcrForCicd");
		const platform = new PlatformStack(app, "TestPlatformForCicd", {
			vpc: network.vpc,
			albSecurityGroup: network.albSecurityGroup,
		});
		const storage = new StorageStack(app, "TestStorageForCicd");
		const web = new WebStack(app, "TestWebForCicd", {
			vpc: network.vpc,
			cluster: platform.cluster,
			webTargetGroup: platform.webTargetGroup,
			ecsSecurityGroup: network.ecsSecurityGroup,
			webRepository: ecrStack.webRepository,
			farmImagesBucket: storage.farmImagesBucket,
			webLogGroup: platform.webLogGroup,
		});
		const migrate = new MigrateStack(app, "TestMigrateForCicd", {
			vpc: network.vpc,
			migrationSecurityGroup: network.migrationSecurityGroup,
			migrateRepository: ecrStack.migrateRepository,
			migrateLogGroup: platform.migrateLogGroup,
		});

		const stack = new CicdStack(app, "TestCicd", {
			githubConnectionArn:
				"arn:aws:codestar-connections:us-east-2:500501923704:connection/test",
			webRepository: ecrStack.webRepository,
			migrateRepository: ecrStack.migrateRepository,
			cluster: platform.cluster,
			webService: web.service,
			migrateTaskDefinition: migrate.taskDefinition,
			migrateExecutionRole: migrate.executionRole,
			migrateSubnetIds: network.vpc.selectSubnets({
				subnetGroupName: "PrivateApp",
			}).subnetIds,
			migrateSecurityGroup: network.migrationSecurityGroup,
		});
		const template = Template.fromStack(stack);

		template.resourceCountIs("AWS::CodePipeline::Pipeline", 1);
		template.resourceCountIs("AWS::CodeBuild::Project", 1);
		template.hasResourceProperties("AWS::CodeBuild::Project", {
			Name: harvverseConfig.codeBuildProjectName,
			Environment: {
				PrivilegedMode: true,
				Type: "ARM_CONTAINER",
			},
		});
	});
});
