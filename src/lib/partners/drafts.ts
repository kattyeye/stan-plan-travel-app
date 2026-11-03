import { randomBytes } from "crypto";
import { getKV } from "../kv";
import type { PartnerRef, PropertyContext, WizardData } from "@/types/trip";

/**
 * A draft is a partially filled wizard that a partner prepares for a guest
 * (listing, dates, party size). The guest opens /wizard?draft=<id>, finishes
 * their preferences, and pays. Property and partner attribution are re-read
 * server-side at checkout, so the guest's browser can't alter them.
 */
export interface TripDraft {
  id: string;
  wizard: Partial<WizardData>;
  property?: PropertyContext;
  partner?: PartnerRef;
  createdAt: string;
}

const draftKey = (id: string) => `draft:${id}`;
const TTL = 60 * 60 * 24 * 60; // 60 days — guests often plan weeks after booking

export async function createDraft(input: Omit<TripDraft, "id" | "createdAt">): Promise<TripDraft> {
  const draft: TripDraft = { ...input, id: randomBytes(9).toString("base64url"), createdAt: new Date().toISOString() };
  await getKV().set(draftKey(draft.id), draft, { ex: TTL });
  return draft;
}

export async function getDraft(id: string): Promise<TripDraft | null> {
  if (!/^[A-Za-z0-9_-]{8,32}$/.test(id)) return null;
  return getKV().get<TripDraft>(draftKey(id));
}
