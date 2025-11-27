const User = require('./User');
const RefreshToken = require('./RefreshToken');
const Student = require('./Student');
const Room = require('./Room');
const RoomStudent = require('./RoomStudent');
const College = require('./College');
const Meal = require('./Meal');
const CheckInOut = require('./CheckInOut');
const Service = require('./Service');
const Building = require('./Building');
const Conversation = require('./Conversation');
const Message = require('./Message');
const Notification = require('./Notification');
const Preference = require('./Preference');
const RoomRequest = require('./RoomRequest');

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

// CheckInOut associations
CheckInOut.belongsTo(Student, { foreignKey: 'studentId', as: 'student' });
Student.hasMany(CheckInOut, { foreignKey: 'studentId', as: 'checkInOuts' });

// Room-Service associations (many-to-many)
Room.belongsToMany(Service, { through: 'room_services', foreignKey: 'roomId', otherKey: 'serviceId', as: 'services' });
Service.belongsToMany(Room, { through: 'room_services', foreignKey: 'serviceId', otherKey: 'roomId', as: 'rooms' });

// Building associations
Building.hasMany(Room, { foreignKey: 'buildingId', as: 'rooms' });
Room.belongsTo(Building, { foreignKey: 'buildingId', as: 'buildingInfo' });

// Conversation associations
Conversation.belongsTo(Student, { foreignKey: 'studentId', as: 'student' });
Student.hasOne(Conversation, { foreignKey: 'studentId', as: 'conversation' });
Conversation.belongsTo(User, { foreignKey: 'adminId', as: 'admin' });
Conversation.hasMany(Message, { foreignKey: 'conversationId', as: 'messages' });

// Message associations
Message.belongsTo(Conversation, { foreignKey: 'conversationId', as: 'conversation' });
Message.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

// Notification associations
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });

// Preference associations
Preference.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasOne(Preference, { foreignKey: 'userId', as: 'preference' });

// RoomRequest associations
RoomRequest.belongsTo(Room, { foreignKey: 'roomId', as: 'room' });
Room.hasMany(RoomRequest, { foreignKey: 'roomId', as: 'requests' });
RoomRequest.belongsTo(Student, { foreignKey: 'studentId', as: 'student' });
Student.hasMany(RoomRequest, { foreignKey: 'studentId', as: 'roomRequests' });

module.exports = {
  User,
  RefreshToken,
  Student,
  Room,
  RoomStudent,
  College,
  Meal,
  CheckInOut,
  Service,
  Building,
  Conversation,
  Message,
  Notification,
  Preference,
  RoomRequest
};

