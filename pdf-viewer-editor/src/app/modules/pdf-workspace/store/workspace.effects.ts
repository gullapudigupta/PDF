import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, from, map, of, switchMap } from 'rxjs';
import { PdfDocumentService } from '../services/pdf-document.service';
import * as WorkspaceActions from './workspace.actions';

@Injectable()
export class WorkspaceEffects {
  loadPdf$ = createEffect(() =>
    this.actions$.pipe(
      ofType(WorkspaceActions.loadPdf),
      switchMap(({ file }) =>
        from(this.pdfDocumentService.loadFromFile(file)).pipe(
          map((document) =>
            WorkspaceActions.loadPdfSuccess({
              documentId: document.id,
              title: document.name,
              totalPages: document.totalPages,
            })
          ),
          catchError((error: unknown) =>
            of(
              WorkspaceActions.loadPdfFailure({
                error: error instanceof Error ? error.message : 'Unable to load PDF',
              })
            )
          )
        )
      )
    )
  );

  constructor(
    private actions$: Actions,
    private pdfDocumentService: PdfDocumentService
  ) {}
}
