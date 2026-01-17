import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import DiffViewer from "@/components/DiffViewer";
import {
	getPrQueryOptions,
	type PrQueryResult,
	type SummaryStage,
} from "@/queries/prQueryOptions";

export const Route = createFileRoute(
	"/_authenticated/$owner/$repo/pull/$pull_number/diff",
)({
	component: DiffPage,
	loader: async ({ params: { owner, repo, pull_number }, context }) => {
		context.queryClient.prefetchQuery(
			getPrQueryOptions(owner, repo, +pull_number),
		);
	},
	validateSearch: (search: Record<string, unknown>) => ({
		file: typeof search.file === "string" ? search.file : undefined,
	}),
});

function DiffPage() {
	const { owner, repo, pull_number } = Route.useParams();
	const { file } = Route.useSearch();
	const { data, isLoading } = useQuery<PrQueryResult>({
		...getPrQueryOptions(owner, repo, +pull_number),
		refetchInterval: (query) =>
			query.state.data?.status === "generating" ? 2000 : false,
	});
	const [isClient, setIsClient] = useState(false);

	useEffect(() => {
		setIsClient(true);
	}, []);

	const stageLabels: Record<SummaryStage, string> = {
		fetching_diff: "Fetching diff",
		prompting_model: "Generating summary",
		saving_result: "Saving result",
	};

	const elapsedSeconds = isClient && data?.startedAt
		? Math.max(
				0,
				Math.floor((Date.now() - new Date(data.startedAt).getTime()) / 1000),
			)
		: null;

	return (
		<>
			{isLoading && <div>Loading...</div>}
			{data?.status === "generating" && (
				<div>
					{stageLabels[(data.stage ?? "fetching_diff") as SummaryStage] ??
						"Generating summary..."}
					{elapsedSeconds !== null && ` (${elapsedSeconds}s)`}
				</div>
			)}
			{data?.status === "error" && (
				<div>Summary generation failed. Please try again.</div>
			)}
			{data?.status === "ready" && (
				<DiffViewer diff={data.diff} scrollToFile={file} />
			)}
		</>
	);
}
