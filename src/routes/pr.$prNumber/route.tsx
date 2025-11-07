import {
	createFileRoute,
	Link,
	Outlet,
	useMatchRoute,
} from "@tanstack/react-router";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/pr/$prNumber")({
	component: RouteComponent,
});

function RouteComponent() {
	const { prNumber } = Route.useParams();
	const matchRoute = useMatchRoute();

	// Determine which tab is active based on the current route
	const isDiffActive = matchRoute({ to: "/pr/$prNumber/diff" });
	const activeTab = isDiffActive ? "diff" : "conversation";

	return (
		<div>
			<div className="container mx-auto px-4 py-8">
				<Tabs value={activeTab} className="mb-6">
					<TabsList>
						<Link to="/pr/$prNumber" params={{ prNumber }}>
							<TabsTrigger value="conversation">Blog View</TabsTrigger>
						</Link>
						<Link to="/pr/$prNumber/diff" params={{ prNumber }}>
							<TabsTrigger value="diff">Diff</TabsTrigger>
						</Link>
					</TabsList>
				</Tabs>
				<Outlet />
			</div>
		</div>
	);
}
