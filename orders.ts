import { Router, type IRouter } from "express";
import { eq, and, or } from "drizzle-orm";
import { db, ordersTable, listingsTable, usersTable } from "@workspace/db";
import { CreateOrderBody, UpdateOrderParams, UpdateOrderBody } from "@workspace/api-zod";
import { requireAuth } from "../middleware/auth";

const router: IRouter = Router();

function serializeOrder(
  order: typeof ordersTable.$inferSelect,
  listing: typeof listingsTable.$inferSelect,
  farmer: typeof usersTable.$inferSelect,
  buyer: typeof usersTable.$inferSelect
) {
  return {
    id: order.id,
    listingId: order.listingId,
    buyerId: order.buyerId,
    farmerId: order.farmerId,
    quantityKg: order.quantityKg,
    pricePerKg: order.pricePerKg,
    totalAmount: order.totalAmount,
    status: order.status,
    upiTxnRef: order.upiTxnRef,
    notes: order.notes,
    createdAt: order.createdAt,
    crop: listing.crop,
    grade: listing.grade,
    village: listing.village,
    farmerName: listing.farmerName,
    farmerPhone: farmer.phone,
    farmerUpiId: farmer.upiId,
    buyerName: buyer.name,
    buyerPhone: buyer.phone,
  };
}

router.post("/orders", requireAuth, async (req, res): Promise<void> => {
  const user = req.authUser!;
  if (user.role !== "buyer") {
    res.status(403).json({ error: "Only buyers can place orders" });
    return;
  }

  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [listing] = await db
    .select()
    .from(listingsTable)
    .where(eq(listingsTable.id, parsed.data.listingId));

  if (!listing) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }

  if (parsed.data.quantityKg > listing.quantityKg) {
    res.status(400).json({ error: `Only ${listing.quantityKg} kg available` });
    return;
  }

  // Find farmer user by phone
  const [farmer] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.phone, listing.farmerPhone));

  const farmerId = farmer?.id ?? 0;
  const totalAmount = parsed.data.quantityKg * listing.pricePerKg;

  const [order] = await db
    .insert(ordersTable)
    .values({
      listingId: parsed.data.listingId,
      buyerId: user.id,
      farmerId,
      quantityKg: parsed.data.quantityKg,
      pricePerKg: listing.pricePerKg,
      totalAmount,
      notes: parsed.data.notes ?? null,
    })
    .returning();

  const farmerUser = farmer ?? { ...usersTable.$inferSelect, phone: listing.farmerPhone, name: listing.farmerName, upiId: null, id: 0, role: "shetkari", createdAt: new Date(), updatedAt: new Date() };

  req.log.info({ orderId: order.id, buyerId: user.id }, "Order created");
  res.status(201).json(serializeOrder(order, listing, farmerUser as any, user));
});

router.get("/orders/mine", requireAuth, async (req, res): Promise<void> => {
  const user = req.authUser!;

  let rows: Array<{
    order: typeof ordersTable.$inferSelect;
    listing: typeof listingsTable.$inferSelect;
    farmer: typeof usersTable.$inferSelect;
    buyer: typeof usersTable.$inferSelect;
  }>;

  if (user.role === "shetkari") {
    rows = await db
      .select({ order: ordersTable, listing: listingsTable, farmer: usersTable, buyer: usersTable })
      .from(ordersTable)
      .innerJoin(listingsTable, eq(ordersTable.listingId, listingsTable.id))
      .innerJoin(usersTable, eq(ordersTable.buyerId, usersTable.id))
      .where(eq(ordersTable.farmerId, user.id))
      .orderBy(ordersTable.createdAt);
  } else {
    rows = await db
      .select({ order: ordersTable, listing: listingsTable, farmer: usersTable, buyer: usersTable })
      .from(ordersTable)
      .innerJoin(listingsTable, eq(ordersTable.listingId, listingsTable.id))
      .innerJoin(usersTable, eq(ordersTable.buyerId, usersTable.id))
      .where(eq(ordersTable.buyerId, user.id))
      .orderBy(ordersTable.createdAt);
  }

  res.json(rows.map((r) => serializeOrder(r.order, r.listing, r.farmer, r.buyer)));
});

router.get("/orders/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const user = req.authUser!;
  const rows = await db
    .select({ order: ordersTable, listing: listingsTable, farmer: usersTable, buyer: usersTable })
    .from(ordersTable)
    .innerJoin(listingsTable, eq(ordersTable.listingId, listingsTable.id))
    .innerJoin(usersTable, eq(ordersTable.buyerId, usersTable.id))
    .where(
      and(
        eq(ordersTable.id, params.data.id),
        or(eq(ordersTable.buyerId, user.id), eq(ordersTable.farmerId, user.id))
      )
    );

  if (!rows[0]) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const r = rows[0];
  res.json(serializeOrder(r.order, r.listing, r.farmer, r.buyer));
});

router.patch("/orders/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const user = req.authUser!;

  const [existing] = await db
    .select()
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.id, params.data.id),
        or(eq(ordersTable.buyerId, user.id), eq(ordersTable.farmerId, user.id))
      )
    );

  if (!existing) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const updateData: Partial<typeof ordersTable.$inferInsert> = {};
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
  if (parsed.data.upiTxnRef !== undefined) updateData.upiTxnRef = parsed.data.upiTxnRef;

  const [updated] = await db
    .update(ordersTable)
    .set(updateData)
    .where(eq(ordersTable.id, params.data.id))
    .returning();

  const [listing] = await db.select().from(listingsTable).where(eq(listingsTable.id, updated.listingId));
  const [buyer] = await db.select().from(usersTable).where(eq(usersTable.id, updated.buyerId));
  const [farmer] = await db.select().from(usersTable).where(eq(usersTable.id, updated.farmerId));

  res.json(serializeOrder(updated, listing, farmer, buyer));
});

export default router;
