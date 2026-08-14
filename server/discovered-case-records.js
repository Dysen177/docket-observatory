import { compareDocketNumbers } from './docket-number.js'

const discoveredCasePrefix = /^discovered-/u

function clean(value) {
  return String(value ?? '').replace(/\s+/gu, ' ').trim()
}

function captionFromFile(file) {
  const labels = [file.sourceLabel, file.sourcePage]
    .map(clean)
    .filter(Boolean)
  const label = labels.find((value) => !/^Related-name discovery\b/i.test(value)) ?? labels[0] ?? ''
  const withoutSearchSuffix = label
    .replace(/\s+(?:public\s+)?RECAP\s+search$/iu, '')
    .replace(/\s+public\s+search$/iu, '')
    .trim()
  if (withoutSearchSuffix && !/^https?:\/\//iu.test(withoutSearchSuffix)) return withoutSearchSuffix

  const sourcePage = labels.find((value) => /^https?:\/\//iu.test(value))
  try {
    const slug = new URL(sourcePage).pathname.split('/').filter(Boolean).at(-1) ?? ''
    const readable = decodeURIComponent(slug).replace(/[-_]+/gu, ' ').trim()
    if (readable) return readable.replace(/\b\w/gu, (letter) => letter.toUpperCase())
  } catch {
    // Keep the neutral docket fallback below when a search URL is malformed.
  }
  return `Publicly discovered docket ${file.docketNumber ?? file.caseId}`
}

function kindForFile(file) {
  const value = `${file.court ?? ''} ${file.title ?? ''} ${file.sourceLabel ?? ''}`.toLowerCase()
  if (value.includes('bankr') || value.includes('chapter 11') || /^\d{2}-05\d{3}/u.test(String(file.docketNumber ?? ''))) return 'Bankruptcy / Related Proceeding'
  if (value.includes('appeal') || value.includes('second circuit') || /^\d{2}-\d{3,5}$/u.test(String(file.docketNumber ?? ''))) return 'Appellate / Related Proceeding'
  if (value.includes('criminal')) return 'Criminal / Related Proceeding'
  return 'Civil / Related Proceeding'
}

function priorityForGroup(files, kind) {
  const text = files.map((file) => `${file.title ?? ''} ${file.sourceLabel ?? ''}`).join(' ').toLowerCase()
  if (text.includes('trustee') || text.includes('despins') || kind.startsWith('Criminal')) return 'high'
  return 'medium'
}

function latestDate(files) {
  return files
    .map((file) => String(file.filedAt ?? ''))
    .filter((value) => /^20\d{2}-\d{2}-\d{2}$/u.test(value))
    .sort()
    .at(-1) ?? null
}

function sortFiles(left, right) {
  return String(right.filedAt ?? '').localeCompare(String(left.filedAt ?? ''))
    || compareDocketNumbers(right.docNumber, left.docNumber)
}

export function discoveredCaseRecords(manifest, state) {
  const seedIds = new Set((state?.cases ?? []).map((record) => record.id))
  const groups = new Map()
  for (const file of manifest?.files ?? []) {
    if (file?.status === 'error' || !file?.caseId || !discoveredCasePrefix.test(file.caseId) || seedIds.has(file.caseId)) continue
    const files = groups.get(file.caseId) ?? []
    files.push(file)
    groups.set(file.caseId, files)
  }

  return [...groups.entries()]
    .map(([id, unsortedFiles]) => {
      const files = [...unsortedFiles].sort(sortFiles)
      const first = files[0]
      const kind = kindForFile(first)
      const reviewRequired = files.some((file) => file.relationStatus === 'pending_review')
      const docket = first.docketNumber ?? 'Public docket number unavailable'
      const lastDate = latestDate(files)
      const caption = captionFromFile(first)
      return {
        id,
        title: caption,
        shortTitle: `Discovered docket ${docket}`,
        court: first.court ?? 'Federal court',
        docket,
        kind,
        status: reviewRequired
          ? 'Publicly discovered related docket; relationship remains pending review'
          : 'Publicly discovered related docket with source-linked records',
        priority: priorityForGroup(files, kind),
        lastKnownFiling: lastDate ? `Public RECAP record observed through ${lastDate}` : 'Public filing date unavailable',
        stage: reviewRequired
          ? 'Public search records and PDFs are retained as a related-case lead. The caption establishes a procedural record, not ownership, control, alter ego, or liability.'
          : 'Public source-linked records are retained for docket-level review. Operative pleadings, orders, judgments, and any appellate disposition must be read separately.',
        focus: kind.startsWith('Bankruptcy')
          ? 'Trustee, creditor, estate-property, dischargeability, ownership, and recovery issues shown in the public record.'
          : kind.startsWith('Appellate')
            ? 'Appellate jurisdiction, record development, party positions, and the operative order or mandate.'
            : 'Caption, claims, defenses, motions, orders, and the boundary between public relationship evidence and legal conclusions.',
        sourceIds: ['courtlistener-recap', 'pacer'],
        watchQuestions: [
          'Read the operative complaint or petition, responsive pleading, dispositive order, and judgment separately.',
          reviewRequired
            ? 'Confirm the complete caption and party relationship before promoting this lead beyond pending review.'
            : 'Separate allegations and party positions from facts adopted in an operative court ruling.',
        ],
        discovered: true,
        relationshipReviewRequired: reviewRequired,
        discoveredFileCount: files.length,
      }
    })
    .sort((left, right) => (right.priority === 'high') - (left.priority === 'high') || left.court.localeCompare(right.court) || left.docket.localeCompare(right.docket))
}

export function allCaseRecords(state, manifest) {
  return [...(state?.cases ?? []), ...discoveredCaseRecords(manifest, state)]
}

export function localizeDiscoveredCase(record, lang) {
  if (!record?.discovered || lang === 'en') return record
  return {
    ...record,
    title: `待核验关联案：${record.title}`,
    shortTitle: `待核验案 ${record.docket}`,
    kind: record.kind.replace('Bankruptcy / Related Proceeding', '破产/关联程序').replace('Appellate / Related Proceeding', '上诉/关联程序').replace('Criminal / Related Proceeding', '刑事/关联程序').replace('Civil / Related Proceeding', '民事/关联程序'),
    status: record.relationshipReviewRequired ? '公开发现的关联案卷；关联关系待人工核验' : '公开发现的关联案卷；已有来源记录支持',
    lastKnownFiling: record.lastKnownFiling.replace('Public RECAP record observed through', '公开 RECAP 记录观测至').replace('Public filing date unavailable', '公开文件日期不可用'),
    stage: record.relationshipReviewRequired
      ? '公开搜索记录和 PDF 已保留为关联线索。案名只能证明程序记录，不能单独证明所有权、控制、人格混同或法律责任。'
      : '公开来源记录已保留并进入案卷级核验。诉状、法院命令、判决和上诉结果必须分别阅读。',
    focus: record.kind.startsWith('Bankruptcy')
      ? '公开记录显示的受托人、债权人、破产财产、清偿、所有权和追回问题。'
      : record.kind.startsWith('Appellate')
        ? '上诉管辖权、案卷形成、各方立场以及正式命令或授权令。'
        : '案名、诉求、抗辩、动议、命令，以及公开关联证据与法律结论的边界。',
    watchQuestions: [
      '分别阅读操作性起诉状或申请、答辩文件、决定性命令和判决。',
      record.relationshipReviewRequired ? '先核对完整案名和当事人关系，再决定是否提升该线索的关联等级。' : '把诉状指控和当事人立场与法院在操作性裁定中采纳的事实分开。',
    ],
  }
}

export function localizeCaseRecord(record, lang) {
  return record?.discovered ? localizeDiscoveredCase(record, lang) : record
}
