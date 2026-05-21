import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import type { Construct } from "constructs";
import { cfnExportName, harvverseConfig } from "./config";

export class NetworkStack extends cdk.Stack {
	public readonly vpc: ec2.Vpc;
	public readonly albSecurityGroup: ec2.SecurityGroup;
	public readonly ecsSecurityGroup: ec2.SecurityGroup;
	public readonly rdsSecurityGroup: ec2.SecurityGroup;
	public readonly migrationSecurityGroup: ec2.SecurityGroup;

	constructor(scope: Construct, id: string, props?: cdk.StackProps) {
		super(scope, id, props);

		this.vpc = new ec2.Vpc(this, "Vpc", {
			ipAddresses: ec2.IpAddresses.cidr(harvverseConfig.vpcCidr),
			maxAzs: harvverseConfig.maxAzs,
			natGateways: harvverseConfig.natGateways,
			subnetConfiguration: [
				{
					name: "Public",
					subnetType: ec2.SubnetType.PUBLIC,
					cidrMask: 24,
				},
				{
					name: "PrivateApp",
					subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
					cidrMask: 24,
				},
				{
					name: "PrivateData",
					subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
					cidrMask: 24,
				},
			],
		});

		this.albSecurityGroup = new ec2.SecurityGroup(this, "AlbSecurityGroup", {
			vpc: this.vpc,
			description: "ALB - HTTPS/HTTP from the internet",
			allowAllOutbound: true,
		});
		this.albSecurityGroup.addIngressRule(
			ec2.Peer.anyIpv4(),
			ec2.Port.tcp(443),
			"HTTPS",
		);
		this.albSecurityGroup.addIngressRule(
			ec2.Peer.anyIpv4(),
			ec2.Port.tcp(80),
			"HTTP redirect",
		);

		this.ecsSecurityGroup = new ec2.SecurityGroup(this, "EcsSecurityGroup", {
			vpc: this.vpc,
			description: "ECS Fargate web tasks",
			allowAllOutbound: true,
		});
		this.ecsSecurityGroup.addIngressRule(
			this.albSecurityGroup,
			ec2.Port.tcp(3000),
			"From ALB",
		);

		this.rdsSecurityGroup = new ec2.SecurityGroup(this, "RdsSecurityGroup", {
			vpc: this.vpc,
			description: "RDS PostgreSQL - private only",
			allowAllOutbound: false,
		});

		this.migrationSecurityGroup = new ec2.SecurityGroup(
			this,
			"MigrationSecurityGroup",
			{
				vpc: this.vpc,
				description: "One-off ECS migration tasks",
				allowAllOutbound: true,
			},
		);

		this.rdsSecurityGroup.addIngressRule(
			this.ecsSecurityGroup,
			ec2.Port.tcp(5432),
			"From ECS web tasks",
		);
		this.rdsSecurityGroup.addIngressRule(
			this.migrationSecurityGroup,
			ec2.Port.tcp(5432),
			"From migration tasks",
		);

		new cdk.CfnOutput(this, "VpcId", {
			value: this.vpc.vpcId,
			exportName: cfnExportName("VpcId"),
		});

		new cdk.CfnOutput(this, "PublicSubnetIds", {
			value: cdk.Fn.join(",", this.vpc.publicSubnets.map((s) => s.subnetId)),
		});

		new cdk.CfnOutput(this, "PrivateAppSubnetIds", {
			value: cdk.Fn.join(
				",",
				this.vpc.selectSubnets({
					subnetGroupName: "PrivateApp",
				}).subnetIds,
			),
		});

		new cdk.CfnOutput(this, "PrivateDataSubnetIds", {
			value: cdk.Fn.join(
				",",
				this.vpc.selectSubnets({
					subnetGroupName: "PrivateData",
				}).subnetIds,
			),
		});
	}
}
