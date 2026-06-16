import { createReducer, on } from '@ngrx/store';
import * as WorkspaceActions from './workspace.actions';

export interface WorkspaceState {
  documentId: string | null;
  title: string | null;
  currentPage: number;
  totalPages: number;
  zoom: number;
  rotation: number;
  loading: boolean;
  error: string | null;
}

export const initialState: WorkspaceState = {
  documentId: null,
  title: null,
  currentPage: 1,
  totalPages: 0,
  zoom: 1.0,
  rotation: 0,
  loading: false,
  error: null,
};

export const workspaceReducer = createReducer(
  initialState,
  on(WorkspaceActions.loadPdf, state => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(WorkspaceActions.loadPdfSuccess, (state, { documentId, title, totalPages }) => ({
    ...state,
    documentId,
    title,
    totalPages,
    currentPage: 1,
    loading: false,
    error: null,
  })),
  on(WorkspaceActions.loadPdfFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),
  on(WorkspaceActions.setZoom, (state, { zoom }) => ({
    ...state,
    zoom,
  })),
  on(WorkspaceActions.setPage, (state, { page }) => ({
    ...state,
    currentPage: page,
  })),
  on(WorkspaceActions.setRotation, (state, { rotation }) => ({
    ...state,
    rotation,
  }))
);
