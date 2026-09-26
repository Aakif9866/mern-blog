import type { Request, Response } from "express";
import * as mod from "../services/moderation.service";
import { body, params, query } from "../middleware/validate";
import type { Role } from "../models/User";

const id = (req: Request) => params<{ id: string }>(req).id;

export async function report(req: Request, res: Response) {
  res.status(201).json(await mod.createReport(req.user!, body(req)));
}
export async function reports(req: Request, res: Response) {
  res.json(await mod.listReports(query(req)));
}
export async function resolve(req: Request, res: Response) {
  const b = body<{ action: mod.ModAction; note?: string; suspendDays?: number }>(req);
  res.json(await mod.resolveReport(req.user!, id(req), b.action, b.note, b.suspendDays));
}
export async function users(req: Request, res: Response) {
  res.json(await mod.listUsers(query(req)));
}
export async function setStatus(req: Request, res: Response) {
  const b = body<{ status: "active" | "suspended" | "banned"; note?: string; days?: number }>(req);
  const user = await mod.setUserStatus(req.user!, id(req), b.status, b.note, b.days);
  res.json({ _id: user._id, status: user.status, suspendedUntil: user.suspendedUntil });
}
export async function setRole(req: Request, res: Response) {
  const user = await mod.setUserRole(req.user!, id(req), body<{ role: Role }>(req).role);
  res.json({ _id: user._id, role: user.role });
}
export async function analytics(_req: Request, res: Response) {
  res.json(await mod.analytics());
}
