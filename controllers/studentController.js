const studentService = require('../services/studentService');

// Create student
const createStudent = async (req, res) => {
  try {
    const { name, email, password, college, age, phoneNumber } = req.body;

    // Validation
    if (!name || !email || !password || !college || !age || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: name, email, password, college, age, phoneNumber'
      });
    }

    const student = await studentService.createStudent({
      name,
      email,
      password,
      college,
      age,
      phoneNumber
    });

    res.status(201).json({
      success: true,
      message: 'Student created successfully',
      data: student
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Get all students
const getAllStudents = async (req, res) => {
  try {
    const page = req.query.page || 1;
    const limit = req.query.limit || 10;

    const result = await studentService.getAllStudents(page, limit);

    res.json({
      success: true,
      message: 'Students retrieved successfully',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get student by ID
const getStudentById = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await studentService.getStudentById(id);

    res.json({
      success: true,
      message: 'Student retrieved successfully',
      data: student
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
};

// Update student
const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const student = await studentService.updateStudent(id, updateData);

    res.json({
      success: true,
      message: 'Student updated successfully',
      data: student
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Delete student
const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;

    await studentService.deleteStudent(id);

    res.json({
      success: true,
      message: 'Student deleted successfully'
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  createStudent,
  getAllStudents,
  getStudentById,
  updateStudent,
  deleteStudent
};

