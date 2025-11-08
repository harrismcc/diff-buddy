import {
	ArrowLeft,
	ArrowRight,
	GitBranch,
	MoreHorizontal,
	Share2,
	Users,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
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

type PullRequest =
	Endpoints["GET /repos/{owner}/{repo}/pulls/{pull_number}"]["response"]["data"];

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

	return (
		<div className="border-b bg-background">
			<div className="flex">
				<div className="flex-1 flex flex-col max-w-[800px] mx-auto">
					<div className="px-4 py-4 flex-1">
						{/* Header: Title with status */}
						<div className="flex items-start justify-between gap-4 mb-3">
							<div className="flex-1">
								<h1 className="text-2xl font-semibold mb-2">{pr.title}</h1>
								<div className="flex items-center gap-1.5 text-sm mb-3 flex-wrap">
									<Avatar className="size-5">
										<AvatarImage src={pr.user.avatar_url} alt={pr.user.login} />
										<AvatarFallback className="text-xs">
											{getAuthorInitials(pr.user.login)}
										</AvatarFallback>
									</Avatar>
									<div className="flex items-center gap-1.5 flex-nowrap whitespace-nowrap">
										<span className="font-medium">{pr.user.login}</span>
										<span className="font-light">wants to merge</span>
										<pre className="bg-muted px-1 rounded-lg font-mono text-sm text-foreground border border-border">
											{pr.base.ref}
										</pre>
										<ArrowLeft className="size-3" />
										<pre className="bg-muted px-1 rounded-lg font-mono text-sm text-foreground border border-border">
											{pr.head.ref}
										</pre>
									</div>
								</div>
							</div>
							<div className="flex flex-col items-end gap-2 text-xs">
								<div className="flex items-center gap-2">
									<span className="text-muted-foreground">
										{pr.changed_files}/12
									</span>
									{getStateBadge()}
									<span className="text-muted-foreground">today</span>
								</div>
							</div>
						</div>
						{/* Description */}
						<div className="text-sm text-muted-foreground mb-4 prose prose-sm dark:prose-invert max-w-none">
							{pr.body ? (
								<ReactMarkdown
									components={{
										p: ({ children }) => <p className="m-0">{children}</p>,
										ul: ({ children }) => (
											<ul className="m-0 list-disc list-inside">{children}</ul>
										),
										ol: ({ children }) => (
											<ol className="m-0 list-decimal list-inside">
												{children}
											</ol>
										),
										li: ({ children }) => <li className="m-0">{children}</li>,
										code: ({ children }) => (
											<code className="bg-muted px-1 rounded font-mono text-xs">
												{children}
											</code>
										),
										pre: ({ children }) => (
											<pre className="bg-muted p-2 rounded overflow-x-auto">
												{children}
											</pre>
										),
										blockquote: ({ children }) => (
											<blockquote className="border-l-2 border-muted-foreground pl-2 italic m-0">
												{children}
											</blockquote>
										),
										a: ({ href, children }) => (
											<a
												href={href}
												className="text-primary hover:underline"
												target="_blank"
												rel="noopener noreferrer"
											>
												{children}
											</a>
										),
										strong: ({ children }) => (
											<strong className="font-semibold">{children}</strong>
										),
										em: ({ children }) => (
											<em className="italic">{children}</em>
										),
									}}
								>
									{pr.body}
								</ReactMarkdown>
							) : (
								<p>No description provided.</p>
							)}
						</div>
					</div>

					{/* Metadata row - pinned to bottom */}
					<div className="px-4 py-4 flex items-center gap-4 text-xs text-muted-foreground">
						<div className="flex items-center gap-2">
							<span className="font-medium">
								{pr.base.repo.owner.login}/{pr.base.repo.name}
							</span>
							<span>#{pr.number}</span>
						</div>
						<span className="text-primary">+{pr.additions}</span>
						<span className="text-destructive">-{pr.deletions}</span>
					</div>
				</div>
				<PRSidebar pr={pr} />
			</div>
		</div>
	);
};
