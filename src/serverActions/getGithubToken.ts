import { createServerFn } from "@tanstack/react-start";
import { $getUser } from "@/lib/auth/functions";
import { prisma } from "@/db";

export const $getGithubToken = createServerFn().handler(async () => {
	const user = await $getUser();

	if (!user) {
		throw new Error("User not found");
	}

	const account = await prisma.account.findFirst({
		where: {
			userId: user.id,
			providerId: "github",
		},
	});

	if (!account) {
		throw new Error("No GitHub account found");
	}

	if (!account.accessToken) {
		throw new Error("No GitHub OAuth access token found");
	}

	return account.accessToken;
});
