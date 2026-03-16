'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { createPortal } from 'react-dom';

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

type Rect = { top: number; left: number; width: number; height: number };

export default function SpotlightGuide({ open, steps, currentStep, onStepChange, onClose }: Props) {
    const step = steps[currentStep];
    const [rect, setRect] = useState<Rect | null>(null);
    const [tooltipSize, setTooltipSize] = useState({ width: 260, height: 140 });
    const lastRectRef = useRef<Rect | null>(null);
    const tooltipRef = useRef<HTMLDivElement | null>(null);

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
        if (target.classList.contains('rbc-event')) {
            const eventRect = target.getBoundingClientRect();
            const centerX = eventRect.left + eventRect.width / 2;
            const centerY = eventRect.top + eventRect.height / 2;
            const elements = document.elementsFromPoint(centerX, centerY) as HTMLElement[];
            const cell = elements.find((el) => el.classList?.contains('rbc-day-bg') || el.classList?.contains('rbc-day-slot'));
            if (cell) target = cell;
        }
        const nextRect = target.getBoundingClientRect();
        const next = { top: nextRect.top, left: nextRect.left, width: nextRect.width, height: nextRect.height };
        const prev = lastRectRef.current;
        if (
            !prev ||
            Math.abs(prev.top - next.top) > 0.5 ||
            Math.abs(prev.left - next.left) > 0.5 ||
            Math.abs(prev.width - next.width) > 0.5 ||
            Math.abs(prev.height - next.height) > 0.5
        ) {
            lastRectRef.current = next;
            setRect(next);
        }
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

    useLayoutEffect(() => {
        if (!open || !tooltipRef.current) return;
        const bounds = tooltipRef.current.getBoundingClientRect();
        const next = { width: bounds.width, height: bounds.height };
        setTooltipSize((prev) =>
            Math.abs(prev.width - next.width) < 1 && Math.abs(prev.height - next.height) < 1 ? prev : next,
        );
    }, [open, currentStep, rect]);

    useEffect(() => {
        if (!open) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [open]);

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
        const margin = 12;
        const width = tooltipSize.width || 260;
        const height = tooltipSize.height || 140;
        const centerX = rect.left + rect.width / 2;
        let left = centerX - width / 2;
        left = Math.min(Math.max(left, margin), window.innerWidth - width - margin);

        const rectBottom = rect.top + rect.height;
        const fitsBelow = rectBottom + margin + height <= window.innerHeight;
        const fitsAbove = rect.top - margin - height >= 0;
        let resolvedPos = tooltipPos;
        if (tooltipPos === 'below' && !fitsBelow && fitsAbove) resolvedPos = 'above';
        if (tooltipPos === 'above' && !fitsAbove && fitsBelow) resolvedPos = 'below';
        let top = resolvedPos === 'above' ? rect.top - margin - height : rectBottom + margin;
        top = Math.min(Math.max(top, margin), window.innerHeight - height - margin);
        return {
            top,
            left,
        } as CSSProperties;
    }, [rect, tooltipPos, tooltipSize.height, tooltipSize.width]);

    if (!open || !step || !rect) return null;

    if (typeof document === 'undefined') return null;

    const content = (
        <div className="calendar-spotlight-overlay" onClick={onClose}>
            <div className="calendar-spotlight-highlight" style={highlightStyle} onClick={(e) => e.stopPropagation()} />
            <div
                ref={tooltipRef}
                className="calendar-spotlight-tooltip"
                style={tooltipStyle}
                onClick={(e) => e.stopPropagation()}
                dir="rtl"
            >
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

    return createPortal(content, document.body);
}
