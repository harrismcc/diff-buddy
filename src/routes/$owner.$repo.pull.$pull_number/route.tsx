import { createFileRoute, Outlet } from "@tanstack/react-router";
import { request } from "@octokit/request";
import { PRHeader } from "@/components/PRHeader";

export const Route = createFileRoute("/$owner/$repo/pull/$pull_number")({
	loader: async ({ params: { owner, repo, pull_number } }) => {
		const result = await request(
			"GET /repos/{owner}/{repo}/pulls/{pull_number}",
			{
				owner,
				repo,
				pull_number: +pull_number,
				headers: {
					authorization: `Bearer ***REMOVED_GITHUB_TOKEN***`,
					"X-GitHub-Api-Version": "2022-11-28",
				},
			},
		);

		return result.data;
	},
	component: RouteComponent,
});

function RouteComponent() {
	const data = Route.useLoaderData();
	return (
		<div>
			<PRHeader pr={data} />
			<div className="p-6">
				<Outlet />
			</div>
		</div>
	);
}
