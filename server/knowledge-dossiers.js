const knowledgeDossiers = [
  {
    id: 'he-lingle',
    category: 'person',
    labels: { zh: '贺龄乐', en: 'He Lingle' },
    aliases: ['贺龄乐', '贺林乐', '贺老', '贺老师', 'He Lingle', 'He Ling-le', 'He Lingyue'],
    publicRecordAliases: ['贺龄乐', '贺林乐', '贺老', '贺老师'],
    summary: {
      zh: '郭文贵历史公开言论中提到的人物，常被称为“贺老”或“贺龄乐先生”。检索时需要同时查“贺林乐”“贺龄乐”和“贺老”，否则会漏掉人工听写稿中的不同写法。',
      en: 'A figure mentioned in Guo Wengui historical public statements, often rendered as He Lingle or “He Lao.” Searches should include Chinese variants such as 贺林乐, 贺龄乐, and 贺老.',
    },
    neutralNote: {
      zh: '这是内部别名档案，只用于解释和检索扩展；人物身份、关系和具体说法仍应回到原始直播文字或公开视频核对。',
      en: 'Internal alias dossier for retrieval and explanation only; identity, relationships, and quoted statements should be verified against the original transcript or recording.',
    },
  },
  {
    id: 'guo-wengui',
    category: 'person',
    labels: { zh: '郭文贵', en: 'Guo Wengui / Miles Guo / Ho Wan Kwok' },
    aliases: ['郭文贵', '郭文貴', '文贵先生', '郭先生', 'Miles Guo', 'Miles Kwok', 'Ho Wan Kwok', 'Kwok Ho Wan'],
    publicRecordAliases: ['郭文贵', '郭文貴', 'Miles Guo', 'Ho Wan Kwok', '文贵先生', '郭先生'],
    summary: {
      zh: '本程序核心追踪对象，涉及美国刑事、民事、破产财产、没收、上诉和相关实体案件；公开言论资料库覆盖其 2017-2023 年公开视频、直播文字和公开帖文。',
      en: 'The central tracked person in this workbench, connected to U.S. criminal, civil, bankruptcy-estate, forfeiture, appellate, and entity-related matters; the public-record corpus covers public videos, transcripts, and posts from 2017-2023.',
    },
    neutralNote: {
      zh: '程序必须区分法院记录、政府或当事方主张、媒体报道和公开言论；任何指控或公开陈述都不自动等于法院认定。',
      en: 'The app must separate court records, government or party allegations, media reporting, and public statements; allegations and public statements are not automatically judicial findings.',
    },
  },
  {
    id: 'guo-criminal-main-case',
    category: 'legal_case',
    labels: { zh: '郭文贵刑事主案及直接上诉', en: 'Guo criminal case and direct appeal' },
    aliases: [
      '刑事主案',
      '郭文贵刑事主案',
      'Ho Wan Kwok刑事案',
      'United States v. Ho Wan Kwok',
      'United States v. Guo',
      '1:23-cr-00118-AT',
      '23-cr-118',
      '23-cr-00118',
      '刑事直接上诉',
      '郭文贵直接上诉',
      '26-1853',
      'Second Circuit 26-1853',
    ],
    // Court-case aliases should guide legal retrieval, not expand transcript searches.
    publicRecordAliases: [],
    summary: {
      zh: '“刑事主案”在本程序中指纽约南区 1:23-cr-00118-AT；其刑事判决的直接上诉以第二巡回 26-1853 跟踪。该档案只负责把口语称谓映射到正式案号，不代替案卷或法院命令。',
      en: 'In this app, “the criminal case” maps to S.D.N.Y. 1:23-cr-00118-AT, while the direct appeal from the criminal judgment is tracked as Second Circuit 26-1853. This dossier maps informal wording to docket identifiers and does not replace court records or orders.',
    },
    neutralNote: {
      zh: '程序姿态、期限、律师出庭和上诉争点必须以最新案卷文件为准；破产对抗诉讼和第三方程序不能替代刑事主案状态。',
      en: 'Procedural posture, deadlines, appearances, and appellate issues must be grounded in the latest docket records; bankruptcy adversary matters and third-party proceedings do not substitute for the criminal case status.',
    },
  },
  {
    id: 'whistleblower-movement',
    category: 'movement',
    labels: { zh: '爆料革命', en: 'Whistleblower Movement' },
    aliases: ['爆料革命', '爆料革命运动', 'whistleblower movement', 'whistle blower movement'],
    publicRecordAliases: ['爆料革命', 'whistleblower movement'],
    summary: {
      zh: '郭文贵及其支持者长期使用的政治运动称谓，通常围绕中共体制、海外行动、媒体平台、组织网络和公开爆料叙事展开。',
      en: 'A political-movement label used by Guo Wengui and supporters, generally tied to public claims about the CCP system, overseas activity, media platforms, organizational networks, and disclosures.',
    },
    neutralNote: {
      zh: '该词属于运动自我表述和公开言论背景；引用时应区分政治主张、历史叙事和法院文件中的可核对事实。',
      en: 'This is movement self-description and public-statement context; distinguish political claims, historical narrative, and verifiable court-record facts.',
    },
  },
  {
    id: 'nfsc',
    category: 'organization',
    labels: { zh: '新中国联邦', en: 'New Federal State of China' },
    aliases: ['新中国联邦', '新中國聯邦', 'NFSC', 'New Federal State of China'],
    publicRecordAliases: ['新中国联邦', '新中國聯邦', 'NFSC', 'New Federal State of China'],
    summary: {
      zh: '郭文贵相关公开言论、组织活动和部分诉讼材料中反复出现的政治组织名称。本程序把 NFSC 资料作为公开言论或备用镜像来源处理，不替代 PACER、RECAP 或法院文件。',
      en: 'A political organization name recurring in Guo-related public statements, organizational activity, and some litigation materials. This app treats NFSC material as public-statement or backup mirror material, not a substitute for PACER, RECAP, or court records.',
    },
    neutralNote: {
      zh: 'NFSC 来源可用于发现线索，但引用法律事实时优先使用法院、官方或 RECAP/PACER 来源。',
      en: 'NFSC sources can help discovery, but legal facts should rely first on court, official, or RECAP/PACER sources.',
    },
  },
  {
    id: 'bannon',
    category: 'person',
    labels: { zh: '班农', en: 'Steve Bannon' },
    aliases: ['班农', '班农先生', '史蒂夫班农', '史蒂夫·班农', 'Steve Bannon', 'Stephen Bannon', 'Bannon'],
    publicRecordAliases: ['班农', '史蒂夫班农', '史蒂夫·班农', 'Steve Bannon', 'Stephen Bannon', 'Bannon'],
    summary: {
      zh: '美国政治人物和媒体人，在郭文贵相关公开活动、媒体项目和部分案件背景中出现。检索时需同时覆盖中文译名和英文名。',
      en: 'An American political and media figure appearing in Guo-related public activity, media projects, and some case background. Searches should cover both Chinese renderings and English names.',
    },
    neutralNote: {
      zh: '关联出现不等于法律责任或事实认定；具体身份、角色和时间点要看对应来源。',
      en: 'Association in a source does not establish liability or a judicial finding; role and timing depend on the cited source.',
    },
  },
  {
    id: 'bgy',
    category: 'term',
    labels: { zh: '蓝金黄 / BGY', en: 'Blue-Gold-Yellow / BGY' },
    aliases: ['蓝金黄', '藍金黃', 'BGY', 'blue gold yellow', 'blue-gold-yellow'],
    publicRecordAliases: ['蓝金黄', '藍金黃', 'BGY', 'blue gold yellow', 'blue-gold-yellow'],
    summary: {
      zh: '郭文贵公开言论体系中常见的政治和情报叙事术语，通常指其所称的影响、腐蚀或控制手段。该术语本身属于公开说法，不等于法院事实认定。',
      en: 'A recurring term in Guo Wengui public-statement narratives, generally referring to alleged influence, compromise, or control methods. The term is public-statement terminology, not a judicial finding.',
    },
    neutralNote: {
      zh: '使用该词时必须标明是“郭文贵或相关公开言论中的说法”，不要把它直接写成已被法院确认的事实。',
      en: 'Use the term as a Guo-related public-statement claim unless a court source independently establishes a specific fact.',
    },
  },
  {
    id: 'himalaya-exchange',
    category: 'entity',
    labels: { zh: '喜联储 / 喜马拉雅交易所', en: 'Himalaya Exchange / Himalaya Reserve' },
    aliases: ['喜联储', '喜聯儲', '洗联储', '洗聯儲', '喜交所', '喜马拉雅交易所', '喜馬拉雅交易所', 'Himalaya Exchange', 'Himalaya Reserve'],
    publicRecordAliases: ['喜联储', '喜聯儲', '洗联储', '洗聯儲', '喜交所', '喜马拉雅交易所', '喜馬拉雅交易所', 'Himalaya Exchange', 'Himalaya Reserve'],
    summary: {
      zh: '郭文贵相关公开言论、投资者材料、G 系列实体和部分民刑事案件中反复出现的金融/交易平台名称。检索时应同时查“喜联储”“喜交所/喜马拉雅交易所”、英文和自动字幕误写；翻译时要尽量区分 Himalaya Reserve 与 Himalaya Exchange。',
      en: 'A financial or exchange-platform name recurring in Guo-related public statements, investor materials, G-series entities, and some civil/criminal matters. Searches should cover 喜联储, 喜交所/喜马拉雅交易所, English names, and likely subtitle variants; translation should distinguish Himalaya Reserve from Himalaya Exchange where the source distinguishes them.',
    },
    neutralNote: {
      zh: '平台功能、资金流、控制关系和投资者主张必须以具体法院文件或原始公开材料核对。',
      en: 'Platform functions, fund flows, control relationships, and investor claims must be checked against specific court records or original public materials.',
    },
  },
  {
    id: 'h-coin',
    category: 'term',
    labels: { zh: '喜币', en: 'H-Coin / Himalaya Coin (HCN)' },
    aliases: ['喜币', '喜幣', '洗币', '洗幣', 'H币', 'H幣', 'H Coin', 'H-Coin', 'Hcoin', 'Himalaya Coin', 'HCN'],
    publicRecordAliases: ['喜币', '喜幣', '洗币', '洗幣', 'H币', 'H幣', 'H Coin', 'H-Coin', 'Hcoin', 'Himalaya Coin', 'HCN'],
    summary: {
      zh: '与喜马拉雅交易所、喜联储和相关投资者叙事相连的代币或数字资产名称。公开言论中常写作 H-Coin，正式法律语境中也可能写作 Himalaya Coin、HCN 或 H Coin。',
      en: 'A token or digital-asset name connected with Himalaya Exchange, Himalaya Reserve, and related investor narratives. Public statements often use H-Coin, while formal legal materials may use Himalaya Coin, HCN, or H Coin.',
    },
    neutralNote: {
      zh: '资产性质、销售方式和法律评价应以具体文件和法院记录为准。',
      en: 'Asset characterization, sales mechanics, and legal treatment should be grounded in specific filings and court records.',
    },
  },
  {
    id: 'h-dollar',
    category: 'term',
    labels: { zh: '喜美元', en: 'H-Dollar / Himalaya Dollar (HDO)' },
    aliases: ['喜美元', '洗美元', 'H美元', 'H Dollar', 'H-Dollar', 'Hdollar', 'Himalaya Dollar', 'HDO'],
    publicRecordAliases: ['喜美元', '洗美元', 'H美元', 'H Dollar', 'H-Dollar', 'Hdollar', 'Himalaya Dollar', 'HDO'],
    summary: {
      zh: '与喜马拉雅交易所/喜联储相关的数字资产或账户单位名称。公开文字中常写作 H-Dollar，正式法律语境中也可能写作 Himalaya Dollar、HDO 或 H Dollar。',
      en: 'A digital-asset or account-unit name associated with Himalaya Exchange/Himalaya Reserve. Public statements often use H-Dollar, while formal legal materials may use Himalaya Dollar, HDO, or H Dollar.',
    },
    neutralNote: {
      zh: '应把公开陈述、投资者说法和法院文件分别核对。',
      en: 'Keep public statements, investor claims, and court filings separate when analyzing it.',
    },
  },
  {
    id: 'digital-currency-bank',
    category: 'term',
    labels: { zh: '数字货币 / 数字银行', en: 'Digital currency / digital bank' },
    aliases: ['数字货币', '数字貨幣', '数字银行', '数位银行', '数字黄金', 'digital currency', 'digital bank', 'digital gold'],
    publicRecordAliases: ['数字货币', '数字貨幣', '数字银行', '数位银行', '数字黄金', 'digital currency', 'digital bank', 'digital gold'],
    summary: {
      zh: '郭文贵公开言论、喜联储/喜币/喜美元叙事以及相关金融项目讨论中反复出现的概念群。它可能指数字资产、账户系统、支付通道、储值安排或宣传叙事，不能脱离具体上下文统一解释。',
      en: 'A concept cluster recurring in Guo-related public statements, Himalaya Exchange/H-Coin/H-Dollar narratives, and related financial-project discussions. It may refer to digital assets, account systems, payment channels, stored-value arrangements, or promotional narratives depending on context.',
    },
    neutralNote: {
      zh: '资产性质、是否属于证券、支付工具或银行业务，应以具体法院文件、监管文件和原始项目材料分别核对。',
      en: 'Whether a given item is a security, payment tool, bank-like service, or something else should be checked against specific court records, regulatory records, and original project materials.',
    },
  },
  {
    id: 'g-series',
    category: 'entity_cluster',
    labels: { zh: 'G 系列实体', en: 'G-series entities' },
    aliases: ['G系列', 'G 系列', 'GTV', 'G-TV', 'G News', 'GNews', 'G Club', 'GClub', 'G Fashion', 'G|CLUBS'],
    publicRecordAliases: ['G系列', 'G 系列', 'GTV', 'G-TV', 'G News', 'GNews', 'G Club', 'GClub', 'G Fashion'],
    summary: {
      zh: '郭文贵相关公开活动、媒体平台、会员/投资者项目和诉讼材料中反复出现的一组 G 前缀项目或实体。',
      en: 'A cluster of G-prefixed projects or entities recurring in Guo-related public activity, media platforms, membership/investor projects, and litigation materials.',
    },
    neutralNote: {
      zh: '不同 G 项目之间不能简单合并；关系、控制、资金流和法律责任必须逐项核对。',
      en: 'Do not collapse different G projects into one entity; relationships, control, fund flows, and liability require source-by-source verification.',
    },
  },
  {
    id: 'rule-of-law-foundation',
    category: 'organization',
    labels: { zh: '法治基金 / 法治社会', en: 'Rule of Law Foundation / Rule of Law Society' },
    aliases: ['法治基金', '法治社会', '法治基金会', 'Rule of Law Foundation', 'Rule of Law Society', 'ROLF', 'ROLS'],
    publicRecordAliases: ['法治基金', '法治社会', '法治基金会', 'Rule of Law Foundation', 'Rule of Law Society', 'ROLF', 'ROLS'],
    summary: {
      zh: '郭文贵、班农及相关公开活动中经常出现的组织名称。检索时要把“法治基金”“法治社会”“Rule of Law Foundation”“Rule of Law Society”合并理解，但分析时仍要区分具体组织、人员角色、资金用途、公开声明和法院文件中的不同表述。',
      en: 'Organization names frequently appearing in Guo, Bannon, and related public activity. Searches should connect “法治基金,” “法治社会,” “Rule of Law Foundation,” and “Rule of Law Society,” while analysis must still distinguish the specific organization, roles, funding use, public statements, and court-file descriptions.',
    },
    neutralNote: {
      zh: '“法治基金/法治社会”是组织和项目语境，不应与其他口号或文本类称谓混同。组织宗旨、资金、管理关系和法律评价应以具体公开材料、监管材料或法院文件核对。',
      en: 'Rule of Law Foundation/Society is an organization/project context and should not be mixed with slogan or text labels. Purpose, funding, management relationships, and legal characterization should be checked against specific public, regulatory, or court materials.',
    },
  },
  {
    id: 'himalaya-farms',
    category: 'organization',
    labels: { zh: '喜马拉雅农场', en: 'Himalaya Farms' },
    aliases: ['喜马拉雅农场', '农场体系', '香草山农场', '伦敦阳光农场', 'Himalaya Farm', 'Himalaya Farms'],
    publicRecordAliases: ['喜马拉雅农场', '农场体系', '香草山农场', '伦敦阳光农场', 'Himalaya Farm', 'Himalaya Farms'],
    summary: {
      zh: '爆料革命和新中国联邦支持者网络中常见的地区性组织或社群称谓，常作为公开视频、帖文和活动传播节点出现。',
      en: 'Regional organization or community labels common in the Whistleblower Movement/NFSC supporter network, often appearing as distribution nodes for videos, posts, and events.',
    },
    neutralNote: {
      zh: '农场名称用于来源归类和检索，不应自动推断成员身份、控制关系或法律责任。',
      en: 'Farm names are useful for source grouping and retrieval; they do not by themselves establish membership, control, or liability.',
    },
  },
  {
    id: 'fellow-fighters',
    category: 'term',
    labels: { zh: '战友', en: 'Fellow fighters / supporters' },
    aliases: ['战友', '戰友', '兄弟姐妹', '支持者', 'fellow fighters', 'supporters'],
    publicRecordAliases: ['战友', '戰友', '兄弟姐妹'],
    summary: {
      zh: '郭文贵历史直播和支持者社群中高频出现的称谓，通常指参与或关注爆料革命、新中国联邦、农场体系等活动的人群。',
      en: 'A high-frequency label in Guo-related broadcasts and supporter communities, usually referring to people participating in or following the Whistleblower Movement, NFSC, farm networks, or related activities.',
    },
    neutralNote: {
      zh: '该词是公开言论中的社群称谓，不自动证明任何人的正式成员身份或法律责任。',
      en: 'This is a community label in public statements; it does not by itself establish formal membership or legal responsibility.',
    },
  },
  {
    id: 'anti-ccp-campaign',
    category: 'movement',
    labels: { zh: '灭共', en: 'Anti-CCP campaign / Mie Gong' },
    aliases: ['灭共', '滅共', '消灭共产党', '消滅共產黨', '灭掉共产党', '共产党完了', 'Mie Gong', 'anti-CCP'],
    publicRecordAliases: ['灭共', '滅共', '消灭共产党', '消滅共產黨', '灭掉共产党', '共产党完了', 'anti-CCP'],
    summary: {
      zh: '爆料革命和新中国联邦公开言论中的核心政治目标词，常与组织动员、媒体传播、国际政治和行动口号相连。',
      en: 'A core political-goal term in Whistleblower Movement and NFSC public statements, often linked to mobilization, media activity, international politics, and slogans.',
    },
    neutralNote: {
      zh: '这是政治表达和运动目标，不应与法院事实认定或具体法律结论混同。',
      en: 'This is political expression and movement objective language; do not conflate it with judicial findings or legal conclusions.',
    },
  },
  {
    id: 'daoguozei',
    category: 'term',
    labels: { zh: '盗国贼', en: '“Daoguozei” / alleged kleptocrats' },
    aliases: ['盗国贼', '盜國賊', '盗國贼', '盗国贼家族', 'kleptocrat', 'kleptocrats'],
    publicRecordAliases: ['盗国贼', '盜國賊', '盗國贼', '盗国贼家族'],
    summary: {
      zh: '郭文贵公开爆料叙事中常用的政治指称，通常用来描述其所称通过权力、资本或海外网络转移利益的人或家族。',
      en: 'A recurring political label in Guo Wengui disclosure narratives, generally referring to people or families alleged to move benefits through power, capital, or overseas networks.',
    },
    neutralNote: {
      zh: '该词是公开指称或主张；具体个人、资产和行为必须靠原始材料、法院文件或官方记录核对。',
      en: 'The term is a public allegation label; specific people, assets, and conduct require original materials, court filings, or official records.',
    },
  },
  {
    id: 'maimeizei',
    category: 'term',
    labels: { zh: '卖美贼', en: '“Mai Mei Zei” / alleged U.S. influence network' },
    aliases: ['卖美贼', '賣美賊', 'maimeizei'],
    publicRecordAliases: ['卖美贼', '賣美賊'],
    summary: {
      zh: '郭文贵公开言论中使用的政治指称，通常指其所称配合中共、损害美国利益，或帮助中共影响美国政治、司法、媒体、金融等领域的人或网络。内部档案只按“卖美贼”这个词建立检索。',
      en: 'A Guo-related public-statement political label generally used for people or networks alleged to assist the CCP, harm U.S. interests, or help CCP influence U.S. politics, justice, media, finance, or related fields. The internal dossier indexes the Chinese term 卖美贼 only.',
    },
    neutralNote: {
      zh: '该词表达的是公开言论中的指控框架，不等于已被法院确认的事实。',
      en: 'The term expresses a public-statement allegation framework, not a fact established by a court.',
    },
  },
  {
    id: 'silent-force',
    category: 'term',
    labels: { zh: '沉默的力量', en: 'Silent Force' },
    aliases: ['沉默的力量', '沉默力量', 'silent force'],
    publicRecordAliases: ['沉默的力量', '沉默力量', 'silent force'],
    summary: {
      zh: '郭文贵公开言论中反复出现的组织或力量叙事词，通常与海外政治、情报、司法或金融影响叙事相连。',
      en: 'A recurring narrative term in Guo-related public statements, usually connected to overseas political, intelligence, judicial, or financial influence narratives.',
    },
    neutralNote: {
      zh: '该词语义依赖上下文，引用时必须回到具体直播片段或文件。',
      en: 'Meaning depends heavily on context; cite the specific broadcast segment or document.',
    },
  },
  {
    id: 'plan-13579',
    category: 'term',
    labels: { zh: '13579 计划', en: '13579 Plan' },
    aliases: ['13579计划', '13579 计划', '13579', '13579 plan', '13579方案'],
    publicRecordAliases: ['13579计划', '13579 计划', '13579', '13579 plan', '13579方案'],
    summary: {
      zh: '郭文贵公开言论中的计划类名词。他将其描述为一份涉及生化武器、病毒传播、疫苗和全球战略的中共绝密方案；这是其公开主张的概括，不是本程序确认存在的官方文件。',
      en: 'A plan label in Guo Wengui public statements. He describes it as an alleged secret CCP global strategy involving biological weapons, virus spread, vaccines, and related leverage; this summarizes his claim and does not establish that an official plan document exists.',
    },
    neutralNote: {
      zh: '必须用具体直播文字或原始视频标注“郭文贵称/其主张”，不能把病毒来源、计划存在或实施结果写成已独立证实的事实。',
      en: 'Cite the specific transcript or recording and attribute the account to Guo; virus origin, the plan\'s existence, and alleged implementation are not independently established by the label itself.',
    },
  },
  {
    id: 'plan-3f',
    category: 'term',
    labels: { zh: '3F 计划', en: '3F Plan' },
    aliases: ['3F计划', '3F 计划', '3F方案', '3F法', '3F', 'Fall Fail Fell', 'Fall/Fail/Fell', '搞弱搞乱搞死'],
    publicRecordAliases: ['3F计划', '3F 计划', '3F方案', '3F法', '3F', 'Fall Fail Fell', '搞弱搞乱搞死'],
    summary: {
      zh: '郭文贵公开言论中的对美战略术语，通常被解释为 Fall、Fail、Fell 三个阶段，并概括为“搞弱、搞乱、搞死美国”。这是公开言论中的指控框架。',
      en: 'A Guo Wengui public-statement term for an alleged strategy against the United States, commonly expanded as Fall, Fail, and Fell and paraphrased as weakening, destabilizing, and destroying America. It is an allegation framework in public statements.',
    },
    neutralNote: {
      zh: '该术语不能独立证明存在同名官方计划；具体内容、首次提出时间和关联事件要回到带日期的原始言论核验。',
      en: 'The label does not independently prove an official plan of that name; content, chronology, and claimed links to events require dated primary-source verification.',
    },
  },
  {
    id: 'architecture-art-project',
    category: 'term',
    labels: { zh: '建筑艺术项目', en: 'Architecture and Art Project' },
    aliases: ['建筑艺术项目', '建筑艺术', '建築藝術項目', 'Architecture and Art Project', 'Architecture Art Project'],
    publicRecordAliases: ['建筑艺术项目', '建筑艺术', '建築藝術項目', 'Architecture and Art Project', 'Architecture Art Project'],
    summary: {
      zh: '郭文贵公开言论中的代号。他称该词指中共对海外非婚生后代进行登记、培养并扶植进入政商领域的安排；这是其海外渗透叙事中的一项主张。',
      en: 'A code-name in Guo Wengui public statements. He says it refers to an alleged program to register, groom, and elevate CCP-linked children born abroad into political and business circles; it is part of his overseas-influence narrative.',
    },
    neutralNote: {
      zh: '涉及具体人物、亲属关系、身份或职务时，必须另有可靠原始记录，不能仅凭该术语或直播指称作出认定。',
      en: 'Specific identities, parentage, relationships, or offices require reliable independent records and cannot be established from the label or a broadcast allegation alone.',
    },
  },
  {
    id: 'mie-bai-plan',
    category: 'term',
    labels: { zh: '灭白计划', en: 'Mie Bai / “Eliminate the White Race” Plan' },
    aliases: ['灭白计划', '滅白計劃', '灭白', '灭美计划', '滅美計劃', 'Mie Bai', 'Mie Bai Plan', 'Eliminate the White Race Plan'],
    publicRecordAliases: ['灭白计划', '滅白計劃', '灭白', '灭美计划', '滅美計劃', 'Mie Bai', 'Mie Bai Plan'],
    summary: {
      zh: '郭文贵公开言论中的政治叙事术语。他用该词指称其所主张的、针对白人和西方主导秩序的系统性图谋，并把病毒、疫苗、财富与信仰等议题纳入该叙事。',
      en: 'A political-narrative term in Guo Wengui public statements. He uses it for an alleged systematic scheme against white populations and the Western-led order, linking it to claims about viruses, vaccines, wealth, and religion.',
    },
    neutralNote: {
      zh: '这是高度争议且带有族群指向的公开主张，不是法院认定或本程序确认的事实；引用时必须保留归因并避免扩大解释。',
      en: 'This is a highly contested, race-directed public allegation, not a court finding or a fact established by this app; preserve attribution and avoid expanding it beyond the cited source.',
    },
  },
  {
    id: 'nanputuo-plan',
    category: 'term',
    labels: { zh: '南普陀会议 / 南普陀计划', en: 'Nanputuo Meeting / Plan' },
    aliases: ['南普陀会议', '南普陀會議', '南普陀计划', '南普陀計劃', '南普陀', '南普图会议', '南普圖會議', 'Nanputuo Meeting', 'Nanputuo Plan'],
    publicRecordAliases: ['南普陀会议', '南普陀會議', '南普陀计划', '南普陀計劃', '南普陀', '南普图会议', '南普圖會議', 'Nanputuo Meeting', 'Nanputuo Plan'],
    summary: {
      zh: '郭文贵公开言论中的秘密会议和政治计划称谓。他把该会议及后续安排描述为江泽民家族、王岐山、孟建柱等相关力量借人事、政法和对领导人身边人的控制来“盗国、控国、监国”的布局。',
      en: 'A secret-meeting and political-plan label in Guo Wengui public statements. He describes it as an alleged arrangement involving the Jiang Zemin family, Wang Qishan, Meng Jianzhu, and others to use personnel, political-legal institutions, and leverage over a leader\'s circle to “steal, control, and regent the state.”',
    },
    neutralNote: {
      zh: '会议地点、参与者、录音、事件因果和具体执行均属于待核公开主张；人物关联不能脱离逐段原文被写成已证实事实。',
      en: 'Location, participants, recordings, causation, and implementation remain claims requiring verification; do not turn named associations into established facts without source-specific support.',
    },
  },
  {
    id: 'double-dragon-plan',
    category: 'term',
    labels: { zh: '双龙计划 / 双龙行动', en: 'Double Dragon Plan / Action' },
    aliases: ['双龙计划', '雙龍計劃', '双龙行动', '雙龍行動', '香港双龙计划', '香港雙龍計劃', '台湾双龙计划', '台灣雙龍計劃', '香港台湾双龙计划', 'Double Dragon Plan', 'Double Dragon Action'],
    publicRecordAliases: ['双龙计划', '雙龍計劃', '双龙行动', '雙龍行動', '香港双龙计划', '香港雙龍計劃', '台湾双龙计划', '台灣雙龍計劃', '香港台湾双龙计划', 'Double Dragon Plan', 'Double Dragon Action'],
    summary: {
      zh: '郭文贵公开言论中的军事与政治行动称谓。其 2019 年 9 月等直播把它描述为以控制香港为前置或组成部分、继而对台湾实施突然军事打击并夺取台湾的联动方案，后来也常被概括为“拿下香港、拿下台湾”。',
      en: 'A military-political action label in Guo Wengui public statements. In broadcasts including September 2019, he described it as a linked alleged plan in which control of Hong Kong precedes or accompanies a sudden military attack to seize Taiwan, later often paraphrased as “take Hong Kong, take Taiwan.”',
    },
    neutralNote: {
      zh: '这是郭文贵对中共计划的公开指称，不是已公开的官方作战计划或法院认定；应引用对应日期的直播原文，并把后来的回顾性说法与最初陈述分开。',
      en: 'This is Guo\'s public characterization of an alleged CCP plan, not a published official operation plan or court finding; cite the dated transcript and distinguish later retrospective claims from the original statement.',
    },
  },
  {
    id: 'hpay',
    category: 'entity',
    labels: { zh: 'HPay', en: 'HPay' },
    aliases: ['HPay', 'H Pay', 'H-Pay', '喜支付', 'Himalaya Pay'],
    publicRecordAliases: ['HPay', 'H Pay', 'H-Pay', '喜支付', 'Himalaya Pay'],
    summary: {
      zh: '与喜马拉雅交易所、喜币、喜美元和相关支付/账户叙事相连的名称，在直播和项目材料中可能以不同写法出现。',
      en: 'A name connected to Himalaya Exchange, H-Coin, H-Dollar, and related payment/account narratives, appearing under multiple spellings in broadcasts and project materials.',
    },
    neutralNote: {
      zh: '支付功能、资产性质和责任主体必须用具体材料核对。',
      en: 'Payment function, asset characterization, and responsible entities require source-specific verification.',
    },
  },
  {
    id: 'gettr',
    category: 'entity',
    labels: { zh: 'GETTR / 盖特', en: 'GETTR' },
    aliases: ['GETTR', 'Gettr', '盖特', '盖特直播', 'gettr.com'],
    publicRecordAliases: ['GETTR', 'Gettr', '盖特', '盖特直播', 'gettr.com'],
    summary: {
      zh: '公开视频、直播转发和社交帖文的重要平台名称，也是本地公开言论库中的常见外部链接来源。',
      en: 'An important platform name for public videos, broadcast reposts, and social posts, and a frequent external-link source in the local public-record corpus.',
    },
    neutralNote: {
      zh: '平台链接只证明该公开材料的出处或转载位置，不证明材料内容本身已被法院确认。',
      en: 'A platform link proves a source or repost location, not that the content is judicially established.',
    },
  },
  {
    id: 'gnews',
    category: 'entity',
    labels: { zh: 'GNews', en: 'GNews' },
    aliases: ['GNews', 'G News', 'GNews直播', 'GNEWS'],
    publicRecordAliases: ['GNews', 'G News', 'GNews直播', 'GNEWS'],
    summary: {
      zh: 'G 系列媒体/信息平台名称，在直播标题、转载文字、新闻稿和案件背景中反复出现。',
      en: 'A G-series media/information platform name recurring in broadcast titles, transcript copies, posts, and case background.',
    },
    neutralNote: {
      zh: '应把平台、账号、公司实体和具体文件分开核对。',
      en: 'Keep platform, account, corporate entity, and specific source document separate.',
    },
  },
  {
    id: 'gtv-stock',
    category: 'term',
    labels: { zh: 'GTV 股票', en: 'GTV stock' },
    aliases: ['GTV股票', 'GTV 股票', 'GTV stock', 'GTV private placement'],
    publicRecordAliases: ['GTV股票', 'GTV 股票', 'GTV stock'],
    summary: {
      zh: '与 GTV 项目、投资者材料、SEC/Fair Fund 和刑民事案件背景相连的投资类关键词。',
      en: 'An investment-related keyword connected with the GTV project, investor materials, SEC/Fair Fund issues, and civil/criminal case background.',
    },
    neutralNote: {
      zh: '销售、募集、退款、Fair Fund 和责任问题应以对应法院或监管文件核对。',
      en: 'Sales, fundraising, refunds, Fair Fund issues, and responsibility should be checked against court or regulatory records.',
    },
  },
  {
    id: 'spac-dwac',
    category: 'term',
    labels: { zh: 'SPAC / DWAC', en: 'SPAC / DWAC' },
    aliases: ['SPAC', 'DWAC', 'special purpose acquisition company', 'Digital World Acquisition Corp'],
    publicRecordAliases: ['SPAC', 'DWAC', 'special purpose acquisition company', 'Digital World Acquisition Corp'],
    summary: {
      zh: '郭文贵公开视频中出现的美国资本市场和交易结构关键词，常与媒体公司、政治人物、金融市场和中共影响叙事相连。',
      en: 'U.S. capital-market and transaction-structure keywords appearing in Guo-related public videos, often connected to media-company, political-figure, financial-market, and CCP-influence narratives.',
    },
    neutralNote: {
      zh: '公开评论中的市场判断、交易结构和法律责任不能混同；涉及具体证券或交易时应查 SEC、法院或发行文件。',
      en: 'Market commentary, transaction structure, and legal responsibility should not be conflated; specific securities or transactions should be checked against SEC, court, or offering records.',
    },
  },
  {
    id: 'hna',
    category: 'entity',
    labels: { zh: '海航 / HNA', en: 'HNA Group' },
    aliases: ['海航', '海南航空', 'HNA', 'HNA Group', '王健海航'],
    publicRecordAliases: ['海航', '海南航空', 'HNA', 'HNA Group'],
    summary: {
      zh: '郭文贵早期爆料和直播中高频出现的企业集团名称，常与王健、海外资产、融资和权力关系叙事相连。',
      en: 'A frequently mentioned corporate group in Guo Wengui early disclosures and broadcasts, often tied to narratives about Wang Jian, overseas assets, financing, and power relationships.',
    },
    neutralNote: {
      zh: '企业事实、人物关系和资产线索必须与公开公司资料、法院文件或可核对来源交叉验证。',
      en: 'Corporate facts, relationships, and asset claims require cross-checking with corporate records, court filings, or verifiable sources.',
    },
  },
  {
    id: 'wang-qishan',
    category: 'person',
    labels: { zh: '王岐山', en: 'Wang Qishan' },
    aliases: ['王岐山', 'Wang Qishan'],
    publicRecordAliases: ['王岐山', 'Wang Qishan'],
    summary: {
      zh: '郭文贵公开爆料叙事中长期出现的中共高层人物名称。',
      en: 'A senior CCP figure name that appears frequently in Guo Wengui public disclosure narratives.',
    },
    neutralNote: {
      zh: '人物名称出现不等于相关主张已经成立；必须引用具体原文和可核对来源。',
      en: 'A name appearing in a source does not establish the associated claim; cite the exact source and verifiable material.',
    },
  },
  {
    id: 'meng-jianzhu',
    category: 'person',
    labels: { zh: '孟建柱', en: 'Meng Jianzhu' },
    aliases: ['孟建柱', 'Meng Jianzhu'],
    publicRecordAliases: ['孟建柱', 'Meng Jianzhu'],
    summary: {
      zh: '郭文贵公开言论中反复出现的中共政法系统相关人物名称。',
      en: 'A CCP political-legal system figure name recurring in Guo-related public statements.',
    },
    neutralNote: {
      zh: '相关叙事要按具体直播、采访或文件逐条核对。',
      en: 'Related narratives require source-by-source checking against the specific broadcast, interview, or document.',
    },
  },
  {
    id: 'sun-lijun',
    category: 'person',
    labels: { zh: '孙力军', en: 'Sun Lijun' },
    aliases: ['孙力军', '孫力軍', 'Sun Lijun', '孙力军政治集团'],
    publicRecordAliases: ['孙力军', '孫力軍', 'Sun Lijun', '孙力军政治集团'],
    summary: {
      zh: '郭文贵公开言论中常与中共政法、内部清洗和政治集团叙事相连的人物名称。',
      en: 'A figure name often connected in Guo-related statements with CCP political-legal issues, internal purges, and faction narratives.',
    },
    neutralNote: {
      zh: '应区分公开视频中的预测、评论、爆料和后续官方/法院材料。',
      en: 'Distinguish public-video predictions, commentary, disclosures, and later official or court materials.',
    },
  },
  {
    id: 'fu-zhenghua',
    category: 'person',
    labels: { zh: '傅政华', en: 'Fu Zhenghua' },
    aliases: ['傅政华', '傅政華', 'Fu Zhenghua'],
    publicRecordAliases: ['傅政华', '傅政華', 'Fu Zhenghua'],
    summary: {
      zh: '郭文贵公开言论中常见的中共政法系统人物名称，常与内部清洗、追逃和司法系统叙事相连。',
      en: 'A CCP political-legal system figure name common in Guo-related statements, often linked to internal purge, fugitive-repatriation, and judicial-system narratives.',
    },
    neutralNote: {
      zh: '相关内容应按时间线核对公开言论和官方/司法材料。',
      en: 'Related material should be checked on a timeline against public statements and official/judicial materials.',
    },
  },
  {
    id: 'xi-jinping-xi-faction',
    category: 'person',
    labels: { zh: '习近平 / 习家党', en: 'Xi Jinping / Xi faction' },
    aliases: ['习近平', '習近平', '习家党', '習家黨', 'Xi Jinping'],
    publicRecordAliases: ['习近平', '習近平', '习家党', '習家黨', 'Xi Jinping'],
    summary: {
      zh: '郭文贵历史直播中高频出现的中共最高领导人及其政治集团叙事关键词。',
      en: 'High-frequency keywords in Guo-related historical broadcasts referring to the CCP top leader and faction narratives.',
    },
    neutralNote: {
      zh: '政治评论、预测和事实材料要分层处理，不能把评论直接写成司法事实。',
      en: 'Separate political commentary, predictions, and factual materials; do not convert commentary into judicial fact.',
    },
  },
  {
    id: 'wang-jian-hna',
    category: 'person',
    labels: { zh: '王健', en: 'Wang Jian' },
    aliases: ['王健', 'Wang Jian', '海航王健'],
    publicRecordAliases: ['王健', 'Wang Jian', '海航王健'],
    summary: {
      zh: '海航相关公开爆料中高频出现的人物名称，常与海航、法国、资产和死亡事件叙事相连。',
      en: 'A frequently mentioned person in HNA-related public disclosures, often connected to HNA, France, assets, and death-event narratives.',
    },
    neutralNote: {
      zh: '涉及死亡、资产或责任的内容必须特别谨慎核对来源。',
      en: 'Claims involving death, assets, or responsibility require especially careful source checking.',
    },
  },
  {
    id: 'yao-qing',
    category: 'person',
    labels: { zh: '姚庆', en: 'Yao Qing' },
    aliases: ['姚庆', '姚慶', 'Yao Qing'],
    publicRecordAliases: ['姚庆', '姚慶', 'Yao Qing'],
    summary: {
      zh: '郭文贵公开言论中出现的人物名称，常与早期爆料、政商关系或个人经历叙事相连。',
      en: 'A person name appearing in Guo-related public statements, often connected to early disclosures, political-business relationships, or personal-history narratives.',
    },
    neutralNote: {
      zh: '具体关系和事件需要回到原文逐条核对。',
      en: 'Specific relationships and events should be checked against the original text.',
    },
  },
  {
    id: 'li-zuyuan',
    category: 'person',
    labels: { zh: '李祖元', en: 'Li Zuyuan' },
    aliases: ['李祖元', 'Li Zuyuan'],
    publicRecordAliases: ['李祖元', 'Li Zuyuan'],
    summary: {
      zh: '郭文贵公开言论中提及的人物名称，常与个人经历、导师或社交关系叙事相连。',
      en: 'A person name mentioned in Guo-related public statements, often connected to personal-history, mentor, or relationship narratives.',
    },
    neutralNote: {
      zh: '人物关联应依据具体直播文字或公开视频核对。',
      en: 'Person associations should be verified against the specific transcript or recording.',
    },
  },
  {
    id: 'lude',
    category: 'person',
    labels: { zh: '路德', en: 'Lude' },
    aliases: ['路德', '路德社', 'Lude', 'Lude Media'],
    publicRecordAliases: ['路德', '路德社', 'Lude', 'Lude Media'],
    summary: {
      zh: '郭文贵相关公开传播生态中常见的人名/媒体名，可能出现在直播、访谈和转发材料中。',
      en: 'A name/media label common in the Guo-related public-media ecosystem, appearing in broadcasts, interviews, and reposted materials.',
    },
    neutralNote: {
      zh: '媒体角色和个人角色应分别核对。',
      en: 'Media role and individual role should be verified separately.',
    },
  },
  {
    id: 'pangu',
    category: 'entity',
    labels: { zh: '盘古', en: 'Pangu' },
    aliases: ['盘古', '盤古', '盘古大观', 'Pangu', 'Pangu Plaza'],
    publicRecordAliases: ['盘古', '盤古', '盘古大观', 'Pangu', 'Pangu Plaza'],
    summary: {
      zh: '郭文贵个人和商业经历、资产叙事以及部分案件背景中反复出现的实体/资产名称。',
      en: 'An entity/asset name recurring in Guo Wengui personal and business history, asset narratives, and some case background.',
    },
    neutralNote: {
      zh: '资产归属、控制和价值应以具体文件为准。',
      en: 'Ownership, control, and valuation should be grounded in specific records.',
    },
  },
  {
    id: 'yuda',
    category: 'entity',
    labels: { zh: '裕达', en: 'Yuda' },
    aliases: ['裕达', '裕達', '裕达国贸', '裕达国贸酒店', 'Yuda'],
    publicRecordAliases: ['裕达', '裕達', '裕达国贸', '裕达国贸酒店', 'Yuda'],
    summary: {
      zh: '郭文贵早期商业经历和公开叙事中出现的项目/资产名称。',
      en: 'A project/asset name appearing in Guo Wengui early business history and public narratives.',
    },
    neutralNote: {
      zh: '历史经历和资产叙事应与公开材料或案件材料交叉验证。',
      en: 'Historical and asset narratives should be cross-checked with public materials or case records.',
    },
  },
  {
    id: 'zhongnankeng',
    category: 'term',
    labels: { zh: '中南坑', en: 'Zhongnankeng' },
    aliases: ['中南坑', '中南海', 'Zhongnankeng'],
    publicRecordAliases: ['中南坑', 'Zhongnankeng'],
    summary: {
      zh: '郭文贵公开视频和访谈中常见的政治讽刺或爆料叙事词，通常指向中共高层政治语境。',
      en: 'A political satire/disclosure narrative term in Guo-related videos and interviews, usually pointing to CCP top-level political context.',
    },
    neutralNote: {
      zh: '该词具有强烈修辞色彩，分析时应还原具体语境。',
      en: 'The term is rhetorically charged; analysis should preserve the exact context.',
    },
  },
  {
    id: 'vaccine-disaster',
    category: 'term',
    labels: { zh: '疫苗灾难', en: 'Vaccine disaster narrative' },
    aliases: ['疫苗灾难', '疫苗危机', '疫苗追责', '疫苗解药', '全球疫苗灾难'],
    publicRecordAliases: ['疫苗灾难', '疫苗危机', '疫苗追责', '疫苗解药', '全球疫苗灾难'],
    summary: {
      zh: '2020-2023 年公开言论中高频出现的公共卫生和政治叙事关键词，常与病毒、政策、解药、追责和国际关系相连。',
      en: 'A high-frequency public-health and political narrative keyword in 2020-2023 statements, often connected to virus, policy, remedy, accountability, and international-relations claims.',
    },
    neutralNote: {
      zh: '医学、科学和法律结论应依赖权威专业来源；本档案只用于检索公开言论。',
      en: 'Medical, scientific, and legal conclusions require authoritative expert sources; this dossier is for retrieving public statements only.',
    },
  },
  {
    id: 'covid-origin',
    category: 'term',
    labels: { zh: '中共病毒 / 病毒溯源', en: 'COVID / origin narrative' },
    aliases: ['中共病毒', '病毒溯源', '新冠病毒', 'COVID', 'COVID-19', 'coronavirus'],
    publicRecordAliases: ['中共病毒', '病毒溯源', '新冠病毒', 'COVID', 'COVID-19', 'coronavirus'],
    summary: {
      zh: '公开言论中用于讨论疫情、病毒来源、政策责任和国际争议的关键词群。',
      en: 'A keyword cluster used in public statements about the pandemic, virus origin, policy responsibility, and international disputes.',
    },
    neutralNote: {
      zh: '公共卫生事实必须与专业和官方资料区分处理，本程序不把直播说法当作科学结论。',
      en: 'Public-health facts must be separated from public-statement claims; the app does not treat broadcast claims as scientific conclusions.',
    },
  },
  {
    id: 'ukraine-war',
    category: 'term',
    labels: { zh: '俄乌战争 / 乌克兰', en: 'Russia-Ukraine war / Ukraine' },
    aliases: ['俄乌战争', '俄烏戰爭', '乌克兰战争', '烏克蘭戰爭', '乌克兰救援', 'Ukraine', 'Russia Ukraine war'],
    publicRecordAliases: ['俄乌战争', '俄烏戰爭', '乌克兰战争', '烏克蘭戰爭', '乌克兰救援', 'Ukraine', 'Russia Ukraine war'],
    summary: {
      zh: '2022 年后直播中高频出现的国际政治和救援背景关键词，常与中共、欧洲、安全和经济预测叙事相连。',
      en: 'A post-2022 international-politics and relief-context keyword, often connected to CCP, Europe, security, and economic-forecast narratives.',
    },
    neutralNote: {
      zh: '战争事实、预测和政治评论要分开处理。',
      en: 'Separate war facts, predictions, and political commentary.',
    },
  },
  {
    id: 'white-paper-movement',
    category: 'movement',
    labels: { zh: '白纸运动', en: 'White Paper Movement' },
    aliases: ['白纸运动', '白紙運動', '白纸革命', '白紙革命', 'white paper movement'],
    publicRecordAliases: ['白纸运动', '白紙運動', '白纸革命', '白紙革命', 'white paper movement'],
    summary: {
      zh: '2022 年中国抗议事件相关关键词，在直播中常与防疫政策、社会控制和中共政治判断相连。',
      en: 'A keyword for 2022 China protest events, often tied in broadcasts to pandemic policy, social control, and CCP political analysis.',
    },
    neutralNote: {
      zh: '事件经过、参与者和影响应以独立来源和时间线核对。',
      en: 'Events, participants, and impact should be checked against independent sources and timelines.',
    },
  },
  {
    id: 'cpac',
    category: 'term',
    labels: { zh: 'CPAC / 保守党大会', en: 'CPAC' },
    aliases: ['CPAC', '保守党大会', '保守派政治行动会议', 'Conservative Political Action Conference'],
    publicRecordAliases: ['CPAC', '保守党大会', '保守派政治行动会议', 'Conservative Political Action Conference'],
    summary: {
      zh: '郭文贵和新中国联邦相关公开活动中出现的美国政治会议关键词。',
      en: 'A U.S. political conference keyword appearing in Guo/NFSC-related public activity.',
    },
    neutralNote: {
      zh: '活动参与、发言和影响应分别按公开材料核对。',
      en: 'Participation, statements, and impact should be verified separately from public materials.',
    },
  },
  {
    id: 'eighteenth-floor-park-lane',
    category: 'term',
    labels: { zh: '18 楼 / Park Lane', en: '18th floor / Park Lane' },
    aliases: ['18楼', '18 楼', '十八楼', '18th floor', 'Park Lane', 'Park Lane酒店', '帕克莱恩', '36 Central Park S'],
    publicRecordAliases: ['18楼', '18 楼', '十八楼', '18th floor', 'Park Lane', 'Park Lane酒店', '帕克莱恩', '36 Central Park S'],
    summary: {
      zh: '郭文贵公开直播和 2023 年 3 月 15 日前后新闻/案件背景中出现的地点关键词，常与纽约住所、公寓和火灾事件叙事相连。',
      en: 'Location keywords appearing in Guo-related broadcasts and March 2023 news/case background, often connected to New York residence/apartment and fire-event narratives.',
    },
    neutralNote: {
      zh: '地点、火灾和执法事件应以新闻、官方记录和法院材料核对。',
      en: 'Location, fire, and law-enforcement events should be checked against news, official records, and court materials.',
    },
  },
  {
    id: 'fbi-doj-sec',
    category: 'organization',
    labels: { zh: 'FBI / DOJ / SEC', en: 'FBI / DOJ / SEC' },
    aliases: ['FBI', '联邦调查局', '司法部', 'DOJ', 'SEC', '美国证券交易委员会', 'Securities and Exchange Commission'],
    publicRecordAliases: ['FBI', '联邦调查局', '司法部', 'DOJ', 'SEC', '美国证券交易委员会', 'Securities and Exchange Commission'],
    summary: {
      zh: '郭文贵相关刑事、监管、执法和公开言论背景中常见的美国机构名称。',
      en: 'U.S. agency names common in Guo-related criminal, regulatory, law-enforcement, and public-statement context.',
    },
    neutralNote: {
      zh: '机构行动和法律意义必须以官方公告、法院文件或监管文件为准。',
      en: 'Agency actions and legal meaning must be grounded in official releases, court filings, or regulatory records.',
    },
  },
  {
    id: 'morgan-family',
    category: 'person',
    labels: { zh: '摩根家族 / John Morgan', en: 'Morgan family / John Morgan' },
    aliases: ['摩根', '摩根家族', '摩根先生', '摩根夫人', '约翰摩根', '约翰·摩根', '摩根大通', '摩根斯坦利', '摩根银行', 'Morgan', 'John Morgan', 'Henry Sturgis Morgan', 'Morgan family', 'JPMorgan', 'JPMorgan Chase', 'Morgan Stanley'],
    publicRecordAliases: ['摩根', '摩根家族', '摩根先生', '摩根夫人', '约翰摩根', '约翰·摩根', '摩根大通', '摩根斯坦利', '摩根银行', 'Morgan', 'John Morgan', 'Henry Sturgis Morgan', 'Morgan family', 'JPMorgan', 'JPMorgan Chase', 'Morgan Stanley'],
    summary: {
      zh: '郭文贵历史公开言论中多次出现“摩根家族”“摩根先生”“摩根夫人”和 John Morgan 等称谓；同一关键词也可能指摩根大通、摩根士丹利或其他金融机构，因此检索结果必须保留原文名称和上下文，不能自动认定为同一个人或同一实体。',
      en: 'Guo Wengui historical public statements repeatedly use labels such as the Morgan family, Mr. Morgan, Mrs. Morgan, and John Morgan. The same root term may also refer to JPMorgan, Morgan Stanley, or another financial institution, so retrieval must preserve the exact wording and context rather than merge every mention into one person or entity.',
    },
    neutralNote: {
      zh: '这是内部检索档案，不证明任何家族关系、职务、组织成员身份或历史事件；具体陈述必须回到对应直播文字和时间点核对。',
      en: 'This internal retrieval dossier does not establish family relationships, offices, organizational membership, or historical events; each claim must be checked against the cited transcript and timestamp.',
    },
  },
  {
    id: 'phoenix-action',
    category: 'movement',
    labels: { zh: '凤凰城行动', en: 'Phoenix action' },
    aliases: ['凤凰城行动', '凤凰城灭牌行动', 'Phoenix action'],
    publicRecordAliases: ['凤凰城行动', '凤凰城灭牌行动', 'Phoenix action'],
    summary: {
      zh: '新中国联邦和爆料革命相关公开活动中出现的行动类关键词。',
      en: 'An action/event keyword appearing in NFSC and Whistleblower Movement public activity.',
    },
    neutralNote: {
      zh: '活动性质、参与者和影响应回到具体公开视频、帖文或活动材料核对。',
      en: 'Nature, participants, and impact should be checked against specific videos, posts, or event materials.',
    },
  },
]

const normalizedDossiers = knowledgeDossiers.map((dossier) => ({
  ...dossier,
  normalizedAliases: dossier.aliases.map((alias) => normalizeKnowledgeText(alias)).filter(Boolean),
  normalizedPublicAliases: (dossier.publicRecordAliases ?? dossier.aliases).map((alias) => normalizeKnowledgeText(alias)).filter(Boolean),
}))

export function publicRecordAliasGroupsForQuery(query) {
  return matchedDossiers(query).map((dossier) => dossier.publicRecordAliases ?? dossier.aliases)
}

export function knowledgeAliasGroupsForQuery(query) {
  return matchedDossiers(query).map((dossier) => dossier.aliases)
}

export function expandKnowledgeSearchValues(query, { publicOnly = false } = {}) {
  const values = []
  for (const dossier of matchedDossiers(query)) {
    values.push(...(publicOnly ? dossier.publicRecordAliases ?? dossier.aliases : dossier.aliases))
  }
  return [...new Set(values.filter(Boolean))]
}

export function retrieveKnowledgeDossierEvidence(query, tokens = [], language = 'zh', limit = 4) {
  const tokenList = Array.isArray(tokens) ? tokens : []
  const matches = scoredDossiers(query, tokenList)
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.dossier.labels.zh.localeCompare(right.dossier.labels.zh, 'zh-CN'))
    .slice(0, limit)

  return matches.map(({ dossier }) => {
    const zh = language !== 'en'
    const label = dossier.labels[zh ? 'zh' : 'en'] ?? dossier.labels.zh
    const summary = dossier.summary[zh ? 'zh' : 'en'] ?? dossier.summary.zh
    const note = dossier.neutralNote?.[zh ? 'zh' : 'en'] ?? dossier.neutralNote?.zh ?? ''
    const aliasText = (dossier.publicRecordAliases ?? dossier.aliases).slice(0, 10).join(zh ? '、' : ', ')
    return {
      kind: 'entity',
      title: label,
      subtitle: zh ? `内部术语档案 · ${categoryLabel(dossier.category, language)}` : `Internal term dossier · ${categoryLabel(dossier.category, language)}`,
      date: null,
      timestamp: null,
      pageNumber: null,
      sourceUrl: null,
      sourceLabel: zh ? '内部术语档案' : 'Internal term dossier',
      excerpt: zh
        ? `${summary} 常用检索别名：${aliasText}。${note}`
        : `${summary} Search aliases: ${aliasText}. ${note}`,
      excerpts: [],
      contextBefore: [],
      contextAfter: [],
      evidenceClass: zh ? '内部术语档案；用于定义和检索，不替代原始来源' : 'Internal term dossier; aids definition and retrieval, not a substitute for primary sources',
    }
  })
}

export function normalizeKnowledgeText(value) {
  return String(value ?? '').normalize('NFKC').toLocaleLowerCase('zh-CN').replace(/[\p{P}\p{S}\s]+/gu, '')
}

function matchedDossiers(query) {
  const normalizedQuery = normalizeKnowledgeText(query)
  if (!normalizedQuery) return []
  const fragments = normalizedQueryFragments(query)
  return normalizedDossiers.filter((dossier) => dossierMatches(dossier, normalizedQuery, fragments))
}

function scoredDossiers(query, tokens) {
  const normalizedQuery = normalizeKnowledgeText(query)
  const fragments = new Set([...normalizedQueryFragments(query), ...tokens.map(normalizeKnowledgeText)].filter((item) => item.length >= 2))
  return normalizedDossiers.map((dossier) => {
    let score = dossierMatches(dossier, normalizedQuery, fragments) ? 12 : 0
    for (const alias of dossier.normalizedAliases) {
      if (normalizedQuery && (normalizedQuery.includes(alias) || alias.includes(normalizedQuery))) score += Math.min(18, alias.length)
      for (const fragment of fragments) {
        if (fragment && (alias.includes(fragment) || fragment.includes(alias))) score += Math.min(10, Math.max(fragment.length, alias.length))
      }
    }
    return { dossier, score }
  })
}

function dossierMatches(dossier, normalizedQuery, fragments) {
  if (!normalizedQuery) return false
  return dossier.normalizedAliases.some((alias) => {
    if (alias.length < 2) return false
    if (normalizedQuery.includes(alias)) return true
    if (normalizedQuery.length >= 2 && alias.includes(normalizedQuery)) return true
    for (const fragment of fragments) {
      if (fragment.length >= 2 && (alias.includes(fragment) || fragment.includes(alias))) return true
    }
    return false
  })
}

function normalizedQueryFragments(query) {
  const value = String(query ?? '').normalize('NFKC').toLocaleLowerCase('zh-CN')
  const cjkStopWords = /郭文贵|直播|视频|公开言论|文字|里面|当中|谈到|提到|说过|说了什么|是什么|什么意思|如何|怎么|为什么|请|帮我|查找|搜索|关于|相关|梳理|解释|时间线|按时间|按日期|变化|观点|看法|情况|陈述|说法|发言|原文|内容|代表性|是否|有没有|分别|所有|最早|最晚|最后|最近|何时|时候|首次|第一次|计划/gu
  const cjk = value.replace(cjkStopWords, ' ').match(/[\p{Script=Han}]{2,24}/gu) ?? []
  const latinStopWords = new Set(['a', 'about', 'all', 'and', 'are', 'case', 'cases', 'did', 'do', 'find', 'for', 'how', 'in', 'is', 'latest', 'mention', 'mentions', 'of', 'on', 'said', 'say', 'the', 'to', 'was', 'were', 'what', 'when', 'where', 'which', 'who', 'why', 'with'])
  const shortLatinTerms = new Set(['bgy', 'doj', 'fbi', 'gtv', 'hid', 'sec'])
  const latin = (value.match(/[a-z0-9][a-z0-9._-]*/giu) ?? [])
    .filter((token) => (token.length >= 3 || shortLatinTerms.has(token)) && !latinStopWords.has(token))
  return [...new Set([...cjk, ...latin].map(normalizeKnowledgeText).filter(Boolean))]
}

function categoryLabel(category, language) {
  const labels = language === 'en'
    ? { person: 'person', movement: 'movement', organization: 'organization', entity: 'entity', entity_cluster: 'entity cluster', legal_case: 'legal case', term: 'term' }
    : { person: '人物', movement: '运动', organization: '组织', entity: '实体', entity_cluster: '实体群', legal_case: '法律案件', term: '名词' }
  return labels[category] ?? category
}
