import { translateLegalTextToZh } from './i18n.js'

export const monitoringProfile = {
  id: 'neutral-guo-related-monitor',
  posture: 'Neutral source-posture monitor',
  description:
    'Tracks Guo-related litigation, entities, asset-recovery lines, and U.S. policy context without adopting prosecution, defense, supporter, media, or political narratives as fact.',
  operatingRules: [
    {
      id: 'source-posture-first',
      title: 'Source posture first',
      description:
        'Every item is labeled as court order, court filing, agency allegation, claims-administrator statement, public mirror, third-party filing, or policy context before conclusions are drawn.',
    },
    {
      id: 'official-record-priority',
      title: 'Official record priority',
      description:
        'PACER, court PDFs, RECAP mirrors of court PDFs, official agency pages, and claims-agent dockets are ranked above commentary or mirror summaries.',
    },
    {
      id: 'claims-not-findings',
      title: 'Claims are not findings',
      description:
        'Government allegations, defendant arguments, investor petitions, supporter narratives, and media descriptions remain claims unless a court order, judgment, settlement, or transcript supports them.',
    },
    {
      id: 'cross-forum-reconciliation',
      title: 'Cross-forum reconciliation',
      description:
        'Criminal forfeiture, SEC Fair Fund, bankruptcy estate, appellate rulings, and entity claims are reconciled before asset or loss conclusions are promoted.',
    },
  ],
  automation: {
    refreshPlan: [
      'Run source adapters for public pages and APIs.',
      'Merge new docket-linked items by stable case and filing identifiers.',
      'Download linked public PDFs into the local manifest.',
      'Translate metadata into the selected UI language.',
      'Queue file-level classification and optional AI analysis.',
      'Flag credential-gated gaps for PACER, CourtListener/RECAP, and Epiq extraction.',
    ],
    newCaseDiscovery: [
      'Scan source text for monitored names, aliases, docket numbers, entity names, and asset vehicles.',
      'Create a candidate lead when a new docket number or forum appears with at least one monitored entity marker.',
      'Keep candidate leads separate from confirmed cases until an official docket, court filing, or agency page is linked.',
    ],
    aiPolicy: [
      'AI receives only event metadata and extracted snippets by default, not arbitrary local files.',
      'AI output must preserve source posture and avoid converting allegations or petitions into findings.',
      'Local rule-based analysis remains available when no generative AI provider is configured in Settings.',
    ],
  },
  watchTopics: [
    {
      id: 'direct-criminal-appeal',
      title: 'Direct criminal appeal',
      priority: 'critical',
      scope: 'Second Circuit docket number, counsel, transcript status, briefing schedule, appellate motions, mandate, rehearing, and certiorari signals.',
      keywords: ['notice of appeal', 'Second Circuit', 'briefing schedule', 'transcript', 'mandate', 'rehearing', 'certiorari'],
      sourceIds: ['pacer', 'courtlistener-recap', 'nfsc-criminal-mirror'],
    },
    {
      id: 'forfeiture-ancillary',
      title: 'Criminal forfeiture and third-party ancillary claims',
      priority: 'critical',
      scope: 'Money judgment, asset-specific forfeiture, § 853(n) petitions, remission, victim claims, and final forfeiture orders.',
      keywords: ['forfeiture', '853(n)', 'ancillary proceeding', 'remission', 'victim list', 'money judgment', 'forfeiture.gov'],
      sourceIds: ['pacer', 'courtlistener-recap', 'nfsc-criminal-mirror', 'doj-victim-page', 'himalaya-restoration', 'himalaya-restoration-archive'],
    },
    {
      id: 'hex-collective-claims',
      title: 'Himalaya Exchange collective claims',
      priority: 'critical',
      scope: 'Collective and individual HEX submissions, dated claimant-count methodology, HID authentication claims, sealed/public boundaries, § 853(n), Rule 41(g), remission, restitution, constructive trust, special-master administration, and orders accepting or rejecting filing procedures.',
      keywords: ['Himalaya Exchange', 'HEX', 'HID', 'collective petition', 'sealed submission', '612', '6512', '6537', '6575', '3539', '1433', 'constructive trust'],
      sourceIds: ['pacer', 'courtlistener-recap', 'nfsc-criminal-mirror', 'himalaya-restoration', 'himalaya-restoration-archive', 'doj-victim-page'],
      evidenceChecklist: [
        'Store each count with its date and category: represented client, authenticated record, affidavit, submitted claim, accepted petition, or successful claimant.',
        'Keep public cover filings separate from sealed claimant materials and never infer identities, HID values, KYC records, or transaction details.',
        'Distinguish party statements, commissioned reports, historical government notices, proposed orders, signed court orders, and DOJ administrative action.',
        'Preserve the Doc 765 metadata/body conflict until official SDNY and Second Circuit dockets identify the record.',
        'Verify any order that accepted, rejected, extended, consolidated, unsealed, referred, or adjudicated collective submissions.',
      ],
    },
    {
      id: 'sec-fair-fund-offsets',
      title: 'SEC civil enforcement and Fair Fund offsets',
      priority: 'high',
      scope: 'SEC civil case posture, GTV Fair Fund distributions, disgorgement credits, civil judgment, and overlap with criminal loss or forfeiture.',
      keywords: ['SEC', 'Fair Fund', 'GTV', 'disgorgement', 'distribution', 'civil enforcement', 'offset'],
      sourceIds: ['sec-press-2023-50', 'gtv-fair-fund', 'pacer', 'courtlistener-recap'],
    },
    {
      id: 'bankruptcy-assets',
      title: 'Bankruptcy estate and asset ownership',
      priority: 'critical',
      scope: 'D. Conn. trustee docket, alter ego rulings, turnover, Lady May, HK International, nominee ownership, settlement, sale, and appeals.',
      keywords: ['bankruptcy', 'trustee', 'alter ego', 'turnover', 'Lady May', 'HK International', 'nominee', 'estate property'],
      sourceIds: ['epiq-kwok-trustee', 'pacer', 'courtlistener-recap'],
    },
    {
      id: 'related-entities-people',
      title: 'Related entities, people, and G-series lines',
      priority: 'high',
      scope: 'GTV, Saraca, Voice of Guo, G Clubs, Himalaya Exchange, Farm Loan, Rule of Law entities, co-defendants, third-party claimants, and asset vehicles.',
      keywords: ['GTV', 'Saraca', 'Voice of Guo', 'G Club', 'Himalaya Exchange', 'Farm Loan', 'Rule of Law', 'William Je', 'Yvette Wang'],
      sourceIds: ['doj-victim-page', 'sec-press-2023-50', 'gtv-fair-fund', 'nfsc-criminal-mirror'],
    },
    {
      id: 'policy-context',
      title: 'U.S. policy and institutional context',
      priority: 'medium',
      scope: 'Policy changes affecting forfeiture, securities enforcement, bankruptcy asset recovery, China-linked transnational repression, foreign influence, and sanctions context.',
      keywords: ['criminal forfeiture', 'SEC enforcement', 'bankruptcy asset recovery', 'transnational repression', 'foreign influence', 'sanctions'],
      sourceIds: ['federal-register-policy', 'doj-victim-page', 'sec-press-2023-50'],
    },
  ],
  evidenceTiers: [
    {
      id: 'court-order',
      label: 'Court order / judgment / transcript',
      weight: 'highest',
      description: 'Operative court record. Still verify exact language, scope, date, and later appeal status.',
    },
    {
      id: 'court-filing',
      label: 'Court filing',
      weight: 'high',
      description: 'Party filing or docket entry. Treat assertions as party positions unless adopted by the court.',
    },
    {
      id: 'official-agency',
      label: 'Official agency material',
      weight: 'high',
      description: 'Useful official source. Complaints and press releases may contain allegations rather than findings.',
    },
    {
      id: 'claims-agent',
      label: 'Claims agent / administrator',
      weight: 'medium-high',
      description: 'Useful for distribution or case-administration state; reconcile with court and agency records.',
    },
    {
      id: 'public-mirror',
      label: 'Public mirror',
      weight: 'medium',
      description: 'Helpful for fast local access. Verify important conclusions against PACER, RECAP, or official dockets.',
    },
    {
      id: 'commentary',
      label: 'Commentary / narrative',
      weight: 'low',
      description: 'Context only unless tied back to primary documents.',
    },
  ],
}

function translateProfileValue(value) {
  if (Array.isArray(value)) return value.map((item) => translateProfileValue(item))
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, translateProfileValue(item)]))
  }
  if (typeof value === 'string') return translateLegalTextToZh(value)
  return value
}

const profileZhOverrides = {
  posture: '中立证据分层监控',
  description: '追踪郭文贵相关诉讼、实体、资产追回线和美国政策背景；程序本身不采纳检方、辩方、支持者、媒体或政治叙事作为事实。',
  operatingRules: [
    {
      id: 'source-posture-first',
      title: '先标注来源姿态',
      description: '每条信息先标注为法院命令、法院文件、机构指控、索赔管理人陈述、公开镜像、第三方申请或政策背景，再进行判断。',
    },
    {
      id: 'official-record-priority',
      title: '正式记录优先',
      description: 'PACER、法院 PDF、RECAP 法院 PDF 镜像、官方机构页面和索赔代理案卷优先于评论或镜像摘要。',
    },
    {
      id: 'claims-not-findings',
      title: '主张不等于认定',
      description: '政府指控、被告论点、投资人申请、支持者叙事和媒体描述，只有被法院命令、判决、和解或庭审记录支持后，才进入事实层。',
    },
    {
      id: 'cross-forum-reconciliation',
      title: '跨程序核对',
      description: '刑事没收、SEC Fair Fund、破产财产、上诉裁判和实体权利主张必须先互相核对，再提升为资产或损失结论。',
    },
  ],
  automation: {
    refreshPlan: [
      '刷新公开页面和 API 来源适配器。',
      '按稳定案件和文件编号合并新案卷条目。',
      '将公开链接 PDF 下载到本地 manifest。',
      '把元数据翻译成当前界面语言。',
      '加入文件级分类和可选 AI 分析队列。',
      '标记 PACER、CourtListener/RECAP 和 Epiq 提取的凭证/实现缺口。',
    ],
    newCaseDiscovery: [
      '扫描来源文本中的监控姓名、别名、案号、实体名称和资产载体。',
      '当新案号或新法院与至少一个监控实体标记同时出现时，创建候选线索。',
      '候选线索必须和已确认案件分开，直到绑定正式案卷、法院文件或官方机构页面。',
    ],
    aiPolicy: [
      'AI 默认只接收事件元数据和抽取片段，不接收任意本地文件。',
      'AI 输出必须保留来源姿态，不能把指控或申请改写成事实认定。',
      '未在设置页配置生成式 AI 提供商时，仍使用本地规则分析。',
    ],
  },
}

const topicZhOverrides = {
  'direct-criminal-appeal': {
    title: '刑事直接上诉',
    scope: '第二巡回案号、律师、庭审记录状态、书状排期、上诉动议、上诉法院正式命令、复议和最高法院申请信号。',
  },
  'forfeiture-ancillary': {
    title: '刑事没收与第三方附属申请',
    scope: '金钱判决、具体资产没收、§ 853(n) 申请、返还/减免程序、受害者权利主张和最终没收令。',
  },
  'hex-collective-claims': {
    title: '喜交所集体申请',
    scope: '追踪 HEX 集体与个人提交、带日期的人数统计口径、HID 认证主张、公开/密封边界、§ 853(n)、Rule 41(g)、remission、restitution、constructive trust、special master 管理，以及法院接受或拒绝提交程序的命令。',
    evidenceChecklist: [
      '每个人数必须绑定日期和类别：受代理客户、认证记录、宣誓书、已提交材料、法院接受的申请或胜诉申请人。',
      '公开封面文件与密封申请材料必须分开，不得推断身份、HID、KYC 或交易详情。',
      '区分当事方陈述、受委托报告、历史检方通知、拟议命令、法院签署命令和 DOJ 行政处理。',
      '在正式 SDNY 和第二巡回案卷确认前，保留 Doc 765 元数据与正文冲突。',
      '核验任何接受、拒绝、延期、合并、解封、移交或裁判集体提交的法院命令。',
    ],
  },
  'sec-fair-fund-offsets': {
    title: 'SEC 民事执法与 Fair Fund 抵扣',
    scope: 'SEC 民事案状态、GTV Fair Fund 分配、返还抵扣、民事判决，以及与刑事损失或没收的重叠。',
  },
  'bankruptcy-assets': {
    title: '破产财产与资产所有权',
    scope: '康州受托人案卷、人格混同裁判、财产移交、Lady May、HK International、名义持有人所有权、和解、出售和上诉。',
  },
  'related-entities-people': {
    title: '关联实体、关联人和 G 系列线',
    scope: 'GTV、Saraca、Voice of Guo、G Clubs、Himalaya Exchange、Farm Loan、Rule of Law 实体、共同被告、第三方申请人和资产载体。',
  },
  'policy-context': {
    title: '美国政策与制度背景',
    scope: '影响没收、证券执法、破产资产追回、中国相关跨国镇压、外来影响和制裁背景的政策变化。',
  },
}

const evidenceTierZhOverrides = {
  'court-order': {
    label: '法院命令 / 判决 / 庭审记录',
    description: '具有操作效力的法院记录。仍需核验准确措辞、范围、日期和后续上诉状态。',
  },
  'court-filing': {
    label: '法院文件',
    description: '当事人文件或案卷条目。除非法院采纳，否则文件中的陈述仍按当事人立场处理。',
  },
  'official-agency': {
    label: '官方机构材料',
    description: '重要官方来源。起诉状和新闻稿可能包含指控，而不一定是法院认定。',
  },
  'claims-agent': {
    label: '索赔代理 / 管理人',
    description: '适合判断分配或案件管理状态；仍需与法院和机构记录核对。',
  },
  'public-mirror': {
    label: '公开镜像',
    description: '适合快速本地访问。重要结论应以 PACER、RECAP 或正式案卷核验。',
  },
  commentary: {
    label: '评论 / 叙事',
    description: '只能作为背景，除非能够回扣到一手文件。',
  },
}

export function localizedMonitoringProfile(lang = 'zh') {
  if (lang === 'en') return monitoringProfile
  return {
    ...translateProfileValue(monitoringProfile),
    ...profileZhOverrides,
    watchTopics: monitoringProfile.watchTopics.map((topic) => ({
      ...translateProfileValue(topic),
      ...(topicZhOverrides[topic.id] ?? {}),
      keywords: topic.keywords,
      sourceIds: topic.sourceIds,
    })),
    evidenceTiers: monitoringProfile.evidenceTiers.map((tier) => ({
      ...translateProfileValue(tier),
      ...(evidenceTierZhOverrides[tier.id] ?? {}),
      id: tier.id,
      weight: translateLegalTextToZh(tier.weight),
    })),
  }
}
