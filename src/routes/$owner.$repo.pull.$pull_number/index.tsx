import { createFileRoute } from "@tanstack/react-router";
import { MarkdownViewer } from "@/components/MarkdownViewer";
import { getFileContent } from "@/serverActions/getFileContents";
import { request } from "@octokit/request";
import { generateSummary } from "@/serverActions/generateSummary";
import DiffViewer from "@/components/DiffViewer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/$owner/$repo/pull/$pull_number/")({
	component: BlogPage,
	loader: async ({ params: { owner, repo, pull_number } }) => {
		try {
			const summaryText = await getFileContent({
				data: { path: `data/${owner}-${repo}-${pull_number}.md` },
			});
			const diffText = await getFileContent({
				data: { path: `data/${owner}-${repo}-${pull_number}.diff` },
			});
			return { summary: summaryText, diff: diffText };
		} catch (error) {
			const result = await generateSummary({
				data: { owner, repo, pull_number },
			});

			return result;
		}
	},
});

function BlogPage() {
	const data = Route.useLoaderData();
	return (
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
	);
}
