import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createServerFn } from "@tanstack/react-start";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

export const getFileContent = createServerFn()
	.inputValidator((data: { path: string }) => data)
	.handler(async ({ data }) => {
		const openrouter = createOpenRouter({
			apiKey: process.env.OPENROUTER_API_KEY ?? "",
		});
	});
