import Link from "next/link";

type SiteFooterProps = {
  schoolName: string;
};

export function SiteFooter({ schoolName }: SiteFooterProps) {
  return (
    <footer className="site-footer">
      <div className="site-container footer-inner">
        <Link className="footer-wordmark" href="/">
          {schoolName}
        </Link>
        <nav aria-label="Footer">
          <Link href="/admissions">Admissions</Link>
          <Link href="/news">News</Link>
          <Link href="/events">Events</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/policies">Policies</Link>
        </nav>
        <p>Website content is provided by the school.</p>
      </div>
    </footer>
  );
}
