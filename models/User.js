const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'الاسم مطلوب'
      }
    }
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: {
      msg: 'البريد الإلكتروني مستخدم بالفعل'
    },
    validate: {
      isEmail: {
        msg: 'البريد الإلكتروني غير صحيح'
      },
      notEmpty: {
        msg: 'البريد الإلكتروني مطلوب'
      }
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'كلمة المرور مطلوبة'
      },
      len: {
        args: [6, 255],
        msg: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'
      }
    }
  },
  role: {
    type: DataTypes.ENUM('admin', 'student'),
    allowNull: false,
    defaultValue: 'student',
    validate: {
      isIn: {
        args: [['admin', 'student']],
        msg: 'الدور يجب أن يكون admin أو student'
      }
    }
  }
}, {
  tableName: 'users',
  timestamps: true,
  underscored: true,
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

// دالة لمقارنة كلمة المرور
User.prototype.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = User;

