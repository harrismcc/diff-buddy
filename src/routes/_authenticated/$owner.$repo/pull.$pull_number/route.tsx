import {
	Link,
	Outlet,
	createFileRoute,
	useMatchRoute,
} from "@tanstack/react-router";
import { request } from "@octokit/request";
import { PRHeader } from "@/components/PRHeader";
import { $getGithubToken } from "@/serverActions/getGithubToken";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute(
	"/_authenticated/$owner/$repo/pull/$pull_number",
)({
	loader: async ({ params: { owner, repo, pull_number } }) => {
		const githubToken = await $getGithubToken();
		const result = await request(
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

		return result.data;
	},
	component: RouteComponent,
});

function RouteComponent() {
	const data = Route.useLoaderData();
	const { owner, repo, pull_number } = Route.useParams();
	const matchRoute = useMatchRoute();

	const isDiffActive = matchRoute({
		to: "/$owner/$repo/pull/$pull_number/diff",
		params: { owner, repo, pull_number },
	});
	const activeTab = isDiffActive ? "diff" : "summary";

	return (
		<div>
			<PRHeader pr={data} />
			<div className="p-6">
				<Tabs value={activeTab} className="mb-6">
					<TabsList>
						<Link
							to="/$owner/$repo/pull/$pull_number"
							params={{ owner, repo, pull_number }}
						>
							<TabsTrigger value="summary">Summary</TabsTrigger>
						</Link>
						<Link
							to="/$owner/$repo/pull/$pull_number/diff"
							params={{ owner, repo, pull_number }}
						>
							<TabsTrigger value="diff">Diff</TabsTrigger>
						</Link>
					</TabsList>
				</Tabs>
				<Outlet />
			</div>
		</div>
	);
}
