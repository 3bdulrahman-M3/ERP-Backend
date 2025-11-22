const { College } = require('../models');

// Get all colleges
const getAllColleges = async () => {
  const colleges = await College.findAll({
    order: [['name', 'ASC']]
  });
  return colleges;
};

// Get college by ID
const getCollegeById = async (id) => {
  const college = await College.findByPk(id);
  if (!college) {
    throw new Error('College not found');
  }
  return college;
};

// Create college
const createCollege = async (collegeData) => {
  const { name, description } = collegeData;

  // Check if college already exists
  const existingCollege = await College.findOne({ where: { name } });
  if (existingCollege) {
    throw new Error('College with this name already exists');
  }

  const college = await College.create({
    name,
    description: description || null
  });

  return college.toJSON();
};

// Update college
const updateCollege = async (id, collegeData) => {
  const college = await College.findByPk(id);
  if (!college) {
    throw new Error('College not found');
  }

  const { name, description } = collegeData;

  if (name && name !== college.name) {
    const existingCollege = await College.findOne({ where: { name } });
    if (existingCollege) {
      throw new Error('College with this name already exists');
    }
    college.name = name;
  }

  if (description !== undefined) college.description = description;

  await college.save();
  return college.toJSON();
};

// Delete college
const deleteCollege = async (id) => {
  const college = await College.findByPk(id);
  if (!college) {
    throw new Error('College not found');
  }

  await college.destroy();
  return { message: 'College deleted successfully' };
};

module.exports = {
  getAllColleges,
  getCollegeById,
  createCollege,
  updateCollege,
  deleteCollege
};

