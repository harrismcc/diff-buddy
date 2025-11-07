import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface TocItem {
	id: string;
	title: string;
	level: number;
}

interface TableOfContentsProps {
	items: TocItem[];
}

export function TableOfContents({ items }: TableOfContentsProps) {
	const [activeId, setActiveId] = useState<string>("");

	useEffect(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						setActiveId(entry.target.id);
					}
				});
			},
			{
				rootMargin: "-80px 0px -80% 0px",
			},
		);

		items.forEach(({ id }) => {
			const element = document.getElementById(id);
			if (element) {
				observer.observe(element);
			}
		});

		return () => observer.disconnect();
	}, [items]);

	const handleClick = (id: string) => {
		const element = document.getElementById(id);
		if (element) {
			element.scrollIntoView({ behavior: "smooth", block: "start" });
		}
	};

	if (items.length === 0) return null;

	return (
		<nav className="sticky top-8 h-fit max-h-[calc(100vh-4rem)] overflow-y-auto">
			<div className="text-sm font-semibold text-foreground mb-4">
				Table of Contents
			</div>
			<ul className="space-y-2 text-sm">
				{items.map((item) => (
					<li
						key={item.id}
						style={{ paddingLeft: `${(item.level - 1) * 0.75}rem` }}
					>
						<button
							type="button"
							onClick={() => handleClick(item.id)}
							className={cn(
								"text-left w-full transition-colors hover:text-primary",
								activeId === item.id
									? "text-primary font-medium"
									: "text-muted-foreground",
							)}
						>
							{item.title}
						</button>
					</li>
				))}
			</ul>
		</nav>
	);
}
