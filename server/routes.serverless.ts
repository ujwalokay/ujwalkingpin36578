import type { Express } from "express";
import { storage } from "./storage";
import { webhookLimiter, publicApiLimiter, sensitiveOperationLimiter, dataExportLimiter } from "./auth";
import { retentionService } from "./retention";
import { cleanupScheduler } from "./scheduler";
import { fetchNeonStorageMetrics } from "./neon-metrics";
import { db } from "./db.serverless";
import { eq } from "drizzle-orm";
import * as schema from "@shared/schema";
import { notifyActivityLog, notifyLowInventory, notifyExpenseAdded, notifyPaymentReceived, notifySessionExpired, notifySessionCompleted } from "./notifications";
import { 
  insertBookingSchema, 
  insertDeviceConfigSchema, 
  insertPricingConfigSchema, 
  insertHappyHoursConfigSchema,
  insertHappyHoursPricingSchema,
  insertFoodItemSchema, 
  insertExpenseSchema,
  insertNotificationSchema,
  insertGamingCenterInfoSchema,
  insertGalleryImageSchema,
  insertFacilitySchema,
  insertGameSchema
} from "@shared/schema";
import { z } from "zod";
import { registerRoutes as registerOriginalRoutes } from "./routes";

/**
 * Serverless version of registerRoutes - doesn't create HTTP server
 * This is for use in Vercel serverless functions
 */
export async function registerRoutesServerless(app: Express): Promise<void> {
  // Import and register all routes from the original routes file
  // but don't create the HTTP server
  await registerOriginalRoutes(app);
  
  // Routes are now registered on the app, but we don't create a server
  // Vercel will handle the server creation
}
