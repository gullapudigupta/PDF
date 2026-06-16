import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import * as WorkspaceActions from './workspace.actions';

@Injectable()
export class WorkspaceEffects {
  loadPdf$ = createEffect(() =>
    this.actions$.pipe(
      ofType(WorkspaceActions.loadPdf),
      switchMap(({ file }) => {
        const documentId = `doc-${Date.now()}`;
        const title = file.name;

        return of(WorkspaceActions.loadPdfSuccess({ documentId, title })).pipe(
          catchError((error) => of(WorkspaceActions.loadPdfFailure({ error: error.message })))
        );
      })
    )
  );

  constructor(private actions$: Actions) {}
}
