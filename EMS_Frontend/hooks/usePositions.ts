"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createPosition,
  deletePosition,
  listPositions,
  updatePosition,
  type PositionListParams,
  type PositionPayload,
} from "@/services/position.service";
import type { JobPosition, PaginatedResponse } from "@/types/employee";

export const positionKeys = {
  all: ["positions"] as const,
  list: (params: PositionListParams) => ["positions", params] as const,
};

function updatePositionInCache(
  data: PaginatedResponse<JobPosition> | undefined,
  position: JobPosition
): PaginatedResponse<JobPosition> | undefined {
  if (!data) {
    return data;
  }

  return {
    ...data,
    data: data.data.map((item) => (item.id === position.id ? { ...item, ...position } : item)),
  };
}

export function usePositions(params: PositionListParams) {
  const queryClient = useQueryClient();

  const positionsQuery = useQuery({
    queryKey: positionKeys.list(params),
    queryFn: () => listPositions(params),
  });

  const createMutation = useMutation({
    mutationFn: createPosition,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: positionKeys.all }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: PositionPayload }) => updatePosition(id, payload),
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: positionKeys.all });
      const previousLists = queryClient.getQueriesData<PaginatedResponse<JobPosition>>({
        queryKey: positionKeys.all,
      });

      queryClient.setQueriesData<PaginatedResponse<JobPosition>>({ queryKey: positionKeys.all }, (current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          data: current.data.map((position) =>
            position.id === id
              ? {
                  ...position,
                  name: payload.name,
                  departmentId: payload.departmentId || null,
                  isActive: payload.isActive,
                }
              : position
          ),
        };
      });

      return { previousLists };
    },
    onError: (_error, _variables, context) => {
      context?.previousLists.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSuccess: (position) => {
      queryClient.setQueriesData<PaginatedResponse<JobPosition>>({ queryKey: positionKeys.all }, (current) =>
        updatePositionInCache(current, position)
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: positionKeys.all }),
  });

  const deleteMutation = useMutation({
    mutationFn: deletePosition,
    onSuccess: (position) => {
      queryClient.setQueriesData<PaginatedResponse<JobPosition>>({ queryKey: positionKeys.all }, (current) =>
        updatePositionInCache(current, position)
      );
      queryClient.invalidateQueries({ queryKey: positionKeys.all });
    },
  });

  return {
    positionsQuery,
    createMutation,
    updateMutation,
    deleteMutation,
  };
}
