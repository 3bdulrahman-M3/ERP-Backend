const responseHandler = (req, res, next) => {
  // This middleware can be used to format responses if needed
  next();
};

module.exports = responseHandler;

