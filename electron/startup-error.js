const detail = new URLSearchParams(window.location.search).get('detail')
const detailElement = document.querySelector('#detail')
if (detail && detailElement) {
  detailElement.textContent = detail
  detailElement.hidden = false
}
document.querySelector('button')?.addEventListener('click', () => window.close())
