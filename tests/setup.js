const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test_access_secret_key_1234567890';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test_refresh_secret_key_1234567890';
process.env.COOKIE_SECRET = process.env.COOKIE_SECRET || 'test_cookie_secret_key_1234567890';
process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/taskflow_test_placeholder';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGO_URI_TEST = mongoServer.getUri();
  await mongoose.connect(process.env.MONGO_URI_TEST);
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
});

afterAll(async () => {
  await mongoose.connection.close();
  if (mongoServer) await mongoServer.stop();
});
