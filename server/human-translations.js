import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'

const externalTranslationCache = new Map()
const maximumCachedExternalTranslations = 4

const schemaVersion = 'translation-v7'
const reviewedAt = '2026-08-15T08:00:00.000+08:00'

const translations = {
  '2a247490751890832fa5cd7285540772d84327b48f4e5a273d4219d69efeef7f': {
    reviewedAt: '2026-08-15T16:00:00.000+08:00',
    sourceTextHash: '00571d38d90a017f4a056d0219746a33cfca5bfbd2516a6b1b5a7b1a1a2d4af6',
    charCount: 2460,
    zh: [
      {
        pageNumber: 1,
        sourceTextHash: '7bd90b5c87c3be4e9216f0e41c9dbf59ed5285dfd58334e47a2397433ea6e900',
        translatedText: `美国联邦第二巡回上诉法院
刑事上诉庭审记录信息表 - Form B

由律师填写：
案件名称：United States v. Guo
案号：26-1853
律师姓名：Joshua L. Dratel / Dratel & Lewis
律师地址：29 Broadway, Suite 1412, New York, NY 10006
律师电话：(212) 732-0707

问卷
[ ] 我正在订购庭审记录。
[x] 我目前不订购庭审记录。理由：
[ ] 可取得当日副本
[ ] 美国检察官已订购
[x] 其他（附说明）

庭审记录订购
要求制作以下程序的庭审记录：
[ ] 审前程序（说明及日期）
[ ] 审判（说明及日期）
[ ] 量刑（说明及日期）
[ ] 审判后程序（说明及日期）

本人（律师姓名）在此证明，将依照《联邦上诉程序规则》10(b)，与法庭记录员妥善安排支付庭审记录费用。
付款方式：[ ] 自有资金  [ ] CJA Form 24
律师签名 / 日期

由法庭记录员填写并转交上诉法院：
确认
收到订购日期 / 预计页数 / 预计完成日期 / 法庭记录员签名 / 日期

律师须按地区法院要求提交填写完毕的表格，并向上诉法院、美国检察官办公室及法庭记录员发送副本。法庭记录员须将填写完毕的确认部分发送给上诉法院书记官。

案卷页眉：Case 26-1853，2026 年 8 月 5 日，Docket Entry 15.1，第 1 页（共 2 页）。`,
      },
      {
        pageNumber: 2,
        sourceTextHash: '4426ce59b4b2e8033ce77d6f6006603340686b6a7320d9c6c69503ab5a1e023f',
        translatedText: `DRATEL & LEWIS 律师事务所
29 Broadway, Suite 1412
New York, New York 10006
电话：(212) 732-0707
传真：(212) 571-3792
电子邮件：jdratel@dratellewis.com

Joshua L. Dratel
Lindsay A. Lewis
Amy E. Greer
Jacob C. Eisenmann
Samantha Engst-Mansilla（律师助理）

2026 年 8 月 5 日
通过 ECF 提交

致：Catherine O'Hagan Wolfe 阁下
法院书记官
美国联邦第二巡回上诉法院
Thurgood Marshall United States Courthouse
40 Foley Square
New York, NY 10007

事由：United States v. Guo，案号 26-1853（刑事）- Form B 附件

目前不订购庭审记录，理由如下：(a) 大部分庭审记录，包括完整的审判记录，已经制作；(b) 本人今天同时提出解除代理的动议。如果该动议获准，本人认为较为审慎的做法是，让新任律师判断是否仍缺少任何庭审记录，以及这些记录是否为本次上诉所必需。

谨此提交，
Joshua L. Dratel
上诉人 Miles Guo 的律师

案卷页眉：Case 26-1853，2026 年 8 月 5 日，Docket Entry 15.1，第 2 页（共 2 页）。`,
      },
    ],
  },
  'a781d25e830828f456e86790347c783c823daa38afd4a630dd7aa7e245bf5e9a': {
    reviewedAt: '2026-08-15T16:15:00.000+08:00',
    sourceTextHash: '24e22c798078d4eb6de2812d88477c2ca3f1cc588e4116a58073aada2122246e',
    charCount: 1664,
    zh: [
      {
        pageNumber: 1,
        sourceTextHash: '24e22c798078d4eb6de2812d88477c2ca3f1cc588e4116a58073aada2122246e',
        translatedText: `美国纽约东区联邦地区法院

关于 Rui Hao 依据《美国法典》第 28 编第 1782 条申请命令，为境外程序取得证据

命令
案号：26-MC-2795 (NCM) (CHK)

美国联邦治安法官 CLAY H. KAMINSKY：

申请人 Rui Hao 依据《美国法典》第 28 编第 1782 条向本院提出申请，请求授权其取得 Ho Wan Kwok（又名 Miles Guo，以下称“Kwok”）的证言。Kwok 的登记编号为 49134-510，目前被羁押于大都会拘留中心（MDC Brooklyn）。该申请获准。

本院认定：(1) Kwok 居住于或可在本司法辖区找到；(2) 所请求的证据将用于外国审理机构正在进行的境外程序；(3) 证据申请由利害关系人提出。参见 Brandi-Dohrn v. IKB Deutsche Industriebank AG, 673 F.3d 76, 80 (2d Cir. 2012)。本院亦权衡了 Intel Corp. v. Advanced Micro Devices, Inc., 542 U.S. 241, 264-65 (2004) 所列因素，因而批准 Hao 的申请。

据此，准许申请人于 2026 年 7 月 22 日及 23 日通过视频会议方式取得 Kwok 的证言，以用于英属维尔京群岛的审判。

本院命令 MDC Brooklyn 及美国联邦监狱管理局安排 Ho Wan Kwok（登记编号 49134-510）于 2026 年 7 月 22 日及 23 日通过视频会议作证，并与申请人的律师协调其出庭安排。

特此命令。

/s/ Clay H. Kaminsky
CLAY H. KAMINSKY
美国联邦治安法官

日期：2026 年 7 月 9 日
地点：纽约州布鲁克林

案卷页眉：Case 1:26-mc-02795-NCM-CHK，Document 3，2026 年 7 月 9 日提交，第 1 页（共 1 页），PageID 45。`,
      },
    ],
  },
  '36e722d925cc833991f1fcfc53192591978d3b8c851f3b37b67450de5f006043': {
    reviewedAt: '2026-08-15T16:20:00.000+08:00',
    sourceTextHash: '63a3fcda657f0fc3c77f4b310c5b31e9b5bcb0fd07357d3ae4be486b90e89a55',
    charCount: 1141,
    zh: [
      {
        pageNumber: 1,
        sourceTextHash: '63a3fcda657f0fc3c77f4b310c5b31e9b5bcb0fd07357d3ae4be486b90e89a55',
        translatedText: `美国康涅狄格联邦地区法院

关于：KWOK，债务人
破产案号：22-50073 (JAM)
附属诉讼案号：22-5032
民事案号：3:23-CV-00102 (KAD)

HO WAN KWOK，债务人兼上诉人，
诉
PACIFIC ALLIANCE ASIA OPPORTUNITY FUND L.P. 与 LUC A. DESPINS，被上诉人。

判决

本案因对破产法院裁定提出上诉而提交本院，由美国联邦地区法官 Kari A. Dooley 审理。本院已经考虑全部案卷记录和适用法律原则，并于 2024 年 9 月 30 日签发命令，维持破产法院批准被上诉人初步禁令动议的各项命令，同时指示作出有利于被上诉人的判决。

据此，本院现命令、裁判并宣告：判决被上诉人胜诉，本案结案。

2024 年 9 月 30 日，康涅狄格州布里奇波特。

书记官：DINAH MILTON KINNEY
代理签署：/s/ Kristen Gould
Kristen Gould，副书记官
录入日期：2024 年 9 月 30 日

地区法院案卷页眉：Case 3:23-cv-00102-KAD，Document 66，2024 年 9 月 30 日提交，第 1 页（共 1 页）。
破产法院案卷页眉：Case 22-05032，Doc 214，2024 年 10 月 1 日提交并于 17:12:33 录入，第 1 页（共 1 页）。`,
      },
    ],
  },
  'c9dcdcc7081cde8ed0cf6b0e4df7ab956e1af1fac830cb259f2664b1cecea4bb': {
    reviewedAt: '2026-08-15T16:30:00.000+08:00',
    sourceTextHash: '375ac84e611641ca06266a1c04d220445740db7b90199a20fc1e85a5bfc4d002',
    charCount: 1061,
    zh: [
      {
        pageNumber: 1,
        sourceTextHash: '375ac84e611641ca06266a1c04d220445740db7b90199a20fc1e85a5bfc4d002',
        translatedText: `美国纽约南区联邦地区法院

美利坚合众国
诉
HO WAN KWOK，被告。

案号：23 Cr. 118-1 (AT)
命令

美国联邦地区法官 ANALISA TORRES：

2023 年 8 月 30 日，被告 Ho Wan Kwok 请求本院“签发命令和令状，中止题为 In re Ho Wan Kwok, et al. 的破产案件 [案号 22-50073]（康涅狄格破产法院，合并管理），包括合并管理的 In re Genever Holdings Corp. [案号 22-50542]、In re Genever Holdings LLC [案号 22-50592]，以及所有相关附属诉讼。”参见 ECF No. 129；另见 ECF Nos. 130-31。

据此，本院命令：

1. 检方应于 2023 年 9 月 21 日前提交反对文件，或者告知本院其不反对该动议；
2. 被告如需提交答复，应于 2023 年 10 月 5 日前提交。

特此命令。

日期：2023 年 8 月 31 日
地点：纽约州纽约市

ANALISA TORRES
美国联邦地区法官

案卷页眉：Case 1:23-cr-00118-AT，Document 132，2023 年 8 月 31 日提交，第 1 页（共 1 页）。`,
      },
    ],
  },
  '2dadd0092fffcdf7f4b2ae870f6d68445379a8e1260f48a6f00583fedd7868f3': {
    reviewedAt: '2026-08-15T16:32:00.000+08:00',
    sourceTextHash: '4a285a481e7b2eb67284ca15a0c5b2d4edf3f231bc208503cb059c0eba13434b',
    charCount: 3658,
    zh: [
      {
        pageNumber: 1,
        sourceTextHash: '12ca870a08eb7b6c06301f45e4fe59646c2fb5af96f4f8316b01a15586f55390',
        translatedText: `美国康涅狄格破产法院

关于：HO WAN KWOK 等债务人
第 11 章
案号：22-50073 (JAM)（合并管理）
相关文件：ECF No. 1805

命令 GTV MEDIA, INC.、SARACA MEDIA GROUP, INC. 及律师 AARON A. MITCHELL 出庭，并说明为何不应认定 GTV MEDIA, INC. 与 SARACA MEDIA GROUP, INC. 构成民事藐视法庭

2023 年 5 月 18 日，Luc A. Despins 以 Ho Wan Kwok 破产财产第 11 章受托人（“受托人”）身份提交动议，请求法院命令 GTV Media, Inc.、Saraca Media Group, Inc. 与 G-Club Operations LLC 遵守 Rule 2004 传票；并请求认定 G-Club US Operations LLC、G-Club US Operations, Inc.、Hudson Diamond NY LLC、Hudson Diamond Holding LLC、G-Fashion LLC、GNews LLC、US Himalaya Capital Inc.、New York MOS Himalaya LLC、Crane Advisory Group LLC 与 Maywind Trading LLC 因未答复 Rule 2004 传票而构成民事藐视法庭（相关部分下称“藐视动议”）（ECF No. 1805）。

法院于 2023 年 6 月 6 日就藐视动议举行听证。

虽然藐视动议请求强制 GTV Media Inc.（“GTV”）与 Saraca Media Group, Inc.（“Saraca”）提供材料，但在 6 月 6 日听证中，受托人告知法院，其请求认定 GTV 与 Saraca 构成藐视法庭，因为两者虽然起初答复了向其发出的传票，但自 2022 年 12 月以来未再答复。受托人还请求法院命令律师 Aaron A. Mitchell 出庭，就 GTV 与 Saraca 作证。

脚注 1：这些第 11 章案件中的债务人为 Ho Wan Kwok（又名 Guo Wengui、Miles Guo、Miles Kwok 及其他别名，税号末四位 9595）、Genever Holdings LLC（税号末四位 8202）及 Genever Holdings Corporation。仅为通知和通信目的，受托人、Genever Holdings LLC 与 Genever Holdings Corporation 的邮寄地址为：Paul Hastings LLP, 200 Park Avenue, New York, NY 10166，转 Luc A. Despins（Ho Wan Kwok 破产财产受托人）。

案卷页眉：Case 22-50073，Doc 1893，2023 年 6 月 7 日提交并于 16:57:22 录入，第 1 页（共 2 页）。`,
      },
      {
        pageNumber: 2,
        sourceTextHash: 'de52b3922b44adad91670d7b748b27bb99bd9183e60e22f8048a2a24414a605d',
        translatedText: `藐视动议第 24 至 33 段详细说明受托人就发给 GTV 和 Saraca 的 Rule 2004 传票，与 GTV、Saraca 及 Mitchell 律师之间的沟通。藐视动议所附 Avram E. Luft 声明的附件 C-1、C-2、D-1、D-2、E 和 F 用以支持受托人的主张。受托人的送达证明显示，藐视动议已送达 GTV 与 Saraca（ECF No. 1826）。

据此，本院命令：

GTV Media Inc.（“GTV”）应由一名高管、董事、成员或管理人员代表出庭；Saraca Media Group, Inc.（“Saraca”）应由一名高管、董事、成员或管理人员代表出庭；律师 Aaron A. Mitchell 也须本人出庭。三者应于 2023 年 7 月 18 日中午 12:30，在美国康涅狄格破产法院（915 Lafayette Boulevard, Bridgeport, CT 06604）出庭，说明本院为何不应因 GTV 与 Saraca 未答复或遵守本院授权的传票，而认定两家公司构成民事藐视法庭。

本院进一步命令：受托人应于 2023 年 6 月 9 日前将本命令送达 GTV、Saraca 及 Mitchell 律师，并于 2023 年 6 月 12 日前提交送达证明，以证明已遵守本命令。

2023 年 6 月 7 日，康涅狄格州布里奇波特。

Julie A. Manning
美国联邦破产法官
康涅狄格地区

案卷页眉：Case 22-50073，Doc 1893，2023 年 6 月 7 日提交并于 16:57:22 录入，第 2 页（共 2 页）。`,
      },
    ],
  },
  'edbe4ef08d112b1a9eb09e7e4b0dfe28605460297cad08d731bab4925fa6cb7c': {
    reviewedAt: '2026-08-15T16:35:00.000+08:00',
    sourceTextHash: 'dede2af3976a6aba6da9964aad42cdbad1783fad605dee092d2151ce18dfdc47',
    charCount: 4326,
    zh: [
      {
        pageNumber: 1,
        sourceTextHash: 'ff7f2005c464d32394242327a0e7b028005f9617675f24eeb9d05d35546d0eff',
        translatedText: `美国康涅狄格破产法院布里奇波特分庭

关于：HO WAN KWOK 等债务人
第 11 章
案号：22-50073 (JAM)
相关文件：ECF No. 1806
合并管理

批准第 11 章受托人将以下文件的完整未删节版本及部分附件密封提交的命令：(A) 受托人请求法院命令 GTV Media Group, Inc.、Saraca Media Group, Inc. 与 G-Club Operations LLC 遵守 Rule 2004 传票，并请求认定 G-Club US Operations LLC、G-Club US Operations Inc.、Hudson Diamond NY LLC、Hudson Diamond Holding LLC、G-Fashion LLC、GNews LLC、US Himalaya Capital Inc.、New York MOS Himalaya LLC、Crane Advisory Group LLC 与 Maywind Trading LLC 因未答复 Rule 2004 传票而构成民事藐视法庭的动议；以及 (B) 该动议的若干附件

法院审议了第 11 章受托人 Luc A. Despins（“受托人”）提出的动议（“密封动议”）。受托人请求批准将强制履行动议，以及该动议引用并附于 Luft 声明的“特权附件”和“可能受特权保护的附件”密封提交。法院认定已说明正当理由，并认定这些附件的提交方式符合相关当事方依据保护令和特权命令形成的协议与预期；相关保护措施已为上述目的作出狭义限定。

脚注 1：这些第 11 章案件中的债务人为 Ho Wan Kwok（又名 Guo Wengui、Miles Guo、Miles Kwok 及其他别名，税号末四位 9595，称“债务人”）及 Genever Holdings Corporation（“Genever BVI 债务人”）。仅为通知和通信目的，受托人及 Genever BVI 债务人的邮寄地址为 Paul Hastings LLP, 200 Park Avenue, New York, NY 10166，转 Luc A. Despins（Ho Wan Kwok 破产财产受托人）。

脚注 2：本命令未另行定义的首字母大写术语，沿用密封动议中的定义。

案卷页眉：Case 22-50073，Doc 1889，2023 年 6 月 7 日提交并于 12:14:14 录入，第 1 页（共 3 页）。`,
      },
      {
        pageNumber: 2,
        sourceTextHash: 'b2881bf1ab224a54fb89daed718a80d10352a760fafb274677a394f9e44bbcb1',
        translatedText: `在 2023 年 6 月 6 日举行听证后，法院认定已具备正当理由，现命令如下：

1. 依本命令所述范围，批准密封动议；

2. 授权受托人将强制履行动议、其中引用并附于 Luft 声明的“特权附件”与“可能受特权保护的附件”的未删节版本密封提交。除非法院以后另行批准，这些附件应持续密封，不得向公众开放；

3. 受托人还可在法院案卷上提交并向其他利害关系方送达上述两份附件的删节版本；删节版本可删除保护令所称的“指定材料”；

4. 如有必要，即使特权命令存在限制，法院也允许受托人将“可能受特权保护的附件”密封提交；

5. 依据《美国法典》第 11 编第 107(c)(3) 条，美国受托人对本案案卷中提交或交由法院的任何信息和/或文件享有法定完整查阅权；美国受托人须遵守第 107(c)(3)(B) 条规定的义务；

6. 本命令各项条款自录入时立即生效并可执行；

7. 授权受托人采取落实本命令所授救济所需的一切行动。

案卷页眉：Case 22-50073，Doc 1889，2023 年 6 月 7 日提交并于 12:14:14 录入，第 2 页（共 3 页）。`,
      },
      {
        pageNumber: 3,
        sourceTextHash: 'c58f020fc3b8f76d49e9a6b2f73b9bcd6b9e73377a2555840a33c7c7e4afed71',
        translatedText: `8. 对因解释或执行本命令而产生或与之相关的一切事项，本院保留管辖权。

2023 年 6 月 7 日，康涅狄格州布里奇波特。

Julie A. Manning
美国联邦破产法官
康涅狄格地区

案卷页眉：Case 22-50073，Doc 1889，2023 年 6 月 7 日提交并于 12:14:14 录入，第 3 页（共 3 页）。`,
      },
    ],
  },
  '7d9a6cef4dc318c861d78e632a96847301fec565a66ea69ea53d198ea85ea185': {
    reviewedAt: '2026-08-15T16:38:00.000+08:00',
    sourceTextHash: '8615a7974626388aff892c8a09aa2de39e658e7700762c1f85ca8d52d92f8c7b',
    charCount: 2080,
    zh: [
      {
        pageNumber: 1,
        sourceTextHash: '8615a7974626388aff892c8a09aa2de39e658e7700762c1f85ca8d52d92f8c7b',
        translatedText: `美国纽约南区联邦地区法院

ZHENGJUN DONG 以个人身份并代表所有处境相同者等，原告，
诉
GTV MEDIA GROUP, INC. 等，被告。

案号：1:25-cv-9815-GHW
命令

美国联邦地区法官 GREGORY H. WOODS：

2025 年 11 月 25 日，异议方美国证券交易委员会（SEC）依据《美国法典》第 28 编第 1442(a) 条，将原告在底层州法院案件中提出的、要求强制遵守传票的动议移送至本联邦地区法院（Dkt. No. 1）。

2025 年 12 月 18 日，原告提交自愿撤诉通知，请求依据《联邦民事诉讼规则》41(a)(1)(A)(i)，在不妨碍以后再次提出的前提下，撤销“上述涉及原告在底层州法院案件中向美国证券交易委员会送达传票并请求强制其遵守的诉讼”（Dkt. No. 13）。

原告与异议方均未说明 SEC 移送的该事项是否已经解决。因此，法院命令各方最迟于 2025 年 12 月 19 日下午 5:00 前提交信函，向法院说明底层强制履行传票动议的状态。在法院另行命令前，书记官不得关闭本案。

特此命令。

日期：2025 年 12 月 18 日
地点：纽约州纽约市

GREGORY H. WOODS
美国联邦地区法官

案卷页眉：Case 1:25-cv-09815-GHW，Document 15，2025 年 12 月 18 日提交，第 1 页（共 1 页）。`,
      },
    ],
  },
}

export function humanDocumentTranslation(file, extraction, lang = 'zh') {
  if (lang !== 'zh' || !file?.sha256 || !extraction?.textHash) return null
  const record = translationRecord(file.sha256)
  if (!record || record.sourceTextHash !== extraction.textHash) return null
  const pages = record.zh.map((page) => ({
    ...page,
    translatedTextHash: createHash('sha256').update(page.translatedText).digest('hex'),
    contentIntegrity: 'version_locked_complete',
  }))
  const translatedText = pages.map((page) => page.translatedText).join('\n\n')
  return {
    schemaVersion,
    sourceUrl: file.url,
    sourceSha256: file.sha256,
    status: 'translated',
    targetLanguage: 'Chinese',
    mode: 'Version-locked reviewed translation',
    translatedAt: record.reviewedAt ?? reviewedAt,
    reviewedAt: record.reviewedAt ?? reviewedAt,
    reviewMethod: 'model_assisted_editorial_review',
    textHash: record.sourceTextHash,
    translationHash: createHash('sha256').update(translatedText).digest('hex'),
    charCount: record.charCount,
    coverage: 'complete',
    translatedText,
    pageTranslations: pages,
    contentIntegrity: 'version_locked_complete',
  }
}

export function humanTranslationCacheFilename(sourceSha256, textHash, lang = 'zh') {
  return `${createHash('sha1').update(JSON.stringify({ version: schemaVersion, provider: 'version_locked_translation', lang, sourceSha256, textHash })).digest('hex')}.json`
}

export function humanTranslationRecords() {
  return [
    ...Object.entries(translations).map(([sourceSha256, record]) => ({ sourceSha256, ...record })),
    ...externalTranslationSourceHashes()
      .map((sourceSha256) => ({ sourceSha256, ...translationRecord(sourceSha256) }))
      .filter((record) => record.status === 'complete'),
  ]
}

function translationRecord(sourceSha256) {
  if (translations[sourceSha256]) return translations[sourceSha256]
  if (!/^[a-f0-9]{64}$/.test(sourceSha256)) return null
  if (externalTranslationCache.has(sourceSha256)) {
    const cached = externalTranslationCache.get(sourceSha256)
    externalTranslationCache.delete(sourceSha256)
    externalTranslationCache.set(sourceSha256, cached)
    return cached
  }
  let record
  try {
    record = JSON.parse(readFileSync(new URL(`./human-translations/${sourceSha256}.json`, import.meta.url), 'utf8'))
  } catch (error) {
    if (error?.code === 'ENOENT') return null
    throw error
  }
  if (record.sourceSha256 !== sourceSha256) throw new Error(`Version-locked translation registry mismatch: ${sourceSha256}`)
  if (record.status !== 'complete') return null
  externalTranslationCache.set(sourceSha256, record)
  if (externalTranslationCache.size > maximumCachedExternalTranslations) {
    externalTranslationCache.delete(externalTranslationCache.keys().next().value)
  }
  return record
}

function externalTranslationSourceHashes() {
  try {
    return readdirSync(new URL('./human-translations/', import.meta.url))
      .filter((filename) => /^[a-f0-9]{64}\.json$/.test(filename))
      .map((filename) => filename.slice(0, -5))
  } catch (error) {
    if (error?.code === 'ENOENT') return []
    throw error
  }
}
