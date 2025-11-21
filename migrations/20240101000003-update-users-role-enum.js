const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Check if enum exists
      const [enumExists] = await queryInterface.sequelize.query(`
        SELECT EXISTS (
          SELECT 1 FROM pg_type WHERE typname = 'enum_users_role'
        ) as exists;
      `);

      if (enumExists[0].exists) {
        // Get current enum values
        const [enumValues] = await queryInterface.sequelize.query(`
          SELECT enumlabel 
          FROM pg_enum 
          WHERE enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'enum_users_role'
          );
        `);

        const values = enumValues.map(v => v.enumlabel);
        
        // If 'student' doesn't exist, we need to update the enum
        if (!values.includes('student')) {
          // Step 1: Update any 'user' values to 'admin' temporarily
          await queryInterface.sequelize.query(`
            UPDATE users SET role = 'admin' WHERE role = 'user';
          `);

          // Step 2: Remove default value first
          await queryInterface.sequelize.query(`
            ALTER TABLE users ALTER COLUMN role DROP DEFAULT;
          `);

          // Step 3: Change column to text temporarily
          await queryInterface.sequelize.query(`
            ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(50) USING role::text;
          `);

          // Step 4: Drop old enum with CASCADE to remove dependencies
          await queryInterface.sequelize.query(`
            DROP TYPE IF EXISTS enum_users_role CASCADE;
          `);

          // Step 5: Create new enum with correct values
          await queryInterface.sequelize.query(`
            CREATE TYPE enum_users_role AS ENUM ('admin', 'student');
          `);

          // Step 6: Change column back to enum
          await queryInterface.sequelize.query(`
            ALTER TABLE users 
            ALTER COLUMN role TYPE enum_users_role 
            USING role::text::enum_users_role;
          `);

          // Step 7: Set default value back
          await queryInterface.sequelize.query(`
            ALTER TABLE users 
            ALTER COLUMN role SET DEFAULT 'student';
          `);
        }
      } else {
        // Enum doesn't exist, create it
        await queryInterface.sequelize.query(`
          CREATE TYPE enum_users_role AS ENUM ('admin', 'student');
        `);
        
        // Update column type if table exists
        await queryInterface.sequelize.query(`
          ALTER TABLE users 
          ALTER COLUMN role TYPE enum_users_role 
          USING role::text::enum_users_role;
        `);
      }
    } catch (error) {
      console.error('Error updating enum:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Revert changes (simplified - just update values)
    await queryInterface.sequelize.query(`
      UPDATE users SET role = 'admin' WHERE role = 'student';
    `);
  }
};
