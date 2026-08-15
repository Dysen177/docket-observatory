import { readFileSync } from 'node:fs'

const reviewedAt = '2026-08-14T00:00:00.000+08:00'
const externalResearchCache = new Map()
const maximumCachedExternalResearch = 16

const documentResearch = {
  'sdny-23-cr-118:19': report({
    sha256: '38aaed7528115aa0cf7f18e0f273ba1e0bc06b2850303ea4901f792073468f47',
    posture: 'government_allegations',
    en: {
      summary: 'This 40-page indictment is a historical charging instrument. It alleges a multi-program fraud and money-laundering scheme involving Ho Wan Kwok, Kin Ming Je, Yanping Wang, and GTV, G Clubs, G Fashion, the Himalaya Exchange, Rule of Law organizations, Farms, and related entities. It is not a judicial finding and it was not the final S3 superseding indictment reflected in the judgment.',
      plainEnglish: 'Think of this document as the prosecution\'s detailed accusation and roadmap, not the verdict. It explains what prosecutors said happened and how they connected people, companies, accounts, and investment programs. Later jury findings and the final judgment, not this indictment alone, determine which accusations became convictions.',
      legalReading: [
        'Pages 1-3 plead the government\'s overall conspiracy theory and alleged use of interrelated entities and more than 500 accounts.',
        'Pages 4-6 assign alleged roles to the defendants and entities. Statements that a person functionally owned or controlled an entity remain allegations at this procedural stage.',
        'Pages 6-12 begin the program-specific allegations concerning the GTV private placement, Farm Loan Program, and G Clubs.',
        'Pages 34-40 plead forfeiture and substitute-property theories. Those requests are not self-executing and must be compared with later forfeiture orders.',
        'Because the final judgment identifies an S3 superseding indictment, this filing should be used for charging history, not as the final count map for conviction or appeal.',
      ],
      caseConnections: [
        'Compare the pleaded GTV, Farm Loan, G Clubs, and Himalaya theories with the jury verdict, Doc 858 forfeiture order, Doc 860 judgment, and Doc 864 sentencing findings.',
        'Entity and control allegations overlap with the SEC action and bankruptcy trustee complaints, but each forum has different parties, standards, and remedies.',
      ],
      whyItMatters: [
        'It is a useful index of the prosecution\'s original factual and entity theory.',
        'It cannot establish ownership, control, victim status, loss, or guilt without later evidence and adjudication.',
      ],
      verificationTasks: [
        'The S3 superseding indictment is now collected and separately reviewed as Doc 307; preserve the count-by-count comparison with this historical indictment.',
        'Use PACER or RECAP to authenticate both docket entries because the local copies are from an NFSC backup mirror.',
      ],
      riskFlags: [
        'Government allegations are not court findings.',
        'The mirror description and filename are secondary metadata; the PDF caption and later docket control.',
      ],
      findings: [
        finding('summary', 'The grand jury alleged a broad conspiracy involving multiple investment programs, entities, and cross-border accounts.', [1, 2, 3]),
        finding('legalReading', 'The filing alleges functional ownership or control of GTV, G Clubs, and related entities; at indictment stage those assertions are accusations.', [4, 5, 6]),
        finding('caseConnections', 'The GTV private-placement and Farm Loan allegations begin at pages 6-11 and should be reconciled with later acquittals, convictions, and sentencing findings.', [6, 8, 9, 10, 11]),
        finding('riskFlags', 'This indictment predates the S3 superseding indictment identified in the final judgment and is not the final trial count map.', [1]),
      ],
    },
    zh: {
      summary: '这份 40 页起诉书属于历史性的控方指控文件。检方把郭文贵、Je Kin Ming、王雁平，以及 GTV、G Clubs、G Fashion、Himalaya Exchange、法治组织、各 Farm 和相关实体纳入一套欺诈与洗钱指控框架。它不是法院认定，而且并非最终判决所引用的 S3 替代起诉书。',
      plainEnglish: '可以把它理解成检方写给法院的“详细指控书和路线图”，而不是裁判结果。它说明检方认为发生了什么、人物和公司如何关联、资金如何流转。哪些指控最终成立，要看后续陪审团裁决和正式判决，不能只看这份起诉书。',
      legalReading: [
        '第 1-3 页提出检方的整体合谋理论，并指称相关人员使用相互关联的实体和 500 多个账户。',
        '第 4-6 页描述被告与实体的被指控角色；所谓“实际所有”或“控制”在该程序阶段仍只是检方主张。',
        '第 6-12 页开始分别陈述 GTV 私募、Farm Loan Program 和 G Clubs 的指控。',
        '第 34-40 页提出没收及替代财产理论；这些请求不会因写入起诉书就自动生效，必须与后续没收令对照。',
        '正式判决引用的是 S3 替代起诉书，因此本文件用于了解指控沿革，不能作为定罪和上诉的最终罪名表。',
      ],
      caseConnections: [
        '应把 GTV、Farm Loan、G Clubs 和 Himalaya 的指控与陪审团裁决、Doc 858 没收裁定、Doc 860 判决及 Doc 864 量刑认定逐项对照。',
        '实体和控制关系指控与 SEC 案及破产受托人诉讼重叠，但各程序的当事人、证明标准和救济不同。',
      ],
      whyItMatters: ['它是理解检方最初事实理论和实体网络的重要索引。', '它不能单独证明所有权、控制、受害人身份、损失额或有罪。'],
      verificationTasks: ['现已收集并单独审阅 S3 替代起诉书 Doc 307；应保留与本历史起诉书的逐项罪名对照。', '两份本地副本均来自 NFSC 备用镜像，应使用 PACER 或 RECAP 核验案卷真实性。'],
      riskFlags: ['检方指控不等于法院认定。', '镜像标题和文件名只是辅助元数据，应以 PDF 案名页和后续正式案卷为准。'],
      findings: [
        finding('summary', '大陪审团指控一项横跨多个投资项目、实体和境外账户的广泛合谋。', [1, 2, 3]),
        finding('legalReading', '文件指称郭实际所有或控制 GTV、G Clubs 等实体；在起诉阶段，这些仍属于控方指控。', [4, 5, 6]),
        finding('caseConnections', 'GTV 私募和 Farm Loan 指控见第 6-11 页，应与后续无罪、定罪及量刑认定对照。', [6, 8, 9, 10, 11]),
        finding('riskFlags', '本文件早于正式判决所列的 S3 替代起诉书，不能作为最终审判罪名表。', [1]),
      ],
    },
  }),
  'sdny-23-cr-118:307': report({
    sha256: 'd46c05eb53757ef0f35f5f247c24bf0fea93dd049646d39bf8189e45c6c95e9d',
    posture: 'government_allegations',
    researchQuality: 'body_verified',
    en: {
      summary: 'This 48-page S3 superseding indictment, filed April 24, 2024, is the principal charging instrument for the trial of Miles Guo, Kin Ming Je, and Yvette Wang. It alleges a G Enterprise spanning GTV, the Farm Loan Program, G|CLUBS, the Himalaya Exchange, and numerous related entities, and pleads thirteen counts plus forfeiture allegations. It is a prosecution pleading, not a judicial finding; the jury verdict and judgment control the adjudicated result.',
      plainEnglish: 'Think of this document as the prosecution\'s final trial blueprint. It lays out who the government said was involved, which programs it said collected money, how the entities and accounts were connected, and what property it asked to forfeit. A blueprint is not the finished building: the indictment states accusations, while the jury verdict determines the counts proved against Miles Guo and the judgment determines the sentence and operative forfeiture.',
      legalReading: [
        'Pages 1-6 define the alleged G Enterprise, its alleged purposes and methods, and the government\'s claimed use of more than approximately 500 accounts associated with at least 80 entities or individuals. These are pleaded allegations.',
        'Pages 7-9 plead alleged roles and relationships: Guo as the alleged leader, Je as an alleged financial architect, Wang as an alleged chief of staff, and alleged functional control of GTV and G|CLUBS. Formal titles, beneficial ownership, and control remain contested factual propositions at the indictment stage.',
        'Pages 10-18 describe the GTV Private Placement, Farm Loan Program, and G|CLUBS allegations. The pleaded category amounts are more than approximately $400 million, $150 million, and $250 million respectively; they are not automatically additive and do not themselves establish legally recoverable loss.',
        'Pages 19-24 describe the Himalaya Exchange allegations, including HCN/HDO representations, the alleged $262 million category amount, alleged yacht-related transfers, and alleged seizures. These assertions must be separated from later trial findings and forfeiture rulings.',
        'Pages 27-40 set out the thirteen-count charging structure: RICO conspiracy; wire/bank-fraud conspiracy; money-laundering conspiracy; securities-fraud conspiracy; substantive GTV, Farm Loan, G|CLUBS, and Himalaya counts; an unlawful monetary transaction count; and an obstruction count against Je. The Miles Guo verdict covers Counts 1-12, not Je\'s Count 13.',
        'Pages 41-48 plead forfeiture under several statutes, identify specific bank accounts and property, and reserve substitute-asset relief. A forfeiture allegation requests relief; it does not itself transfer title or decide third-party ownership.',
      ],
      caseConnections: [
        'Compare the S3 count map with Doc 395: the jury found Miles Guo guilty on Counts 1-4 and 7-11 and not guilty on Counts 5, 6, and 12.',
        'Read with Doc 860 for the judgment and Doc 864 for sentencing findings. The sentencing court\'s loss and forfeiture findings are not additional convictions and use different procedures and standards.',
        'The alleged entity and money-flow map overlaps with the SEC action and bankruptcy trustee complaints, but those proceedings have different parties, elements, burdens of proof, and remedies.',
      ],
      whyItMatters: [
        'It is the operative trial-era charging framework and the best source for understanding how the prosecution grouped programs, entities, people, and legal theories.',
        'It prevents a common error: treating every allegation and every amount in the indictment as a separate proven loss or as a court finding.',
      ],
      verificationTasks: [
        'Authenticate the public PDF against PACER or a RECAP docket record; this local English copy is an NFSC backup mirror.',
        'Compare any PACER version, redactions, amendments, and incorporated orders with the 48-page public copy.',
        'Keep the pleaded program amounts separate from the jury verdict, Guidelines loss, forfeiture money judgment, SEC remedies, and bankruptcy claims.',
      ],
      riskFlags: [
        'Every factual assertion in this document is a government allegation unless separately adopted in a later ruling.',
        'The GTV, Farm Loan, G|CLUBS, Himalaya, and overall alleged amounts may overlap; they must not be summed without a transaction-level reconciliation.',
        'The specific-property and substitute-asset sections are requests for forfeiture relief, not a final adjudication of ownership or title.',
        'OCR recovered the scanned body locally. Page coverage is complete, but the source PDF remains a mirror copy and key legal wording should be checked against the original docket file.',
      ],
      findings: [
        finding('summary', 'The S3 indictment alleges a multi-entity G Enterprise and a fraud scheme exceeding approximately $1 billion, while identifying thirteen counts and forfeiture theories.', [1, 3, 27, 40, 41]),
        finding('legalReading', 'The indictment describes alleged roles, functional control, and entity relationships, but those statements are allegations at the charging stage.', [7, 8, 9]),
        finding('legalReading', 'The pleaded program categories are more than approximately $400 million for GTV, $150 million for the Farm Loan Program, $250 million for G|CLUBS, and $262 million for the Himalaya Exchange; the document does not make those figures a non-overlapping total.', [10, 13, 15, 19]),
        finding('caseConnections', 'The substantive count map includes GTV, Farm Loan, G|CLUBS, and Himalaya counts, while Count 12 concerns an alleged $100 million transaction and Count 13 charges Je with obstruction.', [32, 33, 35, 36, 37, 38, 39, 40]),
        finding('riskFlags', 'The forfeiture section lists specific money and property and preserves substitute-asset theories, but an indictment is not an operative forfeiture order.', [41, 45, 46, 47, 48]),
      ],
    },
    zh: {
      summary: '这份 48 页的 S3 替代起诉书于 2024 年 4 月 24 日提交，是 Miles Guo、Kin Ming Je 和 Yvette Wang 接受审判时的主要控罪文件。文件指称一个横跨 GTV、Farm Loan Program、G|CLUBS、Himalaya Exchange 及大量相关实体的“G Enterprise”，并提出 13 项罪名及没收请求。它是检方诉状，不是法院认定；对 Miles Guo 已被裁判的结果，应以陪审团裁决和正式判决为准。',
      plainEnglish: '可以把它理解成检方为审判准备的“最终控罪蓝图”。它说明检方认为谁参与其中、哪些项目收取了资金、实体和账户如何关联，以及检方请求没收哪些财产。但蓝图不是建成后的房屋：起诉书只表达指控，陪审团裁决决定针对 Miles Guo 哪些罪名被证明，正式判决决定刑罚和具有操作效力的没收结果。',
      legalReading: [
        '第 1-6 页定义检方所称的 G Enterprise、其目的和手段，并指称使用了 500 多个账户、涉及至少 80 个实体或个人。这些都是诉状中的检方主张。',
        '第 7-9 页提出被指控的角色和关系：检方称郭是领导者、Je 是资金架构和洗钱关键人物、王是幕僚长，并指称 GTV 和 G|CLUBS 存在实际控制。正式职务、受益所有权和控制关系在起诉阶段仍是争议事实。',
        '第 10-18 页陈述 GTV 私募、Farm Loan Program 和 G|CLUBS 指控。文件分别写成超过约 4 亿美元、1.5 亿美元和 2.5 亿美元；这些类别金额可能存在重叠，不能自动相加，也不能单凭起诉书证明法律上的可追回损失。',
        '第 19-24 页陈述 Himalaya Exchange 指控，包括 HCN/HDO 的表述、约 2.62 亿美元类别金额、被指称的游艇相关转移和查扣。这些内容必须与后来的审判认定和没收裁定分开。',
        '第 27-40 页列出 13 项罪名结构：RICO 合谋、电汇/银行欺诈合谋、洗钱合谋、证券欺诈合谋、GTV、Farm Loan、G|CLUBS 和 Himalaya 的具体罪名、非法货币交易，以及针对 Je 的妨碍司法罪。Miles Guo 的陪审团裁决覆盖第 1-12 项，不包括针对 Je 的第 13 项。',
        '第 41-48 页依据多项法律提出没收请求，列出具体银行账户和财产，并保留替代财产理论。没收请求本身不会自动转移产权，也不会裁判第三方所有权。',
      ],
      caseConnections: [
        '应把 S3 罪名表与 Doc 395 对照：陪审团裁定 Miles Guo 第 1-4、7-11 项有罪，第 5、6、12 项无罪。',
        '应与 Doc 860 正式判决和 Doc 864 量刑记录一起阅读。量刑法院的损失额和没收认定不是新增定罪，其程序和证明标准也不同。',
        '起诉书中的实体和资金流关系与 SEC 案及破产受托人诉讼存在事实重叠，但各程序的当事人、构成要件、证明责任和救济不同。',
      ],
      whyItMatters: [
        '它是审判阶段的操作性控罪框架，是理解检方如何组合项目、实体、人物和法律理论的核心文件。',
        '它能避免一个常见错误：把起诉书中的每项指控和每个金额都当成已证明的独立损失或法院认定。',
      ],
      verificationTasks: [
        '通过 PACER 或 RECAP 案卷记录核验正式副本；本地英文版来自 NFSC 备用镜像。',
        '将 PACER 版本、删节情况、修订文件及引用的关联命令与本地 48 页公开副本逐项比较。',
        '把起诉书中的项目金额与陪审团裁决、量刑指南损失额、没收金钱判决、SEC 救济和破产请求分开核对。',
      ],
      riskFlags: [
        '除非后续裁定明确采纳，本文件的事实陈述都属于检方指控。',
        'GTV、Farm Loan、G|CLUBS、Himalaya 及总额指称可能互相重叠；没有逐笔交易核对就不得相加。',
        '具体财产和替代财产部分是没收请求，不是对所有权或产权的终局裁判。',
        '扫描正文由本地 OCR 恢复，48 页覆盖完整；但来源仍是镜像文件，关键法律措辞应回到正式案卷核对。',
      ],
      findings: [
        finding('summary', 'S3 起诉书指称一个跨多个实体的 G Enterprise 及超过约 10 亿美元的欺诈方案，并列出 13 项罪名和没收理论。', [1, 3, 27, 40, 41]),
        finding('legalReading', '起诉书描述被指控的角色、实际控制和实体关系，但在控罪阶段这些仍是指控。', [7, 8, 9]),
        finding('legalReading', '起诉书分别指称 GTV 超过约 4 亿美元、Farm Loan Program 1.5 亿美元、G|CLUBS 2.5 亿美元、Himalaya Exchange 2.62 亿美元；文件没有把这些金额确定为互不重叠的总额。', [10, 13, 15, 19]),
        finding('caseConnections', '具体罪名包括 GTV、Farm Loan、G|CLUBS 和 Himalaya 相关罪名；第 12 项涉及被指称的 1 亿美元交易，第 13 项针对 Je 提出妨碍司法指控。', [32, 33, 35, 36, 37, 38, 39, 40]),
        finding('riskFlags', '没收部分列出具体资金和财产并保留替代财产理论，但起诉书不是具有操作效力的没收裁定。', [41, 45, 46, 47, 48]),
      ],
    },
  }),
  'sdny-23-cr-118:395': report({
    sha256: 'c0dfe072d7b8714c2adb69ba963ebfc762232231d494dca73bc8198c714fcb91',
    posture: 'jury_verdict',
    researchQuality: 'body_verified',
    en: {
      summary: 'This three-page verdict form, filed July 18, 2024, records the jury\'s verdict as to Miles Guo under the S3 indictment. The jury marked Guilty on Counts 1, 2, 3, 4, 7, 8, 9, 10, and 11, and Not Guilty on Counts 5, 6, and 12. The form is the adjudicative bridge between the charging instrument and the later judgment; it does not state the sentence, forfeiture amount, or the reasons for the verdict.',
      plainEnglish: 'This is the jury\'s answer sheet. It tells us which charged counts the jury found proven beyond a reasonable doubt as to Miles Guo and which it rejected. It does not mean every allegation in the indictment was separately decided in the same way, and it does not by itself determine prison time, forfeiture, or the ownership of particular assets.',
      legalReading: [
        'Pages 1-2 identify the S3 case and provide the count-by-count verdict form. The form marks Guilty for Counts 1-4 and 7-11.',
        'Pages 1-2 mark Not Guilty for Count 5 (GTV wire fraud), Count 6 (GTV securities fraud), and Count 12 (unlawful monetary transaction).',
        'The verdict is specific to Miles Guo. It does not adjudicate the separate allegations or procedural outcomes concerning Je or Wang.',
        'A verdict form records the result, not the jury\'s internal reasoning. The indictment\'s unadjudicated allegations and requested forfeiture property must not be treated as findings merely because they appear in the same case.',
        'The later Doc 860 judgment records the same nine convictions and three acquittals and supplies the total 360-month sentence, assessment, and operative forfeiture terms.',
      ],
      caseConnections: [
        'Read with Doc 307 to distinguish the government\'s S3 allegations from the counts actually decided by the jury.',
        'Read with Doc 860 and Doc 864 for sentence, forfeiture, and sentencing-stage factual findings; those documents answer different legal questions.',
        'The acquittals on Counts 5 and 6 are especially important when reconciling GTV-related allegations, loss calculations, and the later forfeiture order.',
      ],
      whyItMatters: [
        'It is the clearest count-level record of what the jury did and did not find as to Miles Guo.',
        'It prevents the indictment\'s broad program narrative from being reported as though every program-specific count resulted in conviction.',
      ],
      verificationTasks: [
        'Authenticate the verdict form through PACER or RECAP; the local PDF is an NFSC backup copy.',
        'Check the appellate record and briefs for which verdict issues are actually challenged.',
        'Keep the verdict separate from sentencing findings, forfeiture, remission, and third-party ownership proceedings.',
      ],
      riskFlags: [
        'The verdict form states outcomes, not reasons or the full evidentiary basis.',
        'A guilty verdict on a count does not convert every allegation incorporated by reference into an independent finding.',
        'This form does not decide sentence, forfeiture amount, restitution, or third-party property rights.',
      ],
      findings: [
        finding('summary', 'The jury marked Miles Guo guilty on Counts 1-4 and 7-11 and not guilty on Counts 5, 6, and 12.', [1, 2]),
        finding('legalReading', 'The verdict form is limited to Miles Guo and does not resolve the separate defendants\' cases.', [1]),
        finding('caseConnections', 'The later judgment repeats nine convictions and three acquittals; sentence and forfeiture appear in Doc 860, not in this verdict form.', [1, 2]),
      ],
    },
    zh: {
      summary: '这份 3 页陪审团裁决表于 2024 年 7 月 18 日提交，记录了 S3 起诉书项下对 Miles Guo 的裁决。陪审团勾选第 1、2、3、4、7、8、9、10、11 项有罪，第 5、6、12 项无罪。它是从起诉书走向正式判决的裁判节点，但没有说明刑期、没收金额或陪审团作出裁决的理由。',
      plainEnglish: '这是一张陪审团的“答题纸”。它告诉我们，陪审团认定针对 Miles Guo 哪些罪名达到排除合理怀疑的证明程度，哪些罪名没有达到。它不表示起诉书里的每个事实指控都被单独作出了同样的认定，也不自行决定刑期、没收或某项财产的所有权。',
      legalReading: [
        '第 1-2 页标明 S3 案件并列出逐项裁决。第 1-4 项和第 7-11 项勾选为有罪。',
        '第 5 项（GTV 电汇欺诈）、第 6 项（GTV 证券欺诈）和第 12 项（非法货币交易）勾选为无罪。',
        '这份裁决只针对 Miles Guo，不裁判 Je 或 Wang 的独立指控和程序结果。',
        '裁决表记录结果，不记录陪审团内部推理。起诉书中未被裁判的指控和请求没收的财产，不会因为出现在同一案件里就自动变成法院认定。',
        '后续 Doc 860 正式判决记录同样的九项定罪和三项无罪，并补充总计 360 个月刑期、评估费和具有操作效力的没收内容。',
      ],
      caseConnections: [
        '应与 Doc 307 一起阅读，区分检方在 S3 起诉书中的广泛指控和陪审团实际裁判的罪名。',
        '应与 Doc 860 和 Doc 864 一起阅读，分别查看刑罚、没收和量刑阶段事实认定；这些文件回答的是不同法律问题。',
        '第 5、6 项无罪对核对 GTV 指控、损失计算和后续没收裁定尤其重要。',
      ],
      whyItMatters: [
        '它是最清晰的罪名级记录，说明陪审团对 Miles Guo 认定了什么、没有认定什么。',
        '它避免把起诉书的广泛项目叙事误写成所有具体项目罪名都已经定罪。',
      ],
      verificationTasks: [
        '通过 PACER 或 RECAP 核验裁决表正式副本；本地 PDF 来自 NFSC 备用镜像。',
        '检查上诉案卷和上诉书状，确认实际挑战的是哪些裁决问题。',
        '将陪审团裁决与量刑认定、没收、remission 和第三方所有权程序分别记录。',
      ],
      riskFlags: [
        '裁决表说明结果，不说明理由或完整证据基础。',
        '某项罪名有罪不等于起诉书中通过引用纳入的每个事实都成为独立法院认定。',
        '裁决表不决定刑期、没收金额、赔偿或第三方财产权利。',
      ],
      findings: [
        finding('summary', '陪审团裁定 Miles Guo 第 1-4、7-11 项有罪，第 5、6、12 项无罪。', [1, 2]),
        finding('legalReading', '裁决表只针对 Miles Guo，不解决其他被告的案件。', [1]),
        finding('caseConnections', '后续正式判决重复记录九项定罪和三项无罪；刑期和没收见 Doc 860，而不在本裁决表中。', [1, 2]),
      ],
    },
  }),
  'sdny-23-cr-118:720': report({
    sha256: 'c415e033b343d3a12323aad7ae2a78076d742c8b01e29b0bbea9fd23b3003011',
    posture: 'court_order',
    researchQuality: 'body_verified',
    en: {
      summary: 'This 14-page preliminary order of forfeiture as to specific property and money judgment was signed by Judge Analisa Torres on August 11, 2025. It entered an approximately $1.3 billion money judgment against Miles Guo, authorized the United States to take possession of listed specific property, and established the notice and ancillary-claim process for third-party interests. The later Doc 858 order reduced the money judgment by $411 million to $889 million; this document remains important for the earlier forfeiture posture and the listed-property process.',
      plainEnglish: 'This order did two different things. It set an initial 1.3-billion-dollar forfeiture judgment against Guo and identified cash, real estate, vehicles, a yacht, furnishings, and other property for forfeiture. It also opened a separate process for people who say a listed asset belongs to them. The order is therefore not the final answer to every ownership dispute. Later, the court changed the money-judgment figure to 889 million dollars in Doc 858.',
      legalReading: [
        'Pages 1-3 describe the S3 charges, the forfeiture theories, the nine-count guilty verdict, and the government\'s proposed $1.3 billion money judgment. The order is tied to the counts of conviction identified by the court.',
        'Pages 3-11 list specific money and property, including accounts associated with Hamilton, Himalaya, G Club, G Fashion, GETTR, the Mahwah property, vehicles, the Lady May yacht, and household property. Listing an asset in a forfeiture order does not by itself resolve every third-party interest.',
        'Pages 11-12 state that the specific property was treated as proceeds or property involved in the convicted offenses and enter the approximately $1.3 billion money judgment. Under Rule 32.2(b)(4), the order is final as to Guo while the ancillary third-party process remains separate.',
        'Pages 12-14 authorize custody and publication of forfeiture notices. A third-party claimant must file a sworn § 853(n) petition within the stated publication or actual-notice deadline and prove the nature and circumstances of the claimed interest.',
        'Page 14 provides that a final order concerning specific property will follow adjudication of third-party interests and that forfeited property will be applied toward the money judgment. Doc 858 later changed the money-judgment baseline to $889 million and preserved third-party merits issues.',
      ],
      caseConnections: [
        'Doc 307 contains the charging-stage forfeiture allegations; Doc 720 is a later operative forfeiture order based on the post-verdict posture.',
        'Doc 804 shows the defense challenge to the $1.3 billion figure, acquitted-conduct treatment, offsets, and third-party issues; Doc 790 shows a later government request for supplemental property.',
        'Doc 858 is the controlling later forfeiture decision for the reduced $889 million money judgment and remission analysis; Doc 860 incorporates the operative forfeiture materials into the judgment.',
      ],
      whyItMatters: [
        'It is the key bridge from the jury verdict to seizure, notice, and ancillary third-party ownership proceedings.',
        'It explains why a listed asset, a preliminary order, a money judgment, and a later final order must be tracked as separate procedural objects.',
      ],
      verificationTasks: [
        'Authenticate the signed order through PACER or RECAP; the local copy is an NFSC backup mirror.',
        'Collect the forfeiture.gov notices, § 853(n) petitions, responses, and final ancillary orders for each property category.',
        'Reconcile the $1.3 billion figure in this order with the $889 million figure in Doc 858 and Doc 860; do not report both as current totals.',
      ],
      riskFlags: [
        'The approximately $1.3 billion amount is an earlier forfeiture money judgment later reduced by Doc 858.',
        'The order does not adjudicate the merits of every third-party ownership petition.',
        'The listed property values and categories should not be added to the money judgment as if they were separate liabilities.',
        'The local PDF is an NFSC copy; body extraction is complete, but source authentication remains pending.',
      ],
      findings: [
        finding('summary', 'The court entered an approximately $1.3 billion money judgment and authorized possession of listed specific property.', [11, 12]),
        finding('legalReading', 'The order establishes a notice and ancillary petition process for third-party interests under 18 U.S.C. § 853(n) and Rule 32.2.', [12, 13, 14]),
        finding('caseConnections', 'The court contemplated a later final order after third-party interests were adjudicated; Doc 858 later reduced the money judgment to $889 million.', [14]),
      ],
    },
    zh: {
      summary: '这份 14 页“具体财产/金钱判决初步没收令”由 Analisa Torres 法官于 2025 年 8 月 11 日签署。法院对 Miles Guo 先行确定约 13 亿美元没收金钱判决，授权美国政府接管列明的具体财产，并建立第三方财产权利的通知和附属程序。后来的 Doc 858 将金钱判决减少 4.11 亿美元至 8.89 亿美元；本文件仍是理解早期没收状态和具体财产程序的重要依据。',
      plainEnglish: '这份命令做了两件不同的事：一是先对郭确定约 13 亿美元没收金钱判决，二是列出现金、房地产、车辆、游艇、家具等具体财产，并开启一个供第三方主张财产权利的独立程序。因此，文件并没有把每一项所有权争议都最终解决。后来法院在 Doc 858 中把金钱判决改为 8.89 亿美元。',
      legalReading: [
        '第 1-3 页说明 S3 控罪、没收理论、九项定罪裁决及检方提出的 13 亿美元金钱判决。该命令以判决中列明的定罪罪名为基础。',
        '第 3-11 页列出具体资金和财产，包括 Hamilton、Himalaya、G Club、G Fashion、GETTR 相关账户、Mahwah 房产、车辆、Lady May 游艇和房屋物品。把资产列入没收令不等于已经解决所有第三方权利。',
        '第 11-12 页把具体财产作为被定罪行为的收益或涉案财产处理，并对郭确定约 13 亿美元金钱判决。根据 Rule 32.2(b)(4)，该命令对郭本人具有终局效力，但第三方附属程序另行进行。',
        '第 12-14 页授权接管财产和发布没收通知。第三方主张人须在公开通知或实际送达规定期限内提交经宣誓的 § 853(n) 申请，并说明权利性质、取得时间和事实依据。',
        '第 14 页说明第三方权利裁判后将形成具体财产的最终没收令，并将没收财产用于抵扣金钱判决。Doc 858 随后把金钱判决基准改为 8.89 亿美元，并保留第三方实体争议。',
      ],
      caseConnections: [
        'Doc 307 是控罪阶段的没收请求；Doc 720 是陪审团裁决后的后续操作性没收命令。',
        'Doc 804 展示辩方对 13 亿美元、无罪行为、抵扣及第三方财产权利的异议；Doc 790 展示检方之后提出的补充财产没收请求。',
        'Doc 858 是后来关于 8.89 亿美元金钱判决和 remission 的控制性没收裁定；Doc 860 把操作性没收材料纳入正式判决。',
      ],
      whyItMatters: [
        '它是从陪审团裁决进入查扣、通知和第三方附属财产权利程序的关键桥梁。',
        '它说明列明资产、初步命令、金钱判决和后续最终命令必须作为不同程序对象追踪。',
      ],
      verificationTasks: [
        '通过 PACER 或 RECAP 核验签署命令；本地副本来自 NFSC 备用镜像。',
        '收集 forfeiture.gov 公告、§ 853(n) 申请、回应及各类财产的最终附属裁定。',
        '将本文件的 13 亿美元与 Doc 858、Doc 860 的 8.89 亿美元对照；不能把两者同时写成当前金额。',
      ],
      riskFlags: [
        '约 13 亿美元是后来被 Doc 858 调低的早期没收金钱判决。',
        '该命令没有裁判每一项第三方所有权申请的实体是否成立。',
        '列明财产价值不能与金钱判决当作彼此独立的债务简单相加。',
        '本地 PDF 来自 NFSC；正文提取完整，但来源认证仍待 PACER/RECAP。',
      ],
      findings: [
        finding('summary', '法院确定约 13 亿美元金钱判决，并授权接管列出的具体财产。', [11, 12]),
        finding('legalReading', '命令依据 18 U.S.C. § 853(n) 和 Rule 32.2 建立第三方权利通知及附属申请程序。', [12, 13, 14]),
        finding('caseConnections', '法院预留第三方权利裁判后的最终命令；Doc 858 后来把金钱判决降至 8.89 亿美元。', [14]),
      ],
    },
  }),
  'sdny-23-cr-118:790': report({
    sha256: '27d4610550a903e9dfb2a706eb442a52d8c9d0743d60b55da9a41a7e4429d835',
    posture: 'government_motion',
    researchQuality: 'body_verified',
    en: {
      summary: 'This four-page January 19, 2026 government letter asks the court to enter a first supplemental preliminary forfeiture order for additional property allegedly traceable to Guo-related crimes or involved in laundering. It requests forfeiture of approximately $2.11 million formerly held for G Club Operations LLC and approximately $2.11 million and $2.44 million from Barclays accounts held in the names of Kin Ming Je and Sin Ting Rong. The letter is a government request, not the requested order or a final adjudication.',
      plainEnglish: 'The government was asking the judge to add more money to the forfeiture process. The filing names several accounts and explains the statutes the government relies on, but a request letter is not the same as a signed order. The amounts in the letter are proposed property categories, not automatically an additional judgment against Guo.',
      legalReading: [
        'Pages 1-2 state the government\'s legal theories under RICO forfeiture, fraud forfeiture, and money-laundering forfeiture, and note that Guo took no position regarding any personal interest in the assets sought in this request.',
        'Pages 2-3 describe the G Club Operations LLC Banco Popular balance of approximately $2,112,510.70 and Barclays accounts in the Isle of Man and Jersey totaling approximately $2,112,510.70 and $2,437,677.01, respectively.',
        'The government relies on trial evidence, prior forfeiture materials, and seizure-warrant affidavits. Those references explain the government\'s evidentiary theory; they do not make the letter itself a judicial finding.',
        'Page 4 asks the court to enter the proposed supplemental preliminary order. The local four-page letter is not itself a signed supplemental order, so the disposition must be checked against later docket entries.',
      ],
      caseConnections: [
        'Doc 720 is the earlier preliminary forfeiture order that the government cites as part of its theory; Doc 790 seeks an additional order after that filing.',
        'Doc 858 later sets the $889 million money-judgment baseline and should be checked for how the supplemental property request was treated.',
        'The G Club and Je/Rong account theories overlap with bankruptcy and entity-ownership disputes; account-holder names alone do not establish beneficial ownership or Guo\'s personal liability.',
      ],
      whyItMatters: [
        'It shows the continuing asset-recovery stage after the first preliminary order and identifies specific bank-account trails requiring docket-level follow-up.',
        'It is a useful example of why a motion or letter requesting relief must not be displayed as if the court already granted it.',
      ],
      verificationTasks: [
        'Locate the proposed exhibit and any signed supplemental preliminary or final order on PACER/RECAP.',
        'Track notices, third-party petitions, and any rulings involving G Club Operations LLC, Je, or Rong.',
        'Reconcile each requested amount against later forfeiture credits and the $889 million judgment without double counting.',
      ],
      riskFlags: [
        'This document contains government arguments, not a court ruling.',
        'The amounts are asset categories requested for forfeiture and should not be added to the money judgment without an operative order.',
        'The local PDF is an NFSC backup copy and does not include a signed order in the four-page letter itself.',
      ],
      findings: [
        finding('summary', 'The government asks for a supplemental forfeiture order covering G Club Operations LLC and Barclays-held funds.', [1, 2, 3, 4]),
        finding('legalReading', 'The requested amounts are approximately $2.11 million, $2.11 million, and $2.44 million for the identified categories.', [3]),
        finding('riskFlags', 'The filing ends by asking the court to enter a proposed order; it does not itself show that the request was granted.', [4]),
      ],
    },
    zh: {
      summary: '这份 4 页的 2026 年 1 月 19 日检方函件，请求法院就被指称可追溯于郭案犯罪或涉及洗钱的新增财产，签发第一份补充初步没收令。检方请求处理：此前由 G Club Operations LLC 持有的约 211.25 万美元，以及由 Kin Ming Je 和 Sin Ting Rong 名下 Barclays 账户中的约 211.25 万美元和 243.77 万美元。它是检方请求，不是法院签署的命令，也不是终局裁判。',
      plainEnglish: '检方是在请求法官把更多资金纳入没收程序。文件列出账户并说明法律依据，但请求函不等于签署后的命令。里面的金额是检方提出要处理的财产类别，不是自动增加到郭名下的最终判决。',
      legalReading: [
        '第 1-2 页说明检方依据 RICO 没收、欺诈没收和洗钱没收提出请求，并记载郭对检方寻求处理的资产中与其个人利益有关的部分“不持立场”。',
        '第 2-3 页描述 G Club Operations LLC 在 Banco Popular 的约 211.25 万美元，以及 Barclays 马恩岛和泽西账户中分别约 211.25 万美元和 243.77 万美元。',
        '检方援引审判证据、先前没收材料和查扣令宣誓书。这些内容解释检方的证据理论，不会使函件本身变成法院认定。',
        '第 4 页请求法院签发补充初步没收令。本地 4 页文件本身是检方函件，没有法院签署的补充命令，最终处理必须通过后续案卷核验。',
      ],
      caseConnections: [
        'Doc 720 是检方引用的较早初步没收令；Doc 790 是在其后请求新增命令。',
        'Doc 858 后来确定 8.89 亿美元金钱判决基准，应检查其如何处理这次补充财产请求。',
        'G Club 以及 Je/Rong 账户理论与破产和实体所有权争议有重叠；账户名本身不能证明受益所有权或郭的个人责任。',
      ],
      whyItMatters: [
        '它展示了第一份初步命令之后持续进行的资产追回阶段，并指出需要通过案卷进一步追踪的具体银行账户。',
        '它说明动议或请求函不能在界面上被显示成法院已经批准的结果。',
      ],
      verificationTasks: [
        '在 PACER/RECAP 中寻找附件中的拟议命令及任何签署后的补充初步或最终命令。',
        '追踪涉及 G Club Operations LLC、Je 或 Rong 的通知、第三方申请和裁定。',
        '将各项请求金额与后续没收抵扣和 8.89 亿美元判决核对，避免重复计算。',
      ],
      riskFlags: [
        '本文件是检方论证，不是法院裁定。',
        '金额是请求没收的财产类别；没有操作性命令不得把它们加到金钱判决中。',
        '本地副本来自 NFSC 备用镜像，4 页函件本身没有签署后的补充命令。',
      ],
      findings: [
        finding('summary', '检方请求对 G Club Operations LLC 和 Barclays 账户资金签发补充没收令。', [1, 2, 3, 4]),
        finding('legalReading', '文件对所列类别提出约 211.25 万美元、211.25 万美元和 243.77 万美元请求。', [3]),
        finding('riskFlags', '文件以请求法院签发拟议命令结尾，并没有证明请求已经获批。', [4]),
      ],
    },
  }),
  'sdny-23-cr-118:804': report({
    sha256: 'b4946303c0c8d3fc8497b6c0401c80c362512d1e9f79078baa8b0e25484828b0',
    posture: 'defense_motion',
    researchQuality: 'body_verified',
    en: {
      summary: 'This six-page February 19, 2026 defense filing responds to the government\'s position on Guo\'s objections to the preliminary forfeiture order. The defense argues that Guo preserved his objections, disputes the $1.3 billion money judgment, challenges reliance on acquitted GTV conduct and broad investor inflows, argues that third-party claims may show property is not forfeitable at all, and requests offsets for SEC-related recoveries and other assets. These are defense arguments, not rulings; Doc 858 later reduced the money judgment to $889 million and addressed several issues.',
      plainEnglish: 'The defense is asking the judge to look more carefully at what money legally counts as Guo\'s forfeitable proceeds. Its main points are: the objections were timely; money sent to a related entity is not automatically Guo\'s criminal proceeds; GTV counts ended in acquittals; third parties may own some seized funds; and amounts already recovered should not be collected twice. The filing does not prove any of these points by itself.',
      legalReading: [
        'Pages 1-2 argue that the defense did not waive objections and that the court\'s January 8 order invited timely objections. This is a procedural position, not a final ruling on every objection.',
        'Pages 2-4 challenge the use of aggregate inflows and argue that GTV acquitted conduct should not automatically support forfeiture. The filing also invokes third-party interests and personal-benefit limits as legal objections.',
        'Page 4 claims at least $489,445,063 in SEC-related disgorgement and another forfeiture should offset a money judgment; page 5 identifies additional specific property, bankruptcy-controlled assets, and other assets as potential offsets. These amounts are requested offsets, not court-approved credits.',
        'Pages 5-6 request that no $1.3 billion judgment be entered, or that any judgment be reduced by recoveries. Doc 858 later reduced the proposed figure by $411 million, denied the motion to compel seizure of bankruptcy assets, and preserved third-party ownership claims for § 853(n) proceedings.',
      ],
      caseConnections: [
        'The filing directly responds to Doc 720 and the government\'s forfeiture position; Doc 790 is a later government request for supplemental property.',
        'Doc 395 supplies the GTV acquittals that the defense relies on; Doc 858 and Doc 860 supply the later operative monetary outcome.',
        'The proposed offsets overlap with SEC/Fair Fund recovery, bankruptcy estate assets, and third-party ancillary petitions. Each track has separate ownership and remedy questions.',
      ],
      whyItMatters: [
        'It preserves the defense-side theory for why gross inflows, seized funds, and forfeiture proceeds should not be treated as one undifferentiated number.',
        'It provides the clearest pre-Doc 858 roadmap of the objections later reflected in the court\'s reduction, remission, and third-party-process analysis.',
      ],
      verificationTasks: [
        'Collect the referenced initial objections, government response, January 8 order, and any signed ruling on the supplemental requests.',
        'Verify the SEC recovery figures and determine which amounts were actually credited in Doc 858, rather than relying on the defense\'s proposed arithmetic.',
        'Track each § 853(n) claimant and distinguish a claim that property is not forfeitable from a claim of superior ownership.',
      ],
      riskFlags: [
        'Defense arguments about political context, investor status, and offsets are contested positions and must not be displayed as judicial findings.',
        'The $489,445,063 and approximately $300 million figures are requested or asserted offsets, not adjudicated credits.',
        'The local PDF is an NFSC backup copy; cited pages are complete for this six-page filing.',
      ],
      findings: [
        finding('summary', 'The defense argues that objections were timely and that the $1.3 billion money judgment lacked a sufficient basis.', [1, 2, 6]),
        finding('legalReading', 'The defense disputes automatic forfeiture of all entity inflows, reliance on GTV acquitted conduct, and treatment of third-party property.', [2, 3, 4, 5]),
        finding('caseConnections', 'The defense requests offsets for SEC-related recovery and other assets; Doc 858 later reduced the money judgment to $889 million but did not adopt every defense argument.', [4, 5, 6]),
      ],
    },
    zh: {
      summary: '这份 6 页的 2026 年 2 月 19 日辩方文件回应检方对郭初步没收令异议的立场。辩方主张异议已经及时保留，反对 13 亿美元金钱判决，质疑把 GTV 无罪行为和广泛投资流入纳入没收，认为第三方权利可能证明部分财产根本不可没收，并要求扣除 SEC 相关追回和其他资产。这些都是辩方主张，不是法院裁定；Doc 858 后来把金钱判决降至 8.89 亿美元并处理了若干相关问题。',
      plainEnglish: '辩方要求法官更仔细地区分哪些资金在法律上可以算作郭的可没收收益。核心观点是：异议没有过期；资金进入关联实体不自动等于郭的犯罪收益；GTV 具体罪名已经无罪；被查扣资金可能属于第三方；已经追回的金额不能重复追缴。这份文件本身不能证明这些观点已经成立。',
      legalReading: [
        '第 1-2 页主张辩方没有放弃异议，并认为法院 1 月 8 日命令允许其及时提交。这是程序立场，不是对所有异议的终局裁定。',
        '第 2-4 页质疑把总流入作为没收基础，并主张 GTV 无罪行为不能自动支持没收。文件还提出第三方权利及个人受益范围方面的法律异议。',
        '第 4 页主张至少 489,445,063 美元 SEC 相关返还及另一项没收应抵扣金钱判决；第 5 页又列出具体财产、破产受托人控制的资产及其他潜在抵扣。这些都是请求抵扣，不是法院批准的抵扣。',
        '第 5-6 页请求不确定 13 亿美元判决，或者以已追回财产减少判决。Doc 858 后来扣除 4.11 亿美元，将金额降至 8.89 亿美元，驳回强制扣押破产资产请求，并把第三方所有权留给 § 853(n) 程序。',
      ],
      caseConnections: [
        '该文件直接回应 Doc 720 和检方没收立场；Doc 790 是检方之后提出的新增财产请求。',
        'Doc 395 提供辩方依赖的 GTV 无罪结果；Doc 858 和 Doc 860 提供后来的操作性金额结果。',
        '辩方提出的抵扣与 SEC/Fair Fund 追回、破产财产及第三方附属申请重叠，但每条程序的所有权和救济问题不同。',
      ],
      whyItMatters: [
        '它完整保留了辩方为何反对把总流入、查扣资金和没收收益视为一个不加区分数字的理论。',
        '它是 Doc 858 之前最清晰的辩方异议路线图，有助于理解法院后来对金额、remission 和第三方程序的处理。',
      ],
      verificationTasks: [
        '收集文件引用的初始异议、检方回应、1 月 8 日命令以及对补充请求的正式裁定。',
        '核对 SEC 追回金额，确认 Doc 858 实际采用的抵扣数额，不要直接采用辩方计算。',
        '逐项追踪 § 853(n) 申请，并区分“财产根本不可没收”和“第三方拥有优先权利”两类主张。',
      ],
      riskFlags: [
        '辩方关于政治背景、投资人身份和抵扣的内容属于争议立场，不能显示为法院认定。',
        '489,445,063 美元和约 3 亿美元是主张或请求抵扣的数额，不是已经裁判的抵扣。',
        '本地 PDF 来自 NFSC 备用镜像；这份 6 页文件的引用页已完整提取。',
      ],
      findings: [
        finding('summary', '辩方主张异议及时，并认为 13 亿美元金钱判决缺乏充分依据。', [1, 2, 6]),
        finding('legalReading', '辩方反对把所有实体流入、GTV 无罪行为和第三方财产自动纳入没收。', [2, 3, 4, 5]),
        finding('caseConnections', '辩方请求抵扣 SEC 相关追回及其他资产；Doc 858 后来将金额降至 8.89 亿美元，但没有采纳辩方全部论点。', [4, 5, 6]),
      ],
    },
  }),
  'sdny-23-cr-118:833': report({
    sha256: '5edc7cdac89942f7d0c92eb23d0524888d32be15f598459df3f0dbcaf861f680',
    posture: 'government_sentencing_memorandum',
    researchQuality: 'body_verified',
    en: {
      summary: 'This 88-page April 7, 2026 government sentencing memorandum asks for at least 30 years of imprisonment. It argues that Guo led a large-scale enterprise, that the Guidelines calculation reached the statutory maximum of 2,100 months based on a level-43 treatment, that actual loss exceeded $550 million, and that victim harm, obstruction, leadership, deterrence, and protection of the public support a very lengthy sentence. These are the government\'s sentencing arguments. Doc 864 later records the court\'s separate findings and a total 360-month sentence.',
      plainEnglish: 'This is the prosecution\'s sentencing proposal, not the sentence itself. The government asks for at least 30 years and uses several arguments: the size and organization of the scheme, claimed loss above $550 million, harm to victims, alleged obstruction, and the need to deter future conduct. The judge later had to decide which disputed facts were proven under the sentencing standard and what sentence was appropriate.',
      legalReading: [
        'Pages 1-7 summarize the government\'s theory, procedural history, S3 counts, and trial result. The memorandum repeats that Guo was convicted on Counts 1-4 and 7-11 and acquitted on Counts 5, 6, and 12.',
        'Pages 28-31 describe alleged obstruction and approximately 225 victim-impact statements, many filed under seal. These statements and allegations are not all independently adjudicated findings.',
        'Pages 32-41 argue for a Guidelines loss above $550 million, relying on bank-record summaries, tracing affidavits, seized funds, and the government\'s interpretation of how acquitted GTV conduct relates to the offenses of conviction.',
        'Pages 33-34 state that Probation calculated an offense level of 55 treated as level 43, a 2,100-month statutory-maximum Guidelines sentence, while Probation recommended 25 years. The government asks for at least 30 years.',
        'Pages 69-85 address § 3553(a), personal history, immigration and detention conditions, sentencing disparities, and comparisons to other fraud cases. They are advocacy, not the court\'s balancing of the factors.',
        'Pages 86-88 address forfeiture and restitution positions. Doc 864 later denied a full Fatico hearing, found loss above $550 million by a preponderance, found restitution impracticable, and imposed 360 months.',
      ],
      caseConnections: [
        'Doc 834 is the defense reply and should be read alongside this filing so the interface shows both sides of the disputed loss, acquitted-conduct, victim-status, obstruction, and sentencing-comparison issues.',
        'Doc 864 is the controlling sentencing transcript for what the court actually found and how it handled the Fatico request, Guidelines, § 3553(a), forfeiture, and restitution.',
        'Doc 833 relies on Doc 720 and the trial record; Doc 858 separately controls the later $889 million forfeiture money judgment.',
      ],
      whyItMatters: [
        'It explains why the government sought a sentence at least as long as 30 years and identifies the evidence categories the court was asked to consider.',
        'It allows a reader to compare the government\'s requested loss and sentence with the court\'s narrower, independently stated sentencing conclusions.',
      ],
      verificationTasks: [
        'Compare every disputed sentencing fact in this memorandum with Doc 864 transcript pages and the final judgment.',
        'Separate sealed victim-impact materials from the public memorandum and do not infer their contents.',
        'Check the Second Circuit record for appellate challenges to loss, acquitted conduct, procedure, or sentence.',
      ],
      riskFlags: [
        'The $1.3 billion and over-$550-million figures appear here as government positions in different legal contexts; they are not interchangeable.',
        'The government\'s descriptions of victims, obstruction, leadership, wealth, and post-arrest conduct are advocacy unless adopted by the court.',
        'The local PDF is an NFSC backup copy; body extraction is complete but source authentication remains pending.',
      ],
      findings: [
        finding('summary', 'The government requests at least 30 years and relies on alleged scale, harm, leadership, obstruction, and deterrence.', [4, 5, 81, 85, 88]),
        finding('legalReading', 'The government argues loss exceeded $550 million and describes a Guidelines calculation reaching 2,100 months.', [32, 33, 34, 35, 36, 41]),
        finding('caseConnections', 'The court later imposed 360 months, denied a full Fatico hearing, and treated restitution as impracticable; those are court outcomes, not the memorandum\'s recommendations.', [86, 87, 88]),
      ],
    },
    zh: {
      summary: '这份 88 页的 2026 年 4 月 7 日检方量刑备忘录请求至少判处 30 年监禁。检方主张郭领导大规模企业，量刑指南计算达到法定最高 2,100 个月，实际损失超过 5.5 亿美元，并以受害人损害、妨碍司法、领导地位、威慑和保护公众为由要求长期刑罚。这些是检方量刑主张；Doc 864 才记录法院的独立认定和最终 360 个月刑期。',
      plainEnglish: '这是检方的量刑建议，不是判决本身。检方要求至少 30 年，理由包括方案规模和组织程度、主张超过 5.5 亿美元损失、受害人损害、所谓妨碍司法，以及威慑未来行为的需要。法官之后要按量刑阶段的证明标准，决定哪些争议事实可以采用以及刑罚应是多少。',
      legalReading: [
        '第 1-7 页概述检方理论、程序历史、S3 罪名和审判结果，并重复说明郭第 1-4、7-11 项定罪，第 5、6、12 项无罪。',
        '第 28-31 页描述检方所谓的妨碍司法和约 225 份受害人影响陈述，其中许多在密封状态下提交。这些陈述和指控并非全部经过独立实体裁判。',
        '第 32-41 页主张量刑损失超过 5.5 亿美元，依据包括银行记录汇总、追踪宣誓书、查扣资金以及检方对 GTV 无罪行为与定罪罪名关联的解释。',
        '第 33-34 页写明缓刑部门把罪责级别计算为 55、按 43 级处理，对应 2,100 个月法定最高指南刑期；缓刑部门建议 25 年，检方请求至少 30 年。',
        '第 69-85 页讨论 § 3553(a)、个人经历、移民和羁押条件、量刑差异及其他欺诈案件比较。这些是诉讼主张，不是法院对因素的最终权衡。',
        '第 86-88 页讨论没收和赔偿立场。Doc 864 后来拒绝完整 Fatico 听证，按优势证据认定损失超过 5.5 亿美元，认定赔偿不切实际，并判处 360 个月。',
      ],
      caseConnections: [
        'Doc 834 是辩方答复，应与本文件并读，让界面同时呈现损失、无罪行为、受害人身份、妨碍司法和量刑比较方面的双方争议。',
        'Doc 864 是控制性量刑庭审记录，说明法院实际认定和如何处理 Fatico 请求、指南、§ 3553(a)、没收及赔偿。',
        'Doc 833 援引 Doc 720 和审判记录；Doc 858 另行控制后来 8.89 亿美元没收金钱判决。',
      ],
      whyItMatters: [
        '它解释检方为何请求至少 30 年，并列出检方要求法院考虑的证据类别。',
        '它让读者可以把检方提出的损失和刑期，与法院后来更具体、独立说明的量刑结论进行比较。',
      ],
      verificationTasks: [
        '把本备忘录中的每个争议量刑事实与 Doc 864 庭审记录和正式判决逐项对照。',
        '将密封的受害人影响材料与公开备忘录分开，不推测密封内容。',
        '检查第二巡回上诉案卷是否挑战损失、无罪行为、程序或刑罚。',
      ],
      riskFlags: [
        '13 亿美元和超过 5.5 亿美元分别出现在不同法律语境中，均属检方主张，不能互换。',
        '检方关于受害人、妨碍司法、领导地位、财富和被捕后行为的描述，除非法院采纳，否则都是诉讼主张。',
        '本地 PDF 来自 NFSC 备用镜像；正文提取完整，但来源认证仍待完成。',
      ],
      findings: [
        finding('summary', '检方请求至少 30 年，并以规模、损害、领导、妨碍司法和威慑为依据。', [4, 5, 81, 85, 88]),
        finding('legalReading', '检方主张损失超过 5.5 亿美元，并描述达到 2,100 个月的指南计算。', [32, 33, 34, 35, 36, 41]),
        finding('caseConnections', '法院后来判处 360 个月、拒绝完整 Fatico 听证并认定赔偿不切实际；这些是法院结果，不是备忘录建议。', [86, 87, 88]),
      ],
    },
  }),
  'sdny-23-cr-118:834': report({
    sha256: '6bc81df690d58f585bf3273acecdba01527adbcd57b319fdb2147e3cbf57e11c',
    posture: 'defense_sentencing_memorandum',
    researchQuality: 'body_verified',
    en: {
      summary: 'This 30-page April 17, 2026 defense reply sentencing memorandum argues that the government\'s proposed $1.3 billion loss figure conflates transaction volume with actual pecuniary harm, improperly relies on acquitted GTV conduct, and fails to account for investors who deny victim status, refunds, or other recoveries. It requests a sentence substantially below the government\'s proposed 30 years and argues for a Fatico hearing. These are defense submissions; Doc 864 later records that the court denied a full Fatico hearing, found loss above $550 million by a preponderance, and imposed 360 months.',
      plainEnglish: 'The defense is challenging the foundation of the government\'s sentencing request. It says money that flowed through an entity is not automatically a loss, that the two acquitted GTV counts should not inflate sentencing, and that investor statements and recoveries need to be examined. The defense asks for an evidentiary hearing and a much shorter sentence. The filing itself does not establish that the defense position was accepted.',
      legalReading: [
        'Pages 4-7 argue that the government uses rhetoric, disputed facts, and pre-existing wealth without adequately separating historical assets from charged conduct. These are advocacy arguments.',
        'Pages 8-12 challenge the $1.3 billion figure, distinguish gross inflows from loss, question reliance on seizure affidavits, and argue that the government\'s position on impracticable restitution shows difficulty identifying victim-specific loss.',
        'Pages 13-15 argue that GTV Counts 5 and 6 ended in acquittal and that acquitted GTV conduct should not be used to establish the offenses of conviction for sentencing purposes.',
        'Pages 15-20 argue that investor disavowals, § 853(n) petitions, Hamilton claims, and the asserted number of unique investors create a material factual dispute requiring a Fatico hearing. These figures are defense representations and must be checked against the underlying docket materials.',
        'Pages 21-26 address sentencing comparisons, political and historical context, alleged ongoing criminal activity, obstruction, and wealth. The document presents these as mitigation and reliability arguments, not as court findings.',
        'Doc 864 later provides the court\'s outcome: no full Fatico hearing, preponderance-based loss above $550 million, a total 360-month sentence, no restitution or fine, and a $900 assessment.',
      ],
      caseConnections: [
        'Doc 833 is the government memorandum answered by this filing; both should be displayed as party positions rather than blended into a single conclusion.',
        'Doc 395 supplies the GTV acquittals cited by the defense; Doc 720 and Doc 804 supply the forfeiture-stage record; Doc 858 and Doc 864 show the court\'s later treatment.',
        'References to CCP-related context are part of the defense\'s litigation position in this filing and must not be presented as an established explanation for the criminal case.',
      ],
      whyItMatters: [
        'It identifies the principal defense objections to loss methodology, acquitted conduct, evidentiary procedure, victim classification, and the proposed sentence.',
        'It lets the reader see exactly where the defense position diverged from the government\'s calculation before comparing both with the court\'s ruling.',
      ],
      verificationTasks: [
        'Compare the defense\'s numerical claims about investor statements, § 853(n) petitions, recoveries, and duplicate statements with the underlying docket and sealed-record limits.',
        'Read Doc 864 against each requested Fatico and acquitted-conduct argument; do not infer that silence equals acceptance.',
        'Track the Second Circuit briefs for any appeal issues arising from loss calculation, acquitted conduct, or the refusal to hold a full hearing.',
      ],
      riskFlags: [
        'The defense\'s political-context, investor-status, loss, and procedural arguments are contested positions, not neutral facts.',
        'The figures for alleged investor disavowals and offsets are representations in the filing and require independent source checking.',
        'The local PDF is an NFSC backup copy; the 30-page body is text-complete, but source authentication remains pending.',
      ],
      findings: [
        finding('summary', 'The defense asks the court to reject a 30-year request, find the loss calculation unreliable, and hold a Fatico hearing.', [4, 5, 8, 20, 21]),
        finding('legalReading', 'The defense argues that acquitted GTV conduct, aggregate inflows, and investor disavowals cannot be used without a particularized loss analysis.', [8, 10, 13, 14, 15, 18, 20]),
        finding('caseConnections', 'Doc 864 later rejected a full Fatico hearing and made its own preponderance-based findings; the defense filing remains evidence of the disputed position, not the ruling.', [20, 25, 26]),
      ],
    },
    zh: {
      summary: '这份 30 页的 2026 年 4 月 17 日辩方答复量刑备忘录主张，检方提出的 13 亿美元损失把交易流量与实际财产损害混在一起，不当依赖 GTV 无罪行为，也没有充分处理否认受害人身份的投资人、退款和其他追回。辩方请求远低于检方 30 年建议的刑期，并要求举行 Fatico 听证。这些是辩方提交内容；Doc 864 后来记载法院拒绝完整 Fatico 听证，按优势证据认定损失超过 5.5 亿美元，并判处 360 个月。',
      plainEnglish: '辩方是在挑战检方量刑请求的基础。辩方说，资金流经某个实体不自动等于损失；两项 GTV 无罪罪名不应抬高量刑；投资人陈述和已经追回的钱需要逐项审查。辩方要求证据听证和明显更短的刑期。但这份文件本身不能证明辩方观点已被法院接受。',
      legalReading: [
        '第 4-7 页主张检方使用了修辞、争议事实和被告早期财富，却没有充分区分历史资产和被控行为。这些是诉讼论证。',
        '第 8-12 页质疑 13 亿美元数字，区分总流入和实际损失，质疑依赖查扣宣誓书，并认为检方主张赔偿不切实际恰好显示无法确认逐一受害人损失。',
        '第 13-15 页主张 GTV 第 5、6 项罪名已经无罪，不能把 GTV 无罪行为用来作为量刑时定罪罪名的基础。',
        '第 15-20 页主张投资人否认受害人身份、§ 853(n) 申请、Hamilton 主张和所谓独立投资人数形成重大事实争议，需要 Fatico 听证。这些数字是辩方陈述，须与底层案卷核对。',
        '第 21-26 页讨论量刑比较、政治和历史背景、所谓持续犯罪、妨碍司法和财富问题。文件把它们作为减轻责任和质疑可靠性的理由，不是法院认定。',
        'Doc 864 后来给出法院结果：拒绝完整 Fatico 听证，按优势证据认定损失超过 5.5 亿美元，总刑期 360 个月，赔偿和罚金为 0，评估费 900 美元。',
      ],
      caseConnections: [
        'Doc 833 是本文件答复的检方备忘录，两份文件都应作为当事方立场分别展示，不能混成一个结论。',
        'Doc 395 提供辩方引用的 GTV 无罪结果；Doc 720 和 Doc 804 提供没收阶段记录；Doc 858 和 Doc 864 展示法院后来的处理。',
        '文件中的中共相关背景属于辩方在本文件中的诉讼立场，不能作为刑事案件已经证明的解释写入中立结论。',
      ],
      whyItMatters: [
        '它集中呈现辩方对损失方法、无罪行为、证据程序、受害人分类和拟议刑期的主要异议。',
        '它帮助读者在比较法院裁定之前，准确看到辩方与检方计算方式在哪里分歧。',
      ],
      verificationTasks: [
        '把辩方关于投资人陈述、§ 853(n) 申请、追回金额和重复陈述的数字与底层案卷及密封记录限制核对。',
        '将 Doc 864 与每项 Fatico 和无罪行为主张对照；不能把法院未提及理解成法院接受。',
        '追踪第二巡回上诉书状是否提出损失计算、无罪行为或拒绝完整听证的问题。',
      ],
      riskFlags: [
        '辩方关于政治背景、投资人身份、损失和程序的主张是争议立场，不是中立事实。',
        '关于投资人否认受害人身份和抵扣金额的数字是文件中的陈述，需要独立来源核验。',
        '本地 PDF 来自 NFSC 备用镜像；30 页正文提取完整，但来源认证仍待完成。',
      ],
      findings: [
        finding('summary', '辩方请求法院拒绝 30 年刑期建议，认定损失计算不可靠并举行 Fatico 听证。', [4, 5, 8, 20, 21]),
        finding('legalReading', '辩方主张没有逐笔损失分析，不能采用 GTV 无罪行为、总流入和投资人否认受害人身份的材料。', [8, 10, 13, 14, 15, 18, 20]),
        finding('caseConnections', 'Doc 864 后来拒绝完整 Fatico 听证并按优势证据作出认定；本文件仍是争议立场，不是法院裁定。', [20, 25, 26]),
      ],
    },
  }),
  'sdny-23-cr-118:785': report({
    sha256: 'afd4314249c03fe5e1b25b617469d07d2fbc8de39f4048d2d67a7e8e2611157e',
    posture: 'government_position',
    researchQuality: 'body_verified',
    en: {
      summary: 'This six-page January 9, 2026 government letter explains the prosecution\'s proposed treatment of third-party forfeiture submissions. It argues that ordinary fraud victims are generally unsecured creditors without standing under § 853(n), distinguishes judicial ancillary claims from discretionary DOJ remission, supports appointing a special master, and asks the court to find restitution impracticable. It is government advocacy. Doc 858 later adopted the impracticability/remission result, but this letter does not itself appoint a special master or decide any claimant\'s rights.',
      plainEnglish: 'The government describes two different doors. A person claiming legal ownership of a particular seized asset may try the court-run § 853(n) door. A person seeking compensation for a crime loss generally uses the DOJ-run remission door. The government argues that many submissions belong in the second category, but the judge, not this letter, decides court claims and standing.',
      legalReading: [
        'Pages 1-3 argue that a general creditor normally lacks a legal interest in specific forfeited property under § 853(n)(6), while a claimant with a preexisting superior interest or bona-fide-purchaser status may qualify. The letter acknowledges that a properly traced constructive trust may sometimes support a legal interest.',
        'Page 4 reports approximately 134 claims on the docket and approximately 238 submissions mailed to the government. Those are the government\'s January 2026 procedural counts, not findings that every submission was valid, unique, or timely.',
        'Pages 4-5 propose a special-master screening process and distinguish court adjudication from DOJ remission under § 853(i) and 28 C.F.R. Part 9.',
        'Pages 5-6 argue that victim-specific restitution would be impracticable because of the number of claimants, tracing, prior SEC compensation, refunds, and other recoveries; the government proposes remission through a claims administrator instead.',
        'Doc 858 later found restitution impracticable and authorized remission. It reserved third-party ownership merits and did not convert every § 853(n) petition into a remission claim.',
      ],
      caseConnections: ['Read with defense Doc 789 for the opposing view of constructive trusts and judicial adjudication.', 'Read with Docs 720, 841, 855, 858, 859, 866, and 868 to separate preliminary forfeiture, individual petitions, ancillary administration, remission, and mandamus.'],
      whyItMatters: ['It defines the procedural fork between ownership adjudication and victim compensation.', 'It prevents treating the reported claim counts as proof of ownership, loss, or claimant status.'],
      verificationTasks: ['Collect the docketed petition list, mailed-submission protocol, any special-master appointment, screening orders, and individual ancillary dispositions.', 'Track the remission administrator, eligibility rules, notices, deadlines, and distributions separately from § 853(n).'],
      riskFlags: ['The government\'s standing analysis and classification of claimants are litigation positions, not rulings.', 'A remission decision is discretionary and is not the same as a judicial ownership judgment.', 'The local PDF is an NFSC backup copy pending PACER or RECAP authentication.'],
      findings: [
        finding('legalReading', 'The government distinguishes judicial § 853(n) ownership claims from discretionary remission and argues that ordinary fraud victims are generally unsecured creditors.', [1, 2, 3]),
        finding('summary', 'The government reported approximately 134 docketed claims and approximately 238 mailed submissions and supported special-master review.', [4]),
        finding('caseConnections', 'The government asked for an impracticability finding and remission instead of restitution; Doc 858 later granted that relief.', [5, 6]),
      ],
    },
    zh: {
      summary: '这份 6 页的 2026 年 1 月 9 日检方函件说明检方希望如何处理第三方没收材料。检方主张普通欺诈受害人通常只是无担保一般债权人，在 § 853(n) 下缺少 standing；同时区分法院附属财产权申请与 DOJ 酌情 remission，支持任命 special master，并请求法院认定赔偿不切实际。它是检方论证。Doc 858 后来采纳了“不作赔偿、改用 remission”的结果，但本函本身没有任命 special master，也没有裁判任何申请人的权利。',
      plainEnglish: '检方描述了两扇不同的门：主张某项被没收财产法律上属于自己的人，可能走法院的 § 853(n) 程序；只是要求补偿犯罪损失的人，通常走 DOJ 的 remission 程序。检方认为许多提交应归入后者，但法院申请是否成立、是否有 standing，要由法官决定，不能由这封函件直接决定。',
      legalReading: [
        '第 1-3 页主张一般债权人通常不具备 § 853(n)(6) 所需的具体财产法律利益，而犯罪发生前已有优先权利或属于善意有偿购买人的申请人可能符合条件；函件也承认，能够适当追踪的 constructive trust 在某些情况下可能形成法律利益。',
        '第 4 页称案卷中约有 134 项申请，另有约 238 份直接邮寄给检方。这只是检方在 2026 年 1 月的程序数量陈述，不等于每份提交都有效、独立或及时。',
        '第 4-5 页提出由 special master 筛选，并区分法院裁判与 § 853(i)、28 C.F.R. Part 9 下的 DOJ remission。',
        '第 5-6 页主张，由于申请人数、资金追踪、SEC 既有补偿、退款和其他追回，逐一计算赔偿不切实际，因而建议通过 claims administrator 进行 remission。',
        'Doc 858 后来认定赔偿不切实际并授权 remission，但仍保留第三方权利实体问题，并没有把所有 § 853(n) 申请自动变成 remission。',
      ],
      caseConnections: ['应与辩方 Doc 789 并读，比较 constructive trust 和法院裁判范围方面的相反立场。', '应与 Docs 720、841、855、858、859、866、868 对照，区分初步没收、个别申请、附属程序管理、remission 和 mandamus。'],
      whyItMatters: ['它界定“财产权裁判”和“受害人补偿”之间的程序分叉。', '它防止把申请数量误写成所有权、损失或申请人身份已经证明。'],
      verificationTasks: ['收集已登记申请清单、邮寄材料处理规则、任何 special master 任命、筛选命令和逐项附属裁定。', '把 remission 管理人、资格规则、通知、期限和分配与 § 853(n) 分开追踪。'],
      riskFlags: ['检方关于 standing 和申请分类的分析属于诉讼立场，不是法院裁定。', 'remission 属酌情行政救济，不等同于法院所有权判决。', '本地 PDF 来自 NFSC 备用镜像，仍待 PACER/RECAP 认证。'],
      findings: [
        finding('legalReading', '检方区分法院 § 853(n) 所有权申请和酌情 remission，并主张普通欺诈受害人通常只是一般债权人。', [1, 2, 3]),
        finding('summary', '检方称约有 134 项案卷申请和约 238 份邮寄材料，并支持 special master 审查。', [4]),
        finding('caseConnections', '检方请求认定赔偿不切实际并改用 remission；Doc 858 后来批准该结果。', [5, 6]),
      ],
    },
  }),
  'sdny-23-cr-118:789': report({
    sha256: 'e9f2b6bf50c5a2233048a0b268b8e22ee29c4300c18791cd54e60a1e06e08d14',
    posture: 'defense_position',
    researchQuality: 'body_verified',
    en: {
      summary: 'This four-page January 16, 2026 defense response agrees that victim-by-victim restitution is impracticable but disputes the government\'s proposed narrowing of § 853(n). The defense argues that traceable constructive-trust interests may be judicially cognizable, that the court must decide standing and ownership, and that a special master should do more than recommend summary dismissal. Its victim, loss, bankruptcy, and China-related statements are defense advocacy, not judicial findings.',
      plainEnglish: 'The parties agree that ordinary restitution would be too difficult, but disagree over what happens to people claiming ownership. The defense says the government should not simply reroute most people into an administrative compensation process. A claimant who can trace a legal interest to particular property should receive a court determination. Whether any claimant can actually do that remains unresolved.',
      legalReading: [
        'Pages 1-2 distinguish § 853(n) court proceedings from § 853(i) remission and invoke Second Circuit constructive-trust authority. The defense says properly traced interests may qualify even in a multi-victim fraud.',
        'Pages 2-3 state that the court, not the prosecution, ultimately determines standing and the legal sufficiency of third-party interests. The defense agrees in principle with appointing a special master but proposes a broader adjudicative-assistance role.',
        'Page 3 agrees with the government that restitution is impracticable. Agreement on that procedural issue is not an admission that the government\'s victim list, loss total, or forfeiture amount is correct.',
        'Page 4 argues that uncertainty over losses, third-party petitions, bankruptcy assets, and prior compensation undermines the government\'s broader figures. It also raises alleged CCP influence; that is a defense contention and was not adopted as a finding in this filing.',
        'Doc 858 later authorized remission, rejected most of the forfeiture objections, and expressly reserved § 853(n) merits without deciding them.',
      ],
      caseConnections: ['Compare directly with Doc 785 and the later court ruling in Doc 858.', 'Use Docs 841, 866, and 868 to track whether individual petitions were docketed, unsealed for government access, and adjudicated.'],
      whyItMatters: ['It shows agreement on the impracticability of restitution while preserving a sharp dispute over judicial ownership claims.', 'It prevents the defense\'s political and bankruptcy theories from being silently converted into neutral facts.'],
      verificationTasks: ['Check later ancillary orders for how the court treated constructive-trust, tracing, general-creditor, and bona-fide-purchaser theories.', 'Verify any claim count, bankruptcy asset amount, and alleged victim statement against the underlying docket.'],
      riskFlags: ['All ownership, victim, loss, bankruptcy, and CCP-related assertions are party positions unless later adopted by a court.', 'Agreement that restitution is impracticable does not determine remission eligibility or ownership.', 'The local PDF is an NFSC backup copy.'],
      findings: [
        finding('legalReading', 'The defense distinguishes judicial § 853(n) adjudication from discretionary remission and relies on constructive-trust authority.', [1, 2]),
        finding('legalReading', 'The defense says the court must determine standing and supports a broader special-master role.', [2, 3]),
        finding('summary', 'The defense agrees restitution is impracticable but disputes the government\'s victim, loss, and ownership treatment.', [3, 4]),
      ],
    },
    zh: {
      summary: '这份 4 页的 2026 年 1 月 16 日辩方回应同意逐一计算受害人赔偿不切实际，但反对检方过度缩窄 § 853(n)。辩方主张可追踪的 constructive trust 权利可能得到法院承认，standing 和所有权必须由法院决定，special master 的作用不应只限于建议快速驳回。文件中的受害人、损失、破产和中国相关说法都是辩方论证，不是法院认定。',
      plainEnglish: '双方都同意普通赔偿太复杂，但对“主张财产权的人怎么办”存在分歧。辩方认为，检方不能简单把大多数人转去行政补偿程序；如果申请人能把自己的法律权利追踪到具体财产，应由法院裁判。究竟有谁真的能满足这一门槛，本文件没有解决。',
      legalReading: [
        '第 1-2 页区分 § 853(n) 法院程序与 § 853(i) remission，并援引第二巡回关于 constructive trust 的判例，主张多受害人欺诈中也可能存在可适当追踪的权利。',
        '第 2-3 页认为 standing 和第三方法律利益最终由法院而非检方决定；辩方原则上同意任命 special master，但主张其协助范围应更广。',
        '第 3 页同意赔偿不切实际。对这一程序问题的同意，不代表承认检方受害人名单、损失总额或没收金额正确。',
        '第 4 页以损失不确定、第三方申请、破产资产和既有补偿质疑检方更广泛数字，并提出所谓中共影响；这属于辩方主张，本文件没有把它变成法院认定。',
        'Doc 858 后来授权 remission、驳回大部分没收异议，并明确保留 § 853(n) 实体问题而未裁判。',
      ],
      caseConnections: ['应与 Doc 785 及后续 Doc 858 法院裁定直接比较。', '使用 Docs 841、866、868 追踪个别申请是否登记、是否有限解封供检方访问、是否实体裁判。'],
      whyItMatters: ['它说明双方虽同意赔偿不切实际，但在法院财产权申请上仍有重大分歧。', '它防止辩方政治和破产理论被悄然写成中立事实。'],
      verificationTasks: ['检查后续附属裁定如何处理 constructive trust、追踪、一般债权人和善意购买人理论。', '把任何申请数量、破产资产金额和所谓受害人陈述与底层案卷核对。'],
      riskFlags: ['所有权、受害人、损失、破产和中共相关陈述，除非后续被法院采纳，均属于当事方立场。', '同意赔偿不切实际，并不决定 remission 资格或所有权。', '本地 PDF 来自 NFSC 备用镜像。'],
      findings: [
        finding('legalReading', '辩方区分法院 § 853(n) 裁判与酌情 remission，并依赖 constructive trust 判例。', [1, 2]),
        finding('legalReading', '辩方主张 standing 应由法院决定，并支持 special master 承担更广泛作用。', [2, 3]),
        finding('summary', '辩方同意赔偿不切实际，但争议检方对受害人、损失和所有权的处理。', [3, 4]),
      ],
    },
  }),
  'sdny-23-cr-118:799': report({
    sha256: '302198c50ee9616223f23d2e677f550a4c076d443d3f11a7cb34723f0c8a1f6e',
    posture: 'defense_motion',
    researchQuality: 'body_verified',
    en: {
      summary: 'This 34-page defense filing, including exhibits, objects to Doc 720\'s approximately $1.3 billion forfeiture judgment. The defense disputes the scope of proceeds, personal acquisition or control, use of acquitted GTV conduct, and timing of offsets; it proposes a maximum net figure of $164,003,920.07 after asserted recoveries. These are defense calculations and legal positions. Doc 858 later deducted only $411 million, fixed the money judgment at $889 million, and rejected or deferred the remaining theories.',
      plainEnglish: 'The defense argues that money flowing into an entity is not automatically money Guo personally obtained or criminal proceeds. It also says the government should not collect twice and should respect the three acquittals. The defense\'s proposed 164-million-dollar figure is not the court\'s number. The later court order used 889 million dollars.',
      legalReading: [
        'Pages 1-3 identify four objections: scope of the fraud, personal acquisition, acquitted conduct, and offsets. Guo states no personal interest in the listed specific property while contesting the personal money judgment.',
        'Pages 3-9 rely on statements by Himalaya, Hamilton, and other investors who disclaimed victim status. Those statements may be relevant evidence but do not alone define the legal scope of criminal fraud or forfeiture.',
        'Pages 9-11 invoke Honeycutt and later Second Circuit cases to argue that Guo did not personally obtain or control all entity funds. Doc 858 later found control by a preponderance based on other trial evidence.',
        'Pages 11-16 argue that acquitted GTV conduct should not support forfeiture. Doc 858 avoided deciding that issue because it deducted $411 million already disgorged through the SEC proceeding.',
        'Pages 17-21 and Exhibit A request offsets for SEC disgorgement, seized cash, bankruptcy assets, and other property and propose $164,003,920.07 as the remaining figure. The court later allowed only the $411 million GTV deduction at that stage.',
        'Page 2 incorrectly says the jury found Guo guilty of ten of thirteen counts. The signed Doc 395 verdict and Doc 860 judgment control: nine guilty counts and three acquittals as to Guo; Count 13 concerned Je.',
        'Pages 25-34 reproduce the 2021 SEC administrative order, which concerned unregistered offerings and consented relief; it must not be restated as an adjudication of every criminal fraud allegation.',
      ],
      caseConnections: ['Read with government response Doc 803 and defense reply Doc 804, then use Doc 858 as the controlling court disposition.', 'The SEC exhibit, bankruptcy assets, and third-party petitions belong to related but legally distinct recovery tracks.'],
      whyItMatters: ['It is the fullest defense roadmap against the original forfeiture amount.', 'It contains a count-level factual error and proposed arithmetic that automated summaries must not repeat as adjudicated fact.'],
      verificationTasks: ['Track final ancillary offsets asset by asset rather than assuming all seized property reduces the judgment immediately.', 'Authenticate the filing and exhibits through PACER/RECAP and preserve the distinction between the 21-page motion and attached exhibits.'],
      riskFlags: ['The $164,003,920.07 figure and asserted $1,135,996,079.93 recovery are defense calculations, not court findings.', 'Investor-status and CCP-influence assertions are contested and require independent verification.', 'The filing\'s “ten of thirteen” statement conflicts with the verdict and judgment.'],
      findings: [
        finding('summary', 'The defense challenges the $1.3 billion judgment on scope, personal acquisition, acquitted-conduct, and offset grounds.', [1, 2, 9, 11, 17]),
        finding('legalReading', 'The defense proposes a net maximum of $164,003,920.07 after asserted recoveries; Doc 858 later adopted only a $411 million deduction.', [20, 21, 23]),
        finding('riskFlags', 'The filing says ten guilty counts, but then lists three acquittals; Docs 395 and 860 establish nine convictions and three acquittals as to Guo.', [2]),
      ],
    },
    zh: {
      summary: '这份 34 页辩方文件（含附件）反对 Doc 720 约 13 亿美元没收金钱判决。辩方争议收益范围、郭是否亲自取得或控制、是否使用 GTV 无罪行为以及抵扣时点，并在扣除其主张的既有追回后提出 164,003,920.07 美元的最高净额。这些是辩方计算和法律立场。Doc 858 后来只扣除 4.11 亿美元，将金钱判决定为 8.89 亿美元，并驳回或推迟其余理论。',
      plainEnglish: '辩方认为，资金进入某个实体，不自动等于郭亲自取得了这笔钱，也不自动等于犯罪收益；检方也不能重复收取，还应尊重三项无罪。辩方提出的约 1.64 亿美元不是法院数字，后续法院采用的是 8.89 亿美元。',
      legalReading: [
        '第 1-3 页提出四类异议：欺诈范围、亲自取得、无罪行为和抵扣。郭表示不主张列明具体财产中的个人权利，同时反对个人金钱判决。',
        '第 3-9 页依赖 Himalaya、Hamilton 和其他投资人否认受害人身份的陈述；这些可能是相关证据，但不能单独决定刑事欺诈或没收的法律范围。',
        '第 9-11 页援引 Honeycutt 及后续第二巡回判例，主张郭没有亲自取得或控制全部实体资金；Doc 858 后来基于其他审判证据按优势证据认定控制。',
        '第 11-16 页主张 GTV 无罪行为不应支持没收；Doc 858 因为扣除了已通过 SEC 程序返还的 4.11 亿美元，没有裁判该问题。',
        '第 17-21 页及 Exhibit A 请求扣除 SEC 返还、查扣现金、破产资产和其他财产，并提出 164,003,920.07 美元余额；法院在该阶段只认可 4.11 亿美元 GTV 扣除。',
        '第 2 页错误写成陪审团认定郭“13 项中 10 项有罪”。应以签署的 Doc 395 和 Doc 860 为准：郭九项定罪、三项无罪；第 13 项针对 Je。',
        '第 25-34 页附有 2021 年 SEC 行政命令，涉及未注册发行和同意救济，不能改写成对每项刑事欺诈指控的裁判。',
      ],
      caseConnections: ['与检方 Doc 803、辩方 Doc 804 并读，最终以 Doc 858 法院处理为准。', 'SEC 附件、破产资产和第三方申请属于相关但法律上不同的追回程序。'],
      whyItMatters: ['它是反对初始没收金额最完整的辩方路线图。', '它包含罪名数量错误和辩方计算，自动摘要不得把这些内容当作法院认定重复。'],
      verificationTasks: ['逐项资产追踪最终附属抵扣，不要假定所有查扣财产立即减少金钱判决。', '通过 PACER/RECAP 认证文件及附件，并保留 21 页主文与附件的区别。'],
      riskFlags: ['164,003,920.07 美元和已追回 1,135,996,079.93 美元均属辩方计算，不是法院认定。', '投资人身份和中共影响主张存在争议，需要独立核验。', '文件中的“十项定罪”与裁决表和判决冲突。'],
      findings: [
        finding('summary', '辩方从范围、亲自取得、无罪行为和抵扣四方面反对 13 亿美元判决。', [1, 2, 9, 11, 17]),
        finding('legalReading', '辩方在主张抵扣后提出 164,003,920.07 美元最高净额；Doc 858 后来只采用 4.11 亿美元扣除。', [20, 21, 23]),
        finding('riskFlags', '文件写成十项定罪但又列出三项无罪；Docs 395、860 确认郭为九项定罪、三项无罪。', [2]),
      ],
    },
  }),
  'sdny-23-cr-118:803': report({
    sha256: '71fb0c37837d8b67f8407f9143bace146c1a5628629d53eb819d387ab9d52325',
    posture: 'government_response',
    researchQuality: 'body_verified',
    en: {
      summary: 'This 11-page February 17, 2026 government response argues that Guo waived his objections to Doc 720 and that the objections fail on the merits. The government defends gross-inflow methodology, control-based acquisition, use of GTV conduct within the RICO forfeiture theory, and deferral of offsets until third-party claims end. These are prosecution positions. Doc 858 declined to decide waiver, accepted much of the merits framework, but reduced the judgment by $411 million to $889 million.',
      plainEnglish: 'The prosecution answers the defense point by point. It says Guo waited too long, controlled the entities even if his name was not on every account, and could not immediately subtract property that might later be awarded to third parties. The judge did not decide the waiver accusation and did not accept the original amount in full.',
      legalReading: [
        'Pages 1-4 recount the government\'s procedural history and waiver theory. Doc 858 page 5 expressly states that the court expressed no view on waiver and preferred to decide the merits.',
        'Pages 5-6 defend a reasonable-estimate, gross-inflow approach and argue that subjective self-identification as a victim is not an element of criminal fraud or the controlling forfeiture inquiry.',
        'Pages 7-8 argue that post-Honeycutt acquisition includes funds under a defendant\'s control and cite trial evidence for Guo\'s alleged control. Doc 858 later adopted a control finding by a preponderance.',
        'Pages 8-9 argue that the RICO conviction permits consideration of GTV conduct despite the substantive GTV acquittals. Doc 858 did not need to decide that dispute because it deducted the $411 million GTV component.',
        'Page 10 argues that credit for listed specific property should wait until ancillary claims are adjudicated and title is finalized. Doc 858 followed that timing approach and declined immediate deduction of listed or bankruptcy property.',
      ],
      caseConnections: ['Compare with Docs 799 and 804 for the defense position and Doc 858 for each issue actually resolved.', 'Keep GTV acquittals visible even where the government advances a broader RICO forfeiture theory.'],
      whyItMatters: ['It provides the government\'s complete response to the core forfeiture objections.', 'The later order is mixed: substantial legal acceptance, no waiver ruling, and a $411 million reduction.'],
      verificationTasks: ['Map each Doc 803 argument to Doc 858 rather than labeling the response simply “granted” or “denied.”', 'Track final credit for specific property after ancillary proceedings.'],
      riskFlags: ['Government arguments and characterizations of delay are advocacy, not findings.', 'The original $1.3 billion amount is superseded by the later $889 million judgment.', 'The local PDF is an NFSC backup copy.'],
      findings: [
        finding('summary', 'The government argues waiver and defends the $1.3 billion judgment on the merits.', [1, 3, 4, 11]),
        finding('legalReading', 'The government relies on gross inflows, control-based acquisition, RICO treatment of GTV conduct, and delayed offsets.', [5, 6, 7, 8, 9, 10]),
        finding('caseConnections', 'Doc 858 expressed no view on waiver and reduced the judgment by $411 million despite accepting substantial parts of the merits framework.', [1, 10, 11]),
      ],
    },
    zh: {
      summary: '这份 11 页的 2026 年 2 月 17 日检方回应主张郭已经放弃对 Doc 720 的异议，而且异议在实体上也不成立。检方为总流入方法、基于控制的“取得”、RICO 没收中使用 GTV 行为以及第三方程序结束后再抵扣进行辩护。这些是检方立场。Doc 858 没有裁判 waiver，实体上接受了相当部分框架，但扣除 4.11 亿美元，将判决降至 8.89 亿美元。',
      plainEnglish: '检方逐项回应辩方：郭提出太晚；即使账户不在其名下也控制相关实体；可能最终返还第三方的财产不能现在就全部扣除。法官没有裁判“放弃异议”，也没有全额接受初始金额。',
      legalReading: [
        '第 1-4 页陈述检方的程序历史和 waiver 理论；Doc 858 第 5 页明确写明法院不对 waiver 表态，而选择处理实体问题。',
        '第 5-6 页为合理估算和总流入方法辩护，并主张个人是否自认受害人不是刑事欺诈要件，也不是控制没收范围的标准。',
        '第 7-8 页主张 Honeycutt 之后的“取得”仍包括被告控制的资金，并援引审判证据证明所谓控制；Doc 858 后来按优势证据采纳控制认定。',
        '第 8-9 页主张 RICO 定罪允许考虑 GTV 行为，尽管 GTV 具体罪名无罪；Doc 858 因扣除 4.11 亿美元 GTV 部分而无需裁判该争议。',
        '第 10 页主张列明具体财产要等第三方申请和最终产权完成后才抵扣；Doc 858 采纳该时点处理，拒绝立即扣除列明财产或破产财产。',
      ],
      caseConnections: ['与 Docs 799、804 的辩方立场比较，并以 Doc 858 判断每项争点实际如何解决。', '即使检方提出较宽的 RICO 没收理论，也必须保留 GTV 两项无罪结果。'],
      whyItMatters: ['它完整呈现检方对核心没收异议的回应。', '后续法院结果是混合的：实体上大量接受、不裁判 waiver、同时减少 4.11 亿美元。'],
      verificationTasks: ['把 Doc 803 每项论证映射到 Doc 858，不能简单标成“获准”或“驳回”。', '在附属程序后追踪具体财产的最终抵扣。'],
      riskFlags: ['检方关于拖延等描述属于诉讼论证，不是法院认定。', '初始 13 亿美元金额已被后续 8.89 亿美元判决取代。', '本地 PDF 来自 NFSC 备用镜像。'],
      findings: [
        finding('summary', '检方主张异议已放弃，并在实体上为 13 亿美元判决辩护。', [1, 3, 4, 11]),
        finding('legalReading', '检方依赖总流入、基于控制的取得、RICO 对 GTV 的处理和延后抵扣。', [5, 6, 7, 8, 9, 10]),
        finding('caseConnections', 'Doc 858 不对 waiver 表态，并在接受部分实体框架的同时扣除 4.11 亿美元。', [1, 10, 11]),
      ],
    },
  }),
  'sdny-23-cr-118:826': report({
    sha256: '6ef3392bc2cb92c6d917902c7a6abb750d81823fe503d466bbbdec7c83f09703',
    posture: 'defense_correction',
    researchQuality: 'body_verified',
    en: {
      summary: 'This one-page March 26, 2026 defense letter corrects a factual statement in an earlier sentencing submission. The defense says ACA Capital is an independent investment-services provider, distinct from the ACA Family Fund Investment Company, and is not owned by Guo, his family, or a Guo family entity. The letter corrects the prior filing and says no other substantive changes were made. It is a party correction, not a judicial ownership finding.',
      plainEnglish: 'The defense discovered that an earlier brief put ACA Capital in the wrong category. It formally corrected the sentence: ACA Capital should not be described as a Guo family entity. This is important for the relationship map, but the correction itself is not a court investigation or final corporate-ownership ruling.',
      legalReading: [
        'Page 1 identifies the exact prior error: the March 20, 2026 sentencing submission called ACA Capital “a Guo family entity.”',
        'The defense states that ACA Capital is distinct from ACA Family Fund Investment Company and is not owned by Guo, his family, or a Guo family entity.',
        'The corrected sentencing submission and its page 44/footnote 43 should be treated as the operative defense version for that factual point; the original description should be marked superseded rather than silently deleted.',
        'Nothing in this one-page letter resolves the separate bankruptcy trustee allegations, SEC allegations, or any court finding about ACA-related entities.',
      ],
      caseConnections: ['Link this correction to the ACA bankruptcy adversary case and the corrected sentencing submission, but keep ACA Capital distinct from ACA Family Fund unless an official record proves otherwise.', 'Use it as a relationship-audit correction and as a warning that party briefs can contain factual errors.'],
      whyItMatters: ['It prevents the relationship graph from converting a defense drafting error into an asserted Guo-family ownership fact.', 'It demonstrates why superseded filings and corrections must remain versioned.'],
      verificationTasks: ['Collect the corrected sentencing submission and verify the corrected page 44 and footnote 43.', 'Check official corporate, bankruptcy, and court records before assigning any ownership or control edge.'],
      riskFlags: ['The defense correction is not an independent court finding.', 'Do not infer that “not owned by Guo” resolves every other affiliation, transaction, or witness relationship.', 'The local PDF is an NFSC backup copy.'],
      findings: [
        finding('summary', 'The defense corrected its prior description of ACA Capital and stated that it is independent of Guo and his family.', [1]),
        finding('riskFlags', 'The filing corrects a party submission; it does not adjudicate ACA Capital ownership or control.', [1]),
      ],
    },
    zh: {
      summary: '这份 2026 年 3 月 26 日的 1 页辩方函件纠正了此前量刑提交中的事实表述。辩方说明，ACA Capital 是独立的投资服务提供商，与 ACA Family Fund Investment Company 不同，不由郭、郭家族或任何郭家族实体所有。函件修正了此前文件，并表示没有其他实质修改。它是当事方更正，不是法院作出的所有权认定。',
      plainEnglish: '辩方发现早先的书状把 ACA Capital 归错了类别，于是正式更正：不能把 ACA Capital 写成郭家族实体。这对案件关系图很重要，但这封更正函本身不是法院调查，也不是最终公司所有权裁判。',
      legalReading: [
        '第 1 页明确指出错误来源：2026 年 3 月 20 日量刑提交把 ACA Capital 称为“郭家族实体”。',
        '辩方说明 ACA Capital 与 ACA Family Fund Investment Company 不同，并非郭、其家族或郭家族实体所有。',
        '就这一事实点，应以更正后的量刑提交及第 44 页、脚注 43 为辩方有效版本；原表述应标记为已被更正，而不是无痕删除。',
        '本 1 页函件没有解决破产受托人指控、SEC 指控或法院对 ACA 相关实体的任何认定。',
      ],
      caseConnections: ['应把更正连接到 ACA 破产对抗案和更正后的量刑提交，但在没有官方记录证明前，须把 ACA Capital 与 ACA Family Fund 分开。', '它应作为关系审计的纠错记录，也说明当事方书状可能存在事实错误。'],
      whyItMatters: ['它防止关系图把辩方起草错误变成郭家族所有权事实。', '它说明被更正文件和更正文件必须保留版本关系。'],
      verificationTasks: ['收集更正后的量刑提交，核对第 44 页和脚注 43。', '在设置任何所有权或控制关系前，核对官方公司、破产和法院记录。'],
      riskFlags: ['辩方更正不是独立的法院认定。', '“不由郭所有”并不能解决其他关联、交易或证人关系。', '本地 PDF 来自 NFSC 备用镜像。'],
      findings: [
        finding('summary', '辩方纠正了对 ACA Capital 的描述，并称其独立于郭及其家族。', [1]),
        finding('riskFlags', '该文件纠正当事方提交内容，但没有裁判 ACA Capital 的所有权或控制权。', [1]),
      ],
    },
  }),
  'sdny-23-cr-118:841': report({
    sha256: '49c295030ca7714a9cc5bbd8b4c052f77732208e370e0ffe39a9407fe7c42f68',
    posture: 'third_party_ancillary_petition',
    researchQuality: 'body_verified',
    en: {
      summary: 'This five-page verified § 853(n) petition by 1328777 B.C. Ltd. seeks adjudication of a claimed $6 million interest in specific property listed in Doc 720. The petitioner says it is an investment vehicle of Xiao Yan Jia, transferred $6 million in August 2022 to acquire Himalaya Coin, received no coin or value, and suffered a total loss. It requests exclusion of the property, alternatively a § 853(n) hearing and discovery, or compensation through DOJ remission. The petition states a claim; it is not proof that the petitioner has standing, a superior interest, or victim status as a legal conclusion.',
      plainEnglish: 'A company is asking the court to separate 6 million dollars from the forfeiture pool. It says the money belonged to the company, the promised Himalaya Coin was never delivered, and the funds should not be treated as Guo’s forfeitable property. It also asks for a hearing or, if that fails, an administrative compensation route. The judge still has to decide whether the legal test is met.',
      legalReading: [
        'Pages 1-2 identify the petitioner, its claimed relationship to Xiao Yan Jia, the August 2022 $6 million transfer, and the claimed absence of coin, value, or refund.',
        'Pages 2-3 repeat allegations drawn from the indictment about Himalaya Coin and Guo. Those statements are petition allegations and references to the government theory, not independent findings in this petition.',
        'Pages 1, 3, and 4 invoke § 853(n)(6)(A), a hearing under § 853(n)(4)-(5), and alternative remission. These are legally different remedies: judicial adjudication of a specific property interest versus discretionary administrative compensation.',
        'Page 4 requests exclusion, a hearing with discovery, or MNF remission; page 5 contains the sworn verification. No disposition is shown in this document.',
      ],
      caseConnections: ['Read with Doc 720 for the listed-property process, Doc 785 for the government’s remission/standing position, Doc 789 for the defense response, and Docs 858/866/868 for later procedural treatment.', 'The petition is one claimant example and cannot be generalized to all Himalaya Exchange customers.'],
      whyItMatters: ['It shows how a claimant distinguishes a property-ownership claim from a general request for compensation.', 'It is a concrete test case for the boundary between the criminal forfeiture judgment, third-party ancillary claims, and remission.'],
      verificationTasks: ['Locate any government response, hearing order, final ancillary ruling, settlement, or remission decision for this petitioner.', 'Verify the underlying transfer records and whether the claimed $6 million maps to property listed in Doc 720 rather than only to a general loss.'],
      riskFlags: ['The petition’s allegations about solicitation, fraud, and total loss are not judicial findings.', 'A claimed investment loss does not automatically establish a superior legal interest in specific forfeited property.', 'The PDF body was recovered with bundled local OCR; the local copy is an NFSC backup mirror.'],
      findings: [
        finding('summary', '1328777 B.C. Ltd. seeks exclusion or adjudication of a claimed $6 million interest in Himalaya-related specific property.', [1, 2, 4]),
        finding('legalReading', 'The petition invokes § 853(n) ownership adjudication and alternatively DOJ remission, which are distinct remedies.', [1, 3, 4]),
        finding('riskFlags', 'The document is a verified third-party petition, not a ruling that the petitioner has standing or a superior interest.', [1, 4, 5]),
      ],
    },
    zh: {
      summary: '这份 5 页经宣誓的 § 853(n) 第三方申请由 1328777 B.C. Ltd. 提出，请求法院裁判其对 Doc 720 所列具体财产中 600 万美元的权利。申请人称其是 Xiao Yan Jia 的投资载体，2022 年 8 月支付 600 万美元购买 Himalaya Coin，但没有收到代币或其他价值，也没有任何返还。申请人请求排除该财产，或者举行 § 853(n) 听证并允许取证，或者改由 DOJ remission 补偿。申请书只是权利主张，并不证明其已经具备 standing、优先权利或法律上的受害人身份。',
      plainEnglish: '一家公司的请求是：把 600 万美元从没收池中分出来。它说钱属于公司，承诺的 Himalaya Coin 没有交付，因此不能把这笔钱当成郭可以被没收的财产；如果不能直接排除，就要求听证，或者走行政补偿。是否符合这些法律条件，还要由法院裁判。',
      legalReading: [
        '第 1-2 页列出申请人、其与 Xiao Yan Jia 的关系主张、2022 年 8 月转账 600 万美元，以及没有收到代币、价值或退款的主张。',
        '第 2-3 页重复起诉书中关于 Himalaya Coin 和郭的指控；这些是申请书中的主张和对检方理论的引用，不是申请书独立形成的法院认定。',
        '第 1、3、4 页援引 § 853(n)(6)(A)、§ 853(n)(4)-(5) 听证及 remission；它们分别对应法院裁判具体财产权利和行政机关酌情补偿。',
        '第 4 页请求排除财产、听证取证或 MNF remission；第 5 页是宣誓核验。本文件没有记录后续处分。',
      ],
      caseConnections: ['与 Doc 720 的具体财产程序、Doc 785 的检方 remission/standing 立场、Doc 789 的辩方回应，以及 Docs 858/866/868 的后续程序并读。', '这只是一个申请案例，不能推广为全部 Himalaya Exchange 客户的法律结论。'],
      whyItMatters: ['它展示了申请人如何区分“具体财产所有权申请”和“普通损失补偿请求”。', '它是观察刑事没收判决、第三方附属申请与 remission 边界的具体案例。'],
      verificationTasks: ['寻找检方回应、听证命令、最终附属裁定、和解或 remission 决定。', '核验底层转账，并确认 600 万美元是否对应 Doc 720 列出的特定财产，而不是只有一般损失。'],
      riskFlags: ['申请书关于招揽、欺诈和总损失的陈述不是法院认定。', '主张投资损失不自动证明对特定没收财产拥有优先法律权利。', '正文由本地 OCR 恢复；本地副本来自 NFSC 备用镜像。'],
      findings: [
        finding('summary', '1328777 B.C. Ltd. 请求排除或裁判其对 Himalaya 相关具体财产中 600 万美元的权利。', [1, 2, 4]),
        finding('legalReading', '申请同时援引 § 853(n) 所有权裁判和 DOJ remission，两者是不同救济。', [1, 3, 4]),
        finding('riskFlags', '这是经宣誓的第三方申请，不是法院已经认定申请人有 standing 或优先权利。', [1, 4, 5]),
      ],
    },
  }),
  'sdny-23-cr-118:855': report({
    sha256: '051cf26b4137943078c2a1f8b107da0440c1ce675b7d317ecaa6af012a5cee80',
    posture: 'court_order',
    researchQuality: 'body_verified',
    en: {
      summary: 'This one-page June 25, 2026 order denied Guo’s motion to adjourn the June 29 sentencing. The court stated that no evidentiary Fatico hearing was needed, that the Rule 17(c) subpoena and Brady motion did not justify delay, and that ancillary § 853(n) claims and any special-master issue did not need to be resolved before sentencing. It did not decide the merits of third-party claims or the final forfeiture amount in this order.',
      plainEnglish: 'The judge decided that sentencing could proceed without waiting for a separate evidence hearing or for the third-party property process to finish. That does not mean the third-party claims were rejected; it means they were not a prerequisite to sentencing.',
      legalReading: [
        'Page 1 denies ECF 853 and terminates the motion.',
        'The court states it can make the factual determinations necessary for sentencing without a Fatico evidentiary hearing and notes that the Rule 17(c) and Brady issues do not justify delay.',
        'The court expressly separates sentencing from ancillary § 853(n) petitions and special-master administration, stating that those issues need not be resolved before sentencing and that further guidance would follow.',
        'Doc 864 later records the sentencing outcome; Doc 858 records the forfeiture ruling; neither should be back-projected into this short scheduling order.',
      ],
      caseConnections: ['Read with Doc 853 for the defense request and Docs 858/864 for the later forfeiture and sentencing decisions.', 'It is a key procedural bridge explaining why sentencing occurred before all third-party property questions were resolved.'],
      whyItMatters: ['It prevents a false inference that unresolved ancillary claims were implicitly denied.', 'It clarifies that a Fatico hearing request and an ancillary ownership proceeding are different procedural matters.'],
      verificationTasks: ['Track the promised later guidance and all post-sentencing ancillary orders.', 'Keep the scheduling order separate from the merits findings in Docs 858 and 864.'],
      riskFlags: ['The order resolves timing, not ownership or the truth of either party’s factual account.', 'The local PDF is an NFSC backup copy.'],
      findings: [
        finding('summary', 'The court denied adjournment and held that sentencing did not require a Fatico hearing or prior resolution of § 853(n) claims.', [1]),
        finding('legalReading', 'The court separated sentencing from ancillary forfeiture administration and reserved further guidance.', [1]),
      ],
    },
    zh: {
      summary: '这份 2026 年 6 月 25 日的 1 页法院命令驳回郭要求推迟 6 月 29 日量刑的动议。法院说明，不需要证据型 Fatico 听证，Rule 17(c) 传票和 Brady 动议不足以构成延期理由；§ 853(n) 第三方申请和 special master 问题也不必在量刑前解决。本命令没有裁判第三方申请实体，也没有确定最终没收金额。',
      plainEnglish: '法官认为量刑可以先进行，不必等另一场证据听证，也不必等第三方财产程序完成。这不表示第三方申请被驳回，只表示它们不是量刑开始的前置条件。',
      legalReading: [
        '第 1 页驳回 ECF 853 并终结该动议。',
        '法院认为无需 Fatico 证据听证即可作出量刑所需事实判断，并指出 Rule 17(c) 和 Brady 问题不足以延期。',
        '法院明确把量刑与 § 853(n) 附属申请和 special master 管理分开，说明这些问题不必在量刑前解决，后续会另行指导。',
        'Doc 864 才记录后来的量刑结果，Doc 858 才记录没收裁定；不能把这些结果倒推成这份简短排期命令的内容。',
      ],
      caseConnections: ['与 Doc 853 的辩方延期申请以及 Docs 858、864 的后续没收和量刑裁定一起阅读。', '它是解释“量刑先行、第三方财产权问题后处理”的关键程序节点。'],
      whyItMatters: ['它防止把尚未解决的附属申请误读为已经被默示驳回。', '它区分 Fatico 听证请求与第三方所有权程序。'],
      verificationTasks: ['追踪法院所说的后续指导和量刑后的附属命令。', '把本排期命令与 Docs 858、864 的实体认定分开。'],
      riskFlags: ['本命令解决的是时间安排，不是所有权或双方事实陈述的真实性。', '本地 PDF 来自 NFSC 备用镜像。'],
      findings: [
        finding('summary', '法院驳回延期，并认定量刑不需要 Fatico 听证或提前解决 § 853(n) 申请。', [1]),
        finding('legalReading', '法院将量刑与附属没收管理分开，并保留后续指导。', [1]),
      ],
    },
  }),
  'sdny-23-cr-118:859': report({
    sha256: 'a10fae7c54a7dcc543219d5e09d9bb19590df142af98b591d66afda5168d8642',
    posture: 'court_order',
    researchQuality: 'body_verified',
    en: {
      summary: 'This six-page June 30, 2026 supplemental preliminary order forfeits additional specific property: a roughly $2.11 million Banco Popular check formerly associated with G Club Operations LLC and four Barclays accounts formerly held in the names of Kin Ming Je and Sin Ting Rong. It is final as to Guo under Rule 32.2(b)(4), authorizes government possession and notice, and preserves a later § 853(n) ancillary process. It supplements the specific-property process; it does not reset the controlling money judgment from $889 million to $1.3 billion.',
      plainEnglish: 'The judge added five more categories of specific property to the forfeiture process. The order lets the government hold them and tells possible third-party owners how to file claims. This is like adding items to the property list, not creating a second $1.3 billion bill. The current money-judgment baseline remains the later $889 million figure in Doc 858 and the judgment.',
      legalReading: [
        'Pages 1-4 identify the five additional property categories and state that they are alleged proceeds of the convicted counts or property involved in the money-laundering conspiracy.',
        'Page 4 makes the order final as to Guo and authorizes government possession, subject to Title 21 U.S.C. § 853 and third-party claims.',
        'Pages 5-6 establish publication and actual-notice deadlines, require a sworn petition describing the nature, extent, and acquisition of the claimed interest, and reserve a final order after ancillary adjudication.',
        'The order references the earlier approximately $1.3 billion preliminary order, but Doc 858 later reduced the money judgment by $411 million to $889 million. The listed additional property and the money judgment must not be double-counted.',
        'No finding in this six-page order adjudicates whether Kin Ming Je, Sin Ting Rong, G Club Operations LLC, or another third party has a superior interest.',
      ],
      caseConnections: ['Read with Doc 790, the government request that preceded the order, and Doc 858 for the controlling money-judgment amount.', 'Track forfeiture.gov notice, § 853(n) petitions, and any final order separately from the criminal judgment and remission.'],
      whyItMatters: ['It is an operative post-judgment asset-recovery order involving related entities and named account holders.', 'It corrects the common display error of treating every supplemental property order as a new money judgment.'],
      verificationTasks: ['Collect the official forfeiture.gov notice, mailing records, petitions, responses, and final order for each of the five categories.', 'Authenticate against PACER/RECAP and reconcile any later credit or disposition asset by asset.'],
      riskFlags: ['The property is forfeited subject to the statutory ancillary process; ownership merits remain open.', 'The order does not create an additional $1.3 billion liability.', 'The local PDF is an NFSC backup copy.'],
      findings: [
        finding('summary', 'The court ordered supplemental forfeiture of a G Club Operations-related $2.11 million check and four Je/Rong Barclays accounts.', [3, 4]),
        finding('legalReading', 'The order authorizes possession and creates notice and § 853(n) petition deadlines while reserving a final order after third-party adjudication.', [4, 5, 6]),
        finding('riskFlags', 'The order supplements specific property and does not reset the later $889 million money-judgment baseline.', [3, 6]),
      ],
    },
    zh: {
      summary: '这份 2026 年 6 月 30 日的 6 页补充初步没收令，新增处理具体财产：一张此前与 G Club Operations LLC 相关、约 211.25 万美元的 Banco Popular 支票，以及 Kin Ming Je 和 Sin Ting Rong 名下的 4 个 Barclays 账户。该命令依 Rule 32.2(b)(4) 对郭本人具有终局效力，授权政府保管并建立通知程序，同时保留 § 853(n) 第三方附属程序。它补充的是具体财产流程，不会把控制性金钱判决从 8.89 亿美元重置为 13 亿美元。',
      plainEnglish: '法官把另外五类具体财产加入没收流程，允许政府保管，并告诉可能的第三方所有人如何申请。这像是增加财产清单，不是再开一张 13 亿美元账单。目前金钱判决基准仍是 Doc 858 和正式判决中的 8.89 亿美元。',
      legalReading: [
        '第 1-4 页列出五类新增财产，并说明它们被主张为定罪罪名的收益或洗钱合谋涉及的财产。',
        '第 4 页使命令对郭本人具有终局效力，并授权政府保管，但仍受 § 853 和第三方申请程序约束。',
        '第 5-6 页规定公开通知和实际送达期限，要求经宣誓的申请说明权利性质、范围、取得时间和事实，并保留第三方裁判后的最终命令。',
        '命令引用早先约 13 亿美元初步命令，但 Doc 858 后来扣除 4.11 亿美元，把金钱判决定为 8.89 亿美元；具体财产和金钱判决不能重复计算。',
        '本 6 页命令没有裁判 Kin Ming Je、Sin Ting Rong、G Club Operations LLC 或任何第三方是否拥有优先权利。',
      ],
      caseConnections: ['与此前检方请求 Doc 790 以及控制金钱判决金额的 Doc 858 一起阅读。', '把 forfeiture.gov 通知、§ 853(n) 申请和最终命令与刑事判决和 remission 分开追踪。'],
      whyItMatters: ['它是判决后继续追收资产、涉及关联实体和具体账户名义人的操作性命令。', '它纠正了界面把每个补充财产命令都显示成新增金钱判决的常见错误。'],
      verificationTasks: ['收集正式 forfeiture.gov 通知、送达记录、申请、回应和五类财产的最终命令。', '通过 PACER/RECAP 认证，并逐项核对后来抵扣或处分。'],
      riskFlags: ['财产虽进入没收流程，仍受第三方附属程序约束，所有权实体问题未解决。', '该命令没有新增 13 亿美元责任。', '本地 PDF 来自 NFSC 备用镜像。'],
      findings: [
        finding('summary', '法院对与 G Club Operations 相关的约 211.25 万美元支票和 4 个 Je/Rong Barclays 账户作出补充没收。', [3, 4]),
        finding('legalReading', '命令授权保管并建立通知及 § 853(n) 期限，同时保留第三方裁判后的最终命令。', [4, 5, 6]),
        finding('riskFlags', '命令补充的是具体财产，不会重置后来的 8.89 亿美元金钱判决基准。', [3, 6]),
      ],
    },
  }),
  'sdny-23-cr-118:858': report({
    sha256: '04c188ba6880417d855c976b58540f95c18d5949a324e23b2d7f4915d7b0a5a3',
    posture: 'court_order',
    en: {
      summary: 'This is an operative forfeiture decision. Applying the preponderance standard, the court found about $889 million to be a reasonable estimate of gross inflows tied to the convicted Farm Loan, G Clubs, and Himalaya Exchange conduct, sustained Guo\'s objections to deduct $411 million from the proposed $1.3 billion money judgment, denied his motion to compel seizure of bankruptcy assets, and authorized victim compensation through remission because restitution was impracticable.',
      plainEnglish: 'The judge did not accept the government\'s proposed $1.3 billion figure in full. The court reduced it by $411 million and fixed the forfeiture money judgment at $889 million. Third parties who say particular property belongs to them still have a separate claims process; this order did not decide whether those ownership claims are valid.',
      legalReading: [
        'The court used a preponderance-of-the-evidence standard and a reasonable-estimate method for forfeiture, not the beyond-a-reasonable-doubt trial standard.',
        'Page 6 identifies Farm Loan, G Clubs, and Himalaya Exchange inflows as the basis for the approximately $889 million estimate.',
        'Page 9 expressly reserves third-party property claims for 18 U.S.C. § 853(n) and Rule 32.2 ancillary proceedings and states no view on their merits.',
        'Page 17 supplies the operative relief: $411 million deduction, $889 million judgment, denial of the bankruptcy-asset seizure motion, and remission in lieu of restitution.',
        'Forfeiture amount, Guidelines loss, restitution, SEC disgorgement, and Fair Fund distributions are related but legally distinct calculations.',
      ],
      caseConnections: ['Read with Doc 860 and Doc 864 for the final sentence and oral forfeiture explanation.', 'Track § 853(n) petitions, SEC/Fair Fund credits, and bankruptcy-estate ownership disputes separately.'],
      whyItMatters: ['It fixes the monetary forfeiture baseline incorporated into the criminal judgment.', 'It preserves third-party ownership disputes rather than resolving them by implication.'],
      verificationTasks: ['Obtain the PACER docket copy and all incorporated preliminary/supplemental forfeiture orders.', 'Track later ancillary orders and remission notices asset by asset.'],
      riskFlags: ['The local PDF is an NFSC backup copy even though the text is an operative court order.', 'Do not describe the $889 million forfeiture judgment as restitution or as a final ruling on every third-party asset claim.'],
      findings: [
        finding('summary', 'The court fixed the forfeiture money judgment at $889 million after deducting $411 million from the proposed $1.3 billion figure.', [6, 17]),
        finding('legalReading', 'Third-party ownership claims were reserved for § 853(n) ancillary proceedings, and the court expressed no view on their merits.', [9]),
        finding('legalReading', 'The court denied the request to compel seizure of bankruptcy assets and found restitution impracticable, authorizing remission.', [17]),
      ],
    },
    zh: {
      summary: '这是具有操作效力的没收裁定。法院适用优势证据标准，认定与已定罪的 Farm Loan、G Clubs 和 Himalaya Exchange 行为相关的现金总流入约 8.89 亿美元属于合理估计；法院支持郭的部分异议，从检方提出的 13 亿美元中扣除 4.11 亿美元，驳回其要求强制扣押破产财产的动议，并因赔偿程序不切实际而授权通过 remission 程序补偿受害人。',
      plainEnglish: '法官没有全盘接受检方提出的 13 亿美元。法院扣掉 4.11 亿美元，把没收金钱判决定为 8.89 亿美元。主张某项财产属于自己的第三方仍可进入独立权利程序；这份裁定没有判定他们的所有权主张是否成立。',
      legalReading: [
        '法院在没收阶段使用优势证据和合理估计标准，不是定罪所需的排除合理怀疑标准。',
        '第 6 页把 Farm Loan、G Clubs 和 Himalaya Exchange 的流入作为约 8.89 亿美元估计的基础。',
        '第 9 页明确把第三方财产权利留给 18 U.S.C. § 853(n) 和 Rule 32.2 附属程序，并表示不评价其实体是否成立。',
        '第 17 页给出操作性结果：扣除 4.11 亿美元、确定 8.89 亿美元、驳回强制扣押破产资产动议，并以 remission 取代赔偿令。',
        '没收额、量刑指南损失额、刑事赔偿、SEC 返还和 Fair Fund 分配相互关联，但不是同一个法律数字。',
      ],
      caseConnections: ['应与 Doc 860 和 Doc 864 一起阅读，确认最终刑罚及法庭口头没收说明。', '应分别追踪 § 853(n) 申请、SEC/Fair Fund 抵扣和破产财产所有权争议。'],
      whyItMatters: ['它确定了写入刑事判决的没收金钱基准。', '它保留了第三方所有权争议，没有通过推论予以终结。'],
      verificationTasks: ['从 PACER 取得该裁定及其引用的初步和补充没收令正式副本。', '按资产追踪后续附属程序裁定和 remission 通知。'],
      riskFlags: ['本地 PDF 来自 NFSC 备用镜像，虽然正文属于法院裁定。', '不得把 8.89 亿美元没收判决写成刑事赔偿，也不得写成所有第三方资产主张已被终局裁判。'],
      findings: [
        finding('summary', '法院从拟议的 13 亿美元中扣除 4.11 亿美元，将没收金钱判决定为 8.89 亿美元。', [6, 17]),
        finding('legalReading', '第三方所有权主张留待 § 853(n) 附属程序处理，法院没有评价其实体是否成立。', [9]),
        finding('legalReading', '法院驳回强制扣押破产资产请求，并认定赔偿不切实际，授权 remission。', [17]),
      ],
    },
  }),
  'sdny-23-cr-118:860': report({
    sha256: '746004083ed5561a399b9b33abc8c69cf1e0540d6f2a6f39d682150c2c1429bd',
    posture: 'final_judgment',
    en: {
      summary: 'This is the July 2, 2026 criminal judgment. It records convictions on Counts 1, 2, 3, 4, 7, 8, 9, 10, and 11, acquittals on Counts 5, 6, and 12, a total prison term of 360 months, a $900 assessment, no fine or restitution, and forfeiture including an $889 million money judgment.',
      plainEnglish: 'This is the controlling judgment sheet. Nine counts produced a total 30-year sentence, not separate terms added into a longer total. The count-by-count wording is unusual, but both page 3 and the sentencing transcript confirm the total is 360 months.',
      legalReading: [
        'Pages 1-2 identify the nine counts of conviction and three acquitted counts.',
        'Page 3 states a total term of 360 months. Count 4\'s 60 months runs concurrently with Count 2\'s 360 months and consecutively to the 240-month group; it does not add 60 months on top of Count 2.',
        'Page 4 records a $900 assessment and zero restitution and fine.',
        'Page 6 incorporates ECF 720, 858, and 790 and the $889 million forfeiture money judgment.',
        'The judgment establishes the appealable criminal disposition but does not itself state the appellate issues or resolve third-party ownership claims.',
      ],
      caseConnections: ['Doc 862 appeals both conviction and sentence.', 'Doc 864 explains the Guidelines, factual findings, § 3553(a) reasoning, remission, forfeiture, and the count structure.'],
      whyItMatters: ['It is the baseline for direct appeal and sentence execution.', 'It corrects any summary that treats Count 4 as consecutive to Count 2 or states a total longer than 360 months.'],
      verificationTasks: ['Check for any amended judgment and confirm the appellate record designation.', 'Authenticate the judgment through PACER or RECAP.'],
      riskFlags: ['The local copy is from an NFSC backup mirror.', 'The $889 million forfeiture judgment is separate from the zero restitution and fine entries.'],
      findings: [
        finding('summary', 'The judgment records nine convictions, three acquittals, and a total 360-month prison sentence.', [1, 2, 3]),
        finding('legalReading', 'Count 4 runs concurrently with Count 2 and consecutively to the other counts; the total remains 360 months.', [3]),
        finding('legalReading', 'The judgment records $900 assessment, zero restitution, zero fine, and an $889 million forfeiture money judgment.', [4, 6]),
      ],
    },
    zh: {
      summary: '这是 2026 年 7 月 2 日录入的刑事判决。判决记录第 1、2、3、4、7、8、9、10、11 项定罪，第 5、6、12 项无罪，总刑期 360 个月，特别评估费 900 美元，罚金和赔偿均为 0，并包含 8.89 亿美元没收金钱判决。',
      plainEnglish: '这是控制后续上诉和执行的正式判决书。九项定罪合并后的总刑期是 30 年，不是把每项刑期逐项相加。第 3 页的写法比较特殊，但判决和量刑记录都确认总刑期是 360 个月。',
      legalReading: [
        '第 1-2 页列出九项定罪和三项无罪。',
        '第 3 页明确总刑期 360 个月。第 4 项的 60 个月与第 2 项的 360 个月并行，同时与 240 个月组连续；它不是在第 2 项之后再加 60 个月。',
        '第 4 页记录特别评估费 900 美元，赔偿和罚金均为 0。',
        '第 6 页纳入 ECF 720、858、790 及 8.89 亿美元没收金钱判决。',
        '该判决确定可上诉的刑事处分，但本身没有列出上诉争点，也没有裁判第三方所有权。',
      ],
      caseConnections: ['Doc 862 对定罪和刑罚均提出上诉。', 'Doc 864 解释量刑指南、事实认定、§ 3553(a) 理由、remission、没收和各罪名刑期结构。'],
      whyItMatters: ['它是刑事直接上诉和刑罚执行的基准。', '它纠正了“第 4 项与第 2 项连续”或总刑期超过 360 个月的错误摘要。'],
      verificationTasks: ['检查是否存在修订判决，并核对上诉记录指定。', '使用 PACER 或 RECAP 核验判决正式副本。'],
      riskFlags: ['本地副本来自 NFSC 备用镜像。', '8.89 亿美元属于没收金钱判决，与判决表中的赔偿 0、罚金 0 是不同项目。'],
      findings: [
        finding('summary', '判决记录九项定罪、三项无罪和总计 360 个月监禁。', [1, 2, 3]),
        finding('legalReading', '第 4 项与第 2 项并行、与其他罪名连续，总刑期仍为 360 个月。', [3]),
        finding('legalReading', '判决记录 900 美元评估费、赔偿 0、罚金 0，以及 8.89 亿美元没收金钱判决。', [4, 6]),
      ],
    },
  }),
  'sdny-23-cr-118:862': report({
    sha256: '7b36d4027b100242f0884837fa161e7c9e5dc01606650a904e7c7c1c61748932',
    posture: 'notice_of_appeal',
    en: {
      summary: 'This one-page notice states that Miles Guo appeals the July 2, 2026 judgment to the Second Circuit and checks both conviction and sentence.',
      plainEnglish: 'The appeal was formally started, but this form does not say what arguments will be made or whether any argument will succeed.',
      legalReading: ['A notice of appeal is jurisdictional and procedural; the merits will be defined by later appellate briefs and the record.', 'The form covers conviction and sentence, so the appeal is not limited on its face to sentencing alone.'],
      caseConnections: ['Link this filing to Second Circuit docket 26-1853, counsel appearances, transcript orders, scheduling orders, and merits briefs.'],
      whyItMatters: ['It moves review of the criminal judgment into the Second Circuit.'],
      verificationTasks: ['Verify the appellate docket and current briefing schedule from CourtListener/RECAP or PACER.'],
      riskFlags: ['Do not infer appellate issues, standards of review, or likely outcome from the notice alone.'],
      findings: [finding('summary', 'The notice appeals both conviction and sentence from the July 2, 2026 judgment.', [1])],
    },
    zh: {
      summary: '这份一页上诉通知写明，Miles Guo 就 2026 年 7 月 2 日判决向第二巡回上诉，并勾选了定罪和刑罚两项。',
      plainEnglish: '它证明上诉程序已经正式启动，但这张表没有说明将提出哪些理由，更不代表任何上诉理由会成功。',
      legalReading: ['上诉通知主要产生程序和管辖效果；实体争点要由后续上诉书状和案卷记录界定。', '表格同时覆盖定罪与刑罚，因此表面上并非只对量刑提出上诉。'],
      caseConnections: ['应连接第二巡回 26-1853 案卷、律师出庭、庭审记录订购、排期命令和实体书状。'],
      whyItMatters: ['它把刑事判决的复审程序正式移入第二巡回。'],
      verificationTasks: ['通过 CourtListener/RECAP 或 PACER 核验上诉案卷和当前书状排期。'],
      riskFlags: ['不能仅凭上诉通知推断上诉争点、审查标准或可能结果。'],
      findings: [finding('summary', '上诉通知对 2026 年 7 月 2 日判决中的定罪和刑罚同时提出上诉。', [1])],
    },
  }),
  'ca2-26-1853:15': report({
    caseId: 'ca2-26-1853',
    sha256: '2a247490751890832fa5cd7285540772d84327b48f4e5a273d4219d69efeef7f',
    posture: 'appellate_transcript_information',
    researchQuality: 'body_verified',
    reviewedAt: '2026-08-15T16:00:00.000+08:00',
    en: {
      summary: 'This two-page Form B filing tells the Second Circuit that appellant Miles Guo was not ordering additional transcripts at that time. Counsel Joshua Dratel explained that much of the record, including the complete trial transcript, had already been produced and that he was simultaneously moving to withdraw. If withdrawal were granted, he proposed leaving any further transcript decision to successor counsel. This is an appellate record-management filing, not a merits brief or a ruling on counsel\'s withdrawal.',
      plainEnglish: 'Think of Form B as a checklist for assembling the appeal file. Counsel said the main trial transcript was already available and did not order more material immediately because a possible new lawyer should first identify any gaps. That does not abandon the appeal, waive every transcript issue, prove the appellate record is complete, or show that the court approved the lawyer\'s request to leave the case.',
      legalReading: [
        'Page 1 is the Second Circuit criminal-appeal transcript form. The checked response is that no transcript was being ordered at that time, with an attached explanation; the form does not designate particular proceedings as unnecessary.',
        'Page 2 gives two stated reasons: much of the transcript, including the entire trial, had already been produced, and counsel filed a same-day motion to be relieved. The second reason is expressly conditional on that motion being granted.',
        'Under Federal Rule of Appellate Procedure 10(b), transcript arrangements help define the record needed for issues to be raised on appeal. This filing reports the then-current order decision; it does not itself settle later supplementation, record correction, or successor counsel\'s assessment.',
        'The document contains no argument concerning conviction, sentence, forfeiture, evidentiary rulings, constitutional questions, or standards of review. No merits issue should be attributed to the appellant from this form.',
        'The public appellate docket shows that the appearance form and Form B followed dismissal warnings, while a separate motion to be relieved was filed. The displayed docket through August 12, 2026 did not show an order granting withdrawal or a merits briefing schedule.',
      ],
      caseConnections: [
        'Read this filing with SDNY Doc 862, which initiated the appeal from both conviction and sentence, and with SDNY Doc 864, whose public sentencing transcript omits sealed internal transcript pages 3-30.',
        'Second Circuit Entries 12 and 13 warned that the appeal could be dismissed unless required forms were filed; Entries 14 and 15 supplied the appearance and transcript forms, and Entry 16 separately requested counsel\'s withdrawal.',
        'Any later appellate brief, record-designation filing, transcript order, or order on representation controls over this preliminary snapshot.',
      ],
      whyItMatters: [
        'It documents compliance with a required appellate filing and explains why no new transcript order was placed on August 5, 2026.',
        'It prevents three overstatements: that the appeal was abandoned, that the complete appellate record was judicially confirmed, or that counsel had already been permitted to withdraw.',
      ],
      verificationTasks: [
        'Continue monitoring Second Circuit docket 26-1853 for an order on Entry 16, any substitution of counsel, transcript supplementation, record correction, and the merits briefing schedule.',
        'Compare the appellate record designation with the sealed omission in the publicly available sentencing transcript and do not infer the omitted material.',
        'Authenticate future docket developments through PACER or CourtListener/RECAP and preserve both the filing date and later docket-update date separately.',
      ],
      riskFlags: [
        '“Not ordering at this time” is not a waiver of the appeal and is not a judicial finding that no additional transcript could be necessary.',
        'The withdrawal discussion is counsel\'s conditional explanation; the filing does not show that the court granted withdrawal.',
        'A statement that the entire trial transcript had been produced does not establish that every pretrial, post-trial, sentencing, sealed, or ancillary transcript required for every possible issue was available.',
      ],
      findings: [
        finding('summary', 'Counsel checked that no transcript was being ordered at that time and attached an explanation.', [1, 2]),
        finding('legalReading', 'Counsel stated that much of the record, including the entire trial transcript, had already been produced.', [2]),
        finding('legalReading', 'Counsel also stated that he was moving to be relieved and proposed allowing successor counsel to identify any missing or necessary transcripts if the motion were granted.', [2]),
        finding('riskFlags', 'The document is neither a merits brief nor an order granting withdrawal and contains no appellate merits arguments.', [1, 2]),
      ],
    },
    zh: {
      summary: '这份两页 Form B 告知第二巡回：Miles Guo 的上诉律师当时不新增订购庭审记录。Joshua Dratel 解释，现有记录中的大部分内容已经制作，其中包括完整审判记录；同时他当天另行申请解除代理。如果该申请获准，他认为应由新律师判断是否还有记录缺失、是否为上诉所需。它是管理上诉案卷的程序文件，不是实体上诉书，也不是法院批准解除代理的命令。',
      plainEnglish: '可以把 Form B 理解为整理“上诉材料包”的清单。律师的意思是：主要审判记录已经有了，自己又正在申请退出，因此暂时不要重复或盲目订购，让可能接手的新律师先检查缺口。它不等于放弃上诉，不等于放弃所有庭审记录问题，也不证明上诉案卷已经完整，更不表示法院已经同意律师退出。',
      legalReading: [
        '第 1 页是第二巡回刑事上诉庭审记录表。勾选结果是“目前不订购”，并附解释；表格没有把任何具体程序勾选为永远不需要。',
        '第 2 页给出两个理由：大部分庭审记录（包括完整审判记录）已制作；律师同日申请解除代理。第二个理由明确以法院批准解除代理为前提。',
        '依据《联邦上诉程序规则》10(b)，庭审记录安排关系到上诉所需案卷的组成。这份文件只说明当时的订购决定，并不排除以后补充记录、纠正案卷或由接任律师重新评估。',
        '文件没有提出有关定罪、刑罚、没收、证据裁定、宪法问题或审查标准的任何论证。不得从 Form B 推导上诉人将提出哪些实体争点。',
        '公开上诉案卷显示，出庭表和 Form B 是在法院发出可能驳回上诉的补件警告后提交；解除代理则是另一份动议。截至 2026 年 8 月 12 日公开显示的案卷，没有看到批准解除代理的命令，也没有看到实体书状排期。',
      ],
      caseConnections: [
        '应与 SDNY Doc 862 一起阅读：Doc 862 对定罪和刑罚均提出上诉；还应对照 SDNY Doc 864，因为其公开量刑记录省略了已密封的内部页码第 3-30 页。',
        '第二巡回 Entries 12、13 曾警告，如不提交必要表格，上诉可能被驳回；Entries 14、15 随后提交出庭表和 Form B，Entry 16 则另行申请解除代理。',
        '以后出现的实体上诉书、案卷指定文件、庭审记录订单或代理关系命令，均优先于这份早期程序快照。',
      ],
      whyItMatters: [
        '它记录了必要上诉表格的补交情况，并解释 2026 年 8 月 5 日为何没有新增订购庭审记录。',
        '它能防止三种误读：上诉已经放弃、法院已经确认全部上诉案卷完整、律师已经获准退出。',
      ],
      verificationTasks: [
        '继续监测第二巡回 26-1853 的 Entry 16 是否获裁定、是否更换律师、是否补充庭审记录或纠正案卷，以及实体书状排期。',
        '把上诉案卷指定情况与公开量刑记录中的密封缺页对照，不得推测密封内容。',
        '后续案卷应通过 PACER 或 CourtListener/RECAP 核验，并分别保存文件提交日期和来源页面更新日期。',
      ],
      riskFlags: [
        '“目前不订购”不等于放弃上诉，也不是法院认定今后绝不需要更多庭审记录。',
        '解除代理只是律师提出的附条件说明；本文件不能证明法院已经批准。',
        '“完整审判记录已经制作”不等于所有审前、审后、量刑、密封或附属程序记录都已具备，也不等于足以支持所有潜在上诉问题。',
      ],
      findings: [
        finding('summary', '律师勾选当时不订购庭审记录，并提交附件说明理由。', [1, 2]),
        finding('legalReading', '律师说明大部分记录已经制作，其中包括完整审判记录。', [2]),
        finding('legalReading', '律师还说明其正申请解除代理；如申请获准，应由接任律师判断是否缺少或需要其他记录。', [2]),
        finding('riskFlags', '该文件不是实体上诉书，也不是批准解除代理的命令，其中没有实体上诉论证。', [1, 2]),
      ],
    },
  }),
  'edny-26-mc-2795:3': report({
    caseId: 'edny-26-mc-2795',
    sha256: 'a781d25e830828f456e86790347c783c823daa38afd4a630dd7aa7e245bf5e9a',
    posture: 'court_order_section_1782_discovery',
    researchQuality: 'body_verified',
    reviewedAt: '2026-08-15T16:15:00.000+08:00',
    en: {
      summary: 'This one-page July 9, 2026 order grants Rui Hao\'s 28 U.S.C. § 1782 application to obtain testimony from Ho Wan Kwok, also known as Miles Guo, for use in a British Virgin Islands trial. The court found the three statutory prerequisites satisfied, stated that it had balanced the Intel discretionary factors, and directed MDC Brooklyn and the Federal Bureau of Prisons to arrange videoconference testimony on July 22 and 23, 2026.',
      plainEnglish: 'A foreign lawsuit needed testimony from a person located in the United States. Section 1782 works like a legal bridge: a U.S. court can authorize evidence gathering here for use before a foreign tribunal. The judge opened that bridge and ordered the detention facility to arrange the video appearance. The order does not say who should win the British Virgin Islands case, whether the testimony was ultimately taken, or whether any particular statement was true.',
      legalReading: [
        'The court expressly found the three statutory § 1782 requirements: Kwok resided or was found in the Eastern District of New York, the discovery was for use before a foreign tribunal, and the application was made by an interested person.',
        'The court also stated that it balanced the discretionary factors from Intel Corp. v. Advanced Micro Devices, Inc. The one-page order does not provide a factor-by-factor explanation, so no more detailed reasoning should be attributed to the court.',
        'The operative relief was permission to take Kwok\'s testimony by videoconference on July 22 and 23, 2026 for a British Virgin Islands trial, plus a direction to MDC Brooklyn and the Bureau of Prisons to produce him for that remote testimony and coordinate with petitioner\'s counsel.',
        '“Produce” in this context directs custodial officials to make the detained witness available for the ordered videoconference. It is not an order releasing him from custody or transferring ownership of property.',
        'The caption and order treat Kwok as the testimony subject. The document does not establish that he was a party to the foreign case, identify the foreign causes of action, decide admissibility or credibility, or resolve any issue in the SDNY criminal case or direct appeal.',
      ],
      caseConnections: [
        'The order identifies Kwok\'s then-current custody at MDC Brooklyn, which supplied the territorial basis for the Eastern District application; it does not alter the SDNY judgment or Second Circuit appeal.',
        'A reliable cross-case account requires the § 1782 application and supporting papers, the British Virgin Islands pleadings or trial record, any testimony transcript or recording, and later compliance or modification filings.',
        'Statements made in any resulting testimony would need separate authentication and context before being connected to criminal, bankruptcy, SEC, ownership, or entity-control issues.',
      ],
      whyItMatters: [
        'It is a signed judicial order confirming that a foreign litigant obtained U.S. judicial assistance to seek Guo\'s testimony.',
        'It establishes authorization and logistics only; it does not prove that testimony occurred or that the foreign tribunal adopted any testimony or factual claim.',
      ],
      verificationTasks: [
        'Collect and review the underlying § 1782 application, declarations, proposed subpoena or questions, and any later EDNY compliance or modification filing.',
        'Verify from the British Virgin Islands record whether the July 22-23 testimony occurred, how it was used, and whether the foreign tribunal issued any ruling concerning it.',
        'Keep testimony statements, party allegations, and judicial findings in separate evidence categories if later materials are added.',
      ],
      riskFlags: [
        'Granting § 1782 discovery is not a merits ruling in the foreign proceeding.',
        'The order does not prove that the scheduled testimony occurred, was admitted, was credited, or affected the foreign trial.',
        'The local corpus currently contains the order but not the application record or foreign case file, so the subject matter and adversarial positions remain incomplete.',
      ],
      findings: [
        finding('summary', 'The court granted Rui Hao\'s § 1782 application to obtain Kwok\'s testimony for use in a British Virgin Islands trial.', [1]),
        finding('legalReading', 'The court found the three statutory prerequisites satisfied and stated that it balanced the Intel factors.', [1]),
        finding('legalReading', 'MDC Brooklyn and the Bureau of Prisons were directed to arrange videoconference testimony on July 22 and 23, 2026.', [1]),
        finding('riskFlags', 'The order authorizes evidence gathering but does not decide the foreign case or establish that the testimony actually occurred.', [1]),
      ],
    },
    zh: {
      summary: '这份 2026 年 7 月 9 日的一页法院命令批准 Rui Hao 依据《美国法典》第 28 编第 1782 条提出的申请，允许其取得 Ho Wan Kwok（又名 Miles Guo）的证言，用于英属维尔京群岛的审判。法院认定三项法定条件成立，说明已权衡 Intel 案确立的酌情因素，并命令 MDC Brooklyn 和美国联邦监狱管理局安排 7 月 22 日、23 日的视频作证。',
      plainEnglish: '可以把 § 1782 理解成一座“跨国取证桥梁”：境外诉讼需要美国境内人员的证据时，可以请求美国法院协助。法官在这里允许搭桥，并要求拘留设施安排视频出庭。但这份命令没有判断英属维尔京群岛案件谁胜谁负，也不能证明证言后来确实取得，更不能证明任何具体陈述真实。',
      legalReading: [
        '法院明确认定 § 1782 的三项法定前提：Kwok 居住于或可在纽约东区找到；证据用于外国审理机构的程序；申请由利害关系人提出。',
        '法院还表示已权衡 Intel Corp. v. Advanced Micro Devices, Inc. 的酌情因素。由于一页命令没有逐项解释，不能替法院补写更详细的因素分析。',
        '实际救济是允许在 2026 年 7 月 22 日、23 日通过视频会议取得 Kwok 的证言，用于英属维尔京群岛审判；同时命令 MDC Brooklyn 和联邦监狱管理局安排其远程作证，并与申请人律师协调。',
        '本语境中的“produce”是要求羁押机关让被羁押的证人能够参加法院命令的视频作证，不是释放令，也不是财产移交命令。',
        '案名页和命令把 Kwok 作为被取证对象。文件没有证明他是境外案件当事人，没有说明境外诉因，没有裁判证言可采性或可信度，也没有解决 SDNY 刑事案或直接上诉中的任何问题。',
      ],
      caseConnections: [
        '命令记载 Kwok 当时被羁押于 MDC Brooklyn，这构成纽约东区处理申请的地域基础；它不改变 SDNY 判决或第二巡回上诉。',
        '要形成可靠的跨案解读，还需取得 § 1782 申请及支持材料、英属维尔京群岛诉状或审判记录、证言文字或录像，以及后续履行或修改文件。',
        '以后如取得证言，其中陈述必须独立核验并保留上下文，才能与刑事、破产、SEC、所有权或实体控制问题建立关联。',
      ],
      whyItMatters: [
        '它是一份已签署法院命令，确认境外诉讼参与者获得美国司法协助，可以寻求郭文贵的证言。',
        '它只确认授权和安排，不证明证言实际发生，也不证明境外法院采纳了任何证言或事实主张。',
      ],
      verificationTasks: [
        '收集并审阅底层 § 1782 申请、声明、拟议传票或问题，以及纽约东区后续履行或修改文件。',
        '从英属维尔京群岛案卷核验 7 月 22-23 日证言是否实际取得、如何使用，以及境外法院是否就其作出裁定。',
        '以后新增材料时，应把证言陈述、当事方指控和法院认定分为不同证据类别。',
      ],
      riskFlags: [
        '批准 § 1782 取证不等于对境外案件实体作出裁判。',
        '命令不能证明预定证言已经发生、被采纳、被采信或影响了境外审判。',
        '当前本地资料只有命令，没有底层申请记录和境外案件文件，因此取证主题及双方立场仍不完整。',
      ],
      findings: [
        finding('summary', '法院批准 Rui Hao 的 § 1782 申请，允许取得 Kwok 的证言用于英属维尔京群岛审判。', [1]),
        finding('legalReading', '法院认定三项法定前提成立，并说明已权衡 Intel 因素。', [1]),
        finding('legalReading', 'MDC Brooklyn 和联邦监狱管理局被命令安排 2026 年 7 月 22 日、23 日的视频作证。', [1]),
        finding('riskFlags', '命令授权取证，但没有裁判境外案件，也不能证明证言实际发生。', [1]),
      ],
    },
  }),
  'bkd-22-05032:214': report({
    caseId: 'bkd-22-05032',
    sha256: '36e722d925cc833991f1fcfc53192591978d3b8c851f3b37b67450de5f006043',
    posture: 'district_court_bankruptcy_appeal_judgment',
    researchQuality: 'body_verified',
    reviewedAt: '2026-08-15T16:20:00.000+08:00',
    en: {
      summary: 'This one-page September 30, 2024 district-court judgment closes civil appeal 3:23-cv-00102 after the district court affirmed bankruptcy-court orders granting the appellees\' preliminary-injunction motion. Judgment was entered for Pacific Alliance Asia Opportunity Fund L.P. and Luc A. Despins. The judgment was then transmitted to adversary proceeding 22-05032 as Doc 214 on October 1, 2024.',
      plainEnglish: 'This is the appeal\'s result sheet, not the full explanation. Guo challenged bankruptcy-court injunction orders; the district court left those orders in place, entered judgment for the opposing side, and closed the district-court appeal. “Case closed” here means this district-court appeal ended. It does not say that the entire bankruptcy case, every adversary claim, or every later appeal ended.',
      legalReading: [
        'The judgment identifies three linked dockets: main bankruptcy case 22-50073, adversary proceeding 22-5032, and district-court bankruptcy appeal 3:23-cv-00102.',
        'It records that the district court had entered a September 30 order affirming bankruptcy-court orders that granted the appellees\' motion for a preliminary injunction. The separate 39-page order, transmitted as bankruptcy Doc 213, contains the reasoning and must control any issue-specific account.',
        'The operative disposition is judgment for appellees and closure of the district-court civil appeal. The judgment does not state that the bankruptcy main case or all proceedings within adversary 22-5032 were closed.',
        'An affirmance means the challenged bankruptcy orders remained in force at this appellate level. This one-page judgment does not describe the injunction terms, standards of review, factual findings, constitutional analysis, or any later appellate history.',
        'The bankruptcy docket filed this district-court judgment one day later as Doc 214. The September 30 judgment date and October 1 bankruptcy-docket filing date serve different functions and should both be preserved.',
      ],
      caseConnections: [
        'Read with bankruptcy Docs 133 and 134 for the preliminary-injunction decision and corrected order, and Doc 213 / district-court ECF 65 for the affirmance reasoning.',
        'Read with adversary Doc 157 and the district-court docket to identify the appealed orders, issues presented, briefing, and any notice of further appeal.',
        'The injunction dispute arose inside the broader Kwok bankruptcy, but this judgment should not be merged with criminal forfeiture, SEC remedies, or unrelated avoidance actions.',
      ],
      whyItMatters: [
        'It is the operative judgment showing that Guo did not obtain reversal of the challenged preliminary-injunction orders at the district-court bankruptcy-appeal stage.',
        'It prevents a docket-level ambiguity: the appeal was closed, but the document does not close the entire bankruptcy estate administration.',
      ],
      verificationTasks: [
        'Complete page-by-page review of Doc 213 / ECF 65 before stating the district court\'s reasoning, standards of review, or treatment of each issue.',
        'Review bankruptcy Docs 133 and 134 to state the exact injunction terms and identify which provisions were challenged and affirmed.',
        'Check the district-court and Second Circuit dockets for any post-judgment motion, notice of appeal, mandate, or later modification.',
      ],
      riskFlags: [
        'The judgment supplies the result but not the court\'s detailed reasoning.',
        '“The case is closed” refers to civil appeal 3:23-cv-00102 and must not be reported as closure of bankruptcy case 22-50073.',
        'A preliminary injunction regulates conduct before final merits resolution; affirmance of that injunction should not automatically be described as adjudication of every underlying claim.',
      ],
      findings: [
        finding('summary', 'The district court entered judgment for Pacific Alliance Asia Opportunity Fund and Luc A. Despins and closed civil appeal 3:23-cv-00102.', [1]),
        finding('legalReading', 'The judgment records a separate September 30 order affirming bankruptcy-court orders granting the appellees\' preliminary-injunction motion.', [1]),
        finding('caseConnections', 'The document links bankruptcy case 22-50073, adversary proceeding 22-5032, and district-court appeal 3:23-cv-00102.', [1]),
        finding('riskFlags', 'The judgment does not state that the main bankruptcy case was closed and does not reproduce the affirmance reasoning.', [1]),
      ],
    },
    zh: {
      summary: '这份 2024 年 9 月 30 日的一页地区法院判决结束了民事上诉案 3:23-cv-00102。地区法院维持破产法院批准被上诉人初步禁令动议的命令，并判 Pacific Alliance Asia Opportunity Fund L.P. 与 Luc A. Despins 胜诉。该判决随后于 10 月 1 日作为附属诉讼 22-05032 的 Doc 214 回传。',
      plainEnglish: '可以把它理解成上诉的“结果页”，不是完整判决理由。郭对破产法院的禁令命令提出上诉；地区法院让这些命令继续有效，判对方胜诉，并关闭地区法院上诉案。这里的“结案”只表示这一级地区法院上诉结束，不表示整个破产主案、所有附属诉讼或后续上诉都结束。',
      legalReading: [
        '判决同时列出三个相互连接的案号：破产主案 22-50073、附属诉讼 22-5032、地区法院破产上诉案 3:23-cv-00102。',
        '判决记载，地区法院已于 9 月 30 日签发另一份命令，维持破产法院批准被上诉人初步禁令动议的命令。回传为破产 Doc 213 的 39 页理由书才包含详细推理，涉及具体争点时应以该文件为准。',
        '操作性结果是判被上诉人胜诉并关闭地区法院民事上诉案。判决没有写明破产主案或附属诉讼 22-5032 中全部程序均已关闭。',
        '维持原裁定意味着在这一级上诉中，被挑战的破产法院命令继续有效。但一页判决没有说明禁令具体条款、审查标准、事实认定、宪法分析或后续上诉历史。',
        '破产法院案卷次日把地区法院判决登记为 Doc 214。9 月 30 日是判决日期，10 月 1 日是回传到破产案卷的提交日期，两者作用不同，都应保存。',
      ],
      caseConnections: [
        '应与破产 Docs 133、134 一起阅读，以确认初步禁令决定和更正命令；还应与 Doc 213 / 地区法院 ECF 65 一起阅读，以确认维持原裁定的理由。',
        '应结合附属诉讼 Doc 157 和地区法院案卷，确定被上诉命令、上诉争点、双方书状及是否继续上诉。',
        '本禁令争议发生在郭的破产程序内，但不得与刑事没收、SEC 救济或其他撤销权诉讼混为同一法律程序。',
      ],
      whyItMatters: [
        '它是具有操作效力的判决，说明郭在地区法院破产上诉阶段没有获得对相关初步禁令命令的撤销。',
        '它消除案卷层面的歧义：上诉案关闭，但文件没有关闭整个破产财产管理程序。',
      ],
      verificationTasks: [
        '在陈述地区法院推理、审查标准或各项争点处理前，逐页完成 Doc 213 / ECF 65 的复核。',
        '审阅破产 Docs 133、134，准确说明禁令条款，并确认哪些条款受到上诉及被维持。',
        '检查地区法院和第二巡回案卷，确认是否有判后动议、继续上诉通知、mandate 或后续修改。',
      ],
      riskFlags: [
        '该判决提供结果，但不包含法院详细理由。',
        '“本案结案”指民事上诉案 3:23-cv-00102，不得写成破产主案 22-50073 已关闭。',
        '初步禁令用于终局实体裁判前管理行为；维持初步禁令不能自动写成全部底层请求已经终局裁判。',
      ],
      findings: [
        finding('summary', '地区法院判 Pacific Alliance Asia Opportunity Fund 与 Luc A. Despins 胜诉，并关闭民事上诉案 3:23-cv-00102。', [1]),
        finding('legalReading', '判决记载另一份 9 月 30 日命令已维持破产法院批准被上诉人初步禁令动议的命令。', [1]),
        finding('caseConnections', '文件连接破产主案 22-50073、附属诉讼 22-5032 和地区法院上诉案 3:23-cv-00102。', [1]),
        finding('riskFlags', '判决没有写明破产主案已关闭，也没有重述维持原裁定的详细理由。', [1]),
      ],
    },
  }),
  'sdny-23-cr-118:132': report({
    caseId: 'sdny-23-cr-118',
    sha256: 'c9dcdcc7081cde8ed0cf6b0e4df7ab956e1af1fac830cb259f2664b1cecea4bb',
    posture: 'court_order_briefing_schedule',
    researchQuality: 'body_verified',
    reviewedAt: '2026-08-15T16:30:00.000+08:00',
    en: {
      summary: 'This one-page August 31, 2023 order sets briefing deadlines on Ho Wan Kwok\'s motion asking the SDNY criminal court to stay the jointly administered Connecticut bankruptcy cases and related adversary proceedings. It required the government to oppose or state non-opposition by September 21 and allowed a defense reply by October 5. It did not grant or deny the requested stay.',
      plainEnglish: 'The defense asked the criminal judge to pause the bankruptcy proceedings. This order only told the parties when to submit their arguments. It is a schedule, not a decision on whether the criminal court could or should stop the bankruptcy cases.',
      legalReading: [
        'The order identifies the requested reach of the motion: bankruptcy case 22-50073, the jointly administered Genever cases 22-50542 and 22-50592, and related adversary proceedings.',
        'The only operative relief is a two-step briefing schedule. The government was required to oppose or advise that it did not oppose; the defense could reply.',
        'Nothing in Doc 132 stays a bankruptcy deadline, invalidates a bankruptcy order, or determines jurisdiction, the automatic stay, criminal discovery, privilege, or constitutional issues.',
        'The underlying defense motion and later disposition must be reviewed before reporting either side\'s legal theory or the result.',
      ],
      caseConnections: ['Connect this order to ECF 129-131 and the later ruling on the stay request.', 'The motion linked the criminal case to bankruptcy administration, but the two courts retained distinct proceedings and legal authority.'],
      whyItMatters: ['It documents that a cross-court stay request was made and formally briefed.', 'It prevents the briefing order from being mistaken for an order that actually paused the bankruptcy cases.'],
      verificationTasks: ['Review ECF 129-131, the government response, defense reply, and final disposition.', 'Check the bankruptcy dockets for any contemporaneous stay notice or independent bankruptcy-court action.'],
      riskFlags: ['A briefing schedule is not a merits ruling.', 'The quoted stay request is the defense\'s requested relief, not a court finding.', 'No bankruptcy proceeding should be described as stayed on the basis of this document.'],
      findings: [finding('summary', 'The court scheduled government opposition or non-opposition and an optional defense reply.', [1]), finding('legalReading', 'The motion sought a stay of identified Connecticut bankruptcy cases and related adversary proceedings.', [1]), finding('riskFlags', 'The order did not grant or deny a stay.', [1])],
    },
    zh: {
      summary: '这份 2023 年 8 月 31 日的一页命令，为 Ho Wan Kwok 请求纽约南区刑事法院中止康涅狄格合并管理破产案及相关附属诉讼的动议设定书状期限。检方须在 9 月 21 日前反对或表明不反对，辩方可在 10 月 5 日前答复。命令没有批准或驳回中止请求。',
      plainEnglish: '辩方请求刑事法官暂停破产程序；这份命令只是告诉双方“什么时候交意见”。它是排期表，不是法院已经决定是否有权或是否应当叫停破产案。',
      legalReading: ['命令记录了动议请求覆盖的范围：破产案 22-50073、合并管理的 Genever 案 22-50542 和 22-50592，以及相关附属诉讼。', '命令唯一产生操作效力的内容是两阶段书状排期：检方必须反对或说明不反对，辩方可以答复。', 'Doc 132 没有暂停任何破产期限，没有撤销破产法院命令，也没有裁判管辖权、自动中止、刑事取证、特权或宪法问题。', '必须审阅底层辩方动议及后续处分，才能说明双方法律理论和结果。'],
      caseConnections: ['应连接 ECF 129-131 及后来对中止请求的裁定。', '动议把刑事案与破产管理联系起来，但两个法院的程序和法律权限仍然不同。'],
      whyItMatters: ['它证明跨法院中止请求确实提出并进入正式书状程序。', '它防止把排期命令误写成破产案已经暂停。'],
      verificationTasks: ['审阅 ECF 129-131、检方回应、辩方答复和最终处分。', '检查破产案卷是否同期出现中止通知或破产法院独立行动。'],
      riskFlags: ['书状排期不是实体裁定。', '命令引用的中止范围是辩方请求，不是法院认定。', '不能依据本文件声称任何破产程序已经被中止。'],
      findings: [finding('summary', '法院安排检方反对或不反对意见及辩方可选答复的期限。', [1]), finding('legalReading', '动议请求中止所列康涅狄格破产案和相关附属诉讼。', [1]), finding('riskFlags', '命令没有批准或驳回中止。', [1])],
    },
  }),
  'dconn-22-50073:1893': report({
    caseId: 'dconn-22-50073',
    sha256: '2dadd0092fffcdf7f4b2ae870f6d68445379a8e1260f48a6f00583fedd7868f3',
    posture: 'court_order_to_show_cause',
    researchQuality: 'body_verified',
    reviewedAt: '2026-08-15T16:32:00.000+08:00',
    en: {
      summary: 'This June 7, 2023 bankruptcy order required GTV Media, Saraca Media Group, and attorney Aaron Mitchell to appear on July 18 and show cause why GTV and Saraca should not be held in civil contempt for failing to respond to court-authorized Rule 2004 subpoenas. It also directed the trustee to serve the order and file proof of service. It is not a contempt judgment.',
      plainEnglish: 'The judge ordered the companies and lawyer to come to court and explain themselves. That is a serious procedural step, but it is the start of the contempt decision, not the end. The document does not itself say the companies were guilty of contempt or impose a sanction.',
      legalReading: ['The trustee asserted that GTV and Saraca initially responded but had not responded since December 2022; that chronology remains the trustee\'s position recited by the court.', 'The court required entity representatives and Mitchell personally to appear and address possible civil contempt for noncompliance with Rule 2004 subpoenas.', 'The order contains service deadlines, which matter to notice and enforceability.', 'A later hearing record and order are required to determine whether contempt was found, compliance occurred, or sanctions were imposed.'],
      caseConnections: ['Read with ECF 1805, the Luft declaration and exhibits, ECF 1826, and the July 18 hearing record.', 'The order concerns bankruptcy examination subpoenas and must not be reported as a criminal finding against Guo or the named entities.'],
      whyItMatters: ['It identifies specific GTV and Saraca discovery-compliance issues in the bankruptcy investigation.', 'It preserves the difference between an order to show cause and an actual contempt adjudication.'],
      verificationTasks: ['Locate the July 18, 2023 hearing transcript and resulting order.', 'Verify service, later production, any privilege ruling, and any sanctions.'],
      riskFlags: ['No contempt finding or sanction appears in this order.', 'Trustee assertions are not automatically court findings.', 'Rule 2004 discovery is broad bankruptcy examination, not a merits judgment on ownership or liability.'],
      findings: [finding('summary', 'GTV, Saraca, and attorney Mitchell were ordered to appear for a July 18 show-cause hearing.', [2]), finding('legalReading', 'The possible contempt concerned alleged failure to respond or comply with Rule 2004 subpoenas.', [1, 2]), finding('riskFlags', 'The order did not itself adjudicate contempt.', [2])],
    },
    zh: {
      summary: '这份 2023 年 6 月 7 日破产法院命令要求 GTV Media、Saraca Media Group 及律师 Aaron Mitchell 于 7 月 18 日出庭，说明为何不应因 GTV 和 Saraca 未答复法院授权的 Rule 2004 传票而认定两家公司构成民事藐视法庭；同时要求受托人送达并提交送达证明。它不是藐视法庭判决。',
      plainEnglish: '法官要求公司和律师到庭解释，这是严肃的程序步骤，但只是“是否藐视”的审理起点，不是最终答案。本文件没有认定两家公司已经藐视法庭，也没有处罚。',
      legalReading: ['受托人主张 GTV 和 Saraca 起初曾答复，但自 2022 年 12 月起未再答复；法院在命令中转述这一时间线，不会自动把它变成最终事实认定。', '法院要求两家实体派代表、Mitchell 律师本人出庭，就 Rule 2004 传票不履行可能构成的民事藐视作出说明。', '命令还设定送达和送达证明期限，这关系到通知和后续执行。', '必须取得后续听证记录和命令，才能判断是否最终认定藐视、是否补充履行或是否处罚。'],
      caseConnections: ['应与 ECF 1805、Luft 声明及附件、ECF 1826 和 7 月 18 日听证记录一起阅读。', '本命令涉及破产调查传票，不是对郭或相关实体作出的刑事认定。'],
      whyItMatters: ['它确认破产调查中存在针对 GTV 与 Saraca 的具体取证履行争议。', '它保留“说明理由命令”与“最终藐视裁判”的关键区别。'],
      verificationTasks: ['查找 2023 年 7 月 18 日听证记录和后续命令。', '核验送达、后续材料提供、特权裁定及任何处罚。'],
      riskFlags: ['本命令没有认定藐视，也没有处罚。', '受托人主张不自动等于法院认定。', 'Rule 2004 属于范围较广的破产调查，不是所有权或责任实体判决。'],
      findings: [finding('summary', '法院命令 GTV、Saraca 和 Mitchell 律师参加 7 月 18 日说明理由听证。', [2]), finding('legalReading', '可能的藐视问题来自被指称未答复或遵守 Rule 2004 传票。', [1, 2]), finding('riskFlags', '本命令没有自行裁判藐视成立。', [2])],
    },
  }),
  'dconn-22-50073:1889': report({
    caseId: 'dconn-22-50073',
    sha256: 'edbe4ef08d112b1a9eb09e7e4b0dfe28605460297cad08d731bab4925fa6cb7c',
    posture: 'court_order_sealing',
    researchQuality: 'body_verified',
    reviewedAt: '2026-08-15T16:35:00.000+08:00',
    en: {
      summary: 'This June 7, 2023 order granted the Chapter 11 trustee permission to file an unredacted motion to compel and specified privileged or potentially privileged exhibits under seal, while allowing redacted public and party copies. It preserved full statutory access for the United States Trustee and made the order immediately effective. It did not grant the underlying motion to compel or find any entity in contempt.',
      plainEnglish: 'The judge decided how sensitive papers could be filed, not whether the accusations in those papers were correct. Complete versions went into the court\'s protected file; redacted versions could be used publicly. Think of it as deciding which envelope the evidence goes into, not deciding who wins the evidence dispute.',
      legalReading: ['The order found good cause based on protective and privilege arrangements and authorized sealed, unredacted submission of specified materials.', 'The specified exhibits remain nonpublic unless a later court order permits access; redacted copies may be filed and served.', 'The United States Trustee retained statutory full access subject to § 107(c)(3)(B) obligations.', 'The order concerns filing access only and does not adjudicate subpoena compliance, privilege merits, contempt, ownership, or control.'],
      caseConnections: ['Read with ECF 1806, the protective and privileges orders, the public redacted filing, and later access rulings.', 'Doc 1893 separately ordered a show-cause hearing; neither order alone establishes contempt.'],
      whyItMatters: ['It explains why parts of the Rule 2004 dispute are unavailable in the public record.', 'It prevents sealed submission from being misreported as secret substantive relief or a contempt finding.'],
      verificationTasks: ['Identify the redacted public counterparts and any later unsealing order.', 'Review the underlying motion and later merits disposition without inferring sealed content.'],
      riskFlags: ['A sealing order is not a merits decision.', 'The public corpus is intentionally incomplete as to the sealed exhibits.', 'Do not disclose or infer privileged material from titles or surrounding filings.'],
      findings: [finding('summary', 'The court authorized sealed unredacted filings and redacted public or party copies.', [1, 2]), finding('legalReading', 'The United States Trustee retained statutory full access subject to confidentiality obligations.', [2]), finding('riskFlags', 'The order did not decide the motion to compel or contempt.', [1, 2, 3])],
    },
    zh: {
      summary: '这份 2023 年 6 月 7 日命令允许第 11 章受托人将未删节的强制履行动议及特定受特权或可能受特权保护的附件密封提交，同时允许提交和送达删节版本；美国受托人保留法定完整查阅权，命令立即生效。它没有批准底层强制履行动议，也没有认定任何实体藐视法庭。',
      plainEnglish: '法官决定的是敏感文件应怎样提交，不是文件里的指控是否正确。完整版本放进法院受保护的档案，公开使用删节版本。可以把它理解成决定“证据装进哪种信封”，而不是决定证据争议谁胜谁负。',
      legalReading: ['法院依据保护令和特权安排认定存在正当理由，允许特定材料以完整未删节形式密封提交。', '特定附件除非法院以后另行许可，应继续不向公众开放；可以提交和送达删节副本。', '美国受托人依据法律保留完整查阅权，同时承担 § 107(c)(3)(B) 的保密义务。', '命令只处理提交和访问方式，没有裁判传票履行、特权实体、藐视、所有权或控制关系。'],
      caseConnections: ['应与 ECF 1806、保护令、特权命令、公开删节版本及后续访问裁定一起阅读。', 'Doc 1893 另行安排说明理由听证；两份命令都不能单独证明藐视成立。'],
      whyItMatters: ['它解释了为何 Rule 2004 争议的一部分在公开案卷中不可见。', '它防止把密封提交误写成秘密实体救济或藐视认定。'],
      verificationTasks: ['识别公开删节版本及任何后续解封命令。', '审阅底层动议和后续实体处分，不推测密封内容。'],
      riskFlags: ['密封命令不是实体裁判。', '公开资料对密封附件存在有意保留的缺口。', '不得根据标题或周边文件披露或推测特权材料。'],
      findings: [finding('summary', '法院允许密封提交未删节文件，并允许公开或向当事方提供删节副本。', [1, 2]), finding('legalReading', '美国受托人在承担保密义务的前提下保留法定完整查阅权。', [2]), finding('riskFlags', '命令没有裁判强制履行动议或藐视问题。', [1, 2, 3])],
    },
  }),
  'discovered-nysd-71961885:15': report({
    caseId: 'discovered-nysd-71961885',
    sha256: '7d9a6cef4dc318c861d78e632a96847301fec565a66ea69ea53d198ea85ea185',
    posture: 'court_order_status_report',
    researchQuality: 'body_verified',
    reviewedAt: '2026-08-15T16:38:00.000+08:00',
    en: {
      summary: 'This December 18, 2025 order in Dong v. GTV Media Group required the parties to report the status of a state-court motion seeking to compel SEC compliance with a subpoena. Although plaintiffs had filed a notice seeking voluntary dismissal without prejudice, the court directed the clerk not to close the removed federal matter pending a further order.',
      plainEnglish: 'The plaintiffs tried to withdraw the federal subpoena dispute, but the judge did not treat the file as finished because no one had explained whether the underlying SEC subpoena issue was actually resolved. The court asked for a status letter and kept the case open. This is procedural housekeeping, not a ruling on the class action or the subpoena merits.',
      legalReading: ['The SEC had removed the subpoena-enforcement dispute from the underlying state case under § 1442(a).', 'Plaintiffs invoked Rule 41(a)(1)(A)(i) to seek dismissal without prejudice, but the court required clarification of the underlying motion\'s status.', 'The operative directions were a December 19 status letter and an instruction not to close the federal case pending further order.', 'The order does not decide subpoena enforceability, SEC privilege or burden, class claims, GTV liability, or the state case merits.'],
      caseConnections: ['The caption establishes a GTV-related action, but this order does not mention Guo or adjudicate any Guo-GTV ownership or control relationship.', 'Later status submissions and closure or remand orders are necessary to state the federal subpoena matter\'s outcome.'],
      whyItMatters: ['It records an unresolved procedural link between the GTV class action and an SEC subpoena.', 'It prevents the voluntary-dismissal notice from being reported as an already effective final resolution.'],
      verificationTasks: ['Collect the December 19 status letter and subsequent closure, remand, or subpoena order.', 'Verify the underlying state docket and the subpoena\'s requested subject matter before drawing cross-case conclusions.'],
      riskFlags: ['The case remained open under this order.', 'No subpoena or class-action merits issue was decided.', 'The document supports company-level relevance only and does not establish a personal relationship finding concerning Guo.'],
      findings: [finding('summary', 'The court required a status letter and directed that the federal case remain open.', [1]), finding('legalReading', 'The dispute concerned a subpoena served on the SEC in an underlying state action.', [1]), finding('riskFlags', 'The voluntary-dismissal notice did not, by this order alone, establish final closure or resolution.', [1])],
    },
    zh: {
      summary: '这份 2025 年 12 月 18 日 Dong v. GTV Media Group 命令要求各方报告州法院案件中强制 SEC 遵守传票动议的状态。虽然原告已提交拟不妨碍以后再次提出的自愿撤诉通知，但法院命令书记官在进一步命令前不得关闭该联邦移送事项。',
      plainEnglish: '原告试图撤回联邦法院里的 SEC 传票争议，但法官没有直接把档案关掉，因为没人说明底层 SEC 传票问题是否真的解决。法院要求交状态信，并让案件继续保持开放。这是程序管理，不是对集体诉讼或传票实体的裁判。',
      legalReading: ['SEC 曾依据 § 1442(a) 把底层州法院案件中的传票强制履行争议移送联邦法院。', '原告援引 Rule 41(a)(1)(A)(i) 请求不妨碍再次提出的撤诉，但法院要求说明底层动议的实际状态。', '命令的操作性内容是要求 12 月 19 日提交状态信，并在进一步命令前不得关闭联邦案件。', '命令没有裁判传票是否可执行、SEC 的特权或负担、集体请求、GTV 责任或州法院案件实体。'],
      caseConnections: ['案名页证明这是 GTV 相关诉讼，但命令没有提及郭，也没有裁判郭与 GTV 的所有权或控制关系。', '必须取得后续状态文件和关闭、发回或传票命令，才能说明联邦传票事项结果。'],
      whyItMatters: ['它记录 GTV 集体诉讼与 SEC 传票之间尚未解决的程序连接。', '它防止把自愿撤诉通知误写成已经发生效力的最终解决。'],
      verificationTasks: ['收集 12 月 19 日状态信及后续关闭、发回或传票命令。', '在建立跨案结论前，核验底层州法院案卷和传票请求主题。'],
      riskFlags: ['依据本命令，案件当时仍保持开放。', '法院没有裁判传票或集体诉讼实体。', '文件只支持公司层面的相关性，不能证明关于郭个人关系的法院认定。'],
      findings: [finding('summary', '法院要求提交状态信，并命令联邦案件继续开放。', [1]), finding('legalReading', '争议涉及底层州法院案件向 SEC 发出的传票。', [1]), finding('riskFlags', '仅凭自愿撤诉通知和本命令，不能认定案件已最终关闭或争议已解决。', [1])],
    },
  }),
  'sdny-23-cr-118:864': report({
    sha256: '5e4ab50292478d8cb604d85891a772f3fed09d2bd2f0c2896df55f90e7b7b582',
    posture: 'sentencing_transcript',
    researchQuality: 'body_partial',
    en: {
      summary: 'This 66-page public sentencing PDF contains the court\'s factual and Guidelines rulings, the parties\' arguments, the 360-month sentence, forfeiture and remission rulings, and issue-preservation exchanges. The transcript\'s internal pages 3-30 are sealed and omitted: PDF page 2 ends at transcript page 2, and PDF page 3 resumes at transcript page 31. The public record is therefore materially incomplete even though all 66 PDF pages were parsed.',
      plainEnglish: 'This is where the judge explains why the sentence was imposed. It is more informative than the judgment form, but a large sealed block is missing from public view. The court used a lower sentencing fact standard than the jury used for guilt, and that distinction matters when evaluating possible appellate arguments.',
      legalReading: [
        'Pages 4-5 explain the preponderance standard and denial of a full Fatico hearing after review of trial evidence and written submissions.',
        'Pages 5-8 overrule objections concerning victims, political/charitable organization enhancement, shell entities, gross receipts, leadership role, and obstruction.',
        'Pages 9-13 address Guidelines loss and conclude that loss exceeded $550 million, including after excluding $411 million in GTV inflows and considering refund and double-counting objections.',
        'Pages 57-59 explain the below-Guidelines variance and impose 360 months, no supervised release, no fine, no restitution, and a $900 assessment.',
        'Page 60 clarifies the count structure; pages 61-62 state forfeiture and the $889 million judgment, preserve third-party petition processing, and advise of appeal rights.',
        'Pages 63-65 resolve additional applications and record that the defense reiterated prior objections and intended to include sealed submissions in the appellate record.',
      ],
      caseConnections: ['Read with Docs 858, 860, and 862 for forfeiture, formal judgment, and appeal.', 'The sentencing loss finding, forfeiture amount, and jury verdict are distinct legal determinations with different standards and purposes.'],
      whyItMatters: ['It preserves the court\'s reasoning and defense objections for appellate analysis.', 'It reveals why the court varied below the calculated Guidelines range while still imposing 360 months.'],
      verificationTasks: ['Obtain an official transcript copy and verify the lawful appellate treatment of omitted transcript pages 3-30.', 'Track the appellate briefs before identifying which sentencing and forfeiture issues are actually raised.'],
      riskFlags: ['Transcript pages 3-30 are sealed and omitted from the public PDF; do not infer their content. PDF page numbers and printed transcript page numbers differ after the omission.', 'Party argument in the transcript is not a court finding unless the judge adopts it.', 'Sentencing facts found by preponderance are not equivalent to additional jury convictions.'],
      findings: [
        finding('legalReading', 'The court denied a full Fatico hearing and made sentencing findings by a preponderance after reviewing trial evidence and submissions.', [4, 5]),
        finding('legalReading', 'The court found Guidelines loss above $550 million and addressed GTV exclusion, returns, and double-counting objections.', [9, 10, 11, 12, 13]),
        finding('summary', 'The court imposed a total 360-month term, no supervised release, no fine or restitution, a $900 assessment, and remission for victim compensation.', [59, 60]),
        finding('riskFlags', 'Transcript pages 3-30 are sealed and omitted; PDF pages 2-3 show the printed transcript pagination jump from 2 to 31.', [2, 3]),
      ],
    },
    zh: {
      summary: '这份 66 页公开量刑 PDF 包含法院的事实与量刑指南裁定、双方陈述、360 个月刑期、没收和 remission 处理，以及争点保留情况。但庭审记录内部页码第 3-30 页被密封并从公开版本删除：PDF 第 2 页结束于庭审记录第 2 页，PDF 第 3 页直接从庭审记录第 31 页继续。因此即使 66 个 PDF 页面均能解析，公开记录在实质上仍不完整。',
      plainEnglish: '这份记录解释了法官为什么这样判，比判决表更详细。不过公开版本缺少一大段密封内容。法院在量刑事实判断中使用的标准低于陪审团定罪标准，评估上诉问题时必须把这两者分开。',
      legalReading: [
        '第 4-5 页说明优势证据标准，并在审阅审判证据和书面提交后拒绝举行完整 Fatico 听证。',
        '第 5-8 页处理受害人、政治/慈善组织加重、空壳实体、金融机构收益、领导者角色和妨碍司法等异议。',
        '第 9-13 页处理量刑指南损失额，并认定即使排除 4.11 亿美元 GTV 流入、考虑返还和重复计算异议，损失仍超过 5.5 亿美元。',
        '第 57-59 页解释低于指南区间的变动，并判处 360 个月、无监督释放、无罚金、无赔偿，评估费 900 美元。',
        '第 60 页澄清各罪名刑期结构；第 61-62 页说明没收及 8.89 亿美元判决、第三方申请后续处理和上诉权。',
        '第 63-65 页处理其他申请，并记录辩方重申既有异议、拟将密封材料纳入上诉记录。',
      ],
      caseConnections: ['应与 Doc 858、860、862 一起阅读，分别确认没收、正式判决和上诉。', '量刑损失认定、没收金额和陪审团裁决是目的与证明标准不同的法律判断。'],
      whyItMatters: ['它保留法院理由和辩方异议，是分析上诉的关键材料。', '它说明法院为何在计算出的指南区间以下判处 360 个月。'],
      verificationTasks: ['取得正式庭审记录，并核验被省略的庭审记录内部页码第 3-30 页在上诉中的合法处理方式。', '在识别实际提出的量刑和没收上诉争点前，等待并核对上诉书状。'],
      riskFlags: ['庭审记录内部页码第 3-30 页已密封并从公开 PDF 删除，不得推测其内容；删除位置之后，PDF 页码与庭审记录印刷页码并不相同。', '庭审记录中的当事方陈述只有被法官采纳后才属于法院认定。', '以优势证据认定的量刑事实不等于新增陪审团定罪。'],
      findings: [
        finding('legalReading', '法院拒绝完整 Fatico 听证，并在审阅审判证据和提交材料后按优势证据作量刑事实认定。', [4, 5]),
        finding('legalReading', '法院认定量刑指南损失超过 5.5 亿美元，并处理 GTV 排除、返还和重复计算异议。', [9, 10, 11, 12, 13]),
        finding('summary', '法院判处总计 360 个月，无监督释放、无罚金或赔偿，评估费 900 美元，并授权 remission 补偿受害人。', [59, 60]),
        finding('riskFlags', '庭审记录内部页码第 3-30 页已密封并被省略；PDF 第 2-3 页显示印刷页码从 2 跳至 31。', [2, 3]),
      ],
    },
  }),
  'sdny-23-cr-118:868': report({
    sha256: '4b259fadeaba4e9030a48f35a97e691e50568cb157780cae3f166e1fe7d7f247',
    posture: 'appellate_mandate',
    en: {
      summary: 'This is the Second Circuit\'s May 15, 2026 tandem mandamus order, issued as a mandate on August 6, 2026. It denied the mandamus petitions because the extraordinary-writ requirements were not met, while denying the docketing and consideration branches without prejudice to renewal if the district court did not act within a reasonable time.',
      plainEnglish: 'The appellate court did not decide who owns the forfeited money. It said the petitioners had not yet shown that the extraordinary remedy of mandamus was necessary. Some procedural complaints may be renewed if the district court does not docket or consider submissions within the stated reasonable-time framework.',
      legalReading: ['Mandamus is an extraordinary procedural remedy, not the criminal merits appeal and not an ancillary forfeiture merits judgment.', 'Page 2 distinguishes general denial from the expressly without-prejudice docketing and consideration branches and separately resolves sealing, IFP, supplementation, pseudonym, and electronic-filing requests.'],
      caseConnections: ['Track later SDNY docketing and consideration of § 853(n) submissions and any renewed petitions.', 'Do not merge these tandem pro se mandamus matters with Guo\'s direct appeal.'],
      whyItMatters: ['It defines the procedural status of third-party efforts without adjudicating ownership.'],
      verificationTasks: ['Check the district docket for later action on each submission and any renewed mandamus filing.'],
      riskFlags: ['The mandate is not a ruling that third-party claims are valid or invalid.'],
      findings: [finding('summary', 'Mandamus was denied, but docketing and consideration complaints were denied without prejudice under specified future conditions.', [2]), finding('riskFlags', 'The order does not decide the merits of third-party forfeiture ownership claims.', [2])],
    },
    zh: {
      summary: '这是第二巡回 2026 年 5 月 15 日作出的合并 mandamus 命令，并于 2026 年 8 月 6 日签发 mandate。法院认为申请人没有满足非常救济标准，因而驳回申请；但涉及文件登记和审理的部分在特定情况下属于不影响再次提出。',
      plainEnglish: '上诉法院没有判断被没收资金到底属于谁。法院只是认为，当时还没有证明必须使用 mandamus 这种非常救济。如果地区法院在合理时间内仍不登记或审理提交材料，部分程序性问题可以再次提出。',
      legalReading: ['Mandamus 是非常程序救济，不是刑事实体上诉，也不是第三方没收权利的实体判决。', '第 2 页区分了一般驳回与明确“不影响再次提出”的登记/审理分支，并分别处理密封、免缴费、补充材料、化名和电子提交请求。'],
      caseConnections: ['追踪 SDNY 后续是否登记并审理各 § 853(n) 提交，以及是否出现再次申请。', '不得把这些合并自行诉讼 mandamus 案与郭的刑事直接上诉混为一案。'],
      whyItMatters: ['它确定第三方程序请求的当前状态，但没有裁判所有权。'],
      verificationTasks: ['核对地区法院后来对每份材料的处理及任何再次 mandamus 申请。'],
      riskFlags: ['该 mandate 不能证明第三方主张成立或不成立。'],
      findings: [finding('summary', 'Mandamus 被驳回，但文件登记和审理问题在规定的未来条件下不影响再次提出。', [2]), finding('riskFlags', '该命令没有裁判第三方没收财产所有权的实体问题。', [2])],
    },
  }),
  'sdny-23-cv-2200:sec-complaint': report({
    sha256: 'e8b4af07d84f79e84596045ffc6986a328808b63eeef4f1483b3c3a30994beb7',
    posture: 'agency_allegations',
    en: {
      summary: 'This 36-page SEC complaint alleges securities-offering fraud and unregistered offerings involving Guo, Je, Mountains of Spices, G Club Operations, several relief defendants, GTV-related offerings, G Clubs, and H-Coin. It requests injunctions, disgorgement, civil penalties, officer/director bars, conduct restrictions, relief-defendant repayment, and a jury trial. It is an official agency pleading, not a final judgment.',
      plainEnglish: 'This is the SEC\'s civil accusation. It tells you whom the agency sued, what securities-law theories it asserted, and what remedies it asked for. It does not tell you which claims were later proven, settled, defaulted, stayed, or dismissed.',
      legalReading: ['Pages 1-9 identify defendants, relief defendants, alleged programs, and the SEC\'s asserted control and fund-flow theory.', 'Pages 30-34 plead the later causes of action, including unregistered offerings and unjust enrichment.', 'Pages 34-36 request final relief; a request for disgorgement or penalties is not an award until the court enters an operative order or judgment.', 'The local civil-case library does not presently contain the subsequent docket history needed to state the current merits disposition.'],
      caseConnections: ['Compare civil disgorgement and Fair Fund distributions with the $411 million credit in criminal Doc 858.', 'Keep relief-defendant unjust-enrichment claims separate from fraud liability claims against named defendants.'],
      whyItMatters: ['It is the official SEC source for the civil theory and requested remedies.', 'It cannot substitute for later judgments, settlements, defaults, stays, or distribution orders.'],
      verificationTasks: ['Collect the full 1:23-cv-02200 docket, answers, stays, defaults, consent judgments, and operative orders.', 'Audit the unrelated SEC property-guidance PDF currently assigned to this case and remove it if no case nexus exists.'],
      riskFlags: ['Agency allegations are not judicial findings.', 'The local collection is materially incomplete for case-level outcome analysis.'],
      findings: [finding('summary', 'The SEC alleged multiple offering frauds and unregistered offerings involving GTV-related, convertible-loan, G Clubs, and H-Coin programs.', [2, 3, 4, 5]), finding('legalReading', 'The SEC requested injunctions, disgorgement, penalties, bars, relief-defendant repayment, and a jury trial.', [34, 35, 36])],
    },
    zh: {
      summary: '这份 36 页 SEC 起诉状指控郭、Je、Mountains of Spices、G Club Operations 和数名 relief defendants 涉及证券发行欺诈及未注册发行，涵盖 GTV 相关发行、G Clubs 和 H-Coin。SEC 请求禁令、返还、民事罚款、高管/董事禁任、行为限制、relief defendants 返还以及陪审团审判。它是官方机构诉状，不是终局判决。',
      plainEnglish: '这是 SEC 的民事指控书，说明机构起诉了谁、提出哪些证券法理论、请求哪些救济。它没有告诉我们哪些主张后来被证明、和解、缺席判决、中止或驳回。',
      legalReading: ['第 1-9 页列明被告、relief defendants、相关项目，以及 SEC 对控制关系和资金流向的主张。', '第 30-34 页提出后续诉因，包括未注册发行和不当得利。', '第 34-36 页只是请求法院给予终局救济；返还或罚款只有在法院作出操作性命令或判决后才成为实际义务。', '当前本地民事案文件库缺少说明案件实体结果所需的后续完整案卷。'],
      caseConnections: ['把民事返还和 Fair Fund 分配与刑事 Doc 858 的 4.11 亿美元抵扣对照。', '把 relief defendants 的不当得利请求与对正式被告的欺诈责任分开。'],
      whyItMatters: ['它是 SEC 民事理论和请求救济的官方来源。', '它不能替代后续判决、和解、缺席、中止或分配命令。'],
      verificationTasks: ['收集 1:23-cv-02200 完整案卷、答辩、中止、缺席、同意判决和操作性命令。', '审计目前误归入该案的 SEC 财产处置指引 PDF；若无案件关联应移除。'],
      riskFlags: ['机构指控不等于法院认定。', '当前本地资料不足以形成案件结果层面的完整结论。'],
      findings: [finding('summary', 'SEC 指控 GTV 相关发行、可转换贷款、G Clubs 和 H-Coin 涉及多项发行欺诈或未注册发行。', [2, 3, 4, 5]), finding('legalReading', 'SEC 请求禁令、返还、罚款、禁任、relief defendants 返还和陪审团审判。', [34, 35, 36])],
    },
  }),
  'bkd-24-05021-bannon:1': report({
    sha256: '13534b173f10f2a029f80dff37b80ab72f7ac3f5a744efc160bb662a3503a8eb',
    posture: 'trustee_allegations',
    en: {
      summary: 'This 18-page Chapter 11 trustee complaint seeks to avoid and recover an alleged $250,000 prepetition transfer from Golden Spring (New York) Ltd. to Bannon Strategic Advisors, Inc. under Bankruptcy Code §§ 544, 548, and 550 and New York law. It is the trustee\'s pleading, not a liability judgment.',
      plainEnglish: 'The trustee says $250,000 that should be treated as the debtor\'s property was transferred through Golden Spring to Bannon Strategic Advisors and asks for it back. The complaint starts the dispute; it does not prove that the transfer was fraudulent or that the defendant must repay it.',
      legalReading: ['Pages 3-5 define the action and plead the $250,000 transfer theory.', 'Pages 11-14 plead actual- and constructive-fraudulent-transfer claims.', 'Pages 15-16 request avoidance, recovery, interest, and other relief; page 18 lists the August 28, 2018 transfer in Schedule A.', 'Background statements relying on other proceedings must be checked against the cited orders rather than adopted wholesale from the complaint.'],
      caseConnections: ['Connect the alleged Golden Spring transfer to the main bankruptcy estate and any control findings, but do not infer that Bannon Strategic Advisors was owned or controlled by Guo.'],
      whyItMatters: ['It defines a discrete estate-recovery claim and amount.'],
      verificationTasks: ['Collect the answer, dispositive motions, settlement documents, and final disposition.', 'Verify any cited alter-ego findings in the underlying orders.'],
      riskFlags: ['Trustee allegations are not court findings.', 'A transferee relationship does not establish affiliate or control status.'],
      findings: [finding('summary', 'The trustee seeks recovery of an alleged $250,000 prepetition transfer made through Golden Spring.', [4, 15, 18]), finding('legalReading', 'The complaint pleads actual and constructive fraudulent-transfer theories under federal and New York law.', [11, 12, 13, 14])],
    },
    zh: {
      summary: '这份 18 页第 11 章受托人起诉状依据破产法 §§ 544、548、550 和纽约州法，请求撤销并追回一笔被指称由 Golden Spring (New York) Ltd. 在破产申请前支付给 Bannon Strategic Advisors, Inc. 的 25 万美元。它是受托人诉状，不是责任判决。',
      plainEnglish: '受托人认为这 25 万美元应被视为债务人的财产，经 Golden Spring 转给了 Bannon Strategic Advisors，因此要求追回。起诉状只是开始争议，并不能证明转移一定具有欺诈性，也不能证明被告已经负有返还义务。',
      legalReading: ['第 3-5 页界定诉讼并提出 25 万美元转移理论。', '第 11-14 页提出实际和建设性欺诈转移诉因。', '第 15-16 页请求撤销、追回、利息等救济；第 18 页 Schedule A 列出 2018 年 8 月 28 日转账。', '引用其他程序的背景陈述应回到被引用裁定核验，不能因出现在起诉状中就整体采纳。'],
      caseConnections: ['可把被指称的 Golden Spring 转移连接到破产主案和相关控制认定，但不能据此推断 Bannon Strategic Advisors 由郭所有或控制。'],
      whyItMatters: ['它界定一项金额明确的破产财产追回请求。'],
      verificationTasks: ['收集答辩、终局性动议、和解文件和最终处分。', '核验起诉状引用的任何人格混同裁定原文。'],
      riskFlags: ['受托人主张不等于法院认定。', '受让人关系不能证明关联或控制关系。'],
      findings: [finding('summary', '受托人请求追回一笔被指称经 Golden Spring 支付的 25 万美元破产前转移。', [4, 15, 18]), finding('legalReading', '起诉状依据联邦和纽约州法提出实际与建设性欺诈转移理论。', [11, 12, 13, 14])],
    },
  }),
  'bkd-24-05249-aca:192': report({
    sha256: '21691101c3bde166717c28a2a1c306dd5888974218484ba052009cc0ea916e05',
    posture: 'defense_position',
    en: {
      summary: 'This 30-page joint Answer responds to the trustee\'s amended complaint for numerous ACA, G Fashion, Hamilton, Himalaya, related entities, and William Je. It contains paragraph-by-paragraph admissions, denials, and insufficient-information responses, requests dismissal with prejudice, asserts fifteen defenses, reserves amendment rights, and demands a jury.',
      plainEnglish: 'This is the defendants\' formal side of the dispute. They do not simply say “no”; they separate what they admit, deny, or cannot confirm, and they raise procedural and substantive defenses. None of those defenses has legal effect merely because it was pleaded.',
      legalReading: ['Pages 14-26 contain the claim-by-claim response pattern and must be compared paragraph by paragraph with amended complaint Doc 106.', 'Page 27 asserts failure to state a claim, limitations, no debtor property interest, § 550 limits, no harm, waiver, release, and judicial estoppel.', 'Page 28 adds ratification, in pari delicto, unclean hands, laches, standing, equitable estoppel, due process, personal jurisdiction, and subject-matter jurisdiction.', 'Page 29 reserves rights and demands a jury.', 'An affirmative defense preserves a legal theory; it is not a court ruling and may later be waived, rejected, narrowed, or proven.'],
      caseConnections: ['Map each defendant separately; a joint answer does not prove common ownership, control, alter ego, or liability.', 'Compare admissions and denials with later discovery, dispositive motions, withdrawal-of-reference proceedings, and any settlement.'],
      whyItMatters: ['It is the most important local defense-side filing for the broad ACA/G Fashion/Hamilton/Himalaya adversary case.'],
      verificationTasks: ['Acquire amended complaint Doc 106 and build a paragraph-by-paragraph comparison.', 'Collect rulings on jurisdiction, jury entitlement, standing, limitations, and § 550 defenses.'],
      riskFlags: ['Defense assertions are party positions, not findings.', 'The current local set is not enough to determine which defenses remain viable.'],
      findings: [finding('summary', 'The defendants answered the amended complaint with admissions, denials, insufficient-information responses, fifteen defenses, and a jury demand.', [14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29]), finding('legalReading', 'The defenses include no debtor property interest, § 550 limitations, standing, due process, and personal and subject-matter jurisdiction.', [27, 28])],
    },
    zh: {
      summary: '这份 30 页共同答辩代表多家 ACA、G Fashion、Hamilton、Himalaya 相关实体及 William Je 回应受托人修订起诉状。文件逐段承认、否认或表示信息不足，请求有终局效力地驳回，提出十五项抗辩，保留修改权并要求陪审团审判。',
      plainEnglish: '这是被告一方对争议的正式回应。它不是简单说“全部否认”，而是区分承认、否认和无法确认的内容，并提出程序和实体抗辩。但这些抗辩不会因为写进答辩状就自动成立。',
      legalReading: ['第 14-26 页逐项回应各项诉因，必须与修订起诉状 Doc 106 逐段比较。', '第 27 页提出未能陈述可救济请求、时效、债务人从未拥有财产利益、§ 550 限制、无损害、放弃、解除和 judicial estoppel。', '第 28 页继续提出 ratification、in pari delicto、unclean hands、laches、诉讼资格、equitable estoppel、正当程序、属人和事项管辖权。', '第 29 页保留权利并要求陪审团审判。', '积极抗辩只是保留法律理论，不是法院裁定，后续可能被放弃、驳回、限缩或证明。'],
      caseConnections: ['必须分别绘制各被告；共同答辩不能证明共同所有、控制、人格混同或责任。', '把承认和否认与后续证据开示、终局动议、withdrawal-of-reference 程序及和解对照。'],
      whyItMatters: ['它是当前本地资料中 ACA/G Fashion/Hamilton/Himalaya 广泛对抗程序最重要的被告方文件。'],
      verificationTasks: ['取得修订起诉状 Doc 106，建立逐段对照表。', '收集管辖权、陪审团权、诉讼资格、时效和 § 550 抗辩裁定。'],
      riskFlags: ['被告陈述属于当事方立场，不是法院认定。', '当前本地文件不足以判断哪些抗辩仍有效。'],
      findings: [finding('summary', '被告以承认、否认、信息不足答复、十五项抗辩和陪审团请求回应修订起诉状。', [14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29]), finding('legalReading', '抗辩包括债务人没有财产利益、§ 550 限制、诉讼资格、正当程序及属人和事项管辖权。', [27, 28])],
    },
  }),
  'bkd-24-05275-lamp:1': report({
    sha256: 'a2800906f7cd7ae60c9d6a8a74ad7be3921ad58a6d1de50396d52efd38e0a395',
    posture: 'trustee_allegations',
    researchQuality: 'body_partial',
    en: {
      summary: 'This 168-page trustee complaint pleads 109 avoidance and recovery claims against a broad group of Lamp, property, G Club, G Fashion, Rule of Law, GFNY, Himalaya, ACA, Hamilton, Saraca, and related entities. It alleges prepetition actual and constructive fraudulent transfers and unauthorized postpetition transfers under Bankruptcy Code §§ 544, 548, 549, and 550 and New York law. The complaint is not an adjudication, and page 168 states that the schedules were filed under seal.',
      plainEnglish: 'This is a very large recovery complaint. The trustee groups many entities into an alleged transfer network and asks the court to unwind or recover many transfers. The amounts listed near the end are requested recoveries under overlapping legal theories, not money already awarded and not numbers that should automatically be added together.',
      legalReading: ['Pages 18-24 identify the trustee\'s alleged pre- and postpetition transfer map and repeatedly use alter-ego language; those are pleaded allegations.', 'Beginning at page 24, the complaint repeats actual fraud, constructive fraud, state-law, and postpetition avoidance theories by defendant.', 'Pages 143-166 list requested relief and pleaded minimum transfer amounts by entity. Multiple counts may be alternative theories for the same transfer.', 'Page 168 says the schedules were filed under seal, so the public complaint does not disclose all transaction-level schedules.', 'A trustee complaint establishes the existence and scope of a recovery action, not beneficial ownership, control, transfer validity, or liability.'],
      caseConnections: ['Compare the pleaded entity and transfer map with ACA Doc 192 and each defendant\'s later response.', 'Reconcile asset theories with the main bankruptcy case, criminal forfeiture, SEC/Fair Fund, and any withdrawal-of-reference proceedings.'],
      whyItMatters: ['It is the broadest local trustee pleading for the G-series and related-entity recovery network.', 'Its sealed schedules and missing later merits filings prevent a final case conclusion.'],
      verificationTasks: ['Collect answers, motions, rulings, settlements, judgments, and lawful public versions of schedules.', 'Build a transfer table that de-duplicates alternative claims and separates pleaded amount from recovered amount.'],
      riskFlags: ['Trustee allegations and alter-ego labels are not court findings.', 'Sealed schedules are unavailable and must not be reconstructed by inference.', 'Requested amounts may overlap across alternative legal claims.'],
      findings: [finding('summary', 'The trustee pleads 109 avoidance and recovery claims against a wide group of entities under federal and New York law.', [1, 18, 24, 166]), finding('legalReading', 'The complaint alleges an entity-by-entity pre- and postpetition transfer network; alter-ego and control language remains pleaded theory.', [18, 19, 20, 21, 22, 23, 24]), finding('riskFlags', 'The transaction schedules were filed under seal, leaving a material public-record gap.', [168])],
    },
    zh: {
      summary: '这份 168 页受托人起诉状针对 Lamp、房地产、G Club、G Fashion、Rule of Law、GFNY、Himalaya、ACA、Hamilton、Saraca 等大量实体提出 109 项撤销和追回请求，主张存在破产前实际/建设性欺诈转移及未经授权的破产后转移，依据破产法 §§ 544、548、549、550 和纽约州法。起诉状不是裁判，而且第 168 页明确写明 schedules 已密封提交。',
      plainEnglish: '这是一份规模很大的追回起诉状。受托人把许多实体纳入被指称的转移网络，请求撤销或追回大量交易。末尾列出的金额是按多种可能重叠的法律理论提出的请求，不是已经判得的钱，也不能简单相加。',
      legalReading: ['第 18-24 页列出受托人主张的破产前后转移网络，并反复使用人格混同表述；这些仍是诉状指控。', '从第 24 页开始，起诉状按被告重复提出实际欺诈、建设性欺诈、州法和破产后撤销理论。', '第 143-166 页按实体列出请求救济和被主张的最低转移金额；同一转移可能由多个替代理论重复覆盖。', '第 168 页写明 schedules 已密封，因此公开起诉状没有披露全部逐笔交易表。', '受托人起诉只能证明存在追回诉讼及其范围，不能证明受益所有权、控制、转移有效性或责任已被法院认定。'],
      caseConnections: ['把被主张的实体和转移网络与 ACA Doc 192 及各被告后续回应对照。', '与破产主案、刑事没收、SEC/Fair Fund 以及 withdrawal-of-reference 程序核对资产理论。'],
      whyItMatters: ['它是本地资料中覆盖 G 系列及相关实体追回网络最广的受托人诉状。', '密封 schedules 和缺少后续实体文件，使案件无法形成终局结论。'],
      verificationTasks: ['收集答辩、动议、裁定、和解、判决及合法公开的 schedules 版本。', '建立去重转移表，区分替代诉因下的指称金额和实际追回金额。'],
      riskFlags: ['受托人指控及人格混同标签不等于法院认定。', '密封 schedules 不可用，不得靠推测重建。', '请求金额可能在替代法律理论之间重叠。'],
      findings: [finding('summary', '受托人依据联邦和纽约州法对广泛实体提出 109 项撤销与追回请求。', [1, 18, 24, 166]), finding('legalReading', '起诉状逐实体指称破产前后转移网络；人格混同和控制表述仍属于诉状理论。', [18, 19, 20, 21, 22, 23, 24]), finding('riskFlags', '逐笔交易 schedules 已密封，形成重大公开记录缺口。', [168])],
    },
  }),
  'sdny-23-cr-118:506': report({
    caseId: 'sdny-23-cr-118',
    sha256: '2d4eaec96358615406e4ad1cdc30d253c80c7155656b974ac3ffb3e1ab72ecf3',
    posture: 'third_party_motion_with_exhibits',
    researchQuality: 'body_partial',
    en: {
      summary: 'This 57-page March 21, 2025 filing is a third-party lawyer\'s motion on behalf of approximately 5,242 Himalaya Exchange members. It asks the court to vacate without prejudice an earlier preliminary forfeiture order, suspend the April 7 ancillary deadline, require later notice, and hold existing § 853(n) petitions in abeyance. The attached proposed order on pages 56-57 is unsigned and is not a court ruling. The exhibit bundle also preserves the government\'s contrary position that sentencing should proceed promptly so a final forfeiture order and remission process could follow.',
      plainEnglish: 'This is one side asking the judge to stop and restart the claims clock. The lawyer argued that thousands of customers lacked clear notice and a safe way to present claims. The government argued in an attached letter that delay also harmed people seeking compensation. Think of it as two proposed routes placed before the judge, not proof that either route had already been adopted.',
      legalReading: [
        'Pages 1-7 seek vacatur, tolling, renewed notice, and quarantine of existing petitions. Statements about ownership, the validity of Wang\'s consent, government motive, customer status, and the absence of a nexus are counsel\'s arguments.',
        'Page 1 states approximately 5,242 represented members and describes an HID-based secure process. That count and the account figures are filing-side representations, not judicially certified claimant data.',
        'Pages 21-24 reproduce the government\'s March 18 letter seeking public filing of nonprivileged substitution materials, limited unsealing, and prompt sentencing. Its victim and remission descriptions are government positions in advocacy.',
        'Pages 56-57 are labeled as a proposed order and contain no judge\'s signature or entered date. A proposed order has no operative effect unless the court signs or otherwise enters relief.',
        'Many exhibit pages are image-only or contain correspondence. This report verifies the main motion, the government letter, and the proposed order, but does not treat every exhibit assertion as independently proven.',
      ],
      caseConnections: ['Compare with Docs 612 and 612-1 for the April 4 collective procedure and sealing requests, Final-motion.pdf for the April 7 combined petition, and Docs 720, 785, 858, and 866 for the later judicial forfeiture framework.', 'The represented-member counts changed over time and must be stored with date and methodology rather than merged into one claimant total.'],
      whyItMatters: ['It is an early public record of the collective-claim strategy and of the conflict between pausing judicial deadlines and moving toward sentencing/remission.', 'It demonstrates why unsigned proposed orders must be visually and legally distinguished from court orders.'],
      verificationTasks: ['Obtain the official docket text and any order resolving Doc 506.', 'Authenticate the exhibit set against PACER or RECAP and identify which exhibits were public, sealed, or later superseded.'],
      riskFlags: ['Approximate client counts, HID authentication descriptions, ownership assertions, and misconduct claims are party representations.', 'Do not expose customer correspondence, HID values, KYC material, account details, or sealed submissions.', 'The current public copies are backup mirrors; the Himalaya and NFSC PDFs share the same SHA-256 but are not substitutes for the official docket entry.'],
      findings: [finding('summary', 'Third-party counsel requested vacatur, tolling, renewed notice, and temporary suspension of existing ancillary petitions.', [1, 2, 7]), finding('legalReading', 'The attached government letter advocated prompt sentencing and later remission, while the motion advocated pausing and restructuring the process.', [21, 22, 23, 24]), finding('riskFlags', 'The proposed order is unsigned and therefore cannot be reported as relief granted.', [56, 57])],
    },
    zh: {
      summary: '这份 2025 年 3 月 21 日的 57 页文件，是第三方律师代表约 5,242 名 Himalaya Exchange 成员提出的动议。律师请求法院不妨碍日后重提地撤销早期初步没收令、暂停 4 月 7 日附属申请期限、要求以后重新通知，并暂缓处理已经提交的 § 853(n) 申请。第 56-57 页所附“拟议命令”没有法官签名，不是法院裁定。附件同时保留检方相反立场：应尽快推进量刑，之后才能形成最终没收令并启动 remission。',
      plainEnglish: '可以把它理解成一方要求法官“先暂停计时，再重新设计申请通道”。律师认为数千名客户没有得到清楚通知，也缺少安全提交材料的办法；附件中的检方则认为继续拖延也会伤害等待补偿的人。两条路线都只是提交给法官的方案，不能当成法院已经选择了其中一条。',
      legalReading: ['第 1-7 页请求撤销、暂停期限、重新通知并暂存申请。有关所有权、王雁平同意是否有效、政府动机、客户身份及缺乏关联性的表述均属于律师论证。', '第 1 页称代表约 5,242 名成员，并描述基于 HID 的安全流程；人数和账户数字是文件方陈述，不是法院认证数据。', '第 21-24 页收录检方 3 月 18 日函，主张公开非特权的更换律师材料、有限解封并尽快量刑；其中受害人和 remission 描述属于检方诉讼立场。', '第 56-57 页明确是拟议命令，没有法官签名或登记日期；拟议命令只有经法院签署或另行作出救济后才有操作效力。', '大量附件页是图片或往来材料。本报告核验主文、检方函和拟议命令，但不把每项附件陈述视为独立证明。'],
      caseConnections: ['与 Docs 612、612-1 的 4 月 4 日集体程序和密封请求、Final-motion.pdf 的 4 月 7 日合并申请，以及 Docs 720、785、858、866 的后续法院没收框架一起阅读。', '代表人数随日期和统计方法变化，必须分别保存，不能合并成一个固定申请人数。'],
      whyItMatters: ['它是集体申请方案以及“暂停司法期限”和“推进量刑/remission”冲突的早期公开记录。', '它说明界面必须把未签署拟议命令与法院命令明显区分。'],
      verificationTasks: ['取得 Doc 506 正式案卷文字和处理该动议的法院命令。', '用 PACER 或 RECAP 核验附件，确认哪些公开、哪些密封、哪些后来被取代。'],
      riskFlags: ['客户数量、HID 认证说明、所有权和不当行为指控均属于文件方陈述。', '不得公开客户往来、HID、KYC、账户详情或密封提交。', '当前公开副本来自备用镜像；Himalaya 与 NFSC 副本 SHA-256 相同，但不能替代正式案卷。'],
      findings: [finding('summary', '第三方律师请求撤销早期命令、暂停期限、重新通知并暂缓既有附属申请。', [1, 2, 7]), finding('legalReading', '附件中的检方函主张尽快量刑和随后 remission，动议则主张暂停并重构程序。', [21, 22, 23, 24]), finding('riskFlags', '拟议命令未签署，不得写成法院已经批准。', [56, 57])],
    },
  }),
  'sdny-23-cr-118:612': report({
    caseId: 'sdny-23-cr-118',
    sha256: '803b7c0a2fd39881ede0507c8a2226f678ad77af3f082a724e3ea4f5216b5f05',
    posture: 'collective_third_party_motion',
    researchQuality: 'body_verified',
    en: {
      summary: 'Doc 612 is a 14-page April 4, 2025 motion asking the court to redesign the claims process for Himalaya Exchange customers. Counsel reported approximately 6,537 clients, approximately 3,539 previously authenticated records, approximately 1,433 consolidated affidavits, and approximately 117 withdrawals, and proposed a sealed umbrella filing keyed by HID. These figures and the proposed evidentiary method are counsel\'s representations, not court findings or proof that every person filed a valid § 853(n) petition.',
      plainEnglish: 'The lawyer was trying to replace thousands of separate envelopes with one organized, sealed package. That may make administration easier, but the legal question is not only whether a person appears on a spreadsheet. Each route still has its own test: ownership of specific property for § 853(n), government discretion for remission, and separate requirements for restitution or Rule 41(g).',
      legalReading: ['Pages 2-4 request sealing, an extended deadline, government disclosure, and one umbrella filing. The stated counts describe counsel\'s client and authentication records at that time.', 'Pages 5-7 propose reliance on identity, account, transaction, audit, and compliance records. Calling records self-authenticating or best evidence is an advocacy position; admissibility, completeness, tracing, and weight remain judicial questions.', 'Pages 8-10 describe language, access, security, and administration concerns and propose either return to HEX or return to individual members. Those alternatives raise different ownership, tracing, and distribution issues.', 'Pages 11-13 invoke victim-rights provisions. Victim rights do not automatically establish a superior ownership interest in specific forfeited property, and a § 853(n) petition is legally distinct from remission and restitution.', 'The filing does not include a signed order approving the collective procedure or extending the deadline.'],
      caseConnections: ['Read with Doc 612-1 for sealing, Doc 612-2 for the historical property list, Docs 612-3 through 612-6 for supporting materials, and Final-motion.pdf for the April 7 combined petition.', 'Later Docs 763, 785, 858, and 866 show that sealed collective submissions, judicial ancillary claims, and DOJ remission remained distinct procedural subjects.'],
      whyItMatters: ['It is the central public motion explaining the proposed collective HID-based claims architecture.', 'It provides a dated methodology for several frequently repeated but nonidentical claimant counts.'],
      verificationTasks: ['Obtain the order, if any, granting or denying the requested umbrella procedure and deadline extension.', 'Reconcile each count by date, representation status, authentication status, affidavit status, and actual docket acceptance.'],
      riskFlags: ['Do not equate client, authenticated record, affidavit, submitted claim, valid petition, and successful claimant.', 'Do not expose the sealed spreadsheet or reconstruct claimant identity from HID or account data.', 'Legal labels such as victim, trust property, automatic admissibility, and government wrongdoing are counsel\'s positions unless adopted by the court.'],
      findings: [finding('summary', 'Counsel proposed a sealed umbrella process for thousands of represented HEX members.', [2, 3, 4, 13]), finding('legalReading', 'The motion combines several requested remedies that have different legal standards and decision-makers.', [3, 6, 11, 12]), finding('riskFlags', 'The counts 6,537, 3,539, 1,433, and 117 measure different categories and are not interchangeable.', [2, 4])],
    },
    zh: {
      summary: 'Doc 612 是 2025 年 4 月 4 日提交的 14 页动议，请求法院重构 Himalaya Exchange 客户的申请程序。律师称当时约有 6,537 名客户、约 3,539 份此前经认证的记录、约 1,433 份合并宣誓书和约 117 名退出者，并建议以 HID 为索引提交一份密封总申请。这些数字和证据方案是律师陈述，不是法院认定，也不能证明每个人都已提交有效 § 853(n) 申请。',
      plainEnglish: '律师试图把几千个单独信封变成一套有组织的密封文件包。这可能便于管理，但法律判断不只是“名字是否出现在表格里”。不同通道仍有不同门槛：§ 853(n) 要证明对特定财产的权利，remission 由 DOJ 酌情处理，赔偿和 Rule 41(g) 又有各自条件。',
      legalReading: ['第 2-4 页请求密封、延长期限、政府披露和一份总申请；其中人数分别反映当时律师的客户、认证和宣誓书记录。', '第 5-7 页主张依靠身份、账户、交易、审计和合规记录。所谓自动可采或最佳证据属于诉讼论证；可采性、完整性、资金追踪和证明力仍需裁判。', '第 8-10 页说明语言、访问、安全和管理障碍，并提出返还给 HEX 或直接返还个人两种方案；两种方案涉及不同的所有权、追踪和分配问题。', '第 11-13 页引用受害人权利规定。受害人权利不会自动证明对特定没收财产的优先权，§ 853(n)、remission 和 restitution 是不同程序。', '文件没有附带法院签署的集体程序批准命令或延期命令。'],
      caseConnections: ['与 Doc 612-1 的密封请求、Doc 612-2 的历史财产清单、Docs 612-3 至 612-6 的支持材料，以及 Final-motion.pdf 的 4 月 7 日合并申请一起阅读。', '后续 Docs 763、785、858、866 表明，密封集体提交、法院附属申请和 DOJ remission 仍是不同程序事项。'],
      whyItMatters: ['它是解释集体 HID 申请架构的核心公开动议。', '它为几个经常被引用但含义不同的申请人数提供了带日期的统计方法。'],
      verificationTasks: ['取得法院是否批准总申请程序和延长期限的命令。', '按日期、委托状态、认证状态、宣誓书状态和实际案卷接收状态逐项核对人数。'],
      riskFlags: ['不得把客户数、认证记录数、宣誓书数、提交数、有效申请数和胜诉人数视为同一概念。', '不得公开密封表格，也不得依据 HID 或账户数据重建申请人身份。', '受害人、信托财产、自动可采和政府不当行为等定性，除非法院采纳，否则属于律师立场。'],
      findings: [finding('summary', '律师为数千名受代理 HEX 成员提出密封总申请程序。', [2, 3, 4, 13]), finding('legalReading', '动议把多个法律标准和决定机关不同的救济通道组合提出。', [3, 6, 11, 12]), finding('riskFlags', '6,537、3,539、1,433 和 117 分别衡量不同类别，不能互换。', [2, 4])],
    },
  }),
  'sdny-23-cr-118:612-1': report({
    caseId: 'sdny-23-cr-118',
    sha256: '5e2823c1da930cf75d55f3ab8e6697b96841d53f0e5ecf9a5f6f8b079287784c',
    posture: 'motion_to_seal_third_party_data',
    researchQuality: 'body_verified',
    en: {
      summary: 'Doc 612-1 is an 11-page motion asking permission to submit identifying and financial information for more than 6,000 represented Himalaya Exchange customers under seal. It argues that a protected process is needed because of privacy, security, access, and uncertainty about the proper recipient for claims. It is a sealing and procedure request, not a ruling that the customers owned particular seized funds or qualified for any remedy.',
      plainEnglish: 'This document asks where sensitive claim papers should be delivered and who should be allowed to see them. A locked filing cabinet can protect private records, but putting a claim in that cabinet does not prove the claim. Ownership and entitlement still have to be decided separately.',
      legalReading: ['Pages 1-5 request sealing and describe a group of more than 6,000 clients, possible HEX and individual routes, and counsel\'s proposed use of business records.', 'Pages 6-10 rely heavily on victim-rights statutes and government service duties. Those provisions may support notice and process arguments but do not by themselves decide title to specific forfeited property.', 'The motion references Rule 41(g), § 853(n), remission, restitution, and other theories together. These remedies are not interchangeable and may differ in standing, timing, property specificity, and decision-maker.', 'Page 10 asks for authorization to submit personal and financial data under seal or to a designated agency under equivalent protection; page 11 is the certificate of service.', 'No individual claimant data is required to understand the legal issue, and none should be reproduced in the public application.'],
      caseConnections: ['Doc 612 supplies the broader procedure proposal; Final-motion.pdf later asserts a combined claim; Docs 720, 858, and 866 control later court treatment of forfeiture and access.', 'The privacy rationale supports sealing analysis but does not answer whether a collective petition satisfies § 853(n) for each claimant.'],
      whyItMatters: ['It directly documents the requested privacy boundary for claimant information.', 'It helps the application explain why public filings may show only cover motions while the underlying submissions remain sealed.'],
      verificationTasks: ['Locate the court order resolving the sealing request and the exact scope of permitted access.', 'Confirm whether filings were accepted collectively, individually, through DOJ, or through more than one route.'],
      riskFlags: ['Sealing protects access; it does not validate the claim.', 'Do not publish or infer identities, HID values, transaction records, KYC records, or financial losses.', 'Descriptions of government conduct and legal entitlement are counsel\'s advocacy.'],
      findings: [finding('summary', 'Counsel requested a protected channel for more than 6,000 clients\' identifying and financial materials.', [1, 2, 10]), finding('legalReading', 'The motion joins several distinct remedies but does not establish entitlement under any one of them.', [1, 6, 7, 8, 9]), finding('riskFlags', 'The filing contains no order granting sealing or accepting the underlying claims.', [10, 11])],
    },
    zh: {
      summary: 'Doc 612-1 是 11 页密封动议，请求允许把六千多名受代理 Himalaya Exchange 客户的身份和财务信息密封提交。文件认为，由于隐私、安全、访问障碍以及不清楚应向谁提交申请，需要受保护的程序。它只是密封和程序请求，不是法院认定这些客户拥有特定被查扣资金，也不是认定其符合任何救济条件。',
      plainEnglish: '这份文件解决的是敏感申请材料“交到哪里、谁能看”。上锁的文件柜可以保护隐私，但把申请放进文件柜并不能证明申请成立；所有权和能否获得返还仍要另外判断。',
      legalReading: ['第 1-5 页请求密封，描述六千多名客户、HEX 整体与个人两种路线，以及律师主张使用业务记录的方案。', '第 6-10 页大量引用受害人权利和政府服务义务；这些规定可能支持通知和程序论证，但不能自行决定特定没收财产的所有权。', '动议把 Rule 41(g)、§ 853(n)、remission、restitution 等理论并列提出；这些救济在 standing、时间、特定财产要求和决定机关上并不相同。', '第 10 页请求允许密封提交，或向法院指定机构以同等保护方式提交；第 11 页是送达证明。', '理解法律问题不需要公开任何个人数据，程序也不应复制这些材料。'],
      caseConnections: ['Doc 612 提供更完整的程序方案；Final-motion.pdf 后来提出合并申请；Docs 720、858、866 反映后续法院对没收和访问的处理。', '隐私理由可以支持密封，但不能回答集体申请是否逐人满足 § 853(n)。'],
      whyItMatters: ['它直接记录申请人信息所要求的隐私边界。', '它帮助程序解释为何公开案卷可能只有封面动议，而底层材料仍被密封。'],
      verificationTasks: ['寻找处理密封请求的法院命令及准许访问的准确范围。', '确认材料最终是集体、逐人、通过 DOJ，还是多条渠道提交。'],
      riskFlags: ['密封解决访问问题，不验证申请实体。', '不得公开或推断身份、HID、交易、KYC 或损失数据。', '关于政府行为和法律权利的描述属于律师论证。'],
      findings: [finding('summary', '律师请求为六千多名客户的身份和财务材料建立受保护提交通道。', [1, 2, 10]), finding('legalReading', '动议并列提出不同救济，但没有证明任何一种救济已经成立。', [1, 6, 7, 8, 9]), finding('riskFlags', '文件没有法院批准密封或接受底层申请的命令。', [10, 11])],
    },
  }),
  'sdny-23-cr-118:612-2': report({
    caseId: 'sdny-23-cr-118',
    sha256: 'dc2a59bb1ce7365aed6e8a5491a129e020245a3287c1163a27aa03bd49debf89',
    posture: 'historical_government_forfeiture_notice_exhibit',
    researchQuality: 'body_verified',
    en: {
      summary: 'Doc 612-2 is a six-page copy of the government\'s April 7, 2023 forfeiture bill of particulars, refiled as an exhibit to Doc 612 in 2025. It lists bank funds, real property, vehicles, a yacht, and personal property that the government then identified as subject to forfeiture under the S1 indictment. Its re-filing did not create a new 2025 seizure, ruling, or final forfeiture order.',
      plainEnglish: 'This is an older government property list attached to a newer motion. It is like attaching an old inventory to explain what the dispute concerns. The attachment date in 2025 does not reset the inventory\'s legal date, and listing property does not decide who ultimately owns it.',
      legalReading: ['Page 1 identifies the document as the S1 forfeiture bill of particulars and ties it to Counts One through Eleven.', 'Pages 1-5 list specific accounts and other property. The list provides notice of the government\'s forfeiture theory; it does not adjudicate nexus, title, tracing, or third-party priority.', 'The document date on page 6 is April 7, 2023. The Doc 612-2 header reflects its later attachment to the April 4, 2025 filing.', 'Several amounts and entries appear duplicated in the PDF text layer. Totals should be calculated only from an official normalized property table, not by summing extracted text.', 'Later preliminary and final forfeiture orders, especially Docs 720, 858, and 859, control the operative property and money-judgment posture.'],
      caseConnections: ['Use this exhibit to map historical account and entity names, then reconcile each item with later forfeiture orders and third-party petitions.', 'Do not infer that every listed asset belonged beneficially to Guo or remained available in 2025.'],
      whyItMatters: ['It is a useful historical index of property the government identified early in the case.', 'It prevents a 2023 notice from being mistaken for a 2025 judicial ruling.'],
      verificationTasks: ['Compare the original 2023 docket copy and all later amended or supplemental forfeiture orders.', 'Create a de-duplicated asset table with nominal owner, seizure date, later order status, and third-party claim status.'],
      riskFlags: ['A bill of particulars is a government filing, not a final ownership adjudication.', 'OCR or source duplication can cause double counting.', 'Account identifiers should be minimized in public display even when present in a public filing.'],
      findings: [finding('summary', 'The exhibit reproduces the government\'s April 7, 2023 property notice.', [1, 6]), finding('legalReading', 'The listed accounts and assets were asserted to be subject to forfeiture; ownership and third-party interests remained unresolved.', [1, 2, 3, 4, 5]), finding('riskFlags', 'The 2025 exhibit header does not make this a new 2025 ruling.', [1, 6])],
    },
    zh: {
      summary: 'Doc 612-2 是检方 2023 年 4 月 7 日没收 particulars 清单的 6 页副本，2025 年作为 Doc 612 的附件重新提交。文件列出检方当时依据 S1 起诉书主张可没收的银行资金、不动产、车辆、游艇和个人财产。2025 年重新作为附件提交，并没有形成新的查扣、裁定或最终没收令。',
      plainEnglish: '这是一份旧的政府财产清单，被附在较新的动议后面。可以把它理解成用旧库存表说明争议对象；2025 年的附件页眉不会改变它原本的法律日期，而把财产列入清单也不会决定最终所有权。',
      legalReading: ['第 1 页说明它是 S1 起诉书下的没收 particulars，并与第 1-11 项罪名关联。', '第 1-5 页列出具体账户和其他财产；清单提供检方没收理论的通知，不裁判关联性、所有权、追踪或第三方优先权。', '第 6 页日期为 2023 年 4 月 7 日；Doc 612-2 页眉反映的是它后来附于 2025 年 4 月 4 日文件。', 'PDF 文字层中若干金额和条目似有重复；只能依据正式去重财产表计算，不能直接相加提取文本。', '后续初步和最终没收令，特别是 Docs 720、858、859，控制实际财产和金钱判决状态。'],
      caseConnections: ['可用本附件绘制历史账户和实体名称，再逐项与后续没收令和第三方申请核对。', '不得推断每项财产都由郭受益所有，或到 2025 年仍然可供处分。'],
      whyItMatters: ['它是检方早期主张财产范围的重要历史索引。', '它避免把 2023 年通知误写成 2025 年法院裁定。'],
      verificationTasks: ['对照 2023 年原始案卷副本及所有后续修订或补充没收令。', '建立去重资产表，分别记录名义所有人、查扣日期、后续命令和第三方申请状态。'],
      riskFlags: ['particulars 清单是检方文件，不是最终所有权裁判。', 'OCR 或来源重复可能导致重复计算。', '即使公开文件包含账户标识，公开界面也应尽量少展示。'],
      findings: [finding('summary', '附件重现检方 2023 年 4 月 7 日财产通知。', [1, 6]), finding('legalReading', '检方主张所列账户和资产可被没收，但所有权和第三方利益仍未解决。', [1, 2, 3, 4, 5]), finding('riskFlags', '2025 年附件页眉不会把它变成新的 2025 年裁定。', [1, 6])],
    },
  }),
  'sdny-23-cr-118:612-3': report({
    caseId: 'sdny-23-cr-118',
    sha256: '51129f96a872f20622086953706a6b957fdf36d3db3756928b76551783746d06',
    posture: 'claimant_supporting_material',
    researchQuality: 'body_partial',
    en: {
      summary: 'Doc 612-3 is a 44-page supporting exhibit consisting largely of claimant or customer materials submitted to support counsel\'s collective-procedure request. It may document that individuals communicated positions, signed materials, or supplied information, but those submissions are not court findings and do not independently establish ownership, tracing, authenticity, or entitlement.',
      plainEnglish: 'These pages are supporting papers from people connected to the proposed claims process. They can show that someone made a statement or sent material. They cannot, by themselves, prove the money trail or win a property claim, just as a witness letter is not the same thing as a judge\'s decision.',
      legalReading: ['The exhibit must be read as support for Doc 612, not as a separate court order.', 'Individual statements may be declarations, correspondence, forms, or screenshots. Their legal weight depends on authentication, personal knowledge, completeness, admissibility, and comparison with bank and exchange records.', 'A person\'s statement that they do or do not regard themselves as a victim is relevant to that person\'s position but does not control the statutory definition, offense findings, forfeiture nexus, or remedy.', 'Because many pages are image-based and may contain sensitive data, this report intentionally summarizes legal function rather than reproducing identities or transaction details.'],
      caseConnections: ['Read with Doc 612\'s proposed umbrella procedure and Doc 612-4\'s privacy example.', 'Any transaction claim should be reconciled with official bank records, authenticated HEX records, the forfeiture property list, and later § 853(n) or remission action.'],
      whyItMatters: ['It illustrates the evidentiary material counsel proposed using for a large group.', 'It reinforces that the application needs privacy-preserving summaries and page-level source posture.'],
      verificationTasks: ['Identify lawful public descriptions of the exhibit without exposing claimant data.', 'For any litigated claim, obtain the admitted evidence and the court\'s ruling rather than relying on the exhibit alone.'],
      riskFlags: ['Do not publish identities, contact information, HID values, signatures, KYC records, or transaction details.', 'Claimant statements are evidence submissions, not findings.', 'Only part of the image-heavy body has been substantively verified.'],
      findings: [finding('summary', 'The exhibit supplies claimant-side support for the proposed collective filing.', [1, 44]), finding('legalReading', 'Its contents may support authentication or factual claims but require independent evidentiary review.', [1, 2, 3, 4, 5, 6]), finding('riskFlags', 'Sensitive claimant material should not be reproduced in the public catalog.', [1, 44])],
    },
    zh: {
      summary: 'Doc 612-3 是 44 页支持性附件，主要包含申请人或客户材料，用于支持律师提出的集体程序请求。它可以证明有人作出陈述、签署材料或提供信息，但这些材料不是法院认定，也不能独立证明所有权、资金追踪、真实性或取得救济的资格。',
      plainEnglish: '这些页面是与拟议申请程序有关的人提交的支持材料。它们可以说明“某人说过什么、交过什么”，但不能单独证明完整资金链或让财产权申请自动胜诉，就像一封证人信不等于法官判决。',
      legalReading: ['该附件应作为 Doc 612 的支持材料阅读，不是独立法院命令。', '个人材料可能包括声明、往来、表格或截图；其证明力取决于认证、亲身知识、完整性、可采性，以及与银行和交易所记录的对照。', '个人是否把自己视为受害人的陈述与其立场有关，但不能控制法定受害人定义、罪名认定、没收关联或救济方式。', '由于大量页面是图片且可能包含敏感数据，本报告只总结法律作用，不复制身份或交易细节。'],
      caseConnections: ['与 Doc 612 的总申请方案及 Doc 612-4 的隐私实例一起阅读。', '任何交易主张都应与正式银行记录、经认证 HEX 记录、没收财产清单及后续 § 853(n) 或 remission 处理核对。'],
      whyItMatters: ['它展示律师为大规模申请拟使用的证据材料类型。', '它进一步说明程序需要隐私保护摘要和逐页来源姿态。'],
      verificationTasks: ['在不暴露申请人数据的前提下确定附件的合法公开描述。', '对任何实际争议申请，应取得被法院接纳的证据和裁定，不能只依赖本附件。'],
      riskFlags: ['不得公开身份、联系方式、HID、签名、KYC 或交易细节。', '申请人陈述属于证据提交，不是法院认定。', '这份图片型附件只完成了部分实体核验。'],
      findings: [finding('summary', '附件为拟议集体申请提供申请人一方的支持材料。', [1, 44]), finding('legalReading', '材料可能支持认证或事实主张，但需要独立证据审查。', [1, 2, 3, 4, 5, 6]), finding('riskFlags', '敏感申请人材料不得在公开目录中复制。', [1, 44])],
    },
  }),
  'sdny-23-cr-118:612-4': report({
    caseId: 'sdny-23-cr-118',
    sha256: 'a62da4407170d0074384b679a9a8e4d46fc27d317f64619a5ef9749aa0ee09a6',
    posture: 'claimant_correspondence_exhibit',
    researchQuality: 'body_verified',
    en: {
      summary: 'Doc 612-4 is a four-page correspondence exhibit offered to illustrate transaction-record gaps and personal-security concerns in the proposed claims process. It is one person\'s account and supporting correspondence, not a court finding that particular transfers were seized, omitted, lost, or legally recoverable.',
      plainEnglish: 'This is an example of the practical problem a claimant said they faced: some transfers were hard to match and disclosure felt risky. An example can show why a protected procedure may be needed, but it cannot prove the same facts for thousands of other people.',
      legalReading: ['The substantive correspondence appears on page 3 and describes alleged unmatched transfers, missing older records, and privacy concerns.', 'The letter may support counsel\'s request for sealing or more time, but transaction entitlement still requires reliable source records and a legally available remedy.', 'The filer\'s security concerns and factual assertions must be preserved as that person\'s statements, not generalized as findings about all claimants.', 'The public application should not reproduce identifying or contact information from the exhibit.'],
      caseConnections: ['Read with Docs 612 and 612-1 for the procedural and sealing arguments.', 'Any alleged unmatched transfer should be tested against bank records, exchange ledgers, seized-account records, and the later claims process.'],
      whyItMatters: ['It gives a concrete, limited example of why claimant privacy and record-matching were raised.', 'It also demonstrates the danger of generalizing one submission to an entire group.'],
      verificationTasks: ['For a litigated claim, obtain authenticated transfer records and the adjudicator\'s disposition.', 'Confirm the sealing status and redact all personal data from public summaries.'],
      riskFlags: ['One claimant statement is not representative proof.', 'Do not expose personal identity, contact details, or transaction information.', 'The document does not establish that the government held the identified funds.'],
      findings: [finding('summary', 'The exhibit gives one claimant-side example of record-matching and privacy concerns.', [3]), finding('legalReading', 'The example may support process design but does not establish ownership or recoverability.', [3]), finding('riskFlags', 'Personal and transaction details must be suppressed from public display.', [3])],
    },
    zh: {
      summary: 'Doc 612-4 是 4 页往来附件，用来说明拟议申请程序中的交易记录缺口和个人安全顾虑。它是一名个人的陈述和往来材料，不是法院认定某些转账已被查扣、遗漏、丢失或依法可以追回。',
      plainEnglish: '这是一个申请人所说的现实难题实例：有些转账难以匹配，公开身份又让其感到有风险。实例可以说明为什么可能需要受保护程序，但不能证明几千名其他人都具有相同事实。',
      legalReading: ['实体往来见第 3 页，描述被称为未匹配的转账、较早记录缺失和隐私顾虑。', '该函可能支持密封或延长时间请求，但交易权利仍需可靠原始记录和可适用的法律救济。', '提交人的安全顾虑和事实陈述只能按其个人陈述保留，不能推广为全部申请人的法院认定。', '公开程序不得复制附件中的身份或联系方式。'],
      caseConnections: ['与 Docs 612、612-1 的程序和密封论证一起阅读。', '任何被称为未匹配的转账都应与银行记录、交易所账簿、查扣账户记录和后续申请处理核对。'],
      whyItMatters: ['它提供一个有限而具体的实例，解释为何提出隐私和记录匹配问题。', '它也说明不能把一份个人材料推广到整个群体。'],
      verificationTasks: ['对实际争议申请，取得经认证的转账记录和裁判结果。', '确认密封状态并从公开摘要删除全部个人数据。'],
      riskFlags: ['单一申请人陈述不具有群体代表性证明力。', '不得公开个人身份、联系方式或交易信息。', '文件不能证明政府实际持有所述资金。'],
      findings: [finding('summary', '附件提供一项申请人一方的记录匹配与隐私顾虑实例。', [3]), finding('legalReading', '实例可能支持程序设计，但不能证明所有权或可追回性。', [3]), finding('riskFlags', '公开展示必须屏蔽个人和交易细节。', [3])],
    },
  }),
  'sdny-23-cr-118:612-5': report({
    caseId: 'sdny-23-cr-118',
    sha256: '6b3cd7f3c848b083e3043bf15744981209b20e5c1a7f7511ef7b2c138ea96dde',
    posture: 'commissioned_accounting_report_exhibit',
    researchQuality: 'body_partial',
    en: {
      summary: 'Doc 612-5 is a 40-page accounting or financial-review exhibit associated with the Mazars work commissioned through CANDEY for Himalaya Exchange. The report is important source material, but its own limitations matter: it was commissioned for a defined purpose, was not an audit, used non-statistical samples, did not universally verify every source document or transaction, and did not give a legal opinion. It therefore cannot be treated as a court-certified audit of every customer or account.',
      plainEnglish: 'This is closer to a specialist checking selected parts of a large warehouse than to a court counting and certifying every box. The work may reveal useful patterns and controls, but the stated sampling and scope limits prevent it from proving every account balance or every legal claim.',
      legalReading: ['The commissioning relationship and stated scope affect independence and weight; commissioned does not mean false, but it requires transparent disclosure and corroboration.', 'A non-audit engagement does not provide audit assurance. Non-statistical sampling means selected examples cannot automatically be projected to the entire customer population.', 'Accounting observations do not decide legal ownership, constructive trust, forfeiture nexus, victim status, or priority under § 853(n).', 'Any quantified conclusion should be tied to the exact tested population, date, currency, source system, and stated limitation rather than generalized to all members.', 'The image-based report has been reviewed for its stated legal significance and limitations, but this research entry does not claim full transaction-level verification of all 40 pages.'],
      caseConnections: ['Read with Doc 612\'s proposed reliance on audit and compliance materials and Doc 612-6\'s broader evidence bundle.', 'Compare with official bank evidence, admitted trial evidence, the forfeiture orders, and any expert challenge or court ruling.'],
      whyItMatters: ['It is one of the most substantive public supporting materials for the claimed HEX records and controls.', 'Its limitations prevent a common analytical error: calling a commissioned review a universal independent audit or judicial finding.'],
      verificationTasks: ['Preserve the complete engagement letter, methodology, tested population, exceptions, appendices, and any response or cross-examination.', 'Determine whether the report was admitted, relied upon, challenged, or excluded in any proceeding.'],
      riskFlags: ['Not an audit; no universal verification; non-statistical samples; no legal opinion.', 'Commissioned expert material is evidence offered by a side, not a court finding.', 'Do not infer individual account entitlement from aggregate or sampled observations.'],
      findings: [finding('summary', 'The exhibit supplies a commissioned professional review concerning HEX records and controls.', [1, 40]), finding('legalReading', 'The report\'s non-audit, sampling, verification, and no-legal-opinion limits constrain how broadly it may be used.', [1, 2, 3, 4, 5]), finding('riskFlags', 'It cannot certify every customer balance or legal claim.', [1, 40])],
    },
    zh: {
      summary: 'Doc 612-5 是 40 页会计或财务审阅附件，与 CANDEY 为 Himalaya Exchange 委托 Mazars 开展的工作有关。它是重要来源材料，但必须保留报告自身限制：工作为特定目的受委托开展，不是审计，采用非统计抽样，没有普遍核验每份原始文件或每笔交易，也不提供法律意见。因此不能把它称为法院认证的全体客户或全部账户审计。',
      plainEnglish: '它更像专业人员检查一个大型仓库中的若干区域，而不是法院逐箱清点并认证全部货物。工作可能发现有价值的记录和控制情况，但既然范围和抽样有限，就不能证明每个账户余额或每项法律申请。',
      legalReading: ['委托关系和既定范围影响独立性与证明力；受委托不代表虚假，但必须透明披露并由其他证据印证。', '非审计业务不提供审计保证；非统计抽样也不能自动把抽查结果推及全部客户。', '会计观察不能决定法律所有权、constructive trust、没收关联、受害人身份或 § 853(n) 优先权。', '任何数量结论都必须绑定准确测试总体、日期、币种、来源系统和报告限制，不能推广到全部成员。', '本报告已审阅其法律意义和主要限制，但没有声称完成 40 页逐笔交易核验。'],
      caseConnections: ['与 Doc 612 主张依靠审计和合规材料的方案，以及 Doc 612-6 的更大证据包一起阅读。', '与正式银行证据、审判中被接纳证据、没收令及任何专家质疑或法院裁定对照。'],
      whyItMatters: ['它是公开材料中支持 HEX 记录和控制主张的较实质性专业材料。', '其限制可以防止把受委托审阅误称为普遍独立审计或司法认定。'],
      verificationTasks: ['保留完整委托函、方法、测试总体、例外、附件及任何答复或交叉询问。', '确认报告是否在任何程序中被接纳、依赖、质疑或排除。'],
      riskFlags: ['不是审计；没有普遍核验；采用非统计样本；不提供法律意见。', '受委托专家材料是一方提出的证据，不是法院认定。', '不得从汇总或抽样观察推断个人账户权利。'],
      findings: [finding('summary', '附件提供有关 HEX 记录和控制的受委托专业审阅。', [1, 40]), finding('legalReading', '非审计、抽样、核验和无权提供法律意见等限制，约束其可使用范围。', [1, 2, 3, 4, 5]), finding('riskFlags', '它不能认证每名客户余额或法律申请。', [1, 40])],
    },
  }),
  'sdny-23-cr-118:612-6': report({
    caseId: 'sdny-23-cr-118',
    sha256: 'acc454de1e5d3d0053cef7ab665332781d75b06a4e62c025544adbb7b8a496f2',
    posture: 'multi_document_evidence_bundle',
    researchQuality: 'body_partial',
    en: {
      summary: 'Doc 612-6 is a 145-page composite evidence package that republishes earlier court-filed and professional materials, beginning with CANDEY correspondence and materials bearing earlier Doc 207 headers. It is not one new expert opinion or one new court ruling. Only the opening pages and document structure have been verified for this report, so each embedded component must retain its original author, date, docket identity, scope, and evidentiary posture.',
      plainEnglish: 'This is a binder, not a single document. A binder can contain a lawyer\'s letter, a witness statement, an expert report, and earlier court exhibits. The cover number 612-6 does not turn every page into a new 2025 finding or make all enclosed materials equally reliable.',
      legalReading: ['Page 1 is a December 21, 2023 CANDEY transmittal letter referring to an independent expert report and a witness statement; it also contains privilege reservations.', 'Pages 2-10 carry earlier Doc 207-3 headers, showing that material was repackaged into the later Doc 612-6 exhibit.', 'Each embedded document must be analyzed separately. A witness statement, commissioned report, lawyer letter, source record, and court order have different evidentiary weight.', 'The later filing header proves inclusion in the 2025 exhibit bundle, not that the court adopted the enclosed statements.', 'Because only pages 1-10 and the package structure have been verified, no unreviewed page should support a definitive factual conclusion.'],
      caseConnections: ['Read with the original Docs 207 and 208 series where available, and with Docs 612 and 612-5 for the purpose counsel assigned to the evidence.', 'Use duplicate hashes and internal docket headers to avoid counting repackaged evidence as new independent corroboration.'],
      whyItMatters: ['It contains potentially important source material but also creates a high risk of double counting and source-posture collapse.', 'It requires component-level indexing rather than one generic AI summary.'],
      verificationTasks: ['Split the bundle into an internal component index with page ranges, authors, dates, original docket numbers, and duplicate status.', 'Complete page-level review before promoting any embedded assertion to a case-level conclusion.'],
      riskFlags: ['Current research quality is body partial: pages 1-10 and structure verified, remaining pages not fully substantively reviewed.', 'Refiled materials are not independent corroboration merely because they appear under a new exhibit number.', 'Privilege reservations and sensitive content require careful public-display controls.'],
      findings: [finding('summary', 'The exhibit is a 145-page composite of earlier legal and professional materials.', [1, 2, 10, 145]), finding('legalReading', 'Internal Doc 207 headers show repackaging rather than a wholly new 2025 record.', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), finding('riskFlags', 'Only the opening pages and structure are verified for this report.', [1, 10, 145])],
    },
    zh: {
      summary: 'Doc 612-6 是 145 页复合证据包，重新收录较早提交的法院和专业材料，开头是 CANDEY 往来以及带有早期 Doc 207 页眉的文件。它不是一份新的专家意见，也不是一份新的法院裁定。本报告目前只核验了开头页面和文件结构，因此每个内含部分都必须保留原作者、日期、原案卷身份、范围和证据姿态。',
      plainEnglish: '它是一册资料夹，不是一份单独文件。资料夹可以同时放律师函、证人陈述、专家报告和旧法院附件；612-6 这个封面编号不会把每页都变成 2025 年的新认定，也不会让全部材料具有相同可信度。',
      legalReading: ['第 1 页是 2023 年 12 月 21 日 CANDEY 转交函，提到独立专家报告和证人陈述，并保留特权。', '第 2-10 页带有早期 Doc 207-3 页眉，说明这些材料后来被重新包装进 Doc 612-6。', '每个内含文件必须分别分析；证人陈述、受委托报告、律师函、原始记录和法院命令具有不同证明力。', '后来的提交页眉只能证明材料被纳入 2025 年附件，不能证明法院采纳其中陈述。', '由于目前只核验第 1-10 页和整体结构，未审阅页面不得支持确定性事实结论。'],
      caseConnections: ['与能够取得的原始 Docs 207、208 系列及 Docs 612、612-5 对照，确认律师赋予这些证据的用途。', '使用重复哈希和内部案卷页眉，防止把重新提交材料当成新的独立印证。'],
      whyItMatters: ['它可能包含重要原始材料，但也极易产生重复计算和来源姿态混淆。', '它需要按内部组件建立索引，而不是只生成一个笼统 AI 摘要。'],
      verificationTasks: ['按页码、作者、日期、原案卷号和重复状态建立内部组件目录。', '完成逐页审阅后，才能把任何内含陈述提升到案件级结论。'],
      riskFlags: ['当前研究质量为正文部分核验：仅核验第 1-10 页和结构，其余未完成实体审阅。', '旧材料以新附件号重提，不会因此形成独立印证。', '特权保留和敏感内容需要严格公开展示控制。'],
      findings: [finding('summary', '该附件是 145 页较早法律和专业材料的复合包。', [1, 2, 10, 145]), finding('legalReading', '内部 Doc 207 页眉表明这是重新包装，而不是全新的 2025 年记录。', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), finding('riskFlags', '本报告只核验开头页面和文件结构。', [1, 10, 145])],
    },
  }),
  'sdny-23-cr-118:final-motion': report({
    caseId: 'sdny-23-cr-118',
    sha256: '81df1f2d4b568d5eb43bbfb31a596ff2e160f4f6734318e02b33d48e612e7b17',
    posture: 'combined_collective_petition',
    researchQuality: 'body_verified',
    en: {
      summary: 'Final-motion.pdf is a ten-page April 7, 2025 combined petition that says it is submitted for 6,575 Himalaya Exchange members and seeks return through restitution, a § 853(n) ancillary petition, and/or DOJ remission. It reports 3,539 previously authenticated members and approximately 117 former clients removed from the total, invokes a constructive-trust theory, and reserves attorney-fee claims. The public filename does not establish an official ECF number, and the filing does not itself prove that 6,575 valid petitions were accepted or that any claimant had a superior interest.',
      plainEnglish: 'This filing tries several legal doors at once: court-ordered compensation, a court process for ownership of specific property, and an administrative DOJ compensation route. Knocking on all three doors does not mean they use the same key. The judge or DOJ still must decide which route applies and whether each claim satisfies it.',
      legalReading: ['Pages 1-2 identify the filing as a combined petition and incorporate Docs 612 and 514. The claimed 6,575 members are identified only through sealed exhibits referenced by the filing.', 'Pages 4-6 distinguish 6,575 represented clients from 3,539 previously authenticated records and describe the proposed sealed HID spreadsheet. These are counsel\'s records and methodology.', 'Pages 6-9 invoke numerous statutes and a constructive-trust theory. Constructive trust can be relevant to § 853(n)(6)(A), but it requires applicable state-law elements and tracing; it is not established by labeling reserves as trust property.', 'Restitution, ancillary adjudication, remission, Rule 41(g), and equitable relief have different legal standards. Pleading them in the alternative preserves arguments but does not merge the procedures.', 'Page 10 requests return and reserves fees. There is no signed order, entitlement determination, or public Exhibit A/B claimant list in this ten-page copy.'],
      caseConnections: ['This filing follows Docs 506 and 612 and should be compared with Doc 763\'s later 6,512 sealed-submission notice.', 'Doc 858 later fixed the $889 million money judgment, found restitution impracticable, authorized remission, and reserved third-party merits for § 853(n); those court rulings control over this petition\'s requested framework.'],
      whyItMatters: ['It is the clearest public statement of the April 7 collective petition and constructive-trust theory.', 'It supplies the 6,575 and 3,539 figures with their stated date and methodology while showing why they cannot be equated with successful claims.'],
      verificationTasks: ['Identify the official docket number and obtain the docket entry and any order addressing the petition.', 'Confirm whether sealed Exhibits A and B were accepted, rejected, superseded, or later reorganized into the 6,512 submission described in Doc 763.', 'Analyze constructive-trust and tracing evidence claimant by claimant or by legally valid property class.'],
      riskFlags: ['Do not identify this as ECF 643 without official docket proof.', 'The 6,575 total, 3,539 authenticated subset, and 117 withdrawals are counsel\'s dated representations, not court-certified results.', 'The public Exhibit A/B files are only under-seal cover pages; sealed claimant contents must not be inferred or disclosed.'],
      findings: [finding('summary', 'Counsel submitted a combined petition described as covering 6,575 represented HEX members.', [1, 2, 4, 5]), finding('legalReading', 'The petition pleads restitution, § 853(n), remission, and constructive trust in the alternative; each requires separate legal analysis.', [6, 7, 8, 9]), finding('riskFlags', 'The public copy has no official ECF number or order accepting 6,575 valid claims.', [1, 10])],
    },
    zh: {
      summary: 'Final-motion.pdf 是 2025 年 4 月 7 日的 10 页合并申请，称代表 6,575 名 Himalaya Exchange 成员，并通过 restitution、§ 853(n) 附属申请和/或 DOJ remission 请求返还。文件称其中 3,539 名此前已认证，约 117 名前客户已从总数中移除，并提出 constructive trust 理论和律师费保留。公开文件名不能证明正式 ECF 编号，这份申请本身也不能证明 6,575 份有效申请已被接受，或任何申请人拥有优先权利。',
      plainEnglish: '这份文件同时敲了几扇法律大门：法院赔偿、法院对特定财产所有权的程序，以及 DOJ 行政补偿。几扇门并不使用同一把钥匙；法官或 DOJ 仍要判断哪条路线适用，以及每项申请是否符合门槛。',
      legalReading: ['第 1-2 页把文件定义为合并申请，并引用 Docs 612、514；所称 6,575 名成员只通过被引用的密封附件识别。', '第 4-6 页区分 6,575 名受代理客户和 3,539 份此前认证记录，并描述密封 HID 表格；这些属于律师记录和方法。', '第 6-9 页引用多项法律并提出 constructive trust 理论。该理论可能与 § 853(n)(6)(A) 有关，但需要满足适用州法要件和资金追踪，不能仅因把储备称作信托财产就成立。', 'restitution、附属裁判、remission、Rule 41(g) 和衡平救济标准不同；替代提出可以保留论点，但不会把程序合并。', '第 10 页请求返还并保留费用；公开 10 页副本中没有签署命令、权利裁判或公开 Exhibit A/B 申请人清单。'],
      caseConnections: ['本文件承接 Docs 506、612，应与 Doc 763 后来描述的 6,512 项密封提交对照。', 'Doc 858 后来把金钱判决定为 8.89 亿美元，认定赔偿不切实际，授权 remission，并把第三方实体问题留给 § 853(n)；这些法院裁定优先于本申请提出的框架。'],
      whyItMatters: ['它是 4 月 7 日集体申请和 constructive trust 理论最清晰的公开陈述。', '它为 6,575 和 3,539 两个数字提供日期与方法，也说明不能把它们等同于胜诉申请数。'],
      verificationTasks: ['确认正式案卷编号，并取得案卷条目和处理该申请的命令。', '确认密封 Exhibits A、B 是被接受、拒绝、取代，还是后来整理为 Doc 763 所称 6,512 项提交。', '按申请人或法律上有效的财产类别分析 constructive trust 和资金追踪证据。'],
      riskFlags: ['没有正式案卷证据时，不得把它标记为 ECF 643。', '6,575 总数、3,539 认证子集和 117 退出者均是律师在特定日期的陈述，不是法院认证结果。', '公开 Exhibit A/B 仅为 UNDER SEAL 封面，不能推断或披露密封申请内容。'],
      findings: [finding('summary', '律师提交一份称覆盖 6,575 名受代理 HEX 成员的合并申请。', [1, 2, 4, 5]), finding('legalReading', '申请替代提出 restitution、§ 853(n)、remission 和 constructive trust，每一项都需单独法律分析。', [6, 7, 8, 9]), finding('riskFlags', '公开副本没有正式 ECF 编号，也没有法院接受 6,575 项有效申请的命令。', [1, 10])],
    },
  }),
  'sdny-23-cr-118:763': report({
    caseId: 'sdny-23-cr-118',
    sha256: '8683e8372743aa1f6056bb7ff6e56766aa697a82808472e8838f2604a8698bb9',
    posture: 'third_party_claim_notice',
    researchQuality: 'body_verified',
    en: {
      summary: 'This five-page October 23, 2025 filing gives notice of a sealed collective submission for 6,512 purportedly authenticated Himalaya Exchange members seeking return of seized funds. Counsel asks the court to accept the collective filing under the August 11, 2025 preliminary forfeiture order and explains that the claimed materials include identity and financial information. The filing is counsel\'s notice and procedural request, not a judicial finding that 6,512 claims were validly filed, timely, individually authenticated, or legally entitled to particular property.',
      plainEnglish: 'A lawyer says he submitted a large group of sealed claims for people who want their money back. The court still has to decide whether the group filing is acceptable, whether each person has a legally recognized interest in specific property, and what remedy is available. The number 6,512 should therefore be displayed as a filing-side representation, not as a court-certified claimant count.',
      legalReading: [
        'Pages 1-2 identify the filing as a motion under seal and state that counsel submitted applications for 6,512 Himalaya Exchange members under the August 11 preliminary forfeiture order. The filing does not include the sealed applications themselves.',
        'Page 2 reports counsel\'s authentication and account-category figures, including HCN, HDO, deposits, and redemptions. Those figures are representations by counsel and the referenced records, not findings in this five-page notice.',
        'Pages 3-4 explain why personally identifying and financial information was submitted under seal and describe claimed ECF/PACER submission difficulties. These statements explain the requested filing procedure; they do not establish that the Clerk accepted every submission or that any claimant prevailed.',
        'Page 5 contains the certificate of service. It does not contain an order accepting the collective filing or an ancillary ruling on ownership, standing, tracing, or remission.',
      ],
      caseConnections: [
        'Read with Doc 720 for the preliminary forfeiture and ancillary-claim framework, Doc 785 for the government\'s later classification of third-party submissions, and Doc 858 for the court\'s decision to reserve § 853(n) merits while authorizing remission.',
        'Do not merge this filing with Doc 765. The local Doc 765 PDF has a conflicting mirror title and its body is a different pro se Second Circuit filing with attached motions; it does not independently verify the 6,512 figure.',
      ],
      whyItMatters: [
        'It is the clearest local notice of the proposed collective approach to a very large number of sealed third-party submissions.',
        'It shows why claimant counts, sealed records, source authentication, and individual property tracing must remain separate data fields in the application.',
      ],
      verificationTasks: [
        'Obtain the official PACER/RECAP docket entry, the signed or entered order on accepting the sealed collective filing, and any later list or administrator protocol.',
        'Determine whether the 6,512 figure was updated, reduced, duplicated, or divided into separate claimant groups, and distinguish a filed submission from a valid § 853(n) claim.',
        'Reconcile the stated HCN/HDO, deposit, and redemption figures with the underlying authenticated records without treating them as recoveries or court-approved amounts.',
      ],
      riskFlags: [
        'The 6,512 count is counsel\'s representation in a notice, not a judicial finding or a completed entitlement determination.',
        'The applications and KYC material are sealed or referenced but not included in this public five-page PDF; do not infer their contents.',
        'The local copy is an NFSC backup mirror. The source body is complete, but the operative acceptance order and sealed exhibits require official docket verification.',
      ],
      findings: [
        finding('summary', 'Counsel gives notice of a sealed collective submission described as covering 6,512 Himalaya Exchange members seeking return of seized funds.', [1, 2]),
        finding('legalReading', 'The filing asks the court to accept the collective procedure and incorporates prior materials; it does not itself adjudicate any claimant\'s right to specific property.', [1, 3, 4]),
        finding('riskFlags', 'The claimant count and account figures are filing-side representations and the underlying applications are not present in the public copy.', [2, 3]),
      ],
    },
    zh: {
      summary: '这份 5 页的 2025 年 10 月 23 日文件通知法院：有人以密封方式提交了一组据称经过认证的 6,512 名 Himalaya Exchange 成员申请，请求返还被查扣资金。律师请求法院依据 2025 年 8 月 11 日初步没收令接受这种集体提交，并说明材料含有身份和财务信息。该文件是律师的通知和程序请求，不是法院认定 6,512 项申请均有效、及时、逐一认证，也不是法院认定申请人已经对特定财产享有法律权利。',
      plainEnglish: '一名律师表示，他为一大批希望取回资金的人提交了密封申请。法院仍需决定这种集体提交能否接受、每个人是否对特定财产拥有受法律承认的利益，以及应当适用何种救济。因此，界面应把 6,512 显示为文件方陈述的数量，而不是法院认证的申请人数量。',
      legalReading: [
        '第 1-2 页把文件定义为密封提交动议，并称律师依据 8 月 11 日初步没收令为 6,512 名 Himalaya Exchange 成员提交申请；这份 5 页文件本身没有包含密封申请。',
        '第 2 页报告律师所称的认证情况和 HCN、HDO、存款、赎回等账户类别金额。这些是律师及其引用记录的陈述，不是这份通知中的法院认定。',
        '第 3-4 页说明因个人身份和财务信息而请求密封，并描述 ECF/PACER 提交困难。这些内容解释程序请求，不证明书记官已经接受每份材料，也不证明任何申请人已经胜诉。',
        '第 5 页是送达证明，没有法院接受集体提交的命令，也没有对所有权、standing、资金追踪或 remission 作附属裁判。',
      ],
      caseConnections: [
        '应与 Doc 720 的初步没收和附属申请框架、Doc 785 对第三方材料的分类，以及 Doc 858 保留 § 853(n) 实体问题并授权 remission 的裁定一起阅读。',
        '不要把本文件与 Doc 765 合并。当前本地 Doc 765 PDF 的镜像标题与正文冲突，正文是另一份提交给第二巡回法院的 pro se 文件及附件，不能独立证明 6,512 这一数字。',
      ],
      whyItMatters: [
        '它是当前本地材料中对大规模密封第三方提交集体处理方式最清晰的通知。',
        '它说明应用程序必须把申请数量、密封状态、来源认证和逐项财产追踪设置为不同字段。',
      ],
      verificationTasks: [
        '取得 PACER/RECAP 正式案卷条目、关于接受密封集体提交的签署或登记命令，以及后续清单或管理人处理规则。',
        '确认 6,512 是否后来更新、减少、重复或分拆成多个申请组，并区分“提交材料”和有效 § 853(n) 申请。',
        '把 HCN/HDO、存款和赎回数字与经过认证的底层记录核对，不要把它们直接写成已追回金额或法院批准金额。',
      ],
      riskFlags: [
        '6,512 是通知中的律师陈述，不是法院认定，也不是完成权利判断后的数量。',
        '申请和 KYC 材料被密封或仅被引用，公开 5 页副本没有包含其内容，不得推测。',
        '本地副本来自 NFSC 备用镜像；正文提取完整，但接受命令和密封附件仍需正式案卷核验。',
      ],
      findings: [
        finding('summary', '律师通知称已提交一组密封材料，涉及 6,512 名 Himalaya Exchange 成员并请求返还被查扣资金。', [1, 2]),
        finding('legalReading', '文件请求法院接受集体程序并引用既有材料，但没有裁判任何申请人对特定财产的权利。', [1, 3, 4]),
        finding('riskFlags', '申请数量和账户数字属于文件方陈述，底层申请不在公开副本中。', [2, 3]),
      ],
    },
  }),
  'sdny-23-cr-118:765': report({
    caseId: 'sdny-23-cr-118',
    sha256: 'f172304a2be7c8b0f4e34e43625576ed7f75555de10c0b2f6b67d38293bea0f8',
    posture: 'source_metadata_conflict',
    researchQuality: 'body_verified',
    en: {
      summary: 'The local manifest and NFSC mirror title describe this as an October 29, 2025 motion about 6,512 Himalaya Exchange claims, but the 27-page PDF body is materially different. The body begins as a Second Circuit pro se mandamus petition by Ranyue Bai in Case No. 25-2726 and includes attached district-court motions, an email, service material, and a mailing receipt. It does not substantiate the mirror title\'s 6,512-claim description. This source-content conflict must be preserved until the official SDNY and Second Circuit docket records identify exactly what Document 765 contains.',
      plainEnglish: 'The label and the document do not match. The label says “6,512 claims,” but the pages actually show an appeal-related mandamus petition and attachments by Ranyue Bai. The program must show both facts, mark the file as needing official verification, and prevent the file from being used as evidence for the 6,512 claimant count.',
      legalReading: [
        'PDF pages 1-6 present a petition for a writ of mandamus in Second Circuit Case No. 25-2726. The petitioner asks the appellate court to docket certain filings, stop alleged suppression of victim filings, and address a Rule 60 request.',
        'PDF pages 7-12 contain an attached motion opposing SDNY filing activity and requesting a stay, recusal discussion, and a neutral receiver or master. The motion makes allegations of prosecutorial misconduct, court fraud, and coordination; those are the filer\'s assertions, not findings.',
        'PDF pages 13-24 contain another attached emergency motion and related declarations. The attachments repeatedly characterize events as systemic fraud or suppression, but the document itself contains no judicial ruling adopting those characterizations.',
        'PDF pages 25-27 show an email and certificate or mailing material. They may prove an attempted submission or service as a document matter, but they do not prove that a court docketed, accepted, or granted the requested relief.',
        'The PDF contains inconsistent internal case labels and noisy OCR, including both Second Circuit docket references and SDNY Document 765 headers. Until the official docket entry is obtained, the file should be classified as a source-content conflict rather than a clean SDNY merits filing.',
      ],
      caseConnections: [
        'Compare the appellate portion with the Second Circuit docket for Case No. 25-2726 and with any disposition such as Doc 868 or a separate appellate order; do not treat this mirror copy as the appellate docket itself.',
        'Keep the 6,512-claim line anchored to Doc 763 and any official acceptance or ancillary orders. This file cannot be used to corroborate that number.',
        'Read the attached forfeiture and Rule 60 arguments alongside Docs 720, 750, 754, 858, and the later ancillary record, while keeping the filer\'s accusations separate from court-confirmed events.',
      ],
      whyItMatters: [
        'It exposes a concrete metadata-integrity problem in a backup source: a plausible title can point to the wrong substantive document.',
        'It demonstrates why the library needs a content-versus-metadata conflict flag and why NFSC cannot be treated as the primary docket authority.',
      ],
      verificationTasks: [
        'Retrieve the official SDNY docket entry 765 and the Second Circuit Case No. 25-2726 docket entry 5.1, then compare page counts, captions, filing dates, and hashes where available.',
        'Determine whether the NFSC file is an attachment bundle, a mislabelled appellate filing, or a composite assembled from separate records; retain the original PDF and do not silently rename its legal identity.',
        'Locate a signed order or mandate addressing the requests in the attached motions. Filing, service, and delivery evidence are not equivalent to docket acceptance or relief granted.',
      ],
      riskFlags: [
        'The mirror title says 6,512 claims, but the PDF body does not match that description; do not display it as evidence of 6,512 claims.',
        'The attached allegations of fraud, suppression, coercion, bias, or coordination are party allegations and must not be written as established facts.',
        'The PDF is a 27-page NFSC backup copy with noisy OCR and mixed docket labels. The file is body-complete for extraction but not authenticated as the official docket record.',
      ],
      findings: [
        finding('summary', 'The body of the local 27-page PDF is a Ranyue Bai Second Circuit mandamus petition with attachments, not a clean 6,512-claim notice.', [1, 2, 7, 13]),
        finding('legalReading', 'The filer requests docketing, review, and corrective relief, but the document contains no court order granting those requests.', [2, 5, 6, 12, 24]),
        finding('riskFlags', 'The mirror metadata and substantive PDF conflict, requiring official SDNY and Second Circuit verification before substantive reliance.', [1, 2, 25, 26]),
      ],
    },
    zh: {
      summary: '当前 manifest 和 NFSC 镜像标题把这份文件描述为 2025 年 10 月 29 日关于 6,512 名 Himalaya Exchange 申请的动议，但 27 页 PDF 正文明显不同。正文开头是一份 Ranyue Bai 以个人身份向第二巡回法院提交的 mandamus 申请，案号为 25-2726，后面包含地区法院动议、电子邮件、送达材料和邮寄凭证。正文没有证明镜像标题所说的 6,512 项申请。必须在取得 SDNY 和第二巡回法院正式案卷、确认 Doc 765 的真实内容前，保留这种“来源内容冲突”状态。',
      plainEnglish: '文件标签和正文对不上。标签说是“6,512 项申请”，但页面实际显示的是 Ranyue Bai 的上诉相关 mandamus 申请及附件。程序必须同时显示这两个事实，标记需要正式核验，并阻止把这份文件作为 6,512 名申请人的证据。',
      legalReading: [
        'PDF 第 1-6 页呈现第二巡回法院 25-2726 案的 mandamus 申请。申请人要求上诉法院要求地区法院登记若干文件、停止所谓压制受害人提交，以及处理 Rule 60 请求。',
        'PDF 第 7-12 页是所附反对 SDNY 文件处理的动议，请求暂停、讨论回避，并任命中立 receiver 或 master。文件关于检方不当行为、法院欺诈和协调的内容是提交人的主张，不是法院认定。',
        'PDF 第 13-24 页包含另一份紧急动议及相关声明。附件多次把事件称为系统性欺诈或压制，但文件本身没有法院采纳这些表述的裁定。',
        'PDF 第 25-27 页是电子邮件及送达或邮寄材料。它们可以证明文件层面的提交或送达尝试，但不能证明法院已经登记、接受或批准请求。',
        'PDF 含有不一致的内部案号和 OCR 噪音，同时出现第二巡回案号和 SDNY Doc 765 页眉。在取得正式案卷前，应把它分类为来源内容冲突，而不是干净的 SDNY 实体文件。',
      ],
      caseConnections: [
        '把上诉部分与第二巡回 25-2726 案卷及任何后续处分（包括 Doc 868 或其他上诉命令）对照；不能把镜像副本本身当成上诉案卷。',
        '6,512 申请线索应锚定 Doc 763 及任何正式接受命令或附属裁定，本文件不能用于交叉证明该数量。',
        '把所附没收和 Rule 60 论证与 Docs 720、750、754、858 及后续附属案卷对照，同时把提交人的指控与法院确认事实分开。',
      ],
      whyItMatters: [
        '它暴露了备用来源中的具体元数据完整性问题：看似合理的标题可能对应错误的实体文件。',
        '它说明文件库需要“正文与元数据冲突”标记，也说明 NFSC 不能作为主要案卷权威。',
      ],
      verificationTasks: [
        '取得 SDNY Doc 765 正式案卷和第二巡回 25-2726 案卷第 5.1 项，对比页数、案名、提交日期和可用哈希。',
        '确认 NFSC 文件究竟是附件包、误标的上诉文件，还是由多个记录拼成的合并文件；保留原 PDF，不要静默改写其法律身份。',
        '寻找对附件动议请求作出处理的签署命令或 mandate。提交、送达和投递凭证不等于案卷接受或救济获准。',
      ],
      riskFlags: [
        '镜像标题写的是 6,512 项申请，但 PDF 正文不符合该描述；不得把它显示为 6,512 申请的证据。',
        '附件中的欺诈、压制、胁迫、偏见或协调指控属于提交人主张，不得写成已证实事实。',
        '这是 27 页 NFSC 备用副本，OCR 有噪音且混合多个案号；正文提取完整，但尚未认证为正式案卷记录。',
      ],
      findings: [
        finding('summary', '本地 27 页 PDF 正文是 Ranyue Bai 的第二巡回 mandamus 申请及附件，不是干净的 6,512 项申请通知。', [1, 2, 7, 13]),
        finding('legalReading', '提交人请求登记、审查和纠正性救济，但文件中没有法院批准这些请求的命令。', [2, 5, 6, 12, 24]),
        finding('riskFlags', '镜像元数据与 PDF 正文冲突，在实体使用前必须核验 SDNY 和第二巡回正式案卷。', [1, 2, 25, 26]),
      ],
    },
  }),
  'sdny-23-cr-118:820': report({
    caseId: 'sdny-23-cr-118',
    sha256: '42a6385fb517c8e259722669549fce7adfbbc9f9767dac3338e0b8ff32ea9e63',
    posture: 'court_order_procedural',
    researchQuality: 'body_verified',
    en: {
      summary: 'This one-page March 17, 2026 court order states that the court was still considering appointing a special master for § 853(n) ancillary claims and related matters, and invited the parties to propose candidates by March 30. It is a procedural case-management order, not an appointment order and not a ruling on any claimant\'s standing, tracing, ownership, or entitlement.',
      plainEnglish: 'The judge was considering using a special master to help organize or evaluate third-party forfeiture claims. At this stage no person had been appointed, and the order did not decide whether any claimant owned any asset. It only opened a process for suggesting candidates.',
      legalReading: [
        'The order expressly says the court “continues to consider” appointment. That wording records an unresolved administrative decision rather than a completed appointment.',
        'The requested candidate proposals concern § 853(n) claims and related matters. The order does not define the special master\'s powers, compensation, standard of review, or whether the role would be screening, recommendation, or adjudicative assistance.',
        'The March 30 deadline is a procedural deadline for candidate suggestions. It is not a deadline for proving any third-party claim and does not itself resolve the restitution/remission question.',
      ],
      caseConnections: [
        'Read with Doc 802, which proposed using a Magistrate Judge because funds for a special master were unavailable, and Doc 785, which proposed special-master screening and remission.',
        'Compare later orders, including Doc 855, Doc 858, and Doc 866, to determine whether appointment occurred, how petitions were handled, and whether unsealing changed access without making claims public.',
      ],
      whyItMatters: [
        'It marks the point at which the court was designing the administrative structure for a potentially large ancillary-claims process.',
        'It prevents the application from falsely showing that a special master had already been appointed or that the office had decided claims.',
      ],
      verificationTasks: [
        'Locate any appointment order, candidate submissions, compensation order, referral order, or later docket instruction.',
        'Record the exact scope of any appointed officer and distinguish recommendation, screening, and judicial adjudication.',
      ],
      riskFlags: [
        'This is a procedural court order, but it does not decide any property claim.',
        'The local copy is an NFSC backup mirror; the one-page text is complete, but the official docket copy remains preferable.',
      ],
      findings: [
        finding('summary', 'The court continued considering a special master and invited candidate suggestions by March 30, 2026.', [1]),
        finding('legalReading', 'The order did not appoint a special master or decide the scope of any eventual role.', [1]),
      ],
    },
    zh: {
      summary: '这份 2026 年 3 月 17 日的一页法院命令写明，法院仍在考虑为 § 853(n) 附属申请及相关事项任命 special master，并要求当事方在 3 月 30 日前提出候选人。这是程序管理命令，不是任命命令，也没有裁判任何申请人的 standing、资金追踪、所有权或取得财产的权利。',
      plainEnglish: '法官当时在考虑是否用 special master 协助整理或评估第三方没收申请。此时还没有显示任何人已经被任命，也没有决定任何申请人是否拥有任何资产；命令只是开启候选人建议程序。',
      legalReading: [
        '命令明确使用“仍在考虑任命”的表述，记录的是尚未解决的行政安排，不是已经完成的任命。',
        '候选人建议涉及 § 853(n) 申请及相关事项，但命令没有规定 special master 的权限、报酬、审查标准，也没有说明其角色是筛选、建议还是协助裁判。',
        '3 月 30 日是提交候选人建议的程序期限，不是证明第三方权利的期限，也没有自行解决赔偿或 remission 问题。',
      ],
      caseConnections: [
        '应与 Doc 802 一起阅读：该联合函提到因没有资金支付 special master，考虑改由 Magistrate Judge 处理；也应与 Doc 785 对 special-master 筛选和 remission 的建议对照。',
        '对照 Docs 855、858、866 等后续命令，确认是否任命、申请如何处理，以及有限解封是否只是增加检方访问而非公开申请。',
      ],
      whyItMatters: [
        '它标志着法院开始设计可能涉及大量附属申请的行政处理结构。',
        '它防止程序把 special master 显示成已经任命，或把该机构显示成已经作出申请裁判。',
      ],
      verificationTasks: ['寻找任命命令、候选人提交、报酬命令、移交命令或后续案卷指示。', '记录任何被任命人员的准确权限，区分建议、筛选和法院实体裁判。'],
      riskFlags: ['这是程序性法院命令，但没有裁判任何财产权利。', '本地副本来自 NFSC 备用镜像；一页正文提取完整，但正式案卷副本优先。'],
      findings: [finding('summary', '法院继续考虑任命 special master，并要求 2026 年 3 月 30 日前提出候选人。', [1]), finding('legalReading', '命令没有任命 special master，也没有决定其未来权限范围。', [1])],
    },
  }),
  'sdny-23-cr-118:823': report({
    caseId: 'sdny-23-cr-118',
    sha256: 'd15d7b550d4492ac22aaa6863462728dafef8885c67cffb435907c0d85daedad',
    posture: 'court_order_rule_17c',
    researchQuality: 'body_verified',
    en: {
      summary: 'This three-page March 23, 2026 court order denied the government\'s motion to quash because the government did not establish a legitimate interest of its own, and granted Guo\'s Rule 17(c) subpoena application with limits. The court found the requested material potentially relevant to mitigation and history-and-characteristics arguments, not otherwise reasonably procurable from a purported former attorney, sufficiently specific, and not a fishing expedition. The order controlled timing to avoid delay and did not decide the ultimate weight, admissibility, or truth of the subpoenaed material.',
      plainEnglish: 'The judge allowed a narrower subpoena for documents from a former attorney. This did not mean the documents would prove Guo\'s mitigation story or automatically be admitted. It meant the request met the subpoena standard closely enough to proceed, subject to a defined scope and fast deadlines.',
      legalReading: [
        'Pages 1-2 explain the procedural history: the initial application was ex parte, the court later required disclosure to the government, and the government moved to quash based on Rule 17(c) and delay concerns.',
        'Page 1 denies the government\'s motion on the stated ground that it did not identify a legitimate interest of its own in the subpoena. This is a ruling on the government\'s standing to quash in this posture, not a declaration that every requested record was relevant or admissible.',
        'Page 2 applies the Nixon criteria: evidentiary relevance, reasonable unavailability, need for preparation, good faith, specificity, and no fishing expedition. The court found the narrowed application satisfied those requirements for mitigation-related materials.',
        'Page 2 limits the subpoena to documents mentioned on page 5 of the January 27 letter or documents reflecting information mentioned there. It sets a March 30 return date, an April 3 defense supplement, and an April 7 government response.',
        'Page 3 terminates the related motions. The order does not report what documents were produced, whether privilege disputes remained, or whether the materials changed the later sentencing result.',
      ],
      caseConnections: [
        'Read with Docs 815, 816, 819, 821, and 814 to follow the request from sealed application through disclosure, opposition, narrowed grant, and expedited deadlines.',
        'Compare with Doc 864: a subpoena ruling is not a sentencing finding. The later sentencing record controls what, if anything, the court relied on and how it resolved mitigation and Fatico issues.',
      ],
      whyItMatters: [
        'It is a concrete court ruling on the defense\'s ability to obtain targeted sentencing material from a former attorney.',
        'It shows the distinction between permission to seek evidence and a later finding that the evidence is true, admissible, or outcome-determinative.',
      ],
      verificationTasks: [
        'Locate the issued subpoena, production, privilege objections, and any supplemental sentencing filing tied to the April deadlines.',
        'Compare the produced material with Doc 864 and any appellate briefing; do not assume the grant changed the sentence.',
      ],
      riskFlags: [
        'The order grants a limited subpoena, not the defense\'s factual narrative or requested mitigation.',
        'The local copy is an NFSC backup mirror; the three-page text is complete, but official docket authentication remains required.',
      ],
      findings: [
        finding('summary', 'The court denied the government\'s motion to quash and granted a limited Rule 17(c) subpoena application.', [1, 2]),
        finding('legalReading', 'The court found the narrowed request relevant, specific, reasonably unavailable, and not a fishing expedition under the cited Nixon standard.', [2]),
        finding('riskFlags', 'Permission to subpoena does not establish the truth, admissibility, or sentencing effect of the material sought.', [2, 3]),
      ],
    },
    zh: {
      summary: '这份 2026 年 3 月 23 日的 3 页法院命令，以检方没有证明自己对传票拥有合法利益为理由，驳回检方撤销动议，并有限度批准郭依据 Rule 17(c) 向一名前任律师调取文件的申请。法院认为材料可能与减轻处罚及 § 3553(a) 的个人经历和特征有关，且不能合理地从所谓前任律师处通过其他方式取得，申请具有足够具体性，不是 fishing expedition。命令同时设置快速期限以防止拖延，但没有裁判材料最终的证明力、可采性或真实性。',
      plainEnglish: '法官允许辩方以更窄范围向前任律师调取文件。这不等于文件会证明郭的减刑论点，也不等于文件会自动被法庭采纳；它只表示在限定范围和快速期限下，申请达到了 Rule 17(c) 的门槛。',
      legalReading: [
        '第 1-2 页说明程序经过：申请最初以 ex parte 方式提出，法院后来要求向检方披露，检方以 Rule 17(c) 和拖延为由请求撤销。',
        '第 1 页以检方没有说明其自身对传票拥有合法利益为理由驳回检方动议。这是对检方在该程序姿态下撤销资格的裁判，不表示每一项文件都与案件相关或可采。',
        '第 2 页适用 Nixon 标准：证据相关性、合理不可提前取得、为准备案件的必要性、善意、具体性以及不是 fishing expedition。法院认为缩小后的申请对减轻处罚材料符合这些要求。',
        '第 2 页把传票限制在 1 月 27 日信件第 5 页提及的文件或反映该页所述信息的文件，并设定 3 月 30 日回传、4 月 3 日辩方补充和 4 月 7 日检方回应期限。',
        '第 3 页终止相关动议，但没有说明文件是否产生、是否有特权争议，或材料是否改变后续量刑结果。',
      ],
      caseConnections: [
        '与 Docs 815、816、819、821、814 对照，追踪申请如何从密封状态经过披露、检方反对、有限批准进入快速处理。',
        '与 Doc 864 对照：传票命令不是量刑认定，后来的量刑记录才决定法院是否使用材料及如何处理减轻处罚和 Fatico 问题。',
      ],
      whyItMatters: ['它是法院允许辩方从前任律师处取得定向量刑材料的具体裁定。', '它清楚区分“允许寻求证据”和“认定证据真实、可采或决定结果”。'],
      verificationTasks: ['寻找已经签发的传票、文件交付、特权异议及与 4 月期限相关的补充量刑文件。', '把交付材料与 Doc 864 和上诉书状对照，不要假定传票批准改变了刑期。'],
      riskFlags: ['命令批准的是有限传票，不是辩方事实叙事或减刑请求。', '本地副本来自 NFSC 备用镜像；3 页正文提取完整，但仍需正式案卷认证。'],
      findings: [finding('summary', '法院驳回检方撤销动议，并有限度批准 Rule 17(c) 传票申请。', [1, 2]), finding('legalReading', '法院认定缩小后的请求具有相关性、具体性、合理不可替代性，且不是 Nixon 标准下的 fishing expedition。', [2]), finding('riskFlags', '允许调取文件不等于认定文件内容真实、可采或会影响量刑。', [2, 3])],
    },
  }),
  'sdny-23-cr-118:866': report({
    caseId: 'sdny-23-cr-118',
    sha256: '93f4ab45630139177a0069a62685cfcbb331410c35f4e75b721cfde7c493027d',
    posture: 'court_order_limited_unsealing',
    researchQuality: 'body_verified',
    en: {
      summary: 'This one-page July 30, 2026 unsealing order allows limited unsealing of § 853 ancillary petitions submitted in response to docket entries 488 and 720, but only so the government can obtain unredacted versions from the Clerk. It is not a public release order, does not disclose the petition contents, and does not decide any petitioner\'s standing, ownership, or remedy.',
      plainEnglish: 'The judge opened the sealed petitions only enough for the government to get unredacted copies. The public did not thereby receive the petitions, and no claimant won or lost an ownership case through this order. It is an access-management order, not a merits ruling.',
      legalReading: [
        'The order identifies the relevant documents as ancillary petitions under 21 U.S.C. § 853 responding to preliminary forfeiture orders at docket entries 488 and 720.',
        'The operative language limits unsealing to the extent necessary for the government to obtain unredacted versions from the Clerk. The limitation matters: it does not say the petitions are unsealed for general public access.',
        'The order contains no findings about the number, validity, timeliness, or merits of the petitions and no ruling on whether any claimant has a superior interest.',
      ],
      caseConnections: [
        'Read with Doc 785 on the government\'s proposed screening and remission structure, Doc 820 on possible special-master administration, and Doc 841 as an example of a specific third-party petition.',
        'Read with Doc 868 to distinguish later appellate treatment of mandamus requests from this district-court access order. Limited unsealing is not a ruling on the underlying petitions.',
      ],
      whyItMatters: [
        'It marks a change in government access to sealed ancillary materials without changing their public availability.',
        'It prevents the application from incorrectly showing that all third-party petitions became public or were adjudicated on July 30.',
      ],
      verificationTasks: [
        'Track which petitions were provided to the government, any protective-order or confidentiality conditions, and any later public redactions or merits orders.',
        'Keep the access state of each petition separate from its filing, standing, adjudication, and remission status.',
      ],
      riskFlags: ['This order does not make the petitions generally public and does not decide their merits.', 'The local copy is an NFSC backup mirror; the one-page text is complete, but official docket authentication is still preferred.'],
      findings: [finding('summary', 'The court authorized limited unsealing solely to let the government obtain unredacted ancillary petitions from the Clerk.', [1]), finding('legalReading', 'The order does not publicly release the petitions or adjudicate any claimant\'s property right.', [1])],
    },
    zh: {
      summary: '这份 2026 年 7 月 30 日的一页解封命令，允许对回应案卷第 488 和 720 项初步没收令的 § 853 附属申请进行有限解封，但目的仅是让检方从书记官处取得未删节副本。它不是向公众公开文件的命令，没有披露申请内容，也没有裁判任何申请人的 standing、所有权或救济。',
      plainEnglish: '法官只把密封申请开放到足以让检方取得未删节副本的程度。公众并没有因此获得这些申请，也没有任何申请人因为这份命令在所有权问题上胜诉或败诉。这是访问管理命令，不是实体裁判。',
      legalReading: ['命令把相关文件确定为依据 21 U.S.C. § 853、回应案卷第 488 和 720 项初步没收令提交的附属申请。', '操作性措辞把解封限制在检方从书记官处取得未删节副本所必要的范围；这不等于为公众普遍开放。', '命令没有认定申请数量、有效性、及时性或实体，也没有裁判任何申请人是否拥有优先权利。'],
      caseConnections: ['与 Doc 785 的筛选和 remission 建议、Doc 820 的 special master 行政安排以及 Doc 841 的具体第三方申请对照。', '与 Doc 868 对照，区分第二巡回对 mandamus 请求的后续处理；有限解封不是对申请实体问题的裁判。'],
      whyItMatters: ['它标志着检方对密封附属材料的访问发生变化，但没有改变公众可见性。', '它防止程序错误显示所有第三方申请已在 7 月 30 日公开或已完成实体裁判。'],
      verificationTasks: ['追踪哪些申请提供给检方、是否有保护令或保密条件，以及后续公开删节版或实体命令。', '把每份申请的访问状态与提交、standing、实体裁判和 remission 状态分开记录。'],
      riskFlags: ['该命令没有把申请普遍公开，也没有裁判申请实体。', '本地副本来自 NFSC 备用镜像；一页正文提取完整，但仍优先使用正式案卷。'],
      findings: [finding('summary', '法院授权有限解封，目的仅是让检方从书记官处取得未删节的附属申请。', [1]), finding('legalReading', '命令没有向公众公开申请，也没有裁判任何申请人的财产权利。', [1])],
    },
  }),
  'sdny-23-cr-118:867': report({
    caseId: 'sdny-23-cr-118',
    sha256: 'f32df3188bbcbae52cccf8e4df36ee9df642a23165495cffdb15e04057e834e5',
    posture: 'third_party_mandamus_petition',
    researchQuality: 'body_verified',
    en: {
      summary: 'This 28-page August 3, 2026 local PDF is a pro se third-party petition for a writ of mandamus directed to the Second Circuit. The petitioner asks for vacatur of the June 29, 2026 conviction, sentencing, and forfeiture orders, an evidentiary hearing concerning the government\'s 225-name victim list, and a stay of forfeiture. The petition alleges foreign-state coercion, identity theft, manipulated victim information, political targeting, and evidentiary contamination. Those allegations are the petitioner\'s litigation position, not findings established by this document. The PDF contains a 28-page file but internally labels the petition and exhibits with inconsistent “Page 1 of 18” style pagination, and OCR is materially noisy in places.',
      plainEnglish: 'A self-represented third-party filer asks the appeals court to stop or undo major parts of the case. The filer says the victim list and property process were affected by coercion and identity problems. The application itself does not prove those claims, does not vacate the judgment, and does not automatically stay forfeiture. The later appellate docket must be checked for the actual disposition.',
      legalReading: [
        'PDF pages 1-2 identify a pro se mandamus submission and request vacatur of the conviction, sentencing, and forfeiture orders, a hearing about the 225-name list, and a stay of forfeiture. These are requested remedies, not relief granted.',
        'PDF pages 3-8 set out the petitioner\'s factual and legal theories, including alleged coercion by Chinese state-security actors, identity theft, political targeting, and contamination of sentencing and forfeiture evidence. The petition cites other dockets and exhibits, but this document alone does not authenticate or prove those underlying assertions.',
        'PDF pages 5-8 invoke Rule 32, Rule 32.2, § 853(n), constitutional provisions, the All Writs Act, and a Senate resolution. A mandamus petition faces an extraordinary-relief standard; citing legal authorities does not show that the standard is met.',
        'PDF pages 9-28 are exhibits and supporting materials, including a personal statement disclaiming victim status and describing alleged data exposure or coercion. The exhibits are statements and attachments, not independent judicial findings; several pages are images or have limited OCR text.',
        'The petition asks the appellate court to vacate criminal judgments and stop forfeiture, but the local PDF contains no order granting a stay or vacatur. Existing Doc 868 research reports a later Second Circuit denial of tandem pro se mandamus petitions, with renewal left without prejudice on specified issues; the official appellate mandate should control the current status.',
      ],
      caseConnections: [
        'Compare the petition\'s victim-list arguments with Doc 833, Doc 864, and any actual Second Circuit briefs or orders. A challenge to the government\'s list is not itself a finding that the list is inaccurate.',
        'Compare its forfeiture arguments with Docs 720, 785, 841, 858, 859, and 866. The petition\'s claim that third-party rights were ignored must be separated from the documented § 853(n) process and later access orders.',
        'Use Doc 868 and the official appellate docket to record disposition, while preserving this PDF as a petitioner-side filing rather than blending it into the court\'s holdings.',
      ],
      whyItMatters: [
        'It captures a late-stage third-party attempt to challenge the victim list, sentencing record, and forfeiture process through extraordinary appellate relief.',
        'It is a high-risk document for neutral presentation because political and foreign-influence allegations can easily be mistaken for court findings if posture labels are weak.',
      ],
      verificationTasks: [
        'Identify the petitioner and exact Second Circuit docket from the official filing record; the local OCR is too noisy to treat the name and internal labels as reliable.',
        'Obtain the appellate docket, motion information statement, any opposition, mandate, stay ruling, and any later renewal so the request and disposition are not conflated.',
        'For each alleged victim-list or identity issue, locate the cited source record and distinguish a filer statement, an agency record, a court finding, and an unresolved allegation.',
      ],
      riskFlags: [
        'All allegations of MSS/CCP coercion, identity theft, falsification, political targeting, bias, or evidentiary contamination are petitioner allegations in this record.',
        'The PDF is a backup mirror and was recovered with local OCR; 28 PDF pages contain inconsistent internal pagination and image-heavy exhibits.',
        'A mandamus petition does not itself vacate a judgment or stay forfeiture. Do not show either remedy as operative without a signed appellate order.',
      ],
      findings: [
        finding('summary', 'A pro se third-party petitioner asks the Second Circuit to vacate the judgment and stay forfeiture while challenging the government\'s 225-name victim list.', [1, 2, 7, 8]),
        finding('legalReading', 'The petition presents extraordinary-relief theories and supporting statements, but it contains no appellate order granting vacatur, a stay, or an evidentiary hearing.', [2, 5, 7, 8]),
        finding('riskFlags', 'The PDF has noisy OCR, mixed internal pagination, and image exhibits; petitioner identity and each factual allegation require official-record verification.', [1, 3, 9, 20, 28]),
      ],
    },
    zh: {
      summary: '这份 28 页的 2026 年 8 月 3 日本地 PDF 是一名 pro se 第三方人士向第二巡回法院提出的 mandamus 申请。申请人请求撤销 2026 年 6 月 29 日的定罪、量刑和没收命令，要求就检方 225 名受害人名单举行证据听证，并请求暂停没收。申请书指称存在外国国家胁迫、身份盗用、受害人信息被操纵、政治针对和证据污染。这些都是申请人的诉讼立场，不是本文件证明的法院认定。PDF 文件有 28 页，但申请书和附件内部出现“第 1 页/共 18 页”等不一致页码，部分 OCR 也有明显噪音。',
      plainEnglish: '一名没有律师代理的第三方提交人请求上诉法院停止或撤销案件的重要部分。提交人说受害人名单和财产程序受到胁迫及身份问题影响，但申请本身不能证明这些主张，也不会自动撤销判决或暂停没收。必须查看后续上诉案卷，确认实际处分。',
      legalReading: [
        'PDF 第 1-2 页确认这是 pro se mandamus 提交，并请求撤销定罪、量刑和没收命令，就 225 人名单举行听证并暂停没收。这些是请求的救济，不是已经获得的救济。',
        'PDF 第 3-8 页提出申请人的事实和法律理论，包括中国国家安全机构胁迫、身份盗用、政治针对以及量刑和没收证据被污染等主张。申请引用其他案号和附件，但本文件本身不能认证或证明这些底层主张。',
        'PDF 第 5-8 页援引 Rule 32、Rule 32.2、§ 853(n)、宪法条款、All Writs Act 和一项参议院决议。Mandamus 属于非常救济，引用法律并不等于满足其严格标准。',
        'PDF 第 9-28 页是附件和支持材料，包括一份否认受害人身份、描述数据暴露或胁迫的个人陈述。附件是陈述和材料，不是独立的法院认定，且部分页面为图片或 OCR 文字有限。',
        '申请请求上诉法院撤销刑事判决并停止没收，但本地 PDF 没有批准暂停或撤销的命令。现有 Doc 868 人工研究记录了第二巡回后来拒绝两份 pro se mandamus 申请，并对特定事项保留无 prejudice 的再次申请空间；当前状态应以正式上诉 mandate 为准。',
      ],
      caseConnections: [
        '把申请人的受害人名单论点与 Docs 833、864 以及正式第二巡回书状或命令对照。挑战名单的文件本身不证明名单不准确。',
        '把没收论点与 Docs 720、785、841、858、859、866 对照。申请人称第三方权利被忽视，必须与已记录的 § 853(n) 程序和后续访问命令分开。',
        '使用 Doc 868 和正式上诉案卷记录处分，同时把本 PDF 保留为申请人一方的提交，不得把它混入法院 holding。',
      ],
      whyItMatters: ['它记录了第三方在案件后期试图通过非常上诉救济挑战受害人名单、量刑记录和没收程序。', '它是中立展示的高风险文件，因为政治和外国影响指控很容易在姿态标签不足时被误写成法院认定。'],
      verificationTasks: ['从正式提交记录确定申请人身份和准确第二巡回案号；本地 OCR 噪音太大，不能把姓名和内部标记当成可靠信息。', '取得上诉案卷、动议信息表、答辩、mandate、暂停裁定和任何后续申请，避免把请求和处分混在一起。', '针对每个受害人名单或身份问题，寻找被引用的原始记录，并区分提交人陈述、机构记录、法院认定和未解决指控。'],
      riskFlags: ['关于 MSS/CCP 胁迫、身份盗用、伪造、政治针对、偏见或证据污染的内容，均是本记录中的申请人主张。', 'PDF 来自备用镜像并由本地 OCR 恢复；28 页中有内部页码不一致和图片附件。', 'Mandamus 申请本身不会撤销判决或暂停没收；没有签署的上诉命令就不得把这些救济显示为已经生效。'],
      findings: [
        finding('summary', '一名 pro se 第三方申请人请求第二巡回撤销判决并暂停没收，同时挑战检方 225 名受害人名单。', [1, 2, 7, 8]),
        finding('legalReading', '申请提出非常救济理论和支持性陈述，但没有上诉法院批准撤销、暂停或证据听证的命令。', [2, 5, 7, 8]),
        finding('riskFlags', 'PDF 存在 OCR 噪音、内部页码混合和图片附件，申请人身份及各项事实主张都需要正式案卷核验。', [1, 3, 9, 20, 28]),
      ],
    },
  }),
}

const caseResearch = {
  'ca2-26-1853': bilingualCase(
    `Core conclusion
- The direct criminal appeal is open in the Second Circuit. The notice of appeal reaches both conviction and sentence, but no merits brief or briefing schedule appears in the public docket reviewed through August 12, 2026. [SDNY Doc 862, p. 1; CA2 docket 26-1853]

Current procedural posture
- After dismissal warnings concerning required forms, counsel filed the appearance form and Form B. Form B states that no additional transcript was being ordered on August 5 because much of the record, including the complete trial transcript, had already been produced and because counsel simultaneously moved to withdraw. [CA2 Entries 12-16; Doc 15, pp. 1-2]
- The public docket reviewed through August 12 shows the withdrawal motion and a later case-manager assignment, but no displayed order granting withdrawal. The identity of continuing or successor merits counsel must therefore remain marked as pending public confirmation. [CA2 Entries 16-17]

What is and is not established
- The appeal itself is established, and its notice covers conviction and sentence. The particular appellate claims, preservation record, standards of review, requested relief, and government responses are not yet established by merits briefs. [SDNY Doc 862, p. 1]
- Form B is a record-management filing. It does not waive the appeal, confirm that every potentially necessary transcript exists, approve counsel's withdrawal, or disclose any merits theory. [CA2 Doc 15, pp. 1-2]

Connection to the district-court record
- The operative judgment records nine convictions, three acquittals, a total 360-month sentence, zero restitution and fine, a $900 assessment, and an $889 million forfeiture money judgment. Those are the current judgment baselines, not predictions about the appeal. [SDNY Doc 860, pp. 1-6]
- The public sentencing transcript preserves court findings and objections but omits sealed internal transcript pages 3-30. Whether and how sealed material enters the appellate record must be tracked from later record filings and orders. [SDNY Doc 864, PDF pp. 2-3, 63-65]

Watch next
- Monitor the ruling on counsel's withdrawal, any substitution or CJA appointment, transcript or record supplementation, a scheduling order, merits briefs, sealed-record handling, oral argument, and disposition.
- Do not describe a likely appellate outcome before the briefs and record identify the actual claims and applicable standards.

Limitations
This neutral procedural analysis uses the public CourtListener/RECAP docket and version-locked filings. A docket page can lag PACER, and absence from the public display is not proof that a sealed or newly filed item does not exist. This is legal information, not legal advice.`,
    `核心结论
- 刑事直接上诉已在第二巡回立案。上诉通知同时覆盖定罪和刑罚，但截至 2026 年 8 月 12 日核验的公开案卷，尚未显示实体上诉书或实体书状排期。[SDNY Doc 862，第 1 页；第二巡回案号 26-1853]

当前程序状态
- 法院曾因必要表格未提交而警告可能驳回上诉；之后律师提交了出庭表和 Form B。Form B 说明，2026 年 8 月 5 日没有新增订购庭审记录，因为大部分记录（包括完整审判记录）已经制作，而且律师同日申请解除代理。[第二巡回 Entries 12-16；Doc 15，第 1-2 页]
- 截至 8 月 12 日核验的公开案卷显示了解除代理动议以及其后的案件管理员分配，但没有显示批准解除代理的命令。因此，后续究竟由原律师还是接任律师负责实体上诉，仍应标记为等待公开确认。[第二巡回 Entries 16-17]

已经确认与尚未确认的事项
- 已确认上诉存在，且通知范围包括定罪和刑罚。具体上诉理由、争点是否保留、审查标准、请求的救济及检方回应，尚未由实体书状确定。[SDNY Doc 862，第 1 页]
- Form B 只是管理上诉案卷的程序文件。它不放弃上诉，不确认所有潜在必要记录都已具备，不批准律师退出，也不披露任何实体上诉理论。[第二巡回 Doc 15，第 1-2 页]

与地区法院案卷的连接
- 当前正式判决基准是九项定罪、三项无罪、总刑期 360 个月、赔偿与罚金均为 0、评估费 900 美元，以及 8.89 亿美元没收金钱判决。这些是现行判决内容，不是对上诉结果的预测。[SDNY Doc 860，第 1-6 页]
- 公开量刑记录保留了法院认定和异议，但省略了已密封的庭审记录内部页码第 3-30 页。密封材料是否及如何进入上诉案卷，必须通过后续案卷文件和命令追踪。[SDNY Doc 864，PDF 第 2-3、63-65 页]

后续观察
- 追踪解除代理动议裁定、律师替换或 CJA 任命、庭审记录或案卷补充、排期命令、双方实体书状、密封材料处理、口头辩论及最终处分。
- 在书状和案卷明确实际争点与审查标准前，不应预测上诉结果。

分析限制
本中立程序分析依据公开 CourtListener/RECAP 案卷及版本锁定文件。公开页面可能滞后于 PACER；公开页面没有显示某项文件，也不能证明密封或刚提交的文件绝对不存在。本内容属于法律信息，不是法律意见。`,
    2,
  ),
  'edny-26-mc-2795': bilingualCase(
    `Core conclusion
- On July 9, 2026, the Eastern District of New York granted Rui Hao's § 1782 application to obtain Ho Wan Kwok's videoconference testimony for a British Virgin Islands trial and directed MDC Brooklyn and the Bureau of Prisons to arrange his appearance on July 22 and 23. [Doc 3, p. 1]

Procedural posture
- The collected record establishes a granted discovery-assistance application. It does not establish whether testimony occurred, whether the order was modified, or how the foreign tribunal treated any resulting evidence. [Doc 3, p. 1]

Court-confirmed material
- The court found the three statutory prerequisites satisfied and stated that it balanced the Intel discretionary factors. The short order does not provide a factor-by-factor explanation. [Doc 3, p. 1]
- The order directed custodial officials to make Kwok available by videoconference; it did not release him, alter the SDNY criminal judgment, or decide the British Virgin Islands merits. [Doc 3, p. 1]

Evidence gaps
- The local corpus lacks the underlying application, supporting declarations, proposed discovery, any opposition, the testimony record, later EDNY compliance filings, and the British Virgin Islands pleadings and rulings.

Watch next
- Locate the complete EDNY application record and foreign docket, then verify whether the scheduled testimony occurred and separate witness statements from later judicial findings.

Limitations
This neutral analysis is limited to the signed one-page order. It is legal information, not legal advice, and it does not infer the content or effect of uncollected testimony.`,
    `核心结论
- 2026 年 7 月 9 日，纽约东区批准 Rui Hao 的 § 1782 申请，允许通过视频会议取得 Ho Wan Kwok 的证言，用于英属维尔京群岛审判，并命令 MDC Brooklyn 和联邦监狱管理局安排其于 7 月 22 日、23 日出庭。[Doc 3，第 1 页]

程序状态
- 已收集记录能证明美国法院批准了境外取证协助，但不能证明证言实际发生、命令是否修改，也不能证明境外法院如何处理任何取得的证据。[Doc 3，第 1 页]

法院已确认材料
- 法院认定三项法定条件成立，并说明已权衡 Intel 酌情因素；简短命令没有逐项解释。[Doc 3，第 1 页]
- 命令要求羁押机关安排视频作证，不是释放令，不改变 SDNY 刑事判决，也不裁判英属维尔京群岛案件实体。[Doc 3，第 1 页]

证据缺口
- 本地资料缺少底层申请、支持声明、拟议取证内容、任何反对文件、证言记录、纽约东区后续履行文件，以及英属维尔京群岛诉状和裁定。

后续观察
- 查找完整纽约东区申请记录和境外案卷，核验证言是否按计划取得，并把证人陈述与后续法院认定分开。

分析限制
本中立分析仅覆盖已签署的一页命令，属于法律信息而非法律意见；不推测尚未收集证言的内容或作用。`,
    1,
  ),
  'sdny-23-cr-118': augmentCriminalCase(bilingualCase(
    `Core conclusion\n- The criminal case reached final judgment on July 2, 2026: nine convictions, three acquittals, a total 360-month sentence, zero restitution and fine, a $900 assessment, and an $889 million forfeiture money judgment. [Doc 860, pp. 1-6]\n\nProcedural posture\n- A notice of appeal covers both conviction and sentence; the merits must be taken from Second Circuit docket 26-1853 and later briefs, not from the notice itself. [Doc 862, p. 1]\n\nCourt-confirmed material\n- The court reduced the proposed forfeiture figure by $411 million to $889 million, denied the bankruptcy-asset seizure motion, reserved third-party ownership claims for § 853(n), and authorized remission because restitution was impracticable. [Doc 858, pp. 9, 17]\n- At sentencing, the court denied a full Fatico hearing, made factual findings by preponderance, found Guidelines loss above $550 million, and imposed a below-Guidelines 360-month total term. [Doc 864, PDF pp. 4-13, 57-60]\n\nContested positions\n- Doc 19 records the government's historical allegations, not findings, and it predates the S3 superseding indictment reflected in the judgment. [Doc 19, pp. 1-12]\n- Sentencing findings use a different standard and purpose from the jury verdict; they must not be restated as additional convictions. [Doc 864, PDF pp. 4, 9]\n\nCross-case connections\n- Criminal forfeiture overlaps factually with SEC/Fair Fund and bankruptcy recovery, but forfeiture, disgorgement, restitution, remission, and estate ownership remain distinct legal tracks. [Doc 858, pp. 9, 17]\n\nEvidence gaps\n- Core criminal PDFs are currently NFSC backup copies rather than PACER or RECAP-authenticated copies. Doc 864 transcript pages 3-30 are sealed and omitted; the cited Doc 864 page numbers above are PDF page numbers.\n\nWatch next\n- Track the Second Circuit briefing schedule and actual issues raised, any amended judgment, § 853(n) ancillary rulings, remission notices, and later district-court action after Doc 868.\n\nLimitations\nThis is neutral legal research based on version-locked public copies and page citations, not legal advice. It does not infer the contents of sealed records or predict the appeal.`,
    `核心结论\n- 刑事主案已于 2026 年 7 月 2 日形成正式判决：九项定罪、三项无罪、总刑期 360 个月、赔偿和罚金均为 0、评估费 900 美元，以及 8.89 亿美元没收金钱判决。[Doc 860，第 1-6 页]\n\n程序姿态\n- 上诉通知同时覆盖定罪和刑罚；实体争点必须以后续第二巡回 26-1853 案卷和书状为准，不能从通知本身推断。[Doc 862，第 1 页]\n\n法院已确认材料\n- 法院从拟议没收额中扣除 4.11 亿美元，确定 8.89 亿美元；驳回强制扣押破产资产动议，把第三方所有权留给 § 853(n) 程序，并因赔偿不切实际授权 remission。[Doc 858，第 9、17 页]\n- 量刑时，法院拒绝完整 Fatico 听证，按优势证据作事实认定，认定量刑指南损失超过 5.5 亿美元，并在指南以下判处总计 360 个月。[Doc 864，PDF 第 4-13、57-60 页]\n\n争议立场\n- Doc 19 记录检方历史指控，不是法院认定，而且早于正式判决所引用的 S3 替代起诉书。[Doc 19，第 1-12 页]\n- 量刑事实与陪审团裁决的标准和目的不同，不得把量刑认定写成新增定罪。[Doc 864，PDF 第 4、9 页]\n\n跨案件关联\n- 刑事没收与 SEC/Fair Fund 及破产追回存在事实重叠，但没收、返还、赔偿、remission 和破产财产所有权仍是不同法律程序。[Doc 858，第 9、17 页]\n\n证据缺口\n- 核心刑事 PDF 目前来自 NFSC 备用镜像，并非 PACER 或 RECAP 认证副本；Doc 864 的庭审记录内部页码第 3-30 页已密封并从公开 PDF 删除，上述 Doc 864 引用使用 PDF 页码。\n\n后续观察\n- 追踪第二巡回排期和实际提出的争点、任何修订判决、§ 853(n) 附属程序裁定、remission 通知及 Doc 868 后地区法院行动。\n\n分析限制\n本报告是基于版本锁定公开副本和页码引用的中立法律研究，不是法律意见；不推测密封内容，也不预测上诉结果。`,
    6,
  )),
  'sdny-23-cv-2200': bilingualCase(
    'Core conclusion\n- The local official record establishes the SEC\'s complaint and requested remedies, not the current civil merits outcome. The complaint alleges multiple offering frauds and unregistered offerings and seeks injunctions, disgorgement, penalties, bars, relief-defendant repayment, and a jury. [SEC Complaint, pp. 1-9, 30-36]\n\nProcedural posture\n- A complete case posture cannot be stated until the subsequent 1:23-cv-02200 docket is collected.\n\nCross-case connections\n- Civil recovery and Fair Fund distributions must be reconciled with the $411 million criminal forfeiture credit without treating the remedies as identical. [Doc 858, p. 17]\n\nEvidence gaps\n- Answers, stays, defaults, consent judgments, operative orders, and later docket entries are missing locally. The SEC excess-personal-property guidance PDF appears unrelated and should not count as case evidence.\n\nLimitations\nThe complaint contains SEC allegations, not final judicial findings.',
    '核心结论\n- 当前本地官方材料能证明 SEC 提交了起诉状并请求相应救济，但不能证明民事案当前实体结果。起诉状指控多项发行欺诈和未注册发行，并请求禁令、返还、罚款、禁任、relief defendants 返还和陪审团审判。[SEC Complaint，第 1-9、30-36 页]\n\n程序姿态\n- 在收集 1:23-cv-02200 后续完整案卷前，不能给出完整案件状态。\n\n跨案件关联\n- 民事追回和 Fair Fund 分配应与刑事没收的 4.11 亿美元抵扣核对，但不能把不同救济视为同一项目。[Doc 858，第 17 页]\n\n证据缺口\n- 本地缺少答辩、中止、缺席、同意判决、操作性命令和后续案卷；SEC excess-personal-property guidance PDF 看起来与本案无关，不应计为案件证据。\n\n分析限制\n起诉状包含 SEC 指控，不是法院终局认定。',
    1,
  ),
  'bkd-24-05021-bannon': bilingualCase(
    'Core conclusion\n- The trustee complaint seeks recovery of an alleged $250,000 prepetition transfer through Golden Spring to Bannon Strategic Advisors under actual- and constructive-fraudulent-transfer theories. [Doc 1, pp. 4, 11-18]\n\nContested positions\n- These are trustee allegations. The filing does not establish that the defendant was Guo-owned or controlled, or that liability has been adjudicated.\n\nEvidence gaps\n- The local set lacks the answer, merits motions, settlement, and final disposition. Later notices of appearance do not resolve the claims.\n\nLimitations\nNo case outcome should be inferred from the complaint alone.',
    '核心结论\n- 受托人起诉状依据实际和建设性欺诈转移理论，请求追回一笔被指称经 Golden Spring 支付给 Bannon Strategic Advisors 的 25 万美元破产前转移。[Doc 1，第 4、11-18 页]\n\n争议立场\n- 这些属于受托人指控。文件不能证明被告由郭所有或控制，也不能证明责任已经裁判。\n\n证据缺口\n- 本地缺少答辩、实体动议、和解和最终处分；后续律师出庭通知不解决诉因。\n\n分析限制\n不能仅凭起诉状推断案件结果。',
    1,
  ),
  'bkd-24-05249-aca': bilingualCase(
    'Core conclusion\n- Doc 192 supplies a substantial defense-side response: admissions, denials, insufficient-information responses, fifteen affirmative or other defenses, and a jury demand. [Doc 192, pp. 14-29]\n\nContested positions\n- Defendants dispute whether the debtor owned an interest in the transferred property, whether § 550 permits recovery, standing, due process, and personal and subject-matter jurisdiction. These are preserved defenses, not rulings. [Doc 192, pp. 27-28]\n\nEvidence gaps\n- Amended Complaint Doc 106 and later dispositive rulings are required for a reliable whole-case analysis.\n\nWatch next\n- Track jurisdiction, jury entitlement, withdrawal of the reference, limitations, standing, and settlement or merits disposition.\n\nLimitations\nA joint answer does not prove common ownership, control, alter ego, or liability.',
    '核心结论\n- Doc 192 提供了重要的被告方回应：承认、否认、信息不足答复、十五项积极或其他抗辩，以及陪审团请求。[Doc 192，第 14-29 页]\n\n争议立场\n- 被告争议债务人是否拥有转移财产利益、§ 550 是否允许追回、诉讼资格、正当程序、属人和事项管辖权；这些是保留的抗辩，不是裁定。[Doc 192，第 27-28 页]\n\n证据缺口\n- 必须取得修订起诉状 Doc 106 和后续终局性裁定，才能形成可靠的案件整体分析。\n\n后续观察\n- 追踪管辖权、陪审团权、withdrawal of reference、时效、诉讼资格以及和解或实体处分。\n\n分析限制\n共同答辩不能证明共同所有、控制、人格混同或责任。',
    1,
  ),
  'bkd-24-05275-lamp': bilingualCase(
    'Core conclusion\n- The trustee complaint pleads 109 avoidance and recovery claims across a broad alleged entity and transfer network. It seeks relief under §§ 544, 548, 549, and 550 and New York law. [Doc 1, pp. 18-166]\n\nContested positions\n- Alter-ego, control, ownership, transfer, insolvency, intent, and recoverability statements are trustee allegations unless later adopted by the court.\n\nEvidence gaps\n- Page 168 states the transaction schedules are sealed. The local set also lacks the defendants\' substantive responses and later merits disposition.\n\nCross-case connections\n- Compare each entity and transfer with ACA Doc 192, the main bankruptcy case, criminal forfeiture, SEC/Fair Fund, and withdrawal-of-reference proceedings.\n\nLimitations\nRequested amounts under overlapping legal theories are not adjudicated recoveries and should not be simply totaled.',
    '核心结论\n- 受托人起诉状围绕广泛的被指称实体和转移网络提出 109 项撤销与追回请求，依据 §§ 544、548、549、550 和纽约州法寻求救济。[Doc 1，第 18-166 页]\n\n争议立场\n- 人格混同、控制、所有权、转移、资不抵债、意图和可追回性表述均属于受托人主张，除非后续被法院采纳。\n\n证据缺口\n- 第 168 页明确写明逐笔交易 schedules 已密封；本地还缺少被告实体回应及后续实体处分。\n\n跨案件关联\n- 应把每个实体和转移与 ACA Doc 192、破产主案、刑事没收、SEC/Fair Fund 及 withdrawal-of-reference 程序对照。\n\n分析限制\n重叠法律理论下的请求金额不是已裁判追回金额，不能简单相加。',
    1,
  ),
}

export function humanDocumentResearch(file, lang = 'zh') {
  const key = documentResearchKey(file)
  const value = documentResearch[key] ?? externalDocumentResearch(file?.sha256)
  if (!value || !file?.sha256 || value.sha256 !== file.sha256) return null
  return {
    ...value,
    content: lang === 'en' ? value.en : value.zh,
    reviewedAt: value.reviewedAt ?? reviewedAt,
  }
}

function externalDocumentResearch(sourceSha256) {
  if (!/^[a-f0-9]{64}$/.test(sourceSha256 ?? '')) return null
  if (externalResearchCache.has(sourceSha256)) {
    const cached = externalResearchCache.get(sourceSha256)
    externalResearchCache.delete(sourceSha256)
    externalResearchCache.set(sourceSha256, cached)
    return cached
  }
  let value
  try {
    value = JSON.parse(readFileSync(new URL(`./human-legal-research/${sourceSha256}.json`, import.meta.url), 'utf8'))
  } catch (error) {
    if (error?.code === 'ENOENT') return null
    throw error
  }
  if (value.sha256 !== sourceSha256) throw new Error(`Version-locked legal review registry mismatch: ${sourceSha256}`)
  externalResearchCache.set(sourceSha256, value)
  if (externalResearchCache.size > maximumCachedExternalResearch) {
    externalResearchCache.delete(externalResearchCache.keys().next().value)
  }
  return value
}

export function humanCaseResearch(caseId, manifest, lang = 'zh') {
  const value = caseResearch[caseId]
  if (!value) return null
  const required = Object.values(documentResearch).filter((item) => item.caseId === caseId)
  const manifestHashes = new Set((manifest?.files ?? []).filter((file) => file.caseId === caseId).map((file) => file.sha256))
  if (required.some((item) => !manifestHashes.has(item.sha256))) return null
  return {
    available: true,
    generatedAt: reviewedAt,
    model: lang === 'en' ? 'Version-locked legal review v1' : '版本锁定法律复核 v1',
    provider: 'human_research',
    text: lang === 'en' ? value.en : value.zh,
    evidenceCount: value.evidenceCount,
  }
}

function documentResearchKey(file) {
  if (file?.caseId === 'sdny-23-cv-2200' && file?.title === 'SEC Complaint') return 'sdny-23-cv-2200:sec-complaint'
  if (file?.caseId === 'sdny-23-cr-118' && file?.sha256 === '81df1f2d4b568d5eb43bbfb31a596ff2e160f4f6734318e02b33d48e612e7b17') return 'sdny-23-cr-118:final-motion'
  if (!file?.caseId || file?.docNumber == null) return ''
  return `${file.caseId}:${file.docNumber}`
}

function report(value) {
  return {
    ...value,
    caseId: value.caseId ?? inferCaseId(value.sha256),
    reviewedAt: value.reviewedAt ?? reviewedAt,
  }
}

function inferCaseId(sha256) {
  if (['afd4314249c03fe5e1b25b617469d07d2fbc8de39f4048d2d67a7e8e2611157e', 'e9f2b6bf50c5a2233048a0b268b8e22ee29c4300c18791cd54e60a1e06e08d14', '302198c50ee9616223f23d2e677f550a4c076d443d3f11a7cb34723f0c8a1f6e', '71fb0c37837d8b67f8407f9143bace146c1a5628629d53eb819d387ab9d52325', '6ef3392bc2cb92c6d917902c7a6abb750d81823fe503d466bbbdec7c83f09703', '49c295030ca7714a9cc5bbd8b4c052f77732208e370e0ffe39a9407fe7c42f68', '051cf26b4137943078c2a1f8b107da0440c1ce675b7d317ecaa6af012a5cee80', 'a10fae7c54a7dcc543219d5e09d9bb19590df142af98b591d66afda5168d8642'].includes(sha256)) return 'sdny-23-cr-118'
  if (['38aaed7528115aa0cf7f18e0f273ba1e0bc06b2850303ea4901f792073468f47', 'd46c05eb53757ef0f35f5f247c24bf0fea93dd049646d39bf8189e45c6c95e9d', 'c0dfe072d7b8714c2adb69ba963ebfc762232231d494dca73bc8198c714fcb91', 'c415e033b343d3a12323aad7ae2a78076d742c8b01e29b0bbea9fd23b3003011', '27d4610550a903e9dfb2a706eb442a52d8c9d0743d60b55da9a41a7e4429d835', 'b4946303c0c8d3fc8497b6c0401c80c362512d1e9f79078baa8b0e25484828b0', '5edc7cdac89942f7d0c92eb23d0524888d32be15f598459df3f0dbcaf861f680', '6bc81df690d58f585bf3273acecdba01527adbcd57b319fdb2147e3cbf57e11c', '04c188ba6880417d855c976b58540f95c18d5949a324e23b2d7f4915d7b0a5a3', '746004083ed5561a399b9b33abc8c69cf1e0540d6f2a6f39d682150c2c1429bd', '7b36d4027b100242f0884837fa161e7c9e5dc01606650a904e7c7c1c61748932', '5e4ab50292478d8cb604d85891a772f3fed09d2bd2f0c2896df55f90e7b7b582', '4b259fadeaba4e9030a48f35a97e691e50568cb157780cae3f166e1fe7d7f247'].includes(sha256)) return 'sdny-23-cr-118'
  if (sha256 === 'e8b4af07d84f79e84596045ffc6986a328808b63eeef4f1483b3c3a30994beb7') return 'sdny-23-cv-2200'
  if (sha256 === '13534b173f10f2a029f80dff37b80ab72f7ac3f5a744efc160bb662a3503a8eb') return 'bkd-24-05021-bannon'
  if (sha256 === '21691101c3bde166717c28a2a1c306dd5888974218484ba052009cc0ea916e05') return 'bkd-24-05249-aca'
  if (sha256 === 'a2800906f7cd7ae60c9d6a8a74ad7be3921ad58a6d1de50396d52efd38e0a395') return 'bkd-24-05275-lamp'
  return ''
}

function finding(section, text, pages) {
  return { section, text, confidence: 'high', pages }
}

function bilingualCase(en, zh, evidenceCount) {
  return { en, zh, evidenceCount }
}

function augmentCriminalCase(value) {
  const en = `Charging instrument and verdict update
- Doc 307 is the S3 trial charging instrument, not a judicial finding. It pleads thirteen counts and forfeiture theories and alleges program amounts that may overlap. [Doc 307, pp. 1, 10-19, 27-48]
- The signed verdict form found Miles Guo guilty on Counts 1-4 and 7-11 and not guilty on Counts 5, 6, and 12. It does not state the jury's reasoning, sentence, forfeiture amount, or third-party property rights. [Doc 395, pp. 1-3]
- The acquittals on the two substantive GTV counts and the unlawful-monetary-transaction count must remain visible when the outcome is summarized; broader conspiracy convictions do not erase those acquittals. [Doc 395, pp. 1-2]
- The 48-page Doc 307 scan was fully recovered by local OCR and key pages were visually checked, but both Doc 307 and Doc 395 remain NFSC backup copies pending PACER or RECAP authentication.

Forfeiture sequence and disputed ownership
- Doc 720 is a signed preliminary order, not a party allegation. It entered an earlier approximately $1.3 billion money judgment, listed specific property, and opened the notice and ancillary process for third-party interests. It was final as to Guo under Rule 32.2(b)(4), but did not finally adjudicate every third-party ownership claim. [Doc 720, pp. 11-14]
- Doc 790 is only the government's request to add specified G Club and Je/Rong account funds. The four-page filing ends by asking the court to enter a proposed supplemental order; it does not establish that the request was granted. [Doc 790, pp. 1-4]
- Doc 804 preserves the defense position that the approximately $1.3 billion figure improperly used aggregate inflows and acquitted GTV conduct and should account for third-party interests and prior recoveries. Its proposed offsets are arguments, not adjudicated credits. [Doc 804, pp. 1-6]
- Doc 858 is the controlling later order on the monetary baseline: the court deducted $411 million, fixed the money judgment at $889 million, denied compulsory seizure of bankruptcy assets, reserved third-party merits for the § 853(n) process, and authorized remission because restitution was impracticable. [Doc 858, pp. 9, 17]

Forfeiture briefing and third-party remedies
- Docs 799, 803, and 804 preserve the full adversarial forfeiture record. The defense disputed scope, personal acquisition, acquitted GTV conduct, and offsets; the government asserted waiver, control, a broader RICO theory, and delayed credit. Doc 858 declined to decide waiver, adopted substantial parts of the government's merits framework, but reduced the judgment by $411 million. [Docs 799, pp. 1-21; 803, pp. 1-11; 804, pp. 1-6; 858, pp. 5-17]
- Doc 799's statement that Guo was convicted on ten of thirteen counts is internally erroneous. Docs 395 and 860 control: nine convictions and three acquittals as to Guo, while Count 13 concerned Je. [Doc 799, p. 2; Doc 395, pp. 1-2]
- Docs 785 and 789 agree that victim-by-victim restitution is impracticable but dispute how broadly § 853(n) ownership claims remain available. Section 853(n) is a judicial specific-property process; remission is discretionary DOJ victim compensation. [Doc 785, pp. 1-6; Doc 789, pp. 1-4]
- Doc 841 is a verified third-party petition claiming a $6 million specific-property interest. It is evidence that a claim was made, not that standing or ownership was established. [Doc 841, pp. 1-5]
- Doc 855 allowed sentencing to proceed without first resolving Fatico and ancillary matters. It did not deny third-party ownership claims. [Doc 855, p. 1]
- Doc 859 later added a G Club Operations-related check and four Je/Rong Barclays accounts to the specific-property process. It did not create a second $1.3 billion judgment or supersede the $889 million baseline. [Doc 859, pp. 3-6]

Himalaya collective-claim chronology and legal pathways
- The public record contains changing, noninterchangeable figures: approximately 5,242 represented members in Doc 506; approximately 6,537 clients, 3,539 authenticated records, 1,433 affidavits, and approximately 117 withdrawals in Doc 612; 6,575 represented members and the same 3,539 authenticated subset in Final-motion.pdf; and 6,512 purportedly authenticated sealed submissions in Doc 763. These figures reflect different dates, categories, and methods, not one court-certified claimant total. [Doc 506, p. 1; Doc 612, pp. 2, 4; Final-motion.pdf, pp. 1, 5-6; Doc 763, pp. 1-2]
- Doc 612-1 requests a protected filing channel for sensitive identity and financial material. Sealing addresses access and privacy; it does not validate ownership or entitlement. [Doc 612-1, pp. 1-5, 10]
- Doc 612-2 is the government's April 7, 2023 forfeiture bill of particulars refiled as a 2025 exhibit. It is a historical property notice, not a new 2025 ruling. [Doc 612-2, pp. 1, 6]
- Docs 612-3 and 612-4 are claimant-side supporting materials. They may show that statements or records were supplied, but they are not findings and must not be generalized or publicly reproduced with personal details. [Docs 612-3, pp. 1-6; 612-4, p. 3]
- Doc 612-5 is commissioned professional material, not a court-certified universal audit. Its non-audit scope, non-statistical sampling, source-verification limits, and no-legal-opinion boundary must remain visible. [Doc 612-5]
- Doc 612-6 is a 145-page composite evidence binder containing republished earlier materials. Internal docket headers and duplicate content must be indexed so refiling is not counted as independent corroboration. Only the first ten pages and package structure have been verified for the present report. [Doc 612-6, pp. 1-10]
- Final-motion.pdf pleads several routes in the alternative. Rule 41(g) seeks return of property held by the government; § 853(n) is a judicial process for a third party claiming a legal interest in specific forfeited property; remission is discretionary DOJ administration; restitution is compensation ordered through the criminal judgment; constructive trust is an equitable ownership or priority theory that still requires applicable elements and tracing. Pleading all routes together does not merge their standards or guarantee relief. [Final-motion.pdf, pp. 1, 6-10; Doc 858, pp. 9, 17]

Ancillary administration, evidence access, and source integrity
- Doc 763 records counsel's notice of a collective sealed submission described as covering 6,512 Himalaya Exchange members. The number and account figures are filing-side representations, not judicial findings that 6,512 valid or successful claims existed. [Doc 763, pp. 1-4]
- The local Doc 765 mirror metadata conflicts with the PDF body: the title describes a 6,512-claim notice, but the 27-page body is a Ranyue Bai Second Circuit mandamus petition and attachments. Doc 765 cannot corroborate the 6,512 figure until the official SDNY and appellate dockets are checked. [Doc 765, PDF pp. 1-6, 25-27]
- Doc 820 shows only that the court continued to consider a special master and invited candidate suggestions; it does not show an appointment or a decision on any claim. [Doc 820, p. 1]
- Doc 823 granted a limited Rule 17(c) subpoena after denying the government's motion to quash. Permission to obtain specified mitigation material is not a finding that the material was true, admissible, or outcome-determinative. [Doc 823, pp. 1-3]
- Doc 866 unsealed ancillary petitions only enough for the government to obtain unredacted copies from the Clerk. It did not make them generally public or decide their merits. [Doc 866, p. 1]
- Doc 867 is a pro se third-party mandamus petition seeking vacatur, a hearing on the government's 225-name list, and a forfeiture stay. Its foreign-coercion, identity-theft, and political-targeting assertions are petitioner allegations; the later appellate disposition, not the request, controls. [Doc 867, PDF pp. 1-8]

Relationship correction
- Doc 826 corrects the defense's own prior description of ACA Capital as a Guo family entity and states that ACA Capital is distinct from ACA Family Fund Investment Company. This is a material relationship-map correction, but remains a party correction rather than an ownership judgment. [Doc 826, p. 1]

Adversarial sentencing record
- Doc 833 is the government's sentencing advocacy. It requested at least 30 years and argued for loss above $550 million, a Guidelines calculation reaching the 2,100-month statutory maximum, and aggravating treatment for victim harm, leadership, and obstruction. [Doc 833, pp. 32-41, 81-88]
- Doc 834 is the defense reply. It disputed gross-inflow loss methodology, use of acquitted GTV conduct, victim classification, and asserted offsets, and requested a Fatico hearing and a sentence substantially below the government's request. Its political-context discussion is a defense position, not an established explanation of the prosecution. [Doc 834, pp. 4-26]
- Doc 864, rather than either memorandum, states the court's actual resolution: no full Fatico hearing, preponderance findings including Guidelines loss above $550 million, and a total 360-month sentence with no restitution, fine, or supervised release and a $900 assessment. [Doc 864, PDF pp. 4-13, 57-60]
- The fact that the final 360-month term equals 30 years does not mean the court adopted every factual or legal argument in Doc 833; the court's own reasons and rulings control.`
  const zh = `控罪文件与陪审团裁决更新
- Doc 307 是审判所用 S3 控罪文件，不是法院认定。它提出 13 项罪名和没收理论，并列出可能相互重叠的项目金额。[Doc 307，第 1、10-19、27-48 页]
- 经签署的裁决表认定 Miles Guo 第 1-4、7-11 项有罪，第 5、6、12 项无罪。它没有说明陪审团理由、刑期、没收金额或第三方财产权利。[Doc 395，第 1-3 页]
- 汇总案件结果时必须保留两项 GTV 具体罪名和非法货币交易罪名的无罪结果；较宽泛的合谋定罪不会抹去这些无罪裁决。[Doc 395，第 1-2 页]
- Doc 307 的 48 页扫描正文已由本地 OCR 完整恢复并抽查关键页，但 Doc 307 和 Doc 395 仍属于 NFSC 备用副本，等待 PACER 或 RECAP 认证。

没收顺序与财产权争议
- Doc 720 是法院签署的初步命令，不是当事方指控。它先行确定约 13 亿美元金钱判决、列出具体财产，并开启第三方权利通知和附属程序。该命令依 Rule 32.2(b)(4) 对郭本人具有终局效力，但没有最终裁判每一项第三方所有权主张。[Doc 720，第 11-14 页]
- Doc 790 只是检方请求把特定 G Club 及 Je/Rong 账户资金纳入没收。该 4 页文件以请求法院签发拟议补充命令结尾，不能证明请求已获批准。[Doc 790，第 1-4 页]
- Doc 804 保留辩方立场：约 13 亿美元错误采用总流入和 GTV 无罪行为，并应处理第三方权利及先前追回。辩方提出的抵扣是诉讼主张，不是已裁判抵扣。[Doc 804，第 1-6 页]
- Doc 858 是后来控制金钱判决基准的法院裁定：法院扣除 4.11 亿美元，将金钱判决定为 8.89 亿美元；驳回强制扣押破产资产请求；把第三方实体权利留给 § 853(n) 程序；并因赔偿不切实际而授权 remission。[Doc 858，第 9、17 页]

没收书状与第三方救济
- Docs 799、803、804 保留了完整的没收对抗记录。辩方争议范围、亲自取得、GTV 无罪行为和抵扣；检方主张 waiver、控制、较宽的 RICO 理论和延后抵扣。Doc 858 没有裁判 waiver，实体上接受检方相当部分框架，但扣除 4.11 亿美元。[Docs 799，第 1-21 页；803，第 1-11 页；804，第 1-6 页；858，第 5-17 页]
- Doc 799 所说“13 项中 10 项定罪”属于文件自身错误。应以 Docs 395、860 为准：郭九项定罪、三项无罪，第 13 项针对 Je。[Doc 799，第 2 页；Doc 395，第 1-2 页]
- Docs 785、789 均同意逐一赔偿不切实际，但争议 § 853(n) 所有权申请应保留多大范围。§ 853(n) 是法院对特定财产的程序；remission 是 DOJ 酌情受害人补偿。[Doc 785，第 1-6 页；Doc 789，第 1-4 页]
- Doc 841 是一份经宣誓的第三方 600 万美元具体财产权申请。它证明有人提出主张，不证明 standing 或所有权已经成立。[Doc 841，第 1-5 页]
- Doc 855 允许在 Fatico 和附属问题解决前继续量刑，并没有驳回第三方所有权申请。[Doc 855，第 1 页]
- Doc 859 后来把与 G Club Operations 相关的支票和 4 个 Je/Rong Barclays 账户加入具体财产流程。它没有新增第二个 13 亿美元判决，也没有取代 8.89 亿美元基准。[Doc 859，第 3-6 页]

喜交所集体申请时间线与法律通道
- 公开记录中的数字不断变化且不能互换：Doc 506 约 5,242 名受代理成员；Doc 612 约 6,537 名客户、3,539 份认证记录、1,433 份宣誓书和约 117 名退出者；Final-motion.pdf 称 6,575 名受代理成员及同一 3,539 认证子集；Doc 763 又称 6,512 项据称经认证的密封提交。这些数字对应不同日期、类别和方法，不是一个法院认证的固定申请人数。[Doc 506，第 1 页；Doc 612，第 2、4 页；Final-motion.pdf，第 1、5-6 页；Doc 763，第 1-2 页]
- Doc 612-1 请求为敏感身份和财务材料建立受保护提交通道。密封解决访问与隐私，不验证所有权或取得救济的资格。[Doc 612-1，第 1-5、10 页]
- Doc 612-2 是检方 2023 年 4 月 7 日没收 particulars 清单在 2025 年作为附件重提；它是历史财产通知，不是新的 2025 年裁定。[Doc 612-2，第 1、6 页]
- Docs 612-3、612-4 是申请人一方支持材料。它们可能证明有人提交陈述或记录，但不是法院认定，不得推广到全体，也不得公开复制个人细节。[Docs 612-3，第 1-6 页；612-4，第 3 页]
- Doc 612-5 是受委托专业材料，不是法院认证的普遍审计；必须显示其非审计范围、非统计抽样、原始资料核验限制和不提供法律意见的边界。[Doc 612-5]
- Doc 612-6 是 145 页复合证据资料夹，包含重新提交的旧材料。必须依据内部案卷页眉和重复内容建立索引，防止把重提当作独立印证；当前报告只核验前 10 页和整体结构。[Doc 612-6，第 1-10 页]
- Final-motion.pdf 替代提出多条路线。Rule 41(g) 请求返还政府持有的财产；§ 853(n) 是第三方主张对特定没收财产享有法律权利的司法程序；remission 是 DOJ 酌情行政处理；restitution 是刑事判决中的补偿；constructive trust 是仍需满足适用要件和资金追踪的衡平所有权或优先权理论。把这些路线一起提出，不会合并其标准，也不保证获得救济。[Final-motion.pdf，第 1、6-10 页；Doc 858，第 9、17 页]

附属程序管理、证据取得与来源完整性
- Doc 763 记录律师关于集体密封提交的通知，称涉及 6,512 名 Himalaya Exchange 成员。该数量和账户数字是文件方陈述，不是法院认定存在 6,512 项有效或胜诉申请。[Doc 763，第 1-4 页]
- 当前本地 Doc 765 的镜像元数据与 PDF 正文冲突：标题描述 6,512 项申请通知，但 27 页正文是 Ranyue Bai 的第二巡回 mandamus 申请及附件。在核验 SDNY 和上诉正式案卷前，Doc 765 不能用于交叉证明 6,512 这一数字。[Doc 765，PDF 第 1-6、25-27 页]
- Doc 820 只表明法院继续考虑 special master 并邀请提出候选人，没有证明已经任命，也没有裁判任何申请。[Doc 820，第 1 页]
- Doc 823 在驳回检方撤销动议后，有限度批准 Rule 17(c) 传票。允许取得特定减轻处罚材料，不等于认定材料真实、可采或决定结果。[Doc 823，第 1-3 页]
- Doc 866 只把附属申请有限解封到足以让检方从书记官处取得未删节副本的程度，没有向公众普遍公开，也没有裁判实体。[Doc 866，第 1 页]
- Doc 867 是第三方 pro se mandamus 申请，请求撤销、就检方 225 人名单听证并暂停没收。关于外国胁迫、身份盗用和政治针对的内容均是申请人主张；应以后续上诉处分而不是请求本身为准。[Doc 867，PDF 第 1-8 页]

关系纠正
- Doc 826 纠正辩方此前把 ACA Capital 称为郭家族实体的错误，并说明 ACA Capital 与 ACA Family Fund Investment Company 不同。这是关系图的重要纠正，但仍属于当事方更正，不是所有权判决。[Doc 826，第 1 页]

检辩对抗式量刑记录
- Doc 833 是检方量刑论证。检方请求至少 30 年，主张损失超过 5.5 亿美元、指南计算达到法定最高 2,100 个月，并要求考虑受害人损害、领导地位和妨碍司法等加重因素。[Doc 833，第 32-41、81-88 页]
- Doc 834 是辩方答复。辩方争议以总流入计算损失、使用 GTV 无罪行为、受害人分类及抵扣问题，并请求 Fatico 听证和明显低于检方建议的刑期。文件中的政治背景讨论属于辩方立场，不是已经证明的起诉原因。[Doc 834，第 4-26 页]
- Doc 864 而非双方备忘录记录法院实际处理：拒绝完整 Fatico 听证，按优势证据作出包括指南损失超过 5.5 亿美元在内的认定，并判处总计 360 个月、无赔偿、无罚金、无监督释放和 900 美元评估费。[Doc 864，PDF 第 4-13、57-60 页]
- 最终 360 个月等于 30 年，并不表示法院采纳了 Doc 833 的全部事实或法律论证；应以法院自己的理由和裁定为准。`
  return {
    en: `${en}\n\n${value.en}`,
    zh: `${zh}\n\n${value.zh}`,
    evidenceCount: value.evidenceCount + 22,
  }
}
