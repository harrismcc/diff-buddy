import { auth } from './src/lib/auth/auth.js';

// Generate the OAuth URL to see what scopes are included
const githubOAuthUrl = auth.api.signInSocial({
  body: {
    provider: "github",
  },
  headers: {
    'Content-Type': 'application/json'
  }
});

console.log('GitHub OAuth Configuration Test');

// Test what scopes would be included
const testConfig = {
  clientId: process.env.GITHUB_CLIENT_ID,
  disableDefaultScope: true,
  scope: ["repo", "read:user", "user:email"]
};

console.log('Config:', JSON.stringify(testConfig, null, 2));