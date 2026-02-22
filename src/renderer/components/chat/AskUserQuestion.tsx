/**
 * AskUserQuestion - Interactive question component for agent queries
 *
 * Renders questions from the agent with multiple choice (radio) or
 * multi-select (checkbox) options, plus an "Other" custom input option.
 */
import { useState, useCallback, useId } from 'react';

export interface QuestionOption {
  id: string;
  label: string;
  description?: string;
}

export interface AskUserQuestionData {
  id: string;
  question: string;
  options: QuestionOption[];
  multiSelect: boolean;
  timestamp: Date;
}

interface AskUserQuestionProps {
  data: AskUserQuestionData;
  onSubmit: (answer: string | string[]) => void;
  disabled?: boolean;
}

export function AskUserQuestion({
  data,
  onSubmit,
  disabled = false,
}: AskUserQuestionProps) {
  const formId = useId();
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set());
  const [otherSelected, setOtherSelected] = useState(false);
  const [otherText, setOtherText] = useState('');

  const handleOptionChange = useCallback(
    (optionId: string, checked: boolean) => {
      if (data.multiSelect) {
        // Multi-select: toggle the option
        setSelectedOptions((prev) => {
          const next = new Set(prev);
          if (checked) {
            next.add(optionId);
          } else {
            next.delete(optionId);
          }
          return next;
        });
      } else {
        // Single select: replace selection
        if (checked) {
          setSelectedOptions(new Set([optionId]));
          setOtherSelected(false);
          setOtherText('');
        }
      }
    },
    [data.multiSelect]
  );

  const handleOtherChange = useCallback(
    (checked: boolean) => {
      setOtherSelected(checked);
      if (data.multiSelect) {
        // Multi-select: just toggle other
        return;
      } else {
        // Single select: deselect other options
        if (checked) {
          setSelectedOptions(new Set());
        }
      }
    },
    [data.multiSelect]
  );

  const handleSubmit = useCallback(() => {
    const answers: string[] = [];

    // Add selected options
    for (const optionId of selectedOptions) {
      const option = data.options.find((o) => o.id === optionId);
      if (option) {
        answers.push(option.label);
      }
    }

    // Add "Other" text if selected and filled
    if (otherSelected && otherText.trim()) {
      answers.push(otherText.trim());
    }

    if (answers.length === 0) {
      return; // Don't submit empty answers
    }

    // Return single answer or array based on multiSelect
    if (data.multiSelect) {
      onSubmit(answers);
    } else {
      onSubmit(answers[0]);
    }
  }, [data, selectedOptions, otherSelected, otherText, onSubmit]);

  const hasSelection =
    selectedOptions.size > 0 || (otherSelected && otherText.trim().length > 0);

  const InputComponent = data.multiSelect ? 'checkbox' : 'radio';

  return (
    <div
      className="flex justify-start mb-4"
      role="article"
      aria-label="Agent question"
    >
      <div className="max-w-[85%] bg-surface-raised rounded-lg px-4 py-3 rounded-bl-sm">
        {/* Question text */}
        <p className="text-sm font-medium text-fg mb-3">
          {data.question}
        </p>

        {/* Options list */}
        <fieldset className="space-y-2" aria-label="Answer options">
          {data.options.map((option) => {
            const inputId = `${formId}-option-${option.id}`;
            const isSelected = selectedOptions.has(option.id);

            return (
              <label
                key={option.id}
                htmlFor={inputId}
                className={`flex items-start gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-accent-soft ring-1 ring-accent'
                    : 'hover:bg-surface-hover'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input
                  type={InputComponent}
                  id={inputId}
                  name={`${formId}-options`}
                  checked={isSelected}
                  onChange={(e) =>
                    handleOptionChange(option.id, e.target.checked)
                  }
                  disabled={disabled}
                  className="mt-0.5 w-4 h-4 text-accent focus:ring-accent cursor-pointer disabled:cursor-not-allowed"
                  aria-describedby={
                    option.description ? `${inputId}-desc` : undefined
                  }
                />
                <div className="flex-1">
                  <span className="text-sm text-fg">
                    {option.label}
                  </span>
                  {option.description && (
                    <p
                      id={`${inputId}-desc`}
                      className="text-xs text-fg-muted mt-0.5"
                    >
                      {option.description}
                    </p>
                  )}
                </div>
              </label>
            );
          })}

          {/* "Other" option with text input */}
          <div className="pt-1">
            <label
              htmlFor={`${formId}-other`}
              className={`flex items-start gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                otherSelected
                  ? 'bg-accent-soft ring-1 ring-accent'
                  : 'hover:bg-surface-hover'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input
                type={InputComponent}
                id={`${formId}-other`}
                name={`${formId}-options`}
                checked={otherSelected}
                onChange={(e) => handleOtherChange(e.target.checked)}
                disabled={disabled}
                className="mt-0.5 w-4 h-4 text-accent focus:ring-accent cursor-pointer disabled:cursor-not-allowed"
              />
              <span className="text-sm text-fg">
                Other
              </span>
            </label>

            {/* Custom text input for "Other" */}
            {otherSelected && (
              <div className="ml-7 mt-2">
                <input
                  type="text"
                  value={otherText}
                  onChange={(e) => setOtherText(e.target.value)}
                  placeholder="Enter your answer..."
                  disabled={disabled}
                  className="w-full px-3 py-1.5 text-sm rounded-md border border-border-default bg-input text-fg placeholder-fg-muted focus:ring-2 focus:ring-accent focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Custom answer"
                  autoFocus
                />
              </div>
            )}
          </div>
        </fieldset>

        {/* Submit button */}
        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={handleSubmit}
            disabled={disabled || !hasSelection}
            className="px-4 py-1.5 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            aria-label="Submit answer"
          >
            Submit
          </button>
          <time
            className="text-xs text-fg-muted"
            dateTime={data.timestamp.toISOString()}
          >
            {data.timestamp.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </time>
        </div>
      </div>
    </div>
  );
}
