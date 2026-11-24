// ============================================================
//  Sistema de agendamento — regras e lógica (servidor)
//  Altere aqui a grade de horários e os serviços, se precisar.
// ============================================================

export const CONFIG = {
  // Quantos dias à frente a cliente pode agendar
  diasAntecedencia: 30,
  // Antecedência mínima (em horas) entre agora e o início do horário
  antecedenciaMinimaHoras: 2,
  // Fuso de São Paulo (UTC-3, sem horário de verão)
  fusoOffsetHoras: -3,
  // Grade de horários por dia da semana (0=domingo ... 6=sábado)
  grade: {
    2: [["10:00", "12:00"], ["14:00", "16:00"], ["16:00", "18:00"], ["18:00", "20:00"], ["20:00", "22:00"]],
    3: [["10:00", "12:00"], ["14:00", "16:00"], ["16:00", "18:00"], ["18:00", "20:00"], ["20:00", "22:00"]],
    4: [["10:00", "12:00"], ["14:00", "16:00"], ["16:00", "18:00"], ["18:00", "20:00"], ["20:00", "22:00"]],
    5: [["10:00", "12:00"], ["14:00", "16:00"], ["16:00", "18:00"], ["18:00", "20:00"], ["20:00", "22:00"]],
    6: [["10:00", "12:00"], ["12:00", "14:00"]],
  },
  servicos: [
    "Alongamento no Molde F1",
    "Manutenção — até 25 dias",
    "Manutenção — até 30 dias",
    "Manutenção — até 35 dias",
    "Banho de Gel",
    "Esmaltação em Gel",
    "Manicure",
    "Decorações Simples",
    "Decorações em Todos os Dedos",
    "Remoção",
    "Unha quebrada",
  ],
  maxServicosPorReserva: 3,
};

const H = 3600e3;
const DIA = 24 * H;

// ---------- datas no fuso de São Paulo ----------
const local = (epoch) => new Date(epoch + CONFIG.fusoOffsetHoras * H); // usar getters UTC
const pad = (n) => String(n).padStart(2, "0");
export const dataStr = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
export function inicioEpoch(data, hora) {
  const [y, m, d] = data.split("-").map(Number);
  const [hh, mm] = hora.split(":").map(Number);
  return Date.UTC(y, m - 1, d, hh, mm) - CONFIG.fusoOffsetHoras * H;
}
export function diaSemana(data) {
  const [y, m, d] = data.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}
export const chave = (data, inicio) => `slot/${data}/${inicio.replace(":", "-")}`;

/** Datas (YYYY-MM-DD) com atendimento, de hoje (+ offsetIni) até +dias */
export function datasComGrade(now, offsetIni = 0, dias = CONFIG.diasAntecedencia) {
  const hoje = local(now);
  const base = Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate());
  const out = [];
  for (let i = offsetIni; i <= dias; i++) {
    const d = new Date(base + i * DIA);
    if (CONFIG.grade[d.getUTCDay()]) out.push(dataStr(d));
  }
  return out;
}

async function chavesOcupadas(store, datas) {
  const meses = [...new Set(datas.map((d) => d.slice(0, 7)))];
  const set = new Set();
  for (const mes of meses) {
    const { blobs } = await store.list({ prefix: `slot/${mes}` });
    for (const b of blobs) set.add(b.key);
  }
  return set;
}

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

const reservavel = (data, inicio, now) =>
  inicioEpoch(data, inicio) - now >= CONFIG.antecedenciaMinimaHoras * H;

// ============================================================
//  GET /api/horarios  → dias e horários livres (público)
// ============================================================
export async function handleHorarios(req, store, now = Date.now()) {
  if (req.method !== "GET") return json({ erro: "Método não permitido" }, 405);
  const datas = datasComGrade(now);
  const ocupadas = await chavesOcupadas(store, datas);
  const dias = datas.map((data) => ({
    data,
    slots: CONFIG.grade[diaSemana(data)].map(([inicio, fim]) => ({
      inicio,
      fim,
      livre: !ocupadas.has(chave(data, inicio)) && reservavel(data, inicio, now),
    })),
  }));
  return json({ dias, servicos: CONFIG.servicos, maxServicos: CONFIG.maxServicosPorReserva });
}

// ============================================================
//  POST /api/agendar  → cria a reserva e bloqueia o horário
// ============================================================
export async function handleAgendar(req, store, now = Date.now()) {
  if (req.method !== "POST") return json({ erro: "Método não permitido" }, 405);
  let b;
  try { b = await req.json(); } catch { return json({ erro: "Dados inválidos." }, 400); }
  if (b.site) return json({ erro: "Dados inválidos." }, 400); // anti-spam (campo oculto)

  const data = String(b.data || "");
  const inicio = String(b.inicio || "");
  const nome = String(b.nome || "").trim().replace(/\s+/g, " ");
  const telefone = String(b.telefone || "").replace(/\D/g, "");
  const servicos = Array.isArray(b.servicos) ? [...new Set(b.servicos.map(String))] : [];

  if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || !datasComGrade(now).includes(data))
    return json({ erro: "Escolha um dia disponível." }, 400);
  const slot = (CONFIG.grade[diaSemana(data)] || []).find(([i]) => i === inicio);
  if (!slot) return json({ erro: "Escolha um horário disponível." }, 400);
  if (!reservavel(data, inicio, now))
    return json({ erro: "Esse horário não está mais disponível. Escolha outro, por favor." }, 409);
  if (nome.length < 2 || nome.length > 60) return json({ erro: "Informe seu nome." }, 400);
  if (telefone.length < 10 || telefone.length > 13) return json({ erro: "Informe um WhatsApp válido com DDD." }, 400);
  if (!servicos.length || servicos.length > CONFIG.maxServicosPorReserva || !servicos.every((s) => CONFIG.servicos.includes(s)))
    return json({ erro: "Escolha o serviço desejado." }, 400);

  const reserva = {
    tipo: "reserva",
    id: `${data}-${inicio}-${Math.random().toString(36).slice(2, 8)}`,
    data, inicio, fim: slot[1], nome, telefone, servicos,
    criadoEm: new Date(now).toISOString(),
  };
  const { modified } = await store.setJSON(chave(data, inicio), reserva, { onlyIfNew: true });
  if (!modified)
    return json({ erro: "Esse horário acabou de ser reservado por outra cliente. Escolha outro, por favor." }, 409);

  return json({ ok: true, reserva: { data, inicio, fim: slot[1], nome, servicos } }, 201);
}

// ============================================================
//  POST /api/admin  → painel da nail designer (com senha)
// ============================================================
function senhaOk(recebida, correta) {
  if (!correta || typeof recebida !== "string") return false;
  if (recebida.length !== correta.length) return false;
  let r = 0;
  for (let i = 0; i < correta.length; i++) r |= recebida.charCodeAt(i) ^ correta.charCodeAt(i);
  return r === 0;
}

export async function handleAdmin(req, store, now = Date.now(), senhaCorreta) {
  if (req.method !== "POST") return json({ erro: "Método não permitido" }, 405);
  if (!senhaCorreta) return json({ erro: "Senha do painel não configurada no Netlify (ADMIN_SENHA)." }, 500);
  if (!senhaOk(req.headers.get("x-admin-senha"), senhaCorreta)) return json({ erro: "Senha incorreta." }, 401);

  let b;
  try { b = await req.json(); } catch { b = {}; }
  const acao = b.acao || "listar";
  const data = String(b.data || "");
  const inicio = String(b.inicio || "");
  const validaData = () => /^\d{4}-\d{2}-\d{2}$/.test(data) && CONFIG.grade[diaSemana(data)];

  if (acao === "listar") {
    const datas = datasComGrade(now, -1, 60);
    const ocupadas = await chavesOcupadas(store, datas);
    const dias = [];
    for (const d of datas) {
      const slots = [];
      for (const [i, f] of CONFIG.grade[diaSemana(d)]) {
        const k = chave(d, i);
        const reg = ocupadas.has(k) ? await store.get(k, { type: "json" }) : null;
        slots.push({ inicio: i, fim: f, registro: reg, passado: inicioEpoch(d, i) < now });
      }
      dias.push({ data: d, slots });
    }
    return json({ dias });
  }

  if (!validaData()) return json({ erro: "Data inválida." }, 400);
  const gradeDia = CONFIG.grade[diaSemana(data)];

  if (acao === "cancelar" || acao === "desbloquear") {
    if (!gradeDia.some(([i]) => i === inicio)) return json({ erro: "Horário inválido." }, 400);
    await store.delete(chave(data, inicio));
    return json({ ok: true });
  }
  if (acao === "bloquear") {
    if (!gradeDia.some(([i]) => i === inicio)) return json({ erro: "Horário inválido." }, 400);
    const nota = String(b.nota || "").slice(0, 80);
    const { modified } = await store.setJSON(chave(data, inicio),
      { tipo: "bloqueio", nota, data, inicio, criadoEm: new Date(now).toISOString() }, { onlyIfNew: true });
    if (!modified) return json({ erro: "Esse horário já está ocupado." }, 409);
    return json({ ok: true });
  }
  if (acao === "bloquearDia") {
    for (const [i] of gradeDia)
      await store.setJSON(chave(data, i), { tipo: "bloqueio", nota: "Dia bloqueado", data, inicio: i,
        criadoEm: new Date(now).toISOString() }, { onlyIfNew: true });
    return json({ ok: true });
  }
  if (acao === "desbloquearDia") {
    for (const [i] of gradeDia) {
      const k = chave(data, i);
      const reg = await store.get(k, { type: "json" });
      if (reg && reg.tipo === "bloqueio") await store.delete(k);
    }
    return json({ ok: true });
  }
  return json({ erro: "Ação desconhecida." }, 400);
}
