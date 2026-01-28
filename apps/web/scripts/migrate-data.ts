#!/usr/bin/env ts-node
/**
 * MongoDB to PostgreSQL Data Migration Script
 * 
 * This script migrates data from MongoDB Atlas to Supabase PostgreSQL
 * while preserving relationships and maintaining data integrity.
 */

import { MongoClient, ObjectId, Db } from 'mongodb';
import { PrismaClient } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';
import * as fs from 'fs';
import * as path from 'path';

// Configuration
const MONGO_URI = process.env.MONGO_SOURCE_URL || process.env.DATABASE_URL!;
const BATCH_SIZE = 100;

// Initialize Prisma for PostgreSQL
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.POSTGRES_URL || process.env.DATABASE_URL!
    }
  }
});

// ID mapping: MongoDB ObjectId -> PostgreSQL CUID
const idMaps: Record<string, Map<string, string>> = {
  users: new Map(),
  projects: new Map(),
  tasks: new Map(),
  templates: new Map(),
  templateCategories: new Map(),
  historyEntries: new Map(),
  sessions: new Map(),
  oauthAccounts: new Map(),
  emailVerifications: new Map(),
  passwordResets: new Map(),
  taskAssets: new Map(),
  usageLedgers: new Map(),
  billingEvents: new Map(),
  planConfigs: new Map(),
  paymentConfigs: new Map(),
  apiKeys: new Map(),
  promoSignups: new Map(),
  supportRequests: new Map(),
  feedbacks: new Map(),
  recommendationFeedbacks: new Map(),
};

function mapId(collection: string, oldId: string | null | undefined): string | null {
  if (!oldId) return null;
  if (!idMaps[collection]) {
    idMaps[collection] = new Map();
  }
  if (!idMaps[collection].has(oldId)) {
    idMaps[collection].set(oldId, createId());
  }
  return idMaps[collection].get(oldId)!;
}

function logProgress(message: string) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

async function migrateUsers(db: Db) {
  logProgress('Migrating users...');
  const users = await db.collection('User').find().toArray();
  let count = 0;

  for (const user of users) {
    const newId = mapId('users', user._id.toString())!;
    
    await prisma.user.create({
      data: {
        id: newId,
        firstName: user.firstName,
        lastName: user.lastName,
        workDescription: user.workDescription || null,
        email: user.email,
        passwordHash: user.passwordHash,
        emailVerifiedAt: user.emailVerifiedAt ? new Date(user.emailVerifiedAt) : null,
        role: user.role || 'USER',
        plan: user.plan || 'FREE',
        planStatus: user.planStatus || 'ACTIVE',
        stripeCustomerId: user.stripeCustomerId || null,
        generationLimit: user.generationLimit || null,
        lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt) : null,
        createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
        updatedAt: user.updatedAt ? new Date(user.updatedAt) : new Date(),
        deletedAt: user.deletedAt ? new Date(user.deletedAt) : null,
        deletedById: user.deletedById ? mapId('users', user.deletedById) : null,
      },
    });
    count++;
  }
  
  logProgress(`✅ Migrated ${count} users`);
}

async function migrateTemplateCategories(db: Db) {
  logProgress('Migrating template categories...');
  const categories = await db.collection('TemplateCategory').find().toArray();
  let count = 0;

  for (const cat of categories) {
    const newId = mapId('templateCategories', cat._id.toString())!;
    
    await prisma.templateCategory.create({
      data: {
        id: newId,
        name: cat.name,
        sortOrder: cat.sortOrder ?? 0,
        createdAt: cat.createdAt ? new Date(cat.createdAt) : new Date(),
        updatedAt: cat.updatedAt ? new Date(cat.updatedAt) : new Date(),
      },
    });
    count++;
  }
  
  logProgress(`✅ Migrated ${count} template categories`);
}

async function migrateTaskTemplates(db: Db) {
  logProgress('Migrating task templates...');
  const templates = await db.collection('TaskTemplate').find().toArray();
  let count = 0;

  for (const template of templates) {
    const newId = mapId('templates', template._id.toString())!;
    
    // Handle templateCategoryId - check if the category exists in our mapping
    let templateCategoryId = null;
    if (template.templateCategoryId) {
      const catIdStr = template.templateCategoryId.toString();
      // Only set if the category was previously mapped (exists in our mapping)
      if (idMaps.templateCategories.has(catIdStr)) {
        templateCategoryId = idMaps.templateCategories.get(catIdStr);
      } else {
        logProgress(`⚠️  Template "${template.title}" has unmapped categoryId: ${catIdStr}`);
      }
    }
    
    // Handle createdById - check if the user exists in our mapping
    let createdById = null;
    if (template.createdById) {
      const userIdStr = template.createdById.toString();
      if (idMaps.users.has(userIdStr)) {
        createdById = idMaps.users.get(userIdStr);
      }
    }
    
    await prisma.taskTemplate.create({
      data: {
        id: newId,
        category: template.category,
        subcategory: template.subcategory,
        title: template.title,
        guidanceUseAiTo: template.guidanceUseAiTo || null,
        guidanceExample: template.guidanceExample || null,
        guidanceOutcome: template.guidanceOutcome || null,
        prompt: template.prompt,
        assets: template.assets || null,
        allowedModes: template.allowedModes || [],
        allowedModels: template.allowedModels || [],
        allowUrlInput: template.allowUrlInput ?? false,
        allowFileUploads: template.allowFileUploads ?? true,
        allowMockupGeneration: template.allowMockupGeneration ?? true,
        allowRefineAnalysis: template.allowRefineAnalysis ?? true,
        isActive: template.isActive ?? true,
        templateCategoryId: templateCategoryId,
        createdById: createdById,
        createdAt: template.createdAt ? new Date(template.createdAt) : new Date(),
        updatedAt: template.updatedAt ? new Date(template.updatedAt) : new Date(),
      },
    });
    count++;
  }
  
  logProgress(`✅ Migrated ${count} task templates`);
}

async function migrateProjects(db: Db) {
  logProgress('Migrating projects...');
  const projects = await db.collection('Project').find().toArray();
  let count = 0;
  let skipped = 0;

  for (const project of projects) {
    // Check if the user exists in our mapping
    const userIdStr = project.userId?.toString();
    if (!userIdStr || !idMaps.users.has(userIdStr)) {
      logProgress(`⚠️  Skipping project "${project.name}" - user not found: ${userIdStr}`);
      skipped++;
      continue;
    }
    
    const newId = mapId('projects', project._id.toString())!;
    const userId = idMaps.users.get(userIdStr)!;
    
    await prisma.project.create({
      data: {
        id: newId,
        userId: userId,
        name: project.name,
        sortOrder: project.sortOrder ?? 0,
        description: project.description || null,
        metadata: project.metadata || null,
        createdAt: project.createdAt ? new Date(project.createdAt) : new Date(),
        updatedAt: project.updatedAt ? new Date(project.updatedAt) : new Date(),
      },
    });
    count++;
  }
  
  logProgress(`✅ Migrated ${count} projects (skipped ${skipped})`);
}

async function migrateTasks(db: Db) {
  logProgress('Migrating tasks...');
  const tasks = await db.collection('Task').find().toArray();
  let count = 0;

  for (const task of tasks) {
    const newId = mapId('tasks', task._id.toString())!;
    
    await prisma.task.create({
      data: {
        id: newId,
        projectId: task.projectId ? mapId('projects', task.projectId) : null,
        userId: mapId('users', task.userId)!,
        templateId: task.templateId ? mapId('templates', task.templateId) : null,
        prompt: task.prompt,
        mode: task.mode,
        model: task.model,
        status: task.status || 'PENDING',
        response: task.response || null,
        error: task.error || null,
        contextThreadId: task.contextThreadId || null,
        createdAt: task.createdAt ? new Date(task.createdAt) : new Date(),
        updatedAt: task.updatedAt ? new Date(task.updatedAt) : new Date(),
      },
    });
    count++;
  }
  
  logProgress(`✅ Migrated ${count} tasks`);
}

async function migrateHistoryEntries(db: Db) {
  logProgress('Migrating history entries...');
  const entries = await db.collection('HistoryEntry').find().toArray();
  let count = 0;
  let skipped = 0;

  for (const entry of entries) {
    const userIdStr = entry.userId?.toString();
    if (!userIdStr || !idMaps.users.has(userIdStr)) {
      logProgress(`⚠️  Skipping history entry "${entry.title}" - user not found`);
      skipped++;
      continue;
    }
    
    const newId = mapId('historyEntries', entry._id.toString())!;
    const userId = idMaps.users.get(userIdStr)!;
    
    // Handle projectId
    let projectId = null;
    if (entry.projectId) {
      const projIdStr = entry.projectId.toString();
      if (idMaps.projects.has(projIdStr)) {
        projectId = idMaps.projects.get(projIdStr);
      }
    }
    
    await prisma.historyEntry.create({
      data: {
        id: newId,
        userId: userId,
        projectId: projectId,
        title: entry.title,
        content: entry.content,
        templateIndex: entry.templateIndex ?? null,
        createdAt: entry.createdAt ? new Date(entry.createdAt) : new Date(),
        updatedAt: entry.updatedAt ? new Date(entry.updatedAt) : new Date(),
      },
    });
    count++;
  }
  
  logProgress(`✅ Migrated ${count} history entries (skipped ${skipped})`);
}

async function migrateSessions(db: Db) {
  logProgress('Migrating sessions...');
  const sessions = await db.collection('Session').find().toArray();
  let count = 0;
  let skipped = 0;

  for (const session of sessions) {
    const userIdStr = session.userId?.toString();
    if (!userIdStr || !idMaps.users.has(userIdStr)) {
      skipped++;
      continue;
    }
    
    const newId = mapId('sessions', session._id.toString())!;
    const userId = idMaps.users.get(userIdStr)!;
    
    await prisma.session.create({
      data: {
        id: newId,
        userId: userId,
        tokenHash: session.tokenHash,
        expiresAt: new Date(session.expiresAt),
        revokedAt: session.revokedAt ? new Date(session.revokedAt) : null,
        createdAt: session.createdAt ? new Date(session.createdAt) : new Date(),
      },
    });
    count++;
  }
  
  logProgress(`✅ Migrated ${count} sessions (skipped ${skipped})`);
}

async function migrateOAuthAccounts(db: Db) {
  logProgress('Migrating OAuth accounts...');
  const accounts = await db.collection('OAuthAccount').find().toArray();
  let count = 0;
  let skipped = 0;

  for (const account of accounts) {
    const userIdStr = account.userId?.toString();
    if (!userIdStr || !idMaps.users.has(userIdStr)) {
      skipped++;
      continue;
    }
    
    const newId = mapId('oauthAccounts', account._id.toString())!;
    const userId = idMaps.users.get(userIdStr)!;
    
    await prisma.oAuthAccount.create({
      data: {
        id: newId,
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        email: account.email || null,
        userId: userId,
        createdAt: account.createdAt ? new Date(account.createdAt) : new Date(),
        updatedAt: account.updatedAt ? new Date(account.updatedAt) : new Date(),
      },
    });
    count++;
  }
  
  logProgress(`✅ Migrated ${count} OAuth accounts (skipped ${skipped})`);
}

async function migrateEmailVerifications(db: Db) {
  logProgress('Migrating email verifications...');
  const verifications = await db.collection('EmailVerification').find().toArray();
  let count = 0;
  let skipped = 0;

  for (const verification of verifications) {
    const userIdStr = verification.userId?.toString();
    if (!userIdStr || !idMaps.users.has(userIdStr)) {
      skipped++;
      continue;
    }
    
    const newId = mapId('emailVerifications', verification._id.toString())!;
    const userId = idMaps.users.get(userIdStr)!;
    
    await prisma.emailVerification.create({
      data: {
        id: newId,
        userId: userId,
        tokenHash: verification.tokenHash,
        expiresAt: new Date(verification.expiresAt),
        usedAt: verification.usedAt ? new Date(verification.usedAt) : null,
        createdAt: verification.createdAt ? new Date(verification.createdAt) : new Date(),
      },
    });
    count++;
  }
  
  logProgress(`✅ Migrated ${count} email verifications (skipped ${skipped})`);
}

async function migratePasswordResets(db: Db) {
  logProgress('Migrating password resets...');
  const resets = await db.collection('PasswordReset').find().toArray();
  let count = 0;
  let skipped = 0;

  for (const reset of resets) {
    const userIdStr = reset.userId?.toString();
    if (!userIdStr || !idMaps.users.has(userIdStr)) {
      skipped++;
      continue;
    }
    
    const newId = mapId('passwordResets', reset._id.toString())!;
    const userId = idMaps.users.get(userIdStr)!;
    
    await prisma.passwordReset.create({
      data: {
        id: newId,
        userId: userId,
        tokenHash: reset.tokenHash,
        expiresAt: new Date(reset.expiresAt),
        usedAt: reset.usedAt ? new Date(reset.usedAt) : null,
        createdAt: reset.createdAt ? new Date(reset.createdAt) : new Date(),
      },
    });
    count++;
  }
  
  logProgress(`✅ Migrated ${count} password resets (skipped ${skipped})`);
}

async function migrateTaskAssets(db: Db) {
  logProgress('Migrating task assets...');
  const assets = await db.collection('TaskAsset').find().toArray();
  let count = 0;

  for (const asset of assets) {
    const newId = mapId('taskAssets', asset._id.toString())!;
    
    await prisma.taskAsset.create({
      data: {
        id: newId,
        taskId: mapId('tasks', asset.taskId)!,
        filename: asset.filename,
        mimeType: asset.mimeType,
        sizeBytes: asset.sizeBytes,
        storagePath: asset.storagePath,
        createdAt: asset.createdAt ? new Date(asset.createdAt) : new Date(),
      },
    });
    count++;
  }
  
  logProgress(`✅ Migrated ${count} task assets`);
}

async function migrateUsageLedgers(db: Db) {
  logProgress('Migrating usage ledgers...');
  const ledgers = await db.collection('UsageLedger').find().toArray();
  let count = 0;
  let skipped = 0;

  for (const ledger of ledgers) {
    const userIdStr = ledger.userId?.toString();
    if (!userIdStr || !idMaps.users.has(userIdStr)) {
      skipped++;
      continue;
    }
    
    const newId = mapId('usageLedgers', ledger._id.toString())!;
    const userId = idMaps.users.get(userIdStr)!;
    
    // Handle taskId
    let taskId = null;
    if (ledger.taskId) {
      const taskIdStr = ledger.taskId.toString();
      if (idMaps.tasks.has(taskIdStr)) {
        taskId = idMaps.tasks.get(taskIdStr);
      }
    }
    
    await prisma.usageLedger.create({
      data: {
        id: newId,
        userId: userId,
        taskId: taskId,
        type: ledger.type,
        costEstimateUsd: ledger.costEstimateUsd ?? null,
        tokensIn: ledger.tokensIn ?? null,
        tokensOut: ledger.tokensOut ?? null,
        model: ledger.model || null,
        createdAt: ledger.createdAt ? new Date(ledger.createdAt) : new Date(),
      },
    });
    count++;
  }
  
  logProgress(`✅ Migrated ${count} usage ledgers (skipped ${skipped})`);
}

async function migrateBillingEvents(db: Db) {
  logProgress('Migrating billing events...');
  const events = await db.collection('BillingEvent').find().toArray();
  let count = 0;

  for (const event of events) {
    const newId = mapId('billingEvents', event._id.toString())!;
    
    await prisma.billingEvent.create({
      data: {
        id: newId,
        userId: event.userId ? mapId('users', event.userId) : null,
        stripeEventId: event.stripeEventId,
        type: event.type,
        data: event.data,
        createdAt: event.createdAt ? new Date(event.createdAt) : new Date(),
      },
    });
    count++;
  }
  
  logProgress(`✅ Migrated ${count} billing events`);
}

async function migrateFeatureFlags(db: Db) {
  logProgress('Migrating feature flags...');
  const flags = await db.collection('FeatureFlag').find().toArray();
  let count = 0;

  for (const flag of flags) {
    await prisma.featureFlag.create({
      data: {
        key: flag._id?.toString() || flag.key,
        scope: flag.scope,
        value: flag.value,
        userId: flag.userId || null,
        role: flag.role || null,
        createdAt: flag.createdAt ? new Date(flag.createdAt) : new Date(),
      },
    });
    count++;
  }
  
  logProgress(`✅ Migrated ${count} feature flags`);
}

async function migratePlanConfigs(db: Db) {
  logProgress('Migrating plan configs...');
  const configs = await db.collection('PlanConfig').find().toArray();
  let count = 0;

  for (const config of configs) {
    const newId = mapId('planConfigs', config._id.toString())!;
    
    await prisma.planConfig.create({
      data: {
        id: newId,
        plan: config.plan,
        dailyLimit: config.dailyLimit,
        createdAt: config.createdAt ? new Date(config.createdAt) : new Date(),
        updatedAt: config.updatedAt ? new Date(config.updatedAt) : new Date(),
      },
    });
    count++;
  }
  
  logProgress(`✅ Migrated ${count} plan configs`);
}

async function migratePaymentConfigs(db: Db) {
  logProgress('Migrating payment configs...');
  const configs = await db.collection('PaymentConfig').find().toArray();
  let count = 0;

  for (const config of configs) {
    const newId = mapId('paymentConfigs', config._id.toString())!;
    
    await prisma.paymentConfig.create({
      data: {
        id: newId,
        pricePro: config.pricePro || null,
        createdAt: config.createdAt ? new Date(config.createdAt) : new Date(),
        updatedAt: config.updatedAt ? new Date(config.updatedAt) : new Date(),
      },
    });
    count++;
  }
  
  logProgress(`✅ Migrated ${count} payment configs`);
}

async function migrateApiKeys(db: Db) {
  logProgress('Migrating API keys...');
  const keys = await db.collection('ApiKey').find().toArray();
  let count = 0;

  for (const key of keys) {
    const newId = mapId('apiKeys', key._id.toString())!;
    
    // Handle createdById - only set if user exists
    let createdById = null;
    if (key.createdById) {
      const userIdStr = key.createdById.toString();
      if (idMaps.users.has(userIdStr)) {
        createdById = idMaps.users.get(userIdStr);
      }
    }
    
    await prisma.apiKey.create({
      data: {
        id: newId,
        provider: key.provider,
        displayName: key.displayName,
        key: key.key,
        isActive: key.isActive ?? true,
        createdById: createdById,
        createdAt: key.createdAt ? new Date(key.createdAt) : new Date(),
        updatedAt: key.updatedAt ? new Date(key.updatedAt) : new Date(),
      },
    });
    count++;
  }
  
  logProgress(`✅ Migrated ${count} API keys`);
}

async function migratePromoSignups(db: Db) {
  logProgress('Migrating promo signups...');
  const signups = await db.collection('PromoSignup').find().toArray();
  let count = 0;

  for (const signup of signups) {
    const newId = mapId('promoSignups', signup._id.toString())!;
    
    await prisma.promoSignup.create({
      data: {
        id: newId,
        firstName: signup.firstName,
        lastName: signup.lastName,
        email: signup.email,
        yearsExperience: signup.yearsExperience,
        status: signup.status || 'PENDING',
        activatedAt: signup.activatedAt ? new Date(signup.activatedAt) : null,
        expiresAt: signup.expiresAt ? new Date(signup.expiresAt) : null,
        createdAt: signup.createdAt ? new Date(signup.createdAt) : new Date(),
        updatedAt: signup.updatedAt ? new Date(signup.updatedAt) : new Date(),
      },
    });
    count++;
  }
  
  logProgress(`✅ Migrated ${count} promo signups`);
}

async function migrateSupportRequests(db: Db) {
  logProgress('Migrating support requests...');
  const requests = await db.collection('SupportRequest').find().toArray();
  let count = 0;

  for (const request of requests) {
    const newId = mapId('supportRequests', request._id.toString())!;
    
    await prisma.supportRequest.create({
      data: {
        id: newId,
        userId: request.userId ? mapId('users', request.userId) : null,
        firstName: request.firstName,
        lastName: request.lastName,
        email: request.email,
        message: request.message,
        phone: request.phone || null,
        requestType: request.requestType || null,
        createdAt: request.createdAt ? new Date(request.createdAt) : new Date(),
      },
    });
    count++;
  }
  
  logProgress(`✅ Migrated ${count} support requests`);
}

async function migrateFeedbacks(db: Db) {
  logProgress('Migrating feedbacks...');
  const feedbacks = await db.collection('Feedback').find().toArray();
  let count = 0;

  for (const feedback of feedbacks) {
    const newId = mapId('feedbacks', feedback._id.toString())!;
    
    // Handle userId - only set if user exists
    let userId = null;
    if (feedback.userId) {
      const userIdStr = feedback.userId.toString();
      if (idMaps.users.has(userIdStr)) {
        userId = idMaps.users.get(userIdStr);
      }
    }
    
    await prisma.feedback.create({
      data: {
        id: newId,
        userId: userId,
        type: feedback.type,
        message: feedback.message,
        source: feedback.source || null,
        triggerCount: feedback.triggerCount ?? null,
        taskId: feedback.taskId || null,
        createdAt: feedback.createdAt ? new Date(feedback.createdAt) : new Date(),
      },
    });
    count++;
  }
  
  logProgress(`✅ Migrated ${count} feedbacks`);
}

async function migrateRecommendationFeedbacks(db: Db) {
  logProgress('Migrating recommendation feedbacks...');
  const feedbacks = await db.collection('RecommendationFeedback').find().toArray();
  let count = 0;
  let skipped = 0;

  for (const feedback of feedbacks) {
    // Check if user and history entry exist in mappings
    const userIdStr = feedback.userId?.toString();
    const historyEntryIdStr = feedback.historyEntryId?.toString();
    
    if (!userIdStr || !idMaps.users.has(userIdStr)) {
      skipped++;
      continue;
    }
    
    if (!historyEntryIdStr || !idMaps.historyEntries.has(historyEntryIdStr)) {
      skipped++;
      continue;
    }
    
    const newId = mapId('recommendationFeedbacks', feedback._id.toString())!;
    const userId = idMaps.users.get(userIdStr)!;
    const historyEntryId = idMaps.historyEntries.get(historyEntryIdStr)!;
    
    try {
      await prisma.recommendationFeedback.create({
        data: {
          id: newId,
          userId: userId,
          historyEntryId: historyEntryId,
          recommendationNum: feedback.recommendationNum,
          feedback: feedback.feedback,
          templateId: feedback.templateId || null,
          templateTitle: feedback.templateTitle || null,
          createdAt: feedback.createdAt ? new Date(feedback.createdAt) : new Date(),
          updatedAt: feedback.updatedAt ? new Date(feedback.updatedAt) : new Date(),
        },
      });
      count++;
    } catch (error: any) {
      if (error.code === 'P2002') {
        logProgress(`⚠️  Skipping duplicate recommendation feedback: ${feedback._id}`);
        skipped++;
      } else {
        throw error;
      }
    }
  }
  
  logProgress(`✅ Migrated ${count} recommendation feedbacks (skipped ${skipped})`);
}

async function saveIdMappings() {
  logProgress('Saving ID mappings...');
  const mappingsDir = path.join(__dirname, '../migration-output');
  if (!fs.existsSync(mappingsDir)) {
    fs.mkdirSync(mappingsDir, { recursive: true });
  }
  
  const mappingsFile = path.join(mappingsDir, 'id-mappings.json');
  const mappingsData: Record<string, Record<string, string>> = {};
  
  for (const [collection, map] of Object.entries(idMaps)) {
    mappingsData[collection] = Object.fromEntries(map);
  }
  
  fs.writeFileSync(mappingsFile, JSON.stringify(mappingsData, null, 2));
  logProgress(`✅ ID mappings saved to ${mappingsFile}`);
}

async function main() {
  const startTime = Date.now();
  logProgress('🚀 Starting MongoDB → PostgreSQL migration...');
  logProgress(`MongoDB URI: ${MONGO_URI.replace(/:[^:@]+@/, ':****@')}`);
  
  const mongo = new MongoClient(MONGO_URI);
  
  try {
    await mongo.connect();
    logProgress('✅ Connected to MongoDB');
    
    const db = mongo.db();
    
    // Order matters due to foreign key relationships
    // 1. Independent entities first
    await migrateUsers(db);
    await migrateTemplateCategories(db);
    await migratePlanConfigs(db);
    await migratePaymentConfigs(db);
    await migrateFeatureFlags(db);
    
    // 2. Entities with user dependencies
    await migrateTaskTemplates(db);
    await migrateProjects(db);
    await migrateApiKeys(db);
    await migrateSupportRequests(db);
    await migrateFeedbacks(db);
    
    // 3. Entities with multiple dependencies
    await migrateTasks(db);
    await migrateHistoryEntries(db);
    await migrateSessions(db);
    await migrateOAuthAccounts(db);
    await migrateEmailVerifications(db);
    await migratePasswordResets(db);
    await migratePromoSignups(db);
    
    // 4. Entities with task/history dependencies
    await migrateTaskAssets(db);
    await migrateUsageLedgers(db);
    await migrateBillingEvents(db);
    await migrateRecommendationFeedbacks(db);
    
    // Save ID mappings for reference
    await saveIdMappings();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logProgress(`✅ Migration completed successfully in ${duration}s!`);
    
  } catch (error) {
    logProgress(`❌ Migration failed: ${error}`);
    throw error;
  } finally {
    await mongo.close();
    await prisma.$disconnect();
    logProgress('Disconnected from databases');
  }
}

// Run migration
if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export { main as migrateMongToPostgres };
