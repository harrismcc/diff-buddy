import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createServerFn } from "@tanstack/react-start";

export const getFileContent = createServerFn()
	.inputValidator((data: { path: string }) => data)
	.handler(async ({ data }) => {
		const filePath = join(process.cwd(), data.path);

		const content = await readFile(filePath, "utf-8");
		return content;
	});
