import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { MarkdownViewer } from "../components/MarkdownViewer";

export const Route = createFileRoute("/blog")({ component: BlogPage });

function BlogPage() {
	const { data } = useSuspenseQuery({
		queryKey: ["blog"],
		queryFn: async () => {
			const response = await fetch("/api/blog");
			return response.json() as Promise<{ content: string }>;
		},
	});

	return <MarkdownViewer content={data.content} />;
}
