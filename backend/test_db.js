const mongoose = require('mongoose');

const passwords = [
  'Rohit@123',
  'Rohit123',
  'rohit123',
  'rohit@123',
  'Rohit12345',
  'rohit12345',
  'Rohit@12345',
  'rohit@12345',
  'Rohitcpp0777',
  'rohitcpp0777',
  'Rohitcpp0777@123',
  'rohitcpp0777@123',
  'Rohit',
  'rohit',
  'Admin123',
  'admin123',
  'Admin@123',
  'admin@123',
  '12345678',
  '123456'
];

async function testAll() {
  const cluster = 'cluster0.hcernoi.mongodb.net';
  const username = 'rohitcpp0777_db_user';
  
  for (const pw of passwords) {
    const encodedPw = encodeURIComponent(pw);
    const uri = `mongodb+srv://${username}:${encodedPw}@${cluster}/?appName=Cluster0`;
    console.log(`Testing with password: "${pw}" (encoded: "${encodedPw}")`);
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 3000
      });
      console.log(`\n🎉 SUCCESS! Working URI: ${uri}`);
      await mongoose.disconnect();
      process.exit(0);
    } catch (err) {
      console.log(`Failed: ${err.message}`);
    }
  }
  
  console.log('\n❌ All passwords failed.');
  process.exit(1);
}

testAll();
