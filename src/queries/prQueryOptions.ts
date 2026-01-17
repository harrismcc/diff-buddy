import { getPrRow } from "@/routes/_authenticated/$owner.$repo/pull.$pull_number/index";
import { generateSummary } from "@/serverActions/generateSummary";

export type SummaryStage =
	| "fetching_diff"
	| "prompting_model"
	| "saving_result";

export type PrQueryResult =
	| { status: "ready"; summary: string; diff: string }
	| { status: "generating"; stage?: SummaryStage; startedAt?: string }
	| { status: "error" };

export const getPrQueryOptions = (
	owner: string,
	repo: string,
	pull_number: number,
) => ({
	queryKey: ["getPrRow", { owner, repo, pull_number }],
	queryFn: async (): Promise<PrQueryResult> => {
		const pr = await getPrRow({
			data: { owner, repo, pull_number },
		});

		if (pr?.summaryStatus === "error") {
			return { status: "error" };
		}

		if (pr?.summaryStatus === "generating") {
			return {
				status: "generating",
				stage: (pr.summaryStage ?? "fetching_diff") as SummaryStage,
				startedAt: pr.summaryStartedAt?.toISOString(),
			};
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
