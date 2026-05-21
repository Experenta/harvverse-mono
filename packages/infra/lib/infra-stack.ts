import * as cdk from "aws-cdk-lib";
import type { Construct } from "constructs";

export class InfraStack extends cdk.Stack {
	constructor(scope: Construct, id: string, props?: cdk.StackProps) {
		super(scope, id, props);

		new cdk.CfnOutput(this, "StackName", {
			value: this.stackName,
			description: "Deployed CDK stack name",
		});
	}
}
