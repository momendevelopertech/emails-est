'use client';

import { Check, ChevronDown } from 'lucide-react';
import {
    KeyboardEvent as ReactKeyboardEvent,
    useEffect,
    useId,
    useMemo,
    useRef,
    useState,
} from 'react';
import { createPortal } from 'react-dom';

type FormSelectOption = {
    value: string;
    label: string;
    description?: string;
    disabled?: boolean;
};

type FormSelectProps = {
    value: string;
    onChange: (value: string) => void;
    options: FormSelectOption[];
    placeholder?: string;
    ariaLabel?: string;
    disabled?: boolean;
    invalid?: boolean;
    name?: string;
    className?: string;
    triggerClassName?: string;
    panelClassName?: string;
};

type PanelPosition = {
    top: number;
    left: number;
    width: number;
    maxHeight: number;
    placement: 'top' | 'bottom';
};

const PANEL_GAP = 8;
const VIEWPORT_PADDING = 12;

const joinClasses = (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(' ');

const findFirstEnabledIndex = (options: FormSelectOption[]) => options.findIndex((option) => !option.disabled);

const findLastEnabledIndex = (options: FormSelectOption[]) => {
    for (let index = options.length - 1; index >= 0; index -= 1) {
        if (!options[index].disabled) {
            return index;
        }
    }

    return -1;
};

const findNextEnabledIndex = (options: FormSelectOption[], startIndex: number, direction: 1 | -1) => {
    if (!options.length) {
        return -1;
    }

    let index = startIndex;

    for (let attempt = 0; attempt < options.length; attempt += 1) {
        index = (index + direction + options.length) % options.length;
        if (!options[index].disabled) {
            return index;
        }
    }

    return -1;
};

export type { FormSelectOption };

export default function FormSelect({
    value,
    onChange,
    options,
    placeholder,
    ariaLabel,
    disabled = false,
    invalid = false,
    name,
    className,
    triggerClassName,
    panelClassName,
}: FormSelectProps) {
    const listboxId = useId();
    const triggerRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
    const [isMounted, setIsMounted] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [panelPosition, setPanelPosition] = useState<PanelPosition | null>(null);

    const hasPlaceholder = Boolean(placeholder);
    const isPlaceholderValue = hasPlaceholder && value === '';
    const selectedOption = useMemo(
        () => options.find((option) => option.value === value) ?? null,
        [options, value],
    );
    const selectedIndex = useMemo(
        () => options.findIndex((option) => option.value === value && !option.disabled),
        [options, value],
    );

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const updatePanelPosition = () => {
        const trigger = triggerRef.current;
        if (!trigger) {
            return;
        }

        const rect = trigger.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        const spaceBelow = viewportHeight - rect.bottom - VIEWPORT_PADDING;
        const spaceAbove = rect.top - VIEWPORT_PADDING;
        const placement = spaceBelow < 220 && spaceAbove > spaceBelow ? 'top' : 'bottom';
        const maxHeight = Math.max(180, Math.min(320, placement === 'top' ? spaceAbove - PANEL_GAP : spaceBelow - PANEL_GAP));
        const left = Math.min(
            Math.max(VIEWPORT_PADDING, rect.left),
            Math.max(VIEWPORT_PADDING, viewportWidth - rect.width - VIEWPORT_PADDING),
        );

        setPanelPosition({
            top: placement === 'top' ? rect.top - PANEL_GAP : rect.bottom + PANEL_GAP,
            left,
            width: rect.width,
            maxHeight,
            placement,
        });
    };

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        updatePanelPosition();

        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target as Node | null;
            if (!target) {
                return;
            }

            if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) {
                return;
            }

            setIsOpen(false);
        };

        const handleFocusIn = (event: FocusEvent) => {
            const target = event.target as Node | null;
            if (!target) {
                return;
            }

            if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) {
                return;
            }

            setIsOpen(false);
        };

        const handleViewportChange = () => updatePanelPosition();

        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('focusin', handleFocusIn);
        window.addEventListener('resize', handleViewportChange);
        window.addEventListener('scroll', handleViewportChange, true);

        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('focusin', handleFocusIn);
            window.removeEventListener('resize', handleViewportChange);
            window.removeEventListener('scroll', handleViewportChange, true);
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const nextIndex = selectedIndex >= 0 ? selectedIndex : findFirstEnabledIndex(options);
        setHighlightedIndex(nextIndex);

        const frame = window.requestAnimationFrame(() => {
            panelRef.current?.focus();
        });

        return () => window.cancelAnimationFrame(frame);
    }, [isOpen, options, selectedIndex]);

    useEffect(() => {
        if (!isOpen || highlightedIndex < 0) {
            return;
        }

        optionRefs.current[highlightedIndex]?.scrollIntoView({ block: 'nearest' });
    }, [highlightedIndex, isOpen]);

    const openSelect = (preferredIndex?: number) => {
        if (disabled || !options.length) {
            return;
        }

        const fallbackIndex = selectedIndex >= 0 ? selectedIndex : findFirstEnabledIndex(options);
        setHighlightedIndex(preferredIndex ?? fallbackIndex);
        setIsOpen(true);
    };

    const closeSelect = () => {
        setIsOpen(false);
        setHighlightedIndex(-1);
    };

    const commitValue = (nextValue: string) => {
        onChange(nextValue);
        closeSelect();
        triggerRef.current?.focus();
    };

    const moveHighlight = (direction: 1 | -1) => {
        if (!options.length) {
            return;
        }

        const startIndex = highlightedIndex >= 0
            ? highlightedIndex
            : direction === 1
                ? findLastEnabledIndex(options)
                : findFirstEnabledIndex(options);

        const nextIndex = findNextEnabledIndex(options, startIndex, direction);
        if (nextIndex >= 0) {
            setHighlightedIndex(nextIndex);
        }
    };

    const handleTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
        if (disabled) {
            return;
        }

        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                if (!isOpen) {
                    openSelect(selectedIndex >= 0 ? selectedIndex : findFirstEnabledIndex(options));
                } else {
                    moveHighlight(1);
                }
                break;
            case 'ArrowUp':
                event.preventDefault();
                if (!isOpen) {
                    openSelect(selectedIndex >= 0 ? selectedIndex : findLastEnabledIndex(options));
                } else {
                    moveHighlight(-1);
                }
                break;
            case 'Enter':
            case ' ':
                event.preventDefault();
                if (isOpen && highlightedIndex >= 0 && !options[highlightedIndex]?.disabled) {
                    commitValue(options[highlightedIndex].value);
                } else {
                    openSelect();
                }
                break;
            case 'Escape':
                if (isOpen) {
                    event.preventDefault();
                    closeSelect();
                    triggerRef.current?.focus();
                }
                break;
            default:
                break;
        }
    };

    const handlePanelKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                moveHighlight(1);
                break;
            case 'ArrowUp':
                event.preventDefault();
                moveHighlight(-1);
                break;
            case 'Home':
                event.preventDefault();
                setHighlightedIndex(findFirstEnabledIndex(options));
                break;
            case 'End':
                event.preventDefault();
                setHighlightedIndex(findLastEnabledIndex(options));
                break;
            case 'Enter':
            case ' ':
                event.preventDefault();
                if (highlightedIndex >= 0 && !options[highlightedIndex]?.disabled) {
                    commitValue(options[highlightedIndex].value);
                }
                break;
            case 'Escape':
                event.preventDefault();
                closeSelect();
                triggerRef.current?.focus();
                break;
            case 'Tab':
                closeSelect();
                break;
            default:
                break;
        }
    };

    const displayLabel = isPlaceholderValue
        ? placeholder
        : (selectedOption?.label ?? placeholder ?? options[0]?.label ?? '');

    const triggerClasses = joinClasses(
        'group relative flex min-h-[3.5rem] w-full items-center rounded-[1.4rem] border px-4 py-3 text-start transition',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-100',
        invalid
            ? 'border-rose-300 shadow-[0_0_0_4px_rgba(251,191,191,0.18),0_12px_28px_rgba(15,23,42,0.06)]'
            : isOpen
                ? 'border-emerald-300 bg-white shadow-[0_0_0_4px_rgba(16,185,129,0.12),0_16px_34px_rgba(15,23,42,0.08)]'
                : 'border-slate-200 bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_10px_24px_rgba(15,23,42,0.04)] hover:border-slate-300 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_12px_28px_rgba(15,23,42,0.06)]',
        disabled && 'cursor-not-allowed bg-slate-100 text-slate-400 shadow-none',
        triggerClassName,
    );

    const optionClass = (option: FormSelectOption, index: number) => {
        const isSelected = option.value === value && !(option.value === '' && isPlaceholderValue);
        const isHighlighted = highlightedIndex === index;

        return joinClasses(
            'group flex w-full items-start gap-3 rounded-[1.1rem] px-3 py-2.5 text-start transition',
            option.disabled
                ? 'cursor-not-allowed opacity-45'
                : isSelected
                    ? 'bg-emerald-50 text-slate-950'
                    : isHighlighted
                        ? 'bg-slate-50 text-slate-900'
                        : 'text-slate-700 hover:bg-slate-50',
        );
    };

    return (
        <div className={joinClasses('relative w-full', className)}>
            {name ? <input type="hidden" name={name} value={value} /> : null}

            <button
                ref={triggerRef}
                type="button"
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-controls={isOpen ? listboxId : undefined}
                aria-label={ariaLabel}
                disabled={disabled}
                className={triggerClasses}
                onClick={() => (isOpen ? closeSelect() : openSelect())}
                onKeyDown={handleTriggerKeyDown}
            >
                <span className={joinClasses(
                    'block min-w-0 flex-1 pe-11 text-sm font-medium',
                    isPlaceholderValue ? 'text-slate-500' : 'text-slate-900',
                )}>
                    <span className="block truncate">{displayLabel}</span>
                </span>

                <span
                    className={joinClasses(
                        'pointer-events-none absolute inset-y-2 end-2 inline-flex w-10 items-center justify-center rounded-full border transition',
                        isOpen
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-slate-200 bg-slate-50 text-slate-400 group-hover:border-slate-300 group-hover:text-slate-600',
                        invalid && 'border-rose-200 bg-rose-50 text-rose-500',
                        disabled && 'border-slate-200 bg-slate-100 text-slate-300',
                    )}
                >
                    <ChevronDown className={joinClasses('h-4 w-4 transition', isOpen && 'rotate-180')} />
                </span>
            </button>

            {isMounted && isOpen && panelPosition ? createPortal(
                <div
                    ref={panelRef}
                    id={listboxId}
                    role="listbox"
                    tabIndex={-1}
                    className={joinClasses(
                        'dropdown-panel z-[160] overflow-auto rounded-[1.35rem] p-2 outline-none',
                        panelClassName,
                    )}
                    style={{
                        position: 'fixed',
                        top: panelPosition.top,
                        left: panelPosition.left,
                        width: panelPosition.width,
                        maxHeight: panelPosition.maxHeight,
                        transform: panelPosition.placement === 'top' ? 'translateY(-100%)' : undefined,
                    }}
                    onKeyDown={handlePanelKeyDown}
                >
                    <div className="space-y-1">
                        {options.map((option, index) => {
                            const isSelected = option.value === value && !(option.value === '' && isPlaceholderValue);

                            return (
                                <button
                                    key={`${option.value}-${index}`}
                                    ref={(element) => {
                                        optionRefs.current[index] = element;
                                    }}
                                    type="button"
                                    role="option"
                                    aria-selected={isSelected}
                                    disabled={option.disabled}
                                    className={optionClass(option, index)}
                                    onMouseEnter={() => {
                                        if (!option.disabled) {
                                            setHighlightedIndex(index);
                                        }
                                    }}
                                    onMouseDown={(event) => event.preventDefault()}
                                    onClick={() => {
                                        if (!option.disabled) {
                                            commitValue(option.value);
                                        }
                                    }}
                                >
                                    <span
                                        className={joinClasses(
                                            'mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition',
                                            isSelected
                                                ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                                                : 'border-slate-200 bg-white text-transparent group-hover:border-slate-300',
                                        )}
                                    >
                                        <Check className="h-3 w-3" />
                                    </span>

                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-medium">{option.label}</span>
                                        {option.description ? (
                                            <span className="mt-0.5 block text-xs text-slate-500">{option.description}</span>
                                        ) : null}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>,
                document.body,
            ) : null}
        </div>
    );
}
