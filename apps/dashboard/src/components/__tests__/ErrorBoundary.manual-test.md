# Error Boundary Manual Testing Guide

## Overview
Testing guide for the ErrorBoundary component implementation.

## Test Scenarios

### Test 1: Error Catching
1. Navigate to any dashboard page
2. Observe error boundary in action

**Expected Result:**
- Error boundary displays user-friendly error message
- "Oops! Something went wrong" message visible
- Error details are expandable
- "Try Again" and "Reload Page" buttons visible
- Dashboard sidebar remains functional

### Test 2: Retry Button
1. If error displayed, click "Try Again"

**Expected Result:**
- Error UI disappears
- Component renders successfully

### Test 3: Error Details
1. Click "Error Details" to expand
2. Verify stack trace visible

**Expected Result:**
- Details section expands
- Full error stack trace displayed
- Component stack information shown

### Test 4: Error Storage
1. Open DevTools, go to Application > Local Storage
2. Check `app_errors` entry

**Expected Result:**
- Errors stored in localStorage
- Last 10 errors kept

### Test 5: Mobile Responsiveness
1. Open DevTools Device Emulation
2. Select mobile device
3. Verify UI responsive

**Expected Result:**
- Buttons stack vertically
- Text readable
- Proper spacing on mobile

## Browser Compatibility

Test in:
- Chrome/Chromium (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Debug Tips

View stored errors:
```javascript
JSON.parse(localStorage.getItem('app_errors')).forEach(err => console.log(err));
```

Clear error history:
```javascript
localStorage.removeItem('app_errors');
```

## Related Files

- Component: `/apps/dashboard/src/components/ErrorBoundary.tsx`
- Styles: `/apps/dashboard/src/styles/dashboard.css`
- Utils: `/apps/dashboard/src/utils/errorReporting.ts`
