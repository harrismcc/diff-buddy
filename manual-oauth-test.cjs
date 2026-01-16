#!/usr/bin/env node
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./prisma/dev.db');

console.log('🔍 OAuth Database Inspection\n');

// Check accounts
db.all("SELECT userId, providerId, scope, createdAt FROM Account WHERE providerId = 'github'", (err, rows) => {
  if (err) {
    console.error('❌ Error:', err.message);
    return;
  }
  
  if (rows.length === 0) {
    console.log('❌ No GitHub account found in database');
  } else {
    rows.forEach(row => {
      console.log('✅ GitHub Account Found:');
      console.log(`   - User ID: ${row.userId}`);
      console.log(`   - Provider: ${row.providerId}`);
      console.log(`   - Scopes: ${row.scope || 'NONE (empty!)'}`);
      console.log(`   - Created: ${new Date(row.createdAt).toISOString()}`);
      console.log('');
    });
  }
});

// Check sessions
db.all("SELECT userId, expiresAt FROM Session", (err, rows) => {
  if (err) {
    console.error('❌ Error:', err.message);
    return;
  }
  
  console.log('📋 Active Sessions:', rows.length);
  rows.forEach(row => {
    console.log(`   - User ID: ${row.userId}, Expires: ${new Date(row.expiresAt).toISOString()}`);
  });
});

db.close();
