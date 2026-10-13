"use client";

import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  CreateLeadInput,
  LeadListItem,
  LeadStatus,
  UpdateLeadInput,
} from "@leadflow/shared";
import {
  apiErrorMessage,
  createLead,
  listLeads,
  updateLead,
} from "@/lib/api-client";
import { leadsKeys, type LeadFilters } from "@/lib/query-keys";

function toListParams(filters: LeadFilters): { status?: LeadStatus; search?: string } {
  return {
    ...(filters.status !== "ALL" ? { status: filters.status } : {}),
    ...(filters.search.trim() ? { search: filters.search.trim() } : {}),
  };
}

export function useLeads(filters: LeadFilters) {
  return useQuery({
    queryKey: leadsKeys.list(filters),
    queryFn: () => listLeads(toListParams(filters)),
    placeholderData: keepPreviousData,
  });
}

/** Replace the lead inside every cached leads list (instant UI update). */
export function updateLeadInLists(
  queryClient: ReturnType<typeof useQueryClient>,
  lead: LeadListItem,
): void {
  queryClient.setQueriesData<LeadListItem[]>({ queryKey: leadsKeys.all }, (old) =>
    old?.map((l) => (l.id === lead.id ? lead : l)),
  );
}

export function useUpdateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateLeadInput }) =>
      updateLead(id, input),
    onSuccess: (lead) => {
      updateLeadInLists(queryClient, lead);
      void queryClient.invalidateQueries({ queryKey: leadsKeys.all });
    },
    onError: (err) => {
      toast.error(apiErrorMessage(err, "Could not update the lead"));
    },
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLeadInput) => createLead(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: leadsKeys.all });
    },
    onError: (err) => {
      toast.error(apiErrorMessage(err, "Could not create the lead"));
    },
  });
}
