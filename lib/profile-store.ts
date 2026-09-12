'use client';
import { useEffect, useState } from 'react';
import type { InvestorProfile } from '@/components/onboarding-demo';
const KEY = 'owlmate-profile-v1';
const SESSION_KEY = 'owlmate-session-v1';
export type DemoSession = {
  username: string;
  phoneMasked: string;
  signedIn: boolean;
};

export function readDemoSession(): DemoSession | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  const session = JSON.parse(raw);
  if (
    !session ||
    typeof session.username !== 'string' ||
    typeof session.phoneMasked !== 'string' ||
    typeof session.signedIn !== 'boolean'
  )
    throw new Error('Invalid session');
  return session;
}

export function activateDemoSession(account: {
  username: string;
  phoneMasked: string;
}) {
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ ...account, signedIn: true }),
  );
  window.dispatchEvent(new Event('owlmate-session-change'));
}

export function signOutDemoSession() {
  const current = readDemoSession();
  const savedProfile = readProfile();
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      username: current?.username || savedProfile?.username || '',
      phoneMasked: current?.phoneMasked || savedProfile?.phoneMasked || '',
      signedIn: false,
    }),
  );
  window.dispatchEvent(new Event('owlmate-session-change'));
  window.dispatchEvent(new Event('owlmate-profile-change'));
  window.dispatchEvent(new Event('owlmate-data-change'));
}

export function resumeDemoSession() {
  const current = readDemoSession();
  const savedProfile = readProfile();
  const username = current?.username || savedProfile?.username || '';
  const phoneMasked = current?.phoneMasked || savedProfile?.phoneMasked || '';
  if (!username) return false;
  activateDemoSession({
    username,
    phoneMasked,
  });
  window.dispatchEvent(new Event('owlmate-profile-change'));
  window.dispatchEvent(new Event('owlmate-data-change'));
  return true;
}
export function readProfile(): InvestorProfile | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  const p = JSON.parse(raw);
  const fields = [
    'username',
    'phoneMasked',
    'ageRange',
    'experience',
    'goal',
    'horizon',
    'investableAssets',
    'monthlyContribution',
    'maxDrawdown',
    'liquidity',
    'riskLabel',
  ];
  if (
    !p ||
    fields.some((k) => typeof p[k] !== 'string') ||
    !Number.isFinite(p.recommendedAllocation) ||
    p.recommendedAllocation < 15 ||
    p.recommendedAllocation > 85
  )
    throw new Error('Invalid profile');
  return p;
}
export function saveProfile(profile: InvestorProfile) {
  localStorage.setItem(KEY, JSON.stringify(profile));
  activateDemoSession({
    username: profile.username,
    phoneMasked: profile.phoneMasked,
  });
  window.dispatchEvent(new Event('owlmate-profile-change'));
  window.dispatchEvent(new Event('owlmate-data-change'));
}
export function useInvestorProfile() {
  const [profile, setProfile] = useState<InvestorProfile | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const refresh = () => {
      try {
        const session = readDemoSession();
        setProfile(session?.signedIn === false ? null : readProfile());
        setError('');
      } catch {
        setProfile(null);
        setError('无法读取本机画像，请重新填写并保存。');
      }
    };
    refresh();
    window.addEventListener('storage', refresh);
    window.addEventListener('owlmate-profile-change', refresh);
    window.addEventListener('owlmate-session-change', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('owlmate-profile-change', refresh);
      window.removeEventListener('owlmate-session-change', refresh);
    };
  }, []);
  return { profile, error };
}
