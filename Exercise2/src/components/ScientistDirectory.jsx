import { useId, useRef, useState } from 'react';
import { SMART_PEOPLE } from '../data/smartPeople.js';
import styles from './ScientistDirectory.module.css';

export default function ScientistDirectory() {
  const [people, setPeople] = useState(SMART_PEOPLE);
  const [query, setQuery] = useState('');
  const [minIq, setMinIq] = useState(160);
  const [minIqDraft, setMinIqDraft] = useState('160');
  const [hasMinIqError, setHasMinIqError] = useState(false);
  const [sortBy, setSortBy] = useState('iq-desc');
  const controlId = useId();
  const resetButtonRef = useRef(null);
  const minIqId = `${controlId}-min-iq`;
  const minIqHelpId = `${controlId}-min-iq-help`;
  const minIqErrorId = `${controlId}-min-iq-error`;

  const visiblePeople = people
    .filter((person) =>
      person.name.toLowerCase().includes(query.trim().toLowerCase()) &&
      person.iq >= minIq,
    )
    .toSorted((a, b) =>
      sortBy === 'iq-desc' ? b.iq - a.iq : a.age - b.age,
    );

  function handleMinIqChange(event) {
    const input = event.currentTarget;
    const value = input.valueAsNumber;
    const isEmpty = input.value === '';
    const isValid = !isEmpty && input.validity.valid && Number.isInteger(value);

    setMinIqDraft(input.value);
    setHasMinIqError(!isEmpty && !isValid);
    if (isValid) {
      setMinIq(value);
    }
  }

  function handleMinIqBlur(event) {
    const input = event.currentTarget;
    const value = input.valueAsNumber;

    if (input.value !== '' && input.validity.valid && Number.isInteger(value)) {
      setMinIqDraft(String(value));
      setMinIq(value);
      setHasMinIqError(false);
    }
  }

  function handleDelete(id) {
    setPeople((prev) => prev.filter((person) => person.id !== id));
    // The deleted button disappears; keep keyboard focus on a persistent action.
    resetButtonRef.current?.focus();
  }

  function handleReset() {
    setPeople([...SMART_PEOPLE]);
  }

  return (
    <section aria-labelledby={`${controlId}-heading`}>
      <h2 id={`${controlId}-heading`}>Browse scientists and pioneers</h2>
      <p className={styles.control}>
        <label htmlFor={`${controlId}-query`}>Search by name</label>
        <input
          id={`${controlId}-query`}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </p>
      <p className={styles.control}>
        <label htmlFor={minIqId}>Minimum IQ</label>
        <input
          id={minIqId}
          type="number"
          min="0"
          step="1"
          value={minIqDraft}
          aria-invalid={hasMinIqError}
          aria-describedby={`${minIqHelpId}${hasMinIqError ? ` ${minIqErrorId}` : ''}`}
          onChange={handleMinIqChange}
          onBlur={handleMinIqBlur}
        />
        <small id={minIqHelpId} className={styles.help}>
          Enter a whole number of 0 or greater. The last valid value remains active while editing.
        </small>
        {hasMinIqError && (
          <small id={minIqErrorId} className={styles.help} role="alert">
            Enter a whole number of 0 or greater.
          </small>
        )}
      </p>
      <p className={styles.control}>
        <label htmlFor={`${controlId}-sort`}>Sort by</label>
        <select
          id={`${controlId}-sort`}
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value)}
        >
          <option value="iq-desc">IQ: highest first</option>
          <option value="age-asc">Age: youngest first</option>
        </select>
      </p>
      <p>
        <button ref={resetButtonRef} type="button" onClick={handleReset}>
          Reset
        </button>
      </p>
      <p role="status" aria-live="polite" aria-atomic="true">
        Found {visiblePeople.length} pioneers.
        {visiblePeople.length === 0 &&
          ' No matching scientists. Adjust your search or minimum IQ, or use Reset to restore deleted records.'}
      </p>
      <ul>
        {visiblePeople.map((person) => (
          <li key={person.id}>
            <h3>{person.name}</h3>
            <dl className={styles.metadata}>
              <dt>Age</dt>
              <dd>{person.age}</dd>
              <dt>IQ</dt>
              <dd>{person.iq}</dd>
            </dl>
            <button
              type="button"
              aria-label={`Delete ${person.name}`}
              onClick={() => handleDelete(person.id)}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
