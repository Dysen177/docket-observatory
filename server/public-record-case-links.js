const caseReferences = Object.freeze({
  'sdny-23-cr-118': {
    caseTitle: {
      zh: 'United States v. Ho Wan Kwok 等（刑事主案）',
      en: 'United States v. Ho Wan Kwok et al. (criminal case)',
    },
    docket: '1:23-cr-00118-AT',
    officialLabel: {
      zh: 'DOJ 案件与受害者信息页',
      en: 'DOJ case and victim-information page',
    },
    officialUrl: 'https://www.justice.gov/usao-sdny/united-states-v-ho-wan-kwok-aka-miles-guo-and-kin-ming-je-aka-william-je',
  },
  'sdny-23-cv-2200': {
    caseTitle: {
      zh: 'SEC v. Kwok, Je 等（SEC 民事案）',
      en: 'SEC v. Kwok, Je et al. (SEC civil case)',
    },
    docket: '1:23-cv-02200-PGG',
    officialLabel: {
      zh: 'SEC 起诉公告与起诉状',
      en: 'SEC litigation release and complaint',
    },
    officialUrl: 'https://www.sec.gov/newsroom/press-releases/2023-50',
  },
  'sec-admin-3-20537': {
    caseTitle: {
      zh: 'GTV Media Group 等 SEC 行政程序 / Fair Fund',
      en: 'GTV Media Group et al. SEC proceeding / Fair Fund',
    },
    docket: 'Admin. Proc. File No. 3-20537',
    officialLabel: {
      zh: 'SEC 2021 年行政命令',
      en: 'SEC 2021 administrative order',
    },
    officialUrl: 'https://www.sec.gov/files/litigation/admin/2021/33-10979.pdf',
  },
})

const legalTopics = Object.freeze({
  gtv: {
    evidencePattern: /GTV.{0,30}(?:投资|股票|股权|股份|投资者)|(?:投资|股票|股权|股份|投资者).{0,30}GTV/i,
    caseIds: ['sdny-23-cr-118', 'sdny-23-cv-2200'],
    relationType: 'named_program',
    confidence: 'high',
    explanation: {
      zh: '来源标题明确涉及 GTV 投资、股票或投资者；刑事起诉书和 SEC 民事起诉状均把 GTV 相关发行列为被指控计划。',
      en: 'The source title expressly concerns GTV investment, shares, or investors. Both the criminal indictment and the SEC complaint identify GTV-related offerings as alleged schemes.',
    },
    legalBasis: {
      zh: '刑事案 Doc. 19 第 6-10、23-26 页；SEC 民事起诉状 Doc. 1 第 10-16、27-31 页。',
      en: 'Criminal Doc. 19 at pp. 6-10 and 23-26; SEC Complaint, Doc. 1 at pp. 10-16 and 27-31.',
    },
  },
  gtvPrivatePlacement: {
    evidencePattern: /GTV.{0,20}(?:私募|private placement).{0,20}(?:投资|investment)|(?:私募|private placement).{0,20}GTV/i,
    caseIds: ['sdny-23-cr-118', 'sdny-23-cv-2200', 'sec-admin-3-20537'],
    relationType: 'named_program',
    confidence: 'high',
    explanation: {
      zh: '来源标题直接写明 GTV 私募投资。该私募同时出现在刑事起诉、SEC 民事起诉和 2021 年 SEC 行政和解 / Fair Fund 程序中。',
      en: 'The source title expressly names the GTV private placement. That offering appears in the criminal indictment, the SEC civil complaint, and the 2021 SEC settlement and Fair Fund proceeding.',
    },
    legalBasis: {
      zh: '刑事案 Doc. 19 第 6-10 页；SEC 民事起诉状 Doc. 1 第 10-16 页；SEC Release No. 33-10979。',
      en: 'Criminal Doc. 19 at pp. 6-10; SEC Complaint, Doc. 1 at pp. 10-16; SEC Release No. 33-10979.',
    },
  },
  gtvLaunchDateMatch: {
    evidencePattern: /2020\s*年?\s*4\s*月?\s*21\s*(?:日|号)?.{0,30}GTV/i,
    caseIds: ['sdny-23-cr-118', 'sdny-23-cv-2200'],
    relationType: 'court_cited_date_match',
    confidence: 'medium',
    explanation: {
      zh: '来源标题写明 2020 年 4 月 21 日的 GTV 录播；刑事起诉书和 SEC 起诉状均点名同日发布的 GTV 私募启动视频。现有元数据没有逐字稿，因此只能认定日期与主题吻合，不能断言它就是法院文件引用的同一视频。',
      en: 'The source title identifies a GTV recording dated April 21, 2020. Both complaints identify a GTV private-placement launch video posted that day. Because this archive has no transcript, the date-and-topic match does not establish that this is the identical video cited in the filings.',
    },
    legalBasis: {
      zh: '刑事案 Doc. 19 第 6、23 页；SEC 民事起诉状 Doc. 1 第 10-11 页。',
      en: 'Criminal Doc. 19 at pp. 6 and 23; SEC Complaint, Doc. 1 at pp. 10-11.',
    },
  },
  gclubs: {
    evidencePattern: /G\s*[|｜]?\s*CLUBS?/i,
    caseIds: ['sdny-23-cr-118', 'sdny-23-cv-2200'],
    relationType: 'named_entity_context',
    confidence: 'high',
    explanation: {
      zh: '来源标题明确点名 G|CLUBS。刑事起诉书和 SEC 起诉状均讨论 G|CLUBS 会员发行；但本条标题只证明相关公开活动存在，不证明活动内容构成被指控行为。',
      en: 'The source title expressly names G|CLUBS. The criminal indictment and SEC complaint both address the G|CLUBS membership offering, but this title proves only that a related public event was described, not that the event itself constituted alleged conduct.',
    },
    legalBasis: {
      zh: '刑事案 Doc. 19 第 11-15 页；SEC 民事起诉状 Doc. 1 第 19-21、25-26、32-33 页。',
      en: 'Criminal Doc. 19 at pp. 11-15; SEC Complaint, Doc. 1 at pp. 19-21, 25-26, and 32-33.',
    },
  },
  himalayaCoin: {
    evidencePattern: /喜联储|喜币|喜美元/,
    caseIds: ['sdny-23-cr-118', 'sdny-23-cv-2200'],
    relationType: 'named_program',
    confidence: 'high',
    explanation: {
      zh: '来源标题明确出现喜联储、喜币或喜美元。刑事案卷和 SEC 民事起诉状把 Himalaya Exchange、H-Coin / HCN 与 H-Dollar / HDO 作为相关项目讨论；法院使用的英文名称只用于交叉核验，不会单独触发历史记录关联。',
      en: 'The source title expressly uses the Chinese name for Himalaya Exchange, H-Coin, or H-Dollar. The criminal record and SEC complaint discuss Himalaya Exchange, H-Coin/HCN, and H-Dollar/HDO as related projects. Court-used English names serve only as cross-references and do not independently trigger a historical-record link.',
    },
    legalBasis: {
      zh: '刑事案 Doc. 19 第 15-20、31 页；SEC 民事起诉状 Doc. 1 第 21-24、27 页。',
      en: 'Criminal Doc. 19 at pp. 15-20 and 31; SEC Complaint, Doc. 1 at pp. 21-24 and 27.',
    },
  },
  secSettlement: {
    evidencePattern: /SEC.{0,24}(?:和解|罚款|settlement|penalt)|(?:和解|罚款|settlement|penalt).{0,24}SEC/i,
    caseIds: ['sec-admin-3-20537'],
    relationType: 'named_proceeding',
    confidence: 'high',
    explanation: {
      zh: '来源标题明确写到 2021 年 9 月 13 日的 SEC 和解及罚款；同日 SEC 行政命令设立了 GTV 私募相关的返还与 Fair Fund 程序。',
      en: 'The source title expressly refers to the September 13, 2021 SEC settlement and penalty. The SEC administrative order issued that day established the GTV-private-placement disgorgement and Fair Fund track.',
    },
    legalBasis: {
      zh: 'SEC Release No. 33-10979，Admin. Proc. File No. 3-20537。',
      en: 'SEC Release No. 33-10979, Admin. Proc. File No. 3-20537.',
    },
  },
})

const topicRecordIds = new Map([
  ['gtvLaunchDateMatch', new Set([
    'public-record-1908aff182bc4e78',
  ])],
  ['gtvPrivatePlacement', new Set([
    'public-record-64d0c0178a564993',
  ])],
  ['gtv', new Set([
    'public-record-202b0775004aec2c',
    'public-record-a12018dce9970fa2',
    'public-record-c60c8eca3b89175b',
    'public-record-10ae9c90251cfd0b',
  ])],
  ['gclubs', new Set([
    'public-record-211bd8a8565d04fa',
    'public-record-6d34acc180a7bba8',
    'public-record-ba33baa9288c2b9d',
  ])],
  ['himalayaCoin', new Set([
    'public-record-98fe0045bb9adb45',
    'public-record-389db5c12d3e48e6',
    'public-record-dcf36164f2fdd774',
    'public-record-b93e2f8a57199fc3',
    'public-record-098c5810b2ce4dbd',
    'public-record-ea10c8cfa06ea5d1',
    'public-record-4506400d6e895424',
    'public-record-72a161b935f79c31',
    'public-record-a12bce585b237a1f',
    'public-record-e76fcdb8fd031bf8',
    'public-record-52139144f73c168a',
    'public-record-a284c9e34c12bb25',
    'public-record-78f70afad9ac80f6',
    'public-record-5110a729601f1b0b',
  ])],
  ['secSettlement', new Set([
    'public-record-4045a432f4c4a754',
  ])],
])

const commonBoundary = Object.freeze({
  zh: '这是来源标题 / 平台元数据与案卷主题之间的背景关联，不是对标题陈述真实性的法院认定，也不能替代阅读起诉书、证据和裁判。',
  en: 'This is a background link between source-title or platform metadata and a docket subject. It is not a judicial finding that the title is true and does not replace review of the pleadings, evidence, and rulings.',
})

function localized(value, language) {
  return String(value?.[language] ?? value?.zh ?? value?.en ?? '')
}

export function publicRecordCaseLinks(record, language = 'zh') {
  const links = []
  const recordEvidence = [
    record.originalTitle,
    record.primarySource?.sourceTitle,
    ...(record.alternatives ?? []).map((source) => source?.sourceTitle),
  ].filter(Boolean).join(' ')
  for (const [topicId, recordIds] of topicRecordIds) {
    if (!recordIds.has(record.id)) continue
    const topic = legalTopics[topicId]
    if (!topic.evidencePattern.test(recordEvidence)) continue
    for (const caseId of topic.caseIds) {
      const caseReference = caseReferences[caseId]
      links.push({
        caseId,
        caseTitle: localized(caseReference.caseTitle, language),
        docket: caseReference.docket,
        relationType: topic.relationType,
        confidence: topic.confidence,
        basis: {
          field: 'originalTitle',
          excerpt: String(record.originalTitle ?? record.primarySource?.sourceTitle ?? ''),
        },
        explanation: localized(topic.explanation, language),
        legalBasis: localized(topic.legalBasis, language),
        boundary: localized(commonBoundary, language),
        officialLabel: localized(caseReference.officialLabel, language),
        officialUrl: caseReference.officialUrl,
      })
    }
  }
  return links
}

export function linkedPublicRecordIds() {
  return new Set([...topicRecordIds.values()].flatMap((recordIds) => [...recordIds]))
}

export function publicRecordCaseReferenceIds() {
  return new Set(Object.keys(caseReferences))
}
