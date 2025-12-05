const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads/chat directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads/chat');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Created chat uploads directory:', uploadsDir);
} else {
  console.log('✅ Chat uploads directory exists:', uploadsDir);
}

// Configure multer to save files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = 'chat-' + uniqueSuffix + ext;
    cb(null, filename);
  }
});

// Filter files (images and general files)
const fileFilter = (req, file, cb) => {
  // Images
  const imageTypes = /jpeg|jpg|png|gif|webp/;
  // General files (PDF, DOC, DOCX, TXT, etc.)
  const fileTypes = /pdf|doc|docx|txt|xls|xlsx|zip|rar/;
  
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  const isImage = imageTypes.test(ext) && imageTypes.test(file.mimetype);
  const isFile = fileTypes.test(ext);
  
  if (isImage || isFile) {
    return cb(null, true);
  } else {
    cb(new Error('File type not supported. Only images and files (PDF, DOC, DOCX, TXT, XLS, XLSX, ZIP, RAR) are allowed'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: fileFilter
});

module.exports = upload;

