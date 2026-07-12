'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { auditLog, currentRestaurantForUser } from '@/lib/tenant';

function text(formData: FormData, key: string, fallback = '') {
  return String(formData.get(key) || fallback).trim();
}

function num(formData: FormData, key: string, fallback = 0) {
  const value = Number(formData.get(key));
  return Number.isFinite(value) ? value : fallback;
}

function parseJson(value: string | null | undefined) {
  if (!value) return null;
  try { return JSON.parse(value); } catch { return null; }
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

async function applyRecommendation(args: {
  restaurantId: string;
  userId: string;
  userName: string;
  recommendationId: string;
  targetEntity: string | null;
  targetId: string | null;
  settingKey: string | null;
  afterJson: string | null;
}) {
  const after = parseJson(args.afterJson || '');
  if (!after) throw new Error('Recommendation has no setting change payload.');

  if (args.targetEntity === 'DayMultiplier') {
    const targetId = args.targetId || after.id;
    const newValue = Number(after.multiplier ?? after.newValue);
    if (!targetId || !Number.isFinite(newValue)) throw new Error('Invalid day multiplier recommendation payload.');
    const before = await prisma.dayMultiplier.findFirst({ where: { id: targetId, restaurantId: args.restaurantId } });
    if (!before) throw new Error('Day multiplier not found for this restaurant.');
    await prisma.dayMultiplier.updateMany({ where: { id: targetId, restaurantId: args.restaurantId }, data: { multiplier: clamp(newValue, 0.1, 3), updatedBy: args.userName } });
    await auditLog({ restaurantId: args.restaurantId, actorUserId: args.userId, actorName: args.userName, action: 'APPLY_RECOMMENDATION', entity: 'DayMultiplier', entityId: targetId, beforeJson: before, afterJson: { ...before, multiplier: clamp(newValue, 0.1, 3), updatedBy: args.userName, recommendationId: args.recommendationId } });
    return;
  }

  if (args.targetEntity === 'ForecastScenario') {
    const targetId = args.targetId || after.id;
    if (!targetId) throw new Error('Invalid scenario recommendation payload.');
    const before = await prisma.forecastScenario.findFirst({ where: { id: targetId, restaurantId: args.restaurantId } });
    if (!before) throw new Error('Forecast scenario not found for this restaurant.');
    const allowedKeys = ['safetyFactorPct', 'brisketMixPct', 'porkMixPct', 'ribsMixPct', 'chickenMixPct'] as const;
    const data: any = { updatedBy: args.userName };
    for (const key of allowedKeys) {
      if (Object.prototype.hasOwnProperty.call(after, key)) {
        data[key] = clamp(Number(after[key]), key === 'safetyFactorPct' ? 0 : 0, key === 'safetyFactorPct' ? 50 : 100);
      }
    }
    if (Object.keys(data).length <= 1) throw new Error('Scenario recommendation has no supported setting changes.');
    await prisma.forecastScenario.updateMany({ where: { id: targetId, restaurantId: args.restaurantId }, data });
    await auditLog({ restaurantId: args.restaurantId, actorUserId: args.userId, actorName: args.userName, action: 'APPLY_RECOMMENDATION', entity: 'ForecastScenario', entityId: targetId, beforeJson: before, afterJson: { ...data, recommendationId: args.recommendationId } });
    return;
  }

  throw new Error(`Unsupported recommendation target: ${args.targetEntity || 'none'}.`);
}

async function rollbackRecommendation(args: { restaurantId: string; userId: string; userName: string; recommendation: any }) {
  const before = parseJson(args.recommendation.beforeJson || '');
  if (!before) throw new Error('Recommendation has no rollback payload.');

  if (args.recommendation.targetEntity === 'DayMultiplier') {
    const id = args.recommendation.targetId || before.id;
    const previousMultiplier = Number(before.multiplier ?? before.oldValue);
    if (!id || !Number.isFinite(previousMultiplier)) throw new Error('Invalid day multiplier rollback payload.');
    const current = await prisma.dayMultiplier.findFirst({ where: { id, restaurantId: args.restaurantId } });
    if (!current) throw new Error('Day multiplier not found for rollback.');
    await prisma.dayMultiplier.updateMany({ where: { id, restaurantId: args.restaurantId }, data: { multiplier: clamp(previousMultiplier, 0.1, 3), updatedBy: args.userName } });
    await auditLog({ restaurantId: args.restaurantId, actorUserId: args.userId, actorName: args.userName, action: 'ROLLBACK_RECOMMENDATION', entity: 'DayMultiplier', entityId: id, beforeJson: current, afterJson: { ...current, multiplier: previousMultiplier, rollbackRecommendationId: args.recommendation.id } });
    return;
  }

  if (args.recommendation.targetEntity === 'ForecastScenario') {
    const id = args.recommendation.targetId || before.id;
    if (!id) throw new Error('Invalid scenario rollback payload.');
    const current = await prisma.forecastScenario.findFirst({ where: { id, restaurantId: args.restaurantId } });
    if (!current) throw new Error('Forecast scenario not found for rollback.');
    const data: any = { updatedBy: args.userName };
    for (const key of ['safetyFactorPct', 'brisketMixPct', 'porkMixPct', 'ribsMixPct', 'chickenMixPct']) {
      if (Object.prototype.hasOwnProperty.call(before, key)) data[key] = Number(before[key]);
    }
    if (Object.keys(data).length <= 1) throw new Error('Scenario rollback has no supported setting values.');
    await prisma.forecastScenario.updateMany({ where: { id, restaurantId: args.restaurantId }, data });
    await auditLog({ restaurantId: args.restaurantId, actorUserId: args.userId, actorName: args.userName, action: 'ROLLBACK_RECOMMENDATION', entity: 'ForecastScenario', entityId: id, beforeJson: current, afterJson: { ...data, rollbackRecommendationId: args.recommendation.id } });
    return;
  }

  throw new Error(`Unsupported rollback target: ${args.recommendation.targetEntity || 'none'}.`);
}

export async function saveLearningRecommendation(formData: FormData) {
  const user = await requireRole(['ADMIN', 'OWNER', 'KITCHEN_MANAGER']);
  const restaurant = await currentRestaurantForUser(user);
  const restaurantId = restaurant.id;
  const title = text(formData, 'title');
  const recommendation = text(formData, 'recommendation');
  if (!title || !recommendation) throw new Error('Recommendation title and detail are required.');
  const saved = await prisma.learningRecommendation.create({
    data: {
      restaurantId,
      type: text(formData, 'type', 'FORECAST'),
      title,
      recommendation,
      targetEntity: text(formData, 'targetEntity'),
      targetId: text(formData, 'targetId'),
      settingKey: text(formData, 'settingKey'),
      beforeJson: text(formData, 'beforeJson'),
      afterJson: text(formData, 'afterJson'),
      confidence: text(formData, 'confidence', 'LOW'),
      sampleCount: Math.round(num(formData, 'sampleCount', 0)),
      minimumSampleCount: Math.round(num(formData, 'minimumSampleCount', 0)),
      createdBy: user.name
    }
  });
  await auditLog({ restaurantId, actorUserId: user.id, actorName: user.name, action: 'CREATE', entity: 'LearningRecommendation', entityId: saved.id, afterJson: saved });
  revalidatePath('/learning');
}

export async function decideLearningRecommendation(formData: FormData) {
  const user = await requireRole(['ADMIN', 'OWNER']);
  const restaurant = await currentRestaurantForUser(user);
  const restaurantId = restaurant.id;
  const id = text(formData, 'id');
  const decisionRaw = text(formData, 'decision').toUpperCase();
  const before = await prisma.learningRecommendation.findFirst({ where: { id, restaurantId } });
  if (!before) throw new Error('Recommendation not found for this restaurant.');
  if (before.status !== 'PENDING') throw new Error('Only pending recommendations can be decided.');

  if (decisionRaw === 'ACCEPTED') {
    await applyRecommendation({ restaurantId, userId: user.id, userName: user.name, recommendationId: id, targetEntity: before.targetEntity, targetId: before.targetId, settingKey: before.settingKey, afterJson: before.afterJson });
  }

  const decision = decisionRaw === 'ACCEPTED' ? 'ACCEPTED' : 'REJECTED';
  await prisma.learningRecommendation.updateMany({
    where: { id, restaurantId },
    data: { status: decision, decidedBy: user.name, decidedAt: new Date(), appliedAt: decision === 'ACCEPTED' ? new Date() : null }
  });
  await auditLog({ restaurantId, actorUserId: user.id, actorName: user.name, action: decision, entity: 'LearningRecommendation', entityId: id, beforeJson: before, afterJson: { status: decision, decidedBy: user.name } });
  revalidatePath('/learning');
  revalidatePath('/settings');
  revalidatePath('/cook-plan');
}

export async function rollbackLearningRecommendation(formData: FormData) {
  const user = await requireRole(['ADMIN', 'OWNER']);
  const restaurant = await currentRestaurantForUser(user);
  const restaurantId = restaurant.id;
  const id = text(formData, 'id');
  const recommendation = await prisma.learningRecommendation.findFirst({ where: { id, restaurantId } });
  if (!recommendation) throw new Error('Recommendation not found for this restaurant.');
  if (recommendation.status !== 'ACCEPTED' || !recommendation.appliedAt) throw new Error('Only applied recommendations can be rolled back.');
  if (recommendation.rolledBackAt) throw new Error('Recommendation has already been rolled back.');
  await rollbackRecommendation({ restaurantId, userId: user.id, userName: user.name, recommendation });
  await prisma.learningRecommendation.updateMany({ where: { id, restaurantId }, data: { status: 'ROLLED_BACK', rolledBackAt: new Date(), rollbackBy: user.name } });
  await auditLog({ restaurantId, actorUserId: user.id, actorName: user.name, action: 'ROLLBACK', entity: 'LearningRecommendation', entityId: id, beforeJson: recommendation, afterJson: { status: 'ROLLED_BACK', rollbackBy: user.name } });
  revalidatePath('/learning');
  revalidatePath('/settings');
  revalidatePath('/cook-plan');
}
