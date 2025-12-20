import { createFileRoute, redirect } from "@tanstack/react-router";
import { $getUser } from "@/lib/auth/functions";

export const Route = createFileRoute("/_authenticated")({
	beforeLoad: async () => {
		const user = $getUser();
		if (!user) {
			throw redirect({ to: "/auth/login" });
		}

		// re-return to update type as non-null for child routes
		return { user };
	},
});
