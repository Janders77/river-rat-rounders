import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Trophy, User, History, Menu, Home, ShieldAlert, Image, Zap, CalendarDays, Database, MapPin, LogOut, Users } from "lucide-react";


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
    icon: User,
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
    headDirectorOnly: true,
  },
  {
    title: "Director",
    url: createPageUrl("DirectorSignIn"),
    icon: ShieldAlert,
    directorOnly: true,
  },
  {
    title: "Manage Directors",
    url: createPageUrl("DirectorManagement"),
    icon: ShieldAlert,
    headDirectorOnly: true,
  },
];

function MenuButton() {
  const { toggleSidebar } = useSidebar();
  return (
    <button
      onClick={toggleSidebar}
      className="w-14 h-14 rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/8 transition-colors"
    >
      <Menu className="w-7 h-7" />
    </button>
  );
}

function LayoutInner({ children }) {
  const location = useLocation();
  const { setOpenMobile } = useSidebar();
  const { logout } = useAuth();
  const [logoClicks, setLogoClicks] = React.useState(0);
  const [showSecret, setShowSecret] = React.useState(false);
  const [user, setUser] = React.useState(null);
  const [player, setPlayer] = React.useState(null);
  const [isHeadDirector, setIsHeadDirector] = React.useState(false);
  const [isDirector, setIsDirector] = React.useState(false);
  const [isSignedInToGame, setIsSignedInToGame] = React.useState(false);

  React.useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      // Use localStorage playerEmail (player-level login) if available, fall back to auth email
      const playerEmail = localStorage.getItem("playerEmail") || currentUser.email;
      const players = await base44.entities.Player.filter({ email: playerEmail });
      if (players.length > 0) {
        setPlayer(players[0]);
      } else {
        setPlayer(null);
      }

      const directorRecords = await base44.entities.Director.filter({ email: playerEmail });
      setIsDirector(directorRecords.length > 0);
      setIsHeadDirector(directorRecords.some(d => d.role === "Head Director"));

      // Check if player is signed into any open game session
      if (players.length > 0) {
        const playerId = players[0].id;
        const openSessions = await base44.entities.GameSession.filter({ is_open: true });
        const signedIn = openSessions.some(s => (s.signed_in_player_ids || []).includes(playerId));
        setIsSignedInToGame(signedIn);
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
      <div className="h-screen flex w-full overflow-hidden text-gray-100" style={{background: "linear-gradient(135deg, #1a1a22 0%, #22222e 50%, #1a1a22 100%)"}}>
        <Sidebar className="border-r border-white/5" style={{background: "transparent"}}>
          <SidebarHeader className="px-5 pb-4" style={{background: "transparent", paddingTop: "calc(env(safe-area-inset-top, 0px) + 1.5rem)"}}>
            <div className="flex flex-col items-center pl-4">
              <button onClick={handleLogoClick} className="hover:opacity-90 transition-opacity">
                <img src="/logo.png" alt="River Rat Rounders" className="w-32 h-32 object-contain" />
              </button>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="px-3 pt-4 pb-3" style={{background: "transparent"}}>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu className="flex flex-col items-center">
                  {showSecret && (
                    <SidebarMenuItem key="break-time-bump" className="w-full">
                      <SidebarMenuButton
                        asChild
                        className={`relative overflow-hidden transition-all duration-200 rounded-lg mb-0.5 ${
                          location.pathname === createPageUrl("BreakTimeBump")
                            ? 'text-white'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <Link to={createPageUrl("BreakTimeBump")} onClick={() => setOpenMobile(false)} className="flex items-center justify-center gap-3 px-4 py-3">
                          <Zap className="w-6 h-6" />
                          <span className="font-medium text-base">Break Time Bump</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                  {navigationItems.map((item) => {
                    if (item.adminOnly && user?.role !== "admin") return null;
                    if (item.headDirectorOnly && !isHeadDirector) return null;
                    if (item.directorOnly && !isDirector) return null;
                    return (
                      <SidebarMenuItem key={item.title} className="w-full">
                        <Link to={item.url} onClick={() => setOpenMobile(false)} className="block w-full">
                          <SidebarMenuButton
                            className={`group relative overflow-hidden transition-all duration-200 rounded-lg mb-1 w-full justify-center gap-3 ${
                              location.pathname === item.url
                                ? 'text-white'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            <item.icon className="w-6 h-6 shrink-0" />
                            <span className="font-medium text-lg">{item.title}</span>
                          </SidebarMenuButton>
                        </Link>
                      </SidebarMenuItem>
                    );
                  })}
                  <SidebarMenuItem key="user-welcome" className="w-full mt-auto pt-4 border-t border-white/10">
                    {player && (
                      <div className="px-4 py-2 text-center">
                        <span className="text-gray-500 text-xs uppercase tracking-widest">Signed in as</span>
                        <p className="text-white font-semibold text-lg mt-0.5">{player.first_name} {player.last_name}</p>
                      </div>
                    )}
                  </SidebarMenuItem>
                  <SidebarMenuItem key="sign-out" className="w-full">
                    <SidebarMenuButton
                      onClick={() => {
                        localStorage.removeItem("playerEmail");
                        localStorage.removeItem("playerName");
                        logout(true);
                      }}
                      className="hover:bg-red-900/30 transition-all duration-200 rounded-lg justify-center gap-3" style={{color: "hsl(var(--sidebar-primary))"}}
                    >
                      <LogOut className="w-6 h-6" />
                      <span className="font-medium text-lg">Sign Out</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem key="copyright" className="w-full">
                    <div className="px-4 pt-1 pb-3 text-[9px] text-gray-600 text-center whitespace-nowrap">
                      © {new Date().getFullYear()} River Rat Rounders
                    </div>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {/* Desktop-only top header (sidebar trigger) */}
          <header className="safe-top sticky top-0 z-30 border-b border-red-900/40 px-3 py-3 hidden lg:hidden xl:hidden flex items-center justify-center relative backdrop-blur-md" style={{background: "linear-gradient(to right, rgba(127,29,29,0.45), rgba(127,29,29,0.78))"}}>
            <SidebarTrigger className="hover:bg-gray-800/80 w-11 h-11 rounded-xl transition-colors flex items-center justify-center absolute left-3">
              <Menu className="w-5 h-5" />
            </SidebarTrigger>
            <h1 className="px-12 text-center text-base font-bold tracking-tight text-white sm:text-lg">River Rat Rounders</h1>
          </header>

          {/* Mobile top bar */}
          <header className="sticky top-0 z-30 flex lg:hidden flex-col border-b border-white/8 backdrop-blur-md" style={{background: "linear-gradient(to right, rgba(0,0,0,0.97), rgba(40,0,0,0.97))", paddingTop: "env(safe-area-inset-top, 0px)"}}>
            <div className="relative flex items-center px-4 py-1.5">
              <MenuButton />
              <span className="absolute left-1/2 -translate-x-1/2 text-sm font-semibold text-white uppercase" style={{fontFamily: "'Georgia', 'Times New Roman', serif", letterSpacing: "0.12em", textShadow: "0 0 8px rgba(220,38,38,0.9), 0 0 20px rgba(220,38,38,0.6), 0 0 40px rgba(220,38,38,0.3)"}}>River Rat Rounders</span>
              <img
                src="/logo.png"
                alt="River Rat Rounders"
                className={`w-9 h-9 object-contain flex-shrink-0 ml-auto${isSignedInToGame ? " logo-spin" : ""}`}
              />
            </div>
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
