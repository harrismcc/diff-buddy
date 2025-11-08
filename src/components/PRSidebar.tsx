import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { Endpoints } from "@octokit/types";

type PullRequest =
	Endpoints["GET /repos/{owner}/{repo}/pulls/{pull_number}"]["response"]["data"];

interface PRSidebarProps {
	pr: PullRequest;
}

interface SidebarSectionProps {
	title: string;
	section: "reviewers" | "labels" | "assignees";
	children: React.ReactNode;
	expandedSections: Record<string, boolean>;
	toggleSection: (section: "reviewers" | "labels" | "assignees") => void;
}

const SidebarSection = ({
	title,
	section,
	children,
	expandedSections,
	toggleSection,
}: SidebarSectionProps) => (
	<div>
		<button
			type="button"
			onClick={() => toggleSection(section)}
			className="w-full flex items-center gap-2 px-4 py-3 hover:bg-muted/30 transition-colors"
		>
			<ChevronDown
				className={`size-4 transition-transform ${
					expandedSections[section] ? "" : "-rotate-90"
				}`}
			/>
			<span className="font-medium text-sm">{title}</span>
		</button>
		{expandedSections[section] && <div className="px-4 py-3">{children}</div>}
	</div>
);

export const PRSidebar = ({ pr }: PRSidebarProps) => {
	const [expandedSections, setExpandedSections] = useState({
		reviewers: true,
		labels: true,
		assignees: true,
	});

	const toggleSection = (section: "reviewers" | "labels" | "assignees") => {
		setExpandedSections((prev) => ({
			...prev,
			[section]: !prev[section],
		}));
	};

	const getAuthorInitials = (name: string) => {
		return name
			.split(" ")
			.map((n) => n[0])
			.join("")
			.toUpperCase()
			.slice(0, 2);
	};

	return (
		<div className="w-64">
			{/* Reviewers Section */}
			<SidebarSection
				title="Reviewers"
				section="reviewers"
				expandedSections={expandedSections}
				toggleSection={toggleSection}
			>
				{pr.requested_reviewers && pr.requested_reviewers.length > 0 ? (
					<div className="space-y-2">
						{pr.requested_reviewers.map((reviewer) => (
							<div
								key={reviewer.id}
								className="flex items-center gap-2 p-2 rounded hover:bg-muted/50"
							>
								<Avatar className="size-6">
									<AvatarImage src={reviewer.avatar_url} alt={reviewer.login} />
									<AvatarFallback className="text-xs">
										{getAuthorInitials(reviewer.login)}
									</AvatarFallback>
								</Avatar>
								<span className="text-sm">{reviewer.login}</span>
							</div>
						))}
					</div>
				) : (
					<div className="text-sm text-muted-foreground">No reviewers</div>
				)}
			</SidebarSection>

			{/* Labels Section */}
			<SidebarSection
				title="Labels"
				section="labels"
				expandedSections={expandedSections}
				toggleSection={toggleSection}
			>
				{pr.labels && pr.labels.length > 0 ? (
					<div className="flex flex-wrap gap-2">
						{Array.isArray(pr.labels) &&
							pr.labels.map((label) => {
								const labelObj =
									typeof label === "string"
										? { name: label, color: "999999" }
										: label;
								return (
									<Badge
										key={labelObj.name}
										style={{
											backgroundColor: `#${labelObj.color}`,
										}}
										className="text-white cursor-pointer hover:opacity-80"
									>
										{labelObj.name}
									</Badge>
								);
							})}
					</div>
				) : (
					<div className="text-sm text-muted-foreground">No labels</div>
				)}
			</SidebarSection>

			{/* Assignees Section */}
			<SidebarSection
				title="Assignees"
				section="assignees"
				expandedSections={expandedSections}
				toggleSection={toggleSection}
			>
				{pr.assignees && pr.assignees.length > 0 ? (
					<div className="space-y-2">
						{pr.assignees.map((assignee) => (
							<div
								key={assignee.id}
								className="flex items-center gap-2 p-2 rounded hover:bg-muted/50"
							>
								<Avatar className="size-6">
									<AvatarImage src={assignee.avatar_url} alt={assignee.login} />
									<AvatarFallback className="text-xs">
										{getAuthorInitials(assignee.login)}
									</AvatarFallback>
								</Avatar>
								<span className="text-sm">{assignee.login}</span>
							</div>
						))}
					</div>
				) : (
					<div className="text-sm text-muted-foreground">
						No assignees · Assign yourself
					</div>
				)}
			</SidebarSection>
		</div>
	);
};
