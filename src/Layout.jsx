import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Trophy, Plus, History, Menu, Home, ShieldAlert, Image, Zap, CalendarDays, Database, MapPin, LogOut, Users } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";



const NAV_GROUPS = [
  {
    items: [
      { title: "Home", url: createPageUrl("Home"), icon: Home },
      { title: "My Profile", url: createPageUrl("PlayerProfile"), icon: Trophy },
      { title: "Leaderboard", url: createPageUrl("Leaderboard"), icon: Trophy },
      { title: "Game History", url: createPageUrl("GameHistory"), icon: History },
      { title: "Winners Gallery", url: createPageUrl("WinnersGallery"), icon: Image },
    ]
  },
  {
    items: [
      { title: "Calendar", url: createPageUrl("LeagueCalendar"), icon: CalendarDays },
      { title: "Locations", url: createPageUrl("Locations"), icon: MapPin },
      { title: "Community", url: createPageUrl("Community"), icon: Users },
    ]
  },
  {
    items: [
      { title: "Player Database", url: createPageUrl("PlayerDatabase"), icon: Database, adminOnly: true },
      { title: "Director", url: createPageUrl("DirectorSignIn"), icon: ShieldAlert },
      { title: "Manage Directors", url: createPageUrl("DirectorManagement"), icon: ShieldAlert },
    ]
  },
];

function LayoutInner({ children }) {
  const location = useLocation();
  const { setOpenMobile } = useSidebar();
  const [logoClicks, setLogoClicks] = React.useState(0);
  const [showSecret, setShowSecret] = React.useState(false);
  const [user, setUser] = React.useState(null);
  const [player, setPlayer] = React.useState(null);
  const [profileImageUrl, setProfileImageUrl] = React.useState("");

  React.useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      const playerEmail = localStorage.getItem("playerEmail") || currentUser.email;
      const players = await base44.entities.Player.filter({ email: playerEmail });
      if (players.length > 0) {
        setPlayer(players[0]);
        setProfileImageUrl(players[0].profile_picture || "");
      } else {
        setPlayer(null);
        setProfileImageUrl("");
      }
    };
    fetchUser();
  }, []);

  const handleLogoClick = () => {
    const newClicks = logoClicks + 1;
    setLogoClicks(newClicks);
    if (newClicks === 4) {
      setShowSecret(true);
      setLogoClicks(0);
      setTimeout(() => setShowSecret(false), 10000);
    }
  };

  const isActive = (url) => location.pathname === url;

  return (
    <>
      <style>{`
        :root {
          --background: 230 15% 11%;
          --foreground: 60 5% 90%;
          --primary: 220 10% 50%;
          --primary-foreground: 0 0% 100%;
          --card: 230 15% 14%;
          --card-foreground: 60 5% 90%;
          --border: 230 15% 22%;
          --accent: 220 10% 40%;
        }
      `}</style>
      <div className="min-h-screen flex w-full text-gray-100" style={{background: "linear-gradient(135deg, #2a2a35 0%, #3a3a48 50%, #2a2a35 100%)"}}>
        <Sidebar className="border-r border-white/8" style={{background: "#0d0d14"}}>

          {/* Brand Header */}
          <SidebarHeader className="px-3 pt-4 pb-3 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <button onClick={handleLogoClick} className="flex items-center gap-2.5 flex-1 min-w-0 hover:opacity-80 transition-opacity">
                <img
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e020a2bd66e7722fa0934d/44bb87bed_riverratslogo_black1PDF.pdf"
                  alt="River Rat Rounders"
                  className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                  onError={(e) => { e.target.style.display='none'; }}
                />
                <div className="text-left min-w-0">
                  <h2 className="font-bold text-sm text-white leading-tight truncate">River Rat Rounders</h2>
                  <p className="text-[10px] text-white/25 leading-tight truncate">Memphis' Freeroll Bar Poker</p>
                </div>
              </button>
              {profileImageUrl && (
                <img
                  src={profileImageUrl}
                  alt="Profile"
                  className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                  style={{ border: "1px solid rgba(255,255,255,0.12)" }}
                />
              )}
            </div>
          </SidebarHeader>

          {/* Nav Content */}
          <SidebarContent className="px-2 py-2 flex flex-col gap-0 overflow-y-auto">

            {/* Secret: Break Time Bump */}
            {showSecret && (
              <Link
                to={createPageUrl("BreakTimeBump")}
                onClick={() => setOpenMobile(false)}
                className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 mb-0.5 transition-all text-sm ${
                  isActive(createPageUrl("BreakTimeBump"))
                    ? "text-white font-semibold"
                    : "text-white/75 hover:text-white hover:bg-white/5"
                }`}
              style={isActive(createPageUrl("BreakTimeBump")) ? { background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.14)" } : {}}
              >
                <Zap className="w-4 h-4 shrink-0" />
                <span>Break Time Bump</span>
              </Link>
            )}

            {NAV_GROUPS.map((group, gi) => (
              <React.Fragment key={gi}>
                {gi > 0 && <div className="my-1.5 mx-1 border-t border-white/5" />}
                {group.items.map((item) => {
                  if (item.adminOnly && user?.role !== "admin") return null;
                  const active = isActive(item.url);
                  return (
                    <Link
                      key={item.title}
                      to={item.url}
                      onClick={() => setOpenMobile(false)}
                      className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 mb-0.5 transition-all text-sm ${
                        active
                          ? "text-white font-semibold"
                          : "text-white/75 hover:text-white hover:bg-white/5"
                      }`}
                      style={active ? { background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.14)" } : {}}
                    >
                      <item.icon className={`w-4 h-4 shrink-0 ${active ? "text-white" : "text-white/60"}`} />
                      <span>{item.title}</span>
                    </Link>
                  );
                })}
              </React.Fragment>
            ))}

            {/* Footer */}
            <div className="mt-auto pt-3 border-t border-white/5 mx-1">
              {player && (
                <p className="text-[10px] text-white/25 px-3 pb-2 truncate">
                  {player.first_name} {player.last_name}
                </p>
              )}
              <button
                onClick={() => {
                  localStorage.removeItem("playerEmail");
                  localStorage.removeItem("playerName");
                  setOpenMobile(false);
                  window.location.href = createPageUrl("Home");
                }}
                className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-white/35 hover:text-white/65 hover:bg-white/4 transition-all"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>Sign Out</span>
              </button>
              <p className="text-[9px] text-white/15 text-center py-2">
                © {new Date().getFullYear()} River Rat Rounders
              </p>
            </div>
          </SidebarContent>
        </Sidebar>

        <main className="flex-1 flex flex-col">
          <header className="border-b border-white/5 px-4 py-3 lg:hidden flex items-center justify-center relative" style={{background: "rgba(14,14,22,0.95)"}}>
            <SidebarTrigger className="hover:bg-white/5 w-9 h-9 rounded-lg transition-colors flex items-center justify-center absolute left-4">
              <Menu className="w-4 h-4 text-white/60" />
            </SidebarTrigger>
            <h1 className="text-sm font-semibold text-white/80">River Rat Rounders</h1>
            <a href="https://www.riverratrounders.com" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity absolute right-4">
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e020a2bd66e7722fa0934d/a6c1792b1_red2012-2.jpg"
                alt="River Rat Rounders"
                className="w-8 h-8 rounded-full object-cover"
              />
            </a>
          </header>

          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </>
  );
}

export default function Layout({ children, currentPageName }) {
  return (
    <SidebarProvider>
      <LayoutInner>{children}</LayoutInner>
    </SidebarProvider>
  );
}