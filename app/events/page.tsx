import { PublicLayout } from "@/components/public-layout";
import { PublicState } from "@/components/public-state";
import { getPublicData } from "@/lib/api/client";
import type { PublicEventsResponse } from "@/lib/api/types";

export const metadata = { title: "Events" };

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/London",
  }).format(new Date(value));
}

export default async function EventsPage() {
  const result = await getPublicData<PublicEventsResponse>("/website/events", 100);
  if (result.error) {
    return (
      <PublicLayout schoolName="School website">
        <div className="site-container section">
          <PublicState kind="error" message={result.error.message} title="Events are unavailable" />
        </div>
      </PublicLayout>
    );
  }
  return (
    <PublicLayout schoolName={result.data.school.name}>
      <section className="page-hero">
        <div className="site-container page-hero-inner">
          <h1>Events</h1>
          <p>Upcoming events published for the school community.</p>
        </div>
      </section>
      <section className="section">
        <div className="site-container">
          {result.data.items.length === 0 ? (
            <PublicState message="There are no upcoming public events to show." title="No events listed" />
          ) : (
            <div className="event-list">
              {result.data.items.map((event) => (
                <article className="event-item" key={`${event.title}-${event.startsAt}`}>
                  <time className="event-date" dateTime={event.startsAt}>
                    {formatDate(event.startsAt)}
                  </time>
                  <div>
                    <h2>{event.title}</h2>
                    {event.description && <p>{event.description}</p>}
                    {event.location && <p>{event.location}</p>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}
