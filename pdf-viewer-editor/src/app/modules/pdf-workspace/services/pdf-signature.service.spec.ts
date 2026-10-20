import * as forge from 'node-forge';
import { PDFDocument, PDFName, StandardFonts } from 'pdf-lib';
import { PdfSignatureService, SignatureError } from './pdf-signature.service';

interface TestIdentity { p12: Uint8Array; cert: forge.pki.Certificate }

function makeIdentity(options: { password: string; commonName: string; expired?: boolean; withKey?: boolean }): TestIdentity {
  const keys = forge.pki.rsa.generateKeyPair({ bits: 1024, e: 0x10001 });
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01' + forge.util.bytesToHex(forge.random.getBytesSync(8));
  const now = new Date();
  cert.validity.notBefore = new Date(now.getTime() - (options.expired ? 3 : 1) * 86400000 * 365);
  cert.validity.notAfter = new Date(now.getTime() + (options.expired ? -1 : 1) * 86400000 * 365);
  const attrs = [{ name: 'commonName', value: options.commonName }, { name: 'organizationName', value: 'Anirdeshya Innovation Private Limited' }];
  cert.setSubject(attrs);
  cert.setIssuer([{ name: 'commonName', value: 'Anirdeshya Test CA' }]);
  cert.sign(keys.privateKey, forge.md.sha256.create());
  const asn1 = forge.pkcs12.toPkcs12Asn1(options.withKey === false ? null : keys.privateKey, [cert], options.password, { algorithm: '3des' });
  const der = forge.asn1.toDer(asn1).getBytes();
  return { p12: Uint8Array.from(der, char => char.charCodeAt(0)), cert };
}

async function samplePdf(pages = 2): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (let index = 0; index < pages; index++) {
    const page = pdf.addPage([595, 842]);
    page.drawText(`Contract page ${index + 1}`, { x: 72, y: 760, size: 18, font });
  }
  return pdf.save();
}

describe('PdfSignatureService', () => {
  let service: PdfSignatureService;
  let identity: TestIdentity;
  const password = 'Test-Pass-123';

  beforeAll(() => {
    identity = makeIdentity({ password, commonName: 'Priya Sharma' });
  });

  beforeEach(() => {
    service = new PdfSignatureService();
  });

  it('reads an RSA PKCS#12 certificate and rejects wrong passwords, non-certificates and files without a key', async () => {
    const certificate = await service.readCertificate(identity.p12, password);
    expect(certificate.subjectName).toBe('Priya Sharma');
    expect(certificate.issuerName).toBe('Anirdeshya Test CA');
    expect(certificate.expired).toBeFalse();

    await expectAsync(service.readCertificate(identity.p12, 'wrong')).toBeRejectedWithError(SignatureError, 'The certificate password is incorrect.');
    await expectAsync(service.readCertificate(new TextEncoder().encode('not a certificate'), password))
      .toBeRejectedWithError(SignatureError, 'This file is not a valid .pfx or .p12 certificate.');
    const noKey = makeIdentity({ password, commonName: 'No Key', withKey: false });
    await expectAsync(service.readCertificate(noKey.p12, password)).toBeRejectedWithError(SignatureError, /no private key/);
  });

  it('flags expired certificates so the dialog can warn', async () => {
    const expired = makeIdentity({ password, commonName: 'Old Cert', expired: true });
    const certificate = await service.readCertificate(expired.p12, password);
    expect(certificate.expired).toBeTrue();
  });

  it('signs with an Adobe-compatible detached PKCS#7 signature that verifies as valid', async () => {
    const certificate = await service.readCertificate(identity.p12, password);
    const original = await samplePdf();
    const signingTime = new Date('2026-01-15T10:30:00Z');
    const signed = await service.sign(original, certificate, {
      reason: 'I approve this contract', location: 'Hyderabad', signingTime, visible: { page: 2, position: 'bottom-right' },
    });

    const text = new TextDecoder('latin1').decode(signed);
    expect(text).toContain('/Filter /Adobe.PPKLite');
    expect(text).toContain('/SubFilter /adbe.pkcs7.detached');
    expect(text).toMatch(/\/SigFlags 3/);
    expect(text).not.toContain('**********');
    const range = text.match(/\/ByteRange \[(\d+) (\d+) (\d+) (\d+)\]/)!.slice(1).map(Number);
    expect(range[0]).toBe(0);
    expect(range[2] + range[3]).toBe(signed.length);

    const reloaded = await PDFDocument.load(signed);
    expect(reloaded.getPageCount()).toBe(2);
    const widgets = reloaded.getPage(1).node.Annots()?.asArray() ?? [];
    expect(widgets.length).toBe(1);
    expect(reloaded.getPage(0).node.Annots()?.size() ?? 0).toBe(0);
    expect(reloaded.catalog.getAcroForm()?.getAllFields().length).toBe(1);

    const [result] = await service.verify(signed);
    expect(result).toEqual(jasmine.objectContaining({
      fieldName: 'Signature1', signerName: 'Priya Sharma', issuerName: 'Anirdeshya Test CA', reason: 'I approve this contract',
      location: 'Hyderabad', status: 'valid', coversWholeDocument: true, subFilter: 'adbe.pkcs7.detached',
    }));
    expect(result.signingTime?.toISOString()).toBe(signingTime.toISOString());
    expect(Math.floor(result.validTo!.getTime() / 1000)).toBe(Math.floor(identity.cert.validity.notAfter.getTime() / 1000));
  });

  it('detects edits inside the signed bytes and content appended after signing', async () => {
    const certificate = await service.readCertificate(identity.p12, password);
    const signed = await service.sign(await samplePdf(1), certificate, { reason: 'Approval' });

    // Byte 10 is in the binary comment after the %PDF header, inside the signed range.
    const tampered = signed.slice();
    tampered[10] = tampered[10] === 0x41 ? 0x42 : 0x41;
    expect((await service.verify(tampered))[0].status).toBe('modified');

    const appended = new Uint8Array(signed.length + 20);
    appended.set(signed);
    appended.set(new TextEncoder().encode('\n% appended later\n'), signed.length);
    const [afterAppend] = await service.verify(appended);
    expect(afterAppend.status).toBe('modified');
    expect(afterAppend.coversWholeDocument).toBeFalse();
  });

  it('reports a forged signature as invalid', async () => {
    const certificate = await service.readCertificate(identity.p12, password);
    const signed = await service.sign(await samplePdf(1), certificate);
    const text = new TextDecoder('latin1').decode(signed);
    const [, b, c] = text.match(/\/ByteRange \[(\d+) (\d+) (\d+) (\d+)\]/)!.slice(1).map(Number);
    const hex = text.slice(b + 1, c - 1).replace(/0+$/, '');
    const forged = signed.slice();
    // Flip one hex digit of the RSA signature, which ends the DER blob.
    const position = b + 1 + hex.length - 10;
    forged[position] = forged[position] === 0x61 ? 0x62 : 0x61;
    expect((await service.verify(forged))[0].status).toBe('invalid');
  });

  it('returns no signatures for an unsigned PDF and never loads forge for it', async () => {
    const load = spyOn(service, 'loadForge').and.callThrough();
    expect(await service.verify(await samplePdf(1))).toEqual([]);
    expect(load).not.toHaveBeenCalled();
  });
});
