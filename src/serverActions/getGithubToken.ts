import { createServerFn } from "@tanstack/react-start";
import { $getUser } from "@/lib/auth/functions";
import { prisma } from "@/db";

export const $getGithubToken = createServerFn().handler(async () => {
	const user = await $getUser();

	if (!user) {
		throw new Error("User not found");
	}

	const userRow = await prisma.user.findFirst({
		where: {
			id: user.id,
		},
	});

	if (!userRow) {
		throw new Error("User row not found");
	}

	if (!userRow.githubPersonalAccessToken) {
		throw new Error("No Github Personal Access Token found");
	}

	return userRow.githubPersonalAccessToken;
});
