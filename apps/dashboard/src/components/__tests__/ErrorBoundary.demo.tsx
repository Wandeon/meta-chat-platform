/**
 * Error Boundary Demo Component
 */
export function ErrorBoundaryDemo(): JSX.Element {
  const shouldThrowError = (window as unknown as Record<string, unknown>).__DEMO_THROW_ERROR__;

  if (shouldThrowError) {
    throw new Error(
      'Demo error thrown by ErrorBoundaryDemo. ' +
      'Run: delete window.__DEMO_THROW_ERROR__; and click Try Again to recover.'
    );
  }

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <p>Error Boundary Demo</p>
    </div>
  );
}
