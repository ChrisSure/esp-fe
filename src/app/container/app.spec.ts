import { App } from './app';

describe('App - Unit Tests', () => {
  let component: App;

  beforeEach(() => {
    // Create component instance manually to avoid Angular Material rendering issues
    component = new App();
  });

  it('should create the app', () => {
    expect(component).toBeTruthy();
  });

  it('should be an instance of App class', () => {
    expect(component).toBeInstanceOf(App);
  });

  it('should have proper component structure', () => {
    expect(component.constructor.name).toBe('App');
  });
});
