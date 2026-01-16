// Test script to verify OAuth scopes and private repo access
import { getGithubToken } from './src/serverActions/getGithubToken.js';
import { authClient } from './src/lib/auth-client.js';

async function testOAuthAndRepoAccess() {
  try {
    // 1. Check if user is authenticated
    const session = await authClient.getSession();
    if (!session.data) {
      console.log('❌ Not authenticated');
      return;
    }
    
    console.log('✅ User authenticated:', session.data.user.email);
    
    // 2. Get the OAuth token
    const token = await getGithubToken();
    console.log('✅ OAuth token retrieved successfully');
    
    // 3. Test private repo access
    const response = await fetch('https://api.github.com/repos/Infilla/infilla-app', {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (response.ok) {
      const repo = await response.json();
      console.log('✅ Private repo access successful:', repo.full_name);
      console.log('   - Private:', repo.private);
      console.log('   - Description:', repo.description);
    } else {
      console.log('❌ Private repo access failed:', response.status, response.statusText);
      const error = await response.text();
      console.log('   - Error:', error);
    }
    
    // 4. Test a specific PR
    const prResponse = await fetch('https://api.github.com/repos/Infilla/infilla-app/pulls/1892', {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (prResponse.ok) {
      const pr = await prResponse.json();
      console.log('✅ PR #1892 access successful:', pr.title);
    } else {
      console.log('❌ PR #1892 access failed:', prResponse.status, prResponse.statusText);
    }
    
    // 5. Check OAuth scopes in database
    const { prisma } = await import('./src/db/index.js');
    const account = await prisma.account.findFirst({
      where: { providerId: 'github' }
    });
    
    if (account) {
      console.log('📋 Database OAuth scopes:', account.scope);
      console.log('📋 Account created:', account.createdAt);
    } else {
      console.log('❌ No GitHub account found in database');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testOAuthAndRepoAccess();
