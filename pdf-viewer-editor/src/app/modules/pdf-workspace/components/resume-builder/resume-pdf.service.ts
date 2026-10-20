import { Injectable } from '@angular/core';
import { PageSizes, PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from 'pdf-lib';
import {
  ResumeData,
  ResumePageSize,
  ResumeTemplate,
  ResumeTemplateId,
  bulletLines,
  contactLine,
  dateRange,
  joinParts,
  resumeTemplate,
} from './resume.model';

interface Fonts {
  regular: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
}

interface Segment {
  text: string;
  font: PDFFont;
}

const REPLACEMENTS: Record<string, string> = {
  '\t': ' ', '\u00A0': ' ', '\u2010': '-', '\u2011': '-', '\u2012': '-', '\u2015': '-', '\u2212': '-',
  '\u2192': '->', '\u2190': '<-', '\u2264': '<=', '\u2265': '>=', '\u2248': '~', '\u2713': '', '\u2714': '',
  '\u25CF': '\u2022', '\u25AA': '\u2022', '\u25E6': '\u2022', '\u2023': '\u2022', '\u00B7': '\u2022',
};

/**
 * Renders resume data into an ATS-friendly, single-column PDF with real text using
 * standard PDF fonts (no embedded images or tables).
 */
@Injectable({ providedIn: 'root' })
export class ResumePdfService {
  async render(data: ResumeData, templateId: ResumeTemplateId, pageSize: ResumePageSize): Promise<Uint8Array> {
    const template = resumeTemplate(templateId);
    const pdf = await PDFDocument.create();
    const fonts: Fonts = template.font === 'times'
      ? {
        regular: await pdf.embedFont(StandardFonts.TimesRoman),
        bold: await pdf.embedFont(StandardFonts.TimesRomanBold),
        italic: await pdf.embedFont(StandardFonts.TimesRomanItalic),
      }
      : {
        regular: await pdf.embedFont(StandardFonts.Helvetica),
        bold: await pdf.embedFont(StandardFonts.HelveticaBold),
        italic: await pdf.embedFont(StandardFonts.HelveticaOblique),
      };
    const name = data.contact.name.trim() || 'Resume';
    pdf.setTitle(`${name} - Resume`);
    pdf.setAuthor(name);
    pdf.setSubject(data.targetRole.trim() || data.contact.headline.trim() || 'Resume');
    pdf.setKeywords(data.skills.split(/[,\n;|:]+/).map(item => item.trim()).filter(Boolean).slice(0, 30));
    pdf.setCreator('Anirdeshya PDF Resume Builder');
    pdf.setProducer('Anirdeshya Innovation Private Limited');
    new ResumeWriter(pdf, fonts, template, pageSize === 'a4' ? PageSizes.A4 : PageSizes.Letter).write(data);
    return pdf.save();
  }
}

class ResumeWriter {
  private page!: PDFPage;
  private y = 0;
  private readonly width: number;
  private readonly height: number;
  private readonly left: number;
  private readonly contentWidth: number;
  private readonly cache = new Map<PDFFont, Map<string, boolean>>();
  private readonly text = rgb(0.13, 0.13, 0.15);
  private readonly muted = rgb(0.33, 0.35, 0.4);
  private readonly accent;

  constructor(private pdf: PDFDocument, private fonts: Fonts, private t: ResumeTemplate, size: [number, number]) {
    [this.width, this.height] = size;
    this.left = t.margin;
    this.contentWidth = this.width - t.margin * 2;
    this.accent = rgb(...t.accent);
    this.newPage();
  }

  write(data: ResumeData): void {
    this.header(data);
    if (data.summary.trim()) {
      this.heading('Professional Summary');
      this.paragraph([{ text: data.summary.trim().replace(/\s*\n\s*/g, ' '), font: this.fonts.regular }]);
    }
    const experience = data.experience.filter(item => item.title.trim() || item.company.trim() || item.bullets.trim());
    if (experience.length) {
      this.heading('Experience');
      experience.forEach((item, index) => {
        if (index) this.y -= this.t.sectionGap * 0.45;
        this.entry(item.title, dateRange(item.start, item.end), joinParts(item.company, item.location), bulletLines(item.bullets));
      });
    }
    const education = data.education.filter(item => item.degree.trim() || item.school.trim());
    if (education.length) {
      this.heading('Education');
      education.forEach((item, index) => {
        if (index) this.y -= this.t.sectionGap * 0.35;
        this.entry(item.degree || item.school, dateRange(item.start, item.end),
          joinParts(item.degree ? item.school : '', item.location), [], item.details.split(/\r?\n/).map(line => line.trim()).filter(Boolean));
      });
    }
    if (data.skills.trim()) {
      this.heading('Skills');
      for (const line of data.skills.split(/\r?\n/).map(item => item.trim()).filter(Boolean)) {
        const match = /^([^:]{1,40}):\s*(.+)$/.exec(line);
        this.paragraph(match
          ? [{ text: `${match[1]}: `, font: this.fonts.bold }, { text: match[2], font: this.fonts.regular }]
          : [{ text: line, font: this.fonts.regular }]);
      }
    }
    const certifications = bulletLines(data.certifications);
    if (certifications.length) {
      this.heading('Certifications');
      certifications.forEach(line => this.bullet(line));
    }
    const projects = data.projects.filter(item => item.name.trim() || item.details.trim());
    if (projects.length) {
      this.heading('Projects');
      projects.forEach((item, index) => {
        if (index) this.y -= this.t.sectionGap * 0.35;
        this.entry(item.name, '', '', bulletLines(item.details));
      });
    }
  }

  private get lineHeight(): number {
    return this.t.bodySize + this.t.lineGap;
  }

  private newPage(): void {
    this.page = this.pdf.addPage([this.width, this.height]);
    this.y = this.height - this.t.margin;
  }

  private ensure(space: number): void {
    if (this.y - space < this.t.margin) this.newPage();
  }

  private header(data: ResumeData): void {
    const center = this.t.align === 'center';
    const name = this.clean(data.contact.name.trim() || 'Your Name', this.fonts.bold);
    const nameColor = this.t.id === 'modern' || this.t.id === 'professional' ? this.accent : this.text;
    this.y -= this.t.nameSize * 0.8;
    this.drawLine([{ text: name, font: this.fonts.bold }], this.t.nameSize, nameColor, center);
    this.y -= this.t.nameSize * 0.45;
    const headline = data.contact.headline.trim() || data.targetRole.trim();
    if (headline) {
      for (const line of this.wrap([{ text: headline, font: this.fonts.regular }], this.t.bodySize + 1.5, this.contentWidth)) {
        this.y -= this.t.bodySize + 1.5;
        this.drawLine(line, this.t.bodySize + 1.5, this.muted, center);
        this.y -= 2;
      }
    }
    const contact = contactLine(data.contact);
    if (contact) {
      for (const line of this.wrap([{ text: contact, font: this.fonts.regular }], this.t.bodySize - 0.5, this.contentWidth)) {
        this.y -= this.t.bodySize + 1;
        this.drawLine(line, this.t.bodySize - 0.5, this.text, center);
      }
    }
    if (this.t.id === 'modern') {
      this.y -= 8;
      this.page.drawRectangle({ x: this.left, y: this.y, width: this.contentWidth, height: 1.6, color: this.accent });
    }
    this.y -= 4;
  }

  private heading(title: string): void {
    const size = this.t.headingSize;
    this.ensure(size + this.t.sectionGap + this.lineHeight * 3);
    this.y -= this.t.sectionGap + size;
    const text = this.t.uppercaseHeadings ? title.toUpperCase() : title;
    const color = this.t.headingStyle === 'rule' || this.t.headingStyle === 'plain' ? this.text : this.accent;
    let x = this.left;
    if (this.t.headingStyle === 'accent') {
      this.page.drawRectangle({ x: this.left, y: this.y - 2, width: 3, height: size + 2, color: this.accent });
      x += 8;
    }
    this.page.drawText(text, { x, y: this.y, size, font: this.fonts.bold, color });
    if (this.t.headingStyle !== 'accent') {
      const ruleY = this.y - 4;
      const thickness = this.t.headingStyle === 'band' ? 1.2 : 0.7;
      const ruleColor = this.t.headingStyle === 'band' ? this.accent : rgb(0.55, 0.57, 0.6);
      this.page.drawLine({ start: { x: this.left, y: ruleY }, end: { x: this.left + this.contentWidth, y: ruleY }, thickness, color: ruleColor });
      this.y -= 6;
    } else {
      this.y -= 3;
    }
    this.y -= 2;
  }

  private entry(title: string, dates: string, subtitle: string, bullets: string[], details: string[] = []): void {
    const size = this.t.bodySize;
    this.ensure(this.lineHeight * (2 + Math.min(1, bullets.length + details.length)));
    const dateText = this.clean(dates, this.fonts.regular);
    const dateWidth = dateText ? this.fonts.regular.widthOfTextAtSize(dateText, size) : 0;
    const titleLines = this.wrap([{ text: title.trim(), font: this.fonts.bold }], size + 0.5, this.contentWidth - dateWidth - (dateWidth ? 12 : 0));
    titleLines.forEach((line, index) => {
      this.y -= this.lineHeight;
      this.drawSegments(line, this.left, size + 0.5, this.text);
      if (index === 0 && dateText) {
        this.page.drawText(dateText, { x: this.left + this.contentWidth - dateWidth, y: this.y, size, font: this.fonts.regular, color: this.muted });
      }
    });
    if (subtitle.trim()) {
      for (const line of this.wrap([{ text: subtitle.trim(), font: this.fonts.italic }], size, this.contentWidth)) {
        this.ensure(this.lineHeight);
        this.y -= this.lineHeight;
        this.drawSegments(line, this.left, size, this.muted);
      }
    }
    details.forEach(line => this.paragraph([{ text: line, font: this.fonts.regular }]));
    if (bullets.length) this.y -= 1;
    bullets.forEach(line => this.bullet(line));
  }

  private bullet(text: string): void {
    const size = this.t.bodySize;
    const indent = 12;
    const lines = this.wrap([{ text, font: this.fonts.regular }], size, this.contentWidth - indent);
    lines.forEach((line, index) => {
      this.ensure(this.lineHeight);
      this.y -= this.lineHeight;
      if (index === 0) this.page.drawText('\u2022', { x: this.left + 2, y: this.y, size, font: this.fonts.regular, color: this.accent });
      this.drawSegments(line, this.left + indent, size, this.text);
    });
  }

  private paragraph(segments: Segment[]): void {
    for (const line of this.wrap(segments, this.t.bodySize, this.contentWidth)) {
      this.ensure(this.lineHeight);
      this.y -= this.lineHeight;
      this.drawSegments(line, this.left, this.t.bodySize, this.text);
    }
  }

  private drawLine(segments: Segment[], size: number, color: ReturnType<typeof rgb>, center: boolean): void {
    const width = segments.reduce((sum, segment) => sum + segment.font.widthOfTextAtSize(segment.text, size), 0);
    const x = center ? this.left + Math.max(0, (this.contentWidth - width) / 2) : this.left;
    this.drawSegments(segments, x, size, color);
  }

  private drawSegments(segments: Segment[], x: number, size: number, color: ReturnType<typeof rgb>): void {
    let cursor = x;
    for (const segment of segments) {
      if (!segment.text) continue;
      this.page.drawText(segment.text, { x: cursor, y: this.y, size, font: segment.font, color });
      cursor += segment.font.widthOfTextAtSize(segment.text, size);
    }
  }

  /** Word-wraps mixed-font text into lines that fit within maxWidth. */
  private wrap(segments: Segment[], size: number, maxWidth: number): Segment[][] {
    const words: Segment[] = [];
    for (const segment of segments) {
      const clean = this.clean(segment.text, segment.font);
      for (const word of clean.split(/(\s+)/)) if (word) words.push({ text: word, font: segment.font });
    }
    const lines: Segment[][] = [];
    let line: Segment[] = [];
    let width = 0;
    const push = () => {
      while (line.length && !line[line.length - 1].text.trim()) line.pop();
      if (line.length) lines.push(line);
      line = [];
      width = 0;
    };
    for (const word of words) {
      const isSpace = !word.text.trim();
      const text = isSpace ? ' ' : word.text;
      const wordWidth = word.font.widthOfTextAtSize(text, size);
      if (isSpace) {
        if (line.length) {
          line.push({ text, font: word.font });
          width += wordWidth;
        }
        continue;
      }
      if (width + wordWidth > maxWidth && line.length) push();
      if (wordWidth > maxWidth) {
        let chunk = '';
        for (const char of text) {
          if (word.font.widthOfTextAtSize(chunk + char, size) > maxWidth && chunk) {
            lines.push([{ text: chunk, font: word.font }]);
            chunk = '';
          }
          chunk += char;
        }
        line = [{ text: chunk, font: word.font }];
        width = word.font.widthOfTextAtSize(chunk, size);
        continue;
      }
      line.push({ text, font: word.font });
      width += wordWidth;
    }
    push();
    return lines.map(segmentsOfLine => this.merge(segmentsOfLine));
  }

  private merge(segments: Segment[]): Segment[] {
    const merged: Segment[] = [];
    for (const segment of segments) {
      const last = merged[merged.length - 1];
      if (last && last.font === segment.font) last.text += segment.text;
      else merged.push({ ...segment });
    }
    return merged;
  }

  /** Replaces characters that standard (WinAnsi) PDF fonts cannot encode. */
  private clean(text: string, font: PDFFont): string {
    let known = this.cache.get(font);
    if (!known) this.cache.set(font, known = new Map());
    let result = '';
    for (const original of text.replace(/\r?\n/g, ' ')) {
      const char = REPLACEMENTS[original] ?? original;
      for (const piece of char) {
        let ok = known.get(piece);
        if (ok === undefined) {
          try {
            font.encodeText(piece);
            font.widthOfTextAtSize(piece, 10);
            ok = true;
          } catch {
            ok = false;
          }
          known.set(piece, ok);
        }
        result += ok ? piece : '?';
      }
    }
    return result;
  }
}
