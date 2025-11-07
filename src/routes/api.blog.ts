import { createFileRoute } from "@tanstack/react-router";
import { json } from "@tanstack/react-start";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const Route = createFileRoute("/api/blog")({
	server: {
		handlers: {
			GET: async () => {
				// Read the markdown file from the project root
				const filePath = join(process.cwd(), "rich_text_loading_states_blog.md");
				const content = await readFile(filePath, "utf-8");
				return json({ content });
			},
		},
	},
});
