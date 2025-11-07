import { authClient } from "@/lib/auth-client";
import { createFileRoute } from "@tanstack/react-router";
import {
	Authenticated,
	Unauthenticated,
	AuthLoading,
	useQuery,
} from "convex/react";

export const Route = createFileRoute("/auth/test")({
	loader: async () => {
		const { data: session, error } = await authClient.getSession();
		console.log("session", session);
		return { session };
	},
	component: RouteComponent,
});

function RouteComponent() {
	const data = Route.useLoaderData();
	return (
		<div>
			{data ? JSON.stringify(data.session) : "None"}
			<Unauthenticated>Logged out</Unauthenticated>
			<Authenticated>Logged in</Authenticated>
			<AuthLoading>Loading...</AuthLoading>
		</div>
	);
}
