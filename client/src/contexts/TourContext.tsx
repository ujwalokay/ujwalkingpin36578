import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import Joyride, { CallBackProps, Step, STATUS, EVENTS, ACTIONS } from "react-joyride";

interface TourContextValue {
  startTour: () => void;
  resetTour: () => void;
  stopTour: () => void;
  isTourRunning: boolean;
  registerSteps: (steps: Step[]) => void;
}

const TourContext = createContext<TourContextValue | undefined>(undefined);

interface TourProviderProps {
  children: ReactNode;
}

const TOUR_COMPLETION_KEY = "airavoto_tour_completed";

const joyrideStyles = {
  options: {
    arrowColor: 'hsl(var(--card))',
    backgroundColor: 'hsl(var(--card))',
    overlayColor: 'rgba(0, 0, 0, 0.7)',
    primaryColor: '#8b5cf6',
    textColor: 'hsl(var(--card-foreground))',
    width: 380,
    zIndex: 10000,
  },
  tooltip: {
    borderRadius: '0.5rem',
    padding: '1.25rem',
    border: '1px solid hsl(var(--border))',
  },
  tooltipContainer: {
    textAlign: 'left' as const,
  },
  tooltipTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    marginBottom: '0.5rem',
    color: 'hsl(var(--card-foreground))',
  },
  tooltipContent: {
    fontSize: '0.875rem',
    lineHeight: '1.5',
    color: 'hsl(var(--muted-foreground))',
  },
  buttonNext: {
    backgroundColor: '#8b5cf6',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    padding: '0.5rem 1rem',
    fontWeight: 500,
  },
  buttonBack: {
    color: 'hsl(var(--muted-foreground))',
    marginRight: '0.5rem',
    fontSize: '0.875rem',
  },
  buttonSkip: {
    color: 'hsl(var(--muted-foreground))',
    fontSize: '0.875rem',
  },
  beacon: {
    display: 'none',
  },
  spotlight: {
    borderRadius: '0.5rem',
  },
};

export function TourProvider({ children }: TourProviderProps) {
  const [run, setRun] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [stepIndex, setStepIndex] = useState(0);

  const isTourCompleted = useCallback(() => {
    const completed = localStorage.getItem(TOUR_COMPLETION_KEY);
    return completed === 'true';
  }, []);

  const markTourCompleted = useCallback(() => {
    localStorage.setItem(TOUR_COMPLETION_KEY, 'true');
  }, []);

  const startTour = useCallback(() => {
    setStepIndex(0);
    setRun(true);
  }, []);

  const resetTour = useCallback(() => {
    localStorage.removeItem(TOUR_COMPLETION_KEY);
    setStepIndex(0);
    setRun(true);
  }, []);

  const stopTour = useCallback(() => {
    setRun(false);
  }, []);

  const registerSteps = useCallback((newSteps: Step[]) => {
    setSteps(newSteps);
  }, []);

  const handleJoyrideCallback = useCallback((data: CallBackProps) => {
    const { status, type, action, index } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRun(false);
      markTourCompleted();
    } else if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      const nextStepIndex = index + (action === ACTIONS.PREV ? -1 : 1);
      setStepIndex(nextStepIndex);
    }
  }, [markTourCompleted]);


  const value: TourContextValue = {
    startTour,
    resetTour,
    stopTour,
    isTourRunning: run,
    registerSteps,
  };

  return (
    <TourContext.Provider value={value}>
      {children}
      <Joyride
        steps={steps}
        run={run}
        stepIndex={stepIndex}
        continuous
        showProgress
        showSkipButton
        scrollToFirstStep
        disableScrolling={false}
        spotlightClicks={true}
        callback={handleJoyrideCallback}
        styles={joyrideStyles}
        locale={{
          back: 'Back',
          close: 'Close',
          last: 'Finish Tour',
          next: 'Next',
          skip: 'Skip Tour',
        }}
      />
    </TourContext.Provider>
  );
}

export function useTour() {
  const context = useContext(TourContext);
  if (context === undefined) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
}
