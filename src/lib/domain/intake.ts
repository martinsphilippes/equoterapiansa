/**
 * Ficha pública de cadastro, saúde e aptidão.
 *
 * O formulário é declarado aqui como dados, não como tela: a página pública, a
 * validação no servidor e a versão impressa leem o mesmo esquema. Incluir ou
 * mudar uma pergunta é mexer só nesta lista, e as fichas antigas continuam
 * legíveis porque cada envio guarda a versão com que foi preenchido.
 */

export type IntakeFieldType = "text" | "textarea" | "date" | "tel" | "email" | "cpf" | "measure" | "yesno" | "choice" | "consent";

export interface IntakeField {
  id: string;
  label: string;
  type: IntakeFieldType;
  required?: boolean;
  hint?: string;
  placeholder?: string;
  /** Opções de "choice". */
  options?: string[];
  /** Campo sim/não com "Qual/observação" quando a resposta é sim. */
  note?: boolean;
  noteLabel?: string;
  /** Ocupa a linha inteira no formulário. */
  wide?: boolean;
}

export type IntakeDocId = "ficha" | "imagem" | "termo";

export interface IntakeSection {
  id: string;
  /** Documento a que a seção pertence. */
  doc: IntakeDocId;
  title: string;
  description?: string;
  /** Texto de aviso exibido ao fim da seção (também sai na impressão). */
  notice?: string;
  /** Seção exigida apenas quando o aluno é menor de idade. */
  minorOnly?: boolean;
  fields: IntakeField[];
}

export const INTAKE_VERSION = 2;
export const INTAKE_TITLE = "Cadastro, saúde, imagem e termo de ciência";

const yesNo = (id: string, label: string, noteLabel = "Qual/observação"): IntakeField => ({ id, label, type: "yesno", note: true, noteLabel, wide: true });

export const INTAKE_SECTIONS: IntakeSection[] = [
  {
    id: "aluno",
    doc: "ficha",
    title: "Dados do praticante",
    description: "A idade é calculada pela data de nascimento.",
    fields: [
      { id: "nome", label: "Nome completo", type: "text", required: true, wide: true },
      { id: "nascimento", label: "Data de nascimento", type: "date", required: true },
      { id: "cpf", label: "CPF", type: "cpf" },
      { id: "rg", label: "RG", type: "text" },
      { id: "telefone", label: "Telefone / WhatsApp", type: "tel", required: true },
      { id: "email", label: "E-mail", type: "email" },
      { id: "endereco", label: "Endereço", type: "text", wide: true },
      { id: "bairro", label: "Bairro", type: "text" },
      { id: "cidade", label: "Cidade", type: "text" },
      { id: "ocupacao", label: "Profissão / ocupação", type: "text" },
    ],
  },
  {
    id: "responsavel",
    doc: "ficha",
    title: "Responsável legal",
    description: "Obrigatório quando o praticante é menor de 18 anos.",
    minorOnly: true,
    fields: [
      { id: "resp_nome", label: "Nome completo do responsável", type: "text", wide: true },
      { id: "resp_cpf", label: "CPF", type: "cpf" },
      { id: "resp_rg", label: "RG", type: "text" },
      { id: "resp_parentesco", label: "Parentesco", type: "text" },
      { id: "resp_telefone", label: "Telefone / WhatsApp", type: "tel" },
      { id: "resp_email", label: "E-mail", type: "email" },
    ],
  },
  {
    id: "emergencia",
    doc: "ficha",
    title: "Contato para emergência",
    fields: [
      { id: "eme_nome", label: "Nome", type: "text", required: true, wide: true },
      { id: "eme_parentesco", label: "Parentesco", type: "text" },
      { id: "eme_telefone1", label: "Telefone 1", type: "tel", required: true },
      { id: "eme_telefone2", label: "Telefone 2", type: "tel" },
      { id: "eme_outro", label: "Outro contato de emergência", type: "text" },
      { id: "eme_outro_telefone", label: "Telefone", type: "tel" },
    ],
  },
  {
    id: "saude",
    doc: "ficha",
    title: "Informações de saúde",
    description: "As informações devem ser verdadeiras e atualizadas, para que a equipe conheça possíveis limitações ou cuidados necessários durante as atividades.",
    fields: [
      yesNo("sau_condicao", "Possui alguma condição de saúde que possa interferir na prática?"),
      yesNo("sau_cronica", "Possui alguma doença ou condição crônica?"),
      yesNo("sau_cardio", "Possui problemas cardíacos ou respiratórios?"),
      yesNo("sau_coluna", "Possui problemas de coluna, ossos, articulações ou musculares?"),
      yesNo("sau_fraturas", "Já sofreu fraturas ou lesões importantes?"),
      yesNo("sau_equilibrio", "Possui alguma limitação de movimento ou equilíbrio?"),
      yesNo("sau_alergias", "Possui alergias?"),
      yesNo("sau_alergia_medicamento", "Possui alergia a medicamentos?"),
      yesNo("sau_medicamentos", "Utiliza medicamentos de uso contínuo?"),
      { id: "sau_outras", label: "Outra condição ou informação de saúde importante", type: "textarea", wide: true },
    ],
  },
  {
    id: "historico",
    doc: "ficha",
    title: "Histórico de acidentes e quedas",
    fields: [
      { id: "his_praticou", label: "Já praticou equitação anteriormente?", type: "yesno", wide: true },
      { id: "his_tempo", label: "Há quanto tempo / praticou por quanto tempo", type: "text", wide: true },
      { id: "his_queda", label: "Já sofreu queda de cavalo?", type: "yesno", wide: true },
      { id: "his_acidente", label: "Já sofreu algum acidente relacionado à equitação ou outro esporte?", type: "yesno", wide: true },
      { id: "his_descricao", label: "Se sim, descreva", type: "textarea", wide: true },
    ],
  },
  {
    id: "aptidao",
    doc: "ficha",
    title: "Aptidão para a prática",
    notice: "A prática envolve riscos inerentes à atividade e exige atenção às orientações dos profissionais responsáveis. Qualquer alteração no estado de saúde, lesão, recomendação médica ou outra condição que possa interferir na prática deverá ser comunicada antes da aula.",
    fields: [
      { id: "apt_autorizacao", label: "Possui autorização médica para realizar atividades físicas?", type: "choice", options: ["Sim", "Não", "Não se aplica"], required: true, wide: true },
      yesNo("apt_restricao", "Existe alguma recomendação médica ou restrição para atividades físicas?"),
      yesNo("apt_evitar", "Existe alguma atividade ou movimento que deve ser evitado?"),
      yesNo("apt_recomendacao", "Existe alguma recomendação específica para a prática?"),
      { id: "apt_seguranca", label: "Informação adicional que possa influenciar a segurança", type: "textarea", wide: true },
    ],
  },
  {
    id: "seguranca",
    doc: "ficha",
    title: "Medidas e informações para segurança",
    fields: [
      { id: "seg_altura", label: "Altura", type: "measure", placeholder: "Ex.: 1,62 m" },
      { id: "seg_peso", label: "Peso aproximado", type: "measure", placeholder: "Ex.: 58 kg" },
      yesNo("seg_montar", "Possui alguma dificuldade para montar ou desmontar do cavalo?"),
      yesNo("seg_auxilio", "Necessita de algum auxílio ou adaptação durante a atividade?"),
      yesNo("seg_ortese", "Utiliza órtese, prótese, aparelho ou outro equipamento?"),
      { id: "seg_equipamento", label: "Qual equipamento / adaptação", type: "text", wide: true },
      { id: "seg_observacoes", label: "Outras observações importantes", type: "textarea", wide: true },
    ],
  },
  {
    id: "imagem_uso",
    doc: "imagem",
    title: "Autorização de imagem e voz",
    description: "A autorização é opcional e pode ser recusada sem prejuízo à participação nas atividades.",
    fields: [
      { id: "img_autoriza", label: "Autoriza a captação e o uso de imagem e voz?", type: "yesno", wide: true },
      { id: "img_fin_atividades", label: "Divulgação das atividades e aulas da instituição", type: "consent", wide: true },
      { id: "img_fin_redes", label: "Publicações nas redes sociais e plataformas digitais da instituição", type: "consent", wide: true },
      { id: "img_fin_graficos", label: "Materiais gráficos, cartazes, folders e materiais institucionais", type: "consent", wide: true },
      { id: "img_fin_eventos", label: "Divulgação de eventos, projetos e ações realizadas pela instituição", type: "consent", wide: true },
      { id: "img_fin_site", label: "Site, apresentações e demais materiais de divulgação institucional", type: "consent", wide: true },
    ],
  },
];

/** Finalidades da autorização de imagem, na ordem do documento. */
export const IMAGE_PURPOSE_IDS = ["img_fin_atividades", "img_fin_redes", "img_fin_graficos", "img_fin_eventos", "img_fin_site"];

/** Declarações do termo, exibidas como texto e aceitas em bloco. */
export const INTAKE_DECLARATIONS = [
  "Declaro que as informações prestadas neste formulário são verdadeiras, completas e atualizadas.",
  "Declaro ainda que informei sobre quaisquer condições de saúde, limitações físicas, alergias, medicamentos, lesões ou outras situações que possam interferir na segurança e na prática.",
  "Comprometo-me a comunicar imediatamente qualquer alteração no estado de saúde do praticante que possa modificar sua capacidade ou segurança para participar das atividades.",
  "Estou ciente de que a prática envolve riscos próprios da atividade e que devo seguir todas as orientações de segurança fornecidas pelos profissionais responsáveis, incluindo o uso dos equipamentos de proteção indicados.",
  "Quando necessário, comprometo-me a apresentar atestado ou liberação médica para a prática de atividades físicas.",
];

export const INTAKE_PRIVACY = "Estou ciente de que as informações fornecidas serão utilizadas para fins de cadastro, planejamento das atividades e segurança do praticante, sendo tratadas de acordo com as normas aplicáveis de proteção de dados.";

/** Campos do aceite eletrônico (substituem a assinatura no papel). */
export const INTAKE_SIGNATURE_FIELDS: IntakeField[] = [
  { id: "assin_nome", label: "Nome de quem preenche", type: "text", required: true, wide: true },
  { id: "assin_cpf", label: "CPF de quem preenche", type: "cpf", required: true },
  { id: "assin_qualidade", label: "Preenchendo como", type: "choice", options: ["Próprio praticante", "Responsável legal", "Outro"], required: true },
];

/**
 * Os três documentos que a ficha reúne. A identificação é preenchida uma vez e
 * repetida nos demais na impressão, como no papel.
 * `{org}` é trocado pelo nome da instituição configurado no sistema.
 */
export interface IntakeDoc {
  id: IntakeDocId;
  title: string;
  purpose: string;
  /** Parágrafos antes dos aceites. */
  declarations: string[];
  /** Observações ao pé do documento. */
  closing?: string[];
  consents: IntakeField[];
  /** Documento que a pessoa pode recusar sem impedir a participação. */
  optional?: boolean;
  /** Ainda faltam cláusulas a transcrever do documento em papel. */
  incomplete?: boolean;
}

export const INTAKE_DOCS: IntakeDoc[] = [
  {
    id: "ficha",
    title: "Formulário de cadastro, saúde e aptidão",
    purpose: "Dados do praticante, contatos, saúde e condições para a prática.",
    declarations: INTAKE_DECLARATIONS,
    consents: [
      { id: "aceite_declaracoes", label: "Li e concordo com as declarações acima.", type: "consent", required: true, wide: true },
      { id: "aceite_privacidade", label: "Concordo com o uso dos dados descrito acima.", type: "consent", required: true, wide: true },
      { id: "aceite_autorizacao", label: "Na qualidade de responsável legal, autorizo a participação do praticante nas atividades, observadas as orientações e normas de segurança da instituição.", type: "consent", wide: true },
    ],
  },
  {
    id: "imagem",
    title: "Autorização para captação e uso de imagem e voz",
    purpose: "Opcional. Recusar não impede a participação nas atividades.",
    optional: true,
    declarations: [
      "Autorizo a {org} a realizar a captação de fotografias, vídeos, áudios e demais registros de imagem e voz durante as aulas, atividades, eventos, projetos e demais ações realizadas pela instituição.",
      "Autorizo, de forma gratuita, a utilização desses registros para fins institucionais, informativos e de divulgação das atividades da {org}, incluindo materiais impressos e meios digitais.",
      "Declaro estar ciente de que a imagem e/ou voz do praticante poderá aparecer de forma individual ou juntamente com outras pessoas nos registros realizados durante as atividades da {org}.",
      "A presente autorização não permite a utilização da imagem ou voz para finalidade ofensiva, discriminatória ou que possa causar prejuízo à honra, à reputação ou à dignidade do praticante.",
      "A {org} compromete-se a utilizar os registros de maneira compatível com as finalidades institucionais e de divulgação autorizadas neste documento.",
      "A autorização é concedida por prazo indeterminado, podendo o titular ou seu responsável legal solicitar, por escrito, que novas utilizações futuras sejam interrompidas, observadas as situações em que a retirada não seja tecnicamente possível ou em que o material já tenha sido produzido, publicado ou distribuído.",
    ],
    closing: [
      "Declaro que li e compreendi integralmente este documento e estou de acordo com a captação e utilização da imagem e voz nas condições aqui estabelecidas.",
      "Declaro ainda que as informações fornecidas são verdadeiras e que possuo autorização legal para conceder este consentimento quando se tratar de praticante menor de idade.",
    ],
    consents: [
      { id: "img_declaracao", label: "Li e compreendi este documento e estou de acordo com as condições acima.", type: "consent", wide: true },
    ],
  },
  {
    id: "termo",
    title: "Termo de ciência e responsabilidade para a prática",
    purpose: "Ciência dos riscos próprios da atividade com animais.",
    incomplete: true,
    declarations: [
      "Declaro que fui devidamente informado de que a equitação é uma atividade que envolve interação direta com animais e possui riscos próprios, podendo ocorrer situações imprevisíveis, mesmo quando todas as orientações de segurança são seguidas.",
      "Estou ciente de que o comportamento do cavalo pode sofrer alterações em razão de fatores como ambiente, clima, estímulos externos, movimentos inesperados ou outras situações próprias da atividade.",
    ],
    closing: [
      "Este documento deve ser preenchido pelo praticante maior de idade ou, no caso de menor de idade, por seu responsável legal.",
    ],
    consents: [
      { id: "termo_ciencia", label: "Declaro estar ciente do conteúdo deste termo e assumo o compromisso de seguir as orientações de segurança da instituição.", type: "consent", required: true, wide: true },
    ],
  },
];

export function docById(id: IntakeDocId): IntakeDoc {
  return INTAKE_DOCS.find((d) => d.id === id)!;
}

/** Troca o marcador pelo nome da instituição configurado. */
export function withOrg(text: string, orgName: string): string {
  return text.replaceAll("{org}", orgName);
}

export const ALL_INTAKE_FIELDS: IntakeField[] = [
  ...INTAKE_SECTIONS.flatMap((s) => s.fields),
  ...INTAKE_SIGNATURE_FIELDS,
  ...INTAKE_DOCS.flatMap((d) => d.consents),
];

export function fieldById(id: string): IntakeField | undefined {
  return ALL_INTAKE_FIELDS.find((f) => f.id === id);
}

/** Idade em anos completos na data de referência. */
export function ageOn(birthDate: string, today: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;
  const [by, bm, bd] = birthDate.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  let age = ty - by;
  if (tm < bm || (tm === bm && td < bd)) age--;
  return age >= 0 && age < 130 ? age : null;
}

export function isMinorOn(birthDate: string, today: string): boolean {
  const age = ageOn(birthDate, today);
  return age !== null && age < 18;
}

/** Rótulo legível de uma resposta, usado na tela e na impressão. */
export function answerLabel(field: IntakeField, value: string | undefined): string {
  if (value === undefined || value === "") return "—";
  if (field.type === "yesno") return value === "sim" ? "Sim" : value === "nao" ? "Não" : "—";
  if (field.type === "consent") return value === "sim" ? "Aceito" : "Não aceito";
  return value;
}
