import { Injectable } from '@angular/core';
import { PDFDocument } from '@cantoo/pdf-lib';

export interface PdfMetadata {
  title: string;
  author: string;
  subject: string;
  keywords: string;
}

export type PdfPermissionPreset = 'view' | 'print' | 'forms' | 'unrestricted';

export interface PdfProtectionOptions {
  userPassword: string;
  ownerPassword: string;
  permissionPreset: PdfPermissionPreset;
}

const permissionPresets = {
  view: {
    printing: false,
    modifying: false,
    copying: false,
    annotating: false,
    fillingForms: false,
    contentAccessibility: true,
    documentAssembly: false,
  },
  print: {
    printing: 'highResolution',
    modifying: false,
    copying: false,
    annotating: false,
    fillingForms: false,
    contentAccessibility: true,
    documentAssembly: false,
  },
  forms: {
    printing: 'lowResolution',
    modifying: false,
    copying: false,
    annotating: false,
    fillingForms: true,
    contentAccessibility: true,
    documentAssembly: false,
  },
  unrestricted: {
    printing: 'highResolution',
    modifying: true,
    copying: true,
    annotating: true,
    fillingForms: true,
    contentAccessibility: true,
    documentAssembly: true,
  },
} as const;

@Injectable({ providedIn: 'root' })
export class PdfSecurityService {
  async getMetadata(bytes: Uint8Array): Promise<PdfMetadata> {
    const document = await PDFDocument.load(bytes);
    return {
      title: document.getTitle() ?? '',
      author: document.getAuthor() ?? '',
      subject: document.getSubject() ?? '',
      keywords: document.getKeywords() ?? '',
    };
  }

  async updateMetadata(bytes: Uint8Array, metadata: PdfMetadata): Promise<Uint8Array> {
    const document = await PDFDocument.load(bytes);
    document.setTitle(metadata.title);
    document.setAuthor(metadata.author);
    document.setSubject(metadata.subject);
    const keywords = metadata.keywords.split(',').map(keyword => keyword.trim()).filter(Boolean).join(', ');
    document.setKeywords(keywords ? [keywords] : []);
    document.setModificationDate(new Date());
    return new Uint8Array(await document.save());
  }

  async protect(bytes: Uint8Array, options: PdfProtectionOptions): Promise<Uint8Array> {
    if (options.userPassword.trim().length < 8 || options.ownerPassword.trim().length < 8) {
      throw new Error('User and owner passwords must each be at least 8 characters');
    }
    if (options.userPassword === options.ownerPassword) {
      throw new Error('User and owner passwords must be different');
    }

    const document = await PDFDocument.load(bytes);
    document.encrypt({
      userPassword: options.userPassword,
      ownerPassword: options.ownerPassword,
      permissions: permissionPresets[options.permissionPreset],
      algorithm: 'AES-256',
    });
    return new Uint8Array(await document.save());
  }
}
