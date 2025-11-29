const fs = require('fs');
const path = require('path');
const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

const runMigrations = async () => {
  try {
    console.log('🔄 Starting migrations...');

    // Create migrations table if it doesn't exist
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `, { type: QueryTypes.RAW });

    // Get all migration files
    const migrationsDir = path.join(__dirname);
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.js') && 
                      file !== 'runMigrations.js' && 
                      file !== 'undoLastMigration.js' &&
                      file !== 'fix-category-enum.js' &&
                      (file.startsWith('2024') || file.startsWith('2025'))) // Only files starting with year (proper migrations)
      .sort();

    // Get executed migrations
    const executedMigrations = await sequelize.query(
      'SELECT name FROM migrations ORDER BY executed_at',
      { type: QueryTypes.SELECT }
    );
    const executedNames = executedMigrations && executedMigrations.length > 0 
      ? executedMigrations.map(m => m.name) 
      : [];

    // Run pending migrations
    for (const file of files) {
      if (!executedNames.includes(file)) {
        console.log(`📝 Running migration: ${file}`);
        const migration = require(path.join(migrationsDir, file));
        
        await sequelize.transaction(async (transaction) => {
          await migration.up(sequelize.getQueryInterface(), sequelize.constructor);
          await sequelize.query(
            'INSERT INTO migrations (name) VALUES (:name)',
            {
              replacements: { name: file },
              type: QueryTypes.INSERT,
              transaction
            }
          );
        });

        console.log(`✅ Migration executed: ${file}`);
      } else {
        console.log(`⏭️  Skipping migration: ${file} (already executed)`);
      }
    }

    console.log('✅ All migrations executed successfully');
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error running migrations:', error);
    await sequelize.close();
    process.exit(1);
  }
};

runMigrations();

