import { createServerFn } from "@tanstack/react-start";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { request } from "@octokit/request";
import { generateText } from "ai";
import { prisma } from "@/db";
import { $getGithubToken } from "./getGithubToken";

export const getPrompt = (diff: string) => {
	return `Turn the following PR into a "blog post" using markdown. Group related sections of the diff using section headings, display them in codeblocks, and give short explanations of what's going on. You do not need to limit yourself to only 1 diff/codeblock per heading — you can include multiple codeblocks per section as needed. Focus on the changes that matter most for understanding behavior; you may omit noisy or low-value changes.

Include a summary of the PR at the top.
Avoid emojis.

For each displayed diff, it needs to be in proper diff format, including all headers and syntax. Make sure each codeblock is an individual syntactically valid diff that can be parsed. Each diff codeblock should only include changes from a single file.

**Grouping and Structure:**
- Group related changes thematically (e.g., by feature, concern, or behavior change) rather than by file.
- Only create section headings for substantial changes or groups of 3+ related modifications.
- Small, isolated changes should be grouped in a "Miscellaneous changes" section at the end.
- Avoid one-section-per-file summaries. Prefer cross-file grouping when changes relate to the same feature or behavior.
- Do not output entire files. Use focused hunks that illustrate the key changes.
- Every section must include a short narrative before each diff codeblock (1-2 sentences), not just before the section overall.
- Do not place diff codeblocks back-to-back without commentary between them.

**Explanations:**
- For each section, provide 1-2 sentences explaining the motivation or context before showing the diffs.
- Focus explanations on *why* and *what behavior changed*, not just the syntax.

**Reviewer Focus:**
- Always include at least one diff hunk that shows the core implementation for each newly added or substantially modified feature (e.g., component logic, state/props usage, event handling, data flow, or rendering).
- Avoid showing only type/prop/interface changes without any corresponding behavioral or rendering code.
- If a new file is added, include a representative hunk from its implementation unless the file is trivial.
- Prefer multiple small hunks over a single large one; keep each hunk tight and only include necessary context.

**Special Cases:**
- If there are any breaking changes or API modifications, highlight these clearly.

Example:
\`\`\`diff
diff --git a/app/components/ui/richTextSuggestionOptions.ts b/app/components/ui/richTextSuggestionOptions.ts
index 0fd06dd2d..4f60cf74b 100644
--- a/app/components/ui/richTextSuggestionOptions.ts
+++ b/app/components/ui/richTextSuggestionOptions.ts
@@ -33,45 +33,222 @@ const DOM_RECT_FALLBACK: DOMRect = {
   },
 };
 
+/**
+ * Event types for coordinating between the items fetcher and render lifecycle
+ */
+type SuggestionEvent =
+  | { type: 'LOADING_STARTED'; query: string }
+  | { type: 'LOADING_COMPLETED' }
+  | { type: 'FETCH_ABORTED' };
\`\`\`

Diff:
${diff}`;
};

export const generateSummary = createServerFn()
	.inputValidator(
		(data: {
			owner: string;
			repo: string;
			pull_number: number;
			wait?: boolean;
		}) => data,
	)
	.handler(async ({ data: { owner, repo, pull_number, wait } }) => {
		const shouldWait = wait ?? true;
		const generationStartedAt = new Date();
		const prKey = {
			owner_repo_number: {
				owner,
				repo,
				number: +pull_number,
			},
		};

		const githubToken = await $getGithubToken();
		const prResponse = await request(
			"GET /repos/{owner}/{repo}/pulls/{pull_number}",
			{
				owner,
				repo,
				pull_number: +pull_number,
				headers: {
					authorization: `Bearer ${githubToken}`,
					"X-GitHub-Api-Version": "2022-11-28",
				},
			},
		);

		const headSha = prResponse.data.head?.sha;

		if (!headSha) {
			throw new Error("Missing head SHA for pull request.");
		}

		const existing = await prisma.pullRequest.findUnique({
			where: prKey,
		});

		if (existing?.summary && existing?.diff && existing.headSha === headSha) {
			return {
				status: "ready",
				summary: existing.summary,
				diff: existing.diff,
			};
		}

		if (existing && existing.headSha !== headSha) {
			await prisma.pullRequest.update({
				where: prKey,
				data: {
					diff: null,
					summary: null,
					summaryStatus: "idle",
					summaryStage: null,
					summaryStartedAt: null,
					headSha,
				},
			});
		}

		const runGeneration = async () => {
			try {
				const result = await request(
					"GET /repos/{owner}/{repo}/pulls/{pull_number}",
					{
						owner,
						repo,
						pull_number: +pull_number,
						headers: {
							authorization: `Bearer ${githubToken}`,
							"X-GitHub-Api-Version": "2022-11-28",
							Accept: "application/vnd.github.v3.diff",
						},
					},
				);

				const diff = result.data;

				const cleanedDiff = (diff as any as string).replaceAll(
					"```",
					"<diff-buddy-code-block>",
				);

				const openRouterApiKey = process.env.OPENROUTER_API_KEY;
				if (!openRouterApiKey) {
					throw new Error("Missing OPENROUTER_API_KEY. Set it in .env.local.");
				}

				const openrouter = createOpenRouter({
					apiKey: openRouterApiKey,
				});

				await prisma.pullRequest.update({
					where: prKey,
					data: {
						summaryStage: "prompting_model",
					},
				});

				const { text } = await generateText({
					model: openrouter("openai/gpt-5.2-codex"),
					prompt: getPrompt(cleanedDiff as any as string),
				});

				// Replace ``` with quad, and then go back and replace the old back to ```
				const cleanedText = text
					.replaceAll("```", "````")
					.replaceAll("<diff-buddy-code-block>", "```");

				await prisma.pullRequest.update({
					where: prKey,
					data: {
						summaryStage: "saving_result",
					},
				});

				await prisma.pullRequest.update({
					where: prKey,
					data: {
						diff: diff as any as string,
						summary: cleanedText,
						summaryStatus: "ready",
						summaryStage: null,
						summaryStartedAt: null,
						headSha,
					},
				});

				return { status: "ready", summary: cleanedText, diff: diff as any };
			} catch (error) {
				await prisma.pullRequest.update({
					where: prKey,
					data: {
						summaryStatus: "error",
						summaryStage: null,
						summaryStartedAt: null,
					},
				});

				throw error;
			}
		};

		const lockResult = await prisma.pullRequest.updateMany({
			where: {
				owner,
				repo,
				number: +pull_number,
				summary: null,
				summaryStatus: {
					not: "generating",
				},
			},
			data: {
				summaryStatus: "generating",
				summaryStage: "fetching_diff",
				summaryStartedAt: generationStartedAt,
				headSha,
			},
		});

		if (lockResult.count === 0) {
			try {
				await prisma.pullRequest.create({
					data: {
						owner,
						repo,
						number: +pull_number,
						summaryStatus: "generating",
						summaryStage: "fetching_diff",
						summaryStartedAt: generationStartedAt,
						headSha,
					},
				});
			} catch {
				const inProgress = await prisma.pullRequest.findUnique({
					where: prKey,
				});

				if (
					inProgress?.summary &&
					inProgress?.diff &&
					inProgress.headSha === headSha
				) {
					return {
						status: "ready",
						summary: inProgress.summary,
						diff: inProgress.diff,
					};
				}

				if (inProgress && inProgress.headSha !== headSha) {
					await prisma.pullRequest.update({
						where: prKey,
						data: {
							diff: null,
							summary: null,
							summaryStatus: "idle",
							summaryStage: null,
							summaryStartedAt: null,
							headSha,
						},
					});

					const retryLock = await prisma.pullRequest.updateMany({
						where: {
							owner,
							repo,
							number: +pull_number,
							summary: null,
							summaryStatus: {
								not: "generating",
							},
						},
						data: {
							summaryStatus: "generating",
							summaryStage: "fetching_diff",
							summaryStartedAt: generationStartedAt,
							headSha,
						},
					});

					if (retryLock.count > 0) {
						return shouldWait
							? runGeneration()
							: {
									status: "generating",
									stage: "fetching_diff",
									startedAt: generationStartedAt.toISOString(),
								};
					}
				}

				return {
					status: "generating",
					stage: inProgress?.summaryStage ?? "fetching_diff",
					startedAt: inProgress?.summaryStartedAt?.toISOString(),
				};
			}
		}

		if (!shouldWait) {
			void runGeneration();
			return {
				status: "generating",
				stage: "fetching_diff",
				startedAt: generationStartedAt.toISOString(),
			};
		}

		return runGeneration();
	});
