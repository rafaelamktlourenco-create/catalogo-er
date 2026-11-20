import { getStore } from "@netlify/blobs";
import { handleAgendar } from "../../lib/agenda.mjs";

export default async (req) => handleAgendar(req, getStore({ name: "agenda", consistency: "strong" }));
export const config = { path: "/api/agendar" };
