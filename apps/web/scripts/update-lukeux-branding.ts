/**
 * Script to update "LukeUX" to "Luke UX" in database guidance fields
 * Run with: npx tsx scripts/update-lukeux-branding.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateLukeUXBranding() {
  console.log('Starting database update: LukeUX → Luke UX...\n');

  try {
    // Fetch all templates
    const templates = await prisma.taskTemplate.findMany({
      select: {
        id: true,
        title: true,
        guidanceUseAiTo: true,
        guidanceExample: true,
        guidanceOutcome: true,
        assets: true,
      },
    });

    console.log(`Found ${templates.length} templates to check\n`);

    let updatedCount = 0;

    for (const template of templates) {
      const updates: any = {};
      let hasUpdates = false;

      // Check and update guidanceUseAiTo
      if (template.guidanceUseAiTo && template.guidanceUseAiTo.includes('LukeUX')) {
        updates.guidanceUseAiTo = template.guidanceUseAiTo.replace(/LukeUX/g, 'Luke UX');
        hasUpdates = true;
      }

      // Check and update guidanceExample
      if (template.guidanceExample && template.guidanceExample.includes('LukeUX')) {
        updates.guidanceExample = template.guidanceExample.replace(/LukeUX/g, 'Luke UX');
        hasUpdates = true;
      }

      // Check and update guidanceOutcome
      if (template.guidanceOutcome && template.guidanceOutcome.includes('LukeUX')) {
        updates.guidanceOutcome = template.guidanceOutcome.replace(/LukeUX/g, 'Luke UX');
        hasUpdates = true;
      }

      // Check and update assets
      if (template.assets && template.assets.includes('LukeUX')) {
        updates.assets = template.assets.replace(/LukeUX/g, 'Luke UX');
        hasUpdates = true;
      }

      if (hasUpdates) {
        await prisma.taskTemplate.update({
          where: { id: template.id },
          data: updates,
        });
        console.log(`✓ Updated template: ${template.title}`);
        updatedCount++;
      }
    }

    console.log(`\n✅ Complete! Updated ${updatedCount} template(s)`);
  } catch (error) {
    console.error('❌ Error updating templates:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update
updateLukeUXBranding()
  .then(() => {
    console.log('\n✅ Database update completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Database update failed:', error);
    process.exit(1);
  });
