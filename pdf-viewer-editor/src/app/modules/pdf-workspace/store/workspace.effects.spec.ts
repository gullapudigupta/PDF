import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable, of, ReplaySubject, throwError } from 'rxjs';

import { WorkspaceEffects } from './workspace.effects';
import * as WorkspaceActions from './workspace.actions';
import { PdfDocumentService } from '../services/pdf-document.service';

describe('WorkspaceEffects', () => {
  let actions$: Observable<any>;
  let effects: WorkspaceEffects;
  let pdfDocumentService: jasmine.SpyObj<PdfDocumentService>;

  beforeEach(() => {
    pdfDocumentService = jasmine.createSpyObj<PdfDocumentService>('PdfDocumentService', ['loadFromFile']);

    TestBed.configureTestingModule({
      providers: [
        WorkspaceEffects,
        provideMockActions(() => actions$),
        { provide: PdfDocumentService, useValue: pdfDocumentService },
      ],
    });

    effects = TestBed.inject(WorkspaceEffects);
  });

  it('dispatches loadPdfSuccess on successful document load', (done) => {
    const file = new File(['pdf'], 'ok.pdf');
    pdfDocumentService.loadFromFile.and.resolveTo({
      id: 'doc-1',
      name: 'ok.pdf',
      totalPages: 4,
      bytes: new Uint8Array([1]),
      proxy: {},
    });

    const subject = new ReplaySubject<any>(1);
    actions$ = subject.asObservable();
    subject.next(WorkspaceActions.loadPdf({ file }));

    effects.loadPdf$.subscribe((action) => {
      expect(action).toEqual(
        WorkspaceActions.loadPdfSuccess({ documentId: 'doc-1', title: 'ok.pdf', totalPages: 4 })
      );
      done();
    });
  });

  it('dispatches loadPdfFailure on load error', (done) => {
    const file = new File(['pdf'], 'bad.pdf');
    pdfDocumentService.loadFromFile.and.returnValue(Promise.reject(new Error('invalid')));

    actions$ = of(WorkspaceActions.loadPdf({ file }));

    effects.loadPdf$.subscribe((action) => {
      expect(action).toEqual(WorkspaceActions.loadPdfFailure({ error: 'invalid' }));
      done();
    });
  });
});
