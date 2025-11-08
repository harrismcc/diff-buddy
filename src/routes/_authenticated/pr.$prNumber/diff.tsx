import { createFileRoute } from "@tanstack/react-router";
import DiffViewer from "../../components/DiffViewer";

export const Route = createFileRoute("/_authenticated/pr/$prNumber/diff")({
	component: BlogPage,
	loader: async ({ params }) => {
		const response = await fetch(`/data/${params.prNumber}.diff`);
		const content = await response.text();
		return content;
	},
});

function BlogPage() {
	const data = Route.useLoaderData();

	return <DiffViewer diff={data} />;
}
