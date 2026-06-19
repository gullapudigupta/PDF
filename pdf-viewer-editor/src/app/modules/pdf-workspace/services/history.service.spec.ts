import { HistoryService } from './history.service';

describe('HistoryService', () => {
  let service: HistoryService<number[]>;

  beforeEach(() => {
    service = new HistoryService<number[]>();
  });

  it('supports undo and redo', () => {
    service.capture([1]);

    const undoState = service.undo([1, 2]);
    expect(undoState).toEqual([1]);
    expect(service.canRedo()).toBeTrue();

    const redoState = service.redo([1]);
    expect(redoState).toEqual([1, 2]);
  });

  it('clears redo stack after capture', () => {
    service.capture([1]);
    service.undo([1, 2]);
    expect(service.canRedo()).toBeTrue();

    service.capture([10]);
    expect(service.canRedo()).toBeFalse();
  });
});
