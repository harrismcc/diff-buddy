import { ArrowLeft, GitBranch, MoreHorizontal, Share2, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { PRSidebar } from "@/components/PRSidebar";
import type { Endpoints } from "@octokit/types";

type PullRequest = Endpoints["GET /repos/{owner}/{repo}/pulls/{pull_number}"]["response"]["data"];

interface PRHeaderProps {
	pr: PullRequest;
}

export const PRHeader = ({ pr }: PRHeaderProps) => {
	const formatTimeAgo = (dateString: string) => {
		const date = new Date(dateString);
		const now = new Date();
		const diffInMs = now.getTime() - date.getTime();
		const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
		
		if (diffInDays === 0) return "today";
		if (diffInDays === 1) return "1d ago";
		return `${diffInDays}d ago`;
	};

	const getAuthorInitials = (name: string) => {
		return name
			.split(" ")
			.map((n) => n[0])
			.join("")
			.toUpperCase()
			.slice(0, 2);
	};

	const getStateBadge = () => {
		// GitHub API uses "open" or "closed" for state, and merged_at to determine if merged
		if (pr.state === "open") {
			return (
				<Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">
					Open
				</Badge>
			);
		} else if (pr.state === "closed") {
			if (pr.merged_at) {
				return (
					<Badge
						variant="outline"
						className="bg-primary/10 text-primary border-primary/20"
					>
						Merged
					</Badge>
				);
			}
			return (
				<Badge variant="secondary">
					Closed
				</Badge>
			);
		}
		return null;
	};

	return (
		<div className="border-b bg-background">
			<div className="flex">
				<div className="flex-1">
					<div className="container mx-auto px-4 py-4">
				{/* Top section */}
				<div className="flex items-start justify-between gap-4 mb-3">
					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
							<span className="font-medium">{pr.base.repo.owner.login}/{pr.base.repo.name}</span>
							<span>#{pr.number}</span>
						</div>
						<h1 className="text-2xl font-semibold mb-3">
							{pr.title}
						</h1>
						{pr.body && (
							<div className="text-sm text-muted-foreground mb-3 whitespace-pre-wrap">
								{pr.body}
							</div>
						)}
						<div className="flex items-center gap-3 flex-wrap">
							<div className="flex items-center gap-2">
								<Avatar className="size-5">
									<AvatarImage src={pr.user.avatar_url} alt={pr.user.login} />
									<AvatarFallback className="text-xs">
										{getAuthorInitials(pr.user.login)}
									</AvatarFallback>
								</Avatar>
								<span className="text-sm font-medium">{pr.user.login}</span>
							</div>
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<code className="bg-muted px-2 py-0.5 rounded text-xs">
									{pr.base.ref}
								</code>
								<ArrowLeft className="size-3" />
								<code className="bg-muted px-2 py-0.5 rounded text-xs">
									{pr.head.ref}
								</code>
							</div>
						</div>
						{pr.requested_reviewers && pr.requested_reviewers.length > 0 && (
							<div className="flex items-center gap-2 mt-2">
								<Users className="size-4 text-muted-foreground" />
								<span className="text-xs text-muted-foreground">Reviewers:</span>
								<div className="flex items-center gap-1">
									{pr.requested_reviewers.map((reviewer) => (
										<Avatar key={reviewer.id} className="size-5 border">
											<AvatarImage src={reviewer.avatar_url} alt={reviewer.login} />
											<AvatarFallback className="text-xs">
												{getAuthorInitials(reviewer.login)}
											</AvatarFallback>
										</Avatar>
									))}
								</div>
								<span className="text-xs text-muted-foreground">
									{pr.requested_reviewers.map((r) => r.login).join(", ")}
								</span>
							</div>
						)}
					</div>
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<span className="whitespace-nowrap">{pr.changed_files} files</span>
						<span className="text-primary">+{pr.additions}</span>
						<span>/</span>
						<span className="text-destructive">-{pr.deletions}</span>
						<Separator orientation="vertical" className="h-4" />
						<span className="whitespace-nowrap">Updated {formatTimeAgo(pr.updated_at)}</span>
					</div>
				</div>

				{/* Bottom section */}
				<div className="flex items-center justify-between gap-4">
					<div className="flex items-center gap-2">
						<Button variant="ghost" size="sm" className="gap-1">
							<GitBranch className="size-4" />
							Stack
							<Badge variant="secondary" className="ml-1">
								1 of 1
							</Badge>
						</Button>
						<div className="flex items-center gap-2 text-sm">
							<span className="flex items-center gap-1.5">
								<span className="size-2 rounded-full bg-primary" />
								<span className="text-muted-foreground">#{pr.number}</span>
							</span>
							<span className="text-muted-foreground">
								{pr.title}
							</span>
							{getStateBadge()}
							<span className="text-muted-foreground">{formatTimeAgo(pr.updated_at)}</span>
						</div>
					</div>
					<div className="flex items-center gap-2">
						<Button variant="outline" size="sm">
							<Share2 className="size-4" />
							Share
						</Button>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" size="icon-sm">
									<MoreHorizontal className="size-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem>View on GitHub</DropdownMenuItem>
								<DropdownMenuItem>Copy link</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</div>
					</div>
				</div>
				<PRSidebar pr={pr} />
			</div>
		</div>
	);
};
