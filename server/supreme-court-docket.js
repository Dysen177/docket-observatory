import * as cheerio from 'cheerio'
import { createHash } from 'node:crypto'

const monthNumbers = new Map(Object.entries({
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
}))

export function parseSupremeCourtDate(value) {
  const match = cleanText(value).match(/^([A-Za-z]{3})\s+(\d{1,2})\s+(\d{4})$/)
  if (!match) return null
  const month = monthNumbers.get(match[1].toLowerCase())
  if (!month) return null
  return `${match[3]}-${month}-${match[2].padStart(2, '0')}`
}

export function parseSupremeCourtDocket(html, sourceUrl) {
  const $ = cheerio.load(html)
  const docketNumber = cleanText($('meta[name="CaseNumber"]').attr('content') ?? '').replace(/^0+/, '')
  const docketFromTitle = cleanText($('title').text()).match(/Docket\s+for\s+([\d-]+)/i)?.[1]
  const term = cleanText($('meta[name="Term"]').attr('content') ?? '')
  const normalizedDocket = docketFromTitle || (term && docketNumber ? `${term.slice(-2)}-${docketNumber}` : '')
  const title = cleanText($('.title').text())
  const proceedings = []

  $('table.ProceedingItem').each((_, table) => {
    const date = parseSupremeCourtDate($(table).find('.ProceedingDate').first().text())
    if (!date) return
    const detailCell = $(table).find('td').eq(1)
    const description = cleanText(detailCell.clone().find('.documentlinks').remove().end().text())
    const documents = []
    detailCell.find('a[href]').each((__, anchor) => {
      const href = $(anchor).attr('href') ?? ''
      let url
      try {
        url = new URL(href, sourceUrl).toString()
      } catch {
        return
      }
      if (new URL(url).hostname.toLowerCase() !== 'www.supremecourt.gov') return
      const label = cleanText($(anchor).text()) || 'Main Document'
      documents.push(supremeCourtDocumentMetadata({ date, description, label, url }))
    })
    proceedings.push({ date, description, documents })
  })

  return {
    docketNumber: normalizedDocket,
    title,
    docketed: cleanText($('meta[name="Docketed"]').attr('content') ?? ''),
    proceedings,
  }
}

function supremeCourtDocumentMetadata({ date, description, label, url }) {
  const lower = `${description} ${label} ${url}`.toLowerCase()
  let docNumber = ''
  let title = label
  if (label.toLowerCase() === 'petition') {
    docNumber = 'petition'
    title = 'Petition for a Writ of Certiorari'
  } else if (lower.includes('certificate of word count') || lower.includes('certificate of compliance')) {
    docNumber = 'certificate-of-word-count'
    title = 'Certificate of Word Count'
  } else if (lower.includes('proof of service')) {
    docNumber = 'proof-of-service'
    title = 'Proof of Service'
  } else if (lower.includes('waiver of right') || lower.includes('waiver.pdf')) {
    docNumber = 'respondent-waiver'
    title = 'Respondent Waiver of Right to Respond'
  } else {
    const digest = createHash('sha1').update(url).digest('hex').slice(0, 8)
    docNumber = `${slug(label)}-${date}-${digest}`
    title = description ? `${description} - ${label}` : label
  }
  return { date, description, label, title, docNumber, url }
}

function slug(value) {
  return cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'document'
}

function cleanText(value) {
  return String(value ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
}
