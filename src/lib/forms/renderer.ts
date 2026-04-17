/**
 * BC Form HTML Renderer
 * Produces standalone, editable, print-ready HTML pages
 * from form definitions.
 */

import type { FormDefinition, FormField } from "./definitions";

function renderField(field: FormField): string {
  const widthClass =
    field.width === "full"
      ? "width:100%"
      : field.width === "third"
        ? "width:32%"
        : "width:48%";

  if (field.type === "signature") {
    return `
      <div class="field" style="${widthClass}">
        <label>${field.label}</label>
        <div class="signature-line">
          <div class="sig-placeholder">Sign here</div>
        </div>
      </div>`;
  }

  if (field.type === "textarea") {
    return `
      <div class="field" style="${widthClass}">
        <label for="${field.id}">${field.label}</label>
        <textarea id="${field.id}" rows="4" placeholder="${field.placeholder ?? ""}">${field.value ?? ""}</textarea>
      </div>`;
  }

  if (field.type === "checkbox") {
    return `
      <div class="field" style="${widthClass}">
        <label class="checkbox-label">
          <input type="checkbox" id="${field.id}" ${field.value === "true" ? "checked" : ""} />
          ${field.label}
        </label>
      </div>`;
  }

  return `
    <div class="field" style="${widthClass}">
      <label for="${field.id}">${field.label}</label>
      <input type="${field.type === "date" ? "date" : "text"}" id="${field.id}" value="${escapeHtml(field.value ?? "")}" placeholder="${field.placeholder ?? ""}" />
    </div>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderFormHTML(form: FormDefinition): string {
  const sectionsHtml = form.sections
    .map(
      (section) => `
      <div class="section">
        <h2>${section.title}</h2>
        <div class="fields">
          ${section.fields.map(renderField).join("")}
        </div>
      </div>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${form.title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: #1a1a1a;
      background: #f5f5f5;
      padding: 0;
    }

    .page {
      max-width: 850px;
      margin: 0 auto;
      background: #fff;
      min-height: 100vh;
    }

    /* Header bar */
    .form-header {
      background: linear-gradient(135deg, #0a6c7a, #0d8595);
      color: #fff;
      padding: 28px 40px;
    }
    .form-header h1 {
      font-size: 22px;
      font-weight: 700;
      margin-bottom: 4px;
      letter-spacing: -0.3px;
    }
    .form-header .subtitle {
      font-size: 13px;
      opacity: 0.85;
      font-weight: 400;
    }
    .form-header .form-number {
      font-size: 11px;
      opacity: 0.7;
      margin-top: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Toolbar */
    .toolbar {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      padding: 12px 40px;
      background: #f8f9fa;
      border-bottom: 1px solid #e5e5e5;
    }
    .toolbar button {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 18px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      background: #fff;
      color: #374151;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }
    .toolbar button:hover {
      background: #f3f4f6;
      border-color: #9ca3af;
    }
    .toolbar button.primary {
      background: #0a6c7a;
      color: #fff;
      border-color: #0a6c7a;
    }
    .toolbar button.primary:hover {
      background: #085a66;
    }

    /* Content */
    .content {
      padding: 30px 40px 50px;
    }

    /* Sections */
    .section {
      margin-bottom: 32px;
    }
    .section h2 {
      font-size: 15px;
      font-weight: 700;
      color: #0a6c7a;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e5e5e5;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    /* Fields */
    .fields {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .field label {
      font-size: 12px;
      font-weight: 600;
      color: #555;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .field input[type="text"],
    .field input[type="date"],
    .field textarea {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 14px;
      font-family: inherit;
      color: #1a1a1a;
      background: #fff;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .field input:focus,
    .field textarea:focus {
      outline: none;
      border-color: #0a6c7a;
      box-shadow: 0 0 0 3px rgba(10, 108, 122, 0.12);
    }
    .field textarea {
      resize: vertical;
      min-height: 80px;
    }
    .field input::placeholder,
    .field textarea::placeholder {
      color: #9ca3af;
    }

    /* Signature fields */
    .signature-line {
      border-bottom: 2px solid #1a1a1a;
      height: 50px;
      display: flex;
      align-items: flex-end;
      padding-bottom: 4px;
    }
    .sig-placeholder {
      color: #ccc;
      font-size: 12px;
      font-style: italic;
    }

    /* Checkbox */
    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px !important;
      text-transform: none !important;
      font-weight: 500 !important;
      color: #1a1a1a !important;
      cursor: pointer;
    }
    .checkbox-label input[type="checkbox"] {
      width: 18px;
      height: 18px;
      accent-color: #0a6c7a;
    }

    /* Footer */
    .form-footer {
      padding: 20px 40px;
      background: #f8f9fa;
      border-top: 1px solid #e5e5e5;
      font-size: 11px;
      color: #666;
      line-height: 1.5;
    }
    .form-footer .branding {
      margin-top: 10px;
      font-size: 10px;
      color: #999;
    }

    /* Print styles */
    @media print {
      body { background: #fff; padding: 0; }
      .page { box-shadow: none; margin: 0; }
      .toolbar { display: none !important; }
      .form-header { background: #0a6c7a !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .field input, .field textarea {
        border: none;
        border-bottom: 1px solid #ccc;
        border-radius: 0;
        padding: 4px 0;
        background: transparent;
      }
      .section { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="form-header">
      <h1>${escapeHtml(form.title)}</h1>
      <div class="subtitle">${escapeHtml(form.subtitle)}</div>
      ${form.formNumber ? `<div class="form-number">${escapeHtml(form.formNumber)}</div>` : ""}
    </div>

    <div class="toolbar">
      <button onclick="window.print();" class="primary">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8" rx="1"/></svg>
        Print / Save PDF
      </button>
      <button onclick="resetForm();">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 12a9 9 0 019-9 9.75 9.75 0 016.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 01-9 9 9.75 9.75 0 01-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
        Reset
      </button>
    </div>

    <div class="content">
      ${sectionsHtml}
    </div>

    ${
      form.footer
        ? `<div class="form-footer">
        <p>${escapeHtml(form.footer)}</p>
        <div class="branding">Generated by Magnate &mdash; BC Real Estate Transaction Automation</div>
      </div>`
        : `<div class="form-footer">
        <div class="branding">Generated by Magnate &mdash; BC Real Estate Transaction Automation</div>
      </div>`
    }
  </div>

  <script>
    function resetForm() {
      if (confirm('Reset all fields to their default values?')) {
        document.querySelectorAll('input[type="text"], input[type="date"], textarea').forEach(el => {
          el.value = el.defaultValue;
        });
        document.querySelectorAll('input[type="checkbox"]').forEach(el => {
          el.checked = el.defaultChecked;
        });
      }
    }
  </script>
</body>
</html>`;
}
