import { createFileRoute } from "@tanstack/react-router";
import { MarkdownViewer } from "../components/MarkdownViewer";

export const Route = createFileRoute("/blog")({
	component: BlogPage,
	loader: async () => {
		const response = await fetch("/data/1625.md");
		const content = await response.text();
		return content;
	},
});

function BlogPage() {
	const data = Route.useLoaderData();

	return (
		<div className="container mx-auto px-4 py-8">
			<MarkdownViewer content={data} />
		</div>
	);
}
