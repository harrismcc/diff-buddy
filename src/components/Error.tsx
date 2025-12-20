import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorProps {
	message?: string;
	className?: string;
}

export const ErrorComponent = ({
	message = "Something went wrong",
	className,
}: ErrorProps) => {
	return (
		<div
			className={cn(
				"flex items-center justify-center w-full h-full p-6",
				className,
			)}
		>
			<div className="flex flex-col items-center gap-3 text-center">
				<AlertCircle className="size-8 text-destructive text-red-400" />
				{message && <p className="text-sm text-muted-foreground">{message}</p>}
			</div>
		</div>
	);
};
