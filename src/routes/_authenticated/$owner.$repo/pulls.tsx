import { createFileRoute } from "@tanstack/react-router";
import { request } from "@octokit/request";
import { PRListItem } from "@/components/PRListItem";
import { $getGithubToken } from "@/serverActions/getGithubToken";

export const Route = createFileRoute("/_authenticated/$owner/$repo/pulls")({
	loader: async ({ params: { owner, repo } }) => {
		const githubToken = await $getGithubToken();
		const result = await request("GET /repos/{owner}/{repo}/pulls", {
			owner,
			repo,
			headers: {
				authorization: `Bearer ${githubToken}`,
				"X-GitHub-Api-Version": "2022-11-28",
			},
		});

		return result.data;
	},
	component: RouteComponent,
});

function RouteComponent() {
	const data = Route.useLoaderData();
	const params = Route.useParams();

	return (
		<div className="max-w-4xl mx-auto px-4 py-8">
			<h1 className="text-2xl font-bold mb-6">Pull Requests</h1>
			<div className="flex flex-col gap-3">
				{data.length === 0 ? (
					<div className="text-center py-8 text-muted-foreground">
						No pull requests found
					</div>
				) : (
					data.map((pr) => (
						<PRListItem
							key={pr.id}
							pr={pr}
							owner={params.owner}
							repo={params.repo}
						/>
					))
				)}
			</div>
		</div>
	);
}
