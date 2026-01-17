import { createFileRoute } from "@tanstack/react-router";
import { MarkdownViewer } from "@/components/MarkdownViewer";
import { getFileContent } from "@/serverActions/getFileContents";

export const Route = createFileRoute("/_authenticated/pr/$prNumber/")({
	component: BlogPage,
	loader: async ({ params }) => {
		return getFileContent({ data: { path: `data/${params.prNumber}.md` } });
	},
});

function BlogPage() {
	const { prNumber } = Route.useParams();
	const data = Route.useLoaderData();
	const getFullDiffUrl = (filePath: string) =>
		`/pr/${prNumber}/diff?file=${encodeURIComponent(filePath)}`;

	return <MarkdownViewer content={data} getFullDiffUrl={getFullDiffUrl} />;
}
