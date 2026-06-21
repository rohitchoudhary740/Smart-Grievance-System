import { getDepartmentsByTenant, getDepartmentBySlug } from './tenantService';
import { getOfficersInDept } from './userService';
import { getOfficerWorkloads } from './grievanceService';
import { logger } from '../utils/logger';
import mongoose, { Types } from 'mongoose';

export interface AssignmentResult {
  departmentId: string;
  departmentName: string;
  officerId: string;
  estimatedResolutionTime: string;
  dueAt: Date;
}

/**
 * Given a tenantId and AI-suggested department name + category + SLA hours,
 * find the officer in that department with the lightest current workload.
 */
export async function autoAssign(
  tenantId: string,
  suggestedDeptName: string,
  category: string,
  resolutionHours: number
): Promise<AssignmentResult | null> {
  try {
    const dueAt = new Date(Date.now() + resolutionHours * 3_600_000);
    const estimatedResolutionTime =
      resolutionHours <= 24
        ? `Expected within ${resolutionHours} hours`
        : `Expected within ${Math.round(resolutionHours / 24)} working day(s)`;

    // Demo override: if the tenant has the default demo officer 'officer@demo-city.gov', direct to them
    const User = mongoose.model('User');
    const demoOfficer = await User.findOne({
      tenantId: new Types.ObjectId(tenantId),
      email: 'officer@demo-city.gov',
      role: 'OFFICER',
      isActive: true,
    }).lean();

    if (demoOfficer) {
      const demoDeptId = demoOfficer.departmentId?.toString();
      if (demoDeptId) {
        const Department = mongoose.model('Department');
        const demoDept = await Department.findById(demoDeptId).lean();
        if (demoDept) {
          return {
            departmentId:   demoDept._id.toString(),
            departmentName: demoDept.name,
            officerId:      demoOfficer._id.toString(),
            estimatedResolutionTime,
            dueAt,
          };
        }
      }
    }

    const suggestedDeptNorm = (suggestedDeptName ?? '').trim().toLowerCase();
    const aiCategoryNorm = (category ?? '').trim().toLowerCase();

    const categoryTokens = aiCategoryNorm
      .split(/\W+/)
      .map((t) => t.trim())
      .filter((t) => t.length >= 3);

    const categoryMatches = (deptCats: string[] | undefined): boolean => {
      if (!deptCats?.length) return false;
      return deptCats.some((c) => {
        const cn = String(c ?? '').trim().toLowerCase();
        if (!cn) return false;
        if (!aiCategoryNorm) return false;

        if (cn === aiCategoryNorm) return true;
        if (cn.includes(aiCategoryNorm) || aiCategoryNorm.includes(cn)) return true;

        // Token overlap fallback
        for (const tok of categoryTokens) {
          if (tok && cn.includes(tok)) return true;
        }
        return false;
      });
    };

    const nameMatches = (deptName: string): boolean => {
      const dn = (deptName ?? '').trim().toLowerCase();
      if (!dn || !suggestedDeptNorm) return false;
      return dn === suggestedDeptNorm || dn.includes(suggestedDeptNorm) || suggestedDeptNorm.includes(dn);
    };

    // 1. Find matching department (fuzzy name match then fallback to general)
    const allDepts  = await getDepartmentsByTenant(tenantId);
    const dept =
      allDepts.find((d) =>
        nameMatches(d.name) || categoryMatches(d.categories as any)
      ) ?? allDepts.find((d) => d.slug === 'admin') ?? allDepts[0];

    if (!dept) {
      logger.warn(`autoAssign: no department found for tenant ${tenantId}`);
      return null;
    }

    // 2. Get all officers in that department
    const officers = await getOfficersInDept(tenantId, dept._id.toString());
    if (!officers.length) {
      logger.warn(`autoAssign: no officers in dept ${dept.name}`);
      return null;
    }

    // 3. Get their current active workloads
    const workloads = await getOfficerWorkloads(tenantId, dept._id.toString());
    const workloadMap = new Map(workloads.map((w) => [w.officerId, w.activeCount]));

    // 4. Pick the officer with the fewest active tasks (round-robin on tie)
    const sorted = [...officers].sort((a, b) => {
      const aLoad = workloadMap.get(a._id.toString()) ?? 0;
      const bLoad = workloadMap.get(b._id.toString()) ?? 0;
      return aLoad - bLoad;
    });

    const chosen = sorted[0];

    return {
      departmentId:   dept._id.toString(),
      departmentName: dept.name,
      officerId:      chosen._id.toString(),
      estimatedResolutionTime,
      dueAt,
    };
  } catch (err) {
    logger.error('autoAssign failed', err);
    return null;
  }
}
