import { Injectable } from '@angular/core';
import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFNumber,
  PDFRef,
  PDFString,
  StandardFonts,
} from 'pdf-lib';
import type * as Forge from 'node-forge';

type ForgeModule = typeof Forge;

/** Reserved bytes for the PKCS#7 blob; certificate chains up to ~14 kB fit. */
export const SIGNATURE_CONTENTS_BYTES = 16384;
export const MAX_SIGNING_PDF_BYTES = 150 * 1024 * 1024;
const BYTE_RANGE_PLACEHOLDER = '**********';
const OID_MESSAGE_DIGEST = '1.2.840.113549.1.9.4';
const OID_SIGNING_TIME = '1.2.840.113549.1.9.5';
const DIGESTS: Record<string, 'sha1' | 'sha256' | 'sha384' | 'sha512'> = {
  '1.3.14.3.2.26': 'sha1',
  '2.16.840.1.101.3.4.2.1': 'sha256',
  '2.16.840.1.101.3.4.2.2': 'sha384',
  '2.16.840.1.101.3.4.2.3': 'sha512',
};

export type SignaturePosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

export interface SigningCertificate {
  subjectName: string;
  issuerName: string;
  validFrom: Date;
  validTo: Date;
  expired: boolean;
  notYetValid: boolean;
  /** Opaque forge objects; kept only for the signing call and then dropped. */
  privateKey: unknown;
  certificate: unknown;
  chain: unknown[];
}

export interface SignOptions {
  signerName?: string;
  reason?: string;
  location?: string;
  contactInfo?: string;
  signingTime?: Date;
  visible?: { page: number; position: SignaturePosition } | null;
}

export type SignatureStatus = 'valid' | 'modified' | 'invalid' | 'unsupported';

export interface PdfSignatureInfo {
  fieldName: string;
  signerName: string;
  issuerName: string;
  signingTime: Date | null;
  reason: string;
  location: string;
  validFrom: Date | null;
  validTo: Date | null;
  subFilter: string;
  status: SignatureStatus;
  statusText: string;
  coversWholeDocument: boolean;
}

export class SignatureError extends Error {}

/**
 * PKCS#12 certificate signing (adbe.pkcs7.detached, SHA-256) and signature verification.
 * node-forge is loaded on first use only, so it never weighs on the initial download.
 */
@Injectable({ providedIn: 'root' })
export class PdfSignatureService {
  /** Replaced in tests; keeps node-forge out of eagerly loaded chunks. */
  loadForge: () => Promise<ForgeModule> = async () => {
    const module: any = await import('node-forge');
    return (module.default ?? module) as ForgeModule;
  };

  async readCertificate(p12: Uint8Array, password: string): Promise<SigningCertificate> {
    const forge = await this.loadForge();
    let asn1: Forge.asn1.Asn1;
    try {
      asn1 = forge.asn1.fromDer(toBinary(p12));
    } catch {
      throw new SignatureError('This file is not a valid .pfx or .p12 certificate.');
    }
    let p12Store: Forge.pkcs12.Pkcs12Pfx;
    try {
      p12Store = forge.pkcs12.pkcs12FromAsn1(asn1, false, password);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/MAC|password|decrypt/i.test(message)) throw new SignatureError('The certificate password is incorrect.');
      if (/OID is not RSA|public key/i.test(message)) throw new SignatureError('Only RSA certificates are supported for signing.');
      throw new SignatureError('This certificate file could not be read. Export it again as .pfx/.p12 with its private key.');
    }

    const keyBags = [
      ...(p12Store.getBags({ bagType: forge.pki.oids['pkcs8ShroudedKeyBag'] })[forge.pki.oids['pkcs8ShroudedKeyBag']] ?? []),
      ...(p12Store.getBags({ bagType: forge.pki.oids['keyBag'] })[forge.pki.oids['keyBag']] ?? []),
    ];
    const certificates = (p12Store.getBags({ bagType: forge.pki.oids['certBag'] })[forge.pki.oids['certBag']] ?? [])
      .map(bag => bag.cert)
      .filter((cert): cert is Forge.pki.Certificate => !!cert);
    if (!keyBags.length) throw new SignatureError('This certificate file has no private key, so it cannot sign. Export it again including the private key.');
    const rsaKeys = keyBags.map(bag => bag.key as Forge.pki.rsa.PrivateKey | undefined).filter((key): key is Forge.pki.rsa.PrivateKey => !!key?.n);
    if (!rsaKeys.length) throw new SignatureError('Only RSA certificates are supported for signing.');
    if (!certificates.length) throw new SignatureError('This certificate file has no certificate.');

    let privateKey: Forge.pki.rsa.PrivateKey | undefined;
    let certificate: Forge.pki.Certificate | undefined;
    for (const key of rsaKeys) {
      certificate = certificates.find(cert => {
        const publicKey = cert.publicKey as Forge.pki.rsa.PublicKey;
        return !!publicKey?.n && publicKey.n.equals(key.n) && publicKey.e.equals(key.e);
      });
      if (certificate) {
        privateKey = key;
        break;
      }
    }
    if (!privateKey || !certificate) throw new SignatureError('The private key does not match any certificate in this file.');

    const now = Date.now();
    return {
      subjectName: certName(certificate.subject),
      issuerName: certName(certificate.issuer),
      validFrom: certificate.validity.notBefore,
      validTo: certificate.validity.notAfter,
      expired: certificate.validity.notAfter.getTime() < now,
      notYetValid: certificate.validity.notBefore.getTime() > now,
      privateKey,
      certificate,
      chain: certificates.filter(cert => cert !== certificate),
    };
  }

  async sign(pdfBytes: Uint8Array, identity: SigningCertificate, options: SignOptions = {}): Promise<Uint8Array> {
    if (pdfBytes.byteLength > MAX_SIGNING_PDF_BYTES) throw new SignatureError('This PDF is too large to sign in the browser (limit 150 MB).');
    const forge = await this.loadForge();
    const signingTime = options.signingTime ?? new Date();
    const signerName = (options.signerName || identity.subjectName).trim();
    const prepared = await this.addSignaturePlaceholder(pdfBytes, { ...options, signerName, signingTime });

    const { bytes, contentsStart, contentsEnd } = prepared;
    const byteRange = [0, contentsStart, contentsEnd, bytes.length - contentsEnd];
    const rangeText = encodeLatin1(`/ByteRange [${byteRange.join(' ')}]`);
    if (rangeText.length > prepared.byteRangeLength) throw new SignatureError('The PDF is too large to sign.');
    bytes.fill(0x20, prepared.byteRangeStart, prepared.byteRangeStart + prepared.byteRangeLength);
    bytes.set(rangeText, prepared.byteRangeStart);

    const p7 = forge.pkcs7.createSignedData();
    const signedContent = forge.util.createBuffer();
    appendBinary(signedContent, bytes.subarray(0, contentsStart));
    appendBinary(signedContent, bytes.subarray(contentsEnd));
    p7.content = signedContent;
    const certificate = identity.certificate as Forge.pki.Certificate;
    p7.addCertificate(certificate);
    for (const cert of identity.chain as Forge.pki.Certificate[]) p7.addCertificate(cert);
    p7.addSigner({
      key: identity.privateKey as Forge.pki.rsa.PrivateKey,
      certificate,
      digestAlgorithm: forge.pki.oids['sha256'],
      authenticatedAttributes: [
        { type: forge.pki.oids['contentType'], value: forge.pki.oids['data'] },
        { type: forge.pki.oids['messageDigest'] },
        { type: forge.pki.oids['signingTime'], value: signingTime as unknown as string },
      ],
    });
    p7.sign({ detached: true });
    const hex = forge.util.bytesToHex(forge.asn1.toDer(p7.toAsn1()).getBytes());
    if (hex.length > SIGNATURE_CONTENTS_BYTES * 2) throw new SignatureError('The certificate chain is too large to embed in this signature.');
    bytes.set(encodeLatin1(hex.padEnd(SIGNATURE_CONTENTS_BYTES * 2, '0')), contentsStart + 1);
    return bytes;
  }

  async verify(pdfBytes: Uint8Array): Promise<PdfSignatureInfo[]> {
    let pdf: PDFDocument;
    try {
      pdf = await PDFDocument.load(pdfBytes, { ignoreEncryption: true, updateMetadata: false, throwOnInvalidObject: false });
    } catch {
      throw new SignatureError('This PDF could not be read to check signatures.');
    }
    const fieldNames = signatureFieldNames(pdf);
    const signatures: { ref: PDFRef; dict: PDFDict }[] = [];
    for (const [ref, object] of pdf.context.enumerateIndirectObjects()) {
      if (object instanceof PDFDict && object.get(PDFName.of('ByteRange')) && object.get(PDFName.of('Contents'))) {
        signatures.push({ ref, dict: object });
      }
    }
    if (!signatures.length) return [];
    const forge = await this.loadForge();
    return signatures.map(({ ref, dict }, index) => this.verifyOne(forge, pdfBytes, dict, fieldNames.get(ref.toString()) || `Signature ${index + 1}`));
  }

  private verifyOne(forge: ForgeModule, pdfBytes: Uint8Array, dict: PDFDict, fieldName: string): PdfSignatureInfo {
    const info: PdfSignatureInfo = {
      fieldName,
      signerName: readText(dict, 'Name'),
      issuerName: '',
      signingTime: readDate(dict, 'M'),
      reason: readText(dict, 'Reason'),
      location: readText(dict, 'Location'),
      validFrom: null,
      validTo: null,
      subFilter: dict.lookupMaybe(PDFName.of('SubFilter'), PDFName)?.decodeText() ?? '',
      status: 'unsupported',
      statusText: '',
      coversWholeDocument: false,
    };
    const unsupported = (why: string) => ({ ...info, status: 'unsupported' as const, statusText: `Unsupported signature format: ${why}.` });
    if (!['adbe.pkcs7.detached', 'ETSI.CAdES.detached'].includes(info.subFilter)) return unsupported(info.subFilter || 'unknown type');

    const range = (dict.lookupMaybe(PDFName.of('ByteRange'), PDFArray)?.asArray() ?? []).map(item => (item instanceof PDFNumber ? item.asNumber() : NaN));
    const [a, b, c, d] = range;
    if (range.length !== 4 || range.some(value => !Number.isInteger(value) || value < 0) || a !== 0 || b >= c || c + d > pdfBytes.length) {
      return { ...info, status: 'invalid', statusText: 'Invalid – the signed byte range is damaged.' };
    }
    if (pdfBytes[b] !== 0x3c || pdfBytes[c - 1] !== 0x3e) {
      return { ...info, status: 'invalid', statusText: 'Invalid – the signature does not line up with the file contents.' };
    }
    info.coversWholeDocument = c + d === pdfBytes.length;

    let signedData: any;
    let signerInfo: Forge.asn1.Asn1;
    try {
      const hex = latin1(pdfBytes.subarray(b + 1, c - 1)).replace(/[^0-9a-f]/gi, '');
      const der = forge.util.hexToBytes(hex);
      signedData = forge.pkcs7.messageFromAsn1(forge.asn1.fromDer(der, { parseAllBytes: false } as any));
      signerInfo = signedData.rawCapture?.signerInfos?.[0];
      if (!signerInfo) return unsupported('no signer information');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return unsupported(/RSA/i.test(message) ? 'only RSA certificates are supported' : 'the signature data could not be read');
    }

    const parts = signerInfo.value as Forge.asn1.Asn1[];
    const issuerAndSerial = parts[1]?.value as Forge.asn1.Asn1[];
    const serial = forge.util.createBuffer(issuerAndSerial?.[1]?.value as string).toHex();
    const certificates = signedData.certificates as Forge.pki.Certificate[];
    const certificate = certificates.find(cert => cert.serialNumber.replace(/^0+/, '') === serial.replace(/^0+/, '')) ?? certificates[0];
    if (!certificate) return unsupported('the signer certificate is not embedded');
    info.signerName ||= certName(certificate.subject);
    info.issuerName = certName(certificate.issuer);
    info.validFrom = certificate.validity.notBefore;
    info.validTo = certificate.validity.notAfter;

    const digestName = DIGESTS[forge.asn1.derToOid((parts[2]?.value as Forge.asn1.Asn1[])?.[0]?.value as string)];
    const attributes = parts.find(part => part.tagClass === forge.asn1.Class.CONTEXT_SPECIFIC && part.type === 0);
    const signature = parts.find((part, i) => i > 2 && part.tagClass === forge.asn1.Class.UNIVERSAL && part.type === forge.asn1.Type.OCTETSTRING);
    if (!digestName) return unsupported('unknown digest algorithm');
    if (!attributes || !signature) return unsupported('signatures without signed attributes');

    let messageDigest = '';
    for (const attribute of attributes.value as Forge.asn1.Asn1[]) {
      const [oid, values] = attribute.value as Forge.asn1.Asn1[];
      const type = forge.asn1.derToOid(oid.value as string);
      const value = (values.value as Forge.asn1.Asn1[])[0];
      if (type === OID_MESSAGE_DIGEST) messageDigest = value.value as string;
      if (type === OID_SIGNING_TIME && !info.signingTime) {
        info.signingTime = value.type === forge.asn1.Type.UTCTIME
          ? forge.asn1.utcTimeToDate(value.value as string)
          : forge.asn1.generalizedTimeToDate(value.value as string);
      }
    }

    const contentDigest = (forge.md as any)[digestName].create() as Forge.md.MessageDigest;
    updateDigest(contentDigest, pdfBytes.subarray(0, b));
    updateDigest(contentDigest, pdfBytes.subarray(c, c + d));
    const digestMatches = contentDigest.digest().getBytes() === messageDigest;

    let signatureMatches = false;
    try {
      const attributeSet = forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SET, true, attributes.value as Forge.asn1.Asn1[]);
      const attributeDigest = (forge.md as any)[digestName].create() as Forge.md.MessageDigest;
      attributeDigest.update(forge.asn1.toDer(attributeSet).getBytes());
      signatureMatches = (certificate.publicKey as Forge.pki.rsa.PublicKey).verify(attributeDigest.digest().getBytes(), signature.value as string);
    } catch {
      signatureMatches = false;
    }

    if (!signatureMatches) return { ...info, status: 'invalid', statusText: 'Invalid – the signature does not match the signer certificate.' };
    if (!digestMatches) return { ...info, status: 'modified', statusText: 'Changed after signing – the signed content no longer matches.' };
    if (!info.coversWholeDocument) {
      return { ...info, status: 'modified', statusText: 'Changed after signing – the signed version is intact, but content was added afterwards.' };
    }
    return { ...info, status: 'valid', statusText: 'Valid – the document has not been changed since it was signed.' };
  }

  private async addSignaturePlaceholder(pdfBytes: Uint8Array, options: SignOptions & { signerName: string; signingTime: Date }) {
    let pdf: PDFDocument;
    try {
      pdf = await PDFDocument.load(pdfBytes, { updateMetadata: false });
    } catch (error) {
      throw new SignatureError(/encrypt/i.test(String(error)) ? 'Password-protected PDFs cannot be signed.' : 'This PDF could not be prepared for signing.');
    }
    const context = pdf.context;
    const pages = pdf.getPages();
    const pageIndex = Math.min(pages.length, Math.max(1, options.visible?.page ?? 1)) - 1;
    const page = pages[pageIndex];

    const byteRange = PDFArray.withContext(context);
    byteRange.push(PDFNumber.of(0));
    byteRange.push(PDFName.of(BYTE_RANGE_PLACEHOLDER));
    byteRange.push(PDFName.of(BYTE_RANGE_PLACEHOLDER));
    byteRange.push(PDFName.of(BYTE_RANGE_PLACEHOLDER));
    const signature = context.obj({
      Type: 'Sig',
      Filter: 'Adobe.PPKLite',
      SubFilter: 'adbe.pkcs7.detached',
      ByteRange: byteRange,
      Contents: PDFHexString.of('0'.repeat(SIGNATURE_CONTENTS_BYTES * 2)),
      Name: PDFString.of(options.signerName),
      M: PDFString.fromDate(options.signingTime),
      ...(options.reason ? { Reason: PDFString.of(options.reason) } : {}),
      ...(options.location ? { Location: PDFString.of(options.location) } : {}),
      ...(options.contactInfo ? { ContactInfo: PDFString.of(options.contactInfo) } : {}),
    });
    const signatureRef = context.register(signature);

    let rect = [0, 0, 0, 0];
    let appearance: PDFRef | null = null;
    if (options.visible) {
      const box = page.getCropBox();
      const width = Math.min(220, box.width - 24);
      const height = Math.min(64, box.height - 24);
      const margin = Math.min(36, (box.width - width) / 2, (box.height - height) / 2);
      const left = options.visible.position.endsWith('left') ? box.x + margin : box.x + box.width - margin - width;
      const bottom = options.visible.position.startsWith('bottom') ? box.y + margin : box.y + box.height - margin - height;
      rect = [left, bottom, left + width, bottom + height];
      appearance = await this.createAppearance(pdf, width, height, [
        `Digitally signed by ${options.signerName}`,
        `Date: ${formatDate(options.signingTime)}`,
        ...(options.reason ? [`Reason: ${options.reason}`] : []),
        ...(options.location ? [`Location: ${options.location}`] : []),
      ]);
    }

    const fieldName = `Signature${signatureFieldNames(pdf).size + 1}`;
    const widget = context.obj({
      Type: 'Annot',
      Subtype: 'Widget',
      FT: 'Sig',
      Rect: rect,
      V: signatureRef,
      T: PDFString.of(fieldName),
      F: 132,
      P: page.ref,
      ...(appearance ? { AP: { N: appearance } } : {}),
    });
    const widgetRef = context.register(widget);
    page.node.addAnnot(widgetRef);
    const acroForm = pdf.catalog.getOrCreateAcroForm();
    acroForm.addField(widgetRef);
    acroForm.dict.set(PDFName.of('SigFlags'), PDFNumber.of(3));

    const bytes = await pdf.save({ useObjectStreams: false, addDefaultPage: false, updateFieldAppearances: false });
    const contentsMarker = encodeLatin1(`<${'0'.repeat(SIGNATURE_CONTENTS_BYTES * 2)}>`);
    const contentsStart = indexOf(bytes, contentsMarker);
    const rangeMarker = encodeLatin1(`/ByteRange [ 0 /${BYTE_RANGE_PLACEHOLDER} /${BYTE_RANGE_PLACEHOLDER} /${BYTE_RANGE_PLACEHOLDER} ]`);
    const byteRangeStart = indexOf(bytes, rangeMarker);
    if (contentsStart < 0 || byteRangeStart < 0) throw new SignatureError('This PDF could not be prepared for signing.');
    return { bytes, contentsStart, contentsEnd: contentsStart + contentsMarker.length, byteRangeStart, byteRangeLength: rangeMarker.length };
  }

  private async createAppearance(pdf: PDFDocument, width: number, height: number, lines: string[]): Promise<PDFRef> {
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const supported = new Set(font.getCharacterSet());
    const size = 8;
    const leading = 10;
    const maxChars = Math.floor((width - 12) / (size * 0.5));
    const text = lines.slice(0, Math.floor((height - 8) / leading)).map(line => {
      const safe = Array.from(line).map(char => (supported.has(char.codePointAt(0)!) ? char : '?')).join('');
      return safe.length > maxChars ? `${safe.slice(0, maxChars - 1)}…`.replace('…', '...') : safe;
    });
    const operators = [
      'q 0.94 0.98 0.97 rg', `0 0 ${width} ${height} re f`,
      '0 0.47 0.43 RG 1 w', `0.5 0.5 ${width - 1} ${height - 1} re S Q`,
      'BT', `/F1 ${size} Tf ${leading} TL 0.06 0.16 0.16 rg`, `6 ${height - 6 - size} Td`,
      ...text.map((line, index) => `${index ? 'T* ' : ''}${font.encodeText(line).toString()} Tj`),
      'ET',
    ].join('\n');
    const stream = pdf.context.stream(operators, {
      Type: 'XObject',
      Subtype: 'Form',
      BBox: [0, 0, width, height],
      Resources: { Font: { F1: font.ref } },
    });
    return pdf.context.register(stream);
  }
}

function signatureFieldNames(pdf: PDFDocument): Map<string, string> {
  const names = new Map<string, string>();
  const fields = pdf.catalog.getAcroForm()?.getAllFields() ?? [];
  for (const [field] of fields) {
    if (field.dict.lookupMaybe(PDFName.of('FT'), PDFName)?.decodeText() !== 'Sig') continue;
    const value = field.dict.get(PDFName.of('V'));
    if (value instanceof PDFRef) names.set(value.toString(), field.getFullyQualifiedName() ?? '');
  }
  return names;
}

function certName(name: Forge.pki.Certificate['subject']): string {
  return (name.getField('CN')?.value || name.getField('O')?.value || name.attributes.map(attribute => attribute.value).join(', ') || 'Unknown') as string;
}

function readText(dict: PDFDict, key: string): string {
  const value = dict.lookup(PDFName.of(key));
  return value instanceof PDFString || value instanceof PDFHexString ? value.decodeText() : '';
}

function readDate(dict: PDFDict, key: string): Date | null {
  const value = dict.lookup(PDFName.of(key));
  if (!(value instanceof PDFString || value instanceof PDFHexString)) return null;
  try {
    return value.decodeDate();
  } catch {
    return null;
  }
}

function formatDate(date: Date): string {
  return date.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
}

function toBinary(bytes: Uint8Array): string {
  let out = '';
  for (let index = 0; index < bytes.length; index += 0x8000) {
    out += String.fromCharCode.apply(null, Array.from(bytes.subarray(index, index + 0x8000)));
  }
  return out;
}

const latin1 = toBinary;

function appendBinary(buffer: Forge.util.ByteStringBuffer, bytes: Uint8Array): void {
  for (let index = 0; index < bytes.length; index += 0x8000) buffer.putBytes(toBinary(bytes.subarray(index, index + 0x8000)));
}

function updateDigest(digest: Forge.md.MessageDigest, bytes: Uint8Array): void {
  for (let index = 0; index < bytes.length; index += 0x10000) digest.update(toBinary(bytes.subarray(index, index + 0x10000)));
}

function encodeLatin1(text: string): Uint8Array {
  const out = new Uint8Array(text.length);
  for (let index = 0; index < text.length; index++) out[index] = text.charCodeAt(index) & 0xff;
  return out;
}

function indexOf(haystack: Uint8Array, needle: Uint8Array): number {
  const first = needle[0];
  outer: for (let index = haystack.indexOf(first); index >= 0 && index <= haystack.length - needle.length; index = haystack.indexOf(first, index + 1)) {
    for (let offset = 1; offset < needle.length; offset++) if (haystack[index + offset] !== needle[offset]) continue outer;
    return index;
  }
  return -1;
}
