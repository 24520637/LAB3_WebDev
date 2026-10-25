import { useId, useRef, useState } from 'react';
import { SMART_PEOPLE } from '../data/smartPeople.js';

export default function ScientistDirectory() {
  const [people, setPeople] = useState(SMART_PEOPLE);
  const [query, setQuery] = useState('');
  const [minIq, setMinIq] = useState(160);
  const [sortBy, setSortBy] = useState('iq-desc');
  const controlId = useId();
  const resetButtonRef = useRef(null);

  const visiblePeople = people
    .filter((person) =>
      person.name.toLowerCase().includes(query.trim().toLowerCase()) &&
      person.iq >= minIq,
    )
    .toSorted((a, b) =>
      sortBy === 'iq-desc' ? b.iq - a.iq : a.age - b.age,
    );

  function handleMinIqChange(event) {
    const value = event.target.valueAsNumber;
    setMinIq(Number.isNaN(value) ? 0 : value);
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
      <p>
        <label htmlFor={`${controlId}-query`}>Search by name</label>{' '}
        <input
          id={`${controlId}-query`}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </p>
      <p>
        <label htmlFor={`${controlId}-min-iq`}>Minimum IQ</label>{' '}
        <input
          id={`${controlId}-min-iq`}
          type="number"
          min="0"
          step="1"
          value={minIq}
          onChange={handleMinIqChange}
        />
      </p>
      <p>
        <label htmlFor={`${controlId}-sort`}>Sort by</label>{' '}
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
            <dl>
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
