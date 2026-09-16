import { seedReferenceData } from "../src/lib/seed/reference-data";
import { generateDemoTrades } from "../src/lib/seed/generate-demo-data";
import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Seeding reference data (checklist items, mistakes, assets, strategies)...");
  await seedReferenceData();

  console.log("Generating demo trades...");
  const result = await generateDemoTrades();
  console.log(`Created ${result.accounts} demo account(s) with ~${result.tradesPerAccount} trades each.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
