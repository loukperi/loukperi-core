const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

function loadEnv() {
  const envPath = path.join(process.cwd(), '.env');

  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const equalIndex = trimmed.indexOf('=');

    if (equalIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, equalIndex).trim();
    let value = trimmed.slice(equalIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function walkFiles(dir, result = []) {
  if (!fs.existsSync(dir)) {
    return result;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walkFiles(fullPath, result);
      continue;
    }

    if (entry.isFile() && fullPath.endsWith('.ts')) {
      result.push(fullPath);
    }
  }

  return result;
}

function extractPermissionCodesFromFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const matches = [...content.matchAll(/@Permissions\s*\(([\s\S]*?)\)/g)];

  const results = [];

  for (const match of matches) {
    const args = match[1];
    const stringMatches = [...args.matchAll(/['"`]([^'"`]+)['"`]/g)];

    for (const stringMatch of stringMatches) {
      results.push({
        code: stringMatch[1],
        filePath,
      });
    }
  }

  return results;
}

async function main() {
  loadEnv();

  const prisma = new PrismaClient();

  const srcDir = path.join(process.cwd(), 'src');
  const files = walkFiles(srcDir);

  const usedPermissions = files.flatMap(extractPermissionCodesFromFile);

  const usedCodes = [...new Set(usedPermissions.map((item) => item.code))].sort();

  const dbPermissions = await prisma.permission.findMany({
    select: {
      code: true,
      module: true,
      name: true,
    },
    orderBy: [{ module: 'asc' }, { code: 'asc' }],
  });

  const dbCodes = dbPermissions.map((item) => item.code).sort();

  const missingInDb = usedCodes.filter((code) => !dbCodes.includes(code));
  const unusedInCode = dbCodes.filter((code) => !usedCodes.includes(code));

  console.log('\n=== Permission Audit ===\n');

  console.log(`Used in code: ${usedCodes.length}`);
  console.log(`Existing in DB: ${dbCodes.length}`);

  console.log('\n--- Used permissions in code ---');
  for (const code of usedCodes) {
    console.log(`✅ ${code}`);
  }

  console.log('\n--- Missing in DB ---');
  if (!missingInDb.length) {
    console.log('✅ None');
  } else {
    for (const code of missingInDb) {
      console.log(`❌ ${code}`);

      const locations = usedPermissions
        .filter((item) => item.code === code)
        .map((item) => path.relative(process.cwd(), item.filePath));

      for (const location of [...new Set(locations)]) {
        console.log(`   - ${location}`);
      }
    }
  }

  console.log('\n--- Existing in DB but not used in @Permissions decorators ---');
  if (!unusedInCode.length) {
    console.log('✅ None');
  } else {
    for (const code of unusedInCode) {
      console.log(`ℹ️  ${code}`);
    }
  }

  await prisma.$disconnect();

  if (missingInDb.length) {
    process.exitCode = 1;
  }
}

main().catch(async (error) => {
  console.error(error);
  process.exitCode = 1;
});