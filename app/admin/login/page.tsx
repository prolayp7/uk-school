import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = { title: "Staff sign in" };

const loginNotices = {
  session_expired: {
    title: "Session expired",
    message: "Please sign in again to continue managing the school website.",
  },
  signed_out: {
    title: "Signed out",
    message: "You have been signed out of the website content manager.",
  },
} as const;

type LoginNotice = keyof typeof loginNotices;

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string | string[] }>;
}) {
  const cookieStore = await cookies();
  if (cookieStore.get("school_session")?.value) redirect("/admin");

  const params = await searchParams;
  const reason = Array.isArray(params.reason) ? params.reason[0] : params.reason;
  const notice: (typeof loginNotices)[LoginNotice] | null =
    reason === "session_expired" || reason === "signed_out"
      ? loginNotices[reason]
      : null;

  return (
    <main className="login-page">
      <header className="login-mobile-brand">
        <span aria-hidden="true" className="login-brand-mark">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M3 9.5 12 4l9 5.5-9 5.5-9-5.5Z" />
            <path d="M6.5 12v5.2c3.3 2.3 7.7 2.3 11 0V12M21 10v6" />
          </svg>
        </span>
        <span>
          <strong>School website</strong>
          <small>Content management</small>
        </span>
      </header>
      <section className="login-aside">
        <svg
          aria-hidden="true"
          className="login-decoration"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          viewBox="0 0 1440 900"
        >
          <path
            d="M 846 1000 C 685 805 771 685 971 574 C 1164 467 1308 468 1490 271"
            stroke="#e7a0a0"
            strokeOpacity=".045"
            strokeWidth="118"
          />
          <path
            d="M 804 1000 C 644 805 730 685 930 574 C 1123 467 1267 468 1449 271"
            stroke="white"
            strokeOpacity=".12"
            strokeWidth="1.5"
          />
          <path
            d="M 886 1000 C 726 805 812 685 1012 574 C 1205 467 1349 468 1531 271"
            stroke="white"
            strokeOpacity=".08"
            strokeWidth="1.5"
          />
          <path
            d="M 968 1000 C 808 805 894 685 1094 574 C 1287 467 1431 468 1613 271"
            stroke="white"
            strokeOpacity=".055"
            strokeWidth="1.5"
          />
          <path
            d="M 1070 1040 C 920 860 998 740 1180 640 C 1350 546 1464 532 1602 390"
            stroke="#f2c5bd"
            strokeOpacity=".06"
            strokeWidth="46"
          />
        </svg>
        <div className="login-brand">
          <span aria-hidden="true" className="login-brand-mark">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M3 9.5 12 4l9 5.5-9 5.5-9-5.5Z" />
              <path d="M6.5 12v5.2c3.3 2.3 7.7 2.3 11 0V12M21 10v6" />
            </svg>
          </span>
          <span>
            <small className="login-brand-label">Website content management</small>
            <strong>School website</strong>
          </span>
        </div>
        <div className="login-aside-content">
          <h1>Keep your school community informed.</h1>
          <p className="login-aside-intro">
            One place for staff to keep the school’s published pages, news and events current.
          </p>
          <ul className="login-highlights">
            <li>
              <span className="login-highlight-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M5 5h14v14H5zM8 9h8M8 13h8M8 17h5" />
                </svg>
              </span>
              <span><strong>Website content</strong><small>Keep pages, news and events current.</small></span>
            </li>
            <li>
              <span className="login-highlight-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="m4 12 5 5L20 6" />
                  <path d="M20 12v7H4V5h11" />
                </svg>
              </span>
              <span><strong>Review before publishing</strong><small>Use the school’s content review workflow.</small></span>
            </li>
            <li>
              <span className="login-highlight-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M12 3 5 6v5c0 4.6 2.8 8 7 10 4.2-2 7-5.4 7-10V6l-7-3Z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </span>
              <span><strong>School-specific access</strong><small>Access is managed through your staff account.</small></span>
            </li>
          </ul>
        </div>
        <div className="login-aside-footer">
          <span>Website content, managed by your school.</span>
          <Link href="/">Return to the public website <span aria-hidden="true">↗</span></Link>
        </div>
      </section>
      <section aria-labelledby="login-title" className="login-main">
        <div className="login-content">
          {notice && (
            <div className="login-notice" role="status">
              <span aria-hidden="true" className="login-notice-icon">i</span>
              <span>
                <strong>{notice.title}</strong>
                <small>{notice.message}</small>
              </span>
            </div>
          )}
          <LoginForm />
          <p className="login-footnote">
            Sign-in access is provided by your school’s website service.
          </p>
        </div>
      </section>
    </main>
  );
}
