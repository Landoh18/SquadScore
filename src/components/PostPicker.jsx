// 5-column grid of starting-post buttons (posts 1–5).
//
// States per handoff #1's setup screen spec:
//   Available — white bg, 0.5px tertiary border, primary text
//   Selected  — clay-orange bg, white text
//   Taken     — bg-secondary + tertiary text + strikethrough, disabled
//
// Controlled component: parent owns `value` (currently selected post, or null)
// and `takenPosts` (array of posts already claimed by other shooters in this round).

export default function PostPicker({
  value = null,
  takenPosts = [],
  onChange,
  disabled = false,
}) {
  const taken = new Set(takenPosts);

  return (
    <div className="grid grid-cols-5 gap-2">
      {[1, 2, 3, 4, 5].map((post) => {
        const isSelected = value === post;
        const isTaken = taken.has(post) && !isSelected;
        const isDisabled = disabled || isTaken;

        const base =
          'h-14 rounded-md text-lg font-medium flex items-center justify-center transition-colors box-border';

        let stateCls;
        if (isSelected) {
          stateCls =
            'bg-[var(--color-clay-orange)] text-white border-[0.5px] border-[var(--color-clay-orange)]';
        } else if (isTaken) {
          stateCls =
            'bg-[var(--color-background-secondary)] text-[var(--color-text-tertiary)] line-through border-[0.5px] border-transparent cursor-not-allowed';
        } else {
          stateCls =
            'bg-white text-[var(--color-text-primary)] border-[0.5px] border-[var(--color-text-tertiary)] active:bg-[var(--color-background-secondary)]';
        }

        return (
          <button
            key={post}
            type="button"
            disabled={isDisabled}
            aria-pressed={isSelected}
            aria-label={`Starting post ${post}${isTaken ? ' (taken)' : ''}`}
            onClick={() => !isDisabled && onChange(post)}
            className={`${base} ${stateCls}`}
          >
            {post}
          </button>
        );
      })}
    </div>
  );
}
