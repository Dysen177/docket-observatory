const cjkPattern = /[\u3400-\u9fff\uf900-\ufaff]/gu
const latinWordPattern = /[A-Za-z]+(?:['’][A-Za-z]+)?/gu
const englishFunctionWords = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'because', 'been', 'but', 'by', 'can', 'could',
  'did', 'do', 'does', 'each', 'every', 'for', 'from', 'had', 'has', 'have', 'if', 'in', 'into',
  'is', 'it', 'may', 'must', 'not', 'of', 'on', 'or', 'should', 'that', 'the', 'their', 'then',
  'these', 'this', 'those', 'to', 'unless', 'was', 'were', 'when', 'where', 'which', 'while',
  'who', 'will', 'with', 'without', 'would', 'you', 'your',
])

const directStringPaths = [
  'title',
  'variantLabel',
  'sourceLabel',
  'category',
  'sourcePosture',
  'summary',
  'plainEnglish',
  'relationshipLabel',
  'relationshipControlWarning',
  'relationship.label',
  'relationship.controlWarning',
  'translationStatus.metadata',
  'translationStatus.body',
  'translationStatus.note',
  'researchQuality.label',
  'researchQuality.detail',
  'sourceVerification.label',
  'sourceVerification.note',
  'aiStatus.mode',
  'aiStatus.lastError',
  'textExtraction.label',
  'textExtraction.warning',
  'offlineRead.typeLabel',
  'offlineRead.plainRead',
]

const directArrayPaths = [
  'legalReading',
  'caseConnections',
  'whyItMatters',
  'verificationTasks',
  'riskFlags',
  'relatedTopics',
  'relationshipVerificationTasks',
  'offlineRead.professionalRead',
  'offlineRead.whyItMatters',
  'offlineRead.verificationTasks',
  'offlineRead.riskFlags',
]

const objectArrayPaths = [
  ['relationshipEvidence', ['label', 'description']],
  ['relationship.evidence', ['label', 'description']],
  ['sourceAlternatives', ['sourceLabel', 'label', 'note']],
  ['citations', ['sourcePosture', 'note']],
]

const findingSections = [
  ['summary', false],
  ['plainEnglish', false],
  ['sourcePosture', false],
  ['legalReading', true],
  ['caseConnections', true],
  ['whyItMatters', true],
  ['verificationTasks', true],
  ['riskFlags', true],
]

export const documentLanguageQualityVersion = 4

const semanticFallbackPaths = [
  'title',
  'category',
  'summary',
  'plainEnglish',
  'legalReading',
  'caseConnections',
  'whyItMatters',
  'verificationTasks',
  'riskFlags',
  'offlineRead',
]

export function localizedTextMismatch(value, language) {
  const text = String(value ?? '').normalize('NFKC').trim()
  if (!text || exemptLocalizedValue(text)) return false
  return language === 'en' ? containsChineseProse(text) : containsEnglishProse(text)
}

export function auditDocumentAnalysisLanguage(record, requestedLanguage = record?.analysisLanguage) {
  const language = requestedLanguage === 'en' ? 'en' : 'zh'
  const issues = []
  for (const fieldPath of directStringPaths) {
    const value = getPath(record, fieldPath)
    if (typeof value === 'string' && localizedTextMismatch(value, language)) {
      issues.push(issue(fieldPath, value, language))
    }
  }
  for (const fieldPath of directArrayPaths) {
    const values = getPath(record, fieldPath)
    if (!Array.isArray(values)) continue
    values.forEach((value, index) => {
      if (typeof value === 'string' && localizedTextMismatch(value, language)) {
        issues.push(issue(`${fieldPath}[${index}]`, value, language))
      }
    })
  }
  for (const [fieldPath, keys] of objectArrayPaths) {
    const values = getPath(record, fieldPath)
    if (!Array.isArray(values)) continue
    values.forEach((value, index) => {
      for (const key of keys) {
        if (typeof value?.[key] === 'string' && localizedTextMismatch(value[key], language)) {
          issues.push(issue(`${fieldPath}[${index}].${key}`, value[key], language))
        }
      }
    })
  }
  for (const [index, finding] of (record?.aiFindings ?? []).entries()) {
    if (typeof finding?.text === 'string' && localizedTextMismatch(finding.text, language)) {
      issues.push(issue(`aiFindings[${index}].text`, finding.text, language))
    }
  }
  return issues
}

export function auditDocumentAnalysisSemantics(record, fallback) {
  if (!record || !fallback) return []
  if (record?.aiStatus?.provider === 'human_research') return []
  const issues = []
  const expectedType = fallback?.offlineRead?.typeKey
  const actualType = record?.offlineRead?.typeKey
  const referenceSpecificity = Number(fallback?.offlineRead?.specificity ?? 0)
  if (referenceSpecificity >= 2
    && expectedType
    && actualType !== expectedType
    && (expectedType === 'jury_instructions' || actualType && courtControlledType(expectedType) !== courtControlledType(actualType))) {
    issues.push(semanticIssue('offlineRead.typeKey', 'document_type_conflict', actualType, expectedType))
  }

  const expectedRelief = fallback?.offlineRead?.reliefKey ?? inferredReliefKey(fallback)
  const actualRelief = record?.offlineRead?.reliefKey ?? inferredReliefKey(record)
  if (actualRelief && expectedRelief !== actualRelief && referenceSpecificity >= 2) {
    issues.push(semanticIssue('offlineRead.reliefKey', 'requested_relief_conflict', actualRelief, expectedRelief))
  }

  const substantive = substantiveStrings(record)
  if (expectedType === 'jury_instructions') {
    if (!substantive.some(({ value }) => /jury instructions?|requests? to charge|陪审团指示/iu.test(value))) {
      issues.push(semanticIssue('summary', 'jury_instructions_meaning_missing', record?.summary, expectedType))
    }
    const dismissalConflict = substantive.find(({ value }) =>
      /(?:request(?:s|ed|ing)?|ask(?:s|ed|ing)?).{0,50}\b(?:dismiss|dismissal)\b.{0,50}\b(?:charge|charges|indictment|case)\b|\brequest for dismissal\b/iu.test(value)
      || /(?:请求|要求).{0,30}(?:驳回|撤销).{0,30}(?:指控|起诉|案件)|驳回对被告的指控/iu.test(value))
    if (dismissalConflict) {
      issues.push(semanticIssue(dismissalConflict.fieldPath, 'jury_instructions_misread_as_dismissal', dismissalConflict.value, expectedType))
    }
  }

  if (partyControlledType(expectedType)) {
    const outcomeConflict = ['summary', 'plainEnglish'].flatMap((fieldPath) => {
      const value = getPath(record, fieldPath)
      return typeof value === 'string' ? [{ fieldPath, value }] : []
    }).find(({ value }) => affirmativeCourtOutcome(value))
    if (outcomeConflict) {
      issues.push(semanticIssue(outcomeConflict.fieldPath, 'party_filing_misread_as_court_disposition', outcomeConflict.value, expectedType))
    }
  }
  return issues
}

export function documentAnalysisQualityCurrent(record) {
  const language = record?.analysisLanguage === 'en' ? 'en' : 'zh'
  return record?.languageQuality?.version === documentLanguageQualityVersion
    && auditDocumentAnalysisLanguage(record, language).length === 0
}

export function repairDocumentAnalysisLanguage(record, fallback, requestedLanguage = record?.analysisLanguage) {
  const language = requestedLanguage === 'en' ? 'en' : 'zh'
  const repaired = structuredClone(record ?? {})
  const correctedFields = []

  for (const fieldPath of ['title', 'variantLabel', 'sourceLabel', 'category']) {
    const current = getPath(repaired, fieldPath)
    const replacement = getPath(fallback, fieldPath)
    if (typeof replacement !== 'string' || current === replacement) continue
    setPath(repaired, fieldPath, replacement)
    correctedFields.push(fieldPath)
  }
  for (const fieldPath of ['publishedAt', 'capturedAt']) {
    const current = getPath(repaired, fieldPath)
    const replacement = getPath(fallback, fieldPath)
    if (replacement === undefined || current === replacement) continue
    setPath(repaired, fieldPath, replacement)
    correctedFields.push(fieldPath)
  }
  if (fallback?.criticalFacts && JSON.stringify(repaired.criticalFacts) !== JSON.stringify(fallback.criticalFacts)) {
    repaired.criticalFacts = structuredClone(fallback.criticalFacts)
    correctedFields.push('criticalFacts')
  }

  for (const fieldPath of directStringPaths) {
    const current = getPath(repaired, fieldPath)
    if (typeof current !== 'string' || !localizedTextMismatch(current, language)) continue
    const localizedCurrent = localizeKnownText(current, language)
    if (!localizedTextMismatch(localizedCurrent, language)) {
      setPath(repaired, fieldPath, localizedCurrent)
      correctedFields.push(fieldPath)
      continue
    }
    const replacement = getPath(fallback, fieldPath)
    if (typeof replacement !== 'string' || localizedTextMismatch(replacement, language)) continue
    setPath(repaired, fieldPath, replacement)
    correctedFields.push(fieldPath)
  }

  for (const fieldPath of directArrayPaths) {
    const current = getPath(repaired, fieldPath)
    if (!Array.isArray(current) || !current.some((value) => localizedTextMismatch(value, language))) continue
    const replacement = repairStringArray(current.map((value) => localizeKnownText(value, language)), getPath(fallback, fieldPath), language)
    setPath(repaired, fieldPath, replacement)
    correctedFields.push(fieldPath)
  }

  for (const [fieldPath, keys] of objectArrayPaths) {
    const current = getPath(repaired, fieldPath)
    if (!Array.isArray(current)) continue
    const fallbackValues = getPath(fallback, fieldPath)
    let changed = false
    const replacement = current.map((item, index) => {
      if (!item || typeof item !== 'object') return item
      const next = { ...item }
      const fallbackItem = matchingObject(item, fallbackValues, index)
      for (const key of keys) {
        if (!localizedTextMismatch(next[key], language)) continue
        if (typeof fallbackItem?.[key] !== 'string' || localizedTextMismatch(fallbackItem[key], language)) continue
        next[key] = fallbackItem[key]
        correctedFields.push(`${fieldPath}[${index}].${key}`)
        changed = true
      }
      return next
    })
    if (changed) setPath(repaired, fieldPath, replacement)
  }

  if (Array.isArray(repaired.aiFindings) && (correctedFields.length || auditFindingLanguage(repaired.aiFindings, language))) {
    repaired.aiFindings = synchronizedFindings(repaired, fallback)
    correctedFields.push('aiFindings')
  }

  const semanticIssues = auditDocumentAnalysisSemantics(repaired, fallback)
  if (semanticIssues.length) {
    for (const fieldPath of semanticFallbackPaths) {
      const replacement = getPath(fallback, fieldPath)
      if (replacement === undefined) continue
      setPath(repaired, fieldPath, structuredClone(replacement))
      correctedFields.push(fieldPath)
    }
    const originalProvider = repaired?.aiStatus?.provider ?? null
    repaired.aiStatus = {
      ...(repaired.aiStatus ?? {}),
      ...(fallback?.aiStatus ?? {}),
      provider: fallback?.aiStatus?.provider ?? 'local_rules',
      originalProvider,
      qualityFallback: true,
    }
    repaired.aiFindings = synchronizedFindings(repaired, fallback)
    correctedFields.push('aiStatus', 'aiFindings')
  }

  repaired.analysisLanguage = language
  repaired.languageQuality = {
    version: documentLanguageQualityVersion,
    requestedLanguage: language,
    correctedFields: [...new Set(correctedFields)],
    semanticFallback: semanticIssues.length > 0,
    semanticIssues: semanticIssues.map(({ excerpt: _excerpt, ...issue }) => issue),
  }
  return {
    record: repaired,
    correctedFields: repaired.languageQuality.correctedFields,
    unresolvedIssues: auditDocumentAnalysisLanguage(repaired, language),
    unresolvedSemanticIssues: auditDocumentAnalysisSemantics(repaired, fallback),
  }
}

function substantiveStrings(record) {
  const paths = ['summary', 'plainEnglish', 'legalReading', 'whyItMatters', 'verificationTasks', 'riskFlags']
  return paths.flatMap((fieldPath) => {
    const value = getPath(record, fieldPath)
    if (typeof value === 'string') return [{ fieldPath, value }]
    if (!Array.isArray(value)) return []
    return value.flatMap((item, index) => typeof item === 'string' ? [{ fieldPath: `${fieldPath}[${index}]`, value: item }] : [])
  })
}

function semanticIssue(fieldPath, reason, actual, expected) {
  return {
    fieldPath,
    reason,
    actual: String(actual ?? '').slice(0, 240),
    expected: String(expected ?? '').slice(0, 240),
    excerpt: String(actual ?? '').replace(/\s+/gu, ' ').slice(0, 240),
  }
}

function partyControlledType(typeKey) {
  return [
    'indictment', 'complaint', 'counterclaim', 'answer', 'motion', 'brief', 'objection',
    'sentencing_submission', 'jury_instructions', 'certiorari_petition', 'mandamus_petition',
    'forfeiture_claim', 'proof_of_claim', 'bill_of_particulars', 'fact_statement',
    'bankruptcy_plan', 'letter',
  ].includes(typeKey)
}

function courtControlledType(typeKey) {
  return ['appellate_mandate', 'judgment', 'verdict', 'court_order'].includes(typeKey)
}

function inferredReliefKey(record) {
  const text = [record?.offlineRead?.plainRead, ...(record?.offlineRead?.professionalRead ?? [])].join(' ')
  const rules = [
    ['summary_judgment', /summary judgment|简易判决/iu],
    ['dismissal', /request(?:s|ed|ing)? for dismissal|request for dismissal|请求驳回|驳回诉讼/iu],
    ['compel', /compelled production|compelled compliance|强制提交|强制履行/iu],
    ['unseal', /unsealing|解封/iu],
    ['seal', /\bsealing\b|密封处理/iu],
    ['extension', /extension of time|延长期限/iu],
    ['stay', /\ba stay\b|中止或暂停程序/iu],
    ['discovery', /\bdiscovery\b|证据开示或取证/iu],
    ['reconsideration', /reconsideration|重新考虑/iu],
    ['remand', /\bremand\b|发回或移送回原法院/iu],
    ['forfeiture', /forfeiture and third-party rights|没收财产及第三方权利/iu],
    ['vacatur', /vacatur|撤销既有裁判/iu],
    ['injunction', /injunctive relief|临时限制令或禁令/iu],
  ]
  return rules.find(([, pattern]) => pattern.test(text))?.[0] ?? null
}

function affirmativeCourtOutcome(value) {
  const text = String(value ?? '').trim()
  return /^(?:this (?:court )?order|the (?:court|judge))\s+(?:has\s+)?(?:granted|denied|dismissed|ordered|held|ruled|found)\b/iu.test(text)
    || /^法院(?:已经|已)?(?:准许|驳回|命令|裁定|认定|判决)/u.test(text)
}

function containsEnglishProse(value) {
  const cleaned = stripNeutralTokens(value)
  const segments = cleaned.split(/[\n。！？!?；;]+/u).map((item) => item.trim()).filter(Boolean)
  return segments.some((segment) => {
    const words = segment.match(latinWordPattern) ?? []
    const cjkCount = (segment.match(cjkPattern) ?? []).length
    const latinLetters = words.join('').length
    const functionWordCount = words.filter((word) => englishFunctionWords.has(word.toLowerCase())).length
    const onlyEntityConnectors = cjkCount >= 8
      && words.filter((word) => englishFunctionWords.has(word.toLowerCase())).every((word) => word.toLowerCase() === 'of')
    if (onlyEntityConnectors) return false
    if (cjkCount >= 8 && words.length <= 14 && functionWordCount <= 2) return false
    return latinLetters >= 20 && words.length >= 4 && functionWordCount >= 2
      || cjkCount < 6 && latinLetters >= 45 && words.length >= 8
  })
}

function containsChineseProse(value) {
  const cleaned = stripNeutralTokens(value)
  const cjk = cleaned.match(cjkPattern) ?? []
  if (cjk.length < 4) return false
  const proseMarkers = cleaned.match(/(?:文件|法院|案件|程序|正文|翻译|来源|解读|核验|需要|不能|不得|已经|没有|以及|如果|其中|因此|属于|提出|请求|裁定|证明|本地|该|这|的|了|是|在|应)/gu) ?? []
  return cjk.length >= 8 || proseMarkers.length >= 2 || /[，。；！？]/u.test(cleaned)
}

function stripNeutralTokens(value) {
  return String(value)
    .replace(/https?:\/\/\S+/giu, ' ')
    .replace(/\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/gu, ' ')
    .replace(/\b(?:PACER|RECAP|ECF|SDNY|S\.D\.N\.Y\.|SEC|DOJ|NFSC|CIPA|RICO|LLP|LLC|Inc\.?|Corp\.?|Ltd\.?)\b/giu, ' ')
    .replace(/(?:§\s*)?\d+\s*\([a-z0-9]+\)(?:\([a-z0-9]+\))*/giu, ' ')
    .replace(/\b(?:No\.?\s*)?\d{1,2}:\d{2}-(?:cr|cv|mc|bk|ap)-\d+(?:-[A-Z]+)?\b/giu, ' ')
    .replace(/\b(?:sdny|ca2|scotus|dconn|bkd)-[a-z0-9-]+\b/giu, ' ')
}

function exemptLocalizedValue(value) {
  if (/^(?:https?:\/\/|[\w.+-]+@[\w.-]+\.)/iu.test(value)) return true
  if (/^[\w./:#§()\-[\]\s]+$/u.test(value) && !/[A-Za-z]{4}\s+[A-Za-z]{4}\s+[A-Za-z]{4}/u.test(value)) return true
  if (/^(?:PACER|RECAP|S\.D\.N\.Y\.|SEC|DOJ|NFSC|CIPA|RICO|Fair Fund|Himalaya Exchange)(?:\s*[/:+-]\s*(?:PACER|RECAP|SEC|DOJ|NFSC|CIPA|RICO|Fair Fund|Himalaya Exchange))*$/iu.test(value)) return true
  return false
}

function repairStringArray(current, fallback, language) {
  const candidates = Array.isArray(fallback)
    ? fallback.filter((value) => typeof value === 'string' && !localizedTextMismatch(value, language))
    : []
  const used = new Set()
  return current.flatMap((value, index) => {
    if (typeof value === 'string' && !localizedTextMismatch(value, language)) {
      used.add(value)
      return [value]
    }
    const sameIndex = candidates[index]
    const replacement = sameIndex && !used.has(sameIndex)
      ? sameIndex
      : candidates.find((candidate) => !used.has(candidate))
    if (!replacement) return []
    used.add(replacement)
    return [replacement]
  }).concat(current.length ? [] : candidates).filter((value, index, values) => values.indexOf(value) === index)
}

function localizeKnownText(value, language) {
  if (typeof value !== 'string') return value
  const exact = language === 'en'
    ? {
        'PDF 文本层为空或内容明显稀少；已使用内置本地 OCR 恢复正文。': 'The PDF text layer was empty or materially sparse; body text was recovered with bundled local OCR.',
        'PDF 文本层内容明显稀少，但本地 OCR 未能恢复出更完整的正文。': 'The PDF text layer appears materially sparse, but local OCR did not recover a stronger body-text result.',
      }
    : {
        'The PDF text layer was empty or materially sparse; body text was recovered with bundled local OCR.': 'PDF 文本层为空或内容明显稀少；已使用内置本地 OCR 恢复正文。',
        'The PDF had no text layer; body text was recovered with bundled local OCR.': 'PDF 没有文本层；已使用内置本地 OCR 恢复正文。',
        'The PDF text layer appears materially sparse, but local OCR did not recover a stronger body-text result.': 'PDF 文本层内容明显稀少，但本地 OCR 未能恢复出更完整的正文。',
        'PDF parser and local OCR returned no body text; the file may be blank, sealed, corrupt, or extraction-restricted.': 'PDF 解析器和本地 OCR 均未提取到正文；文件可能为空白、密封、损坏或受提取限制。',
        'Historical public web archive; proves what the project site published at capture time, not official docket acceptance or disposition': '历史公开网页存档；只能证明项目网站在存档时发布了什么，不能证明法院正式接收或作出处理',
        'Historical public web archive; proves what the project site published at capture time, not official 案卷 acceptance or disposition': '历史公开网页存档；只能证明项目网站在存档时发布了什么，不能证明法院正式接收或作出处理',
      }
  let localized = localizeDateSignals(exact[value] ?? value, language)
  if (language === 'zh') {
    localized = localized
      .replace(/\s+at Courtroom\s+([0-9A-Za-z-]+)\s*(\([^)]+\))?\s*Responses due by\s*(\d{4}年\d{1,2}月\d{1,2}日)[,，]?/giu, (_match, room, judge, responseDate) => `，地点：${room} 号法庭${judge ? ` ${judge}` : ''}；答复截止：${responseDate}`)
      .replace(/\s+at United States Bankruptcy Court,?\s*([^。；;\n]+)/giu, (_match, address) => `，地点：美国破产法院（${address.trim()}）`)
      .replace(/,。/gu, '。')
  }
  return localized
}

export function localizeDateSignals(value, language) {
  let text = String(value ?? '')
  if (language === 'en') {
    text = text.replace(/([0-9]{4})\s*年\s*([0-9]{1,2})\s*月\s*([0-9]{1,2})\s*日(?:\s*[（(]?(?:星期|周)[一二三四五六日天][）)]?)?(?:\s*(上午|下午|中午|晚上)\s*([0-9]{1,2})(?::([0-9]{2}))?)?/gu, (_match, year, month, day, period, hour, minute) => {
      const monthName = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][Number(month) - 1]
      const time = hour ? ` at ${hour}${minute ? `:${minute}` : ':00'}${period ? ` ${period === '上午' ? 'a.m.' : 'p.m.'}` : ''}` : ''
      return `${monthName} ${Number(day)}, ${year}${time}`
    })
    return text
  }
  text = text.replace(/(January|February|March|April|May|June|July|August|September|October|November|December)\.?\s+([0-9]{1,2}),\s+([0-9]{4})(?:\s+at\s+([0-9]{1,2})(?::([0-9]{2}))?\s*(a\.?m\.?|p\.?m\.?|AM|PM)?)?/giu, (_match, monthName, day, year, hour, minute, period) => {
    const month = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'].indexOf(monthName.toLowerCase()) + 1
    const time = hour ? `${/^p/i.test(period ?? '') ? '下午' : /^a/i.test(period ?? '') ? '上午' : ''}${Number(hour)}:${minute ?? '00'}` : ''
    return `${year}年${month}月${Number(day)}日${time}`
  })
  text = text.replace(/\b([0-9]{1,2})\/([0-9]{1,2})\/([0-9]{4})(?:\s+at\s+([0-9]{1,2})(?::([0-9]{2}))?\s*(AM|PM)?)?/giu, (_match, month, day, year, hour, minute, period) => {
    const time = hour ? `${period === 'PM' ? '下午' : period === 'AM' ? '上午' : ''}${Number(hour)}:${minute ?? '00'}` : ''
    return `${year}年${Number(month)}月${Number(day)}日${time}`
  })
  return text
}

function synchronizedFindings(record, fallback) {
  const existing = [...(record.aiFindings ?? []), ...(fallback?.aiFindings ?? [])]
  const defaultCitations = fallback?.offlineRead?.citations?.length
    ? fallback.offlineRead.citations
    : [{ kind: 'source_metadata', pageNumber: null }]
  const confidence = ['low', 'medium', 'high'].includes(record?.aiStatus?.confidence)
    ? record.aiStatus.confidence
    : ['low', 'medium', 'high'].includes(record?.confidence) ? record.confidence : 'medium'
  return findingSections.flatMap(([section, arrayValue]) => {
    const values = arrayValue ? record?.[section] : [record?.[section]]
    return (Array.isArray(values) ? values : []).filter((value) => typeof value === 'string' && value.trim()).map((text) => {
      const exact = existing.find((finding) => finding?.section === section && finding?.text === text)
      const sectionFallback = existing.find((finding) => finding?.section === section)
      return {
        section,
        text,
        confidence: exact?.confidence ?? sectionFallback?.confidence ?? confidence,
        citations: exact?.citations?.length ? exact.citations : sectionFallback?.citations?.length ? sectionFallback.citations : defaultCitations,
      }
    })
  })
}

function matchingObject(value, candidates, index) {
  if (!Array.isArray(candidates)) return null
  return candidates.find((candidate) => candidate?.kind === value?.kind
    && candidate?.type === value?.type
    && candidate?.sourceUrl === value?.sourceUrl) ?? candidates[index] ?? null
}

function auditFindingLanguage(findings, language) {
  return findings.some((finding) => localizedTextMismatch(finding?.text, language))
}

function issue(fieldPath, value, language) {
  return {
    fieldPath,
    requestedLanguage: language,
    reason: language === 'en' ? 'chinese_prose_in_english_output' : 'english_prose_in_chinese_output',
    excerpt: String(value).replace(/\s+/gu, ' ').slice(0, 240),
  }
}

function getPath(value, fieldPath) {
  return String(fieldPath).split('.').reduce((current, key) => current?.[key], value)
}

function setPath(value, fieldPath, replacement) {
  const keys = String(fieldPath).split('.')
  let current = value
  for (const key of keys.slice(0, -1)) {
    if (!current[key] || typeof current[key] !== 'object') current[key] = {}
    current = current[key]
  }
  current[keys.at(-1)] = replacement
}
