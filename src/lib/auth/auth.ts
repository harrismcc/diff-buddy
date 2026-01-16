import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { reactStartCookies } from "better-auth/react-start";
import { prisma } from "@/db";

const siteUrl = process.env.SITE_URL!;

export const auth = betterAuth({
	baseURL: siteUrl,
	trustedOrigins: ["http://localhost:3000", "http://localhost:3123"],
	database: prismaAdapter(prisma, {
		provider: "sqlite",
	}),
	socialProviders: {
		github: {
			clientId: process.env.GITHUB_CLIENT_ID!,
			clientSecret: process.env.GITHUB_CLIENT_SECRET!,
			disableDefaultScope: true,
			scope: ["repo", "read:user", "user:email"],
		},
	},
	plugins: [reactStartCookies()],
});
