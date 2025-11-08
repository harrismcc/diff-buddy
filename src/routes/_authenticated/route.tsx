import { $getUser } from "@/lib/auth/functions";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated")({
	beforeLoad: async ({ context }) => {
		const user = $getUser();
		if (!user) {
			throw redirect({ to: "/auth/login" });
		}

		// re-return to update type as non-null for child routes
		return { user };
	},
});
