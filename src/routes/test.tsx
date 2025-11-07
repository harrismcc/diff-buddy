import { convexAction, convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { api } from "convex/_generated/api";

export const Route = createFileRoute("/test")({
	component: RouteComponent,
	loader: async (opts) => {
		await opts.context.queryClient.ensureQueryData(
			convexAction(api.pr.getPr, {
				owner: "Infilla",
				repo: "infilla-app",
				pull_number: 1635,
			}),
		);
	},
});

function RouteComponent() {
	const { data } = useSuspenseQuery(
		convexAction(api.pr.getPr, {
			owner: "Infilla",
			repo: "infilla-app",
			pull_number: 1635,
		}),
	);
	return (
		<div>
			<h1>Todos:</h1>
			{data ? JSON.stringify(data) : "None"}
		</div>
	);
}
