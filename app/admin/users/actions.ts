'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import { requireRole, APP_ROLES, type AppRole } from '@/lib/auth';
import { Role } from '@prisma/client';

function clean(value: FormDataEntryValue | null) {
  return String(value || '').trim();
}

function roleFromForm(value: FormDataEntryValue | null): Role {
  const role = clean(value).toUpperCase() as AppRole;
  if (!APP_ROLES.includes(role)) throw new Error('Invalid user role.');
  return role as Role;
}

function usernameFromForm(value: FormDataEntryValue | null) {
  const username = clean(value).toLowerCase();
  if (!/^[a-z0-9._-]{3,40}$/.test(username)) throw new Error('Username must be 3-40 characters and use letters, numbers, dots, underscores, or hyphens.');
  return username;
}

export async function createUser(formData: FormData) {
  const current = await requireRole(['ADMIN', 'OWNER']);
  const name = clean(formData.get('name'));
  const username = usernameFromForm(formData.get('username'));
  const email = clean(formData.get('email')).toLowerCase() || `${username}@smokehouse.local`;
  const password = String(formData.get('password') || '');
  const role = roleFromForm(formData.get('role'));
  if (!name) throw new Error('Name is required.');
  if (password.length < 8) throw new Error('Password must be at least 8 characters.');
  const existing = await prisma.user.findFirst({ where: { OR: [{ username }, { email }] } });
  if (existing) throw new Error('That username or email is already in use.');
  await prisma.user.create({
    data: { name, username, email, passwordHash: hashPassword(password), role, active: true, createdBy: current.name || 'Admin' }
  });
  revalidatePath('/admin/users');
}

export async function updateUserAccess(formData: FormData) {
  await requireRole(['ADMIN', 'OWNER']);
  const id = clean(formData.get('id'));
  const role = roleFromForm(formData.get('role'));
  const active = formData.get('active') === 'on';
  await prisma.user.update({ where: { id }, data: { role, active } });
  revalidatePath('/admin/users');
}

export async function resetUserPassword(formData: FormData) {
  await requireRole(['ADMIN', 'OWNER']);
  const id = clean(formData.get('id'));
  const password = String(formData.get('password') || '');
  if (password.length < 8) throw new Error('Password must be at least 8 characters.');
  await prisma.user.update({ where: { id }, data: { passwordHash: hashPassword(password) } });
  revalidatePath('/admin/users');
}
