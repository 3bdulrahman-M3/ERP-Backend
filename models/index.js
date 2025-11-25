const User = require('./User');
const RefreshToken = require('./RefreshToken');
const Student = require('./Student');
const Room = require('./Room');
const RoomStudent = require('./RoomStudent');
const College = require('./College');
const Meal = require('./Meal');

// Associations
RefreshToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(RefreshToken, { foreignKey: 'userId', as: 'refreshTokens' });

Student.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasOne(Student, { foreignKey: 'userId', as: 'student' });

// College associations
Student.belongsTo(College, { foreignKey: 'collegeId', as: 'college' });
College.hasMany(Student, { foreignKey: 'collegeId', as: 'students' });

// Room associations
Room.hasMany(RoomStudent, { foreignKey: 'roomId', as: 'roomStudents' });
RoomStudent.belongsTo(Room, { foreignKey: 'roomId', as: 'room' });

// Student-Room associations (through RoomStudent)
Student.hasMany(RoomStudent, { foreignKey: 'studentId', as: 'roomAssignments' });
RoomStudent.belongsTo(Student, { foreignKey: 'studentId', as: 'student' });

// Many-to-many relationship
Room.belongsToMany(Student, { through: RoomStudent, foreignKey: 'roomId', otherKey: 'studentId', as: 'students' });
Student.belongsToMany(Room, { through: RoomStudent, foreignKey: 'studentId', otherKey: 'roomId', as: 'rooms' });

module.exports = {
  User,
  RefreshToken,
  Student,
  Room,
  RoomStudent,
  College,
  Meal
};

