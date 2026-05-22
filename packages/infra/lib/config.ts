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
	databaseName: "harvverse",
	databaseUsername: "harvverse",
	/** Secrets Manager name for RDS credentials (host/port added automatically after deploy). */
	databaseSecretName: "harvverse/prod/database",
	rdsAllocatedStorageGb: 20,
	rdsBackupRetentionDays: 1,
	farmImagesPrefix: "farm-images",
	s3SignedUrlTtlSeconds: "900",
	/** Public app hostname (TLS via ACM). */
	domainName: "defi.harvverse.farm",
	corsOrigin: "https://defi.harvverse.farm",
	acmCertificateArn:
		"arn:aws:acm:us-east-2:500501923704:certificate/1318b7d2-f7b2-4849-a7d2-cc320e3b0d3d",
	clerkSecretName: "harvverse/prod/clerk",
	ecrMigrateRepositoryName: "harvverse/migrate",
	webImageTag: "latest",
	migrateImageTag: "latest",
	fargateCpu: 512,
	fargateMemoryMiB: 1024,
	fargateCpuArchitecture: "ARM64" as const,
	fargateDesiredCount: 1,
	webLogGroupName: "/harvverse/web",
	migrateLogGroupName: "/harvverse/migrate",
	migrateTaskCpu: 256,
	migrateTaskMemoryMiB: 512,
	migrateTaskFamily: "harvverse-migrate",
	/** GitHub repo for CodePipeline source (CodeStar Connections). */
	githubOwner: "Experenta",
	githubRepo: "harvverse-mono",
	githubBranch: "main",
	codeBuildProjectName: "harvverse-web",
	codePipelineName: "harvverse-prod",
	/** SSM Parameter Store path for NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (CodeBuild build-time). */
	clerkPublishableKeySsmParameter:
		"/harvverse/prod/NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
} as const;

/** CDK stack ID, e.g. `Harvversev2Network`. */
export function stackId(suffix: string): string {
	return `${harvverseConfig.stackPrefix}${suffix}`;
}

/** CloudFormation export name, e.g. `Harvversev2VpcId`. */
export function cfnExportName(suffix: string): string {
	return `${harvverseConfig.stackPrefix}${suffix}`;
}
