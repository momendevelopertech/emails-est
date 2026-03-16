'use client';

import { useCallback, useEffect, useMemo, useState, type CSSProperties, type RefObject } from 'react';

export type SpotlightStep = {
    titleAr: string;
    descAr: string;
    targetRef?: RefObject<HTMLElement>;
    targetSelector?: string;
    tooltipPos?: 'below' | 'above';
};

type Props = {
    open: boolean;
    steps: SpotlightStep[];
    currentStep: number;
    onStepChange: (index: number) => void;
    onClose: () => void;
};

export default function SpotlightGuide({ open, steps, currentStep, onStepChange, onClose }: Props) {
    const step = steps[currentStep];
    const [rect, setRect] = useState<DOMRect | null>(null);

    const resolveTarget = useCallback(() => {
        if (!open || !step) return;
        let target: HTMLElement | null = step.targetRef?.current || null;
        if (!target && step.targetSelector) {
            target = document.querySelector(step.targetSelector) as HTMLElement | null;
        }
        if (!target) {
            target = document.querySelector('.rbc-month-view .rbc-day-bg') as HTMLElement | null;
        }
        if (!target) {
            setRect(null);
            return;
        }
        setRect(target.getBoundingClientRect());
    }, [open, step]);

    useEffect(() => {
        if (!open) {
            setRect(null);
            return;
        }
        const update = () => window.requestAnimationFrame(resolveTarget);
        update();
        window.addEventListener('resize', update);
        window.addEventListener('scroll', update, true);
        return () => {
            window.removeEventListener('resize', update);
            window.removeEventListener('scroll', update, true);
        };
    }, [open, resolveTarget, currentStep]);

    const isLastStep = currentStep === steps.length - 1;
    const tooltipPos = step?.tooltipPos ?? 'below';

    const highlightStyle = useMemo(() => {
        if (!rect) return undefined;
        const padding = 6;
        return {
            top: rect.top - padding,
            left: rect.left - padding,
            width: rect.width + padding * 2,
            height: rect.height + padding * 2,
        } as CSSProperties;
    }, [rect]);

    const tooltipStyle = useMemo(() => {
        if (!rect) return undefined;
        const width = 260;
        const margin = 12;
        const left = Math.min(Math.max(rect.left, margin), window.innerWidth - width - margin);
        const top = tooltipPos === 'above' ? rect.top - margin : rect.bottom + margin;
        return {
            top,
            left,
            transform: tooltipPos === 'above' ? 'translateY(-100%)' : 'none',
        } as CSSProperties;
    }, [rect, tooltipPos]);

    if (!open || !step || !rect) return null;

    return (
        <div className="calendar-spotlight-overlay" onClick={onClose}>
            <div className="calendar-spotlight-highlight" style={highlightStyle} onClick={(e) => e.stopPropagation()} />
            <div className="calendar-spotlight-tooltip" style={tooltipStyle} onClick={(e) => e.stopPropagation()}>
                <div className="calendar-spotlight-step">الخطوة {currentStep + 1} من {steps.length}</div>
                <div className="calendar-spotlight-title">{step.titleAr}</div>
                <div className="calendar-spotlight-desc">{step.descAr}</div>
                <div className="calendar-spotlight-footer">
                    <div className="calendar-spotlight-dots">
                        {steps.map((_, index) => (
                            <span
                                key={index}
                                className={`calendar-spotlight-dot${index === currentStep ? ' is-active' : ''}`}
                            />
                        ))}
                    </div>
                    <div className="calendar-spotlight-actions">
                        <button className="calendar-spotlight-button" onClick={onClose}>تخطي</button>
                        <button
                            className="calendar-spotlight-button primary"
                            onClick={() => {
                                if (isLastStep) {
                                    onClose();
                                } else {
                                    onStepChange(currentStep + 1);
                                }
                            }}
                        >
                            {isLastStep ? 'تم ✓' : 'التالي →'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
