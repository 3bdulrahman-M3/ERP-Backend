const { Review, Student, User } = require('../models');

// Create a new review
const createReview = async (studentId, rating, comment) => {
  // Validate rating
  if (!rating || rating < 1 || rating > 5) {
    throw new Error('Rating must be between 1 and 5');
  }

  // Check if student already has a review
  const existingReview = await Review.findOne({
    where: { studentId }
  });

  if (existingReview) {
    throw new Error('You have already submitted a review');
  }

  // Create review
  const review = await Review.create({
    studentId,
    rating,
    comment: comment || null,
    isApproved: true // Reviews are automatically approved
  });

  // Fetch review with student and user info
  const reviewWithDetails = await Review.findByPk(review.id, {
    include: [
      {
        model: Student,
        as: 'student',
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email', 'profileImage']
          }
        ]
      }
    ]
  });

  return reviewWithDetails;
};

// Get all reviews (for admin)
const getAllReviews = async (page = 1, limit = 10, filters = {}) => {
  const offset = (page - 1) * limit;
  const where = {};

  const { count, rows } = await Review.findAndCountAll({
    where,
    include: [
      {
        model: Student,
        as: 'student',
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email', 'profileImage']
          }
        ]
      }
    ],
    order: [['createdAt', 'DESC']],
    limit,
    offset
  });

  return {
    reviews: rows,
    pagination: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    }
  };
};

// Get approved reviews for public display (landing page)
const getApprovedReviews = async (limit = 10) => {
  const reviews = await Review.findAll({
    where: {},
    include: [
      {
        model: Student,
        as: 'student',
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email', 'profileImage']
          }
        ]
      }
    ],
    order: [['createdAt', 'DESC']],
    limit
  });

  return reviews;
};

// Get student's own review
const getStudentReview = async (studentId) => {
  const review = await Review.findOne({
    where: { studentId },
    include: [
      {
        model: Student,
        as: 'student',
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email', 'profileImage']
          }
        ]
      }
    ]
  });

  return review;
};

// Update review (student can update their own review)
const updateReview = async (studentId, rating, comment) => {
  const review = await Review.findOne({
    where: { studentId }
  });

  if (!review) {
    throw new Error('Review not found');
  }

  // Validate rating
  if (rating && (rating < 1 || rating > 5)) {
    throw new Error('Rating must be between 1 and 5');
  }

  // Update review
  review.rating = rating || review.rating;
  review.comment = comment !== undefined ? comment : review.comment;
  review.isApproved = true; // Keep approved after update
  await review.save();

  // Fetch updated review with details
  const updatedReview = await Review.findByPk(review.id, {
    include: [
      {
        model: Student,
        as: 'student',
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email', 'profileImage']
          }
        ]
      }
    ]
  });

  return updatedReview;
};

// Approve review (admin only)
const approveReview = async (reviewId) => {
  const review = await Review.findByPk(reviewId);

  if (!review) {
    throw new Error('Review not found');
  }

  review.isApproved = true;
  await review.save();

  return review;
};

// Reject/Delete review (admin only)
const deleteReview = async (reviewId) => {
  const review = await Review.findByPk(reviewId);

  if (!review) {
    throw new Error('Review not found');
  }

  await review.destroy();
  return true;
};

// Get review statistics
const getReviewStats = async () => {
  const totalReviews = await Review.count();

  // Calculate average rating
  const reviews = await Review.findAll({
    attributes: ['rating']
  });

  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  // Rating distribution
  const ratingDistribution = {};
  for (let i = 1; i <= 5; i++) {
    ratingDistribution[i] = await Review.count({
      where: {
        rating: i
      }
    });
  }

  return {
    totalReviews,
    averageRating: Math.round(averageRating * 10) / 10,
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

