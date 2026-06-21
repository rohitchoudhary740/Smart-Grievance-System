import { Types } from 'mongoose';
import { User, IUser } from '../models/User';
import { UserRole } from '../types';

const SAFE_SELECT = '-passwordHash';

// ─── Lookups ──────────────────────────────────────────────────────────────────

export async function getUserById(id: string, tenantId: string): Promise<IUser | null> {
  return User.findOne({ _id: id, tenantId, isActive: true })
    .select(SAFE_SELECT)
    .populate({ path: 'departmentId', select: 'name slug' })
    .lean();
}

export async function getUserByEmail(
  email: string,
  tenantId: string,
  includePassword = false
): Promise<IUser | null> {
  const query = User.findOne({ email: email.toLowerCase(), tenantId });
  if (includePassword) query.select('+passwordHash');
  return query.lean();
}

export async function listUsers(
  tenantId: string,
  opts: { role?: UserRole; departmentId?: string; isActive?: boolean } = {}
): Promise<IUser[]> {
  const filter: Record<string, unknown> = { tenantId: new Types.ObjectId(tenantId) };
  if (opts.role)         filter.role         = opts.role;
  if (opts.departmentId) filter.departmentId = new Types.ObjectId(opts.departmentId);
  if (typeof opts.isActive === 'boolean') filter.isActive = opts.isActive;

  return User.find(filter)
    .select(SAFE_SELECT)
    .populate({ path: 'departmentId', select: 'name slug' })
    .lean();
}

export async function getOfficersInDept(
  tenantId: string,
  departmentId: string
): Promise<IUser[]> {
  return User.find({
    tenantId: new Types.ObjectId(tenantId),
    departmentId: new Types.ObjectId(departmentId),
    role:     { $in: [UserRole.OFFICER, UserRole.DEPT_HEAD] },
    isActive: true,
  })
    .select(SAFE_SELECT)
    .lean();
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createUser(input: {
  tenantId: string;
  name: string;
  email: string;
  passwordHash: string;
  role?: UserRole;
  departmentId?: string;
  phone?: string;
}): Promise<IUser> {
  return User.create({
    tenantId:     new Types.ObjectId(input.tenantId),
    name:         input.name,
    email:        input.email.toLowerCase(),
    passwordHash: input.passwordHash,
    role:         input.role ?? UserRole.CITIZEN,
    departmentId: input.departmentId ? new Types.ObjectId(input.departmentId) : undefined,
    phone:        input.phone,
  });
}

export async function updateUserRole(
  userId: string,
  tenantId: string,
  role: UserRole,
  departmentId?: string
): Promise<IUser | null> {
  const updates: Partial<IUser> = { role };
  if (departmentId) updates.departmentId = new Types.ObjectId(departmentId) as unknown as Types.ObjectId;

  return User.findOneAndUpdate(
    { _id: userId, tenantId },
    { $set: updates },
    { new: true }
  )
    .select(SAFE_SELECT)
    .lean();
}

export async function updateLastLogin(userId: string): Promise<void> {
  await User.findByIdAndUpdate(userId, { $set: { lastLoginAt: new Date() } });
}

export async function deactivateUser(userId: string, tenantId: string): Promise<void> {
  await User.findOneAndUpdate({ _id: userId, tenantId }, { $set: { isActive: false } });
}

// ─── Seeder — creates demo users for each role ────────────────────────────────

export async function seedDemoUsers(
  tenantId: string,
  departments: Record<string, string> // slug → _id
): Promise<void> {
  const bcrypt = await import('bcryptjs');
  const SALT = 10;

  const users = [
    {
      name: 'Admin User',
      email: 'admin@demo-city.gov',
      password: 'admin123',
      role: UserRole.ADMIN,
    },
    {
      name: 'Riya Sharma',
      email: 'officer@demo-city.gov',
      password: 'officer123',
      role: UserRole.OFFICER,
      departmentId: departments['roads'],
    },
    {
      name: 'Arjun Mehta',
      email: 'officer2@demo-city.gov',
      password: 'officer123',
      role: UserRole.OFFICER,
      departmentId: departments['water'],
    },
    {
      name: 'Priya Patel',
      email: 'head@demo-city.gov',
      password: 'officer123',
      role: UserRole.DEPT_HEAD,
      departmentId: departments['sanitation'],
    },
    {
      name: 'Demo Citizen',
      email: 'citizen@demo-city.gov',
      password: 'citizen123',
      role: UserRole.CITIZEN,
    },
  ];

  for (const u of users) {
    const exists = await User.findOne({ email: u.email, tenantId });
    if (exists) continue;
    const passwordHash = await bcrypt.hash(u.password, SALT);
    await createUser({
      tenantId,
      name:  u.name,
      email: u.email,
      passwordHash,
      role:  u.role,
      departmentId: u.departmentId,
    });
  }
}
