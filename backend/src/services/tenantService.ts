import { Types } from 'mongoose';
import { Tenant, ITenant } from '../models/Tenant';
import { Department, IDepartment } from '../models/Department';

// ─── Tenant ───────────────────────────────────────────────────────────────────

export async function getTenantBySlug(slug: string): Promise<ITenant | null> {
  return Tenant.findOne({ slug: slug.toLowerCase(), isActive: true }).lean();
}

export async function getTenantById(id: string): Promise<ITenant | null> {
  return Tenant.findOne({ _id: id, isActive: true }).lean();
}

export async function createTenant(
  name: string,
  slug: string
): Promise<ITenant> {
  return Tenant.create({ name, slug });
}

// ─── Department ───────────────────────────────────────────────────────────────

export async function getDepartmentsByTenant(tenantId: string): Promise<IDepartment[]> {
  return Department.find({ tenantId: new Types.ObjectId(tenantId), isActive: true })
    .populate({ path: 'headUserId', select: 'name email' })
    .lean();
}

export async function getDepartmentById(id: string, tenantId: string): Promise<IDepartment | null> {
  return Department.findOne({ _id: id, tenantId }).lean();
}

export async function getDepartmentBySlug(slug: string, tenantId: string): Promise<IDepartment | null> {
  return Department.findOne({ slug, tenantId, isActive: true }).lean();
}

export async function createDepartment(input: {
  tenantId: string;
  name: string;
  slug: string;
  description?: string;
  categories?: string[];
  slaConfigs?: IDepartment['slaConfigs'];
}): Promise<IDepartment> {
  return Department.create({
    tenantId: new Types.ObjectId(input.tenantId),
    ...input,
  });
}

export async function updateDepartment(
  id: string,
  tenantId: string,
  updates: Partial<IDepartment>
): Promise<IDepartment | null> {
  return Department.findOneAndUpdate(
    { _id: id, tenantId },
    { $set: updates },
    { new: true }
  ).lean();
}

// ─── SLA lookup ───────────────────────────────────────────────────────────────

export function getSLAForCategory(
  dept: IDepartment,
  category: string
): { resolutionHours: number; escalationHours: number; collectorEscalationHours: number } {
  const categoryNorm = (category ?? '').trim().toLowerCase();
  const categoryTokens = categoryNorm
    .split(/\W+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3);

  const config = dept.slaConfigs.find((c) => {
    const slug = (c.categorySlug ?? '').trim().toLowerCase();
    if (!slug) return false;
    if (slug === categoryNorm) return true;
    if (slug.includes(categoryNorm) || categoryNorm.includes(slug)) return true;
    for (const tok of categoryTokens) {
      if (tok && slug.includes(tok)) return true;
    }
    return false;
  });
  // Fallback: first config or sensible defaults
  return config ?? dept.slaConfigs[0] ?? {
    resolutionHours: 48,
    escalationHours: 24,
    collectorEscalationHours: 48,
  };
}

// ─── Seeder — creates demo tenant + departments ───────────────────────────────

export async function seedDemoTenant(): Promise<void> {
  const existing = await Tenant.findOne({ slug: 'demo-city' });
  if (existing) return; // already seeded

  const tenant = await Tenant.create({
    name: 'Demo City Municipal Corporation',
    slug: 'demo-city',
    primaryColor: '#4f61f7',
    settings: {
      criticalZoneThreshold: 5,
      criticalZoneWindowHours: 24,
      reopenWindowHours: 72,
      maxAttachments: 5,
    },
  });

  const deptDefs = [
    {
      name: 'Roads & Infrastructure',
      slug: 'roads',
      description: 'Potholes, road damage, streetlights, bridges',
      categories: ['roads', 'pothole', 'streetlight', 'bridge', 'infrastructure'],
      slaConfigs: [
        { categorySlug: 'roads',     resolutionHours: 48,  escalationHours: 24, collectorEscalationHours: 48 },
        { categorySlug: 'pothole',   resolutionHours: 72,  escalationHours: 36, collectorEscalationHours: 72 },
        { categorySlug: 'streetlight', resolutionHours: 24, escalationHours: 12, collectorEscalationHours: 24 },
      ],
    },
    {
      name: 'Water Supply',
      slug: 'water',
      description: 'Water supply issues, pipe leaks, water quality',
      categories: ['water', 'pipe', 'supply', 'drainage'],
      slaConfigs: [
        { categorySlug: 'water',  resolutionHours: 24, escalationHours: 12, collectorEscalationHours: 24 },
        { categorySlug: 'pipe',   resolutionHours: 48, escalationHours: 24, collectorEscalationHours: 48 },
      ],
    },
    {
      name: 'Sanitation',
      slug: 'sanitation',
      description: 'Garbage collection, sewage, cleanliness',
      categories: ['garbage', 'sanitation', 'sewage', 'cleanliness', 'waste'],
      slaConfigs: [
        { categorySlug: 'garbage',    resolutionHours: 24, escalationHours: 12, collectorEscalationHours: 24 },
        { categorySlug: 'sanitation', resolutionHours: 48, escalationHours: 24, collectorEscalationHours: 48 },
      ],
    },
    {
      name: 'Electricity',
      slug: 'electricity',
      description: 'Power outages, electrical hazards',
      categories: ['electricity', 'power', 'outage', 'electrical'],
      slaConfigs: [
        { categorySlug: 'electricity', resolutionHours: 12, escalationHours: 6, collectorEscalationHours: 12 },
        { categorySlug: 'outage',      resolutionHours: 8,  escalationHours: 4, collectorEscalationHours: 8  },
      ],
    },
    {
      name: 'General Administration',
      slug: 'admin',
      description: 'Certificates, permissions, other civic matters',
      categories: ['general', 'certificate', 'permission', 'other'],
      slaConfigs: [
        { categorySlug: 'general', resolutionHours: 72, escalationHours: 48, collectorEscalationHours: 96 },
      ],
    },
  ];

  await Promise.all(
    deptDefs.map((d) =>
      Department.create({ tenantId: tenant._id, ...d })
    )
  );
}
