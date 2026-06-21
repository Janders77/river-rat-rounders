import React from "react";
import { ShieldCheck } from "lucide-react";

const SECTIONS = [
  {
    title: "Information We Collect",
    body: `We collect information you provide directly when you register for an account:
• Full name and email address
• Password (stored as a secure hash — we never see your password)
• Profile photo (optional)
• Game participation and tournament results`
  },
  {
    title: "How We Use Your Information",
    body: `We use the information we collect to:
• Maintain your player profile and track your tournament history
• Display your name and stats on the leaderboard and game history
• Allow directors to manage game sessions and record results
• Send you notifications about upcoming games (if you opt in)`
  },
  {
    title: "Information Sharing",
    body: `We do not sell, trade, or rent your personal information to third parties. Your name and tournament stats are visible to other registered members of River Rat Rounders as part of the league leaderboard. Your email address is never displayed publicly.`
  },
  {
    title: "Data Retention",
    body: `We retain your account information for as long as your account is active. You may request deletion of your account and associated data at any time by contacting us at the email below. Tournament history records may be retained in anonymized form for league statistics.`
  },
  {
    title: "Security",
    body: `We use industry-standard security measures including encrypted password storage and JWT authentication tokens. All data is transmitted over HTTPS. We cannot guarantee absolute security of any data transmitted over the internet.`
  },
  {
    title: "Children's Privacy",
    body: `River Rat Rounders is intended for players 18 years of age and older. We do not knowingly collect personal information from anyone under 18. If we become aware that we have collected personal data from someone under 18, we will delete that information promptly.`
  },
  {
    title: "Changes to This Policy",
    body: `We may update this Privacy Policy from time to time. We will notify members of significant changes by posting a notice in the app. Your continued use of the app after changes are posted constitutes your acceptance of the updated policy.`
  },
  {
    title: "Contact Us",
    body: `If you have questions about this Privacy Policy or your personal data, please contact us:\n\nRiver Rat Rounders\nMemphis, Tennessee\nEmail: riverratrounders@gmail.com`
  },
];

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen relative overflow-x-hidden" style={{background: "linear-gradient(135deg, #2a2a35 0%, #3a3a48 50%, #2a2a35 100%)"}}>
      <div className="absolute inset-x-0 top-0 h-40 pointer-events-none" style={{background: "radial-gradient(ellipse at 50% 0%, rgba(220,38,38,0.08), transparent 70%)"}} />
      <div className="relative max-w-md mx-auto w-full px-4 pt-5 pb-10 flex flex-col gap-3">

        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-white/80" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight leading-none">Privacy Policy</h1>
            <p className="text-base text-white/40 mt-0.5 leading-none">River Rat Rounders · Last updated June 2026</p>
          </div>
        </div>

        <div className="w-full rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-white/50 text-base leading-relaxed">
            River Rat Rounders ("we," "our," or "us") operates the River Rat Rounders mobile application. This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our app.
          </p>
        </div>

        {SECTIONS.map((section) => (
          <div key={section.title} className="w-full rounded-xl border border-white/10 bg-white/5 p-4">
            <h2 className="text-base font-semibold text-white mb-2">{section.title}</h2>
            <p className="text-white/50 text-base leading-relaxed whitespace-pre-line">{section.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
