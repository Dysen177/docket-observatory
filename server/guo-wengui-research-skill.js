/**
 * Internal, neutral research protocol for the whole-library chat.
 *
 * This is deliberately a protocol and ontology, not a factual substitute for
 * the court corpus or public-record text. Source excerpts are retrieved per
 * question so the model is not given an unbounded transcript dump.
 */

export const GUO_RESEARCH_SKILL_VERSION = '2026-08-20.1'

export const GUO_RESEARCH_SKILL = {
  subject: {
    zh: '郭文贵 / Miles Guo / Ho Wan Kwok 相关法律、破产财产、监管、上诉和历史公开言论研究',
    en: 'Research concerning Guo Wengui / Miles Guo / Ho Wan Kwok, including litigation, bankruptcy estate matters, regulatory proceedings, appeals, and historical public statements',
  },
  identityAliases: [
    '郭文贵',
    '郭文貴',
    'Miles Guo',
    'Miles Kwok',
    'Ho Wan Kwok',
    'Kwok Ho Wan',
  ],
  retrievalRules: {
    zh: [
      '先用问题中的人名、公司名、案号、文件号、术语和日期检索；再用内部别名扩展同义写法。',
      '同一个词在直播、法院文件、监管文件和破产案卷中可能含义不同，必须按来源和上下文分别解释。',
      '问“说过什么”时优先返回公开言论文字和外部链接；问“法院认定什么”时优先返回法院文件、官方来源和 RECAP 记录。',
      '同一直播提到同一词多次时保留不同直播记录；同一法院文件的多来源副本按内容和案号去重。',
      '找不到直接证据时，应明确写“当前资料库未检索到”，不能用相似人物、相似案号或推断补齐。',
    ],
    en: [
      'Retrieve first by names, entities, docket numbers, document numbers, terms, and dates, then expand known aliases.',
      'The same term may carry different meanings in a broadcast, a court filing, a regulatory record, or a bankruptcy docket; interpret it in source context.',
      'For what someone said, prioritize public-statement text and external links. For what a court found, prioritize court filings, official sources, and RECAP records.',
      'Keep separate broadcast records when the same term appears in multiple broadcasts. De-duplicate alternate copies of the same court filing by content and docket identity.',
      'When direct evidence is not retrieved, say that the current library did not locate it; do not fill gaps with similar people, dockets, or inference.',
    ],
  },
  sourceHierarchy: {
    zh: [
      '法院正式案卷、判决、命令和 PACER 记录：程序和司法认定的最高优先级。',
      'CourtListener / RECAP：公开案卷镜像和案卷元数据；不是 PACER 的替代品，关键事实要说明公开镜像边界。',
      'DOJ、SEC、Federal Register 等官方机构资料：机构行动和监管背景的重要来源，但机构指控仍应标为指控。',
      'Epiq、受托人、Fair Fund 和索赔管理页面：破产财产、分配和索赔流程资料，不能自动替代法院命令。',
      '当事方、律师、项目网站和历史网页存档：可证明该页面公开表达或链接过什么，不自动证明事实或案卷状态。',
      '公开直播、字幕、人工整理文字和公开帖文：用于历史言论和检索线索，不是法院认定；重要引语应回到外部记录。',
      '新闻和二手报道：只用于时间线或背景，不能单独支撑司法结论。',
    ],
    en: [
      'Official court dockets, judgments, orders, and PACER records: highest priority for procedure and judicial findings.',
      'CourtListener / RECAP: public docket mirrors and metadata; not a PACER substitute, and public-mirror limits must be stated for material facts.',
      'DOJ, SEC, Federal Register, and other official agency material: important for agency actions and regulatory context, while agency allegations remain allegations.',
      'Epiq, trustee, Fair Fund, and claims-administration pages: useful for estate, distribution, and claims process information, but not a substitute for a court order.',
      'Party, counsel, project, and archived websites: show what a page published or linked at a given time; they do not automatically prove the underlying fact or docket status.',
      'Public broadcasts, subtitles, human-edited transcripts, and public posts: useful for historical statements and retrieval leads, not judicial findings; verify important quotations against the external record.',
      'News and secondary reporting: background or chronology only, not sole support for a legal conclusion.',
    ],
  },
  evidenceClasses: {
    zh: [
      'court_finding: 法院判决、命令或明确司法认定。',
      'court_procedure: 案卷中的提交、通知、动议、律师登记和程序事件；不等于实体责任。',
      'government_allegation: 起诉书、监管申诉、政府新闻稿中的指控或立场。',
      'party_position: 当事人、受托人、律师或项目方提交的主张。',
      'public_statement: 郭文贵或其他人的直播、公开视频、文字稿和公开帖文。',
      'entity_association: 名称、共同出现或关系线索；关联不等于所有权、控制或责任。',
      'policy_context: 政策、监管和政治背景；不是个案事实。',
      'internal_dossier: 仅用于别名、检索和解释边界，不得作为外部事实来源。',
    ],
    en: [
      'court_finding: A judgment, order, or explicit judicial finding.',
      'court_procedure: A filing, notice, motion, appearance, or docket event; not a merits or liability finding.',
      'government_allegation: An allegation or position in an indictment, regulatory complaint, or government release.',
      'party_position: A position submitted by a party, trustee, lawyer, or project representative.',
      'public_statement: A broadcast, public video, transcript, or public post by Guo Wengui or another speaker.',
      'entity_association: A name, co-occurrence, or relationship lead; association is not ownership, control, or liability.',
      'policy_context: Policy, regulatory, or political background; not case-specific proof.',
      'internal_dossier: Alias, retrieval, and boundary guidance only; never an external fact source.',
    ],
  },
  transcriptRules: {
    zh: [
      '资料库覆盖的历史公开言论时间边界是 2017-01-26 至 2023-03-14；这不是法院案卷的起止时间。',
      '长时直播、直播片段、短视频、公开帖文、公开字幕、人工整理稿和历史档案稿必须分别标识。',
      '可能不完整、时长异常、边界未核验或没有原视频链接的文字，只能作为检索线索或谨慎引用。',
      '公开帖文不是视频逐字稿；人工整理稿不是经过法院认证的证言。',
      '英文文字是翻译层，必要时同时引用中文原文；不要把翻译措辞当成原话。',
      '用户要求某个词出现在哪些直播时，应返回所有相关直播记录，而不是只返回一个最高相关结果。',
    ],
    en: [
      'The historical public-statement corpus is bounded by January 26, 2017 through March 14, 2023; that is not the start or end of the court matters.',
      'Long-form broadcasts, excerpts, short videos, public posts, public subtitles, human-edited transcripts, and archival text must remain distinct.',
      'Possibly incomplete text, anomalous durations, unverified boundaries, or records without a recoverable recording link are leads or cautious quotations only.',
      'A public post is not a video transcript, and a human-edited transcript is not court-authenticated testimony.',
      'English text is a translation layer; use the Chinese source when needed and never present translated wording as the original quote.',
      'When asked where a term appears, return all relevant broadcast records rather than only the single highest-scoring result.',
    ],
  },
  answerRules: {
    zh: [
      '每个重要事实都引用可用的 D、T 或 S 编号；引用编号只能来自检索结果。',
      '先给结论，再用“法院记录 / 当事方主张 / 公开言论 / 待核问题”分层说明。',
      '普通读者看不懂的程序术语要先用通俗语言解释，再给出专业名称；可以使用有限的比喻，但必须说明比喻不是法律结论。',
      '对时间、案号、文件号、金额和人物关系保持精确；不确定时明确标注不确定。',
      '不输出 API Key、密码、令牌、本机路径、缓存文件名或其他私密设置。',
      '不代替律师，不预测法院必然结果，不把政治立场或用户观点加入答案。',
    ],
    en: [
      'Cite each material factual proposition with an available D, T, or S identifier; identifiers must come from retrieved evidence.',
      'Lead with the answer, then separate court record, party position, public statement, and open verification issues.',
      'Explain procedural terms in plain language before using the professional term. Limited analogies are allowed, but they are not legal conclusions.',
      'Preserve dates, docket numbers, document numbers, amounts, and relationship qualifiers; state uncertainty directly.',
      'Never expose API keys, passwords, tokens, local paths, cache filenames, or other private settings.',
      'Do not act as counsel, predict a guaranteed court outcome, or incorporate the user’s political position into the answer.',
    ],
  },
}

export function buildGuoResearchSkillPrompt(language = 'zh', scope = {}) {
  const key = language === 'en' ? 'en' : 'zh'
  const section = (title, values) => `${title}\n${values.map((value) => `- ${value}`).join('\n')}`
  const scopeText = scopeSummaryText(scope, language)
  return [
    language === 'en'
      ? `Internal research skill ${GUO_RESEARCH_SKILL_VERSION}: ${GUO_RESEARCH_SKILL.subject.en}.`
      : `内部研究技能 ${GUO_RESEARCH_SKILL_VERSION}：${GUO_RESEARCH_SKILL.subject.zh}。`,
    section(language === 'en' ? 'Retrieval rules' : '检索规则', GUO_RESEARCH_SKILL.retrievalRules[key]),
    section(language === 'en' ? 'Source hierarchy' : '来源层级', GUO_RESEARCH_SKILL.sourceHierarchy[key]),
    section(language === 'en' ? 'Evidence classes' : '证据类别', GUO_RESEARCH_SKILL.evidenceClasses[key]),
    section(language === 'en' ? 'Transcript rules' : '直播文字规则', GUO_RESEARCH_SKILL.transcriptRules[key]),
    section(language === 'en' ? 'Answer rules' : '回答规则', GUO_RESEARCH_SKILL.answerRules[key]),
    scopeText,
  ].join('\n\n')
}

export function buildProgramScopeEvidence({ language = 'zh', transcriptManifest = null, translationManifest = null, documentManifest = null, dashboard = null } = {}) {
  const scope = summarizeResearchCorpus({ transcriptManifest, translationManifest, documentManifest, dashboard })
  const zh = language !== 'en'
  return {
    kind: 'program_scope',
    title: zh ? '资料库范围与证据边界' : 'Research library scope and evidence boundaries',
    subtitle: zh ? `内部研究技能 ${GUO_RESEARCH_SKILL_VERSION}` : `Internal research skill ${GUO_RESEARCH_SKILL_VERSION}`,
    date: null,
    timestamp: null,
    pageNumber: null,
    sourceUrl: null,
    sourceLabel: zh ? '内部资料库范围摘要' : 'Internal corpus scope summary',
    excerpt: scopeSummaryText(scope, language),
    excerpts: [],
    contextBefore: [],
    contextAfter: [],
    evidenceClass: zh ? '内部范围摘要；不替代原始来源' : 'Internal scope summary; not a substitute for primary sources',
    scope,
  }
}

export function summarizeResearchCorpus({ transcriptManifest = null, translationManifest = null, documentManifest = null, dashboard = null } = {}) {
  const transcriptCoverage = transcriptManifest?.coverage ?? {}
  const translationCoverage = translationManifest?.coverage ?? {}
  const files = Array.isArray(documentManifest?.files) ? documentManifest.files : []
  return {
    skillVersion: GUO_RESEARCH_SKILL_VERSION,
    publicStatementStart: transcriptCoverage.start ?? '2017-01-26',
    publicStatementEnd: transcriptCoverage.end ?? '2023-03-14',
    transcriptCatalogRecords: Number(transcriptCoverage.importedRecords ?? transcriptManifest?.records?.length ?? 0),
    searchableTranscripts: Number(transcriptCoverage.availableTranscripts ?? 0),
    transcriptCharacters: Number(transcriptCoverage.transcriptCharacters ?? 0),
    fullBroadcasts: Number(transcriptCoverage.fullBroadcasts ?? 0),
    excerptsAndShortVideos: Number(transcriptCoverage.excerptsAndShortVideos ?? 0),
    publicPostRecords: Number(transcriptCoverage.publicPostRecords ?? 0),
    possiblyIncomplete: Number(transcriptCoverage.possiblyIncomplete ?? 0),
    transcriptExternalLinks: Number(transcriptCoverage.transcriptsWithExternalLinks ?? 0),
    translatedTranscripts: Number(translationCoverage.translatedRecords ?? 0),
    translationMissingRecords: Number(translationCoverage.missingRecords ?? 0),
    courtLibraryRecords: files.length,
    courtLibraryAvailable: files.filter((file) => file.status !== 'error').length,
    caseCount: Number(dashboard?.cases?.length ?? 0),
    eventCount: Number(dashboard?.events?.length ?? 0),
    entityCount: Number(dashboard?.entities?.length ?? 0),
    policyItemCount: Number(dashboard?.policyWatch?.length ?? 0),
  }
}

function scopeSummaryText(scope, language) {
  if (language === 'en') {
    return [
      `Runtime corpus scope: public statements ${scope.publicStatementStart} through ${scope.publicStatementEnd}; ${scope.searchableTranscripts} searchable transcript records from ${scope.transcriptCatalogRecords} catalog records; approximately ${scope.transcriptCharacters.toLocaleString('en-US')} source characters; ${scope.fullBroadcasts} long-form broadcasts; ${scope.excerptsAndShortVideos} excerpts/short videos; ${scope.publicPostRecords} public-post records; ${scope.translatedTranscripts} English translation records; ${scope.translationMissingRecords} translation records missing.`,
      `Runtime legal library: ${scope.courtLibraryAvailable}/${scope.courtLibraryRecords} available managed file records, ${scope.caseCount} case profiles, ${scope.eventCount} docket/event records, ${scope.entityCount} entity profiles, and ${scope.policyItemCount} policy items.`,
      `${scope.possiblyIncomplete} transcript records are marked possibly incomplete and ${scope.transcriptExternalLinks} have external source links. These counts describe the local corpus and do not prove that a public docket or historical broadcast collection is complete.`,
    ].join(' ')
  }
  return [
    `当前资料库范围：公开言论时间为 ${scope.publicStatementStart} 至 ${scope.publicStatementEnd}；目录 ${scope.transcriptCatalogRecords} 条，其中 ${scope.searchableTranscripts} 条可检索文字；原文字数约 ${scope.transcriptCharacters.toLocaleString('zh-CN')}；长时直播 ${scope.fullBroadcasts} 条；片段/短视频 ${scope.excerptsAndShortVideos} 条；公开帖文 ${scope.publicPostRecords} 条；英文翻译记录 ${scope.translatedTranscripts} 条；缺少翻译记录 ${scope.translationMissingRecords} 条。`,
    `当前法律资料库：${scope.courtLibraryAvailable}/${scope.courtLibraryRecords} 条可用本地案卷记录、${scope.caseCount} 个案件档案、${scope.eventCount} 条案卷/事件记录、${scope.entityCount} 个实体档案和 ${scope.policyItemCount} 条政策资料。`,
    `其中 ${scope.possiblyIncomplete} 条直播文字标记为可能不完整，${scope.transcriptExternalLinks} 条保留外部来源链接。以上是本地资料库统计，不证明全网案卷或历史直播已经绝对完整。`,
  ].join('')
}
