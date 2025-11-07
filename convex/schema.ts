import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
	products: defineTable({
		title: v.string(),
		imageId: v.string(),
		price: v.number(),
	}),
	todos: defineTable({
		text: v.string(),
		completed: v.boolean(),
	}),
	trackedPrs: defineTable({
		owner: v.string(),
		repo: v.string(),
		pull_number: v.number(),
		diff: v.optional(v.string()),
		review: v.optional(v.string()),
	}),
});
