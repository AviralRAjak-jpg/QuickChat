import React from 'react';
import { cn } from '../../lib/utils';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className }) => {
  return (
    <div className={cn("animate-pulse bg-zinc-800 rounded-md", className)} />
  );
};

export const ChatSkeleton: React.FC = () => {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className={cn("flex items-end gap-3", i % 2 === 0 ? "flex-row-reverse" : "flex-row")}>
          <Skeleton className="w-8 h-8 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className={cn("h-10 rounded-2xl", i % 2 === 0 ? "w-48" : "w-64")} />
            <Skeleton className="h-3 w-12 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const SidebarSkeleton: React.FC = () => {
  return (
    <div className="p-3 space-y-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <Skeleton className="w-12 h-12 rounded-xl" />
          <div className="flex-1 space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-8" />
            </div>
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
};
