import { createFileRoute } from "@tanstack/react-router";
import DiffViewer from "@/components/DiffViewer";

export const Route = createFileRoute("/_authenticated/pr/$prNumber/diff")({
	component: BlogPage,
	loader: async ({ params }) => {
		const response = await fetch(`/data/${params.prNumber}.diff`);
		const content = await response.text();
		return content;
	},
	validateSearch: (search: Record<string, unknown>) => ({
		file: typeof search.file === "string" ? search.file : undefined,
	}),
});

function BlogPage() {
	const data = Route.useLoaderData();
	const { file } = Route.useSearch();

	return <DiffViewer diff={data} scrollToFile={file} />;
}
