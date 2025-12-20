import { ArrowRight, GitBranch } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { Endpoints } from "@octokit/types";

type PullRequest =
	Endpoints["GET /repos/{owner}/{repo}/pulls"]["response"]["data"][number];

interface PRListItemProps {
	pr: PullRequest;
	owner: string;
	repo: string;
}

export const PRListItem = ({ pr, owner, repo }: PRListItemProps) => {
	const navigate = useNavigate();

	const formatTimeAgo = (dateString: string) => {
		const date = new Date(dateString);
		const now = new Date();
		const diffInMs = now.getTime() - date.getTime();
		const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
		const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
		const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

		if (diffInMinutes < 1) return "just now";
		if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
		if (diffInHours < 24) return `${diffInHours}h ago`;
		if (diffInDays === 1) return "1d ago";
		if (diffInDays < 30) return `${diffInDays}d ago`;
		return date.toLocaleDateString();
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
		if (pr.state === "open") {
			return (
				<Badge
					variant="outline"
					className="bg-green-500/10 text-green-700 border-green-500/20"
				>
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
			return <Badge variant="secondary">Closed</Badge>;
		}
		return null;
	};

	const handleClick = () => {
		navigate({
			to: "/$owner/$repo/pull/$pull_number",
			params: {
				owner,
				repo,
				pull_number: pr.number.toString(),
			},
		});
	};

	return (
		<div
			className="border border-border rounded-lg p-4 hover:bg-accent/50 cursor-pointer transition-colors"
			onClick={handleClick}
		>
			<div className="flex items-start justify-between gap-4">
				<div className="flex-1 min-w-0">
					{/* Title and PR Number */}
					<div className="flex items-baseline gap-2 mb-2">
						<h3 className="text-base font-semibold truncate">{pr.title}</h3>
						<span className="text-xs text-muted-foreground whitespace-nowrap">
							#{pr.number}
						</span>
					</div>

					{/* Author and branch info */}
					<div className="flex items-center gap-2 text-sm mb-3 flex-wrap">
						<Avatar className="size-5">
							<AvatarImage src={pr.user.avatar_url} alt={pr.user.login} />
							<AvatarFallback className="text-xs">
								{getAuthorInitials(pr.user.login)}
							</AvatarFallback>
						</Avatar>
						<span className="font-medium">{pr.user.login}</span>
						<span className="text-muted-foreground">wants to merge</span>
						<div className="flex items-center gap-1.5">
							<pre className="bg-muted px-1.5 rounded font-mono text-xs border border-border whitespace-nowrap">
								{pr.base.ref}
							</pre>
							<ArrowRight className="size-3 text-muted-foreground" />
							<pre className="bg-muted px-1.5 rounded font-mono text-xs border border-border whitespace-nowrap">
								{pr.head.ref}
							</pre>
						</div>
					</div>
				</div>

				{/* Right side: Status and stats */}
				<div className="flex flex-col items-end gap-2 text-xs whitespace-nowrap">
					<div className="flex items-center gap-2">
						{getStateBadge()}
						<span className="text-muted-foreground">
							{formatTimeAgo(pr.updated_at)}
						</span>
					</div>
					<div className="flex items-center gap-3 text-muted-foreground">
						<span>
							<span className="text-green-600">+{pr.additions}</span>
						</span>
						<span>
							<span className="text-red-600">-{pr.deletions}</span>
						</span>
						<span className="flex items-center gap-1">
							<GitBranch className="size-3" />
							{pr.changed_files}
						</span>
					</div>
				</div>
			</div>
		</div>
	);
};
