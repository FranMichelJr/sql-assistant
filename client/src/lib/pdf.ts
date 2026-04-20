export function exportToPdf(title: string, columns: string[], rows: (string | number | null)[][]) {
  const headerCells = columns.map(c => `<th>${c}</th>`).join('')
  const bodyRows = rows.map(r =>
    `<tr>${r.map(cell => `<td>${cell ?? ''}</td>`).join('')}</tr>`
  ).join('')

  const html = `<!DOCTYPE html><html><head><title>${title}</title><style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;font-size:12px;color:#111;padding:28px}
    h1{font-size:20px;font-weight:700;margin-bottom:4px}
    .meta{color:#888;font-size:11px;margin-bottom:20px}
    table{width:100%;border-collapse:collapse}
    thead tr{background:#111;color:#fff}
    th{padding:9px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.06em}
    td{padding:7px 12px;border-bottom:1px solid #e5e5e5;font-size:12px}
    tr:nth-child(even) td{background:#f9f9f9}
    @media print{body{padding:12px}}
  </style></head><body>
    <h1>${title}</h1>
    <p class="meta">Generado: ${new Date().toLocaleString('es-AR')}</p>
    <table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>
  </body></html>`

  const win = window.open('', '_blank', 'width=960,height=700')
  if (!win) { alert('Habilitá ventanas emergentes para exportar PDF'); return }
  win.document.write(html)
  win.document.close()
  setTimeout(() => win.print(), 400)
}
