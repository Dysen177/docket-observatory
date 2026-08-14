const roleLabels = {
  zh: {
    government: '检方 / 政府',
    defense: '辩方 / 被告',
    court: '法院',
    regulator: '监管机构 / 原告',
    trustee: '破产受托人',
    third_party: '第三方 / 申请人',
    joint: '共同提交',
    docket: '案卷记录 / 待核验',
  },
  en: {
    government: 'Prosecution / Government',
    defense: 'Defense / Defendant',
    court: 'Court',
    regulator: 'Regulator / Plaintiff',
    trustee: 'Bankruptcy Trustee',
    third_party: 'Third Party / Petitioner',
    joint: 'Joint Filing',
    docket: 'Docket Record / Verify',
  },
}

const actionLabels = {
  zh: {
    motion: '提出动议 / 请求',
    opposition: '提交反对意见',
    response: '提交回应 / 不反对',
    reply: '提交回复 / 支持意见',
    order: '法院命令 / 裁定',
    appeal: '启动或推进上诉',
    petition: '提交申请 / 权利主张',
    sentencing: '量刑主张',
    forfeiture: '没收主张 / 处理',
    discovery: '证据与披露请求',
    notice: '通知 / 案卷提交',
  },
  en: {
    motion: 'Motion / Request',
    opposition: 'Opposition Filed',
    response: 'Response / Non-Opposition Filed',
    reply: 'Reply / Support Filed',
    order: 'Court Order / Ruling',
    appeal: 'Appeal Initiated or Advanced',
    petition: 'Petition / Interest Claim',
    sentencing: 'Sentencing Position',
    forfeiture: 'Forfeiture Position / Action',
    discovery: 'Discovery / Disclosure Request',
    notice: 'Notice / Docket Filing',
  },
}

const statusLabels = {
  zh: {
    granted: '法院已准许',
    denied: '法院已驳回',
    partial: '部分准许 / 部分驳回',
    ordered: '法院已作出命令',
    judgment: '判决 / 裁判已录入',
    withdrawn: '已撤回',
    appealed: '上诉已启动',
    opposed: '反对意见已提交',
    responded: '回应已提交',
    replied: '回复意见已提交',
    requested: '请求或立场已提出',
    noticed: '案卷已记录',
    verify: '状态待原始文件核验',
  },
  en: {
    granted: 'Granted by Court',
    denied: 'Denied by Court',
    partial: 'Granted in Part / Denied in Part',
    ordered: 'Court Order Entered',
    judgment: 'Judgment / Decision Entered',
    withdrawn: 'Withdrawn',
    appealed: 'Appeal Initiated',
    opposed: 'Opposition Filed',
    responded: 'Response Filed',
    replied: 'Reply Filed',
    requested: 'Request or Position Stated',
    noticed: 'Recorded on Docket',
    verify: 'Verify in Original Filing',
  },
}

const courtDispositionLabels = {
  zh: {
    granted: '法院已准许该请求',
    denied: '法院已驳回该请求',
    partial: '法院部分处理该请求',
    ordered: '法院已作出相关命令',
    judgment: '法院已作出相关裁判',
  },
  en: {
    granted: 'Court granted the request',
    denied: 'Court denied the request',
    partial: 'Court partly resolved the request',
    ordered: 'Court entered a related order',
    judgment: 'Court entered a related judgment',
  },
}

const basisLabels = {
  zh: {
    explicit: '标题明确识别',
    procedural: '按程序性质识别',
    unresolved: '提交人待核验',
  },
  en: {
    explicit: 'Explicit in title',
    procedural: 'Procedural classification',
    unresolved: 'Filer needs verification',
  },
}

export function buildLitigationPositions(state, localizedDashboard, lang = 'zh') {
  const locale = lang === 'en' ? 'en' : 'zh'
  const localizedEvents = new Map(localizedDashboard.events.map((event) => [event.id, event]))
  const localizedCases = new Map(localizedDashboard.cases.map((caseRecord) => [caseRecord.id, caseRecord]))
  const sourceById = new Map(localizedDashboard.sources.map((source) => [source.id, source]))

  const actions = state.events
    .map((event) => buildAction(event, localizedEvents.get(event.id) ?? event, localizedCases.get(event.caseId), sourceById.get(event.sourceId), locale))
    .sort((a, b) => b.date.localeCompare(a.date) || compareFilingNumber(b.filingNumber, a.filingNumber))

  const roleCounts = Object.fromEntries(Object.keys(roleLabels[locale]).map((key) => [key, 0]))
  const statusCounts = Object.fromEntries(Object.keys(statusLabels[locale]).map((key) => [key, 0]))
  for (const action of actions) {
    roleCounts[action.roleKey] += 1
    statusCounts[action.statusKey] += 1
  }

  return {
    generatedAt: state.generatedAt,
    methodology: locale === 'en'
      ? 'Actor and action labels are indexed from explicit docket-entry wording first, then procedural rules. They summarize recorded filings and do not infer motive, credibility, or litigation success.'
      : '诉讼方和动作优先根据案卷标题中的明确文字识别，其次才使用程序规则。这里只归纳已记录的提交和裁定，不推断动机、可信度或诉讼胜负。',
    sourceBoundary: locale === 'en'
      ? 'Open the linked filing before relying on a position. Mirror-derived entries remain subject to PACER or RECAP verification.'
      : '依赖某项立场前应打开所链接的原始文件。来自公开镜像的条目仍需 PACER 或 RECAP 核验。',
    labels: {
      roles: roleLabels[locale],
      actions: actionLabels[locale],
      statuses: statusLabels[locale],
      bases: basisLabels[locale],
    },
    counts: {
      total: actions.length,
      explicit: actions.filter((action) => action.roleBasis === 'explicit').length,
      needsVerification: actions.filter((action) => action.roleBasis === 'unresolved' || !action.primarySource).length,
      courtResolved: actions.filter((action) => ['granted', 'denied', 'partial', 'ordered', 'judgment'].includes(action.statusKey) || action.courtDispositionKey).length,
      roleCounts,
      statusCounts,
    },
    actions,
  }
}

function buildAction(rawEvent, event, caseRecord, source, lang) {
  const title = rawEvent.title.toLowerCase()
  const role = classifyRole(rawEvent, title)
  const actionKey = classifyAction(rawEvent, title, role.key)
  const statusKey = classifyStatus(rawEvent, title, role.key, actionKey)
  const courtDispositionKey = classifyCourtDisposition(title)
  const primarySource = ['Official Court', 'CourtListener / RECAP'].includes(rawEvent.sourceType)

  return {
    id: `position-${rawEvent.id}`,
    eventId: rawEvent.id,
    date: rawEvent.date,
    caseId: rawEvent.caseId,
    caseTitle: caseRecord?.shortTitle ?? rawEvent.caseId,
    caseKind: caseRecord?.kind ?? '',
    docketNumber: rawEvent.docketNumber,
    court: rawEvent.court,
    filingNumber: String(rawEvent.filingNumber ?? ''),
    title: event.title,
    summary: event.summary,
    significance: event.impact,
    roleKey: role.key,
    roleLabel: roleLabels[lang][role.key],
    roleBasis: role.basis,
    roleBasisLabel: basisLabels[lang][role.basis],
    actionKey,
    actionLabel: actionLabels[lang][actionKey],
    statusKey,
    statusLabel: statusLabels[lang][statusKey],
    courtDispositionKey,
    courtDispositionLabel: courtDispositionKey ? courtDispositionLabels[lang][courtDispositionKey] : '',
    category: event.category,
    assertionType: event.assertionType,
    confidence: rawEvent.confidence,
    sourceId: rawEvent.sourceId,
    sourceLabel: event.sourceLabel,
    sourceType: event.sourceType,
    sourceUrl: rawEvent.sourceUrl,
    sourceNote: source?.limitations ?? '',
    primarySource,
    requiresVerification: role.basis === 'unresolved' || !primarySource,
  }
}

function classifyCourtDisposition(title) {
  const courtAction = /\b(?:the )?(?:court|judge|magistrate|second circuit|district court)\s+(?:orders?|ordered|directs?|directed|grants?|granted|allows?|allowed|denies?|denied|dismisses?|dismissed|rejects?|rejected|enters?|entered|rules?|ruled|holds?|held|vacates?|vacated|affirms?|affirmed|sustains?|sustained)\b/i
  if (!courtAction.test(title)) return null
  const grantsRelief = /\b(?:the )?(?:court|judge|magistrate|second circuit|district court)\s+(?:grants?|granted|allows?|allowed|sustains?|sustained)\b/i.test(title)
  const deniesRelief = /\b(?:the )?(?:court|judge|magistrate|second circuit|district court)\s+(?:denies?|denied|dismisses?|dismissed|rejects?|rejected)\b/i.test(title)
  const ordersRelief = /\b(?:the )?(?:court|judge|magistrate|second circuit|district court)\s+(?:orders?|ordered|directs?|directed)\b/i.test(title)
  if (/\b(?:in part|partially|with limits?|limited relief)\b/i.test(title) || (grantsRelief && deniesRelief)) return 'partial'
  if (deniesRelief) return 'denied'
  if (grantsRelief) return 'granted'
  if (ordersRelief) return 'ordered'
  if (/\b(?:judgment|conviction|sentenced|sentence imposed)\b/i.test(title)) return 'judgment'
  return 'ordered'
}

function classifyRole(event, title) {
  const subject = filingSubject(title)
  const bankruptcyMatter = /bankruptcy/i.test(event.caseId) || /bankruptcy/i.test(event.court)
  if (/^(?:a )?joint\b|\b(?:government and defense|parties jointly|both parties|joint status (?:letter|report))\b/.test(subject)) return { key: 'joint', basis: 'explicit' }
  if (/^(?:order|judgment|mandate|memo endorsement|endorsed letter|(?:supplemental )?(?:preliminary|final) order|sentencing transcript|notice of filing of official transcript)\b/.test(subject)
    || /^second circuit reported decision\b/.test(subject)
    || (/^(?:the )?(?:court|judge|magistrate|second circuit|appeals? court|district court|jury)\b/.test(subject)
      && /\b(order|orders|ordered|grant|grants|granted|denies|denied|denying|entered|enters|rules|held|holds|vacates|adjourns|postpones|delays|allows|affirms|dismisses|mandate|convicts|sentenced|sentence|announces|considering|invites|files|sustains)\b/.test(subject))) {
    return { key: 'court', basis: 'explicit' }
  }
  if (/^(?:the )?(?:bankruptcy trustee|chapter 11 trustee|trustee)\b/.test(subject)) return { key: 'trustee', basis: 'explicit' }
  if (bankruptcyMatter && /^(?:petition|mr\. guo|miles guo|ho wan kwok)\b/.test(subject)) return { key: 'docket', basis: 'unresolved' }
  if (/^(?:the )?(?:government|united states|u\.s\. government|usa|prosecution|prosecutors?|u\.s\. attorney|department of justice|doj)\b/.test(subject)
    || /^(?:letter|status report) by usa\b/.test(subject)
    || /\b(?:filed|submitted) by usa\b/.test(subject)) {
    return { key: 'government', basis: 'explicit' }
  }
  if (/^(?:the )?(?:defense|defendant|guo('|’)s (?:lawyers|counsel)|mr\. guo|miles guo|ho wan kwok|counsel for (?:miles guo|ho wan kwok))\b/.test(subject)
    || /^this is a letter from (?:miles guo('|’)s counsel|the defense)\b/.test(subject)
    || /\b(?:filed|submitted|letter|status report) by (?:ho wan kwok|miles guo|the defense)\b/.test(subject)
    || /^(?:letter|letter motion|status report)\b.*\bfrom .*?(?:counsel|attorney|esq\.)\b/.test(subject)
    || /^status report by miles guo\s*counsel\b/.test(subject)
    || /^letter motion\b.*\bmiles guo('|’)s defense attorneys?\b/.test(subject)
    || /\bfrom john f\. kaley\b/.test(subject)) {
    return { key: 'defense', basis: 'explicit' }
  }
  if (/^(?:the )?(?:sec|securities and exchange commission|fair fund|claims administrator)\b/.test(subject) || event.caseId === 'sec-admin-3-20537') {
    return { key: 'regulator', basis: 'explicit' }
  }
  if (/^(?:a |an |the )?(?:anonymous victim|third[- ]party|petitioner|claimant|interested party|pro se|investor|creditor|victim|himalaya exchange user)\b/.test(subject)
    || /^(?:counsel|attorney)\b.*\b(?:investors?|members?|claimants?)\b/.test(subject)
    || /\b(?:petitions?|claimant|interested party|pro se)\b/.test(subject)) {
    return { key: 'third_party', basis: 'explicit' }
  }
  if (/^notice of filing of official transcript\b|^sentencing transcript\b/.test(subject)) {
    return { key: 'court', basis: 'procedural' }
  }
  if (/third-party or pro se filing/i.test(event.assertionType)) return { key: 'third_party', basis: 'procedural' }
  if (event.sourceType === 'Official Agency' && event.caseId === 'sdny-23-cr-118') return { key: 'government', basis: 'procedural' }
  if (event.sourceType === 'Official Agency' && event.caseId === 'sdny-23-cv-2200') return { key: 'regulator', basis: 'procedural' }
  return { key: 'docket', basis: 'unresolved' }
}

function classifyAction(event, title, roleKey) {
  if (roleKey === 'court') return 'order'
  const subject = filingSubject(title)
  if (/\b(does not oppose|do not oppose|non-opposition|no opposition|takes no position|consents? to)\b/.test(title)) return 'response'
  if (/\b(oppose|opposes|opposition|objects to|response in opposition|contest)\b/.test(title)) return 'opposition'
  if (/\b(reply|replies|in support of|responds to|response by)\b/.test(title)) return 'reply'
  if (/\b(appeal|appellate|second circuit|mandamus)\b/.test(title)) return 'appeal'
  if (/\b(petition|claimant|claim |interest in|ancillary proceeding|853\(n\))\b/.test(title)) return 'petition'
  if (/\b(discovery|subpoena|brady|cipa|disclosure|unseal|seal)\b/.test(title) || event.category === 'Discovery') return 'discovery'
  if (/\b(sentencing|sentence|fatico|guidelines)\b/.test(title) || event.category === 'Sentencing') return 'sentencing'
  if (/\b(forfeiture|remission|restitution|seizure|disgorgement)\b/.test(title) || event.category === 'Forfeiture') return 'forfeiture'
  if (/^(?:letter|status report)\b/.test(subject) && !/\b(asks?|requests?|seeks?|moves?)\b/.test(subject)) return 'notice'
  if (/\b(motion|moves|asks|requests|seeks|application)\b/.test(title)) return 'motion'
  return 'notice'
}

function classifyStatus(event, title, roleKey, actionKey) {
  if (/\b(withdraws|withdrawn|withdrawal)\b/.test(title)) return 'withdrawn'
  if (roleKey === 'court') {
    const grantsRelief = /\b(grants?|granted|granting|allows?|allowed|allowing|sustains?|sustained|sustaining)\b/.test(title)
    const deniesRelief = /\b(denies|denied|denying|dismisses|dismissed|dismissing|rejects|rejected|rejecting)\b/.test(title)
    const permitsRenewalOnly = /\b(?:allows?|allowed|allowing|may)\b.{0,100}\b(?:renew|refile|file again|reapply)\b/.test(title)
      || /\bwithout prejudice (?:to|for) (?:renewal|refiling|reapplication)\b/.test(title)
    if (deniesRelief && permitsRenewalOnly) return 'denied'
    if (/\b(in part|partially|with limits?|limited relief)\b/.test(title) || (grantsRelief && deniesRelief)) return 'partial'
    if (deniesRelief) return 'denied'
    if (grantsRelief) return 'granted'
    if (/\b(judgment|decision|conviction|sentenced|sentence imposed)\b/.test(title)) return 'judgment'
    return 'ordered'
  }
  if (actionKey === 'opposition') return 'opposed'
  if (actionKey === 'response') return 'responded'
  if (actionKey === 'reply') return 'replied'
  if (actionKey === 'appeal' && /\b(notice of appeal|appeals from|filed an appeal)\b/.test(title)) return 'appealed'
  if (['motion', 'petition', 'sentencing', 'forfeiture', 'discovery', 'appeal'].includes(actionKey)) return 'requested'
  if (event.assertionType === 'Docket entry') return 'verify'
  return 'noticed'
}

function compareFilingNumber(left, right) {
  const leftNumber = Number.parseInt(String(left), 10)
  const rightNumber = Number.parseInt(String(right), 10)
  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) return leftNumber - rightNumber
  return String(left).localeCompare(String(right))
}

function filingSubject(title) {
  return title.replace(/^(?:(?:doc(?:ument)?|ecf)\s+[^:\s]+\s*:?\s*)+/i, '').trim()
}
