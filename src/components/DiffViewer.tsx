import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Diff, Hunk } from "@/components/ui/diff";
import { parseDiff } from "@/components/ui/diff/utils";
import { useEffect, useMemo, useRef } from "react";
import { ArrowRight } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";

type DiffViewerProps = {
	diff: string;
	scrollToFile?: string;
	getFullDiffUrl?: (filePath: string) => string;
};

const DiffViewer = ({ diff, scrollToFile, getFullDiffUrl }: DiffViewerProps) => {
	const navigate = useNavigate();
	const files = useMemo(
		() =>
			parseDiff(diff, {
				maxChangeRatio: 0.45,
				maxDiffDistance: 30,
				inlineMaxCharEdits: 0,
			}),
		[diff],
	);

	const targetIndex = useMemo(() => {
		if (!scrollToFile) {
			return -1;
		}

		return files.findIndex(
			(file) => file.newPath === scrollToFile || file.oldPath === scrollToFile,
		);
	}, [files, scrollToFile]);

	const targetRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (targetIndex !== -1 && targetRef.current) {
			targetRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
		}
	}, [targetIndex]);

	const calculateStats = (file: any) => {
		let additions = 0;
		let deletions = 0;
		file.hunks.forEach((hunk: any) => {
			if (hunk.type === "hunk" && hunk.lines) {
				hunk.lines.forEach((line: any) => {
					if (line.type === "insert") additions++;
					if (line.type === "delete") deletions++;
				});
			}
		});
		return { additions, deletions };
	};

	return (
		<div className="rounded-xl border border-border p-4">
			{files.map((file, index) => {
				const { additions, deletions } = calculateStats(file);
				const linkPath =
					file.newPath === "/dev/null" ? file.oldPath : file.newPath;
				const fullDiffUrl =
					linkPath && getFullDiffUrl ? getFullDiffUrl(linkPath) : null;
				const skipBlockAction = fullDiffUrl
					? {
							label: "Open full file diff",
							onClick: () => navigate({ to: fullDiffUrl }),
						}
					: undefined;
				const isTarget = index === targetIndex;
				return (
					<div key={index} ref={isTarget ? targetRef : undefined}>
						<Collapsible
							className="mb-6 last:mb-0"
							defaultOpen={isTarget || file.newPath !== "/dev/null"}
						>
							<div className="flex items-center gap-3">
								<CollapsibleTrigger asChild>
									<button
										type="button"
										className="flex min-w-0 flex-1 items-center justify-between rounded-lg border border-border bg-muted/50 px-4 py-3 text-left"
									>
										{file.oldPath === file.newPath ? (
											<span className="font-mono text-sm font-medium">
												{file.newPath}
											</span>
										) : (
											<div className="flex items-center gap-2 font-mono text-sm font-medium">
												{file.oldPath}
												<ArrowRight className="size-3" />
												{file.newPath === "/dev/null" ? "DELETED" : file.newPath}
											</div>
										)}
										<div className="flex items-center gap-3 text-sm">
											<span className="text-green-600 dark:text-green-400">
												+{additions}
											</span>
											<span className="text-red-600 dark:text-red-400">
												-{deletions}
											</span>
										</div>
									</button>
								</CollapsibleTrigger>
								{fullDiffUrl && (
									<Link
										to={fullDiffUrl}
										className="shrink-0 text-xs font-medium text-primary underline decoration-primary/40 underline-offset-4 hover:text-primary/80 hover:decoration-primary/70"
									>
										Full file diff
									</Link>
								)}
							</div>
							<CollapsibleContent>
								<div className="mt-3 overflow-x-auto">
									<Diff
										hunks={file.hunks}
										fileName={file.newPath}
										type={file.type}
										options
									>
										{file.hunks.map((hunk, hunkIndex) => (
											<Hunk
												key={hunkIndex}
												hunk={hunk}
												skipBlockAction={skipBlockAction}
											/>
										))}
									</Diff>
								</div>
							</CollapsibleContent>
						</Collapsible>
					</div>
				);
			})}
		</div>
	);
};

export default DiffViewer;
