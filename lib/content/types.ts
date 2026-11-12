export type GalleryImage = {
  id: string;
  path: string;
  url: string;
  alt: string;
  sortOrder: number;
};

export type CommentBadgeType = "osaka" | "anonymous" | "random" | null;

export type CommentItem = {
  id: string;
  parentId: string | null;
  author: string;
  body: string;
  createdAt: string;
  badgeType: CommentBadgeType;
  userId: string | null;
  replies: CommentItem[];
};
