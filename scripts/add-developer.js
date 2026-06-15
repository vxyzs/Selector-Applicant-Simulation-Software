const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('Error: MONGODB_URI is not defined in .env.local');
  process.exit(1);
}

// Read CLI arguments
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('========================================================================');
  console.log('Nexus CLI Tool - Add Developer Admin');
  console.log('========================================================================');
  console.log('Usage:');
  console.log('  node scripts/add-developer.js <name> <email> [password]');
  console.log('');
  console.log('Example:');
  console.log('  node scripts/add-developer.js "John Dev" "john@nexus.com"');
  console.log('========================================================================');
  process.exit(0);
}

const name = args[0];
const email = args[1].toLowerCase().trim();
const passwordInput = args[2] ? args[2] : '';

async function run() {
  const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  try {
    await client.connect();
    const db = client.db();

    // Check if user already exists
    const existingUser = await db.collection('users').findOne({ email });
    if (existingUser) {
      console.error(`Error: User with email ${email} already exists.`);
      process.exit(1);
    }

    // Password Generation
    const tempPassword = passwordInput || crypto.randomBytes(6).toString('hex');
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const result = await db.collection('users').insertOne({
      name,
      email,
      password: hashedPassword,
      role: 'admin',
      createdAt: new Date()
    });

    console.log('========================================================================');
    console.log('🎉 Developer Admin Created Successfully!');
    console.log('========================================================================');
    console.log(`ID:       ${result.insertedId}`);
    console.log(`Name:     ${name}`);
    console.log(`Email:    ${email}`);
    console.log(`Password: ${tempPassword} (hashed in DB)`);
    console.log('========================================================================');

    // Save temporary credentials locally to onboarded_credentials.json
    try {
      const filePath = path.join(__dirname, '..', 'onboarded_credentials.json');
      let data = [];
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        data = JSON.parse(content || '[]');
      }
      data.push({
        name,
        email,
        temporaryPassword: tempPassword,
        role: 'admin',
        timestamp: new Date().toISOString(),
        createdVia: 'cli'
      });
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      console.log(`Credentials saved to: ${path.basename(filePath)}`);
    } catch (fileErr) {
      console.error('Warning: Failed to save credentials to onboarded_credentials.json', fileErr);
    }

  } catch (err) {
    console.error('Fatal database error:', err);
  } finally {
    await client.close();
  }
}

run();
