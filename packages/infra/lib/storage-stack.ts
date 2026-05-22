import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import type { Construct } from "constructs";
import { cfnExportName, harvverseConfig } from "./config";

export interface StorageStackProps extends cdk.StackProps {
	readonly farmImagesPrefix?: string;
}

export class StorageStack extends cdk.Stack {
	public readonly farmImagesBucket: s3.Bucket;
	public readonly farmImagesPrefix: string;

	constructor(scope: Construct, id: string, props?: StorageStackProps) {
		super(scope, id, props);

		this.farmImagesPrefix =
			props?.farmImagesPrefix ?? harvverseConfig.farmImagesPrefix;

		this.farmImagesBucket = new s3.Bucket(this, "FarmImagesBucket", {
			encryption: s3.BucketEncryption.S3_MANAGED,
			blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
			enforceSSL: true,
			versioned: false,
			removalPolicy: cdk.RemovalPolicy.RETAIN,
			autoDeleteObjects: false,
		});

		new cdk.CfnOutput(this, "FarmImagesBucketName", {
			value: this.farmImagesBucket.bucketName,
			exportName: cfnExportName("FarmImagesBucketName"),
		});

		new cdk.CfnOutput(this, "FarmImagesBucketArn", {
			value: this.farmImagesBucket.bucketArn,
		});

		new cdk.CfnOutput(this, "FarmImagesPrefix", {
			value: this.farmImagesPrefix,
		});
	}
}
