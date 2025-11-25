"use client";

import { useEffect } from "react";

/**
 * ExtensionErrorHandler
 * 
 * Suppresses common browser extension errors that appear in the console
 * but don't affect the functionality of the application.
 * 
 * Common errors suppressed:
 * - "Extension context invalidated" - occurs when extensions are reloaded
 * - Extension-related script errors from content.js, background.js, etc.
 * 
 * These errors are NOT caused by our application code and cannot be prevented.
 * They occur when browser extensions (password managers, ad blockers, etc.)
 * are updated or reloaded while the page is open.
 */
export function ExtensionErrorHandler() {
  useEffect(() => {
    // Store original console.error
    const originalError = console.error;

    // Override console.error to filter extension errors
    console.error = (...args: any[]) => {
      // Convert all arguments to strings for pattern matching
      const errorString = args.map(arg => 
        typeof arg === 'string' ? arg : JSON.stringify(arg)
      ).join(' ');

      // List of patterns that indicate browser extension errors
      const extensionErrorPatterns = [
        'Extension context invalidated',
        'content.js',
        'content-script.js',
        'chrome-extension://',
        'moz-extension://',
        'safari-extension://',
        'Extension manifest',
        'Failed to load extension',
      ];

      // Check if the error matches any extension error pattern
      const isExtensionError = extensionErrorPatterns.some(pattern =>
        errorString.includes(pattern)
      );

      // Only log the error if it's not an extension error
      if (!isExtensionError) {
        originalError.apply(console, args);
      }
    };

    // Global error event handler for uncaught errors
    const handleError = (event: ErrorEvent) => {
      const errorMessage = event.message || '';
      const errorFilename = event.filename || '';

      // Check if error is from a browser extension
      const isExtensionError = 
        errorMessage.includes('Extension context invalidated') ||
        errorFilename.includes('chrome-extension://') ||
        errorFilename.includes('moz-extension://') ||
        errorFilename.includes('safari-extension://') ||
        errorFilename.includes('content.js') ||
        errorFilename.includes('content-script.js');

      if (isExtensionError) {
        // Prevent the error from appearing in console
        event.preventDefault();
        event.stopPropagation();
        return true;
      }

      return false;
    };

    // Global promise rejection handler for unhandled rejections
    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const reasonString = typeof reason === 'string' ? reason : JSON.stringify(reason);

      // Check if rejection is from a browser extension
      const isExtensionError = 
        reasonString.includes('Extension context invalidated') ||
        reasonString.includes('chrome-extension://') ||
        reasonString.includes('moz-extension://') ||
        reasonString.includes('content.js');

      if (isExtensionError) {
        // Prevent the error from appearing in console
        event.preventDefault();
        event.stopPropagation();
        return true;
      }

      return false;
    };

    // Add global error handlers
    window.addEventListener('error', handleError, true);
    window.addEventListener('unhandledrejection', handleRejection, true);

    // Cleanup on unmount
    return () => {
      console.error = originalError;
      window.removeEventListener('error', handleError, true);
      window.removeEventListener('unhandledrejection', handleRejection, true);
    };
  }, []);

  // This component doesn't render anything
  return null;
}

