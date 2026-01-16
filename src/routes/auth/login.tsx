import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/auth-client";
import { Github } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/auth/login")({
	component: RouteComponent,
});

function RouteComponent() {
	const [count, setCount] = useState(0);

	const handleGithubSignIn = () => {
		authClient.signIn.social({
			provider: "github",
			callbackURL: "/",
		});
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-background">
			<div className="w-full max-w-md p-8 space-y-6">
				<div className="space-y-2 text-center">
					<h1 className="text-3xl font-bold tracking-tight">
						Welcome to Diff Buddy
					</h1>
					<p className="text-muted-foreground">
						Sign in with your GitHub account to continue
					</p>
				</div>
				<div className="space-y-4">
					<Button
						onClick={() => setCount(count + 1)}
						className="w-full"
						size="lg"
						variant="outline"
					>
						Count: {count}
					</Button>
					<Button
						onClick={handleGithubSignIn}
						className="w-full"
						size="lg"
						variant="outline"
					>
						<Github />
						Continue with GitHub
					</Button>
					<Button asChild className="w-full" size="lg" variant="link">
						<Link to="/auth/github-app">
							Install the GitHub App for your org
						</Link>
					</Button>
				</div>
			</div>
		</div>
	);
}
