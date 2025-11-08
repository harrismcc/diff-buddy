# PR Summary

This PR enhances the deployment and environment setup workflow by introducing dynamic AWS profile support. The changes allow for more flexible configuration management across different deployment environments (staging vs production) by:

1. Adding a new step to fetch environment secrets during CI/CD deployment
2. Updating npm scripts to support dynamic AWS profile selection
3. Refactoring the `goodmorning.ts` setup script to accept profile arguments and pass them through the entire secret retrieval pipeline

---

## GitHub Actions Deployment Workflow Enhancement

The deployment workflow now includes a dedicated step to fetch environment secrets from AWS Secrets Manager based on the target environment.

```diff
diff --git a/.github/workflows/deploy.yml b/.github/workflows/deploy.yml
index e104d3b29..bb8277873 100644
--- a/.github/workflows/deploy.yml
+++ b/.github/workflows/deploy.yml
@@ -47,6 +47,25 @@ jobs:
           aws-secret-access-key: ${{ env.AWS_SECRET_ACCESS_KEY }}
           aws-region: ${{ env.AWS_REGION }}
 
+      - name: Fetch environment secrets with AWS CLI
+        run: |
+          # Determine which environment secrets to fetch
+          if [[ "${{ inputs.environment }}" == "production" ]]; then
+            SECRET_PATH="prod/infilla-app/env-production"
+            ENV_FILE=".env.production"
+          else
+            SECRET_PATH="dev/infilla-app/env-staging"
+            ENV_FILE=".env.staging"
+          fi
+          
+          # Fetch secrets and write to .env file
+          aws secretsmanager get-secret-value \
+            --secret-id $SECRET_PATH \
+            --query SecretString \
+            --output text > $ENV_FILE
+          
+          echo "✅ Created $ENV_FILE with secrets from $SECRET_PATH"
+
         - name: Set outputs
           id: vars
           run: |
```

This new workflow step automatically fetches the appropriate environment secrets from AWS Secrets Manager based on whether the deployment is targeting production or staging. The secrets are written to the corresponding `.env` file for use during the deployment process.

---

## NPM Scripts Update for Dynamic Profile Support

The `package.json` scripts have been updated to use dynamic AWS profiles and incorporate the new `goodmorning` script with profile arguments.

```diff
diff --git a/package.json b/package.json
index 3adefa2b9..4530e584a 100644
--- a/package.json
+++ b/package.json
@@ -28,10 +28,10 @@
     "test:integration:watch": "npm run test:integration:setup && dotenv -e .env.testing -- jest --config jest.config.integration.ts --watch && npm run docker:down",
     "cdk:synth": "cdk synth -c config=development",
     "cdk:cleanup": "rm -rf ./cdk.out/*",
-    "cdk:diff": "aws sts get-caller-identity --profile development && cdk --profile development -c config=development diff",
-    "cdk:deploy": "aws sts get-caller-identity --profile development && npm run pre-deploy '_dev_' && SENTRY_RELEASE=$(git rev-parse --short HEAD) MODE=staging dotenv -e .env.staging -- cdk --profile development -c config=development deploy --all && npm run cdk:cleanup",
-    "cdk:diff-production": "aws sts get-caller-identity --profile production cdk --profile production -c config=production diff",
-    "cdk:deploy-production": "aws sts get-caller-identity --profile production && npm run pre-deploy '*prod*' && SENTRY_RELEASE=$(git rev-parse --short HEAD) MODE=production dotenv -e .env.production -- cdk --profile production -c config=production deploy --all && npm run post-deploy-success && npm run cdk:cleanup",
+    "cdk:diff": "npm run goodmorning -- --profile staging && aws sts get-caller-identity --profile staging && cdk --profile staging -c config=staging diff",
+    "cdk:deploy": "npm run goodmorning -- --profile staging && aws sts get-caller-identity --profile staging && npm run pre-deploy '_dev_' && SENTRY_RELEASE=$(git rev-parse --short HEAD) MODE=staging dotenv -e .env.staging -- cdk --profile staging -c config=staging deploy --all && npm run cdk:cleanup",
+    "cdk:diff-production": "npm run goodmorning -- --profile production && aws sts get-caller-identity --profile production cdk --profile production -c config=production diff",
+    "cdk:deploy-production": "npm run goodmorning -- --profile production && aws sts get-caller-identity --profile production && npm run pre-deploy '*prod*' && SENTRY_RELEASE=$(git rev-parse --short HEAD) MODE=production dotenv -e .env.production -- cdk --profile production -c config=production deploy --all && npm run post-deploy-success && npm run cdk:cleanup",
     "opensearch:migrate": "tsx --env-file=.env.development ./scripts/opensearch.ts migrate",
     "opensearch:reindex": "tsx --env-file=.env.development ./scripts/opensearch.ts reindex",
     "pre-deploy": "tsx --env-file=.env.development ./scripts/deploy/pre-deploy.ts",
```

Key changes:
- All staging-related scripts now explicitly pass `--profile staging` to the `goodmorning` script
- All production-related scripts now explicitly pass `--profile production` to the `goodmorning` script
- The `goodmorning` script is called as a prerequisite before AWS CLI operations, ensuring proper profile configuration

---

## Goodmorning Setup Script Refactoring

The `goodmorning.ts` script has been significantly refactored to support dynamic AWS profile selection through command-line arguments.

### Profile Parameter Addition to `writeSecretsToFile` Function

```diff
diff --git a/scripts/goodmorning.ts b/scripts/goodmorning.ts
index fa6dbf6f0..e243c5ff0 100644
--- a/scripts/goodmorning.ts
+++ b/scripts/goodmorning.ts
@@ -59,9 +59,13 @@ async function executeCommand(
 }
 
 // Write secrets from AWS Secrets Manager to a file
-async function writeSecretsToFile(secretPath: string, filePath: string): Promise<boolean> {
+async function writeSecretsToFile(
+  secretPath: string,
+  filePath: string,
+  profile: string,
+): Promise<boolean> {
   const secretsResult = await executeCommand(
-    `aws secretsmanager get-secret-value --secret-id ${secretPath} --profile ${AWS_PROFILE}`,
+    `aws secretsmanager get-secret-value --secret-id ${secretPath} --profile ${profile}`,
   );
 
   if (secretsResult.statusCode !== 0) {
```

The `writeSecretsToFile` function now accepts a `profile` parameter instead of relying on the global `AWS_PROFILE` constant. This allows the function to fetch secrets using different AWS profiles.

### Main Goodmorning Function Enhancement

```diff
diff --git a/scripts/goodmorning.ts b/scripts/goodmorning.ts
index fa6dbf6f0..e243c5ff0 100644
--- a/scripts/goodmorning.ts
+++ b/scripts/goodmorning.ts
@@ -181,7 +185,7 @@ sso_registration_scopes = sso:account:access
   }
 }
 
-async function goodmorning(forceSSO = false) {
+async function goodmorning(forceSSO = false, profile = AWS_PROFILE) {
   // Get random fun fact from API
   try {
     const factResponse = await fetch(
@@ -198,28 +202,28 @@ async function goodmorning(forceSSO = false) {
   await writeAwsConfig();
 
   // Sign in to AWS SSO
-  const ssoSuccess = await awsSSOSignIn(AWS_PROFILE, forceSSO);
+  const ssoSuccess = await awsSSOSignIn(profile, forceSSO);
   if (!ssoSuccess) {
     console.log(`${colors.red}❌ Failed to sign in to AWS SSO${colors.reset}`);
     return;
   }
 
-  if (AWS_PROFILE !== 'production') {
-    await writeSecretsToFile('dev/infilla-app/env-development', '.env.development');
-    await writeSecretsToFile('dev/infilla-app/env-testing', '.env.testing');
+  if (profile !== 'production') {
+    await writeSecretsToFile('dev/infilla-app/env-development', '.env.development', profile);
+    await writeSecretsToFile('dev/infilla-app/env-testing', '.env.testing', profile);
 
-    if (AWS_PROFILE === 'staging') {
-      await writeSecretsToFile('dev/infilla-app/env-staging', '.env.staging');
+    if (profile === 'staging') {
+      await writeSecretsToFile('dev/infilla-app/env-staging', '.env.staging', profile);
     }
   } else {
-    await writeSecretsToFile('prod/infilla-app/env-production', '.env.production');
+    await writeSecretsToFile('prod/infilla-app/env-production', '.env.production', profile);
   }
 
   console.log(`${colors.green}✅ Setup complete!${colors.reset}`);
 }
```

The main `goodmorning` function now accepts a `profile` parameter with a default value of `AWS_PROFILE`. All references to the global `AWS_PROFILE` within the function have been replaced with the `profile` parameter, and the profile is now passed to all `writeSecretsToFile` calls.

### Command-Line Argument Parser

```diff
diff --git a/scripts/goodmorning.ts b/scripts/goodmorning.ts
index fa6dbf6f0..e243c5ff0 100644
--- a/scripts/goodmorning.ts
+++ b/scripts/goodmorning.ts
@@ -220,18 +224,73 @@ async function goodmorning(forceSSO = false) {
   console.log(`${colors.green}✅ Setup complete!${colors.reset}`);
 }
 
+// Parse command line arguments
+function parseArgs(args: string[]): {
+  profile: string | undefined;
+  help: boolean;
+  forceSSO: boolean;
+} {
+  const result = { profile: undefined as string | undefined, help: false, forceSSO: false };
+
+  for (let i = 0; i < args.length; i++) {
+    const arg = args[i];
+
+    if (arg === '--profile' || arg === '-p') {
+      if (i + 1 < args.length) {
+        result.profile = args[i + 1];
+        i++; // Skip next argument as it's the profile value
+      } else {
+        console.log(`${colors.red}Error: --profile requires a value${colors.reset}`);
+        process.exit(1);
+      }
+    } else if (arg === '--help' || arg === '-h') {
+      result.help = true;
+    } else if (arg === '--sso') {
+      result.forceSSO = true;
+    } else if (arg.startsWith('--profile=')) {
+      result.profile = arg.split('=')[1];
+    }
+  }
+
+  return result;
+}
+
+// Show help message
+function showHelp() {
+  console.log(`${colors.cyan}
+Usage: npm run goodmorning [options]
+
+Options:
+  -h, --help              Show this help message
+  -p, --profile <name>    AWS profile to use (default: local-dev)
+  --sso                   Force AWS SSO login
+${colors.reset}`);
+}
+
 (async function () {
   const args = process.argv.slice(2);
-  const forceSSO = args.includes('--sso');
-  await goodmorning(forceSSO);
+  const parsed = parseArgs(args);
+
+  if (parsed.help) {
+    showHelp();
+    return;
+  }
+
+  // Override AWS_PROFILE if --profile is provided
+  const finalProfile = parsed.profile || AWS_PROFILE;
+  process.env.AWS_PROFILE = finalProfile;
+
+  await goodmorning(parsed.forceSSO, finalProfile);
 })();
```

Two new functions have been added to handle command-line argument parsing:

- **`parseArgs()`**: Parses command-line arguments and returns an object containing `profile`, `help`, and `forceSSO` flags. It supports multiple argument formats:
  - `--profile staging` (space-separated)
  - `--profile=staging` (equals sign)
  - `-p staging` (short form)
  - `--help` / `-h` (help flag)
  - `--sso` (force SSO flag)

- **`showHelp()`**: Displays a formatted help message showing available options and usage.

The IIFE (Immediately Invoked Function Expression) at the bottom has been updated to use the new argument parser, allowing users to specify which AWS profile to use when running the setup script.