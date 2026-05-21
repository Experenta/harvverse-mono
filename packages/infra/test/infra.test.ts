import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { InfraStack } from "../lib/infra-stack";

describe("InfraStack", () => {
	test("creates stack output", () => {
		const app = new cdk.App();
		const stack = new InfraStack(app, "TestStack");
		const template = Template.fromStack(stack);

		template.hasOutput("StackName", {});
	});
});
