export const PDF_DIALOG_STYLES = `
  :host { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 16px; }
  .backdrop { position: absolute; inset: 0; background: rgba(15, 23, 42, .55); }
  .card { position: relative; display: flex; flex-direction: column; width: min(520px, 100%); max-height: calc(100vh - 32px); overflow: hidden;
    background: #fff; color: #1f2937; border-radius: 12px; box-shadow: 0 20px 50px rgba(15, 23, 42, .35); }
  header { display: flex; align-items: flex-start; gap: 12px; padding: 16px 20px 12px; border-bottom: 1px solid #e5e7eb;
    border-top: 4px solid var(--brand-peacock, #006b63); }
  header h2 { margin: 0; font-size: 18px; font-weight: 700; color: var(--brand-peacock, #006b63); }
  header p { margin: 4px 0 0; font-size: 13px; color: #4b5563; overflow-wrap: anywhere; }
  .icon-close { margin-left: auto; min-width: 36px; padding: 0; font-size: 22px; line-height: 1; border: 0; background: transparent; }
  form { display: flex; flex-direction: column; min-height: 0; }
  .body { display: flex; flex-direction: column; gap: 14px; padding: 16px 20px; overflow-y: auto; }
  fieldset { margin: 0; padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; display: grid; gap: 10px; }
  legend { padding: 0 4px; font-size: 13px; font-weight: 700; color: #374151; }
  .field { display: grid; gap: 4px; font-size: 13px; font-weight: 600; color: #374151; }
  .field small, .hint { font-weight: 400; font-size: 12px; color: #6b7280; }
  .check { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #374151; }
  .check input { width: auto; min-height: auto; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  input, select, textarea { width: 100%; box-sizing: border-box; min-height: 38px; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px;
    font: inherit; font-size: 14px; font-weight: 400; color: #111827; background: #fff; }
  textarea { min-height: 64px; resize: vertical; }
  input:focus, select:focus, textarea:focus { outline: 2px solid var(--brand-peacock, #006b63); outline-offset: 0; border-color: var(--brand-peacock, #006b63); }
  input[aria-invalid="true"] { border-color: #b42318; }
  .note { margin: 0; padding: 10px 12px; font-size: 13px; background: #e7f5f2; border-radius: 6px; border-left: 4px solid var(--brand-peacock, #006b63); }
  .error { margin: 0; padding: 10px 12px; font-size: 13px; color: #b42318; background: #fef3f2; border-radius: 6px; border-left: 4px solid #b42318; }
  footer { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 20px 16px; border-top: 1px solid #e5e7eb; background: #f9fafb; }
  button { min-height: 38px; padding: 6px 14px; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff; color: #1f2937;
    font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
  button:disabled { opacity: .55; cursor: not-allowed; }
  button:focus-visible { outline: 3px solid var(--brand-lotus, #b33b65); outline-offset: 1px; }
  button.primary { background: var(--brand-peacock, #006b63); border-color: var(--brand-peacock, #006b63); color: #fff; }
  @media (max-width: 600px) {
    :host { align-items: flex-end; padding: 0; }
    .card { width: 100%; max-height: 92vh; border-radius: 14px 14px 0 0; }
    .grid-2 { grid-template-columns: 1fr; }
    footer button { flex: 1; }
  }
`;
