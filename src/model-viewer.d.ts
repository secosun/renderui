declare namespace JSX {
  interface IntrinsicElements {
    'model-viewer': {
      ref?: any;
      src?: string;
      alt?: string;
      poster?: string;
      'auto-rotate'?: boolean;
      'camera-controls'?: boolean;
      'ar-status'?: string;
      class?: string;
      style?: Record<string, string | number>;
      children?: any;
    };
  }
}
