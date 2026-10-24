export function PublicState({
  title,
  message,
  kind = "empty",
}: {
  title: string;
  message: string;
  kind?: "empty" | "error";
}) {
  return (
    <section aria-live={kind === "error" ? "assertive" : "polite"} className={`public-state ${kind}`}>
      <span className="state-rule" aria-hidden="true" />
      <h2>{title}</h2>
      <p>{message}</p>
    </section>
  );
}
