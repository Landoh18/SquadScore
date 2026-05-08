// Roster autocomplete picker. Used for the scorer field and each shooter's name field.
//
// Controlled component:
//   value:       the selected entry's ID, or null
//   onChange:    fn(id|null) called on selection or clear
//   excludeIds:  array of roster IDs to hide from results (e.g. shooters already in this round)
//   placeholder, autoFocus: input attributes
//
// Behavior:
//   - No selection: text input + dropdown with ranked matches + "Add new person" row at bottom.
//   - Selection: read-only chip showing "Last, First" with an X button to clear.
//   - Strict mode: typed names that don't match the roster don't auto-add — the user has to
//     explicitly tap "Add new person" and confirm in a modal.

import { useState, useEffect, useRef, useMemo } from 'react';
import { IconX, IconUserPlus } from '@tabler/icons-react';
import {
  searchRoster,
  addToRoster,
  getRosterEntry,
  pickerLabel,
} from '../lib/roster.js';

export default function RosterPicker({
  value = null,
  onChange,
  excludeIds = [],
  placeholder = 'Search by name',
  autoFocus = false,
}) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const selectedEntry = useMemo(
    () => (value ? getRosterEntry(value) : null),
    [value]
  );

  const matches = useMemo(() => {
    const excludeSet = new Set(excludeIds);
    return searchRoster(query).filter((e) => !excludeSet.has(e.id));
  }, [query, excludeIds]);

  // Reset keyboard highlight when the result list changes.
  useEffect(() => {
    setHighlightIdx(0);
  }, [matches.length]);

  // Close the dropdown when the user taps outside.
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  function handleSelect(entry) {
    onChange?.(entry.id);
    setQuery('');
    setIsOpen(false);
    inputRef.current?.blur();
  }

  function handleClear() {
    onChange?.(null);
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function handleKeyDown(e) {
    if (!isOpen) return;
    const total = matches.length + 1; // +1 for "Add new person" row
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx((i) => (i + 1) % total);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx((i) => (i - 1 + total) % total);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightIdx < matches.length) handleSelect(matches[highlightIdx]);
      else setShowAddModal(true);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  }

  function handleAdded(newEntry) {
    onChange?.(newEntry.id);
    setQuery('');
    setShowAddModal(false);
    setIsOpen(false);
  }

  // --- Selected state: chip with clear button -----------------------------
  if (selectedEntry) {
    return (
      <div className="flex items-center justify-between gap-2 h-12 px-3 rounded-md border-[0.5px] border-[var(--color-text-tertiary)] bg-white">
        <span className="text-[15px] text-[var(--color-text-primary)] truncate">
          {pickerLabel(selectedEntry)}
        </span>
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear selection"
          className="p-1 -mr-1 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
        >
          <IconX size={18} />
        </button>
      </div>
    );
  }

  // --- Empty state: search input + dropdown -------------------------------
  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full h-12 px-3 rounded-md border-[0.5px] border-[var(--color-text-tertiary)] bg-white text-[15px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-clay-orange)]"
      />

      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1 z-10 bg-white rounded-md border-[0.5px] border-[var(--color-text-tertiary)] shadow-lg max-h-[280px] overflow-y-auto"
        >
          {matches.length === 0 && (
            <div className="px-3 py-3 text-[13px] text-[var(--color-text-tertiary)]">
              No matches.
            </div>
          )}

          {matches.map((entry, i) => (
            <button
              key={entry.id}
              type="button"
              role="option"
              aria-selected={i === highlightIdx}
              onClick={() => handleSelect(entry)}
              onMouseEnter={() => setHighlightIdx(i)}
              className={`w-full text-left px-3 py-2.5 text-[14px] text-[var(--color-text-primary)] border-b-[0.5px] border-[var(--color-background-secondary)] last:border-b-0 ${
                i === highlightIdx
                  ? 'bg-[var(--color-background-secondary)]'
                  : 'bg-white'
              }`}
            >
              {pickerLabel(entry)}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            onMouseEnter={() => setHighlightIdx(matches.length)}
            className={`w-full flex items-center gap-2 text-left px-3 py-2.5 text-[14px] font-medium text-[var(--color-clay-orange)] ${
              highlightIdx === matches.length
                ? 'bg-[var(--color-background-secondary)]'
                : 'bg-white'
            }`}
          >
            <IconUserPlus size={18} />
            Add new person to roster
          </button>
        </div>
      )}

      {showAddModal && (
        <AddToRosterModal
          initialQuery={query}
          onCancel={() => setShowAddModal(false)}
          onAdded={handleAdded}
        />
      )}
    </div>
  );
}

// --- Add-to-roster modal --------------------------------------------------

function AddToRosterModal({ initialQuery, onCancel, onAdded }) {
  const [first, last] = useMemo(() => {
    const trimmed = initialQuery.trim();
    if (!trimmed) return ['', ''];
    const parts = trimmed.split(/\s+/);
    if (parts.length === 1) return [parts[0], ''];
    return [parts[0], parts.slice(1).join(' ')];
  }, [initialQuery]);

  const [firstName, setFirstName] = useState(first);
  const [lastName, setLastName] = useState(last);

  const canSubmit = firstName.trim() && lastName.trim();

  function handleSubmit() {
    if (!canSubmit) return;
    const entry = addToRoster({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    });
    onAdded(entry);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-5"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-lg p-5 w-full max-w-[280px]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-[17px] font-medium text-center text-[var(--color-text-primary)] mb-4">
          Add to roster
        </h3>

        <div className="space-y-3">
          <div>
            <label className="block text-[12px] font-medium text-[var(--color-text-secondary)] mb-1">
              First name
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoFocus
              className="w-full h-11 px-3 rounded-md border-[0.5px] border-[var(--color-text-tertiary)] bg-white text-[15px] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-clay-orange)]"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[var(--color-text-secondary)] mb-1">
              Last name
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full h-11 px-3 rounded-md border-[0.5px] border-[var(--color-text-tertiary)] bg-white text-[15px] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-clay-orange)]"
            />
          </div>
        </div>

        <div className="flex gap-2.5 mt-5">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 h-11 rounded-md bg-white border-[0.5px] border-[var(--color-text-tertiary)] text-[15px] text-[var(--color-text-primary)]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className={`flex-1 h-11 rounded-md text-[15px] text-white transition-opacity ${
              canSubmit
                ? 'bg-[var(--color-clay-orange)]'
                : 'bg-[var(--color-clay-orange)] opacity-50 cursor-not-allowed'
            }`}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
