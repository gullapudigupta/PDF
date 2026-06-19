import { createAction, props } from '@ngrx/store';

export const loadPdf = createAction('[Workspace] Load PDF', props<{ file: File }>());

export const loadPdfSuccess = createAction(
  '[Workspace] Load PDF Success',
  props<{ documentId: string; title: string; totalPages: number }>()
);

export const loadPdfFailure = createAction('[Workspace] Load PDF Failure', props<{ error: string }>());

export const setZoom = createAction('[Workspace] Set Zoom', props<{ zoom: number }>());

export const setPage = createAction('[Workspace] Set Page', props<{ page: number }>());

export const setRotation = createAction('[Workspace] Set Rotation', props<{ rotation: number }>());

export const recordEditCommand = createAction('[Workspace] Record Edit Command', props<{ command: string }>());

export const undoEditCommand = createAction('[Workspace] Undo Edit Command');

export const redoEditCommand = createAction('[Workspace] Redo Edit Command');
