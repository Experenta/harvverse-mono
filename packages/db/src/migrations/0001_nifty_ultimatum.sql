CREATE TYPE "public"."agent_event_type" AS ENUM('explanation_start', 'explanation_complete', 'whatif_complete', 'fallback_used', 'error');--> statement-breakpoint
CREATE TYPE "public"."chain_key" AS ENUM('hardhat', 'celoSepolia', 'baseSepolia', 'polygonAmoy');--> statement-breakpoint
CREATE TYPE "public"."chat_role" AS ENUM('user', 'assistant');--> statement-breakpoint
CREATE TYPE "public"."custody_type" AS ENUM('demo_escrow', 'demo_collapsed_operator');--> statement-breakpoint
CREATE TYPE "public"."evidence_status" AS ENUM('recorded', 'attested', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."evidence_type" AS ENUM('photo', 'sensor_snapshot', 'receipt', 'agronomist_review', 'harvest_result', 'demo_fixture');--> statement-breakpoint
CREATE TYPE "public"."lot_status" AS ENUM('available', 'reserved', 'active', 'settled', 'coming_soon');--> statement-breakpoint
CREATE TYPE "public"."partnership_status" AS ENUM('active', 'milestones_attested', 'awaiting_settlement', 'settled', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."plan_status" AS ENUM('draft', 'approved_for_demo', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."proposal_status" AS ENUM('pending', 'submitted', 'signed', 'expired', 'failed');--> statement-breakpoint
CREATE TYPE "public"."settlement_status" AS ENUM('intent_created', 'funded', 'submitted', 'confirmed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."tx_status" AS ENUM('submitted', 'confirmed', 'reverted', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."tx_type" AS ENUM('deploy', 'mock_usdc_approval', 'open_partnership', 'evidence_attestation', 'fund_settlement', 'settlement');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('farmer', 'partner', 'verifier', 'admin', 'settlement_operator', 'custodian', 'deployer', 'auditor');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'disabled');--> statement-breakpoint
CREATE TABLE "agent_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"proposal_id" integer NOT NULL,
	"event_type" "agent_event_type" NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agronomic_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan_id" varchar(30) NOT NULL,
	"lot_code" varchar(30) NOT NULL,
	"farm_code" varchar(30) NOT NULL,
	"farm_name" text NOT NULL,
	"variety" text NOT NULL,
	"altitude_msnm" integer NOT NULL,
	"area_manzanas" numeric NOT NULL,
	"area_hectares" numeric NOT NULL,
	"cycle_year" integer NOT NULL,
	"ticket_usd" numeric NOT NULL,
	"total_cost_agronomic" numeric NOT NULL,
	"total_cost_iot_service" numeric NOT NULL,
	"total_plan" numeric NOT NULL,
	"iot_infrastructure_harvverse" numeric NOT NULL,
	"split_farmer" numeric NOT NULL,
	"split_partner" numeric NOT NULL,
	"platform_commission" numeric NOT NULL,
	"price_per_lb_fixed" numeric NOT NULL,
	"price_floor" numeric NOT NULL,
	"yield_y1_qq" numeric NOT NULL,
	"yield_y2_qq" numeric NOT NULL,
	"yield_y3_qq" numeric NOT NULL,
	"yield_ceiling_qq" numeric NOT NULL,
	"phygital_coffee_lb" numeric NOT NULL,
	"phygital_delivery" text NOT NULL,
	"profile" text NOT NULL,
	"validator_name" text NOT NULL,
	"validator_title" text NOT NULL,
	"milestones" jsonb NOT NULL,
	"activities" jsonb,
	"contract_rules" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "agronomic_plans_plan_id_unique" UNIQUE("plan_id")
);
--> statement-breakpoint
CREATE TABLE "chain_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"tx_hash" varchar(66) NOT NULL,
	"chain_key" "chain_key" NOT NULL,
	"type" "tx_type" NOT NULL,
	"status" "tx_status" DEFAULT 'submitted' NOT NULL,
	"submitted_by_wallet" text,
	"related_proposal_id" integer,
	"related_partnership_id" integer,
	"related_settlement_id" integer,
	"block_number" integer,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "chain_transactions_tx_hash_unique" UNIQUE("tx_hash")
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" varchar(100) NOT NULL,
	"role" "chat_role" NOT NULL,
	"content" text NOT NULL,
	"rule" text,
	"tools_used" text[],
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contract_deployments" (
	"id" serial PRIMARY KEY NOT NULL,
	"chain_key" "chain_key" NOT NULL,
	"chain_id" integer NOT NULL,
	"contract_name" varchar(100) NOT NULL,
	"address" varchar(42) NOT NULL,
	"abi_hash" varchar(64) NOT NULL,
	"deploy_tx_hash" varchar(66) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "contract_deployments_chain_contract_unique" UNIQUE("chain_key","contract_name")
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" varchar(100) NOT NULL,
	"lot_code" varchar(30),
	"title" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "conversations_conversation_id_unique" UNIQUE("conversation_id")
);
--> statement-breakpoint
CREATE TABLE "custody_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"custody_type" "custody_type" NOT NULL,
	"chain_key" "chain_key" NOT NULL,
	"wallet_address" text NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evidence_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"partnership_id" integer NOT NULL,
	"milestone_number" integer NOT NULL,
	"evidence_type" "evidence_type" NOT NULL,
	"artifact_hash" varchar(64) NOT NULL,
	"attester_user_id" integer NOT NULL,
	"attester_role" "user_role" NOT NULL,
	"eas_uid" varchar(66),
	"registry_tx_hash" varchar(66),
	"status" "evidence_status" DEFAULT 'recorded' NOT NULL,
	"demo_only" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "farms" (
	"id" serial PRIMARY KEY NOT NULL,
	"farmer_id" integer NOT NULL,
	"name" text NOT NULL,
	"country" text NOT NULL,
	"region" text NOT NULL,
	"altitude_masl" integer,
	"total_area" numeric,
	"area_manzanas" numeric,
	"varieties" text[],
	"description" text,
	"certifications" text[],
	"photo_url" text,
	"latitude" numeric,
	"longitude" numeric,
	"polygon" jsonb,
	"coe_score" numeric,
	"verified" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lots" (
	"id" serial PRIMARY KEY NOT NULL,
	"farm_id" integer NOT NULL,
	"code" varchar(30),
	"farm_name" text NOT NULL,
	"farmer_wallet" text NOT NULL,
	"region" text NOT NULL,
	"country" text NOT NULL,
	"variety" text,
	"process" text,
	"altitude_masl" integer,
	"area_manzanas" numeric,
	"gps_lat" numeric,
	"gps_lng" numeric,
	"sca_score_tenths" integer,
	"harvest_year" integer,
	"profile" text,
	"summary" text,
	"cover" text,
	"status" "lot_status" DEFAULT 'available' NOT NULL,
	"active_plan_code" varchar(30),
	"risk_score" integer,
	"eudr_compliant" boolean,
	"score_hash" varchar(64),
	"score_version" integer DEFAULT 1,
	"score_updated_at" timestamp,
	"onchain_lot_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "lots_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "modules" (
	"id" serial PRIMARY KEY NOT NULL,
	"module_id" varchar(50) NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "modules_module_id_unique" UNIQUE("module_id")
);
--> statement-breakpoint
CREATE TABLE "partnerships" (
	"id" serial PRIMARY KEY NOT NULL,
	"proposal_id" integer NOT NULL,
	"lot_id" integer NOT NULL,
	"plan_id" integer NOT NULL,
	"partner_user_id" integer NOT NULL,
	"partner_wallet" text NOT NULL,
	"farmer_wallet" text NOT NULL,
	"status" "partnership_status" DEFAULT 'active' NOT NULL,
	"chain_key" "chain_key" NOT NULL,
	"onchain_partnership_id" integer,
	"certificate_token_id" integer,
	"opened_tx_hash" varchar(66),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "partnerships_lot_partner_unique" UNIQUE("lot_id","partner_user_id")
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan_code" varchar(30) NOT NULL,
	"lot_id" integer,
	"lot_code" varchar(30),
	"version" varchar(10),
	"source_uri" text,
	"status" "plan_status" DEFAULT 'draft' NOT NULL,
	"validated_by_name" text,
	"validated_by_credential" text,
	"ticket_cents" integer NOT NULL,
	"price_cents_per_lb" integer NOT NULL,
	"price_floor_cents_per_lb" integer,
	"agronomic_cost_cents" integer NOT NULL,
	"contingency_cents" integer,
	"platform_fee_cents" integer,
	"working_capital_cents" integer,
	"projected_yield_y1_tenths_qq" integer NOT NULL,
	"yield_cap_y1_tenths_qq" integer NOT NULL,
	"split_farmer_bps" integer NOT NULL,
	"split_partner_bps" integer,
	"phygital_coffee_lb" numeric,
	"phygital_delivery_month" varchar(20),
	"plan_hash" varchar(64) NOT NULL,
	"terms_summary" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "plans_plan_code_unique" UNIQUE("plan_code")
);
--> statement-breakpoint
CREATE TABLE "proposals" (
	"id" serial PRIMARY KEY NOT NULL,
	"lot_id" integer NOT NULL,
	"plan_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"wallet_address" text NOT NULL,
	"partnership_type" varchar(20) DEFAULT 'phygital' NOT NULL,
	"status" "proposal_status" DEFAULT 'pending' NOT NULL,
	"revenue_cents" integer NOT NULL,
	"profit_cents" integer NOT NULL,
	"farmer_cents" integer NOT NULL,
	"partner_cents" integer NOT NULL,
	"proposal_hash" varchar(64) NOT NULL,
	"typed_data_signature" text,
	"approval_tx_hash" varchar(66),
	"submitted_tx_hash" varchar(66),
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sensor_data" (
	"id" serial PRIMARY KEY NOT NULL,
	"module_id" varchar(50) NOT NULL,
	"week" varchar(10) NOT NULL,
	"year" integer NOT NULL,
	"week_number" integer NOT NULL,
	"ambient_temperature" numeric NOT NULL,
	"ambient_humidity" numeric NOT NULL,
	"soil_humidity" numeric NOT NULL,
	"ambient_temperature_count" integer NOT NULL,
	"ambient_humidity_count" integer NOT NULL,
	"soil_humidity_count" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sensor_data_module_week_unique" UNIQUE("module_id","week")
);
--> statement-breakpoint
CREATE TABLE "settlements" (
	"id" serial PRIMARY KEY NOT NULL,
	"partnership_id" integer NOT NULL,
	"status" "settlement_status" DEFAULT 'intent_created' NOT NULL,
	"year" integer NOT NULL,
	"yield_tenths_qq" integer NOT NULL,
	"sca_score_tenths" integer NOT NULL,
	"price_cents_per_lb" integer NOT NULL,
	"revenue_cents" integer NOT NULL,
	"profit_cents" integer NOT NULL,
	"farmer_cents" integer NOT NULL,
	"partner_cents" integer NOT NULL,
	"harvest_evidence_hash" varchar(64) NOT NULL,
	"funding_tx_hash" varchar(66),
	"settlement_tx_hash" varchar(66),
	"signed_by_wallet" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"role" "user_role" NOT NULL,
	"wallet_address" text NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_wallet_address_unique" UNIQUE("wallet_address")
);
--> statement-breakpoint
CREATE TABLE "wallet_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"wallet_address" text NOT NULL,
	"nonce" text NOT NULL,
	"session_id_hash" text NOT NULL,
	"chain_id" integer NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "wallet_sessions_session_id_hash_unique" UNIQUE("session_id_hash")
);
--> statement-breakpoint
DROP TABLE "todos" CASCADE;--> statement-breakpoint
ALTER TABLE "agent_events" ADD CONSTRAINT "agent_events_proposal_id_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chain_transactions" ADD CONSTRAINT "chain_transactions_related_proposal_id_proposals_id_fk" FOREIGN KEY ("related_proposal_id") REFERENCES "public"."proposals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chain_transactions" ADD CONSTRAINT "chain_transactions_related_partnership_id_partnerships_id_fk" FOREIGN KEY ("related_partnership_id") REFERENCES "public"."partnerships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chain_transactions" ADD CONSTRAINT "chain_transactions_related_settlement_id_settlements_id_fk" FOREIGN KEY ("related_settlement_id") REFERENCES "public"."settlements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_records" ADD CONSTRAINT "evidence_records_partnership_id_partnerships_id_fk" FOREIGN KEY ("partnership_id") REFERENCES "public"."partnerships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_records" ADD CONSTRAINT "evidence_records_attester_user_id_users_id_fk" FOREIGN KEY ("attester_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farms" ADD CONSTRAINT "farms_farmer_id_users_id_fk" FOREIGN KEY ("farmer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lots" ADD CONSTRAINT "lots_farm_id_farms_id_fk" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partnerships" ADD CONSTRAINT "partnerships_proposal_id_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partnerships" ADD CONSTRAINT "partnerships_lot_id_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."lots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partnerships" ADD CONSTRAINT "partnerships_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partnerships" ADD CONSTRAINT "partnerships_partner_user_id_users_id_fk" FOREIGN KEY ("partner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plans" ADD CONSTRAINT "plans_lot_id_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."lots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_lot_id_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."lots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_partnership_id_partnerships_id_fk" FOREIGN KEY ("partnership_id") REFERENCES "public"."partnerships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_sessions" ADD CONSTRAINT "wallet_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_events_proposal_created_at_idx" ON "agent_events" USING btree ("proposal_id","created_at");--> statement-breakpoint
CREATE INDEX "agronomic_plans_plan_id_idx" ON "agronomic_plans" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "agronomic_plans_lot_code_idx" ON "agronomic_plans" USING btree ("lot_code");--> statement-breakpoint
CREATE INDEX "chain_transactions_tx_hash_idx" ON "chain_transactions" USING btree ("tx_hash");--> statement-breakpoint
CREATE INDEX "chain_transactions_status_idx" ON "chain_transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "chain_transactions_related_proposal_idx" ON "chain_transactions" USING btree ("related_proposal_id");--> statement-breakpoint
CREATE INDEX "chain_transactions_related_partnership_idx" ON "chain_transactions" USING btree ("related_partnership_id");--> statement-breakpoint
CREATE INDEX "chain_transactions_related_settlement_idx" ON "chain_transactions" USING btree ("related_settlement_id");--> statement-breakpoint
CREATE INDEX "chat_messages_conversation_id_idx" ON "chat_messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "chat_messages_conversation_created_at_idx" ON "chat_messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "contract_deployments_chain_contract_idx" ON "contract_deployments" USING btree ("chain_key","contract_name");--> statement-breakpoint
CREATE INDEX "conversations_conversation_id_idx" ON "conversations" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "conversations_lot_code_idx" ON "conversations" USING btree ("lot_code");--> statement-breakpoint
CREATE INDEX "conversations_lot_code_updated_at_idx" ON "conversations" USING btree ("lot_code","updated_at");--> statement-breakpoint
CREATE INDEX "custody_accounts_chain_custody_idx" ON "custody_accounts" USING btree ("chain_key","custody_type");--> statement-breakpoint
CREATE INDEX "custody_accounts_wallet_address_idx" ON "custody_accounts" USING btree ("wallet_address");--> statement-breakpoint
CREATE INDEX "evidence_records_partnership_milestone_idx" ON "evidence_records" USING btree ("partnership_id","milestone_number");--> statement-breakpoint
CREATE INDEX "evidence_records_artifact_hash_idx" ON "evidence_records" USING btree ("artifact_hash");--> statement-breakpoint
CREATE INDEX "farms_farmer_id_idx" ON "farms" USING btree ("farmer_id");--> statement-breakpoint
CREATE INDEX "lots_farm_id_idx" ON "lots" USING btree ("farm_id");--> statement-breakpoint
CREATE INDEX "lots_code_idx" ON "lots" USING btree ("code");--> statement-breakpoint
CREATE INDEX "lots_status_idx" ON "lots" USING btree ("status");--> statement-breakpoint
CREATE INDEX "modules_module_id_idx" ON "modules" USING btree ("module_id");--> statement-breakpoint
CREATE INDEX "partnerships_proposal_id_idx" ON "partnerships" USING btree ("proposal_id");--> statement-breakpoint
CREATE INDEX "partnerships_partner_user_id_idx" ON "partnerships" USING btree ("partner_user_id");--> statement-breakpoint
CREATE INDEX "partnerships_status_idx" ON "partnerships" USING btree ("status");--> statement-breakpoint
CREATE INDEX "partnerships_onchain_partnership_id_idx" ON "partnerships" USING btree ("onchain_partnership_id");--> statement-breakpoint
CREATE INDEX "plans_plan_code_idx" ON "plans" USING btree ("plan_code");--> statement-breakpoint
CREATE INDEX "plans_lot_id_idx" ON "plans" USING btree ("lot_id");--> statement-breakpoint
CREATE INDEX "plans_lot_code_idx" ON "plans" USING btree ("lot_code");--> statement-breakpoint
CREATE INDEX "proposals_user_status_idx" ON "proposals" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "proposals_proposal_hash_idx" ON "proposals" USING btree ("proposal_hash");--> statement-breakpoint
CREATE INDEX "sensor_data_module_week_idx" ON "sensor_data" USING btree ("module_id","week");--> statement-breakpoint
CREATE INDEX "sensor_data_year_week_idx" ON "sensor_data" USING btree ("year","week_number");--> statement-breakpoint
CREATE INDEX "sensor_data_module_year_week_idx" ON "sensor_data" USING btree ("module_id","year","week_number");--> statement-breakpoint
CREATE INDEX "settlements_partnership_id_idx" ON "settlements" USING btree ("partnership_id");--> statement-breakpoint
CREATE INDEX "settlements_status_idx" ON "settlements" USING btree ("status");--> statement-breakpoint
CREATE INDEX "users_wallet_address_idx" ON "users" USING btree ("wallet_address");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "wallet_sessions_session_id_hash_idx" ON "wallet_sessions" USING btree ("session_id_hash");--> statement-breakpoint
CREATE INDEX "wallet_sessions_wallet_status_idx" ON "wallet_sessions" USING btree ("wallet_address","status");