import * as cdk from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as logs from "aws-cdk-lib/aws-logs";
import type { Construct } from "constructs";
import { cfnExportName, harvverseConfig } from "./config";

export interface PlatformStackProps extends cdk.StackProps {
	readonly vpc: ec2.IVpc;
	readonly albSecurityGroup: ec2.ISecurityGroup;
}

export class PlatformStack extends cdk.Stack {
	public readonly cluster: ecs.Cluster;
	public readonly loadBalancer: elbv2.ApplicationLoadBalancer;
	public readonly httpsListener: elbv2.ApplicationListener;
	public readonly webTargetGroup: elbv2.ApplicationTargetGroup;
	public readonly webLogGroup: logs.ILogGroup;
	public readonly migrateLogGroup: logs.ILogGroup;

	constructor(scope: Construct, id: string, props: PlatformStackProps) {
		super(scope, id, props);

		this.webLogGroup = new logs.LogGroup(this, "WebLogGroup", {
			logGroupName: harvverseConfig.webLogGroupName,
			retention: logs.RetentionDays.ONE_MONTH,
			removalPolicy: cdk.RemovalPolicy.DESTROY,
		});

		this.migrateLogGroup = new logs.LogGroup(this, "MigrateLogGroup", {
			logGroupName: harvverseConfig.migrateLogGroupName,
			retention: logs.RetentionDays.ONE_MONTH,
			removalPolicy: cdk.RemovalPolicy.DESTROY,
		});

		this.cluster = new ecs.Cluster(this, "Cluster", {
			vpc: props.vpc,
			clusterName: `${harvverseConfig.stackPrefix.toLowerCase()}-cluster`,
		});

		this.webTargetGroup = new elbv2.ApplicationTargetGroup(this, "WebTargetGroup", {
			vpc: props.vpc,
			port: 3000,
			protocol: elbv2.ApplicationProtocol.HTTP,
			targetType: elbv2.TargetType.IP,
			healthCheck: {
				path: "/api/health",
				healthyHttpCodes: "200",
				interval: cdk.Duration.seconds(30),
				timeout: cdk.Duration.seconds(5),
				healthyThresholdCount: 2,
				unhealthyThresholdCount: 3,
			},
			deregistrationDelay: cdk.Duration.seconds(30),
		});

		this.loadBalancer = new elbv2.ApplicationLoadBalancer(this, "Alb", {
			vpc: props.vpc,
			internetFacing: true,
			securityGroup: props.albSecurityGroup,
			vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
			idleTimeout: cdk.Duration.seconds(60),
		});

		const certificate = acm.Certificate.fromCertificateArn(
			this,
			"Certificate",
			harvverseConfig.acmCertificateArn,
		);

		this.httpsListener = this.loadBalancer.addListener("HttpsListener", {
			port: 443,
			protocol: elbv2.ApplicationProtocol.HTTPS,
			certificates: [certificate],
			sslPolicy: elbv2.SslPolicy.RECOMMENDED_TLS,
			defaultAction: elbv2.ListenerAction.forward([this.webTargetGroup]),
		});

		this.loadBalancer.addListener("HttpListener", {
			port: 80,
			protocol: elbv2.ApplicationProtocol.HTTP,
			defaultAction: elbv2.ListenerAction.redirect({
				protocol: "HTTPS",
				port: "443",
				permanent: true,
			}),
		});

		new cdk.CfnOutput(this, "LoadBalancerDnsName", {
			value: this.loadBalancer.loadBalancerDnsName,
			description: `Create a CNAME/ALIAS: ${harvverseConfig.domainName} → this hostname`,
		});

		new cdk.CfnOutput(this, "ApplicationUrl", {
			value: harvverseConfig.corsOrigin,
		});

		new cdk.CfnOutput(this, "ClusterName", {
			value: this.cluster.clusterName,
			exportName: cfnExportName("ClusterName"),
		});

		new cdk.CfnOutput(this, "CertificateArn", {
			value: harvverseConfig.acmCertificateArn,
		});
	}
}
