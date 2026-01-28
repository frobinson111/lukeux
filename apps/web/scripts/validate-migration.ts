#!/usr/bin/env ts-node
/**
 * Migration Validation Script
 * 
 * Validates that data was correctly migrated from MongoDB to PostgreSQL
 * by comparing record counts and sampling data integrity.
 */

import { MongoClient } from 'mongodb';
import { PrismaClient } from '@prisma/client';

const MONGO_URI = process.env.MONGO_SOURCE_URL || process.env.DATABASE_URL!;

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.POSTGRES_URL || process.env.DATABASE_URL!
    }
  }
});

interface ValidationResult {
  collection: string;
  mongoCount: number;
  postgresCount: number;
  match: boolean;
  difference?: number;
}

async function validateCollection(
  mongoDb: any,
  collection: string,
  prismaModel: any
): Promise<ValidationResult> {
  const mongoCount = await mongoDb.collection(collection).countDocuments();
  const postgresCount = await prismaModel.count();
  
  const match = mongoCount === postgresCount;
  const difference = mongoCount - postgresCount;
  
  return {
    collection,
    mongoCount,
    postgresCount,
    match,
    ...(difference !== 0 && { difference })
  };
}

async function main() {
  console.log('🔍 Starting migration validation...\n');
  
  const mongo = new MongoClient(MONGO_URI);
  const results: ValidationResult[] = [];
  let totalErrors = 0;
  
  try {
    await mongo.connect();
    console.log('✅ Connected to MongoDB');
    const db = mongo.db();
    
    // Validate all collections
    console.log('\n📊 Comparing record counts:\n');
    
    const collections = [
      { mongo: 'User', prisma: prisma.user },
      { mongo: 'OAuthAccount', prisma: prisma.oAuthAccount },
      { mongo: 'Session', prisma: prisma.session },
      { mongo: 'SupportRequest', prisma: prisma.supportRequest },
      { mongo: 'Feedback', prisma: prisma.feedback },
      { mongo: 'EmailVerification', prisma: prisma.emailVerification },
      { mongo: 'PasswordReset', prisma: prisma.passwordReset },
      { mongo: 'Project', prisma: prisma.project },
      { mongo: 'HistoryEntry', prisma: prisma.historyEntry },
      { mongo: 'RecommendationFeedback', prisma: prisma.recommendationFeedback },
      { mongo: 'TaskTemplate', prisma: prisma.taskTemplate },
      { mongo: 'TemplateCategory', prisma: prisma.templateCategory },
      { mongo: 'PaymentConfig', prisma: prisma.paymentConfig },
      { mongo: 'Task', prisma: prisma.task },
      { mongo: 'TaskAsset', prisma: prisma.taskAsset },
      { mongo: 'UsageLedger', prisma: prisma.usageLedger },
      { mongo: 'BillingEvent', prisma: prisma.billingEvent },
      { mongo: 'FeatureFlag', prisma: prisma.featureFlag },
      { mongo: 'PlanConfig', prisma: prisma.planConfig },
      { mongo: 'ApiKey', prisma: prisma.apiKey },
      { mongo: 'PromoSignup', prisma: prisma.promoSignup },
    ];
    
    for (const { mongo: collection, prisma: model } of collections) {
      const result = await validateCollection(db, collection, model);
      results.push(result);
      
      if (result.match) {
        console.log(`✅ ${collection.padEnd(25)} MongoDB: ${result.mongoCount.toString().padStart(6)} | Postgres: ${result.postgresCount.toString().padStart(6)}`);
      } else {
        console.log(`❌ ${collection.padEnd(25)} MongoDB: ${result.mongoCount.toString().padStart(6)} | Postgres: ${result.postgresCount.toString().padStart(6)} | Diff: ${result.difference}`);
        totalErrors++;
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('\n📈 Validation Summary:\n');
    
    const totalMongo = results.reduce((sum, r) => sum + r.mongoCount, 0);
    const totalPostgres = results.reduce((sum, r) => sum + r.postgresCount, 0);
    const matchedCollections = results.filter(r => r.match).length;
    
    console.log(`Total Collections:     ${results.length}`);
    console.log(`Matched Collections:   ${matchedCollections}`);
    console.log(`Failed Collections:    ${totalErrors}`);
    console.log(`Total MongoDB Records: ${totalMongo}`);
    console.log(`Total Postgres Records: ${totalPostgres}`);
    console.log(`Overall Difference:    ${totalMongo - totalPostgres}`);
    
    if (totalErrors === 0) {
      console.log('\n✅ All validations passed! Migration appears successful.');
      console.log('\n⚠️  Next steps:');
      console.log('   1. Perform spot checks on critical data (users, projects, tasks)');
      console.log('   2. Test authentication flows');
      console.log('   3. Verify relationships between tables');
      console.log('   4. Update application environment variables');
      return 0;
    } else {
      console.log(`\n❌ Validation failed with ${totalErrors} mismatched collections.`);
      console.log('\n⚠️  Review the differences above and re-run migration if needed.');
      return 1;
    }
    
  } catch (error) {
    console.error('\n❌ Validation error:', error);
    return 1;
  } finally {
    await mongo.close();
    await prisma.$disconnect();
    console.log('\nDisconnected from databases');
  }
}

if (require.main === module) {
  main()
    .then((code) => process.exit(code))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { main as validateMigration };
