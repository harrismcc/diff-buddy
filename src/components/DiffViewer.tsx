import { parseDiff } from "@/components/ui/diff/utils";
import { Diff, Hunk } from "@/components/ui/diff";

const DiffViewer = ({ diff }: { diff: string }) => {
	const files = parseDiff(diff);

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
					<div key={index} className="mb-6 last:mb-0">
						<div className="mb-3 flex items-center justify-between rounded-lg border border-border bg-muted/50 px-4 py-3">
							<div className="font-mono text-sm font-medium">{file.newPath}</div>
							<div className="flex items-center gap-3 text-sm">
								<span className="text-green-600 dark:text-green-400">
									+{additions}
								</span>
								<span className="text-red-600 dark:text-red-400">
									-{deletions}
								</span>
							</div>
						</div>
						<div className="overflow-x-auto">
							<Diff
								hunks={file.hunks}
								fileName={file.newPath}
								type={file.type}
							>
								{file.hunks.map((hunk, hunkIndex) => (
									<Hunk key={hunkIndex} hunk={hunk} />
								))}
							</Diff>
						</div>
					</div>
				);
			})}
		</div>
	);
};

export default DiffViewer;
