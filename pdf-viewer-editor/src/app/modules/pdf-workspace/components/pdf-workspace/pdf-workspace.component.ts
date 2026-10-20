import { AfterViewChecked, ChangeDetectorRef, Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, OnDestroy, OnInit, Output, QueryList, SimpleChanges, TemplateRef, ViewChild, ViewChildren } from '@angular/core';
import { Store } from '@ngrx/store';
import { RuntimeService } from '@core/services/runtime.service';
import { OpenedPdfFile } from '@core/adapters/runtime.adapter';
import { PasswordResponses } from 'pdfjs-dist';
import { PdfDocumentService, LoadedPdfDocument, PdfPasswordCancelledError } from '../../services/pdf-document.service';
import { PdfRenderService } from '../../services/pdf-render.service';
import { HistoryService } from '../../services/history.service';
import { AnnotationService } from '../../services/annotation.service';
import { PdfPageOperationsService } from '../../services/pdf-page-operations.service';
import { PdfEditSerializationService } from '../../services/pdf-edit-serialization.service';
import { PdfFormField, PdfFormFieldPlacement, PdfFormService } from '../../services/pdf-form.service';
import { PdfMetadata, PdfProtectionOptions, PdfSecurityService } from '../../services/pdf-security.service';
import { PdfPageExportService, PdfPageImageFormat } from '../../services/pdf-page-export.service';
import { AiChatComponent } from '../ai-chat/ai-chat.component';
import { ActionStatus, ActionStatusKind } from '../action-status/action-status.component';
import { PersistenceService, RecentFileRecord } from '@core/services/persistence.service';
import { Annotation, AnnotationType } from '../../models/annotation.model';
import { recordEditCommand, redoEditCommand, undoEditCommand } from '../../store/workspace.actions';

type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se';
type EditableObjectType = 'text' | 'image' | 'link';
type ViewingMode = 'single' | 'continuous' | 'facing';
type WorkspaceTheme = 'light' | 'dark';
type ToolbarGroup = 'editing' | 'search' | 'navigation' | 'annotations';

export interface WorkspaceOpenRequest {
  multiple: boolean;
  recent?: RecentFileRecord;
}

interface ToolbarVisibility {
  editing: boolean;
  search: boolean;
  navigation: boolean;
  annotations: boolean;
}

interface EditableObject {
  id: string;
  type: EditableObjectType;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  text?: string;
  imageSrc?: string;
  url?: string;
  pageNumber?: number;
}

interface SearchResult {
  page: number;
  count: number;
  excerpt: string;
}

interface PdfBookmark {
  title: string;
  page: number | null;
  depth: number;
}

interface CropRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface FormWidget {
  id: string;
  name: string;
  type: 'text' | 'checkbox' | 'radio' | 'dropdown';
  x: number;
  y: number;
  width: number;
  height: number;
  value: string;
  options: string[];
  option: string;
  date: boolean;
  readOnly: boolean;
  required: boolean;
}

interface FormVisibilityRule {
  targetFieldName: string;
  sourceFieldName: string;
  equalsValue: string;
}

interface SignatureAsset {
  id: string;
  name: string;
  kind: 'signature' | 'initials';
  data: string;
}

@Component({
  selector: 'app-pdf-workspace',
  standalone: false,
  template: `
    <div class="workspace-container" [class.dark-theme]="theme === 'dark'">
      <ng-template #workspaceTools>
      <div class="toolbar">
        <div class="toolbar-left">
          <div class="toolbar-brand">
            <span class="brand-mark" aria-hidden="true">P</span>
            <h1 i18n="@@pdfWorkspaceTitle">PDF Viewer &amp; Editor</h1>
          </div>
          <span class="active-document" *ngIf="document" [title]="document.name">{{ document.name }}</span>
          <button type="button" title="Open a PDF file" i18n-title="@@openPdfTooltip" i18n="@@openPdf" (click)="openFile()">Open PDF</button>
          <button type="button" (click)="openRequested.emit({ multiple: true })">Open multiple PDFs</button>
          <details class="recent-files">
            <summary i18n="@@recentFiles">Recent</summary>
            <p *ngIf="!recentFiles.length">No recent PDFs.</p>
            <ol>
              <li *ngFor="let recent of recentFiles">
                <span>{{ recent.isPinned ? 'Pinned: ' : '' }}{{ recent.name }}</span>
                <button type="button" [attr.aria-label]="'Open ' + recent.name" (click)="openRecentFile(recent)">Open</button>
                <button type="button" [attr.aria-label]="(recent.isPinned ? 'Unpin ' : 'Pin ') + recent.name" (click)="toggleRecentPin(recent)">{{ recent.isPinned ? 'Unpin' : 'Pin' }}</button>
                <button type="button" [attr.aria-label]="'Remove ' + recent.name + ' from recent files'" (click)="removeRecentFile(recent)">Remove</button>
              </li>
            </ol>
          </details>
          <details class="toolbar-customization">
            <summary i18n="@@customizeToolbar">Customize toolbar</summary>
            <label><input type="checkbox" [ngModel]="toolbarVisibility.editing" (ngModelChange)="setToolbarVisibility('editing', $event)" /> <span i18n="@@showEditingActions">Editing actions</span></label>
            <label><input type="checkbox" [ngModel]="toolbarVisibility.search" (ngModelChange)="setToolbarVisibility('search', $event)" /> <span i18n="@@showSearchTools">Search tools</span></label>
            <label><input type="checkbox" [ngModel]="toolbarVisibility.navigation" (ngModelChange)="setToolbarVisibility('navigation', $event)" /> <span i18n="@@showPageNavigation">Page navigation</span></label>
            <label><input type="checkbox" [ngModel]="toolbarVisibility.annotations" (ngModelChange)="setToolbarVisibility('annotations', $event)" /> <span i18n="@@showAnnotations">Annotations panel</span></label>
          </details>
        </div>

        <fieldset *ngIf="toolbarVisibility.editing" class="pdf-toolbar-actions" aria-label="PDF editing tools" [disabled]="!!document?.isEncrypted || viewingMode !== 'single'">
          <button i18n="@@savePdf" title="Save changes to this PDF" i18n-title="@@savePdfTooltip" [disabled]="!document || loading" (click)="saveFile()">Save</button>
          <button i18n="@@savePdfAs" title="Save a copy of this PDF" i18n-title="@@savePdfAsTooltip" [disabled]="!document || loading" (click)="saveFileAs()">Save As</button>
          <button *ngIf="document" (click)="openMetadataDialog()">Metadata</button>
          <button *ngIf="document" (click)="openProtectionDialog()">Protect PDF</button>
          <button [disabled]="!document || loading || totalPages <= 1" (click)="deleteCurrentPage()">Delete Page</button>
          <button [disabled]="!document || loading" (click)="insertPdfInput.click()">Insert PDF</button>
          <input #insertPdfInput type="file" accept="application/pdf,.pdf" hidden (change)="insertPagesFromFile($event)" />
          <button [disabled]="!document || loading" (click)="extractSelectedPages()">Extract Pages</button>
          <button [disabled]="!document || loading" (click)="mergePdfInput.click()">Merge PDFs</button>
          <input #mergePdfInput type="file" accept="application/pdf,.pdf" multiple hidden (change)="mergePdfsFromFiles($event)" />
          <button [disabled]="!document || loading" (click)="splitSelectedPages()">Split PDF</button>
          <button [disabled]="!document || loading" (click)="rotateSelectedPages(90)">Rotate 90</button>
          <button [disabled]="!document || loading" (click)="rotateSelectedPages(180)">Rotate 180</button>
          <button [disabled]="!document || loading" (click)="rotateSelectedPages(270)">Rotate 270</button>
          <button [disabled]="!document || loading" (click)="setCropMode(true)">Crop Page</button>
          <button [disabled]="!cropSelection" (click)="applyCropSelection()">Apply Crop</button>
          <button *ngIf="cropMode || cropSelection" (click)="setCropMode(false)">Cancel Crop</button>
          <button *ngIf="document" (click)="beginFormFieldAuthoring('text')" [attr.aria-pressed]="formAuthoringType === 'text'">Add Text Field</button>
          <button *ngIf="document" (click)="beginFormFieldAuthoring('checkbox')" [attr.aria-pressed]="formAuthoringType === 'checkbox'">Add Checkbox Field</button>
          <button *ngIf="document" (click)="beginFormFieldAuthoring('dropdown')" [attr.aria-pressed]="formAuthoringType === 'dropdown'">Add Dropdown Field</button>
          <button *ngIf="document" (click)="exportFormData()">Export Form Data</button>
          <label *ngIf="document">
            Export page format
            <select aria-label="Export page format" [(ngModel)]="pageExportFormat">
              <option value="png">PNG</option>
              <option value="jpeg">JPEG</option>
              <option value="svg">SVG</option>
            </select>
          </label>
          <button *ngIf="document" [disabled]="loading || document.isEncrypted" (click)="exportCurrentPage()">Export Current Page</button>
          <button *ngIf="document" (click)="formDataInput.click()">Import Form Data</button>
          <input #formDataInput type="file" accept="application/json,.json" hidden (change)="importFormDataFile($event)" />
          <button *ngIf="selectedFormFieldName" (click)="toggleSelectedFieldRequired()">{{ selectedFormFieldRequired ? 'Mark Optional' : 'Mark Required' }}</button>
          <button *ngIf="selectedFormFieldName" (click)="editSelectedFormField()">Edit Field</button>
          <button *ngIf="selectedFormFieldName" (click)="deleteSelectedFormField()">Delete Field</button>
          <button *ngIf="selectedFormFieldName" (click)="setSelectedFieldCondition()">Set Visibility Rule</button>
          <button *ngIf="selectedFormFieldName && hasSelectedFieldCondition" (click)="clearSelectedFieldCondition()">Clear Visibility Rule</button>
          <button [disabled]="!document || loading" (click)="addTextObject()">Add Text</button>
          <button [disabled]="!document || loading" (click)="addImageObject()">Add Image</button>
          <button [disabled]="!document || loading" (click)="addLinkObject()">Add Link</button>
          <button *ngIf="document" (click)="openSignatureDialog('signature')">Add Signature</button>
          <button *ngIf="document" (click)="openSignatureDialog('initials')">Add Initials</button>
          <button *ngIf="document" (click)="setAnnotationTool('highlight')" [attr.aria-pressed]="annotationTool === 'highlight'">Highlight</button>
          <button *ngIf="document" (click)="setAnnotationTool('comment')" [attr.aria-pressed]="annotationTool === 'comment'">Comment</button>
          <button *ngIf="document" (click)="setAnnotationTool('draw')" [attr.aria-pressed]="annotationTool === 'draw'">Draw</button>
          <button *ngIf="annotationTool" (click)="setAnnotationTool(null)">Select</button>
          <label *ngIf="document" class="annotation-style">Color <input aria-label="Annotation color" type="color" [(ngModel)]="annotationColor" /></label>
          <label *ngIf="document" class="annotation-style">Opacity <input aria-label="Annotation opacity" type="range" min="0" max="1" step="0.05" [(ngModel)]="annotationOpacity" /></label>
          <button [disabled]="!selectedObjectId" (click)="editSelection()">Edit</button>
          <button [disabled]="!selectedObjectId" (click)="deleteSelection()">Delete</button>
          <button [disabled]="!canUndo" (click)="undoEdit()">Undo</button>
          <button [disabled]="!canRedo" (click)="redoEdit()">Redo</button>
          <button [disabled]="!selectedObjectId" (click)="cutSelection()">Cut</button>
          <button [disabled]="!selectedObjectId" (click)="copySelection()">Copy</button>
          <button [disabled]="!clipboardObject" (click)="pasteClipboard()">Paste</button>
        </fieldset>

        <div class="toolbar-right" *ngIf="toolbarVisibility.search">
          <input
            type="text"
            [(ngModel)]="searchQuery"
            (keyup.enter)="searchInDocument()"
            aria-label="Search text"
            placeholder="Search text"
          />
          <label><input type="checkbox" [(ngModel)]="searchCaseSensitive" /> Match case</label>
          <label><input type="checkbox" [(ngModel)]="searchRegexMode" /> Regex</label>
          <button [disabled]="!document || loading || searching" (click)="searchInDocument()">Search</button>
        </div>
      </div>
      </ng-template>

      <header class="workspace-header" [class.managed-header]="tabManaged">
        <button #toolsToggle type="button" (click)="togglePanel('tools')" [attr.aria-controls]="toolsPanelId"
          [attr.aria-expanded]="toolsOpen" i18n="@@workspaceToolsToggle">Tools</button>
        <ng-container *ngTemplateOutlet="commandTemplate"></ng-container>
        <ng-container *ngIf="!tabManaged">
          <span class="workspace-heading">PDF Viewer &amp; Editor</span>
          <span class="workspace-document" *ngIf="document" [title]="document.name">{{ document.name }}</span>
        </ng-container>
        <button #chatToggle type="button" (click)="togglePanel('chat')" [attr.aria-controls]="chatPanelId"
          [attr.aria-expanded]="chatOpen" i18n="@@workspaceChatToggle">AI chat</button>
      </header>
      <div class="workspace-body">
        <button *ngIf="compactLayout && (toolsOpen || chatOpen)" class="drawer-backdrop"
          type="button" aria-label="Close side menu" (click)="closePanels()"></button>
        <aside #toolsPanel [id]="toolsPanelId" class="tools-panel" [hidden]="!toolsOpen"
          aria-label="All PDF tools" tabindex="-1">
          <div class="panel-heading"><h2>PDF tools</h2><button type="button" (click)="closePanel('tools')" aria-label="Close tools">Close</button></div>
          <ng-container *ngTemplateOutlet="workspaceTools"></ng-container>
          <ng-container *ngTemplateOutlet="pageControls"></ng-container>
        </aside>
        <main class="workspace-main" [attr.inert]="compactLayout && (toolsOpen || chatOpen) ? '' : null">

      <p *ngIf="document?.isEncrypted" role="status">
        This password-protected PDF is open in read-only mode. Editing and autosave are disabled.
      </p>

      <section *ngIf="passwordPrompt" role="dialog" aria-modal="true" aria-labelledby="pdf-password-title">
        <form (ngSubmit)="submitPasswordPrompt()">
          <h2 id="pdf-password-title">Password required</h2>
          <p>{{ passwordPromptMessage }}</p>
          <label>
            PDF password
            <input type="password" name="pdfPassword" [(ngModel)]="pdfPasswordInput" autocomplete="current-password" autofocus />
          </label>
          <button type="submit">Unlock PDF</button>
          <button type="button" (click)="cancelPasswordPrompt()">Cancel</button>
        </form>
      </section>

      <app-pdf-metadata-dialog *ngIf="metadataDialogOpen" [metadata]="metadata" [fileName]="document?.name || ''"
        [busy]="actionBusy" [error]="dialogError" (save)="saveMetadata($event)" (cancel)="closeMetadataDialog()"></app-pdf-metadata-dialog>

      <app-pdf-protect-dialog *ngIf="protectionDialogOpen" [fileName]="document?.name || ''"
        [busy]="actionBusy" [error]="dialogError" (protect)="protectCurrentPdf($event)" (cancel)="closeProtectionDialog()"></app-pdf-protect-dialog>

      <ng-template #pageControls>
      <div class="viewer-controls" *ngIf="document && toolbarVisibility.navigation">
        <button aria-label="Previous page" title="Go to the previous page" i18n-title="@@previousPageTooltip" i18n="@@previousPage" (click)="previousPage()" [disabled]="atFirstViewingSpread || loading">Previous</button>
        <span role="status" aria-live="polite" i18n="@@pageCount">Page {{ currentPage }} / {{ totalPages }}</span>
        <button aria-label="Next page" title="Go to the next page" i18n-title="@@nextPageTooltip" i18n="@@nextPage" (click)="nextPage()" [disabled]="atLastViewingSpread || loading">Next</button>

        <button aria-label="Zoom out" title="Decrease page zoom" i18n-title="@@zoomOutTooltip" (click)="zoomOut()" [disabled]="loading">-</button>
        <span aria-live="polite">{{ (zoom * 100).toFixed(0) }}%</span>
        <button aria-label="Zoom in" title="Increase page zoom" i18n-title="@@zoomInTooltip" (click)="zoomIn()" [disabled]="loading">+</button>

        <button aria-label="Rotate counterclockwise" title="Rotate counterclockwise" i18n-title="@@rotateCounterclockwiseTooltip" (click)="rotateLeft()" [disabled]="loading">Rotate left</button>
        <button aria-label="Rotate clockwise" title="Rotate clockwise" i18n-title="@@rotateClockwiseTooltip" (click)="rotateRight()" [disabled]="loading">Rotate right</button>
        <label>
          <span i18n="@@pageLayout">Page layout</span>
          <select aria-label="Page layout" [ngModel]="viewingMode" (ngModelChange)="setViewingMode($event)">
            <option value="single">Single page</option>
            <option value="continuous">Continuous</option>
            <option value="facing">Facing pages</option>
          </select>
        </label>
        <label>
          <span i18n="@@theme">Theme</span>
          <select aria-label="Theme" [ngModel]="theme" (ngModelChange)="setTheme($event)">
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
        <label><input type="checkbox" [ngModel]="darkPageRendering" (ngModelChange)="setDarkPageRendering($event)" /> Dark page</label>
        <details class="viewer-help">
          <summary i18n="@@help">Help</summary>
          <p i18n="@@keyboardHelp">Use Page Up/Page Down or the arrow keys to navigate, plus/minus to zoom, and Control/Command with Z to undo.</p>
          <p i18n="@@editingModeHelp">Switch to Single page to edit. Continuous and Facing pages are reading modes.</p>
        </details>
        <button type="button" (click)="closeDocument()" [disabled]="loading">Close PDF</button>
      </div>
      </ng-template>

      <div class="content" #viewerHost>
        <span id="viewer-keyboard-help" class="visually-hidden">
          Use Page Up and Page Down to navigate pages, plus and minus to zoom, and Control or Command with Z to undo.
        </span>
        <app-action-status [status]="actionStatus" (dismiss)="dismissActionStatus()"></app-action-status>
        <div class="status" *ngIf="loading">Loading PDF...</div>
        <div class="status error" *ngIf="!loading && error">{{ error }}</div>
        <div class="status" *ngIf="!loading && !document && !error">
          <button type="button" class="empty-open" (click)="openFile()">Open a PDF to start</button>
          <button type="button" (click)="openRequested.emit({ multiple: true })">Open multiple PDFs</button>
        </div>
        <div class="status" *ngIf="document && viewingMode !== 'single'" role="status">
          Multi-page viewing is read-only. Switch to Single page to edit this PDF.
        </div>

        <aside class="navigation-sidebar" *ngIf="document" aria-label="Page thumbnails and bookmarks">
          <h2>Pages</h2>
          <div class="thumbnail-viewport" (scroll)="onThumbnailScroll($event)" aria-label="Page thumbnails">
            <div class="thumbnail-spacer" [style.height.px]="totalPages * thumbnailItemHeight">
              <div class="thumbnail-item" *ngFor="let page of visibleThumbnailPages"
                [style.top.px]="(page - 1) * thumbnailItemHeight" [class.active]="page === currentPage"
                [attr.aria-label]="'Go to page ' + page" draggable="true"
                (dragstart)="startPageDrag($event, page)" (dragover)="allowPageDrop($event)" (drop)="dropPage($event, page)"
                role="group">
                <label><input type="checkbox" [checked]="selectedPages.includes(page)" (change)="togglePageSelection(page, $any($event.target).checked)" /> Select</label>
                <button type="button" class="thumbnail-navigate" (click)="goToPage(page)">
                  <img *ngIf="thumbnailSources.get(page) as source; else thumbnailPending" class="thumbnail-preview" [src]="source" [alt]="'Preview of page ' + page" />
                  <ng-template #thumbnailPending><span class="thumbnail-preview thumbnail-pending" aria-hidden="true"></span></ng-template>
                  <span>Page {{ page }}</span>
                  <span class="thumbnail-error" *ngIf="thumbnailRenderStates.get(page) === 'error'">Preview unavailable</span>
                </button>
              </div>
            </div>
          </div>
          <h2>Bookmarks</h2>
          <p *ngIf="thumbnailError" class="error" role="alert">{{ thumbnailError }}</p>
          <p *ngIf="bookmarksLoading">Loading bookmarks...</p>
          <p *ngIf="bookmarkError" class="error" role="alert">{{ bookmarkError }}</p>
          <p *ngIf="!bookmarksLoading && !bookmarkError && !bookmarks.length">No bookmarks</p>
          <ul class="bookmark-list">
            <li *ngFor="let bookmark of bookmarks" [style.padding-left.px]="bookmark.depth * 12">
              <button type="button" [disabled]="bookmark.page === null" (click)="navigateToBookmark(bookmark)">
                {{ bookmark.title }}{{ bookmark.page ? ' (page ' + bookmark.page + ')' : '' }}
              </button>
            </li>
          </ul>
        </aside>

        <div class="page-stage" *ngIf="document && !loading && viewingMode === 'single'" #stageHost
          role="region" aria-label="PDF page viewer">
          <canvas #viewerCanvas tabindex="0" role="img" [attr.aria-describedby]="'viewer-keyboard-help'"
            [attr.aria-label]="'PDF page ' + currentPage + ' of ' + totalPages" [class.dark-page]="darkPageRendering"></canvas>

          <div class="overlay-layer" #annotationLayer [class.annotation-mode]="annotationTool !== null" [class.crop-mode]="cropMode" [class.form-authoring-mode]="formAuthoringType !== null" [style.width.px]="overlayWidth" [style.height.px]="overlayHeight" (mousedown)="startAnnotation($event); startCrop($event); startFormFieldPlacement($event)" (mousemove)="moveAnnotation($event); moveCrop($event)" (mouseup)="finishAnnotation(); finishCrop()">
            <ng-container *ngFor="let annotation of pageAnnotations">
              <div *ngIf="annotation.type !== 'draw'" class="pdf-annotation" [class.pdf-highlight]="annotation.type === 'highlight'" [class.pdf-comment]="annotation.type === 'comment' || annotation.type === 'sticky-note'" [style.left.px]="annotation.rect.x" [style.top.px]="annotation.rect.y" [style.width.px]="annotation.rect.width" [style.height.px]="annotation.rect.height" [style.background-color]="annotationColorFor(annotation)" [style.opacity]="annotation.style.opacity" [title]="annotation.content || annotation.type"></div>
              <svg *ngIf="annotation.type === 'draw'" class="pdf-drawing" [style.left.px]="annotation.rect.x" [style.top.px]="annotation.rect.y" [style.width.px]="annotation.rect.width" [style.height.px]="annotation.rect.height" [attr.viewBox]="'0 0 ' + annotation.rect.width + ' ' + annotation.rect.height"><polyline [attr.points]="annotation.content" fill="none" [attr.stroke]="annotation.style.color" [attr.stroke-width]="annotation.style.strokeWidth || 2" [attr.opacity]="annotation.style.opacity" stroke-linecap="round" stroke-linejoin="round"></polyline></svg>
            </ng-container>
            <div *ngIf="annotationDraft" class="annotation-preview" [style.left.px]="annotationDraft.rect.x" [style.top.px]="annotationDraft.rect.y" [style.width.px]="annotationDraft.rect.width" [style.height.px]="annotationDraft.rect.height" [style.background-color]="annotationColor" [style.opacity]="annotationOpacity"></div>
            <div *ngIf="cropDraft || cropSelection" class="crop-preview"
              [style.left.px]="(cropDraft || cropSelection)?.x" [style.top.px]="(cropDraft || cropSelection)?.y"
              [style.width.px]="(cropDraft || cropSelection)?.width" [style.height.px]="(cropDraft || cropSelection)?.height">
              <span class="crop-handle nw" (mousedown)="startCropResize($event, 'nw')"></span>
              <span class="crop-handle ne" (mousedown)="startCropResize($event, 'ne')"></span>
              <span class="crop-handle sw" (mousedown)="startCropResize($event, 'sw')"></span>
              <span class="crop-handle se" (mousedown)="startCropResize($event, 'se')"></span>
            </div>
            <div *ngFor="let widget of formWidgets" class="pdf-form-widget"
              [style.left.px]="widget.x" [style.top.px]="widget.y"
              [style.width.px]="widget.width" [style.height.px]="widget.height"
              [class.selected-form-field]="widget.name === selectedFormFieldName"
              (mousedown)="$event.stopPropagation()" (click)="selectFormField(widget)">
              <span *ngIf="widget.required" class="required-field-marker" aria-label="Required field">*</span>
              <input *ngIf="widget.type === 'text'" [type]="widget.date ? 'date' : 'text'"
                [attr.aria-label]="widget.name" [ngModel]="widget.value" [disabled]="widget.readOnly"
                (change)="updateFormField(widget, $any($event.target).value)" />
              <input *ngIf="widget.type === 'checkbox'" type="checkbox" [attr.aria-label]="widget.name"
                [checked]="widget.value === 'true'" [disabled]="widget.readOnly"
                (change)="updateFormField(widget, $any($event.target).checked ? 'true' : 'false')" />
              <input *ngIf="widget.type === 'radio'" type="radio" [name]="widget.name"
                [attr.aria-label]="widget.name + ' ' + widget.option" [value]="widget.option"
                [checked]="widget.value === widget.option" [disabled]="widget.readOnly"
                (change)="updateFormField(widget, widget.option)" />
              <select *ngIf="widget.type === 'dropdown'" [attr.aria-label]="widget.name"
                [ngModel]="widget.value" [disabled]="widget.readOnly"
                (change)="updateFormField(widget, $any($event.target).value)">
                <option *ngFor="let option of widget.options" [value]="option">{{ option }}</option>
              </select>
            </div>
            <div
              *ngFor="let object of overlayObjects"
              class="overlay-object"
              [class.selected]="object.id === selectedObjectId"
              [style.left.px]="object.x"
              [style.top.px]="object.y"
              [style.width.px]="object.width"
              [style.height.px]="object.height"
              [class.overlay-text]="object.type === 'text'"
              [class.overlay-image]="object.type === 'image'"
              [class.overlay-link]="object.type === 'link'"
              [class.overlay-signature]="object.label === 'Signature' || object.label === 'Initials'"
              (mousedown)="startMove($event, object.id)"
            >
              <div class="overlay-label">{{ object.label }}</div>
              <div *ngIf="object.type === 'text'" class="overlay-text-content">{{ object.text }}</div>
              <img
                *ngIf="object.type === 'image' && object.imageSrc"
                class="overlay-image-content"
                [src]="object.imageSrc"
                [alt]="object.label"
                draggable="false"
              />
              <a
                *ngIf="object.type === 'link'"
                class="overlay-link-content"
                [href]="object.pageNumber ? '#page-' + object.pageNumber : (object.url || '#')"
                [target]="object.pageNumber ? null : '_blank'"
                rel="noreferrer"
                (click)="activateLink($event, object)"
              >
                {{ object.text || object.url }}
              </a>

              <button
                *ngIf="object.id === selectedObjectId"
                class="resize-handle nw"
                type="button"
                aria-label="Resize northwest"
                (mousedown)="startResize($event, object.id, 'nw')"
              ></button>
              <button
                *ngIf="object.id === selectedObjectId"
                class="resize-handle ne"
                type="button"
                aria-label="Resize northeast"
                (mousedown)="startResize($event, object.id, 'ne')"
              ></button>
              <button
                *ngIf="object.id === selectedObjectId"
                class="resize-handle sw"
                type="button"
                aria-label="Resize southwest"
                (mousedown)="startResize($event, object.id, 'sw')"
              ></button>
              <button
                *ngIf="object.id === selectedObjectId"
                class="resize-handle se"
                type="button"
                aria-label="Resize southeast"
                (mousedown)="startResize($event, object.id, 'se')"
              ></button>
            </div>
          </div>
        </div>
        <div class="multi-page-view" *ngIf="document && !loading && viewingMode !== 'single'"
          #multiPageView [class.facing-pages]="viewingMode === 'facing'"
          (scroll)="onMultiPageScroll($event)" [attr.aria-label]="viewingMode === 'continuous' ? 'Continuous PDF pages' : 'Facing PDF pages'">
          <div *ngIf="viewingMode === 'continuous'" class="page-window-spacer"
            [style.height.px]="continuousTopSpacerHeight" aria-hidden="true"></div>
          <div class="mode-page" *ngFor="let page of viewingPages; trackBy: trackPageNumber"
            [attr.data-view-page]="page">
            <canvas *ngIf="shouldRenderModePage(page)" #modePageCanvas tabindex="0" role="img"
              [class.dark-page]="darkPageRendering"
              [attr.aria-label]="'PDF page ' + page"></canvas>
            <div *ngIf="!shouldRenderModePage(page)" class="page-placeholder"
              [style.height.px]="estimatedPageHeight" [attr.aria-label]="'PDF page ' + page"></div>
            <span>Page {{ page }}</span>
          </div>
          <div *ngIf="viewingMode === 'continuous'" class="page-window-spacer"
            [style.height.px]="continuousBottomSpacerHeight" aria-hidden="true"></div>
        </div>
      </div>

<aside class="annotation-panel" *ngIf="document && toolbarVisibility.annotations" aria-label="PDF annotations">
        <h2>Annotations ({{ annotations.length }})</h2>
        <label>Filter annotations
          <select [(ngModel)]="annotationFilter" aria-label="Filter annotations">
            <option value="all">All types</option><option value="highlight">Highlights</option><option value="comment">Comments</option><option value="sticky-note">Sticky notes</option><option value="draw">Drawings</option>
          </select>
        </label>
        <input type="search" [(ngModel)]="annotationSearch" aria-label="Search annotations" placeholder="Search annotations" />
        <ul><li *ngFor="let annotation of visibleAnnotations">
          <button type="button" class="annotation-jump" (click)="jumpToAnnotation(annotation)">{{ annotation.type }} ? page {{ annotation.page }}{{ annotation.content ? ': ' + annotation.content : '' }}</button>
          <button type="button" [disabled]="!!document?.isEncrypted" (click)="editAnnotation(annotation)">Edit</button><button type="button" [disabled]="!!document?.isEncrypted" (click)="deleteAnnotation(annotation)">Delete</button>
        </li></ul>
      </aside>
      <div class="search-result" *ngIf="searchMessage">{{ searchMessage }}</div>
      <nav class="search-results" *ngIf="searchResults.length" aria-label="PDF search results">
        <button type="button" (click)="previousSearchResult()">Previous match</button>
        <span>Result {{ currentSearchResultIndex + 1 }} of {{ searchResults.length }} pages</span>
        <button type="button" (click)="nextSearchResult()">Next match</button>
        <ul>
          <li *ngFor="let result of searchResults; let i = index">
            <button type="button" [attr.aria-current]="i === currentSearchResultIndex ? 'page' : null" (click)="navigateToSearchResult(i)">
              Page {{ result.page }} ({{ result.count }} matches):
              <ng-container *ngFor="let part of searchResultParts(result.excerpt)"><mark *ngIf="part.match">{{ part.text }}</mark><ng-container *ngIf="!part.match">{{ part.text }}</ng-container></ng-container>
            </button>
          </li>
        </ul>
      </nav>
      <div class="signature-backdrop" *ngIf="signatureDialogOpen">
        <section class="signature-dialog" role="dialog" aria-modal="true" aria-labelledby="signature-dialog-title">
          <h2 id="signature-dialog-title">{{ signatureKind === 'signature' ? 'Add signature' : 'Add initials' }}</h2>
          <div class="signature-modes" role="group" aria-label="Signature input method">
            <button type="button" (click)="setSignatureMode('draw')" [attr.aria-pressed]="signatureMode === 'draw'">Draw</button>
            <button type="button" (click)="setSignatureMode('type')" [attr.aria-pressed]="signatureMode === 'type'">Type</button>
            <button type="button" (click)="setSignatureMode('upload')" [attr.aria-pressed]="signatureMode === 'upload'">Upload</button>
          </div>
          <canvas *ngIf="signatureMode === 'draw'" #signatureCanvas class="signature-pad" width="420" height="150"
            aria-label="Draw signature" (pointerdown)="startSignatureStroke($event)"
            (pointermove)="continueSignatureStroke($event)" (pointerup)="finishSignatureStroke()"
            (pointercancel)="finishSignatureStroke()"></canvas>
          <label *ngIf="signatureMode === 'type'" class="signature-type">
            Type {{ signatureKind }} <input type="text" [(ngModel)]="signatureText" maxlength="80" />
          </label>
          <label *ngIf="signatureMode === 'upload'" class="signature-upload">
            Choose PNG or JPEG <input type="file" accept="image/png,image/jpeg" (change)="loadSignatureFile($event)" />
          </label>
          <div class="signature-reusable" *ngIf="signatureAssets.length">
            <h3>Reusable locally saved items</h3>
            <button *ngFor="let asset of signatureAssets" type="button" (click)="placeSignatureAsset(asset)">
              Use {{ asset.name }} ({{ asset.kind }})
            </button>
          </div>
          <div class="signature-dialog-actions">
            <button type="button" [disabled]="!signatureReady" (click)="saveReusableSignature()">Save for reuse</button>
            <button type="button" [disabled]="!signatureReady" (click)="placeCurrentSignature()">Place on page</button>
            <button type="button" (click)="closeSignatureDialog()">Cancel</button>
          </div>
          <p *ngIf="signatureError" class="error" role="alert">{{ signatureError }}</p>
        </section>
      </div>
        </main>
        <aside #chatPanel [id]="chatPanelId" class="chat-panel" [hidden]="!chatOpen"
          aria-label="AI chat" tabindex="-1">
          <div class="panel-heading"><h2>AI chat</h2><button type="button" (click)="closePanel('chat')" aria-label="Close AI chat">Close</button></div>
          <app-ai-chat [document]="document" [currentPage]="currentPage"></app-ai-chat>
        </aside>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        flex: 1 1 auto;
        min-width: 0;
        min-height: 0;
      }

      .workspace-container {
        --surface: #fff;
        --surface-muted: #f7f9fc;
        --surface-raised: #fff;
        --canvas-surface: #e9edf4;
        --text-primary: #202938;
        --text-muted: #687386;
        --border: #dce2ea;
        --accent: var(--brand-peacock, #006b63);
        --accent-strong: #00564f;
        --accent-soft: #e7f5f2;
        --shadow: 0 8px 24px rgba(28, 39, 56, .08);
        display: flex;
        flex-direction: column;
        height: 100%;
        min-height: 0;
        min-width: 0;
        overflow: hidden;
        color: var(--text-primary);
        background: var(--surface-muted);
      }

      .workspace-container.dark-theme {
        --surface: #1c2029;
        --surface-muted: #151922;
        --surface-raised: #242a35;
        --canvas-surface: #10141c;
        --text-primary: #edf1f7;
        --text-muted: #a7b0bf;
        --border: #3a4352;
        --accent: #80cbc0;
        --accent-strong: #a4e4d9;
        --accent-soft: #213e3b;
        --shadow: 0 8px 24px rgba(0, 0, 0, .24);
        color: var(--text-primary);
        background: var(--surface-muted);
      }

      .dark-theme .toolbar,
      .dark-theme .viewer-controls,
      .dark-theme .navigation-sidebar,
      .dark-theme .annotation-panel {
        color: var(--text-primary);
        background: var(--surface);
        border-color: var(--border);
      }

      .dark-theme .content { background: var(--canvas-surface); }
      .dark-theme button,
      .dark-theme input,
      .dark-theme select { color: var(--text-primary); background: var(--surface-raised); border-color: var(--border); }
      .dark-theme .recent-files,
      .dark-theme .toolbar-customization { color: var(--text-primary); background: var(--surface-raised); border-color: var(--border); }
      .dark-theme .status,
      .dark-theme .search-result,
      .dark-theme .search-results { color: var(--text-primary); background: var(--surface); border-color: var(--border); }
      .dark-theme .error,
      .dark-theme .thumbnail-error { color: #ffb4ab; }
      .dark-theme mark { color: #202124; background: #f4c542; }
      .dark-theme .thumbnail-preview { background: #151922; }
      .dark-theme .page-stage canvas,
      .dark-theme .mode-page canvas { border-color: #4a5362; }

      .multi-page-view {
        display: flex;
        flex: 1;
        flex-direction: column;
        align-items: center;
        gap: 20px;
        min-width: 0;
        overflow: auto;
      }

      .multi-page-view.facing-pages {
        flex-direction: row;
        flex-wrap: wrap;
        align-content: flex-start;
        justify-content: center;
      }

      .mode-page {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
      }

      .page-window-spacer {
        flex: none;
        width: 1px;
        pointer-events: none;
      }

      .mode-page canvas { max-width: 100%; }
      .page-placeholder {
        width: min(100%, 800px);
        min-height: 320px;
        background: #fff;
        box-shadow: 0 2px 8px rgba(0, 0, 0, .2);
      }
      .facing-pages .page-placeholder { width: min(42vw, 400px); }
      canvas.dark-page { filter: invert(1) hue-rotate(180deg); }

      .toolbar {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(280px, 420px);
        grid-template-areas:
          "primary search"
          "actions actions";
        align-items: center;
        gap: 10px 20px;
        padding: 12px 20px 10px;
        background: var(--surface);
        border-bottom: 1px solid var(--border);
        position: relative;
        z-index: 20;
        box-shadow: 0 2px 8px rgba(28, 39, 56, .04);
      }

      .recent-files {
        position: absolute;
        top: calc(100% + 8px);
        left: 20px;
        z-index: 10;
        max-width: min(540px, calc(100vw - 32px));
        padding: 12px;
        border: 1px solid var(--border);
        border-radius: 12px;
        background: var(--surface-raised);
        box-shadow: var(--shadow);
      }

      .toolbar-customization {
        position: absolute;
        top: calc(100% + 8px);
        left: 150px;
        z-index: 10;
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 12px;
        border: 1px solid var(--border);
        border-radius: 12px;
        background: var(--surface-raised);
        box-shadow: var(--shadow);
      }

      .toolbar-customization label { display: flex; align-items: center; gap: 8px; color: var(--text-primary); }
      .toolbar-customization input { accent-color: var(--accent); }

      .recent-files ol {
        max-height: 40vh;
        overflow-y: auto;
        padding: 8px 0 0;
        list-style: none;
      }

      .recent-files li {
        display: flex;
        align-items: center;
        gap: 6px;
        margin: 6px 0;
        padding: 6px 0;
        border-top: 1px solid var(--border);
      }

      .toolbar-left {
        grid-area: primary;
        display: flex;
        align-items: center;
        min-width: 0;
        gap: 12px;
      }

      .toolbar-brand {
        display: flex;
        align-items: center;
        gap: 10px;
        flex: 0 0 auto;
      }

      .brand-mark {
        display: grid;
        place-items: center;
        width: 36px;
        height: 36px;
        border-radius: 10px;
        color: #fff;
        background: linear-gradient(145deg, #3478f6, #1d4ed8);
        font-size: 18px;
        font-weight: 750;
        box-shadow: 0 4px 10px rgba(37, 99, 235, .24);
      }

      .active-document {
        min-width: 0;
        max-width: min(280px, 24vw);
        overflow: hidden;
        color: var(--text-muted);
        font-size: 12px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .toolbar-right {
        grid-area: search;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
        min-width: 0;
      }

      .toolbar h1 {
        color: var(--text-primary);
        font-size: 16px;
        font-weight: 700;
        letter-spacing: -.02em;
        white-space: nowrap;
      }

      button {
        min-height: 34px;
        padding: 7px 11px;
        border: 1px solid var(--border);
        border-radius: 8px;
        color: var(--text-primary);
        background: var(--surface-raised);
        font: inherit;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: border-color .15s ease, background-color .15s ease, box-shadow .15s ease, transform .15s ease;
      }

      button:hover:not(:disabled) {
        border-color: #aebbd0;
        background: var(--surface-muted);
      }

      button[aria-pressed="true"] {
        color: var(--accent-strong);
        border-color: var(--accent);
        background: var(--accent-soft);
      }

      button:disabled {
        cursor: not-allowed;
        opacity: .52;
      }

      button:focus-visible,
      input:focus-visible,
      select:focus-visible,
      summary:focus-visible,
      canvas:focus-visible,
      [tabindex="0"]:focus-visible {
        outline: 3px solid #0b57d0;
        outline-offset: 2px;
      }

      .dark-theme button:focus-visible,
      .dark-theme input:focus-visible,
      .dark-theme select:focus-visible,
      .dark-theme summary:focus-visible,
      .dark-theme canvas:focus-visible {
        outline-color: #a8c7fa;
      }

      .visually-hidden {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        clip-path: inset(50%);
      }

      input {
        min-height: 34px;
        padding: 7px 10px;
        border: 1px solid var(--border);
        border-radius: 8px;
        color: var(--text-primary);
        background: var(--surface-raised);
        font: inherit;
        font-size: 12px;
      }

      input[type="checkbox"],
      input[type="radio"] {
        min-height: 0;
        accent-color: var(--accent);
      }

      .viewer-controls {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
        min-height: 54px;
        padding: 8px 20px;
        border-bottom: 1px solid var(--border);
        background: var(--surface);
      }

      .viewer-controls > span[role="status"] {
        min-width: 88px;
        padding: 7px 10px;
        border-radius: 7px;
        color: var(--text-primary);
        background: var(--surface-muted);
        font-size: 12px;
        font-weight: 650;
        text-align: center;
      }

      .viewer-controls label {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        color: var(--text-muted);
        font-size: 12px;
      }

      .content {
        flex: 1;
        display: flex;
        align-items: stretch;
        justify-content: flex-start;
        overflow: auto;
        min-height: 0;
        min-width: 0;
        gap: 18px;
        background: var(--canvas-surface);
        padding: 20px;
      }

      .navigation-sidebar {
        flex: 0 0 216px;
        max-height: 100%;
        overflow: auto;
        padding: 14px;
        border: 1px solid var(--border);
        border-radius: 12px;
        background: var(--surface);
        box-shadow: 0 2px 8px rgba(28, 39, 56, .04);
      }

      .navigation-sidebar h2 { margin: 6px 0 10px; color: var(--text-primary); font-size: 12px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
      .thumbnail-viewport { height: min(42vh, 460px); overflow-y: auto; position: relative; border: 1px solid var(--border); border-radius: 9px; background: var(--surface-muted); }
      .thumbnail-spacer { position: relative; }
      .thumbnail-item { position: absolute; left: 0; width: 100%; height: 136px; display: flex; flex-direction: column; align-items: center; padding: 7px; }
      .thumbnail-item.active { outline: 2px solid var(--accent); outline-offset: -2px; background: var(--accent-soft); }
      .thumbnail-item > label { display: flex; align-items: center; gap: 4px; color: var(--text-muted); font-size: 11px; }
      .thumbnail-navigate { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 4px; border-color: transparent; background: transparent; }
      .thumbnail-preview { width: 120px; height: 84px; object-fit: contain; background: #edf1f6; box-shadow: 0 2px 6px rgba(28, 39, 56, .14); }
      .thumbnail-pending { display: block; margin: 0 auto; }
      .thumbnail-error { color: #b42318; font-size: 11px; }
      .bookmark-list { list-style: none; padding: 0; margin: 0; }
      .bookmark-list button { width: 100%; text-align: left; }

      .page-stage {
        position: relative;
        display: inline-block;
        margin: 0 auto;
        max-width: 100%;
        align-self: flex-start;
      }

      canvas {
        max-width: 100%;
        border: 1px solid #d8dee8;
        background: #fff;
        box-shadow: 0 10px 30px rgba(28, 39, 56, .16);
        display: block;
      }

      .overlay-layer {
        position: absolute;
        left: 0;
        top: 0;
        pointer-events: none;
      }

      .overlay-layer.annotation-mode { pointer-events: auto; cursor: crosshair; }
      .overlay-layer.crop-mode { pointer-events: auto; cursor: crosshair; }
      .pdf-form-widget { position: absolute; pointer-events: auto; display: flex; align-items: stretch; }
      .pdf-form-widget.selected-form-field { outline: 2px solid #2059d0; }
      .required-field-marker { position: absolute; right: 2px; top: -13px; color: #b00020; font-size: 12px; }
      .overlay-layer.form-authoring-mode { pointer-events: auto; cursor: crosshair; }
      .pdf-form-widget input:not([type='checkbox']):not([type='radio']), .pdf-form-widget select {
        width: 100%; min-width: 0; height: 100%; box-sizing: border-box; padding: 1px 3px;
        border: 1px solid rgba(32, 89, 208, .8); background: #fff;
        font: inherit; font-size: 12px;
      }
      .pdf-form-widget input[type='checkbox'], .pdf-form-widget input[type='radio'] { margin: auto; }
      .overlay-signature .overlay-text-content { font-family: cursive; font-style: italic; font-size: 24px; color: #17397e; }
      .signature-backdrop { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,.45); }
      .signature-dialog { width: min(520px, calc(100vw - 32px)); max-height: 90vh; overflow: auto; padding: 20px; color: var(--text-primary); background: var(--surface-raised); border: 1px solid var(--border); border-radius: 14px; box-shadow: var(--shadow); }
      .signature-dialog h2 { margin-top: 0; }
      .signature-modes, .signature-dialog-actions, .signature-reusable { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0; }
      .signature-pad { display: block; width: 100%; height: 150px; border: 1px solid #777; background: #fff; touch-action: none; cursor: crosshair; }
      .signature-type, .signature-upload { display: flex; flex-direction: column; gap: 8px; margin: 12px 0; }
      .signature-type input { font-family: cursive; font-size: 24px; }
      .signature-reusable { flex-direction: column; }
      .signature-reusable h3 { margin: 4px 0; font-size: 14px; }
      .signature-dialog-actions { justify-content: flex-end; }
      .pdf-annotation, .pdf-drawing, .annotation-preview { position: absolute; pointer-events: none; box-sizing: border-box; }
      .pdf-highlight { border-radius: 2px; }
      .pdf-comment { border: 1px solid #8a6d00; border-radius: 3px; }
      .annotation-preview { border: 1px dashed #333; }
      .crop-preview { position: absolute; border: 2px solid #1b5e20; box-shadow: 0 0 0 9999px rgba(0,0,0,.25); pointer-events: none; box-sizing: border-box; }
      .crop-handle { position: absolute; width: 8px; height: 8px; background: #fff; border: 1px solid #1b5e20; pointer-events: auto; }
      .crop-handle.nw { left: -5px; top: -5px; } .crop-handle.ne { right: -5px; top: -5px; }
      .crop-handle.sw { left: -5px; bottom: -5px; } .crop-handle.se { right: -5px; bottom: -5px; }
      .annotation-panel { max-height: 220px; overflow: auto; padding: 14px 20px; border-top: 1px solid var(--border); background: var(--surface); }
      .annotation-panel h2 { margin: 0 0 8px; color: var(--text-primary); font-size: 13px; font-weight: 700; }
      .annotation-panel ul { list-style: none; margin: 8px 0 0; padding: 0; }
      .annotation-panel li { display: flex; gap: 6px; align-items: center; margin: 4px 0; }
      .annotation-panel .annotation-jump { flex: 1; text-align: left; }
      .annotation-style { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; }
      .annotation-style input[type='color'] { width: 26px; height: 24px; padding: 0; }

      .overlay-object {
        position: absolute;
        border: 2px solid #5b8def;
        background: rgba(91, 141, 239, 0.12);
        pointer-events: auto;
        user-select: none;
        box-sizing: border-box;
        overflow: hidden;
      }

      .overlay-object.selected {
        border-color: #2059d0;
        background: rgba(32, 89, 208, 0.16);
      }

      .overlay-label {
        font-size: 12px;
        color: #17397e;
        padding: 2px 4px;
      }

      .overlay-text-content {
        padding: 4px;
        font-size: 13px;
        line-height: 1.35;
      }

      .overlay-image-content {
        width: 100%;
        height: calc(100% - 20px);
        object-fit: contain;
        display: block;
        pointer-events: none;
      }

      .overlay-link-content {
        display: block;
        padding: 4px;
        color: #0f57d4;
        text-decoration: underline;
        font-size: 13px;
      }

      .resize-handle {
        position: absolute;
        width: 10px;
        height: 10px;
        border: 1px solid #0e2b66;
        background: white;
        border-radius: 50%;
        padding: 0;
      }

      .resize-handle.nw {
        left: -6px;
        top: -6px;
        cursor: nwse-resize;
      }

      .resize-handle.ne {
        right: -6px;
        top: -6px;
        cursor: nesw-resize;
      }

      .resize-handle.sw {
        left: -6px;
        bottom: -6px;
        cursor: nesw-resize;
      }

      .resize-handle.se {
        right: -6px;
        bottom: -6px;
        cursor: nwse-resize;
      }

      .status {
        align-self: center;
        max-width: min(640px, 100%);
        margin: auto;
        padding: 24px 30px;
        color: var(--text-muted);
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 16px;
        box-shadow: var(--shadow);
      }

      .error {
        color: #b00020;
      }

      .search-result {
        padding: 10px 20px;
        border-top: 1px solid var(--border);
        color: var(--text-primary);
        background: var(--surface-muted);
      }

      .search-results {
        max-height: 180px;
        overflow: auto;
        padding: 12px 20px;
        border-top: 1px solid var(--border);
        color: var(--text-primary);
        background: var(--surface);
      }

      .pdf-toolbar-actions {
        grid-area: actions;
        display: flex;
        align-items: center;
        gap: 7px;
        min-width: 0;
        max-width: 100%;
        overflow-x: auto;
        overflow-y: hidden;
        scrollbar-color: #b8c2d0 transparent;
        scrollbar-width: thin;
        border: 0;
        margin: 0;
        padding: 2px 0 5px;
      }

      .pdf-toolbar-actions > button,
      .pdf-toolbar-actions > label {
        flex: 0 0 auto;
      }

      .pdf-toolbar-actions > button[title="Save changes to this PDF"] {
        color: #fff;
        border-color: var(--accent);
        background: var(--accent);
      }

      .pdf-toolbar-actions > button[title="Save changes to this PDF"]:hover:not(:disabled) {
        border-color: var(--accent-strong);
        background: var(--accent-strong);
      }

      .toolbar-right > input[type="text"] {
        flex: 1 1 120px;
        min-width: 100px;
      }

      .toolbar-right > label {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        color: var(--text-muted);
        font-size: 11px;
        white-space: nowrap;
      }

      .toolbar-right > button {
        color: #fff;
        border-color: var(--accent);
        background: var(--accent);
      }

      .thumbnail-navigate:hover:not(:disabled) {
        border-color: var(--border);
        background: var(--surface);
      }

      .bookmark-list li { margin: 4px 0; }
      .bookmark-list button { min-height: 32px; color: var(--text-muted); }
      .bookmark-list button:hover:not(:disabled) { color: var(--accent-strong); }

      @media (max-width: 1100px) {
        .toolbar {
          grid-template-columns: minmax(0, 1fr);
          grid-template-areas:
            "primary"
            "search"
            "actions";
        }

        .toolbar-right {
          justify-content: flex-start;
        }

        .navigation-sidebar {
          flex-basis: 190px;
        }
      }

      @media (max-width: 700px) {
        .toolbar {
          gap: 8px;
          padding: 10px 12px 8px;
        }

        .toolbar-left {
          flex-wrap: wrap;
          gap: 8px;
        }

        .toolbar-brand {
          gap: 8px;
        }

        .brand-mark {
          width: 32px;
          height: 32px;
        }

        .toolbar h1 {
          font-size: 14px;
        }

        .active-document {
          max-width: min(220px, 60vw);
        }

        .recent-files {
          left: 12px;
          max-width: calc(100vw - 24px);
        }

        .toolbar-customization {
          left: auto;
          right: 12px;
          max-width: calc(100vw - 24px);
        }

        .toolbar-right {
          flex-wrap: wrap;
          justify-content: flex-start;
        }

        .toolbar-right > input[type="text"] {
          flex-basis: 100%;
        }

        .pdf-toolbar-actions {
          gap: 6px;
        }

        .pdf-toolbar-actions > button {
          min-height: 32px;
          padding: 6px 9px;
        }

        .viewer-controls {
          flex-wrap: nowrap;
          overflow-x: auto;
          padding: 8px 12px;
          scrollbar-width: thin;
        }

        .viewer-controls > * {
          flex: 0 0 auto;
        }

        .content {
          flex-direction: column;
          gap: 12px;
          padding: 12px;
        }

        .navigation-sidebar {
          flex: 0 0 auto;
          width: 100%;
          max-height: 35vh;
          padding: 12px;
        }

        .thumbnail-viewport {
          height: min(24vh, 220px);
        }

        .page-stage {
          align-self: center;
          margin: 0 auto;
          overflow: auto;
        }

        .page-stage canvas {
          height: auto;
        }

        .multi-page-view {
          width: 100%;
        }

        .multi-page-view canvas {
          height: auto;
        }

        .facing-pages .page-placeholder {
          width: min(42vw, 400px);
        }

        .annotation-panel {
          max-height: 32vh;
          padding: 12px;
        }
      }

      .workspace-header {
        display: flex;
        flex: 0 0 auto;
        align-items: center;
        gap: 12px;
        padding: 10px 16px;
        border-bottom: 1px solid var(--border);
        background: var(--surface);
      }
      .workspace-heading { font-weight: 700; }
      .workspace-document { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .workspace-header > button:last-child { margin-left: auto; }
      .managed-header { min-height: 52px; gap: 8px; padding: 6px 10px; }
      .managed-header > button { flex: 0 0 auto; }
      .workspace-body { position: relative; display: flex; flex: 1; min-height: 0; min-width: 0; overflow: hidden; }
      .workspace-main { display: flex; flex-direction: column; flex: 1; min-width: 0; min-height: 0; overflow: hidden; }
      .tools-panel, .chat-panel { flex: 0 0 300px; width: 300px; min-width: 0; overflow: auto; background: var(--surface); border-right: 1px solid var(--border); }
      .chat-panel { flex-basis: 360px; width: 360px; border-right: 0; border-left: 1px solid var(--border); }
      .tools-panel[hidden], .chat-panel[hidden] { display: none; }
      .panel-heading { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 12px; }
      .panel-heading h2 { margin: 0; font-size: 15px; }
      .tools-panel .toolbar { display: flex; flex-direction: column; align-items: stretch; gap: 12px; padding: 12px; box-shadow: none; z-index: auto; }
      .tools-panel .toolbar-left { flex-wrap: wrap; }
      .tools-panel .toolbar-brand { display: none; }
      .tools-panel .active-document { max-width: 100%; }
      .tools-panel .recent-files, .tools-panel .toolbar-customization { position: static; width: 100%; max-width: 100%; box-shadow: none; padding: 8px; }
      .tools-panel .recent-files li { flex-wrap: wrap; overflow-wrap: anywhere; }
      .tools-panel .toolbar-right { flex-wrap: wrap; justify-content: flex-start; }
      .tools-panel .toolbar-right > input[type="text"] { flex-basis: 100%; }
      .tools-panel .pdf-toolbar-actions { flex-wrap: wrap; overflow: visible; }
      .tools-panel .pdf-toolbar-actions > label { max-width: 100%; flex-wrap: wrap; }
      .tools-panel select { max-width: 100%; }
      .tools-panel .viewer-controls { flex-wrap: wrap; overflow: visible; padding: 12px; }
      .tools-panel button, .workspace-header button, .panel-heading button { min-height: 40px; }
      .drawer-backdrop { position: absolute; inset: 0; z-index: 29; width: 100%; height: 100%; border: 0; border-radius: 0; background: rgba(0, 0, 0, .4); }
      @media (max-width: 1023px) {
        .tools-panel, .chat-panel { position: absolute; top: 0; bottom: 0; z-index: 30; width: min(380px, calc(100% - 24px)); max-width: 100%; box-shadow: var(--shadow); }
        .tools-panel { left: 0; }
        .chat-panel { right: 0; }
        .workspace-header { gap: 8px; padding: 8px; }
        .workspace-heading { font-size: 12px; }
        .workspace-document { display: none; }
      }
      @media (max-width: 600px) {
        .managed-header { flex-wrap: wrap; row-gap: 6px; }
        .managed-header > button:last-child { order: 1; }
      }

      @media (prefers-reduced-motion: reduce) {
        button {
          transition: none;
        }
      }
    `,
  ],
})
export class PdfWorkspaceComponent implements AfterViewChecked, OnChanges, OnDestroy, OnInit {
  @Input() tabManaged = false;
  @Input() workspaceId = '';
  @Input() commandTemplate: TemplateRef<unknown> | null = null;
  @Input() active = true;
  @Input() initialFile: OpenedPdfFile | null = null;
  @Output() openRequested = new EventEmitter<WorkspaceOpenRequest>();
  @Output() closeRequested = new EventEmitter<void>();

  get toolsPanelId(): string { return this.workspaceId ? `${this.workspaceId}-tools` : 'workspace-tools'; }
  get chatPanelId(): string { return this.workspaceId ? `${this.workspaceId}-chat` : 'workspace-chat'; }
  @ViewChild('viewerCanvas') viewerCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('toolsToggle') toolsToggle?: ElementRef<HTMLButtonElement>;
  @ViewChild('chatToggle') chatToggle?: ElementRef<HTMLButtonElement>;
  @ViewChild('toolsPanel') toolsPanel?: ElementRef<HTMLElement>;
  @ViewChild('chatPanel') chatPanel?: ElementRef<HTMLElement>;
  @ViewChild(AiChatComponent) aiChat?: AiChatComponent;
  @ViewChild('viewerHost') viewerHost?: ElementRef<HTMLDivElement>;
  @ViewChild('stageHost') stageHost?: ElementRef<HTMLDivElement>;
  @ViewChild('annotationLayer') annotationLayer?: ElementRef<HTMLDivElement>;
  @ViewChild('multiPageView') multiPageView?: ElementRef<HTMLDivElement>;
  @ViewChildren('modePageCanvas') modePageCanvases?: QueryList<ElementRef<HTMLCanvasElement>>;
  @ViewChild('signatureCanvas') signatureCanvas?: ElementRef<HTMLCanvasElement>;

  compactLayout = window.innerWidth < 1024;
  toolsOpen = !this.compactLayout;
  chatOpen = !this.compactLayout;
  private panelLayoutFrame: number | null = null;

  document: LoadedPdfDocument | null = null;
  loading = false;
  error: string | null = null;
  searchQuery = '';
  searchMessage = '';
  searchCaseSensitive = false;
  searchRegexMode = false;
  searching = false;
  searchResults: SearchResult[] = [];
  currentSearchResultIndex = 0;
  visibleThumbnailPages: number[] = [];
  thumbnailItemHeight = 140;
  readonly thumbnailRenderStates = new Map<number, 'loading' | 'ready' | 'error'>();
  readonly thumbnailSources = new Map<number, string>();
  thumbnailError: string | null = null;
  bookmarks: PdfBookmark[] = [];
  bookmarksLoading = false;
  bookmarkError: string | null = null;
  formWidgets: FormWidget[] = [];
  formFields: PdfFormField[] = [];
  formAuthoringType: PdfFormFieldPlacement['type'] | null = null;
  selectedFormFieldName: string | null = null;
  formVisibilityRules: FormVisibilityRule[] = [];
  signatureDialogOpen = false;
  signatureKind: SignatureAsset['kind'] = 'signature';
  signatureMode: 'draw' | 'type' | 'upload' = 'draw';
  signatureText = '';
  signatureAssets: SignatureAsset[] = [];
  signatureError: string | null = null;
  passwordPrompt = false;
  passwordPromptMessage = '';
  pdfPasswordInput = '';
  metadataDialogOpen = false;
  metadata: PdfMetadata = { title: '', author: '', subject: '', keywords: '' };
  protectionDialogOpen = false;
  dialogError: string | null = null;
  actionStatus: ActionStatus | null = null;
  actionBusy = false;
  private actionStatusTimer: ReturnType<typeof setTimeout> | null = null;
  pageExportFormat: PdfPageImageFormat = 'png';
  recentFiles: RecentFileRecord[] = [];
  toolbarVisibility: ToolbarVisibility = {
    editing: true,
    search: true,
    navigation: true,
    annotations: true,
  };
  selectedPages: number[] = [];
  cropMode = false;
  cropDraft: CropRectangle | null = null;
  cropSelection: CropRectangle | null = null;

  currentPage = 1;
  totalPages = 0;
  zoom = 1;
  rotation = 0;
  viewingMode: ViewingMode = 'single';
  theme: WorkspaceTheme = 'light';
  darkPageRendering = false;
  private preferredViewingMode: ViewingMode = 'single';
  private preferredTheme: WorkspaceTheme = 'light';
  private preferredDarkPageRendering = false;

  overlayObjects: EditableObject[] = [];
  selectedObjectId: string | null = null;
  clipboardObject: EditableObject | null = null;
  overlayWidth = 0;
  overlayHeight = 0;
  canUndo = false;
  canRedo = false;
  annotations: Annotation[] = [];
  annotationTool: 'highlight' | 'comment' | 'draw' | null = null;
  annotationFilter = 'all';
  annotationSearch = '';
  annotationColor = '#ffeb3b';
  annotationOpacity = 0.45;
  annotationDraft: { type: AnnotationType; rect: { x: number; y: number; width: number; height: number }; content: string; startX: number; startY: number; points: string[] } | null = null;

  private dragState:
    | {
        mode: 'move' | 'resize';
        objectId: string;
        startX: number;
        startY: number;
        original: EditableObject;
        handle?: ResizeHandle;
      }
    | null = null;
  private searchIndex: { documentId: string; pages: string[] } | null = null;
  private readonly thumbnailRenderScheduled = new Set<number>();
  private readonly pageTransformUndo: Uint8Array[] = [];
  private readonly pageTransformRedo: Uint8Array[] = [];
  private renderedModeKey = '';
  private viewStateSaveTimer: ReturnType<typeof setTimeout> | null = null;
  private cropStartX = 0;
  private cropStartY = 0;
  private signatureDataUrl = '';
  private signatureHasMarks = false;
  private drawingSignature = false;
  private cropResizeState: { handle: 'nw' | 'ne' | 'sw' | 'se'; original: CropRectangle; startX: number; startY: number } | null = null;
  private draggedPage: number | null = null;
  private autosaveTimer: ReturnType<typeof setTimeout> | null = null;
  private savedFilePath: string | null = null;
  private passwordResolver: ((password: string | null) => void) | null = null;

  constructor(
    private store: Store,
    private runtimeService: RuntimeService,
    private pdfDocumentService: PdfDocumentService,
    private pdfRenderService: PdfRenderService,
    private historyService: HistoryService<EditableObject[]>,
    private annotationService: AnnotationService,
    private pageOperationsService: PdfPageOperationsService,
    private editSerializationService: PdfEditSerializationService,
    private pdfFormService: PdfFormService,
    private pdfSecurityService: PdfSecurityService,
    private pdfPageExportService: PdfPageExportService,
    private persistenceService: PersistenceService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    void this.refreshRecentFiles();
    void this.loadWorkspacePreferences();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialFile'] && this.initialFile) {
      void this.openFile(this.initialFile.file, this.initialFile.filePath);
    }
    if (changes['active'] && this.active) this.schedulePanelRender();
    if (changes['active'] && !this.active && (this.aiChat?.busy || this.aiChat?.extracting)) this.aiChat.cancel();
  }

  ngAfterViewChecked(): void {
    if (!this.active) return;
    this.renderVisibleThumbnails();
    void this.renderModePagesIfNeeded();
  }

  ngOnDestroy(): void {
    if (this.actionStatusTimer) clearTimeout(this.actionStatusTimer);
    if (this.panelLayoutFrame !== null) cancelAnimationFrame(this.panelLayoutFrame);
    if (this.viewStateSaveTimer) clearTimeout(this.viewStateSaveTimer);
    this.cancelPasswordPrompt();
    if (this.autosaveTimer) {
      clearTimeout(this.autosaveTimer);
      this.autosaveTimer = null;
      void this.autosaveNow();
    }
    this.pdfDocumentService.closeCurrent();
  }

  async openFile(file?: File, filePath?: string): Promise<void> {
    if (!file && this.tabManaged) {
      this.openRequested.emit({ multiple: false });
      return;
    }
    try {
      if (this.autosaveTimer) {
        clearTimeout(this.autosaveTimer);
        this.autosaveTimer = null;
        if (!(await this.autosaveNow())) return;
      }
      this.loading = true;
      this.error = null;
      this.searchMessage = '';
      this.searchIndex = null;

      const result = file ? { canceled: false, file, filePath } : await this.runtimeService.openFileDialog();
      if (result.canceled || !result.file) {
        this.loading = false;
        return;
      }

      this.document = await this.pdfDocumentService.loadFromFile(
        result.file,
        reason => this.requestPdfPassword(reason)
      );
      await this.activateLoadedDocument(this.document, result.filePath);
      await this.persistRecentDocument(result.filePath ?? null);
    } catch (err) {
      this.error = err instanceof PdfPasswordCancelledError
        ? null
        : err instanceof Error ? err.message : 'Failed to open PDF';
      this.loading = false;
    } finally {
      this.cdr.markForCheck();
    }
  }

  async openRecentFile(recent: RecentFileRecord): Promise<void> {
    if (this.tabManaged) {
      this.openRequested.emit({ multiple: false, recent });
      return;
    }
    if (!this.runtimeService.isDesktop() || !recent.path) {
      await this.openFile();
      return;
    }
    try {
      if (this.autosaveTimer) {
        clearTimeout(this.autosaveTimer);
        this.autosaveTimer = null;
        if (!(await this.autosaveNow())) return;
      }
      this.loading = true;
      this.error = null;
      const data = await this.runtimeService.readFile(recent.path);
      this.document = await this.pdfDocumentService.loadFromBytes(
        new Uint8Array(data),
        recent.name,
        recent.id,
        reason => this.requestPdfPassword(reason)
      );
      await this.activateLoadedDocument(this.document, recent.path);
      await this.persistRecentDocument(recent.path);
    } catch (error) {
      this.error = error instanceof PdfPasswordCancelledError
        ? null
        : `Unable to reopen ${recent.name}: ${error instanceof Error ? error.message : String(error)}`;
      this.loading = false;
    }
  }

  async toggleRecentPin(recent: RecentFileRecord): Promise<void> {
    try {
      await this.persistenceService.setRecentFilePinned(recent.id, !recent.isPinned);
      await this.refreshRecentFiles();
    } catch (error) {
      this.error = `Unable to update pinned PDF: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  async removeRecentFile(recent: RecentFileRecord): Promise<void> {
    try {
      await this.persistenceService.removeRecentFileRecord(recent.id);
      await this.refreshRecentFiles();
    } catch (error) {
      this.error = `Unable to remove recent PDF: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  async closeDocument(force = false): Promise<void> {
    if (this.tabManaged && !force) {
      this.closeRequested.emit();
      return;
    }
    if (this.autosaveTimer) {
      clearTimeout(this.autosaveTimer);
      this.autosaveTimer = null;
      if (!(await this.autosaveNow())) return;
    }
    this.pdfDocumentService.closeCurrent();
    this.document = null;
    this.totalPages = 0;
    this.currentPage = 1;
    this.overlayObjects = [];
    this.annotations = [];
    this.formWidgets = [];
    this.formFields = [];
    this.selectedObjectId = null;
    this.annotationTool = null;
    this.viewingMode = this.preferredViewingMode;
    this.renderedModeKey = '';
    this.thumbnailRenderStates.clear();
    this.thumbnailSources.clear();
    this.visibleThumbnailPages = [];
    this.cdr.detectChanges();
  }

  private async activateLoadedDocument(document: LoadedPdfDocument, filePath?: string): Promise<void> {
    if (!this.document) return;
    this.formWidgets = [];
    this.formFields = [];
    this.formVisibilityRules = [];
    this.savedFilePath = this.runtimeService.isDesktop() ? filePath ?? null : null;
    if (!document.isEncrypted) {
      const autosaveData = await this.persistenceService.getAutosaveData(document.id);
      if (autosaveData && !this.sameBytes(document.bytes, new Uint8Array(autosaveData))) {
        if (window.confirm(`Recover the autosaved version of ${document.name}?`)) {
          this.document = await this.pdfDocumentService.replaceCurrentDocumentBytes(new Uint8Array(autosaveData));
        } else {
          await this.persistenceService.clearAutosave(document.id);
        }
      } else if (autosaveData) {
        await this.persistenceService.clearAutosave(document.id);
      }
    }
    if (!this.document) return;
    this.totalPages = this.document.totalPages;
    this.thumbnailRenderStates.clear();
    this.thumbnailSources.clear();
    this.thumbnailRenderScheduled.clear();
    this.thumbnailError = null;
    this.visibleThumbnailPages = [];
    this.updateThumbnailWindow(0, 360);
    await this.loadBookmarks();
    const viewState = await this.persistenceService.getSetting<{
      page?: number;
      zoom?: number;
      viewingMode?: ViewingMode;
      theme?: WorkspaceTheme;
      darkPageRendering?: boolean;
    }>(
      `workspaceView:${document.id}`
    );
    this.currentPage = Number.isInteger(viewState?.page)
      ? Math.min(Math.max(viewState!.page!, 1), this.totalPages)
      : 1;
    this.zoom = typeof viewState?.zoom === 'number' && Number.isFinite(viewState.zoom)
      ? Math.min(3, Math.max(0.5, viewState.zoom))
      : 1;
    this.viewingMode = viewState?.viewingMode && ['single', 'continuous', 'facing'].includes(viewState.viewingMode)
      ? viewState.viewingMode
      : this.preferredViewingMode;
    this.theme = viewState?.theme === 'light' || viewState?.theme === 'dark'
      ? viewState.theme
      : this.preferredTheme;
    this.darkPageRendering = typeof viewState?.darkPageRendering === 'boolean'
      ? viewState.darkPageRendering
      : this.preferredDarkPageRendering;
    this.rotation = 0;
    this.renderedModeKey = '';
    this.overlayObjects = [];
    this.annotations = document.isEncrypted ? [] : this.annotationService.list(document.id);
    this.annotationTool = null;
    this.annotationDraft = null;
    this.selectedObjectId = null;
    this.clipboardObject = null;
    this.historyService.clear();
    this.syncHistoryState();
    this.loading = false;
    this.cdr.detectChanges();

    await this.renderCurrentPage();
  }

  private async persistRecentDocument(path: string | null): Promise<void> {
    if (!this.document) return;
    try {
      await this.persistenceService.recordRecentFile({
        id: this.document.id,
        name: this.document.name,
        path,
        lastOpenedAt: Date.now(),
      });
      await this.refreshRecentFiles();
    } catch (error) {
      this.error = `PDF opened, but recent-file history could not be saved: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  private async refreshRecentFiles(): Promise<void> {
    try {
      this.recentFiles = await this.persistenceService.listRecentFileRecords();
    } catch (error) {
      this.error = `Unable to load recent PDFs: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  get viewingPages(): number[] {
    if (this.viewingMode === 'continuous') {
      if (!this.totalPages) return [];
      const first = Math.max(1, this.currentPage - 2);
      const last = Math.min(this.totalPages, this.currentPage + 2);
      return Array.from({ length: last - first + 1 }, (_, index) => first + index);
    }
    if (this.viewingMode === 'facing') {
      const firstPage = this.getFacingStart(this.currentPage);
      return [firstPage, firstPage + 1].filter(page => page <= this.totalPages);
    }
    return [this.currentPage];
  }

  get modeCanvasPages(): number[] {
    if (this.viewingMode === 'continuous') {
      return this.viewingPages.filter(page => Math.abs(page - this.currentPage) <= 2);
    }
    return this.viewingPages;
  }

  get estimatedPageHeight(): number {
    const availableWidth = Math.max(240, (this.multiPageView?.nativeElement.clientWidth ?? 960) - 32);
    const pageWidth = this.viewingMode === 'facing' ? Math.max(120, (availableWidth - 16) / 2) : availableWidth;
    return Math.ceil(pageWidth * 1.3);
  }

  get continuousTopSpacerHeight(): number {
    const firstPage = this.viewingPages[0] ?? 1;
    return Math.max(0, (firstPage - 1) * this.continuousPageStride - 20);
  }

  get continuousBottomSpacerHeight(): number {
    const pages = this.viewingPages;
    const lastPage = pages[pages.length - 1] ?? 0;
    return Math.max(0, (this.totalPages - lastPage) * this.continuousPageStride - 20);
  }

  private get continuousPageStride(): number {
    return this.estimatedPageHeight + 42;
  }

  shouldRenderModePage(page: number): boolean {
    return this.viewingMode === 'continuous'
      ? Math.abs(page - this.currentPage) <= 2
      : this.viewingMode === 'facing' && this.viewingPages.includes(page);
  }

  get atFirstViewingSpread(): boolean {
    return this.viewingMode === 'facing' ? this.getFacingStart(this.currentPage) <= 1 : this.currentPage <= 1;
  }

  get atLastViewingSpread(): boolean {
    return this.viewingMode === 'facing'
      ? this.getFacingStart(this.currentPage) + 1 >= this.totalPages
      : this.currentPage >= this.totalPages;
  }

  private getFacingStart(page: number): number {
    return page % 2 === 0 ? page - 1 : page;
  }

  trackPageNumber(_index: number, page: number): number {
    return page;
  }

  async setViewingMode(mode: ViewingMode): Promise<void> {
    if (!['single', 'continuous', 'facing'].includes(mode) || mode === this.viewingMode) return;
    this.viewingMode = mode;
    this.preferredViewingMode = mode;
    this.renderedModeKey = '';
    await this.persistWorkspacePreferences();
    await this.persistWorkspaceViewState();
    this.cdr.detectChanges();
    if (mode === 'single') await this.renderCurrentPage();
    else this.scrollToModePage(this.currentPage);
  }

  async setTheme(theme: WorkspaceTheme): Promise<void> {
    if (theme !== 'light' && theme !== 'dark') return;
    this.theme = theme;
    this.preferredTheme = theme;
    await this.persistWorkspacePreferences();
    await this.persistWorkspaceViewState();
  }

  async setDarkPageRendering(enabled: boolean): Promise<void> {
    this.darkPageRendering = enabled;
    this.preferredDarkPageRendering = enabled;
    this.renderedModeKey = '';
    await this.persistWorkspacePreferences();
    await this.persistWorkspaceViewState();
  }

  onMultiPageScroll(event: Event): void {
    if (this.viewingMode !== 'continuous') return;
    const container = event.currentTarget as HTMLElement;
    const currentPage = Math.min(
      this.totalPages,
      Math.max(1, Math.floor(container.scrollTop / this.continuousPageStride) + 1)
    );
    if (currentPage === this.currentPage) return;
    this.currentPage = currentPage;
    this.scheduleWorkspaceViewStateSave();
  }

  private async loadWorkspacePreferences(): Promise<void> {
    try {
      const preferences = await this.persistenceService.getSetting<{
        theme?: WorkspaceTheme;
        darkPageRendering?: boolean;
        viewingMode?: ViewingMode;
        toolbarVisibility?: Partial<ToolbarVisibility>;
      }>(
        'workspacePreferences'
      );
      if (preferences?.theme === 'light' || preferences?.theme === 'dark') {
        this.preferredTheme = this.theme = preferences.theme;
      }
      if (typeof preferences?.darkPageRendering === 'boolean') {
        this.preferredDarkPageRendering = this.darkPageRendering = preferences.darkPageRendering;
      }
      if (preferences?.viewingMode && ['single', 'continuous', 'facing'].includes(preferences.viewingMode)) {
        this.preferredViewingMode = this.viewingMode = preferences.viewingMode;
      }
      if (preferences?.toolbarVisibility) {
        this.toolbarVisibility = {
          editing: typeof preferences.toolbarVisibility.editing === 'boolean'
            ? preferences.toolbarVisibility.editing : this.toolbarVisibility.editing,
          search: typeof preferences.toolbarVisibility.search === 'boolean'
            ? preferences.toolbarVisibility.search : this.toolbarVisibility.search,
          navigation: typeof preferences.toolbarVisibility.navigation === 'boolean'
            ? preferences.toolbarVisibility.navigation : this.toolbarVisibility.navigation,
          annotations: typeof preferences.toolbarVisibility.annotations === 'boolean'
            ? preferences.toolbarVisibility.annotations : this.toolbarVisibility.annotations,
        };
      }
    } catch (error) {
      this.error = `Unable to load viewer preferences: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  private async persistWorkspacePreferences(): Promise<void> {
    try {
      await this.persistenceService.setSetting('workspacePreferences', {
        theme: this.preferredTheme,
        darkPageRendering: this.preferredDarkPageRendering,
        viewingMode: this.preferredViewingMode,
        toolbarVisibility: { ...this.toolbarVisibility },
      });
    } catch (error) {
      this.error = `Unable to save viewer preferences: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  async setToolbarVisibility(group: ToolbarGroup, visible: boolean): Promise<void> {
    this.toolbarVisibility = { ...this.toolbarVisibility, [group]: visible };
    await this.persistWorkspacePreferences();
  }

  private async persistWorkspaceViewState(): Promise<void> {
    if (!this.document) return;
    try {
      await this.persistenceService.setSetting(`workspaceView:${this.document.id}`, {
        page: this.currentPage,
        zoom: this.zoom,
        viewingMode: this.viewingMode,
        theme: this.theme,
        darkPageRendering: this.darkPageRendering,
      });
    } catch (error) {
      this.error = `Unable to save document view state: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  private scheduleWorkspaceViewStateSave(): void {
    if (this.viewStateSaveTimer) clearTimeout(this.viewStateSaveTimer);
    this.viewStateSaveTimer = setTimeout(() => {
      this.viewStateSaveTimer = null;
      void this.persistWorkspaceViewState();
    }, 250);
  }

  setActionStatus(kind: ActionStatusKind, message: string): void {
    if (this.actionStatusTimer) {
      clearTimeout(this.actionStatusTimer);
      this.actionStatusTimer = null;
    }
    this.actionStatus = { kind, message };
    if (kind === 'success' || kind === 'info') {
      this.actionStatusTimer = setTimeout(() => {
        this.actionStatusTimer = null;
        this.actionStatus = null;
        this.cdr.markForCheck();
      }, 6000);
    }
    this.cdr.markForCheck();
  }

  dismissActionStatus(): void {
    if (this.actionStatusTimer) clearTimeout(this.actionStatusTimer);
    this.actionStatusTimer = null;
    this.actionStatus = null;
    this.cdr.markForCheck();
  }

  /**
   * Runs a user-triggered document action and reports each stage: progress while
   * running, success (work returns a message), cancellation (work returns null), or failure.
   */
  private async runAction(
    progress: string,
    failure: string,
    work: () => Promise<string | null>,
    cancelled = 'Action cancelled. No changes were saved.'
  ): Promise<boolean> {
    if (this.actionBusy) {
      this.setActionStatus('info', 'Please wait for the current action to finish.');
      return false;
    }
    this.actionBusy = true;
    this.setActionStatus('progress', progress);
    try {
      const result = await work();
      if (result === null) this.setActionStatus('info', cancelled);
      else this.setActionStatus('success', result);
      return result !== null;
    } catch (error) {
      this.setActionStatus('error', `${failure}: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    } finally {
      this.actionBusy = false;
      this.cdr.markForCheck();
    }
  }

  private isPdfFile(file: File): boolean {
    return file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  }

  private pluralize(count: number, word: string): string {
    return `${count} ${word}${count === 1 ? '' : 's'}`;
  }

  async saveFile(): Promise<void> {
    if (!this.document || this.document.isEncrypted) return;
    await this.saveCurrentPdf(false);
  }

  async saveFileAs(): Promise<void> {
    if (!this.document || this.document.isEncrypted) return;
    await this.saveCurrentPdf(true);
  }

  openMetadataDialog(): void {
    if (!this.document || this.document.isEncrypted) return;
    if (this.compactLayout) this.closePanels();
    this.error = null;
    this.dialogError = null;
    this.protectionDialogOpen = false;
    void this.pdfSecurityService.getMetadata(this.document.bytes).then(
      metadata => {
        this.metadata = metadata;
        this.metadataDialogOpen = true;
        this.cdr.markForCheck();
      },
      error => {
        this.error = `Unable to read PDF metadata: ${error instanceof Error ? error.message : String(error)}`;
        this.cdr.markForCheck();
      }
    );
  }

  closeMetadataDialog(): void {
    this.metadataDialogOpen = false;
    this.dialogError = null;
  }

  async saveMetadata(metadata: PdfMetadata = this.metadata): Promise<void> {
    if (!this.document || this.document.isEncrypted) return;
    this.actionBusy = true;
    this.dialogError = null;
    try {
      const updatedBytes = await this.pdfSecurityService.updateMetadata(this.document.bytes, metadata);
      this.document = await this.pdfDocumentService.replaceCurrentDocumentBytes(updatedBytes);
      this.metadata = { ...metadata };
      this.metadataDialogOpen = false;
      await this.renderCurrentPage();
      this.scheduleAutosave();
      this.error = null;
      this.setActionStatus('success', 'Document properties updated. Save the PDF to keep them in the file.');
    } catch (error) {
      this.dialogError = `Unable to update PDF metadata: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
      this.actionBusy = false;
      this.cdr.markForCheck();
    }
  }

  openProtectionDialog(): void {
    if (!this.document || this.document.isEncrypted) return;
    if (this.compactLayout) this.closePanels();
    this.error = null;
    this.dialogError = null;
    this.metadataDialogOpen = false;
    this.protectionDialogOpen = true;
  }

  closeProtectionDialog(): void {
    this.protectionDialogOpen = false;
    this.dialogError = null;
  }

  async protectCurrentPdf(options: PdfProtectionOptions): Promise<void> {
    if (!this.document || this.document.isEncrypted) return;
    this.actionBusy = true;
    this.dialogError = null;
    this.setActionStatus('progress', 'Encrypting a protected copy of the PDF...');
    try {
      const bytes = await this.serializeCurrentDocument();
      const protectedBytes = await this.pdfSecurityService.protect(bytes, options);
      const name = `${this.document.name.replace(/\.pdf$/i, '')}-protected.pdf`;
      const result = await this.runtimeService.saveFileDialog(name, this.toArrayBuffer(protectedBytes));
      if (!result.canceled) {
        this.protectionDialogOpen = false;
        this.error = null;
        this.setActionStatus('success', `Protected copy saved as ${this.savedName(result, name)}. The open document is unchanged.`);
      } else {
        this.setActionStatus('info', 'Save cancelled. The protected copy was not saved.');
      }
    } catch (error) {
      this.dialogError = `Unable to protect PDF: ${error instanceof Error ? error.message : String(error)}`;
      this.setActionStatus('error', this.dialogError);
    } finally {
      this.actionBusy = false;
      this.cdr.markForCheck();
    }
  }

  async exportCurrentPage(): Promise<void> {
    if (!this.document || this.document.isEncrypted) return;
    const document = this.document;
    const page = this.currentPage;
    const format = this.pageExportFormat.toUpperCase();
    await this.runAction(`Exporting page ${page} as ${format}...`, 'Unable to export page', async () => {
      const exported = await this.pdfPageExportService.exportPage(document.bytes, page, this.pageExportFormat);
      const baseName = document.name.replace(/\.pdf$/i, '');
      const name = `${baseName}-page-${page}.${exported.extension}`;
      const result = await this.runtimeService.saveFileDialog(name, exported.bytes, exported.mimeType);
      if (result?.canceled) return null;
      return `Page ${page} exported as ${this.savedName(result, name)}.`;
    }, 'Export cancelled. No file was saved.');
  }

  private savedName(result: { filePath?: string } | undefined, fallback: string): string {
    const path = result?.filePath;
    return path ? path.split(/[\\/]/).pop() || fallback : fallback;
  }

  private requestPdfPassword(reason: number): Promise<string | null> {
    if (this.compactLayout) this.closePanels();
    if (this.passwordResolver) this.passwordResolver(null);
    this.passwordPromptMessage = reason === PasswordResponses.INCORRECT_PASSWORD
      ? 'The password was incorrect. Try again.'
      : 'Enter the password to open this protected PDF.';
    this.pdfPasswordInput = '';
    this.passwordPrompt = true;
    this.cdr.detectChanges();
    return new Promise(resolve => {
      this.passwordResolver = resolve;
    });
  }

  submitPasswordPrompt(): void {
    const resolver = this.passwordResolver;
    if (!resolver) return;
    const password = this.pdfPasswordInput;
    this.passwordResolver = null;
    this.passwordPrompt = false;
    this.pdfPasswordInput = '';
    resolver(password);
  }

  cancelPasswordPrompt(): void {
    const resolver = this.passwordResolver;
    this.passwordResolver = null;
    this.passwordPrompt = false;
    this.pdfPasswordInput = '';
    resolver?.(null);
  }

  async autosaveNow(): Promise<boolean> {
    if (!this.document || this.document.isEncrypted) return true;
    try {
      const bytes = await this.serializeCurrentDocument();
      const data = this.toArrayBuffer(bytes);
      await this.persistenceService.saveAutosave(this.document.id, data);
      return true;
    } catch (error) {
      this.error = `Autosave failed: ${error instanceof Error ? error.message : String(error)}`;
      return false;
    }
  }

  private async saveCurrentPdf(saveAs: boolean): Promise<void> {
    if (!this.document) return;
    if (this.autosaveTimer) {
      clearTimeout(this.autosaveTimer);
      this.autosaveTimer = null;
    }
    const documentId = this.document.id;
    const documentName = this.document.name;
    await this.runAction(saveAs ? 'Choose where to save a copy of the PDF...' : 'Saving PDF...', 'Save failed', async () => {
      const bytes = await this.serializeCurrentDocument();
      const data = this.toArrayBuffer(bytes);
      let savedName = documentName;
      if (!saveAs && this.savedFilePath && this.runtimeService.isDesktop()) {
        await this.runtimeService.writeFile(this.savedFilePath, data);
        savedName = this.savedName({ filePath: this.savedFilePath }, documentName);
      } else {
        const result = await this.runtimeService.saveFileDialog(documentName, data);
        if (result.canceled) return null;
        this.savedFilePath = this.runtimeService.isDesktop() ? result.filePath ?? null : null;
        savedName = this.savedName(result, documentName);
      }
      this.error = null;
      try {
        await this.persistenceService.clearAutosave(documentId);
      } catch (error) {
        return `Saved ${savedName}, but its recovery snapshot could not be cleared: ${error instanceof Error ? error.message : String(error)}`;
      }
      return `Saved ${savedName}.`;
    }, 'Save cancelled. Your changes are still open and unsaved.');
  }

  private async serializeCurrentDocument(): Promise<Uint8Array> {
    if (!this.document) throw new Error('No document loaded');
    if (this.document.isEncrypted) throw new Error('Password-protected PDFs are read-only in this workspace');
    return this.editSerializationService.flattenEdits(
      this.document.bytes,
      this.currentPage,
      this.overlayWidth,
      this.overlayHeight,
      this.overlayObjects,
      this.annotations
    );
  }

  private toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
    const data = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(data).set(bytes);
    return data;
  }

  private sameBytes(left: Uint8Array, right: Uint8Array): boolean {
    return left.length === right.length && left.every((value, index) => value === right[index]);
  }

  private scheduleAutosave(): void {
    if (!this.document || this.document.isEncrypted) return;
    if (this.autosaveTimer) clearTimeout(this.autosaveTimer);
    this.autosaveTimer = setTimeout(() => {
      this.autosaveTimer = null;
      void this.autosaveNow();
    }, 800);
  }

  async previousPage(): Promise<void> {
    if (this.atFirstViewingSpread || this.loading) {
      return;
    }

    this.currentPage = this.viewingMode === 'facing'
      ? Math.max(1, this.getFacingStart(this.currentPage) - 2)
      : this.currentPage - 1;
    await this.persistWorkspaceViewState();
    await this.renderCurrentPage();
  }

  async nextPage(): Promise<void> {
    if (this.atLastViewingSpread || this.loading) {
      return;
    }

    this.currentPage = this.viewingMode === 'facing'
      ? Math.min(this.totalPages, this.getFacingStart(this.currentPage) + 2)
      : this.currentPage + 1;
    await this.persistWorkspaceViewState();
    await this.renderCurrentPage();
  }

  onThumbnailScroll(event: Event): void {
    const viewport = event.currentTarget as HTMLElement;
    this.updateThumbnailWindow(viewport.scrollTop, viewport.clientHeight);
  }

  async goToPage(page: number): Promise<void> {
    if (!this.document || !Number.isInteger(page) || page < 1 || page > this.document.totalPages) return;
    this.currentPage = page;
    await this.persistWorkspaceViewState();
    await this.renderCurrentPage();
  }

  async loadBookmarks(): Promise<void> {
    if (!this.document) return;
    this.bookmarks = [];
    this.bookmarkError = null;
    const document = this.document;
    if (typeof document.proxy?.getOutline !== 'function') return;

    this.bookmarksLoading = true;
    try {
      const outline = await document.proxy.getOutline();
      const flatten = async (items: any[], depth: number): Promise<void> => {
        for (const item of items) {
          let page: number | null = null;
          const destination = typeof item.dest === 'string'
            ? await document.proxy.getDestination(item.dest)
            : item.dest;
          if (Array.isArray(destination) && destination[0] && typeof document.proxy.getPageIndex === 'function') {
            const pageIndex = await document.proxy.getPageIndex(destination[0]);
            if (Number.isInteger(pageIndex) && pageIndex >= 0 && pageIndex < document.totalPages) page = pageIndex + 1;
          }
          this.bookmarks.push({ title: String(item.title ?? 'Untitled bookmark'), page, depth });
          if (Array.isArray(item.items) && item.items.length) await flatten(item.items, depth + 1);
        }
      };
      if (Array.isArray(outline)) await flatten(outline, 0);
    } catch (error) {
      this.bookmarks = [];
      this.bookmarkError = `Unable to load PDF bookmarks: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
      this.bookmarksLoading = false;
    }
  }

  async navigateToBookmark(bookmark: PdfBookmark): Promise<void> {
    if (bookmark.page !== null) await this.goToPage(bookmark.page);
  }

  async deleteCurrentPage(): Promise<void> {
    if (!this.document || this.totalPages <= 1) return;
    const page = this.currentPage;
    if (!window.confirm(`Delete page ${page}? This cannot be undone, but the original file is unchanged until you save.`)) return;
    const document = this.document;
    await this.runAction(`Deleting page ${page}...`, 'Unable to delete page', async () => {
      const bytes = await this.pageOperationsService.deletePage(document.bytes, page);
      await this.refreshDocumentAfterPageOperation(bytes, Math.min(page, this.totalPages - 1));
      return `Page ${page} deleted. The document now has ${this.pluralize(this.totalPages, 'page')}.`;
    });
  }

  async insertPagesFromFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!this.document || !file) return;
    if (!this.isPdfFile(file)) {
      this.setActionStatus('error', `Unable to insert pages: ${file.name} is not a PDF file.`);
      return;
    }
    const document = this.document;
    const afterPage = this.currentPage;
    await this.runAction(`Inserting pages from ${file.name}...`, 'Unable to insert PDF pages', async () => {
      const sourceBytes = new Uint8Array(await file.arrayBuffer());
      const previousTotal = this.totalPages;
      const bytes = await this.pageOperationsService.insertPages(document.bytes, sourceBytes, afterPage);
      await this.refreshDocumentAfterPageOperation(bytes, afterPage + 1);
      const added = Math.max(0, this.totalPages - previousTotal);
      return `Inserted ${this.pluralize(added, 'page')} from ${file.name} after page ${afterPage}.`;
    });
  }

  async extractSelectedPages(): Promise<void> {
    if (!this.document) return;
    const selection = window.prompt(`Page range to extract (for example, 1-3,5). This PDF has ${this.pluralize(this.totalPages || this.document.totalPages, 'page')}:`);
    if (selection === null) {
      this.setActionStatus('info', 'Extract cancelled.');
      return;
    }
    if (!selection.trim()) {
      this.setActionStatus('error', 'Unable to extract pages: enter at least one page or range.');
      return;
    }
    const document = this.document;
    const name = `${document.name.replace(/\.pdf$/i, '')}-extracted.pdf`;
    await this.runAction(`Extracting pages ${selection.trim()}...`, 'Unable to extract pages', async () => {
      const bytes = await this.pageOperationsService.extractPages(document.bytes, selection);
      const result = await this.savePdfBytes(name, bytes);
      if (result.canceled) return null;
      return `Extracted pages ${selection.trim()} to ${this.savedName(result, name)}.`;
    }, 'Save cancelled. The extracted PDF was not saved.');
  }

  async mergePdfsFromFiles(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (!this.document || !files.length) return;
    const invalid = files.filter(file => !this.isPdfFile(file));
    if (invalid.length) {
      this.setActionStatus('error', `Unable to merge PDFs: ${invalid.map(file => file.name).join(', ')} ${invalid.length === 1 ? 'is not a PDF file' : 'are not PDF files'}.`);
      return;
    }
    const document = this.document;
    const name = `${document.name.replace(/\.pdf$/i, '')}-merged.pdf`;
    const total = files.length + 1;
    await this.runAction(`Merging ${total} PDFs (${document.name} first)...`, 'Unable to merge PDFs', async () => {
      const sources = await Promise.all(files.map(async file => new Uint8Array(await file.arrayBuffer())));
      const bytes = await this.pageOperationsService.mergePdfs([document.bytes, ...sources]);
      this.setActionStatus('progress', `Merged ${total} PDFs. Choose where to save ${name}...`);
      const result = await this.savePdfBytes(name, bytes);
      if (result.canceled) return null;
      return `Merged ${total} PDFs into ${this.savedName(result, name)}. The open document is unchanged.`;
    }, 'Save cancelled. The merged PDF was not saved.');
  }

  async splitSelectedPages(): Promise<void> {
    if (!this.document) return;
    const selection = window.prompt('Page ranges for separate PDFs (for example, 1-3,4-6):');
    if (selection === null) {
      this.setActionStatus('info', 'Split cancelled.');
      return;
    }
    if (!selection.trim()) {
      this.setActionStatus('error', 'Unable to split PDF: enter at least one page range.');
      return;
    }
    const document = this.document;
    await this.runAction('Splitting PDF...', 'Unable to split PDF', async () => {
      const parts = await this.pageOperationsService.splitByPageRanges(document.bytes, selection);
      const baseName = document.name.replace(/\.pdf$/i, '') || 'document';
      let saved = 0;
      for (let index = 0; index < parts.length; index++) {
        this.setActionStatus('progress', `Saving part ${index + 1} of ${parts.length}...`);
        const result = await this.savePdfBytes(`${baseName}-part-${index + 1}.pdf`, parts[index]);
        if (!result.canceled) saved++;
      }
      if (!saved) return null;
      return saved === parts.length
        ? `Split into ${this.pluralize(parts.length, 'PDF')} and saved all parts.`
        : `Split into ${this.pluralize(parts.length, 'PDF')}; saved ${saved}, skipped ${parts.length - saved}.`;
    }, 'Save cancelled. No split PDFs were saved.');
  }

  private async savePdfBytes(name: string, bytes: Uint8Array): Promise<{ canceled: boolean; filePath?: string }> {
    const result = await this.runtimeService.saveFileDialog(name, this.toArrayBuffer(bytes));
    return result ?? { canceled: false };
  }

  startPageDrag(event: DragEvent, page: number): void {
    this.draggedPage = page;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(page));
    }
  }

  allowPageDrop(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  }

  async dropPage(event: DragEvent, targetPage: number): Promise<void> {
    event.preventDefault();
    const sourcePage = this.draggedPage;
    this.draggedPage = null;
    if (!this.document || sourcePage === null || sourcePage === targetPage) return;
    const document = this.document;
    await this.runAction(`Moving page ${sourcePage} to position ${targetPage}...`, 'Unable to reorder pages', async () => {
      const bytes = await this.pageOperationsService.reorderPage(document.bytes, sourcePage, targetPage);
      await this.refreshDocumentAfterPageOperation(bytes, targetPage);
      return `Moved page ${sourcePage} to position ${targetPage}.`;
    });
  }

  togglePageSelection(page: number, selected: boolean): void {
    this.selectedPages = selected
      ? [...new Set([...this.selectedPages, page])]
      : this.selectedPages.filter(item => item !== page);
  }

  async rotateSelectedPages(rotation: 90 | 180 | 270): Promise<void> {
    if (!this.document) return;
    const pageNumbers = this.selectedPages.length ? this.selectedPages : [this.currentPage];
    const document = this.document;
    const label = pageNumbers.length === 1 ? `page ${pageNumbers[0]}` : `${pageNumbers.length} pages`;
    await this.runAction(`Rotating ${label} by ${rotation}°...`, 'Unable to rotate pages', async () => {
      const bytes = await this.pageOperationsService.rotatePages(document.bytes, pageNumbers, rotation);
      await this.recordPageTransformation(bytes, this.currentPage);
      return `Rotated ${label} by ${rotation}°. Press Ctrl+Z to undo.`;
    });
  }

  setCropMode(enabled: boolean): void {
    const wasCropping = this.cropMode || !!this.cropSelection;
    this.cropMode = enabled;
    this.cropDraft = null;
    this.cropSelection = null;
    if (enabled) {
      this.setAnnotationTool(null);
      this.formAuthoringType = null;
      this.setActionStatus('info', `Drag on page ${this.currentPage} to select the area to keep, then choose Apply Crop. Press Escape to cancel.`);
    } else if (wasCropping) {
      this.setActionStatus('info', 'Crop cancelled. The page was not changed.');
    }
  }

  startCrop(event: MouseEvent): void {
    if (!this.cropMode || this.cropSelection || !this.document || event.button !== 0) return;
    event.preventDefault();
    const point = this.annotationPoint(event);
    this.cropStartX = point.x;
    this.cropStartY = point.y;
    this.cropDraft = { x: point.x, y: point.y, width: 1, height: 1 };
  }

  moveCrop(event: MouseEvent): void {
    if (!this.cropMode) return;
    if (this.cropResizeState && this.cropSelection) {
      const point = this.annotationPoint(event);
      const { handle, original, startX, startY } = this.cropResizeState;
      const dx = point.x - startX;
      const dy = point.y - startY;
      const left = handle.includes('w') ? Math.min(original.x + original.width - 1, Math.max(0, original.x + dx)) : original.x;
      const top = handle.includes('n') ? Math.min(original.y + original.height - 1, Math.max(0, original.y + dy)) : original.y;
      const right = handle.includes('e') ? Math.max(original.x + 1, Math.min(this.overlayWidth, original.x + original.width + dx)) : original.x + original.width;
      const bottom = handle.includes('s') ? Math.max(original.y + 1, Math.min(this.overlayHeight, original.y + original.height + dy)) : original.y + original.height;
      this.cropSelection = { x: left, y: top, width: right - left, height: bottom - top };
      return;
    }
    if (!this.cropDraft) return;
    const point = this.annotationPoint(event);
    this.cropDraft = {
      x: Math.min(this.cropStartX, point.x),
      y: Math.min(this.cropStartY, point.y),
      width: Math.max(1, Math.abs(point.x - this.cropStartX)),
      height: Math.max(1, Math.abs(point.y - this.cropStartY)),
    };
  }

  finishCrop(): void {
    this.cropResizeState = null;
    if (!this.cropDraft) return;
    if (this.cropDraft.width >= 3 && this.cropDraft.height >= 3) this.cropSelection = { ...this.cropDraft };
    this.cropDraft = null;
  }

  startCropResize(event: MouseEvent, handle: 'nw' | 'ne' | 'sw' | 'se'): void {
    if (!this.cropMode || !this.cropSelection || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const point = this.annotationPoint(event);
    this.cropResizeState = { handle, original: { ...this.cropSelection }, startX: point.x, startY: point.y };
  }

  async applyCropSelection(): Promise<void> {
    if (!this.document || !this.cropSelection) return;
    const document = this.document;
    const page = this.currentPage;
    const selection = this.cropSelection;
    await this.runAction(`Cropping page ${page}...`, 'Unable to crop page', async () => {
      const bytes = await this.pageOperationsService.cropPage(
        document.bytes,
        page,
        this.overlayWidth,
        this.overlayHeight,
        selection
      );
      await this.recordPageTransformation(bytes, page);
      this.cropSelection = null;
      this.cropMode = false;
      return `Page ${page} cropped. Press Ctrl+Z to undo.`;
    });
  }

  private async recordPageTransformation(bytes: Uint8Array, selectedPage: number): Promise<void> {
    if (!this.document) return;
    this.pageTransformUndo.push(this.document.bytes.slice());
    this.pageTransformRedo.length = 0;
    await this.refreshDocumentAfterPageOperation(bytes, selectedPage);
    this.syncHistoryState();
  }

  private async refreshDocumentAfterPageOperation(bytes: Uint8Array, selectedPage: number): Promise<void> {
    const updated = await this.pdfDocumentService.replaceCurrentDocumentBytes(bytes);
    this.document = updated;
    this.totalPages = updated.totalPages;
    this.currentPage = Math.max(1, Math.min(selectedPage, updated.totalPages));
    this.selectedPages = [];
    const page = typeof updated.proxy?.getPage === 'function'
      ? await updated.proxy.getPage(this.currentPage)
      : null;
    if (Number.isFinite(page?.rotate)) this.rotation = page.rotate;
    this.error = null;
    this.thumbnailRenderStates.clear();
    this.thumbnailSources.clear();
    this.thumbnailRenderScheduled.clear();
    this.thumbnailError = null;
    this.searchIndex = null;
    this.searchResults = [];
    this.searchMessage = '';
    this.updateThumbnailWindow(0, 360);
    await this.loadBookmarks();
    this.cdr.detectChanges();
    await this.renderCurrentPage();
    this.scheduleAutosave();
  }

  updateThumbnailWindow(scrollTop: number, viewportHeight: number): void {
    if (!this.totalPages) {
      this.visibleThumbnailPages = [];
      this.trimThumbnailCache();
      return;
    }
    const first = Math.max(0, Math.floor(scrollTop / this.thumbnailItemHeight) - 2);
    const last = Math.min(
      this.totalPages,
      Math.ceil((scrollTop + Math.max(viewportHeight, this.thumbnailItemHeight)) / this.thumbnailItemHeight) + 2
    );
    this.visibleThumbnailPages = Array.from({ length: last - first }, (_, index) => first + index + 1);
    this.trimThumbnailCache();
  }

  private trimThumbnailCache(): void {
    const visiblePages = new Set(this.visibleThumbnailPages);
    for (const page of this.thumbnailSources.keys()) {
      if (!visiblePages.has(page)) this.thumbnailSources.delete(page);
    }
    for (const page of this.thumbnailRenderStates.keys()) {
      if (!visiblePages.has(page)) this.thumbnailRenderStates.delete(page);
    }
  }

  private renderVisibleThumbnails(): void {
    if (!this.document) return;
    const document = this.document;
    for (const page of this.visibleThumbnailPages) {
      if (this.thumbnailRenderStates.has(page) || this.thumbnailRenderScheduled.has(page)) continue;
      this.thumbnailRenderScheduled.add(page);
      queueMicrotask(() => {
        this.thumbnailRenderScheduled.delete(page);
        if (this.document?.id !== document.id
          || this.thumbnailRenderStates.has(page)
          || !this.visibleThumbnailPages.includes(page)) return;
        this.thumbnailRenderStates.set(page, 'loading');
        void this.renderThumbnail(document, page);
      });
    }
  }

  private async renderThumbnail(document: LoadedPdfDocument, page: number): Promise<void> {
    try {
      const canvas = globalThis.document.createElement('canvas');
      if (document.isEncrypted) {
        await this.pdfRenderService.renderLoadedPageToCanvas(document.proxy, page, canvas, { fitWidth: 120, fitHeight: 104 });
      } else {
        await this.pdfRenderService.renderPageToCanvas(document.bytes, page, canvas, { fitWidth: 120, fitHeight: 104 });
      }
      if (this.document?.id !== document.id || !this.visibleThumbnailPages.includes(page)) return;
      this.thumbnailSources.set(page, canvas.toDataURL());
      this.thumbnailRenderStates.set(page, 'ready');
      this.cdr.markForCheck();
    } catch (error) {
      if (this.document?.id !== document.id || !this.visibleThumbnailPages.includes(page)) return;
      this.thumbnailRenderStates.set(page, 'error');
      this.thumbnailError = `Unable to render thumbnail for page ${page}: ${error instanceof Error ? error.message : String(error)}`;
      this.cdr.markForCheck();
    }
  }

  private async renderModePagesIfNeeded(): Promise<void> {
    if (!this.document || this.loading || this.viewingMode === 'single') {
      this.renderedModeKey = '';
      return;
    }
    const pages = this.modeCanvasPages;
    const key = [
      this.document.id,
      this.viewingMode,
      pages.join(','),
      this.zoom,
      this.rotation,
      this.darkPageRendering,
    ].join(':');
    if (key === this.renderedModeKey) return;
    const canvases = this.modePageCanvases?.toArray() ?? [];
    if (canvases.length !== pages.length) return;

    this.renderedModeKey = key;
    const document = this.document;
    const host = this.multiPageView?.nativeElement;
    const availableWidth = Math.max(240, (host?.clientWidth ?? 960) - 32);
    const fitWidth = this.viewingMode === 'facing' ? Math.max(120, (availableWidth - 16) / 2) : availableWidth;
    try {
      for (let index = 0; index < pages.length; index += 1) {
        if (this.document?.id !== document.id) return;
        await this.pdfRenderService.renderLoadedPageToCanvas(
          document.proxy,
          pages[index],
          canvases[index].nativeElement,
          { fitWidth, zoom: this.zoom, rotation: this.rotation }
        );
      }
      this.scrollToModePage(this.currentPage);
    } catch (error) {
      this.error = `Unable to render ${this.viewingMode} pages: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  private scrollToModePage(page: number): void {
    const target = this.multiPageView?.nativeElement.querySelector<HTMLElement>(`[data-view-page="${page}"]`);
    target?.scrollIntoView({ block: 'start', behavior: 'auto' });
  }

  async zoomIn(): Promise<void> {
    this.zoom = Math.min(3, this.zoom + 0.1);
    await this.persistWorkspaceViewState();
    await this.renderCurrentPage();
  }

  async zoomOut(): Promise<void> {
    this.zoom = Math.max(0.5, this.zoom - 0.1);
    await this.persistWorkspaceViewState();
    await this.renderCurrentPage();
  }

  async rotateLeft(): Promise<void> {
    this.rotation = (this.rotation - 90 + 360) % 360;
    await this.renderCurrentPage();
  }

  async rotateRight(): Promise<void> {
    this.rotation = (this.rotation + 90) % 360;
    await this.renderCurrentPage();
  }

  async searchInDocument(): Promise<void> {
    if (!this.document || !this.searchQuery.trim()) {
      this.searchResults = [];
      this.currentSearchResultIndex = 0;
      this.searchMessage = '';
      return;
    }

    const query = this.searchQuery.trim();
    const pattern = this.searchRegexMode ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let matcher: RegExp;
    try {
      matcher = new RegExp(pattern, this.searchCaseSensitive ? 'g' : 'gi');
    } catch (error) {
      this.searchResults = [];
      this.searchMessage = `Invalid regular expression: ${error instanceof Error ? error.message : String(error)}`;
      return;
    }

    this.searching = true;
    this.searchMessage = 'Indexing document text...';
    try {
      const document = this.document;
      if (this.searchIndex?.documentId !== document.id) {
        const pages: string[] = [];
        for (let page = 1; page <= document.totalPages; page++) {
          pages.push(await this.pdfDocumentService.extractText(page));
        }
        this.searchIndex = { documentId: document.id, pages };
      }

      const results: SearchResult[] = [];
      this.searchIndex.pages.forEach((text, index) => {
        matcher.lastIndex = 0;
        const firstMatch = matcher.exec(text);
        if (!firstMatch) return;

        let count = 0;
        const countMatcher = new RegExp(pattern, this.searchCaseSensitive ? 'g' : 'gi');
        let match: RegExpExecArray | null;
        while ((match = countMatcher.exec(text))) {
          count++;
          if (!match[0].length) countMatcher.lastIndex++;
        }
        const start = Math.max(0, firstMatch.index - 60);
        const end = Math.min(text.length, Math.max(start + 180, firstMatch.index + firstMatch[0].length + 60));
        results.push({
          page: index + 1,
          count,
          excerpt: `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`,
        });
      });

      this.searchResults = results;
      this.currentSearchResultIndex = 0;
      if (results.length) {
        const totalMatches = results.reduce((total, result) => total + result.count, 0);
        await this.navigateToSearchResult(0);
        this.searchMessage = `Found ${totalMatches} match${totalMatches === 1 ? '' : 'es'} on ${results.length} page${results.length === 1 ? '' : 's'}`;
      } else {
        this.searchMessage = 'No match found';
      }
    } catch (error) {
      this.searchResults = [];
      this.searchMessage = `Search failed: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
      this.searching = false;
    }
  }

  async navigateToSearchResult(index: number): Promise<void> {
    if (index < 0 || index >= this.searchResults.length) return;
    this.currentSearchResultIndex = index;
    this.currentPage = this.searchResults[index].page;
    await this.renderCurrentPage();
  }

  async previousSearchResult(): Promise<void> {
    if (!this.searchResults.length) return;
    const index = (this.currentSearchResultIndex - 1 + this.searchResults.length) % this.searchResults.length;
    await this.navigateToSearchResult(index);
  }

  async nextSearchResult(): Promise<void> {
    if (!this.searchResults.length) return;
    const index = (this.currentSearchResultIndex + 1) % this.searchResults.length;
    await this.navigateToSearchResult(index);
  }

  searchResultParts(text: string): { text: string; match: boolean }[] {
    const flags = this.searchCaseSensitive ? 'g' : 'gi';
    try {
      const query = this.searchQuery.trim();
      const pattern = this.searchRegexMode ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const matcher = new RegExp(pattern, flags);
      const parts: { text: string; match: boolean }[] = [];
      let previousIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = matcher.exec(text))) {
        if (match.index > previousIndex) parts.push({ text: text.slice(previousIndex, match.index), match: false });
        parts.push({ text: match[0], match: true });
        previousIndex = matcher.lastIndex;
        if (!match[0].length) matcher.lastIndex++;
      }
      if (previousIndex < text.length) parts.push({ text: text.slice(previousIndex), match: false });
      return parts.length ? parts : [{ text, match: false }];
    } catch {
      return [{ text, match: false }];
    }
  }

  togglePanel(panel: 'tools' | 'chat'): void {
    const open = panel === 'tools' ? !this.toolsOpen : !this.chatOpen;
    if (this.compactLayout && open) {
      this.toolsOpen = false;
      this.chatOpen = false;
    }
    if (panel === 'tools') this.toolsOpen = open;
    else this.chatOpen = open;
    if (!this.chatOpen && (this.aiChat?.busy || this.aiChat?.extracting)) this.aiChat.cancel();
    this.cdr.detectChanges();
    if (open) (panel === 'tools' ? this.toolsPanel : this.chatPanel)?.nativeElement.focus();
    else (panel === 'tools' ? this.toolsToggle : this.chatToggle)?.nativeElement.focus();
    this.schedulePanelRender();
  }

  closePanel(panel: 'tools' | 'chat'): void {
    if (panel === 'tools') this.toolsOpen = false;
    else {
      this.chatOpen = false;
      if (this.aiChat?.busy || this.aiChat?.extracting) this.aiChat.cancel();
    }
    (panel === 'tools' ? this.toolsToggle : this.chatToggle)?.nativeElement.focus();
    this.schedulePanelRender();
  }

  closePanels(): void {
    const panel = this.chatOpen ? 'chat' : 'tools';
    this.toolsOpen = false;
    this.chatOpen = false;
    if (this.aiChat?.busy || this.aiChat?.extracting) this.aiChat.cancel();
    (panel === 'chat' ? this.chatToggle : this.toolsToggle)?.nativeElement.focus();
  }

  private schedulePanelRender(): void {
    if (this.panelLayoutFrame !== null) cancelAnimationFrame(this.panelLayoutFrame);
    this.panelLayoutFrame = requestAnimationFrame(() => {
      this.panelLayoutFrame = null;
      void this.onResize();
    });
  }

  @HostListener('window:resize')
  async onResize(): Promise<void> {
    const compact = window.innerWidth < 1024;
    if (compact !== this.compactLayout) {
      this.compactLayout = compact;
      if (compact) this.closePanels();
    }
    if (this.active && this.document && !this.loading) {
      await this.renderCurrentPage();
    }
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (!this.active || !this.dragState) {
      return;
    }

    const dx = event.clientX - this.dragState.startX;
    const dy = event.clientY - this.dragState.startY;

    const updated =
      this.dragState.mode === 'move'
        ? this.computeMovedObject(this.dragState.original, dx, dy)
        : this.computeResizedObject(this.dragState.original, dx, dy, this.dragState.handle as ResizeHandle);

    this.overlayObjects = this.overlayObjects.map((object) =>
      object.id === this.dragState?.objectId ? updated : object
    );
  }

  @HostListener('window:mouseup')
  onMouseUp(): void {
    if (this.dragState) this.scheduleAutosave();
    this.dragState = null;
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (!this.active) return;
    const key = event.key.toLowerCase();

    if (key === 'escape') {
      if (this.passwordPrompt) this.cancelPasswordPrompt();
      else if (this.signatureDialogOpen) this.closeSignatureDialog();
      else if (this.metadataDialogOpen) this.closeMetadataDialog();
      else if (this.protectionDialogOpen) this.closeProtectionDialog();
      else if (this.compactLayout && (this.toolsOpen || this.chatOpen)) this.closePanels();
      else if (this.cropMode || this.cropSelection) this.setCropMode(false);
      else if (this.formAuthoringType) {
        this.setActionStatus('info', `Stopped adding the ${this.formFieldLabel(this.formAuthoringType)}. Nothing was added.`);
        this.formAuthoringType = null;
      }
      else {
        this.setAnnotationTool(null);
        this.selectedObjectId = null;
      }
      event.preventDefault();
      return;
    }

    const target = event.target instanceof HTMLElement ? event.target : null;
    if (target?.closest('app-ai-chat')) return;
    if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;

    if (key === 'backspace' || key === 'delete') {
      if (this.document && !this.document.isEncrypted && this.viewingMode === 'single' && this.selectedObjectId) {
        this.deleteSelection();
        event.preventDefault();
      }
      return;
    }

    if (event.ctrlKey || event.metaKey) {
      if (this.document?.isEncrypted || this.viewingMode !== 'single') return;
    } else if (target?.closest('button, a, [role="button"]')) {
      return;
    }

    if (!event.ctrlKey && !event.metaKey) {
      if (!this.document || event.altKey) return;
      if (key === 'pageup' || key === 'arrowleft') {
        void this.previousPage();
      } else if (key === 'pagedown' || key === 'arrowright') {
        void this.nextPage();
      } else if (key === '+' || key === '=') {
        void this.zoomIn();
      } else if (key === '-') {
        void this.zoomOut();
      } else {
        return;
      }
      event.preventDefault();
      return;
    }

    if (key === 'c') {
      this.copySelection();
      event.preventDefault();
      return;
    }

    if (key === 'x') {
      this.cutSelection();
      event.preventDefault();
      return;
    }

    if (key === 'v') {
      this.pasteClipboard();
      event.preventDefault();
      return;
    }

    if (key === 'z' && !event.shiftKey) {
      this.undoEdit();
      event.preventDefault();
      return;
    }

    if (key === 'y' || (key === 'z' && event.shiftKey)) {
      this.redoEdit();
      event.preventDefault();
      return;
    }
  }

  get pageAnnotations(): Annotation[] {
    return this.document ? this.annotations.filter(annotation => annotation.page === this.currentPage) : [];
  }

  get visibleAnnotations(): Annotation[] {
    const query = this.annotationSearch.trim().toLocaleLowerCase();
    return this.annotations.filter(annotation =>
      (this.annotationFilter === 'all' || annotation.type === this.annotationFilter) &&
      (!query || (annotation.content ?? '').toLocaleLowerCase().includes(query) || annotation.type.includes(query))
    );
  }

  get selectedFormFieldRequired(): boolean {
    return this.formWidgets.find(widget => widget.name === this.selectedFormFieldName)?.required ?? false;
  }

  get hasSelectedFieldCondition(): boolean {
    return this.formVisibilityRules.some(rule => rule.targetFieldName === this.selectedFormFieldName);
  }

  get signatureReady(): boolean {
    if (this.signatureMode === 'type') return Boolean(this.signatureText.trim());
    if (this.signatureMode === 'upload') return Boolean(this.signatureDataUrl);
    return this.signatureHasMarks;
  }

  annotationColorFor(annotation: Annotation): string {
    return annotation.style.color;
  }

  setAnnotationTool(tool: 'highlight' | 'comment' | 'draw' | null): void {
    this.annotationTool = this.document?.isEncrypted ? null : tool;
    this.annotationDraft = null;
  }

  startAnnotation(event: MouseEvent): void {
    if (!this.document || this.document.isEncrypted || !this.annotationTool || event.button !== 0) return;
    event.preventDefault();
    const point = this.annotationPoint(event);
    const type: AnnotationType = this.annotationTool === 'comment' ? 'comment' : this.annotationTool;
    this.annotationDraft = {
      type,
      rect: { x: point.x, y: point.y, width: 1, height: 1 },
      content: '',
      startX: point.x,
      startY: point.y,
      points: [point.x + ',' + point.y],
    };
  }

  moveAnnotation(event: MouseEvent): void {
    if (!this.annotationDraft) return;
    const point = this.annotationPoint(event);
    const left = Math.min(this.annotationDraft.startX, point.x);
    const top = Math.min(this.annotationDraft.startY, point.y);
    this.annotationDraft.rect = {
      x: left,
      y: top,
      width: Math.max(1, Math.abs(point.x - this.annotationDraft.startX)),
      height: Math.max(1, Math.abs(point.y - this.annotationDraft.startY)),
    };
    if (this.annotationDraft.type === 'draw') {
      this.annotationDraft.points.push(point.x + ',' + point.y);
      this.annotationDraft.content = this.annotationDraft.points.join(' ');
    }
  }

  finishAnnotation(): void {
    const draft = this.annotationDraft;
    if (!draft || !this.document || this.document.isEncrypted) return;
    this.annotationDraft = null;
    if (draft.type === 'draw' ? draft.points.length < 2 : draft.rect.width < 3 || draft.rect.height < 3) return;
    let content = draft.content;
    if (draft.type === 'comment') {
      const entered = window.prompt('Enter a comment for this page region:');
      if (entered === null || !entered.trim()) return;
      content = entered.trim();
    }
    if (draft.type === 'draw') {
      content = draft.points.map(point => {
        const [x, y] = point.split(',').map(Number);
        return (x - draft.rect.x) + ',' + (y - draft.rect.y);
      }).join(' ');
    }
    this.annotationService.create({
      documentId: this.document.id,
      page: this.currentPage,
      type: draft.type,
      rect: draft.rect,
      viewport: { width: this.overlayWidth, height: this.overlayHeight },
      style: { color: this.annotationColor, opacity: Number(this.annotationOpacity), ...(draft.type === 'draw' ? { strokeWidth: 2 } : {}) },
      content,
    });
    this.refreshAnnotations();
  }

  editAnnotation(annotation: Annotation): void {
    if (!this.document || this.document.isEncrypted) return;
    const content = window.prompt('Edit annotation text:', annotation.content ?? '');
    if (content === null) return;
    this.annotationService.update(annotation.id, { content, style: { color: this.annotationColor, opacity: Number(this.annotationOpacity) } });
    this.refreshAnnotations();
  }

  deleteAnnotation(annotation: Annotation): void {
    if (!this.document || this.document.isEncrypted) return;
    this.annotationService.delete(annotation.id);
    this.refreshAnnotations();
  }

  async jumpToAnnotation(annotation: Annotation): Promise<void> {
    this.currentPage = annotation.page;
    await this.renderCurrentPage();
  }

  private annotationPoint(event: MouseEvent): { x: number; y: number } {
    const bounds = this.annotationLayer?.nativeElement.getBoundingClientRect();
    const x = event.clientX - (bounds?.left ?? 0);
    const y = event.clientY - (bounds?.top ?? 0);
    return {
      x: Math.max(0, Math.min(this.overlayWidth, x)),
      y: Math.max(0, Math.min(this.overlayHeight, y)),
    };
  }

  private refreshAnnotations(): void {
    if (this.document) {
      this.annotations = this.annotationService.list(this.document.id);
      this.scheduleAutosave();
    }
  }

  addOverlayObject(): void {
    this.addTextObject();
  }

  addTextObject(): void {
    const text = window.prompt('Enter text for the new text box:', 'Sample text') ?? 'Sample text';
    const object = this.createBaseObject({
      type: 'text',
      label: 'Text Box',
      width: 220,
      height: 90,
      text,
    });

    this.captureHistory('add-text-box');
    this.overlayObjects = [...this.overlayObjects, object];
    this.selectedObjectId = object.id;
  }

  addImageObject(): void {
    const imageSrc =
      window.prompt(
        'Enter image URL or data URL:',
        'https://dummyimage.com/240x120/ced8ef/17397e.png&text=Image'
      ) ?? '';
    if (!imageSrc.trim()) {
      return;
    }

    const object = this.createBaseObject({
      type: 'image',
      label: 'Image',
      width: 240,
      height: 140,
      imageSrc: imageSrc.trim(),
    });

    this.captureHistory('insert-image');
    this.overlayObjects = [...this.overlayObjects, object];
    this.selectedObjectId = object.id;
  }

  addLinkObject(): void {
    const destinationInput = window.prompt('Enter an HTTP(S) URL or internal page (page:<number>):', 'https://example.com');
    if (destinationInput === null || !destinationInput.trim()) return;
    const destination = this.parseLinkDestination(destinationInput);
    if (!destination) {
      this.error = `Invalid link destination. Use an HTTP(S) URL or page:1 through page:${this.totalPages}.`;
      return;
    }

    const text = window.prompt('Enter link label:', 'Open link') ?? 'Open link';
    const object = this.createBaseObject({
      type: 'link',
      label: 'Link',
      width: 220,
      height: 70,
      text,
      ...destination,
    });

    this.captureHistory('insert-link');
    this.overlayObjects = [...this.overlayObjects, object];
    this.selectedObjectId = object.id;
  }

  async openSignatureDialog(kind: SignatureAsset['kind']): Promise<void> {
    if (this.compactLayout) this.closePanels();
    this.signatureKind = kind;
    this.signatureMode = 'draw';
    this.signatureText = '';
    this.signatureDataUrl = '';
    this.signatureHasMarks = false;
    this.signatureError = null;
    this.signatureDialogOpen = true;
    try {
      const stored = await this.persistenceService.getSetting<SignatureAsset[]>('pdf-signature-assets');
      this.signatureAssets = Array.isArray(stored) ? stored.filter(asset =>
        typeof asset?.id === 'string' &&
        typeof asset?.name === 'string' &&
        (asset?.kind === 'signature' || asset?.kind === 'initials') &&
        typeof asset?.data === 'string' &&
        /^data:image\/(png|jpeg);base64,/i.test(asset.data)
      ) : [];
    } catch (error) {
      this.signatureError = `Unable to load saved signatures: ${error instanceof Error ? error.message : String(error)}`;
    }
    this.cdr.detectChanges();
    this.clearSignatureCanvas();
  }

  setSignatureMode(mode: 'draw' | 'type' | 'upload'): void {
    this.signatureMode = mode;
    this.signatureDataUrl = '';
    this.signatureHasMarks = false;
    this.signatureError = null;
    this.cdr.detectChanges();
    if (mode === 'draw') this.clearSignatureCanvas();
  }

  startSignatureStroke(event: PointerEvent): void {
    const canvas = this.signatureCanvas?.nativeElement;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) {
      this.signatureError = 'Signature drawing is unavailable because the canvas could not be initialized.';
      return;
    }
    event.preventDefault();
    const point = this.signatureCanvasPoint(event, canvas);
    context.beginPath();
    context.moveTo(point.x, point.y);
    context.strokeStyle = '#14264b';
    context.lineWidth = 2.5;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    this.drawingSignature = true;
  }

  continueSignatureStroke(event: PointerEvent): void {
    if (!this.drawingSignature) return;
    const canvas = this.signatureCanvas?.nativeElement;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    const point = this.signatureCanvasPoint(event, canvas);
    context.lineTo(point.x, point.y);
    context.stroke();
    this.signatureHasMarks = true;
  }

  finishSignatureStroke(): void {
    this.drawingSignature = false;
  }

  async loadSignatureFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      this.signatureError = 'Choose a PNG or JPEG image for the signature.';
      input.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.signatureError = 'Signature images must be 10 MB or smaller.';
      input.value = '';
      return;
    }
    try {
      this.signatureDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === 'string'
          ? resolve(reader.result)
          : reject(new Error('The selected image could not be read.'));
        reader.onerror = () => reject(reader.error ?? new Error('The selected image could not be read.'));
        reader.readAsDataURL(file);
      });
      this.signatureError = null;
    } catch (error) {
      this.signatureError = `Unable to read signature image: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  async saveReusableSignature(): Promise<void> {
    try {
      const draft = this.currentSignatureAsset();
      if (!draft) {
        this.signatureError = 'Draw, type, or upload a signature before saving it for reuse.';
        return;
      }
      const name = window.prompt('Name this reusable item:', draft.kind === 'signature' ? 'My signature' : 'My initials');
      if (name === null || !name.trim()) return;
      const existing = this.signatureAssets.find(asset => asset.name.toLocaleLowerCase() === name.trim().toLocaleLowerCase());
      const asset = { ...draft, id: existing?.id ?? `signature-${Date.now()}-${Math.round(Math.random() * 1e6)}`, name: name.trim() };
      const assets = [...this.signatureAssets.filter(item => item.id !== asset.id), asset];
      await this.persistenceService.setSetting('pdf-signature-assets', assets);
      this.signatureAssets = assets;
      this.signatureError = null;
    } catch (error) {
      this.signatureError = `Unable to save reusable signature: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  placeCurrentSignature(): void {
    try {
      const asset = this.currentSignatureAsset();
      if (!asset) {
        this.signatureError = 'Draw, type, or upload a signature before placing it.';
        return;
      }
      this.placeSignatureAsset(asset);
    } catch (error) {
      this.signatureError = `Unable to prepare signature: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  placeSignatureAsset(asset: SignatureAsset): void {
    const initials = asset.kind === 'initials';
    const object = this.createBaseObject({
      type: 'image',
      label: initials ? 'Initials' : 'Signature',
      width: initials ? 96 : 200,
      height: initials ? 56 : 72,
      imageSrc: asset.data,
    });
    this.captureHistory('place-signature');
    this.overlayObjects = [...this.overlayObjects, object];
    this.selectedObjectId = object.id;
    this.closeSignatureDialog();
  }

  closeSignatureDialog(): void {
    this.signatureDialogOpen = false;
    this.drawingSignature = false;
  }

  private currentSignatureAsset(): SignatureAsset | null {
    let data: string;
    if (this.signatureMode === 'type') {
      const text = this.signatureText.trim();
      if (!text) return null;
      data = this.renderTypedSignature(text);
    } else if (this.signatureMode === 'upload') {
      data = this.signatureDataUrl;
    } else {
      const canvas = this.signatureCanvas?.nativeElement;
      if (!this.signatureHasMarks || !canvas) return null;
      data = canvas.toDataURL('image/png');
    }
    return data ? { id: 'draft', name: this.signatureKind, kind: this.signatureKind, data } : null;
  }

  private renderTypedSignature(text: string): string {
    const canvas = globalThis.document.createElement('canvas');
    canvas.width = Math.min(1200, Math.max(240, text.length * 44 + 32));
    canvas.height = 120;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Signature rendering is unavailable because the canvas could not be initialized.');
    context.fillStyle = '#14264b';
    context.font = 'italic 48px cursive';
    context.textBaseline = 'middle';
    context.fillText(text, 16, 60, canvas.width - 32);
    return canvas.toDataURL('image/png');
  }

  private signatureCanvasPoint(event: PointerEvent, canvas: HTMLCanvasElement): { x: number; y: number } {
    const bounds = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - bounds.left) * canvas.width / Math.max(bounds.width, 1),
      y: (event.clientY - bounds.top) * canvas.height / Math.max(bounds.height, 1),
    };
  }

  private clearSignatureCanvas(): void {
    const canvas = this.signatureCanvas?.nativeElement;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
  }

  editSelection(): void {
    const selected = this.getSelectedObject();
    if (!selected) {
      return;
    }

    if (selected.type === 'text') {
      const text = window.prompt('Edit text content:', selected.text ?? selected.label);
      if (text === null) {
        return;
      }
      this.captureHistory('edit-text-box');
      this.updateObject(selected.id, {
        text,
        label: 'Text Box',
      });
      return;
    }

    if (selected.type === 'image') {
      const imageSrc = window.prompt('Edit image URL/data URL:', selected.imageSrc ?? '');
      if (imageSrc === null || !imageSrc.trim()) {
        return;
      }
      this.captureHistory('edit-image');
      this.updateObject(selected.id, {
        imageSrc: imageSrc.trim(),
        label: 'Image',
      });
      return;
    }

    const currentDestination = selected.pageNumber ? `page:${selected.pageNumber}` : selected.url ?? '';
    const nextDestination = window.prompt('Edit destination URL or internal page (page:<number>):', currentDestination);
    if (nextDestination === null || !nextDestination.trim()) return;
    const destination = this.parseLinkDestination(nextDestination);
    if (!destination) {
      this.error = `Invalid link destination. Use an HTTP(S) URL or page:1 through page:${this.totalPages}.`;
      return;
    }
    const nextText = window.prompt('Edit link label:', selected.text ?? selected.label);
    if (nextText === null) {
      return;
    }

    this.captureHistory('edit-link');
    this.updateObject(selected.id, {
      url: destination.url,
      pageNumber: destination.pageNumber,
      text: nextText,
      label: 'Link',
    });
  }

  activateLink(event: MouseEvent, object: EditableObject): void {
    event.stopPropagation();
    if (!object.pageNumber) return;
    event.preventDefault();
    void this.goToPage(object.pageNumber);
  }

  private parseLinkDestination(input: string): { url?: string; pageNumber?: number } | null {
    const pageMatch = /^page:\s*(\d+)$/i.exec(input.trim());
    if (pageMatch) {
      const pageNumber = Number(pageMatch[1]);
      return Number.isInteger(pageNumber) && pageNumber >= 1 && pageNumber <= this.totalPages
        ? { pageNumber }
        : null;
    }
    try {
      const url = new URL(input.trim());
      return url.protocol === 'http:' || url.protocol === 'https:' ? { url: input.trim() } : null;
    } catch {
      return null;
    }
  }

  deleteSelection(): void {
    if (!this.selectedObjectId || this.document?.isEncrypted || this.viewingMode !== 'single') {
      return;
    }

    this.captureHistory('delete-object');
    this.overlayObjects = this.overlayObjects.filter((item) => item.id !== this.selectedObjectId);
    this.selectedObjectId = null;
  }

  private createBaseObject(initial: {
    type: EditableObjectType;
    label: string;
    width: number;
    height: number;
    text?: string;
    imageSrc?: string;
    url?: string;
    pageNumber?: number;
  }): EditableObject {
    const nextId = `obj-${Date.now()}-${this.overlayObjects.length}`;
    const base = this.clampObject({
      id: nextId,
      type: initial.type,
      x: Math.min(48 + this.overlayObjects.length * 12, Math.max(0, this.overlayWidth - 180)),
      y: Math.min(48 + this.overlayObjects.length * 12, Math.max(0, this.overlayHeight - 90)),
      width: initial.width,
      height: initial.height,
      label: initial.label,
      text: initial.text,
      imageSrc: initial.imageSrc,
      url: initial.url,
      pageNumber: initial.pageNumber,
    });

    return base;
  }

  startMove(event: MouseEvent, objectId: string): void {
    event.preventDefault();
    event.stopPropagation();

    const object = this.overlayObjects.find((item) => item.id === objectId);
    if (!object) {
      return;
    }

    this.selectedObjectId = objectId;
    this.captureHistory('move-object');
    this.dragState = {
      mode: 'move',
      objectId,
      startX: event.clientX,
      startY: event.clientY,
      original: { ...object },
    };
  }

  startResize(event: MouseEvent, objectId: string, handle: ResizeHandle): void {
    event.preventDefault();
    event.stopPropagation();

    const object = this.overlayObjects.find((item) => item.id === objectId);
    if (!object) {
      return;
    }

    this.selectedObjectId = objectId;
    this.captureHistory('resize-object');
    this.dragState = {
      mode: 'resize',
      objectId,
      startX: event.clientX,
      startY: event.clientY,
      original: { ...object },
      handle,
    };
  }

  copySelection(): void {
    if (!this.selectedObjectId) {
      return;
    }

    const selected = this.overlayObjects.find((item) => item.id === this.selectedObjectId);
    if (!selected) {
      return;
    }

    this.clipboardObject = { ...selected };
  }

  cutSelection(): void {
    if (!this.selectedObjectId) {
      return;
    }

    const selected = this.overlayObjects.find((item) => item.id === this.selectedObjectId);
    if (!selected) {
      return;
    }

    this.clipboardObject = { ...selected };
    this.captureHistory('cut-object');
    this.overlayObjects = this.overlayObjects.filter((item) => item.id !== this.selectedObjectId);
    this.selectedObjectId = null;
  }

  pasteClipboard(): void {
    if (!this.clipboardObject) {
      return;
    }

    const nextId = `obj-${Date.now()}-${this.overlayObjects.length}`;
    const pasted = this.clampObject({
      ...this.clipboardObject,
      id: nextId,
      x: this.clipboardObject.x + 20,
      y: this.clipboardObject.y + 20,
      label: `${this.clipboardObject.label} copy`,
    });

    this.captureHistory('paste-object');
    this.overlayObjects = [...this.overlayObjects, pasted];
    this.selectedObjectId = nextId;
  }

  async undoEdit(): Promise<void> {
    if (this.document?.isEncrypted || this.viewingMode !== 'single') return;
    if (this.document && this.pageTransformUndo.length) {
      const previousBytes = this.pageTransformUndo.pop()!;
      this.pageTransformRedo.push(this.document.bytes.slice());
      await this.refreshDocumentAfterPageOperation(previousBytes, this.currentPage);
      this.syncHistoryState();
      this.setActionStatus('info', 'Undid the last page change. Press Ctrl+Y to redo.');
      return;
    }
    const previous = this.historyService.undo(this.cloneOverlayObjects(this.overlayObjects));
    if (!previous) {
      this.syncHistoryState();
      return;
    }

    this.overlayObjects = previous;
    this.selectedObjectId = null;
    this.store.dispatch(undoEditCommand());
    this.syncHistoryState();
    this.scheduleAutosave();
  }

  async redoEdit(): Promise<void> {
    if (this.document?.isEncrypted || this.viewingMode !== 'single') return;
    if (this.document && this.pageTransformRedo.length) {
      const nextBytes = this.pageTransformRedo.pop()!;
      this.pageTransformUndo.push(this.document.bytes.slice());
      await this.refreshDocumentAfterPageOperation(nextBytes, this.currentPage);
      this.syncHistoryState();
      this.setActionStatus('info', 'Redid the last page change.');
      return;
    }
    const next = this.historyService.redo(this.cloneOverlayObjects(this.overlayObjects));
    if (!next) {
      this.syncHistoryState();
      return;
    }

    this.overlayObjects = next;
    this.selectedObjectId = null;
    this.store.dispatch(redoEditCommand());
    this.syncHistoryState();
    this.scheduleAutosave();
  }

  async updateFormField(widget: FormWidget, value: string): Promise<void> {
    if (!this.document || this.document.isEncrypted || widget.readOnly) return;
    try {
      const bytes = await this.pdfFormService.updateField(this.document.bytes, widget.name, value);
      await this.refreshDocumentAfterPageOperation(bytes, this.currentPage);
    } catch (error) {
      this.error = `Unable to update form field "${widget.name}": ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  async exportFormData(): Promise<void> {
    if (!this.document) return;
    const document = this.document;
    const name = `${document.name.replace(/\.pdf$/i, '')}-form-data.json`;
    await this.runAction('Exporting form data...', 'Unable to export form data', async () => {
      const serialized = await this.pdfFormService.exportFormData(document.bytes);
      const data = await new Blob([serialized], { type: 'application/json' }).arrayBuffer();
      const result = await this.runtimeService.saveFileDialog(name, data, 'application/json');
      if (result?.canceled) return null;
      return `Form data exported to ${this.savedName(result, name)}.`;
    }, 'Export cancelled. No form data file was saved.');
  }

  async importFormDataFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.document) return;
    input.value = '';
    if (file.size > 5 * 1024 * 1024) {
      this.setActionStatus('error', 'Unable to import form data: form data files must be 5 MB or smaller.');
      return;
    }
    const document = this.document;
    await this.runAction(`Importing form data from ${file.name}...`, 'Unable to import form data', async () => {
      const serialized = await file.text();
      const bytes = await this.pdfFormService.importFormData(document.bytes, serialized);
      const count = (JSON.parse(serialized) as { fields: unknown[] }).fields.length;
      if (!count) return null;
      await this.refreshDocumentAfterPageOperation(bytes, this.currentPage);
      return `Imported ${this.pluralize(count, 'form field value')} from ${file.name}. Save the PDF to keep them.`;
    }, `${file.name} contains no form field values. Nothing was changed.`);
  }

  beginFormFieldAuthoring(type: PdfFormFieldPlacement['type']): void {
    this.formAuthoringType = type;
    this.cropMode = false;
    this.cropSelection = null;
    this.cropDraft = null;
    this.setAnnotationTool(null);
    this.setActionStatus('info', `Click on page ${this.currentPage} where the ${this.formFieldLabel(type)} should go. Press Escape to cancel.`);
  }

  private formFieldLabel(type: PdfFormFieldPlacement['type']): string {
    return type === 'checkbox' ? 'checkbox' : type === 'dropdown' ? 'dropdown field' : 'text field';
  }

  selectFormField(widget: FormWidget): void {
    this.selectedFormFieldName = widget.name;
  }

  async startFormFieldPlacement(event: MouseEvent): Promise<void> {
    if (!this.document || !this.formAuthoringType || event.target !== this.annotationLayer?.nativeElement) return;
    event.preventDefault();
    const type = this.formAuthoringType;
    const label = this.formFieldLabel(type);
    const name = window.prompt(`Enter a name for the ${label}`);
    if (name === null || !name.trim()) {
      this.setActionStatus('info', `No name entered, so no ${label} was added. Click on the page to try again or press Escape to stop.`);
      return;
    }
    if (this.formWidgets.some(widget => widget.name === name.trim())) {
      this.setActionStatus('error', `Unable to add ${label}: a field named "${name.trim()}" already exists. Choose a different name.`);
      return;
    }
    let options: string[] | undefined;
    if (type === 'dropdown') {
      const enteredOptions = window.prompt('Enter dropdown options separated by commas', 'Option 1, Option 2');
      if (enteredOptions === null) {
        this.setActionStatus('info', 'Dropdown field cancelled. Nothing was added.');
        return;
      }
      options = enteredOptions.split(',').map(option => option.trim()).filter(Boolean);
    }
    const point = this.annotationPoint(event);
    const [width, height] = type === 'checkbox' ? [20, 20] : [140, 24];
    const rect = {
      x: Math.min(point.x, Math.max(0, this.overlayWidth - width)),
      y: Math.min(point.y, Math.max(0, this.overlayHeight - height)),
      width: Math.min(width, this.overlayWidth),
      height: Math.min(height, this.overlayHeight),
    };
    const document = this.document;
    const page = this.currentPage;
    await this.runAction(`Adding ${label} "${name.trim()}"...`, `Unable to add ${label}`, async () => {
      const bytes = await this.pdfFormService.createField(document.bytes, {
        name,
        type,
        pageNumber: page,
        viewportWidth: this.overlayWidth,
        viewportHeight: this.overlayHeight,
        rect,
        options,
      });
      this.formAuthoringType = null;
      await this.refreshDocumentAfterPageOperation(bytes, page);
      this.selectedFormFieldName = name.trim();
      return `Added ${label} "${name.trim()}" on page ${page}. Save the PDF to keep it.`;
    });
  }

  async toggleSelectedFieldRequired(): Promise<void> {
    if (!this.document || !this.selectedFormFieldName) return;
    try {
      const bytes = await this.pdfFormService.updateFieldDefinition(this.document.bytes, this.selectedFormFieldName, {
        required: !this.selectedFormFieldRequired,
      });
      await this.refreshDocumentAfterPageOperation(bytes, this.currentPage);
    } catch (error) {
      this.error = `Unable to update required field setting: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  async editSelectedFormField(): Promise<void> {
    if (!this.document || !this.selectedFormFieldName) return;
    const widget = this.formWidgets.find(item => item.name === this.selectedFormFieldName);
    if (!widget) return;
    if (widget.type === 'dropdown') {
      const enteredOptions = window.prompt('Edit dropdown options separated by commas', widget.options.join(', '));
      if (enteredOptions === null) return;
      const options = enteredOptions.split(',').map(option => option.trim()).filter(Boolean);
      try {
        const bytes = await this.pdfFormService.updateFieldDefinition(this.document.bytes, widget.name, { options });
        await this.refreshDocumentAfterPageOperation(bytes, this.currentPage);
      } catch (error) {
        this.error = `Unable to edit form field: ${error instanceof Error ? error.message : String(error)}`;
      }
      return;
    }
    if (widget.type === 'text') {
      const value = window.prompt('Edit field value', widget.value);
      if (value !== null) await this.updateFormField(widget, value);
    }
  }

  async deleteSelectedFormField(): Promise<void> {
    if (!this.document || !this.selectedFormFieldName) return;
    const name = this.selectedFormFieldName;
    if (!window.confirm(`Delete form field "${name}"?`)) return;
    try {
      const bytes = await this.pdfFormService.deleteField(this.document.bytes, name);
      this.formVisibilityRules = this.formVisibilityRules.filter(
        rule => rule.targetFieldName !== name && rule.sourceFieldName !== name
      );
      await this.persistFormVisibilityRules();
      this.selectedFormFieldName = null;
      await this.refreshDocumentAfterPageOperation(bytes, this.currentPage);
    } catch (error) {
      this.error = `Unable to delete form field: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  async setSelectedFieldCondition(): Promise<void> {
    if (!this.document || !this.selectedFormFieldName) return;
    const sourceFieldName = window.prompt('Show this field when which field has a value?');
    if (sourceFieldName === null) return;
    const source = this.formFields.find(field => field.name === sourceFieldName.trim());
    if (!source || source.name === this.selectedFormFieldName) {
      this.error = 'Choose a different existing form field as the visibility condition source.';
      return;
    }
    const equalsValue = window.prompt(`Show "${this.selectedFormFieldName}" when "${source.name}" equals:`);
    if (equalsValue === null) return;
    this.formVisibilityRules = [
      ...this.formVisibilityRules.filter(rule => rule.targetFieldName !== this.selectedFormFieldName),
      { targetFieldName: this.selectedFormFieldName, sourceFieldName: source.name, equalsValue },
    ];
    try {
      await this.persistFormVisibilityRules();
      await this.loadFormWidgets();
    } catch (error) {
      this.error = `Unable to save field visibility rule: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  async clearSelectedFieldCondition(): Promise<void> {
    if (!this.document || !this.selectedFormFieldName) return;
    this.formVisibilityRules = this.formVisibilityRules.filter(rule => rule.targetFieldName !== this.selectedFormFieldName);
    try {
      await this.persistFormVisibilityRules();
      await this.loadFormWidgets();
    } catch (error) {
      this.error = `Unable to clear field visibility rule: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  private async loadFormWidgets(): Promise<void> {
    if (!this.document || typeof this.document.proxy?.getPage !== 'function') {
      this.formWidgets = [];
      this.formFields = [];
      return;
    }
    try {
      const fields = await this.pdfFormService.getFields(this.document.bytes);
      this.formFields = fields;
      const fieldsByName = new Map<string, PdfFormField>(fields.map(field => [field.name, field]));
      const storedRules = await this.persistenceService.getSetting<FormVisibilityRule[]>(this.formVisibilitySettingKey(this.document.id));
      this.formVisibilityRules = Array.isArray(storedRules) ? storedRules.filter(rule =>
        typeof rule?.targetFieldName === 'string' &&
        typeof rule?.sourceFieldName === 'string' &&
        typeof rule?.equalsValue === 'string' &&
        rule.targetFieldName !== rule.sourceFieldName &&
        fieldsByName.has(rule.targetFieldName) &&
        fieldsByName.has(rule.sourceFieldName)
      ) : [];
      const hiddenFields = new Set(this.formVisibilityRules
        .filter(rule => fieldsByName.get(rule.sourceFieldName)?.value !== rule.equalsValue)
        .map(rule => rule.targetFieldName));
      const page = await this.document.proxy.getPage(this.currentPage);
      if (typeof page.getAnnotations !== 'function' || typeof page.getViewport !== 'function') {
        this.formWidgets = [];
        return;
      }
      const viewport = page.getViewport({ scale: 1, rotation: this.rotation });
      const annotations = await page.getAnnotations({ intent: 'display' });
      const widgets: FormWidget[] = [];
      annotations.forEach((annotation: any, index: number) => {
        if (annotation.subtype !== 'Widget' || !Array.isArray(annotation.rect) || annotation.rect.length !== 4) return;
        const field = fieldsByName.get(annotation.fieldName);
        if (!field || field.type === 'unsupported' || hiddenFields.has(annotation.fieldName)) return;
        const fieldFlags = Number(annotation.fieldFlags) || 0;
        let type: FormWidget['type'];
        if (annotation.fieldType === 'Tx' && field.type === 'text') type = 'text';
        else if (annotation.fieldType === 'Ch' && field.type === 'dropdown') type = 'dropdown';
        else if (annotation.fieldType === 'Btn' && (fieldFlags & (1 << 15)) !== 0 && field.type === 'radio') type = 'radio';
        else if (annotation.fieldType === 'Btn' && field.type === 'checkbox') type = 'checkbox';
        else return;

        const rect = viewport.convertToViewportRectangle(annotation.rect) as number[];
        const x1 = Math.min(rect[0], rect[2]);
        const y1 = Math.min(rect[1], rect[3]);
        const scaleX = this.overlayWidth / viewport.width;
        const scaleY = this.overlayHeight / viewport.height;
        const option = String(annotation.buttonValue ?? annotation.exportValue ?? '');
        widgets.push({
          id: String(annotation.id ?? `${annotation.fieldName}-${index}`),
          name: annotation.fieldName,
          type,
          x: x1 * scaleX,
          y: y1 * scaleY,
          width: Math.abs(rect[2] - rect[0]) * scaleX,
          height: Math.abs(rect[3] - rect[1]) * scaleY,
          value: field.value,
          options: field.options,
          option: option || field.options[0] || '',
          date: type === 'text' && /date|dob|birth/i.test(annotation.fieldName),
          readOnly: this.document?.isEncrypted === true || annotation.isReadonly === true,
          required: field.required,
        });
      });
      this.formWidgets = widgets;
    } catch (error) {
      this.formWidgets = [];
      this.formFields = [];
      this.error = `Unable to load PDF form fields: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  private async persistFormVisibilityRules(): Promise<void> {
    if (!this.document) return;
    await this.persistenceService.setSetting(this.formVisibilitySettingKey(this.document.id), this.formVisibilityRules);
  }

  private formVisibilitySettingKey(documentId: string): string {
    return `pdf-form-visibility:${documentId}`;
  }

  private async renderCurrentPage(): Promise<void> {
    if (!this.document) {
      return;
    }
    if (this.viewingMode !== 'single') {
      this.scrollToModePage(this.currentPage);
      return;
    }

    const canvas = this.viewerCanvas?.nativeElement;
    const host = this.viewerHost?.nativeElement;

    if (!canvas || !host) {
      return;
    }

    const options = {
      fitWidth: Math.max(100, host.clientWidth - 32),
      fitHeight: Math.max(100, host.clientHeight - 32),
      zoom: this.zoom,
      rotation: this.rotation,
    };
    if (this.document.isEncrypted) {
      await this.pdfRenderService.renderLoadedPageToCanvas(this.document.proxy, this.currentPage, canvas, options);
    } else {
      await this.pdfRenderService.renderPageToCanvas(this.document.bytes, this.currentPage, canvas, options);
    }

    this.syncOverlayBounds(canvas);
    await this.loadFormWidgets();
  }

  private syncOverlayBounds(canvas: HTMLCanvasElement): void {
    this.overlayWidth = canvas.clientWidth || canvas.width || 0;
    this.overlayHeight = canvas.clientHeight || canvas.height || 0;
    this.overlayObjects = this.overlayObjects.map((object) => this.clampObject(object));
  }

  private computeMovedObject(object: EditableObject, dx: number, dy: number): EditableObject {
    return this.clampObject({
      ...object,
      x: object.x + dx,
      y: object.y + dy,
    });
  }

  private computeResizedObject(object: EditableObject, dx: number, dy: number, handle: ResizeHandle): EditableObject {
    const minSize = 24;
    let { x, y, width, height } = object;

    if (handle.includes('e')) {
      width = Math.max(minSize, object.width + dx);
    }
    if (handle.includes('s')) {
      height = Math.max(minSize, object.height + dy);
    }
    if (handle.includes('w')) {
      const nextWidth = Math.max(minSize, object.width - dx);
      const diff = nextWidth - object.width;
      width = nextWidth;
      x = object.x - diff;
    }
    if (handle.includes('n')) {
      const nextHeight = Math.max(minSize, object.height - dy);
      const diff = nextHeight - object.height;
      height = nextHeight;
      y = object.y - diff;
    }

    return this.clampObject({ ...object, x, y, width, height });
  }

  private getSelectedObject(): EditableObject | null {
    if (!this.selectedObjectId) {
      return null;
    }

    return this.overlayObjects.find((item) => item.id === this.selectedObjectId) ?? null;
  }

  private updateObject(objectId: string, changes: Partial<EditableObject>): void {
    this.overlayObjects = this.overlayObjects.map((item) =>
      item.id === objectId ? this.clampObject({ ...item, ...changes }) : item
    );
  }

  private captureHistory(command: string): void {
    this.historyService.capture(this.cloneOverlayObjects(this.overlayObjects));
    this.store.dispatch(recordEditCommand({ command }));
    this.syncHistoryState();
    this.scheduleAutosave();
  }

  private cloneOverlayObjects(objects: EditableObject[]): EditableObject[] {
    return objects.map((item) => ({ ...item }));
  }

  private syncHistoryState(): void {
    this.canUndo = this.historyService.canUndo() || this.pageTransformUndo.length > 0;
    this.canRedo = this.historyService.canRedo() || this.pageTransformRedo.length > 0;
  }

  private clampObject(object: EditableObject): EditableObject {
    const minSize = 24;
    const widthLimit = this.overlayWidth > 0 ? this.overlayWidth : Number.MAX_SAFE_INTEGER;
    const heightLimit = this.overlayHeight > 0 ? this.overlayHeight : Number.MAX_SAFE_INTEGER;

    const width = Math.max(minSize, Math.min(object.width, widthLimit));
    const height = Math.max(minSize, Math.min(object.height, heightLimit));
    const x = Math.min(Math.max(0, object.x), Math.max(0, widthLimit - width));
    const y = Math.min(Math.max(0, object.y), Math.max(0, heightLimit - height));

    return {
      ...object,
      x,
      y,
      width,
      height,
    };
  }
}
