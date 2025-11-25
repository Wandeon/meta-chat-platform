import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../api/client';

interface SetupWizardProps {
  onComplete: () => void;
}

type Step = 'knowledge' | 'instructions' | 'test' | 'deploy';

const STEPS: { id: Step; title: string; description: string }[] = [
  { id: 'knowledge', title: 'Add Knowledge', description: 'Upload documents or paste text for your chatbot' },
  { id: 'instructions', title: 'Set Instructions', description: 'Tell your bot how to behave' },
  { id: 'test', title: 'Test Your Bot', description: 'Try a conversation before going live' },
  { id: 'deploy', title: 'Deploy', description: 'Connect to your website or messaging app' },
];

export function SetupWizard({ onComplete }: SetupWizardProps) {
  const [currentStep, setCurrentStep] = useState<Step>('knowledge');
  const [error, setError] = useState<string | null>(null);
  const api = useApi();
  const queryClient = useQueryClient();

  const completeSetup = useMutation({
    mutationFn: () => api.post('/api/tenants/setup-complete', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-settings'] });
      onComplete();
    },
    onError: () => {
      setError('Failed to complete setup. Please try again.');
    },
  });

  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);
  const isLastStep = currentIndex === STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      completeSetup.mutate();
    } else {
      setCurrentStep(STEPS[currentIndex + 1].id);
    }
  };

  const handleSkip = () => {
    if (isLastStep) {
      completeSetup.mutate();
    } else {
      setCurrentStep(STEPS[currentIndex + 1].id);
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentStep(STEPS[currentIndex - 1].id);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '16px',
        maxWidth: '600px',
        width: '90%',
        maxHeight: '90vh',
        overflow: 'auto',
        position: 'relative',
      }}>
        {/* Close button */}
        <button
          onClick={onComplete}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'transparent',
            border: 'none',
            fontSize: '24px',
            color: '#64748b',
            cursor: 'pointer',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
            transition: 'background 0.2s',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = '#f1f5f9';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
          aria-label="Close wizard"
        >
          ×
        </button>

        {/* Progress bar */}
        <div style={{ padding: '24px 24px 0' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
            {STEPS.map((step, i) => (
              <div
                key={step.id}
                style={{
                  flex: 1,
                  height: '4px',
                  borderRadius: '2px',
                  background: i <= currentIndex ? '#4f46e5' : '#e2e8f0',
                }}
              />
            ))}
          </div>
          <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '8px' }}>
            Step {currentIndex + 1} of {STEPS.length}
          </div>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '24px' }}>{STEPS[currentIndex].title}</h2>
          <p style={{ margin: 0, color: '#64748b' }}>{STEPS[currentIndex].description}</p>
        </div>

        {/* Error message */}
        {error && (
          <div style={{
            margin: '16px 24px 0',
            padding: '12px 16px',
            background: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#991b1b',
            fontSize: '14px',
          }}>
            {error}
          </div>
        )}

        {/* Step content */}
        <div style={{ padding: '24px' }}>
          {currentStep === 'knowledge' && <KnowledgeStep />}
          {currentStep === 'instructions' && <InstructionsStep />}
          {currentStep === 'test' && <TestStep />}
          {currentStep === 'deploy' && <DeployStep />}
        </div>

        {/* Navigation */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
        }}>
          <button
            onClick={handleBack}
            disabled={currentIndex === 0}
            style={{
              padding: '10px 20px',
              background: 'transparent',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
              opacity: currentIndex === 0 ? 0.5 : 1,
            }}
          >
            Back
          </button>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleSkip}
              style={{
                padding: '10px 20px',
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
              }}
            >
              Skip
            </button>
            <button
              onClick={handleNext}
              disabled={completeSetup.isPending}
              style={{
                padding: '10px 24px',
                background: '#4f46e5',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {isLastStep ? (completeSetup.isPending ? 'Finishing...' : 'Finish Setup') : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Step components (simplified versions)
function KnowledgeStep() {
  return (
    <div style={{ textAlign: 'center', padding: '24px' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>📚</div>
      <p style={{ color: '#64748b' }}>
        Upload documents or paste text to teach your chatbot about your business.
        You can do this now or later from the Knowledge Base page.
      </p>
    </div>
  );
}

function InstructionsStep() {
  return (
    <div style={{ textAlign: 'center', padding: '24px' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚙️</div>
      <p style={{ color: '#64748b' }}>
        Tell your chatbot how to behave - its personality, tone, and any special rules.
        You can customize this anytime from Settings.
      </p>
    </div>
  );
}

function TestStep() {
  return (
    <div style={{ textAlign: 'center', padding: '24px' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🧪</div>
      <p style={{ color: '#64748b' }}>
        Try chatting with your bot to see how it responds.
        Use the Test page anytime to refine its behavior.
      </p>
    </div>
  );
}

function DeployStep() {
  return (
    <div style={{ textAlign: 'center', padding: '24px' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚀</div>
      <p style={{ color: '#64748b' }}>
        Ready to go live? Deploy your chatbot to your website, WhatsApp, or Facebook Messenger.
        Visit the Deploy page to get started.
      </p>
    </div>
  );
}
