import { initialState, workspaceReducer } from './workspace.reducer';
import * as WorkspaceActions from './workspace.actions';

describe('workspaceReducer', () => {
  it('sets loading on loadPdf and clears error', () => {
    const state = workspaceReducer(
      { ...initialState, error: 'old-error' },
      WorkspaceActions.loadPdf({ file: new File(['x'], 'x.pdf') })
    );

    expect(state.loading).toBeTrue();
    expect(state.error).toBeNull();
  });

  it('loads document metadata on success', () => {
    const state = workspaceReducer(
      initialState,
      WorkspaceActions.loadPdfSuccess({ documentId: 'doc-1', title: 'sample.pdf', totalPages: 3 })
    );

    expect(state.documentId).toBe('doc-1');
    expect(state.title).toBe('sample.pdf');
    expect(state.totalPages).toBe(3);
    expect(state.currentPage).toBe(1);
    expect(state.loading).toBeFalse();
  });

  it('updates page, zoom, and rotation', () => {
    let state = workspaceReducer(initialState, WorkspaceActions.setPage({ page: 2 }));
    state = workspaceReducer(state, WorkspaceActions.setZoom({ zoom: 1.5 }));
    state = workspaceReducer(state, WorkspaceActions.setRotation({ rotation: 90 }));

    expect(state.currentPage).toBe(2);
    expect(state.zoom).toBe(1.5);
    expect(state.rotation).toBe(90);
  });

  it('handles load failure', () => {
    const state = workspaceReducer(
      { ...initialState, loading: true },
      WorkspaceActions.loadPdfFailure({ error: 'bad pdf' })
    );

    expect(state.loading).toBeFalse();
    expect(state.error).toBe('bad pdf');
  });
});
