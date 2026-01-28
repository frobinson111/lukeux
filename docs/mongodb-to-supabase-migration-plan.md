# MongoDB Atlas → Supabase (Postgres) Migration Plan

## Executive Summary

This document outlines a comprehensive step-by-step plan to migrate the LukeUX application from **MongoDB Atlas** (using Prisma ORM) to **Supabase** (PostgreSQL with Prisma ORM). The migration preserves the existing Prisma-based data access layer while switching the underlying database provider.

---

## Current State Analysis

### Technology Stack
- **Database**: MongoDB Atlas
- **ORM**: Prisma Client
- **Framework**: Next.js 14+ (App Router)
- **Authentication**: Custom session-based auth

### Current Models (21 total)
| Model | Description | MongoDB-Specific Features |
|-------|-------------|---------------------------|
| User | Core user model | `@db.ObjectId` for IDs |
| OAuthAccount | OAuth provider links | ObjectId references |
| Session | Auth sessions | ObjectId references |
| SupportRequest | Support tickets | ObjectId references |
| Feedback | User feedback | ObjectId references |
| EmailVerification | Email verification tokens | ObjectId references |
| PasswordReset | Password reset tokens | ObjectId references |
| Project | User projects | ObjectId references |
| HistoryEntry | Task history | ObjectId references |
| RecommendationFeedback | Recommendation feedback | ObjectId references |
| TaskTemplate | Task templates | ObjectId references, String arrays |
| TemplateCategory | Template categories | ObjectId references |
| PaymentConfig | Payment configuration | ObjectId |
| Task | Task records | ObjectId references, JSON fields |
| TaskAsset | Uploaded assets | ObjectId references |
| UsageLedger | Usage tracking | ObjectId references |
| BillingEvent | Billing events | ObjectId, JSON fields |
| FeatureFlag | Feature flags | Custom `@id` mapping, JSON fields |
| PlanConfig | Plan configuration | ObjectId |
| ApiKey | API keys | ObjectId references |
| PromoSignup | Promo signups | ObjectId |

### MongoDB-Specific Patterns to Address
1. **ObjectId** fields mapped with `@db.ObjectId`
2. **`@map("_id")`** directive for MongoDB `_id` field
3. **`@default(auto())`** for auto-generated ObjectIds
4. **String arrays** (`String[]`) - work differently in Postgres
5. **JSON fields** - need review for Postgres JSONB compatibility

---

## Phase 1: Pre-Migration Preparation (Week 1)

### Step 1.1: Set Up Supabase Project
- [ ] Create new Supabase project at [supabase.com](https://supabase.com)
- [ ] Note the connection string: `postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres`
- [ ] Enable Row Level Security (RLS) policies as needed
- [ ] Configure Supabase project settings (region, compute size)

### Step 1.2: Create Development Environment
```bash
# Create new environment variables
cp env.example env.supabase.local

# Add Supabase connection strings
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"
```

### Step 1.3: Backup MongoDB Data
```bash
# Export all collections from MongoDB Atlas
mongodump --uri="mongodb+srv://[USER]:[PASS]@[CLUSTER].mongodb.net/[DB]" --out=./backup

# Or use MongoDB Compass for GUI-based export
# Export each collection as JSON for data transformation
```

### Step 1.4: Document Current Data Volume
- [ ] Count records in each collection
- [ ] Identify large JSON/blob fields
- [ ] Note any indexes currently in use

---

## Phase 2: Schema Conversion (Week 1-2)

### Step 2.1: Create New PostgreSQL Schema

Create a new Prisma schema file for PostgreSQL:

**`apps/web/prisma/schema.postgres.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

enum UserRole {
  USER
  ADMIN
  SUPERUSER
}

enum Plan {
  FREE
  PRO
}

enum PlanStatus {
  ACTIVE
  PAUSED
  SUSPENDED
}

enum TaskStatus {
  PENDING
  RUNNING
  SUCCEEDED
  FAILED
}

enum UsageType {
  GENERATION
  FOLLOWUP
  IMAGE
}

enum FeatureFlagScope {
  GLOBAL
  USER
  ROLE
}

model User {
  id               String    @id @default(cuid())
  firstName        String
  lastName         String
  workDescription  String?
  email            String    @unique
  passwordHash     String
  emailVerifiedAt  DateTime?
  role             UserRole  @default(USER)
  plan             Plan      @default(FREE)
  planStatus       PlanStatus @default(ACTIVE)
  stripeCustomerId String?
  generationLimit  Int?
  lastLoginAt      DateTime?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  deletedAt        DateTime?
  deletedById      String?

  sessions               Session[]
  oauthAccounts          OAuthAccount[]
  emailVerifications     EmailVerification[]
  passwordResets         PasswordReset[]
  projects               Project[]
  tasks                  Task[]
  taskTemplates          TaskTemplate[] @relation("TemplateCreator")
  billingEvents          BillingEvent[]
  usageLedger            UsageLedger[]
  historyEntries         HistoryEntry[]
  apiKeys                ApiKey[]
  supportRequests        SupportRequest[]
  feedbacks              Feedback[]
  recommendationFeedbacks RecommendationFeedback[]
}

model OAuthAccount {
  id                 String   @id @default(cuid())
  provider           String
  providerAccountId  String
  email              String?
  userId             String
  user               User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  @@index([provider, providerAccountId])
  @@index([userId])
}

model Session {
  id         String    @id @default(cuid())
  userId     String
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  tokenHash  String    @unique
  expiresAt  DateTime
  revokedAt  DateTime?
  createdAt  DateTime  @default(now())

  @@index([userId])
  @@index([expiresAt])
}

model SupportRequest {
  id          String   @id @default(cuid())
  userId      String?
  user        User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  firstName   String
  lastName    String
  email       String
  message     String   @db.Text
  phone       String?
  requestType String?
  createdAt   DateTime @default(now())

  @@index([userId])
  @@index([createdAt])
}

model Feedback {
  id           String   @id @default(cuid())
  userId       String?
  user         User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  type         String
  message      String   @db.Text
  source       String?
  triggerCount Int?
  taskId       String?
  createdAt    DateTime @default(now())

  @@index([createdAt])
  @@index([userId])
  @@index([type])
}

model EmailVerification {
  id        String    @id @default(cuid())
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  tokenHash String    @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())

  @@index([userId])
}

model PasswordReset {
  id        String    @id @default(cuid())
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  tokenHash String    @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())

  @@index([userId])
}

model Project {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  name        String
  sortOrder   Int      @default(0)
  description String?  @db.Text
  metadata    Json?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  tasks   Task[]
  history HistoryEntry[]

  @@index([userId])
}

model HistoryEntry {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  projectId     String?
  project       Project? @relation(fields: [projectId], references: [id], onDelete: SetNull)
  title         String
  content       String   @db.Text
  templateIndex Int?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  recommendationFeedbacks RecommendationFeedback[]

  @@index([userId])
  @@index([projectId])
  @@index([createdAt])
}

model RecommendationFeedback {
  id                String       @id @default(cuid())
  userId            String
  user              User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  historyEntryId    String
  historyEntry      HistoryEntry @relation(fields: [historyEntryId], references: [id], onDelete: Cascade)
  recommendationNum Int
  feedback          String       // "UP" or "DOWN"
  templateId        String?
  templateTitle     String?
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt

  @@unique([userId, historyEntryId, recommendationNum])
  @@index([userId])
  @@index([historyEntryId])
  @@index([createdAt])
}

model TaskTemplate {
  id                    String   @id @default(cuid())
  category              String
  subcategory           String
  title                 String
  guidanceUseAiTo       String?  @db.Text
  guidanceExample       String?  @db.Text
  guidanceOutcome       String?  @db.Text
  prompt                String   @db.Text
  assets                String?  @db.Text
  allowedModes          String[] // PostgreSQL supports native arrays
  allowedModels         String[] // PostgreSQL supports native arrays
  allowUrlInput         Boolean  @default(false)
  allowFileUploads      Boolean  @default(true)
  allowMockupGeneration Boolean  @default(true)
  allowRefineAnalysis   Boolean  @default(true)
  isActive              Boolean  @default(true)
  templateCategoryId    String?
  templateCategory      TemplateCategory? @relation(fields: [templateCategoryId], references: [id], onDelete: SetNull)
  createdById           String?
  createdBy             User?    @relation("TemplateCreator", fields: [createdById], references: [id], onDelete: SetNull)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  tasks Task[]

  @@index([isActive, category, title])
  @@index([templateCategoryId])
}

model TemplateCategory {
  id        String   @id @default(cuid())
  name      String   @unique
  sortOrder Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  templates TaskTemplate[]
}

model PaymentConfig {
  id        String   @id @default(cuid())
  pricePro  String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Task {
  id              String        @id @default(cuid())
  projectId       String?
  project         Project?      @relation(fields: [projectId], references: [id], onDelete: SetNull)
  userId          String
  user            User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  templateId      String?
  template        TaskTemplate? @relation(fields: [templateId], references: [id], onDelete: SetNull)
  prompt          String        @db.Text
  mode            String
  model           String
  status          TaskStatus    @default(PENDING)
  response        Json?
  error           String?       @db.Text
  contextThreadId String?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  assets        TaskAsset[]
  ledgerEntries UsageLedger[]

  @@index([userId, createdAt])
  @@index([status, createdAt])
  @@index([templateId])
  @@index([projectId])
}

model TaskAsset {
  id          String   @id @default(cuid())
  taskId      String
  task        Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  filename    String
  mimeType    String
  sizeBytes   Int
  storagePath String
  createdAt   DateTime @default(now())

  @@index([taskId])
}

model UsageLedger {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  taskId          String?
  task            Task?     @relation(fields: [taskId], references: [id], onDelete: SetNull)
  type            UsageType
  costEstimateUsd Float?
  tokensIn        Int?
  tokensOut       Int?
  model           String?
  createdAt       DateTime  @default(now())

  @@index([userId])
  @@index([taskId])
  @@index([createdAt])
}

model BillingEvent {
  id            String   @id @default(cuid())
  userId        String?
  user          User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  stripeEventId String   @unique
  type          String
  data          Json
  createdAt     DateTime @default(now())

  @@index([createdAt])
  @@index([userId])
}

model FeatureFlag {
  key       String           @id
  scope     FeatureFlagScope
  value     Json
  userId    String?
  role      UserRole?
  createdAt DateTime         @default(now())
}

model PlanConfig {
  id         String   @id @default(cuid())
  plan       Plan     @unique
  dailyLimit Int
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}

model ApiKey {
  id          String   @id @default(cuid())
  provider    String
  displayName String
  key         String
  isActive    Boolean  @default(true)
  createdById String?
  createdBy   User?    @relation(fields: [createdById], references: [id], onDelete: SetNull)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([provider, isActive])
  @@index([createdById])
}

model PromoSignup {
  id              String    @id @default(cuid())
  firstName       String
  lastName        String
  email           String    @unique
  yearsExperience String
  status          String    @default("PENDING")
  activatedAt     DateTime?
  expiresAt       DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([status])
  @@index([email])
}
```

### Step 2.2: Key Schema Changes Summary

| MongoDB Pattern | PostgreSQL Equivalent |
|-----------------|----------------------|
| `@id @map("_id") @default(auto()) @db.ObjectId` | `@id @default(cuid())` |
| `String @db.ObjectId` (foreign key) | `String` |
| `String[]` | `String[]` (native Postgres arrays) |
| `Json` | `Json` (stored as JSONB) |
| No cascade deletes | Added `onDelete: Cascade/SetNull` |
| No `@db.Text` | Added `@db.Text` for large strings |

---

## Phase 3: Data Migration (Week 2-3)

### Step 3.1: Create Data Migration Script

**`apps/web/scripts/migrate-data.ts`**

```typescript
import { MongoClient, ObjectId } from 'mongodb';
import { PrismaClient } from '@prisma/client';

const MONGO_URI = process.env.MONGO_SOURCE_URL!;
const prisma = new PrismaClient();

// ID mapping: MongoDB ObjectId -> Postgres cuid
const idMaps: Record<string, Map<string, string>> = {
  users: new Map(),
  projects: new Map(),
  tasks: new Map(),
  templates: new Map(),
  templateCategories: new Map(),
  historyEntries: new Map(),
};

function generateCuid(): string {
  // Use cuid2 or similar
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`;
}

function mapId(collection: string, oldId: string): string {
  if (!idMaps[collection].has(oldId)) {
    idMaps[collection].set(oldId, generateCuid());
  }
  return idMaps[collection].get(oldId)!;
}

async function migrateUsers(mongo: MongoClient) {
  const users = await mongo.db().collection('User').find().toArray();
  
  for (const user of users) {
    const newId = mapId('users', user._id.toString());
    
    await prisma.user.create({
      data: {
        id: newId,
        firstName: user.firstName,
        lastName: user.lastName,
        workDescription: user.workDescription,
        email: user.email,
        passwordHash: user.passwordHash,
        emailVerifiedAt: user.emailVerifiedAt,
        role: user.role,
        plan: user.plan,
        planStatus: user.planStatus,
        stripeCustomerId: user.stripeCustomerId,
        generationLimit: user.generationLimit,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        deletedAt: user.deletedAt,
        deletedById: user.deletedById ? mapId('users', user.deletedById) : null,
      },
    });
  }
  
  console.log(`Migrated ${users.length} users`);
}

async function migrateTemplateCategories(mongo: MongoClient) {
  const categories = await mongo.db().collection('TemplateCategory').find().toArray();
  
  for (const cat of categories) {
    const newId = mapId('templateCategories', cat._id.toString());
    
    await prisma.templateCategory.create({
      data: {
        id: newId,
        name: cat.name,
        sortOrder: cat.sortOrder ?? 0,
        createdAt: cat.createdAt,
        updatedAt: cat.updatedAt,
      },
    });
  }
  
  console.log(`Migrated ${categories.length} template categories`);
}

async function migrateTaskTemplates(mongo: MongoClient) {
  const templates = await mongo.db().collection('TaskTemplate').find().toArray();
  
  for (const template of templates) {
    const newId = mapId('templates', template._id.toString());
    
    await prisma.taskTemplate.create({
      data: {
        id: newId,
        category: template.category,
        subcategory: template.subcategory,
        title: template.title,
        guidanceUseAiTo: template.guidanceUseAiTo,
        guidanceExample: template.guidanceExample,
        guidanceOutcome: template.guidanceOutcome,
        prompt: template.prompt,
        assets: template.assets,
        allowedModes: template.allowedModes || [],
        allowedModels: template.allowedModels || [],
        allowUrlInput: template.allowUrlInput ?? false,
        allowFileUploads: template.allowFileUploads ?? true,
        allowMockupGeneration: template.allowMockupGeneration ?? true,
        allowRefineAnalysis: template.allowRefineAnalysis ?? true,
        isActive: template.isActive ?? true,
        templateCategoryId: template.templateCategoryId 
          ? mapId('templateCategories', template.templateCategoryId) 
          : null,
        createdById: template.createdById 
          ? mapId('users', template.createdById) 
          : null,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
      },
    });
  }
  
  console.log(`Migrated ${templates.length} task templates`);
}

// ... Add similar functions for all other collections

async function main() {
  const mongo = new MongoClient(MONGO_URI);
  await mongo.connect();
  
  try {
    // Order matters due to foreign key relationships
    console.log('Starting migration...');
    
    // 1. Independent entities first
    await migrateUsers(mongo);
    await migrateTemplateCategories(mongo);
    await migratePlanConfigs(mongo);
    await migratePaymentConfigs(mongo);
    await migrateFeatureFlags(mongo);
    
    // 2. Entities with user dependencies
    await migrateTaskTemplates(mongo);
    await migrateProjects(mongo);
    await migrateApiKeys(mongo);
    await migrateSupportRequests(mongo);
    await migrateFeedbacks(mongo);
    
    // 3. Entities with multiple dependencies
    await migrateTasks(mongo);
    await migrateHistoryEntries(mongo);
    await migrateSessions(mongo);
    await migrateOAuthAccounts(mongo);
    await migrateEmailVerifications(mongo);
    await migratePasswordResets(mongo);
    
    // 4. Entities with task/history dependencies
    await migrateTaskAssets(mongo);
    await migrateUsageLedgers(mongo);
    await migrateBillingEvents(mongo);
    await migrateRecommendationFeedbacks(mongo);
    
    console.log('Migration complete!');
    console.log('ID mappings saved for reference.');
    
  } finally {
    await mongo.close();
    await prisma.$disconnect();
  }
}

main().catch(console.error);
```

### Step 3.2: Data Validation Script

```typescript
// apps/web/scripts/validate-migration.ts

async function validateMigration() {
  const checks = [
    { model: 'user', field: 'email' },
    { model: 'project', field: 'name' },
    { model: 'task', field: 'prompt' },
    // ... add all models
  ];
  
  for (const check of checks) {
    const mongoCount = await mongoCollection(check.model).countDocuments();
    const pgCount = await prisma[check.model].count();
    
    if (mongoCount !== pgCount) {
      console.error(`❌ ${check.model}: MongoDB=${mongoCount}, Postgres=${pgCount}`);
    } else {
      console.log(`✅ ${check.model}: ${pgCount} records`);
    }
  }
}
```

---

## Phase 4: Code Updates (Week 3)

### Step 4.1: Update Prisma Configuration

```bash
# Rename schema files
mv apps/web/prisma/schema.prisma apps/web/prisma/schema.mongodb.prisma.bak
mv apps/web/prisma/schema.postgres.prisma apps/web/prisma/schema.prisma
```

### Step 4.2: Update Environment Variables

**`.env.production`** (example)
```bash
# Old MongoDB
# DATABASE_URL="mongodb+srv://..."

# New Supabase PostgreSQL
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
```

### Step 4.3: Generate New Prisma Client

```bash
cd apps/web
npx prisma generate
npx prisma db push  # For initial schema creation
# Or for production:
npx prisma migrate deploy
```

### Step 4.4: Code Changes Required

Most code will work unchanged due to Prisma abstraction. However, review:

1. **No code changes needed** for:
   - `prisma.user.findUnique()`
   - `prisma.project.create()`
   - All standard Prisma operations

2. **Review raw queries** (if any):
   ```typescript
   // Search for any $runCommandRaw or $queryRaw
   // These may need PostgreSQL syntax
   ```

3. **Review JSON operations**:
   ```typescript
   // MongoDB nested queries on JSON fields
   // May need adjustment for PostgreSQL JSONB syntax
   ```

---

## Phase 5: Testing (Week 4)

### Step 5.1: Local Testing Checklist

- [ ] All API routes work correctly
- [ ] Authentication flow (login, register, logout)
- [ ] OAuth login (Google)
- [ ] User CRUD operations
- [ ] Project creation and management
- [ ] Task creation and execution
- [ ] Template management
- [ ] Admin panel functionality
- [ ] Billing/Stripe integration
- [ ] File uploads (TaskAssets)

### Step 5.2: Create Test Script

```bash
#!/bin/bash
# apps/web/scripts/test-migration.sh

echo "Running migration tests..."

# Test auth
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Test user fetch
curl http://localhost:3000/api/auth/me -H "Cookie: session=..."

# ... more API tests
```

### Step 5.3: Performance Testing

```sql
-- Run EXPLAIN ANALYZE on common queries
EXPLAIN ANALYZE SELECT * FROM "User" WHERE email = 'test@example.com';
EXPLAIN ANALYZE SELECT * FROM "Task" WHERE "userId" = 'xxx' ORDER BY "createdAt" DESC LIMIT 10;
```

---

## Phase 6: Deployment (Week 5)

### Step 6.1: Staged Rollout Plan

1. **Day 1-2: Shadow Mode**
   - Deploy Supabase connection in read-only shadow mode
   - Verify all reads work correctly

2. **Day 3: Maintenance Window**
   - Announce maintenance (30-60 min)
   - Final data sync from MongoDB
   - Switch DATABASE_URL to Supabase
   - Verify core flows

3. **Day 4-7: Monitoring**
   - Monitor error rates
   - Check query performance
   - Keep MongoDB as rollback option

### Step 6.2: Rollback Plan

```bash
# If issues occur, revert environment variables
DATABASE_URL="mongodb+srv://..."  # Original MongoDB URL

# Regenerate Prisma client for MongoDB
mv apps/web/prisma/schema.prisma apps/web/prisma/schema.postgres.prisma
mv apps/web/prisma/schema.mongodb.prisma.bak apps/web/prisma/schema.prisma
npx prisma generate
```

### Step 6.3: Deployment Commands

```bash
# 1. Push schema to Supabase
cd apps/web
npx prisma db push

# 2. Run data migration
npx ts-node scripts/migrate-data.ts

# 3. Validate migration
npx ts-node scripts/validate-migration.ts

# 4. Deploy application with new environment
vercel --prod
# or
npm run build && npm run start
```

---

## Phase 7: Post-Migration (Week 6+)

### Step 7.1: Cleanup Tasks

- [ ] Archive MongoDB backup
- [ ] Update documentation
- [ ] Remove MongoDB dependencies from package.json
- [ ] Delete old migration files
- [ ] Update CI/CD pipelines

### Step 7.2: Optimize for PostgreSQL

1. **Add PostgreSQL-specific indexes**:
```prisma
model User {
  // ... existing fields
  
  @@index([email], type: Hash)  // Hash index for exact lookups
  @@index([createdAt(sort: Desc)])  // Sorted index
}
```

2. **Consider Supabase features**:
   - Row Level Security (RLS)
   - Realtime subscriptions
   - Edge Functions
   - Storage for file uploads

### Step 7.3: Leverage Supabase Features

```typescript
// Optional: Use Supabase client for realtime features
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Realtime subscriptions
supabase
  .channel('tasks')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'Task' }, 
    (payload) => console.log('New task:', payload))
  .subscribe();
```

---

## Appendix A: Quick Reference

### ID Mapping Strategy

| MongoDB ID Format | PostgreSQL ID Format |
|-------------------|---------------------|
| `ObjectId("507f1f77bcf86cd799439011")` | `cuid: clx1234abcd5678` |

### Environment Variables Comparison

| Variable | MongoDB Value | Supabase Value |
|----------|---------------|----------------|
| DATABASE_URL | `mongodb+srv://...` | `postgresql://...?pgbouncer=true` |
| DIRECT_URL | N/A | `postgresql://...` (no pooler) |

### Files to Modify

| File | Change Required |
|------|-----------------|
| `apps/web/prisma/schema.prisma` | Full rewrite (see Phase 2) |
| `apps/web/.env*` | Update DATABASE_URL |
| `apps/web/package.json` | Remove mongodb, add @supabase/supabase-js (optional) |

---

## Appendix B: Estimated Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Preparation | 3-5 days | None |
| Phase 2: Schema Conversion | 3-5 days | Phase 1 |
| Phase 3: Data Migration | 5-7 days | Phase 2 |
| Phase 4: Code Updates | 2-3 days | Phase 2 |
| Phase 5: Testing | 5-7 days | Phases 3 & 4 |
| Phase 6: Deployment | 3-5 days | Phase 5 |
| Phase 7: Post-Migration | Ongoing | Phase 6 |

**Total Estimated Time: 4-6 weeks**

---

## Appendix C: Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Data loss during migration | Low | High | Full backups, validation scripts |
| ID reference breaks | Medium | High | Comprehensive ID mapping |
| Performance degradation | Low | Medium | Index optimization, monitoring |
| Downtime during switch | Medium | Medium | Staged rollout, maintenance window |
| Rollback needed | Low | Medium | Keep MongoDB running 2 weeks post-migration |

---

## Appendix D: Cost Comparison

| Service | MongoDB Atlas | Supabase |
|---------|--------------|----------|
| Free Tier | 512MB storage | 500MB storage, 1GB file storage |
| Production (Pro) | ~$57/mo (M10) | ~$25/mo (Pro) |
| Includes | Database only | DB, Auth, Storage, Edge Functions, Realtime |

---

*Document Version: 1.0*
*Last Updated: January 28, 2026*
*Author: Migration Team*
