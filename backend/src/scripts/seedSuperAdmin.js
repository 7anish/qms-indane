const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { superAdmin } = require('../config/env');
const Admin = require('../models/Admin');
const { ROLES } = require('../config/constants');

(async () => {
  if (!superAdmin.email || !superAdmin.password) {
    console.error('Set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD in .env');
    process.exit(1);
  }

  await connectDB();

  const existing = await Admin.findOne({ email: superAdmin.email.toLowerCase() });
  if (existing) {
    console.log(`Super admin already exists: ${existing.email}`);
  } else {
    await Admin.create({
      name: superAdmin.name,
      email: superAdmin.email,
      password: superAdmin.password,
      role: ROLES.SUPER_ADMIN,
    });
    console.log(`Super admin created: ${superAdmin.email}`);
  }

  await mongoose.disconnect();
})();
