const reviewService = require('../services/reviewService');
const { Student } = require('../models');

// Create review (student only)
const createReview = async (req, res) => {
  try {
    const userId = req.user.id;
    const { rating, comment } = req.body;

    // Get student by userId
    const student = await Student.findOne({
      where: { userId }
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    const review = await reviewService.createReview(student.id, rating, comment);

    res.json({
      success: true,
      message: 'Review submitted successfully.',
      data: review
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'An error occurred while creating the review'
    });
  }
};

// Get all reviews (admin only)
const getAllReviews = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await reviewService.getAllReviews(page, limit, {});

    res.json({
      success: true,
      data: result.reviews,
      pagination: result.pagination
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while fetching reviews'
    });
  }
};

// Get approved reviews for public display
const getApprovedReviews = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const reviews = await reviewService.getApprovedReviews(limit);

    res.json({
      success: true,
      data: reviews
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while fetching reviews'
    });
  }
};

// Get student's own review
const getStudentReview = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get student by userId
    const student = await Student.findOne({
      where: { userId }
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    const review = await reviewService.getStudentReview(student.id);

    res.json({
      success: true,
      data: review
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while fetching review'
    });
  }
};

// Update review (student only)
const updateReview = async (req, res) => {
  try {
    const userId = req.user.id;
    const { rating, comment } = req.body;

    // Get student by userId
    const student = await Student.findOne({
      where: { userId }
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    const review = await reviewService.updateReview(student.id, rating, comment);

    res.json({
      success: true,
      message: 'Review updated successfully.',
      data: review
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'An error occurred while updating the review'
    });
  }
};

// Approve review (admin only)
const approveReview = async (req, res) => {
  try {
    const { id } = req.params;
    const review = await reviewService.approveReview(id);

    res.json({
      success: true,
      message: 'Review approved successfully',
      data: review
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'An error occurred while approving the review'
    });
  }
};

// Delete review (admin only)
const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    await reviewService.deleteReview(id);

    res.json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'An error occurred while deleting the review'
    });
  }
};

// Get review statistics (admin only)
const getReviewStats = async (req, res) => {
  try {
    const stats = await reviewService.getReviewStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while fetching review statistics'
    });
  }
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

