function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: 'Route tidak ditemukan',
  });
}

module.exports = notFoundHandler;
