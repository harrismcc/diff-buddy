import { prisma } from "@/db";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { reactStartCookies } from "better-auth/react-start";

const siteUrl = process.env.SITE_URL!;

export const auth = betterAuth({
	baseURL: siteUrl,
	database: prismaAdapter(prisma, {
		provider: "postgresql",
	}),
	socialProviders: {
		github: {
			clientId: process.env.GITHUB_CLIENT_ID!,
			clientSecret: process.env.GITHUB_CLIENT_SECRET!,
		},
	},
	plugins: [reactStartCookies()],
});
