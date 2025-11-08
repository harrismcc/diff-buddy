import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/test")({
	component: RouteComponent,
});

function RouteComponent() {
	return <div>You should only be able to see this if you're authed</div>;
}
