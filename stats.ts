import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db, listingsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/stats/summary", async (_req, res): Promise<void> => {
  const [summary] = await db
    .select({
      totalListings: sql<number>`count(*)::int`,
      totalFarmers: sql<number>`count(distinct ${listingsTable.farmerPhone})::int`,
      totalQuantityKg: sql<number>`coalesce(sum(${listingsTable.quantityKg}), 0)::float`,
      avgPricePerKg: sql<number>`coalesce(avg(${listingsTable.pricePerKg}), 0)::float`,
      topCrop: sql<string | null>`(
        select crop from listings group by crop order by count(*) desc limit 1
      )`,
    })
    .from(listingsTable);

  res.json({
    totalListings: summary.totalListings,
    totalFarmers: summary.totalFarmers,
    totalQuantityKg: summary.totalQuantityKg,
    avgPricePerKg: summary.avgPricePerKg,
    topCrop: summary.topCrop,
  });
});

router.get("/stats/by-crop", async (_req, res): Promise<void> => {
  const stats = await db
    .select({
      crop: listingsTable.crop,
      count: sql<number>`count(*)::int`,
      avgPrice: sql<number>`avg(${listingsTable.pricePerKg})::float`,
      totalQuantityKg: sql<number>`sum(${listingsTable.quantityKg})::float`,
    })
    .from(listingsTable)
    .groupBy(listingsTable.crop)
    .orderBy(sql`count(*) desc`);

  res.json(stats);
});

export default router;
