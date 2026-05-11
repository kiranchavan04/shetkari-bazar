import { Router, type IRouter } from "express";
import { eq, and, gt } from "drizzle-orm";
import crypto from "crypto";
import { db, usersTable, otpCodesTable, sessionsTable } from "@workspace/db";
import { RequestOtpBody, VerifyOtpBody } from "@workspace/api-zod";

const router: IRouter = Router();

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

router.post("/auth/request-otp", async (req, res): Promise<void> => {
  const parsed = RequestOtpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { phone, role } = parsed.data;
  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Invalidate any existing unused OTPs for this phone
  await db
    .update(otpCodesTable)
    .set({ used: "true" })
    .where(eq(otpCodesTable.phone, phone));

  await db.insert(otpCodesTable).values({
    phone,
    role,
    code: otp,
    used: "false",
    expiresAt,
  });

  req.log.info({ phone }, "OTP generated");

  res.json({
    message: "OTP generated. (Demo mode: OTP shown in response. In production, SMS would be sent.)",
    otpCode: otp,
    expiresAt: expiresAt.toISOString(),
  });
});

router.post("/auth/verify-otp", async (req, res): Promise<void> => {
  const parsed = VerifyOtpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { phone, otp } = parsed.data;
  const now = new Date();

  const [otpRecord] = await db
    .select()
    .from(otpCodesTable)
    .where(
      and(
        eq(otpCodesTable.phone, phone),
        eq(otpCodesTable.code, otp),
        eq(otpCodesTable.used, "false"),
        gt(otpCodesTable.expiresAt, now)
      )
    )
    .orderBy(otpCodesTable.createdAt)
    .limit(1);

  if (!otpRecord) {
    res.status(401).json({ error: "Invalid or expired OTP. Please try again." });
    return;
  }

  // Mark OTP as used
  await db
    .update(otpCodesTable)
    .set({ used: "true" })
    .where(eq(otpCodesTable.id, otpRecord.id));

  // Get or create user
  let [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.phone, phone));

  if (!user) {
    [user] = await db
      .insert(usersTable)
      .values({ phone, role: otpRecord.role })
      .returning();
  }

  // Create session (30 days)
  const token = generateToken();
  const sessionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await db.insert(sessionsTable).values({
    userId: user.id,
    token,
    expiresAt: sessionExpiresAt,
  });

  req.log.info({ userId: user.id }, "User authenticated");

  res.json({
    token,
    user: {
      id: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
    },
  });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const token = authHeader.slice(7);
  const now = new Date();

  const [session] = await db
    .select({ session: sessionsTable, user: usersTable })
    .from(sessionsTable)
    .innerJoin(usersTable, eq(sessionsTable.userId, usersTable.id))
    .where(and(eq(sessionsTable.token, token), gt(sessionsTable.expiresAt, now)));

  if (!session) {
    res.status(401).json({ error: "Session expired or invalid" });
    return;
  }

  res.json({
    id: session.user.id,
    phone: session.user.phone,
    name: session.user.name,
    role: session.user.role,
    createdAt: session.user.createdAt,
  });
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
  }
  res.sendStatus(204);
});

router.patch("/auth/profile", async (req, res): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const token = authHeader.slice(7);
  const now = new Date();

  const [session] = await db
    .select({ session: sessionsTable, user: usersTable })
    .from(sessionsTable)
    .innerJoin(usersTable, eq(sessionsTable.userId, usersTable.id))
    .where(and(eq(sessionsTable.token, token), gt(sessionsTable.expiresAt, now)));

  if (!session) {
    res.status(401).json({ error: "Session expired or invalid" });
    return;
  }

  const updateData: Partial<typeof usersTable.$inferInsert> = {};
  if (req.body.name !== undefined) updateData.name = req.body.name;
  if (req.body.upiId !== undefined) updateData.upiId = req.body.upiId || null;

  const [updated] = await db
    .update(usersTable)
    .set(updateData)
    .where(eq(usersTable.id, session.user.id))
    .returning();

  res.json({
    id: updated.id,
    phone: updated.phone,
    name: updated.name,
    upiId: updated.upiId,
    role: updated.role,
    createdAt: updated.createdAt,
  });
});

export default router;
