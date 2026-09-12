import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BadgeCheck, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { claimAdminRole } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { StoryCard } from "@/components/StoryCard";
import { HeritageImage } from "@/components/HeritageImage";
import {
  categoryLabel,
  
  type HeritageItem,
  type LocalStory,
} from "@/lib/heritage";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Review queue — Virasat Map" },
      {
        name: "description",
        content: "Admin view for approving or rejecting community heritage submissions.",
      },
      { property: "og:title", content: "Review queue — Virasat Map" },
      {
        property: "og:description",
        content: "Approve community submissions so they appear on the public heritage map.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { user, isAdmin, adminLoading, refetchRole } = useAuth();
  const queryClient = useQueryClient();
  const claim = useServerFn(claimAdminRole);

  const pendingItems = useQuery({
    queryKey: ["pending-items"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("heritage_items")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as HeritageItem[];
    },
  });

  const pendingStories = useQuery({
    queryKey: ["pending-stories"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("local_stories")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as LocalStory[];
    },
  });

  const decide = useMutation({
    mutationFn: async ({
      table,
      id,
      status,
    }: {
      table: "heritage_items" | "local_stories";
      id: string;
      status: "verified" | "rejected";
    }) => {
      const { error } = await supabase.from(table).update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      toast.success(vars.status === "verified" ? "Approved and published." : "Rejected.");
      queryClient.invalidateQueries({ queryKey: ["pending-items"] });
      queryClient.invalidateQueries({ queryKey: ["pending-stories"] });
      queryClient.invalidateQueries({ queryKey: ["heritage-items"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Update failed."),
  });

  const claimMutation = useMutation({
    mutationFn: async () => claim({ data: undefined }),
    onSuccess: async (result) => {
      if (result.granted) {
        toast.success("You're now the admin for this project.");
        await refetchRole();
      } else {
        toast.error(result.reason ?? "Could not grant admin access.");
      }
    },
    onError: () => toast.error("Could not grant admin access."),
  });

  if (!user) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <ShieldCheck className="mx-auto h-8 w-8 text-primary" />
        <h1 className="mt-3 text-3xl">Admin review</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to review community submissions.
        </p>
        <Button asChild className="mt-4">
          <Link to="/auth">Sign in</Link>
        </Button>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-3xl">Admin review</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This account doesn't have review access yet. If you're setting the project up, you can
          claim admin access — only possible while no admin exists.
        </p>
        <Button
          className="mt-4"
          disabled={adminLoading || claimMutation.isPending}
          onClick={() => claimMutation.mutate()}
        >
          {claimMutation.isPending ? "Checking…" : "Claim admin access"}
        </Button>
      </main>
    );
  }

  const items = pendingItems.data ?? [];
  const stories = pendingStories.data ?? [];

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <h1 className="text-4xl">Review queue</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Approved entries get a Verified badge and appear on the public map.
      </p>

      <section className="mt-8">
        <h2 className="text-xl">Pending places ({items.length})</h2>
        <div className="mt-3 flex flex-col gap-3">
          {items.map((item) => (
            <article
              key={item.id}
              className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row"
            >
              <HeritageImage
                item={item}
                alt={item.name}
                width={320}
                className="aspect-[8/5] w-full rounded-md bg-muted object-contain sm:h-28 sm:w-44"
              />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {categoryLabel(item.category)} · {item.city}, {item.region}
                </p>
                <h3 className="text-lg">{item.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                {item.contributor_name ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Submitted by {item.contributor_name}
                  </p>
                ) : null}
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={() =>
                      decide.mutate({ table: "heritage_items", id: item.id, status: "verified" })
                    }
                  >
                    <BadgeCheck className="h-4 w-4" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() =>
                      decide.mutate({ table: "heritage_items", id: item.id, status: "rejected" })
                    }
                  >
                    <X className="h-4 w-4" /> Reject
                  </Button>
                </div>
              </div>
            </article>
          ))}
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No places waiting.</p>
          ) : null}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl">Pending local stories ({stories.length})</h2>
        <div className="mt-3 flex flex-col gap-3">
          {stories.map((story) => (
            <div key={story.id}>
              <StoryCard story={story} />
              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  onClick={() =>
                    decide.mutate({ table: "local_stories", id: story.id, status: "verified" })
                  }
                >
                  Approve story
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    decide.mutate({ table: "local_stories", id: story.id, status: "rejected" })
                  }
                >
                  Reject
                </Button>
              </div>
            </div>
          ))}
          {stories.length === 0 ? (
            <p className="text-sm text-muted-foreground">No stories waiting.</p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
