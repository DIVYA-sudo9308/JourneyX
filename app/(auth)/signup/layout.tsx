import type { Metadata } from "next";

/** Overrides the (auth) group's "Sign in" title for the signup route. */
export const metadata: Metadata = {
  title: "Sign up",
};

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
