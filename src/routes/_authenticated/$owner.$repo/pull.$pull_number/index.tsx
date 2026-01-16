import { Await, createFileRoute } from "@tanstack/react-router";
import { MarkdownViewer } from "@/components/MarkdownViewer";
import { getFileContent } from "@/serverActions/getFileContents";
import { generateSummary } from "@/serverActions/generateSummary";
import DiffViewer from "@/components/DiffViewer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createServerFn } from "@tanstack/react-start";
import { prisma } from "@/db";
import { ErrorComponent } from "@/components/Error";
import { nextTick } from "process";
import { getPrQueryOptions } from "@/queries/prQueryOptions";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";

export const getPrRow = createServerFn()
	.inputValidator(
		(data: { owner: string; repo: string; pull_number: number }) => data,
	)
	.handler(async ({ data: { owner, repo, pull_number } }) => {
		const row = await prisma.pullRequest.findFirst({
			where: {
				owner,
				repo,
				number: pull_number,
			},
		});

		return row;
	});

export const Route = createFileRoute(
	"/_authenticated/$owner/$repo/pull/$pull_number/",
)({
	component: BlogPage,
	loader: async ({ params: { owner, repo, pull_number }, context }) => {
		context.queryClient.prefetchQuery(
			getPrQueryOptions(owner, repo, +pull_number),
		);
	},
	errorComponent: ErrorComponent,
});

function BlogPage() {
	// const data = Route.useLoaderData();
	const { owner, repo, pull_number } = Route.useParams();
	const { data, isLoading } = useQuery({
		...getPrQueryOptions(owner, repo, +pull_number),
		refetchInterval: (query) =>
			query.state.data?.status === "generating" ? 2000 : false,
	});

	return (
		<>
			{isLoading && <div>Loading...</div>}
			{data?.status === "generating" && <div>Generating summary...</div>}
			{data?.status === "ready" && (
				<Tabs defaultValue="summary">
					<TabsList className="mx-auto w-full">
						<TabsTrigger value="summary">Summary</TabsTrigger>
						<TabsTrigger value="diff">Diff</TabsTrigger>
					</TabsList>
					<TabsContent value="summary">
						<MarkdownViewer content={data.summary} />
					</TabsContent>
					<TabsContent value="diff">
						<DiffViewer diff={data.diff} />
					</TabsContent>
				</Tabs>
			)}
		</>
	);
}
