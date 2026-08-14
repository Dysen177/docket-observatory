export const documentVariantKeys = {
  source: 'source',
  chineseReferenceTranslation: 'chinese_reference_translation',
}

export function documentVariantKey(file) {
  const values = [file?.title, file?.url, file?.filename, file?.path, file?.finalUrl]
    .filter(Boolean)
    .map((value) => decodeSafely(String(value)).toLowerCase())
  const combined = values.join(' ')
  if (
    combined.includes('中文翻译仅供参考')
    || combined.includes('中文版本仅供参考')
    || combined.includes('翻译排版')
    || /(?:^|[\s/_-])(?:cn|zh)(?:[._/-]|\s|$)/u.test(combined)
    || combined.includes('(中文)')
  ) {
    return documentVariantKeys.chineseReferenceTranslation
  }
  return documentVariantKeys.source
}

export function documentVariantLabel(file, lang = 'zh') {
  const key = documentVariantKey(file)
  if (key === documentVariantKeys.chineseReferenceTranslation) {
    return lang === 'en' ? 'Chinese reference translation' : '中文参考译本'
  }
  return lang === 'en' ? 'Source-language original' : '来源原件'
}

function decodeSafely(value) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}
