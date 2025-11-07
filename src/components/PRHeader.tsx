import { ArrowLeft, GitBranch, MoreHorizontal, Share2 } from "lucide-react";
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

export const PRHeader = ({ prNumber }: { prNumber: string }) => {
	return (
		<div className="border-b bg-background">
			<div className="container mx-auto px-4 py-4">
				{/* Top section */}
				<div className="flex items-start justify-between gap-4 mb-3">
					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
							<span className="font-medium">infilla-app</span>
							<span>#{prNumber}</span>
						</div>
						<h1 className="text-2xl font-semibold mb-3">
							Shift to Typesense for reference search
						</h1>
						<div className="flex items-center gap-3 flex-wrap">
							<div className="flex items-center gap-2">
								<Avatar className="size-5">
									<AvatarImage src="" alt="Julian Jacobs" />
									<AvatarFallback className="text-xs">JJ</AvatarFallback>
								</Avatar>
								<span className="text-sm font-medium">Julian Jacobs</span>
							</div>
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<code className="bg-muted px-2 py-0.5 rounded text-xs">
									main
								</code>
								<ArrowLeft className="size-3" />
								<code className="bg-muted px-2 py-0.5 rounded text-xs">
									julian/inf-2007-search-adjustments
								</code>
							</div>
						</div>
					</div>
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<span className="whitespace-nowrap">29 files</span>
						<span className="text-primary">+587</span>
						<span>/</span>
						<span className="text-destructive">-516</span>
						<Separator orientation="vertical" className="h-4" />
						<span className="whitespace-nowrap">Updated 2d ago</span>
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
								<span className="text-muted-foreground">#1621</span>
							</span>
							<span className="text-muted-foreground">
								Shift to Typesense for reference search
							</span>
							<Badge
								variant="outline"
								className="bg-primary/10 text-primary border-primary/20"
							>
								Merged
							</Badge>
							<span className="text-muted-foreground">2d</span>
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
	);
};
