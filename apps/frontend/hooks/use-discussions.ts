"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { CreateDiscussionInput, DiscussionItem } from "@leadflow/shared";
import { addDiscussion, apiErrorMessage, listDiscussions } from "@/lib/api-client";
import { discussionsKey, leadsKeys } from "@/lib/query-keys";
import { updateLeadInLists } from "./use-leads";

export function useDiscussions(leadId: string | null) {
  return useQuery({
    queryKey: discussionsKey(leadId ?? ""),
    queryFn: () => listDiscussions(leadId as string),
    enabled: !!leadId,
  });
}

export function useAddDiscussion(leadId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDiscussionInput) => addDiscussion(leadId, input),
    onSuccess: ({ discussion, lead }) => {
      // Newest-first timeline: prepend.
      queryClient.setQueryData<DiscussionItem[]>(discussionsKey(leadId), (old) => [
        discussion,
        ...(old ?? []),
      ]);
      // The returned lead carries the new last note, time, and follow-up.
      updateLeadInLists(queryClient, lead);
      void queryClient.invalidateQueries({ queryKey: leadsKeys.all });
    },
    onError: (err) => {
      toast.error(apiErrorMessage(err, "Could not save the note"));
    },
  });
}
