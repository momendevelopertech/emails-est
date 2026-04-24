'use client';

import { type ReactNode, useEffect, useRef } from 'react';

type DraggableTableScrollAreaProps = {
    className?: string;
    children: ReactNode;
};

type DragState = {
    active: boolean;
    dragging: boolean;
    pointerId: number | null;
    startX: number;
    startY: number;
    startScrollLeft: number;
};

const INTERACTIVE_SELECTOR = [
    'a',
    'button',
    'input',
    'select',
    'textarea',
    'label',
    'summary',
    '[role="button"]',
    '[role="link"]',
    '[contenteditable="true"]',
    '[data-no-drag-scroll]',
].join(', ');

const DRAG_THRESHOLD_PX = 6;

export default function DraggableTableScrollArea({
    className = '',
    children,
}: DraggableTableScrollAreaProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const dragStateRef = useRef<DragState>({
        active: false,
        dragging: false,
        pointerId: null,
        startX: 0,
        startY: 0,
        startScrollLeft: 0,
    });
    const suppressClickRef = useRef(false);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) {
            return undefined;
        }
        const scrollContainer = container;

        let clearSuppressionTimer: number | null = null;

        const clearSuppression = () => {
            if (clearSuppressionTimer !== null) {
                window.clearTimeout(clearSuppressionTimer);
                clearSuppressionTimer = null;
            }
            suppressClickRef.current = false;
        };

        const teardownPointerListeners = () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
            window.removeEventListener('pointercancel', handlePointerUp);
        };

        const finishDrag = () => {
            const dragState = dragStateRef.current;

            if (!dragState.active) {
                return;
            }

            const shouldSuppressClick = dragState.dragging;

            dragState.active = false;
            dragState.dragging = false;
            dragState.pointerId = null;
            scrollContainer.classList.remove('cursor-grabbing');
            document.body.style.removeProperty('user-select');
            teardownPointerListeners();

            if (shouldSuppressClick) {
                suppressClickRef.current = true;
                clearSuppressionTimer = window.setTimeout(() => {
                    suppressClickRef.current = false;
                    clearSuppressionTimer = null;
                }, 0);
            }
        };

        function handlePointerMove(event: PointerEvent) {
            const dragState = dragStateRef.current;

            if (!dragState.active || event.pointerId !== dragState.pointerId) {
                return;
            }

            const deltaX = event.clientX - dragState.startX;
            const deltaY = event.clientY - dragState.startY;

            if (!dragState.dragging) {
                if (Math.abs(deltaX) < DRAG_THRESHOLD_PX && Math.abs(deltaY) < DRAG_THRESHOLD_PX) {
                    return;
                }

                if (Math.abs(deltaX) <= Math.abs(deltaY)) {
                    finishDrag();
                    return;
                }

                dragState.dragging = true;
                scrollContainer.classList.add('cursor-grabbing');
                document.body.style.userSelect = 'none';
            }

            event.preventDefault();
            scrollContainer.scrollLeft = dragState.startScrollLeft - deltaX;
        }

        function handlePointerUp(event: PointerEvent) {
            const dragState = dragStateRef.current;

            if (!dragState.active || event.pointerId !== dragState.pointerId) {
                return;
            }

            finishDrag();
        }

        function handlePointerDown(event: PointerEvent) {
            if (event.pointerType && event.pointerType !== 'mouse') {
                return;
            }

            if (event.button !== 0 || scrollContainer.scrollWidth <= scrollContainer.clientWidth) {
                return;
            }

            const target = event.target;
            if (!(target instanceof HTMLElement)) {
                return;
            }

            if (!target.closest('tr') || target.closest(INTERACTIVE_SELECTOR)) {
                return;
            }

            // Start drag-to-scroll only from non-interactive table row content,
            // so row actions such as buttons, selects, and checkboxes still work normally.
            clearSuppression();
            dragStateRef.current = {
                active: true,
                dragging: false,
                pointerId: event.pointerId,
                startX: event.clientX,
                startY: event.clientY,
                startScrollLeft: scrollContainer.scrollLeft,
            };

            window.addEventListener('pointermove', handlePointerMove, { passive: false });
            window.addEventListener('pointerup', handlePointerUp);
            window.addEventListener('pointercancel', handlePointerUp);
        }

        const handleClickCapture = (event: MouseEvent) => {
            if (!suppressClickRef.current) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            clearSuppression();
        };

        scrollContainer.addEventListener('pointerdown', handlePointerDown);
        scrollContainer.addEventListener('click', handleClickCapture, true);

        return () => {
            scrollContainer.removeEventListener('pointerdown', handlePointerDown);
            scrollContainer.removeEventListener('click', handleClickCapture, true);
            teardownPointerListeners();
            clearSuppression();
            scrollContainer.classList.remove('cursor-grabbing');
            document.body.style.removeProperty('user-select');
        };
    }, []);

    return (
        <div ref={containerRef} className={className}>
            {children}
        </div>
    );
}
