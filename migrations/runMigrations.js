const { sequelize } = require('../config/database');
const { readdirSync } = require('fs');
const { resolve } = require('path');
const { QueryTypes } = require('sequelize');

// دالة لإنشاء جدول SequelizeMeta إذا لم يكن موجوداً
const ensureSequelizeMetaTable = async () => {
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "SequelizeMeta" (
        name VARCHAR(255) NOT NULL PRIMARY KEY
      );
    `);
  } catch (error) {
    console.error('خطأ في إنشاء جدول SequelizeMeta:', error);
    throw error;
  }
};

// دالة للحصول على قائمة Migrations المنفذة
const getExecutedMigrations = async () => {
  try {
    const results = await sequelize.query(
      'SELECT name FROM "SequelizeMeta" ORDER BY name',
      { type: QueryTypes.SELECT }
    );
    // التحقق من نوع النتائج
    if (Array.isArray(results) && results.length > 0) {
      // إذا كانت النتائج مصفوفة من الأجسام
      if (typeof results[0] === 'object' && results[0].name) {
        return results.map(r => r.name);
      }
      // إذا كانت النتائج مصفوفة من القيم
      if (typeof results[0] === 'string') {
        return results;
      }
    }
    return [];
  } catch (error) {
    // إذا كان الجدول غير موجود، نعيد مصفوفة فارغة
    if (error.message && error.message.includes('does not exist')) {
      return [];
    }
    console.error('خطأ في الحصول على Migrations المنفذة:', error.message);
    return [];
  }
};

// دالة لتشغيل Migration
const runMigration = async (migrationFile) => {
  const migration = require(resolve(__dirname, migrationFile));
  
  try {
    console.log(`🔄 تشغيل Migration: ${migrationFile}`);
    
    // بدء Transaction
    const transaction = await sequelize.transaction();
    
    try {
      // تنفيذ up
      await migration.up(sequelize.getQueryInterface(), sequelize.constructor);
      
      // حفظ اسم Migration في SequelizeMeta
      await sequelize.query(
        `INSERT INTO "SequelizeMeta" (name) VALUES ('${migrationFile}')`,
        { transaction }
      );
      
      // تأكيد Transaction
      await transaction.commit();
      
      console.log(`✅ تم تنفيذ Migration بنجاح: ${migrationFile}`);
    } catch (error) {
      // إلغاء Transaction في حالة الخطأ
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error(`❌ فشل في تنفيذ Migration ${migrationFile}:`, error.message);
    throw error;
  }
};

// دالة رئيسية لتشغيل جميع Migrations
const runMigrations = async () => {
  try {
    console.log('🚀 بدء تشغيل Migrations...\n');
    
    // التحقق من الاتصال بقاعدة البيانات
    await sequelize.authenticate();
    console.log('✅ الاتصال بقاعدة البيانات ناجح\n');
    
    // إنشاء جدول SequelizeMeta إذا لم يكن موجوداً
    await ensureSequelizeMetaTable();
    
    // الحصول على قائمة Migrations المنفذة
    const executedMigrations = await getExecutedMigrations();
    
    // قراءة جميع ملفات Migration من المجلد
    const migrationsDir = __dirname;
    const migrationFiles = readdirSync(migrationsDir)
      .filter(file => file.endsWith('.js') && file !== 'runMigrations.js' && file !== 'undoLastMigration.js')
      .sort(); // ترتيب حسب الاسم (يتضمن التاريخ)
    
    console.log(`📋 عدد Migrations المتاحة: ${migrationFiles.length}`);
    console.log(`📋 عدد Migrations المنفذة: ${executedMigrations.length}\n`);
    
    // تشغيل Migrations غير المنفذة
    let executedCount = 0;
    for (const migrationFile of migrationFiles) {
      if (!executedMigrations.includes(migrationFile)) {
        await runMigration(migrationFile);
        executedCount++;
      } else {
        console.log(`⏭️  تم تخطي Migration (منفذ مسبقاً): ${migrationFile}`);
      }
    }
    
    if (executedCount === 0) {
      console.log('\n✅ جميع Migrations محدثة - لا يوجد migrations جديدة للتشغيل');
    } else {
      console.log(`\n✅ تم تنفيذ ${executedCount} migration(s) بنجاح`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ خطأ في تشغيل Migrations:', error);
    process.exit(1);
  }
};

// تشغيل إذا تم استدعاء الملف مباشرة
if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };

