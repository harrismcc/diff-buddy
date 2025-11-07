import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createFileRoute } from "@tanstack/react-router";
import DiffViewer from "../../components/DiffViewer";

export const Route = createFileRoute("/pr/$prNumber/diff")({
	component: BlogPage,
	loader: async ({ params }) => {
		// Read the markdown file from the project root
		const filePath = join(process.cwd(), `data/${params.prNumber}.diff`);
		const content = await readFile(filePath, "utf-8");
		return content;
	},
});

function BlogPage() {
	const data = Route.useLoaderData();

	return <DiffViewer diff={data} />;
}
