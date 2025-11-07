import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createFileRoute } from "@tanstack/react-router";
import { MarkdownViewer } from "@/components/MarkdownViewer";

export const Route = createFileRoute("/pr/$prNumber/")({
	component: BlogPage,
	loader: async ({ params }) => {
		// Read the markdown file from the project root
		const filePath = join(process.cwd(), `data/${params.prNumber}.md`);
		const content = await readFile(filePath, "utf-8");
		return content;
	},
});

function BlogPage() {
	const data = Route.useLoaderData();

	return <MarkdownViewer content={data} />;
}
