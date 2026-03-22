import { db } from "./db";
import { users } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function findUserByEmail(email: string) {
  const result = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
  return result[0] || null;
}

export async function findUserById(id: string) {
  const result = await db.select().from(users).where(eq(users.id, id));
  return result[0] || null;
}

export async function createUser(data: {
  username: string;
  password: string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
  permissions?: string[];
  isActive?: boolean;
}) {
  const hashedPassword = await hashPassword(data.password);
  const result = await db.insert(users).values({
    username: data.username,
    password: hashedPassword,
    name: data.name,
    email: data.email.toLowerCase(),
    phone: data.phone || null,
    role: data.role || "viewer",
    permissions: data.permissions || [],
    isActive: data.isActive ?? false,
  }).returning();
  return result[0];
}

export async function getAllUsers() {
  return db.select().from(users);
}

export async function updateUser(id: string, data: Partial<{
  name: string;
  email: string;
  phone: string;
  role: string;
  permissions: string[];
  isActive: boolean;
  password: string;
}>) {
  const updateData: any = { ...data };
  if (data.password) {
    updateData.password = await hashPassword(data.password);
  }
  if (data.email) {
    updateData.email = data.email.toLowerCase();
  }
  const result = await db.update(users).set(updateData).where(eq(users.id, id)).returning();
  return result[0];
}

export async function updateLastLogin(id: string) {
  await db.update(users).set({ lastLogin: new Date() }).where(eq(users.id, id));
}

export async function deleteUser(id: string) {
  await db.delete(users).where(eq(users.id, id));
}

export async function seedDefaultUsers() {
  const existing = await db.select().from(users);
  if (existing.length > 0) return;

  const defaults = [
    {
      username: "admin",
      password: "Admin@123",
      name: "Ahmed Al-Admin",
      email: "admin@scapex.sa",
      role: "admin",
      permissions: ["dashboard","ai_control","bi","multi_tenant","company_settings","crm","sales","purchases","accounting","projects","inventory","equipment","engineering","approvals","government","smart_proposal","service_catalog","hr","payroll","mobile_app","attendance","hse","dms","client_portal","approve_registrations","users","system_admin"],
      isActive: true,
    },
    {
      username: "manager",
      password: "Manager@123",
      name: "Sara Manager",
      email: "manager@scapex.sa",
      role: "manager",
      permissions: ["dashboard","crm","sales","purchases","accounting","projects","inventory","equipment","engineering","approvals","government","smart_proposal","service_catalog","bi"],
      isActive: true,
    },
    {
      username: "accountant",
      password: "Account@123",
      name: "Khalid Accountant",
      email: "accountant@scapex.sa",
      role: "accountant",
      permissions: ["dashboard","accounting","purchases","sales","smart_proposal","service_catalog"],
      isActive: true,
    },
    {
      username: "engineer",
      password: "Engineer@123",
      name: "Mohammed Engineer",
      email: "engineer@scapex.sa",
      role: "engineer",
      permissions: ["dashboard","projects","engineering","approvals","equipment","attendance","hse","smart_proposal","service_catalog","crm"],
      isActive: true,
    },
  ];

  for (const user of defaults) {
    await createUser(user);
  }
  console.log("Default users seeded successfully");
}
