const User = require('./User');
const RefreshToken = require('./RefreshToken');
const Student = require('./Student');

// Associations
RefreshToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(RefreshToken, { foreignKey: 'userId', as: 'refreshTokens' });

Student.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasOne(Student, { foreignKey: 'userId', as: 'student' });

module.exports = {
  User,
  RefreshToken,
  Student
};

