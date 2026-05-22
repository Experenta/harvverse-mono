import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import type { Construct } from "constructs";
import { harvverseConfig } from "./config";

const fargateRuntimePlatform = {
	cpuArchitecture:
		harvverseConfig.fargateCpuArchitecture === "ARM64"
			? ecs.CpuArchitecture.ARM64
			: ecs.CpuArchitecture.X86_64,
	operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
};

export interface WebStackProps extends cdk.StackProps {
	readonly vpc: ec2.IVpc;
	readonly cluster: ecs.ICluster;
	readonly webTargetGroup: elbv2.IApplicationTargetGroup;
	readonly ecsSecurityGroup: ec2.ISecurityGroup;
	readonly webRepository: ecr.IRepository;
	readonly farmImagesBucket: s3.IBucket;
	readonly farmImagesPrefix?: string;
	readonly webLogGroup: logs.ILogGroup;
}

export class WebStack extends cdk.Stack {
	public readonly service: ecs.FargateService;

	constructor(scope: Construct, id: string, props: WebStackProps) {
		super(scope, id, props);

		const farmImagesPrefix =
			props.farmImagesPrefix ?? harvverseConfig.farmImagesPrefix;

		const databaseSecret = secretsmanager.Secret.fromSecretNameV2(
			this,
			"DatabaseSecret",
			harvverseConfig.databaseSecretName,
		);
		const clerkSecret = secretsmanager.Secret.fromSecretNameV2(
			this,
			"ClerkSecret",
			harvverseConfig.clerkSecretName,
		);

		const executionRole = new iam.Role(this, "ExecutionRole", {
			assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
			managedPolicies: [
				iam.ManagedPolicy.fromAwsManagedPolicyName(
					"service-role/AmazonECSTaskExecutionRolePolicy",
				),
			],
		});
		databaseSecret.grantRead(executionRole);
		clerkSecret.grantRead(executionRole);

		const taskRole = new iam.Role(this, "TaskRole", {
			assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
		});
		props.farmImagesBucket.grantReadWrite(
			taskRole,
			`${farmImagesPrefix}/*`,
		);

		const taskDefinition = new ecs.FargateTaskDefinition(this, "WebTask", {
			family: `${harvverseConfig.stackPrefix.toLowerCase()}-web`,
			cpu: harvverseConfig.fargateCpu,
			memoryLimitMiB: harvverseConfig.fargateMemoryMiB,
			runtimePlatform: fargateRuntimePlatform,
			executionRole,
			taskRole,
		});

		taskDefinition.addContainer("web", {
			image: ecs.ContainerImage.fromEcrRepository(
				props.webRepository,
				harvverseConfig.webImageTag,
			),
			logging: ecs.LogDrivers.awsLogs({
				logGroup: props.webLogGroup,
				streamPrefix: "web",
			}),
			portMappings: [{ containerPort: 3000 }],
			environment: {
				NODE_ENV: "production",
				PORT: "3000",
				CORS_ORIGIN: harvverseConfig.corsOrigin,
				AWS_REGION: this.region,
				S3_FARM_IMAGES_BUCKET: props.farmImagesBucket.bucketName,
				S3_FARM_IMAGES_PREFIX: farmImagesPrefix,
				S3_SIGNED_URL_TTL_SECONDS: harvverseConfig.s3SignedUrlTtlSeconds,
			},
			secrets: {
				DATABASE_URL: ecs.Secret.fromSecretsManager(
					databaseSecret,
					"DATABASE_URL",
				),
				CLERK_SECRET_KEY: ecs.Secret.fromSecretsManager(
					clerkSecret,
					"CLERK_SECRET_KEY",
				),
			},
			// ALB target group checks /api/health; avoid duplicate ECS checks that can flake in Fargate.
		});

		this.service = new ecs.FargateService(this, "WebService", {
			cluster: props.cluster,
			taskDefinition,
			desiredCount: harvverseConfig.fargateDesiredCount,
			assignPublicIp: false,
			vpcSubnets: {
				subnetGroupName: "PrivateApp",
			},
			securityGroups: [props.ecsSecurityGroup],
			circuitBreaker: { rollback: true },
			minHealthyPercent: 0,
			maxHealthyPercent: 100,
			healthCheckGracePeriod: cdk.Duration.seconds(120),
		});

		this.service.attachToApplicationTargetGroup(props.webTargetGroup);

		new cdk.CfnOutput(this, "WebServiceName", {
			value: this.service.serviceName,
		});

		new cdk.CfnOutput(this, "HealthCheckUrl", {
			value: `${harvverseConfig.corsOrigin}/api/health`,
		});
	}
}
