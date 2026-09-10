"use server";
import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/firebase/admin";
import { Collections, getDoc } from "@/lib/db/collections";
import { audit } from "@/lib/db/audit";
import { actionUser, actorOf } from "@/lib/auth/session";
import { getSettings } from "@/lib/db/settings";
import { todayISO } from "@/lib/domain/dates";
import { configForToken, getIntakeConfig, submissionsSince } from "@/lib/db/queries/intake";
import { DEFAULT_ORG_ID } from "@/lib/db/org-context";
import {
  ALL_INTAKE_FIELDS, IMAGE_PURPOSE_IDS, INTAKE_DOCS, INTAKE_SECTIONS, INTAKE_SIGNATURE_FIELDS, INTAKE_VERSION,
  isMinorOn, type IntakeField,
} from "@/lib/domain/intake";
import { guard, str, opt, bool, success, fail, type ActionResult } from "./result";
import type { Guardian, IntakeStatus, IntakeSubmission, Practitioner } from "@/lib/db/types";

const MAX_LEN = 600;
const MAX_TEXTAREA = 4000;
const MAX_PER_HOUR = 40;

function limitOf(f: IntakeField) {
  return f.type === "textarea" ? MAX_TEXTAREA : MAX_LEN;
}

/** Protocolo curto e legível: data + sufixo aleatório. */
function protocolFor(today: string) {
  return `${today.slice(2).replace(/-/g, "")}-${randomBytes(2).toString("hex").toUpperCase()}`;
}

/**
 * Recebe a ficha do formulário público. Não exige sessão: a proteção vem do
 * token do link, do campo-isca e do teto de envios por hora.
 */
export async function submitIntake(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const token = str(fd, "token");
    const config = await configForToken(token);
    if (!config) return fail("Este link não está mais válido. Peça um novo à secretaria.");
    if (str(fd, "website")) return success("Recebido."); // campo-isca: robô preenche, pessoa não vê

    const now = Date.now();
    if ((await submissionsSince(now - 60 * 60 * 1000)) >= MAX_PER_HOUR) {
      return fail("Muitos envios agora há pouco. Tente novamente em alguns minutos.");
    }

    const settings = await getSettings();
    const today = todayISO(settings.timezone);
    const answers: Record<string, string> = {};
    for (const f of ALL_INTAKE_FIELDS) {
      const raw = (fd.get(f.id) ?? "").toString().trim();
      if (raw) answers[f.id] = raw.slice(0, limitOf(f));
      if (f.note) {
        const note = (fd.get(`${f.id}_obs`) ?? "").toString().trim();
        if (note) answers[`${f.id}_obs`] = note.slice(0, MAX_TEXTAREA);
      }
    }

    const birthDate = answers.nascimento ?? "";
    const minor = isMinorOn(birthDate, today);

    // Obrigatórios do esquema, incluindo a seção do responsável quando menor.
    for (const section of INTAKE_SECTIONS) {
      if (section.minorOnly && !minor) continue;
      for (const f of section.fields) {
        if (f.required && !answers[f.id]) return fail(`Preencha: ${f.label}.`);
      }
    }
    if (minor) {
      for (const id of ["resp_nome", "resp_telefone", "resp_parentesco"]) {
        if (!answers[id]) return fail(`Preencha os dados do responsável legal: ${ALL_INTAKE_FIELDS.find((f) => f.id === id)?.label}.`);
      }
    }
    for (const f of INTAKE_SIGNATURE_FIELDS) {
      if (f.required && !answers[f.id]) return fail(`Preencha: ${f.label}.`);
    }
    for (const doc of INTAKE_DOCS) {
      for (const c of doc.consents) {
        if (c.required && answers[c.id] !== "sim") return fail(`É preciso aceitar as declarações de "${doc.title}" para enviar.`);
      }
    }
    if (minor && answers.aceite_autorizacao !== "sim") return fail("Para menores de idade, a autorização do responsável é obrigatória.");
    // Autorização de imagem é opcional: sem "sim" explícito, nada é guardado como autorizado.
    if (answers.img_autoriza === "sim") {
      if (answers.img_declaracao !== "sim") return fail("Para autorizar imagem e voz, confirme a leitura do documento.");
      if (!IMAGE_PURPOSE_IDS.some((id) => answers[id] === "sim")) return fail("Marque ao menos uma finalidade da autorização de imagem, ou responda Não à autorização.");
    } else {
      for (const id of [...IMAGE_PURPOSE_IDS, "img_declaracao"]) delete answers[id];
      answers.img_autoriza = "nao";
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return fail("Data de nascimento inválida.");

    const entityName = config.entityName?.trim() || settings.orgName;
    const ref = Collections.intakeSubmissions().doc();
    const submission: IntakeSubmission = {
      id: ref.id,
      protocol: protocolFor(today),
      status: "new",
      version: INTAKE_VERSION,
      answers,
      practitionerName: answers.nome ?? "",
      guardianName: answers.resp_nome ?? null,
      phone: answers.telefone ?? answers.resp_telefone ?? null,
      city: answers.cidade ?? null,
      birthDate,
      minor,
      submittedAt: now,
      internal: null,
      practitionerId: null,
      guardianId: null,
      entityName,
      entityCity: config.entityCity?.trim() || null,
      updatedAt: now,
      updatedBy: null,
    };
    await ref.set(submission);
    revalidatePath("/cadastros");
    return success(submission.protocol, ref.id, `/cadastro/${token}/enviado?p=${submission.protocol}`);
  });
}

/** Gera (ou renova) o link público. Renovar invalida o endereço anterior. */
export async function rotateIntakeLink(_p: ActionResult | null, _fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser("intake.manage");
    const token = randomBytes(9).toString("base64url");
    const previous = await getIntakeConfig();
    const orgId = user.activeOrgId || user.orgId || DEFAULT_ORG_ID;
    // merge: renovar o endereço não pode apagar instituição, cidade e mensagem.
    await Collections.intakeConfig().doc("general").set({
      id: "general", token, active: true, updatedAt: Date.now(), updatedBy: user.id,
    }, { merge: true });
    // Mapa global: é por ele que o formulário aberto descobre a unidade.
    await Collections.publicLinks().doc(token).set({ id: token, orgId, kind: "intake", createdAt: Date.now() });
    if (previous.token) await Collections.publicLinks().doc(previous.token).delete().catch(() => {});
    await audit(actorOf(user), { action: "intake.link.rotate", entity: "intake", entityId: "general", entityLabel: "Link do formulário público", details: { hadPrevious: !!previous.token } });
    revalidatePath("/cadastros");
    return success(previous.token ? "Link novo gerado. O anterior deixou de funcionar." : "Link criado.");
  });
}

/** Instituição dona dos documentos e mensagem de abertura do formulário. */
export async function updateIntakeSettings(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser("intake.manage");
    const before = await getIntakeConfig();
    const after = {
      entityName: (opt(fd, "entityName") ?? "").slice(0, 120),
      entityCity: (opt(fd, "entityCity") ?? "").slice(0, 120),
      intro: (opt(fd, "intro") ?? "").slice(0, 600),
    };
    await Collections.intakeConfig().doc("general").set({ id: "general", ...after, updatedAt: Date.now(), updatedBy: user.id }, { merge: true });
    await audit(actorOf(user), { action: "intake.settings", entity: "intake", entityId: "general", entityLabel: "Formulário público", details: { before: { entityName: before.entityName, entityCity: before.entityCity, intro: before.intro }, after } });
    revalidatePath("/cadastros");
    return success("Configuração salva. Vale para as próximas fichas enviadas.");
  });
}

/** Liga ou desliga o formulário público sem trocar o endereço. */
export async function setIntakeActive(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser("intake.manage");
    const active = bool(fd, "active");
    const config = await getIntakeConfig();
    if (!config.token) return fail("Gere o link antes de ativá-lo.");
    await Collections.intakeConfig().doc("general").set({ active, updatedAt: Date.now(), updatedBy: user.id }, { merge: true });
    await audit(actorOf(user), { action: active ? "intake.link.enable" : "intake.link.disable", entity: "intake", entityId: "general", entityLabel: "Link do formulário público" });
    revalidatePath("/cadastros");
    return success(active ? "Formulário aberto." : "Formulário fechado. O link deixa de responder.");
  });
}

/** Conferência da secretaria: uso interno do formulário e mudança de situação. */
export async function reviewIntake(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser("intake.manage");
    const id = str(fd, "id");
    const sub = await getDoc(Collections.intakeSubmissions(), id);
    if (!sub) return fail("Ficha não encontrada.");
    const status = str(fd, "status") as IntakeStatus;
    if (!["new", "reviewed", "converted", "archived"].includes(status)) return fail("Situação inválida.");
    if (sub.practitionerId && status === "new") return fail("Esta ficha já virou cadastro.");
    const internal = {
      checkedBy: user.name,
      checkedAt: Date.now(),
      medicalDocs: bool(fd, "medicalDocs"),
      medicalRelease: (opt(fd, "medicalRelease") ?? "na") as "sim" | "nao" | "na",
      needsSupport: bool(fd, "needsSupport"),
      supportDescription: opt(fd, "supportDescription"),
      registryStatus: (opt(fd, "registryStatus") ?? "pendente") as "aprovado" | "pendente" | "avaliacao",
      notes: opt(fd, "notes"),
    };
    const before = { status: sub.status, internal: sub.internal };
    await Collections.intakeSubmissions().doc(id).set({ status, internal, updatedAt: Date.now(), updatedBy: user.id }, { merge: true });
    await audit(actorOf(user), { action: "intake.review", entity: "intake", entityId: id, entityLabel: sub.practitionerName, details: { before, after: { status, internal } } });
    revalidatePath("/cadastros");
    revalidatePath(`/cadastros/${id}`);
    return success("Ficha atualizada.");
  });
}

/**
 * Converte a ficha em cadastro: cria o praticante, o responsável quando houver,
 * e guarda o vínculo. Informações de saúde vão para o campo visível à equipe.
 */
export async function convertIntake(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const user = await actionUser(["intake.manage", "practitioners.manage"]);
    const id = str(fd, "id");
    const sub = await getDoc(Collections.intakeSubmissions(), id);
    if (!sub) return fail("Ficha não encontrada.");
    if (sub.practitionerId) return fail("Esta ficha já foi convertida.");
    const a = sub.answers;
    const settings = await getSettings();
    const now = Date.now();
    const batch = db.batch();

    const practitionerRef = Collections.practitioners().doc();
    const alerts = INTAKE_SECTIONS.filter((s) => ["saude", "aptidao", "seguranca"].includes(s.id))
      .flatMap((s) => s.fields.filter((f) => f.type === "yesno" && a[f.id] === "sim").map((f) => `${f.label} ${a[`${f.id}_obs`] ? `— ${a[`${f.id}_obs`]}` : ""}`.trim()));
    const importantInfo = [
      ...alerts,
      a.sau_outras ? `Outras informações de saúde: ${a.sau_outras}` : "",
      a.apt_seguranca ? `Segurança: ${a.apt_seguranca}` : "",
      a.seg_equipamento ? `Equipamento/adaptação: ${a.seg_equipamento}` : "",
      a.seg_observacoes ? `Observações: ${a.seg_observacoes}` : "",
      `Ficha pública ${sub.protocol}${sub.entityName ? ` · ${sub.entityName}` : ""}.`,
    ].filter(Boolean).join("\n");

    const practitioner: Practitioner = {
      id: practitionerRef.id,
      name: sub.practitionerName,
      birthDate: sub.birthDate ?? undefined,
      cpf: a.cpf || undefined,
      address: [a.endereco, a.bairro, a.cidade].filter(Boolean).join(", ") || undefined,
      phone: a.telefone || undefined,
      email: a.email || undefined,
      entryDate: todayISO(settings.timezone),
      status: "active",
      importantInfo,
      additionalContacts: [a.eme_nome && `Emergência: ${a.eme_nome}${a.eme_parentesco ? ` (${a.eme_parentesco})` : ""} ${a.eme_telefone1 ?? ""} ${a.eme_telefone2 ?? ""}`.trim(), a.eme_outro && `${a.eme_outro} ${a.eme_outro_telefone ?? ""}`.trim()].filter(Boolean).join(" · ") || undefined,
      guardianIds: [],
      professionalIds: [],
      mediaConsent: {
        authorized: a.img_autoriza === "sim",
        purposes: IMAGE_PURPOSE_IDS.filter((id) => a[id] === "sim"),
        date: todayISO(settings.timezone),
        source: `Ficha ${sub.protocol}`,
      },
      createdAt: now,
      updatedAt: now,
      createdBy: user.id,
      updatedBy: user.id,
    } as Practitioner;

    let guardianId: string | null = null;
    if (a.resp_nome) {
      const guardianRef = Collections.guardians().doc();
      guardianId = guardianRef.id;
      const guardian: Guardian = {
        id: guardianRef.id,
        name: a.resp_nome,
        cpf: a.resp_cpf || undefined,
        phone: a.resp_telefone || undefined,
        email: a.resp_email || undefined,
        address: practitioner.address,
        relationship: a.resp_parentesco || "Responsável",
        appAccess: false,
        practitionerIds: [practitionerRef.id],
        createdAt: now,
        updatedAt: now,
      };
      practitioner.guardianIds = [guardianRef.id];
      batch.set(guardianRef, guardian);
    }

    batch.set(practitionerRef, practitioner);
    batch.set(Collections.intakeSubmissions().doc(id), {
      status: "converted", practitionerId: practitionerRef.id, guardianId, updatedAt: now, updatedBy: user.id,
    }, { merge: true });
    await audit(actorOf(user), { action: "intake.convert", entity: "intake", entityId: id, entityLabel: sub.practitionerName, details: { practitionerId: practitionerRef.id, guardianId, protocol: sub.protocol } }, batch);
    await batch.commit();

    revalidatePath("/cadastros");
    revalidatePath("/praticantes");
    return success("Praticante cadastrado a partir da ficha.", practitionerRef.id, `/praticantes/${practitionerRef.id}`);
  });
}
