import { BlogPostEditor } from "@/components/admin/blog-post-editor";

export const metadata = { title: "Edit blog post" };

export default async function EditBlogPostPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  return <BlogPostEditor postId={postId} />;
}
