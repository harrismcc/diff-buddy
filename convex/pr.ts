import { action, mutation } from "./_generated/server";
import { v } from "convex/values";
import { request } from "@octokit/request";

export const getPr = action({
	args: { owner: v.string(), repo: v.string(), pull_number: v.number() },
	handler: async (ctx, { owner, repo, pull_number }) => {
		const result = await request(
			"GET /repos/{owner}/{repo}/pulls/{pull_number}",
			{
				owner,
				repo,
				pull_number,
				headers: {
					authorization: `Bearer ***REMOVED_GITHUB_TOKEN***`,
					"X-GitHub-Api-Version": "2022-11-28",
				},
			},
		);

		return result;
	},
});

export const generatePrReview = action({
	args: { owner: v.string(), repo: v.string(), pull_number: v.number() },
	handler: async (ctx, { owner, repo, pull_number }) => {
		const result = await request("GET /repos/{owner}/{repo}/commits", {
			owner: "repoOwner",
			repo: "repoTitle",
			headers: { Accept: "application/vnd.github.diff" },
		});

		return result;
	},
});
