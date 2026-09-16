import { AppShell } from "@/components/layout/app-shell";
import { NativeAuthGate } from "@/components/native-auth-gate";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <NativeAuthGate>
      <AppShell>{children}</AppShell>
    </NativeAuthGate>
  );
}
