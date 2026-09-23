'use client'

interface Props {
  title: string
  onTitleChange: (title: string) => void
  saveState: 'saved' | 'dirty' | 'saving' | 'error'
  onSave: () => void
}

/** Title input + save control, plus the save-error banner. Split out of
 *  `ComposeClient.tsx` verbatim (004 T043) — same two sibling blocks, same testids. */
export default function ComposeHeader({ title, onTitleChange, saveState, onSave }: Props) {
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <input
          data-testid="compose-title-input"
          data-dd-privacy="mask-user-input"
          value={title}
          onChange={e => onTitleChange(e.target.value)}
          className="kk-input px-3 py-2 text-lg font-serif font-medium flex-1"
          placeholder="Name this flow"
        />
        <button
          onClick={onSave}
          disabled={saveState === 'saving'}
          data-testid="compose-save-button"
          className="kk-btn px-4 py-2 text-sm font-medium"
        >
          {saveState === 'saved' && 'Saved'}
          {saveState === 'dirty' && 'Save'}
          {saveState === 'saving' && 'Saving…'}
          {saveState === 'error' && 'Retry save'}
        </button>
      </div>
      {saveState === 'error' && (
        <div data-testid="compose-save-error" className="kk-warning px-3 py-2 text-sm">
          Couldn&apos;t save. Check available storage and try again. Your edits are still on
          this screen.
        </div>
      )}
    </>
  )
}
