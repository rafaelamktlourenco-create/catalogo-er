import { getStore } from "@netlify/blobs";
import { handleAdmin } from "../../lib/agenda.mjs";

export default async (req) =>
  handleAdmin(
    req,
    getStore({ name: "agenda", consistency: "strong" }),
    Date.now(),
    globalThis.Netlify?.env?.get("ADMIN_SENHA") ?? process.env.ADMIN_SENHA
  );
export const config = { path: "/api/admin" };
