import { TestBed } from '@angular/core/testing';
import { PDFDocument } from 'pdf-lib';
import { PdfEditSerializationService } from './pdf-edit-serialization.service';

import { PdfFormService } from './pdf-form.service';

describe('PdfFormService', () => {
  let service: PdfFormService;

  beforeEach(() => {
    service = TestBed.inject(PdfFormService);
  });

  async function createFormPdf(): Promise<Uint8Array> {
    const document = await PDFDocument.create();
    const page = document.addPage([400, 500]);
    const form = document.getForm();
    const nameField = form.createTextField('applicant.name');
    nameField.setText('Old name');
    nameField.addToPage(page, { x: 20, y: 450, width: 150, height: 20 });
    const dateField = form.createTextField('applicant.date');
    dateField.setText('2026-01-01');
    dateField.addToPage(page, { x: 20, y: 420, width: 150, height: 20 });
    const consentField = form.createCheckBox('applicant.consent');
    consentField.addToPage(page, { x: 20, y: 390, width: 12, height: 12 });
    consentField.check();
    const radio = form.createRadioGroup('applicant.choice');
    radio.addOptionToPage('first', page, { x: 20, y: 20, width: 12, height: 12 });
    radio.addOptionToPage('second', page, { x: 40, y: 20, width: 12, height: 12 });
    radio.select('first');
    const dropdown = form.createDropdown('applicant.country');
    dropdown.addOptions(['CA', 'US']);
    dropdown.addToPage(page, { x: 20, y: 350, width: 100, height: 20 });
    dropdown.select('CA');
    return new Uint8Array(await document.save());
  }

  it('detects supported interactive fields and current values', async () => {
    const fields = await service.getFields(await createFormPdf());

    expect(fields).toEqual([
      { name: 'applicant.name', type: 'text', value: 'Old name', options: [], required: false },
      { name: 'applicant.date', type: 'text', value: '2026-01-01', options: [], required: false },
      { name: 'applicant.consent', type: 'checkbox', value: 'true', options: [], required: false },
      { name: 'applicant.choice', type: 'radio', value: 'first', options: ['first', 'second'], required: false },
      { name: 'applicant.country', type: 'dropdown', value: 'CA', options: ['CA', 'US'], required: false },
    ]);
  });

  it('updates text, date, checkbox, radio, and dropdown values in saved PDF bytes', async () => {
    let bytes = await createFormPdf();
    bytes = await service.updateField(bytes, 'applicant.name', 'Updated name');
    bytes = await service.updateField(bytes, 'applicant.date', '2026-02-03');
    bytes = await service.updateField(bytes, 'applicant.consent', 'false');
    bytes = await service.updateField(bytes, 'applicant.choice', 'second');
    bytes = await service.updateField(bytes, 'applicant.country', 'US');

    const fields = await service.getFields(bytes);
    expect(fields.find(field => field.name === 'applicant.name')?.value).toBe('Updated name');
    expect(fields.find(field => field.name === 'applicant.date')?.value).toBe('2026-02-03');
    expect(fields.find(field => field.name === 'applicant.consent')?.value).toBe('false');
    expect(fields.find(field => field.name === 'applicant.choice')?.value).toBe('second');
    expect(fields.find(field => field.name === 'applicant.country')?.value).toBe('US');
  });

  it('reports unknown field names and invalid checkbox values', async () => {
    const bytes = await createFormPdf();

    await expectAsync(service.updateField(bytes, 'missing', 'value')).toBeRejectedWithError('Form field not found: missing');
    await expectAsync(service.updateField(bytes, 'applicant.consent', 'checked')).toBeRejectedWithError('Invalid checkbox value for applicant.consent');
  });

  it('creates fields, edits required/options settings, and deletes fields', async () => {
    const bytes = await createFormPdf();
    const created = await service.createField(bytes, {
      name: 'applicant.notes',
      type: 'text',
      pageNumber: 1,
      viewportWidth: 400,
      viewportHeight: 500,
      rect: { x: 40, y: 50, width: 150, height: 24 },
      required: true,
    });
    const withCreated = await PDFDocument.load(created);
    expect(withCreated.getForm().getTextField('applicant.notes').isRequired()).toBeTrue();

    const defined = await service.updateFieldDefinition(created, 'applicant.country', {
      required: true,
      options: ['US', 'MX'],
    });
    const withDefinition = await PDFDocument.load(defined);
    expect(withDefinition.getForm().getDropdown('applicant.country').isRequired()).toBeTrue();
    expect(withDefinition.getForm().getDropdown('applicant.country').getOptions()).toEqual(['US', 'MX']);

    const removed = await service.deleteField(defined, 'applicant.notes');
    expect((await service.getFields(removed)).some(field => field.name === 'applicant.notes')).toBeFalse();
  });

  it('rejects invalid field placements and empty dropdown choices', async () => {
    const bytes = await createFormPdf();
    const placement = {
      name: 'applicant.newField',
      type: 'dropdown' as const,
      pageNumber: 1,
      viewportWidth: 400,
      viewportHeight: 500,
      rect: { x: 390, y: 490, width: 20, height: 20 },
      options: [],
    };
    await expectAsync(service.createField(bytes, placement)).toBeRejectedWithError('Dropdown fields require at least one option');
    await expectAsync(service.createField(bytes, { ...placement, options: ['A'] }))
      .toBeRejectedWithError('Form field rectangle must be positive and within the page viewport');
  });

  it('exports and imports versioned JSON while preserving form fields through PDF serialization', async () => {
    const original = await createFormPdf();
    const exported = await service.exportFormData(original);
    const data = JSON.parse(exported);
    expect(data.schemaVersion).toBe(1);
    expect(data.fields.length).toBe(5);
    data.fields.find((field: { name: string }) => field.name === 'applicant.name').value = 'Imported name';
    data.fields.find((field: { name: string }) => field.name === 'applicant.consent').value = 'false';
    const imported = await service.importFormData(original, JSON.stringify(data));
    const serializer = TestBed.inject(PdfEditSerializationService);
    const saved = await serializer.flattenEdits(imported, 1, 400, 500, [{
      type: 'text',
      x: 10,
      y: 10,
      width: 100,
      height: 20,
      label: 'Saved overlay',
      text: 'Saved overlay',
    }], []);
    const savedDocument = await PDFDocument.load(saved);
    expect(savedDocument.getForm().getTextField('applicant.name').getText()).toBe('Imported name');
    expect(savedDocument.getForm().getCheckBox('applicant.consent').isChecked()).toBeFalse();
  });

  it('rejects invalid or incompatible JSON data without modifying the source document', async () => {
    const original = await createFormPdf();
    await expectAsync(service.importFormData(original, '{bad json'))
      .toBeRejectedWithError(/^Invalid form data JSON:/);
    await expectAsync(service.importFormData(original, JSON.stringify({
      schemaVersion: 2,
      fields: [],
    }))).toBeRejectedWithError('Unsupported form data document; expected schemaVersion 1 and a fields array');
    await expectAsync(service.importFormData(original, JSON.stringify({
      schemaVersion: 1,
      fields: [
        { name: 'applicant.name', type: 'text', value: 'Changed' },
        { name: 'applicant.country', type: 'dropdown', value: 'Invalid' },
      ],
    }))).toBeRejectedWithError('Invalid option for form field applicant.country: Invalid');
    expect((await service.getFields(original)).find(field => field.name === 'applicant.name')?.value).toBe('Old name');
  });
});
