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

const navigationItems = [
  {
    title: "Home",
    url: createPageUrl("Home"),
    icon: Home,
  },
  {
    title: "My Profile",
    url: createPageUrl("PlayerProfile"),
    icon: Trophy,
  },
  {
    title: "Leaderboard",
    url: createPageUrl("Leaderboard"),
    icon: Trophy,
  },
  {
    title: "Game History",
    url: createPageUrl("GameHistory"),
    icon: History,
  },
  {
    title: "Winners Gallery",
    url: createPageUrl("WinnersGallery"),
    icon: Image,
  },
  {
    title: "Calendar",
    url: createPageUrl("LeagueCalendar"),
    icon: CalendarDays,
  },

  {
    title: "Locations",
    url: createPageUrl("Locations"),
    icon: MapPin,
  },
  {
    title: "Community",
    url: createPageUrl("Community"),
    icon: Users,
  },

  {
    title: "Player Database",
    url: createPageUrl("PlayerDatabase"),
    icon: Database,
    adminOnly: true,
  },
  {
    title: "Director",
    url: createPageUrl("DirectorSignIn"),
    icon: ShieldAlert,
  },
  {
    title: "Manage Directors",
    url: createPageUrl("DirectorManagement"),
    icon: ShieldAlert,
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
      
      const players = await base44.entities.Player.filter({ email: currentUser.email });
      if (players.length > 0) {
        setPlayer(players[0]);
        setProfileImageUrl(currentUser.profile_image_url || players[0].profile_picture || "");
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

  return (
    <>
      <style>{`
        :root {
          --background: 220 13% 9%;
          --foreground: 60 5% 90%;
          --primary: 45 100% 51%;
          --primary-foreground: 0 0% 0%;
          --card: 220 13% 12%;
          --card-foreground: 60 5% 90%;
          --border: 220 13% 20%;
          --accent: 142 76% 36%;
        }
        .felt-bg {
          background-color: #1f4d18;
          background-image:
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Ccircle cx='1' cy='1' r='0.6' fill='%23ffffff08'/%3E%3Ccircle cx='3' cy='3' r='0.6' fill='%23ffffff05'/%3E%3C/svg%3E"),
            radial-gradient(ellipse at center, %232d5a27 0%25, %231a3d15 50%25, %230f2a0a 100%25);
        }
      `}</style>
      <div className="min-h-screen flex w-full text-gray-100" style={{background: "linear-gradient(135deg, #1a1a2e 0%, #2d2d3a 50%, #1a1a2e 100%)"}}>
        <Sidebar className="border-r border-gray-700/60" style={{background: "linear-gradient(180deg, #111118 0%, #1e1e2a 30%, #181820 70%, #0d0d14 100%)", backdropFilter: "blur(8px)"}}>
          <SidebarHeader className="border-b border-gray-700/40 p-5" style={{background: "linear-gradient(135deg, rgba(30,30,42,0.95) 0%, rgba(15,15,22,0.98) 100%)", boxShadow: "0 4px 24px rgba(0,0,0,0.30), 0 1px 0 rgba(255,255,255,0.05)"}}>
            <div className="flex items-center justify-between w-full gap-2">
              <button onClick={handleLogoClick} className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-90 transition-opacity">
                <div style={{filter: "drop-shadow(0 0 10px rgba(220,38,38,0.5)) drop-shadow(0 0 20px rgba(220,38,38,0.2))"}}>
                  <img
                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e020a2bd66e7722fa0934d/44bb87bed_riverratslogo_black1PDF.pdf"
                    alt="River Rat Rounders"
                    className="w-11 h-11 rounded-lg object-cover flex-shrink-0"
                    onError={(e) => { e.target.style.display='none'; }}
                  />
                </div>
                <div className="text-left min-w-0">
                  <h2 className="font-bold text-lg text-red-500 leading-tight" style={{textShadow: "0 0 12px rgba(220,38,38,0.4)"}}>River Rat Rounders</h2>
                  <p className="text-[10px] text-gray-500 mt-0.5 truncate">Memphis' Freeroll Bar Poker League</p>
                </div>
              </button>
              {profileImageUrl && (
                <div className="flex-shrink-0">
                  <img
                    src={profileImageUrl}
                    alt="Profile"
                    className="w-9 h-9 rounded-full object-cover border-2 border-green-700/60 shadow-lg"
                    style={{boxShadow: "0 0 8px rgba(34,197,94,0.3)"}}
                  />
                </div>
              )}
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-3" style={{background: "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.3) 100%)"}}>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {showSecret && (
                    <SidebarMenuItem key="break-time-bump">
                      <SidebarMenuButton 
                        asChild 
                        className={`relative overflow-hidden transition-all duration-200 rounded-lg mb-1 ${
                          location.pathname === createPageUrl("BreakTimeBump")
                            ? 'bg-gradient-to-r from-green-500/20 to-green-600/10 text-green-400 border-l-2 border-green-500' 
                            : 'text-gray-400 hover:text-red-400 hover:bg-red-950/30 hover:border-l-2 hover:border-red-500 border-l-2 border-transparent'
                        }`}
                      >
                        <Link to={createPageUrl("BreakTimeBump")} onClick={() => setOpenMobile(false)} className="flex items-center gap-3 px-4 py-3">
                          <Zap className="w-5 h-5" />
                          <span className="font-medium">Break Time Bump</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                  {navigationItems.map((item) => {
                    if (item.adminOnly && user?.role !== "admin") {
                      return null;
                    }
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton 
                          asChild 
                          className={`group relative overflow-hidden transition-all duration-200 rounded-lg mb-1 ${
                            location.pathname === item.url 
                              ? 'bg-gradient-to-r from-gray-500/30 to-gray-600/20 text-gray-200 border-l-2 border-gray-400' 
                              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/30 hover:border-l-2 hover:border-gray-500 border-l-2 border-transparent'
                          }`}
                        >
                          <Link to={item.url} onClick={() => setOpenMobile(false)} className="flex items-center gap-3 px-4 py-3">
                            <item.icon className="w-5 h-5" />
                            <span className="font-medium">{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                  <SidebarMenuItem key="user-welcome" className="mt-auto pt-4 border-t border-gray-800">
                    {player && (
                      <div className="px-4 py-3 text-gray-400 text-sm">
                        Welcome, <span className="text-gray-400 font-medium">{player.first_name} {player.last_name}</span>
                      </div>
                    )}
                  </SidebarMenuItem>
                  <SidebarMenuItem key="sign-out">
                    <SidebarMenuButton 
                      onClick={() => {
                        localStorage.removeItem("playerEmail");
                        localStorage.removeItem("playerName");
                        window.location.href = createPageUrl("Home");
                        setOpenMobile(false);
                      }}
                      className="hover:bg-red-900/30 transition-all duration-200 rounded-lg text-red-400"
                    >
                      <LogOut className="w-5 h-5" />
                      <span className="font-medium">Sign Out</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem key="copyright">
                    <div className="px-4 pt-1 pb-3 text-[9px] text-gray-600 text-center whitespace-nowrap">
                      © {new Date().getFullYear()} River Rat Rounders
                    </div>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <main className="flex-1 flex flex-col">
          <header className="bg-gradient-to-r from-green-500/15 to-green-600/10 border-b border-green-500/25 px-6 py-4 lg:hidden flex items-center justify-center relative">
            <SidebarTrigger className="hover:bg-gray-800 w-12 h-12 rounded-lg transition-colors flex items-center justify-center absolute left-6">
              <Menu className="w-5 h-5" />
            </SidebarTrigger>
            <h1 className="text-xl font-bold text-white">River Rat Rounders</h1>
            <a href="https://www.riverratrounders.com" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity absolute right-6">
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68e020a2bd66e7722fa0934d/a6c1792b1_red2012-2.jpg"
                alt="River Rat Rounders"
                className="w-12 h-12 rounded-full object-cover shadow-lg"
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