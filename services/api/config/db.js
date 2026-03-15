const mongoose = require('mongoose');

/** Single MongoDB connection for the unified API (one DB: galaxies) */
const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/galaxies';
    const conn = await mongoose.connect(uri, {
      connectTimeoutMS: 10000,
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`API DB Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error('API DB Error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
