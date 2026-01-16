import { createFileRoute, Link } from "@tanstack/react-router";
import { Github, ExternalLink, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/auth/github-app")({
	loader: async () => {
		const installUrl =
			process.env.GITHUB_APP_INSTALL_URL ??
			(process.env.GITHUB_APP_SLUG
				? `https://github.com/apps/${process.env.GITHUB_APP_SLUG}/installations/new`
				: null);

		return {
			installUrl,
		};
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { installUrl } = Route.useLoaderData();

	return (
		<div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
			<div className="w-full max-w-2xl space-y-8">
				<div className="space-y-3">
					<div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground">
						<Github className="size-4" />
						GitHub App Installation
					</div>
					<h1 className="text-3xl md:text-4xl font-bold tracking-tight">
						Install Diff Buddy on your org
					</h1>
					<p className="text-base md:text-lg text-muted-foreground">
						The GitHub App must be installed on the organization or user that
						owns the private repository you want to review.
					</p>
				</div>

				<div className="rounded-lg border bg-card p-6 md:p-8 space-y-5">
					<div className="flex items-start gap-3">
						<ShieldCheck className="size-5 text-muted-foreground mt-0.5" />
						<div className="space-y-1">
							<p className="text-sm font-medium">Permissions requested</p>
							<p className="text-sm text-muted-foreground">
								Read-only access to Contents and Pull Requests.
							</p>
						</div>
					</div>

					{installUrl ? (
						<Button asChild size="lg" className="w-full">
							<a href={installUrl} target="_blank" rel="noreferrer">
								Install GitHub App
								<ExternalLink className="size-4" />
							</a>
						</Button>
					) : (
						<div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
							Set{" "}
							<code className="rounded bg-muted px-1 py-0.5">
								GITHUB_APP_INSTALL_URL
							</code>{" "}
							or{" "}
							<code className="rounded bg-muted px-1 py-0.5">
								GITHUB_APP_SLUG
							</code>{" "}
							to render the install button.
						</div>
					)}

					<div className="text-xs text-muted-foreground">
						After installation, return to{" "}
						<Link to="/auth/login" className="underline underline-offset-4">
							sign in
						</Link>{" "}
						and pick your repo.
					</div>
				</div>

				<p className="text-sm text-muted-foreground">
					Note: You need org owner or app manager permissions to install apps on
					an organization.
				</p>
			</div>
		</div>
	);
}
