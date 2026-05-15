"use client";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import StatusBadge from "./StatusBadge";
import type { Article } from "@/types";

export default function ArticleCard({
  article,
  onRefresh,
}: {
  article: Article;
  onRefresh: () => void;
}) {
  const router = useRouter();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 border-t-4 border-t-transparent hover:border-t-red-500 rounded-none aspect-square flex flex-col items-center justify-center text-center p-4 relative group">
          <div className="absolute inset-0 bg-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <div className="mb-3">
            <StatusBadge status={article.status} />
          </div>
          <h3 className="font-semibold text-sm line-clamp-3 mb-2 px-2 group-hover:text-red-500 transition-colors">
            {article.title}
          </h3>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-none">
            {article.category}
          </span>
          {article.createdBy === "uipath-bot" && (
            <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-none mt-3 font-medium tracking-wider uppercase">
              🤖 Auto
            </span>
          )}
        </Card>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[600px] rounded-none border-t-4 border-t-red-600">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <StatusBadge status={article.status} />
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-none">
              {article.category}
            </span>
            {article.createdBy === "uipath-bot" && (
              <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-none">
                🤖 Auto-generated
              </span>
            )}
          </div>
          <DialogTitle className="text-2xl font-bold leading-tight">
            {article.title}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            {article.summary}
          </p>

          <div className="bg-muted/30 p-4 mb-6 rounded-none border-l-2 border-red-500">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs mb-1 uppercase tracking-wider font-semibold">
                  Created By
                </p>
                <p className="font-medium">{article.createdBy}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-1 uppercase tracking-wider font-semibold">
                  Date
                </p>
                <p className="font-medium">
                  {new Date(article.createdAt).toLocaleDateString("en-MY", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>

          {article.tags.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider font-semibold">
                Tags
              </p>
              <div className="flex flex-wrap gap-1.5">
                {article.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="text-xs rounded-none bg-background border"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-end border-t pt-4 mt-2">
          <Button
            className="rounded-none bg-red-600 hover:bg-red-700 w-full sm:w-auto text-white shadow-sm"
            onClick={() => router.push(`/articles/${article.id}`)}
          >
            View Full Document →
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
