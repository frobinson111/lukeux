# Database Migration Setup Complete! 🎉

Your MongoDB → Supabase (PostgreSQL) migration is ready to execute.

## What Was Created

### 1. **PostgreSQL Schema** (`apps/web/prisma/schema.postgres.prisma`)
   - Complete Prisma schema converted for PostgreSQL
   - Changed ObjectIds to CUIDs
   - Added cascade delete rules
   - Added proper text field types
   - Native PostgreSQL array support

### 2. **Migration Script** (`apps/web/scripts/migrate-data.ts`)
   - Automated data migration from MongoDB to PostgreSQL
   - ID mapping (ObjectId → CUID)
   - Preserves all relationships
   - Handles all 21 models in correct order
   - Saves ID mappings for reference

### 3. **Validation Script** (`apps/web/scripts/validate-migration.ts`)
   - Compares record counts between databases
   - Identifies any missing data
   - Provides detailed migration summary

### 4. **Migration Runner** (`apps/web/scripts/run-migration.sh`)
   - Interactive shell script
   - Guides through entire migration process
   - Includes safety checks and confirmations

### 5. **Documentation**
   - **MIGRATION_GUIDE.md**: Step-by-step execution guide
   - **docs/mongodb-to-supabase-migration-plan.md**: Comprehensive planning document

### 6. **Dependencies Installed**
   - `mongodb`: MongoDB driver for reading source data
   - `@paralleldrive/cuid2`: CUID generation for PostgreSQL IDs
   - `@types/mongodb`: TypeScript types
   - `ts-node`: Run TypeScript migration scripts

## Quick Start (3 Options)

### Option A: Automated Script (Easiest)

```bash
cd apps/web
./scripts/run-migration.sh
```

The script will:
1. Prompt for connection strings
2. Backup current schema
3. Push PostgreSQL schema to Supabase
4. Migrate all data
5. Validate migration
6. Regenerate Prisma client

### Option B: Manual Step-by-Step

Follow the detailed guide in `MIGRATION_GUIDE.md`

```bash
# 1. Backup MongoDB
mongodump --uri="YOUR_MONGO_URI" --out=./backup

# 2. Set environment
export MONGO_SOURCE_URL="mongodb+srv://..."
export POSTGRES_URL="postgresql://..."
export DATABASE_URL="$POSTGRES_URL"

# 3. Switch schema
cd apps/web
cp prisma/schema.postgres.prisma prisma/schema.prisma

# 4. Push schema
npx prisma db push

# 5. Migrate data
npx ts-node scripts/migrate-data.ts

# 6. Validate
npx ts-node scripts/validate-migration.ts

# 7. Test locally
npm run dev
```

### Option C: Custom Migration

Use the provided scripts as templates and modify as needed for your specific requirements.

## Before You Start

### Prerequisites Checklist

- [ ] **Supabase project created** with connection strings ready
- [ ] **MongoDB backup completed** (CRITICAL!)
- [ ] **Connection strings** for both databases
- [ ] **Downtime window planned** (if migrating production)
- [ ] **Team notified** (if collaborative project)

### Connection Strings Needed

You'll need these from Supabase (found in Settings → Database):

1. **Direct Connection** (port 5432) - For migrations
   ```
   postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
   ```

2. **Pooled Connection** (port 6543) - For app runtime
   ```
   postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:6543/postgres?pgbouncer=true
   ```

## Migration Time Estimates

| Database Size | Estimated Time |
|--------------|----------------|
| < 1,000 records | 1-2 minutes |
| 1,000 - 10,000 records | 5-10 minutes |
| 10,000 - 100,000 records | 15-30 minutes |
| > 100,000 records | 30+ minutes |

## After Migration

### 1. Update Environment Variables

**Development (.env.local):**
```bash
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"
```

**Production (Vercel/hosting platform):**
- Set both `DATABASE_URL` and `DIRECT_URL` environment variables

### 2. Test Thoroughly

- [ ] User authentication (login/register)
- [ ] OAuth flows
- [ ] Data CRUD operations
- [ ] Relationships/joins work correctly
- [ ] No console errors
- [ ] Performance is acceptable

### 3. Deploy

```bash
git add .
git commit -m "feat: migrate to Supabase PostgreSQL"
git push origin main
```

### 4. Monitor

Keep MongoDB running for 2 weeks as a rollback option while monitoring:
- Error rates
- Performance metrics
- User feedback
- Database query logs

## Rollback Plan

If issues occur:

```bash
cd apps/web

# Restore MongoDB schema
cp prisma/schema.mongodb.backup prisma/schema.prisma

# Update environment
export DATABASE_URL="YOUR_MONGODB_URI"

# Regenerate client
npx prisma generate

# Restart app
npm run dev
```

## Key Files Reference

```
Luke UX/
├── MIGRATION_GUIDE.md                    # Detailed step-by-step guide
├── MIGRATION_README.md                   # This file
├── docs/
│   └── mongodb-to-supabase-migration-plan.md  # Comprehensive plan
└── apps/web/
    ├── prisma/
    │   ├── schema.prisma                 # Current schema (MongoDB)
    │   ├── schema.postgres.prisma        # New PostgreSQL schema
    │   └── schema.mongodb.backup         # Auto-created backup
    └── scripts/
        ├── migrate-data.ts               # Data migration script
        ├── validate-migration.ts         # Validation script
        └── run-migration.sh              # Automated runner
```

## Schema Changes Summary

| MongoDB | PostgreSQL |
|---------|------------|
| `@id @map("_id") @default(auto()) @db.ObjectId` | `@id @default(cuid())` |
| `String @db.ObjectId` (FK) | `String` |
| No cascade rules | `onDelete: Cascade/SetNull` |
| `String` (long text) | `String @db.Text` |
| `String[]` (arrays) | `String[]` (native support) |

## Troubleshooting

### "Cannot find module 'mongodb'"
```bash
cd apps/web
npm install
```

### "Connection refused" to Supabase
- Check connection string format
- Verify Supabase project is active
- Use direct connection (port 5432) for migrations

### "Foreign key constraint failed"
- Clear PostgreSQL: `npx prisma migrate reset --force`
- Re-run migration script

### Data count mismatch after migration
- Check migration logs in `apps/web/migration-output/`
- Review specific collection differences
- Consider re-running migration

## Support & Documentation

- **Migration Guide**: `MIGRATION_GUIDE.md` - Detailed execution steps
- **Planning Doc**: `docs/mongodb-to-supabase-migration-plan.md` - Full technical plan
- **Supabase Docs**: https://supabase.com/docs/guides/database
- **Prisma Docs**: https://www.prisma.io/docs/concepts/components/prisma-migrate

## Next Steps

1. **Read** `MIGRATION_GUIDE.md` for detailed instructions
2. **Backup** your MongoDB database
3. **Run** the migration script
4. **Test** thoroughly before deploying
5. **Monitor** after deployment

---

**Ready to migrate?** Start with:
```bash
cd apps/web
./scripts/run-migration.sh
```

Good luck! 🚀
