import { documentVariantLabel } from './document-variant.js'
import { relationshipTypeDefinition } from './relationship-audit.js'

const sourceTypeZh = {
  Mirror: '公开文件镜像',
  'Official Agency': '官方机构',
  'Claims Agent': '索赔/案件代理',
  'CourtListener / RECAP': 'CourtListener / RECAP 法院文件库',
  'Official Court': '官方法院',
  'Party / Counsel Project Site': '当事方/律师项目网站',
  'Historical Web Archive': '历史网页存档',
  'News Report': '新闻报道',
}

const categoryZh = {
  Mandamus: '强制令申请',
  Appeal: '上诉',
  Sentencing: '量刑',
  Forfeiture: '没收',
  Judgment: '判决',
  Transcript: '庭审/听证记录',
  Discovery: '证据开示',
  Trial: '审判',
  Order: '法院命令',
  'Docket Filing': '案卷文件',
  Bankruptcy: '破产',
  'Bankruptcy Appeal': '破产上诉',
  'Supreme Court': '最高法院程序',
  'Civil Enforcement': '民事执法',
  'Fair Fund': '公平基金',
  Indictment: '起诉',
  'News Context': '新闻背景',
}

const monthZh = {
  January: '1月',
  February: '2月',
  March: '3月',
  April: '4月',
  May: '5月',
  June: '6月',
  July: '7月',
  August: '8月',
  September: '9月',
  October: '10月',
  November: '11月',
  December: '12月',
  Jan: '1月',
  Feb: '2月',
  Mar: '3月',
  Apr: '4月',
  Jun: '6月',
  Jul: '7月',
  Aug: '8月',
  Sep: '9月',
  Sept: '9月',
  Oct: '10月',
  Nov: '11月',
  Dec: '12月',
}

const statusMessageZh = {
  'fetch failed': '连接失败。',
  'Ready for refresh.': '等待刷新。',
  Disabled: '已停用。',
  'Parsed 160 docket-linked PDF entries from the public mirror.': '已从公开镜像解析 160 条带 PDF 链接的案卷条目。',
  'Official DOJ victim page is reachable.': 'DOJ 官方受害者信息页可访问。',
  'DOJ sentencing press release is reachable.': 'DOJ 判刑新闻稿可访问。',
  'SEC press release is reachable.': 'SEC 新闻稿可访问。',
  'GTV Fair Fund page is reachable.': 'GTV Fair Fund 页面可访问。',
  'Federal Register policy search returned 12 result(s).': 'Federal Register 政策搜索返回 12 条结果。',
  'Epiq docket shell is reachable; docket-row extraction is not enabled in this first adapter.':
    'Epiq 案卷页面外壳可访问；完整案卷行提取尚未接入。',
  'Set COURTLISTENER_TOKEN to enable RECAP API refresh.': '设置 COURTLISTENER_TOKEN 后可启用 RECAP API 刷新。',
  'Configure CourtListener / RECAP in Settings to enable API refresh.': '请在设置页配置 CourtListener / RECAP Token，以启用 API 刷新。',
  'Configure CourtListener / RECAP in Settings to enable the authenticated API.': '请在设置页配置 CourtListener / RECAP Token，以启用需鉴权的 API。',
  'Set PACER_USERNAME and PACER_PASSWORD to enable official court docket refresh after fee controls are added.':
    '设置 PACER_USERNAME 和 PACER_PASSWORD，并加入费用控制后，可启用官方法院案卷刷新。',
  'Configure PACER credentials in Settings; the official adapter still requires fee controls and explicit implementation.':
    '可在设置页保存 PACER 凭证；正式适配器仍需完成费用控制和明确接入。',
  'PACER credentials detected; fee-aware docket adapter still needs explicit implementation.':
    '已检测到 PACER 凭证；仍需明确接入带费用控制的案卷适配器。',
  'DOJ press release responded with a security interstitial; use browser/manual verification or DOJ victim page.':
    'DOJ 判刑新闻稿返回安全验证页；请用浏览器人工核验，或以 DOJ 受害者信息页交叉确认。',
}

function localizedMirrorTimelineStatus(value) {
  const match = String(value ?? '').match(/^Parsed (\d+) (?:recent )?timeline events from (\d+) dated docket numbers on the public mirror; the file library retains all attachments and language copies\.$/)
  if (!match) return null
  return `已从公开镜像解析 ${match[1]} 条时间线事件，覆盖 ${match[2]} 个有日期的案卷主号；文件库仍保留全部附件和不同语言副本。`
}

function localizedPublicRecapStatus(value) {
  const expanded = String(value ?? '').match(/^CourtListener public RECAP sources scanned (\d+)\/(\d+) tracked docket\(s\) plus (\d+) accepted related docket\(s\), returned (\d+) recent feed entries, (\d+) structured tracked entries, (\d+) related-search entries, and exposed (\d+) public PDF\(s\)\. A token is optional and adds full docket-entry pagination\.$/)
  if (expanded) return `CourtListener 公开 RECAP 已扫描 ${expanded[1]}/${expanded[2]} 个固定监控案卷及 ${expanded[3]} 个已接纳关联案卷，返回 ${expanded[4]} 条近期 Feed 记录、${expanded[5]} 条固定案卷结构化记录、${expanded[6]} 条关联搜索记录，并公开 ${expanded[7]} 份 PDF。Token 可选，用于完整案卷条目分页。`
  const structured = String(value ?? '').match(/^CourtListener public RECAP sources scanned (\d+)\/(\d+) tracked docket\(s\), returned (\d+) recent feed entries, (\d+) structured search entries, and exposed (\d+) public PDF\(s\)\. A token is optional and adds full docket-entry pagination\.$/)
  if (structured) return `CourtListener 公开 RECAP 来源已扫描 ${structured[1]}/${structured[2]} 个固定监控案卷，返回 ${structured[3]} 条近期 Feed 记录、${structured[4]} 条结构化搜索记录，并公开 ${structured[5]} 份可下载 PDF。Token 属于可选增强，可增加完整案卷条目分页。`
  const match = String(value ?? '').match(/^CourtListener public RECAP feeds scanned (\d+)\/(\d+) tracked docket\(s\) and returned (\d+) recent docket entries\. A token is optional and adds structured API pagination, descriptions, and PDF discovery\.$/)
  if (!match) return null
  return `CourtListener 公开 RECAP Feed 已扫描 ${match[1]}/${match[2]} 个固定监控案卷，返回 ${match[3]} 条近期案卷记录。Token 属于可选增强，可增加结构化 API 分页、文件说明和 PDF 发现。`
}

function localizedOfficialStatus(value) {
  const supremeCourt = String(value ?? '').match(/^Official Supreme Court docket 26-194 returned (\d+) proceeding\(s\) and (\d+) court-hosted PDF\(s\)\.$/)
  if (supremeCourt) return `美国最高法院第 26-194 号官方案卷返回 ${supremeCourt[1]} 项程序记录和 ${supremeCourt[2]} 份法院托管 PDF。`
  const bop = String(value ?? '').match(/^BOP currently lists Miles Guo \(49134-510\) at (.+)\. The locator does not provide an exact transfer date\.$/)
  if (bop) return `BOP 当前将 Miles Guo（49134-510）的指定机构列为 ${bop[1]}。该查询不提供具体转监日期。`
  return null
}

const sourceTranslations = {
  'ghot-text-archive': {
    shortName: 'GHOT 文字档案',
    name: 'GHOT 公开文字档案',
    coverage: '中英双语名词解释、宣言、报告，以及郭文贵相关公开法院文件的外部摘要。',
    limitations: '这是二级研究档案，不是法院正式案卷或独立事实证明。争议性主张必须保留归因，法律结论必须回到 PDF 原件和官方案卷核验。',
  },
  'nfsc-criminal-mirror': {
    shortName: 'NFSC 文件镜像',
    name: 'NFSC 刑事案法院文件镜像',
    coverage: 'S.D.N.Y. 1:23-cr-00118-AT 刑事案公开 PDF 文件镜像。',
    limitations: '这不是法院正式案卷记录。重要结论必须用 PACER 或 RECAP 核验。',
  },
  'doj-victim-page': {
    shortName: 'DOJ 受害者页',
    name: '纽约南区联邦检察官办公室受害者信息页',
    coverage: 'United States v. Ho Wan Kwok、Kin Ming Je 和 Yanping Wang 刑事案的 DOJ 官方受害者信息。',
    limitations: '这是机构信息页，不是完整法院案卷。',
  },
  'doj-sentencing-release': {
    shortName: 'DOJ 判刑稿',
    name: 'DOJ 判刑新闻稿',
    coverage: 'DOJ 关于 Miles Guo 量刑的官方公告。',
    limitations: '可能遇到反爬验证；关键事实仍需与判决书和庭审记录核对。',
  },
  'abc-march-2023-fire-report': {
    shortName: 'ABC 火灾报道',
    name: 'ABC News 2023 年 3 月 15 日火灾报道',
    coverage: '补充 2023 年 3 月 15 日逮捕时间及约六小时后住所所在建筑 18 楼火灾的新闻时间线。',
    limitations: '新闻报道不是法院认定。起火原因及是否与逮捕有关，在报道时仍处于调查中。',
  },
  'sec-press-2023-50': {
    shortName: 'SEC 起诉稿',
    name: 'SEC 新闻稿 2023-50',
    coverage: 'SEC 对 Miles Guo 和 William Je 的民事执法公告。',
    limitations: '这是机构指控和民事执法表述，不是完整民事案卷。',
  },
  'gtv-fair-fund': {
    shortName: 'GTV Fair Fund',
    name: 'GTV Media Group Fair Fund',
    coverage: 'GTV Media Group、Saraca Media Group 和 Voice of Guo Media 的 SEC Fair Fund 分配状态。',
    limitations: '这是索赔管理网站，分配状态可能滞后于法院和 SEC 执法进展。',
  },
  'himalaya-restoration': {
    shortName: 'Himalaya Restoration',
    name: 'Himalaya Restoration 公开项目网站',
    coverage: '喜马拉雅交易所客户相关公开项目页面、法律更新、宣誓书模板说明和法院文件链接。',
    limitations: '这是当事方/律师项目网站，不是法院案卷。网站说明和客户数量属于主张方陈述，必须与 PACER、RECAP 或法院命令核验。',
  },
  'himalaya-restoration-archive': {
    shortName: 'Himalaya 历史存档',
    name: 'Himalaya Restoration 历史公开网页存档',
    coverage: 'Internet Archive 保存的 2023 至 2025 年旧站页面、案件更新及曾公开链接的法院文件。',
    limitations: '历史快照只能证明网站在特定时间公开过什么；不能证明法院接收、裁定或确认了相关文件和主张。',
  },
  'epiq-kwok-trustee': {
    shortName: 'Epiq 破产案',
    name: 'Epiq 11 郭文贵破产受托人案卷',
    coverage: '康州破产法院 In re Ho Wan Kwok 破产案的受托人案卷和案件资料。',
    limitations: '这是现代 JavaScript 应用。静态页面可核验，完整案卷提取需要 Epiq JSON 端点。',
  },
  'courtlistener-recap': {
    shortName: 'RECAP',
    name: 'CourtListener / RECAP',
    coverage: '由 PACER 用户同步的 RECAP 案卷和 PDF 元数据。',
    limitations: '无需 Token 可读取 26 宗固定案卷的公开 Feed、有限结构化搜索和当前公开 PDF；Token 可增强完整案卷条目分页。PACER 仍是正式案卷。',
  },
  'supreme-court-docket': {
    shortName: '美国最高法院',
    name: '美国最高法院第 26-194 号官方案卷',
    coverage: 'Mei Guo 等诉第 11 章受托人 Luc A. Despins，第 26-194 号案的官方程序记录和法院托管 PDF。',
    limitations: '提交调卷令申请、放弃当前回应权或分发至法官会议，都不等于最高法院已受理案件或作出实体裁判。',
  },
  'bop-inmate-locator': {
    shortName: 'BOP 在押人员查询',
    name: '美国联邦监狱管理局在押人员查询',
    coverage: '登记编号 49134-510 的 Miles Guo 当前公开羁押机构和预计释放日期字段。',
    limitations: '查询结果只显示当前状态，不是转监历史，不能据此确定具体转监日期；预计释放日期也可能变化。',
  },
  pacer: {
    shortName: 'PACER',
    name: 'PACER 官方案卷',
    coverage: '联邦地区法院、破产法院和上诉法院的正式案卷来源。',
    limitations: '需要 PACER 凭证，并应加入费用和频率控制。',
  },
  'federal-register-policy': {
    shortName: '政策雷达',
    name: 'Federal Register 政策搜索',
    coverage: '监控与没收、证券执法、破产和制裁背景有关的政策或监管变化。',
    limitations: '这是政策背景监控；除非文件直接引用本案，否则不能作为案件事实。',
  },
}

const sourceEnglishOverrides = {
  'ghot-text-archive': { shortName: 'GHOT Archive' },
  'nfsc-criminal-mirror': { shortName: 'NFSC Mirror' },
  'doj-victim-page': { shortName: 'DOJ Victim Page' },
  'doj-sentencing-release': { shortName: 'DOJ Sentencing' },
  'abc-march-2023-fire-report': { shortName: 'ABC Fire Report' },
  'sec-press-2023-50': { shortName: 'SEC Release' },
  'gtv-fair-fund': { shortName: 'GTV Fair Fund' },
  'himalaya-restoration': { shortName: 'Himalaya Restoration' },
  'himalaya-restoration-archive': { shortName: 'Himalaya Archive' },
  'epiq-kwok-trustee': { shortName: 'Epiq Bankruptcy' },
  'courtlistener-recap': { shortName: 'RECAP' },
  'supreme-court-docket': { shortName: 'Supreme Court' },
  'bop-inmate-locator': { shortName: 'BOP Locator' },
  pacer: { shortName: 'PACER' },
  'federal-register-policy': { shortName: 'Policy Radar' },
}

const caseTranslations = {
  'sdny-23-cr-118': {
    title: '美国诉何万国/郭文贵（Miles Guo）等刑事案',
    shortTitle: '刑事主案',
    kind: '刑事',
    status: '判决后上诉与没收附属程序阶段',
    lastKnownFiling: '文件 868，2026-08-06',
    stage: '判决已录入；已提交上诉通知；没收第三方权益申请和强制令活动仍在继续。',
    focus: '定罪、360 个月刑期、8.89 亿美元没收金钱判决、第三方 § 853(n) 申请、第二巡回上诉。',
    watchQuestions: [
      '第二巡回直接上诉 26-1853 的书状排期、律师出庭、庭审记录状态和争点保留文件。',
      '纽约南区法院是否在强制令“不影响以后再提出”后登记并审理第三方没收申请。',
      '是否出现新的初步/最终没收令、返还/减免程序通知或具体资产权利主张。',
    ],
  },
  'ca2-26-1853': {
    title: '美国诉 Guo 刑事直接上诉',
    shortTitle: '刑事直接上诉',
    kind: '刑事上诉',
    status: '直接上诉已立案；律师与庭审记录文件正在提交',
    lastKnownFiling: '案卷条目 17，2026-08-06',
    stage: '对 2026 年 7 月 2 日刑事判决提出的直接上诉正在第二巡回审理。',
    focus: '律师状态、庭审记录、书状排期、审判与量刑争点保留、定罪、刑期和没收金钱判决。',
    watchQuestions: [
      '法院是否准许律师退出或替换，以及当前正式登记的代理律师。',
      '庭审记录与排期命令何时完整，首份上诉书状何时到期。',
      '实体书状最终保留了哪些定罪、证据、量刑、损失和没收争点。',
    ],
  },
  'sdny-23-cv-2200': {
    title: 'SEC 诉 Kwok、Je 及相关 GTV 实体民事执法案',
    shortTitle: 'SEC 民事案',
    kind: '民事执法',
    status: '与 GTV 和数字资产发行相关的 SEC 民事执法线',
    lastKnownFiling: '需要实时案卷刷新',
    stage: '民事执法请求和资产追回必须与刑事没收及 Fair Fund 抵扣相互核对。',
    focus: '证券欺诈指控、返还抵扣、投资人分配、与刑事没收损失计算的重叠。',
    watchQuestions: [
      '民事返还或 Fair Fund 付款是否减少刑事没收金额。',
      'Kin Ming Je / William Je 和实体被告的民事案状态。',
      '是否有中止、同意判决、缺席判决或平行接管程序动作。',
    ],
  },
  'sec-admin-3-20537': {
    title: 'GTV Media Group、Saraca Media Group、Voice of Guo Media 行政程序',
    shortTitle: 'GTV Fair Fund',
    kind: '行政程序 / Fair Fund',
    status: '分配管理仍在进行',
    lastKnownFiling: 'Fair Fund 网站显示第二批分配于 2023-09-29 开始',
    stage: '投资人补偿线与刑事没收、赔偿令及返还/减免程序分析相交。',
    focus: 'Fair Fund 实付金额、索赔资格、分配批次、对刑事没收金额的抵扣。',
    watchQuestions: [
      '后续分配或管理人通知是否改变损失和返还/减免程序计算。',
      '已经收到 Fair Fund 付款的申请人在刑事没收返还/减免程序中如何处理。',
    ],
  },
  'dconn-22-50073': {
    title: 'Ho Wan Kwok 破产案',
    shortTitle: '康州破产案',
    kind: '破产',
    status: '受托人资产追回与债权管理',
    lastKnownFiling: '需要接入 Epiq 实时案卷提取',
    stage: '破产财产、受托人诉讼、资产所有权和债权可能影响刑事没收执行。',
    focus: '破产财产、人格混同认定、Lady May / HK International 线、债权、受托人动议。',
    watchQuestions: [
      '最新受托人案卷条目，以及财产移交、人格混同或出售命令的任何上诉。',
      '刑事没收、SEC 返还和破产财产权利主张是否冲突或协调。',
      '是否有家族、信托、基金会或名义持有人所有权主张绑定到可追回资产。',
    ],
  },
  'ca2-24-2504': {
    title: 'In re Kwok：HK International Funds Investments / Lady May 资产线',
    shortTitle: '第二巡回资产案',
    kind: '上诉 / 破产',
    status: '第二巡回已发表裁判；最高法院第 26-194 号调卷令申请待处理',
    lastKnownFiling: '最高法院于 2026-08-19 将申请分发至法官会议',
    stage: '第二巡回的人格混同裁判目前仍然有效；申请人已在最高法院第 26-194 号案请求审查。',
    focus: '名义上由 HK International 或相关实体持有的资产是否属于破产财产。',
    watchQuestions: [
      '最高法院在 2026 年 9 月 28 日会议后是否要求回应、再次列会、准许或驳回调卷令，或发布其他命令。',
      '生效案卷记录中点名了哪些家族、信托或投资载体。',
    ],
  },
  'scotus-26-194': {
    title: 'Mei Guo、HK International Funds Investments (IUSA) Limited LLC 诉第 11 章受托人 Luc A. Despins',
    shortTitle: '最高法院调卷令申请',
    kind: '最高法院 / 破产',
    status: '调卷令申请待处理',
    lastKnownFiling: '2026-08-19 分发至法官会议',
    stage: '申请已分发至最高法院 2026 年 9 月 28 日法官会议；最高法院尚未准许调卷令。',
    focus: '《美国法典》第 11 编 § 544(a) 是否授权破产受托人提起本来属于全体债权人的州法人格混同请求。',
    watchQuestions: [
      '尽管受托人已放弃当前回应权，最高法院是否仍要求回应、再次列会、准许或驳回调卷令，或要求联邦政府提交意见。',
      '后续文件是否改变申请人所主张的各巡回法院对 § 544(a) 受托人诉讼资格的分歧。',
      '最高法院的处理如何影响第二巡回裁判、Lady May / 3,700 万美元托管款及后续破产管理。',
    ],
  },
  'bkd-22-05032': {
    title: 'Pacific Alliance Asia Opportunity Fund L.P. 诉 Kwok 破产对抗程序',
    shortTitle: '破产对抗程序',
    kind: '破产对抗程序',
    status: 'Kwok 破产线下的关联对抗程序',
    lastKnownFiling: 'RECAP 条目 214，2024-10-01',
    stage: '该对抗程序应放在 22-50073 破产母案和相关地区法院审查下理解。',
    focus: '债权人主张、破产财产所有权、移交或人格混同问题，以及地区法院对破产裁判的审查。',
    watchQuestions: ['后续文件是否以不同案名出现在破产、地区法院或上诉案卷。', '地区法院审查后哪些裁判仍然生效，以及其对破产财产分析的影响。'],
  },
  'dconn-26-withdrawal-reference': {
    title: 'In Re: Ho Wan Kwok 2026 年撤回破产移送程序组',
    shortTitle: '2026 撤回移送程序',
    kind: '破产 / 地区法院',
    status: '8 宗关联撤回破产移送程序',
    lastKnownFiling: '公开 RECAP Feed 更新至 2026-07-28',
    stage: '8 宗地区法院杂项案请求或处理撤回破产移送；各自保留独立案卷，同时共享破产母案。',
    focus: '撤回移送标准、陪审团审判或审理法院争议、异议、关联案件管理，以及涉及 Phillips Nizer、Putnam\'s Landscaping、SGB Packaging 等当事人的受托人诉讼。',
    watchQuestions: ['各案动议是否被准许、驳回、移送、合并或行政结案。', '每宗编号程序的实体审理继续留在破产法院还是移至地区法院。', '8 宗程序的裁定如何影响受托人的资产追回和专业责任诉讼。'],
  },
  'edny-26-mc-2795': {
    title: 'Rui Hao 依据 28 U.S.C. § 1782 提出的外国程序取证申请',
    shortTitle: '§ 1782 关联程序',
    kind: '外国程序取证',
    status: '与外国程序有关的司法协助取证案',
    lastKnownFiling: '公开 RECAP Feed 更新至 2026-08-03',
    stage: '法院于 2026 年 7 月 9 日准许 § 1782 取证协助；后续履行或异议仍需核对案卷。',
    focus: '准许的取证范围、传票对象与履行、外国程序用途，以及任何撤销或修改申请。',
    watchQuestions: ['具体准许了什么取证、谁必须回应，以及传票或提交是否受到异议。', '在不把申请人陈述当成既判事实的前提下，核对外国程序与 Kwok 的关系。'],
  },
  'bkd-hk-int-despins': {
    title: 'HK International Funds Investments (USA) Limited 诉 Despins',
    shortTitle: 'HK International 资产案',
    kind: '破产对抗程序',
    status: '公开 CourtListener 搜索记录已确认案名和案号；仍以 PACER 正式案卷为准',
    lastKnownFiling: '公开 RECAP Feed 观测至 2026-05-21',
    stage: '该案属于破产财产和资产所有权线；公开记录将其标识为 22-05003。',
    focus: 'HK International 的所有权立场、受托人回应及其对破产财产分析的影响。',
    watchQuestions: ['确认当前有效的权利主张、命令和上诉。', '把资产所有权裁判与破产母案及第二巡回记录相互核对。'],
  },
  'bkd-24-05275-lamp': {
    title: 'Despins 诉 Lamp Capital LLC',
    shortTitle: 'Lamp Capital 受托人案',
    kind: '破产对抗程序',
    status: '公开 CourtListener 搜索记录已确认案名和案号',
    lastKnownFiling: '需要实时案卷刷新',
    stage: '与 Ho Wan Kwok 破产财产及相关实体被告有关的第 11 章受托人对抗程序。',
    focus: '受托人权利主张、实体关系、破产财产追回，以及涉及 Lamp Capital 和相关实体的资产所有权裁判。',
    watchQuestions: ['取得有效起诉状、答辩、决定性动议和法院命令。', '把每一项实体和资产陈述绑定到已提交文件中的证据。'],
  },
  'bkd-25-05088-1stdibs': {
    title: 'Despins 诉 1stdibs.com Inc.',
    shortTitle: '1stdibs 受托人案',
    kind: '破产对抗程序',
    status: '已由公开案名确认、与 Ho Wan Kwok 破产财产有关的受托人对抗程序',
    lastKnownFiling: '公开 RECAP Feed 观测至 2025-08-15',
    stage: '通过姓名变体搜索发现较早公开条目；当前是否仍在审理，需要刷新案卷确认。',
    focus: '受托人权利主张，以及与破产财产或资产追回之间的具体关系。',
    watchQuestions: ['确认程序当前是继续审理、已解决还是行政结案。', '取得可用的公开 PDF 或案卷文字。'],
  },
  'bkd-25-05094-ny-blinds': {
    title: 'Despins 诉 NY Blinds and Shades Inc.（Innovation Shades）',
    shortTitle: 'NY Blinds 受托人案',
    kind: '破产对抗程序',
    status: '已由公开案名确认、与 Ho Wan Kwok 破产财产有关的受托人对抗程序',
    lastKnownFiling: '公开 RECAP Feed 观测至 2025-08-15',
    stage: '通过姓名变体搜索发现较早公开条目；当前是否仍在审理，需要刷新案卷确认。',
    focus: '受托人权利主张，以及与破产财产或资产追回之间的具体关系。',
    watchQuestions: ['确认程序当前是继续审理、已解决还是行政结案。', '取得可用的公开 PDF 或案卷文字。'],
  },
  'az-voice-of-guo': {
    title: 'Zhang 诉 Voice of Guo Media Incorporated',
    shortTitle: '亚利桑那 Voice of Guo 案',
    kind: '民事 / 关联实体',
    status: '公开 CourtListener 搜索记录已确认案名、案号、当事人和立案日期',
    stage: '案名和当事人包括 Voice of Guo、GTV、Saraca 及 Rule of Law 相关实体；具体权利主张必须以诉状和裁判文件为准。',
    focus: '实体状态、原告诉求、抗辩、裁判结果及与 G 系列或 Fair Fund 事项的关系。',
    watchQuestions: ['取得有效诉状和终局处理文件。', '阅读文件后逐项分类权利主张和当事人关系。'],
  },
  'related-people-companies': {
    title: '关联人、G 系列实体与资产载体',
    shortTitle: '关联人/公司线',
    kind: '实体情报',
    status: '持续进行实体与案卷关联',
    lastKnownFiling: '持续监控',
    stage: '追踪 GTV、Saraca、Voice of Guo、G Clubs、Himalaya Exchange、Farm Loan、Rule of Law 相关实体、家族/信托/基金线索。',
    focus: '关联被告、推广人、实体被告、第三方申请人、资产、所谓受害者和来源可靠性。',
    watchQuestions: [
      '新文件是否识别此前未知的名义持有人、家族、信托、基金会或离岸实体关系。',
      'G 系列投资人申请是否形成协调化附属程序或单独上诉活动。',
    ],
  },
}

const caseEnglishOverrides = {
  'sdny-23-cr-118': { shortTitle: 'Criminal Main Case', kind: 'Criminal' },
  'ca2-26-1853': { shortTitle: 'Criminal Direct Appeal', kind: 'Criminal Appeal' },
  'sdny-23-cv-2200': { shortTitle: 'SEC Civil Case', kind: 'Civil Enforcement' },
  'sec-admin-3-20537': { shortTitle: 'GTV Fair Fund', kind: 'Administrative / Fair Fund' },
  'dconn-22-50073': { shortTitle: 'D. Conn. Bankruptcy', kind: 'Bankruptcy' },
  'ca2-24-2504': { shortTitle: 'Second Circuit Asset Case', kind: 'Appellate / Bankruptcy' },
  'bkd-22-05032': { shortTitle: 'Bankruptcy Adversary', kind: 'Bankruptcy Adversary' },
  'dconn-26-withdrawal-reference': { shortTitle: '2026 Withdrawal Proceedings', kind: 'Bankruptcy / District Court' },
  'edny-26-mc-2795': { shortTitle: 'Section 1782 Proceeding', kind: 'Foreign-Proceeding Discovery' },
  'bkd-hk-int-despins': { shortTitle: 'HK International v. Despins', kind: 'Bankruptcy Adversary' },
  'bkd-24-05275-lamp': { shortTitle: 'Lamp Capital trustee case', kind: 'Bankruptcy Adversary' },
  'bkd-25-05088-1stdibs': { shortTitle: '1stdibs trustee case', kind: 'Bankruptcy Adversary' },
  'bkd-25-05094-ny-blinds': { shortTitle: 'NY Blinds trustee case', kind: 'Bankruptcy Adversary' },
  'az-voice-of-guo': { shortTitle: 'Voice of Guo Arizona case', kind: 'Civil / Entity-Related' },
  'related-people-companies': { shortTitle: 'Related Entities', kind: 'Entity Intelligence' },
  'scotus-26-194': { shortTitle: 'Supreme Court Certiorari Petition', kind: 'Supreme Court / Bankruptcy' },
}

const eventTranslations = {
  'recap-feed-sdny-23-cr-118-67012324-869': {
    title: '文件 869：Sharon Cohen Levin 为 Pillsbury Winthrop Shaw Pittman LLP 提交律师出庭登记',
    summary: 'RECAP 公开 Feed 和该一页 PDF 显示，Sullivan & Cromwell LLP 的 Sharon Cohen Levin 于 2026 年 8 月 18 日提交 AO 458 出庭表，表内所列代理对象为 Pillsbury Winthrop Shaw Pittman LLP。',
    impact: '这是代理登记类程序文件，不裁判定罪、量刑、上诉、没收或羁押问题；表格本身也没有说明提交原因。',
  },
  'scotus-26-194-conference-distribution-2026-08-19': {
    title: '最高法院将第 26-194 号调卷令申请分发至 2026 年 9 月 28 日法官会议',
    summary: '官方案卷记载，第 26-194 号调卷令申请已分发，供最高法院在 2026 年 9 月 28 日法官会议上审议。',
    impact: '“分发至会议”只是把申请提交法官内部审议，不等于最高法院已准许调卷令，也不是对实体争议作出裁判。',
  },
  'scotus-26-194-response-waiver-2026-08-17': {
    title: '第 11 章受托人放弃当前提交调卷令申请回应的权利',
    summary: '官方案卷记载，被申请人受托人放弃当前回应权；如果最高法院以后要求回应，仍可再提交。',
    impact: '放弃回应不等于同意申请、承认对方实体主张或任何一方胜诉，最高法院仍可要求回应。',
  },
  'scotus-26-194-cert-petition-2026-08-11': {
    title: '最高法院第 26-194 号案提交调卷令申请',
    summary: 'Mei Guo 和 HK International Funds Investments (IUSA) Limited LLC 请求最高法院审查第二巡回第 24-2504 号案的裁判。',
    impact: '申请提出的问题是 § 544(a) 是否允许破产受托人接管并提起属于一般债权人的州法人格混同请求。提交申请不等于最高法院同意受理。',
  },
  'sdny-23-cr-118-doc-868': {
    title: '文件 868：第二巡回发布正式命令，驳回并行自行诉讼强制令申请',
    summary:
      '公开镜像摘要显示，第二巡回驳回了并行的自行诉讼强制令申请；但关于第三方没收权利主张是否应登记和审理的部分，驳回不影响以后在合理时间后再次提出。',
    impact: '这继续给地区法院处理第三方没收申请施加程序压力，但尚未给申请人带来实体救济。',
  },
  'sdny-23-cr-118-doc-867': {
    title: '文件 867：第三方自行诉讼强制令申请要求撤销定罪、量刑、没收并暂停程序',
    summary:
      '第三方自行诉讼申请据称要求撤销定罪、量刑和没收命令，就政府 225 名受害者名单举行证据听证，并暂停所有没收程序。',
    impact: '这显示所谓投资人或第三方申请人的程序反对仍在继续；实际法律效果取决于上诉法院处理和正式案卷状态。',
  },
  'sdny-23-cr-118-doc-866': {
    title: '文件 866：法院有限解封 § 853 附属没收申请',
    summary: '法院准许有限解封，目的仅限于让政府从书记员处取得 § 853 附属申请的未删节副本。',
    impact: '这说明附属没收程序仍在推进，同时公开访问和隐私删节仍受法院控制。',
  },
  'sdny-23-cr-118-doc-864': {
    title: '文件 864：量刑庭审记录入档',
    summary:
      '公开镜像称，量刑记录显示法院判处 360 个月监禁，低于 2100 个月量刑指南区间，并作出 8.89 亿美元没收金钱判决；法院拒绝 Fatico 听证，并认定损失超过 5.5 亿美元。',
    impact: '该庭审记录是上诉争点、没收理由、损失计算、赔偿令不可行性和减轻处罚论证的关键证据。',
  },
  'sdny-23-cr-118-doc-865': {
    title: '文件 865：量刑庭审正式记录提交通知',
    summary: '法院提交量刑庭审正式记录的通知，触发 7 天删节申请窗口，以及 90 天后公开电子发布的期限。',
    impact: '庭审记录公开时间和删节窗口会影响上诉准备、引用证据和公开访问。',
  },
  'sdny-23-cr-118-doc-863': {
    title: '文件 863：第三方自行诉讼申请人请求第二巡回命令地区法院登记其没收权利主张',
    summary:
      '第三方自行诉讼申请人请求第二巡回签发强制令，要求地区法院登记其 21 U.S.C. § 853(n) 财产权利主张，并举行 Fed. R. Crim. P. 32.2(c) 所要求的附属程序。',
    impact: '这显示第三方没收权利程序存在登记和审理争议，应与地区法院后续案卷动作核对。',
  },
  'sdny-23-cr-118-doc-862': {
    title: '文件 862：提交上诉通知',
    summary: 'Miles Guo 就 2026 年 7 月 2 日判决向第二巡回提交上诉通知，上诉范围包括定罪和刑期。',
    impact: '直接上诉成为后续核心诉讼轨道；关键事项是上诉案号、律师、庭审记录和排期表。',
  },
  'sdny-23-cr-118-doc-860': {
    title: '文件 860：对 Miles Guo 录入刑事判决',
    summary:
      '判决据称包括 360 个月监禁、900 美元特别评估金、无监督释放，以及 8.89 亿美元没收金钱判决；陪审团认定 9 项罪名成立、3 项无罪。',
    impact: '这是触发上诉期限、判后程序、没收执行和受害者返还/减免程序的最终刑事判决。',
  },
  'sdny-23-cr-118-doc-861': {
    title: '文件 861：Torres 法官命令密封含未删节敏感个人信息的 ECF 765',
    summary: 'Torres 法官命令密封 ECF 765，因为该文件含有未删节的敏感个人信息；该文件是提交给第二巡回的礼貌副本。',
    impact: '该命令与隐私删节、上诉材料提交和公开访问边界有关。',
  },
  'sdny-23-cr-118-doc-859': {
    title: '文件 859：补充初步没收令加入银行账户资产',
    summary:
      '法院据称命令没收更多资产，包括约 211 万美元的 Banco Popular 账户和四个以别名持有的 Barclays 账户，并通过 forfeiture.gov 通知第三方权利主张期限。',
    impact: '具体资产没收扩展了金钱判决以外的执行范围，并为第三方权益人创造申报期限。',
  },
  'sdny-23-cr-118-doc-858': {
    title: '文件 858：没收金钱判决从 13 亿美元降至 8.89 亿美元',
    summary:
      '法院据称部分支持 Guo 的没收异议，将 GTV/SEC 线已返还的 4.11 亿美元计入抵扣；同时拒绝强制扣押破产资产的请求，并授权以受害者返还/减免程序替代赔偿令。',
    impact: '这把刑事案、SEC Fair Fund 和破产财产直接连在一起，是资产追回最重要的跨程序裁定之一。',
  },
  'sdny-23-cr-118-doc-857': {
    title: '文件 857：香港投资人请求第二巡回命令地区法院登记其 199.5 万美元附属没收权利主张',
    summary: '一名自行诉讼的香港投资人请求第二巡回签发强制令，要求纽约南区法院登记其多次提交的 199.5 万美元附属没收权利主张，并请求删节个人识别信息。',
    impact: '这延续了第三方申请人围绕文件登记、财产权利审理和隐私保护提出的程序争议；实际法律效果取决于第二巡回的正式处理。',
  },
  'sdny-23-cr-118-doc-855': {
    title: '文件 855：法院驳回推迟 6 月 29 日量刑的请求',
    summary: '法院驳回 Guo 推迟 6 月 29 日量刑的请求，认定无需举行 Fatico 听证，也没有足以支持延期的未决动议，并终结 ECF 853 动议。',
    impact: '该裁定保留原量刑日期，并可能影响直接上诉中关于损失认定、听证需求和延期请求的争点。',
  },
  'sdny-23-cr-118-doc-854': {
    title: '文件 854：法院驳回要求强制履行传票的动议',
    summary: '法院采信被传票方已善意检索的说明，驳回 Guo 要求强制履行传票的动议，并终结 ECF 829 动议。',
    impact: '该裁定关系到量刑前证据取得、传票充分履行以及可能保留的上诉争点。',
  },
  'sdny-23-cr-118-doc-853': {
    title: '文件 853：辩方请求推迟 6 月 29 日量刑并列出六项未决问题',
    summary: '辩方请求推迟 6 月 29 日量刑，理由包括 Fatico 听证、传票履行和 Brady 动议等六项未决问题；文件还更新支持者声明数量，并记录政府反对延期。',
    impact: '该动议集中呈现辩方对量刑前事实查明、证据取得和准备时间的程序立场，但是否成立取决于法院裁定。',
  },
  'sdny-23-cr-118-doc-852': {
    title: '文件 852：第三方申请人请求第二巡回命令地区法院登记其 § 853(n) 财产权利主张',
  },
  'sdny-23-cr-118-doc-851': {
    title: '文件 851：第三方申请人请求登记其 5 月 22 日提交的 § 853(n) 没收权利申请',
  },
  'sdny-23-cr-118-doc-850': {
    title: '文件 850：第三方申请人请求第二巡回命令地区法院登记并处理其先前提交的文件',
  },
  'sdny-23-cr-118-doc-849': {
    title: '文件 849：第二巡回驳回多份要求地区法院登记和处理申请的自行诉讼强制令申请',
  },
  'sdny-23-cr-118-doc-848': {
    title: '文件 848：第三方申请人请求第二巡回命令地区法院登记 18 份文件并就其主张举行听证',
  },
  'sdny-23-cr-118-doc-844': {
    title: '文件 844：投资人请求第二巡回命令地区法院登记其非受害者申请并处理相关主张',
  },
  'ca2-24-2504-opinion-2026-04-06': {
    title: '第二巡回公开发表 In re Kwok 资产裁判，报道号 172 F.4th 145',
    summary:
      '该上诉线围绕 HK International Funds Investments 和 Lady May 资产是否可在人格混同分析下归入 Kwok 破产财产。',
    impact: '这项裁判对家族、名义持有人和资产载体图谱非常重要，因为名义上独立持有的资产可能被纳入破产财产范围。',
  },
  'sdny-23-cr-118-yvette-sentencing-2025-01-06': {
    title: 'DOJ 受害者信息页显示 Yanping Wang / Yvette Wang 被判 120 个月',
    summary: 'DOJ 受害者信息页报告 Yanping Wang 已认罪，并被判处 120 个月监禁；其没收责任与更大的案件线有关。',
    impact: '涉及 Wang 的没收命令和申请人主张应与 Guo 的直接上诉争点分开追踪。',
  },
  'sdny-23-cr-118-verdict-2024-07-16': {
    title: '陪审团裁定 Miles Guo 多项欺诈、敲诈勒索、证券欺诈和洗钱罪名成立',
    summary: '刑事定罪构成后续量刑、没收、上诉和受害者返还/减免程序的基础。',
    impact: '后续上诉分析通常会围绕审判裁定、证据充分性、证据问题、损失计算和没收问题展开。',
  },
  'gtv-fair-fund-second-tranche-2023-09-29': {
    title: 'GTV Fair Fund 第二批分配开始',
    summary: 'GTV Fair Fund 网站称，第二批分配于 2023 年 9 月 29 日开始，并按获批计划继续付款。',
    impact: 'Fair Fund 分配很重要，因为刑事没收裁定将 SEC/GTV 线的返还金额计入刑事金钱判决抵扣。',
  },
  'sec-press-2023-50': {
    title: 'SEC 宣布对 Miles Guo 和 William Je 提起民事指控',
    summary: 'SEC 宣布提起指控，称相关 GTV 和其他发行涉及 8.5 亿美元欺诈计划。',
    impact: '这些民事指控和 Fair Fund 分配机制构成与刑事没收相互重叠但独立的投资人追回线。',
  },
  'sdny-23-cr-118-indictment-2023-03-15': {
    title: '纽约南区刑事案起诉 Miles Guo 和 Kin Ming Je',
    summary: 'DOJ 受害者信息页列明针对 Ho Wan Kwok、Kin Ming Je 和 Yanping Wang 的联邦刑事案，涉及欺诈、敲诈勒索、证券和洗钱线。',
    impact: '这是刑事案卷、相关没收、受害者通知和后续上诉程序的起点。',
  },
  'abc-guo-apartment-fire-2023-03-15': {
    title: 'ABC 报道郭文贵被捕约六小时后，住所所在建筑 18 楼发生火灾',
    summary: 'ABC News 报道，郭文贵约于当日上午 6 时被捕；FDNY 约于中午 12 时 02 分处置其住所所在建筑 18 楼的火灾。报道记载无人受伤，起火原因当时仍在调查。',
    impact: '这是单独注明来源的新闻时间线事项，不是法院文件或司法认定。报道没有确认火灾由逮捕引发或与逮捕存在关联，程序不得暗示纵火、毁灭证据或其他因果解释。',
  },
  'dconn-22-50073-bankruptcy-filed-2022-02-15': {
    title: 'Ho Wan Kwok 康州破产案开始',
    summary: '破产案建立了资产管理和债权申报线，后来与刑事没收和第二巡回的人格混同裁判交叉。',
    impact: '任何追踪郭文贵相关事项的程序，都必须把刑事没收与破产财产控制、受托人追回行动互相对应。',
  },
}

const entityTranslations = {
  'ho-wan-kwok': {
    name: '何万国 / 郭文贵 / Miles Guo',
    type: '人物',
    role: '被告、债务人、核心主体',
    riskAreas: ['刑事上诉', '没收', '破产财产', 'SEC 民事执法'],
    notes: '刑事案中 9 项罪名成立；公开镜像材料显示判决于 2026 年 7 月 2 日录入。2026 年 8 月 20 日通过 BOP 官方查询核验，登记编号 49134-510 当前指定机构为 FCI Danbury；查询结果不提供具体转监日期。',
    custody: {
      registerNumber: '49134-510',
      currentFacility: 'FCI Danbury',
      facilityCode: 'DAN',
      projectedReleaseDate: '2048-10-06',
      verifiedAt: '2026-08-20',
      sourceId: 'bop-inmate-locator',
      sourceUrl: 'https://www.bop.gov/PublicInfo/execute/inmateloc?todo=query&output=json&inmateNum=49134-510&inmateNumType=IRN',
      limitation: '仅代表 BOP 当前公开指定机构；官方查询不提供具体转监日期。预计释放日期可能变化，不构成实际释放日期保证。',
    },
  },
  'kin-ming-je': {
    name: 'Kin Ming Je / William Je',
    type: '人物',
    role: 'DOJ/SEC 所称共同被告和财务顾问',
    riskAreas: ['在逃状态', 'SEC 执法', '资产追踪'],
    notes: 'DOJ 受害者页将其列为被告；最新状态应继续用官方来源核验。',
  },
  'yanping-wang': {
    name: 'Yanping Wang / Yvette Wang',
    type: '人物',
    role: '已认罪并被判刑的共同被告',
    riskAreas: ['没收', '合作/量刑记录', '相关强制令申请'],
    notes: 'DOJ 受害者页报告其认罪和判刑信息；仍需追踪与其案名有关的没收命令和第三方申请。',
  },
  'gtv-media': {
    name: 'GTV Media Group',
    type: '公司',
    role: 'G 系列 / SEC Fair Fund 实体',
    riskAreas: ['投资人权利主张', 'SEC 分配', '刑事没收抵扣'],
    notes: 'Fair Fund 和 SEC 程序是刑事没收裁定中 4.11 亿美元抵扣的核心。',
  },
  'saraca-media': {
    name: 'Saraca Media Group',
    type: '公司',
    role: 'SEC Fair Fund 实体',
    riskAreas: ['投资人权利主张', 'SEC 分配'],
    notes: 'GTV Media Group Fair Fund 网站列名实体。',
  },
  'voice-of-guo': {
    name: 'Voice of Guo Media',
    type: '公司',
    role: 'SEC Fair Fund 实体',
    riskAreas: ['投资人权利主张', 'SEC 分配'],
    notes: 'GTV Media Group Fair Fund 网站列名实体。',
  },
  'hk-international': {
    name: 'HK International Funds Investments',
    type: '公司 / 资产持有载体',
    role: '资产所有权与人格混同线',
    riskAreas: ['人格混同', '破产财产', 'Lady May 资产线'],
    notes: '家族、基金和信托相关主张必须绑定到法院文件后，才能从线索提升为事实。',
  },
  'rule-of-law-entities': {
    name: 'Rule of Law Foundation / Rule of Law Society 线',
    type: '非营利组织 / 实体线索',
    role: '关联组织观察线',
    riskAreas: ['实体关系', '捐赠人/投资人权利主张', '来源核验'],
    notes: '纳入关系图谱；只有法院文件或官方机构来源中的事实才应视为已证实。',
  },
  'himalaya-exchange': {
    name: 'Himalaya Exchange / H-Coin / H-Dollar 线',
    type: '数字资产 / 实体线索',
    role: 'G 系列相关发行观察线',
    riskAreas: ['数字资产权利主张', '投资人损失', '没收返还/减免程序'],
    notes: '应与 GTV、G Clubs、Farm Loan 和相关投资人申请一起追踪。',
  },
  'lamp-capital': {
    name: 'Lamp Capital LLC',
    type: '公司 / 资产持有载体',
    role: '受托人资产追回诉讼中的被告及关联实体',
    riskAreas: ['破产财产追回', '实体关系', '资产所有权'],
    notes: '关于实体关系和法律责任的结论，必须以第 24-05275 号对抗程序中已提交的诉状和法院裁定为依据。',
  },
}

const policyTranslations = {
  'criminal-forfeiture-remission': {
    title: '刑事没收、第三方权益与返还/减免程序',
    area: 'DOJ / 联邦刑事程序',
    relevance: '郭文贵案的 8.89 亿美元没收、§ 853(n) 附属申请、受害者返还/减免程序与无赔偿令判定都落在这条政策线上。',
    monitorTerms: ['刑事没收返还/减免程序', '21 U.S.C. 853(n)', '受害者返还/减免与 restoration'],
    posture: '高度相关；优先监控法院命令，再参考政策评论。',
  },
  'sec-fair-fund': {
    title: 'SEC Fair Fund 与数字资产/证券发行执法',
    area: 'SEC 执法',
    relevance: 'GTV Fair Fund 付款直接影响刑事没收抵扣，并影响投资人实际回收。',
    monitorTerms: ['SEC Fair Fund 数字资产发行', 'GTV Media Group Fair Fund', '返还与投资人分配'],
    posture: '跨程序抵扣问题；必须区分机构指控和法院认定。',
  },
  'bankruptcy-asset-recovery': {
    title: '破产财产、人格混同与名义持有人资产追回',
    area: '破产 / 上诉',
    relevance: 'HK International、Lady May、家族/基金/信托类资产主张需要通过破产案卷和上诉记录核验。',
    monitorTerms: ['人格混同 破产财产 资产追回', '名义持有人所有权与破产', 'Ho Wan Kwok 受托人'],
    posture: '未绑定法院文件前，不应把家族/基金会相关指控当作事实。',
  },
  'china-transnational-context': {
    title: '中国相关跨境政治、制裁与外来影响叙事',
    area: '政策背景',
    relevance: '爆料革命叙事和相关政治主张会影响媒体解读和支持者行为，但不能替代法院记录。',
    monitorTerms: ['中国跨国镇压政策', '中国相关外来影响执法', '政治庇护欺诈案背景'],
    posture: '仅作为背景；除非官方文件直接引用，否则不作为案件事实。',
  },
}

const phrasePairs = [
  ['Mirror filename and page text can be incomplete; verify with docket of record.', '镜像文件名和页面文字可能不完整；应以正式案卷记录核验。'],
  ['Mirror filename and page text can be incomplete; verify with 正式案卷记录.', '镜像文件名和页面文字可能不完整；应以正式案卷记录核验。'],
  ['Download failed; use source link or rerun downloader before analysis.', '下载失败；分析前应使用来源链接或重新运行下载器。'],
  ['No docket number was detected from the source link text.', '来源链接文字中未识别到案卷文件号。'],
  ['No local file path is recorded in the manifest.', 'manifest 中没有记录本地文件路径。'],
  ['No obvious file-level risk detected from metadata.', '元数据未显示明显文件级风险。'],
  ['Public mirror; not the docket of record', '公开镜像；不是正式案卷记录'],
  ['RECAP court-record mirror', 'RECAP 法院记录镜像'],
  ['Official agency source; allegations and announcements still need court-record separation', '官方机构来源；指控和公告仍需与法院记录分开'],
  ['Claims administrator source; reconcile with court and SEC records', '索赔管理来源；应与法院和 SEC 记录核对'],
  ['Official court source', '官方法院来源'],
  ['Public source metadata', '公开来源元数据'],
  ['Civil enforcement materials should be reconciled with criminal forfeiture and Fair Fund recovery.', '民事执法材料应与刑事没收和 Fair Fund 回收相互核对。'],
  ['Direct criminal appeal', '刑事直接上诉'],
  ['Criminal forfeiture and third-party ancillary claims', '刑事没收与第三方附属申请'],
  ['SEC civil enforcement and Fair Fund offsets', 'SEC 民事执法与 Fair Fund 抵扣'],
  ['with the denial as to both', '其中关于'],
  ['and consideration of the', '以及审理'],
  ['left 不影响以后再提出 to renewal', '不影响以后再次提出'],
  ['to renewal', '再次提出'],
  ['consideration of the', '审理'],
  ['S.D.N.Y. criminal docket public PDF mirror', '纽约南区刑事案卷公开 PDF 镜像'],
  ['DOJ victim information page linked files', 'DOJ 受害者信息页链接文件'],
  ['SEC civil enforcement linked files', 'SEC 民事执法链接文件'],
  ['GTV Fair Fund linked files', 'GTV Fair Fund 链接文件'],
  ['criminal docket', '刑事案卷'],
  ['public PDF mirror', '公开 PDF 镜像'],
  ['PDF mirror', 'PDF 镜像'],
  ['tandem', '并行'],
  ['Verified Amended Complaint', '经核实的修订起诉状'],
  ['Amended Complaint', '修订起诉状'],
  ['Complaint', '起诉状'],
  ['Exhibit', '附件'],
  ['Redacted', '已删节'],
  ['dated', '日期'],
  ['Official complete district, bankruptcy, and appellate court records require PACER credentials and fee-aware retrieval.', '完整的地区法院、破产法院和上诉法院正式记录需要 PACER 凭证，并应采用费用感知抓取。'],
  ['CourtListener/RECAP API requires COURTLISTENER_TOKEN in this environment.', '当前环境需要 COURTLISTENER_TOKEN 才能使用 CourtListener/RECAP API。'],
  ['Configure CourtListener / RECAP in Settings to enable the authenticated API.', '请在设置页配置 CourtListener / RECAP Token，以启用需鉴权的 API。'],
  ['Epiq docket shell is public, but full document extraction requires mapping its JSON document endpoint.', 'Epiq 案卷外壳公开可访问，但完整文件提取需要映射其 JSON 文件端点。'],
  ['Parsed', '已解析'],
  ['docket-linked PDF entries', '带 PDF 链接的案卷条目'],
  ['public mirror', '公开镜像'],
  ['Federal Register policy search returned', 'Federal Register 政策搜索返回'],
  ['result(s)', '条结果'],
  ['briefing schedule', '书状排期'],
  ['consent judgment', '同意判决'],
  ['default', '缺席判决'],
  ['receivership', '接管程序'],
  ['disgorged', '已返还'],
  ['disgorgement', '返还'],
  ['stay request', '中止请求'],
  ['stay', '中止'],
  ['family', '家族'],
  ['Trustee', '受托人'],
  ['trustee', '受托人'],
  ['trust', '信托'],
  ['offshore-entity', '离岸实体'],
  ['offshore entity', '离岸实体'],
  ['reportedly', '据称'],
  ['mirrored docket', '镜像案卷'],
  ['Mirror summary', '镜像摘要'],
  ['mirror summary', '镜像摘要'],
  ['Official agency statement', '官方机构陈述'],
  ['Official agency allegation', '官方机构指控'],
  ['Claims administrator statement', '索赔管理人陈述'],
  ['Reported appellate decision reference', '已报道上诉裁判引用'],
  ['Case docket reference', '案件案卷引用'],
  ['Third-party or pro se filing', '第三方或自行诉讼文件'],
  ['Transcript or court notice', '庭审记录或法院通知'],
  ['Court order or judgment', '法院命令或判决'],
  ['Court filing', '法院文件'],
  ['court orders', '法院命令'],
  ['direct appeal', '直接上诉'],
  ['criminal forfeiture', '刑事没收'],
  ['bankruptcy estate', '破产财产'],
  ['asset recovery', '资产追回'],
  ['Fair Fund offset', '公平基金抵扣'],
  ['offset', '抵扣'],
  ['Guidelines range', '量刑指南区间'],
  ['Fatico hearing', 'Fatico 听证'],
  ['supervised release', '监督释放'],
  ['courtesy copy', '礼貌副本'],
  ['sensitive personal information', '敏感个人信息'],
  ['redaction-request window', '删节申请窗口'],
  ['public electronic release', '公开电子发布'],
  ['ancillary proceeding', '附属程序'],
  ['ancillary', '附属'],
  ['foundation', '基金会'],
  ['nominee ownership', '名义持有人所有权'],
  ['nominee', '名义持有人'],
  ['entity', '实体'],
  ['Investor claims', '投资人权利主张'],
  ['investor claims', '投资人权利主张'],
  ['SEC distribution', 'SEC 分配'],
  ['Criminal forfeiture offset', '刑事没收抵扣'],
  ['Digital asset claims', '数字资产权利主张'],
  ['Investor losses', '投资人损失'],
  ['Source verification', '来源核验'],
  ['Entity relationships', '实体关系'],
  ['Related organization watchlist', '关联组织观察线'],
  ['G-series related offering watchlist', 'G 系列相关发行观察线'],
  ['Asset-ownership and alter ego line', '资产所有权与人格混同线'],
  [
    'mandate denying the tandem pro se mandamus petitions, with the denial as to both docketing and consideration of the third-party forfeiture claims left without prejudice to renewal',
    '上诉法院正式命令驳回并行的自行诉讼强制令申请；关于登记和审理第三方没收权利主张的驳回不影响以后再次提出',
  ],
  ['pro se mandamus petitions', '自行诉讼强制令申请'],
  ['mandamus petitions', '强制令申请'],
  ['mandate', '上诉法院正式命令'],
  ['Pro se', '自行诉讼'],
  ['pro se', '自行诉讼'],
  ['seeking to compel', '请求命令'],
  ['district court', '地区法院'],
  ['property claims', '财产权利主张'],
  ['required by', '所要求'],
  ['proceeding', '程序'],
  ['third-party forfeiture claims', '第三方没收权利主张'],
  ['docketing', '登记入案'],
  ['petitions', '申请'],
  ['filings', '文件'],
  ['Second Circuit', '第二巡回上诉法院'],
  ['S.D.N.Y.', '纽约南区联邦法院'],
  ['Southern District of New York', '纽约南区联邦法院'],
  ['CourtListener / RECAP', 'CourtListener / RECAP 法院文件库'],
  ['CourtListener', 'CourtListener'],
  ['PACER', 'PACER 官方案卷系统'],
  ['docket of record', '正式案卷记录'],
  ['docket', '案卷'],
  ['court filing', '法院文件'],
  ['court order', '法院命令'],
  ['judgment', '判决'],
  ['sentencing transcript', '量刑庭审记录'],
  ['sentencing', '量刑'],
  ['notice of appeal', '上诉通知'],
  ['appeal', '上诉'],
  ['mandamus', '强制令申请'],
  ['pro se', '自行诉讼'],
  ['third-party', '第三方'],
  ['forfeiture', '没收'],
  ['money judgment', '金钱判决'],
  ['restitution', '赔偿令'],
  ['remission', '返还/减免程序'],
  ['bankruptcy', '破产'],
  ['alter ego', '人格混同'],
  ['estate property', '破产财产'],
  ['estate', '破产财产'],
  ['victim list', '受害者名单'],
  ['hearing', '听证'],
  ['transcript', '庭审/听证记录'],
  ['motion', '动议'],
  ['order', '命令'],
  ['petition', '申请'],
  ['claimants', '申请人'],
  ['claimant', '申请人'],
  ['consideration', '审理'],
  ['claims', '权利主张'],
  ['claim', '权利主张'],
  ['denying', '驳回'],
  ['granting', '准许'],
  ['denies', '驳回'],
  ['grants', '准许'],
  ['denied', '已驳回'],
  ['without prejudice', '不影响以后再提出'],
  ['with prejudice', '不得再次提出'],
  ['Government', '政府'],
  ['Judge Torres', 'Torres 法官'],
  ['Miles Guo', 'Miles Guo（郭文贵）'],
  ['Ho Wan Kwok', 'Ho Wan Kwok（何万国/郭文贵）'],
  ['Yvette Wang', 'Yvette Wang（王雁平）'],
  ['Yanping Wang', 'Yanping Wang（王雁平）'],
  ['William Je', 'William Je'],
  ['Kin Ming Je', 'Kin Ming Je'],
  ['GTV Media Group', 'GTV Media Group'],
  ['Saraca Media Group', 'Saraca Media Group'],
  ['Voice of Guo Media', 'Voice of Guo Media'],
  ['Fair Fund', '公平基金'],
  ['SEC', 'SEC'],
  ['DOJ', 'DOJ'],
  ['Official Agency', '官方机构'],
  ['Claims Agent', '索赔/案件代理'],
  ['Mirror', '公开文件镜像'],
]

const documentTitleExactZh = {
  '868': '文件 868：第二巡回发布正式命令，驳回并行自行诉讼强制令申请',
  '867': '文件 867：第三方自行诉讼强制令申请要求撤销定罪、量刑、没收并暂停程序',
  '866': '文件 866：法院有限解封 § 853 附属没收申请',
  '865': '文件 865：量刑庭审正式记录提交通知',
  '864': '文件 864：量刑庭审记录入档',
  '863': '文件 863：第三方自行诉讼申请人请求第二巡回命令地区法院登记其没收权利主张',
  '862': '文件 862：提交上诉通知',
  '861': '文件 861：Torres 法官命令密封含未删节敏感个人信息的 ECF 765',
  '860': '文件 860：对 Miles Guo 录入刑事判决',
  '859': '文件 859：补充初步没收令加入银行账户资产',
  '858': '文件 858：没收金钱判决从 13 亿美元降至 8.89 亿美元',
  '857': '文件 857：香港投资人请求第二巡回命令地区法院登记其 199.5 万美元附属没收权利主张',
  '855': '文件 855：法院驳回推迟 6 月 29 日量刑的请求',
  '854': '文件 854：法院驳回要求强制履行传票的动议',
  '853': '文件 853：辩方请求推迟 6 月 29 日量刑并列出六项未决问题',
  '852': '文件 852：第三方申请人请求第二巡回命令地区法院登记其 § 853(n) 财产权利主张',
  '851': '文件 851：第三方申请人请求登记其 5 月 22 日提交的 § 853(n) 没收权利申请',
  '850': '文件 850：第三方申请人请求第二巡回命令地区法院登记并处理其先前提交的文件',
  '849': '文件 849：第二巡回驳回多份要求地区法院登记和处理申请的自行诉讼强制令申请',
  '848': '文件 848：第三方申请人请求第二巡回命令地区法院登记 18 份文件并举行听证',
  '847': '文件 847：法院提交庭审记录的正式公开通知',
  '846': '文件 846：辩方对证人 Le Zhou 进行交叉询问的庭审记录',
  '844': '文件 844：投资人请求第二巡回命令地区法院登记其非受害者申请',
  '843': '文件 843：辩方向法院和政府提交全部 1,259 份支持者声明',
  '842': '文件 842：匿名受害者请求第二巡回取消量刑延期并命令地区法院推进程序',
  '841': '文件 841：1328777 B.C. Ltd. 就 600 万美元 Himalaya Coin 投资主张优先所有权',
  '840': '文件 840：律师代表 1328777 B.C. Ltd. 提交出庭通知',
  '839': '文件 839：法院命令将 1328777 B.C. Ltd. 列为案件利害关系人',
  '838': '文件 838：第三方申请人请求第二巡回命令地区法院登记并裁决其赔偿权利主张',
  '837': '文件 837：法院将量刑日期从 4 月 27 日延至 2026 年 6 月 29 日',
}

const legalTextZhCache = new Map()
const legalTextZhCacheLimit = 10000
const legalTextZhCacheMaxInput = 4096

export function translateLegalTextToZh(value) {
  if (!value || typeof value !== 'string') return value
  if (value.length <= legalTextZhCacheMaxInput) {
    const cached = legalTextZhCache.get(value)
    if (cached !== undefined) return cached
  }
  let text = value
  text = text.replace(/^Latest Doc\s+(\d+)$/i, '最新文件 $1')
  text = text.replace(/^Doc\s+(\d+):/i, '文件 $1：')
  text = text.replace(/^Doc\s+(\d+),/i, '文件 $1，')
  text = text.replace(/\bDoc\s+(\d+)\b/gi, '文件 $1')
  text = text.replace(
    /\b(January|February|March|April|May|June|July|August|September|Sept|Sep|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Oct|Nov|Dec)\.?\s+(\d{1,2}),\s+(20\d{2})\b/g,
    (_match, month, day, year) => `${year}年${monthZh[month]}${Number(day)}日`,
  )
  for (const [from, to] of phrasePairs) {
    text = text.replaceAll(from, to)
  }
  text = text.replace(/PACER 官方案卷系统\s+凭证/g, 'PACER 官方案卷系统凭证')
  text = text.replace(/\bNo\.\s*/g, '编号 ')
  text = text.replace(/PACER 官方案卷系统凭证/g, 'PACER 凭证')
  text = text.replace(/\s+/g, ' ').trim()
  if (value.length <= legalTextZhCacheMaxInput) {
    if (legalTextZhCache.size >= legalTextZhCacheLimit) {
      legalTextZhCache.delete(legalTextZhCache.keys().next().value)
    }
    legalTextZhCache.set(value, text)
  }
  return text
}

export function translateDocumentTitleToZh(file) {
  if (file.caseId === 'sdny-23-cr-118' && String(file.docNumber) === '264') {
    return '文件 264：控辩双方共同提交的拟议陪审团指示'
  }
  if (file.caseId === 'sdny-23-cr-118' && String(file.docNumber) === '869') {
    return '文件 869：Pillsbury Winthrop Shaw Pittman LLP 律师出庭登记'
  }
  if (file.caseId === 'scotus-26-194') {
    const supremeCourtTitles = {
      'respondent-waiver': '被申请人放弃答复权利书',
      'proof-of-service': '送达证明',
      petition: '调卷令申请书',
      'certificate-of-word-count': '字数合规证明',
    }
    if (supremeCourtTitles[file.docNumber]) return supremeCourtTitles[file.docNumber]
  }
  if (file.caseId === 'bkd-24-05249-aca' && String(file.docNumber) === '331') {
    return '文件 331：第 11 章受托人就第十七至二十一及第二十六项诉因提出简易判决动议'
  }
  if (file.caseId === 'bkd-24-05249-aca' && String(file.docNumber) === '331-1') {
    return '文件 331-1：支持受托人简易判决动议的经删节法律备忘录'
  }
  if (file.caseId === 'bkd-24-05249-aca' && String(file.docNumber) === '331-2') {
    return '文件 331-2：经删节的地方规则 56(a)(1) 无争议重大事实陈述'
  }
  if (file.caseId === 'bkd-24-05249-aca' && String(file.docNumber) === '192') {
    return '文件 192：被告对受托人修订起诉状的答辩、积极抗辩及陪审团审判请求'
  }
  if (file.docNumber && documentTitleExactZh[file.docNumber]) return documentTitleExactZh[file.docNumber]
  let text = translateLegalTextToZh(file.title)
  text = text.replace(/附件\s+附件/g, '附件')
  text = text.replace(/\s+the\s+/gi, ' ')
  text = text.replace(/\s+and\s+/gi, ' 和 ')
  text = text.replace(/\s+as\s+/gi, ' ')
  text = text.replace(/\s+of\s+/gi, ' ')
  text = text.replace(/\s{2,}/g, ' ').trim()
  return shouldUseGenericZh(text) ? genericDocumentTitleZh(file) : text
}

function genericDocumentTitleZh(file) {
  const number = file.docNumber ? `文件 ${file.docNumber}` : '案卷文件'
  const lower = `${file.title ?? ''} ${file.url ?? ''}`.toLowerCase()
  if (lower.includes('transcript')) return `${number}：庭审或听证记录`
  if (lower.includes('notice of appeal') || lower.includes('second circuit')) return `${number}：上诉相关文件`
  if (lower.includes('sentenc')) return `${number}：量刑相关文件`
  if (lower.includes('forfeiture') || lower.includes('853')) return `${number}：没收或第三方权利主张相关文件`
  if (lower.includes('judgment')) return `${number}：判决相关文件`
  if (lower.includes('motion')) return `${number}：动议相关文件`
  if (lower.includes('order')) return `${number}：法院命令或拟议命令`
  if (lower.includes('letter')) return `${number}：当事人信函`
  return `${number}：案卷文件`
}

export function translateEventFieldsToZh(event) {
  const exact = eventTranslations[event.id] ?? {}
  const title = exact.title ?? translateLegalTextToZh(event.title)
  const summary = exact.summary ?? translateLegalTextToZh(event.summary)
  const impact = exact.impact ?? translateLegalTextToZh(event.impact)
  const publicFeedPlaceholder = event.assertionType === 'Public RECAP feed metadata'
    && /\bdocket entry\s+\d+(?:-\d+)?$/i.test(String(event.summary ?? ''))
  return {
    title: exact.title || !shouldUseGenericZh(title) ? title : genericEventTitleZh(event),
    summary: publicFeedPlaceholder
      ? `CourtListener 公开 Feed 仅确认该案卷存在文件 ${event.filingNumber ?? '未编号'} 及其提交日期；Feed 未提供文件说明，必须打开原始来源或取得 PDF 后再判断内容和法律效果。`
      : exact.summary || !shouldUseGenericZh(summary) ? summary : genericEventSummaryZh(event),
    impact: exact.impact || !shouldUseGenericZh(impact) ? impact : genericEventImpactZh(event),
    category: categoryZh[event.category] ?? translateLegalTextToZh(event.category),
  }
}

function shouldUseGenericZh(value) {
  const latinWords = String(value ?? '').match(/\b[A-Za-z][A-Za-z-]{2,}\b/g) ?? []
  const legalAllowed = new Set([
    'Miles', 'Guo', 'Kwok', 'SEC', 'DOJ', 'GTV', 'PACER', 'RECAP', 'Fatico', 'Barclays', 'Banco', 'Popular',
    'Fair', 'Fund', 'ECF', 'SDNY', 'CIPA', 'Brady', 'Himalaya', 'Hamilton', 'Geyer', 'Torres', 'Yvette', 'Yanping',
    'Wang', 'William', 'Kin', 'Ming', 'Saraca', 'Media', 'Group', 'Voice', 'Post', 'Oak', 'Ltd', 'LLC', 'USA',
  ])
  const syntaxWords = new Set([
    'the', 'and', 'that', 'this', 'with', 'from', 'into', 'by', 'to', 'as', 'of', 'asks', 'asked', 'seeks', 'seeking', 'argues', 'filed',
    'submits', 'submitted', 'court', 'motion', 'order', 'petition', 'claim', 'claims', 'his', 'her', 'their', 'was',
    'were', 'but', 'for', 'not', 'formally', 'address', 'force', 'ignored', 'multiple', 'investor', 'petitioner',
    'response', 'notice', 'decision', 'defense', 'government', 'counsel', 'hearing', 'record', 'file', 'filing',
    'letter', 'memo', 'endorsement', 'request', 'charge', 'superseding', 'information', 'email', 'conversation',
    'sentencing', 'submission',
    'bank', 'records', 'document', 'declaration', 'deposition', 'subpoena', 'appearance', 'reply', 'opposition',
  ])
  const unexpected = latinWords.filter((word) => !legalAllowed.has(word))
  return unexpected.length >= 3 || unexpected.some((word) => syntaxWords.has(word.toLowerCase()))
}

function genericEventTitleZh(event) {
  const number = event.filingNumber ? `文件 ${event.filingNumber}` : '案卷更新'
  const category = categoryZh[event.category] ?? translateLegalTextToZh(event.category)
  const court = translateLegalTextToZh(event.court)
  if (event.category === 'Appeal') return `${number}：${court}上诉相关更新`
  if (event.category === 'Mandamus') return `${number}：强制令申请相关更新`
  if (event.category === 'Forfeiture') return `${number}：没收或第三方权利主张相关文件`
  if (event.category === 'Sentencing') return `${number}：量刑相关文件`
  if (event.category === 'Judgment') return `${number}：判决相关文件`
  if (event.category === 'Discovery') return `${number}：证据开示相关文件`
  if (event.category === 'Trial') return `${number}：审判相关文件`
  if (event.category === 'Order') return `${number}：法院命令`
  return `${number}：${category}更新`
}

function genericEventSummaryZh(event) {
  const category = categoryZh[event.category] ?? translateLegalTextToZh(event.category)
  const source = sourceTypeZh[event.sourceType] ?? translateLegalTextToZh(event.sourceType)
  const filing = event.filingNumber ? `文件号 ${event.filingNumber}` : '无文件号'
  return `该条目来自${source}，属于${category}类案卷更新（${filing}）。应打开原始来源核对日期、当事人立场和法院操作性文字。`
}

function genericEventImpactZh(event) {
  if (event.category === 'Appeal') return '上诉相关文件可能影响排期、争点、律师出庭和庭审记录准备。'
  if (event.category === 'Mandamus') return '强制令申请显示程序争议仍在持续，但法律效果取决于上诉法院是否给予救济。'
  if (event.category === 'Forfeiture') return '没收相关文件可能影响资产追回、第三方申请期限和返还/减免分析。'
  if (event.category === 'Sentencing') return '量刑材料可能影响上诉争点、损失计算、量刑理由和没收/赔偿框架。'
  if (event.category === 'Bankruptcy') return '破产相关文件可能影响资产所有权、破产财产和债权追回。'
  return '该更新需要结合原始文件和正式案卷记录后，才能用于重要结论。'
}

function translateArray(values) {
  return Array.isArray(values) ? values.map((item) => translateLegalTextToZh(item)) : values
}

function localizeEvent(event, lang) {
  if (lang === 'en') {
    return {
      ...event,
      sourceLabel: sourceShortNameForLanguage(event.sourceId, event.sourceLabel, 'en'),
    }
  }
  const translated = translateEventFieldsToZh(event)
  return {
    ...event,
    title: translated.title,
    summary: translated.summary,
    impact: translated.impact,
    category: translated.category,
    sourceType: sourceTypeZh[event.sourceType] ?? translateLegalTextToZh(event.sourceType),
    sourceLabel: sourceShortNameForLanguage(event.sourceId, event.sourceLabel, 'zh'),
    assertionType: assertionTypeZh(event.assertionType),
    tags: translateArray(event.tags),
  }
}

function assertionTypeZh(value) {
  const exact = {
    'Government filing': '检方文件',
    'Party filing': '当事人文件',
    'Docket entry': '案卷条目',
    'RECAP docket entry': 'RECAP 案卷条目',
    'Public RECAP feed metadata': '公开 RECAP Feed 元数据',
    'Secondary news report': '新闻媒体辅助报道',
    'Official court docket entry': '法院官方案卷条目',
  }
  return exact[value] ?? translateLegalTextToZh(value)
}

function localizeCase(caseRecord, lang) {
  if (lang === 'en') {
    return {
      ...caseRecord,
      ...(caseEnglishOverrides[caseRecord.id] ?? {}),
      latestEvent: caseRecord.latestEvent ? localizeEvent(caseRecord.latestEvent, lang) : caseRecord.latestEvent,
      latestRelatedEvent: caseRecord.latestRelatedEvent ? localizeEvent(caseRecord.latestRelatedEvent, lang) : caseRecord.latestRelatedEvent,
    }
  }
  const exact = caseTranslations[caseRecord.id] ?? generatedCaseTranslation(caseRecord)
  return {
    ...caseRecord,
    ...exact,
    title: exact.title ?? translateLegalTextToZh(caseRecord.title),
    shortTitle: exact.shortTitle ?? translateLegalTextToZh(caseRecord.shortTitle),
    kind: exact.kind ?? translateLegalTextToZh(caseRecord.kind),
    status: exact.status ?? translateLegalTextToZh(caseRecord.status),
    lastKnownFiling: exact.lastKnownFiling ?? localizedPublicRecapObservation(caseRecord.lastKnownFiling),
    stage: exact.stage ?? translateLegalTextToZh(caseRecord.stage),
    focus: exact.focus ?? translateLegalTextToZh(caseRecord.focus),
    watchQuestions: exact.watchQuestions ?? translateArray(caseRecord.watchQuestions),
    latestEvent: caseRecord.latestEvent ? localizeEvent(caseRecord.latestEvent, lang) : caseRecord.latestEvent,
    sourceStatuses: Array.isArray(caseRecord.sourceStatuses) ? caseRecord.sourceStatuses.map((status) => localizeStatus(status, lang)) : caseRecord.sourceStatuses,
  }
}

function generatedCaseTranslation(caseRecord) {
  const withdrawalMatch = String(caseRecord.id ?? '').match(/^dconn-26-mc-(\d{5})$/)
  if (withdrawalMatch) {
    return {
      title: `In Re: Ho Wan Kwok 撤回破产移送程序 ${caseRecord.docket}`,
      shortTitle: `撤回移送 ${caseRecord.docket}`,
      kind: '破产 / 地区法院',
      status: '独立跟踪的撤回破产移送程序',
      lastKnownFiling: '需要实时案卷刷新',
      stage: '该地区法院杂项程序涉及是否从破产法院撤回移送；每个案卷都需要独立审计。',
      focus: '撤回移送书状、各方立场、法官分案、程序处理，以及对底层受托人诉讼的影响。',
      watchQuestions: ['确认该杂项案对应的底层破产对抗程序及当事人。', '法院是否准许、驳回、合并、移送或行政结案该请求。'],
    }
  }

  const trusteeTranslations = {
    'bkd-24-05021-bannon': ['Despins 诉 Bannon Strategic Advisors, Inc.', 'Bannon Strategic Advisors 受托人案'],
    'bkd-24-05249-aca': ['Despins 诉 ACA Capital Group Ltd.', 'ACA Capital 受托人案'],
    'bkd-24-05246-wa-hf': ['Despins 诉 WA & HF LLC', 'WA & HF 受托人案'],
    'bkd-24-05006-aws': ['Despins 诉 Amazon Web Services, Inc.', 'Amazon Web Services 受托人案'],
    'bkd-24-05057-amazon': ['Despins 诉 Amazon.com, Inc.', 'Amazon.com 受托人案'],
  }
  if (trusteeTranslations[caseRecord.id]) {
    const [title, shortTitle] = trusteeTranslations[caseRecord.id]
    return {
      title,
      shortTitle,
      kind: '破产对抗程序',
      status: '与 Ho Wan Kwok 破产财产有关的受托人对抗程序',
      lastKnownFiling: localizedPublicRecapObservation(caseRecord.lastKnownFiling),
      stage: '该程序属于受托人资产追回诉讼；案名和破产母案能证明程序关系，但不等于已证明被告公司由 Ho Wan Kwok 所有或控制。',
      focus: '受托人权利主张、被告抗辩、证据开示、和解或裁判，以及对破产财产追回的影响。',
      watchQuestions: ['后续命令、判决、和解或上诉是否改变破产财产追回结果。', '区分诉状中的主张与法院已经裁判的事实和法律结论。'],
    }
  }

  if (caseRecord.id === 'ca2-26-563-dx') {
    return {
      title: 'In re DX：源自美国诉 Ho Wan Kwok 刑事案的关联程序',
      shortTitle: 'In re DX 关联程序',
      kind: '上诉 / 附属程序',
      status: '有公开文件和上诉法院正式命令活动的第二巡回关联程序',
      lastKnownFiling: '公开 RECAP Feed 观测至 2026-08-06',
      stage: '该附属上诉程序涉及源自刑事案的记录形成及冻结或未完成事项。',
      focus: '上诉记录形成、第三方或自行诉讼请求，以及与刑事主案案卷的关系。',
      watchQuestions: ['各项请求寻求什么救济，哪些命令或上诉法院正式命令已经处理。', '公开版本与密封版本是否存在实质差异。'],
    }
  }
  return {}
}

function localizedPublicRecapObservation(value) {
  const text = String(value ?? '')
  const match = text.match(/^Public RECAP feed observed through (\d{4}-\d{2}-\d{2})$/i)
  return match ? `公开 RECAP Feed 观测至 ${match[1]}` : translateLegalTextToZh(text)
}

export function translateCaseFieldsToZh(caseRecord) {
  return localizeCase(caseRecord, 'zh')
}

export function translateCaseFieldsToEn(caseRecord) {
  return localizeCase(caseRecord, 'en')
}

export function sourceShortNameForLanguage(sourceId, fallback, lang = 'en') {
  if (lang === 'en') return sourceEnglishOverrides[sourceId]?.shortName ?? fallback
  return sourceTranslations[sourceId]?.shortName ?? translateLegalTextToZh(fallback)
}

function localizeEntity(entity, lang) {
  if (lang === 'en') {
    if (entity.id === 'ho-wan-kwok') return { ...entity, name: 'Ho Wan Kwok / Miles Guo' }
    return entity
  }
  const exact = entityTranslations[entity.id] ?? {}
  return {
    ...entity,
    ...exact,
    name: exact.name ?? translateLegalTextToZh(entity.name),
    role: exact.role ?? translateLegalTextToZh(entity.role),
    riskAreas: exact.riskAreas ?? translateArray(entity.riskAreas),
    notes: exact.notes ?? translateLegalTextToZh(entity.notes),
  }
}

export function translateEntityFieldsToEn(entity) {
  return localizeEntity(entity, 'en')
}

function localizeSource(source, lang) {
  if (lang === 'en') return { ...source, ...(sourceEnglishOverrides[source.id] ?? {}) }
  const exact = sourceTranslations[source.id] ?? {}
  return {
    ...source,
    ...exact,
    type: sourceTypeZh[source.type] ?? source.type,
  }
}

function localizePolicy(policy, lang) {
  if (lang === 'en') return policy
  const exact = policyTranslations[policy.id] ?? {}
  return {
    ...policy,
    ...exact,
    relevance: exact.relevance ?? translateLegalTextToZh(policy.relevance),
    posture: exact.posture ?? translateLegalTextToZh(policy.posture),
    monitorTerms: exact.monitorTerms ?? translateArray(policy.monitorTerms),
  }
}

function localizeStatus(status, lang) {
  if (lang === 'en') return status
  return {
    ...status,
    message: statusMessageZh[status.message] ?? localizedMirrorTimelineStatus(status.message) ?? localizedPublicRecapStatus(status.message) ?? localizedOfficialStatus(status.message) ?? translateLegalTextToZh(status.message),
    facts: (status.facts ?? []).map((fact) => ({
      ...fact,
      label: statusFactZh(fact.label),
      value: statusFactZh(fact.value),
      detail: statusFactZh(fact.detail),
    })),
    lastAttempt: status.lastAttempt ? {
      ...status.lastAttempt,
      message: statusMessageZh[status.lastAttempt.message]
        ?? localizedMirrorTimelineStatus(status.lastAttempt.message)
        ?? localizedPublicRecapStatus(status.lastAttempt.message)
        ?? localizedOfficialStatus(status.lastAttempt.message)
        ?? translateLegalTextToZh(status.lastAttempt.message),
      facts: (status.lastAttempt.facts ?? []).map((fact) => ({
        ...fact,
        label: statusFactZh(fact.label),
        value: statusFactZh(fact.value),
        detail: statusFactZh(fact.detail),
      })),
    } : status.lastAttempt,
  }
}

function statusFactZh(value) {
  const text = String(value ?? '')
  const recentEntries = text.match(/^(\d+) recent entries$/)
  if (recentEntries) return `${recentEntries[1]} 条近期记录`
  const recapDetail = text.match(/^Latest observed (20\d{2}-\d{2}-\d{2})\. Public feed metadata only; use PACER or an available RECAP PDF for the filing itself\.$/)
  if (recapDetail) return `最近观测日期：${recapDetail[1]}。这里只提供公开 Feed 元数据；文件内容必须用 PACER 或可用的 RECAP PDF 核验。`
  const withdrawalLabel = text.match(/^D\. Conn\. withdrawal proceeding (3:26-mc-\d{5})$/)
  if (withdrawalLabel) return `康州地区法院撤回破产移送程序 ${withdrawalLabel[1]}`
  const exact = {
    'Official docket of record': '正式案卷来源',
    'credentials missing': '凭证缺失',
    'credentials detected': '已检测到凭证',
    'PACER integration should require explicit fee and rate controls.': 'PACER 接入必须具备明确的费用和频率控制。',
    Credential: '凭证',
    missing: '缺失',
    'CourtListener REST API requires authentication.': 'CourtListener REST API 需要身份验证。',
    'Second Circuit mandate denying the tandem pro se mandamus petitions, with the denial as to both docketing and consideration of the third-party forfeiture claims left without prejudice to renewal.': '第二巡回上诉法院驳回并行的自行诉讼强制令申请；关于登记和审理第三方没收权利主张的驳回不影响以后再次提出。',
    'Pro se third-party mandamus petition to the Second Circuit seeking vacatur of the conviction, sentencing, and forfeiture orders, an evidentiary hearing on the Government’s 225-name victim list, and a stay of all forfeiture proceedings.': '第三方自行诉讼申请人向第二巡回申请强制令，请求撤销定罪、量刑和没收命令，就政府列出的 225 名受害者举行证据听证，并暂停所有没收程序。',
    'Order granting limited unsealing of the § 853 ancillary petitions, solely so the Government may obtain unredacted copies from the Clerk of the Court.': '法院准许有限解封 § 853 附属申请，目的仅限于让政府从法院书记员处取得未删节副本。',
    'First dollar amount detected on the Fair Fund page.': '在 Fair Fund 页面上检出的第一个美元金额。',
    'Static page loaded; full docket extraction needs JSON endpoint mapping.': '静态页面已加载；完整案卷提取仍需映射 JSON 端点。',
    'S.D.N.Y. criminal case': '纽约南区刑事主案',
    'Second Circuit direct criminal appeal': '第二巡回刑事直接上诉',
    'S.D.N.Y. SEC civil case': '纽约南区 SEC 民事案',
    'D. Conn. bankruptcy case': '康州破产主案',
    'D. Conn. bankruptcy adversary proceeding': '康州破产对抗程序',
    'Second Circuit asset appeal': '第二巡回资产上诉',
    'E.D.N.Y. Section 1782 related proceeding': '纽约东区 § 1782 关联程序',
    'feed error': 'Feed 错误',
    Case: '案件',
    'No. 26-194': '第 26-194 号',
    'Latest official docket action': '最新官方案卷动作',
    'Court-hosted PDFs': '法院托管 PDF',
    'Files are collected directly from the official Supreme Court docket.': '文件直接采集自美国最高法院官方案卷。',
    'Register number': '登记编号',
    'Current facility': '当前指定机构',
    'Projected release field': '预计释放日期字段',
    'A projected date can change and is not a guarantee of actual release.': '预计日期可能变化，不构成实际释放日期保证。',
    'Facility code DAN. This is the current public designation, not a transfer-history record.': '机构代码 DAN。这是当前公开指定机构，不是转监历史记录。',
  }
  return exact[text] ?? translateLegalTextToZh(text)
}

export function localizeSourceStatus(status, lang) {
  return localizeStatus(status, lang === 'en' ? 'en' : 'zh')
}

function localizeAnalysis(analysis, lang) {
  if (!analysis || lang === 'en') return analysis
  return {
    ...analysis,
    mode: translateLegalTextToZh(analysis.mode),
    whatChanged: translateArray(analysis.whatChanged),
    whyItMatters: translateArray(analysis.whyItMatters),
    proceduralStatus: translateArray(analysis.proceduralStatus),
    riskFlags: translateArray(analysis.riskFlags),
    followUps: translateArray(analysis.followUps),
    evidence: analysis.evidence.map((item) => ({
      ...item,
      label: translateLegalTextToZh(item.label),
      sourceType: sourceTypeZh[item.sourceType] ?? translateLegalTextToZh(item.sourceType),
    })),
  }
}

function localizePortfolio(portfolio, lang) {
  if (lang === 'en') {
    return {
      ...portfolio,
      recentCritical: (portfolio.recentCritical ?? []).map((event) => localizeEvent(event, 'en')),
    }
  }
  return {
    ...portfolio,
    latestSignal: translateLegalTextToZh(portfolio.latestSignal),
    thesis: '当前核心不是单一新闻更新，而是四条法律主线的交叉：刑事直接上诉、刑事没收与 § 853(n)、SEC/GTV Fair Fund 抵扣、康州破产财产追回。',
    priorityRisks: [
      '把镜像 PDF 或支持者叙事当成法院正式案卷会导致误判。',
      '第三方和自行诉讼申请必须与正式法院命令区分，尤其是在没收附属程序阶段。',
      '家族基金、信托、基金会和名义持有人所有权线索，只有绑定到可引用案卷文件后才能进入事实层。',
      'SEC/Fair Fund、刑事没收和破产财产三套资金追回机制可能互相抵扣、冲突或协调。',
    ],
    sourceGaps: translateArray(portfolio.sourceGaps),
    openLoops: portfolio.openLoops.map((loop) => ({
      ...loop,
      caseTitle: translateLegalTextToZh(loop.caseTitle),
      question: translateLegalTextToZh(loop.question),
    })),
  }
}

export function localizeDocumentManifest(manifest, lang) {
  if (lang === 'en') {
    return {
      ...manifest,
      root: manifest.root ? 'Managed local court-file library' : '',
      sourcePages: (manifest.sourcePages ?? []).map((page) => ({
        ...page,
        label: englishManifestText(page.label, 'Public source page'),
        error: englishManifestText(page.error, ''),
        limitation: englishManifestText(page.limitation, ''),
        court: englishManifestText(page.court, 'Court'),
      })),
      credentialRequired: (manifest.credentialRequired ?? []).map((item) => ({
        ...item,
        reason: englishManifestText(item.reason, 'Credentials or an additional source adapter are required.'),
      })),
      sampleFiles: (manifest.sampleFiles ?? []).map(localizeManifestFileToEnglish),
      errorFiles: (manifest.errorFiles ?? []).map(localizeManifestFileToEnglish),
    }
  }
  return {
    ...manifest,
    root: manifest.root ? '受管理的本地法院文件库' : '',
    sourcePages: (manifest.sourcePages ?? []).map((page) => ({
      ...page,
      label: manifestSourcePageLabelZh(page),
      error: manifestErrorToZh(page.error),
      limitation: manifestTextToZh(page.limitation),
      court: manifestCourtToZh(page.court),
    })),
    credentialRequired: (manifest.credentialRequired ?? []).map((item) => ({
      ...item,
      reason: manifestReasonToZh(item.reason),
    })),
    sampleFiles: (manifest.sampleFiles ?? []).map((file) => ({
      ...file,
      title: manifestFileTitleZh(file),
      variantLabel: documentVariantLabel(file, 'zh'),
      sourceLabel: documentSourceLabelZh(file.sourceId, file.sourceLabel),
      error: manifestErrorToZh(file.error),
    })),
    errorFiles: (manifest.errorFiles ?? []).map((file) => ({
      ...file,
      title: manifestFileTitleZh(file),
      variantLabel: documentVariantLabel(file, 'zh'),
      sourceLabel: documentSourceLabelZh(file.sourceId, file.sourceLabel),
      error: manifestErrorToZh(file.error),
    })),
  }
}

function manifestSourcePageLabelZh(page) {
  const labels = {
    pacer: 'PACER 正式案卷来源',
    'courtlistener-recap': 'CourtListener / RECAP 公开案卷来源',
    'nfsc-criminal-mirror': 'NFSC 刑事案卷备用镜像',
    'doj-victim-page': 'DOJ 官方受害者信息页',
    'sec-press-2023-50': 'SEC 官方民事执法来源',
    'gtv-fair-fund': 'GTV Fair Fund 案件管理来源',
    'epiq-kwok-trustee': 'Epiq 破产案卷来源',
    'himalaya-restoration': 'Himalaya Restoration 当前公开项目网站',
    'himalaya-restoration-archive': 'Himalaya Restoration 历史公开存档',
    'supreme-court-docket': '美国最高法院第 26-194 号正式案卷',
  }
  return labels[page?.sourceId] ?? translateLegalTextToZh(page?.label)
}

function manifestFileTitleZh(file) {
  const translated = translateDocumentTitleToZh(file)
  if (hasCjkText(translated)) return translated
  const number = String(file?.docNumber ?? '').trim()
  if (number && /^(?:ecf-)?[\w.-]+(?:\.pdf)?$/iu.test(String(file?.title ?? '').trim())) {
    return `文件 ${number}：来源 PDF 文件`
  }
  return number ? `文件 ${number}：案卷文件` : '案卷文件'
}

function manifestErrorToZh(value) {
  const text = String(value ?? '').trim()
  if (!text) return text
  const exact = {
    'The archived project page linked this PDF, but Internet Archive currently has no application/pdf snapshot for the linked URL.': '历史项目页面曾链接该 PDF，但 Internet Archive 当前没有对应链接的 PDF 存档快照。',
    'Internet Archive returned a truncated PDF capture; the incomplete payload was rejected.': 'Internet Archive 返回的 PDF 存档不完整，程序已拒绝保存截断文件。',
    'Document source URL is outside the application network policy.': '文件来源网址不符合程序网络访问策略。',
  }
  const http = text.match(/^HTTP\s+(\d{3})$/iu)
  if (http) return `下载失败：来源服务器返回 HTTP ${http[1]}。`
  const paused = text.match(/^CourtListener public search is paused until (.+) after HTTP 429\.$/u)
  if (paused) return `CourtListener 公开搜索因 HTTP 429 限流暂停至 ${paused[1]}。`
  return exact[text] ?? translateLegalTextToZh(text)
}

function manifestReasonToZh(value) {
  const text = String(value ?? '').trim()
  const exact = {
    'Full district, bankruptcy, and appellate dockets require PACER credentials and fee-aware retrieval.': '完整的地区法院、破产法院和上诉法院正式记录需要 PACER 凭证，并应采用费用感知抓取。',
    'The Epiq docket shell is public, but full document extraction requires mapping its JSON document endpoint.': 'Epiq 案卷页面公开可访问，但完整文件提取仍需完成其 JSON 文件端点映射。',
  }
  return exact[text] ?? translateLegalTextToZh(text)
}

function manifestTextToZh(value) {
  const text = String(value ?? '').trim()
  const exact = {
    'Docket coordinates establish the public RECAP counterpart. Chinese project translations remain distinct variants unless hashes independently match.': '案卷坐标可确认对应的公开 RECAP 文件；除非哈希值独立匹配，否则项目中文翻译仍按不同版本处理。',
  }
  return exact[text] ?? translateLegalTextToZh(text)
}

function manifestCourtToZh(value) {
  return String(value ?? '') === 'Supreme Court of the United States' ? '美国最高法院' : translateLegalTextToZh(value)
}

const auditStatusZh = {
  partial_verified: '部分核验',
  partial: '部分覆盖',
  metadata_only: '仅元数据',
  public_pdf_missing_local: '公开 PDF 未落地',
  download_error: '下载错误',
  not_observed: '当前未观测到',
  blocked: '受限',
}

const auditClassificationZh = {
  tracked: '已跟踪',
  direct_candidate: '高相关搜索线索',
  related_candidate: '一般相关搜索线索',
  likely_false_match: '可能误匹配',
}

const auditTextZh = new Map([
  ['Only recent public-feed metadata is available; full historical docket pagination and PACER record-of-docket verification are unavailable.', '当前只有近期公开 Feed 元数据；无法进行完整历史案卷分页，也无法用 PACER 正式案卷记录完成核验。'],
  ['The local library contains no PACER or RECAP court-record PDFs.', '本地资料库目前没有 PACER 或 RECAP 法院记录 PDF。'],
  ['Publicly observed RECAP material is partially reconciled, but PACER, sealed, restricted, removed, and unknown records prevent an absolute completeness claim.', '公开观测到的 RECAP 材料已完成部分核对，但 PACER、密封、受限、已移除及未知记录使本程序无法作出绝对完整声明。'],
  ['Every court docket is audited independently by court, docket number, and CourtListener docket ID.', '每宗法院案卷均按法院、案号和 CourtListener 案卷 ID 独立审计。'],
  ['Only entries actually observed in PACER/RECAP/official or claims-agent sources are compared; numeric gaps are not inferred from 1 through the highest filing number.', '只比较在 PACER、RECAP、官方来源或案件管理机构来源中实际观测到的条目；不会把 1 到最大文件号之间的数字空缺推定为缺失文件。'],
  ['Text-only entries, sealed or restricted records, attachments, unavailable PACER material, and public PDFs missing locally are reported separately.', '纯文本条目、密封或受限记录、附件、无法取得的 PACER 材料，以及公开但本地缺失的 PDF 均分开报告。'],
  ['A large mirror-file count never proves docket completeness or official-record coverage.', '大量镜像文件绝不等于案卷完整，也不能证明正式记录覆盖。'],
  ['Search results are discovery leads. A candidate is not promoted into the tracked registry until its docket number, caption, court, parties, and relationship evidence are reviewed.', '搜索结果仅是发现线索。候选案卷只有在案号、案名、法院、当事人和关联证据经过核验后，才会升级进入正式跟踪注册表。'],
  ['PACER is the docket of record. This build does not log in, incur fees, or bypass authentication.', 'PACER 是正式案卷记录来源。本版本不会登录 PACER、产生费用或绕过身份验证。'],
  ['No-token public Atom feeds provide recent metadata only and cannot prove full historical coverage or expose every PDF.', '无 Token 的公开 Atom Feed 只提供近期元数据，不能证明完整历史覆盖，也不会暴露每一份 PDF。'],
  ['No-token public Atom feeds and structured search provide recent metadata and the currently surfaced public PDFs. Search result windows are limited and cannot prove full historical coverage.', '无 Token 的公开 Atom Feed 和结构化搜索可提供近期元数据及当前搜索窗口公开的 PDF；搜索结果窗口有限，不能证明完整历史覆盖。'],
  ['Public-feed metadata and no-token structured RECAP search have been reconciled locally, but full historical pagination and PACER record-of-docket verification remain unavailable.', '公开 Feed 元数据和无 Token 的 RECAP 结构化搜索结果已与本地资料核对，但仍无法完成完整历史分页和 PACER 正式案卷核验。'],
  ['Token-enhanced RECAP pagination and available-PDF discovery were used; RECAP can still be incomplete when PACER users have not uploaded a filing.', '已使用 Token 增强的 RECAP 分页和可用 PDF 发现；如果 PACER 用户没有上传某份文件，RECAP 仍可能不完整。'],
  ['Sealed, restricted, non-electronic, removed, or unknown records cannot be proven absent from public sources.', '无法仅凭公开来源证明密封、受限、非电子化、已移除或未知记录不存在。'],
  ['Epiq project HTT is confirmed for bankruptcy 22-50073; row-level JSON extraction remains unverified until its public request contract is stable.', '已确认 Epiq 的 HTT 项目对应破产案 22-50073；在公开请求契约稳定前，逐行 JSON 提取仍未完成核验。'],
])

function auditTextToZh(value) {
  const text = String(value ?? '')
  const recapMissing = text.match(/^(\d+) RECAP-available PDF\(s\) are not present in the local manifest\.$/)
  if (recapMissing) return `有 ${recapMissing[1]} 份 RECAP 可用 PDF 尚未写入本地 manifest。`
  return auditTextZh.get(text) ?? translateLegalTextToZh(text)
}

function localizeAuditDocket(docket, lang) {
  if (lang === 'en') return docket
  return {
    ...docket,
    caseTitle: translateLegalTextToZh(docket.caseTitle),
    label: translateLegalTextToZh(docket.label),
    court: translateLegalTextToZh(docket.court),
    statusLabel: auditStatusZh[docket.status] ?? docket.status,
    limitations: (docket.limitations ?? []).map(auditTextToZh),
    gaps: (docket.gaps ?? []).map((gap) => ({
      ...gap,
      label: translateLegalTextToZh(gap.label),
      reason: auditTextToZh(gap.reason),
    })),
  }
}

function localizeAuditCandidate(candidate, lang) {
  if (lang === 'en') return candidate
  return {
    ...candidate,
    title: translateLegalTextToZh(candidate.title),
    court: translateLegalTextToZh(candidate.court),
    summary: translateLegalTextToZh(candidate.summary),
    reason: auditTextToZh(candidate.reason),
    classificationLabel: auditClassificationZh[candidate.classification] ?? candidate.classification,
    relationshipSignals: (candidate.relationshipSignals ?? []).map(translateLegalTextToZh),
  }
}

export function localizeCompletenessAudit(audit, lang) {
  if (!audit || lang === 'en') return audit
  return {
    ...audit,
    verdictLabel: audit.verdict === 'not_proven_complete' ? '不能证明完整' : audit.verdict,
    verdictReason: auditTextToZh(audit.verdictReason),
    methodology: (audit.methodology ?? []).map(auditTextToZh),
    accessBoundaries: Object.fromEntries(Object.entries(audit.accessBoundaries ?? {}).map(([key, value]) => [key, auditTextToZh(value)])),
    dockets: (audit.dockets ?? []).map((docket) => localizeAuditDocket(docket, lang)),
    discovery: audit.discovery ? {
      ...audit.discovery,
      failures: (audit.discovery.failures ?? []).map(auditTextToZh),
      candidates: (audit.discovery.candidates ?? []).map((candidate) => localizeAuditCandidate(candidate, lang)),
      excludedLikelyFalseMatches: (audit.discovery.excludedLikelyFalseMatches ?? []).map((candidate) => localizeAuditCandidate(candidate, lang)),
    } : audit.discovery,
    errors: (audit.errors ?? []).map(auditTextToZh),
  }
}

const relationshipStatusZh = {
  verified_public_relation: '已核实的公开关系',
  probable_relation: '较可能的关系',
  pending_manual_review: '待人工核验',
  excluded: '已排除',
}

const relationshipAuditTextZh = new Map([
  ['The audit classifies public captions, party records, docket metadata, and local manifest source links; it does not infer ownership from a name alone.', '本审计按公开案名、当事人记录、案卷元数据和本地 manifest 来源链接进行分类；不会仅凭姓名推断所有权。'],
  ['PACER is the record of docket. CourtListener/RECAP is treated as the primary no-fee public substitute when a filing is mirrored; NFSC is a backup mirror only.', 'PACER 是正式案卷来源。文件已被镜像时，CourtListener/RECAP 作为主要免费公开替代来源；NFSC 只作为备用镜像。'],
  ['Trustee recovery is a procedural relation. It is deliberately separated from proof that a defendant company was owned or controlled by Ho Wan Kwok.', '受托人资产追回是程序性关系。本程序会刻意把它与“被告公司由 Ho Wan Kwok 拥有或控制”的证明分开。'],
  ['A relation is eligible for formal tracking only when the public record supports the stated relation; asset, entity, family, and weak leads retain manual-review status.', '只有公开记录支持所标注的关系时，该关系才适合进入正式跟踪；资产、实体、家族和弱线索仍保留人工核验状态。'],
  ['PACER access, fees, credentials, sealed materials, and non-public records are outside this local audit.', 'PACER 访问权限、费用、凭证、密封材料和非公开记录不在本地审计可覆盖范围内。'],
  ['RECAP is a public mirror and may not contain filings that no PACER user has contributed.', 'RECAP 是公开镜像，可能不包含尚未由 PACER 用户贡献的文件。'],
  ['NFSC is a backup mirror. A matching file must be compared with an official or RECAP source before it is treated as corroborated.', 'NFSC 是备用镜像。匹配文件必须先与官方来源或 RECAP 对照，才能作为已佐证材料引用。'],
  ['Public captions and party lists show procedural identity, not beneficial ownership, control, alter ego, or liability.', '公开案名和当事人列表显示的是程序身份，不证明受益所有权、控制关系、人格混同或法律责任。'],
  ['Verify the docket header, court, complete party list, and operative pleading or order before upgrading this lead.', '升级该线索前，核对案卷首页、法院、完整当事人列表以及起控制作用的诉状或裁定。'],
  ['Locate the court finding, sworn declaration, title record, or transaction evidence that supports the specific ownership or control proposition.', '针对具体所有权或控制命题，查找法院认定、宣誓声明、产权记录或交易证据。'],
  ['Confirm whether the named individual is a party, officer, claimant, witness, or merely mentioned in the filing.', '确认被点名个人是当事人、高管、申请人、证人，还是仅在文件中被提及。'],
  ['Read the trustee complaint and later dispositive orders separately; a trustee allegation is not a court finding.', '分别阅读受托人起诉状和后续实体性裁定；受托人主张不是法院认定。'],
  ['Compare the mirror PDF with CourtListener/RECAP or PACER and record any hash or text discrepancy.', '将镜像 PDF 与 CourtListener/RECAP 或 PACER 对照，并记录哈希或文本差异。'],
])

function relationshipAuditTextToZh(value) {
  const text = String(value ?? '')
  return relationshipAuditTextZh.get(text) ?? translateLegalTextToZh(text)
}

function localizeRelationshipEvidence(evidence, lang) {
  if (lang === 'en') return evidence
  return (evidence ?? []).map((item) => ({
    ...item,
    label: item.labelZh ?? translateLegalTextToZh(item.labelEn),
    description: item.descriptionZh ?? translateLegalTextToZh(item.descriptionEn),
  }))
}

function englishRelationshipEvidence(evidence) {
  return (evidence ?? []).map((item) => {
    const { labelZh: _labelZh, descriptionZh: _descriptionZh, ...englishEvidence } = item
    return englishEvidence
  })
}

function englishRelationshipDocket(item) {
  const { relationship, evidence, ...docket } = item
  const { controlWarningZh: _controlWarningZh, evidence: relationshipEvidence, ...englishRelationship } = relationship ?? {}
  return {
    ...docket,
    relationship: {
      ...englishRelationship,
      evidence: englishRelationshipEvidence(relationshipEvidence),
    },
    evidence: englishRelationshipEvidence(evidence),
  }
}

function localizeRelationshipDocket(item, lang) {
  if (lang === 'en') return item
  const relationshipDefinition = relationshipTypeDefinition(item.relationship?.primaryType)
  return {
    ...item,
    caption: translateLegalTextToZh(item.caption),
    court: translateLegalTextToZh(item.court),
    relationship: {
      ...item.relationship,
      label: relationshipDefinition.labelZh,
      statusLabel: relationshipStatusZh[item.relationship?.status] ?? item.relationship?.status,
      controlWarning: item.relationship?.controlWarningZh ?? translateLegalTextToZh(item.relationship?.controlWarningEn),
      signals: (item.relationship?.signals ?? []).map((signal) => translateLegalTextToZh(signal)),
      evidence: localizeRelationshipEvidence(item.relationship?.evidence, lang),
    },
	    evidence: localizeRelationshipEvidence(item.evidence, lang),
	    verificationTasks: (item.verificationTasks ?? []).map((task) => relationshipAuditTextToZh(task)),
	  }
}

export function localizeRelationshipAudit(audit, lang) {
  if (!audit) return audit
  if (lang === 'en') {
    return {
      ...audit,
      relationTypes: Object.fromEntries(Object.entries(audit.relationTypes ?? {}).map(([key, definition]) => {
        const { labelZh: _labelZh, descriptionZh: _descriptionZh, ...englishDefinition } = definition
        return [key, englishDefinition]
      })),
      dockets: (audit.dockets ?? []).map(englishRelationshipDocket),
      pendingReview: (audit.pendingReview ?? []).map(englishRelationshipDocket),
      excluded: (audit.excluded ?? []).map(englishRelationshipDocket),
    }
  }
  return {
    ...audit,
    methodology: (audit.methodology ?? []).map((item) => relationshipAuditTextToZh(item)),
    sourceLimitations: Object.fromEntries(Object.entries(audit.sourceLimitations ?? {}).map(([key, value]) => [key, relationshipAuditTextToZh(value)])),
    relationTypes: Object.fromEntries(Object.entries(audit.relationTypes ?? {}).map(([key, definition]) => [key, {
      ...definition,
      label: definition.labelZh ?? relationshipTypeDefinition(key).labelZh,
      description: definition.descriptionZh ?? relationshipTypeDefinition(key).descriptionZh,
    }])),
    dockets: (audit.dockets ?? []).map((item) => localizeRelationshipDocket(item, lang)),
    pendingReview: (audit.pendingReview ?? []).map((item) => localizeRelationshipDocket(item, lang)),
    excluded: (audit.excluded ?? []).map((item) => localizeRelationshipDocket(item, lang)),
  }
}

function localizeManifestFileToEnglish(file, index) {
  const title = String(file.title ?? '').trim()
  return {
    ...file,
    title: hasCjkText(title)
      ? file.docNumber ? `Document ${file.docNumber} (Chinese-language copy)` : `Source-language court file ${index + 1}`
      : title || (file.docNumber ? `Document ${file.docNumber}` : `Court file ${index + 1}`),
    variantLabel: documentVariantLabel(file, 'en'),
    sourceLabel: englishManifestSourceLabel(file.sourceId, file.sourceLabel),
    localPath: file.localPath ? englishLocalFilename(String(file.localPath).split('/').at(-1)) : '',
    error: englishManifestText(file.error, file.status === 'error' ? 'Download failed.' : ''),
  }
}

function englishLocalFilename(value) {
  return String(value ?? '')
    .replace(/中文翻译仅供参考/gu, 'chinese-translation-for-reference-only')
    .replace(/[\u3400-\u9fff\uf900-\ufaff]+/gu, 'source-language')
}

function hasCjkText(value) {
  return /[\u3400-\u9fff\uf900-\ufaff]/u.test(String(value ?? ''))
}

function englishManifestText(value, fallback) {
  const text = String(value ?? '')
  return hasCjkText(text) ? fallback : text
}

function englishManifestSourceLabel(sourceId, fallback) {
  const labels = {
    pacer: 'PACER docket of record',
    'courtlistener-recap': 'CourtListener / RECAP court-record archive',
    'nfsc-criminal-mirror': 'S.D.N.Y. criminal docket public PDF mirror',
    'doj-victim-page': 'DOJ victim information page',
    'sec-press-2023-50': 'SEC civil enforcement source',
    'gtv-fair-fund': 'GTV Fair Fund source',
    'epiq-kwok-trustee': 'Epiq bankruptcy docket source',
    'himalaya-restoration': 'Himalaya Restoration public project site',
    'himalaya-restoration-archive': 'Himalaya Restoration historical public archive',
    'supreme-court-docket': 'Official Supreme Court docket No. 26-194',
  }
  return labels[sourceId] ?? englishManifestText(fallback, 'Public source')
}

export function documentSourceLabelZh(sourceId, fallback) {
  const labels = {
    pacer: 'PACER 正式案卷',
    'courtlistener-recap': 'CourtListener / RECAP 法院文件库',
    'nfsc-criminal-mirror': '纽约南区刑事案卷公开 PDF 镜像',
    'doj-victim-page': 'DOJ 受害者信息页链接文件',
    'sec-press-2023-50': 'SEC 民事执法链接文件',
    'gtv-fair-fund': 'GTV Fair Fund 链接文件',
    'epiq-kwok-trustee': 'Epiq 破产案卷链接文件',
    'himalaya-restoration': 'Himalaya Restoration 公开项目网站文件',
    'himalaya-restoration-archive': 'Himalaya Restoration 历史网页存档文件',
    'supreme-court-docket': '美国最高法院第 26-194 号正式案卷',
  }
  return labels[sourceId] ?? translateLegalTextToZh(fallback)
}

export function localizePayload(payload, lang) {
  const locale = lang === 'en' ? 'en' : 'zh'
  return {
    ...payload,
    language: locale,
    aiMode:
      locale === 'en'
        ? payload.aiMode
            .replace('本地规则分析；设置 OPENAI_API_KEY 启用 OpenAI', 'Local rules; configure OpenAI in Settings to enable OpenAI')
            .replace('本地规则分析；请在设置页配置 OpenAI', 'Local rules; configure OpenAI in Settings')
            .replace('本地确定性法律规则分析（非生成式 AI）；OpenAI 为可选增强', 'Deterministic local legal rules (not generative AI); OpenAI is an optional enhancement')
            .replace(/^OpenAI 结构化分析（(.+)）$/, 'OpenAI structured analysis ($1)')
            .replace('本地确定性法律规则分析（非生成式 AI）；云端 AI 为可选增强', 'Deterministic local legal rules (not generative AI); cloud AI is an optional enhancement')
            .replace('本地确定性法律规则分析（非生成式 AI）；云端或本机模型为可选增强', 'Deterministic local legal rules (not generative AI); cloud or local models are optional enhancements')
            .replace('本地规则分析 · AI 可选增强', 'Local rules · Optional AI enhancement')
            .replace(/^云端 AI 结构化分析（(.+)）$/, 'Cloud AI structured analysis ($1)')
        : payload.aiMode,
    cases: payload.cases.map((item) => localizeCase(item, locale)),
    entities: payload.entities.map((item) => localizeEntity(item, locale)),
    events: payload.events.map((item) => localizeEvent(item, locale)),
    sources: payload.sources.map((item) => localizeSource(item, locale)),
    sourceStatuses: payload.sourceStatuses.map((item) => localizeStatus(item, locale)),
    policyWatch: payload.policyWatch.map((item) => localizePolicy(item, locale)),
    portfolioAnalysis: localizePortfolio(payload.portfolioAnalysis, locale),
    latestAnalysis: localizeAnalysis(payload.latestAnalysis, locale),
    notes: locale === 'en' ? payload.notes : translateArray(payload.notes),
  }
}
