export function responseOutputText(payload, context = 'OpenAI response') {
  if (!payload || typeof payload !== 'object') throw new Error(`${context} was not a JSON object.`)
  if (payload.status === 'incomplete') {
    const reason = String(payload.incomplete_details?.reason ?? 'unknown reason').slice(0, 120)
    throw new Error(`${context} was incomplete: ${reason}.`)
  }

  const contentItems = Array.isArray(payload.output)
    ? payload.output.flatMap((item) => Array.isArray(item?.content) ? item.content : [])
    : []
  const refusal = contentItems.find((item) => item?.type === 'refusal' || typeof item?.refusal === 'string')
  if (refusal) {
    const detail = String(refusal.refusal ?? 'The request was refused.').replace(/\s+/g, ' ').trim().slice(0, 240)
    throw new Error(`${context} was refused: ${detail}`)
  }

  const outputText = typeof payload.output_text === 'string'
    ? payload.output_text
    : contentItems.find((item) => typeof item?.text === 'string')?.text
  if (!outputText?.trim()) throw new Error(`${context} did not include output_text.`)
  return outputText
}
