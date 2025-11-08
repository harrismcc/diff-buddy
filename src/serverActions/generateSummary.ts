import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createServerFn } from "@tanstack/react-start";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { request } from "@octokit/request";
import { generateText } from "ai";

export const getPrompt = (diff: string) => {
	return `Turn the following PR into a "blog post" using markdown. Group related sections of the diff using section headings, display them in codeblocks, and give short explanations of what's going on. You do not need to limit yourself to only 1 diff/codeblock per heading — you should group multiple changes across files if they make sense together. Be absolutely sure that you include all of the changes from the diff, across all of the files!

Include a summary of the PR at the top.

For each displayed diff, it needs to be in proper diff format, including all headers and syntax. Make sure each codeblock is an individual syntactically valid diff that can be parsed.

**Grouping and Structure:**
- Group related changes thematically (e.g., by feature, concern, or behavior change) rather than by file.
- Only create section headings for substantial changes or groups of 3+ related modifications.
- Small, isolated changes should be grouped in a "Miscellaneous changes" section at the end.

**Explanations:**
- For each section, provide 1-2 sentences explaining the motivation or context before showing the diffs.
- Focus explanations on *why* and *what behavior changed*, not just the syntax.

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
		(data: { owner: string; repo: string; pull_number: string }) => data,
	)
	.handler(async ({ data: { owner, repo, pull_number } }) => {
		const result = await request(
			"GET /repos/{owner}/{repo}/pulls/{pull_number}",
			{
				owner,
				repo,
				pull_number: +pull_number,
				headers: {
					authorization: `Bearer ***REMOVED_GITHUB_TOKEN***`,
					"X-GitHub-Api-Version": "2022-11-28",
					Accept: "application/vnd.github.v3.diff",
				},
			},
		);

		const diff = result.data;

		console.log(diff);
		// Write the diff file to data
		const diffFilePath = join(
			process.cwd(),
			`data/${owner}-${repo}-${pull_number}.diff`,
		);
		await writeFile(diffFilePath, diff as any);

		const cleanedDiff = (diff as any as string).replaceAll(
			"```",
			"<diff-buddy-code-block>",
		);

		const openrouter = createOpenRouter({
			apiKey: process.env.OPENROUTER_API_KEY ?? "",
		});

		const { text } = await generateText({
			model: openrouter("google/gemini-2.5-flash"),
			prompt: getPrompt(cleanedDiff as any as string),
		});

		// Replace ``` with quad, and then go back and replace the old back to ```
		const cleanedText = text
			.replaceAll("```", "````")
			.replaceAll("<diff-buddy-code-block>", "```");

		// Write the markdown file to data
		const filePath = join(
			process.cwd(),
			`data/${owner}-${repo}-${pull_number}.md`,
		);
		await writeFile(filePath, cleanedText);

		return { summary: cleanedText, diff: diff as any };
	});
