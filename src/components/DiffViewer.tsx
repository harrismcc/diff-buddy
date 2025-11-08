import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Diff, Hunk } from "@/components/ui/diff";
import { parseDiff } from "@/components/ui/diff/utils";
import { useMemo } from "react";
import { ArrowRight } from "lucide-react";

const DiffViewer = ({ diff }: { diff: string }) => {
	const files = useMemo(
		() =>
			parseDiff(diff, {
				maxChangeRatio: 0.45,
				maxDiffDistance: 30,
				inlineMaxCharEdits: 0,
			}),
		[diff],
	);

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
				return (
						<Collapsible
							key={index}
							className="mb-6 last:mb-0"
							defaultOpen={file.newPath !== "/dev/null"}
						>
							<CollapsibleTrigger asChild>
								<button
									type="button"
									className="flex w-full items-center justify-between rounded-lg border border-border bg-muted/50 px-4 py-3 text-left"
								>
									{file.oldPath === file.newPath ? (
										<span className="font-mono text-sm font-medium">
											{file.newPath}
										</span>
									) : (
										<div className="font-mono text-sm font-medium flex items-center gap-2 flex-row">
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
							<CollapsibleContent>
								<div className="mt-3 overflow-x-auto">
									<Diff
										hunks={file.hunks}
										fileName={file.newPath}
										type={file.type}
										options
										>
											{file.hunks.map((hunk, hunkIndex) => (
												<Hunk key={hunkIndex} hunk={hunk} />
											))}
										</Diff>
									</div>
							</CollapsibleContent>
						</Collapsible>
				);
			})}
		</div>
	);
};

export default DiffViewer;
