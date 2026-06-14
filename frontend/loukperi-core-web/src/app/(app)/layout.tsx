import { ReactNode } from "react";
import AppShell from "@/components/app/AppShell";

export default function ProtectedAppLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}