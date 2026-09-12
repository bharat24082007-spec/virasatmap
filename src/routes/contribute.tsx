import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { STORAGE_PREFIX } from "@/hooks/useHeritageImage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MapCanvas } from "@/components/MapCanvas";
import { VoiceDictation } from "@/components/VoiceDictation";

import {
  BELIEF_LABELS,
  CATEGORIES,
  INDIA_CENTER,
  type BeliefType,
  type Category,
} from "@/lib/heritage";

export const Route = createFileRoute("/contribute")({
  head: () => ({
    meta: [
      { title: "Add heritage — Virasat Map" },
      {
        name: "description",
        content:
          "Submit a monument, art form, festival or craft from your region, along with the local story or belief behind it.",
      },
      { property: "og:title", content: "Add heritage — Virasat Map" },
      {
        property: "og:description",
        content: "Share a local tradition and the story your community tells about it.",
      },
    ],
  }),
  component: ContributePage,
});

const schema = z.object({
  name: z.string().trim().min(3, "Give the place or tradition a name").max(120),
  category: z.enum(["monument", "art_form", "festival", "craft"]),
  city: z.string().trim().min(2, "Add a town or city").max(80),
  region: z.string().trim().min(2, "Add a state or region").max(80),
  description: z.string().trim().min(20, "Please describe it in a little more detail").max(2000),
  significance: z.string().trim().max(2000).optional(),
  festival_date: z.string().optional(),
  contributor_name: z.string().trim().max(80).optional(),
  story_text: z.string().trim().max(2000).optional(),
  belief_type: z.enum([
    "local_belief",
    "traditional_story",
    "cultural_practice",
    "community_perspective",
  ]),
});

function ContributePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [category, setCategory] = useState<Category>("monument");
  const [beliefType, setBeliefType] = useState<BeliefType>("local_belief");
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [hiddenGem, setHiddenGem] = useState(false);
  const [busy, setBusy] = useState(false);
  const [description, setDescription] = useState("");
  const [significance, setSignificance] = useState("");
  const [storyText, setStoryText] = useState("");

  const append = (setter: (fn: (prev: string) => string) => void) => (text: string) =>
    setter((prev) => (prev ? `${prev.trim()} ${text}` : text));


  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = schema.safeParse({
      name: form.get("name"),
      category,
      city: form.get("city"),
      region: form.get("region"),
      description: form.get("description"),
      significance: form.get("significance") || undefined,
      festival_date: (form.get("festival_date") as string) || undefined,
      contributor_name: (form.get("contributor_name") as string) || undefined,
      story_text: (form.get("story_text") as string) || undefined,
      belief_type: beliefType,
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form.");
      return;
    }
    if (!coords) {
      toast.error("Tap the map to mark where this belongs.");
      return;
    }

    setBusy(true);
    try {
      let imageUrl: string | null = null;
      if (file) {
        if (file.size > 5 * 1024 * 1024) throw new Error("Please choose a photo under 5 MB.");
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("heritage-photos")
          .upload(path, file, { contentType: file.type });
        if (uploadError) throw uploadError;
        imageUrl = `${STORAGE_PREFIX}${path}`;
      }

      const values = parsed.data;
      const { data: inserted, error } = await supabase
        .from("heritage_items")
        .insert({
          name: values.name,
          category: values.category,
          city: values.city,
          region: values.region,
          latitude: coords.latitude,
          longitude: coords.longitude,
          description: values.description,
          significance: values.significance ?? null,
          festival_date: values.festival_date ?? null,
          image_url: imageUrl,
          contributor_name: values.contributor_name ?? null,
          is_hidden_gem: hiddenGem,
          status: "pending",
          submitted_by: user?.id ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;

      if (values.story_text && values.story_text.length > 10) {
        const { error: storyError } = await supabase.from("local_stories").insert({
          heritage_item_id: inserted.id,
          story_text: values.story_text,
          belief_type: values.belief_type,
          contributor_name: values.contributor_name ?? null,
          status: "pending",
          submitted_by: user?.id ?? null,
        });
        if (storyError) throw storyError;
      }

      toast.success("Thank you — your submission is pending review.");
      navigate({ to: "/" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="text-4xl">Add heritage</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Local traditions are often unrecorded. Add one you know — it stays pending until an admin
        reviews it.
      </p>

      <form onSubmit={submit} className="mt-8 flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" placeholder="e.g. Cheriyal scroll painting" required />
          </div>

          <div className="sm:col-span-2">
            <Label>Category</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  aria-pressed={category === cat.value}
                  className="rounded-full border px-3 py-1.5 text-xs"
                  style={
                    category === cat.value
                      ? {
                          background: cat.colorVar,
                          color: "var(--primary-foreground)",
                          borderColor: cat.colorVar,
                        }
                      : { borderColor: "var(--border)" }
                  }
                >
                  {cat.glyph} {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="city">Town or city</Label>
            <Input id="city" name="city" required />
          </div>
          <div>
            <Label htmlFor="region">State or region</Label>
            <Input id="region" name="region" required />
          </div>

          {category === "festival" ? (
            <div>
              <Label htmlFor="festival_date">Festival date</Label>
              <Input id="festival_date" name="festival_date" type="date" />
            </div>
          ) : null}

          <div>
            <Label htmlFor="photo">Photo (optional)</Label>
            <Input
              id="photo"
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>

        <div>
          <Label>Location — tap the map to place it</Label>
          <div className="mt-2 h-72 overflow-hidden rounded-xl border border-border">
            <MapCanvas
              items={[]}
              center={INDIA_CENTER}
              zoom={5}
              onPick={setCoords}
              pickedLocation={coords}
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {coords
              ? `Marked at ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`
              : "No location marked yet."}
          </p>
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            rows={4}
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <VoiceDictation onTranscript={append(setDescription)} label="Describe it by voice" />
        </div>

        <div>
          <Label htmlFor="significance">History or significance (optional)</Label>
          <Textarea
            id="significance"
            name="significance"
            rows={3}
            value={significance}
            onChange={(e) => setSignificance(e.target.value)}
          />
          <VoiceDictation onTranscript={append(setSignificance)} label="Tell it by voice" />
        </div>


        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-story-border bg-story p-4 text-story-foreground">
          <input
            type="checkbox"
            checked={hiddenGem}
            onChange={(e) => setHiddenGem(e.target.checked)}
            className="mt-1 h-4 w-4 accent-[var(--primary)]"
          />
          <span className="text-sm">
            <span className="font-medium">⭐ This is hidden heritage</span>
            <span className="block text-xs opacity-80">
              Tick this if it is lesser-known — a village craft, a rare performance, a technique
              few people outside the community know about.
            </span>
          </span>
        </label>

        <fieldset className="rounded-lg border border-dashed border-story-border bg-story p-4 text-story-foreground">
          <legend className="px-1 text-sm font-medium">Share the local story or belief</legend>
          <p className="text-xs opacity-80">
            What does this mean to the community? Stories passed down, beliefs, rituals. This is
            shown separately from the factual description and is never presented as verified
            history.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(Object.keys(BELIEF_LABELS) as BeliefType[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setBeliefType(key)}
                aria-pressed={beliefType === key}
                className={`rounded-full border border-story-border px-3 py-1 text-xs ${
                  beliefType === key ? "bg-story-border/40 font-medium" : ""
                }`}
              >
                {BELIEF_LABELS[key]}
              </button>
            ))}
          </div>
          <Textarea
            id="story_text"
            name="story_text"
            rows={4}
            className="mt-3 bg-card"
            placeholder="Elders say the well was dug in a single night…"
            value={storyText}
            onChange={(e) => setStoryText(e.target.value)}
          />
          <VoiceDictation onTranscript={append(setStoryText)} label="Tell the story by voice" />
        </fieldset>


        <div>
          <Label htmlFor="contributor_name">Your name (optional)</Label>
          <Input id="contributor_name" name="contributor_name" />
        </div>

        <Button type="submit" disabled={busy} className="self-start">
          {busy ? "Submitting…" : "Submit for review"}
        </Button>
      </form>
    </main>
  );
}
