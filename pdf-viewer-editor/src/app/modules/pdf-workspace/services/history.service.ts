import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class HistoryService<T> {
  private undoStack: T[] = [];
  private redoStack: T[] = [];

  capture(previousState: T): void {
    this.undoStack.push(previousState);
    this.redoStack = [];
  }

  undo(currentState: T): T | null {
    if (!this.canUndo()) {
      return null;
    }

    const previous = this.undoStack.pop() as T;
    this.redoStack.push(currentState);
    return previous;
  }

  redo(currentState: T): T | null {
    if (!this.canRedo()) {
      return null;
    }

    const next = this.redoStack.pop() as T;
    this.undoStack.push(currentState);
    return next;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }
}
