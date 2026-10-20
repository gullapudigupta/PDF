export type ResumeTemplateId = 'classic' | 'modern' | 'professional' | 'compact';
export type ResumePageSize = 'letter' | 'a4';

export interface ResumeContact {
  name: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  links: string;
}

export interface ResumeExperience {
  title: string;
  company: string;
  location: string;
  start: string;
  end: string;
  bullets: string;
}

export interface ResumeEducation {
  degree: string;
  school: string;
  location: string;
  start: string;
  end: string;
  details: string;
}

export interface ResumeProject {
  name: string;
  details: string;
}

export interface ResumeData {
  targetRole: string;
  jobDescription: string;
  contact: ResumeContact;
  summary: string;
  experience: ResumeExperience[];
  education: ResumeEducation[];
  skills: string;
  certifications: string;
  projects: ResumeProject[];
}

export interface ResumeTemplate {
  id: ResumeTemplateId;
  name: string;
  description: string;
  bestFor: string;
  font: 'helvetica' | 'times';
  nameSize: number;
  bodySize: number;
  headingSize: number;
  accent: [number, number, number];
  align: 'left' | 'center';
  headingStyle: 'rule' | 'accent' | 'band' | 'plain';
  uppercaseHeadings: boolean;
  lineGap: number;
  sectionGap: number;
  margin: number;
}

export const RESUME_TEMPLATES: readonly ResumeTemplate[] = [
  {
    id: 'classic', name: 'Classic', description: 'Serif, centred header, ruled section headings.',
    bestFor: 'Traditional fields: finance, law, government, academia.',
    font: 'times', nameSize: 22, bodySize: 11, headingSize: 11.5, accent: [0.13, 0.13, 0.13],
    align: 'center', headingStyle: 'rule', uppercaseHeadings: true, lineGap: 3, sectionGap: 12, margin: 54,
  },
  {
    id: 'modern', name: 'Modern', description: 'Clean sans-serif with peacock-green accents.',
    bestFor: 'Technology, product, design and start-ups.',
    font: 'helvetica', nameSize: 24, bodySize: 10.5, headingSize: 11.5, accent: [0, 0.42, 0.39],
    align: 'left', headingStyle: 'accent', uppercaseHeadings: false, lineGap: 3.5, sectionGap: 13, margin: 50,
  },
  {
    id: 'professional', name: 'Professional', description: 'Navy headings with full-width rules, right-aligned dates.',
    bestFor: 'Corporate, consulting, management and sales roles.',
    font: 'helvetica', nameSize: 22, bodySize: 10.5, headingSize: 11, accent: [0.11, 0.23, 0.42],
    align: 'left', headingStyle: 'band', uppercaseHeadings: true, lineGap: 3, sectionGap: 12, margin: 50,
  },
  {
    id: 'compact', name: 'Compact', description: 'Dense, plain ATS-first layout that fits more on one page.',
    bestFor: 'Experienced profiles, engineering and online applications.',
    font: 'helvetica', nameSize: 18, bodySize: 9.5, headingSize: 10, accent: [0.2, 0.2, 0.2],
    align: 'left', headingStyle: 'plain', uppercaseHeadings: true, lineGap: 2, sectionGap: 8, margin: 43,
  },
];

export function resumeTemplate(id: ResumeTemplateId): ResumeTemplate {
  return RESUME_TEMPLATES.find(template => template.id === id) ?? RESUME_TEMPLATES[0];
}

export function emptyExperience(): ResumeExperience {
  return { title: '', company: '', location: '', start: '', end: '', bullets: '' };
}

export function emptyEducation(): ResumeEducation {
  return { degree: '', school: '', location: '', start: '', end: '', details: '' };
}

export function emptyResume(): ResumeData {
  return {
    targetRole: '',
    jobDescription: '',
    contact: { name: '', headline: '', email: '', phone: '', location: '', links: '' },
    summary: '',
    experience: [emptyExperience()],
    education: [emptyEducation()],
    skills: '',
    certifications: '',
    projects: [],
  };
}

/** Splits multi-line bullet text into clean bullet strings (strips leading -, *, numbers or bullet glyphs). */
export function bulletLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map(line => line.replace(/^\s*(?:[-*\u2022\u25CF\u25AA]|\d+[.)])\s*/, '').trim())
    .filter(Boolean);
}

export function dateRange(start: string, end: string): string {
  const from = start.trim();
  const to = end.trim();
  if (from && to) return `${from} \u2013 ${to}`;
  return from || to;
}

export function contactLine(contact: ResumeContact): string {
  return [contact.email, contact.phone, contact.location, ...contact.links.split(/[\n,|]+/)]
    .map(part => part.trim())
    .filter(Boolean)
    .join('  |  ');
}

export function joinParts(...parts: string[]): string {
  return parts.map(part => part.trim()).filter(Boolean).join(', ');
}

export interface ResumeCheck {
  id: string;
  label: string;
  passed: boolean;
}

const ACTION_VERBS = /^(achieved|accelerated|administered|analy[sz]ed|architected|automated|built|championed|coached|collaborated|completed|conducted|consolidated|created|cut|decreased|defined|delivered|deployed|designed|developed|directed|drove|enabled|engineered|established|executed|expanded|generated|grew|guided|implemented|improved|increased|initiated|integrated|introduced|launched|led|managed|mentored|migrated|modernized|negotiated|optimized|orchestrated|organized|oversaw|owned|partnered|pioneered|planned|produced|reduced|redesigned|resolved|restructured|revamped|saved|scaled|secured|simplified|spearheaded|streamlined|supervised|supported|trained|transformed|upgraded|won|wrote)\b/i;

export function resumeChecklist(data: ResumeData): ResumeCheck[] {
  const bullets = data.experience.flatMap(item => bulletLines(item.bullets));
  const summaryWords = data.summary.trim().split(/\s+/).filter(Boolean).length;
  const allText = [data.summary, ...bullets].join(' ');
  const totalWords = [
    data.summary, data.skills, data.certifications,
    ...bullets,
    ...data.education.map(item => `${item.degree} ${item.school} ${item.details}`),
    ...data.projects.map(item => `${item.name} ${item.details}`),
  ].join(' ').split(/\s+/).filter(Boolean).length;
  const skillCount = data.skills.split(/[,\n;|]+/).map(item => item.trim()).filter(Boolean).length;
  return [
    { id: 'contact', label: 'Name, email and phone are filled in', passed: !!(data.contact.name.trim() && data.contact.email.trim() && data.contact.phone.trim()) },
    { id: 'summary', label: 'Summary is 30-90 words (3-4 lines)', passed: summaryWords >= 30 && summaryWords <= 90 },
    {
      id: 'bullets', label: 'Each role has 2-6 bullet points',
      passed: data.experience.length > 0 && data.experience.every(item => {
        const count = bulletLines(item.bullets).length;
        return count >= 2 && count <= 6;
      }),
    },
    { id: 'verbs', label: 'Bullets start with strong action verbs', passed: bullets.length > 0 && bullets.filter(line => ACTION_VERBS.test(line)).length / bullets.length >= 0.7 },
    { id: 'metrics', label: 'At least half of bullets include a number or metric', passed: bullets.length > 0 && bullets.filter(line => /\d/.test(line)).length / bullets.length >= 0.5 },
    { id: 'pronouns', label: 'No first-person pronouns (I, me, my)', passed: !/\b(I|me|my|mine)\b/.test(allText) },
    { id: 'skills', label: 'Skills list has 6-25 relevant keywords', passed: skillCount >= 6 && skillCount <= 25 },
    { id: 'length', label: 'Length fits 1-2 pages (about 250-900 words)', passed: totalWords >= 250 && totalWords <= 900 },
  ];
}
