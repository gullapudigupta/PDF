import { createFeatureSelector, createSelector } from '@ngrx/store';
import { WorkspaceState } from './workspace.reducer';

export const selectWorkspaceState = createFeatureSelector<WorkspaceState>('workspace');

export const selectDocumentId = createSelector(
  selectWorkspaceState,
  (state) => state.documentId
);

export const selectTitle = createSelector(
  selectWorkspaceState,
  (state) => state.title
);

export const selectCurrentPage = createSelector(
  selectWorkspaceState,
  (state) => state.currentPage
);

export const selectTotalPages = createSelector(
  selectWorkspaceState,
  (state) => state.totalPages
);

export const selectZoom = createSelector(
  selectWorkspaceState,
  (state) => state.zoom
);

export const selectRotation = createSelector(
  selectWorkspaceState,
  (state) => state.rotation
);

export const selectLoading = createSelector(
  selectWorkspaceState,
  (state) => state.loading
);

export const selectError = createSelector(
  selectWorkspaceState,
  (state) => state.error
);
