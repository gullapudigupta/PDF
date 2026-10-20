import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AiKeyGuideComponent } from './ai-key-guide.component';

describe('AiKeyGuideComponent', () => {
  let fixture: ComponentFixture<AiKeyGuideComponent>;
  let component: AiKeyGuideComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AiKeyGuideComponent] }).compileComponents();
    fixture = TestBed.createComponent(AiKeyGuideComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('walks through illustrated steps with Next/Previous and the step indicator', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.browser')).not.toBeNull();
    expect(el.querySelector('figcaption h3')?.textContent).toContain('Sign in');
    expect(el.querySelectorAll('.progress button').length).toBe(component.steps.length);
    const prev = Array.from(el.querySelectorAll('footer button')).find(b => b.textContent?.trim() === 'Previous') as HTMLButtonElement;
    expect(prev.disabled).toBeTrue();
    (el.querySelector('footer button.primary') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(component.index).toBe(1);
    expect(el.querySelector('.badge')?.textContent).toContain('Step 2 of 6');
    expect(el.querySelector('.progress [aria-current="step"]')?.textContent?.trim()).toBe('2');
    for (let step = component.index; step < component.steps.length - 1; step++) {
      (el.querySelector('footer button.primary') as HTMLButtonElement).click();
      fixture.detectChanges();
    }
    expect(el.querySelector('footer button.primary')?.textContent?.trim()).toBe('Done');
    expect(el.querySelector('figcaption h3')?.textContent).toContain('Paste it');
  });

  it('supports arrow keys and closes with Escape, backdrop or Done', () => {
    const close = jasmine.createSpy('close');
    component.close.subscribe(close);
    const host = fixture.nativeElement as HTMLElement;
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(component.index).toBe(1);
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    expect(component.index).toBe(0);
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    (host.querySelector('.backdrop') as HTMLElement).click();
    expect(close).toHaveBeenCalledTimes(2);
  });
});
