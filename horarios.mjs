import { getStore } from "@netlify/blobs";
import { handleHorarios } from "../../lib/agenda.mjs";

export default async (req) => handleHorarios(req, getStore({ name: "agenda", consistency: "strong" }));
export const config = { path: "/api/horarios" };
