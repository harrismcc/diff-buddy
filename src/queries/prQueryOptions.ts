import { getPrRow } from "@/routes/_authenticated/$owner.$repo/pull.$pull_number/index";
import { generateSummary } from "@/serverActions/generateSummary";

export const getPrQueryOptions = (
	owner: string,
	repo: string,
	pull_number: number,
) => ({
	queryKey: ["getPrRow", { owner, repo, pull_number }],
	queryFn: async () => {
		const pr = await getPrRow({
			data: { owner, repo, pull_number },
		});

		if (pr?.summaryStatus === "generating") {
			return { status: "generating" };
		}

		if (!pr || !pr.diff || !pr.summary) {
			const result = await generateSummary({
				data: { owner, repo, pull_number, wait: false },
			});

			return result;
		}

		return {
			status: "ready",
			summary: pr.summary,
			diff: pr.diff,
		};
	},
});
