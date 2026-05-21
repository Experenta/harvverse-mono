import * as cdk from "aws-cdk-lib";
import * as ecr from "aws-cdk-lib/aws-ecr";
import type { Construct } from "constructs";
import { cfnExportName, harvverseConfig } from "./config";

export class EcrStack extends cdk.Stack {
	public readonly webRepository: ecr.Repository;

	constructor(scope: Construct, id: string, props?: cdk.StackProps) {
		super(scope, id, props);

		this.webRepository = new ecr.Repository(this, "WebRepository", {
			repositoryName: harvverseConfig.ecrWebRepositoryName,
			imageScanOnPush: true,
			lifecycleRules: [
				{
					maxImageCount: harvverseConfig.ecrMaxImageCount,
					description: "MVP: keep last 10 images",
				},
			],
			removalPolicy: cdk.RemovalPolicy.RETAIN,
		});

		new cdk.CfnOutput(this, "WebRepositoryUri", {
			value: this.webRepository.repositoryUri,
			exportName: cfnExportName("WebRepositoryUri"),
		});

		new cdk.CfnOutput(this, "WebRepositoryName", {
			value: this.webRepository.repositoryName,
		});
	}
}
