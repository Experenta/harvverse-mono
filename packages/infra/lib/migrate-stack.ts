import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
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

export interface MigrateStackProps extends cdk.StackProps {
	readonly vpc: ec2.IVpc;
	readonly migrationSecurityGroup: ec2.ISecurityGroup;
	readonly migrateRepository: ecr.IRepository;
	readonly migrateLogGroup: logs.ILogGroup;
}

export class MigrateStack extends cdk.Stack {
	public readonly taskDefinition: ecs.FargateTaskDefinition;
	public readonly executionRole: iam.Role;

	constructor(scope: Construct, id: string, props: MigrateStackProps) {
		super(scope, id, props);

		const databaseSecret = secretsmanager.Secret.fromSecretNameV2(
			this,
			"DatabaseSecret",
			harvverseConfig.databaseSecretName,
		);

		this.executionRole = new iam.Role(this, "ExecutionRole", {
			assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
			managedPolicies: [
				iam.ManagedPolicy.fromAwsManagedPolicyName(
					"service-role/AmazonECSTaskExecutionRolePolicy",
				),
			],
		});
		databaseSecret.grantRead(this.executionRole);

		this.taskDefinition = new ecs.FargateTaskDefinition(this, "MigrateTask", {
			family: harvverseConfig.migrateTaskFamily,
			cpu: harvverseConfig.migrateTaskCpu,
			memoryLimitMiB: harvverseConfig.migrateTaskMemoryMiB,
			runtimePlatform: fargateRuntimePlatform,
			executionRole: this.executionRole,
		});

		this.taskDefinition.addContainer("migrate", {
			image: ecs.ContainerImage.fromEcrRepository(
				props.migrateRepository,
				harvverseConfig.migrateImageTag,
			),
			logging: ecs.LogDrivers.awsLogs({
				logGroup: props.migrateLogGroup,
				streamPrefix: "migrate",
			}),
			secrets: {
				DATABASE_URL: ecs.Secret.fromSecretsManager(
					databaseSecret,
					"DATABASE_URL",
				),
			},
		});

		new cdk.CfnOutput(this, "MigrateTaskDefinitionArn", {
			value: this.taskDefinition.taskDefinitionArn,
		});

		new cdk.CfnOutput(this, "MigrateTaskDefinitionFamily", {
			value: this.taskDefinition.family,
		});

		new cdk.CfnOutput(this, "MigratePrivateSubnetIds", {
			value: cdk.Fn.join(
				",",
				props.vpc.selectSubnets({ subnetGroupName: "PrivateApp" }).subnetIds,
			),
			description: "Subnets for aws ecs run-task network configuration",
		});

		new cdk.CfnOutput(this, "MigrateSecurityGroupId", {
			value: props.migrationSecurityGroup.securityGroupId,
		});
	}
}
