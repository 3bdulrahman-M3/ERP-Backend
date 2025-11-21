const User = require('./User');
const RefreshToken = require('./RefreshToken');

// Associations
RefreshToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(RefreshToken, { foreignKey: 'userId', as: 'refreshTokens' });

module.exports = {
  User,
  RefreshToken
};

