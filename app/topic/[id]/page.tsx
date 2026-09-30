export default async function TopicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Topic: {id}</h1>
      <p className="mt-2 text-sm text-neutral-500">Coming in Phase 3.</p>
    </main>
  );
}
