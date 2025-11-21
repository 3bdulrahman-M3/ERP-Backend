const fs = require('fs');
const path = require('path');
const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

const undoLastMigration = async () => {
  try {
    console.log('🔄 Starting to undo last migration...');

    // Get the last executed migration
    const lastMigrations = await sequelize.query(
      'SELECT name FROM migrations ORDER BY executed_at DESC LIMIT 1',
      { type: QueryTypes.SELECT }
    );

    if (!lastMigrations || lastMigrations.length === 0) {
      console.log('⚠️  No migrations have been executed');
      await sequelize.close();
      process.exit(0);
    }

    const lastMigration = lastMigrations[0];
    const fileName = lastMigration.name;
    console.log(`📝 Undoing migration: ${fileName}`);

    const migrationPath = path.join(__dirname, fileName);
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${fileName}`);
    }

    const migration = require(migrationPath);

    await sequelize.transaction(async (transaction) => {
      await migration.down(sequelize.getQueryInterface(), sequelize.constructor);
      await sequelize.query(
        'DELETE FROM migrations WHERE name = :name',
        {
          replacements: { name: fileName },
          type: QueryTypes.DELETE,
          transaction
        }
      );
    });

    console.log(`✅ Migration undone: ${fileName}`);
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error undoing migration:', error);
    await sequelize.close();
    process.exit(1);
  }
};

undoLastMigration();

