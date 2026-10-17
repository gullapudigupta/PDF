import { Injectable } from '@angular/core';
import { PDFCheckBox, PDFDocument, PDFDropdown, PDFField, PDFRadioGroup, PDFTextField } from 'pdf-lib';

export type PdfFormFieldType = 'text' | 'checkbox' | 'radio' | 'dropdown' | 'unsupported';

export interface PdfFormField {
  name: string;
  type: PdfFormFieldType;
  value: string;
  options: string[];
  required: boolean;
}

export interface PdfFormFieldPlacement {
  name: string;
  type: 'text' | 'checkbox' | 'dropdown';
  pageNumber: number;
  viewportWidth: number;
  viewportHeight: number;
  rect: { x: number; y: number; width: number; height: number };
  options?: string[];
  required?: boolean;
}

export interface PdfFormData {
  schemaVersion: 1;
  fields: Array<{ name: string; type: Exclude<PdfFormFieldType, 'unsupported'>; value: string }>;
}

@Injectable({ providedIn: 'root' })
export class PdfFormService {
  async getFields(bytes: Uint8Array): Promise<PdfFormField[]> {
    const document = await PDFDocument.load(bytes);
    return document.getForm().getFields().map(field => {
      if (field instanceof PDFTextField) {
        return { name: field.getName(), type: 'text', value: field.getText() ?? '', options: [], required: field.isRequired() };
      }
      if (field instanceof PDFCheckBox) {
        return { name: field.getName(), type: 'checkbox', value: field.isChecked() ? 'true' : 'false', options: [], required: field.isRequired() };
      }
      if (field instanceof PDFRadioGroup) {
        return { name: field.getName(), type: 'radio', value: field.getSelected() ?? '', options: field.getOptions(), required: field.isRequired() };
      }
      if (field instanceof PDFDropdown) {
        return { name: field.getName(), type: 'dropdown', value: field.getSelected()[0] ?? '', options: field.getOptions(), required: field.isRequired() };
      }
      return { name: field.getName(), type: 'unsupported', value: '', options: [], required: field.isRequired() };
    });
  }

  async createField(bytes: Uint8Array, placement: PdfFormFieldPlacement): Promise<Uint8Array> {
    if (!placement.name.trim()) throw new Error('Form field name is required');
    if (placement.name.split('.').some(part => !part.trim())) throw new Error('Form field name contains an empty segment');
    if (!Number.isInteger(placement.pageNumber) || placement.pageNumber < 1) {
      throw new Error(`Invalid page number: ${placement.pageNumber}`);
    }
    if (placement.type === 'dropdown' && !placement.options?.length) {
      throw new Error('Dropdown fields require at least one option');
    }

    const document = await PDFDocument.load(bytes);
    if (placement.pageNumber > document.getPageCount()) throw new Error(`Invalid page number: ${placement.pageNumber}`);
    const form = document.getForm();
    if (form.getFieldMaybe(placement.name)) throw new Error(`Form field already exists: ${placement.name}`);
    const page = document.getPage(placement.pageNumber - 1);
    const position = this.toPageRectangle(page, placement.viewportWidth, placement.viewportHeight, placement.rect);
    const appearance = { ...position, borderWidth: 1 };

    if (placement.type === 'text') {
      const field = form.createTextField(placement.name);
      field.addToPage(page, appearance);
      if (placement.required) field.enableRequired();
    } else if (placement.type === 'checkbox') {
      const field = form.createCheckBox(placement.name);
      field.addToPage(page, appearance);
      if (placement.required) field.enableRequired();
    } else {
      const field = form.createDropdown(placement.name);
      const options = placement.options;
      if (!options?.length) throw new Error('Dropdown fields require at least one option');
      field.addOptions(options);
      field.addToPage(page, appearance);
      if (placement.required) field.enableRequired();
    }

    form.updateFieldAppearances();
    return new Uint8Array(await document.save());
  }

  async updateFieldDefinition(
    bytes: Uint8Array,
    name: string,
    definition: { required?: boolean; options?: string[] }
  ): Promise<Uint8Array> {
    const document = await PDFDocument.load(bytes);
    const form = document.getForm();
    const field = form.getFieldMaybe(name);
    if (!field) throw new Error(`Form field not found: ${name}`);
    if (definition.required !== undefined) {
      if (definition.required) field.enableRequired();
      else field.disableRequired();
    }
    if (definition.options !== undefined) {
      if (!(field instanceof PDFDropdown)) throw new Error(`Only dropdown fields accept options: ${name}`);
      const options = definition.options;
      if (!options.length) throw new Error('Dropdown fields require at least one option');
      field.setOptions(options);
      if (field.getSelected().some(value => !options.includes(value))) field.clear();
    }
    form.updateFieldAppearances();
    return new Uint8Array(await document.save());
  }

  async deleteField(bytes: Uint8Array, name: string): Promise<Uint8Array> {
    const document = await PDFDocument.load(bytes);
    const form = document.getForm();
    const field = form.getFieldMaybe(name);
    if (!field) throw new Error(`Form field not found: ${name}`);
    form.removeField(field);
    return new Uint8Array(await document.save());
  }

  async exportFormData(bytes: Uint8Array): Promise<string> {
    const fields = await this.getFields(bytes);
    const supportedFields: PdfFormData['fields'] = fields.flatMap(field => {
      if (field.type === 'unsupported') return [];
      return [{ name: field.name, type: field.type, value: field.value }];
    });
    const data: PdfFormData = {
      schemaVersion: 1,
      fields: supportedFields,
    };
    return JSON.stringify(data, null, 2);
  }

  async importFormData(bytes: Uint8Array, serializedData: string): Promise<Uint8Array> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(serializedData);
    } catch (error) {
      throw new Error(`Invalid form data JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (!parsed || typeof parsed !== 'object' || !('schemaVersion' in parsed) ||
      parsed.schemaVersion !== 1 || !('fields' in parsed) || !Array.isArray(parsed.fields)) {
      throw new Error('Unsupported form data document; expected schemaVersion 1 and a fields array');
    }

    const document = await PDFDocument.load(bytes);
    const form = document.getForm();
    const values = new Map<string, string>();
    for (const candidate of parsed.fields) {
      if (!candidate || typeof candidate !== 'object' ||
        !('name' in candidate) || typeof candidate.name !== 'string' ||
        !('type' in candidate) || typeof candidate.type !== 'string' ||
        !('value' in candidate) || typeof candidate.value !== 'string') {
        throw new Error('Invalid form data field; name, type, and value must be strings');
      }
      if (values.has(candidate.name)) throw new Error(`Duplicate form data field: ${candidate.name}`);
      const field = form.getFieldMaybe(candidate.name);
      if (!field) throw new Error(`Form field not found: ${candidate.name}`);
      const current = this.getFieldValue(field);
      if (current.type === 'unsupported' || candidate.type !== current.type) {
        throw new Error(`Form field type mismatch: ${candidate.name}`);
      }
      if (current.type === 'checkbox' && candidate.value !== 'true' && candidate.value !== 'false') {
        throw new Error(`Invalid checkbox value for ${candidate.name}`);
      }
      if ((current.type === 'radio' || current.type === 'dropdown') &&
        candidate.value !== '' && !current.options.includes(candidate.value)) {
        throw new Error(`Invalid option for form field ${candidate.name}: ${candidate.value}`);
      }
      values.set(candidate.name, candidate.value);
    }

    for (const [name, value] of values) {
      const field = form.getFieldMaybe(name);
      if (!field) throw new Error(`Form field not found: ${name}`);
      this.setFieldValue(field, name, value);
    }
    form.updateFieldAppearances();
    return new Uint8Array(await document.save());
  }

  async updateField(bytes: Uint8Array, name: string, value: string): Promise<Uint8Array> {
    if (!name.trim()) throw new Error('Form field name is required');
    const document = await PDFDocument.load(bytes);
    const form = document.getForm();
    const field = form.getFieldMaybe(name);
    if (!field) throw new Error(`Form field not found: ${name}`);

    this.setFieldValue(field, name, value);
    form.updateFieldAppearances();
    return new Uint8Array(await document.save());
  }

  private getFieldValue(field: PDFField): PdfFormField {
    if (field instanceof PDFTextField) {
      return { name: field.getName(), type: 'text', value: field.getText() ?? '', options: [], required: field.isRequired() };
    }
    if (field instanceof PDFCheckBox) {
      return { name: field.getName(), type: 'checkbox', value: field.isChecked() ? 'true' : 'false', options: [], required: field.isRequired() };
    }
    if (field instanceof PDFRadioGroup) {
      return { name: field.getName(), type: 'radio', value: field.getSelected() ?? '', options: field.getOptions(), required: field.isRequired() };
    }
    if (field instanceof PDFDropdown) {
      return { name: field.getName(), type: 'dropdown', value: field.getSelected()[0] ?? '', options: field.getOptions(), required: field.isRequired() };
    }
    return { name: field.getName(), type: 'unsupported', value: '', options: [], required: field.isRequired() };
  }

  private setFieldValue(
    field: PDFField,
    name: string,
    value: string
  ): void {
    if (field instanceof PDFTextField) {
      field.setText(value);
    } else if (field instanceof PDFCheckBox) {
      if (value === 'true') field.check();
      else if (value === 'false') field.uncheck();
      else throw new Error(`Invalid checkbox value for ${name}`);
    } else if (field instanceof PDFRadioGroup) {
      if (value) field.select(value);
      else field.clear();
    } else if (field instanceof PDFDropdown) {
      if (value) field.select(value);
      else field.clear();
    } else {
      throw new Error(`Unsupported form field type: ${name}`);
    }
  }

  private toPageRectangle(
    page: ReturnType<PDFDocument['getPage']>,
    viewportWidth: number,
    viewportHeight: number,
    rect: PdfFormFieldPlacement['rect']
  ): { x: number; y: number; width: number; height: number } {
    if (![viewportWidth, viewportHeight, rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) ||
      viewportWidth <= 0 || viewportHeight <= 0 || rect.x < 0 || rect.y < 0 ||
      rect.width <= 0 || rect.height <= 0 ||
      rect.x + rect.width > viewportWidth || rect.y + rect.height > viewportHeight) {
      throw new Error('Form field rectangle must be positive and within the page viewport');
    }

    const cropBox = page.getCropBox();
    const rotation = ((page.getRotation().angle % 360) + 360) % 360;
    if (rotation === 0 || rotation === 180) {
      const scaleX = cropBox.width / viewportWidth;
      const scaleY = cropBox.height / viewportHeight;
      return {
        x: rotation === 0
          ? cropBox.x + rect.x * scaleX
          : cropBox.x + cropBox.width - (rect.x + rect.width) * scaleX,
        y: rotation === 0
          ? cropBox.y + cropBox.height - (rect.y + rect.height) * scaleY
          : cropBox.y + rect.y * scaleY,
        width: rect.width * scaleX,
        height: rect.height * scaleY,
      };
    }
    if (rotation === 90 || rotation === 270) {
      const scaleX = cropBox.height / viewportWidth;
      const scaleY = cropBox.width / viewportHeight;
      return {
        x: rotation === 90
          ? cropBox.x + rect.y * scaleY
          : cropBox.x + cropBox.width - (rect.y + rect.height) * scaleY,
        y: rotation === 90
          ? cropBox.y + rect.x * scaleX
          : cropBox.y + cropBox.height - (rect.x + rect.width) * scaleX,
        width: rect.height * scaleY,
        height: rect.width * scaleX,
      };
    }
    throw new Error(`Unsupported page rotation for form field placement: ${rotation}`);
  }
}
