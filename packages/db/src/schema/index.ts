import { relations } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	jsonb,
	numeric,
	pgEnum,
	pgTable,
	serial,
	text,
	timestamp,
	unique,
	varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

/* ──────────────────────────────────────────────────────────────────────────
 * Enums
 * ────────────────────────────────────────────────────────────────────────── */

export const userRoleEnum = pgEnum("user_role", [
	"farmer",
	"partner",
	"verifier",
	"admin",
	"settlement_operator",
	"custodian",
	"deployer",
	"auditor",
]);

export const userStatusEnum = pgEnum("user_status", ["active", "disabled"]);

export const lotStatusEnum = pgEnum("lot_status", [
	"draft",
	"available",
	"reserved",
	"active",
	"settled",
	"coming_soon",
]);

export const planStatusEnum = pgEnum("plan_status", [
	"draft",
	"approved_for_demo",
	"revoked",
]);

export const partnershipStatusEnum = pgEnum("partnership_status", [
	"active",
	"milestones_attested",
	"awaiting_settlement",
	"settled",
	"cancelled",
]);

export const proposalStatusEnum = pgEnum("proposal_status", [
	"pending",
	"submitted",
	"signed",
	"expired",
	"failed",
]);

export const settlementStatusEnum = pgEnum("settlement_status", [
	"intent_created",
	"funded",
	"submitted",
	"confirmed",
	"failed",
]);

export const evidenceTypeEnum = pgEnum("evidence_type", [
	"photo",
	"sensor_snapshot",
	"receipt",
	"agronomist_review",
	"harvest_result",
	"demo_fixture",
	"satellite_report",
	"eudr_screening",
	"ndvi_milestone_check",
	"sar_milestone_check",
]);

export const evidenceStatusEnum = pgEnum("evidence_status", [
	"recorded",
	"attested",
	"revoked",
]);

export const chainKeyEnum = pgEnum("chain_key", [
	"hardhat",
	"celoSepolia",
	"baseSepolia",
	"polygonAmoy",
]);

export const txTypeEnum = pgEnum("tx_type", [
	"deploy",
	"mock_usdc_approval",
	"open_partnership",
	"evidence_attestation",
	"fund_settlement",
	"settlement",
]);

export const txStatusEnum = pgEnum("tx_status", [
	"submitted",
	"confirmed",
	"reverted",
	"unknown",
]);

export const custodyTypeEnum = pgEnum("custody_type", [
	"demo_escrow",
	"demo_collapsed_operator",
]);

export const chatRoleEnum = pgEnum("chat_role", ["user", "assistant"]);

export const agentEventTypeEnum = pgEnum("agent_event_type", [
	"explanation_start",
	"explanation_complete",
	"whatif_complete",
	"fallback_used",
	"error",
]);

/* ──────────────────────────────────────────────────────────────────────────
 * Tables
 * ────────────────────────────────────────────────────────────────────────── */

export const users = pgTable(
	"users",
	{
		id: serial("id").primaryKey(),
		clerkId: text("clerk_id").unique(),
		email: text("email"),
		displayName: text("display_name").notNull(),
		role: userRoleEnum("role").notNull(),
		walletAddress: text("wallet_address").unique(),
		phone: text("phone"),
		country: text("country"),
		status: userStatusEnum("status").notNull().default("active"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => ({
		walletAddressIdx: index("users_wallet_address_idx").on(table.walletAddress),
		roleIdx: index("users_role_idx").on(table.role),
	}),
);

export const walletSessions = pgTable(
	"wallet_sessions",
	{
		id: serial("id").primaryKey(),
		userId: integer("user_id")
			.notNull()
			.references(() => users.id),
		walletAddress: text("wallet_address").notNull(),
		nonce: text("nonce").notNull(),
		sessionIdHash: text("session_id_hash").notNull().unique(),
		chainId: integer("chain_id").notNull(),
		status: varchar("status", { length: 20 }).notNull().default("pending"),
		expiresAt: timestamp("expires_at").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => ({
		sessionIdHashIdx: index("wallet_sessions_session_id_hash_idx").on(
			table.sessionIdHash,
		),
		walletStatusIdx: index("wallet_sessions_wallet_status_idx").on(
			table.walletAddress,
			table.status,
		),
	}),
);

export const custodyAccounts = pgTable(
	"custody_accounts",
	{
		id: serial("id").primaryKey(),
		name: text("name").notNull(),
		custodyType: custodyTypeEnum("custody_type").notNull(),
		chainKey: chainKeyEnum("chain_key").notNull(),
		walletAddress: text("wallet_address").notNull(),
		status: userStatusEnum("status").notNull().default("active"),
		notes: text("notes"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => ({
		chainCustodyIdx: index("custody_accounts_chain_custody_idx").on(
			table.chainKey,
			table.custodyType,
		),
		walletAddressIdx: index("custody_accounts_wallet_address_idx").on(
			table.walletAddress,
		),
	}),
);

export const farms = pgTable(
	"farms",
	{
		id: serial("id").primaryKey(),
		farmerId: integer("farmer_id")
			.notNull()
			.references(() => users.id),
		name: text("name").notNull(),
		country: text("country").notNull(),
		region: text("region").notNull(),
		altitudeMasl: integer("altitude_masl"),
		totalArea: numeric("total_area"),
		areaManzanas: numeric("area_manzanas"),
		varieties: text("varieties").array(),
		description: text("description"),
		certifications: text("certifications").array(),
		photoUrls: text("photo_urls").array(),
		latitude: numeric("latitude"),
		longitude: numeric("longitude"),
		polygon: jsonb("polygon"),
		riskScore: integer("risk_score"),
		eudrCompliant: boolean("eudr_compliant"),
		scoreHash: varchar("score_hash", { length: 64 }),
		scoreUpdatedAt: timestamp("score_updated_at"),
		ndviAverage: numeric("ndvi_average"),
		annualPrecipMm: numeric("annual_precip_mm"),
		avgTempC: numeric("avg_temp_c"),
		scoreBreakdown: jsonb("score_breakdown"),
		coeScore: numeric("coe_score"),
		verified: boolean("verified").default(false),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => ({
		farmerIdIdx: index("farms_farmer_id_idx").on(table.farmerId),
	}),
);

export const farmImages = pgTable(
	"farm_images",
	{
		id: serial("id").primaryKey(),
		farmId: integer("farm_id")
			.notNull()
			.references(() => farms.id),
		data: text("data"),
		storageProvider: varchar("storage_provider", { length: 20 })
			.notNull()
			.default("database"),
		storageBucket: text("storage_bucket"),
		storageKey: text("storage_key"),
		storageRegion: varchar("storage_region", { length: 40 }),
		checksumSha256: varchar("checksum_sha256", { length: 64 }),
		mimeType: varchar("mime_type", { length: 50 }).notNull(),
		filename: text("filename").notNull(),
		sizeBytes: integer("size_bytes"),
		isPrimary: boolean("is_primary").default(false),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => ({
		farmIdIdx: index("farm_images_farm_id_idx").on(table.farmId),
		primaryIdx: index("farm_images_primary_idx").on(table.farmId, table.isPrimary),
		storageKeyIdx: index("farm_images_storage_key_idx").on(table.storageKey),
	}),
);

export const waitlistEntries = pgTable("waitlist_entries", {
	id: serial("id").primaryKey(),
	fullName: text("full_name").notNull(),
	email: text("email").notNull().unique(),
	country: text("country").notNull(),
	investmentRange: text("investment_range").notNull(),
	howHeard: text("how_heard"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const copernicusRuns = pgTable(
	"copernicus_runs",
	{
		id: serial("id").primaryKey(),
		farmId: integer("farm_id")
			.notNull()
			.references(() => farms.id),
		providerName: text("provider_name").notNull(),
		providerVersion: text("provider_version"),
		collectionId: text("collection_id"),
		timeRangeStart: timestamp("time_range_start"),
		timeRangeEnd: timestamp("time_range_end"),
		polygonHash: varchar("polygon_hash", { length: 64 }).notNull(),
		rawResponseHash: varchar("raw_response_hash", { length: 64 }),
		derivedMetrics: jsonb("derived_metrics"),
		confidence: varchar("confidence", { length: 20 }).notNull().default("unknown"),
		generatedReportHash: varchar("generated_report_hash", { length: 64 }).notNull(),
		status: varchar("status", { length: 30 }).notNull().default("complete"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => ({
		farmCreatedIdx: index("copernicus_runs_farm_created_idx").on(
			table.farmId,
			table.createdAt,
		),
		reportHashIdx: index("copernicus_runs_report_hash_idx").on(
			table.generatedReportHash,
		),
	}),
);

export const copernicusObservations = pgTable(
	"copernicus_observations",
	{
		id: serial("id").primaryKey(),
		runId: integer("run_id")
			.notNull()
			.references(() => copernicusRuns.id),
		farmId: integer("farm_id")
			.notNull()
			.references(() => farms.id),
		providerName: text("provider_name").notNull(),
		collectionId: text("collection_id"),
		observedAt: timestamp("observed_at"),
		metricType: varchar("metric_type", { length: 60 }).notNull(),
		metrics: jsonb("metrics").notNull(),
		confidence: varchar("confidence", { length: 20 }).notNull().default("unknown"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => ({
		runIdx: index("copernicus_observations_run_idx").on(table.runId),
		farmMetricIdx: index("copernicus_observations_farm_metric_idx").on(
			table.farmId,
			table.metricType,
		),
	}),
);

export const eudrAssessments = pgTable(
	"eudr_assessments",
	{
		id: serial("id").primaryKey(),
		farmId: integer("farm_id")
			.notNull()
			.references(() => farms.id),
		runId: integer("run_id").references(() => copernicusRuns.id),
		status: varchar("status", { length: 32 }).notNull(),
		score: integer("score"),
		confidence: varchar("confidence", { length: 20 }).notNull().default("unknown"),
		source: varchar("source", { length: 60 }).notNull().default("unassessed"),
		cutoffDate: varchar("cutoff_date", { length: 10 }).notNull().default("2020-12-31"),
		reasons: text("reasons").array(),
		limitations: text("limitations").array(),
		assessmentHash: varchar("assessment_hash", { length: 64 }).notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => ({
		farmCreatedIdx: index("eudr_assessments_farm_created_idx").on(
			table.farmId,
			table.createdAt,
		),
		runIdx: index("eudr_assessments_run_idx").on(table.runId),
		assessmentHashIdx: index("eudr_assessments_hash_idx").on(
			table.assessmentHash,
		),
	}),
);

export const copernicusAlerts = pgTable(
	"copernicus_alerts",
	{
		id: serial("id").primaryKey(),
		farmId: integer("farm_id")
			.notNull()
			.references(() => farms.id),
		runId: integer("run_id").references(() => copernicusRuns.id),
		type: varchar("type", { length: 60 }).notNull(),
		severity: varchar("severity", { length: 20 }).notNull(),
		status: varchar("status", { length: 20 }).notNull().default("open"),
		message: text("message").notNull(),
		metrics: jsonb("metrics"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		resolvedAt: timestamp("resolved_at"),
	},
	(table) => ({
		farmStatusIdx: index("copernicus_alerts_farm_status_idx").on(
			table.farmId,
			table.status,
		),
		runIdx: index("copernicus_alerts_run_idx").on(table.runId),
	}),
);

export const lots = pgTable(
	"lots",
	{
		id: serial("id").primaryKey(),
		farmId: integer("farm_id")
			.notNull()
			.references(() => farms.id),
		code: varchar("code", { length: 30 }).unique(),
		farmName: text("farm_name").notNull(),
		farmerWallet: text("farmer_wallet").notNull(),
		region: text("region").notNull(),
		country: text("country").notNull(),
		variety: text("variety"),
		process: text("process"),
		altitudeMasl: integer("altitude_masl"),
		areaManzanas: numeric("area_manzanas"),
		gpsLat: numeric("gps_lat"),
		gpsLng: numeric("gps_lng"),
		numTrees: integer("num_trees"),
		plantAgeYears: integer("plant_age_years"),
		scaScoreTenths: integer("sca_score_tenths"),
		harvestYear: integer("harvest_year"),
		cycleNotes: text("cycle_notes"),
		profile: text("profile"),
		summary: text("summary"),
		coverImages: text("cover_images").array(),
		status: lotStatusEnum("status").notNull().default("available"),
		activePlanCode: varchar("active_plan_code", { length: 30 }),
		riskScore: integer("risk_score"),
		eudrCompliant: boolean("eudr_compliant"),
		scoreHash: varchar("score_hash", { length: 64 }),
		scoreVersion: integer("score_version").default(1),
		scoreUpdatedAt: timestamp("score_updated_at"),
		polygon: jsonb("polygon"),
		onchainLotId: integer("onchain_lot_id"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => ({
		farmIdIdx: index("lots_farm_id_idx").on(table.farmId),
		codeIdx: index("lots_code_idx").on(table.code),
		statusIdx: index("lots_status_idx").on(table.status),
	}),
);

export const plans = pgTable(
	"plans",
	{
		id: serial("id").primaryKey(),
		planCode: varchar("plan_code", { length: 30 }).notNull().unique(),
		lotId: integer("lot_id").references(() => lots.id),
		lotCode: varchar("lot_code", { length: 30 }),
		version: varchar("version", { length: 10 }),
		sourceUri: text("source_uri"),
		status: planStatusEnum("status").notNull().default("draft"),
		validatedByName: text("validated_by_name"),
		validatedByCredential: text("validated_by_credential"),
		ticketCents: integer("ticket_cents").notNull(),
		priceCentsPerLb: integer("price_cents_per_lb").notNull(),
		priceFloorCentsPerLb: integer("price_floor_cents_per_lb"),
		agronomicCostCents: integer("agronomic_cost_cents").notNull(),
		contingencyCents: integer("contingency_cents"),
		platformFeeCents: integer("platform_fee_cents"),
		workingCapitalCents: integer("working_capital_cents"),
		projectedYieldY1TenthsQq: integer("projected_yield_y1_tenths_qq").notNull(),
		yieldCapY1TenthsQq: integer("yield_cap_y1_tenths_qq").notNull(),
		splitFarmerBps: integer("split_farmer_bps").notNull(),
		splitPartnerBps: integer("split_partner_bps"),
		phygitalCoffeeLb: numeric("phygital_coffee_lb"),
		phygitalDeliveryMonth: varchar("phygital_delivery_month", { length: 20 }),
		planHash: varchar("plan_hash", { length: 64 }).notNull(),
		termsSummary: text("terms_summary"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => ({
		planCodeIdx: index("plans_plan_code_idx").on(table.planCode),
		lotIdIdx: index("plans_lot_id_idx").on(table.lotId),
		lotCodeIdx: index("plans_lot_code_idx").on(table.lotCode),
	}),
);

export const agronomicPlans = pgTable(
	"agronomic_plans",
	{
		id: serial("id").primaryKey(),
		planId: varchar("plan_id", { length: 30 }).notNull().unique(),
		lotCode: varchar("lot_code", { length: 30 }).notNull(),
		farmCode: varchar("farm_code", { length: 30 }).notNull(),
		farmName: text("farm_name").notNull(),
		variety: text("variety").notNull(),
		altitudeMsnm: integer("altitude_msnm").notNull(),
		areaManzanas: numeric("area_manzanas").notNull(),
		areaHectares: numeric("area_hectares").notNull(),
		cycleYear: integer("cycle_year").notNull(),
		ticketUsd: numeric("ticket_usd").notNull(),
		totalCostAgronomic: numeric("total_cost_agronomic").notNull(),
		totalCostIotService: numeric("total_cost_iot_service").notNull(),
		totalPlan: numeric("total_plan").notNull(),
		iotInfrastructureHarvverse: numeric("iot_infrastructure_harvverse").notNull(),
		splitFarmer: numeric("split_farmer").notNull(),
		splitPartner: numeric("split_partner").notNull(),
		platformCommission: numeric("platform_commission").notNull(),
		pricePerLbFixed: numeric("price_per_lb_fixed").notNull(),
		priceFloor: numeric("price_floor").notNull(),
		yieldY1Qq: numeric("yield_y1_qq").notNull(),
		yieldY2Qq: numeric("yield_y2_qq").notNull(),
		yieldY3Qq: numeric("yield_y3_qq").notNull(),
		yieldCeilingQq: numeric("yield_ceiling_qq").notNull(),
		phygitalCoffeeLb: numeric("phygital_coffee_lb").notNull(),
		phygitalDelivery: text("phygital_delivery").notNull(),
		profile: text("profile").notNull(),
		validatorName: text("validator_name").notNull(),
		validatorTitle: text("validator_title").notNull(),
		milestones: jsonb("milestones").notNull(),
		activities: jsonb("activities"),
		contractRules: jsonb("contract_rules").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => ({
		planIdIdx: index("agronomic_plans_plan_id_idx").on(table.planId),
		lotCodeIdx: index("agronomic_plans_lot_code_idx").on(table.lotCode),
	}),
);

export const modules = pgTable(
	"modules",
	{
		id: serial("id").primaryKey(),
		moduleId: varchar("module_id", { length: 50 }).notNull().unique(),
		name: text("name").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => ({
		moduleIdIdx: index("modules_module_id_idx").on(table.moduleId),
	}),
);

export const sensorData = pgTable(
	"sensor_data",
	{
		id: serial("id").primaryKey(),
		moduleId: varchar("module_id", { length: 50 }).notNull(),
		week: varchar("week", { length: 10 }).notNull(),
		year: integer("year").notNull(),
		weekNumber: integer("week_number").notNull(),
		ambientTemperature: numeric("ambient_temperature").notNull(),
		ambientHumidity: numeric("ambient_humidity").notNull(),
		soilHumidity: numeric("soil_humidity").notNull(),
		ambientTemperatureCount: integer("ambient_temperature_count").notNull(),
		ambientHumidityCount: integer("ambient_humidity_count").notNull(),
		soilHumidityCount: integer("soil_humidity_count").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => ({
		moduleWeekUnique: unique("sensor_data_module_week_unique").on(
			table.moduleId,
			table.week,
		),
		moduleWeekIdx: index("sensor_data_module_week_idx").on(
			table.moduleId,
			table.week,
		),
		yearWeekIdx: index("sensor_data_year_week_idx").on(
			table.year,
			table.weekNumber,
		),
		moduleYearWeekIdx: index("sensor_data_module_year_week_idx").on(
			table.moduleId,
			table.year,
			table.weekNumber,
		),
	}),
);

export const proposals = pgTable(
	"proposals",
	{
		id: serial("id").primaryKey(),
		lotId: integer("lot_id")
			.notNull()
			.references(() => lots.id),
		planId: integer("plan_id")
			.notNull()
			.references(() => plans.id),
		userId: integer("user_id")
			.notNull()
			.references(() => users.id),
		walletAddress: text("wallet_address").notNull(),
		message: text("message"),
		partnershipType: varchar("partnership_type", { length: 20 })
			.notNull()
			.default("phygital"),
		status: proposalStatusEnum("status").notNull().default("pending"),
		revenueCents: integer("revenue_cents").notNull(),
		profitCents: integer("profit_cents").notNull(),
		farmerCents: integer("farmer_cents").notNull(),
		partnerCents: integer("partner_cents").notNull(),
		proposalHash: varchar("proposal_hash", { length: 64 }).notNull(),
		typedDataSignature: text("typed_data_signature"),
		approvalTxHash: varchar("approval_tx_hash", { length: 66 }),
		submittedTxHash: varchar("submitted_tx_hash", { length: 66 }),
		expiresAt: timestamp("expires_at").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => ({
		userStatusIdx: index("proposals_user_status_idx").on(
			table.userId,
			table.status,
		),
		proposalHashIdx: index("proposals_proposal_hash_idx").on(table.proposalHash),
	}),
);

export const partnerships = pgTable(
	"partnerships",
	{
		id: serial("id").primaryKey(),
		proposalId: integer("proposal_id")
			.notNull()
			.references(() => proposals.id),
		lotId: integer("lot_id")
			.notNull()
			.references(() => lots.id),
		planId: integer("plan_id")
			.notNull()
			.references(() => plans.id),
		partnerUserId: integer("partner_user_id")
			.notNull()
			.references(() => users.id),
		partnerWallet: text("partner_wallet").notNull(),
		farmerWallet: text("farmer_wallet").notNull(),
		status: partnershipStatusEnum("status").notNull().default("active"),
		chainKey: chainKeyEnum("chain_key").notNull(),
		onchainPartnershipId: integer("onchain_partnership_id"),
		certificateTokenId: integer("certificate_token_id"),
		openedTxHash: varchar("opened_tx_hash", { length: 66 }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => ({
		lotPartnerUnique: unique("partnerships_lot_partner_unique").on(
			table.lotId,
			table.partnerUserId,
		),
		proposalIdIdx: index("partnerships_proposal_id_idx").on(table.proposalId),
		partnerUserIdIdx: index("partnerships_partner_user_id_idx").on(
			table.partnerUserId,
		),
		statusIdx: index("partnerships_status_idx").on(table.status),
		onchainPartnershipIdIdx: index("partnerships_onchain_partnership_id_idx").on(
			table.onchainPartnershipId,
		),
	}),
);

export const evidenceRecords = pgTable(
	"evidence_records",
	{
		id: serial("id").primaryKey(),
		partnershipId: integer("partnership_id")
			.notNull()
			.references(() => partnerships.id),
		milestoneNumber: integer("milestone_number").notNull(),
		evidenceType: evidenceTypeEnum("evidence_type").notNull(),
		artifactHash: varchar("artifact_hash", { length: 64 }).notNull(),
		attesterUserId: integer("attester_user_id")
			.notNull()
			.references(() => users.id),
		attesterRole: userRoleEnum("attester_role").notNull(),
		easUid: varchar("eas_uid", { length: 66 }),
		registryTxHash: varchar("registry_tx_hash", { length: 66 }),
		status: evidenceStatusEnum("status").notNull().default("recorded"),
		demoOnly: boolean("demo_only").notNull().default(false),
		notes: text("notes"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => ({
		partnershipMilestoneIdx: index("evidence_records_partnership_milestone_idx").on(
			table.partnershipId,
			table.milestoneNumber,
		),
		artifactHashIdx: index("evidence_records_artifact_hash_idx").on(
			table.artifactHash,
		),
	}),
);

export const settlements = pgTable(
	"settlements",
	{
		id: serial("id").primaryKey(),
		partnershipId: integer("partnership_id")
			.notNull()
			.references(() => partnerships.id),
		status: settlementStatusEnum("status").notNull().default("intent_created"),
		year: integer("year").notNull(),
		yieldTenthsQq: integer("yield_tenths_qq").notNull(),
		scaScoreTenths: integer("sca_score_tenths").notNull(),
		priceCentsPerLb: integer("price_cents_per_lb").notNull(),
		revenueCents: integer("revenue_cents").notNull(),
		profitCents: integer("profit_cents").notNull(),
		farmerCents: integer("farmer_cents").notNull(),
		partnerCents: integer("partner_cents").notNull(),
		harvestEvidenceHash: varchar("harvest_evidence_hash", { length: 64 }).notNull(),
		fundingTxHash: varchar("funding_tx_hash", { length: 66 }),
		settlementTxHash: varchar("settlement_tx_hash", { length: 66 }),
		signedByWallet: text("signed_by_wallet"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => ({
		partnershipIdIdx: index("settlements_partnership_id_idx").on(
			table.partnershipId,
		),
		statusIdx: index("settlements_status_idx").on(table.status),
	}),
);

export const chainTransactions = pgTable(
	"chain_transactions",
	{
		id: serial("id").primaryKey(),
		txHash: varchar("tx_hash", { length: 66 }).notNull().unique(),
		chainKey: chainKeyEnum("chain_key").notNull(),
		type: txTypeEnum("type").notNull(),
		status: txStatusEnum("status").notNull().default("submitted"),
		submittedByWallet: text("submitted_by_wallet"),
		relatedProposalId: integer("related_proposal_id").references(
			() => proposals.id,
		),
		relatedPartnershipId: integer("related_partnership_id").references(
			() => partnerships.id,
		),
		relatedSettlementId: integer("related_settlement_id").references(
			() => settlements.id,
		),
		blockNumber: integer("block_number"),
		error: text("error"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => ({
		txHashIdx: index("chain_transactions_tx_hash_idx").on(table.txHash),
		statusIdx: index("chain_transactions_status_idx").on(table.status),
		relatedProposalIdx: index("chain_transactions_related_proposal_idx").on(
			table.relatedProposalId,
		),
		relatedPartnershipIdx: index("chain_transactions_related_partnership_idx").on(
			table.relatedPartnershipId,
		),
		relatedSettlementIdx: index("chain_transactions_related_settlement_idx").on(
			table.relatedSettlementId,
		),
	}),
);

export const contractDeployments = pgTable(
	"contract_deployments",
	{
		id: serial("id").primaryKey(),
		chainKey: chainKeyEnum("chain_key").notNull(),
		chainId: integer("chain_id").notNull(),
		contractName: varchar("contract_name", { length: 100 }).notNull(),
		address: varchar("address", { length: 42 }).notNull(),
		abiHash: varchar("abi_hash", { length: 64 }).notNull(),
		deployTxHash: varchar("deploy_tx_hash", { length: 66 }).notNull(),
		active: boolean("active").notNull().default(true),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => ({
		chainContractUnique: unique("contract_deployments_chain_contract_unique").on(
			table.chainKey,
			table.contractName,
		),
		chainContractIdx: index("contract_deployments_chain_contract_idx").on(
			table.chainKey,
			table.contractName,
		),
	}),
);

export const conversations = pgTable(
	"conversations",
	{
		id: serial("id").primaryKey(),
		conversationId: varchar("conversation_id", { length: 100 })
			.notNull()
			.unique(),
		lotCode: varchar("lot_code", { length: 30 }),
		title: text("title").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => ({
		conversationIdIdx: index("conversations_conversation_id_idx").on(
			table.conversationId,
		),
		lotCodeIdx: index("conversations_lot_code_idx").on(table.lotCode),
		lotCodeUpdatedAtIdx: index("conversations_lot_code_updated_at_idx").on(
			table.lotCode,
			table.updatedAt,
		),
	}),
);

export const chatMessages = pgTable(
	"chat_messages",
	{
		id: serial("id").primaryKey(),
		conversationId: varchar("conversation_id", { length: 100 }).notNull(),
		role: chatRoleEnum("role").notNull(),
		content: text("content").notNull(),
		rule: text("rule"),
		toolsUsed: text("tools_used").array(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => ({
		conversationIdIdx: index("chat_messages_conversation_id_idx").on(
			table.conversationId,
		),
		conversationCreatedAtIdx: index("chat_messages_conversation_created_at_idx").on(
			table.conversationId,
			table.createdAt,
		),
	}),
);

export const agentEvents = pgTable(
	"agent_events",
	{
		id: serial("id").primaryKey(),
		proposalId: integer("proposal_id")
			.notNull()
			.references(() => proposals.id),
		eventType: agentEventTypeEnum("event_type").notNull(),
		text: text("text").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => ({
		proposalCreatedAtIdx: index("agent_events_proposal_created_at_idx").on(
			table.proposalId,
			table.createdAt,
		),
	}),
);

/* ──────────────────────────────────────────────────────────────────────────
 * Relations
 * ────────────────────────────────────────────────────────────────────────── */

export const usersRelations = relations(users, ({ many }) => ({
	farms: many(farms),
	proposals: many(proposals),
	partnerships: many(partnerships),
	evidenceRecords: many(evidenceRecords),
	walletSessions: many(walletSessions),
}));

export const walletSessionsRelations = relations(walletSessions, ({ one }) => ({
	user: one(users, {
		fields: [walletSessions.userId],
		references: [users.id],
	}),
}));

export const farmsRelations = relations(farms, ({ one, many }) => ({
	farmer: one(users, {
		fields: [farms.farmerId],
		references: [users.id],
	}),
	lots: many(lots),
	images: many(farmImages),
	copernicusRuns: many(copernicusRuns),
	eudrAssessments: many(eudrAssessments),
	copernicusAlerts: many(copernicusAlerts),
}));

export const farmImagesRelations = relations(farmImages, ({ one }) => ({
	farm: one(farms, {
		fields: [farmImages.farmId],
		references: [farms.id],
	}),
}));

export const copernicusRunsRelations = relations(
	copernicusRuns,
	({ one, many }) => ({
		farm: one(farms, {
			fields: [copernicusRuns.farmId],
			references: [farms.id],
		}),
		observations: many(copernicusObservations),
		eudrAssessments: many(eudrAssessments),
		alerts: many(copernicusAlerts),
	}),
);

export const copernicusObservationsRelations = relations(
	copernicusObservations,
	({ one }) => ({
		run: one(copernicusRuns, {
			fields: [copernicusObservations.runId],
			references: [copernicusRuns.id],
		}),
		farm: one(farms, {
			fields: [copernicusObservations.farmId],
			references: [farms.id],
		}),
	}),
);

export const eudrAssessmentsRelations = relations(eudrAssessments, ({ one }) => ({
	farm: one(farms, {
		fields: [eudrAssessments.farmId],
		references: [farms.id],
	}),
	run: one(copernicusRuns, {
		fields: [eudrAssessments.runId],
		references: [copernicusRuns.id],
	}),
}));

export const copernicusAlertsRelations = relations(copernicusAlerts, ({ one }) => ({
	farm: one(farms, {
		fields: [copernicusAlerts.farmId],
		references: [farms.id],
	}),
	run: one(copernicusRuns, {
		fields: [copernicusAlerts.runId],
		references: [copernicusRuns.id],
	}),
}));

export const lotsRelations = relations(lots, ({ one, many }) => ({
	farm: one(farms, {
		fields: [lots.farmId],
		references: [farms.id],
	}),
	plans: many(plans),
	proposals: many(proposals),
	partnerships: many(partnerships),
}));

export const plansRelations = relations(plans, ({ one, many }) => ({
	lot: one(lots, {
		fields: [plans.lotId],
		references: [lots.id],
	}),
	proposals: many(proposals),
	partnerships: many(partnerships),
}));

export const proposalsRelations = relations(proposals, ({ one, many }) => ({
	lot: one(lots, {
		fields: [proposals.lotId],
		references: [lots.id],
	}),
	plan: one(plans, {
		fields: [proposals.planId],
		references: [plans.id],
	}),
	user: one(users, {
		fields: [proposals.userId],
		references: [users.id],
	}),
	partnership: one(partnerships, {
		fields: [proposals.id],
		references: [partnerships.proposalId],
	}),
	agentEvents: many(agentEvents),
	chainTransactions: many(chainTransactions, {
		relationName: "proposalChainTransactions",
	}),
}));

export const partnershipsRelations = relations(
	partnerships,
	({ one, many }) => ({
		proposal: one(proposals, {
			fields: [partnerships.proposalId],
			references: [proposals.id],
		}),
		lot: one(lots, {
			fields: [partnerships.lotId],
			references: [lots.id],
		}),
		plan: one(plans, {
			fields: [partnerships.planId],
			references: [plans.id],
		}),
		partnerUser: one(users, {
			fields: [partnerships.partnerUserId],
			references: [users.id],
		}),
		evidenceRecords: many(evidenceRecords),
		settlements: many(settlements),
		chainTransactions: many(chainTransactions, {
			relationName: "partnershipChainTransactions",
		}),
	}),
);

export const evidenceRecordsRelations = relations(
	evidenceRecords,
	({ one }) => ({
		partnership: one(partnerships, {
			fields: [evidenceRecords.partnershipId],
			references: [partnerships.id],
		}),
		attester: one(users, {
			fields: [evidenceRecords.attesterUserId],
			references: [users.id],
		}),
	}),
);

export const settlementsRelations = relations(settlements, ({ one, many }) => ({
	partnership: one(partnerships, {
		fields: [settlements.partnershipId],
		references: [partnerships.id],
	}),
	chainTransactions: many(chainTransactions, {
		relationName: "settlementChainTransactions",
	}),
}));

export const chainTransactionsRelations = relations(
	chainTransactions,
	({ one }) => ({
		proposal: one(proposals, {
			fields: [chainTransactions.relatedProposalId],
			references: [proposals.id],
			relationName: "proposalChainTransactions",
		}),
		partnership: one(partnerships, {
			fields: [chainTransactions.relatedPartnershipId],
			references: [partnerships.id],
			relationName: "partnershipChainTransactions",
		}),
		settlement: one(settlements, {
			fields: [chainTransactions.relatedSettlementId],
			references: [settlements.id],
			relationName: "settlementChainTransactions",
		}),
	}),
);

export const agentEventsRelations = relations(agentEvents, ({ one }) => ({
	proposal: one(proposals, {
		fields: [agentEvents.proposalId],
		references: [proposals.id],
	}),
}));

export const agronomicPlansRelations = relations(agronomicPlans, ({ one }) => ({
	lot: one(lots, {
		fields: [agronomicPlans.lotCode],
		references: [lots.code],
	}),
}));

export const sensorDataRelations = relations(sensorData, ({ one }) => ({
	module: one(modules, {
		fields: [sensorData.moduleId],
		references: [modules.moduleId],
	}),
}));

/* ──────────────────────────────────────────────────────────────────────────
 * Insert / Select schemas + Types
 * ────────────────────────────────────────────────────────────────────────── */

export const insertUserSchema = createInsertSchema(users).omit({
	id: true,
	createdAt: true,
	updatedAt: true,
});
export const selectUserSchema = createSelectSchema(users);
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export const insertWalletSessionSchema = createInsertSchema(walletSessions).omit({
	id: true,
	createdAt: true,
	updatedAt: true,
});
export const selectWalletSessionSchema = createSelectSchema(walletSessions);
export type WalletSession = typeof walletSessions.$inferSelect;
export type InsertWalletSession = z.infer<typeof insertWalletSessionSchema>;

export const insertCustodyAccountSchema = createInsertSchema(custodyAccounts).omit({
	id: true,
	createdAt: true,
	updatedAt: true,
});
export const selectCustodyAccountSchema = createSelectSchema(custodyAccounts);
export type CustodyAccount = typeof custodyAccounts.$inferSelect;
export type InsertCustodyAccount = z.infer<typeof insertCustodyAccountSchema>;

export const insertFarmSchema = createInsertSchema(farms).omit({
	id: true,
	createdAt: true,
	updatedAt: true,
});
export const selectFarmSchema = createSelectSchema(farms);
export type Farm = typeof farms.$inferSelect;
export type InsertFarm = z.infer<typeof insertFarmSchema>;

export const insertFarmImageSchema = createInsertSchema(farmImages).omit({
	id: true,
	createdAt: true,
});
export const selectFarmImageSchema = createSelectSchema(farmImages);
export type FarmImage = typeof farmImages.$inferSelect;
export type InsertFarmImage = z.infer<typeof insertFarmImageSchema>;

export const insertWaitlistEntrySchema = createInsertSchema(waitlistEntries).omit({
	id: true,
	createdAt: true,
});
export const selectWaitlistEntrySchema = createSelectSchema(waitlistEntries);
export type WaitlistEntry = typeof waitlistEntries.$inferSelect;
export type InsertWaitlistEntry = z.infer<typeof insertWaitlistEntrySchema>;

export const insertCopernicusRunSchema = createInsertSchema(copernicusRuns).omit({
	id: true,
	createdAt: true,
});
export const selectCopernicusRunSchema = createSelectSchema(copernicusRuns);
export type CopernicusRun = typeof copernicusRuns.$inferSelect;
export type InsertCopernicusRun = z.infer<typeof insertCopernicusRunSchema>;

export const insertCopernicusObservationSchema = createInsertSchema(
	copernicusObservations,
).omit({
	id: true,
	createdAt: true,
});
export const selectCopernicusObservationSchema =
	createSelectSchema(copernicusObservations);
export type CopernicusObservation = typeof copernicusObservations.$inferSelect;
export type InsertCopernicusObservation = z.infer<
	typeof insertCopernicusObservationSchema
>;

export const insertEudrAssessmentSchema = createInsertSchema(eudrAssessments).omit({
	id: true,
	createdAt: true,
});
export const selectEudrAssessmentSchema = createSelectSchema(eudrAssessments);
export type EudrAssessment = typeof eudrAssessments.$inferSelect;
export type InsertEudrAssessment = z.infer<typeof insertEudrAssessmentSchema>;

export const insertCopernicusAlertSchema = createInsertSchema(copernicusAlerts).omit({
	id: true,
	createdAt: true,
});
export const selectCopernicusAlertSchema = createSelectSchema(copernicusAlerts);
export type CopernicusAlert = typeof copernicusAlerts.$inferSelect;
export type InsertCopernicusAlert = z.infer<typeof insertCopernicusAlertSchema>;

export const insertLotSchema = createInsertSchema(lots).omit({
	id: true,
	createdAt: true,
	updatedAt: true,
});
export const selectLotSchema = createSelectSchema(lots);
export type Lot = typeof lots.$inferSelect;
export type InsertLot = z.infer<typeof insertLotSchema>;

export const insertPlanSchema = createInsertSchema(plans).omit({
	id: true,
	createdAt: true,
	updatedAt: true,
});
export const selectPlanSchema = createSelectSchema(plans);
export type Plan = typeof plans.$inferSelect;
export type InsertPlan = z.infer<typeof insertPlanSchema>;

export const insertAgronomicPlanSchema = createInsertSchema(agronomicPlans).omit({
	id: true,
	createdAt: true,
	updatedAt: true,
});
export const selectAgronomicPlanSchema = createSelectSchema(agronomicPlans);
export type AgronomicPlan = typeof agronomicPlans.$inferSelect;
export type InsertAgronomicPlan = z.infer<typeof insertAgronomicPlanSchema>;

export const insertModuleSchema = createInsertSchema(modules).omit({
	id: true,
	createdAt: true,
});
export const selectModuleSchema = createSelectSchema(modules);
export type Module = typeof modules.$inferSelect;
export type InsertModule = z.infer<typeof insertModuleSchema>;

export const insertSensorDataSchema = createInsertSchema(sensorData).omit({
	id: true,
	createdAt: true,
});
export const selectSensorDataSchema = createSelectSchema(sensorData);
export type SensorData = typeof sensorData.$inferSelect;
export type InsertSensorData = z.infer<typeof insertSensorDataSchema>;

export const insertProposalSchema = createInsertSchema(proposals).omit({
	id: true,
	createdAt: true,
	updatedAt: true,
});
export const selectProposalSchema = createSelectSchema(proposals);
export type Proposal = typeof proposals.$inferSelect;
export type InsertProposal = z.infer<typeof insertProposalSchema>;

export const insertPartnershipSchema = createInsertSchema(partnerships).omit({
	id: true,
	createdAt: true,
	updatedAt: true,
});
export const selectPartnershipSchema = createSelectSchema(partnerships);
export type Partnership = typeof partnerships.$inferSelect;
export type InsertPartnership = z.infer<typeof insertPartnershipSchema>;

export const insertEvidenceRecordSchema = createInsertSchema(evidenceRecords).omit({
	id: true,
	createdAt: true,
	updatedAt: true,
});
export const selectEvidenceRecordSchema = createSelectSchema(evidenceRecords);
export type EvidenceRecord = typeof evidenceRecords.$inferSelect;
export type InsertEvidenceRecord = z.infer<typeof insertEvidenceRecordSchema>;

export const insertSettlementSchema = createInsertSchema(settlements).omit({
	id: true,
	createdAt: true,
	updatedAt: true,
});
export const selectSettlementSchema = createSelectSchema(settlements);
export type Settlement = typeof settlements.$inferSelect;
export type InsertSettlement = z.infer<typeof insertSettlementSchema>;

export const insertChainTransactionSchema = createInsertSchema(
	chainTransactions,
).omit({
	id: true,
	createdAt: true,
	updatedAt: true,
});
export const selectChainTransactionSchema = createSelectSchema(chainTransactions);
export type ChainTransaction = typeof chainTransactions.$inferSelect;
export type InsertChainTransaction = z.infer<typeof insertChainTransactionSchema>;

export const insertContractDeploymentSchema = createInsertSchema(
	contractDeployments,
).omit({
	id: true,
	createdAt: true,
});
export const selectContractDeploymentSchema = createSelectSchema(
	contractDeployments,
);
export type ContractDeployment = typeof contractDeployments.$inferSelect;
export type InsertContractDeployment = z.infer<
	typeof insertContractDeploymentSchema
>;

export const insertConversationSchema = createInsertSchema(conversations).omit({
	id: true,
	createdAt: true,
	updatedAt: true,
});
export const selectConversationSchema = createSelectSchema(conversations);
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
	id: true,
	createdAt: true,
});
export const selectChatMessageSchema = createSelectSchema(chatMessages);
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

export const insertAgentEventSchema = createInsertSchema(agentEvents).omit({
	id: true,
	createdAt: true,
});
export const selectAgentEventSchema = createSelectSchema(agentEvents);
export type AgentEvent = typeof agentEvents.$inferSelect;
export type InsertAgentEvent = z.infer<typeof insertAgentEventSchema>;
