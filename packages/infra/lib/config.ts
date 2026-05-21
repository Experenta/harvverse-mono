/** MVP infrastructure defaults — not runtime secrets. */
export const harvverseConfig = {
	/** CDK stack ID and CloudFormation export prefix (avoids clashes with v1 stacks). */
	stackPrefix: "Harvversev2",
	region: "us-east-2",
	vpcCidr: "10.0.0.0/16",
	maxAzs: 2,
	natGateways: 1,
	ecrWebRepositoryName: "harvverse/web",
	ecrMaxImageCount: 10,
} as const;

/** CDK stack ID, e.g. `Harvversev2Network`. */
export function stackId(suffix: string): string {
	return `${harvverseConfig.stackPrefix}${suffix}`;
}

/** CloudFormation export name, e.g. `Harvversev2VpcId`. */
export function cfnExportName(suffix: string): string {
	return `${harvverseConfig.stackPrefix}${suffix}`;
}
