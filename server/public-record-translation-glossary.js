export const publicRecordTranslationGlossaryVersion = 4

export const publicRecordTranslationGlossary = [
  {
    source: '郭文贵',
    preferredEnglish: 'Guo Wengui',
    aliases: ['Miles Guo', 'Ho Wan Kwok', 'Miles Kwok', 'Brother Seven'],
    guidance: 'Use Guo Wengui when translating the Chinese name 郭文贵. Preserve Miles Guo, Ho Wan Kwok, Miles Kwok, and Brother Seven when those English aliases appear in the source or legal context.',
    validationSources: ['郭文贵', '郭文貴', '文贵', '文貴'],
  },
  {
    source: '七哥',
    preferredEnglish: 'Brother Seven',
    aliases: ['Brother 7'],
    guidance: 'A personal/community nickname for Guo. Do not translate as Seventh Brother in this corpus.',
    validationSources: ['七哥'],
  },
  {
    source: '爆料革命',
    preferredEnglish: 'Whistleblower Movement',
    aliases: ['the Whistleblower Movement'],
    guidance: 'Use the established English name. Do not translate literally as Exposure Revolution unless the source is discussing the literal Chinese wording.',
    validationSources: ['爆料革命', '爆料革命运动', '爆料革命運動'],
  },
  {
    source: '新中国联邦',
    preferredEnglish: 'New Federal State of China',
    aliases: ['NFSC', 'the NFSC'],
    guidance: 'Use New Federal State of China on first meaningful mention where space allows, and NFSC for repeated short references.',
    validationSources: ['新中国联邦', '新中國聯邦'],
  },
  {
    source: '喜联储',
    preferredEnglish: 'Himalaya Reserve',
    aliases: ['Himalaya Reserve system'],
    guidance: 'Use Himalaya Reserve for 喜联储. Do not collapse it into Himalaya Exchange unless the Chinese source says 喜交所 or 喜马拉雅交易所.',
    validationSources: ['喜联储', '喜聯儲'],
  },
  {
    source: '喜交所 / 喜马拉雅交易所',
    preferredEnglish: 'Himalaya Exchange',
    aliases: ['the Himalaya Exchange'],
    guidance: 'Use Himalaya Exchange for 喜交所, 喜马拉雅交易所, or 喜馬拉雅交易所.',
    validationSources: ['喜交所', '喜马拉雅交易所', '喜馬拉雅交易所'],
  },
  {
    source: '喜币',
    preferredEnglish: 'H-Coin',
    aliases: ['H Coin', 'Himalaya Coin', 'HCN'],
    guidance: 'Use H-Coin in public-statement translation. In formal legal context, Himalaya Coin (HCN or H Coin) is also accepted.',
    validationSources: ['喜币', '喜幣', 'H币', 'H幣'],
  },
  {
    source: '喜美元',
    preferredEnglish: 'H-Dollar',
    aliases: ['H Dollar', 'Himalaya Dollar', 'HDO'],
    guidance: 'Use H-Dollar in public-statement translation. In formal legal context, Himalaya Dollar (HDO or H Dollar) is also accepted.',
    validationSources: ['喜美元', 'H美元'],
  },
  {
    source: '法治基金',
    preferredEnglish: 'Rule of Law Foundation',
    aliases: ['ROLF'],
    guidance: 'Use Rule of Law Foundation. Never confuse 法治基金 with 法治经 or with a generic rule-of-law fund.',
    validationSources: ['法治基金', '法治基金会', '法治基金會'],
  },
  {
    source: '法治社会',
    preferredEnglish: 'Rule of Law Society',
    aliases: ['ROLS'],
    guidance: 'Use Rule of Law Society and distinguish it from Rule of Law Foundation when the source distinguishes them.',
    validationSources: ['法治社会', '法治社會'],
  },
  {
    source: '蓝金黄',
    preferredEnglish: 'BGY',
    aliases: ['Blue-Gold-Yellow', 'Blue Gold Yellow'],
    guidance: 'Use BGY / Blue-Gold-Yellow as Guo-related public-statement terminology. Do not present the underlying allegation as a court finding.',
    validationSources: ['蓝金黄', '藍金黃'],
  },
  {
    source: '卖美贼',
    preferredEnglish: 'people accused of selling out America',
    aliases: ['alleged U.S. sellout network', 'people accused of selling out the United States'],
    guidance: 'This is a loaded public-statement accusation. Translate faithfully but neutrally; avoid stating that a person is a traitor or sellout as fact.',
    validationSources: ['卖美贼', '賣美賊'],
  },
  {
    source: '盗国贼',
    preferredEnglish: 'alleged kleptocrats',
    aliases: ['kleptocrats', 'alleged kleptocratic families'],
    guidance: 'Use alleged kleptocrats when the source is making a political accusation. Do not turn the label into a judicial finding.',
    validationSources: ['盗国贼', '盜國賊'],
  },
  {
    source: '战友',
    preferredEnglish: 'fellow supporters',
    aliases: ['fellow fighters'],
    guidance: 'Use fellow supporters for general readability; fellow fighters is acceptable when preserving rally-style rhetoric. Avoid comrades because it has the wrong political connotation in English.',
    validationSources: ['战友们', '戰友們', '战友', '戰友'],
  },
  {
    source: '灭共',
    preferredEnglish: 'take down the CCP',
    aliases: ['end the CCP', 'anti-CCP campaign'],
    guidance: 'Use take down the CCP or end the CCP for political rhetoric unless the sentence literally discusses violence. Do not over-legalize slogans.',
    validationSources: ['消灭共产党', '消滅共產黨', '灭共产党', '滅共產黨', '灭共', '滅共'],
  },
  {
    source: '中共',
    preferredEnglish: 'CCP',
    aliases: ['Chinese Communist Party'],
    guidance: 'Use CCP for 中共 and Chinese Communist Party for formal first mentions if needed.',
    validationSources: ['中共'],
  },
  {
    source: '喜马拉雅农场',
    preferredEnglish: 'Himalaya Farm',
    aliases: ['Himalaya Farms', 'Himalaya Farm Alliance', 'Farm'],
    guidance: 'Use Himalaya Farm or Himalaya Farm Alliance depending on whether the source refers to a local farm or the broader network/program.',
    validationSources: ['喜马拉雅农场', '喜馬拉雅農場'],
  },
  {
    source: '喜马拉雅监督机构',
    preferredEnglish: 'Himalaya Supervisory Organization',
    aliases: ['HSO'],
    guidance: 'Use the full English name unless the source already uses an abbreviation.',
    validationSources: ['喜马拉雅监督机构', '喜馬拉雅監督機構'],
  },
  {
    source: 'G系列',
    preferredEnglish: 'G-series entities',
    aliases: ['G-series projects'],
    guidance: 'Use G-series entities/projects as a cluster label; preserve exact names such as GTV, G|CLUBS, G|Fashion, and G|Music.',
    validationSources: ['G系列', 'G 系列', 'g系列', 'g 系列'],
  },
  {
    source: '班农',
    preferredEnglish: 'Steve Bannon',
    aliases: ['Stephen Bannon', 'Stephen K. Bannon'],
    guidance: 'Use Steve Bannon unless the source uses a formal full name.',
    validationSources: ['班农', '班農'],
  },
  {
    source: '余建明',
    preferredEnglish: 'Kin Ming Je',
    aliases: ['William Je'],
    guidance: 'Use Kin Ming Je / William Je for legal context. Preserve Yu Jianming only if the source is romanizing 余建明 directly.',
    validationSources: ['余建明'],
  },
  {
    source: '王雁平',
    preferredEnglish: 'Yanping Wang',
    aliases: ['Yvette Wang'],
    guidance: 'Use the name form that matches the source context; Yanping Wang is common in court filings, Yvette Wang appears in public reporting.',
    validationSources: ['王雁平'],
  },
  {
    source: '陈小平',
    preferredEnglish: 'Chen Xiaoping',
    aliases: ['Chen Xiao-Ping'],
    guidance: 'Use Chen Xiaoping for 陈小平. Do not infer identity from a similar romanization without a supporting case or source context.',
    validationSources: ['陈小平', '陳小平'],
  },
  {
    source: '法治与社会',
    preferredEnglish: 'Rule of Law and Society',
    aliases: ['Rule of Law & Society'],
    guidance: 'Use Rule of Law and Society for 法治与社会 and distinguish it from Rule of Law Foundation and Rule of Law Society.',
    validationSources: ['法治与社会', '法治與社會'],
  },
  {
    source: '明镜电视',
    preferredEnglish: 'Mingjing TV',
    aliases: ['Mingjing Television', 'Mirror TV'],
    guidance: 'Use Mingjing TV for 明镜电视. Preserve the organization name rather than translating it as a generic mirror television service.',
    validationSources: ['明镜电视', '明鏡電視'],
  },
]

export function formatPublicRecordTranslationGlossaryForPrompt(entries = publicRecordTranslationGlossary) {
  return [
    `Controlled glossary version: ${publicRecordTranslationGlossaryVersion}.`,
    ...entries.map((entry) => {
      const aliasText = entry.aliases?.length ? `; accepted aliases: ${entry.aliases.join(', ')}` : ''
      return `- ${entry.source} => ${entry.preferredEnglish}${aliasText}. ${entry.guidance}`
    }),
  ].join('\n')
}

export function publicRecordTranslationValidationRules() {
  return publicRecordTranslationGlossary
    .filter((entry) => Array.isArray(entry.validationSources) && entry.validationSources.length)
    .map((entry) => ({
      source: entry.source,
      sourcePatterns: entry.validationSources,
      acceptedEnglish: [entry.preferredEnglish, ...(entry.aliases ?? [])],
    }))
}
