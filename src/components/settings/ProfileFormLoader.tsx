"use client";

import dynamic from "next/dynamic";

const ProfileForm = dynamic(
  () => import("@/components/settings/ProfileForm").then((m) => m.ProfileForm),
  { ssr: false }
);

export function ProfileFormLoader(props: React.ComponentProps<typeof ProfileForm>) {
  return <ProfileForm {...props} />;
}
