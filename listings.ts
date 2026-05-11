import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, listingsTable } from "@workspace/db";
import {
  ListListingsQueryParams,
  CreateListingBody,
  GetListingParams,
  UpdateListingParams,
  UpdateListingBody,
  DeleteListingParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/listings", async (req, res): Promise<void> => {
  const query = ListListingsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  let dbQuery = db.select().from(listingsTable);
  const conditions: ReturnType<typeof eq>[] = [];

  if (query.data.crop) {
    conditions.push(eq(listingsTable.crop, query.data.crop));
  }
  if (query.data.grade) {
    conditions.push(eq(listingsTable.grade, query.data.grade));
  }
  if (query.data.village) {
    conditions.push(eq(listingsTable.village, query.data.village));
  }

  let rows;
  if (conditions.length > 0) {
    rows = await db
      .select()
      .from(listingsTable)
      .where(conditions.length === 1 ? conditions[0] : sql`${conditions.map((c) => sql`${c}`).reduce((a, b) => sql`${a} AND ${b}`)}`)
      .orderBy(listingsTable.createdAt);
  } else {
    rows = await db.select().from(listingsTable).orderBy(listingsTable.createdAt);
  }

  res.json(rows);
});

router.post("/listings", async (req, res): Promise<void> => {
  const parsed = CreateListingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [listing] = await db
    .insert(listingsTable)
    .values({
      farmerName: parsed.data.farmerName,
      farmerPhone: parsed.data.farmerPhone,
      village: parsed.data.village,
      crop: parsed.data.crop,
      grade: parsed.data.grade,
      quantityKg: parsed.data.quantityKg,
      pricePerKg: parsed.data.pricePerKg,
      description: parsed.data.description ?? null,
    })
    .returning();

  res.status(201).json(listing);
});

router.get("/listings/:id", async (req, res): Promise<void> => {
  const params = GetListingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [listing] = await db
    .select()
    .from(listingsTable)
    .where(eq(listingsTable.id, params.data.id));

  if (!listing) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }

  res.json(listing);
});

router.patch("/listings/:id", async (req, res): Promise<void> => {
  const params = UpdateListingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateListingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Partial<typeof listingsTable.$inferInsert> = {};
  if (parsed.data.farmerName !== undefined) updateData.farmerName = parsed.data.farmerName;
  if (parsed.data.farmerPhone !== undefined) updateData.farmerPhone = parsed.data.farmerPhone;
  if (parsed.data.village !== undefined) updateData.village = parsed.data.village;
  if (parsed.data.crop !== undefined) updateData.crop = parsed.data.crop;
  if (parsed.data.grade !== undefined) updateData.grade = parsed.data.grade;
  if (parsed.data.quantityKg !== undefined) updateData.quantityKg = parsed.data.quantityKg;
  if (parsed.data.pricePerKg !== undefined) updateData.pricePerKg = parsed.data.pricePerKg;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description;

  const [listing] = await db
    .update(listingsTable)
    .set(updateData)
    .where(eq(listingsTable.id, params.data.id))
    .returning();

  if (!listing) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }

  res.json(listing);
});

router.delete("/listings/:id", async (req, res): Promise<void> => {
  const params = DeleteListingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [listing] = await db
    .delete(listingsTable)
    .where(eq(listingsTable.id, params.data.id))
    .returning();

  if (!listing) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
