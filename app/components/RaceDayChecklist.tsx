'use client';

import { useCallback, useEffect, useState } from 'react';

interface ChecklistItemData {
  id: string;
  category: string;
  item_text: string;
  added_by: string | null;
  added_by_firstname: string | null;
  added_by_lastname: string | null;
  checked: boolean;
  check_count: number;
}

interface AthleteOption {
  athlete_id: string;
  firstname: string;
  lastname: string;
}

const CATEGORIES = [
  { key: 'Swim', label: 'Swim', icon: 'swim' },
  { key: 'T1', label: 'T1 - Swim to Bike', icon: 't1' },
  { key: 'Bike', label: 'Bike', icon: 'bike' },
  { key: 'T2', label: 'T2 - Bike to Run', icon: 't2' },
  { key: 'Run', label: 'Run', icon: 'run' },
  { key: 'General', label: 'General / Travel', icon: 'general' },
];

function getCategoryIcon(icon: string) {
  switch (icon) {
    case 'swim':
      return (
        <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
        </svg>
      );
    case 'bike':
      return (
        <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="5.5" cy="17.5" r="3.5" strokeWidth={2} />
          <circle cx="18.5" cy="17.5" r="3.5" strokeWidth={2} />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 6l-4 8h6l-3 3.5" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.5 17.5L11 10l4-4" />
        </svg>
      );
    case 'run':
      return (
        <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
    case 't1':
    case 't2':
      return (
        <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      );
    default:
      return (
        <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      );
  }
}

export default function RaceDayChecklist() {
  const [checklist, setChecklist] = useState<Record<string, ChecklistItemData[]>>({});
  const [athletes, setAthletes] = useState<AthleteOption[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [addingItem, setAddingItem] = useState<string | null>(null); // category key when adding
  const [newItemText, setNewItemText] = useState('');
  const [savingItem, setSavingItem] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(CATEGORIES.map(c => c.key)));

  // Fetch athletes for the dropdown
  useEffect(() => {
    async function fetchAthletes() {
      try {
        const res = await fetch('/api/leaderboard');
        const data = await res.json();
        if (data.success) {
          setAthletes(data.data.map((a: any) => ({
            athlete_id: a.athlete_id,
            firstname: a.firstname,
            lastname: a.lastname,
          })));
        }
      } catch (err) {
        console.error('Failed to fetch athletes:', err);
      }
    }
    fetchAthletes();
  }, []);

  const fetchChecklist = useCallback(async () => {
    setLoading(true);
    try {
      const url = selectedAthlete
        ? `/api/checklist?athlete_id=${selectedAthlete}`
        : '/api/checklist';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setChecklist(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch checklist:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedAthlete]);

  // Fetch checklist whenever selectedAthlete changes
  useEffect(() => {
    fetchChecklist();
  }, [fetchChecklist]);

  async function handleToggleCheck(itemId: string, currentChecked: boolean) {
    if (!selectedAthlete) return;

    // Optimistic update
    setChecklist(prev => {
      const updated = { ...prev };
      for (const cat of Object.keys(updated)) {
        updated[cat] = updated[cat].map(item =>
          item.id === itemId
            ? {
                ...item,
                checked: !currentChecked,
                check_count: currentChecked
                  ? Math.max(0, item.check_count - 1)
                  : item.check_count + 1,
              }
            : item
        );
      }
      return updated;
    });

    try {
      await fetch('/api/checklist/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: itemId,
          athlete_id: selectedAthlete,
          checked: !currentChecked,
        }),
      });
    } catch (err) {
      console.error('Failed to toggle check:', err);
      // Revert on failure
      fetchChecklist();
    }
  }

  async function handleAddItem(category: string) {
    if (!newItemText.trim() || savingItem) return;

    setSavingItem(true);
    try {
      const res = await fetch('/api/checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          item_text: newItemText.trim(),
          added_by: selectedAthlete || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewItemText('');
        setAddingItem(null);
        fetchChecklist();
      }
    } catch (err) {
      console.error('Failed to add item:', err);
    } finally {
      setSavingItem(false);
    }
  }

  async function handleDeleteItem(itemId: string) {
    try {
      const res = await fetch('/api/checklist', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: itemId }),
      });
      const data = await res.json();
      if (data.success) {
        fetchChecklist();
      }
    } catch (err) {
      console.error('Failed to delete item:', err);
    }
  }

  function toggleCategory(key: string) {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  // Calculate overall progress
  const allItems = Object.values(checklist).flat();
  const checkedItems = allItems.filter(i => i.checked);
  const progressPercent = allItems.length > 0 ? Math.round((checkedItems.length / allItems.length) * 100) : 0;

  return (
    <div className="card p-6 mb-10">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left group"
      >
        <div className="flex items-center gap-4">
          <div className="diamond-frame">
            <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl md:text-2xl font-display text-foreground tracking-wider uppercase">
              Race Day Checklist
            </h3>
            <p className="text-xs text-muted font-body mt-0.5">
              Community packing list for May 18th
              {selectedAthlete && allItems.length > 0 && (
                <span className="text-gold/60"> &middot; {checkedItems.length}/{allItems.length} packed</span>
              )}
            </p>
          </div>
        </div>
        <svg
          className={`w-6 h-6 text-gold transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
      <div className="mt-8 pt-6 border-t border-gold/20">

      {/* Athlete Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6 p-4 bg-background/50 border border-gold/10 rounded">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <label className="text-sm font-body text-muted tracking-wide uppercase">
            Packing as:
          </label>
        </div>
        <select
          value={selectedAthlete}
          onChange={(e) => setSelectedAthlete(e.target.value)}
          className="bg-card border border-gold/20 text-foreground font-body text-sm px-3 py-2 rounded focus:border-gold/50 focus:outline-none transition-colors w-full sm:w-auto"
        >
          <option value="">Select your name to track items</option>
          {athletes.map(a => (
            <option key={a.athlete_id} value={a.athlete_id}>
              {a.firstname} {a.lastname}
            </option>
          ))}
        </select>
        {selectedAthlete && (
          <span className="text-xs text-muted font-body">
            {checkedItems.length} of {allItems.length} items packed
          </span>
        )}
      </div>

      {/* Progress Bar (only show when athlete selected) */}
      {selectedAthlete && allItems.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted font-body uppercase tracking-wider">Your packing progress</span>
            <span className="text-sm font-body text-gold">{progressPercent}%</span>
          </div>
          <div className="w-full h-2 bg-background/80 border border-gold/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-gold-dark to-gold transition-all duration-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="diamond-frame animate-gold-pulse">
            <div className="w-5 h-5 border-2 border-gold border-t-transparent animate-spin rounded-full"></div>
          </div>
        </div>
      ) : (
        /* Category Sections */
        <div className="space-y-4">
          {CATEGORIES.map(cat => {
            const items = checklist[cat.key] || [];
            const catChecked = items.filter(i => i.checked).length;
            const isExpanded = expandedCategories.has(cat.key);

            return (
              <div key={cat.key} className="border border-gold/10 rounded overflow-hidden">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(cat.key)}
                  className="w-full flex items-center justify-between p-3 sm:p-4 bg-card hover:bg-card/80 transition-colors text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="diamond-frame w-8 h-8 flex-shrink-0">
                      {getCategoryIcon(cat.icon)}
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-display text-foreground tracking-wider uppercase">
                        {cat.label}
                      </h3>
                      <p className="text-xs text-muted font-body">
                        {items.length} item{items.length !== 1 ? 's' : ''}
                        {selectedAthlete && ` · ${catChecked} packed`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {selectedAthlete && items.length > 0 && (
                      <div className="hidden sm:flex items-center gap-1">
                        <div className="w-16 h-1.5 bg-background/80 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gold/60 rounded-full transition-all duration-300"
                            style={{ width: `${items.length > 0 ? (catChecked / items.length) * 100 : 0}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                    <svg
                      className={`w-5 h-5 text-gold transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Items List */}
                {isExpanded && (
                  <div className="border-t border-gold/10">
                    {items.length === 0 ? (
                      <p className="p-4 text-sm text-muted/60 font-body italic">No items yet. Add one below!</p>
                    ) : (
                      <ul className="divide-y divide-gold/5">
                        {items.map(item => (
                          <li
                            key={item.id}
                            className="flex items-center gap-3 px-3 sm:px-4 py-2.5 hover:bg-card/40 transition-colors group/item"
                          >
                            {/* Checkbox */}
                            {selectedAthlete ? (
                              <button
                                onClick={() => handleToggleCheck(item.id, item.checked)}
                                className={`w-5 h-5 flex-shrink-0 border rounded transition-all duration-200 flex items-center justify-center ${
                                  item.checked
                                    ? 'bg-gold border-gold text-background'
                                    : 'border-gold/30 hover:border-gold/60'
                                }`}
                              >
                                {item.checked && (
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </button>
                            ) : (
                              <div className="w-5 h-5 flex-shrink-0 border border-gold/15 rounded flex items-center justify-center">
                                <div className="w-1.5 h-1.5 bg-gold/20 rounded-full"></div>
                              </div>
                            )}

                            {/* Item text */}
                            <span
                              className={`flex-1 text-sm font-body transition-colors ${
                                item.checked ? 'text-muted line-through' : 'text-foreground'
                              }`}
                            >
                              {item.item_text}
                            </span>

                            {/* Meta info */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {item.check_count > 0 && (
                                <span className="text-xs text-muted/60 font-body hidden sm:inline">
                                  {item.check_count} packed
                                </span>
                              )}
                              {item.added_by_firstname && (
                                <span className="text-xs text-gold/40 font-body hidden sm:inline">
                                  +{item.added_by_firstname}
                                </span>
                              )}
                              <button
                                onClick={() => handleDeleteItem(item.id)}
                                className="opacity-0 group-hover/item:opacity-100 text-muted/40 hover:text-red-500 transition-all p-1"
                                title="Remove item"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Add Item Row */}
                    <div className="p-3 sm:p-4 border-t border-gold/10 bg-background/30">
                      {addingItem === cat.key ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={newItemText}
                            onChange={(e) => setNewItemText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddItem(cat.key);
                              if (e.key === 'Escape') {
                                setAddingItem(null);
                                setNewItemText('');
                              }
                            }}
                            placeholder="e.g., Extra tube"
                            className="flex-1 bg-card border border-gold/20 text-foreground font-body text-sm px-3 py-1.5 rounded focus:border-gold/50 focus:outline-none transition-colors placeholder:text-muted/40"
                            autoFocus
                            maxLength={200}
                          />
                          <button
                            onClick={() => handleAddItem(cat.key)}
                            disabled={savingItem || !newItemText.trim()}
                            className="px-3 py-1.5 bg-gold/10 border border-gold/30 text-gold text-sm font-body hover:bg-gold/20 transition-colors rounded disabled:opacity-40"
                          >
                            {savingItem ? '...' : 'Add'}
                          </button>
                          <button
                            onClick={() => {
                              setAddingItem(null);
                              setNewItemText('');
                            }}
                            className="px-2 py-1.5 text-muted hover:text-foreground text-sm transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setAddingItem(cat.key);
                            setNewItemText('');
                          }}
                          className="flex items-center gap-2 text-sm text-muted/60 hover:text-gold font-body transition-colors group/add"
                        >
                          <svg className="w-4 h-4 group-hover/add:text-gold transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Add item
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer note */}
      <div className="mt-6 pt-4 border-t border-gold/10 flex items-start gap-2">
        <svg className="w-4 h-4 text-gold/40 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-xs text-muted/50 font-body">
          Anyone can add items to this shared list. Select your name above to track your own packing progress.
          Each athlete&apos;s check-offs are independent.
        </p>
      </div>

      </div>
      )}
    </div>
  );
}
