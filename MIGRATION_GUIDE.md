# Database Migration Guide: MongoDB → Supabase

This guide walks you through the actual execution of migrating from MongoDB Atlas to Supabase PostgreSQL.

## Prerequisites ✅

- [x] Supabase project created with connection string
- [x] PostgreSQL schema file created (`apps/web/prisma/schema.postgres.prisma`)
- [x] Migration scripts created (`migrate-data.ts`, `validate-migration.ts`)
- [x] Required dependencies installed

## Step-by-Step Migration Process

### Step 1: Backup Your MongoDB Data

**CRITICAL:** Always backup before migration!

```bash
# Option A: Using mongodump (recommended)
mongodump --uri="YOUR_MONGODB_ATLAS_URI" --out=./mongodb-backup-$(date +%Y%m%d)

# Option B: Using MongoDB Atlas UI
# Go to your cluster → ... → Export Data → Export to JSON
```

**Verify backup:**
```bash
ls -lh mongodb-backup-*/
```

---

### Step 2: Set Up Environment Variables

Create a temporary environment file for the migration:

```bash
# Create migration environment file
cp apps/web/.env apps/web/.env.migration
```

Edit `apps/web/.env.migration` with these variables:

```bash
# SOURCE: Your current MongoDB connection
MONGO_SOURCE_URL="mongodb+srv://username:password@cluster.mongodb.net/dbname"

# TARGET: Your Supabase PostgreSQL connection
POSTGRES_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"

# For migrations, use the DIRECT connection (not pooled)
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"
```

**Important:** Get both connection strings from Supabase:
- **Pooled connection** (port 6543 with pgbouncer): Used for app runtime
- **Direct connection** (port 5432): Used for migrations and schema changes

---

### Step 3: Push Schema to Supabase

First, temporarily switch to the PostgreSQL schema:

```bash
cd apps/web

# Backup current schema
cp prisma/schema.prisma prisma/schema.mongodb.backup

# Use PostgreSQL schema
cp prisma/schema.postgres.prisma prisma/schema.prisma

# Set environment to Supabase
export DATABASE_URL="YOUR_SUPABASE_DIRECT_URL"
export DIRECT_URL="YOUR_SUPABASE_DIRECT_URL"

# Push schema to Supabase
npx prisma db push

# Verify schema was created
npx prisma studio
# Browse to http://localhost:5555 and verify tables exist (they'll be empty)
```

**Expected output:**
```
✔ Database reset successful
✔ Generated Prisma Client
```

---

### Step 4: Run Data Migration

Now migrate all data from MongoDB to PostgreSQL:

```bash
cd apps/web

# Set environment variables
export MONGO_SOURCE_URL="YOUR_MONGODB_URI"
export POSTGRES_URL="YOUR_SUPABASE_DIRECT_URL"
export DATABASE_URL="YOUR_SUPABASE_DIRECT_URL"

# Run migration script
npx ts-node scripts/migrate-data.ts
```

**Expected output:**
```
[timestamp] 🚀 Starting MongoDB → PostgreSQL migration...
[timestamp] ✅ Connected to MongoDB
[timestamp] Migrating users...
[timestamp] ✅ Migrated 150 users
[timestamp] Migrating template categories...
[timestamp] ✅ Migrated 5 template categories
...
[timestamp] ✅ Migration completed successfully in 45.23s!
[timestamp] ✅ ID mappings saved to apps/web/migration-output/id-mappings.json
```

**Monitor progress:** The migration will log each step. For large databases, this may take several minutes.

**If migration fails:**
1. Check the error message
2. Fix the issue
3. Clear PostgreSQL tables: `npx prisma migrate reset --force`
4. Re-run migration

---

### Step 5: Validate Migration

Verify all data was migrated correctly:

```bash
# Set both connection strings
export MONGO_SOURCE_URL="YOUR_MONGODB_URI"
export POSTGRES_URL="YOUR_SUPABASE_DIRECT_URL"

# Run validation
npx ts-node scripts/validate-migration.ts
```

**Expected output:**
```
🔍 Starting migration validation...

✅ Connected to MongoDB

📊 Comparing record counts:

✅ User                      MongoDB:    150 | Postgres:    150
✅ OAuthAccount              MongoDB:     45 | Postgres:     45
✅ Session                   MongoDB:    230 | Postgres:    230
✅ Project                   MongoDB:    320 | Postgres:    320
✅ Task                      MongoDB:   1250 | Postgres:   1250
...

================================================================================

📈 Validation Summary:

Total Collections:     21
Matched Collections:   21
Failed Collections:    0
Total MongoDB Records: 2450
Total Postgres Records: 2450
Overall Difference:    0

✅ All validations passed! Migration appears successful.
```

**If validation fails:**
- Review which collections don't match
- Check migration logs for errors
- Investigate the `id-mappings.json` file
- Consider re-running migration

---

### Step 6: Update Application Configuration

Once validation passes, update your application to use Supabase:

**Development environment:**

```bash
# Edit apps/web/.env.local
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"
```

**Production environment:**

Update your hosting platform environment variables (Vercel, Render, etc.):
- `DATABASE_URL`: Pooled connection (port 6543)
- `DIRECT_URL`: Direct connection (port 5432)

---

### Step 7: Regenerate Prisma Client

Generate the Prisma client with the PostgreSQL schema:

```bash
cd apps/web
npx prisma generate
```

---

### Step 8: Test the Application

**Local testing:**

```bash
cd apps/web
npm run dev
```

**Test these critical flows:**
1. ✅ User registration
2. ✅ User login
3. ✅ OAuth login (Google)
4. ✅ Create project
5. ✅ Create task
6. ✅ View history
7. ✅ Admin panel access
8. ✅ Billing/subscription

**Check browser console and terminal for errors.**

---

### Step 9: Deploy to Production

Once local testing passes:

```bash
# Commit the schema change
git add apps/web/prisma/schema.prisma
git commit -m "feat: migrate to Supabase PostgreSQL"

# Push to your deployment platform
git push origin main

# Or deploy directly
vercel --prod
```

**Deployment checklist:**
- [ ] Environment variables updated on hosting platform
- [ ] Build succeeds
- [ ] Application starts successfully
- [ ] Database queries work
- [ ] Authentication works
- [ ] No errors in logs

---

### Step 10: Monitor and Verify

**Monitor for 24-48 hours:**
- Application logs (errors, warnings)
- Database query performance
- User feedback/issues
- Sentry/error tracking

**Run these queries to verify data integrity:**

```sql
-- In Supabase SQL Editor

-- Check user counts
SELECT COUNT(*) FROM "User";

-- Check recent tasks
SELECT * FROM "Task" ORDER BY "createdAt" DESC LIMIT 10;

-- Check relationships
SELECT 
  u.email,
  COUNT(p.id) as project_count,
  COUNT(t.id) as task_count
FROM "User" u
LEFT JOIN "Project" p ON p."userId" = u.id
LEFT JOIN "Task" t ON t."userId" = u.id
GROUP BY u.id, u.email
LIMIT 10;
```

---

## Rollback Plan (If Needed)

If issues occur, you can rollback:

```bash
cd apps/web

# Restore MongoDB schema
cp prisma/schema.mongodb.backup prisma/schema.prisma

# Update environment variables back to MongoDB
export DATABASE_URL="YOUR_MONGODB_URI"

# Regenerate Prisma client
npx prisma generate

# Restart application
npm run dev
```

---

## Post-Migration Optimization

Once stable on PostgreSQL, consider:

### 1. Enable Connection Pooling

```bash
# Use the pooled connection in production
DATABASE_URL="postgresql://...?pgbouncer=true&connection_limit=10"
```

### 2. Add PostgreSQL-Specific Indexes

```sql
-- In Supabase SQL Editor
CREATE INDEX CONCURRENTLY idx_user_email_hash ON "User" USING HASH (email);
CREATE INDEX CONCURRENTLY idx_task_created_desc ON "Task" ("userId", "createdAt" DESC);
```

### 3. Enable Row Level Security (Optional)

```sql
-- Example RLS policies
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own data" ON "User"
  FOR SELECT
  USING (auth.uid()::text = id);
```

### 4. Set Up Database Backups

- Supabase Pro: Automatic daily backups
- Free tier: Use `pg_dump` scheduled via cron

```bash
# Daily backup script
pg_dump "YOUR_SUPABASE_URL" > backup-$(date +%Y%m%d).sql
```

---

## Troubleshooting

### Issue: "Cannot connect to PostgreSQL"

**Solution:** Check connection string format, firewall rules, and ensure you're using the direct connection (not pooled) for migrations.

### Issue: "Foreign key constraint failed"

**Solution:** Ensure migration runs in correct order (see `migrate-data.ts` for proper sequencing).

### Issue: "Duplicate key error"

**Solution:** Clear PostgreSQL tables and re-run: `npx prisma migrate reset --force`

### Issue: "Out of memory during migration"

**Solution:** Migrate in smaller batches by adding pagination to the migration script.

---

## Quick Reference Commands

```bash
# Backup MongoDB
mongodump --uri="$MONGO_URI" --out=./backup

# Push schema to Supabase
npx prisma db push

# Run migration
npx ts-node scripts/migrate-data.ts

# Validate migration
npx ts-node scripts/validate-migration.ts

# Generate Prisma client
npx prisma generate

# View data in Prisma Studio
npx prisma studio

# Test locally
npm run dev
```

---

## Support

If you encounter issues:
1. Check the migration logs in `apps/web/migration-output/`
2. Review the validation output
3. Check Supabase dashboard logs
4. Review the full migration plan in `docs/mongodb-to-supabase-migration-plan.md`

---

**Migration prepared by:** Database Migration Assistant  
**Date:** January 28, 2026  
**Version:** 1.0
