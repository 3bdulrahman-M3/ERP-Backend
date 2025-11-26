const path = require('path');
const fs = require('fs');

const uploadImage = async (req, res) => {
  try {
    console.log('=== Upload Request ===');
    console.log('Has file:', !!req.file);
    console.log('Request body:', req.body);
    console.log('Request files:', req.files);
    
    if (!req.file) {
      console.error('No file in request');
      return res.status(400).json({
        success: false,
        message: 'لم يتم رفع أي ملف. تأكد من أن اسم الحقل هو "image"'
      });
    }

    console.log('File received:', {
      filename: req.file.filename,
      originalname: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      path: req.file.path
    });

    // التحقق من أن الملف تم حفظه
    const fs = require('fs');
    const filePath = require('path').join(__dirname, '../uploads', req.file.filename);
    
    console.log('Checking file path:', filePath);
    
    if (!fs.existsSync(filePath)) {
      console.error('File was not saved:', filePath);
      return res.status(500).json({
        success: false,
        message: 'فشل حفظ الملف'
      });
    }

    const stats = fs.statSync(filePath);
    console.log('File stats:', {
      size: stats.size,
      created: stats.birthtime
    });

    // إنشاء URL للملف
    const fileUrl = `/uploads/${req.file.filename}`;
    const fullUrl = `${req.protocol}://${req.get('host')}${fileUrl}`;

    console.log('File uploaded successfully:', {
      filename: req.file.filename,
      url: fullUrl,
      path: filePath
    });

    res.json({
      success: true,
      message: 'تم رفع الصورة بنجاح',
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        url: fullUrl,
        path: fileUrl
      }
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء رفع الصورة',
      error: error.message
    });
  }
};

const deleteImage = async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../uploads', filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({
        success: true,
        message: 'تم حذف الصورة بنجاح'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'الصورة غير موجودة'
      });
    }
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء حذف الصورة',
      error: error.message
    });
  }
};

module.exports = {
  uploadImage,
  deleteImage
};

