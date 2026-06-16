import {
  selectCurrentPage,
  selectDocumentId,
  selectError,
  selectLoading,
  selectRotation,
  selectTitle,
  selectTotalPages,
  selectWorkspaceState,
  selectZoom,
} from './workspace.selectors';
import { WorkspaceState } from './workspace.reducer';

describe('workspace selectors', () => {
  const workspaceState: WorkspaceState = {
    documentId: 'doc-42',
    title: 'test.pdf',
    currentPage: 3,
    totalPages: 8,
    zoom: 1.25,
    rotation: 180,
    loading: false,
    error: null,
  };

  const rootState = {
    workspace: workspaceState,
  } as any;

  it('selects feature state', () => {
    expect(selectWorkspaceState(rootState)).toEqual(workspaceState);
  });

  it('selects scalar workspace values', () => {
    expect(selectDocumentId(rootState)).toBe('doc-42');
    expect(selectTitle(rootState)).toBe('test.pdf');
    expect(selectCurrentPage(rootState)).toBe(3);
    expect(selectTotalPages(rootState)).toBe(8);
    expect(selectZoom(rootState)).toBe(1.25);
    expect(selectRotation(rootState)).toBe(180);
    expect(selectLoading(rootState)).toBeFalse();
    expect(selectError(rootState)).toBeNull();
  });
});
