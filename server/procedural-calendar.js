import { translateCaseFieldsToEn, translateCaseFieldsToZh, translateEventFieldsToZh } from './i18n.js'

export function buildProceduralCalendar(state, lang = 'zh') {
  const items = []
  for (const event of state.events) {
    const caseRecord = state.cases.find((item) => item.id === event.caseId)
    if (!caseRecord || !event.date) continue
    if (['Appeal', 'Judgment', 'Sentencing', 'Forfeiture', 'Mandamus', 'Bankruptcy Appeal'].includes(event.category)) {
      items.push(calendarEvent(event, caseRecord, lang))
    }
  }

  items.push(...verificationItems(state, lang))
  return {
    generatedAt: new Date().toISOString(),
    disclaimer: lang === 'en'
      ? 'This page is primarily an index of dates that already occurred, including filings, orders, and hearings. Only an item explicitly identified as an operative court deadline should be treated as a future cutoff. Verification-needed and research-estimate items are not legal deadlines.'
      : '这里主要按时间整理已经发生的立案、提交、命令和听证日期。只有明确标为“正式期限”的项目才应视为未来截止日；“待官方核验”和“研究推算”不能作为诉讼期限使用。',
    items: items.sort((left, right) => right.date.localeCompare(left.date)),
  }
}

function calendarEvent(event, caseRecord, lang) {
  const localizedEvent = lang === 'en' ? event : { ...event, ...translateEventFieldsToZh(event) }
  const localizedCase = lang === 'en' ? translateCaseFieldsToEn(caseRecord) : translateCaseFieldsToZh(caseRecord)
  return {
    id: `event-${event.id}`,
    caseId: event.caseId,
    caseTitle: localizedCase.shortTitle,
    docket: caseRecord.docket,
    title: localizedEvent.title,
    date: event.date,
    deadlineType: categoryLabel(event.category, lang),
    status: 'known',
    statusLabel: lang === 'en' ? 'Historical docket date' : '历史案卷日期',
    basisDoc: event.filingNumber,
    sourceUrl: event.sourceUrl,
    sourceTier: event.sourceType,
    note: lang === 'en'
      ? `The date is taken from the tracked filing record; the underlying source posture is ${event.sourceType}.`
      : `日期来自已追踪文件记录；当前来源姿态为“${event.sourceType}”。`,
  }
}

function verificationItems(state, lang) {
  const criminal = state.cases.find((item) => item.id === 'sdny-23-cr-118')
  const appeal = state.events.find((event) => event.id === 'sdny-23-cr-118-doc-862')
  const forfeiture = state.events.find((event) => event.id === 'sdny-23-cr-118-doc-859')
  const bankruptcyAppeal = state.cases.find((item) => item.id === 'ca2-24-2504')
  const result = []
  if (criminal && appeal) {
    result.push({
      id: 'direct-appeal-briefing-schedule',
      caseId: criminal.id,
      caseTitle: lang === 'en' ? translateCaseFieldsToEn(criminal).shortTitle : translateCaseFieldsToZh(criminal).shortTitle,
      docket: criminal.docket,
      title: lang === 'en' ? 'Second Circuit docket number and briefing schedule' : '第二巡回案号与书状排期',
      date: appeal.date,
      deadlineType: lang === 'en' ? 'Direct appeal' : '刑事直接上诉',
      status: 'needs_verification',
      statusLabel: lang === 'en' ? 'Needs docket verification' : '需要正式案卷核验',
      basisDoc: appeal.filingNumber,
      sourceUrl: appeal.sourceUrl,
      sourceTier: appeal.sourceType,
      note: lang === 'en' ? 'A notice of appeal is tracked, but the operative Second Circuit schedule is not yet present in an official or RECAP docket record.' : '已追踪上诉通知，但程序中尚无正式或 RECAP 上诉案卷的实际排期。',
    })
  }
  if (criminal && forfeiture) {
    result.push({
      id: 'forfeiture-third-party-window',
      caseId: criminal.id,
      caseTitle: lang === 'en' ? translateCaseFieldsToEn(criminal).shortTitle : translateCaseFieldsToZh(criminal).shortTitle,
      docket: criminal.docket,
      title: lang === 'en' ? 'Asset-specific third-party claim window' : '具体资产第三方权利主张期限',
      date: forfeiture.date,
      deadlineType: '21 U.S.C. § 853(n)',
      status: 'needs_verification',
      statusLabel: lang === 'en' ? 'Service-dependent' : '取决于通知/送达',
      basisDoc: forfeiture.filingNumber,
      sourceUrl: forfeiture.sourceUrl,
      sourceTier: forfeiture.sourceType,
      note: lang === 'en' ? 'The trigger depends on publication or actual notice. Do not calculate a claimant deadline from the order date alone.' : '起算点取决于公告或实际通知，不能只用命令日期计算申请期限。',
    })
  }
  if (bankruptcyAppeal) {
    result.push({
      id: 'bankruptcy-appellate-follow-up',
      caseId: bankruptcyAppeal.id,
      caseTitle: lang === 'en' ? translateCaseFieldsToEn(bankruptcyAppeal).shortTitle : translateCaseFieldsToZh(bankruptcyAppeal).shortTitle,
      docket: bankruptcyAppeal.docket,
      title: lang === 'en' ? 'Rehearing, mandate, and Supreme Court follow-up' : '复议、上诉法院正式命令与最高法院后续',
      date: '2026-04-06',
      deadlineType: lang === 'en' ? 'Appellate follow-up' : '上诉后续',
      status: 'needs_verification',
      statusLabel: lang === 'en' ? 'Needs docket verification' : '需要正式案卷核验',
      basisDoc: '172 F.4th 145',
      sourceUrl: 'https://www.courtlistener.com/',
      sourceTier: 'CourtListener / RECAP',
      note: lang === 'en' ? 'Use the official appellate docket to determine entry, service, rehearing, mandate, and certiorari dates.' : '应以正式上诉案卷核验裁判录入、送达、复议、正式命令和最高法院调卷复审申请日期。',
    })
  }
  return result
}

function categoryLabel(category, lang) {
  if (lang === 'en') return category
  const labels = { Appeal: '上诉', Judgment: '判决', Sentencing: '量刑', Forfeiture: '没收', Mandamus: '强制令', 'Bankruptcy Appeal': '破产上诉' }
  return labels[category] ?? category
}
