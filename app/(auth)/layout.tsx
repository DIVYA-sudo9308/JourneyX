import type { Metadata } from "next";

// The root layout's template appends "· JourneyX", so this must carry the bare
// screen name — "Sign in · JourneyX" here rendered as "… · JourneyX · JourneyX".
// A template only reaches one level down, so it is restated for /signup.
export const metadata: Metadata = {
  title: {
    default: "Sign in",
    template: "%s · JourneyX",
  },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      {children}
    </div>
  );
}
