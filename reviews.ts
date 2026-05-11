import { Router, type IRouter } from "express";
import { eq, and, avg, count } from "drizzle-orm";
import { db, reviewsTable, ordersTable, usersTable } from "@workspace/db";
import { CreateReviewBody, GetListingReviewsParams, GetFarmerReviewsParams } from "@workspace/api-zod";
import { requireAuth, optionalAuth } from "../middleware/auth";

const router: IRouter = Router();

function serializeReview(
  review: typeof reviewsTable.$inferSelect,
  buyer: typeof usersTable.$inferSelect
) {
  return {
    id: review.id,
    orderId: review.orderId,
    listingId: review.listingId,
    buyerId: review.buyerId,
    farmerId: review.farmerId,
    stars: review.stars,
    comment: review.comment,
    buyerName: buyer.name,
    createdAt: review.createdAt,
  };
}

router.post("/reviews", requireAuth, async (req, res): Promise<void> => {
  const user = req.authUser!;
  if (user.role !== "buyer") {
    res.status(403).json({ error: "Only buyers can submit reviews" });
    return;
  }

  const parsed = CreateReviewBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { orderId, stars, comment } = parsed.data;

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(and(eq(ordersTable.id, orderId), eq(ordersTable.buyerId, user.id)));

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  if (order.status !== "confirmed") {
    res.status(400).json({ error: "Can only review confirmed orders" });
    return;
  }

  const existing = await db
    .select()
    .from(reviewsTable)
    .where(eq(reviewsTable.orderId, orderId));

  if (existing.length > 0) {
    res.status(400).json({ error: "Already reviewed this order" });
    return;
  }

  const [buyer] = await db.select().from(usersTable).where(eq(usersTable.id, user.id));

  const [review] = await db
    .insert(reviewsTable)
    .values({
      orderId,
      listingId: order.listingId,
      buyerId: user.id,
      farmerId: order.farmerId,
      stars,
      comment: comment ?? null,
    })
    .returning();

  res.status(201).json(serializeReview(review, buyer));
});

router.get("/reviews/listing/:listingId", optionalAuth, async (req, res): Promise<void> => {
  const parsed = GetListingReviewsParams.safeParse({ listingId: parseInt(String(req.params.listingId), 10) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid listing ID" });
    return;
  }

  const rows = await db
    .select({ review: reviewsTable, buyer: usersTable })
    .from(reviewsTable)
    .leftJoin(usersTable, eq(reviewsTable.buyerId, usersTable.id))
    .where(eq(reviewsTable.listingId, parsed.data.listingId))
    .orderBy(reviewsTable.createdAt);

  const reviews = rows.map((r) => serializeReview(r.review, r.buyer as typeof usersTable.$inferSelect));
  const total = reviews.length;
  const avgStars = total > 0 ? reviews.reduce((s, r) => s + r.stars, 0) / total : 0;

  res.json({ reviews, avgStars, totalReviews: total });
});

router.get("/reviews/farmer/:farmerId", optionalAuth, async (req, res): Promise<void> => {
  const parsed = GetFarmerReviewsParams.safeParse({ farmerId: parseInt(String(req.params.farmerId), 10) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid farmer ID" });
    return;
  }

  const rows = await db
    .select({ review: reviewsTable, buyer: usersTable })
    .from(reviewsTable)
    .leftJoin(usersTable, eq(reviewsTable.buyerId, usersTable.id))
    .where(eq(reviewsTable.farmerId, parsed.data.farmerId))
    .orderBy(reviewsTable.createdAt);

  const reviews = rows.map((r) => serializeReview(r.review, r.buyer as typeof usersTable.$inferSelect));
  const total = reviews.length;
  const avgStars = total > 0 ? reviews.reduce((s, r) => s + r.stars, 0) / total : 0;

  res.json({ reviews, avgStars, totalReviews: total });
});

export default router;
