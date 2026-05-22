import * as cdk from "aws-cdk-lib";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import * as codepipeline from "aws-cdk-lib/aws-codepipeline";
import * as codepipeline_actions from "aws-cdk-lib/aws-codepipeline-actions";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as iam from "aws-cdk-lib/aws-iam";
import type { Construct } from "constructs";
import { harvverseConfig } from "./config";

export interface CicdStackProps extends cdk.StackProps {
	readonly githubConnectionArn: string;
	readonly webRepository: ecr.IRepository;
	readonly migrateRepository: ecr.IRepository;
	readonly cluster: ecs.ICluster;
	readonly webService: ecs.FargateService;
	readonly migrateTaskDefinition: ecs.FargateTaskDefinition;
	readonly migrateExecutionRole: iam.IRole;
	readonly migrateSubnetIds: string[];
	readonly migrateSecurityGroup: ec2.ISecurityGroup;
}

export class CicdStack extends cdk.Stack {
	public readonly pipeline: codepipeline.Pipeline;
	public readonly buildProject: codebuild.PipelineProject;

	constructor(scope: Construct, id: string, props: CicdStackProps) {
		super(scope, id, props);

		const ecrRegistry = `${this.account}.dkr.ecr.${this.region}.amazonaws.com`;

		this.buildProject = new codebuild.PipelineProject(this, "WebBuildProject", {
			projectName: harvverseConfig.codeBuildProjectName,
			description:
				"Build web + migrate images, run Drizzle migrations, produce ECS deploy artifact",
			buildSpec: codebuild.BuildSpec.fromSourceFilename("buildspec.yml"),
			environment: {
				buildImage: codebuild.LinuxArmBuildImage.AMAZON_LINUX_2_STANDARD_3_0,
				computeType: codebuild.ComputeType.SMALL,
				privileged: true,
				environmentVariables: {
					AWS_DEFAULT_REGION: {
						value: this.region,
					},
					ECR_REGISTRY: {
						value: ecrRegistry,
					},
					ECR_WEB_REPOSITORY: {
						value: harvverseConfig.ecrWebRepositoryName,
					},
					ECR_MIGRATE_REPOSITORY: {
						value: harvverseConfig.ecrMigrateRepositoryName,
					},
					ECS_CLUSTER: {
						value: props.cluster.clusterName,
					},
					MIGRATE_TASK_FAMILY: {
						value: harvverseConfig.migrateTaskFamily,
					},
					MIGRATE_SUBNETS: {
						value: props.migrateSubnetIds.join(","),
					},
					MIGRATE_SECURITY_GROUP: {
						value: props.migrateSecurityGroup.securityGroupId,
					},
					ECS_CONTAINER_NAME: {
						value: "web",
					},
					NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: {
						type: codebuild.BuildEnvironmentVariableType.PARAMETER_STORE,
						value: harvverseConfig.clerkPublishableKeySsmParameter,
					},
				},
			},
		});

		props.webRepository.grantPullPush(this.buildProject);
		props.migrateRepository.grantPullPush(this.buildProject);

		this.buildProject.addToRolePolicy(
			new iam.PolicyStatement({
				actions: ["ecr:GetAuthorizationToken"],
				resources: ["*"],
			}),
		);

		this.buildProject.addToRolePolicy(
			new iam.PolicyStatement({
				actions: ["ecs:RunTask"],
				resources: ["*"],
				conditions: {
					ArnEquals: {
						"ecs:cluster": props.cluster.clusterArn,
					},
				},
			}),
		);

		this.buildProject.addToRolePolicy(
			new iam.PolicyStatement({
				actions: ["ecs:DescribeTasks", "ecs:DescribeTaskDefinition"],
				resources: ["*"],
			}),
		);

		this.buildProject.addToRolePolicy(
			new iam.PolicyStatement({
				actions: ["iam:PassRole"],
				resources: [props.migrateExecutionRole.roleArn],
			}),
		);

		this.buildProject.addToRolePolicy(
			new iam.PolicyStatement({
				actions: ["ssm:GetParameters"],
				resources: [
					`arn:aws:ssm:${this.region}:${this.account}:parameter${harvverseConfig.clerkPublishableKeySsmParameter}`,
				],
			}),
		);

		const sourceOutput = new codepipeline.Artifact("SourceOutput");
		const buildOutput = new codepipeline.Artifact("BuildOutput");

		this.pipeline = new codepipeline.Pipeline(this, "Pipeline", {
			pipelineName: harvverseConfig.codePipelineName,
			crossAccountKeys: false,
		});

		this.pipeline.addStage({
			stageName: "Source",
			actions: [
				new codepipeline_actions.CodeStarConnectionsSourceAction({
					actionName: "GitHub",
					owner: harvverseConfig.githubOwner,
					repo: harvverseConfig.githubRepo,
					branch: harvverseConfig.githubBranch,
					connectionArn: props.githubConnectionArn,
					output: sourceOutput,
				}),
			],
		});

		this.pipeline.addStage({
			stageName: "Build",
			actions: [
				new codepipeline_actions.CodeBuildAction({
					actionName: "BuildAndMigrate",
					project: this.buildProject,
					input: sourceOutput,
					outputs: [buildOutput],
				}),
			],
		});

		this.pipeline.addStage({
			stageName: "Deploy",
			actions: [
				new codepipeline_actions.EcsDeployAction({
					actionName: "DeployWeb",
					service: props.webService,
					input: buildOutput,
					deploymentTimeout: cdk.Duration.minutes(30),
				}),
			],
		});

		new cdk.CfnOutput(this, "PipelineName", {
			value: this.pipeline.pipelineName,
		});

		new cdk.CfnOutput(this, "CodeBuildProjectName", {
			value: this.buildProject.projectName,
		});

		new cdk.CfnOutput(this, "PipelineConsoleUrl", {
			value: `https://${this.region}.console.aws.amazon.com/codesuite/codepipeline/pipelines/${this.pipeline.pipelineName}/view`,
		});
	}
}
