import { PublicProfile } from "@/app/api/profile/route";
import { Metadata } from "next";
import ProfileView from "@/components/ProfileView";

interface Props {
  params: Promise<{ userId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { userId } = await params;
  return {
    title: `TradeMind Profile — ${userId.slice(0, 8)}`,
    description: "Verifiable onchain trading behavior profile powered by 0G Storage",
    openGraph: {
      title: "TradeMind Behavioral Profile",
      description: "Onchain AI trading agent — behavioral patterns stored and verified on 0G Storage",
    },
  };
}

async function fetchProfile(userId: string): Promise<PublicProfile | null> {
  try {
    // Resolve base URL for both local dev and Vercel
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

    const res = await fetch(
      `${baseUrl}/api/profile?userId=${encodeURIComponent(userId)}`,
      { next: { revalidate: 30 } }
    );

    if (!res.ok) return null;
    const data: PublicProfile = await res.json();
    return data;
  } catch {
    return null;
  }
}

export default async function ProfilePage({ params }: Props) {
  const { userId } = await params;
  const profile = await fetchProfile(userId);
  return <ProfileView profile={profile} userId={userId} />;
}