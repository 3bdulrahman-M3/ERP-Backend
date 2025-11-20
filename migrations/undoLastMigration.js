const { sequelize } = require('../config/database');
const { readdirSync } = require('fs');
const { resolve } = require('path');
const { QueryTypes } = require('sequelize');

// دالة للحصول على آخر Migration منفذ
const getLastExecutedMigration = async () => {
  try {
    const results = await sequelize.query(
      'SELECT name FROM "SequelizeMeta" ORDER BY name DESC LIMIT 1',
      { type: QueryTypes.SELECT }
    );
    
    if (Array.isArray(results) && results.length > 0) {
      // التحقق من نوع النتائج
      if (typeof results[0] === 'object' && results[0].name) {
        return results[0].name;
      }
      if (typeof results[0] === 'string') {
        return results[0];
      }
    }
    return null;
  } catch (error) {
    // إذا كان الجدول غير موجود
    if (error.message && error.message.includes('does not exist')) {
      return null;
    }
    console.error('خطأ في الحصول على آخر Migration:', error.message);
    return null;
  }
};

// دالة لإلغاء Migration
const undoMigration = async (migrationFile) => {
  const migration = require(resolve(__dirname, migrationFile));
  
  try {
    console.log(`🔄 إلغاء Migration: ${migrationFile}`);
    
    // بدء Transaction
    const transaction = await sequelize.transaction();
    
    try {
      // تنفيذ down
      await migration.down(sequelize.getQueryInterface(), sequelize.constructor);
      
      // حذف اسم Migration من SequelizeMeta
      await sequelize.query(
        `DELETE FROM "SequelizeMeta" WHERE name = '${migrationFile}'`,
        { transaction }
      );
      
      // تأكيد Transaction
      await transaction.commit();
      
      console.log(`✅ تم إلغاء Migration بنجاح: ${migrationFile}`);
    } catch (error) {
      // إلغاء Transaction في حالة الخطأ
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error(`❌ فشل في إلغاء Migration ${migrationFile}:`, error.message);
    throw error;
  }
};

// دالة رئيسية لإلغاء آخر Migration
const undoLastMigration = async () => {
  try {
    console.log('🔄 بدء إلغاء آخر Migration...\n');
    
    // التحقق من الاتصال بقاعدة البيانات
    await sequelize.authenticate();
    console.log('✅ الاتصال بقاعدة البيانات ناجح\n');
    
    // الحصول على آخر Migration منفذ
    const lastMigration = await getLastExecutedMigration();
    
    if (!lastMigration) {
      console.log('ℹ️  لا يوجد migrations منفذة لإلغائها');
      process.exit(0);
      return;
    }
    
    console.log(`📋 آخر Migration منفذ: ${lastMigration}\n`);
    
    // إلغاء Migration
    await undoMigration(lastMigration);
    
    console.log('\n✅ تم إلغاء Migration بنجاح');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ خطأ في إلغاء Migration:', error);
    process.exit(1);
  }
};

// تشغيل إذا تم استدعاء الملف مباشرة
if (require.main === module) {
  undoLastMigration();
}

module.exports = { undoLastMigration };

