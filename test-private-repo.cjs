#!/usr/bin/env node
const sqlite3 = require('sqlite3').verbose();

async function testPrivateRepoAccess() {
  // Get the OAuth token from database
  const db = new sqlite3.Database('./prisma/dev.db');
  
  return new Promise((resolve, reject) => {
    db.get("SELECT accessToken FROM Account WHERE providerId = 'github' ORDER BY createdAt DESC LIMIT 1", async (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (!row || !row.accessToken) {
        console.log('❌ No access token found in database');
        db.close();
        resolve();
        return;
      }
      
      console.log('✅ Found access token in database');
      
      // Test private repo access
      try {
        const response = await fetch('https://api.github.com/repos/Infilla/infilla-app', {
          headers: {
            'Authorization': `token ${row.accessToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });
        
        if (response.ok) {
          const repo = await response.json();
          console.log('✅ Private repo access successful!');
          console.log(`   - Repository: ${repo.full_name}`);
          console.log(`   - Private: ${repo.private}`);
          console.log(`   - Description: ${repo.description || 'No description'}`);
          
          // Test specific PR
          const prResponse = await fetch('https://api.github.com/repos/Infilla/infilla-app/pulls/1892', {
            headers: {
              'Authorization': `token ${row.accessToken}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          });
          
          if (prResponse.ok) {
            const pr = await prResponse.json();
            console.log('✅ PR #1892 access successful!');
            console.log(`   - Title: ${pr.title}`);
            console.log(`   - Status: ${pr.state}`);
          } else {
            console.log('❌ PR #1892 access failed:', prResponse.status, prResponse.statusText);
          }
        } else {
          console.log('❌ Private repo access failed:', response.status, response.statusText);
          const errorText = await response.text();
          console.log('   - Error:', errorText);
        }
      } catch (error) {
        console.log('❌ Request failed:', error.message);
      }
      
      db.close();
      resolve();
    });
  });
}

testPrivateRepoAccess();
