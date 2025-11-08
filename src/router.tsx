import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { routerWithQueryClient } from "@tanstack/react-router-with-query";
import { QueryClient } from "@tanstack/react-query";

export function getRouter() {
	const queryClient: QueryClient = new QueryClient();

	const router = routerWithQueryClient(
		createRouter({
			routeTree,
			defaultPreload: "intent",
			scrollRestoration: true,
			context: { queryClient },
		}),
		queryClient,
	);

	return router;
}
