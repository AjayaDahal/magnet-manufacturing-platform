import { Router, Request, Response } from "express";
import { db } from "../db";
import { Tenant } from "../entities/Tenant";

export const tenantRoutes = Router();

tenantRoutes.get("/", async (_req: Request, res: Response) => {
  try {
    const tenants = await db.getRepository(Tenant).find({ where: { active: true } });
    res.json({ tenants });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch tenants", detail: String(err) });
  }
});

tenantRoutes.get("/:slug", async (req: Request, res: Response) => {
  try {
    const tenant = await db.getRepository(Tenant).findOne({ where: { slug: req.params.slug } });
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });
    res.json({ tenant });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch tenant", detail: String(err) });
  }
});

tenantRoutes.post("/", async (req: Request, res: Response) => {
  try {
    const { slug, name, logoUrl, brandingConfig, contactEmail, settings } = req.body;
    if (!slug || !name) return res.status(400).json({ error: "slug and name required" });

    const tenant = db.getRepository(Tenant).create({
      slug,
      name,
      logoUrl: logoUrl || null,
      brandingConfig: brandingConfig || null,
      contactEmail: contactEmail || null,
      settings: settings || null,
    });

    const saved = await db.getRepository(Tenant).save(tenant);
    res.status(201).json({ tenant: saved });
  } catch (err) {
    res.status(500).json({ error: "Failed to create tenant", detail: String(err) });
  }
});
