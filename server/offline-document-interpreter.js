const genericTitlePattern = /^(?:\(?中文(?:翻译|版本)?仅供参考\)?|\(?中文\)?|document\s*\d+(?:-\d+)?|doc\s*\d+(?:-\d+)?|文件\s*\d+(?:-\d+)?|案卷文件)$/iu

const documentTypeRules = [
  ['appellate_mandate', /^(?:doc(?:ument)?\s*\d+(?:-\d+)?[^a-z]{0,5})?mandate\b|\bmandate issued\b|正式命令|上诉法院命令/iu],
  ['appeal_notice', /^(?:doc(?:ument)?\s*\d+(?:-\d+)?[^a-z]{0,5})?notice of appeal\b|上诉通知/iu],
  ['certiorari_petition', /^(?:doc(?:ument)?\s*\d+(?:-\d+)?[^a-z]{0,5})?petition for (?:a )?writ of certiorari\b|调卷令申请|最高法院审查申请/iu],
  ['mandamus_petition', /^(?:pro se\s+)?(?:third-party (?:claimants?\s+)?)?(?:mandamus petition|petition (?:to [^.;]{0,80} )?for (?:a )?writ of mandamus)\b|强制令申请/iu],
  ['judgment', /^(?:clerk'?s\s+)?judge?ment\b|\bjudgment (?:entered against|from u\.s\. district court)\b|判决书|书记官判决/iu],
  ['verdict', /^(?:doc(?:ument)?\s*\d+(?:-\d+)?[^a-z]{0,5})?(?:jury\s+)?verdict\b|\bjury verdict as to\b|陪审团裁决|裁决表/iu],
  ['indictment_waiver', /^(?:waiver of indictment|indictment waiver)\b|放弃大陪审团起诉/iu],
  ['indictment', /^(?:(?:\(s\d+\)|s\d+)\s+)?(?:(?:sealed|superseding)\s+)*(?:indictment|information)\b|\bindictment of united states v\b|刑事起诉书|替代起诉书/iu],
  ['court_order', /^(?:(?:copy of )?certified )?(?:(?:preliminary|supplemental|amended|final|consent)\s+)*order\b|^(?:memo endorse(?:ment|d)|memorandum of decision|minute order|endorsed letter)\b|^the clerk of court is directed\b|\bso ordered\b|法院命令|裁定书|批注命令/iu],
  ['service_record', /^(?:(?:certificate|affidavit|proof)(?:\/affidavit)? of service|service (?:executed|returned executed))\b|送达证明|送达宣誓书/iu],
  ['summons_request', /^(?:request for issuance of summons|application for summons)\b|申请签发传票/iu],
  ['summons', /^(?:electronic\s+)?summons(?:\s+issued)?\b|传票/iu],
  ['service_waiver', /\bwaiver of (?:(?:the )?right to respond|service)\b|放弃送达|放弃答复/iu],
  ['appearance', /\bnotice of appearance\b|\bappearance of (?:co-)?counsel\b|律师出庭登记|出庭通知/iu],
  ['corporate_disclosure', /\b(?:rule 7\.1|corporate disclosure statement|statement of corporate ownership)\b|公司披露声明|利益冲突披露/iu],
  ['default_entry', /^(?:clerk'?s (?:entry|certificate) of default|default, request for clerk'?s entry|request for (?:clerk'?s )?entry of default|application for entry of default)\b|缺席登记/iu],
  ['deficiency_notice', /^(?:filing error|deficiency notice|notice of deficiency)\b|程序缺陷通知/iu],
  ['transcript_request', /^request for (?:a )?transcript\b|申请庭审记录/iu],
  ['answer', /^answer(?:\s+to\s+(?:amended\s+)?complaint)?\b|正式答辩|答辩状/iu],
  ['counterclaim', /^(?:(?:first|second)\s+)?(?:amended\s+)?counterclaim\b|反诉状|修订反诉/iu],
  ['complaint', /^(?:sec\s+)?(?:adversary case\s+[^.]+\.\s*)?(?:(?:first|second)\s+)?(?:amended\s+)?complaint\b|\bamended complaint filed by\b|民事起诉状|修订起诉状/iu],
  ['jury_instructions', /^(?:(?:the\s+)?parties[’']?\s+(?:joint\s+)?requests?\s+to\s+charge|(?:joint\s+)?requests?\s+to\s+charge|(?:(?:the\s+)?(?:government|prosecution|defen[cs]e|parties)[’']?\s+)?(?:joint\s+)?(?:proposed\s+)?jury\s+instructions?|letter motion\b.{0,160}\bproposed jury instructions?)\b|^(?:控辩双方|双方|检方|辩方)?(?:共同提交的?)?(?:拟议)?陪审团指示/iu],
  ['sentencing_submission', /^(?:(?:the\s+)?(?:government|defen[cs]e|defendant|prosecution|victim)[’'s]*\s+)?(?:sentencing (?:submission|memorandum|letter)|submission in (?:support of|opposition to) sentenc)/iu],
  ['objection', /^objection\b|异议书|反对书/iu],
  ['brief', /^(?:redacted\s+)?(?:(?:the\s+)?(?:appellant|appellee|petitioner|respondent|plaintiff|defendant|government)[’']?s?\s+)?(?:legal memorandum|memorandum(?: of law)?|brief|opposition|reply|response)\b|\b(?:reply|opposition|response) memorandum of law\b|\bmemorandum (?:for|in|supporting|regarding)\b|\bletter brief\b|\bopposition to .{0,100}\bmotion\b|法律备忘录|反对意见|回复书|答复书/iu],
  ['motion', /^(?:(?:final|letter|notice of|cross-)[- ]*)?motion\b|^(?:application|request) (?:for|to)\b|^extend time\b|\bletter motion\b|^(?:ho wan kwok[’']s|miles guo[’']s|yanping wang[’']s|luc despins[’']s|chapter 11 trustee|government|defen[cs]e|defendant|plaintiff|petitioner|claimant)\s+motion (?:for|to)\b|申请法院|动议/iu],
  ['declaration', /^(?:declaration|affidavit|affirmation)\b|\b(?:reply|supporting|supplemental) declaration\b|\b(?:attorney|agent) (?:affidavit|affirmation)\b|\bdeclaration supporting\b|宣誓声明|声明书|证词/iu],
  ['transcript', /^transcript(?: of proceedings)?\b|庭审记录|听证记录|逐字记录/iu],
  ['proof_of_claim', /\bproof of claim\b|债权申报证明/iu],
  ['forfeiture_claim', /^(?:\(redacted\)\s+)?petition (?:of third-party claimant|under .{0,160}(?:§\s*)?853\(n\)|pursuant to .{0,160}(?:§\s*)?853\(n\))|\b(?:third-party|ancillary) petition\b|\b(?:petition in response|remission request|forfeiture claim)\b|第三方没收申请|附属申请|返还申请/iu],
  ['bill_of_particulars', /\bbill of particulars\b|细节说明书/iu],
  ['fact_statement', /^(?:redacted\s+)?(?:local rule \d+(?:\([a-z0-9]+\))*\s+)?statement of (?:undisputed\s+)?(?:material\s+)?facts\b|无争议事实陈述/iu],
  ['evidence_submission', /^(?:submission of evidence|victim (?:impact )?statements?|supporter statements?|(?:(?:supplemental )?expert disclosure)|analysis report)\b|证据提交|受害人陈述/iu],
  ['stipulation', /^stipulation\b|双方约定书|协议书/iu],
  ['withdrawal', /^(?:notice of )?withdraw(?:al| appearance)\b|撤回通知|撤回出庭/iu],
  ['exhibit_list', /^(?:chapter 11 trustee[’']s\s+)?exhibit list\b|证物清单/iu],
  ['exhibit', /^(?:exhibit|attachment|appendix)\b|证物|附件|附录/iu],
  ['status_report', /^(?:chapter 11\s+)?(?:(?:joint|supplemental)\s+)?(?:status report|monthly operating report|operating report)\b|^statement\s*[-/]\s*(?:\/\s*)?(?:expense|operating) report\b|\bjoint status letter\b|状态报告|月度经营报告/iu],
  ['mediator_report', /^mediator[’']s report and recommendation\b|调解员报告和建议/iu],
  ['bankruptcy_petition', /^(?:amended\s+)?voluntary petition\b|破产申请/iu],
  ['bankruptcy_plan', /^chapter 11 plan\b|第 11 章重整计划/iu],
  ['bankruptcy_notice', /^suggestion of bankruptcy\b|破产事项通知/iu],
  ['appellate_form', /^form b\b|^usbc transmittal form\b|上诉程序表格/iu],
  ['word_count_certificate', /^certificate of word count\b|字数证明/iu],
  ['jury_note', /^jury notes?\b|陪审团问题单/iu],
  ['agency_guidance', /^(?:sec\s+)?(?:guidance|excess personal property guidance)\b|机构指南/iu],
  ['scheduling_record', /^(?:minute entry|scheduling order|conference|hearing|appointment of)\b|庭期|排期|截止日期|会议记录/iu],
  ['supplemental_filing', /^(?:supplemental document|supplement to|clarification on|redaction by)\b|补充文件/iu],
  ['letter', /^(?:this is (?:a )?)?(?:joint\s+)?letter\b|\b(?:representation|jurisdiction) letter\b|致法院信函|律师函/iu],
  ['notice', /^(?:stricken[^,]*,\s*)?notice\b|通知书|公告/iu],
]

const descriptiveTypeRules = [
  ['appellate_mandate', /^(?:second circuit|court of appeals|appellate court)\s+mandate\b/iu],
  ['mandamus_petition', /^(?:pro se\s+)?third-party claimants?\s+petitioned\b.{0,180}\bwrit of mandamus\b/iu],
  ['forfeiture_claim', /^(?:an?\s+)?(?:pro se |third-party )?(?:petitioner|petition|claimant|investor|himalaya exchange user|post oak motors)\b.{0,180}\b(?:forfeit|seized|assets?|property|rightful interest|ownership interest|remission)\w*\b|^(?:an?\s+)?attorney\b.{0,180}\bmembers?\b.{0,100}\b(?:return|recover)\w*\b.{0,80}\bseized\b/iu],
  ['scheduling_record', /^(?:the )?(?:court|judge)\s+announces?\b.{0,120}\b(?:conference|hearing|sentencing|trial|deadline)\b/iu],
  ['court_order', /(?:(?:^|\band\s+)(?:the )?(?:court|judge(?:\s+[A-Z][a-z]+)?|second circuit)\s+(?:grants?|granted|denies?|denied|orders?|ordered|directs?|holds?|rules?|dismisses?|affirms?|vacates?|remands?|issues?|sets?|adjourns?|continues?|delays?|allows?|rejects?|terminates?|sustains?|reduces?|authorizes?)\b)/iu],
  ['withdrawal', /^(?:the )?(?:petitioner|claimant|government|defen[cs]e|defendant|plaintiff|trustee|counsel|attorney|lawyer)\b.{0,90}\bwithdraws?\b/iu],
  ['appearance', /^(?:an?\s+)?(?:attorney|lawyer|counsel)\b.{0,100}\b(?:enters? (?:(?:an?|his|her|their) )?appearance|will represent|appears? on behalf)\b/iu],
  ['transcript', /^(?:the )?(?:defen[cs]e|government|prosecution|counsel)\s+(?:cross-examines?|examines?|questions?)\b/iu],
  ['motion', /^(?:(?:an?\s+)?(?:victim[’']s\s+)?motion\b|(?:this|the) (?:motion|filing)\b.{0,120}\b(?:asks?|requests?|moves?|seeks?|petitions?|applies?|notifies?)\b|(?:the )?(?:government|defen[cs]e|defendant|plaintiff|petitioner|(?:bankruptcy )?trustee|claimant|counsel|attorney|lawyer|mr\.\s+guo(?:[’']s lawyers?)?)\b.{0,140}\b(?:asks?|requests?|moves?|seeks?|petitions?|applies?)\b|(?:an? )?(?:investor|third-party petitioner|himalaya entit(?:y|ies)|hamilton [^.]{0,50})\b.{0,140}\b(?:asks?|requests?|moves?|seeks?|petitions?)\b)/iu],
  ['brief', /^(?:(?:the )?(?:government|defen[cs]e|defendant|plaintiff|petitioner|(?:bankruptcy )?trustee|claimant|counsel|attorney|lawyer|victim|mr\.\s+guo(?:[’']s lawyers?)?)\b.{0,140}\b(?:argues?|opposes?|objects?|responds?|replies?|urges?|explains?|supports?)\b|the filing\s+(?:argues?|opposes?|objects?|responds?|replies?))/iu],
  ['evidence_submission', /^(?:the )?(?:government|defen[cs]e|defendant|plaintiff|petitioner|trustee|claimant|counsel)\b.{0,80}\bsubmits?\b.{0,80}\b(?:evidence|statements?|declarations?|exhibits?)\b/iu],
  ['status_report', /^(?:the )?(?:government|defen[cs]e|defendant|plaintiff|petitioner|trustee|claimant|counsel|parties)\b.{0,80}\b(?:informs?|reports?|updates?)\b/iu],
]

const categoryTypeFallback = {
  Appeal: 'appeal_notice',
  Judgment: 'judgment',
  Order: 'court_order',
  Sentencing: 'brief',
  Transcript: 'transcript',
  Motion: 'motion',
  Discovery: 'brief',
}

const typeLabels = {
  appellate_mandate: ['上诉法院正式命令', 'appellate mandate'],
  judgment: ['判决文件', 'judgment'],
  verdict: ['陪审团裁决', 'jury verdict'],
  indictment: ['刑事起诉书', 'criminal indictment'],
  indictment_waiver: ['放弃大陪审团起诉文件', 'waiver of indictment'],
  court_order: ['法院命令', 'court order'],
  appeal_notice: ['上诉通知', 'notice of appeal'],
  certiorari_petition: ['最高法院审查申请', 'certiorari petition'],
  mandamus_petition: ['强制令申请', 'mandamus petition'],
  complaint: ['起诉状', 'complaint'],
  answer: ['答辩状', 'answer'],
  counterclaim: ['反诉状', 'counterclaim'],
  sentencing_submission: ['量刑陈述或量刑备忘录', 'sentencing submission or memorandum'],
  jury_instructions: ['拟议陪审团指示', 'proposed jury instructions'],
  objection: ['异议书', 'objection'],
  motion: ['动议或申请', 'motion or application'],
  brief: ['法律书状', 'legal brief'],
  declaration: ['声明或宣誓材料', 'declaration or affidavit'],
  transcript: ['庭审或听证记录', 'hearing or trial transcript'],
  service_record: ['送达证明', 'proof of service'],
  summons: ['传票', 'summons'],
  summons_request: ['传票签发申请', 'request for issuance of summons'],
  service_waiver: ['送达或答复权利放弃书', 'service or response waiver'],
  appearance: ['律师出庭登记', 'counsel appearance'],
  corporate_disclosure: ['公司关系披露', 'corporate disclosure'],
  proof_of_claim: ['债权申报', 'proof of claim'],
  forfeiture_claim: ['没收财产第三方申请', 'third-party forfeiture claim'],
  bill_of_particulars: ['细节说明书', 'bill of particulars'],
  fact_statement: ['无争议事实陈述', 'statement of undisputed facts'],
  evidence_submission: ['证据或陈述材料提交', 'evidence or statement submission'],
  stipulation: ['当事方约定书', 'stipulation'],
  default_entry: ['书记官缺席登记', 'clerk entry of default'],
  deficiency_notice: ['程序缺陷通知', 'procedural deficiency notice'],
  withdrawal: ['撤回文件', 'withdrawal'],
  exhibit_list: ['证物清单', 'exhibit list'],
  exhibit: ['附件或证物', 'exhibit or attachment'],
  status_report: ['状态报告', 'status report'],
  mediator_report: ['调解员报告和建议', 'mediator report and recommendation'],
  bankruptcy_petition: ['破产申请', 'bankruptcy petition'],
  bankruptcy_plan: ['第 11 章重整计划', 'Chapter 11 plan'],
  bankruptcy_notice: ['破产事项通知', 'bankruptcy notice'],
  appellate_form: ['上诉或移送程序表格', 'appellate or transmittal form'],
  word_count_certificate: ['字数证明', 'certificate of word count'],
  transcript_request: ['庭审记录申请', 'transcript request'],
  jury_note: ['陪审团问题或便条', 'jury note'],
  agency_guidance: ['行政机构指南', 'agency guidance'],
  scheduling_record: ['排期或庭务记录', 'scheduling or court-administration record'],
  supplemental_filing: ['补充文件', 'supplemental filing'],
  letter: ['致法院信函', 'letter to the court'],
  notice: ['程序通知', 'procedural notice'],
  docket_filing: ['一般案卷文件', 'general docket filing'],
}

const reliefRules = [
  ['summary_judgment', /summary judgment|简易判决/iu, '简易判决', 'summary judgment'],
  ['dismissal', /dismiss(?:al)?|驳回诉讼/iu, '驳回诉讼', 'dismissal'],
  ['compel', /compel|强制提交|强制履行/iu, '强制提交或履行', 'compelled production or compliance'],
  ['seal', /\bseal(?:ed|ing)?\b|under seal|密封/iu, '密封处理', 'sealing'],
  ['unseal', /unseal|解封/iu, '解封', 'unsealing'],
  ['extension', /extend|extension|enlarge(?:ment)? of time|延期|延长期限/iu, '延长期限', 'an extension of time'],
  ['withdraw_counsel', /withdraw(?:al)? (?:as|of)? ?(?:counsel|attorney|appearance)|撤回出庭|律师退出/iu, '律师退出代理', 'withdrawal of counsel'],
  ['stay', /\bstay\b|中止执行|暂停程序/iu, '中止或暂停程序', 'a stay'],
  ['discovery', /discovery|subpoena|rule 2004|证据开示|传票取证/iu, '证据开示或取证', 'discovery'],
  ['reconsideration', /reconsider|复议/iu, '要求重新考虑', 'reconsideration'],
  ['remand', /remand|发回|移送回原法院/iu, '发回或移送回原法院', 'remand'],
  ['venue_transfer', /transfer venue|change venue|转移审判地/iu, '变更审判地', 'a venue transfer'],
  ['sanctions', /sanction|contempt|藐视法庭|制裁/iu, '制裁或藐视法庭处理', 'sanctions or contempt relief'],
  ['release', /bail|release|detention|保释|释放|羁押/iu, '保释、释放或羁押', 'release or detention'],
  ['adjournment', /adjourn|continue(?:d|ance)?|\bdelay(?:ed|s|ing)?\b|改期|延期审理/iu, '改期或延期审理', 'an adjournment or continuance'],
  ['evidence_limits', /in limine|exclude evidence|suppress|排除证据|证据限制/iu, '证据排除或使用限制', 'limits on evidence'],
  ['forfeiture', /forfeiture|853\(n\)|remission|没收|返还\/减免/iu, '没收财产及第三方权利', 'forfeiture and third-party rights'],
  ['vacatur', /vacate|set aside|撤销判决|撤销裁定/iu, '撤销既有裁判', 'vacatur or setting aside a prior ruling'],
  ['default', /default judgment|certificate of default|缺席判决|缺席登记/iu, '缺席登记或缺席判决', 'default or default judgment'],
  ['injunction', /injunction|temporary restraining order|\bTRO\b|禁令|临时限制令/iu, '临时限制令或禁令', 'injunctive relief'],
]

const outcomeRules = [
  ['mixed', /grant(?:ed|s|ing)? in part.{0,100}den(?:ied|ies|ying) in part|部分准许.{0,30}部分驳回/isu, '部分准许、部分驳回', 'granted in part and denied in part'],
  ['mixed', /\b(?:grant(?:ed|s|ing)?\b.{0,180}\bden(?:ied|ies|ying)|den(?:ied|ies|ying)\b.{0,180}\bgrant(?:ed|s|ing)?)\b/isu, '分别准许和驳回了不同事项', 'granted some matters and denied others'],
  ['mixed', /\b(?:sustain(?:ed|s|ing)?\b.{0,180}\bden(?:ied|ies|ying)|den(?:ied|ies|ying)\b.{0,180}\bsustain(?:ed|s|ing)?)\b/isu, '部分采纳异议并驳回其他事项', 'sustained objections in part and denied other matters'],
  ['affirmed', /\baffirm(?:ed|s|ing)\b|维持原裁判/iu, '维持原裁判', 'affirmed'],
  ['vacated', /\bvacat(?:ed|es|ing)\b|撤销原裁判/iu, '撤销原裁判', 'vacated'],
  ['remanded', /\bremand(?:ed|s|ing)\b|发回重审|发回下级法院/iu, '发回下级法院继续处理', 'remanded'],
  ['dismissed', /\bdismiss(?:ed|es|ing)\b|驳回诉讼/iu, '驳回', 'dismissed'],
  ['denied', /\bden(?:ied|ies|ying)\b|驳回申请|不予准许/iu, '不予准许', 'denied'],
  ['granted', /\bgrant(?:ed|s|ing)\b|准许申请/iu, '准许', 'granted'],
  ['terminated', /\bterminat(?:ed|es|ing)\b|终止程序/iu, '终止', 'terminated'],
  ['stayed', /\bstay(?:ed|s|ing)\b|中止程序|暂停执行/iu, '中止或暂停', 'stayed'],
  ['unsealed', /\bunseal(?:ed|s|ing)\b|解除密封|有限解封/iu, '解封', 'unsealed'],
  ['sustained', /\bsustain(?:ed|s|ing)\b|采纳异议/iu, '采纳异议', 'sustained'],
  ['ordered', /\border(?:ed|s|ing)\b|命令实施/iu, '作出命令', 'ordered'],
]

const filingSideRules = [
  [/\b(?:united states|government|usa|prosecution)\b.{0,45}\b(?:filed|moves|requests|responds|asks|argues|opposes|submits|informs)|\b(?:filed|motion|letter|response) by (?:the )?(?:united states|government|usa)\b/iu, '政府方', 'the government'],
  [/\bchapter 11 trustee\b|\btrustee(?:[’']s)?\b.{0,45}\b(?:filed|moves|requests|asks|argues|opposes|submits|informs)|受托人/iu, '破产受托人', 'the bankruptcy trustee'],
  [/\b(?:defendant|defen[cs]e)(?:[’']s)?\b.{0,45}\b(?:filed|moves|requests|responds|asks|argues|opposes|submits|informs)|\bfiled by defendant\b|\bmr\.\s+guo[’']s (?:lawyers?|counsel)\b|被告方/iu, '被告方', 'the defense'],
  [/\bplaintiff(?:[’']s)?\b.{0,45}\b(?:filed|moves|requests|responds|asks|argues|opposes|submits|informs)|\bfiled by plaintiff\b|原告方/iu, '原告方', 'the plaintiff'],
  [/\bappellant(?:'s)?\b|上诉人/iu, '上诉人', 'the appellant'],
  [/\bappellee(?:'s)?\b|被上诉人/iu, '被上诉人', 'the appellee'],
  [/\bpetitioner(?:'s)?\b|申请人|请愿人/iu, '申请人', 'the petitioner'],
  [/\bcreditor(?:'s)?\b|债权人/iu, '债权人', 'the creditor'],
  [/\bclaimant(?:'s)?\b|权利主张人|索赔人/iu, '权利主张人', 'the claimant'],
]

export function interpretOfflineLegalDocument({ file = {}, category = 'Docket Filing', extraction = null, lang = 'zh' } = {}) {
  const english = lang === 'en'
  const title = cleanText(file.title ?? file.originalTitle ?? file.filename ?? '')
  const filename = cleanText(file.filename ?? file.path ?? '')
  const titleEvidence = `${title} ${filename}`.trim()
  const pages = normalizedPages(extraction)
  const firstBody = pages.slice(0, 3).map((page) => page.text).join('\n')
  const lastBody = pages.slice(-3).map((page) => page.text).join('\n')
  const metadataDetectionTexts = genericTitlePattern.test(title) ? [] : metadataCandidates(title, filename)
  let detectedType = detectDocumentType(metadataDetectionTexts, pages, category)
  if (/^\d+(?:-\d+)+$/u.test(String(file.docNumber ?? '').trim())
    && /\battachments?\s*:/iu.test(title)
    && ['complaint', 'motion', 'brief', 'jury_instructions'].includes(detectedType.key)) {
    detectedType = { key: 'exhibit', citation: { kind: 'source_metadata', pageNumber: null } }
  }
  if (/^\d+(?:-\d+)+$/u.test(String(file.docNumber ?? '').trim()) && detectedType.key === 'docket_filing') {
    detectedType = { key: 'exhibit', citation: { kind: 'source_metadata', pageNumber: null } }
  }
  const typeKey = detectedType.key
  const typeLabel = labelFor(typeLabels[typeKey], english)
  const filingSide = detectFilingSide(`${titleEvidence}\n${firstBody}`)
  // Long filings often discuss remedies they do not request. Infer requested
  // relief only from the filing metadata, never from an incidental body phrase.
  const relief = typeKey === 'jury_instructions' ? null : detectRule(reliefRules, titleEvidence)
  const courtControlled = ['appellate_mandate', 'judgment', 'verdict', 'court_order'].includes(typeKey)
  const outcome = courtControlled ? detectOutcome(titleEvidence, lastBody, pages) : null
  const deadline = localizeDeadline(detectDeadline(`${titleEvidence}\n${lastBody}`, pages), english)
  const citations = uniqueCitations([
    detectedType.citation,
    outcome?.citation,
    deadline?.citation,
  ].filter(Boolean))
  const plainRead = buildPlainRead({ typeKey, typeLabel, filingSide, relief, outcome, deadline, english })
  const professionalRead = buildProfessionalRead({ typeKey, relief, outcome, deadline, category, english })
  const whyItMatters = buildWhyItMatters({ typeKey, outcome, english })
  const verificationTasks = buildVerificationTasks({ typeKey, relief, outcome, deadline, english })
  const riskFlags = buildRiskFlags({ typeKey, outcome, extraction, english })
  const specificity = (typeKey === 'docket_filing' ? 0 : 2) + (relief ? 1 : 0) + (outcome ? 2 : 0) + (deadline ? 1 : 0)

  return {
    typeKey,
    typeLabel,
    reliefKey: relief?.key ?? null,
    outcomeKey: outcome?.key ?? null,
    plainRead,
    professionalRead,
    whyItMatters,
    verificationTasks,
    riskFlags,
    specificity,
    confidence: specificity >= 4 ? 'medium' : 'low',
    basis: pages.length ? 'source_metadata_and_local_text' : 'source_metadata',
    citations: citations.length ? citations : [{ kind: 'source_metadata', pageNumber: null }],
  }
}

function detectDocumentType(metadataTexts, pages, category) {
  for (const metadataText of metadataTexts) {
    for (const [key, pattern] of documentTypeRules) {
      if (pattern.test(metadataText)) return { key, citation: { kind: 'source_metadata', pageNumber: null } }
    }
    for (const [key, pattern] of descriptiveTypeRules) {
      if (pattern.test(metadataText)) return { key, citation: { kind: 'source_metadata', pageNumber: null } }
    }
  }
  for (const page of pages.slice(0, 3)) {
    for (const [key, pattern] of documentTypeRules) {
      if (pattern.test(page.text)) return { key, citation: { kind: 'extracted_page', pageNumber: page.pageNumber } }
    }
  }
  return { key: categoryTypeFallback[category] ?? 'docket_filing', citation: { kind: 'source_metadata', pageNumber: null } }
}

function metadataCandidates(title, filename) {
  const candidates = [cleanText(title)]
  const normalizedTitle = cleanText(title).replace(/^[*#]+\s*/u, '')
  if (normalizedTitle && normalizedTitle !== title) candidates.push(normalizedTitle)
  const withoutDocumentNumber = normalizedTitle.replace(/^(?:recap\s+)?doc(?:ument)?\s*[\w-]+\s*[,：:]?\s*/iu, '')
  if (withoutDocumentNumber && withoutDocumentNumber !== title) candidates.push(withoutDocumentNumber)
  const withoutBareNumber = withoutDocumentNumber.replace(/^\d+(?:-\d+)*[)：:)：.,]?\s+/u, '')
  if (withoutBareNumber && withoutBareNumber !== withoutDocumentNumber) candidates.push(withoutBareNumber)
  const withoutDate = withoutBareNumber.replace(/^(?:(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+\d{1,2},\s+\d{4})\s*[,—–-]*\s*/iu, '')
  if (withoutDate && withoutDate !== withoutBareNumber) candidates.push(withoutDate)
  if (!candidates.some((value) => value && !genericTitlePattern.test(value))) candidates.push(cleanText(filename))
  return [...new Set(candidates.filter(Boolean))]
}

function detectFilingSide(value) {
  const explicitFiler = String(value).slice(0, 1200)
  if (/filed by .{0,160}\bon behalf of .{0,160}\bdefendant\b/iu.test(explicitFiler)) return { zh: '被告方', en: 'the defense' }
  if (/filed by .{0,160}\bon behalf of .{0,160}\bplaintiff\b/iu.test(explicitFiler)) return { zh: '原告方', en: 'the plaintiff' }
  if (/filed by .{0,160}\bon behalf of .{0,160}\b(?:chapter 11 )?trustee\b/iu.test(explicitFiler)) return { zh: '破产受托人', en: 'the bankruptcy trustee' }
  for (const [pattern, zh, en] of filingSideRules) {
    if (pattern.test(value)) return { zh, en }
  }
  return null
}

function detectRule(rules, value) {
  for (const [key, pattern, zh, en] of rules) {
    if (pattern.test(value)) return { key, zh, en }
  }
  return null
}

function detectOutcome(title, lastBody, pages) {
  for (const [key, pattern, zh, en] of outcomeRules) {
    if (pattern.test(title)) return { key, zh, en, citation: { kind: 'source_metadata', pageNumber: null } }
  }
  for (const page of [...pages].reverse().slice(0, 3)) {
    for (const [key, pattern, zh, en] of outcomeRules) {
      if (pattern.test(page.text)) return { key, zh, en, citation: { kind: 'extracted_page', pageNumber: page.pageNumber } }
    }
  }
  void lastBody
  return null
}

function detectDeadline(value, pages) {
  const patterns = [
    /(?:due by|no later than|on or before|answers? due|responses? due|repl(?:y|ies) due|hearing (?:to be )?held on|deadline (?:to|until)|file(?:d)? by)\s*:?[\s\u00a0]*([A-Z][a-z]+\.?\s+\d{1,2},\s+\d{4}(?:\s+at\s+[^.;\n]+)?|\d{1,2}\/\d{1,2}\/\d{2,4}(?:\s+at\s+[^.;\n]+)?)/iu,
    /(?:截止|不得迟于|应于|定于)\s*([0-9]{4}\s*年\s*[0-9]{1,2}\s*月\s*[0-9]{1,2}\s*日(?:\s*[（(]?(?:星期|周)[一二三四五六日天][）)]?)?(?:\s*(?:上午|下午|中午|晚上)\s*[0-9]{1,2}(?::[0-9]{2})?)?)/u,
  ]
  for (const pattern of patterns) {
    const match = value.match(pattern)
    if (!match?.[1]) continue
    const page = pages.find((item) => pattern.test(item.text))
    return {
      value: cleanText(match[1]).slice(0, 100),
      citation: page ? { kind: 'extracted_page', pageNumber: page.pageNumber } : { kind: 'source_metadata', pageNumber: null },
    }
  }
  return null
}

function localizeDeadline(deadline, english) {
  if (!deadline?.value) return deadline
  const value = deadline.value
  const chineseDate = value.match(/([0-9]{4})\s*年\s*([0-9]{1,2})\s*月\s*([0-9]{1,2})\s*日(?:\s*[（(]?(?:星期|周)([一二三四五六日天])[）)]?)?(?:\s*(上午|下午|中午|晚上)\s*([0-9]{1,2})(?::([0-9]{2}))?)?/u)
  if (english && chineseDate) {
    const [, year, month, day, , period, hour, minute] = chineseDate
    const monthName = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][Number(month) - 1]
    const time = hour ? ` at ${hour}${minute ? `:${minute}` : ':00'}${period ? ` ${period === '上午' ? 'a.m.' : 'p.m.'}` : ''}` : ''
    return { ...deadline, value: `${monthName} ${Number(day)}, ${year}${time}` }
  }
  const englishDate = value.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\.?\s+([0-9]{1,2}),\s+([0-9]{4})(?:\s+at\s+([^.;\n]+))?/iu)
  if (!english && englishDate) {
    const month = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'].indexOf(englishDate[1].toLowerCase()) + 1
    const time = englishDate[4] ? ` ${englishDate[4].trim()}` : ''
    return { ...deadline, value: `${englishDate[3]}年${month}月${Number(englishDate[2])}日${time}` }
  }
  return deadline
}

function buildPlainRead({ typeKey, typeLabel, filingSide, relief, outcome, deadline, english }) {
  const side = filingSide ? (english ? filingSide.en : filingSide.zh) : (english ? 'a party' : '一方当事人')
  const reliefLabel = relief ? (english ? relief.en : relief.zh) : null
  const outcomeLabel = outcome ? (english ? outcome.en : outcome.zh) : null
  const deadlineText = deadline
    ? english ? ` The record states a deadline or hearing date of ${deadline.value}.` : `文件记载的期限或庭期是 ${deadline.value}。`
    : ''

  const reads = {
    appellate_mandate: english
      ? `This is the appellate court's formal mandate. It controls what the lower court must do after the appeal; read its exact scope before treating any issue as finally resolved.`
      : `这是上诉法院的正式命令，决定下级法院在上诉处理后应如何继续。必须按命令写明的范围理解，不能把未处理的问题也当成已经终局解决。`,
    judgment: english
      ? `This is a judgment record. It states the result formally entered by the court and can start appeal or enforcement deadlines, but related orders may be needed to understand the reasons and exact relief.`
      : `这是法院正式录入结果的判决文件，可能启动上诉或执行期限。判决告诉你“结果是什么”，具体理由和救济范围通常还要结合相关命令阅读。`,
    verdict: english
      ? `This records the jury's verdict on the submitted counts or claims. It is not the sentence, damages award, or final appellate result unless the document expressly says so.`
      : `这是陪审团对交付审理的罪名或请求作出的裁决。它不自动等于量刑、赔偿金额或最终上诉结果，除非文件明确写明。`,
    indictment: english
      ? `This is a criminal charging document. It states the prosecution's accusations and the counts to be tried; it is not proof of guilt or a conviction.`
      : `这是刑事起诉书，说明检方指控哪些行为和罪名。它能证明“检方提出了什么指控”，不能证明被告已经有罪。`,
    indictment_waiver: english
      ? `This records a defendant's waiver of prosecution by grand-jury indictment, usually allowing the case to proceed by information. It is not by itself a guilty plea or conviction.`
      : `这是被告放弃由大陪审团起诉、通常同意案件改以检察官信息书推进的程序文件。它本身不等于认罪，也不等于已经定罪。`,
    court_order: english
      ? `This is a court order.${outcomeLabel ? ` The recorded disposition is ${outcomeLabel}${reliefLabel ? ` as to ${reliefLabel}` : ''}.` : ` It contains a direction or procedural ruling, but the precise relief and limits must be read from the operative language.`}`
      : `这是法院命令。${outcomeLabel ? `文件显示法院对${reliefLabel ?? '相关事项'}作出的处理是：${outcomeLabel}。` : `它包含法院已经作出的程序安排或裁定；具体准许、驳回和适用范围要以命令的操作性文字为准。`}`,
    appeal_notice: english
      ? `This notice starts or records an appeal. It does not itself reverse the judgment; the next questions are the appellate case number, briefing schedule, issues presented, and later disposition.`
      : `这份通知启动或登记上诉，但不会自动推翻原判。接下来要看上诉案号、书状排期、实际提出的争点和上诉法院后续处理。`,
    certiorari_petition: english
      ? `This asks the Supreme Court to choose the case for review. Filing the petition does not mean the Court accepted the case or agreed with the petitioner.`
      : `这是请求美国最高法院选择审查案件的申请。提交申请不等于最高法院已经受理，更不等于认可申请人的法律观点。`,
    mandamus_petition: english
      ? `This asks an appellate court for the extraordinary remedy of mandamus, usually to compel or stop lower-court action. Filing it does not stay the case or establish that the writ will issue.`
      : `这是请求上诉法院签发强制令，要求下级法院采取或停止某项行动的非常救济申请。提交申请不会自动暂停案件，也不表示强制令一定获准。`,
    complaint: english
      ? `This is the plaintiff's opening pleading. It states allegations, legal claims, and requested relief; those allegations are not court findings, and liability remains undecided.`
      : `这是原告启动诉讼的起诉状，列出事实指控、法律请求和希望法院给予的救济。这里写的是原告主张，不是法院认定，被告是否承担责任仍未决定。`,
    answer: english
      ? `This is the responding party's formal answer. Admissions, denials, lack-of-knowledge responses, defenses, and any jury demand define what is disputed; they are not a ruling on who is right.`
      : `这是被告或答复方的正式答辩。承认、否认、表示信息不足、提出抗辩或要求陪审团，都是在界定争议范围，不代表法院已经判断谁正确。`,
    counterclaim: english
      ? `This is a claim asserted by a responding party against another party. Its allegations and requested relief must be proved and are not court findings.`
      : `这是答复方向其他当事人提出的反诉，列出其事实主张和希望获得的救济。反诉仍需举证，不是法院已经作出的事实认定。`,
    sentencing_submission: english
      ? `This is ${side}'s sentencing submission. It recommends a sentence and presents aggravating, mitigating, victim-impact, or personal-history material; the recommendation is not the sentence imposed by the judge.`
      : `这是${side}提交的量刑陈述，向法官说明建议判多重，并提出加重、减轻、受害影响或个人背景材料。提交方的建议不等于法官最终判处的刑罚。`,
    jury_instructions: english
      ? `These are proposed jury instructions submitted by ${side}. They suggest how the judge should explain the charges, evidence rules, and legal standards to the jury; they are not the final instructions unless the court adopts them.`
      : `这是${side}提交的拟议陪审团指示，建议法官如何向陪审团解释罪名、证据规则和法律标准；除非法院明确采纳，否则不是最终生效的陪审团指示。`,
    objection: english
      ? `This is ${side}'s formal objection to a request, claim, evidence item, or proposed action. It preserves or explains opposition but does not establish that the objection is valid or sustained.`
      : `这是${side}针对某项请求、权利主张、证据或拟议处理提出的正式异议。它用于保留和说明反对立场，不代表法院已经认定异议成立。`,
    motion: english
      ? `This is ${side}'s request for ${reliefLabel ?? 'court action'}. It is a party position, not the result; the request takes legal effect only if the court grants it or the rules make it effective without an order.`
      : `这是${side}向法院提出的${reliefLabel ? `${reliefLabel}请求` : '请求'}。它代表提交方希望法院怎么做，不是法院已经同意；通常要等法院明确准许后才产生相应效果。`,
    brief: english
      ? `This is an advocacy filing from ${side}. It explains why the court should accept or reject a position; cited facts and legal arguments remain that side's presentation unless adopted by the court.`
      : `这是${side}提交的法律书状，用来说明法院为什么应当接受或拒绝某个立场。里面的事实叙述和法律论证仍属于提交方意见，除非法院在裁定中采纳。`,
    declaration: english
      ? `This is evidence submitted through a declaration or affidavit. It may be sworn, but its weight still depends on personal knowledge, exhibits, credibility, objections, and any contrary evidence.`
      : `这是以声明或宣誓书形式提交的证据。即使经过宣誓，也仍要核对陈述人是否亲历、附件是否支持、是否受到反驳，以及法院最终是否采信。`,
    transcript: english
      ? `This is a record of what was said or ruled in court. Exact wording matters: counsel's argument, witness testimony, and the judge's ruling must be separated rather than summarized as one court finding.`
      : `这是法庭上实际发言、证言和裁判过程的记录。律师论点、证人证言与法官裁定必须分开，不能把庭上所有话都当成法院认定。`,
    service_record: english
      ? `This records how and when papers were served. It may affect response deadlines, but it does not prove the complaint, motion, or other underlying claims.`
      : `这是送达记录，用来证明文件何时、以什么方式交给了相关人员。它可能触发答复期限，但不证明起诉状、动议或其他实体主张正确。`,
    summons: english
      ? `This is formal notice that a case or claim requires a response. It does not decide liability; check the service date and response deadline.`
      : `这是要求相关一方回应案件或请求的正式通知，不裁判责任。普通人最需要看送达日期和答复截止日期。`,
    summons_request: english
      ? `This asks the clerk or court to issue a summons. The request is not proof that service occurred and does not decide liability.`
      : `这是请求书记官或法院签发传票的申请。提出申请不等于传票已经完成送达，也不决定被告是否承担责任。`,
    service_waiver: english
      ? `This waives a procedural right concerning service or an initial response. It does not concede the merits and does not mean the court will accept or reject the underlying case.`
      : `这是对送达或首轮答复相关程序权利的放弃，不等于承认实体主张，也不表示法院一定会受理或驳回案件。`,
    appearance: english
      ? `This registers a lawyer's appearance for the identified client or party. It changes counsel-of-record information, not the merits, judgment, sentence, or ownership of property.`
      : `这是律师为特定当事人登记出庭的文件，只更新谁是案卷中的代理律师，不改变实体争议、判决、刑期或财产所有权。`,
    corporate_disclosure: english
      ? `This disclosure helps judges identify possible conflicts by listing specified parents or affiliates. It is not a complete ownership or control map and does not prove alter ego or liability.`
      : `这份披露帮助法官检查利益冲突，列出规则要求申报的母公司或关联方。它不是完整股权和控制关系图，也不能单独证明人格混同或责任。`,
    proof_of_claim: english
      ? `This asserts a creditor's claim against the bankruptcy estate. Filing a claim does not mean the amount or priority has been allowed; objections and court review may follow.`
      : `这是债权人向破产财产提出的债权申报。申报不等于金额和优先顺位已经被认可，之后仍可能出现异议、举证和法院审查。`,
    forfeiture_claim: english
      ? `This asserts an interest in property connected to forfeiture or asks for remission. It is a claimant's position, not a ruling that the claimant owns the property or qualifies for return.`
      : `这是第三方对拟没收财产主张权益，或请求行政返还/减免的材料。提交申请不等于法院已经确认所有权，也不等于政府已经同意返还。`,
    bill_of_particulars: english
      ? `This is the prosecution's formal specification of alleged conduct, property, or forfeiture details beyond the charging instrument. It narrows notice but is not proof of guilt or forfeiture entitlement.`
      : `这是检方对起诉或没收事项作出的正式细节说明，用来进一步明确被指控行为、财产或范围。它补充指控通知，但不证明被告有罪或财产当然应被没收。`,
    fact_statement: english
      ? `This is a party's proposed statement of facts, often used on summary judgment. A fact is not established merely because it appears here; compare the response, cited evidence, and the court's ruling.`
      : `这是当事方提出的事实陈述，常用于简易判决程序。某项内容写在这里不等于已经成为无争议事实，必须对照对方回应、所引证据和法院裁定。`,
    evidence_submission: english
      ? `This submits evidence, statements, or supporting material for the court's consideration. Submission does not establish authenticity, admissibility, credibility, or adoption by the judge.`
      : `这是把证据、陈述或支持材料提交法院审阅的文件。提交本身不证明材料真实、可采、可信，也不表示法官已经采纳。`,
    stipulation: english
      ? `This records an agreement between parties about dismissal, timing, facts, or procedure. Some stipulations take effect on filing; others require court approval, so check the governing rule and any endorsement.`
      : `这是当事方就撤诉、期限、事实或程序达成的约定。有些约定提交即生效，有些必须经法院批准，应核对适用规则和法官是否签批。`,
    default_entry: english
      ? `This records, or asks the clerk to record, that a party failed to plead or otherwise defend. It is not automatically a default judgment, damages award, or final merits ruling.`
      : `这是书记官已经登记或被请求登记某一方未按期答辩。缺席登记不自动等于缺席判决、赔偿金额或实体责任已经最终确定。`,
    deficiency_notice: english
      ? `This identifies a filing or pleading defect that may require correction. It is an administrative or procedural warning, not a merits ruling.`
      : `这是指出提交文件存在格式、当事人或其他程序缺陷的通知，通常要求补正。它属于程序警示，不是对实体争议的裁判。`,
    withdrawal: english
      ? `This withdraws, or asks to withdraw, a filing, claim, motion, or counsel appearance. Confirm exactly what was withdrawn and whether court approval was required.`
      : `这是撤回文件、请求、权利主张或律师出庭的材料。必须确认撤回对象和范围，并核对是否还需要法院批准。`,
    exhibit_list: english
      ? `This is an index of proposed or submitted exhibits. Listing an item does not prove admission into evidence, authenticity, or reliance by the court.`
      : `这是拟提交或已提交证物的清单。列入清单不等于证物已经获准采纳，也不证明真实性或法院已经依赖该证物。`,
    exhibit: english
      ? `This is supporting material attached to another filing. Its meaning depends on the parent filing, who offered it, authenticity, admissibility, and whether the court relied on it.`
      : `这是附在主文件后的证物或附件。要结合“谁提交、用于证明什么、是否真实可采、法院有没有引用”来理解，不能把附件本身当成独立裁定。`,
    status_report: english
      ? `This updates the court on current activity or operations. It records the reporting party's account and may prompt scheduling or oversight, but it is not automatically a finding or final resolution.`
      : `这是向法院报告当前进展或经营情况的文件，主要反映报告方提供的信息。它可能影响监督和排期，但通常不是法院认定或最终结果。`,
    mediator_report: english
      ? `This reports a mediator's status or recommendation, which may include whether settlement was reached. It is not itself a court judgment or an enforceable merits ruling unless later adopted or embodied in an order.`
      : `这是调解员向法院报告调解状态或提出建议，可能说明是否达成和解。除非之后被法院采纳或写入命令，它本身不是判决或实体裁定。`,
    bankruptcy_petition: english
      ? `This starts or amends a bankruptcy case. It can trigger bankruptcy procedures and potentially the automatic stay, but schedules and debtor statements still require verification.`
      : `这是启动或修改破产案件的申请，可能触发破产程序及自动停止效力。申请书和财产负债表中的陈述仍需核验，不等于法院确认全部内容。`,
    bankruptcy_plan: english
      ? `This proposes how claims, assets, and obligations would be treated in Chapter 11. It is not binding as a confirmed plan unless the court enters a confirmation order.`
      : `这是第 11 章案件中关于债权、资产和义务如何处理的重整方案。法院未作确认命令前，拟议计划不等于已获批准并具有约束力。`,
    bankruptcy_notice: english
      ? `This notifies another court or parties that a bankruptcy case may affect the proceeding, often through the automatic stay. The actual effect depends on the debtor, claim, property, and bankruptcy orders.`
      : `这是通知法院或当事人相关破产案件可能影响当前程序，常涉及自动停止。实际效果取决于债务人身份、请求或财产范围及破产法院命令。`,
    appellate_form: english
      ? `This is an appellate or court-transmittal form used to open, route, or administer a proceeding. Its legal effect depends on the completed fields and governing appellate rules.`
      : `这是用于登记、移送或管理上诉程序的法院表格。普通人应看填写了什么事项和触发了哪一步，具体效果取决于表格内容和上诉规则。`,
    word_count_certificate: english
      ? `This certifies compliance with a word-count or format limit. It does not add merits arguments or show that the court accepted those arguments.`
      : `这是证明书状符合字数或格式限制的程序文件，不增加实体论点，也不表示法院接受了所附书状的观点。`,
    transcript_request: english
      ? `This asks for preparation or delivery of a hearing or trial transcript. It is not the transcript itself and does not establish what was said or ruled.`
      : `这是请求制作或提供庭审、听证记录的文件，不是庭审记录本身，也不能据此确定庭上说了什么或法官如何裁定。`,
    jury_note: english
      ? `This records a question or communication from the jury during deliberations. It is not the verdict; read the court's response and later verdict separately.`
      : `这是陪审团在评议期间提出的问题或传递的便条，不是陪审团裁决。应另行核对法官如何答复以及之后是否作出正式裁决。`,
    agency_guidance: english
      ? `This is agency guidance or administrative reference material. It may explain practice but is not a court order and may not carry the force of a binding rule.`
      : `这是行政机构发布的指南或参考材料，可用于理解操作流程，但不是法院命令，也不当然具有正式法规的约束力。`,
    scheduling_record: english
      ? `This sets or records a hearing, conference, deadline, or other court-administration step. Missing the stated date can have procedural consequences even though the record does not decide the merits.`
      : `这是庭期、会议、截止日期或其他庭务安排。它不决定实体输赢，但错过文件写明的日期可能产生程序后果。`,
    supplemental_filing: english
      ? `This supplements an earlier filing or updates the record. Its meaning and legal effect depend on the referenced parent document and whether the supplement changes a request, fact, or deadline.`
      : `这是补充先前文件或更新案卷记录的材料。必须回到它引用的主文件，确认补充的是请求、事实还是期限，以及是否改变原文件含义。`,
    letter: english
      ? `This is correspondence submitted to the court. Determine whether it merely reports status or asks for relief; any request remains pending unless the court acts on it.`
      : `这是提交给法院的信函。要先区分它只是报告情况，还是在请求法院采取行动；信中请求在法院处理前仍只是提交方立场。`,
    notice: english
      ? `This gives procedural notice of an event, position, filing, or deadline. It proves that notice was filed, not that the underlying factual or legal position is correct.`
      : `这是对某项事件、立场、文件或期限的程序性通知。它能证明“通知已经提交”，不能证明通知背后的事实或法律立场正确。`,
    docket_filing: english
      ? `This is a docket filing whose precise function is not reliably established from the available title alone. Read the opening and final pages to identify the filer, requested relief, and any court disposition.`
      : `现有标题不足以可靠判断这份案卷文件的具体作用。快速阅读时先看首页是谁提交、请求什么，再看末页有没有法院的准许、驳回、期限或签字。`,
  }
  return `${typeLabel ? `${english ? `Document type: ${typeLabel}. ` : `文件性质：${typeLabel}。`}` : ''}${reads[typeKey] ?? reads.docket_filing}${deadlineText}`.trim()
}

function buildProfessionalRead({ typeKey, relief, outcome, deadline, category, english }) {
  const posture = english ? `Procedural posture: ${labelFor(typeLabels[typeKey], true)}.` : `程序姿态：${labelFor(typeLabels[typeKey], false)}。`
  const effect = professionalEffect(typeKey, english)
  const items = [posture, effect]
  if (relief) items.push(english ? `Subject identified by local rules: ${relief.en}. Confirm the exact requested relief and governing standard in the filing.` : `本地规则识别的事项：${relief.zh}。应在原文中确认具体救济、适用规则和证明标准。`)
  if (outcome) items.push(english ? `Disposition signal: ${outcome.en}. Check whether it applies to every branch of relief and whether it is with or without prejudice.` : `处理结果信号：${outcome.zh}。应核对它是否覆盖全部请求，以及是否注明“不影响再次提出”等限制。`)
  if (deadline) items.push(english ? `Recorded date signal: ${deadline.value}. Determine who must act, how time is computed, and whether later orders changed it.` : `识别到期限或庭期：${deadline.value}。应确认义务主体、期限计算方法，以及后续命令是否修改。`)
  if (['Forfeiture', 'Bankruptcy'].includes(category)) items.push(english ? 'Keep asset identity, nominal title, beneficial-ownership allegations, procedural claim status, and actual court findings in separate fields.' : '应分别记录资产身份、名义产权、受益所有权主张、申请程序状态和法院实际认定。')
  return items
}

function professionalEffect(typeKey, english) {
  const advocacy = ['indictment', 'complaint', 'counterclaim', 'answer', 'motion', 'brief', 'objection', 'sentencing_submission', 'jury_instructions', 'certiorari_petition', 'mandamus_petition', 'forfeiture_claim', 'proof_of_claim', 'bill_of_particulars', 'fact_statement', 'bankruptcy_plan', 'letter']
  const evidence = ['declaration', 'evidence_submission', 'exhibit', 'exhibit_list', 'transcript', 'jury_note', 'status_report', 'mediator_report']
  if (advocacy.includes(typeKey)) return english
    ? 'Evidentiary weight: party allegation, request, or advocacy unless an operative ruling adopts it.'
    : '证明力边界：属于当事方指控、请求或论证；除非法院在操作性裁定中采纳，不能写成法院认定。'
  if (evidence.includes(typeKey)) return english
    ? 'Evidentiary weight: source material whose admissibility, completeness, credibility, and use by the court must be evaluated separately.'
    : '证明力边界：属于来源材料；真实性、完整性、可采性、可信度以及法院是否采用，需要分别判断。'
  if (['court_order', 'judgment', 'appellate_mandate', 'verdict'].includes(typeKey)) return english
    ? 'Legal effect: court-controlled material. Read the operative language, scope, finality, and any incorporated document before applying it.'
    : '法律效果：属于法院控制的材料。适用时必须核对操作性文字、范围、终局性以及是否并入其他文件。'
  return english
    ? 'Legal effect: primarily procedural. It may trigger a deadline or preserve a position without resolving the merits.'
    : '法律效果：主要是程序性作用，可能触发期限或保留立场，但通常不解决实体争议。'
}

function buildWhyItMatters({ typeKey, outcome, english }) {
  if (['court_order', 'judgment', 'appellate_mandate', 'verdict'].includes(typeKey)) return [english
    ? `This document can change legal rights or the next procedural step${outcome ? ` because a ${outcome.en} disposition was detected` : ''}.`
    : `该文件可能直接改变权利状态或下一程序步骤${outcome ? `；本地规则识别到“${outcome.zh}”处理信号` : ''}。`]
  if (['motion', 'brief', 'objection', 'sentencing_submission', 'jury_instructions', 'complaint', 'counterclaim', 'answer', 'indictment', 'certiorari_petition', 'mandamus_petition', 'forfeiture_claim', 'proof_of_claim'].includes(typeKey)) return [english
    ? 'It defines what a party asks the court to decide and which issues remain contested.'
    : '它界定一方希望法院决定什么，以及哪些事实和法律问题仍有争议。']
  return [english
    ? 'It helps establish the procedural record, evidence trail, or deadline even when it does not decide the merits.'
    : '即使不裁判实体问题，它仍能帮助确认程序记录、证据链或期限。']
}

function buildVerificationTasks({ typeKey, relief, outcome, deadline, english }) {
  const tasks = []
  if (['court_order', 'judgment', 'appellate_mandate'].includes(typeKey)) tasks.push(english ? 'Read the final operative paragraph and signature block; identify every item granted, denied, reserved, or terminated.' : '阅读末尾操作性段落和签字栏，逐项记录准许、驳回、保留或终止的事项。')
  else if (typeKey === 'jury_instructions') tasks.push(english ? 'Compare the proposal with the court\'s final charge and record which instructions were adopted, modified, or rejected.' : '把拟议文本与法院最终向陪审团宣读的指示对照，记录哪些内容被采纳、修改或拒绝。')
  else if (['motion', 'brief', 'objection', 'sentencing_submission', 'complaint', 'counterclaim', 'answer', 'indictment', 'certiorari_petition', 'mandamus_petition', 'forfeiture_claim', 'proof_of_claim', 'fact_statement'].includes(typeKey)) tasks.push(english ? 'Separate allegations and requested relief from admissions, evidence, and later court findings.' : '把指控和请求，与当事人承认、证据以及后续法院认定分开。')
  else if (['exhibit', 'exhibit_list', 'supplemental_filing'].includes(typeKey)) tasks.push(english ? 'Open the parent filing and identify the proposition or procedural step this material supports.' : '打开主文件，确认该材料支持哪一个具体命题或程序步骤。')
  else tasks.push(english ? 'Confirm the filer, filing date, referenced docket entries, and the document’s exact procedural function.' : '确认提交方、提交日期、引用的案卷条目和文件的准确程序作用。')
  if (relief) tasks.push(english ? `Verify the elements and legal standard governing ${relief.en}.` : `核对${relief.zh}所适用的构成要件和法律标准。`)
  if (outcome) tasks.push(english ? 'Check whether the disposition is final, appealable, without prejudice, or subject to later modification.' : '确认处理结果是否终局、能否上诉、是否不影响再次提出，以及是否被后续命令修改。')
  if (deadline) tasks.push(english ? `Calendar ${deadline.value} only after confirming the responsible party and any later extension.` : `只有在确认义务主体及后续是否延期后，才把 ${deadline.value} 录入正式日历。`)
  return tasks
}

function buildRiskFlags({ typeKey, outcome, extraction, english }) {
  const flags = []
  if (['motion', 'brief', 'objection', 'sentencing_submission', 'jury_instructions', 'complaint', 'counterclaim', 'answer', 'indictment', 'certiorari_petition', 'mandamus_petition', 'forfeiture_claim', 'proof_of_claim', 'bill_of_particulars', 'fact_statement', 'bankruptcy_plan'].includes(typeKey)) flags.push(english ? 'Do not restate this party filing as a court finding.' : '不得把这份当事方文件改写成法院认定。')
  if (['court_order', 'judgment', 'appellate_mandate'].includes(typeKey) && !outcome) flags.push(english ? 'No reliable disposition phrase was extracted; the operative paragraph still requires direct review.' : '尚未可靠提取处理结果；仍需直接阅读操作性段落。')
  if (!extraction || extraction.status !== 'extracted') flags.push(english ? 'The quick read is based on source metadata because local body text is unavailable.' : '本次快速解读基于来源元数据，因为本地正文不可用。')
  else if (extraction.coverage !== 'complete') flags.push(english ? 'Only part of the body was extracted; omitted or sealed pages may change the analysis.' : '正文仅部分提取；缺页、密封页或省略内容可能改变解读。')
  return flags
}

function normalizedPages(extraction) {
  if (extraction?.status !== 'extracted' || !Array.isArray(extraction.pageSnippets)) return []
  return extraction.pageSnippets
    .map((page) => ({ pageNumber: Number(page?.pageNumber), text: cleanText(page?.text ?? '') }))
    .filter((page) => Number.isInteger(page.pageNumber) && page.pageNumber > 0 && page.text)
}

function uniqueCitations(values) {
  const seen = new Set()
  return values.filter((citation) => {
    const key = `${citation.kind}:${citation.pageNumber ?? ''}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function labelFor(labels, english) {
  return labels?.[english ? 1 : 0] ?? (english ? 'document' : '文件')
}

function cleanText(value) {
  return String(value ?? '').normalize('NFKC').replace(/\s+/gu, ' ').trim()
}
