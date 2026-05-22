import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import type { Construct } from "constructs";
import { harvverseConfig } from "./config";

export interface DataStackProps extends cdk.StackProps {
	readonly vpc: ec2.IVpc;
	readonly rdsSecurityGroup: ec2.ISecurityGroup;
}

export class DataStack extends cdk.Stack {
	public readonly database: rds.DatabaseInstance;
	public readonly databaseSecret: secretsmanager.Secret;

	constructor(scope: Construct, id: string, props: DataStackProps) {
		super(scope, id, props);

		this.databaseSecret = new secretsmanager.Secret(this, "DatabaseSecret", {
			secretName: harvverseConfig.databaseSecretName,
			generateSecretString: {
				secretStringTemplate: JSON.stringify({
					username: harvverseConfig.databaseUsername,
				}),
				generateStringKey: "password",
				excludeCharacters: '"@/\\',
			},
		});

		this.database = new rds.DatabaseInstance(this, "Database", {
			engine: rds.DatabaseInstanceEngine.postgres({
				version: rds.PostgresEngineVersion.VER_16,
			}),
			instanceType: ec2.InstanceType.of(
				ec2.InstanceClass.T4G,
				ec2.InstanceSize.MICRO,
			),
			vpc: props.vpc,
			vpcSubnets: {
				subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
			},
			securityGroups: [props.rdsSecurityGroup],
			credentials: rds.Credentials.fromSecret(
				this.databaseSecret,
				harvverseConfig.databaseUsername,
			),
			databaseName: harvverseConfig.databaseName,
			multiAz: false,
			allocatedStorage: harvverseConfig.rdsAllocatedStorageGb,
			storageType: rds.StorageType.GP3,
			storageEncrypted: true,
			backupRetention: cdk.Duration.days(harvverseConfig.rdsBackupRetentionDays),
			deletionProtection: false,
			publiclyAccessible: false,
			enablePerformanceInsights: false,
			autoMinorVersionUpgrade: true,
			removalPolicy: cdk.RemovalPolicy.SNAPSHOT,
		});

		new cdk.CfnOutput(this, "DatabaseEndpoint", {
			value: this.database.dbInstanceEndpointAddress,
			description: "RDS hostname (credentials in Secrets Manager)",
		});

		new cdk.CfnOutput(this, "DatabaseSecretArn", {
			value: this.databaseSecret.secretArn,
			description:
				"RDS credentials secret — compose DATABASE_URL after first deploy (see infra README)",
		});

		new cdk.CfnOutput(this, "DatabaseSecretName", {
			value: harvverseConfig.databaseSecretName,
		});
	}
}
