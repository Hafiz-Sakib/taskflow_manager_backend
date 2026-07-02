const User = require('../models/User');

const userRepository = {
  create: (data) => User.create(data),

  findByEmail: (email, { withPassword = false } = {}) => {
    const query = User.findOne({ email });
    return withPassword ? query.select('+password') : query;
  },

  findById: (id, { withRefreshToken = false } = {}) => {
    const query = User.findById(id);
    return withRefreshToken ? query.select('+refreshTokenHash') : query;
  },

  setRefreshTokenHash: (id, refreshTokenHash) =>
    User.findByIdAndUpdate(id, { refreshTokenHash }, { new: true }),

  clearRefreshTokenHash: (id) => User.findByIdAndUpdate(id, { refreshTokenHash: null }),

  countAll: () => User.countDocuments(),
};

module.exports = userRepository;
