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
	const data = Route.useLoaderData();
	return <MarkdownViewer content={data} />;
}
