import { Injectable } from '@angular/core';
import { ResumeData, ResumePageSize, ResumeTemplateId, emptyResume } from './resume.model';

/** Holds the resume draft in memory only, so it survives closing the builder but never touches storage. */
@Injectable({ providedIn: 'root' })
export class ResumeDraftService {
  data: ResumeData = emptyResume();
  template: ResumeTemplateId = 'modern';
  pageSize: ResumePageSize = 'letter';

  reset(): void {
    this.data = emptyResume();
  }
}
