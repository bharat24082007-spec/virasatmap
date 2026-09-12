import { BELIEF_LABELS, type LocalStory } from "@/lib/heritage";

export function StoryCard({ story }: { story: LocalStory }) {
  return (
    <article className="rounded-lg border border-dashed border-story-border bg-story p-4 text-story-foreground">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-story-border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider">
          {BELIEF_LABELS[story.belief_type]}
        </span>
        {story.contributor_name ? (
          <span className="text-xs opacity-80">shared by {story.contributor_name}</span>
        ) : null}
      </div>
      <p className="mt-3 text-sm leading-relaxed">{story.story_text}</p>
    </article>
  );
}
