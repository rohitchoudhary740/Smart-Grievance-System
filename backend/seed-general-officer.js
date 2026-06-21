require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection;

  const tenant = await db.collection('tenants').findOne({ slug: 'demo-city' });
  console.log('Tenant:', tenant.slug);

  const adminDept = await db.collection('departments').findOne({ slug: 'admin', tenantId: tenant._id });
  console.log('Admin dept:', adminDept.name);

  const o1 = await db.collection('users').findOne({ email: 'officer@demo-city.gov' });

  const exists = await db.collection('users').findOne({ email: 'general@demo-city.gov' });

  if (!exists) {
    await db.collection('users').insertOne({
      tenantId: tenant._id,
      name: 'General Officer',
      email: 'general@demo-city.gov',
      passwordHash: o1.passwordHash,
      role: 'OFFICER',
      departmentId: adminDept._id,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('General officer created!');
  } else {
    await db.collection('users').updateOne(
      { email: 'general@demo-city.gov' },
      { $set: { departmentId: adminDept._id } }
    );
    console.log('General officer updated!');
  }

  console.log('Done!');
  mongoose.disconnect();
});
