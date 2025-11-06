/**
 * Test Database Connection Script
 * Verifies that the application can connect to PostgreSQL
 */

import { testConnection, disconnect } from '../src/lib/db';

async function main() {
  console.log('🔄 Testing database connection...\n');

  const success = await testConnection();

  if (success) {
    console.log('\n✅ Database is ready!');
    process.exit(0);
  } else {
    console.log('\n❌ Database connection failed!');
    console.log('Make sure PostgreSQL is running and DATABASE_URL is correct.');
    process.exit(1);
  }
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await disconnect();
  });
