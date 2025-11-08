import { authClient } from "@/lib/auth/auth-client";
import { $getUser } from "@/lib/auth/functions";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/auth/test")({
	beforeLoad: async ({ context }) => {
		const user = $getUser();
		if (!user) {
			throw redirect({ to: "/auth/login" });
		}

		// re-return to update type as non-null for child routes
		return { user };
	},
	component: RouteComponent,
});

function RouteComponent() {
	const {
		data: session,
		isPending, //loading state
		error, //error object
		refetch, //refetch the session
	} = authClient.useSession();

	return <div>{session ? JSON.stringify(session.session) : "None"}</div>;
}
