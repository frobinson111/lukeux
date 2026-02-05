#!/bin/bash
#
# Database Migration Runner
# This script guides you through the MongoDB → Supabase migration process
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

prompt_continue() {
    echo -e "\n${YELLOW}Press Enter to continue or Ctrl+C to cancel...${NC}"
    read
}

# Check if running from correct directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the apps/web directory"
    exit 1
fi

print_header "MongoDB → Supabase Migration Script"

echo "This script will guide you through migrating your database."
echo "Make sure you have:"
echo "  1. ✅ Created a Supabase project"
echo "  2. ✅ Have your Supabase connection strings ready"
echo "  3. ✅ Backed up your MongoDB database"
echo ""
prompt_continue

# Step 1: Check environment variables
print_header "Step 1: Checking Environment Variables"

if [ -z "$MONGO_SOURCE_URL" ]; then
    print_warning "MONGO_SOURCE_URL is not set"
    echo -n "Enter your MongoDB connection string: "
    read MONGO_SOURCE_URL
    export MONGO_SOURCE_URL
fi

if [ -z "$POSTGRES_URL" ]; then
    print_warning "POSTGRES_URL is not set"
    echo -n "Enter your Supabase connection string (direct/port 5432): "
    read POSTGRES_URL
    export POSTGRES_URL
    export DATABASE_URL="$POSTGRES_URL"
fi

print_success "Environment variables configured"
echo "  MongoDB:  ${MONGO_SOURCE_URL:0:30}..."
echo "  Postgres: ${POSTGRES_URL:0:30}..."

prompt_continue

# Step 2: Backup current schema
print_header "Step 2: Backing Up Current Schema"

if [ ! -f "prisma/schema.mongodb.backup" ]; then
    cp prisma/schema.prisma prisma/schema.mongodb.backup
    print_success "MongoDB schema backed up to prisma/schema.mongodb.backup"
else
    print_warning "Backup already exists, skipping..."
fi

# Step 3: Switch to PostgreSQL schema
print_header "Step 3: Switching to PostgreSQL Schema"

cp prisma/schema.postgres.prisma prisma/schema.prisma
print_success "Using PostgreSQL schema"

# Step 4: Push schema to Supabase
print_header "Step 4: Creating Tables in Supabase"

echo "This will create all tables in your Supabase database..."
prompt_continue

npx prisma db push

print_success "Schema pushed to Supabase"

# Step 5: Run migration
print_header "Step 5: Migrating Data"

echo "This will migrate all data from MongoDB to PostgreSQL..."
echo "This may take several minutes depending on data volume..."
prompt_continue

npx ts-node scripts/migrate-data.ts

print_success "Data migration completed!"

# Step 6: Validate migration
print_header "Step 6: Validating Migration"

echo "Checking that all data was migrated correctly..."
prompt_continue

npx ts-node scripts/validate-migration.ts

# Step 7: Regenerate Prisma Client
print_header "Step 7: Regenerating Prisma Client"

npx prisma generate

print_success "Prisma client regenerated"

# Final summary
print_header "Migration Complete! 🎉"

echo "Next steps:"
echo ""
echo "1. ${GREEN}Update your .env files with Supabase connection strings${NC}"
echo "   DATABASE_URL=\"postgresql://...?pgbouncer=true\" (pooled)"
echo "   DIRECT_URL=\"postgresql://...\" (direct)"
echo ""
echo "2. ${GREEN}Test your application locally:${NC}"
echo "   npm run dev"
echo ""
echo "3. ${GREEN}Deploy to production when ready${NC}"
echo ""
echo "4. ${GREEN}Monitor for 24-48 hours${NC}"
echo ""
print_warning "Keep MongoDB running for at least 2 weeks as a rollback option"
echo ""
echo "Full documentation: ../../MIGRATION_GUIDE.md"
echo ""

print_success "Migration script completed successfully!"
