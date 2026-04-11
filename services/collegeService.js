const prisma = require('../config/prisma');

// Get all colleges with student count
const getAllColleges = async (page = 1, limit = 10) => {
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);
  
  const [colleges, count] = await Promise.all([
    prisma.college.findMany({
      orderBy: { name: 'asc' },
      skip,
      take,
      include: {
        _count: {
          select: { students: true }
        }
      }
    }),
    prisma.college.count()
  ]);
  
  const collegesWithCount = colleges.map(college => ({
    ...college,
    studentCount: college._count.students
  }));
  
  return {
    colleges: collegesWithCount,
    pagination: {
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / limit)
    }
  };
};

// Get college by ID
const getCollegeById = async (id) => {
  const collegeId = parseInt(id);
  const college = await prisma.college.findUnique({
    where: { id: collegeId },
    include: {
      _count: {
        select: { students: true }
      }
    }
  });
  
  if (!college) {
    throw new Error('College not found');
  }
  
  return {
    ...college,
    studentCount: college._count.students
  };
};

// Create college
const createCollege = async (collegeData) => {
  const { name, description } = collegeData;

  // Check if college already exists
  const existingCollege = await prisma.college.findUnique({ where: { name } });
  if (existingCollege) {
    throw new Error('College with this name already exists');
  }

  return await prisma.college.create({
    data: {
      name,
      description: description || null
    }
  });
};

// Update college
const updateCollege = async (id, collegeData) => {
  const collegeId = parseInt(id);
  const college = await prisma.college.findUnique({ where: { id: collegeId } });
  
  if (!college) {
    throw new Error('College not found');
  }

  const { name, description } = collegeData;

  if (name && name !== college.name) {
    const existingCollege = await prisma.college.findUnique({ where: { name } });
    if (existingCollege) {
      throw new Error('College with this name already exists');
    }
  }

  return await prisma.college.update({
    where: { id: collegeId },
    data: {
      name: name || undefined,
      description: description !== undefined ? description : undefined
    }
  });
};

// Delete college
const deleteCollege = async (id) => {
  const collegeId = parseInt(id);
  const college = await prisma.college.findUnique({ where: { id: collegeId } });
  
  if (!college) {
    throw new Error('College not found');
  }

  await prisma.college.delete({ where: { id: collegeId } });
  return { message: 'College deleted successfully' };
};

module.exports = {
  getAllColleges,
  getCollegeById,
  createCollege,
  updateCollege,
  deleteCollege
};
