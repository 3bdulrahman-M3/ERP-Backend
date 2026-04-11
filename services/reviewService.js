const prisma = require('../config/prisma');

// Create a new review
const createReview = async (studentId, rating, comment) => {
  const sId = parseInt(studentId);
  const nRating = parseInt(rating);

  if (!nRating || nRating < 1 || nRating > 5) {
    throw new Error('Rating must be between 1 and 5');
  }

  const existingReview = await prisma.review.findFirst({
    where: { studentId: sId }
  });

  if (existingReview) {
    throw new Error('You have already submitted a review');
  }

  return await prisma.review.create({
    data: {
      studentId: sId,
      rating: nRating,
      comment: comment || null,
      isApproved: true
    },
    include: {
      student: {
        include: {
          user: { select: { id: true, name: true, email: true, profileImage: true } }
        }
      }
    }
  });
};

// Get all reviews (for admin)
const getAllReviews = async (page = 1, limit = 10, filters = {}) => {
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);
  const where = {};

  const [reviews, count] = await Promise.all([
    prisma.review.findMany({
      where,
      include: {
        student: {
          include: {
            user: { select: { id: true, name: true, email: true, profileImage: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take
    }),
    prisma.review.count({ where })
  ]);

  return {
    reviews,
    pagination: {
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / limit)
    }
  };
};

// Get approved reviews
const getApprovedReviews = async (limit = 10) => {
  return await prisma.review.findMany({
    where: { isApproved: true },
    include: {
      student: {
        include: {
          user: { select: { id: true, name: true, email: true, profileImage: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: parseInt(limit)
  });
};

// Get student's own review
const getStudentReview = async (studentId) => {
  const sId = parseInt(studentId);
  return await prisma.review.findFirst({
    where: { studentId: sId },
    include: {
      student: {
        include: {
          user: { select: { id: true, name: true, email: true, profileImage: true } }
        }
      }
    }
  });
};

// Update review
const updateReview = async (studentId, rating, comment) => {
  const sId = parseInt(studentId);
  const review = await prisma.review.findFirst({ where: { studentId: sId } });

  if (!review) throw new Error('Review not found');

  const nRating = rating ? parseInt(rating) : undefined;
  if (nRating && (nRating < 1 || nRating > 5)) {
    throw new Error('Rating must be between 1 and 5');
  }

  return await prisma.review.update({
    where: { id: review.id },
    data: {
      rating: nRating,
      comment: comment !== undefined ? comment : undefined,
      isApproved: true
    },
    include: {
      student: {
        include: {
          user: { select: { id: true, name: true, email: true, profileImage: true } }
        }
      }
    }
  });
};

// Approve review
const approveReview = async (reviewId) => {
  const id = parseInt(reviewId);
  return await prisma.review.update({
    where: { id },
    data: { isApproved: true }
  });
};

// Delete review
const deleteReview = async (reviewId) => {
  const id = parseInt(reviewId);
  await prisma.review.delete({ where: { id } });
  return true;
};

// Get review statistics
const getReviewStats = async () => {
  const stats = await prisma.review.aggregate({
    _count: true,
    _avg: { rating: true }
  });

  const distRaw = await prisma.review.groupBy({
    by: ['rating'],
    _count: true
  });

  const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  distRaw.forEach(item => {
    ratingDistribution[item.rating] = item._count;
  });

  return {
    totalReviews: stats._count,
    averageRating: stats._avg.rating ? Math.round(stats._avg.rating * 10) / 10 : 0,
    ratingDistribution
  };
};

module.exports = {
  createReview,
  getAllReviews,
  getApprovedReviews,
  getStudentReview,
  updateReview,
  approveReview,
  deleteReview,
  getReviewStats
};
